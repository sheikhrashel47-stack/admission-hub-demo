import { hmacSha256Base64Url, sha256Hex, timingSafeEqual } from './crypto.mjs';
import { EmailGatewayError } from './errors.mjs';
import { EMAIL_FAILURE_CODES } from './constants.mjs';

export const INTERNAL_AUTH_HEADERS = Object.freeze({
  KEY_ID: 'X-AH-Email-Key-Id',
  TIMESTAMP: 'X-AH-Email-Timestamp',
  NONCE: 'X-AH-Email-Nonce',
  SIGNATURE: 'X-AH-Email-Signature'
});

export function signingSecretsFromEnv(env = {}) {
  const secrets = {};
  if (String(env.EMAIL_GATEWAY_SIGNING_SECRET || '').length >= 32) secrets.current = String(env.EMAIL_GATEWAY_SIGNING_SECRET);
  if (String(env.EMAIL_GATEWAY_PREVIOUS_SIGNING_SECRET || '').length >= 32) secrets.previous = String(env.EMAIL_GATEWAY_PREVIOUS_SIGNING_SECRET);
  return Object.freeze(secrets);
}

export async function canonicalInternalRequest({ method, path, timestamp, nonce, bodyText, crypto }) {
  const bodyHash = await sha256Hex(bodyText || '', crypto);
  return `${String(method).toUpperCase()}\n${path}\n${timestamp}\n${nonce}\n${bodyHash}`;
}

export async function signInternalRequest({ secret, method = 'POST', path, timestamp, nonce, bodyText = '', crypto }) {
  const canonical = await canonicalInternalRequest({ method, path, timestamp, nonce, bodyText, crypto });
  return hmacSha256Base64Url(secret, canonical, crypto);
}

export async function verifyInternalRequest({ request, bodyText = '', secrets, store, config, now = () => Date.now(), crypto }) {
  const keyId = String(request.headers.get(INTERNAL_AUTH_HEADERS.KEY_ID) || '');
  const timestamp = String(request.headers.get(INTERNAL_AUTH_HEADERS.TIMESTAMP) || '');
  const nonce = String(request.headers.get(INTERNAL_AUTH_HEADERS.NONCE) || '');
  const supplied = String(request.headers.get(INTERNAL_AUTH_HEADERS.SIGNATURE) || '');
  const secret = secrets?.[keyId];
  if (!secret || !/^\d{10}$/.test(timestamp) || !/^[A-Za-z0-9_-]{16,96}$/.test(nonce) || !/^[A-Za-z0-9_-]{40,96}$/.test(supplied)) {
    throw new EmailGatewayError({ code: EMAIL_FAILURE_CODES.UNAUTHORIZED, retryable: false, status: 403 });
  }
  const currentSeconds = Math.floor(now() / 1000);
  if (Math.abs(currentSeconds - Number(timestamp)) > config.security.signatureMaxAgeSeconds) {
    throw new EmailGatewayError({ code: EMAIL_FAILURE_CODES.UNAUTHORIZED, retryable: false, status: 403 });
  }
  const url = new URL(request.url);
  const path = `${url.pathname}${url.search}`;
  const expected = await signInternalRequest({ secret, method: request.method, path, timestamp, nonce, bodyText, crypto });
  if (!timingSafeEqual(supplied, expected)) throw new EmailGatewayError({ code: EMAIL_FAILURE_CODES.UNAUTHORIZED, retryable: false, status: 403 });
  const acquired = await store.acquireNonce(`${keyId}:${nonce}`, config.security.nonceTtlSeconds);
  if (!acquired) throw new EmailGatewayError({ code: EMAIL_FAILURE_CODES.REPLAY_DETECTED, retryable: false, status: 409 });
  return Object.freeze({ keyId, timestamp: Number(timestamp), nonce });
}
