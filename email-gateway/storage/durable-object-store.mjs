import { EmailGatewayError } from '../core/errors.mjs';
import { EMAIL_FAILURE_CODES } from '../core/constants.mjs';

export class DurableObjectEmailStore {
  constructor(binding, { now = () => Date.now() } = {}) {
    if (!binding || typeof binding.idFromName !== 'function' || typeof binding.get !== 'function') {
      throw new EmailGatewayError({ code: EMAIL_FAILURE_CODES.STORAGE_UNAVAILABLE, safeMessage: 'Email coordinator binding is unavailable.' });
    }
    this.binding = binding;
    this.now = now;
    this.consistency = 'strong';
  }

  async #call(shard, path, body = {}) {
    try {
      const id = this.binding.idFromName(String(shard));
      const stub = this.binding.get(id);
      const request = new Request(`https://email-coordinator${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, now: body.now ?? this.now() })
      });
      const response = await stub.fetch(request);
      if (!response.ok) throw new Error(`coordinator-${response.status}`);
      return await response.json();
    } catch (error) {
      throw new EmailGatewayError({ code: EMAIL_FAILURE_CODES.STORAGE_UNAVAILABLE, cause: error });
    }
  }

  acquireRequest(record, ttlSeconds) {
    return this.#call(`request:${record.idempotencyKey || record.requestId}`, '/request/acquire', { record, ttlSeconds });
  }

  async getRequest(requestId) {
    return (await this.#call(`request:${requestId}`, '/request/get')).record;
  }

  async updateRequest(requestId, patch, ttlSeconds, options = {}) {
    return (await this.#call(`request:${requestId}`, '/request/update', { patch, ttlSeconds, deliveryTransition: Boolean(options.deliveryTransition) })).record;
  }

  async acquireNonce(key, ttlSeconds) {
    return (await this.#call(`nonce:${key}`, '/nonce/acquire', { ttlSeconds })).acquired;
  }

  consumeRateLimit(key, limit, windowMs, now = this.now()) {
    return this.#call(`rate:${key}`, '/rate/consume', { limit, windowMs, now });
  }

  async getProviderState(providerId) {
    return (await this.#call(`provider:${providerId}`, '/provider/state/get', { providerId })).state;
  }

  mutateProviderState(providerId, operation, payload) {
    return this.#call(`provider:${providerId}`, '/provider/state/mutate', { providerId, operation, payload });
  }

  reserveProviderQuota(providerId, policy, now = this.now()) {
    return this.#call(`provider:${providerId}`, '/provider/quota/reserve', { providerId, policy, now });
  }

  getProviderQuota(providerId, policy) {
    return this.#call(`provider:${providerId}`, '/provider/quota/get', { providerId, policy });
  }

  async appendEvent(event, retention = 500) {
    return (await this.#call('events:global', '/events/append', { event, retention })).appended;
  }

  async listEvents(limit = 50) {
    return (await this.#call('events:global', '/events/list', { limit })).events;
  }

  async acquireEvent(eventId, ttlSeconds, leaseSeconds = 30) {
    return this.#call(`event:${eventId}`, '/event/acquire', { ttlSeconds, leaseSeconds });
  }

  async completeEvent(eventId, ttlSeconds) {
    return (await this.#call(`event:${eventId}`, '/event/complete', { ttlSeconds })).completed;
  }

  async acquireAlert(key, cooldownMs) {
    return (await this.#call(`alert:${key}`, '/alert/acquire', { cooldownMs })).acquired;
  }
}
