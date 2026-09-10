import { AUTH_ERROR_CODES, errorFromRepository, failAuth } from './errors.mjs';
import {
  AuthHmac,
  coarseUserAgent,
  maskAuthEmail,
  normalizeAuthEmail,
  randomToken
} from './crypto.mjs';
import { AuthSecretVault } from './secret-vault.mjs';
import {
  PASSKEY_ALGORITHM,
  readPasskeyClientChallenge,
  verifyPasskeyAuthentication,
  verifyPasskeyRegistration
} from './webauthn.mjs';

export const AUTH_NATIVE_VERSION = 'firebase-canonical-auth-v2';
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const FIREBASE_VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000;
export const PASSKEY_CHALLENGE_TTL_MS = 5 * 60 * 1000;
export const PASSKEY_TICKET_TTL_MS = 60 * 1000;
export const PASSKEY_RP_ID = 'admissionhub.pages.dev';

const PASSKEY_REGISTRATION_LIMITS = Object.freeze([
  Object.freeze({ scope: 'passkey-register-user-hour', source: 'email', limit: 6, windowMs: 60 * 60 * 1000 }),
  Object.freeze({ scope: 'passkey-register-ip-hour', source: 'ip', limit: 20, windowMs: 60 * 60 * 1000 }),
  Object.freeze({ scope: 'passkey-register-device-hour', source: 'device', limit: 12, windowMs: 60 * 60 * 1000 })
]);

const PASSKEY_LOGIN_LIMITS = Object.freeze([
  Object.freeze({ scope: 'passkey-login-ip-15m', source: 'ip', limit: 60, windowMs: 15 * 60 * 1000 }),
  Object.freeze({ scope: 'passkey-login-device-15m', source: 'device', limit: 30, windowMs: 15 * 60 * 1000 }),
  Object.freeze({ scope: 'passkey-login-global-minute', source: 'global', limit: 180, windowMs: 60 * 1000 })
]);

const FIREBASE_OPERATION_LIMITS = Object.freeze({
  signup: Object.freeze([
    Object.freeze({ scope: 'firebase-verification-email-minute', source: 'email', limit: 1, windowMs: FIREBASE_VERIFICATION_RESEND_COOLDOWN_MS }),
    Object.freeze({ scope: 'firebase-verification-email-day', source: 'email', limit: 8, windowMs: 24 * 60 * 60 * 1000 }),
    Object.freeze({ scope: 'firebase-verification-ip-hour', source: 'ip', limit: 20, windowMs: 60 * 60 * 1000 }),
    Object.freeze({ scope: 'firebase-verification-device-hour', source: 'device', limit: 10, windowMs: 60 * 60 * 1000 })
  ]),
  'verification-resend': Object.freeze([
    Object.freeze({ scope: 'firebase-verification-email-minute', source: 'email', limit: 1, windowMs: FIREBASE_VERIFICATION_RESEND_COOLDOWN_MS }),
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
  ]),
  google: Object.freeze([
    Object.freeze({ scope: 'firebase-google-ip-15m', source: 'ip', limit: 60, windowMs: 15 * 60 * 1000 }),
    Object.freeze({ scope: 'firebase-google-device-15m', source: 'device', limit: 30, windowMs: 15 * 60 * 1000 }),
    Object.freeze({ scope: 'firebase-google-global-minute', source: 'global', limit: 180, windowMs: 60 * 1000 })
  ])
});

const requiredRepositoryMethods = Object.freeze([
  'consumeLimits', 'establishExternalSession',
  'getExternalSession', 'getSession', 'revokeSession',
  'beginPasskeyRegistration', 'getPasskeyRegistrationChallenge', 'finishPasskeyRegistration',
  'beginPasskeyAuthentication', 'getPasskeyAuthenticationMaterial', 'issuePasskeyTicket',
  'completePasskeySession', 'getPasskeyStatus', 'removePasskey',
  'ping', 'cleanup', 'nextExpiry'
]);

const assertRepository = repository => {
  if (!repository || requiredRepositoryMethods.some(method => typeof repository[method] !== 'function')) {
    failAuth(AUTH_ERROR_CODES.STORAGE_UNAVAILABLE);
  }
  return repository;
};

const trustedContextOrigin = value => {
  try {
    const url = new URL(String(value || ''));
    if (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)) return url.origin;
    if (url.protocol !== 'https:') return '';
    if (url.hostname === PASSKEY_RP_ID || /^[a-z0-9-]+\.admissionhub\.pages\.dev$/i.test(url.hostname) || url.hostname === 'admission-gk.admissionhub.workers.dev') return url.origin;
  } catch {}
  return '';
};

const normalizeContext = context => Object.freeze({
  ip: String(context?.ip || 'unknown').slice(0, 96),
  deviceId: String(context?.deviceId || 'unknown').slice(0, 128),
  userAgent: coarseUserAgent(context?.userAgent),
  origin: trustedContextOrigin(context?.origin)
});

const publicUser = user => Object.freeze({
  id: user.id,
  emailMasked: user.emailMask,
  status: user.status,
  createdAt: Number(user.createdAt)
});

const validSubject = value => {
  const subject = String(value || '').trim();
  if (!subject || subject.length > 256 || /[\r\n\u0000]/.test(subject)) failAuth(AUTH_ERROR_CODES.INVALID_INPUT);
  return subject;
};

const validChallengeId = value => {
  const challengeId = String(value || '').trim();
  if (!/^[A-Za-z0-9_-]{24,96}$/.test(challengeId)) failAuth(AUTH_ERROR_CODES.PASSKEY_INVALID);
  return challengeId;
};

export class CloudflareNativeAuthEngine {
  constructor({ repository, hmacSecret, now = () => Date.now(), cryptoImpl = globalThis.crypto, passkeyRpId = PASSKEY_RP_ID, passkeyOrigins = [`https://${PASSKEY_RP_ID}`] } = {}) {
    this.repository = assertRepository(repository);
    this.hmac = new AuthHmac(hmacSecret, cryptoImpl);
    this.vault = new AuthSecretVault(hmacSecret, cryptoImpl);
    this.now = now;
    this.crypto = cryptoImpl;
    this.passkeyRpId = String(passkeyRpId || PASSKEY_RP_ID);
    this.passkeyOrigins = Object.freeze([...new Set(passkeyOrigins.map(value => new URL(value).origin))]);
  }

  async #references(email, context) {
    const values = await Promise.all([
      this.hmac.hex('email-ref-v1', email),
      this.hmac.hex('network-ref-v1', context.ip),
      this.hmac.hex('device-ref-v1', context.deviceId)
    ]);
    return Object.freeze({ emailRef: values[0], ipRef: values[1], deviceRef: values[2] });
  }

  async #firebaseIdentity(input, requestContext, invalidCode = AUTH_ERROR_CODES.INVALID_INPUT) {
    const email = normalizeAuthEmail(input?.email);
    let subject;
    try { subject = validSubject(input?.subject); } catch { failAuth(invalidCode); }
    const context = normalizeContext(requestContext);
    const refs = await this.#references(email, context);
    const [subjectRef, sessionRef] = await Promise.all([
      this.hmac.hex('firebase-subject-v1', subject),
      input?.sessionToken ? this.hmac.hex('session-ref-v1', String(input.sessionToken)) : Promise.resolve('')
    ]);
    return Object.freeze({ email, subject, context, refs, subjectRef, sessionRef });
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

  #passkeyOrigins() {
    return this.passkeyOrigins;
  }

  async consumeFirebaseOperation(input = {}, requestContext = {}) {
    const operation = String(input.operation || '');
    const definitions = FIREBASE_OPERATION_LIMITS[operation];
    if (!definitions) failAuth(AUTH_ERROR_CODES.INVALID_INPUT);
    const email = input.email ? normalizeAuthEmail(input.email) : 'firebase-operation@admissionhub.invalid';
    const context = normalizeContext(requestContext);
    const refs = await this.#references(email, context);
    const now = Number(this.now());
    errorFromRepository(await this.repository.consumeLimits({
      limits: this.#limits(definitions, refs),
      now,
      eventType: `firebase-${operation}`,
      subjectRef: input.email ? refs.emailRef : null
    }));
    return Object.freeze({
      accepted: true,
      ...(input.email ? { email, emailMask: maskAuthEmail(email) } : {}),
      acceptedAt: now
    });
  }

  async establishFirebaseSession(input = {}, requestContext = {}) {
    const email = normalizeAuthEmail(input.email);
    const subject = validSubject(input.subject);
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
      user: publicUser(established.user),
      created: Boolean(established.created)
    });
  }

  async getFirebaseSession(sessionToken, input = {}) {
    const token = String(sessionToken || '').trim();
    if (!/^[A-Za-z0-9_-]{40,96}$/.test(token)) failAuth(AUTH_ERROR_CODES.SESSION_INVALID);
    const identity = await this.#firebaseIdentity({ ...input, sessionToken: token }, {}, AUTH_ERROR_CODES.SESSION_INVALID);
    const result = errorFromRepository(await this.repository.getExternalSession({
      sessionRef: identity.sessionRef,
      provider: 'firebase',
      subjectRef: identity.subjectRef,
      emailRef: identity.refs.emailRef,
      now: Number(this.now())
    }));
    return Object.freeze({ expiresAt: result.expiresAt, user: publicUser(result.user) });
  }

  async beginPasskeyRegistration(input = {}, requestContext = {}) {
    const token = String(input.sessionToken || '').trim();
    const refreshToken = String(input.refreshToken || '').trim();
    if (!/^[A-Za-z0-9_-]{40,96}$/.test(token) || refreshToken.length < 20 || refreshToken.length > 4096 || /[\r\n\u0000;]/.test(refreshToken)) failAuth(AUTH_ERROR_CODES.SESSION_INVALID);
    const identity = await this.#firebaseIdentity({ ...input, sessionToken: token }, requestContext, AUTH_ERROR_CODES.SESSION_INVALID);
    const now = Number(this.now());
    const challengeId = randomToken(24, this.crypto);
    const challenge = randomToken(32, this.crypto);
    const challengeMac = await this.hmac.hex('passkey-challenge-v1', `${challengeId}:${challenge}`);
    const refreshCipher = await this.vault.seal(refreshToken, `passkey-refresh:${identity.subjectRef}`);
    const userHandleCandidate = randomToken(32, this.crypto);
    const prepared = errorFromRepository(await this.repository.beginPasskeyRegistration({
      challengeId,
      challengeMac,
      sessionRef: identity.sessionRef,
      subjectRef: identity.subjectRef,
      emailRef: identity.refs.emailRef,
      deviceRef: identity.refs.deviceRef,
      ipRef: identity.refs.ipRef,
      userHandleCandidate,
      refreshCipher,
      limits: this.#limits(PASSKEY_REGISTRATION_LIMITS, identity.refs),
      now,
      expiresAt: now + PASSKEY_CHALLENGE_TTL_MS
    }));
    return Object.freeze({
      challengeId,
      options: Object.freeze({
        challenge,
        rp: Object.freeze({ id: this.passkeyRpId, name: 'Admission Hub' }),
        user: Object.freeze({ id: prepared.userHandle, name: prepared.user.emailMask, displayName: 'Admission Hub শিক্ষার্থী' }),
        pubKeyCredParams: Object.freeze([{ type: 'public-key', alg: PASSKEY_ALGORITHM }]),
        timeout: 120_000,
        attestation: 'none',
        authenticatorSelection: Object.freeze({ residentKey: 'required', requireResidentKey: true, userVerification: 'required' }),
        excludeCredentials: Object.freeze((prepared.credentials || []).map(row => Object.freeze({
          type: 'public-key', id: row.credentialId, transports: row.transports
        })))
      })
    });
  }

  async finishPasskeyRegistration(input = {}, requestContext = {}) {
    const challengeId = validChallengeId(input.challengeId);
    const token = String(input.sessionToken || '').trim();
    const refreshToken = String(input.refreshToken || '').trim();
    if (!/^[A-Za-z0-9_-]{40,96}$/.test(token)
      || refreshToken.length < 20 || refreshToken.length > 4096 || /[\r\n\u0000;]/.test(refreshToken)) {
      failAuth(AUTH_ERROR_CODES.SESSION_INVALID);
    }
    const identity = await this.#firebaseIdentity({ ...input, sessionToken: token }, requestContext, AUTH_ERROR_CODES.SESSION_INVALID);
    const suppliedChallenge = readPasskeyClientChallenge(input.response?.clientDataJSON, 'webauthn.create');
    const candidateChallengeMac = await this.hmac.hex('passkey-challenge-v1', `${challengeId}:${suppliedChallenge}`);
    const challenge = errorFromRepository(await this.repository.getPasskeyRegistrationChallenge({
      challengeId,
      candidateChallengeMac,
      sessionRef: identity.sessionRef,
      subjectRef: identity.subjectRef,
      emailRef: identity.refs.emailRef,
      deviceRef: identity.refs.deviceRef,
      now: Number(this.now())
    }));
    const verified = await verifyPasskeyRegistration({
      response: input.response,
      expectedChallenge: suppliedChallenge,
      rpId: this.passkeyRpId,
      allowedOrigins: this.#passkeyOrigins(identity.context),
      cryptoImpl: this.crypto
    });
    await this.vault.open(challenge.refreshCipher, `passkey-refresh:${challenge.subjectRef}`);
    const refreshCipher = await this.vault.seal(refreshToken, `passkey-refresh:${challenge.subjectRef}`);
    const stored = errorFromRepository(await this.repository.finishPasskeyRegistration({
      challengeId,
      candidateChallengeMac,
      deviceRef: identity.refs.deviceRef,
      credential: {
        ...verified,
        userHandle: challenge.userHandle,
        refreshCipher
      },
      now: Number(this.now())
    }));
    return Object.freeze({ registered: true, credentialCount: stored.credentialCount, user: publicUser(stored.user) });
  }

  async beginPasskeyAuthentication(requestContext = {}) {
    const context = normalizeContext(requestContext);
    const refs = await this.#references('passkey-login@admissionhub.invalid', context);
    const now = Number(this.now());
    const challengeId = randomToken(24, this.crypto);
    const challenge = randomToken(32, this.crypto);
    const challengeMac = await this.hmac.hex('passkey-challenge-v1', `${challengeId}:${challenge}`);
    errorFromRepository(await this.repository.beginPasskeyAuthentication({
      challengeId,
      challengeMac,
      deviceRef: refs.deviceRef,
      ipRef: refs.ipRef,
      limits: this.#limits(PASSKEY_LOGIN_LIMITS, refs),
      now,
      expiresAt: now + PASSKEY_CHALLENGE_TTL_MS
    }));
    return Object.freeze({
      challengeId,
      options: Object.freeze({
        challenge,
        rpId: this.passkeyRpId,
        timeout: 120_000,
        userVerification: 'required'
      })
    });
  }

  async finishPasskeyAuthentication(input = {}, requestContext = {}) {
    const challengeId = validChallengeId(input.challengeId);
    const credentialId = String(input.response?.rawId || '');
    if (!/^[A-Za-z0-9_-]{16,1400}$/.test(credentialId)) failAuth(AUTH_ERROR_CODES.PASSKEY_INVALID);
    const context = normalizeContext(requestContext);
    const refs = await this.#references('passkey-login@admissionhub.invalid', context);
    const suppliedChallenge = readPasskeyClientChallenge(input.response?.clientDataJSON, 'webauthn.get');
    const candidateChallengeMac = await this.hmac.hex('passkey-challenge-v1', `${challengeId}:${suppliedChallenge}`);
    const material = errorFromRepository(await this.repository.getPasskeyAuthenticationMaterial({
      challengeId,
      candidateChallengeMac,
      credentialId,
      deviceRef: refs.deviceRef,
      now: Number(this.now())
    }));
    const verified = await verifyPasskeyAuthentication({
      response: input.response,
      expectedChallenge: suppliedChallenge,
      rpId: this.passkeyRpId,
      allowedOrigins: this.#passkeyOrigins(context),
      credential: material.credential,
      cryptoImpl: this.crypto
    });
    const loginTicket = randomToken(32, this.crypto);
    const ticketRef = await this.hmac.hex('passkey-ticket-v1', loginTicket);
    const issued = errorFromRepository(await this.repository.issuePasskeyTicket({
      challengeId,
      candidateChallengeMac,
      credentialId,
      previousCounter: material.credential.counter,
      nextCounter: verified.counter,
      backupState: verified.backupState,
      ticketRef,
      deviceRef: refs.deviceRef,
      now: Number(this.now()),
      expiresAt: Number(this.now()) + PASSKEY_TICKET_TTL_MS
    }));
    const refreshToken = await this.vault.open(issued.refreshCipher, `passkey-refresh:${issued.subjectRef}`);
    return Object.freeze({ loginTicket, refreshToken });
  }

  async completePasskeySession(input = {}, requestContext = {}) {
    const loginTicket = String(input.loginTicket || '').trim();
    const rotatedRefreshToken = String(input.refreshToken || '').trim();
    if (!/^[A-Za-z0-9_-]{40,96}$/.test(loginTicket) || rotatedRefreshToken.length < 20 || rotatedRefreshToken.length > 4096 || /[\r\n\u0000;]/.test(rotatedRefreshToken)) failAuth(AUTH_ERROR_CODES.PASSKEY_INVALID);
    const identity = await this.#firebaseIdentity(input, requestContext, AUTH_ERROR_CODES.PASSKEY_INVALID);
    const now = Number(this.now());
    const sessionToken = randomToken(32, this.crypto);
    const [ticketRef, sessionRef, refreshCipher] = await Promise.all([
      this.hmac.hex('passkey-ticket-v1', loginTicket),
      this.hmac.hex('session-ref-v1', sessionToken),
      this.vault.seal(rotatedRefreshToken, `passkey-refresh:${identity.subjectRef}`)
    ]);
    const completed = errorFromRepository(await this.repository.completePasskeySession({
      ticketRef,
      subjectRef: identity.subjectRef,
      emailRef: identity.refs.emailRef,
      emailMask: maskAuthEmail(identity.email),
      sessionRef,
      refreshCipher,
      ipRef: identity.refs.ipRef,
      deviceRef: identity.refs.deviceRef,
      userAgent: identity.context.userAgent,
      now,
      sessionExpiresAt: now + SESSION_TTL_MS
    }));
    return Object.freeze({
      sessionToken,
      sessionExpiresAt: now + SESSION_TTL_MS,
      user: publicUser(completed.user),
      created: false
    });
  }

  async getPasskeyStatus(input = {}, requestContext = {}) {
    const token = String(input.sessionToken || '').trim();
    if (!/^[A-Za-z0-9_-]{40,96}$/.test(token)) failAuth(AUTH_ERROR_CODES.SESSION_INVALID);
    const identity = await this.#firebaseIdentity({ ...input, sessionToken: token }, requestContext, AUTH_ERROR_CODES.SESSION_INVALID);
    const result = errorFromRepository(await this.repository.getPasskeyStatus({
      sessionRef: identity.sessionRef,
      subjectRef: identity.subjectRef,
      emailRef: identity.refs.emailRef,
      now: Number(this.now())
    }));
    return Object.freeze({ enabled: result.count > 0, count: result.count, credentials: Object.freeze(result.credentials) });
  }

  async removePasskey(input = {}, requestContext = {}) {
    const token = String(input.sessionToken || '').trim();
    const credentialId = String(input.credentialId || '');
    if (!/^[A-Za-z0-9_-]{40,96}$/.test(token) || !/^[A-Za-z0-9_-]{16,1400}$/.test(credentialId)) failAuth(AUTH_ERROR_CODES.INVALID_INPUT);
    const identity = await this.#firebaseIdentity({ ...input, sessionToken: token }, requestContext, AUTH_ERROR_CODES.SESSION_INVALID);
    const result = errorFromRepository(await this.repository.removePasskey({
      sessionRef: identity.sessionRef,
      subjectRef: identity.subjectRef,
      emailRef: identity.refs.emailRef,
      credentialId,
      now: Number(this.now())
    }));
    return Object.freeze({ removed: true, credentialCount: result.credentialCount });
  }

  async getSession(sessionToken) {
    const token = String(sessionToken || '').trim();
    if (!/^[A-Za-z0-9_-]{40,96}$/.test(token)) failAuth(AUTH_ERROR_CODES.SESSION_INVALID);
    const sessionRef = await this.hmac.hex('session-ref-v1', token);
    const result = errorFromRepository(await this.repository.getSession({ sessionRef, now: Number(this.now()) }));
    return Object.freeze({ expiresAt: result.expiresAt, user: publicUser(result.user) });
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
