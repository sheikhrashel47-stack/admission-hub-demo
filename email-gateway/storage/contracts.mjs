import { EmailGatewayError } from '../core/errors.mjs';
import { EMAIL_FAILURE_CODES } from '../core/constants.mjs';

export const EMAIL_STORE_METHODS = Object.freeze([
  'acquireRequest', 'getRequest', 'updateRequest',
  'acquireNonce', 'consumeRateLimit',
  'getProviderState', 'mutateProviderState',
  'reserveProviderQuota', 'getProviderQuota',
  'appendEvent', 'listEvents', 'acquireEvent', 'completeEvent', 'acquireAlert'
]);

export function assertEmailStore(store) {
  if (!store || typeof store !== 'object') throw new EmailGatewayError({ code: EMAIL_FAILURE_CODES.STORAGE_UNAVAILABLE });
  const missing = EMAIL_STORE_METHODS.filter(method => typeof store[method] !== 'function');
  if (missing.length) throw new EmailGatewayError({ code: EMAIL_FAILURE_CODES.STORAGE_UNAVAILABLE, safeMessage: `Email store is missing: ${missing.join(', ')}` });
  if (!['strong', 'eventual'].includes(store.consistency)) throw new EmailGatewayError({ code: EMAIL_FAILURE_CODES.STORAGE_UNAVAILABLE, safeMessage: 'Email store consistency is undeclared.' });
  return store;
}
