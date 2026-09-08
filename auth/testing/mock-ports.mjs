const wait = (ms, signal) => new Promise((resolve, reject) => {
  if (!ms) return resolve();
  if (signal?.aborted) return reject(Object.assign(new Error('cancelled'), { name: 'AbortError' }));
  const timer = setTimeout(done, ms);
  function done() { signal?.removeEventListener('abort', stop); resolve(); }
  function stop() { clearTimeout(timer); signal?.removeEventListener('abort', stop); reject(Object.assign(new Error('cancelled'), { name: 'AbortError' })); }
  signal?.addEventListener('abort', stop, { once: true });
});

export function createMockPorts(behavior = {}) {
  const calls = Object.create(null);
  const history = [];
  const invoke = (name, fallback) => async (payload, context = {}) => {
    calls[name] = (calls[name] || 0) + 1;
    history.push({ name, attempt: context.attempt, idempotencyKey: context.idempotencyKey });
    if (behavior.delayMs) await wait(behavior.delayMs, context.signal);
    if (typeof behavior[name] === 'function') return behavior[name](payload, context, calls[name]);
    return typeof fallback === 'function' ? fallback(payload, context) : fallback;
  };

  const authentication = method => ({ providerIdentity: { provider: method, subject: `mock-${method}-subject` }, accountState: 'verified' });
  const session = () => ({ id: 'session-1', status: 'active', issuedAt: 1000, expiresAt: 9999999999999, deviceId: 'mock-device', remembered: true, accessToken: 'internal-only-access', refreshToken: 'internal-only-refresh' });

  const ports = {
    auth: {
      authenticate: invoke('auth.authenticate', input => authentication(input.method || 'password')),
      signUp: invoke('auth.signUp', input => authentication(input.method || 'password'))
    },
    session: {
      restore: invoke('session.restore', () => behavior.restoredSession || null),
      validate: invoke('session.validate', () => behavior.sessionValid !== false),
      create: invoke('session.create', session),
      refresh: invoke('session.refresh', session),
      revoke: invoke('session.revoke', () => ({ revoked: true }))
    },
    verification: {
      send: invoke('verification.send', () => ({ pending: true })),
      verify: invoke('verification.verify', () => authentication('email-otp'))
    },
    recovery: {
      begin: invoke('recovery.begin', () => ({ pending: true })),
      complete: invoke('recovery.complete', () => ({ recovered: true }))
    },
    passkey: {
      isSupported: invoke('passkey.isSupported', () => behavior.passkeySupported !== false),
      register: invoke('passkey.register', () => ({ registered: true })),
      authenticate: invoke('passkey.authenticate', () => authentication('passkey'))
    },
    oauth: {
      authenticate: invoke('oauth.authenticate', () => authentication('google'))
    },
    security: {
      assess: invoke('security.assess', () => ({ allowed: true, challengeRequired: false, risk: 'low' })),
      record: invoke('security.record', () => ({ recorded: true }))
    },
    deviceSession: {
      list: invoke('deviceSession.list', () => []),
      revoke: invoke('deviceSession.revoke', () => ({ revoked: true })),
      revokeAll: invoke('deviceSession.revokeAll', () => ({ revoked: true })),
      markTrusted: invoke('deviceSession.markTrusted', () => ({ trusted: true }))
    },
    identity: {
      resolve: invoke('identity.resolve', () => ({ id: 'user-1', status: 'active', displayName: 'Mock Student', providerInternalId: 'must-not-be-public' }))
    },
    emailGateway: {
      send: invoke('emailGateway.send', () => ({ status: 'DISABLED' })),
      healthCheck: invoke('emailGateway.healthCheck', () => ({ status: 'DISABLED' })),
      getCapabilities: invoke('emailGateway.getCapabilities', () => [])
    }
  };

  return { ports, calls, history };
}
