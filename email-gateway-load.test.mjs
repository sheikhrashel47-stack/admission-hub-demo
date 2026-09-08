import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { MockEmailProvider, mockProviderEntry } from './email-gateway/testing/mock-provider.mjs';
import { createMockGateway } from './email-gateway/testing/create-mock-gateway.mjs';

const requestFor = (label, index) => ({
  type: 'EMAIL_VERIFICATION',
  recipient: `student-${label}-${index}@example.com`,
  template: 'EMAIL_VERIFICATION',
  variables: { otp: String(100000 + (index % 900000)) },
  requestId: `load-${label}-${String(index).padStart(12, '0')}`,
  idempotencyKey: `load-${label}-${String(index).padStart(12, '0')}`,
  priority: 'NORMAL',
  context: {}
});

async function runBatched({ gateway, count, label, batchSize = 200, expectFailure = false }) {
  const latencies = [];
  let success = 0;
  let failure = 0;
  let fallback = 0;
  const cpuStart = process.cpuUsage();
  const heapStart = process.memoryUsage().heapUsed;
  const started = performance.now();
  for (let offset = 0; offset < count; offset += batchSize) {
    const size = Math.min(batchSize, count - offset);
    const results = await Promise.allSettled(Array.from({ length: size }, async (_, local) => {
      const begin = performance.now();
      try {
        return await gateway.send(requestFor(label, offset + local));
      } finally {
        latencies.push(performance.now() - begin);
      }
    }));
    for (const result of results) {
      if (result.status === 'fulfilled') {
        success += 1;
        if (result.value.attempts.length > 1 || result.value.providerId !== 'primary') fallback += 1;
      } else failure += 1;
    }
  }
  const elapsedMs = performance.now() - started;
  const cpu = process.cpuUsage(cpuStart);
  latencies.sort((a, b) => a - b);
  const metrics = {
    shape: count,
    label,
    elapsedMs: Math.round(elapsedMs),
    throughputPerSecond: Math.round((count / elapsedMs) * 1000),
    p95Ms: Number((latencies[Math.max(0, Math.ceil(latencies.length * 0.95) - 1)] || 0).toFixed(2)),
    success,
    failure,
    fallback,
    cpuMs: Math.round((cpu.user + cpu.system) / 1000),
    heapDeltaMb: Number(((process.memoryUsage().heapUsed - heapStart) / 1024 / 1024).toFixed(2))
  };
  if (expectFailure) assert.equal(failure, count);
  else assert.equal(success, count);
  assert.ok(metrics.throughputPerSecond > 100, JSON.stringify(metrics));
  assert.ok(metrics.heapDeltaMb < 192, JSON.stringify(metrics));
  return metrics;
}

const createLoadGateway = async (providers, config = {}) => createMockGateway({
  entries: providers.map((provider, index) => mockProviderEntry(provider, { priority: index + 1, dailyLimit: 1000000, monthlyLimit: 10000000, maxConcurrent: 1000 })),
  config: { router: { mode: 'priority', maxProviderAttempts: 3, globalDeadlineMs: 1000, defaultProviderTimeoutMs: 100, emergencyMaxAttempts: 1 }, ...config }
});

test('mock no-send volume shapes 1k, 5k, 10k and 25k remain bounded', async t => {
  const metrics = [];
  for (const count of [1000, 5000, 10000, 25000]) {
    const primary = new MockEmailProvider({ id: 'primary', captureMessages: false });
    const { gateway, store } = await createLoadGateway([primary]);
    const result = await runBatched({ gateway, count, label: `success-${count}` });
    assert.equal(primary.calls, count);
    assert.equal(store.requests.size, count);
    assert.ok(store.events.length <= 500);
    assert.equal(store.operationCounts.get('acquireRequest'), count);
    metrics.push({ ...result, persistenceOperations: [...store.operationCounts.values()].reduce((sum, value) => sum + value, 0) });
  }
  t.diagnostic(`LOAD_METRICS ${JSON.stringify(metrics)}`);
});

test('5k random primary failures route to backup without duplicate sends', async t => {
  const primary = new MockEmailProvider({ id: 'primary', mode: 'random', failEvery: 3, captureMessages: false });
  const backup = new MockEmailProvider({ id: 'backup', captureMessages: false });
  const { gateway } = await createLoadGateway([primary, backup]);
  const metrics = await runBatched({ gateway, count: 5000, label: 'random-5000' });
  assert.equal(metrics.success, 5000);
  assert.ok(backup.calls > 0);
  assert.ok(primary.calls + backup.calls <= 10000);
  t.diagnostic(`RANDOM_FAILOVER_METRICS ${JSON.stringify(metrics)}`);
});

test('1k sustained provider failures fast-fail after circuit protection', async t => {
  const p1 = new MockEmailProvider({ id: 'primary', mode: 'fail', captureMessages: false });
  const p2 = new MockEmailProvider({ id: 'backup', mode: 'fail', captureMessages: false });
  const p3 = new MockEmailProvider({ id: 'tertiary', mode: 'fail', captureMessages: false });
  const { gateway } = await createLoadGateway([p1, p2, p3]);
  const metrics = await runBatched({ gateway, count: 1000, label: 'all-fail-1000', expectFailure: true });
  assert.ok(p1.calls + p2.calls + p3.calls < 1000, 'open circuits should suppress known-dead calls');
  t.diagnostic(`OUTAGE_METRICS ${JSON.stringify(metrics)}`);
});

test('rate-limit and quota-exhausted modes fail over in bounded attempts', async () => {
  for (const mode of ['rate-limit', 'quota-exhausted']) {
    const primary = new MockEmailProvider({ id: 'primary', mode, captureMessages: false });
    const backup = new MockEmailProvider({ id: 'backup', captureMessages: false });
    const { gateway } = await createLoadGateway([primary, backup]);
    const metrics = await runBatched({ gateway, count: 1000, label: `${mode}-1000` });
    assert.equal(metrics.success, 1000);
    assert.ok(backup.calls > 0);
  }
});

test('slow mode stays concurrent while timeout mode terminates safely', async t => {
  const slow = new MockEmailProvider({ id: 'primary', mode: 'slow', delayMs: 5, captureMessages: false });
  const slowGateway = await createLoadGateway([slow]);
  const slowMetrics = await runBatched({ gateway: slowGateway.gateway, count: 500, label: 'slow-500', batchSize: 100 });
  assert.ok(slow.maxConcurrency > 1);

  const timeout = new MockEmailProvider({ id: 'primary', mode: 'timeout', captureMessages: false });
  const timeoutGateway = await createLoadGateway([timeout], { router: { mode: 'priority', maxProviderAttempts: 1, globalDeadlineMs: 100, defaultProviderTimeoutMs: 50, emergencyMaxAttempts: 0 } });
  const timeoutMetrics = await runBatched({ gateway: timeoutGateway.gateway, count: 100, label: 'timeout-100', batchSize: 100, expectFailure: true });
  assert.equal(timeout.calls, 100);
  assert.ok(timeoutMetrics.elapsedMs < 500);
  t.diagnostic(`SLOW_TIMEOUT_METRICS ${JSON.stringify({ slowMetrics, timeoutMetrics })}`);
});
