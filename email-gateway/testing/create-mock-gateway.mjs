import { createEmailGateway } from '../create-email-gateway.mjs';
import { createEmailGatewayConfig } from '../core/config.mjs';
import { MemoryEmailStore } from '../storage/memory-store.mjs';

const cheapHash = async value => {
  let hash = 2166136261;
  for (const char of String(value)) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); }
  return `test-${(hash >>> 0).toString(16).padStart(8, '0')}`;
};

export async function createMockGateway({ entries = [], config: overrides = {}, store, runtime = {} } = {}) {
  const config = createEmailGatewayConfig({
    environment: 'test',
    rateLimits: { enabled: false },
    router: { defaultProviderTimeoutMs: 100, globalDeadlineMs: 1000, maxProviderAttempts: 3, emergencyMaxAttempts: 1 },
    security: { requireStrongConsistency: true },
    ...overrides
  });
  const now = runtime.now || (() => Date.now());
  const selectedStore = store || new MemoryEmailStore({ now, eventRetention: config.observability.eventRetention });
  const gateway = await createEmailGateway({ config, store: selectedStore, entries, privatePepper: 'test-only-private-pepper-value', runtime: { randomId: (() => { let id = 0; return () => `event-${++id}`; })(), hashReference: cheapHash, ...runtime, now } });
  return { gateway, store: selectedStore, config };
}

export const sampleEmailRequest = (suffix = '0000000000000001', overrides = {}) => ({
  type: 'EMAIL_VERIFICATION',
  recipient: `student-${suffix.slice(-6)}@example.com`,
  subject: '',
  template: 'EMAIL_VERIFICATION',
  variables: { otp: '123456', name: 'শিক্ষার্থী' },
  requestId: `email-request-${suffix}`,
  idempotencyKey: `email-request-${suffix}`,
  priority: 'HIGH',
  context: { ip: '203.0.113.7', accountId: `account-${suffix}`, deviceId: `device-${suffix}` },
  ...overrides
});
