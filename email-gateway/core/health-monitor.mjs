import { deriveProviderHealth } from './provider-state.mjs';

export class ProviderHealthMonitor {
  constructor({ store, config, now = () => Date.now() }) {
    this.store = store;
    this.config = config;
    this.now = now;
  }

  async snapshot(entry) {
    const [state, quota] = await Promise.all([
      this.store.getProviderState(entry.id),
      this.store.getProviderQuota(entry.id, entry.policy)
    ]);
    return Object.freeze({
      state: Object.freeze({ ...state }),
      quota: Object.freeze({ ...quota }),
      health: deriveProviderHealth({ enabled: entry.enabled, state, quota, policy: { ...this.config.circuit, ...this.config.quota }, now: this.now() })
    });
  }

  reserve(entry) {
    return this.store.mutateProviderState(entry.id, 'reserve', { now: this.now(), policy: { ...this.config.circuit, maxConcurrent: entry.policy.maxConcurrent, timeoutMs: entry.policy.timeoutMs } });
  }

  success(entry, latencyMs) {
    return this.store.mutateProviderState(entry.id, 'success', { now: this.now(), latencyMs, policy: this.config.circuit });
  }

  failure(entry, error, { countsTowardCircuit = true, latencyMs = 0 } = {}) {
    return this.store.mutateProviderState(entry.id, 'failure', { now: this.now(), code: error.code, latencyMs, countsTowardCircuit, policy: this.config.circuit });
  }

  release(entry) {
    return this.store.mutateProviderState(entry.id, 'release', { now: this.now(), policy: this.config.circuit });
  }
}
