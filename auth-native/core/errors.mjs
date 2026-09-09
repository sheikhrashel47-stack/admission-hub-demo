export const AUTH_ERROR_CODES = Object.freeze({
  INVALID_INPUT: 'INVALID_INPUT',
  NOT_CONFIGURED: 'NOT_CONFIGURED',
  RATE_LIMITED: 'RATE_LIMITED',
  RESEND_COOLDOWN: 'RESEND_COOLDOWN',
  OTP_INVALID: 'OTP_INVALID',
  OTP_EXPIRED: 'OTP_EXPIRED',
  OTP_LOCKED: 'OTP_LOCKED',
  OTP_USED: 'OTP_USED',
  ACCOUNT_DISABLED: 'ACCOUNT_DISABLED',
  SESSION_INVALID: 'SESSION_INVALID',
  DELIVERY_UNAVAILABLE: 'DELIVERY_UNAVAILABLE',
  STORAGE_UNAVAILABLE: 'STORAGE_UNAVAILABLE',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
});

const DEFAULTS = Object.freeze({
  [AUTH_ERROR_CODES.INVALID_INPUT]: Object.freeze({ status: 400, message: 'তথ্যটি সঠিকভাবে লিখুন।' }),
  [AUTH_ERROR_CODES.NOT_CONFIGURED]: Object.freeze({ status: 503, message: 'অ্যাকাউন্ট সেবা এখনো প্রস্তুত নয়।' }),
  [AUTH_ERROR_CODES.RATE_LIMITED]: Object.freeze({ status: 429, message: 'অনেকবার চেষ্টা হয়েছে—একটু পরে আবার চেষ্টা করুন।' }),
  [AUTH_ERROR_CODES.RESEND_COOLDOWN]: Object.freeze({ status: 429, message: 'নতুন কোড পাঠাতে একটু অপেক্ষা করুন।' }),
  [AUTH_ERROR_CODES.OTP_INVALID]: Object.freeze({ status: 401, message: 'কোডটি সঠিক নয়।' }),
  [AUTH_ERROR_CODES.OTP_EXPIRED]: Object.freeze({ status: 410, message: 'কোডের সময় শেষ হয়েছে—নতুন কোড নিন।' }),
  [AUTH_ERROR_CODES.OTP_LOCKED]: Object.freeze({ status: 429, message: 'অনেকবার ভুল কোড দেওয়া হয়েছে—নতুন কোড নিন।' }),
  [AUTH_ERROR_CODES.OTP_USED]: Object.freeze({ status: 409, message: 'এই কোডটি ইতিমধ্যে ব্যবহার হয়েছে।' }),
  [AUTH_ERROR_CODES.ACCOUNT_DISABLED]: Object.freeze({ status: 403, message: 'এই অ্যাকাউন্টটি এখন ব্যবহার করা যাচ্ছে না।' }),
  [AUTH_ERROR_CODES.SESSION_INVALID]: Object.freeze({ status: 401, message: 'নিরাপদ সেশন পাওয়া যায়নি।' }),
  [AUTH_ERROR_CODES.DELIVERY_UNAVAILABLE]: Object.freeze({ status: 503, message: 'ইমেইল এখন সাময়িকভাবে পাঠানো যাচ্ছে না—একটু পরে চেষ্টা করুন।' }),
  [AUTH_ERROR_CODES.STORAGE_UNAVAILABLE]: Object.freeze({ status: 503, message: 'অ্যাকাউন্ট সেবা সাময়িকভাবে ব্যস্ত—একটু পরে চেষ্টা করুন।' }),
  [AUTH_ERROR_CODES.INTERNAL_ERROR]: Object.freeze({ status: 500, message: 'অপ্রত্যাশিত সমস্যা হয়েছে—আবার চেষ্টা করুন।' })
});

export class NativeAuthError extends Error {
  constructor(code, options = {}) {
    const fallback = DEFAULTS[code] || DEFAULTS[AUTH_ERROR_CODES.INTERNAL_ERROR];
    super(String(options.message || fallback.message));
    this.name = 'NativeAuthError';
    this.code = DEFAULTS[code] ? code : AUTH_ERROR_CODES.INTERNAL_ERROR;
    this.status = Number(options.status || fallback.status);
    this.retryAfter = Math.max(0, Math.ceil(Number(options.retryAfter || 0)));
    this.safe = true;
  }

  toPublic() {
    return Object.freeze({
      code: this.code,
      message: this.message,
      ...(this.retryAfter ? { retryAfter: this.retryAfter } : {})
    });
  }
}

export const failAuth = (code, options) => { throw new NativeAuthError(code, options); };

export function asNativeAuthError(error) {
  if (error instanceof NativeAuthError) return error;
  return new NativeAuthError(AUTH_ERROR_CODES.INTERNAL_ERROR);
}

export function errorFromRepository(result) {
  if (!result || !result.error) return result;
  throw new NativeAuthError(result.error, { retryAfter: result.retryAfter });
}
