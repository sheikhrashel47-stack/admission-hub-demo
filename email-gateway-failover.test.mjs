import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { createEmailGateway } from './email-gateway/create-email-gateway.mjs';
import { createEmailGatewayConfig } from './email-gateway/core/config.mjs';
import { EMAIL_FAILURE_CODES } from './email-gateway/core/constants.mjs';
import { MemoryEmailStore } from './email-gateway/storage/memory-store.mjs';
import { DurableObjectEmailStore } from './email-gateway/storage/durable-object-store.mjs';
import { MockEmailProvider, mockProviderEntry } from './email-gateway/testing/mock-provider.mjs';
import { createMockGateway, sampleEmailRequest } from './email-gateway/testing/create-mock-gateway.mjs';
import { FakeDurableObjectBinding } from './email-gateway/testing/fake-durable-object.mjs';

const entry = (provider, overrides = {}) => mockProviderEntry(provider, overrides);

const testHash = async value => `hash-${String(value).length}-${String(value).charCodeAt(0) || 0}`;

const gatewayWith = async (providers, options = {}) => createMockGateway({
  entries: providers.map((item, index) => Array.isArray(item) ? entry(item[0], { priority: index + 1, ...item[1] }) : entry(item, { priority: index + 1 })),
  config: options.config,
  store: options.store,
  runtime: options.runtime
});

test('priority router uses primary only when it succeeds', async () => {
  const primary = new MockEmailProvider({ id: 'primary' });
  const secondary = new MockEmailProvider({ id: 'secondary' });
  const { gateway } = await gatewayWith([[primary, { priority: 1 }], [secondary, { priority: 2 }]]);
  const result = await gateway.send(sampleEmailRequest('0000000000000100'));
  assert.equal(result.providerId, 'primary');
  assert.equal(primary.calls, 1);
  assert.equal(secondary.calls, 0);
});

test('retryable 5xx fails over P1 to P2', async () => {
  const p1 = new MockEmailProvider({ id: 'p1', mode: 'fail' });
  const p2 = new MockEmailProvider({ id: 'p2' });
  const { gateway } = await gatewayWith([[p1, { priority: 1 }], [p2, { priority: 2 }]]);
  const result = await gateway.send(sampleEmailRequest('0000000000000101'));
  assert.equal(result.providerId, 'p2');
  assert.deepEqual(result.attempts.map(attempt => attempt.providerId), ['p1', 'p2']);
});

test('safe failover reuses the exact same rendered OTP and never generates a replacement', async () => {
  const p1 = new MockEmailProvider({ id: 'p1', mode: 'fail' });
  const p2 = new MockEmailProvider({ id: 'p2' });
  const { gateway } = await gatewayWith([[p1, { priority: 1 }], [p2, { priority: 2 }]]);
  const request = sampleEmailRequest('0000000000000132', { variables: { otp: '654321', name: 'Student' } });
  const result = await gateway.send(request);
  assert.equal(result.providerId, 'p2');
  assert.equal(p1.messages[0].subject, p2.messages[0].subject);
  assert.equal(p1.messages[0].html, p2.messages[0].html);
  assert.equal(p1.messages[0].text, p2.messages[0].text);
  assert.match(p1.messages[0].text, /654321/);
  assert.doesNotMatch(p1.messages[0].text, /123456/);
  assert.notEqual(p1.messages[0].deliveryAttemptId, p2.messages[0].deliveryAttemptId);
});

test('two primary failures reach P3 once each', async () => {
  const p1 = new MockEmailProvider({ id: 'p1', mode: 'fail' });
  const p2 = new MockEmailProvider({ id: 'p2', mode: 'network' });
  const p3 = new MockEmailProvider({ id: 'p3' });
  const { gateway } = await gatewayWith([[p1, { priority: 1 }], [p2, { priority: 2 }], [p3, { priority: 3 }]]);
  const result = await gateway.send(sampleEmailRequest('0000000000000102'));
  assert.equal(result.providerId, 'p3');
  assert.deepEqual([p1.calls, p2.calls, p3.calls], [1, 1, 1]);
});

test('permanent recipient rejection stops failover', async () => {
  const p1 = new MockEmailProvider({ id: 'p1', mode: 'recipient-rejected' });
  const p2 = new MockEmailProvider({ id: 'p2' });
  const { gateway } = await gatewayWith([p1, p2]);
  await assert.rejects(gateway.send(sampleEmailRequest('0000000000000103')), error => error.code === EMAIL_FAILURE_CODES.RECIPIENT_REJECTED);
  assert.deepEqual([p1.calls, p2.calls], [1, 0]);
});

test('provider-specific authentication failure can use a separately configured backup', async () => {
  const p1 = new MockEmailProvider({ id: 'p1', mode: 'auth-error' });
  const p2 = new MockEmailProvider({ id: 'p2' });
  const { gateway } = await gatewayWith([p1, p2]);
  const result = await gateway.send(sampleEmailRequest('0000000000000104'));
  assert.equal(result.providerId, 'p2');
  assert.deepEqual([p1.calls, p2.calls], [1, 1]);
});

test('DNS, sender-domain and suspended provider failures use an independent backup', async () => {
  for (const mode of ['dns', 'domain-error', 'suspended']) {
    const p1 = new MockEmailProvider({ id: 'p1', mode });
    const p2 = new MockEmailProvider({ id: 'p2' });
    const { gateway } = await gatewayWith([p1, p2]);
    assert.equal((await gateway.send(sampleEmailRequest(`00000000000${mode.length}0105`))).providerId, 'p2');
    assert.deepEqual([p1.calls, p2.calls], [1, 1]);
  }
});

test('invalid provider request does not waste backup quota', async () => {
  const p1 = new MockEmailProvider({ id: 'p1', mode: 'invalid-request' });
  const p2 = new MockEmailProvider({ id: 'p2' });
  const { gateway } = await gatewayWith([p1, p2]);
  await assert.rejects(gateway.send(sampleEmailRequest('0000000000000105')), error => error.code === EMAIL_FAILURE_CODES.INVALID_REQUEST);
  assert.equal(p2.calls, 0);
});

test('all normal providers failing activates one emergency provider', async () => {
  const p1 = new MockEmailProvider({ id: 'p1', mode: 'fail' });
  const p2 = new MockEmailProvider({ id: 'p2', mode: 'rate-limit' });
  const emergency = new MockEmailProvider({ id: 'emergency' });
  const { gateway, store } = await gatewayWith([[p1, { priority: 1 }], [p2, { priority: 2 }], [emergency, { emergency: true, priority: 99 }]]);
  const result = await gateway.send(sampleEmailRequest('0000000000000105'));
  assert.equal(result.providerId, 'emergency');
  assert.equal(result.emergency, true);
  assert.deepEqual([p1.calls, p2.calls, emergency.calls], [1, 1, 1]);
  assert.match(JSON.stringify(await store.listEvents(50)), /EMERGENCY_ACTIVATED/);
});

test('all providers fail once and terminate with no loop', async () => {
  const providers = ['p1', 'p2', 'p3', 'emergency'].map(id => new MockEmailProvider({ id, mode: 'fail' }));
  const { gateway } = await gatewayWith([
    [providers[0], { priority: 1 }], [providers[1], { priority: 2 }], [providers[2], { priority: 3 }], [providers[3], { emergency: true }]
  ]);
  await assert.rejects(gateway.send(sampleEmailRequest('0000000000000106')), error => error.code === EMAIL_FAILURE_CODES.FIVE_XX_SERVER_ERROR);
  assert.deepEqual(providers.map(provider => provider.calls), [1, 1, 1, 1]);
});

test('local conservative quota skips exhausted primary on the next request', async () => {
  const p1 = new MockEmailProvider({ id: 'p1' });
  const p2 = new MockEmailProvider({ id: 'p2' });
  const { gateway } = await gatewayWith([[p1, { priority: 1, dailyLimit: 1 }], [p2, { priority: 2 }]]);
  assert.equal((await gateway.send(sampleEmailRequest('0000000000000107'))).providerId, 'p1');
  assert.equal((await gateway.send(sampleEmailRequest('0000000000000108'))).providerId, 'p2');
  assert.deepEqual([p1.calls, p2.calls], [1, 1]);
});

test('quota mode prefers the provider with more conservative remaining capacity', async () => {
  const p1 = new MockEmailProvider({ id: 'p1' });
  const p2 = new MockEmailProvider({ id: 'p2' });
  const p1Entry = entry(p1, { priority: 1, dailyLimit: 10 });
  const p2Entry = entry(p2, { priority: 2, dailyLimit: 10 });
  const store = new MemoryEmailStore();
  for (let used = 0; used < 8; used++) await store.reserveProviderQuota('p1', p1Entry.policy);
  const { gateway } = await createMockGateway({ entries: [p1Entry, p2Entry], store, config: { router: { mode: 'quota' } } });
  assert.equal((await gateway.send(sampleEmailRequest('0000000000000109'))).providerId, 'p2');
  assert.deepEqual([p1.calls, p2.calls], [0, 1]);
});

test('circuit opens, skips known outage, half-opens and recovers', async () => {
  let now = 1_000_000;
  const p1 = new MockEmailProvider({ id: 'p1', mode: 'fail' });
  const p2 = new MockEmailProvider({ id: 'p2' });
  const { gateway, store } = await gatewayWith([[p1, { priority: 1 }], [p2, { priority: 2 }]], {
    config: { router: { mode: 'priority' }, circuit: { failureThreshold: 2, cooldownMs: 100, degradedFailureRate: 0.25, degradedLatencyMs: 2500 } },
    runtime: { now: () => now }
  });
  await gateway.send(sampleEmailRequest('0000000000000110'));
  await gateway.send(sampleEmailRequest('0000000000000111'));
  assert.equal((await store.getProviderState('p1')).circuit, 'OPEN');
  await gateway.send(sampleEmailRequest('0000000000000112'));
  assert.equal(p1.calls, 2);
  now += 101;
  p1.mode = 'success';
  assert.equal((await gateway.send(sampleEmailRequest('0000000000000113'))).providerId, 'p1');
  const recovered = await store.getProviderState('p1');
  assert.equal(recovered.circuit, 'CLOSED');
  assert.equal(recovered.consecutiveFailures, 0);
});

test('uncertain provider outcome prevents blind fallback and duplicate OTP', async () => {
  const p1 = new MockEmailProvider({ id: 'p1', mode: 'uncertain-network' });
  const p2 = new MockEmailProvider({ id: 'p2' });
  const { gateway } = await gatewayWith([p1, p2]);
  const request = sampleEmailRequest('0000000000000114');
  await assert.rejects(gateway.send(request), error => error.code === EMAIL_FAILURE_CODES.DELIVERY_UNCERTAIN && error.uncertain);
  const duplicate = await gateway.send(request);
  assert.equal(duplicate.status, 'UNCERTAIN');
  assert.equal(duplicate.duplicate, true);
  assert.deepEqual([p1.calls, p2.calls], [1, 0]);
});

test('gateway-enforced timeout is bounded, uncertain and never sent to backup', async () => {
  const p1 = new MockEmailProvider({ id: 'p1', mode: 'timeout' });
  const p2 = new MockEmailProvider({ id: 'p2' });
  const { gateway } = await gatewayWith([[p1, { timeoutMs: 50 }], p2], { config: { router: { mode: 'priority', maxProviderAttempts: 3, globalDeadlineMs: 200, defaultProviderTimeoutMs: 50, emergencyMaxAttempts: 1 } } });
  const started = performance.now();
  await assert.rejects(gateway.send(sampleEmailRequest('0000000000000115')), error => error.code === EMAIL_FAILURE_CODES.DELIVERY_UNCERTAIN);
  assert.ok(performance.now() - started < 180);
  assert.deepEqual([p1.calls, p2.calls], [1, 0]);
});

test('pre-dispatch network failure safely fails over', async () => {
  const p1 = new MockEmailProvider({ id: 'p1', mode: 'network' });
  const p2 = new MockEmailProvider({ id: 'p2' });
  const { gateway } = await gatewayWith([p1, p2]);
  assert.equal((await gateway.send(sampleEmailRequest('0000000000000116'))).providerId, 'p2');
});

test('strong-store requirement rejects eventual store before any provider mutation', async () => {
  const provider = new MockEmailProvider({ id: 'primary' });
  const store = new MemoryEmailStore({ consistency: 'eventual' });
  const { gateway } = await gatewayWith([provider], { store });
  await assert.rejects(gateway.send(sampleEmailRequest('0000000000000117')), error => error.code === EMAIL_FAILURE_CODES.STRONG_STORE_REQUIRED);
  assert.equal(provider.calls, 0);
});

test('persistence outage fails closed before send', async () => {
  const provider = new MockEmailProvider({ id: 'primary' });
  const store = new MemoryEmailStore({ fail: 'acquireRequest' });
  const { gateway } = await gatewayWith([provider], { store });
  await assert.rejects(gateway.send(sampleEmailRequest('0000000000000118')), error => error.code === EMAIL_FAILURE_CODES.STORAGE_UNAVAILABLE);
  assert.equal(provider.calls, 0);
});

test('post-acceptance persistence failure becomes reconciliable UNCERTAIN and never resends', async () => {
  let updates = 0;
  const store = new MemoryEmailStore({ fail: operation => operation === 'updateRequest' && ++updates === 2 });
  const provider = new MockEmailProvider({ id: 'primary' });
  const { gateway } = await gatewayWith([provider], { store });
  const request = sampleEmailRequest('0000000000000119');
  await assert.rejects(gateway.send(request), error => error.code === EMAIL_FAILURE_CODES.STORAGE_UNAVAILABLE && error.uncertain);
  const record = await store.getRequest(request.requestId);
  assert.equal(record.status, 'UNCERTAIN');
  assert.equal(record.providerId, 'primary');
  assert.ok(record.providerMessageId);
  const replay = await gateway.send(request);
  assert.equal(replay.duplicate, true);
  assert.equal(replay.status, 'UNCERTAIN');
  assert.equal(provider.calls, 1);
});

test('Durable Object persistence prevents duplicate send across Worker restarts', async () => {
  const binding = new FakeDurableObjectBinding();
  const provider = new MockEmailProvider({ id: 'primary' });
  const config = createEmailGatewayConfig({ environment: 'test', rateLimits: { enabled: false } });
  const entries = [entry(provider)];
  const first = await createEmailGateway({ config, store: new DurableObjectEmailStore(binding), entries, privatePepper: 'private-test-pepper-000000000000', runtime: { hashReference: testHash, randomId: () => 'event-first' } });
  const second = await createEmailGateway({ config, store: new DurableObjectEmailStore(binding), entries, privatePepper: 'private-test-pepper-000000000000', runtime: { hashReference: testHash, randomId: () => 'event-second' } });
  const request = sampleEmailRequest('0000000000000119');
  await first.send(request);
  const replay = await second.send(request);
  assert.equal(replay.duplicate, true);
  assert.equal(provider.calls, 1);
  assert.ok(binding.calls > 0);
  const requestCoordinator = binding.instances.get(`request:${request.requestId}`);
  assert.ok(requestCoordinator.state.storage.alarmAt > Date.now());
});

test('Durable Object schedules alarms only through outer storage and safely expires retained state', async () => {
  const binding = new FakeDurableObjectBinding();
  const store = new DurableObjectEmailStore(binding);
  assert.equal(await store.acquireNonce('retention-nonce-0001', 60), true);
  const nonceCoordinator = binding.instances.get('nonce:retention-nonce-0001');
  assert.ok(nonceCoordinator.state.storage.alarmAt > Date.now());
  nonceCoordinator.state.storage.map.set('nonce', { expiresAt: Date.now() - 1 });
  await nonceCoordinator.alarm();
  assert.equal(nonceCoordinator.state.storage.map.has('nonce'), false);
  assert.equal(nonceCoordinator.state.storage.alarmAt, null);

  await store.acquireRequest({ requestId: '0000000000000998', status: 'PENDING' }, 60);
  const requestCoordinator = binding.instances.get('request:0000000000000998');
  requestCoordinator.state.storage.alarmAt = Date.now() - 1;
  await requestCoordinator.alarm();
  assert.equal(requestCoordinator.state.storage.map.has('request'), true);
  assert.ok(requestCoordinator.state.storage.alarmAt > Date.now());
});

test('Durable Object serializes duplicate requests across concurrent Worker instances', async () => {
  const binding = new FakeDurableObjectBinding();
  const provider = new MockEmailProvider({ id: 'primary', mode: 'slow', delayMs: 20 });
  const config = createEmailGatewayConfig({ environment: 'test', rateLimits: { enabled: false } });
  const entries = [entry(provider)];
  const make = suffix => createEmailGateway({ config, store: new DurableObjectEmailStore(binding), entries, privatePepper: 'private-test-pepper-000000000000', runtime: { hashReference: testHash, randomId: () => `event-${suffix}` } });
  const [first, second] = await Promise.all([make('first'), make('second')]);
  const request = sampleEmailRequest('0000000000000125');
  const results = await Promise.allSettled(Array.from({ length: 20 }, (_, index) => (index % 2 ? first : second).send(request)));
  assert.equal(provider.calls, 1);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
});

test('Durable Object applies concurrent delivery events atomically and monotonically', async () => {
  const binding = new FakeDurableObjectBinding();
  const provider = new MockEmailProvider({ id: 'brevo' });
  const config = createEmailGatewayConfig({ environment: 'test', rateLimits: { enabled: false } });
  const entries = [entry(provider)];
  const make = suffix => createEmailGateway({ config, store: new DurableObjectEmailStore(binding), entries, privatePepper: 'private-test-pepper-000000000000', runtime: { hashReference: testHash, randomId: () => `event-order-${suffix}` } });
  const [first, second] = await Promise.all([make('first'), make('second')]);
  const request = sampleEmailRequest('0000000000000127');
  await first.send(request);
  const occurredAt = Date.now() + 1000;
  await Promise.all([
    first.recordDeliveryEvent({ requestId: request.requestId, idempotencyKey: request.idempotencyKey, providerId: 'brevo', providerEventId: 'evt-delivered-concurrent', status: 'DELIVERED', occurredAt: occurredAt + 2 }),
    second.recordDeliveryEvent({ requestId: request.requestId, idempotencyKey: request.idempotencyKey, providerId: 'brevo', providerEventId: 'evt-queued-concurrent', status: 'QUEUED', occurredAt: occurredAt + 1 })
  ]);
  assert.equal((await new DurableObjectEmailStore(binding).getRequest(request.requestId)).status, 'DELIVERED');
  await Promise.all([
    first.recordDeliveryEvent({ requestId: request.requestId, idempotencyKey: request.idempotencyKey, providerId: 'brevo', providerEventId: 'evt-bounced-concurrent', status: 'BOUNCED', occurredAt: occurredAt + 4 }),
    second.recordDeliveryEvent({ requestId: request.requestId, idempotencyKey: request.idempotencyKey, providerId: 'brevo', providerEventId: 'evt-delivered-late', status: 'DELIVERED', occurredAt: occurredAt + 5 })
  ]);
  assert.equal((await new DurableObjectEmailStore(binding).getRequest(request.requestId)).status, 'BOUNCED');
});

test('provider load cap distributes concurrent delivery and releases the bounded lease', async () => {
  let markStarted;
  let releasePrimary;
  const started = new Promise(resolve => { markStarted = resolve; });
  const release = new Promise(resolve => { releasePrimary = resolve; });
  const p1 = new MockEmailProvider({ id: 'p1', onSend: async () => { markStarted(); await release; } });
  const p2 = new MockEmailProvider({ id: 'p2' });
  const { gateway, store } = await gatewayWith([[p1, { priority: 1, maxConcurrent: 1 }], [p2, { priority: 2, maxConcurrent: 1 }]], { config: { router: { mode: 'hybrid' } } });
  const first = gateway.send(sampleEmailRequest('0000000000000130'));
  await started;
  const second = await gateway.send(sampleEmailRequest('0000000000000131'));
  assert.equal(second.providerId, 'p2');
  assert.deepEqual([p1.calls, p2.calls], [1, 1]);
  assert.equal((await store.getProviderState('p1')).currentInFlight, 1);
  releasePrimary();
  assert.equal((await first).providerId, 'p1');
  const state = await store.getProviderState('p1');
  assert.equal(state.currentInFlight, 0);
  assert.equal(state.peakInFlight, 1);
  assert.equal(state.loadLeaseUntil, 0);
});

test('twenty concurrent duplicate requests produce one provider mutation', async () => {
  const provider = new MockEmailProvider({ id: 'primary', mode: 'slow', delayMs: 20 });
  const { gateway } = await gatewayWith([provider]);
  const request = sampleEmailRequest('0000000000000120');
  const results = await Promise.allSettled(Array.from({ length: 20 }, () => gateway.send(request)));
  assert.equal(provider.calls, 1);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter(result => result.status === 'rejected' && result.reason.code === EMAIL_FAILURE_CODES.DELIVERY_UNCERTAIN).length, 19);
  const final = await gateway.send(request);
  assert.equal(final.duplicate, true);
  assert.equal(final.status, 'ACCEPTED');
});

test('late completion after an ignored timeout cannot overwrite UNCERTAIN', async () => {
  let release;
  const late = new Promise(resolve => { release = resolve; });
  const provider = new MockEmailProvider({ id: 'late', onSend: () => late });
  const { gateway, store } = await gatewayWith([[provider, { timeoutMs: 50 }]], { config: { router: { mode: 'priority', maxProviderAttempts: 1, globalDeadlineMs: 100, defaultProviderTimeoutMs: 50, emergencyMaxAttempts: 0 } } });
  const request = sampleEmailRequest('0000000000000122');
  await assert.rejects(gateway.send(request), error => error.code === EMAIL_FAILURE_CODES.DELIVERY_UNCERTAIN);
  release();
  await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal((await store.getRequest(request.requestId)).status, 'UNCERTAIN');
  assert.equal(provider.calls, 1);
});

test('malformed provider response fails uncertain without trying another provider', async () => {
  const malformed = new MockEmailProvider({ id: 'malformed', mode: 'malformed' });
  const backup = new MockEmailProvider({ id: 'backup' });
  const { gateway } = await gatewayWith([malformed, backup]);
  await assert.rejects(gateway.send(sampleEmailRequest('0000000000000123')), error => error.code === EMAIL_FAILURE_CODES.DELIVERY_UNCERTAIN);
  assert.deepEqual([malformed.calls, backup.calls], [1, 0]);
});

test('health-state persistence failure cannot erase an uncertain provider outcome', async () => {
  let mutations = 0;
  const store = new MemoryEmailStore({ fail: operation => operation === 'mutateProviderState' && ++mutations === 2 });
  const primary = new MockEmailProvider({ id: 'primary', mode: 'uncertain-network' });
  const backup = new MockEmailProvider({ id: 'backup' });
  const { gateway } = await gatewayWith([primary, backup], { store });
  const request = sampleEmailRequest('0000000000000128');
  await assert.rejects(gateway.send(request), error => error.code === EMAIL_FAILURE_CODES.DELIVERY_UNCERTAIN && error.uncertain);
  assert.deepEqual([primary.calls, backup.calls], [1, 0]);
  assert.equal((await store.getRequest(request.requestId)).status, 'UNCERTAIN');
});

test('health-state persistence failure after provider acceptance never causes duplicate fallback', async () => {
  let mutations = 0;
  const store = new MemoryEmailStore({ fail: operation => operation === 'mutateProviderState' && ++mutations === 2 });
  const primary = new MockEmailProvider({ id: 'primary' });
  const backup = new MockEmailProvider({ id: 'backup' });
  const { gateway } = await gatewayWith([primary, backup], { store });
  const result = await gateway.send(sampleEmailRequest('0000000000000126'));
  assert.equal(result.status, 'ACCEPTED');
  assert.equal(result.providerId, 'primary');
  assert.deepEqual([primary.calls, backup.calls], [1, 0]);
});

test('observability failure is isolated from successful delivery', async () => {
  const provider = new MockEmailProvider({ id: 'primary' });
  const store = new MemoryEmailStore({ fail: operation => operation === 'appendEvent' || operation === 'acquireAlert' });
  const { gateway } = await gatewayWith([provider], { store });
  const result = await gateway.send(sampleEmailRequest('0000000000000124'));
  assert.equal(result.status, 'ACCEPTED');
  assert.equal(provider.calls, 1);
});

test('weighted mode sends more traffic to the higher configured weight', async () => {
  const p1 = new MockEmailProvider({ id: 'p1', captureMessages: false });
  const p2 = new MockEmailProvider({ id: 'p2', captureMessages: false });
  const { gateway } = await gatewayWith([[p1, { weight: 1 }], [p2, { weight: 5 }]], { config: { router: { mode: 'weighted' } } });
  for (let index = 0; index < 200; index++) await gateway.send(sampleEmailRequest(`0000000001${String(index).padStart(6, '0')}`));
  assert.ok(p2.calls > p1.calls, `${p1.calls}/${p2.calls}`);
  assert.equal(p1.calls + p2.calls, 200);
});

test('weighted routing is deterministic for the same request ID', async () => {
  const p1 = new MockEmailProvider({ id: 'p1' });
  const p2 = new MockEmailProvider({ id: 'p2' });
  const config = { router: { mode: 'weighted', maxProviderAttempts: 3, globalDeadlineMs: 1000, defaultProviderTimeoutMs: 100, emergencyMaxAttempts: 1 } };
  const selected = [];
  for (let run = 0; run < 2; run++) {
    const { gateway } = await gatewayWith([[p1, { weight: 1 }], [p2, { weight: 4 }]], { config });
    selected.push((await gateway.send(sampleEmailRequest('0000000000000120'))).providerId);
  }
  assert.equal(selected[0], selected[1]);
});
