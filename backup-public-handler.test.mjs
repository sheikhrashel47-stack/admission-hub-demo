import test from 'node:test';
import assert from 'node:assert/strict';
import { CloudflareNativeAuthEngine } from './auth-native/core/auth-engine.mjs';
import { asNativeAuthError, AUTH_ERROR_CODES } from './auth-native/core/errors.mjs';
import { MemoryAuthRepository } from './auth-native/testing/memory-auth-repository.mjs';
import { MemoryVerificationRepository } from './auth-native/verification/memory-verification-repository.mjs';
import { VerificationOrchestrator } from './auth-native/verification/orchestrator.mjs';
import { VERIFICATION_CHANNELS, VERIFICATION_MODES } from './auth-native/verification/provider-contract.mjs';
import { AUTH_API_PREFIX, createNativeAuthHandler } from './auth-native/worker/public-auth-handler.mjs';

const SECRET = 'public-backup-handler-secret-0123456789-ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const EMAIL = 'public.backup@example.com';
const SUBJECT = 'firebase-public-backup-uid';
const REFRESH = `firebase-refresh-${'r'.repeat(32)}`;
const ID_TOKEN = `firebase-id-${'i'.repeat(32)}`;
const DEVICE = 'device-public-backup-123456';

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
  async getRemainingQuota() { return { remaining: 100, limit: 100, resetAt: this.now() + 86_400_000 }; }
  async getProviderStatus() { return { status: 'healthy', configured: true }; }
  async sendVerification(input) { this.code = input.code; this.sends += 1; return { accepted: true }; }
  async verifyCode() { return { verified: false }; }
}

class AuthorityNamespace {
  constructor(engine, verification) { this.engine = engine; this.verification = verification; }
  idFromName(name) { return name; }
  get() { return { fetch: this.fetch.bind(this) }; }
  async fetch(input, init) {
    const request = input instanceof Request ? input : new Request(input, init);
    const path = new URL(request.url).pathname;
    try {
      const body = request.method === 'GET' ? {} : await request.json();
      if (path === '/internal/verification/request' || path === '/internal/verification/verify') {
        const current = await this.engine.getFirebaseSession(body.input.sessionToken, {
          email: body.input.email,
          subject: body.input.subject
        });
        const verifiedInput = { ...body.input, userId: current.user.id };
        const result = path.endsWith('/request')
          ? await this.verification.requestVerification(verifiedInput, body.context)
          : await this.verification.verify(verifiedInput, body.context);
        return Response.json({ ok: true, result });
      }
      if (path === '/internal/firebase/session/get') {
        return Response.json({ ok: true, result: await this.engine.getFirebaseSession(body.sessionToken, body.input) });
      }
      if (path === '/internal/session/revoke') return Response.json({ ok: true, result: await this.engine.revokeSession(body.sessionToken) });
      return Response.json({ ok: false, error: { code: 'NOT_FOUND' } }, { status: 404 });
    } catch (cause) {
      const error = asNativeAuthError(cause);
      return Response.json({ ok: false, error: error.toPublic() }, { status: error.status });
    }
  }
}

const request = (path, { body, cookie } = {}) => new Request(`https://worker.example${path}`, {
  method: body ? 'POST' : 'GET',
  headers: {
    Origin: 'https://admissionhub.pages.dev',
    'CF-Connecting-IP': '203.0.113.92',
    'User-Agent': 'Chrome',
    ...(body ? { 'Content-Type': 'application/json' } : {}),
    ...(cookie ? { Cookie: cookie } : {})
  },
  ...(body ? { body: JSON.stringify(body) } : {})
});

async function setup() {
  let now = 1_800_000_000_000;
  const authRepository = new MemoryAuthRepository();
  const engine = new CloudflareNativeAuthEngine({ repository: authRepository, hmacSecret: SECRET, now: () => now });
  const context = { ip: '203.0.113.92', deviceId: DEVICE, userAgent: 'Chrome', origin: 'https://admissionhub.pages.dev' };
  const session = await engine.establishFirebaseSession({ email: EMAIL, subject: SUBJECT }, context);
  const provider = new OtpProvider(() => now);
  const verification = new VerificationOrchestrator({
    repository: new MemoryVerificationRepository(),
    hmacSecret: SECRET,
    providers: [provider],
    activated: true,
    now: () => now,
    config: { enabled: true, providers: [{ id: 'otp-a', enabled: true, priority: 1, dailyQuota: 100 }] }
  });
  const firebaseFetch = async (url, init = {}) => {
    const path = new URL(url).pathname;
    if (path.endsWith('/token')) return Response.json({
      user_id: SUBJECT,
      id_token: ID_TOKEN,
      refresh_token: REFRESH,
      expires_in: '3600'
    });
    if (path.endsWith('/accounts:lookup')) return Response.json({ users: [{
      localId: SUBJECT,
      email: EMAIL,
      emailVerified: true,
      disabled: false
    }] });
    return Response.json({ error: { message: 'NOT_FOUND' } }, { status: 404 });
  };
  const handler = createNativeAuthHandler({ fetchImpl: firebaseFetch });
  const env = {
    AUTH_AUTHORITY: new AuthorityNamespace(engine, verification),
    FIREBASE_WEB_API_KEY: 'firebase-public-backup-api-key-12345'
  };
  const cookie = `__Host-ah_session=${session.sessionToken}; __Host-ah_firebase=${REFRESH}; __Host-ah_device=${DEVICE}`;
  return { handler, env, cookie, provider, session, engine, advance: value => { now += value; } };
}

test('public generic backup remains bound to active Firebase UID/session and wrong code never resends', async () => {
  const app = await setup();
  const sent = await app.handler(request(`${AUTH_API_PREFIX}/backup/request`, {
    body: { purpose: 'account-backup' }, cookie: app.cookie
  }), app.env);
  assert.equal(sent.status, 202);
  const sentBody = await sent.json();
  assert.equal(sentBody.accepted, true);
  assert.equal('providerId' in sentBody, false);
  assert.equal(JSON.stringify(sentBody).includes(app.provider.code), false);

  const wrong = app.provider.code === '999999' ? '000000' : '999999';
  const rejected = await app.handler(request(`${AUTH_API_PREFIX}/backup/verify`, {
    body: { purpose: 'account-backup', attemptId: sentBody.attemptId, code: wrong }, cookie: app.cookie
  }), app.env);
  assert.equal(rejected.status, 401);
  assert.equal((await rejected.json()).error.code, AUTH_ERROR_CODES.OTP_INVALID);
  assert.equal(app.provider.sends, 1);

  const accepted = await app.handler(request(`${AUTH_API_PREFIX}/backup/verify`, {
    body: { purpose: 'account-backup', attemptId: sentBody.attemptId, code: app.provider.code }, cookie: app.cookie
  }), app.env);
  assert.equal(accepted.status, 200);
  const acceptedBody = await accepted.json();
  assert.equal(acceptedBody.verified, true);
  assert.equal(acceptedBody.userId, app.session.user.id);
  assert.equal((await app.engine.getFirebaseSession(app.session.sessionToken, { email: EMAIL, subject: SUBJECT })).user.id, app.session.user.id);
  assert.equal(app.provider.sends, 1);
});

test('backup request fails closed when the Firebase session cookie is absent or mismatched', async () => {
  const app = await setup();
  const missing = await app.handler(request(`${AUTH_API_PREFIX}/backup/request`, {
    body: { purpose: 'account-backup' }, cookie: `__Host-ah_firebase=${REFRESH}; __Host-ah_device=${DEVICE}`
  }), app.env);
  assert.equal(missing.status, 401);
  assert.equal((await missing.json()).error.code, AUTH_ERROR_CODES.SESSION_INVALID);
  assert.equal(app.provider.sends, 0);
});
