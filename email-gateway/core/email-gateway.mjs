import {
  DELIVERY_STATES,
  EMAIL_FAILURE_CODES,
  EMAIL_GATEWAY_VERSION,
  FINAL_REQUEST_STATES
} from './constants.mjs';
import { normalizeDeliveryEvent, normalizeEmailRequest } from './validation.mjs';
import { EmailGatewayError, asEmailGatewayError, toPublicEmailError } from './errors.mjs';
import { hashPrivateReference } from './crypto.mjs';
import { shouldApplyDeliveryTransition } from './delivery-state.mjs';

const freeze = value => Object.freeze(value);

export class EmailGateway {
  constructor({ config, store, registry, router, templateEngine, rateLimiter, observability, privatePepper, now = () => Date.now(), hashReference }) {
    this.config = config;
    this.store = store;
    this.registry = registry;
    this.router = router;
    this.templateEngine = templateEngine;
    this.rateLimiter = rateLimiter;
    this.observability = observability;
    this.privatePepper = String(privatePepper || '');
    this.now = now;
    this.hasCustomHasher = typeof hashReference === 'function';
    this.hashReference = hashReference || ((value) => hashPrivateReference(value, this.privatePepper));
  }

  async #refs(request) {
    if (this.privatePepper.length < 16 && !this.hasCustomHasher) throw new EmailGatewayError({ code: EMAIL_FAILURE_CODES.NOT_CONFIGURED });
    const fingerprintPayload = JSON.stringify({
      requestId: request.requestId,
      idempotencyKey: request.idempotencyKey,
      type: request.type,
      recipient: request.recipient,
      subject: request.subject,
      template: request.template,
      priority: request.priority,
      variables: Object.fromEntries(Object.entries(request.variables).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0))
    });
    const values = await Promise.all([
      this.hashReference(`recipient:${request.recipient}`),
      this.hashReference(`request:${request.requestId}`),
      request.context.ip ? this.hashReference(`ip:${request.context.ip}`) : null,
      request.context.accountId ? this.hashReference(`account:${request.context.accountId}`) : null,
      request.context.deviceId ? this.hashReference(`device:${request.context.deviceId}`) : null,
      this.hashReference(`fingerprint:${fingerprintPayload}`)
    ]);
    return freeze({ recipientRef: values[0], requestRef: values[1], ipRef: values[2], accountRef: values[3], deviceRef: values[4], fingerprint: values[5] });
  }

  #publicRecord(record, duplicate = false) {
    return freeze({
      ok: [DELIVERY_STATES.ACCEPTED, DELIVERY_STATES.QUEUED, DELIVERY_STATES.SENT, DELIVERY_STATES.DELIVERED].includes(record.status),
      requestId: record.requestId,
      idempotencyKey: record.idempotencyKey || record.requestId,
      status: record.status,
      providerId: record.providerId || null,
      providerMessageId: record.providerMessageId || null,
      attempts: Array.isArray(record.attempts) ? record.attempts.map(attempt => freeze({ ...attempt })) : [],
      duplicate,
      emergency: Boolean(record.emergency),
      uncertain: record.status === DELIVERY_STATES.UNCERTAIN,
      error: record.error || null,
      updatedAt: record.updatedAt || record.createdAt
    });
  }

  async send(input) {
    if (this.config.security.requireStrongConsistency && this.store.consistency !== 'strong') {
      throw new EmailGatewayError({ code: EMAIL_FAILURE_CODES.STRONG_STORE_REQUIRED, retryable: false });
    }
    const request = normalizeEmailRequest(input, this.config);
    const messageContent = this.templateEngine.render(request);
    const refs = await this.#refs(request);
    const now = this.now();
    const initial = {
      requestId: request.requestId,
      idempotencyKey: request.idempotencyKey,
      fingerprint: refs.fingerprint,
      type: request.type,
      recipientRef: refs.recipientRef,
      status: DELIVERY_STATES.PENDING,
      providerId: null,
      providerMessageId: null,
      attempts: [],
      error: null,
      createdAt: now,
      updatedAt: now
    };
    const acquired = await this.store.acquireRequest(initial, this.config.idempotency.ttlSeconds);
    if (!acquired.acquired) {
      if (acquired.existing.fingerprint !== refs.fingerprint) throw new EmailGatewayError({ code: EMAIL_FAILURE_CODES.IDEMPOTENCY_CONFLICT, retryable: false, status: 409 });
      if (!FINAL_REQUEST_STATES.has(acquired.existing.status)) {
        throw new EmailGatewayError({ code: EMAIL_FAILURE_CODES.DELIVERY_UNCERTAIN, retryable: false, uncertain: true, status: 409 });
      }
      return this.#publicRecord(acquired.existing, true);
    }

    let routedOutcome = null;
    try {
      await this.rateLimiter.consume({ ...refs, type: request.type });
      await this.store.updateRequest(request.idempotencyKey, { status: DELIVERY_STATES.ATTEMPTING, updatedAt: this.now() }, this.config.idempotency.ttlSeconds);
      const routed = await this.router.route({
        message: freeze({ recipient: request.recipient, subject: messageContent.subject, html: messageContent.html, text: messageContent.text }),
        requestId: request.requestId,
        idempotencyKey: request.idempotencyKey,
        requestRef: refs.requestRef,
        type: request.type
      });
      routedOutcome = routed;
      let record;
      try {
        record = await this.store.updateRequest(request.idempotencyKey, {
          status: routed.result.status,
          providerId: routed.providerId,
          providerMessageId: routed.result.providerMessageId,
          attempts: routed.attempts,
          error: null,
          emergency: routed.emergency,
          updatedAt: this.now()
        }, this.config.idempotency.ttlSeconds);
      } catch (cause) {
        throw new EmailGatewayError({ code: EMAIL_FAILURE_CODES.STORAGE_UNAVAILABLE, uncertain: true, dispatched: true, cause });
      }
      if (!record) throw new EmailGatewayError({ code: EMAIL_FAILURE_CODES.STORAGE_UNAVAILABLE, uncertain: true, dispatched: true });
      await this.observability.emit({ kind: 'REQUEST_FINAL', requestRef: refs.requestRef, type: request.type, providerId: routed.providerId, outcome: routed.result.status, emergency: routed.emergency });
      return this.#publicRecord(record);
    } catch (error) {
      const normalized = asEmailGatewayError(error);
      const status = normalized.code === EMAIL_FAILURE_CODES.RATE_LIMITED
        ? DELIVERY_STATES.RATE_LIMITED
        : normalized.uncertain || normalized.code === EMAIL_FAILURE_CODES.DELIVERY_UNCERTAIN
          ? DELIVERY_STATES.UNCERTAIN
          : DELIVERY_STATES.FAILED;
      const publicError = toPublicEmailError(normalized);
      try {
        await this.store.updateRequest(request.idempotencyKey, {
          status,
          error: publicError,
          ...(routedOutcome ? {
            providerId: routedOutcome.providerId,
            providerMessageId: routedOutcome.result.providerMessageId,
            attempts: routedOutcome.attempts,
            emergency: routedOutcome.emergency
          } : {}),
          updatedAt: this.now()
        }, this.config.idempotency.ttlSeconds);
      } catch (_) {}
      await this.observability.emit({ kind: 'REQUEST_FINAL', requestRef: refs.requestRef, type: request.type, outcome: status, code: normalized.code });
      if (normalized.code === EMAIL_FAILURE_CODES.NO_ELIGIBLE_PROVIDER) await this.observability.alert('multi-provider-outage', { requestRef: refs.requestRef, type: request.type, outcome: 'NO_PROVIDER', code: normalized.code });
      throw normalized;
    }
  }

  async healthCheck({ includeEvents = false } = {}) {
    const providers = await this.registry.status();
    const enabled = providers.filter(provider => provider.enabled);
    const result = {
      version: EMAIL_GATEWAY_VERSION,
      status: enabled.length ? (enabled.some(provider => provider.health === 'HEALTHY') ? 'READY' : 'DEGRADED') : 'DISABLED',
      storage: this.store.consistency,
      enabledProviders: enabled.length,
      configuredProviders: providers.filter(provider => provider.configured).length,
      providers
    };
    if (includeEvents) result.events = await this.store.listEvents(50);
    return freeze(result);
  }

  async getCapabilities() {
    const providers = await this.registry.status();
    return freeze(providers.map(provider => freeze({ id: provider.id, enabled: provider.enabled, health: provider.health, capabilities: provider.capabilities })));
  }

  async recordDeliveryEvent(input) {
    const event = normalizeDeliveryEvent(input);
    if (event.occurredAt > this.now() + (this.config.security.deliveryEventFutureSkewSeconds * 1000)) {
      throw new EmailGatewayError({ code: EMAIL_FAILURE_CODES.INVALID_REQUEST, safeMessage: 'Delivery event time is invalid.', retryable: false, status: 400 });
    }
    const current = await this.store.getRequest(event.idempotencyKey);
    if (!current || current.requestId !== event.requestId || current.providerId !== event.providerId) throw new EmailGatewayError({ code: EMAIL_FAILURE_CODES.INVALID_REQUEST, safeMessage: 'Delivery event does not match an email request.', retryable: false, status: 400 });
    const eventKey = `${event.providerId}:${event.providerEventId}`;
    const lease = await this.store.acquireEvent(eventKey, this.config.idempotency.ttlSeconds, this.config.idempotency.eventLeaseSeconds);
    if (!lease.acquired) {
      if (lease.completed) return freeze({ accepted: true, duplicate: true });
      throw new EmailGatewayError({ code: EMAIL_FAILURE_CODES.STORAGE_UNAVAILABLE, safeMessage: 'Delivery event processing is already in progress.', retryable: true, status: 503 });
    }
    const complete = async () => { try { await this.store.completeEvent(eventKey, this.config.idempotency.ttlSeconds); } catch (_) {} };
    const patch = { status: event.status, updatedAt: event.occurredAt };
    if (!shouldApplyDeliveryTransition(current, patch)) {
      await complete();
      return freeze({ accepted: true, duplicate: false, ignored: true, requestId: event.requestId, status: current.status });
    }
    const updated = await this.store.updateRequest(event.idempotencyKey, patch, this.config.idempotency.ttlSeconds, { deliveryTransition: true });
    const applied = updated?.status === event.status && Number(updated?.updatedAt) === event.occurredAt;
    await complete();
    if (!applied) return freeze({ accepted: true, duplicate: false, ignored: true, requestId: event.requestId, status: updated?.status || current.status });
    await this.observability.emit({ kind: 'DELIVERY_EVENT', requestRef: await this.hashReference(`request:${event.requestId}`), type: current.type, providerId: event.providerId, outcome: event.status });
    return freeze({ accepted: true, duplicate: false, ignored: false, requestId: event.requestId, status: updated.status });
  }
}
