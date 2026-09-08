import { AuthServiceBoundary } from './service-base.mjs';
import { AuthError } from '../core/errors.mjs';
import { AUTH_ERROR_CODES, AUTH_ERROR_TYPES } from '../core/constants.mjs';
import { assertAuthenticationResult } from '../core/validation.mjs';

export class PasskeyService extends AuthServiceBoundary {
  constructor(port) { super('passkey', port); }
  isSupported(context) { return this.invoke('isSupported', undefined, context); }
  async register(input, context) {
    if (!(await this.isSupported(context))) throw new AuthError({ type: AUTH_ERROR_TYPES.USER_ERROR, code: AUTH_ERROR_CODES.UNSUPPORTED, safeMessage: 'এই device-এ Passkey available নয়।', retryable: false });
    return this.invoke('register', input, context);
  }
  async authenticate(input, context) {
    if (!(await this.isSupported(context))) throw new AuthError({ type: AUTH_ERROR_TYPES.USER_ERROR, code: AUTH_ERROR_CODES.UNSUPPORTED, safeMessage: 'এই device-এ Passkey available নয়। Password বা অন্য method ব্যবহার করুন।', retryable: false });
    return assertAuthenticationResult(await this.invoke('authenticate', input, context));
  }
}
