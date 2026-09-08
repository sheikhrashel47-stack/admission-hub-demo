import {
  EMAIL_FAILURE_CODES,
  RETRYABLE_PROVIDER_FAILURES
} from './constants.mjs';

const SAFE_MESSAGES = Object.freeze({
  [EMAIL_FAILURE_CODES.TIMEOUT]: 'Email provider timed out.',
  [EMAIL_FAILURE_CODES.NETWORK_ERROR]: 'Email provider network failed.',
  [EMAIL_FAILURE_CODES.DNS_ERROR]: 'Email provider could not be reached.',
  [EMAIL_FAILURE_CODES.FIVE_XX_SERVER_ERROR]: 'Email provider is temporarily unavailable.',
  [EMAIL_FAILURE_CODES.RATE_LIMIT]: 'Email provider rate limit was reached.',
  [EMAIL_FAILURE_CODES.QUOTA_EXCEEDED]: 'Email provider quota is exhausted.',
  [EMAIL_FAILURE_CODES.AUTHENTICATION_ERROR]: 'Email provider configuration was rejected.',
  [EMAIL_FAILURE_CODES.INVALID_REQUEST]: 'Email request is invalid.',
  [EMAIL_FAILURE_CODES.DOMAIN_ERROR]: 'Email sender domain is not ready.',
  [EMAIL_FAILURE_CODES.RECIPIENT_REJECTED]: 'Recipient was rejected.',
  [EMAIL_FAILURE_CODES.PROVIDER_SUSPENDED]: 'Email provider is suspended.',
  [EMAIL_FAILURE_CODES.NOT_CONFIGURED]: 'Email Gateway is not configured.',
  [EMAIL_FAILURE_CODES.NO_ELIGIBLE_PROVIDER]: 'No email provider is currently available.',
  [EMAIL_FAILURE_CODES.IDEMPOTENCY_CONFLICT]: 'Email request ID conflicts with an earlier request.',
  [EMAIL_FAILURE_CODES.DELIVERY_UNCERTAIN]: 'Email delivery outcome is uncertain; no duplicate was sent.',
  [EMAIL_FAILURE_CODES.RATE_LIMITED]: 'Email request rate limit was reached.',
  [EMAIL_FAILURE_CODES.UNAUTHORIZED]: 'Internal email request is unauthorized.',
  [EMAIL_FAILURE_CODES.REPLAY_DETECTED]: 'Internal email request was already used.',
  [EMAIL_FAILURE_CODES.STORAGE_UNAVAILABLE]: 'Email request storage is unavailable.',
  [EMAIL_FAILURE_CODES.STRONG_STORE_REQUIRED]: 'Strongly consistent email storage is required.',
  [EMAIL_FAILURE_CODES.INVALID_CONFIGURATION]: 'Email Gateway configuration is invalid.',
  [EMAIL_FAILURE_CODES.UNKNOWN]: 'Email operation failed safely.'
});

const PUBLIC_STATUS = Object.freeze({
  [EMAIL_FAILURE_CODES.INVALID_REQUEST]: 400,
  [EMAIL_FAILURE_CODES.RECIPIENT_REJECTED]: 400,
  [EMAIL_FAILURE_CODES.IDEMPOTENCY_CONFLICT]: 409,
  [EMAIL_FAILURE_CODES.REPLAY_DETECTED]: 409,
  [EMAIL_FAILURE_CODES.RATE_LIMIT]: 429,
  [EMAIL_FAILURE_CODES.RATE_LIMITED]: 429,
  [EMAIL_FAILURE_CODES.QUOTA_EXCEEDED]: 503,
  [EMAIL_FAILURE_CODES.NOT_CONFIGURED]: 503,
  [EMAIL_FAILURE_CODES.NO_ELIGIBLE_PROVIDER]: 503,
  [EMAIL_FAILURE_CODES.STRONG_STORE_REQUIRED]: 503,
  [EMAIL_FAILURE_CODES.STORAGE_UNAVAILABLE]: 503,
  [EMAIL_FAILURE_CODES.UNAUTHORIZED]: 403,
  [EMAIL_FAILURE_CODES.TIMEOUT]: 504
});

export class EmailGatewayError extends Error {
  constructor({
    code = EMAIL_FAILURE_CODES.UNKNOWN,
    safeMessage,
    retryable,
    uncertain = false,
    dispatched = false,
    providerId = null,
    status,
    cause
  } = {}) {
    super(safeMessage || SAFE_MESSAGES[code] || SAFE_MESSAGES.UNKNOWN);
    this.name = 'EmailGatewayError';
    this.code = code;
    this.safeMessage = safeMessage || SAFE_MESSAGES[code] || SAFE_MESSAGES.UNKNOWN;
    this.retryable = retryable ?? RETRYABLE_PROVIDER_FAILURES.has(code);
    this.uncertain = Boolean(uncertain);
    this.dispatched = Boolean(dispatched);
    this.providerId = providerId || null;
    this.status = status || PUBLIC_STATUS[code] || 500;
    if (cause) Object.defineProperty(this, 'cause', { value: cause, enumerable: false });
  }
}

export function asEmailGatewayError(error, fallback = {}) {
  if (error instanceof EmailGatewayError) return error;
  const name = String(error?.name || '');
  const message = String(error?.message || '').toLowerCase();
  let code = fallback.code || EMAIL_FAILURE_CODES.UNKNOWN;
  if (name === 'AbortError' || message.includes('timeout') || message.includes('timed out')) code = EMAIL_FAILURE_CODES.TIMEOUT;
  else if (message.includes('dns') || message.includes('enotfound') || message.includes('name resolution')) code = EMAIL_FAILURE_CODES.DNS_ERROR;
  else if (message.includes('network') || message.includes('fetch') || message.includes('socket')) code = EMAIL_FAILURE_CODES.NETWORK_ERROR;
  return new EmailGatewayError({
    ...fallback,
    code,
    uncertain: fallback.uncertain ?? Boolean(fallback.dispatched),
    cause: error
  });
}

export function errorFromHttpStatus(status, { providerId = null, retryAfter = null } = {}) {
  const value = Number(status);
  let code = EMAIL_FAILURE_CODES.UNKNOWN;
  let retryable = false;
  if (value === 408 || value === 504) {
    code = EMAIL_FAILURE_CODES.TIMEOUT;
    retryable = true;
  } else if (value === 429) {
    code = EMAIL_FAILURE_CODES.RATE_LIMIT;
    retryable = true;
  } else if (value === 401 || value === 403) code = EMAIL_FAILURE_CODES.AUTHENTICATION_ERROR;
  else if (value === 404) code = EMAIL_FAILURE_CODES.DOMAIN_ERROR;
  else if (value === 422) code = EMAIL_FAILURE_CODES.RECIPIENT_REJECTED;
  else if (value >= 500) {
    code = EMAIL_FAILURE_CODES.FIVE_XX_SERVER_ERROR;
    retryable = true;
  } else if (value >= 400) code = EMAIL_FAILURE_CODES.INVALID_REQUEST;
  return new EmailGatewayError({
    code,
    retryable,
    uncertain: value === 408 || value === 504,
    dispatched: true,
    providerId,
    status: value,
    safeMessage: retryAfter && code === EMAIL_FAILURE_CODES.RATE_LIMIT
      ? 'Email provider rate limit was reached; retry is deferred.'
      : undefined
  });
}

export function toPublicEmailError(error) {
  const normalized = asEmailGatewayError(error);
  return Object.freeze({
    code: normalized.code,
    message: normalized.safeMessage,
    retryable: normalized.retryable,
    uncertain: normalized.uncertain
  });
}
