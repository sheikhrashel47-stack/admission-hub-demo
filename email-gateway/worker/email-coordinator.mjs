import { applyProviderStateOperation, createProviderState } from '../core/provider-state.mjs';
import { createQuotaState, quotaSnapshot, reserveQuotaState } from '../core/quota.mjs';
import { shouldApplyDeliveryTransition } from '../core/delivery-state.mjs';

const response = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
});
const setExpiryAlarm = async (storage, expiresAt) => {
  if (typeof storage.setAlarm !== 'function' || !Number.isFinite(Number(expiresAt))) return;
  const scheduled = typeof storage.getAlarm === 'function' ? await storage.getAlarm() : null;
  if (scheduled && scheduled > Date.now() && scheduled <= Number(expiresAt)) return;
  await storage.setAlarm(Number(expiresAt));
};

export class EmailGatewayCoordinator {
  constructor(state) {
    this.state = state;
  }

  async alarm() {
    const storage = this.state.storage;
    const now = Date.now();
    const entries = await storage.list();
    let nextExpiry = null;
    for (const [key, value] of entries) {
      const expiresAt = Number(value?.expiresAt || 0);
      if (!expiresAt) continue;
      if (expiresAt <= now) await storage.delete(key);
      else if (nextExpiry === null || expiresAt < nextExpiry) nextExpiry = expiresAt;
    }
    if (nextExpiry !== null) await storage.setAlarm(nextExpiry);
    else if (typeof storage.deleteAlarm === 'function') await storage.deleteAlarm();
  }

  async fetch(request) {
    if (request.method !== 'POST') return response({ error: 'method-not-allowed' }, 405);
    const path = new URL(request.url).pathname;
    let body;
    try { body = await request.json(); } catch (_) { return response({ error: 'invalid-json' }, 400); }
    const storage = this.state.storage;
    const now = Number(body.now || Date.now());

    if (path === '/request/acquire') {
      const result = await storage.transaction(async txn => {
        const current = await txn.get('request');
        if (current && (!current.expiresAt || current.expiresAt > now)) return { acquired: false, existing: current.value };
        const entry = { value: body.record, expiresAt: now + Number(body.ttlSeconds || 86400) * 1000 };
        await txn.put('request', entry);
        return { acquired: true, record: entry.value, expiresAt: entry.expiresAt };
      });
      if (result.acquired) await setExpiryAlarm(storage, result.expiresAt);
      delete result.expiresAt;
      return response(result);
    }
    if (path === '/request/get') {
      const current = await storage.get('request');
      if (current?.expiresAt && current.expiresAt <= now) {
        await storage.delete('request');
        return response({ record: null });
      }
      return response({ record: current?.value || null });
    }
    if (path === '/request/update') {
      const result = await storage.transaction(async txn => {
        const current = await txn.get('request');
        if (!current || (current.expiresAt && current.expiresAt <= now)) return { record: null };
        if (body.deliveryTransition && !shouldApplyDeliveryTransition(current.value, body.patch || {})) {
          return { record: current.value, expiresAt: current.expiresAt };
        }
        current.value = { ...current.value, ...(body.patch || {}) };
        if (body.ttlSeconds) current.expiresAt = now + Number(body.ttlSeconds) * 1000;
        await txn.put('request', current);
        return { record: current.value, expiresAt: current.expiresAt };
      });
      if (result.expiresAt) await setExpiryAlarm(storage, result.expiresAt);
      delete result.expiresAt;
      return response(result);
    }
    if (path === '/nonce/acquire') {
      const result = await storage.transaction(async txn => {
        const current = await txn.get('nonce');
        if (current && current.expiresAt > now) return { acquired: false };
        const expiresAt = now + Number(body.ttlSeconds || 300) * 1000;
        await txn.put('nonce', { expiresAt });
        return { acquired: true, expiresAt };
      });
      if (result.acquired) await setExpiryAlarm(storage, result.expiresAt);
      delete result.expiresAt;
      return response(result);
    }
    if (path === '/event/acquire') {
      const result = await storage.transaction(async txn => {
        const current = await txn.get('event');
        if (current?.expiresAt > now && (current.status === 'COMPLETED' || !current.status)) return { acquired: false, completed: true };
        if (current?.leaseUntil > now && current.expiresAt > now) return { acquired: false, completed: false };
        const expiresAt = now + Number(body.ttlSeconds || 86400) * 1000;
        await txn.put('event', { status: 'PROCESSING', leaseUntil: now + Number(body.leaseSeconds || 30) * 1000, expiresAt });
        return { acquired: true, completed: false, expiresAt };
      });
      if (result.acquired) await setExpiryAlarm(storage, result.expiresAt);
      delete result.expiresAt;
      return response(result);
    }
    if (path === '/event/complete') {
      const result = await storage.transaction(async txn => {
        const current = await txn.get('event');
        if (!current || (current.expiresAt && current.expiresAt <= now)) return { completed: false };
        const expiresAt = now + Number(body.ttlSeconds || 86400) * 1000;
        await txn.put('event', { status: 'COMPLETED', leaseUntil: 0, expiresAt });
        return { completed: true, expiresAt };
      });
      if (result.completed) await setExpiryAlarm(storage, result.expiresAt);
      delete result.expiresAt;
      return response(result);
    }
    if (path === '/rate/consume') {
      const result = await storage.transaction(async txn => {
        const bucketKey = `bucket:${Math.floor(now / Number(body.windowMs))}`;
        const current = (await txn.get(bucketKey)) || { count: 0, resetAt: (Math.floor(now / Number(body.windowMs)) + 1) * Number(body.windowMs) };
        current.count += 1;
        current.expiresAt = current.resetAt + Number(body.windowMs);
        await txn.put(bucketKey, current);
        return { allowed: current.count <= Number(body.limit), count: current.count, limit: Number(body.limit), resetAt: current.resetAt, expiresAt: current.expiresAt };
      });
      await setExpiryAlarm(storage, result.expiresAt);
      delete result.expiresAt;
      return response(result);
    }
    if (path === '/provider/state/get') {
      return response({ state: (await storage.get('providerState')) || createProviderState(body.providerId) });
    }
    if (path === '/provider/state/mutate') {
      return storage.transaction(async txn => {
        const current = (await txn.get('providerState')) || createProviderState(body.providerId);
        const result = applyProviderStateOperation(current, body.operation, body.payload || {});
        await txn.put('providerState', result.state);
        return response(result);
      });
    }
    if (path === '/provider/quota/reserve') {
      return storage.transaction(async txn => {
        const current = (await txn.get('providerQuota')) || createQuotaState(body.providerId);
        const result = reserveQuotaState(current, { providerId: body.providerId, ...(body.policy || {}), now });
        await txn.put('providerQuota', result.state);
        return response(result);
      });
    }
    if (path === '/provider/quota/get') {
      const current = (await storage.get('providerQuota')) || createQuotaState(body.providerId);
      return response(quotaSnapshot(current, body.policy || {}));
    }
    if (path === '/events/append') {
      return storage.transaction(async txn => {
        const events = (await txn.get('events')) || [];
        events.push(body.event);
        const retention = Math.max(10, Math.min(500, Number(body.retention || 200)));
        if (events.length > retention) events.splice(0, events.length - retention);
        await txn.put('events', events);
        return response({ appended: true });
      });
    }
    if (path === '/events/list') {
      const events = (await storage.get('events')) || [];
      const limit = Math.max(0, Math.min(500, Number(body.limit || 50)));
      return response({ events: events.slice(-limit).reverse() });
    }
    if (path === '/alert/acquire') {
      const expiresAt = now + Number(body.cooldownMs || 900000);
      const result = await storage.transaction(async txn => {
        const stored = await txn.get('lastAlert');
        const last = Number(stored?.value || stored || 0);
        if (last && now - last < Number(body.cooldownMs || 900000)) return { acquired: false };
        await txn.put('lastAlert', { value: now, expiresAt });
        return { acquired: true };
      });
      if (result.acquired) await setExpiryAlarm(storage, expiresAt);
      return response(result);
    }
    return response({ error: 'not-found' }, 404);
  }
}
