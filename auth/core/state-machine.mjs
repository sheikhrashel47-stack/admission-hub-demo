import { AUTH_STATES, AUTH_ERROR_CODES, AUTH_ERROR_TYPES } from './constants.mjs';
import { AuthError } from './errors.mjs';

const S = AUTH_STATES;
const TRANSITIONS = Object.freeze({
  [S.INITIALIZING]: Object.freeze([S.CHECKING_SESSION, S.LOGGING_OUT]),
  [S.CHECKING_SESSION]: Object.freeze([S.AUTHENTICATED, S.UNAUTHENTICATED, S.RECOVERING, S.LOGGING_OUT]),
  [S.UNAUTHENTICATED]: Object.freeze([S.CHECKING_SESSION, S.AUTHENTICATING, S.RECOVERING, S.LOGGING_OUT]),
  [S.AUTHENTICATING]: Object.freeze([S.AUTHENTICATED, S.UNAUTHENTICATED, S.RECOVERING, S.LOGGING_OUT]),
  [S.AUTHENTICATED]: Object.freeze([S.REFRESHING, S.RECOVERING, S.LOGGING_OUT]),
  [S.REFRESHING]: Object.freeze([S.AUTHENTICATED, S.UNAUTHENTICATED, S.RECOVERING, S.LOGGING_OUT]),
  [S.RECOVERING]: Object.freeze([S.AUTHENTICATED, S.UNAUTHENTICATED, S.LOGGING_OUT]),
  [S.LOGGING_OUT]: Object.freeze([S.UNAUTHENTICATED])
});

export function isAuthState(value) {
  return Object.values(AUTH_STATES).includes(value);
}

export function canTransition(from, to) {
  if (!isAuthState(from) || !isAuthState(to)) return false;
  if (from === to) return true;
  return Boolean(TRANSITIONS[from]?.includes(to));
}

export function assertTransition(from, to) {
  if (!canTransition(from, to)) throw new AuthError({
    type: AUTH_ERROR_TYPES.AUTH_ERROR,
    code: AUTH_ERROR_CODES.INVALID_STATE,
    safeMessage: `Invalid Auth state transition: ${from} → ${to}`,
    retryable: false,
    details: { from, to }
  });
  return true;
}

export function nextAuthState(from, to) {
  assertTransition(from, to);
  return to;
}

export const AUTH_TRANSITIONS = TRANSITIONS;
