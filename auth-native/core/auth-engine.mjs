import { AUTH_ERROR_CODES, errorFromRepository, failAuth } from './errors.mjs';
import {
  AuthHmac,
  coarseUserAgent,
  maskAuthEmail,
  normalizeAuthEmail,
  randomSixDigitOtp,
  randomToken
} from './crypto.mjs';

export const AUTH_NATIVE_VERSION = 'firebase-email-password-v1';
export const OTP_DIGITS = 6;
export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const PREPARE_LIMITS = Object.freeze([
  Object.freeze({ scope: 'otp-email-15m', source: 'email', limit: 3, windowMs: 15 * 60 * 1000 }),
  Object.freeze({ scope: 'otp-email-day', source: 'email', limit: 8, windowMs: 24 * 60 * 60 * 1000 }),
  Object.freeze({ scope: 'otp-ip-15m', source: 'ip', limit: 20, windowMs: 15 * 60 * 1000 }),
  Object.freeze({ scope: 'otp-ip-day', source: 'ip', limit: 80, windowMs: 24 * 60 * 60 * 1000 }),
  Object.freeze({ scope: 'otp-device-15m', source: 'device', limit: 10, windowMs: 15 * 60 * 1000 }),
  Object.freeze({ scope: 'otp-global-minute', source: 'global', limit: 60, windowMs: 60 * 1000 })
]);

const VERIFY_LIMITS = Object.freeze([
  Object.freeze({ scope: 'verify-email-15m', source: 'email', limit: 20, windowMs: 15 * 60 * 1000 }),
  Object.freeze({ scope: 'verify-ip-15m', source: 'ip', limit: 40, windowMs: 15 * 60 * 1000 }),
  Object.freeze({ scope: 'verify-device-15m', source: 'device', limit: 30, windowMs: 15 * 60 * 1000 })
]);

const FIREBASE_OPERATION_LIMITS = Object.freeze({
  signup: Object.freeze([
    Object.freeze({ scope: 'firebase-verification-email-minute', source: 'email', limit: 1, windowMs: 60 * 1000 }),
    Object.freeze({ scope: 'firebase-verification-email-day', source: 'email', limit: 8, windowMs: 24 * 60 * 60 * 1000 }),
    Object.freeze({ scope: 'firebase-verification-ip-hour', source: 'ip', limit: 20, windowMs: 60 * 60 * 1000 }),
    Object.freeze({ scope: 'firebase-verification-device-hour', source: 'device', limit: 10, windowMs: 60 * 60 * 1000 })
  ]),
  'verification-resend': Object.freeze([
    Object.freeze({ scope: 'firebase-verification-email-minute', source: 'email', limit: 1, windowMs: 60 * 1000 }),
    Object.freeze({ scope: 'firebase-verification-email-day', source: 'email', limit: 8, windowMs: 24 * 60 * 60 * 1000 }),
    Object.freeze({ scope: 'firebase-verification-ip-hour', source: 'ip', limit: 20, windowMs: 60 * 60 * 1000 }),
    Object.freeze({ scope: 'firebase-verification-device-hour', source: 'device', limit: 10, windowMs: 60 * 60 * 1000 })
  ]),
  'verification-send': Object.freeze([
    Object.freeze({ scope: 'firebase-verification-global-day', source: 'global', limit: 1000, windowMs: 24 * 60 * 60 * 1000 })
  ]),
  login: Object.freeze([
    Object.freeze({ scope: 'firebase-login-email-15m', source: 'email', limit: 12, windowMs: 15 * 60 * 1000 }),
    Object.freeze({ scope: 'firebase-login-ip-15m', source: 'ip', limit: 60, windowMs: 15 * 60 * 1000 }),
    Object.freeze({ scope: 'firebase-login-device-15m', source: 'device', limit: 30, windowMs: 15 * 60 * 1000 })
  ])
});

const requiredRepositoryMethods = Object.freeze([
  'prepareChallenge', 'markDelivery', 'verifyChallenge', 'consumeLimits', 'establishExternalSession',
  'getExternalSession', 'getSession', 'revokeSession', 'ping', 'cleanup', 'nextExpiry'
]);

const assertRepository = repository => {
  if (!repository || requiredRepositoryMethods.some(method => typeof repository[method] !== 'function')) {
    failAuth(AUTH_ERROR_CODES.STORAGE_UNAVAILABLE);
  }
  return repository;
};

const normalizeContext = context => Object.freeze({
  ip: String(context?.ip || 'unknown').slice(0, 96),
  deviceId: String(context?.deviceId || 'unknown').slice(0, 128),
  userAgent: coarseUserAgent(context?.userAgent)
});

export class CloudflareNativeAuthEngine {
  constructor({ repository, hmacSecret, now = () => Date.now(), cryptoImpl = globalThis.crypto } = {}) {
    this.repository = assertRepository(repository);
    this.hmac = new AuthHmac(hmacSecret, cryptoImpl);
    this.now = now;
    this.crypto = cryptoImpl;
  }

  async #references(email, context) {
    const values = await Promise.all([
      this.hmac.hex('email-ref-v1', email),
      this.hmac.hex('network-ref-v1', context.ip),
      this.hmac.hex('device-ref-v1', context.deviceId)
    ]);
    return Object.freeze({ emailRef: values[0], ipRef: values[1], deviceRef: values[2] });
  }

  #limits(definitions, refs) {
    return definitions.map(definition => Object.freeze({
      scope: definition.scope,
      key: definition.source === 'email' ? refs.emailRef
        : definition.source === 'ip' ? refs.ipRef
          : definition.source === 'device' ? refs.deviceRef : 'global',
      limit: definition.limit,
      windowMs: definition.windowMs
    }));
  }

  async prepareOtp(input = {}, requestContext = {}) {
    const email = normalizeAuthEmail(input.email);
    const context = normalizeContext(requestContext);
    const now = Number(this.now());
    const challengeId = randomToken(24, this.crypto);
    const code = randomSixDigitOtp(this.crypto);
    const refs = await this.#references(email, context);
    const codeMac = await this.hmac.hex('otp-code-v1', `${challengeId}:${code}`);
    const record = Object.freeze({
      challengeId,
      emailRef: refs.emailRef,
      emailMask: maskAuthEmail(email),
      codeMac,
      state: 'active',
      createdAt: now,
      expiresAt: now + OTP_TTL_MS,
      attempts: 0,
      maxAttempts: OTP_MAX_ATTEMPTS,
      ipRef: refs.ipRef,
      deviceRef: refs.deviceRef,
      deliveryState: 'pending'
    });
    const prepared = errorFromRepository(await this.repository.prepareChallenge({
      record,
      limits: this.#limits(PREPARE_LIMITS, refs),
      cooldownMs: OTP_RESEND_COOLDOWN_MS,
      now
    }));
    return Object.freeze({
      challengeId,
      code,
      email,
      emailMask: record.emailMask,
      expiresAt: record.expiresAt,
      expiresIn: Math.floor(OTP_TTL_MS / 1000),
      resendAfter: Math.floor(OTP_RESEND_COOLDOWN_MS / 1000),
      preparedAt: prepared.preparedAt || now
    });
  }

  async markDelivery(challengeId, { accepted, uncertain = false, provider = null } = {}) {
    if (!/^[A-Za-z0-9_-]{24,64}$/.test(String(challengeId || ''))) failAuth(AUTH_ERROR_CODES.INVALID_INPUT);
    const result = await this.repository.markDelivery({
      challengeId: String(challengeId),
      accepted: Boolean(accepted),
      uncertain: Boolean(uncertain),
      provider: provider ? String(provider).slice(0, 32) : null,
      now: Number(this.now())
    });
    return errorFromRepository(result);
  }

  async verifyOtp(input = {}, requestContext = {}) {
    const email = normalizeAuthEmail(input.email);
    const challengeId = String(input.challengeId || '').trim();
    const code = String(input.code || '').trim();
    if (!/^[A-Za-z0-9_-]{24,64}$/.test(challengeId) || !/^\d{6}$/.test(code)) failAuth(AUTH_ERROR_CODES.INVALID_INPUT);
    const context = normalizeContext(requestContext);
    const refs = await this.#references(email, context);
    const now = Number(this.now());
    const sessionToken = randomToken(32, this.crypto);
    const userIdCandidate = `usr_${randomToken(18, this.crypto)}`;
    const values = await Promise.all([
      this.hmac.hex('otp-code-v1', `${challengeId}:${code}`),
      this.hmac.hex('session-ref-v1', sessionToken)
    ]);
    const verified = errorFromRepository(await this.repository.verifyChallenge({
      challengeId,
      emailRef: refs.emailRef,
      candidateCodeMac: values[0],
      sessionRef: values[1],
      sessionTokenShape: sessionToken.length,
      userIdCandidate,
      ipRef: refs.ipRef,
      deviceRef: refs.deviceRef,
      userAgent: context.userAgent,
      limits: this.#limits(VERIFY_LIMITS, refs),
      now,
      sessionExpiresAt: now + SESSION_TTL_MS
    }));
    return Object.freeze({
      sessionToken,
      sessionExpiresAt: now + SESSION_TTL_MS,
      user: Object.freeze({
        id: verified.user.id,
        emailMasked: verified.user.emailMask,
        status: verified.user.status,
        createdAt: verified.user.createdAt
      }),
      created: Boolean(verified.created)
    });
  }

  async consumeFirebaseOperation(input = {}, requestContext = {}) {
    const operation = String(input.operation || '');
    const definitions = FIREBASE_OPERATION_LIMITS[operation];
    if (!definitions) failAuth(AUTH_ERROR_CODES.INVALID_INPUT);
    const email = normalizeAuthEmail(input.email);
    const context = normalizeContext(requestContext);
    const refs = await this.#references(email, context);
    const now = Number(this.now());
    errorFromRepository(await this.repository.consumeLimits({
      limits: this.#limits(definitions, refs),
      now,
      eventType: `firebase-${operation}`,
      subjectRef: refs.emailRef
    }));
    return Object.freeze({
      accepted: true,
      email,
      emailMask: maskAuthEmail(email),
      acceptedAt: now
    });
  }

  async establishFirebaseSession(input = {}, requestContext = {}) {
    const email = normalizeAuthEmail(input.email);
    const subject = String(input.subject || '').trim();
    if (!subject || subject.length > 256 || /[\r\n\u0000]/.test(subject)) failAuth(AUTH_ERROR_CODES.INVALID_INPUT);
    const context = normalizeContext(requestContext);
    const refs = await this.#references(email, context);
    const now = Number(this.now());
    const sessionToken = randomToken(32, this.crypto);
    const userIdCandidate = `usr_${randomToken(18, this.crypto)}`;
    const [subjectRef, sessionRef] = await Promise.all([
      this.hmac.hex('firebase-subject-v1', subject),
      this.hmac.hex('session-ref-v1', sessionToken)
    ]);
    const established = errorFromRepository(await this.repository.establishExternalSession({
      provider: 'firebase',
      subjectRef,
      emailRef: refs.emailRef,
      emailMask: maskAuthEmail(email),
      sessionRef,
      userIdCandidate,
      ipRef: refs.ipRef,
      deviceRef: refs.deviceRef,
      userAgent: context.userAgent,
      now,
      sessionExpiresAt: now + SESSION_TTL_MS
    }));
    return Object.freeze({
      sessionToken,
      sessionExpiresAt: now + SESSION_TTL_MS,
      user: Object.freeze({
        id: established.user.id,
        emailMasked: established.user.emailMask,
        status: established.user.status,
        createdAt: established.user.createdAt
      }),
      created: Boolean(established.created)
    });
  }

  async getFirebaseSession(sessionToken, input = {}) {
    const token = String(sessionToken || '').trim();
    if (!/^[A-Za-z0-9_-]{40,96}$/.test(token)) failAuth(AUTH_ERROR_CODES.SESSION_INVALID);
    const email = normalizeAuthEmail(input.email);
    const subject = String(input.subject || '').trim();
    if (!subject || subject.length > 256 || /[\r\n\u0000]/.test(subject)) failAuth(AUTH_ERROR_CODES.SESSION_INVALID);
    const [sessionRef, emailRef, subjectRef] = await Promise.all([
      this.hmac.hex('session-ref-v1', token),
      this.hmac.hex('email-ref-v1', email),
      this.hmac.hex('firebase-subject-v1', subject)
    ]);
    const result = errorFromRepository(await this.repository.getExternalSession({
      sessionRef,
      provider: 'firebase',
      subjectRef,
      emailRef,
      now: Number(this.now())
    }));
    return Object.freeze({
      expiresAt: result.expiresAt,
      user: Object.freeze({
        id: result.user.id,
        emailMasked: result.user.emailMask,
        status: result.user.status,
        createdAt: result.user.createdAt
      })
    });
  }

  async getSession(sessionToken) {
    const token = String(sessionToken || '').trim();
    if (!/^[A-Za-z0-9_-]{40,96}$/.test(token)) failAuth(AUTH_ERROR_CODES.SESSION_INVALID);
    const sessionRef = await this.hmac.hex('session-ref-v1', token);
    const result = errorFromRepository(await this.repository.getSession({ sessionRef, now: Number(this.now()) }));
    return Object.freeze({
      expiresAt: result.expiresAt,
      user: Object.freeze({
        id: result.user.id,
        emailMasked: result.user.emailMask,
        status: result.user.status,
        createdAt: result.user.createdAt
      })
    });
  }

  async revokeSession(sessionToken) {
    const token = String(sessionToken || '').trim();
    if (!/^[A-Za-z0-9_-]{40,96}$/.test(token)) return Object.freeze({ revoked: false });
    const sessionRef = await this.hmac.hex('session-ref-v1', token);
    const result = await this.repository.revokeSession({ sessionRef, now: Number(this.now()) });
    return Object.freeze({ revoked: Boolean(result?.revoked) });
  }

  ping() { return this.repository.ping(); }
  cleanup() { return this.repository.cleanup(Number(this.now())); }
  nextExpiry() { return this.repository.nextExpiry(Number(this.now())); }
}
