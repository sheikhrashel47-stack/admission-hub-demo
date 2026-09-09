import { AUTH_ERROR_CODES, errorFromRepository, failAuth } from './errors.mjs';
import {
  AuthHmac,
  coarseUserAgent,
  maskAuthEmail,
  normalizeAuthEmail,
  randomSixDigitOtp,
  randomToken
} from './crypto.mjs';

export const AUTH_NATIVE_VERSION = 'cloudflare-native-v1';
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

const requiredRepositoryMethods = Object.freeze([
  'prepareChallenge', 'markDelivery', 'verifyChallenge', 'getSession', 'revokeSession', 'ping', 'cleanup', 'nextExpiry'
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
