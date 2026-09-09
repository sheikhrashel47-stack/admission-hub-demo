import test from 'node:test';
import assert from 'node:assert/strict';
import { CloudflareNativeAuthEngine, OTP_MAX_ATTEMPTS, OTP_RESEND_COOLDOWN_MS, OTP_TTL_MS, SESSION_TTL_MS } from './auth-native/core/auth-engine.mjs';
import { AUTH_ERROR_CODES, asNativeAuthError } from './auth-native/core/errors.mjs';
import { MemoryAuthRepository } from './auth-native/testing/memory-auth-repository.mjs';
import { AUTH_API_PREFIX, createNativeAuthHandler } from './auth-native/worker/public-auth-handler.mjs';

const SECRET = 'native-auth-test-secret-0123456789-ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const setup = (start = 1_800_000_000_000) => {
  let now = start;
  const repository = new MemoryAuthRepository();
  const engine = new CloudflareNativeAuthEngine({ repository, hmacSecret: SECRET, now: () => now });
  const context = { ip: '203.0.113.9', deviceId: 'device-test-0123456789012345', userAgent: 'Mozilla/5.0 Android Chrome/140' };
  return { repository, engine, context, now: () => now, advance: milliseconds => { now += milliseconds; } };
};

async function expectCode(action, code) {
  await assert.rejects(action, error => error?.code === code);
}

test('OTP challenge stores only HMAC references and never plaintext email or code', async () => {
  const state = setup();
  const prepared = await state.engine.prepareOtp({ email: 'Student.Test+1@example.com' }, state.context);
  assert.match(prepared.code, /^\d{6}$/);
  assert.match(prepared.challengeId, /^[A-Za-z0-9_-]+$/);
  const snapshot = state.repository.snapshot();
  const serialized = JSON.stringify(snapshot);
  assert.equal(serialized.includes('student.test+1@example.com'), false);
  assert.equal(serialized.includes(prepared.code), false);
  assert.match(snapshot.challenges[0].codeMac, /^[a-f0-9]{64}$/);
  assert.match(snapshot.challenges[0].emailRef, /^[a-f0-9]{64}$/);
  assert.notEqual(snapshot.challenges[0].ipRef, state.context.ip);
  assert.notEqual(snapshot.challenges[0].deviceRef, state.context.deviceId);
});

test('successful OTP atomically creates an identity, consumes challenge, and returns opaque session', async () => {
  const state = setup();
  const prepared = await state.engine.prepareOtp({ email: 'student@example.com' }, state.context);
  await state.engine.markDelivery(prepared.challengeId, { accepted: true, provider: 'mailjet' });
  const verified = await state.engine.verifyOtp({ email: 'student@example.com', challengeId: prepared.challengeId, code: prepared.code }, state.context);
  assert.equal(verified.created, true);
  assert.equal(verified.user.status, 'active');
  assert.match(verified.user.id, /^usr_[A-Za-z0-9_-]+$/);
  assert.match(verified.sessionToken, /^[A-Za-z0-9_-]{40,96}$/);
  const snapshot = state.repository.snapshot();
  assert.equal(snapshot.challenges[0].state, 'consumed');
  assert.equal(snapshot.challenges[0].codeMac, '');
  assert.equal(JSON.stringify(snapshot).includes(verified.sessionToken), false);
  const session = await state.engine.getSession(verified.sessionToken);
  assert.equal(session.user.id, verified.user.id);
  assert.equal(session.expiresAt, state.now() + SESSION_TTL_MS);
});

test('same verified email logs into the same durable identity', async () => {
  const state = setup();
  const first = await state.engine.prepareOtp({ email: 'SAME@example.com' }, state.context);
  const firstLogin = await state.engine.verifyOtp({ email: 'same@example.com', challengeId: first.challengeId, code: first.code }, state.context);
  state.advance(OTP_RESEND_COOLDOWN_MS + 1);
  const second = await state.engine.prepareOtp({ email: 'same@example.com' }, state.context);
  const secondLogin = await state.engine.verifyOtp({ email: 'same@example.com', challengeId: second.challengeId, code: second.code }, state.context);
  assert.equal(secondLogin.created, false);
  assert.equal(secondLogin.user.id, firstLogin.user.id);
  assert.notEqual(secondLogin.sessionToken, firstLogin.sessionToken);
});

test('replay, expiry, supersession, cooldown, and attempt exhaustion are rejected', async t => {
  await t.test('consumed challenge cannot be replayed', async () => {
    const state = setup();
    const challenge = await state.engine.prepareOtp({ email: 'replay@example.com' }, state.context);
    await state.engine.verifyOtp({ email: 'replay@example.com', challengeId: challenge.challengeId, code: challenge.code }, state.context);
    await expectCode(() => state.engine.verifyOtp({ email: 'replay@example.com', challengeId: challenge.challengeId, code: challenge.code }, state.context), AUTH_ERROR_CODES.OTP_USED);
  });

  await t.test('expired challenge is unusable', async () => {
    const state = setup();
    const challenge = await state.engine.prepareOtp({ email: 'expired@example.com' }, state.context);
    state.advance(OTP_TTL_MS + 1);
    await expectCode(() => state.engine.verifyOtp({ email: 'expired@example.com', challengeId: challenge.challengeId, code: challenge.code }, state.context), AUTH_ERROR_CODES.OTP_EXPIRED);
  });

  await t.test('resend cooldown and superseded challenge are enforced', async () => {
    const state = setup();
    const first = await state.engine.prepareOtp({ email: 'resend@example.com' }, state.context);
    await expectCode(() => state.engine.prepareOtp({ email: 'resend@example.com' }, state.context), AUTH_ERROR_CODES.RESEND_COOLDOWN);
    state.advance(OTP_RESEND_COOLDOWN_MS + 1);
    const second = await state.engine.prepareOtp({ email: 'resend@example.com' }, state.context);
    await expectCode(() => state.engine.verifyOtp({ email: 'resend@example.com', challengeId: first.challengeId, code: first.code }, state.context), AUTH_ERROR_CODES.OTP_INVALID);
    const result = await state.engine.verifyOtp({ email: 'resend@example.com', challengeId: second.challengeId, code: second.code }, state.context);
    assert.equal(result.created, true);
  });

  await t.test('wrong guesses lock at the configured attempt bound', async () => {
    const state = setup();
    const challenge = await state.engine.prepareOtp({ email: 'locked@example.com' }, state.context);
    const wrong = challenge.code === '999999' ? '000000' : '999999';
    for (let attempt = 1; attempt < OTP_MAX_ATTEMPTS; attempt += 1) {
      await expectCode(() => state.engine.verifyOtp({ email: 'locked@example.com', challengeId: challenge.challengeId, code: wrong }, state.context), AUTH_ERROR_CODES.OTP_INVALID);
    }
    await expectCode(() => state.engine.verifyOtp({ email: 'locked@example.com', challengeId: challenge.challengeId, code: wrong }, state.context), AUTH_ERROR_CODES.OTP_LOCKED);
    await expectCode(() => state.engine.verifyOtp({ email: 'locked@example.com', challengeId: challenge.challengeId, code: challenge.code }, state.context), AUTH_ERROR_CODES.OTP_LOCKED);
  });
});

test('recipient, network, and device fixed-window limits are consumed atomically', async () => {
  const state = setup();
  for (let index = 0; index < 3; index += 1) {
    await state.engine.prepareOtp({ email: 'limited@example.com' }, state.context);
    state.advance(OTP_RESEND_COOLDOWN_MS + 1);
  }
  await expectCode(() => state.engine.prepareOtp({ email: 'limited@example.com' }, state.context), AUTH_ERROR_CODES.RATE_LIMITED);
});

test('opaque sessions expire and revoke without exposing stored token', async () => {
  const state = setup();
  const prepared = await state.engine.prepareOtp({ email: 'session@example.com' }, state.context);
  const login = await state.engine.verifyOtp({ email: 'session@example.com', challengeId: prepared.challengeId, code: prepared.code }, state.context);
  assert.equal((await state.engine.revokeSession(login.sessionToken)).revoked, true);
  await expectCode(() => state.engine.getSession(login.sessionToken), AUTH_ERROR_CODES.SESSION_INVALID);

  state.advance(OTP_RESEND_COOLDOWN_MS + 1);
  const prepared2 = await state.engine.prepareOtp({ email: 'session@example.com' }, state.context);
  const login2 = await state.engine.verifyOtp({ email: 'session@example.com', challengeId: prepared2.challengeId, code: prepared2.code }, state.context);
  state.advance(SESSION_TTL_MS + 1);
  await expectCode(() => state.engine.getSession(login2.sessionToken), AUTH_ERROR_CODES.SESSION_INVALID);
});

class EngineNamespace {
  constructor(engine) { this.engine = engine; }
  idFromName(name) { return name; }
  get() {
    return { fetch: (request, init) => this.fetch(request instanceof Request ? request : new Request(request, init)) };
  }
  async fetch(request) {
    try {
      const url = new URL(request.url);
      if (request.method === 'GET' && url.pathname === '/internal/ping') return Response.json({ ok: true, ...(await this.engine.ping()) });
      const body = await request.json();
      const routes = {
        '/internal/otp/prepare': () => this.engine.prepareOtp(body.input, body.context),
        '/internal/otp/delivery': () => this.engine.markDelivery(body.challengeId, body.delivery),
        '/internal/otp/verify': () => this.engine.verifyOtp(body.input, body.context),
        '/internal/session/get': () => this.engine.getSession(body.sessionToken),
        '/internal/session/revoke': () => this.engine.revokeSession(body.sessionToken)
      };
      if (!routes[url.pathname]) return Response.json({ ok: false }, { status: 404 });
      return Response.json({ ok: true, result: await routes[url.pathname]() });
    } catch (cause) {
      const error = asNativeAuthError(cause);
      return Response.json({ ok: false, error: error.toPublic() }, { status: error.status, headers: error.retryAfter ? { 'Retry-After': String(error.retryAfter) } : {} });
    }
  }
}

const extractCookiePair = (response, name) => {
  const raw = response.headers.get('Set-Cookie') || '';
  const match = raw.match(new RegExp(`(?:^|,\\s*)(${name}=[^;]+)`));
  return match?.[1] || '';
};

const apiRequest = (path, { method = 'GET', body, cookie = '', origin = 'https://admissionhub.pages.dev' } = {}) => new Request(`https://worker.example${path}`, {
  method,
  headers: {
    Origin: origin,
    'CF-Connecting-IP': '203.0.113.10',
    'User-Agent': 'Mozilla/5.0 Android Chrome/140',
    ...(body ? { 'Content-Type': 'application/json' } : {}),
    ...(cookie ? { Cookie: cookie } : {})
  },
  ...(body ? { body: JSON.stringify(body) } : {})
});

const handlerSetup = () => {
  const state = setup();
  const mail = [];
  const handler = createNativeAuthHandler({
    async sendEmail(_env, _ctx, request) {
      mail.push(request);
      return { ok: true, status: 'ACCEPTED', providerId: 'mailjet' };
    }
  });
  const env = { AUTH_AUTHORITY: new EngineNamespace(state.engine) };
  return { state, mail, handler, env };
};

test('public v1 API performs request, verify, session, replay rejection, and logout with secure cookies', async () => {
  const app = handlerSetup();
  const email = 'real.user@example.com';
  const requested = await app.handler(apiRequest(`${AUTH_API_PREFIX}/otp/request`, { method: 'POST', body: { email } }), app.env, {});
  assert.equal(requested.status, 202);
  const requestedBody = await requested.json();
  assert.equal(requestedBody.ok, true);
  assert.equal(requestedBody.challenge.delivery, 'accepted');
  assert.equal(JSON.stringify(requestedBody).includes(email), false);
  assert.equal(JSON.stringify(requestedBody).includes(app.mail[0].variables.otp), false);
  assert.equal(app.mail[0].recipient, email);
  assert.equal(app.mail[0].type, 'SIGNUP_VERIFICATION');
  const device = extractCookiePair(requested, '__Host-ah_device');
  assert.ok(device);
  assert.match(requested.headers.get('Set-Cookie'), /HttpOnly; Secure; SameSite=Lax/);

  const verified = await app.handler(apiRequest(`${AUTH_API_PREFIX}/otp/verify`, {
    method: 'POST', cookie: device,
    body: { email, challengeId: requestedBody.challenge.id, code: app.mail[0].variables.otp }
  }), app.env, {});
  assert.equal(verified.status, 200);
  const verifiedBody = await verified.json();
  assert.equal(verifiedBody.authenticated, true);
  assert.equal('sessionToken' in verifiedBody, false);
  const setCookie = verified.headers.get('Set-Cookie');
  assert.match(setCookie, /^__Host-ah_session=[A-Za-z0-9_-]+;/);
  assert.match(setCookie, /Path=\/; Max-Age=\d+; HttpOnly; Secure; SameSite=Strict/);
  const session = extractCookiePair(verified, '__Host-ah_session');

  const current = await app.handler(apiRequest(`${AUTH_API_PREFIX}/session`, { cookie: `${session}; ${device}` }), app.env, {});
  assert.equal(current.status, 200);
  assert.equal((await current.json()).user.id, verifiedBody.user.id);

  const replay = await app.handler(apiRequest(`${AUTH_API_PREFIX}/otp/verify`, {
    method: 'POST', cookie: device,
    body: { email, challengeId: requestedBody.challenge.id, code: app.mail[0].variables.otp }
  }), app.env, {});
  assert.equal(replay.status, 409);
  assert.equal((await replay.json()).error.code, AUTH_ERROR_CODES.OTP_USED);

  const logout = await app.handler(apiRequest(`${AUTH_API_PREFIX}/session/logout`, { method: 'POST', cookie: session, body: {} }), app.env, {});
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get('Set-Cookie'), /Max-Age=0; HttpOnly; Secure; SameSite=Strict/);
  const after = await app.handler(apiRequest(`${AUTH_API_PREFIX}/session`, { cookie: session }), app.env, {});
  assert.equal(after.status, 401);
});

test('public API rejects untrusted origins, oversized bodies, and definite mail failures', async () => {
  const app = handlerSetup();
  const forbidden = await app.handler(apiRequest(`${AUTH_API_PREFIX}/config`, { origin: 'https://evil.example' }), app.env, {});
  assert.equal(forbidden.status, 403);
  const oversized = await app.handler(apiRequest(`${AUTH_API_PREFIX}/otp/request`, {
    method: 'POST', body: { email: 'large@example.com', padding: 'x'.repeat(5000) }
  }), app.env, {});
  assert.equal(oversized.status, 400);
  assert.equal(app.mail.length, 0);
  assert.equal(app.state.repository.snapshot().challenges.length, 0);

  const state = setup();
  const handler = createNativeAuthHandler({ sendEmail: async () => { throw new Error('provider failed'); } });
  const failed = await handler(apiRequest(`${AUTH_API_PREFIX}/otp/request`, { method: 'POST', body: { email: 'fail@example.com' } }), { AUTH_AUTHORITY: new EngineNamespace(state.engine) }, {});
  assert.equal(failed.status, 503);
  assert.equal((await failed.json()).error.code, AUTH_ERROR_CODES.DELIVERY_UNAVAILABLE);
  assert.equal(state.repository.snapshot().challenges[0].state, 'failed');
});
