import { AuthError } from './errors.mjs';
import { AUTH_ERROR_CODES, AUTH_ERROR_TYPES } from './constants.mjs';

export const PORT_METHODS = Object.freeze({
  auth: Object.freeze(['authenticate', 'signUp']),
  session: Object.freeze(['restore', 'validate', 'create', 'refresh', 'revoke']),
  verification: Object.freeze(['send', 'verify']),
  recovery: Object.freeze(['begin', 'complete']),
  passkey: Object.freeze(['isSupported', 'register', 'authenticate']),
  oauth: Object.freeze(['authenticate']),
  security: Object.freeze(['assess', 'record']),
  deviceSession: Object.freeze(['list', 'revoke', 'revokeAll', 'markTrusted']),
  identity: Object.freeze(['resolve']),
  emailGateway: Object.freeze(['send', 'healthCheck', 'getCapabilities'])
});

export function assertPort(name, port, methods = PORT_METHODS[name]) {
  if (!Array.isArray(methods)) throw new AuthError({ type: AUTH_ERROR_TYPES.USER_ERROR, code: AUTH_ERROR_CODES.INVALID_INPUT, safeMessage: `Unknown Auth port: ${name}`, retryable: false });
  if (!port || typeof port !== 'object') throw new AuthError({ type: AUTH_ERROR_TYPES.AUTH_ERROR, code: AUTH_ERROR_CODES.NOT_CONFIGURED, safeMessage: `${name} service is not configured.`, retryable: false });
  const missing = methods.filter(method => typeof port[method] !== 'function');
  if (missing.length) throw new AuthError({ type: AUTH_ERROR_TYPES.AUTH_ERROR, code: AUTH_ERROR_CODES.NOT_CONFIGURED, safeMessage: `${name} port is missing: ${missing.join(', ')}`, retryable: false });
  return port;
}

const unavailable = name => async () => {
  throw new AuthError({ type: AUTH_ERROR_TYPES.AUTH_ERROR, code: AUTH_ERROR_CODES.NOT_CONFIGURED, safeMessage: `${name} is not configured yet.`, retryable: false });
};

export function createUnboundPorts() {
  return Object.freeze({
    auth: Object.freeze({ authenticate: unavailable('Authentication authority'), signUp: unavailable('Account authority') }),
    session: Object.freeze({
      restore: async () => null,
      validate: async () => false,
      create: unavailable('Session authority'),
      refresh: unavailable('Session authority'),
      revoke: async () => ({ revoked: true, localOnly: true })
    }),
    verification: Object.freeze({ send: unavailable('Verification provider'), verify: unavailable('Verification provider') }),
    recovery: Object.freeze({ begin: unavailable('Recovery provider'), complete: unavailable('Recovery provider') }),
    passkey: Object.freeze({ isSupported: async () => false, register: unavailable('Passkey provider'), authenticate: unavailable('Passkey provider') }),
    oauth: Object.freeze({ authenticate: unavailable('OAuth provider') }),
    security: Object.freeze({ assess: async () => ({ allowed: true, challengeRequired: false, risk: 'unknown' }), record: async () => ({ recorded: false }) }),
    deviceSession: Object.freeze({ list: async () => [], revoke: unavailable('Device session provider'), revokeAll: unavailable('Device session provider'), markTrusted: unavailable('Device session provider') }),
    identity: Object.freeze({ resolve: unavailable('Identity authority') }),
    emailGateway: Object.freeze({ send: unavailable('Email Gateway'), healthCheck: async () => ({ status: 'DISABLED' }), getCapabilities: async () => [] })
  });
}

export function mergePorts(overrides = {}) {
  const base = createUnboundPorts();
  const ports = {};
  for (const [name, methods] of Object.entries(PORT_METHODS)) {
    const candidate = overrides[name] || base[name];
    ports[name] = Object.freeze(assertPort(name, candidate, methods));
  }
  for (const name of Object.keys(overrides)) {
    if (!(name in PORT_METHODS)) throw new AuthError({ type: AUTH_ERROR_TYPES.USER_ERROR, code: AUTH_ERROR_CODES.INVALID_INPUT, safeMessage: `Unknown Auth port: ${name}`, retryable: false });
  }
  return Object.freeze(ports);
}
