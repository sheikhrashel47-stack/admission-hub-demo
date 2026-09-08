import { ProviderAdapter } from '../providers/base-provider.mjs';
import {
  DELIVERY_STATES,
  EMAIL_FAILURE_CODES,
  PROVIDER_CAPABILITIES
} from '../core/constants.mjs';
import { EmailGatewayError } from '../core/errors.mjs';

export class MockEmailProvider extends ProviderAdapter {
  constructor({ id = 'mock', name, mode = 'success', failEvery = 3, delayMs = 1, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), capabilities, onSend, captureMessages = true } = {}) {
    super({ id, name: name || `Mock ${id}`, fetchImpl: async () => new Response('{}'), capabilities: capabilities || [PROVIDER_CAPABILITIES.API, PROVIDER_CAPABILITIES.TRANSACTIONAL, PROVIDER_CAPABILITIES.HTML, PROVIDER_CAPABILITIES.TEXT, PROVIDER_CAPABILITIES.IDEMPOTENCY] });
    this.mode = mode;
    this.failEvery = failEvery;
    this.delayMs = delayMs;
    this.sleep = sleep;
    this.onSend = onSend;
    this.captureMessages = captureMessages;
    this.calls = 0;
    this.inFlight = 0;
    this.maxConcurrency = 0;
    this.messages = [];
  }

  async verifyConfiguration() { return Object.freeze({ configured: true, missing: [] }); }
  async healthCheck() { return Object.freeze({ status: 'CONFIGURED', remoteVerified: false }); }
  async getQuotaStatus() { return Object.freeze({ source: 'mock', exact: true }); }

  async sendEmail(message, context = {}) {
    this.calls += 1;
    this.inFlight += 1;
    this.maxConcurrency = Math.max(this.maxConcurrency, this.inFlight);
    if (this.captureMessages) this.messages.push({ recipient: message.recipient, subject: message.subject, text: message.text, html: message.html, requestId: context.requestId, idempotencyKey: context.idempotencyKey, deliveryAttemptId: context.deliveryAttemptId });
    try {
      if (this.onSend) await this.onSend({ message, context, provider: this });
      if (this.mode === 'slow') await this.sleep(this.delayMs);
      if (this.mode === 'timeout') {
        await new Promise((_, reject) => {
          if (context.signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'));
          context.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
        });
      }
      if (this.mode === 'fail') throw new EmailGatewayError({ code: EMAIL_FAILURE_CODES.FIVE_XX_SERVER_ERROR, providerId: this.id, retryable: true, uncertain: false, dispatched: true });
      if (this.mode === 'network') throw new EmailGatewayError({ code: EMAIL_FAILURE_CODES.NETWORK_ERROR, providerId: this.id, retryable: true, uncertain: false, dispatched: false });
      if (this.mode === 'dns') throw new EmailGatewayError({ code: EMAIL_FAILURE_CODES.DNS_ERROR, providerId: this.id, retryable: true, uncertain: false, dispatched: false });
      if (this.mode === 'uncertain-network') throw new EmailGatewayError({ code: EMAIL_FAILURE_CODES.NETWORK_ERROR, providerId: this.id, retryable: true, uncertain: true, dispatched: true });
      if (this.mode === 'rate-limit') throw new EmailGatewayError({ code: EMAIL_FAILURE_CODES.RATE_LIMIT, providerId: this.id, retryable: true, uncertain: false, dispatched: true });
      if (this.mode === 'quota-exhausted') throw new EmailGatewayError({ code: EMAIL_FAILURE_CODES.QUOTA_EXCEEDED, providerId: this.id, retryable: true, uncertain: false, dispatched: false });
      if (this.mode === 'auth-error') throw new EmailGatewayError({ code: EMAIL_FAILURE_CODES.AUTHENTICATION_ERROR, providerId: this.id, retryable: false, uncertain: false, dispatched: true });
      if (this.mode === 'domain-error') throw new EmailGatewayError({ code: EMAIL_FAILURE_CODES.DOMAIN_ERROR, providerId: this.id, retryable: false, uncertain: false, dispatched: true });
      if (this.mode === 'suspended') throw new EmailGatewayError({ code: EMAIL_FAILURE_CODES.PROVIDER_SUSPENDED, providerId: this.id, retryable: false, uncertain: false, dispatched: true });
      if (this.mode === 'invalid-request') throw new EmailGatewayError({ code: EMAIL_FAILURE_CODES.INVALID_REQUEST, providerId: this.id, retryable: false, uncertain: false, dispatched: true });
      if (this.mode === 'recipient-rejected') throw new EmailGatewayError({ code: EMAIL_FAILURE_CODES.RECIPIENT_REJECTED, providerId: this.id, retryable: false, uncertain: false, dispatched: true });
      if (this.mode === 'malformed') return null;
      if (this.mode === 'random' && this.calls % this.failEvery === 0) throw new EmailGatewayError({ code: EMAIL_FAILURE_CODES.FIVE_XX_SERVER_ERROR, providerId: this.id, retryable: true, uncertain: false, dispatched: true });
      return Object.freeze({ status: DELIVERY_STATES.ACCEPTED, providerMessageId: `${this.id}-message-${this.calls}`, requestId: context.requestId, idempotencyKey: context.idempotencyKey, deliveryAttemptId: context.deliveryAttemptId });
    } finally {
      this.inFlight -= 1;
    }
  }
}

export function mockProviderEntry(adapter, overrides = {}) {
  return Object.freeze({
    id: adapter.id,
    name: adapter.name,
    adapter,
    enabled: overrides.enabled ?? true,
    configured: overrides.configured ?? true,
    requiresRemoteHealth: overrides.requiresRemoteHealth ?? false,
    activationIssues: Object.freeze([]),
    policy: Object.freeze({
      priority: overrides.priority ?? 10,
      weight: overrides.weight ?? 1,
      dailyLimit: overrides.dailyLimit ?? 1000000,
      monthlyLimit: overrides.monthlyLimit ?? 10000000,
      timeoutMs: overrides.timeoutMs ?? 100,
      maxConcurrent: overrides.maxConcurrent ?? 20,
      emergency: overrides.emergency ?? false,
      costWeight: overrides.costWeight ?? 1,
      capabilities: Object.freeze(overrides.capabilities || [...adapter.getCapabilities()])
    })
  });
}
