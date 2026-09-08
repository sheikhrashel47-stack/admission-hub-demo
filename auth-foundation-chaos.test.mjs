import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { createAuthFoundation, AUTH_METHODS, AUTH_STATES, AUTH_ERROR_CODES, AUTH_ERROR_TYPES } from './auth/index.mjs';
import { AuthOperationRunner } from './auth/core/operation-runner.mjs';
import { createMockPorts } from './auth/testing/mock-ports.mjs';

const login = { method: AUTH_METHODS.PASSWORD, email: 'chaos@example.com', password: 'safe-test-password' };
const tinyConfig = { operation: { timeoutMs: 80, maxRetries: 1, baseDelayMs: 1, maxDelayMs: 2 }, session: { restoreTimeoutMs: 60, rememberPolicy: 'server-managed' } };

const makeReady = async behavior => {
  const mock = createMockPorts(behavior);
  const auth = createAuthFoundation({ ports: mock.ports, config: tinyConfig });
  await auth.initialize();
  return { auth, ...mock };
};

const networkFailure = () => Object.assign(new Error('simulated network loss'), { network: true });

test('hung operation reaches a bounded TIMEOUT final state', async () => {
  const runner = new AuthOperationRunner({ defaults: { timeoutMs: 25, maxRetries: 0, baseDelayMs: 1, maxDelayMs: 1 } });
  const started = performance.now();
  await assert.rejects(runner.run('hung-provider', () => new Promise(() => {})), error => error.code === AUTH_ERROR_CODES.TIMEOUT);
  assert.ok(performance.now() - started < 200, 'timeout was not bounded');
  assert.equal(runner.activeCount, 0);
});

test('timeout remains TIMEOUT when provider reacts to AbortSignal', async () => {
  const runner = new AuthOperationRunner({ defaults: { timeoutMs: 20, maxRetries: 0 } });
  await assert.rejects(runner.run('abort-aware-provider', ({ signal }) => new Promise((_, reject) => {
    signal.addEventListener('abort', () => reject(Object.assign(new Error('provider aborted'), { name: 'AbortError' })), { once: true });
  })), error => error.code === AUTH_ERROR_CODES.TIMEOUT);
});

test('network retry is bounded and reuses one idempotency key', async () => {
  const sleeps = [];
  const keys = [];
  let attempts = 0;
  const runner = new AuthOperationRunner({ defaults: { timeoutMs: 100, maxRetries: 2, baseDelayMs: 5, maxDelayMs: 8 }, sleep: async ms => sleeps.push(ms) });
  const result = await runner.run('network-retry', ({ idempotencyKey }) => {
    attempts++;
    keys.push(idempotencyKey);
    if (attempts < 3) throw networkFailure();
    return 'recovered';
  });
  assert.equal(result, 'recovered');
  assert.equal(attempts, 3);
  assert.equal(new Set(keys).size, 1);
  assert.deepEqual(sleeps, [5, 8]);
});

test('permanent authentication failure is never retried', async () => {
  let attempts = 0;
  const runner = new AuthOperationRunner({ defaults: { timeoutMs: 100, maxRetries: 3, baseDelayMs: 1, maxDelayMs: 2 } });
  await assert.rejects(runner.run('bad-credentials', () => { attempts++; throw Object.assign(new Error('no'), { status: 401 }); }), error => error.type === AUTH_ERROR_TYPES.AUTH_ERROR);
  assert.equal(attempts, 1);
});

test('external cancellation terminates even when provider ignores AbortSignal', async () => {
  const runner = new AuthOperationRunner({ defaults: { timeoutMs: 1000, maxRetries: 0 } });
  const controller = new AbortController();
  const started = performance.now();
  const pending = runner.run('cancel-me', () => new Promise(resolve => setTimeout(resolve, 800)), { signal: controller.signal });
  setTimeout(() => controller.abort('owner-cancel'), 15);
  await assert.rejects(pending, error => error.code === AUTH_ERROR_CODES.CANCELLED);
  assert.ok(performance.now() - started < 200, 'cancellation waited for provider');
});

test('ten rapid Login clicks produce one authentication and one session', async () => {
  const mock = createMockPorts({ delayMs: 8 });
  const auth = createAuthFoundation({ ports: mock.ports, config: tinyConfig });
  await auth.initialize();
  const results = await Promise.all(Array.from({ length: 10 }, () => auth.signIn(login)));
  assert.equal(mock.calls['auth.authenticate'], 1);
  assert.equal(mock.calls['identity.resolve'], 1);
  assert.equal(mock.calls['session.create'], 1);
  assert.equal(new Set(results).size, 1);
  assert.equal(auth.isAuthenticated(), true);
});

test('ten rapid Signup clicks cannot create duplicate account mutations', async () => {
  const mock = createMockPorts({ delayMs: 8 });
  const auth = createAuthFoundation({ ports: mock.ports, config: tinyConfig });
  await auth.initialize();
  const signup = { name: 'Chaos Student', email: 'new-chaos@example.com', password: 'safe-test-password', confirmPassword: 'safe-test-password' };
  await Promise.all(Array.from({ length: 10 }, () => auth.signUp(signup)));
  assert.equal(mock.calls['auth.signUp'], 1);
  assert.equal(mock.calls['identity.resolve'], 1);
  assert.equal(mock.calls['session.create'], 1);
});

test('Logout during a slow Login cancels stale completion and stays logged out', async () => {
  let release;
  const blocked = new Promise(resolve => { release = resolve; });
  const mock = createMockPorts({
    'auth.authenticate': async () => { await blocked; return { providerIdentity: { provider: 'mock', subject: 'late' } }; }
  });
  const auth = createAuthFoundation({ ports: mock.ports, config: { operation: { timeoutMs: 1000, maxRetries: 0, baseDelayMs: 1, maxDelayMs: 1 } } });
  await auth.initialize();
  const pending = auth.signIn(login);
  await new Promise(resolve => setTimeout(resolve, 10));
  await auth.signOut();
  release();
  await assert.rejects(pending, error => [AUTH_ERROR_CODES.CANCELLED, AUTH_ERROR_CODES.STALE_OPERATION].includes(error.code));
  await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(auth.getState().state, AUTH_STATES.UNAUTHENTICATED);
  assert.equal(auth.isAuthenticated(), false);
  assert.equal(mock.calls['session.create'] || 0, 0);
});

test('Login during an in-progress Logout fails BUSY instead of corrupting state', async () => {
  let release;
  const blocked = new Promise(resolve => { release = resolve; });
  const { auth } = await makeReady({ 'session.revoke': async () => { await blocked; return { revoked: true }; } });
  await auth.signIn(login);
  const logout = auth.signOut();
  await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(auth.getState().state, AUTH_STATES.LOGGING_OUT);
  await assert.rejects(auth.signIn(login), error => error.code === AUTH_ERROR_CODES.BUSY);
  release();
  await logout;
  assert.equal(auth.getState().state, AUTH_STATES.UNAUTHENTICATED);
});

test('session restore retries temporary network loss then recovers', async () => {
  let attempt = 0;
  const restored = { id: 'recovered-session', identity: { id: 'recovered-user' }, status: 'active' };
  const mock = createMockPorts({
    'session.restore': async () => { attempt++; if (attempt === 1) throw networkFailure(); return restored; },
    'session.validate': async () => true
  });
  const auth = createAuthFoundation({ ports: mock.ports, config: tinyConfig, runtime: { sleep: async () => {} } });
  await auth.initialize();
  assert.equal(attempt, 2);
  assert.equal(auth.isAuthenticated(), true);
  assert.equal(auth.getSession().id, 'recovered-session');
});

test('permanent restore outage exits RECOVERING and never spins forever', async () => {
  const mock = createMockPorts({ 'session.restore': async () => { throw networkFailure(); } });
  const auth = createAuthFoundation({ ports: mock.ports, config: tinyConfig, runtime: { sleep: async () => {} } });
  const states = [];
  auth.subscribe(snapshot => states.push(snapshot.state));
  const started = performance.now();
  const final = await auth.initialize();
  assert.ok(performance.now() - started < 300);
  assert.ok(states.includes(AUTH_STATES.RECOVERING));
  assert.equal(final.state, AUTH_STATES.UNAUTHENTICATED);
  assert.equal(final.operation, null);
  assert.equal(mock.calls['session.restore'], 2);
});

test('malformed provider response fails closed and creates no session', async () => {
  const { auth, calls } = await makeReady({ 'auth.authenticate': async () => ({ ok: true }) });
  await assert.rejects(auth.signIn(login), error => error.code === AUTH_ERROR_CODES.INVALID_RESPONSE);
  assert.equal(calls['session.create'] || 0, 0);
  assert.equal(auth.isAuthenticated(), false);
});

test('database/identity outage does not produce a partial authenticated state', async () => {
  const { auth, calls } = await makeReady({ 'identity.resolve': async () => { throw Object.assign(new Error('database unavailable'), { status: 503 }); } });
  await assert.rejects(auth.signIn(login), error => error.type === AUTH_ERROR_TYPES.SERVER_ERROR);
  assert.equal(calls['session.create'] || 0, 0);
  assert.equal(auth.getCurrentUser(), null);
  assert.equal(auth.getSession(), null);
  assert.equal(auth.getState().state, AUTH_STATES.UNAUTHENTICATED);
});

test('hung security assessment is bounded and fails closed', async () => {
  const { auth, calls } = await makeReady({ 'security.assess': async () => new Promise(() => {}) });
  await assert.rejects(auth.signIn(login), error => error.code === AUTH_ERROR_CODES.TIMEOUT);
  assert.equal(calls['identity.resolve'] || 0, 0);
  assert.equal(calls['session.create'] || 0, 0);
  assert.equal(auth.isAuthenticated(), false);
});

test('hung identity resolution is bounded and cannot leave AUTHENTICATING', async () => {
  const { auth } = await makeReady({ 'identity.resolve': async () => new Promise(() => {}) });
  const started = performance.now();
  await assert.rejects(auth.signIn(login), error => error.code === AUTH_ERROR_CODES.TIMEOUT);
  assert.ok(performance.now() - started < 300);
  assert.equal(auth.getState().state, AUTH_STATES.UNAUTHENTICATED);
});

test('hung session creation is bounded and cannot expose partial identity', async () => {
  const { auth } = await makeReady({ 'session.create': async () => new Promise(() => {}) });
  await assert.rejects(auth.signIn(login), error => error.code === AUTH_ERROR_CODES.TIMEOUT);
  assert.equal(auth.getCurrentUser(), null);
  assert.equal(auth.getSession(), null);
  assert.equal(auth.getState().state, AUTH_STATES.UNAUTHENTICATED);
});

test('session creation outage cannot leak resolved identity', async () => {
  const { auth } = await makeReady({ 'session.create': async () => { throw Object.assign(new Error('session database unavailable'), { status: 503 }); } });
  await assert.rejects(auth.signIn(login));
  assert.equal(auth.getCurrentUser(), null);
  assert.equal(auth.getSession(), null);
  assert.equal(auth.isAuthenticated(), false);
});

test('two independent tabs cannot mutate each other through global state', async () => {
  const a = await makeReady();
  const b = await makeReady();
  const bRevision = b.auth.getState().revision;
  await a.auth.signIn(login);
  assert.equal(a.auth.isAuthenticated(), true);
  assert.equal(b.auth.isAuthenticated(), false);
  await a.auth.signOut();
  assert.equal(b.auth.getState().revision, bRevision);
});

test('feature subscriber crash cannot interrupt Login completion', async () => {
  const { auth } = await makeReady();
  auth.subscribe(() => { throw new Error('Profile renderer crashed'); });
  await auth.signIn(login);
  assert.equal(auth.isAuthenticated(), true);
});

test('200 repeated Login/Logout cycles remain deterministic with no stale session', async () => {
  const { auth, calls } = await makeReady();
  for (let i = 0; i < 200; i++) {
    await auth.signIn(login);
    assert.equal(auth.isAuthenticated(), true);
    await auth.signOut();
    assert.equal(auth.getState().state, AUTH_STATES.UNAUTHENTICATED);
    assert.equal(auth.getCurrentUser(), null);
    assert.equal(auth.getSession(), null);
  }
  assert.equal(calls['auth.authenticate'], 200);
  assert.equal(calls['session.create'], 200);
  assert.equal(calls['session.revoke'], 200);
});

test('foundation state reads sustain 25,000 operations without mutation or leak', async () => {
  const { auth } = await makeReady();
  const snapshot = auth.getState();
  const started = performance.now();
  for (let i = 0; i < 25000; i++) {
    assert.equal(auth.getState(), snapshot);
    assert.equal(auth.isAuthenticated(), false);
  }
  assert.ok(performance.now() - started < 1000, 'foundation state reads are unexpectedly slow');
});

test('1,000 unbound app boots settle deterministically without network or accounts', async () => {
  const started = performance.now();
  const states = await Promise.all(Array.from({ length: 1000 }, async () => {
    const auth = createAuthFoundation();
    return (await auth.initialize()).state;
  }));
  assert.ok(states.every(state => state === AUTH_STATES.UNAUTHENTICATED));
  assert.ok(performance.now() - started < 2500, 'mock boot load exceeded foundation budget');
});
