import { AUTH_ERROR_CODES, AUTH_ERROR_TYPES } from './constants.mjs';

const SAFE_MESSAGES = Object.freeze({
  [AUTH_ERROR_TYPES.USER_ERROR]: 'দেওয়া তথ্যটি আবার যাচাই করুন।',
  [AUTH_ERROR_TYPES.NETWORK_ERROR]: 'নেটওয়ার্ক সংযোগ যাচাই করে আবার চেষ্টা করুন।',
  [AUTH_ERROR_TYPES.AUTH_ERROR]: 'Authentication সম্পন্ন হয়নি।',
  [AUTH_ERROR_TYPES.SESSION_ERROR]: 'Session যাচাই করা যায়নি।',
  [AUTH_ERROR_TYPES.SERVER_ERROR]: 'সার্ভার সাময়িকভাবে অনুপলব্ধ।',
  [AUTH_ERROR_TYPES.SECURITY_ERROR]: 'নিরাপত্তা যাচাই প্রয়োজন।',
  [AUTH_ERROR_TYPES.UNKNOWN_ERROR]: 'অপ্রত্যাশিত সমস্যা হয়েছে।'
});

const RETRYABLE_CODES = new Set([
  AUTH_ERROR_CODES.TIMEOUT,
  AUTH_ERROR_CODES.NETWORK_FAILURE,
  AUTH_ERROR_CODES.SERVER_FAILURE
]);

export class AuthError extends Error {
  constructor({ type = AUTH_ERROR_TYPES.UNKNOWN_ERROR, code = AUTH_ERROR_CODES.UNKNOWN, message, safeMessage, retryable, status = 0, details = null, cause = null } = {}) {
    super(String(message || code || 'Authentication error'));
    this.name = 'AuthError';
    this.type = Object.values(AUTH_ERROR_TYPES).includes(type) ? type : AUTH_ERROR_TYPES.UNKNOWN_ERROR;
    this.code = String(code || AUTH_ERROR_CODES.UNKNOWN);
    this.safeMessage = String(safeMessage || SAFE_MESSAGES[this.type]);
    this.retryable = retryable == null ? RETRYABLE_CODES.has(this.code) : Boolean(retryable);
    this.status = Number.isFinite(Number(status)) ? Number(status) : 0;
    this.details = sanitizeDetails(details);
    if (cause) Object.defineProperty(this, 'cause', { value: cause, enumerable: false });
  }

  toJSON() {
    return Object.freeze({
      name: this.name,
      type: this.type,
      code: this.code,
      message: this.safeMessage,
      retryable: this.retryable,
      status: this.status,
      details: this.details
    });
  }
}

export function sanitizeDetails(value, depth = 0) {
  if (value == null || depth > 3) return null;
  if (typeof value === 'string') return value.slice(0, 180);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.slice(0, 12).map(item => sanitizeDetails(item, depth + 1));
  if (typeof value !== 'object') return null;
  const blocked = /password|secret|token|credential|authorization|cookie|otp|code|assertion/i;
  const clean = {};
  for (const [key, item] of Object.entries(value).slice(0, 24)) {
    if (blocked.test(key)) continue;
    clean[key] = sanitizeDetails(item, depth + 1);
  }
  return Object.freeze(clean);
}

export function classifyAuthError(error, fallback = {}) {
  if (error instanceof AuthError) return error;
  const rawCode = String(error?.code || error?.name || '').toUpperCase();
  const status = Number(error?.status || error?.statusCode || 0);
  if (rawCode === 'ABORTERROR' || rawCode === 'CANCELLED') {
    return new AuthError({ type: AUTH_ERROR_TYPES.USER_ERROR, code: AUTH_ERROR_CODES.CANCELLED, retryable: false, cause: error, ...fallback });
  }
  if (rawCode === 'TIMEOUT' || rawCode === 'TIMEOUTERROR' || rawCode === 'ETIMEDOUT') {
    return new AuthError({ type: AUTH_ERROR_TYPES.NETWORK_ERROR, code: AUTH_ERROR_CODES.TIMEOUT, retryable: true, cause: error, ...fallback });
  }
  if (['TYPEERROR', 'FETCH_ERROR', 'ENOTFOUND', 'ECONNRESET', 'NETWORK_ERROR'].includes(rawCode) || error?.network === true) {
    return new AuthError({ type: AUTH_ERROR_TYPES.NETWORK_ERROR, code: AUTH_ERROR_CODES.NETWORK_FAILURE, retryable: true, cause: error, ...fallback });
  }
  if (status === 401 || status === 403) {
    return new AuthError({ type: AUTH_ERROR_TYPES.AUTH_ERROR, code: AUTH_ERROR_CODES.AUTHENTICATION_FAILED, retryable: false, status, cause: error, ...fallback });
  }
  if (status === 429) {
    return new AuthError({ type: AUTH_ERROR_TYPES.SECURITY_ERROR, code: AUTH_ERROR_CODES.RATE_LIMITED, retryable: false, status, cause: error, ...fallback });
  }
  if (status >= 500) {
    return new AuthError({ type: AUTH_ERROR_TYPES.SERVER_ERROR, code: AUTH_ERROR_CODES.SERVER_FAILURE, retryable: true, status, cause: error, ...fallback });
  }
  return new AuthError({ cause: error, ...fallback });
}

export function publicAuthError(error) {
  return classifyAuthError(error).toJSON();
}
