import { AuthError } from './errors.mjs';
import { AUTH_ERROR_CODES, AUTH_ERROR_TYPES, AUTH_METHODS } from './constants.mjs';

const fail = message => { throw new AuthError({ type: AUTH_ERROR_TYPES.USER_ERROR, code: AUTH_ERROR_CODES.INVALID_INPUT, safeMessage: message, retryable: false }); };

export function validateSignInInput(input) {
  if (!input || typeof input !== 'object') fail('Login information is required.');
  const method = String(input.method || AUTH_METHODS.PASSWORD);
  if (!Object.values(AUTH_METHODS).includes(method)) fail('Unsupported authentication method.');
  if (method === AUTH_METHODS.PASSWORD) {
    const email = String(input.email || '').trim().toLowerCase();
    const password = String(input.password || '');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('একটি valid email দিন।');
    if (!password) fail('Password দিন।');
    return { method, email, password, rememberMe: input.rememberMe !== false };
  }
  return { ...input, method, rememberMe: input.rememberMe !== false };
}

export function validateSignUpInput(input) {
  if (!input || typeof input !== 'object') fail('Signup information is required.');
  const name = String(input.name || '').trim();
  const email = String(input.email || '').trim().toLowerCase();
  const password = String(input.password || '');
  if (name.length < 2 || name.length > 120) fail('নাম ২–১২০ অক্ষরের হতে হবে।');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('একটি valid email দিন।');
  if (password.length < 8) fail('Password কমপক্ষে ৮ অক্ষরের হতে হবে।');
  if ('confirmPassword' in input && password !== String(input.confirmPassword || '')) fail('Password দুটো মিলছে না।');
  return { method: String(input.method || AUTH_METHODS.PASSWORD), name, email, password, mobile: input.mobile ? String(input.mobile).trim() : null };
}

export function assertAuthenticationResult(result) {
  if (!result || typeof result !== 'object' || !result.providerIdentity) throw new AuthError({ type: AUTH_ERROR_TYPES.AUTH_ERROR, code: AUTH_ERROR_CODES.INVALID_RESPONSE, safeMessage: 'Authentication provider returned an invalid response.', retryable: false });
  return result;
}

export function assertIdentityResult(identity) {
  const id = String(identity?.id || identity?.userId || '').trim();
  if (!id) throw new AuthError({ type: AUTH_ERROR_TYPES.AUTH_ERROR, code: AUTH_ERROR_CODES.INVALID_RESPONSE, safeMessage: 'Identity authority returned an invalid response.', retryable: false });
  return { ...identity, id };
}

export function assertSessionResult(session) {
  const id = String(session?.id || session?.sessionId || '').trim();
  if (!id) throw new AuthError({ type: AUTH_ERROR_TYPES.SESSION_ERROR, code: AUTH_ERROR_CODES.INVALID_RESPONSE, safeMessage: 'Session authority returned an invalid response.', retryable: false });
  return { ...session, id };
}
