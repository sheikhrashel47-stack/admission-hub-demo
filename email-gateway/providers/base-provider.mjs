import { asEmailGatewayError, errorFromHttpStatus, EmailGatewayError } from '../core/errors.mjs';
import { DELIVERY_STATES, EMAIL_FAILURE_CODES } from '../core/constants.mjs';

export const PROVIDER_METHODS = Object.freeze([
  'sendEmail', 'checkHealth', 'getStatus', 'getCapabilities',
  'verifyConfiguration', 'healthCheck', 'getQuotaStatus'
]);

export function assertProviderAdapter(adapter) {
  if (!adapter || typeof adapter !== 'object' || !adapter.id) throw new EmailGatewayError({ code: EMAIL_FAILURE_CODES.INVALID_CONFIGURATION, safeMessage: 'Email provider adapter is invalid.' });
  const missing = PROVIDER_METHODS.filter(method => typeof adapter[method] !== 'function');
  if (missing.length) throw new EmailGatewayError({ code: EMAIL_FAILURE_CODES.INVALID_CONFIGURATION, safeMessage: `Email provider ${adapter.id} is missing: ${missing.join(', ')}` });
  return adapter;
}

const readBoundedProviderResponse = async (response, maximum = 64 * 1024) => {
  if (!response.body) return null;
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maximum) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  const raw = new TextDecoder().decode(bytes);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (_) { return { value: raw.slice(0, 1000) }; }
};

export class ProviderAdapter {
  constructor({ id, name, capabilities = [], fetchImpl = globalThis.fetch }) {
    if (!id || !name || typeof fetchImpl !== 'function') throw new EmailGatewayError({ code: EMAIL_FAILURE_CODES.INVALID_CONFIGURATION });
    Object.defineProperties(this, {
      id: { value: id, enumerable: true },
      name: { value: name, enumerable: true },
      capabilities: { value: Object.freeze([...new Set(capabilities)]), enumerable: true },
      fetchImpl: { value: fetchImpl, enumerable: false }
    });
  }

  getCapabilities() {
    return this.capabilities;
  }

  async getQuotaStatus() {
    return Object.freeze({ source: 'local-policy', exact: false });
  }

  async healthCheck() {
    const result = await this.verifyConfiguration();
    return Object.freeze({ status: result.configured ? 'CONFIGURED' : 'DISABLED', remoteVerified: false });
  }

  checkHealth(context = {}) {
    return this.healthCheck(context);
  }

  async getStatus() {
    const result = await this.verifyConfiguration();
    return Object.freeze({ status: result.configured ? 'CONFIGURED' : 'DISABLED', configured: Boolean(result.configured), remoteVerified: false });
  }

  async probeHttp({ url, headers = {}, signal, mapResult, timeoutMs = 5000 }) {
    const controller = new AbortController();
    const abort = () => controller.abort(signal?.reason || 'email-provider-health-aborted');
    if (signal?.aborted) abort();
    else signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(() => controller.abort('email-provider-health-timeout'), Math.max(100, Math.min(10000, Number(timeoutMs || 5000))));
    try {
      const response = await this.fetchImpl(url, { method: 'GET', headers: { Accept: 'application/json', ...headers }, signal: controller.signal });
      if (!response.ok) throw errorFromHttpStatus(response.status, { providerId: this.id, retryAfter: response.headers.get('Retry-After') });
      const data = await readBoundedProviderResponse(response);
      const mapped = mapResult ? mapResult(data, response) : {};
      return Object.freeze({ status: mapped?.status || 'HEALTHY', remoteVerified: true, ...mapped });
    } catch (error) {
      throw asEmailGatewayError(error, { providerId: this.id, dispatched: false, uncertain: false });
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
    }
  }

  async sendHttp({ url, headers, body, signal, requestId, deliveryAttemptId, mapResponse }) {
    let response;
    try {
      response = await this.fetchImpl(url, {
        method: 'POST',
        headers: { Accept: 'application/json', ...headers },
        body: typeof body === 'string' || body instanceof FormData ? body : JSON.stringify(body),
        signal
      });
    } catch (error) {
      throw asEmailGatewayError(error, { providerId: this.id, dispatched: true, uncertain: true });
    }
    if (!response.ok) throw errorFromHttpStatus(response.status, { providerId: this.id, retryAfter: response.headers.get('Retry-After') });
    let data = null;
    try { data = await readBoundedProviderResponse(response); } catch (_) {}
    const mapped = mapResponse ? mapResponse(data, response) : {};
    const providerMessageId = mapped?.providerMessageId ? String(mapped.providerMessageId).slice(0, 200) : null;
    if (!providerMessageId) throw new EmailGatewayError({ code: EMAIL_FAILURE_CODES.UNKNOWN, providerId: this.id, retryable: false, dispatched: true, uncertain: true, safeMessage: 'Email provider returned an invalid acceptance response.' });
    return Object.freeze({
      status: mapped?.status || DELIVERY_STATES.ACCEPTED,
      providerMessageId,
      requestId,
      deliveryAttemptId
    });
  }
}

export const basicAuthorization = (username, password) => `Basic ${btoa(`${username}:${password}`)}`;
