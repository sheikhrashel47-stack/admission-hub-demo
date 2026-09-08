import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAuthFoundation, AUTH_FOUNDATION_VERSION, AUTH_STATES, AUTH_METHODS,
  AUTH_ERROR_CODES, AUTH_ERROR_TYPES, AUTH_PUBLIC_METHODS, AuthError, classifyAuthError
} from './auth/index.mjs';
import { AUTH_TRANSITIONS, canTransition, assertTransition } from './auth/core/state-machine.mjs';
import { createAuthConfig } from './auth/core/config.mjs';
import { mergePorts } from './auth/core/contracts.mjs';
import { createMockPorts } from './auth/testing/mock-ports.mjs';

const validLogin = { method: AUTH_METHODS.PASSWORD, email: 'student@example.com', password: 'correct horse battery staple', rememberMe: true };
const validSignup = { name: 'Admission Student', email: 'new@example.com', password: 'long-password', confirmPassword: 'long-password' };

const ready = async behavior => {
  const mock = createMockPorts(behavior);
  const auth = createAuthFoundation({ ports: mock.ports, config: { operation: { timeoutMs: 300, maxRetries: 1, baseDelayMs: 1, maxDelayMs: 2 } } });
  await auth.initialize();
  return { auth, ...mock };
};

test('foundation has an explicit immutable version and state vocabulary', () => {
  assert.equal(AUTH_FOUNDATION_VERSION, 'phase2a-1');
  assert.deepEqual(Object.values(AUTH_STATES), ['INITIALIZING','CHECKING_SESSION','UNAUTHENTICATED','AUTHENTICATING','AUTHENTICATED','REFRESHING','RECOVERING','LOGGING_OUT']);
  assert.ok(Object.isFrozen(AUTH_STATES));
});

test('public Auth contract is frozen and contains only approved methods', () => {
  const auth = createAuthFoundation();
  assert.ok(Object.isFrozen(auth));
  assert.deepEqual(Object.keys(auth), AUTH_PUBLIC_METHODS);
  assert.equal('core' in auth, false);
  assert.equal('store' in auth, false);
  assert.equal('services' in auth, false);
  assert.throws(() => { auth.internal = true; }, TypeError);
});

test('default unbound foundation initializes safely as unauthenticated', async () => {
  const auth = createAuthFoundation();
  const state = await auth.initialize();
  assert.equal(state.state, AUTH_STATES.UNAUTHENTICATED);
  assert.equal(state.initialized, true);
  assert.equal(auth.isAuthenticated(), false);
  assert.equal(auth.getCurrentUser(), null);
  assert.equal(auth.getSession(), null);
});

test('public sign-in safely initializes first when caller omits initialize()', async () => {
  const mock = createMockPorts();
  const auth = createAuthFoundation({ ports: mock.ports });
  await auth.signIn(validLogin);
  assert.equal(auth.getState().initialized, true);
  assert.equal(auth.isAuthenticated(), true);
  assert.equal(mock.calls['session.restore'], 1);
  assert.equal(mock.calls['auth.authenticate'], 1);
});

test('unbound authority fails closed without infinite loading', async () => {
  const auth = createAuthFoundation();
  await auth.initialize();
  await assert.rejects(auth.signIn(validLogin), error => error.code === AUTH_ERROR_CODES.NOT_CONFIGURED && error.retryable === false);
  assert.equal(auth.getState().state, AUTH_STATES.UNAUTHENTICATED);
  assert.equal(auth.getState().operation, null);
});

test('password orchestration authenticates, resolves identity, then creates session', async () => {
  const { auth, history } = await ready();
  const states = [];
  const unsubscribe = auth.subscribe(snapshot => states.push(snapshot.state));
  const state = await auth.signIn(validLogin);
  unsubscribe();
  assert.equal(state.state, AUTH_STATES.AUTHENTICATED);
  assert.equal(auth.isAuthenticated(), true);
  const order = history.map(row => row.name);
  assert.ok(order.indexOf('auth.authenticate') < order.indexOf('security.assess'));
  assert.ok(order.indexOf('security.assess') < order.indexOf('identity.resolve'));
  assert.ok(order.indexOf('identity.resolve') < order.indexOf('session.create'));
  const transaction = history.filter(row => ['auth.authenticate','security.assess','identity.resolve','session.create'].includes(row.name));
  assert.equal(new Set(transaction.map(row => row.idempotencyKey)).size, 1);
  assert.ok(transaction[0].idempotencyKey);
  assert.ok(states.includes(AUTH_STATES.AUTHENTICATING));
  assert.ok(states.includes(AUTH_STATES.AUTHENTICATED));
});

test('public identity and session expose metadata but strip provider/session internals', async () => {
  const { auth } = await ready();
  await auth.signIn(validLogin);
  assert.deepEqual(auth.getCurrentUser(), { id: 'user-1', status: 'active', displayName: 'Mock Student' });
  const session = auth.getSession();
  assert.equal(session.id, 'session-1');
  assert.equal('accessToken' in session, false);
  assert.equal('refreshToken' in session, false);
  assert.equal('handle' in session, false);
  assert.ok(Object.isFrozen(session));
  assert.ok(Object.isFrozen(auth.getState()));
});

test('sign-in validation blocks malformed email before calling authority', async () => {
  const { auth, calls } = await ready();
  await assert.rejects(auth.signIn({ email: 'bad', password: 'x' }), error => error.code === AUTH_ERROR_CODES.INVALID_INPUT);
  assert.equal(calls['auth.authenticate'] || 0, 0);
  assert.equal(auth.getState().state, AUTH_STATES.UNAUTHENTICATED);
});

test('signup validation blocks mismatch and valid signup uses account authority once', async () => {
  const first = await ready();
  await assert.rejects(first.auth.signUp({ ...validSignup, confirmPassword: 'different' }), error => error.code === AUTH_ERROR_CODES.INVALID_INPUT);
  assert.equal(first.calls['auth.signUp'] || 0, 0);
  const second = await ready();
  await second.auth.signUp(validSignup);
  assert.equal(second.calls['auth.signUp'], 1);
  assert.equal(second.auth.isAuthenticated(), true);
});

test('Google method is isolated in OAuth Service', async () => {
  const { auth, calls } = await ready();
  await auth.signIn({ method: AUTH_METHODS.GOOGLE, assertion: 'mock-only' });
  assert.equal(calls['oauth.authenticate'], 1);
  assert.equal(calls['auth.authenticate'] || 0, 0);
});

test('email OTP method is isolated in Verification Service', async () => {
  const { auth, calls } = await ready();
  await auth.signIn({ method: AUTH_METHODS.EMAIL_OTP, verificationHandle: 'mock-only' });
  assert.equal(calls['verification.verify'], 1);
  assert.equal(calls['auth.authenticate'] || 0, 0);
});

test('unsupported Passkey degrades safely and password remains available', async () => {
  const { auth, calls } = await ready({ passkeySupported: false });
  await assert.rejects(auth.signIn({ method: AUTH_METHODS.PASSKEY }), error => error.code === AUTH_ERROR_CODES.UNSUPPORTED && error.retryable === false);
  assert.equal(calls['passkey.authenticate'] || 0, 0);
  await auth.signIn(validLogin);
  assert.equal(auth.isAuthenticated(), true);
});

test('security challenge enters controlled recovery and ends without stale auth', async () => {
  const { auth } = await ready({
    'security.assess': async () => ({ allowed: true, challengeRequired: true, challenge: 'email-otp' })
  });
  const states = [];
  auth.subscribe(snapshot => states.push(snapshot.state));
  await assert.rejects(auth.signIn(validLogin), error => error.code === AUTH_ERROR_CODES.SECURITY_CHALLENGE_REQUIRED);
  assert.ok(states.includes(AUTH_STATES.RECOVERING));
  assert.equal(auth.getState().state, AUTH_STATES.UNAUTHENTICATED);
  assert.equal(auth.isAuthenticated(), false);
});

test('provider rejection cannot leave AUTHENTICATING or stale state', async () => {
  const { auth } = await ready({
    'auth.authenticate': async () => { throw Object.assign(new Error('bad credentials'), { status: 401 }); }
  });
  await assert.rejects(auth.signIn(validLogin), error => error.type === AUTH_ERROR_TYPES.AUTH_ERROR && error.retryable === false);
  assert.equal(auth.getState().state, AUTH_STATES.UNAUTHENTICATED);
  assert.equal(auth.getState().operation, null);
});

test('valid restored session reaches authenticated without invoking sign-in', async () => {
  const restored = { id: 'restored-1', status: 'active', identity: { id: 'user-restored', displayName: 'Restored' }, expiresAt: 9999999999999 };
  const mock = createMockPorts({ restoredSession: restored, sessionValid: true });
  const auth = createAuthFoundation({ ports: mock.ports });
  await auth.initialize();
  assert.equal(auth.isAuthenticated(), true);
  assert.equal(auth.getSession().id, 'restored-1');
  assert.equal(auth.getCurrentUser().id, 'user-restored');
  assert.equal(mock.calls['auth.authenticate'] || 0, 0);
});

test('invalid restored session fails closed without deleting or creating identity', async () => {
  const restored = { id: 'expired-1', identity: { id: 'old-user' } };
  const mock = createMockPorts({ restoredSession: restored, sessionValid: false });
  const auth = createAuthFoundation({ ports: mock.ports });
  const state = await auth.initialize();
  assert.equal(state.state, AUTH_STATES.UNAUTHENTICATED);
  assert.equal(state.error.code, AUTH_ERROR_CODES.SESSION_INVALID);
  assert.equal(mock.calls['identity.resolve'] || 0, 0);
  assert.equal(mock.calls['session.create'] || 0, 0);
});

test('recovery failure while authenticated never logs the user out', async () => {
  const { auth } = await ready({
    'recovery.begin': async () => { throw Object.assign(new Error('profile-independent outage'), { status: 503 }); }
  });
  await auth.signIn(validLogin);
  await assert.rejects(auth.recover({ email: 'student@example.com' }));
  assert.equal(auth.isAuthenticated(), true);
  assert.equal(auth.getState().state, AUTH_STATES.AUTHENTICATED);
  assert.equal(auth.getCurrentUser().id, 'user-1');
  assert.equal(auth.getState().error.type, AUTH_ERROR_TYPES.SERVER_ERROR);
});

test('logout clears local authority even if remote revoke fails', async () => {
  const { auth, calls } = await ready({
    'session.revoke': async () => { throw Object.assign(new Error('offline'), { network: true }); }
  });
  await auth.signIn(validLogin);
  const state = await auth.signOut();
  assert.equal(state.state, AUTH_STATES.UNAUTHENTICATED);
  assert.equal(auth.isAuthenticated(), false);
  assert.equal(auth.getSession(), null);
  assert.equal(calls['session.revoke'], 1);
  assert.equal(state.error.type, AUTH_ERROR_TYPES.NETWORK_ERROR);
});

test('repeated logout is idempotent and does not repeat remote revoke', async () => {
  const { auth, calls } = await ready();
  await auth.signIn(validLogin);
  await auth.signOut();
  await auth.signOut();
  await auth.signOut();
  assert.equal(calls['session.revoke'], 1);
  assert.equal(auth.getState().state, AUTH_STATES.UNAUTHENTICATED);
});

test('subscriber failures are isolated and unsubscribe is idempotent', async () => {
  const { auth } = await ready();
  let received = 0;
  auth.subscribe(() => { throw new Error('feature failed'); });
  const unsubscribe = auth.subscribe(() => { received++; });
  await auth.signIn(validLogin);
  assert.ok(received >= 2);
  assert.equal(unsubscribe(), true);
  assert.equal(unsubscribe(), false);
  assert.equal(auth.isAuthenticated(), true);
});

test('feature failure cannot mutate frozen Auth state', async () => {
  const { auth } = await ready();
  await auth.signIn(validLogin);
  const before = auth.getState();
  assert.throws(() => { before.state = AUTH_STATES.UNAUTHENTICATED; }, TypeError);
  try { throw new Error('Leaderboard API failed'); } catch (_) {}
  assert.equal(auth.getState(), before);
  assert.equal(auth.isAuthenticated(), true);
});

test('all declared state transitions are deterministic and invalid jumps reject', () => {
  for (const [from, targets] of Object.entries(AUTH_TRANSITIONS)) {
    assert.ok(targets.length > 0);
    for (const to of targets) assert.equal(canTransition(from, to), true);
  }
  assert.equal(canTransition(AUTH_STATES.INITIALIZING, AUTH_STATES.AUTHENTICATED), false);
  assert.equal(canTransition(AUTH_STATES.UNAUTHENTICATED, AUTH_STATES.AUTHENTICATED), false);
  assert.throws(() => assertTransition(AUTH_STATES.UNAUTHENTICATED, AUTH_STATES.AUTHENTICATED), error => error.code === AUTH_ERROR_CODES.INVALID_STATE);
});

test('error classifier separates network, auth, server, rate and cancellation', () => {
  assert.equal(classifyAuthError(Object.assign(new Error(), { network: true })).type, AUTH_ERROR_TYPES.NETWORK_ERROR);
  assert.equal(classifyAuthError(Object.assign(new Error(), { status: 401 })).type, AUTH_ERROR_TYPES.AUTH_ERROR);
  assert.equal(classifyAuthError(Object.assign(new Error(), { status: 503 })).type, AUTH_ERROR_TYPES.SERVER_ERROR);
  assert.equal(classifyAuthError(Object.assign(new Error(), { status: 429 })).type, AUTH_ERROR_TYPES.SECURITY_ERROR);
  assert.equal(classifyAuthError(Object.assign(new Error(), { name: 'AbortError' })).code, AUTH_ERROR_CODES.CANCELLED);
});

test('public errors redact sensitive details and raw causes', () => {
  const error = new AuthError({ type: AUTH_ERROR_TYPES.SERVER_ERROR, code: AUTH_ERROR_CODES.SERVER_FAILURE, cause: new Error('raw server trace'), details: { provider: 'mock', password: 'never', accessToken: 'never', nested: { otp: '123456', reason: 'down' } } });
  const json = error.toJSON();
  assert.equal('cause' in json, false);
  assert.equal('password' in json.details, false);
  assert.equal('accessToken' in json.details, false);
  assert.equal('otp' in json.details.nested, false);
  assert.equal(json.details.nested.reason, 'down');
  assert.ok(Object.isFrozen(json));
});

test('public configuration rejects secret-like keys and unsafe remember policy', () => {
  assert.throws(() => createAuthConfig({ authority: { id: 'x', bound: false, clientSecret: 'not-allowed' } }), error => error.type === AUTH_ERROR_TYPES.SECURITY_ERROR || error.code === AUTH_ERROR_CODES.INVALID_INPUT);
  assert.throws(() => createAuthConfig({ session: { restoreTimeoutMs: 100, rememberPolicy: 'localStorage-token' } }), error => error.type === AUTH_ERROR_TYPES.SECURITY_ERROR);
  assert.ok(Object.isFrozen(createAuthConfig()));
});

test('port registry rejects unknown and incomplete providers', () => {
  assert.throws(() => mergePorts({ madeUpProvider: {} }), error => error.code === AUTH_ERROR_CODES.INVALID_INPUT);
  assert.throws(() => mergePorts({ auth: { authenticate() {} } }), error => error.code === AUTH_ERROR_CODES.NOT_CONFIGURED);
});
