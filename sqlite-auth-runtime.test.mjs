import test from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import { SqliteAuthRepository } from './auth-native/storage/sqlite-auth-repository.mjs';
import { SqliteVerificationRepository } from './auth-native/verification/sqlite-verification-repository.mjs';
import { CloudflareNativeAuthEngine } from './auth-native/core/auth-engine.mjs';
import { VerificationOrchestrator } from './auth-native/verification/orchestrator.mjs';
import { VERIFICATION_CHANNELS, VERIFICATION_MODES } from './auth-native/verification/provider-contract.mjs';

const SECRET = 'sqlite-runtime-secret-0123456789-ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const START = 1_800_000_000_000;
const CONTEXT = Object.freeze({
  ip: '203.0.113.91',
  deviceId: 'device-sqlite-runtime-123456',
  userAgent: 'Chrome',
  origin: 'https://admissionhub.pages.dev'
});

function storageFixture() {
  const database = new Database(':memory:');
  database.pragma('foreign_keys = ON');
  const sql = {
    exec(statement, ...bindings) {
      const prepared = database.prepare(statement);
      if (prepared.reader) return prepared.all(...bindings);
      prepared.run(...bindings);
      return [];
    }
  };
  return {
    database,
    storage: { sql, transactionSync(work) { return database.transaction(work)(); } }
  };
}

class OtpProvider {
  constructor(now) {
    this.id = 'otp-a';
    this.channel = VERIFICATION_CHANNELS.OTP;
    this.verificationMode = VERIFICATION_MODES.LOCAL_CODE;
    this.now = now;
    this.code = '';
    this.sends = 0;
  }
  async checkAvailability() { return { available: true, code: 'READY' }; }
  async getRemainingQuota() { return { remaining: 10, limit: 10, resetAt: this.now() + 86_400_000 }; }
  async getProviderStatus() { return { status: 'healthy', configured: true }; }
  async sendVerification(input) { this.code = input.code; this.sends += 1; return { accepted: true }; }
  async verifyCode() { return { verified: false }; }
}

class TelegramProvider {
  constructor(now) {
    this.id = 'telegram';
    this.channel = VERIFICATION_CHANNELS.TELEGRAM;
    this.verificationMode = VERIFICATION_MODES.PROVIDER_EVIDENCE;
    this.now = now;
    this.linkToken = '';
  }
  async checkAvailability() { return { available: true, code: 'READY' }; }
  async getRemainingQuota() { return { remaining: 10, limit: 10, resetAt: this.now() + 86_400_000 }; }
  async getProviderStatus() { return { status: 'healthy', configured: true }; }
  async sendVerification(input) {
    this.linkToken = input.linkToken;
    return { accepted: true, interaction: { type: 'telegram-link', url: `https://t.me/AdmissionHubVerifyBot?start=${input.linkToken}` } };
  }
  async verifyCode(input) { return { verified: input.serverConfirmed === true }; }
}

test('SQLite schema 4 executes complete Passkey repository lifecycle with valid placeholders', async t => {
  const fixture = storageFixture();
  t.after(() => fixture.database.close());
  fixture.database.exec('CREATE TABLE auth_challenges(challenge_id TEXT PRIMARY KEY)');
  const repository = new SqliteAuthRepository(fixture.storage);
  repository.migrate();
  assert.equal(fixture.database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='auth_challenges'").get(), undefined);
  const now = START;
  const base = {
    provider: 'firebase', subjectRef: 'subject-ref', emailRef: 'email-ref', emailMask: 's***@example.com',
    userIdCandidate: 'usr_sqlite', sessionRef: 'session-one', sessionExpiresAt: now + 600_000,
    ipRef: 'ip-ref', deviceRef: 'device-ref', userAgent: 'Chrome', now
  };
  assert.equal((await repository.establishExternalSession(base)).established, true);
  assert.equal((await repository.beginPasskeyRegistration({
    sessionRef: 'session-one', subjectRef: 'subject-ref', emailRef: 'email-ref',
    challengeId: 'register-challenge', challengeMac: 'register-mac', userHandleCandidate: 'user-handle',
    refreshCipher: 'encrypted-refresh-one', ipRef: 'ip-ref', deviceRef: 'device-ref', limits: [],
    now, expiresAt: now + 300_000
  })).userHandle, 'user-handle');
  assert.equal((await repository.getPasskeyRegistrationChallenge({
    sessionRef: 'session-one', subjectRef: 'subject-ref', emailRef: 'email-ref',
    challengeId: 'register-challenge', candidateChallengeMac: 'register-mac', deviceRef: 'device-ref', now
  })).refreshCipher, 'encrypted-refresh-one');
  assert.equal((await repository.finishPasskeyRegistration({
    challengeId: 'register-challenge', candidateChallengeMac: 'register-mac', deviceRef: 'device-ref',
    credential: {
      credentialId: 'credential-one', publicKeyJwk: { kty: 'EC', crv: 'P-256', x: 'x', y: 'y' },
      counter: 0, transports: ['internal'], backupEligible: true, backupState: false,
      refreshCipher: 'encrypted-refresh-two'
    }, now
  })).credentialCount, 1);
  await repository.beginPasskeyAuthentication({
    challengeId: 'auth-challenge', challengeMac: 'auth-mac', deviceRef: 'device-ref', ipRef: 'ip-ref',
    limits: [], now, expiresAt: now + 300_000
  });
  assert.equal((await repository.getPasskeyAuthenticationMaterial({
    challengeId: 'auth-challenge', candidateChallengeMac: 'auth-mac', deviceRef: 'device-ref',
    credentialId: 'credential-one', now
  })).credential.credentialId, 'credential-one');
  assert.equal((await repository.issuePasskeyTicket({
    challengeId: 'auth-challenge', candidateChallengeMac: 'auth-mac', deviceRef: 'device-ref',
    credentialId: 'credential-one', previousCounter: 0, nextCounter: 1, backupState: true,
    ticketRef: 'ticket-one', now, expiresAt: now + 60_000
  })).issued, true);
  assert.equal((await repository.completePasskeySession({
    ticketRef: 'ticket-one', subjectRef: 'subject-ref', emailRef: 'email-ref', deviceRef: 'device-ref',
    sessionRef: 'session-two', sessionExpiresAt: now + 600_000, refreshCipher: 'encrypted-refresh-three',
    ipRef: 'ip-ref', userAgent: 'Chrome', now
  })).established, true);
  assert.equal((await repository.getPasskeyStatus({
    sessionRef: 'session-two', subjectRef: 'subject-ref', emailRef: 'email-ref', now
  })).count, 1);
});

test('SQLite schema 4 executes canonical OTP and Telegram verification lifecycles and persistent policy', async t => {
  const fixture = storageFixture();
  t.after(() => fixture.database.close());
  const authRepository = new SqliteAuthRepository(fixture.storage);
  authRepository.migrate();
  const verificationRepository = new SqliteVerificationRepository(fixture.storage);
  verificationRepository.migrate();
  assert.deepEqual(await authRepository.ping(), { ok: true, storage: 'sqlite-durable-object', schema: 4 });

  let now = START;
  const engine = new CloudflareNativeAuthEngine({ repository: authRepository, hmacSecret: SECRET, now: () => now });
  const session = await engine.establishFirebaseSession({ email: 'sqlite@example.com', subject: 'firebase-sqlite-uid' }, CONTEXT);
  const identity = {
    sessionToken: session.sessionToken,
    subject: 'firebase-sqlite-uid',
    userId: session.user.id,
    email: 'sqlite@example.com'
  };
  const otp = new OtpProvider(() => now);
  const otpOrchestrator = new VerificationOrchestrator({
    repository: verificationRepository, hmacSecret: SECRET, providers: [otp], activated: true, now: () => now,
    config: { enabled: true, providers: [{ id: 'otp-a', enabled: true, priority: 1, dailyQuota: 10 }] }
  });
  const sent = await otpOrchestrator.requestVerification(identity, CONTEXT);
  assert.equal((await otpOrchestrator.verify({ ...identity, attemptId: sent.attemptId, code: otp.code }, CONTEXT)).verified, true);

  now += 61_000;
  const telegram = new TelegramProvider(() => now);
  const telegramOrchestrator = new VerificationOrchestrator({
    repository: verificationRepository, hmacSecret: SECRET, providers: [telegram], activated: true, now: () => now,
    config: { enabled: true, providers: [{ id: 'telegram', enabled: true, priority: 1, dailyQuota: 10 }] }
  });
  const telegramSent = await telegramOrchestrator.requestVerification({ ...identity, allowTelegramLink: true }, CONTEXT);
  assert.equal(telegramSent.interaction.proof, 'webhook-required');
  await telegramOrchestrator.confirmTelegramWebhook({ linkToken: telegram.linkToken, telegramUserId: '1234567', chatId: '1234567' });
  assert.equal((await telegramOrchestrator.verify({
    ...identity, attemptId: telegramSent.attemptId, evidence: 'server-confirmed'
  }, CONTEXT)).verified, true);

  await verificationRepository.setRuntimeConfig({ config: { enabled: false, policy: { maxAttempts: 4 } }, now });
  assert.equal((await verificationRepository.getRuntimeConfig()).policy.maxAttempts, 4);
  const cooldown = await verificationRepository.recordProviderResult({
    providerId: 'otp-a', attemptId: 'sqlite-provider-cooldown', userId: session.user.id,
    subjectRef: 'subject-ref-only', channel: 'otp', success: false,
    failureClass: 'temporary-provider-failure', reason: 'RATE_LIMITED', latencyMs: 12,
    failureThreshold: 3, forceCooldown: true, cooldownMs: 300_000, now
  });
  assert.equal(cooldown.circuit, 'open');
  assert.equal(cooldown.cooldownUntil, now + 300_000);
  const persisted = JSON.stringify(await verificationRepository.status({ providerIds: ['otp-a', 'telegram'], now }));
  assert.equal(persisted.includes(otp.code), false);
  assert.equal(persisted.includes(telegram.linkToken), false);
  assert.equal(persisted.includes('firebase-sqlite-uid'), false);
});


test('SQLite enforces a Firebase-user lockout across replacement backup challenges', async t => {
  const fixture = storageFixture();
  t.after(() => fixture.database.close());
  const authRepository = new SqliteAuthRepository(fixture.storage);
  authRepository.migrate();
  const verificationRepository = new SqliteVerificationRepository(fixture.storage);
  verificationRepository.migrate();
  let now = START;
  const engine = new CloudflareNativeAuthEngine({ repository: authRepository, hmacSecret: SECRET, now: () => now });
  const session = await engine.establishFirebaseSession({ email: 'locked@example.com', subject: 'firebase-locked-uid' }, CONTEXT);
  const identity = {
    sessionToken: session.sessionToken,
    subject: 'firebase-locked-uid',
    userId: session.user.id,
    email: 'locked@example.com'
  };
  const otp = new OtpProvider(() => now);
  const orchestrator = new VerificationOrchestrator({
    repository: verificationRepository, hmacSecret: SECRET, providers: [otp], activated: true, now: () => now,
    config: { enabled: true, providers: [{ id: 'otp-a', enabled: true, priority: 1, dailyQuota: 10 }] }
  });
  const sent = await orchestrator.requestVerification(identity, CONTEXT);
  const wrong = otp.code === '999999' ? '000000' : '999999';
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await assert.rejects(() => orchestrator.verify({ ...identity, attemptId: sent.attemptId, code: wrong }, CONTEXT), error => error?.code === 'OTP_INVALID');
  }
  await assert.rejects(() => orchestrator.verify({ ...identity, attemptId: sent.attemptId, code: wrong }, CONTEXT), error => error?.code === 'OTP_LOCKED');
  await assert.rejects(() => orchestrator.requestVerification(identity, CONTEXT), error => error?.code === 'OTP_LOCKED');
  assert.equal(otp.sends, 1);
  now += 900_001;
  await orchestrator.requestVerification(identity, CONTEXT);
  assert.equal(otp.sends, 2);
});


test('SQLite schema 4 upgrades a populated pre-Telegram verification table idempotently', t => {
  const fixture = storageFixture();
  t.after(() => fixture.database.close());
  const authRepository = new SqliteAuthRepository(fixture.storage);
  authRepository.migrate();
  fixture.storage.sql.exec(`CREATE TABLE auth_verification_challenges (
    attempt_id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    session_ref TEXT NOT NULL,
    subject_ref TEXT NOT NULL,
    email_ref TEXT NOT NULL,
    destination_ref TEXT NOT NULL,
    device_ref TEXT NOT NULL,
    ip_ref TEXT NOT NULL,
    purpose TEXT NOT NULL,
    code_mac TEXT NOT NULL,
    provider_id TEXT,
    channel TEXT,
    verification_mode TEXT,
    state TEXT NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    resend_at INTEGER NOT NULL,
    sent_at INTEGER,
    verified_at INTEGER,
    lockout_until INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY(user_id) REFERENCES auth_users(user_id)
  )`);
  fixture.storage.sql.exec(
    "INSERT INTO auth_users(user_id,email_ref,email_mask,status,created_at,last_login_at) VALUES(?,?,?,?,?,?)",
    'usr_old_schema', 'old-email-ref', 'o***@example.com', 'active', START, START
  );
  fixture.storage.sql.exec(
    `INSERT INTO auth_verification_challenges(
      attempt_id,user_id,session_ref,subject_ref,email_ref,destination_ref,device_ref,ip_ref,purpose,
      code_mac,provider_id,channel,verification_mode,state,attempts,max_attempts,created_at,expires_at,
      resend_at,sent_at,verified_at,lockout_until
    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    'old-attempt', 'usr_old_schema', 'old-session-ref', 'old-subject-ref', 'old-email-ref',
    'old-destination-ref', 'old-device-ref', 'old-ip-ref', 'account-backup', 'old-code-mac',
    'otp-a', 'otp', 'local-code', 'sent', 0, 5, START, START + 300_000, START + 60_000,
    START, null, 0
  );
  const verificationRepository = new SqliteVerificationRepository(fixture.storage);
  verificationRepository.migrate();
  verificationRepository.migrate();
  const columns = new Set(fixture.database.prepare('PRAGMA table_info(auth_verification_challenges)').all().map(row => row.name));
  assert.equal(columns.has('link_token_mac'), true);
  assert.equal(columns.has('provider_confirmed'), true);
  assert.equal(columns.has('external_identity_ref'), true);
  const preserved = fixture.database.prepare(
    'SELECT attempt_id AS attemptId,link_token_mac AS linkTokenMac,provider_confirmed AS providerConfirmed,external_identity_ref AS externalIdentityRef FROM auth_verification_challenges WHERE attempt_id=?'
  ).get('old-attempt');
  assert.deepEqual(preserved, { attemptId: 'old-attempt', linkTokenMac: '', providerConfirmed: 0, externalIdentityRef: null });
  assert.equal(fixture.database.prepare("SELECT value FROM auth_meta WHERE key='schema_version'").get().value, '4');
});
