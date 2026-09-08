const EVENT_FIELDS = new Set([
  'kind', 'requestRef', 'type', 'providerId', 'outcome', 'code', 'latencyMs',
  'attempt', 'fallback', 'emergency', 'circuit', 'health', 'status'
]);

const sanitize = input => {
  const output = {};
  for (const [key, value] of Object.entries(input || {})) {
    if (!EVENT_FIELDS.has(key) || value == null) continue;
    if (typeof value === 'boolean' || typeof value === 'number') output[key] = value;
    else output[key] = String(value).slice(0, 160);
  }
  return output;
};

export class EmailObservability {
  constructor({ store, config, now = () => Date.now(), randomId, onEvent = null, onAlert = null }) {
    this.store = store;
    this.config = config;
    this.now = now;
    this.randomId = randomId || (() => globalThis.crypto.randomUUID());
    this.onEvent = onEvent;
    this.onAlert = onAlert;
  }

  async emit(event) {
    const record = Object.freeze({ eventId: this.randomId(), at: this.now(), ...sanitize(event) });
    try { await this.store.appendEvent(record, this.config.observability.eventRetention); } catch (_) {}
    try { if (this.onEvent) await this.onEvent(record); } catch (_) {}
    return record;
  }

  async alert(key, event) {
    let acquired = false;
    try { acquired = await this.store.acquireAlert(key, this.config.observability.alertCooldownMs); } catch (_) {}
    if (!acquired) return false;
    const record = await this.emit({ ...event, kind: 'ALERT' });
    try { if (this.onAlert) await this.onAlert(record); } catch (_) {}
    return true;
  }
}
