export class ProviderQuotaEngine {
  constructor({ store, now = () => Date.now() }) {
    this.store = store;
    this.now = now;
  }

  reserve(entry) {
    return this.store.reserveProviderQuota(entry.id, entry.policy, this.now());
  }

  snapshot(entry) {
    return this.store.getProviderQuota(entry.id, entry.policy);
  }
}
