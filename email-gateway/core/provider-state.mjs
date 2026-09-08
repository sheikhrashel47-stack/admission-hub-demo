import {
  CIRCUIT_STATES,
  EMAIL_FAILURE_CODES,
  PROVIDER_HEALTH
} from './constants.mjs';

export const createProviderState = providerId => ({
  providerId,
  circuit: CIRCUIT_STATES.CLOSED,
  consecutiveFailures: 0,
  failureCount: 0,
  successCount: 0,
  timeoutCount: 0,
  currentInFlight: 0,
  peakInFlight: 0,
  loadLeaseUntil: 0,
  latencyEwmaMs: 0,
  lastSuccess: null,
  lastFailure: null,
  lastFailureCode: null,
  cooldownUntil: 0,
  probeInFlight: false
});

const clone = state => ({ ...createProviderState(state?.providerId || ''), ...(state || {}) });

export function applyProviderStateOperation(current, operation, payload = {}) {
  const state = clone(current);
  const now = Number(payload.now || Date.now());
  const policy = payload.policy || {};

  if (operation === 'reserve') {
    const maxConcurrent = Math.max(1, Number(policy.maxConcurrent || 20));
    if (Number(state.loadLeaseUntil || 0) <= now) state.currentInFlight = 0;
    if (Number(state.currentInFlight || 0) >= maxConcurrent) return { state, allowed: false, reason: 'PROVIDER_AT_CAPACITY' };
    const loadLeaseUntil = now + Math.max(1000, Number(policy.timeoutMs || 10000) * 2);
    if (state.circuit === CIRCUIT_STATES.OPEN) {
      if (now < Number(state.cooldownUntil || 0)) return { state, allowed: false, reason: 'CIRCUIT_OPEN' };
      state.circuit = CIRCUIT_STATES.HALF_OPEN;
      state.probeInFlight = true;
      state.currentInFlight = Number(state.currentInFlight || 0) + 1;
      state.peakInFlight = Math.max(Number(state.peakInFlight || 0), state.currentInFlight);
      state.loadLeaseUntil = Math.max(Number(state.loadLeaseUntil || 0), loadLeaseUntil);
      return { state, allowed: true, probe: true };
    }
    if (state.circuit === CIRCUIT_STATES.HALF_OPEN) {
      if (state.probeInFlight) return { state, allowed: false, reason: 'HALF_OPEN_PROBE_ACTIVE' };
      state.probeInFlight = true;
      state.currentInFlight = Number(state.currentInFlight || 0) + 1;
      state.peakInFlight = Math.max(Number(state.peakInFlight || 0), state.currentInFlight);
      state.loadLeaseUntil = Math.max(Number(state.loadLeaseUntil || 0), loadLeaseUntil);
      return { state, allowed: true, probe: true };
    }
    state.currentInFlight = Number(state.currentInFlight || 0) + 1;
    state.peakInFlight = Math.max(Number(state.peakInFlight || 0), state.currentInFlight);
    state.loadLeaseUntil = Math.max(Number(state.loadLeaseUntil || 0), loadLeaseUntil);
    return { state, allowed: true, probe: false };
  }

  if (operation === 'success') {
    const latencyMs = Math.max(0, Number(payload.latencyMs || 0));
    state.currentInFlight = Math.max(0, Number(state.currentInFlight || 0) - 1);
    if (!state.currentInFlight) state.loadLeaseUntil = 0;
    state.successCount += 1;
    state.consecutiveFailures = 0;
    state.lastSuccess = now;
    state.lastFailureCode = null;
    state.latencyEwmaMs = state.latencyEwmaMs ? Math.round((state.latencyEwmaMs * 0.75) + (latencyMs * 0.25)) : latencyMs;
    state.circuit = CIRCUIT_STATES.CLOSED;
    state.cooldownUntil = 0;
    state.probeInFlight = false;
    return { state, allowed: true };
  }

  if (operation === 'failure') {
    const latencyMs = Math.max(0, Number(payload.latencyMs || 0));
    state.currentInFlight = Math.max(0, Number(state.currentInFlight || 0) - 1);
    if (!state.currentInFlight) state.loadLeaseUntil = 0;
    state.failureCount += 1;
    if (payload.code === EMAIL_FAILURE_CODES.TIMEOUT) state.timeoutCount += 1;
    state.lastFailure = now;
    state.lastFailureCode = payload.code || EMAIL_FAILURE_CODES.UNKNOWN;
    state.latencyEwmaMs = state.latencyEwmaMs ? Math.round((state.latencyEwmaMs * 0.75) + (latencyMs * 0.25)) : latencyMs;
    state.probeInFlight = false;
    if (payload.countsTowardCircuit !== false) state.consecutiveFailures += 1;
    const threshold = Math.max(1, Number(policy.failureThreshold || 3));
    if (state.circuit === CIRCUIT_STATES.HALF_OPEN || state.consecutiveFailures >= threshold) {
      state.circuit = CIRCUIT_STATES.OPEN;
      state.cooldownUntil = now + Math.max(100, Number(policy.cooldownMs || 60000));
    }
    return { state, allowed: true };
  }

  if (operation === 'release') {
    state.probeInFlight = false;
    state.currentInFlight = Math.max(0, Number(state.currentInFlight || 0) - 1);
    if (!state.currentInFlight) state.loadLeaseUntil = 0;
    return { state, allowed: true };
  }

  return { state, allowed: false, reason: 'UNKNOWN_OPERATION' };
}

export function deriveProviderHealth({ enabled, state, quota, policy, now = Date.now() }) {
  if (!enabled) return PROVIDER_HEALTH.DISABLED;
  const current = clone(state);
  if (current.circuit === CIRCUIT_STATES.OPEN && Number(current.cooldownUntil || 0) > now) return PROVIDER_HEALTH.OFFLINE;
  if (current.circuit === CIRCUIT_STATES.OPEN) return PROVIDER_HEALTH.DEGRADED;
  if (current.lastFailureCode === EMAIL_FAILURE_CODES.RATE_LIMIT) return PROVIDER_HEALTH.RATE_LIMITED;
  if (quota?.exhausted) return PROVIDER_HEALTH.QUOTA_EXHAUSTED;
  if (Number.isFinite(quota?.remainingRatio) && quota.remainingRatio <= Number(policy?.backupRatio ?? 0.05)) return PROVIDER_HEALTH.QUOTA_LOW;
  const total = current.successCount + current.failureCount;
  if (!total) return PROVIDER_HEALTH.DEGRADED;
  const failureRate = current.failureCount / total;
  if (current.consecutiveFailures > 0 || failureRate >= Number(policy?.degradedFailureRate ?? 0.25) || current.latencyEwmaMs >= Number(policy?.degradedLatencyMs ?? 2500)) return PROVIDER_HEALTH.DEGRADED;
  return PROVIDER_HEALTH.HEALTHY;
}
