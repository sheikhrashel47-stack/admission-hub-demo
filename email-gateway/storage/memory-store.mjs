import { applyProviderStateOperation, createProviderState } from '../core/provider-state.mjs';
import { createQuotaState, quotaSnapshot, reserveQuotaState } from '../core/quota.mjs';
import { EmailGatewayError } from '../core/errors.mjs';
import { EMAIL_FAILURE_CODES } from '../core/constants.mjs';
import { shouldApplyDeliveryTransition } from '../core/delivery-state.mjs';

const copy = value => value == null ? value : structuredClone(value);

export class MemoryEmailStore {
  constructor({ now = () => Date.now(), eventRetention = 500, consistency = 'strong', fail = null } = {}) {
    this.consistency = consistency;
    this.now = now;
    this.eventRetention = eventRetention;
    this.fail = fail;
    this.requests = new Map();
    this.nonces = new Map();
    this.rateCounters = new Map();
    this.providerStates = new Map();
    this.providerQuotas = new Map();
    this.events = [];
    this.eventIds = new Map();
    this.alerts = new Map();
    this.operationCounts = new Map();
  }

  #guard(operation) {
    this.operationCounts.set(operation, (this.operationCounts.get(operation) || 0) + 1);
    if (this.fail === true || this.fail === operation || (typeof this.fail === 'function' && this.fail(operation))) {
      throw new EmailGatewayError({ code: EMAIL_FAILURE_CODES.STORAGE_UNAVAILABLE });
    }
  }

  #live(map, key) {
    const value = map.get(key);
    if (value?.expiresAt && value.expiresAt <= this.now()) {
      map.delete(key);
      return null;
    }
    return value || null;
  }

  async acquireRequest(record, ttlSeconds) {
    this.#guard('acquireRequest');
    const storageKey = record.idempotencyKey || record.requestId;
    const existing = this.#live(this.requests, storageKey);
    if (existing) return { acquired: false, existing: copy(existing.value) };
    this.requests.set(storageKey, { value: copy(record), expiresAt: this.now() + (ttlSeconds * 1000) });
    return { acquired: true, record: copy(record) };
  }

  async getRequest(requestId) {
    this.#guard('getRequest');
    return copy(this.#live(this.requests, requestId)?.value || null);
  }

  async updateRequest(requestId, patch, ttlSeconds, options = {}) {
    this.#guard('updateRequest');
    const current = this.#live(this.requests, requestId);
    if (!current) return null;
    if (options.deliveryTransition && !shouldApplyDeliveryTransition(current.value, patch)) return copy(current.value);
    current.value = { ...current.value, ...copy(patch) };
    if (ttlSeconds) current.expiresAt = this.now() + (ttlSeconds * 1000);
    return copy(current.value);
  }

  async acquireNonce(key, ttlSeconds) {
    this.#guard('acquireNonce');
    if (this.#live(this.nonces, key)) return false;
    this.nonces.set(key, { expiresAt: this.now() + (ttlSeconds * 1000) });
    return true;
  }

  async consumeRateLimit(key, limit, windowMs, now = this.now()) {
    this.#guard('consumeRateLimit');
    const bucket = `${key}:${Math.floor(now / windowMs)}`;
    const current = this.rateCounters.get(bucket) || { count: 0, expiresAt: (Math.floor(now / windowMs) + 1) * windowMs };
    current.count += 1;
    this.rateCounters.set(bucket, current);
    return { allowed: current.count <= limit, count: current.count, limit, resetAt: current.expiresAt };
  }

  async getProviderState(providerId) {
    this.#guard('getProviderState');
    return copy(this.providerStates.get(providerId) || createProviderState(providerId));
  }

  async mutateProviderState(providerId, operation, payload) {
    this.#guard('mutateProviderState');
    const current = this.providerStates.get(providerId) || createProviderState(providerId);
    const result = applyProviderStateOperation(current, operation, payload);
    this.providerStates.set(providerId, result.state);
    return copy(result);
  }

  async reserveProviderQuota(providerId, policy, now = this.now()) {
    this.#guard('reserveProviderQuota');
    const current = this.providerQuotas.get(providerId) || createQuotaState(providerId);
    const result = reserveQuotaState(current, { providerId, dailyLimit: policy.dailyLimit, monthlyLimit: policy.monthlyLimit, now });
    this.providerQuotas.set(providerId, result.state);
    return copy(result);
  }

  async getProviderQuota(providerId, policy) {
    this.#guard('getProviderQuota');
    const current = this.providerQuotas.get(providerId) || createQuotaState(providerId);
    return copy(quotaSnapshot(current, policy));
  }

  async appendEvent(event, retention = this.eventRetention) {
    this.#guard('appendEvent');
    this.events.push(copy(event));
    if (this.events.length > retention) this.events.splice(0, this.events.length - retention);
    return true;
  }

  async listEvents(limit = 50) {
    this.#guard('listEvents');
    return copy(this.events.slice(-Math.max(0, Math.min(500, limit))).reverse());
  }

  async acquireEvent(eventId, ttlSeconds, leaseSeconds = 30) {
    this.#guard('acquireEvent');
    const now = this.now();
    const current = this.#live(this.eventIds, eventId);
    if (current?.status === 'COMPLETED' || (current && !current.status)) return { acquired: false, completed: true };
    if (current?.leaseUntil > now) return { acquired: false, completed: false };
    this.eventIds.set(eventId, { status: 'PROCESSING', leaseUntil: now + leaseSeconds * 1000, expiresAt: now + ttlSeconds * 1000 });
    return { acquired: true, completed: false };
  }

  async completeEvent(eventId, ttlSeconds) {
    this.#guard('completeEvent');
    const now = this.now();
    const current = this.#live(this.eventIds, eventId);
    if (!current) return false;
    this.eventIds.set(eventId, { status: 'COMPLETED', leaseUntil: 0, expiresAt: now + ttlSeconds * 1000 });
    return true;
  }

  async acquireAlert(key, cooldownMs) {
    this.#guard('acquireAlert');
    const now = this.now();
    const last = Number(this.alerts.get(key) || 0);
    if (last && now - last < cooldownMs) return false;
    this.alerts.set(key, now);
    return true;
  }
}
