import { AUTH_ERROR_CODES } from '../core/errors.mjs';
import { constantTimeEqual } from '../core/crypto.mjs';

const copy = value => value == null ? value : structuredClone(value);

export class MemoryAuthRepository {
  constructor() {
    this.challenges = new Map();
    this.usersByEmail = new Map();
    this.users = new Map();
    this.sessions = new Map();
    this.rates = new Map();
    this.events = [];
  }

  #consume(limits, now) {
    let denied = null;
    for (const limit of limits || []) {
      const start = Math.floor(now / limit.windowMs) * limit.windowMs;
      const id = `${limit.scope}:${limit.key}:${start}`;
      const row = this.rates.get(id) || { count: 0, resetAt: start + limit.windowMs };
      row.count += 1;
      this.rates.set(id, row);
      if (row.count > limit.limit) {
        const retryAfter = Math.max(1, Math.ceil((row.resetAt - now) / 1000));
        if (!denied || retryAfter > denied.retryAfter) denied = { error: AUTH_ERROR_CODES.RATE_LIMITED, retryAfter };
      }
    }
    return denied;
  }

  async prepareChallenge({ record, limits, cooldownMs, now }) {
    const denied = this.#consume(limits, now);
    if (denied) return denied;
    const latest = [...this.challenges.values()]
      .filter(row => row.emailRef === record.emailRef && row.state === 'active')
      .sort((left, right) => right.createdAt - left.createdAt)[0];
    if (latest && now - latest.createdAt < cooldownMs) {
      return { error: AUTH_ERROR_CODES.RESEND_COOLDOWN, retryAfter: Math.max(1, Math.ceil((cooldownMs - (now - latest.createdAt)) / 1000)) };
    }
    for (const row of this.challenges.values()) {
      if (row.emailRef === record.emailRef && row.state === 'active') row.state = 'superseded';
    }
    this.challenges.set(record.challengeId, copy(record));
    this.events.push({ type: 'otp-prepared', subjectRef: record.emailRef, at: now });
    return { prepared: true, preparedAt: now };
  }

  async markDelivery({ challengeId, accepted, uncertain, provider, now }) {
    const row = this.challenges.get(challengeId);
    if (!row) return { error: AUTH_ERROR_CODES.OTP_INVALID };
    if (accepted) row.deliveryState = 'accepted';
    else if (uncertain) row.deliveryState = 'uncertain';
    else {
      row.deliveryState = 'failed';
      row.state = 'failed';
      row.codeMac = '';
    }
    row.provider = provider;
    row.deliveryUpdatedAt = now;
    return { updated: true };
  }

  async verifyChallenge(input) {
    const denied = this.#consume(input.limits, input.now);
    if (denied) return denied;
    const row = this.challenges.get(input.challengeId);
    if (!row || row.emailRef !== input.emailRef || ['superseded', 'failed', 'locked'].includes(row?.state)) {
      return { error: row?.state === 'locked' ? AUTH_ERROR_CODES.OTP_LOCKED : AUTH_ERROR_CODES.OTP_INVALID };
    }
    if (row.state === 'consumed') return { error: AUTH_ERROR_CODES.OTP_USED };
    if (row.expiresAt <= input.now || row.state === 'expired') {
      row.state = 'expired';
      row.codeMac = '';
      return { error: AUTH_ERROR_CODES.OTP_EXPIRED };
    }
    if (row.attempts >= row.maxAttempts) {
      row.state = 'locked';
      row.codeMac = '';
      return { error: AUTH_ERROR_CODES.OTP_LOCKED };
    }
    if (!constantTimeEqual(row.codeMac, input.candidateCodeMac)) {
      row.attempts += 1;
      if (row.attempts >= row.maxAttempts) {
        row.state = 'locked';
        row.codeMac = '';
        return { error: AUTH_ERROR_CODES.OTP_LOCKED };
      }
      return { error: AUTH_ERROR_CODES.OTP_INVALID };
    }

    row.state = 'consumed';
    row.consumedAt = input.now;
    row.codeMac = '';
    let user = this.usersByEmail.get(input.emailRef);
    let created = false;
    if (!user) {
      user = {
        id: input.userIdCandidate,
        emailRef: input.emailRef,
        emailMask: row.emailMask,
        status: 'active',
        createdAt: input.now,
        lastLoginAt: input.now
      };
      this.usersByEmail.set(input.emailRef, user);
      this.users.set(user.id, user);
      created = true;
    }
    if (user.status !== 'active') return { error: AUTH_ERROR_CODES.ACCOUNT_DISABLED };
    user.lastLoginAt = input.now;
    this.sessions.set(input.sessionRef, {
      sessionRef: input.sessionRef,
      userId: user.id,
      createdAt: input.now,
      expiresAt: input.sessionExpiresAt,
      lastSeenAt: input.now,
      revokedAt: null,
      ipRef: input.ipRef,
      deviceRef: input.deviceRef,
      userAgent: input.userAgent
    });
    this.events.push({ type: created ? 'account-created' : 'login', subjectRef: input.emailRef, userId: user.id, at: input.now });
    return { verified: true, created, user: copy(user) };
  }

  async getSession({ sessionRef, now }) {
    const session = this.sessions.get(sessionRef);
    if (!session || session.revokedAt || session.expiresAt <= now) return { error: AUTH_ERROR_CODES.SESSION_INVALID };
    const user = this.users.get(session.userId);
    if (!user) return { error: AUTH_ERROR_CODES.SESSION_INVALID };
    if (user.status !== 'active') return { error: AUTH_ERROR_CODES.ACCOUNT_DISABLED };
    if (now - session.lastSeenAt > 6 * 60 * 60 * 1000) session.lastSeenAt = now;
    return { expiresAt: session.expiresAt, user: copy(user) };
  }

  async revokeSession({ sessionRef, now }) {
    const session = this.sessions.get(sessionRef);
    if (!session || session.revokedAt) return { revoked: false };
    session.revokedAt = now;
    return { revoked: true };
  }

  async ping() {
    return { ok: true, storage: 'memory-test', users: this.users.size };
  }

  async cleanup(now) {
    for (const [id, row] of this.challenges) if (row.expiresAt <= now) this.challenges.delete(id);
    for (const [id, row] of this.sessions) if (row.expiresAt <= now || row.revokedAt) this.sessions.delete(id);
    for (const [id, row] of this.rates) if (row.resetAt <= now) this.rates.delete(id);
    return { cleaned: true };
  }

  async nextExpiry(now) {
    const values = [
      ...[...this.challenges.values()].filter(row => row.expiresAt > now).map(row => row.expiresAt),
      ...[...this.sessions.values()].filter(row => row.expiresAt > now && !row.revokedAt).map(row => row.expiresAt),
      ...[...this.rates.values()].filter(row => row.resetAt > now).map(row => row.resetAt)
    ];
    return values.length ? Math.min(...values) : null;
  }

  snapshot() {
    return copy({
      challenges: [...this.challenges.values()],
      users: [...this.users.values()],
      sessions: [...this.sessions.values()],
      rates: [...this.rates.entries()],
      events: this.events
    });
  }
}
