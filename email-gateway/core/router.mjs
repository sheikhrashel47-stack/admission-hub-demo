import {
  DELIVERY_STATES,
  EMAIL_FAILURE_CODES,
  FAILOVER_ELIGIBLE_FAILURES
} from './constants.mjs';
import { EmailGatewayError, asEmailGatewayError } from './errors.mjs';

const CIRCUIT_FAILURE_CODES = new Set([
  EMAIL_FAILURE_CODES.TIMEOUT,
  EMAIL_FAILURE_CODES.NETWORK_ERROR,
  EMAIL_FAILURE_CODES.DNS_ERROR,
  EMAIL_FAILURE_CODES.FIVE_XX_SERVER_ERROR,
  EMAIL_FAILURE_CODES.RATE_LIMIT,
  EMAIL_FAILURE_CODES.AUTHENTICATION_ERROR,
  EMAIL_FAILURE_CODES.DOMAIN_ERROR,
  EMAIL_FAILURE_CODES.PROVIDER_SUSPENDED
]);

export class EmailRouter {
  constructor({ registry, healthMonitor, quotaEngine, observability, config, now = () => Date.now(), setTimer = setTimeout, clearTimer = clearTimeout }) {
    this.registry = registry;
    this.healthMonitor = healthMonitor;
    this.quotaEngine = quotaEngine;
    this.observability = observability;
    this.config = config;
    this.now = now;
    this.setTimer = setTimer;
    this.clearTimer = clearTimer;
  }

  async #withTimeout(entry, message, context, deadlineAt) {
    const remaining = Math.max(1, deadlineAt - this.now());
    const timeoutMs = Math.max(1, Math.min(entry.policy.timeoutMs, remaining));
    const controller = new AbortController();
    let timer;
    const task = Promise.resolve().then(() => entry.adapter.sendEmail(message, { ...context, signal: controller.signal }));
    task.catch(() => {});
    const timeout = new Promise((_, reject) => {
      timer = this.setTimer(() => {
        controller.abort('email-provider-timeout');
        reject(new EmailGatewayError({ code: EMAIL_FAILURE_CODES.TIMEOUT, providerId: entry.id, retryable: true, uncertain: true, dispatched: true, status: 504 }));
      }, timeoutMs);
    });
    try {
      return await Promise.race([task, timeout]);
    } finally {
      if (timer) this.clearTimer(timer);
    }
  }

  async #attemptPool({ message, requestId, idempotencyKey, requestRef, type, deadlineAt, emergency, excluded, attempts, maximum }) {
    let lastError = null;
    const candidates = await this.registry.candidates({ requestId: idempotencyKey, emergency, excluded });
    for (const entry of candidates) {
      if (attempts.length >= maximum || this.now() >= deadlineAt) break;
      excluded.add(entry.id);
      const reservation = await this.healthMonitor.reserve(entry);
      if (!reservation.allowed) continue;
      const quota = await this.quotaEngine.reserve(entry);
      if (!quota.allowed) {
        await this.healthMonitor.release(entry);
        const quotaError = new EmailGatewayError({ code: EMAIL_FAILURE_CODES.QUOTA_EXCEEDED, providerId: entry.id, retryable: true, uncertain: false });
        attempts.push(Object.freeze({ providerId: entry.id, code: quotaError.code, outcome: 'SKIPPED', emergency }));
        await this.observability.emit({ kind: 'PROVIDER_ATTEMPT', requestRef, type, providerId: entry.id, outcome: 'SKIPPED', code: quotaError.code, attempt: attempts.length, fallback: attempts.length > 1, emergency });
        lastError = quotaError;
        continue;
      }

      const deliveryAttemptId = `${requestRef}:${entry.id}:${attempts.length + 1}`;
      const startedAt = this.now();
      try {
        const result = await this.#withTimeout(entry, message, { requestId, idempotencyKey, requestRef, deliveryAttemptId }, deadlineAt);
        const latencyMs = Math.max(0, this.now() - startedAt);
        if (
          !result ||
          ![DELIVERY_STATES.ACCEPTED, DELIVERY_STATES.QUEUED].includes(result.status) ||
          !result.providerMessageId ||
          result.requestId !== requestId ||
          result.deliveryAttemptId !== deliveryAttemptId
        ) {
          throw new EmailGatewayError({ code: EMAIL_FAILURE_CODES.UNKNOWN, providerId: entry.id, retryable: false, dispatched: true, uncertain: true });
        }
        try {
          await this.healthMonitor.success(entry, latencyMs);
        } catch (_) {
          await this.observability.alert(`health-store:${entry.id}`, { requestRef, type, providerId: entry.id, outcome: 'HEALTH_STATE_UNAVAILABLE' });
        }
        attempts.push(Object.freeze({ deliveryAttemptId, providerId: entry.id, outcome: result.status, latencyMs, emergency }));
        await this.observability.emit({ kind: 'PROVIDER_ATTEMPT', requestRef, type, providerId: entry.id, outcome: result.status, latencyMs, attempt: attempts.length, fallback: attempts.length > 1, emergency });
        return Object.freeze({ result, providerId: entry.id, attempts: Object.freeze([...attempts]), emergency });
      } catch (error) {
        const normalized = asEmailGatewayError(error, { providerId: entry.id, dispatched: true });
        const latencyMs = Math.max(0, this.now() - startedAt);
        let failureState;
        try {
          failureState = await this.healthMonitor.failure(entry, normalized, { countsTowardCircuit: CIRCUIT_FAILURE_CODES.has(normalized.code), latencyMs });
        } catch (cause) {
          if (normalized.uncertain) throw new EmailGatewayError({ code: EMAIL_FAILURE_CODES.DELIVERY_UNCERTAIN, providerId: entry.id, retryable: false, uncertain: true, dispatched: true, cause: normalized });
          throw new EmailGatewayError({ code: EMAIL_FAILURE_CODES.STORAGE_UNAVAILABLE, providerId: entry.id, retryable: true, uncertain: false, dispatched: false, cause });
        }
        attempts.push(Object.freeze({ deliveryAttemptId, providerId: entry.id, outcome: 'FAILED', code: normalized.code, uncertain: normalized.uncertain, latencyMs, emergency }));
        await this.observability.emit({ kind: 'PROVIDER_ATTEMPT', requestRef, type, providerId: entry.id, outcome: 'FAILED', code: normalized.code, latencyMs, attempt: attempts.length, fallback: attempts.length > 1, emergency });
        if (failureState.state.circuit === 'OPEN') await this.observability.alert(`circuit:${entry.id}`, { requestRef, type, providerId: entry.id, outcome: 'CIRCUIT_OPEN', code: normalized.code, circuit: 'OPEN' });
        lastError = normalized;
        if (normalized.uncertain) throw new EmailGatewayError({ code: EMAIL_FAILURE_CODES.DELIVERY_UNCERTAIN, providerId: entry.id, retryable: false, uncertain: true, dispatched: true, cause: normalized });
        if (!FAILOVER_ELIGIBLE_FAILURES.has(normalized.code)) throw normalized;
      }
    }
    return { lastError };
  }

  async route({ message, requestId, idempotencyKey, requestRef, type }) {
    const deadlineAt = this.now() + this.config.router.globalDeadlineMs;
    const attempts = [];
    const excluded = new Set();
    const normal = await this.#attemptPool({ message, requestId, idempotencyKey, requestRef, type, deadlineAt, emergency: false, excluded, attempts, maximum: this.config.router.maxProviderAttempts });
    if (normal?.result) return normal;
    const maxWithEmergency = this.config.router.maxProviderAttempts + this.config.router.emergencyMaxAttempts;
    const emergency = await this.#attemptPool({ message, requestId, idempotencyKey, requestRef, type, deadlineAt, emergency: true, excluded, attempts, maximum: maxWithEmergency });
    if (emergency?.result) {
      await this.observability.alert('emergency-mode', { requestRef, type, providerId: emergency.providerId, outcome: 'EMERGENCY_ACTIVATED', emergency: true });
      return emergency;
    }
    const lastError = emergency?.lastError || normal?.lastError;
    if (lastError) throw lastError;
    throw new EmailGatewayError({ code: EMAIL_FAILURE_CODES.NO_ELIGIBLE_PROVIDER, retryable: true, status: 503 });
  }
}
