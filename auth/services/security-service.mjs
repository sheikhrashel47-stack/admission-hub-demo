import { AuthServiceBoundary } from './service-base.mjs';
import { AuthError } from '../core/errors.mjs';
import { AUTH_ERROR_CODES, AUTH_ERROR_TYPES } from '../core/constants.mjs';

export class SecurityService extends AuthServiceBoundary {
  constructor(port) { super('security', port); }
  async assess(input, context) {
    const result = await this.invoke('assess', input, context);
    if (!result || result.allowed === false) throw new AuthError({ type: AUTH_ERROR_TYPES.SECURITY_ERROR, code: AUTH_ERROR_CODES.AUTHENTICATION_FAILED, safeMessage: 'এই authentication attempt অনুমোদিত হয়নি।', retryable: false });
    if (result.challengeRequired) throw new AuthError({ type: AUTH_ERROR_TYPES.SECURITY_ERROR, code: AUTH_ERROR_CODES.SECURITY_CHALLENGE_REQUIRED, safeMessage: 'অতিরিক্ত security verification প্রয়োজন।', retryable: false, details: { challenge: result.challenge || 'verification' } });
    return result;
  }
  record(event, context) { return this.invoke('record', event, context); }
}
