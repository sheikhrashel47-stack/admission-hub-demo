import { INTERNAL_EMAIL_PATHS } from './core/constants.mjs';
import { INTERNAL_AUTH_HEADERS, signInternalRequest } from './core/internal-auth.mjs';
import { bytesToBase64Url } from './core/crypto.mjs';
import { EmailGatewayError } from './core/errors.mjs';
import { EMAIL_FAILURE_CODES } from './core/constants.mjs';

const createNonce = cryptoApi => {
  const bytes = new Uint8Array(18);
  (cryptoApi || globalThis.crypto).getRandomValues(bytes);
  return bytesToBase64Url(bytes);
};

const readBoundedJson = async (response, maximum = 128 * 1024) => {
  if (!response.body) return null;
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maximum) { await reader.cancel(); throw new EmailGatewayError({ code: EMAIL_FAILURE_CODES.UNKNOWN, safeMessage: 'Email Gateway response is invalid.' }); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch (_) { return null; }
};

export function createEmailGatewayServiceClient({ origin, keyId = 'current', signingSecret, fetchImpl = globalThis.fetch, now = () => Date.now(), crypto: cryptoApi, nonce = () => createNonce(cryptoApi), timeoutMs = 15000, setTimer = setTimeout, clearTimer = clearTimeout }) {
  const base = new URL(String(origin || ''));
  if (base.protocol !== 'https:' || base.username || base.password || base.pathname !== '/' || base.search || base.hash) throw new TypeError('Email Gateway origin must be an HTTPS origin.');
  if (!/^[A-Za-z0-9_-]{1,32}$/.test(keyId) || String(signingSecret || '').length < 32 || typeof fetchImpl !== 'function' || typeof setTimer !== 'function' || typeof clearTimer !== 'function' || !Number.isFinite(Number(timeoutMs)) || Number(timeoutMs) < 100 || Number(timeoutMs) > 30000) throw new TypeError('Email Gateway service credentials are invalid.');
  const secret = String(signingSecret);

  const call = async (path, { method = 'POST', body } = {}) => {
    const bodyText = body == null ? '' : JSON.stringify(body);
    const timestamp = String(Math.floor(now() / 1000));
    const nonceValue = String(nonce());
    const signature = await signInternalRequest({ secret, method, path, timestamp, nonce: nonceValue, bodyText, crypto: cryptoApi });
    const controller = new AbortController();
    let timer;
    const requestTask = Promise.resolve().then(() => fetchImpl(new URL(path, base).href, {
      method,
      headers: {
        ...(body == null ? {} : { 'Content-Type': 'application/json' }),
        [INTERNAL_AUTH_HEADERS.KEY_ID]: keyId,
        [INTERNAL_AUTH_HEADERS.TIMESTAMP]: timestamp,
        [INTERNAL_AUTH_HEADERS.NONCE]: nonceValue,
        [INTERNAL_AUTH_HEADERS.SIGNATURE]: signature
      },
      signal: controller.signal,
      ...(body == null ? {} : { body: bodyText })
    }));
    requestTask.catch(() => {});
    const timeoutTask = new Promise((_, reject) => {
      timer = setTimer(() => {
        controller.abort('email-gateway-client-timeout');
        const isSend = path === INTERNAL_EMAIL_PATHS.SEND;
        reject(new EmailGatewayError({ code: isSend ? EMAIL_FAILURE_CODES.DELIVERY_UNCERTAIN : EMAIL_FAILURE_CODES.TIMEOUT, safeMessage: isSend ? 'Email delivery outcome is uncertain; no new request should be created.' : 'Email Gateway request timed out.', retryable: !isSend, uncertain: isSend, dispatched: true, status: 504 }));
      }, Number(timeoutMs));
    });
    let response;
    try {
      response = await Promise.race([requestTask, timeoutTask]);
    } catch (cause) {
      if (cause instanceof EmailGatewayError) throw cause;
      const isSend = path === INTERNAL_EMAIL_PATHS.SEND;
      throw new EmailGatewayError({ code: isSend ? EMAIL_FAILURE_CODES.DELIVERY_UNCERTAIN : EMAIL_FAILURE_CODES.NETWORK_ERROR, safeMessage: isSend ? 'Email delivery outcome is uncertain; no new request should be created.' : 'Email Gateway network failed.', retryable: !isSend, uncertain: isSend, dispatched: true, cause });
    } finally {
      if (timer) clearTimer(timer);
    }
    let data = null;
    try { data = await readBoundedJson(response); } catch (error) { if (error instanceof EmailGatewayError) throw error; }
    if (response.ok && (!data || typeof data !== 'object')) throw new EmailGatewayError({ code: EMAIL_FAILURE_CODES.UNKNOWN, safeMessage: 'Email Gateway response is invalid.' });
    if (!response.ok) throw new EmailGatewayError({
      code: data?.error?.code || EMAIL_FAILURE_CODES.UNKNOWN,
      safeMessage: data?.error?.message || 'Email Gateway request failed.',
      retryable: Boolean(data?.error?.retryable),
      uncertain: Boolean(data?.error?.uncertain),
      status: response.status
    });
    return data;
  };

  return Object.freeze({
    send: input => call(INTERNAL_EMAIL_PATHS.SEND, { body: input }),
    healthCheck: ({ includeEvents = false } = {}) => call(`${INTERNAL_EMAIL_PATHS.HEALTH}${includeEvents ? '?events=1' : ''}`, { method: 'GET' }),
    recordDeliveryEvent: input => call(INTERNAL_EMAIL_PATHS.DELIVERY_EVENT, { body: input })
  });
}
