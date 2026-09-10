import test from 'node:test';
import assert from 'node:assert/strict';
import { CloudflareNativeAuthEngine, SESSION_TTL_MS } from './auth-native/core/auth-engine.mjs';
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

test('retired standalone OTP identity methods are absent and cannot create a session', () => {
  const state = setup();
  assert.equal(typeof state.engine.prepareOtp, 'undefined');
  assert.equal(typeof state.engine.markDelivery, 'undefined');
  assert.equal(typeof state.engine.verifyOtp, 'undefined');
  const snapshot = state.repository.snapshot();
  assert.equal(snapshot.users.length, 0);
  assert.equal(snapshot.sessions.length, 0);
});

test('same Firebase subject and email preserve one durable identity across sessions', async () => {
  const state = setup();
  const first = await state.engine.establishFirebaseSession({ email: 'SAME@example.com', subject: 'firebase-uid-one' }, state.context);
  const second = await state.engine.establishFirebaseSession({ email: 'same@example.com', subject: 'firebase-uid-one' }, state.context);
  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(second.user.id, first.user.id);
  assert.notEqual(second.sessionToken, first.sessionToken);
  assert.equal(state.repository.snapshot().users.length, 1);
});

test('different Firebase subject cannot silently take over an existing email-linked account', async () => {
  const state = setup();
  await state.engine.establishFirebaseSession({ email: 'collision@example.com', subject: 'firebase-uid-original' }, state.context);
  await expectCode(
    () => state.engine.establishFirebaseSession({ email: 'collision@example.com', subject: 'firebase-uid-other' }, state.context),
    AUTH_ERROR_CODES.ACCOUNT_CONFLICT
  );
  assert.equal(state.repository.snapshot().users.length, 1);
  assert.equal(state.repository.snapshot().externalIdentities.length, 1);
});

test('Firebase operation limits are consumed atomically', async () => {
  const state = setup();
  for (let index = 0; index < 12; index += 1) {
    await state.engine.consumeFirebaseOperation({ operation: 'login', email: 'limited@example.com' }, state.context);
  }
  await expectCode(
    () => state.engine.consumeFirebaseOperation({ operation: 'login', email: 'limited@example.com' }, state.context),
    AUTH_ERROR_CODES.RATE_LIMITED
  );
});

test('opaque Firebase sessions expire and revoke without exposing stored token', async () => {
  const state = setup();
  const login = await state.engine.establishFirebaseSession({ email: 'session@example.com', subject: 'firebase-uid-session' }, state.context);
  assert.equal(JSON.stringify(state.repository.snapshot()).includes(login.sessionToken), false);
  assert.equal((await state.engine.revokeSession(login.sessionToken)).revoked, true);
  await expectCode(() => state.engine.getSession(login.sessionToken), AUTH_ERROR_CODES.SESSION_INVALID);

  const login2 = await state.engine.establishFirebaseSession({ email: 'session@example.com', subject: 'firebase-uid-session' }, state.context);
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
        '/internal/firebase/rate': () => this.engine.consumeFirebaseOperation(body.input, body.context),
        '/internal/firebase/session/create': () => this.engine.establishFirebaseSession(body.input, body.context),
        '/internal/firebase/session/get': () => this.engine.getFirebaseSession(body.sessionToken, body.input),
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

class FirebaseMock {
  constructor() {
    this.users = new Map();
    this.tokens = new Map();
    this.refreshTokens = new Map();
    this.calls = [];
    this.sequence = 0;
    this.failVerification = false;
    this.malformedVerification = false;
    this.malformedSignIn = false;
  }

  token(prefix) {
    this.sequence += 1;
    return `${prefix}_${String(this.sequence).padStart(4, '0')}_${'x'.repeat(30)}`;
  }

  response(payload, status = 200) {
    return Response.json(payload, { status });
  }

  error(message, status = 400) {
    return this.response({ error: { message } }, status);
  }

  async fetch(url, init) {
    const parsed = new URL(url);
    const form = String(init?.headers?.['Content-Type'] || '').includes('x-www-form-urlencoded');
    const body = form ? Object.fromEntries(new URLSearchParams(String(init.body || ''))) : JSON.parse(String(init?.body || '{}'));
    this.calls.push({ pathname: parsed.pathname, body: { ...body, ...(body.password ? { password: '[redacted]' } : {}) } });

    if (parsed.pathname.endsWith('/projects') && init?.method === 'GET') {
      return this.response({ projectId: 'admission-hub-test', authorizedDomains: ['admissionhub.pages.dev'] });
    }

    if (parsed.pathname.endsWith('/accounts:signUp')) {
      const email = String(body.email || '').toLowerCase();
      if (this.users.has(email)) return this.error('EMAIL_EXISTS');
      const localId = this.token('firebase-user');
      const idToken = this.token('firebase-id');
      const refreshToken = this.token('firebase-refresh');
      const user = { email, password: body.password, localId, emailVerified: false, disabled: false };
      this.users.set(email, user);
      this.tokens.set(idToken, user);
      this.refreshTokens.set(refreshToken, user);
      return this.response({ localId, idToken, refreshToken, expiresIn: '3600' });
    }

    if (parsed.pathname.endsWith('/accounts:sendOobCode')) {
      if (this.failVerification) return this.error('QUOTA_EXCEEDED', 429);
      if (this.malformedVerification) return this.response({});
      const user = this.tokens.get(body.idToken);
      if (!user || body.requestType !== 'VERIFY_EMAIL') return this.error('INVALID_ID_TOKEN');
      return this.response({ email: user.email });
    }

    if (parsed.pathname.endsWith('/accounts:delete')) {
      const user = this.tokens.get(body.idToken);
      if (!user) return this.error('INVALID_ID_TOKEN');
      this.users.delete(user.email);
      return this.response({ kind: 'identitytoolkit#DeleteAccountResponse' });
    }

    if (parsed.pathname.endsWith('/accounts:signInWithPassword')) {
      if (this.malformedSignIn) return this.response({});
      const user = this.users.get(String(body.email || '').toLowerCase());
      if (!user || user.password !== body.password) return this.error('INVALID_LOGIN_CREDENTIALS');
      if (user.disabled) return this.error('USER_DISABLED');
      const idToken = this.token('firebase-id');
      const refreshToken = this.token('firebase-refresh');
      this.tokens.set(idToken, user);
      this.refreshTokens.set(refreshToken, user);
      return this.response({ localId: user.localId, idToken, refreshToken, expiresIn: '3600' });
    }

    if (parsed.pathname.endsWith('/accounts:lookup')) {
      const user = this.tokens.get(body.idToken);
      if (!user) return this.error('INVALID_ID_TOKEN');
      return this.response({ users: [{ localId: user.localId, email: user.email, emailVerified: user.emailVerified, disabled: user.disabled }] });
    }

    if (parsed.pathname.endsWith('/token')) {
      const user = this.refreshTokens.get(body.refresh_token);
      if (!user) return this.error('INVALID_REFRESH_TOKEN');
      const idToken = this.token('firebase-id');
      const refreshToken = this.token('firebase-refresh');
      this.tokens.set(idToken, user);
      this.refreshTokens.set(refreshToken, user);
      return this.response({ user_id: user.localId, id_token: idToken, refresh_token: refreshToken, expires_in: '3600' });
    }

    return this.error('NOT_FOUND', 404);
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
  const firebase = new FirebaseMock();
  const handler = createNativeAuthHandler({ fetchImpl: firebase.fetch.bind(firebase) });
  const env = {
    AUTH_AUTHORITY: new EngineNamespace(state.engine),
    FIREBASE_WEB_API_KEY: 'test-firebase-api-key-1234567890',
    FIREBASE_CONTINUE_URL: 'https://admissionhub.pages.dev/?firebaseVerified=1'
  };
  return { state, firebase, handler, env };
};

test('Firebase signup sends standard verification but creates no authenticated session', async () => {
  const app = handlerSetup();
  const email = 'real.user@example.com';
  const password = 'Correct-Horse-42';
  const signup = await app.handler(apiRequest(`${AUTH_API_PREFIX}/signup`, { method: 'POST', body: { email, password } }), app.env, {});
  assert.equal(signup.status, 202);
  const body = await signup.json();
  assert.equal(body.accountCreated, true);
  assert.equal(body.authenticated, false);
  assert.equal(body.verification.sent, true);
  assert.equal(body.verification.dailyCapacity, 1000);
  assert.equal(body.verification.resendAfter, 60);
  assert.equal(JSON.stringify(body).includes(email), false);
  assert.equal(JSON.stringify(body).includes(password), false);
  assert.equal(app.firebase.calls.filter(call => call.pathname.endsWith('/accounts:sendOobCode')).length, 1);
  assert.equal(app.firebase.calls.find(call => call.pathname.endsWith('/accounts:sendOobCode')).body.requestType, 'VERIFY_EMAIL');
  assert.equal(extractCookiePair(signup, '__Host-ah_session'), '');
  assert.equal(extractCookiePair(signup, '__Host-ah_firebase'), '');
  assert.ok(extractCookiePair(signup, '__Host-ah_device'));
});

test('unverified Firebase account is denied, verified account gets opaque HttpOnly session', async () => {
  const app = handlerSetup();
  const email = 'verified.user@example.com';
  const password = 'Secure-password-88';
  await app.handler(apiRequest(`${AUTH_API_PREFIX}/signup`, { method: 'POST', body: { email, password } }), app.env, {});

  const denied = await app.handler(apiRequest(`${AUTH_API_PREFIX}/login`, { method: 'POST', body: { email, password } }), app.env, {});
  assert.equal(denied.status, 403);
  assert.equal((await denied.json()).error.code, AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED);
  assert.equal(extractCookiePair(denied, '__Host-ah_session'), '');

  app.firebase.users.get(email).emailVerified = true;
  const login = await app.handler(apiRequest(`${AUTH_API_PREFIX}/login`, { method: 'POST', body: { email, password } }), app.env, {});
  assert.equal(login.status, 200);
  const loginBody = await login.json();
  assert.equal(loginBody.authenticated, true);
  assert.equal(loginBody.emailVerified, true);
  assert.equal('sessionToken' in loginBody, false);
  assert.equal(JSON.stringify(loginBody).includes(password), false);
  const session = extractCookiePair(login, '__Host-ah_session');
  const firebase = extractCookiePair(login, '__Host-ah_firebase');
  assert.ok(session);
  assert.ok(firebase);
  assert.match(login.headers.get('Set-Cookie'), /HttpOnly; Secure; SameSite=Strict/);

  const current = await app.handler(apiRequest(`${AUTH_API_PREFIX}/session`, { cookie: `${session}; ${firebase}` }), app.env, {});
  assert.equal(current.status, 200);
  const currentBody = await current.json();
  assert.equal(currentBody.emailVerified, true);
  assert.equal(currentBody.user.id, loginBody.user.id);
  assert.ok(extractCookiePair(current, '__Host-ah_firebase'));

  const logout = await app.handler(apiRequest(`${AUTH_API_PREFIX}/session/logout`, { method: 'POST', cookie: `${session}; ${firebase}`, body: {} }), app.env, {});
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get('Set-Cookie'), /Max-Age=0; HttpOnly; Secure; SameSite=Strict/);
  const after = await app.handler(apiRequest(`${AUTH_API_PREFIX}/session`, { cookie: `${session}; ${firebase}` }), app.env, {});
  assert.equal(after.status, 401);
});

test('verification resend requires password and never authenticates the user', async () => {
  const app = handlerSetup();
  const email = 'resend.user@example.com';
  const password = 'Resend-password-77';
  await app.handler(apiRequest(`${AUTH_API_PREFIX}/signup`, { method: 'POST', body: { email, password } }), app.env, {});
  const early = await app.handler(apiRequest(`${AUTH_API_PREFIX}/verification/resend`, { method: 'POST', body: { email, password } }), app.env, {});
  assert.equal(early.status, 429);
  assert.equal((await early.json()).error.retryAfter, 60);
  assert.equal(app.firebase.calls.filter(call => call.pathname.endsWith('/accounts:sendOobCode')).length, 1);
  app.state.advance(60_001);
  const resent = await app.handler(apiRequest(`${AUTH_API_PREFIX}/verification/resend`, { method: 'POST', body: { email, password } }), app.env, {});
  assert.equal(resent.status, 202);
  const resentBody = await resent.json();
  assert.equal(resentBody.authenticated, false);
  assert.equal(resentBody.verification.resendAfter, 60);
  assert.equal(extractCookiePair(resent, '__Host-ah_session'), '');
  assert.equal(app.firebase.calls.filter(call => call.pathname.endsWith('/accounts:sendOobCode')).length, 2);
});

test('config publishes verified-only Firebase mode and correct Spark verification capacity', async () => {
  const app = handlerSetup();
  const response = await app.handler(apiRequest(`${AUTH_API_PREFIX}/config`), app.env, {});
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.auth.provider, 'firebase');
  assert.equal(body.auth.mode, 'firebase-canonical-multi-method');
  assert.equal(body.auth.available, true);
  assert.equal(body.auth.methods.emailPassword.available, true);
  assert.equal(body.auth.methods.google.available, false);
  assert.equal(body.auth.methods.passkey.neverMandatory, true);
  assert.equal(body.auth.methods.backup.available, false);
  assert.equal(body.auth.availabilityCode, 'READY');
  assert.equal(body.auth.providerStatus, 0);
  assert.equal(body.auth.emailVerifiedRequired, true);
  assert.equal(body.auth.verificationEmail.dailyCapacity, 1000);
  assert.equal(body.auth.verificationEmail.resendCooldownSeconds, 60);
  assert.equal(body.auth.registeredAccountLimit, 'unlimited');
  const firebaseCalls = app.firebase.calls.length;
  const cached = await app.handler(apiRequest(`${AUTH_API_PREFIX}/config`), app.env, {});
  assert.equal(cached.status, 200);
  assert.equal(app.firebase.calls.length, firebaseCalls);
});

test('Passkey canary is server-authorized only for the explicit test URL and cannot leak through config cache', async () => {
  const app = handlerSetup();
  app.env.PASSKEY_AUTH_ACTIVATION = 'canary';

  const canary = await app.handler(apiRequest(`${AUTH_API_PREFIX}/config?passkeyCanary=1`), app.env, {});
  assert.equal(canary.status, 200);
  assert.equal((await canary.json()).auth.methods.passkey.available, true);

  const publicConfig = await app.handler(apiRequest(`${AUTH_API_PREFIX}/config`), app.env, {});
  assert.equal(publicConfig.status, 200);
  const publicBody = await publicConfig.json();
  assert.equal(publicBody.auth.methods.passkey.available, false);
  assert.equal(publicBody.auth.methods.passkey.availabilityCode, 'LIVE_E2E_PENDING');

  const cachedCanary = await app.handler(apiRequest(`${AUTH_API_PREFIX}/config?passkeyCanary=1`), app.env, {});
  assert.equal((await cachedCanary.json()).auth.methods.passkey.available, true);
});

test('public API rejects untrusted origins, weak or oversized input, and fails closed without Firebase config', async () => {
  const app = handlerSetup();
  const forbidden = await app.handler(apiRequest(`${AUTH_API_PREFIX}/config`, { origin: 'https://evil.example' }), app.env, {});
  assert.equal(forbidden.status, 403);
  const missingOrigin = await app.handler(apiRequest(`${AUTH_API_PREFIX}/signup`, {
    method: 'POST', origin: '', body: { email: 'origin@example.com', password: 'StrongPass!123' }
  }), app.env, {});
  assert.equal(missingOrigin.status, 403);

  const weak = await app.handler(apiRequest(`${AUTH_API_PREFIX}/signup`, {
    method: 'POST', body: { email: 'weak@example.com', password: 'short' }
  }), app.env, {});
  assert.equal(weak.status, 400);
  assert.equal((await weak.json()).error.code, AUTH_ERROR_CODES.WEAK_PASSWORD);
  assert.equal(app.firebase.calls.length, 0);

  const oversized = await app.handler(apiRequest(`${AUTH_API_PREFIX}/signup`, {
    method: 'POST', body: { email: 'large@example.com', password: 'x'.repeat(5000) }
  }), app.env, {});
  assert.equal(oversized.status, 400);
  assert.equal(app.firebase.calls.length, 0);

  const missing = { ...app.env };
  delete missing.FIREBASE_WEB_API_KEY;
  const missingConfig = await app.handler(apiRequest(`${AUTH_API_PREFIX}/config`), missing, {});
  const missingConfigBody = await missingConfig.json();
  assert.equal(missingConfigBody.auth.available, false);
  assert.equal(missingConfigBody.auth.availabilityCode, 'CREDENTIAL_MISSING');
  assert.equal(missingConfigBody.auth.providerStatus, 0);

  const unavailable = await app.handler(apiRequest(`${AUTH_API_PREFIX}/signup`, {
    method: 'POST', body: { email: 'closed@example.com', password: 'Safe-password-11' }
  }), missing, {});
  assert.equal(unavailable.status, 503);
  assert.equal((await unavailable.json()).error.code, AUTH_ERROR_CODES.NOT_CONFIGURED);
  assert.equal(extractCookiePair(unavailable, '__Host-ah_session'), '');
});

test('verification provider failure does not create a local authenticated identity', async () => {
  const app = handlerSetup();
  app.firebase.failVerification = true;
  const response = await app.handler(apiRequest(`${AUTH_API_PREFIX}/signup`, {
    method: 'POST', body: { email: 'quota@example.com', password: 'Safe-password-22' }
  }), app.env, {});
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error.code, AUTH_ERROR_CODES.VERIFICATION_UNAVAILABLE);
  assert.equal(app.state.repository.snapshot().users.length, 0);
  assert.equal(app.state.repository.snapshot().sessions.length, 0);
});

test('failed duplicate signup cannot consume the 1000/day verification-send capacity', async () => {
  const app = handlerSetup();
  const email = 'duplicate.user@example.com';
  const password = 'Secure-password-66';
  const first = await app.handler(apiRequest(`${AUTH_API_PREFIX}/signup`, { method: 'POST', body: { email, password } }), app.env, {});
  assert.equal(first.status, 202);
  app.state.advance(60_001);
  const duplicate = await app.handler(apiRequest(`${AUTH_API_PREFIX}/signup`, { method: 'POST', body: { email, password } }), app.env, {});
  assert.equal(duplicate.status, 409);
  const globalRows = app.state.repository.snapshot().rates.filter(([key]) => key.startsWith('firebase-verification-global-day:'));
  assert.equal(globalRows.length, 1);
  assert.equal(globalRows[0][1].count, 1);
});

test('provider failures expose only a bounded operation diagnostic header', async () => {
  const app = handlerSetup();
  const email = 'diagnostic.user@example.com';
  const password = 'Safe-password-77';
  await app.handler(apiRequest(`${AUTH_API_PREFIX}/signup`, { method: 'POST', body: { email, password } }), app.env, {});
  app.firebase.malformedSignIn = true;
  const response = await app.handler(apiRequest(`${AUTH_API_PREFIX}/login`, {
    method: 'POST', body: { email, password }
  }), app.env, {});
  assert.equal(response.status, 503);
  assert.equal(response.headers.get('X-AH-Auth-Diagnostic'), 'SIGNIN_INVALID_PROVIDER_RESPONSE');
  const body = await response.json();
  assert.equal(body.error.code, AUTH_ERROR_CODES.AUTH_PROVIDER_UNAVAILABLE);
  assert.equal('providerDiagnostic' in body.error, false);
  assert.equal(JSON.stringify(body).includes(email), false);
  assert.equal(JSON.stringify(body).includes(password), false);
});

test('malformed Firebase verification acceptance fails closed without an authenticated session', async () => {
  const app = handlerSetup();
  app.firebase.malformedVerification = true;
  const response = await app.handler(apiRequest(`${AUTH_API_PREFIX}/signup`, {
    method: 'POST', body: { email: 'malformed@example.com', password: 'Safe-password-33' }
  }), app.env, {});
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error.code, AUTH_ERROR_CODES.VERIFICATION_UNAVAILABLE);
  assert.equal(app.state.repository.snapshot().users.length, 0);
  assert.equal(app.state.repository.snapshot().sessions.length, 0);
});
