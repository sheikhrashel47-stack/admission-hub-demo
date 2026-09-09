import { AUTH_ERROR_CODES } from '../core/errors.mjs';
import { constantTimeEqual } from '../core/crypto.mjs';

const DAY_MS = 24 * 60 * 60 * 1000;
const EVENT_RETENTION_MS = 90 * DAY_MS;

export class SqliteAuthRepository {
  constructor(storage) {
    if (!storage?.sql || typeof storage.sql.exec !== 'function') throw new TypeError('SQLite Durable Object storage is required.');
    this.storage = storage;
    this.sql = storage.sql;
  }

  migrate() {
    const statements = [
      `CREATE TABLE IF NOT EXISTS auth_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS auth_users (
        user_id TEXT PRIMARY KEY,
        email_ref TEXT NOT NULL UNIQUE,
        email_mask TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('active','disabled','suspended')),
        created_at INTEGER NOT NULL,
        last_login_at INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS auth_challenges (
        challenge_id TEXT PRIMARY KEY,
        email_ref TEXT NOT NULL,
        email_mask TEXT NOT NULL,
        code_mac TEXT NOT NULL,
        state TEXT NOT NULL CHECK(state IN ('active','consumed','expired','locked','superseded','failed')),
        delivery_state TEXT NOT NULL CHECK(delivery_state IN ('pending','accepted','uncertain','failed')),
        provider TEXT,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        max_attempts INTEGER NOT NULL,
        consumed_at INTEGER,
        ip_ref TEXT NOT NULL,
        device_ref TEXT NOT NULL,
        delivery_updated_at INTEGER
      )`,
      `CREATE INDEX IF NOT EXISTS auth_challenges_email_created ON auth_challenges(email_ref, created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS auth_challenges_expiry ON auth_challenges(expires_at)`,
      `CREATE TABLE IF NOT EXISTS auth_sessions (
        session_ref TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        last_seen_at INTEGER NOT NULL,
        revoked_at INTEGER,
        ip_ref TEXT NOT NULL,
        device_ref TEXT NOT NULL,
        user_agent TEXT NOT NULL,
        FOREIGN KEY(user_id) REFERENCES auth_users(user_id)
      )`,
      `CREATE INDEX IF NOT EXISTS auth_sessions_user ON auth_sessions(user_id, created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS auth_sessions_expiry ON auth_sessions(expires_at)`,
      `CREATE TABLE IF NOT EXISTS auth_rate_limits (
        scope TEXT NOT NULL,
        bucket_key TEXT NOT NULL,
        window_start INTEGER NOT NULL,
        window_ms INTEGER NOT NULL,
        count INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        PRIMARY KEY(scope, bucket_key, window_start)
      )`,
      `CREATE INDEX IF NOT EXISTS auth_rate_expiry ON auth_rate_limits(expires_at)`,
      `CREATE TABLE IF NOT EXISTS auth_security_events (
        event_id INTEGER PRIMARY KEY AUTOINCREMENT,
        event_type TEXT NOT NULL,
        subject_ref TEXT,
        user_id TEXT,
        occurred_at INTEGER NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS auth_security_events_time ON auth_security_events(occurred_at DESC)`
    ];
    for (const statement of statements) this.sql.exec(statement);
    this.sql.exec("INSERT OR IGNORE INTO auth_meta(key,value) VALUES('schema_version','1')");
  }

  #rows(statement, ...bindings) {
    return Array.from(this.sql.exec(statement, ...bindings));
  }

  #one(statement, ...bindings) {
    return this.#rows(statement, ...bindings)[0] || null;
  }

  #transaction(work) {
    if (typeof this.storage.transactionSync === 'function') return this.storage.transactionSync(work);
    return work();
  }

  #consumeLimits(limits, now) {
    let denied = null;
    for (const limit of limits || []) {
      const start = Math.floor(now / limit.windowMs) * limit.windowMs;
      const expiresAt = start + limit.windowMs;
      this.sql.exec(
        `INSERT INTO auth_rate_limits(scope,bucket_key,window_start,window_ms,count,expires_at)
         VALUES(?,?,?,?,1,?)
         ON CONFLICT(scope,bucket_key,window_start) DO UPDATE SET count=count+1`,
        limit.scope, limit.key, start, limit.windowMs, expiresAt
      );
      const row = this.#one(
        'SELECT count,expires_at AS expiresAt FROM auth_rate_limits WHERE scope=? AND bucket_key=? AND window_start=?',
        limit.scope, limit.key, start
      );
      if (Number(row?.count || 0) > limit.limit) {
        const retryAfter = Math.max(1, Math.ceil((Number(row.expiresAt) - now) / 1000));
        if (!denied || retryAfter > denied.retryAfter) denied = { error: AUTH_ERROR_CODES.RATE_LIMITED, retryAfter };
      }
    }
    return denied;
  }

  #event(eventType, subjectRef, userId, now) {
    this.sql.exec(
      'INSERT INTO auth_security_events(event_type,subject_ref,user_id,occurred_at) VALUES(?,?,?,?)',
      String(eventType).slice(0, 48), subjectRef || null, userId || null, now
    );
  }

  async prepareChallenge({ record, limits, cooldownMs, now }) {
    return this.#transaction(() => {
      const denied = this.#consumeLimits(limits, now);
      if (denied) return denied;
      const latest = this.#one(
        `SELECT created_at AS createdAt FROM auth_challenges
         WHERE email_ref=? AND state='active' ORDER BY created_at DESC LIMIT 1`,
        record.emailRef
      );
      if (latest && now - Number(latest.createdAt) < cooldownMs) {
        return {
          error: AUTH_ERROR_CODES.RESEND_COOLDOWN,
          retryAfter: Math.max(1, Math.ceil((cooldownMs - (now - Number(latest.createdAt))) / 1000))
        };
      }
      this.sql.exec("UPDATE auth_challenges SET state='superseded',code_mac='' WHERE email_ref=? AND state='active'", record.emailRef);
      this.sql.exec(
        `INSERT INTO auth_challenges(
          challenge_id,email_ref,email_mask,code_mac,state,delivery_state,created_at,expires_at,
          attempts,max_attempts,ip_ref,device_ref
        ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`,
        record.challengeId, record.emailRef, record.emailMask, record.codeMac, record.state,
        record.deliveryState, record.createdAt, record.expiresAt, record.attempts,
        record.maxAttempts, record.ipRef, record.deviceRef
      );
      this.#event('otp-prepared', record.emailRef, null, now);
      return { prepared: true, preparedAt: now };
    });
  }

  async markDelivery({ challengeId, accepted, uncertain, provider, now }) {
    return this.#transaction(() => {
      const row = this.#one('SELECT state FROM auth_challenges WHERE challenge_id=?', challengeId);
      if (!row) return { error: AUTH_ERROR_CODES.OTP_INVALID };
      if (accepted) {
        this.sql.exec(
          "UPDATE auth_challenges SET delivery_state='accepted',provider=?,delivery_updated_at=? WHERE challenge_id=?",
          provider, now, challengeId
        );
      } else if (uncertain) {
        this.sql.exec(
          "UPDATE auth_challenges SET delivery_state='uncertain',provider=?,delivery_updated_at=? WHERE challenge_id=?",
          provider, now, challengeId
        );
      } else {
        this.sql.exec(
          "UPDATE auth_challenges SET state='failed',delivery_state='failed',code_mac='',provider=?,delivery_updated_at=? WHERE challenge_id=? AND state='active'",
          provider, now, challengeId
        );
      }
      return { updated: true };
    });
  }

  async verifyChallenge(input) {
    return this.#transaction(() => {
      const denied = this.#consumeLimits(input.limits, input.now);
      if (denied) return denied;
      const row = this.#one(
        `SELECT challenge_id AS challengeId,email_ref AS emailRef,email_mask AS emailMask,code_mac AS codeMac,
          state,expires_at AS expiresAt,attempts,max_attempts AS maxAttempts
         FROM auth_challenges WHERE challenge_id=?`,
        input.challengeId
      );
      if (!row || row.emailRef !== input.emailRef || ['superseded', 'failed'].includes(row?.state)) {
        return { error: AUTH_ERROR_CODES.OTP_INVALID };
      }
      if (row.state === 'consumed') return { error: AUTH_ERROR_CODES.OTP_USED };
      if (row.state === 'locked') return { error: AUTH_ERROR_CODES.OTP_LOCKED };
      if (Number(row.expiresAt) <= input.now || row.state === 'expired') {
        this.sql.exec("UPDATE auth_challenges SET state='expired',code_mac='' WHERE challenge_id=?", input.challengeId);
        return { error: AUTH_ERROR_CODES.OTP_EXPIRED };
      }
      if (Number(row.attempts) >= Number(row.maxAttempts)) {
        this.sql.exec("UPDATE auth_challenges SET state='locked',code_mac='' WHERE challenge_id=?", input.challengeId);
        return { error: AUTH_ERROR_CODES.OTP_LOCKED };
      }
      if (!constantTimeEqual(row.codeMac, input.candidateCodeMac)) {
        const attempts = Number(row.attempts) + 1;
        if (attempts >= Number(row.maxAttempts)) {
          this.sql.exec("UPDATE auth_challenges SET attempts=?,state='locked',code_mac='' WHERE challenge_id=?", attempts, input.challengeId);
          this.#event('otp-locked', input.emailRef, null, input.now);
          return { error: AUTH_ERROR_CODES.OTP_LOCKED };
        }
        this.sql.exec('UPDATE auth_challenges SET attempts=? WHERE challenge_id=?', attempts, input.challengeId);
        this.#event('otp-invalid', input.emailRef, null, input.now);
        return { error: AUTH_ERROR_CODES.OTP_INVALID };
      }

      this.sql.exec(
        "UPDATE auth_challenges SET state='consumed',consumed_at=?,code_mac='' WHERE challenge_id=? AND state='active'",
        input.now, input.challengeId
      );
      let user = this.#one(
        `SELECT user_id AS id,email_mask AS emailMask,status,created_at AS createdAt
         FROM auth_users WHERE email_ref=?`,
        input.emailRef
      );
      let created = false;
      if (!user) {
        this.sql.exec(
          `INSERT OR IGNORE INTO auth_users(user_id,email_ref,email_mask,status,created_at,last_login_at)
           VALUES(?,?,?,'active',?,?)`,
          input.userIdCandidate, input.emailRef, row.emailMask, input.now, input.now
        );
        user = this.#one(
          `SELECT user_id AS id,email_mask AS emailMask,status,created_at AS createdAt
           FROM auth_users WHERE email_ref=?`,
          input.emailRef
        );
        created = user?.id === input.userIdCandidate;
      }
      if (!user) return { error: AUTH_ERROR_CODES.STORAGE_UNAVAILABLE };
      if (user.status !== 'active') return { error: AUTH_ERROR_CODES.ACCOUNT_DISABLED };
      this.sql.exec('UPDATE auth_users SET last_login_at=? WHERE user_id=?', input.now, user.id);
      this.sql.exec(
        `INSERT INTO auth_sessions(
          session_ref,user_id,created_at,expires_at,last_seen_at,revoked_at,ip_ref,device_ref,user_agent
        ) VALUES(?,?,?,?,?,NULL,?,?,?)`,
        input.sessionRef, user.id, input.now, input.sessionExpiresAt, input.now,
        input.ipRef, input.deviceRef, input.userAgent
      );
      this.#event(created ? 'account-created' : 'login', input.emailRef, user.id, input.now);
      return { verified: true, created, user };
    });
  }

  async getSession({ sessionRef, now }) {
    return this.#transaction(() => {
      const row = this.#one(
        `SELECT s.expires_at AS expiresAt,s.last_seen_at AS lastSeenAt,
          u.user_id AS id,u.email_mask AS emailMask,u.status,u.created_at AS createdAt
         FROM auth_sessions s JOIN auth_users u ON u.user_id=s.user_id
         WHERE s.session_ref=? AND s.revoked_at IS NULL`,
        sessionRef
      );
      if (!row || Number(row.expiresAt) <= now) return { error: AUTH_ERROR_CODES.SESSION_INVALID };
      if (row.status !== 'active') return { error: AUTH_ERROR_CODES.ACCOUNT_DISABLED };
      if (now - Number(row.lastSeenAt) > 6 * 60 * 60 * 1000) {
        this.sql.exec('UPDATE auth_sessions SET last_seen_at=? WHERE session_ref=?', now, sessionRef);
      }
      return {
        expiresAt: Number(row.expiresAt),
        user: { id: row.id, emailMask: row.emailMask, status: row.status, createdAt: Number(row.createdAt) }
      };
    });
  }

  async revokeSession({ sessionRef, now }) {
    return this.#transaction(() => {
      const row = this.#one('SELECT revoked_at AS revokedAt FROM auth_sessions WHERE session_ref=?', sessionRef);
      if (!row || row.revokedAt) return { revoked: false };
      this.sql.exec('UPDATE auth_sessions SET revoked_at=? WHERE session_ref=?', now, sessionRef);
      this.#event('logout', null, null, now);
      return { revoked: true };
    });
  }

  async ping() {
    const row = this.#one("SELECT value FROM auth_meta WHERE key='schema_version'");
    return { ok: row?.value === '1', storage: 'sqlite-durable-object', schema: Number(row?.value || 0) };
  }

  async cleanup(now) {
    return this.#transaction(() => {
      this.sql.exec('DELETE FROM auth_challenges WHERE expires_at<=?', now);
      this.sql.exec('DELETE FROM auth_rate_limits WHERE expires_at<=?', now);
      this.sql.exec('DELETE FROM auth_sessions WHERE expires_at<=? OR revoked_at IS NOT NULL', now);
      this.sql.exec('DELETE FROM auth_security_events WHERE occurred_at<?', now - EVENT_RETENTION_MS);
      this.sql.exec("INSERT INTO auth_meta(key,value) VALUES('last_cleanup',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", String(now));
      return { cleaned: true };
    });
  }

  async nextExpiry(now) {
    const row = this.#one(
      `SELECT MIN(expiry) AS nextExpiry FROM (
        SELECT MIN(expires_at) AS expiry FROM auth_challenges WHERE expires_at>?
        UNION ALL SELECT MIN(expires_at) FROM auth_sessions WHERE expires_at>? AND revoked_at IS NULL
        UNION ALL SELECT MIN(expires_at) FROM auth_rate_limits WHERE expires_at>?
      )`,
      now, now, now
    );
    const next = Number(row?.nextExpiry || 0);
    return next > now ? next : null;
  }
}
