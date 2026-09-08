import { AuthError } from './errors.mjs';
import { AUTH_ERROR_CODES, AUTH_ERROR_TYPES } from './constants.mjs';

const DEFAULTS = {
  authority: { id: 'unbound', bound: false },
  operation: { timeoutMs: 8000, maxRetries: 1, baseDelayMs: 180, maxDelayMs: 1500 },
  session: { restoreTimeoutMs: 5000, rememberPolicy: 'server-managed' },
  capabilities: { password: true, emailOtp: true, google: true, passkey: true },
  recovery: { terminalState: 'UNAUTHENTICATED' }
};

const SENSITIVE_KEY = /(^|_)(secret|api.?key|private.?key|service.?role|access.?token|refresh.?token|password.?value|credential)(_|$)/i;
const SENSITIVE_VALUE = /(^eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.)|(-----BEGIN [A-Z ]+PRIVATE KEY-----)|(sk[-_][A-Za-z0-9_-]{16,})|(AIza[A-Za-z0-9_-]{20,})/;

const clone = value => {
  if (Array.isArray(value)) return value.map(clone);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)]));
  return value;
};

const merge = (base, extra) => {
  const out = clone(base);
  if (!extra || typeof extra !== 'object') return out;
  for (const [key, value] of Object.entries(extra)) {
    if (!(key in base)) throw new AuthError({ type: AUTH_ERROR_TYPES.SECURITY_ERROR, code: AUTH_ERROR_CODES.INVALID_INPUT, safeMessage: `Unknown Auth config field: ${key}`, retryable: false });
    if (base[key] && typeof base[key] === 'object' && !Array.isArray(base[key])) out[key] = merge(base[key], value);
    else out[key] = clone(value);
  }
  return out;
};

const freeze = value => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const item of Object.values(value)) freeze(item);
  return Object.freeze(value);
};

export function assertSafeAuthConfig(config, path = 'auth') {
  if (!config || typeof config !== 'object') throw new AuthError({ type: AUTH_ERROR_TYPES.USER_ERROR, code: AUTH_ERROR_CODES.INVALID_INPUT, safeMessage: 'Auth configuration is invalid.', retryable: false });
  for (const [key, value] of Object.entries(config)) {
    const at = `${path}.${key}`;
    if (SENSITIVE_KEY.test(key)) throw new AuthError({ type: AUTH_ERROR_TYPES.SECURITY_ERROR, code: AUTH_ERROR_CODES.INVALID_INPUT, safeMessage: `Sensitive value is forbidden in public config: ${at}`, retryable: false });
    if (typeof value === 'string' && SENSITIVE_VALUE.test(value)) throw new AuthError({ type: AUTH_ERROR_TYPES.SECURITY_ERROR, code: AUTH_ERROR_CODES.INVALID_INPUT, safeMessage: `Secret-like value is forbidden in public config: ${at}`, retryable: false });
    if (value && typeof value === 'object') assertSafeAuthConfig(value, at);
  }
  return true;
}

export function createAuthConfig(overrides = {}) {
  const config = merge(DEFAULTS, overrides);
  const op = config.operation;
  for (const key of ['timeoutMs', 'maxRetries', 'baseDelayMs', 'maxDelayMs']) {
    if (!Number.isFinite(Number(op[key])) || Number(op[key]) < 0) throw new AuthError({ type: AUTH_ERROR_TYPES.USER_ERROR, code: AUTH_ERROR_CODES.INVALID_INPUT, safeMessage: `Invalid Auth operation config: ${key}`, retryable: false });
    op[key] = Number(op[key]);
  }
  op.maxRetries = Math.min(3, Math.floor(op.maxRetries));
  op.timeoutMs = Math.min(30000, Math.max(50, op.timeoutMs));
  op.maxDelayMs = Math.min(5000, Math.max(op.baseDelayMs, op.maxDelayMs));
  if (config.session.rememberPolicy !== 'server-managed') throw new AuthError({ type: AUTH_ERROR_TYPES.SECURITY_ERROR, code: AUTH_ERROR_CODES.INVALID_INPUT, safeMessage: 'Remember Me must be server-managed.', retryable: false });
  assertSafeAuthConfig(config);
  return freeze(config);
}

export const DEFAULT_AUTH_CONFIG = createAuthConfig();
