import { EmailGatewayCoordinator } from '../worker/email-coordinator.mjs';

class FakeDurableStorage {
  constructor() { this.map = new Map(); this.queue = Promise.resolve(); }
  async get(key) { return structuredClone(this.map.get(key)); }
  async put(key, value) { this.map.set(key, structuredClone(value)); }
  async delete(key) { this.map.delete(key); }
  async deleteAll() { this.map.clear(); }
  async list() { return new Map([...this.map].map(([key, value]) => [key, structuredClone(value)])); }
  async getAlarm() { return this.alarmAt ?? null; }
  async setAlarm(value) { this.alarmAt = value; }
  async deleteAlarm() { this.alarmAt = null; }
  async transaction(callback) {
    const previous = this.queue;
    let release;
    this.queue = new Promise(resolve => { release = resolve; });
    await previous;
    const txn = {
      get: key => this.get(key),
      put: (key, value) => this.put(key, value),
      delete: key => this.delete(key),
      list: () => this.list()
    };
    try { return await callback(txn); }
    finally { release(); }
  }
}

export class FakeDurableObjectBinding {
  constructor() {
    this.instances = new Map();
    this.calls = 0;
  }
  idFromName(name) { return String(name); }
  get(id) {
    if (!this.instances.has(id)) {
      const state = { storage: new FakeDurableStorage() };
      this.instances.set(id, new EmailGatewayCoordinator(state));
    }
    const instance = this.instances.get(id);
    return { fetch: request => { this.calls += 1; return instance.fetch(request); } };
  }
}
