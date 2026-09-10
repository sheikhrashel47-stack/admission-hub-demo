export const VERIFICATION_CHANNELS = Object.freeze({
  OTP: 'otp',
  WHATSAPP: 'whatsapp',
  TELEGRAM: 'telegram'
});

export const VERIFICATION_FAILURE_CLASS = Object.freeze({
  HARD: 'hard-provider-failure',
  TEMPORARY: 'temporary-provider-failure',
  USER: 'user-error'
});

export const VERIFICATION_MODES = Object.freeze({
  LOCAL_CODE: 'local-code',
  PROVIDER_EVIDENCE: 'provider-evidence'
});

const CHANNEL_VALUES = new Set(Object.values(VERIFICATION_CHANNELS));
const FAILURE_VALUES = new Set(Object.values(VERIFICATION_FAILURE_CLASS));
const MODE_VALUES = new Set(Object.values(VERIFICATION_MODES));
const REQUIRED_METHODS = Object.freeze([
  'sendVerification',
  'checkAvailability',
  'getRemainingQuota',
  'verifyCode',
  'getProviderStatus'
]);

export class VerificationProviderError extends Error {
  constructor(code, failureClass = VERIFICATION_FAILURE_CLASS.TEMPORARY, options = {}) {
    super(String(code || 'PROVIDER_FAILURE').replace(/[^A-Z0-9_-]/gi, '_').slice(0, 64));
    this.name = 'VerificationProviderError';
    this.code = this.message.toUpperCase();
    this.failureClass = FAILURE_VALUES.has(failureClass) ? failureClass : VERIFICATION_FAILURE_CLASS.TEMPORARY;
    this.retryAfter = Math.max(0, Math.ceil(Number(options.retryAfter || 0)));
  }
}

export function assertVerificationProvider(provider) {
  if (!provider || !/^[a-z0-9][a-z0-9-]{1,31}$/.test(String(provider.id || ''))) throw new TypeError('Verification provider id is invalid.');
  if (!CHANNEL_VALUES.has(provider.channel)) throw new TypeError('Verification provider channel is invalid.');
  if (!MODE_VALUES.has(provider.verificationMode)) throw new TypeError('Verification provider mode is invalid.');
  for (const method of REQUIRED_METHODS) {
    if (typeof provider[method] !== 'function') throw new TypeError(`Verification provider method is missing: ${method}`);
  }
  return provider;
}

export class DisabledVerificationProvider {
  constructor({ id, channel, verificationMode = VERIFICATION_MODES.LOCAL_CODE } = {}) {
    this.id = String(id || 'disabled');
    this.channel = channel;
    this.verificationMode = verificationMode;
    assertVerificationProvider(this);
  }

  async checkAvailability() { return Object.freeze({ available: false, code: 'NOT_CONFIGURED' }); }
  async getRemainingQuota() { return Object.freeze({ remaining: 0, limit: 0, resetAt: 0, source: 'disabled' }); }
  async getProviderStatus() { return Object.freeze({ status: 'disabled', configured: false }); }
  async sendVerification() { throw new VerificationProviderError('NOT_CONFIGURED', VERIFICATION_FAILURE_CLASS.HARD); }
  async verifyCode() { throw new VerificationProviderError('NOT_CONFIGURED', VERIFICATION_FAILURE_CLASS.HARD); }
}

export const __verificationProviderTest = Object.freeze({ CHANNEL_VALUES, FAILURE_VALUES, MODE_VALUES, REQUIRED_METHODS });
