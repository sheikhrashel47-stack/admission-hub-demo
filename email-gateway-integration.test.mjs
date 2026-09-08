import test from 'node:test';
import assert from 'node:assert/strict';
import sourceWorker from './gk-agent-worker.js';
import bundledWorker, { EmailGatewayCoordinator as BundledEmailGatewayCoordinator } from './worker-bundle.mjs';
import pagesWorker from './_worker.js';
import { signInternalRequest, INTERNAL_AUTH_HEADERS } from './email-gateway/core/internal-auth.mjs';
import { FakeDurableObjectBinding } from './email-gateway/testing/fake-durable-object.mjs';
import { MockEmailProvider, mockProviderEntry } from './email-gateway/testing/mock-provider.mjs';
import { createMockGateway, sampleEmailRequest } from './email-gateway/testing/create-mock-gateway.mjs';
import { createAuthFoundation } from './auth/index.mjs';
import { createMockPorts } from './auth/testing/mock-ports.mjs';

const secret = 'test-signing-secret-that-is-at-least-thirty-two-characters';

async function signedHealthRequest() {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = `bundle-health-${timestamp}`;
  const path = '/internal/email/health';
  const signature = await signInternalRequest({ secret, method: 'GET', path, timestamp, nonce, bodyText: '' });
  return new Request(`https://worker.example${path}`, { headers: {
    [INTERNAL_AUTH_HEADERS.KEY_ID]: 'current',
    [INTERNAL_AUTH_HEADERS.TIMESTAMP]: timestamp,
    [INTERNAL_AUTH_HEADERS.NONCE]: nonce,
    [INTERNAL_AUTH_HEADERS.SIGNATURE]: signature
  } });
}

test('source and checked bundle hide internal gateway when server secret is absent', async () => {
  const request = new Request('https://worker/internal/email/send', { method: 'POST', body: '{}' });
  assert.equal((await sourceWorker.fetch(request.clone(), {}, {})).status, 404);
  assert.equal((await bundledWorker.fetch(request.clone(), {}, {})).status, 404);
});

test('checked deploy bundle exports coordinator and reports all providers disabled', async () => {
  assert.equal(typeof BundledEmailGatewayCoordinator, 'function');
  const response = await bundledWorker.fetch(await signedHealthRequest(), {
    EMAIL_GATEWAY_SIGNING_SECRET: secret,
    EMAIL_RECIPIENT_HASH_PEPPER: 'production-like-private-pepper-value-0001',
    EMAIL_COORDINATOR: new FakeDurableObjectBinding(),
    PUB_KV: { get: async () => null, put: async () => {} },
    OLD_KV: { get: async () => null, put: async () => {} }
  }, {});
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.status, 'DISABLED');
  assert.equal(body.enabledProviders, 0);
  assert.equal(body.storage, 'strong');
  assert.equal(body.providers.length, 8);
});

test('Pages never proxies internal Email Gateway route to the Worker', async () => {
  let reads = 0;
  const response = await pagesWorker.fetch(new Request('https://pages.example/internal/email/health'), { ASSETS: { fetch: async () => { reads += 1; return new Response('bad'); } } });
  assert.equal(response.status, 404);
  assert.equal(reads, 0);
});

test('email outage never mutates authenticated Auth authority', async () => {
  const mocks = createMockPorts();
  const auth = createAuthFoundation({ ports: mocks.ports, config: { operation: { timeoutMs: 100, maxRetries: 0, baseDelayMs: 1, maxDelayMs: 2 } } });
  await auth.initialize();
  await auth.signIn({ method: 'password', email: 'student@example.com', password: 'safe-password-123', rememberMe: false });
  const before = auth.getState();
  const emailProvider = new MockEmailProvider({ id: 'email-down', mode: 'fail' });
  const { gateway } = await createMockGateway({ entries: [mockProviderEntry(emailProvider)] });
  await assert.rejects(gateway.send(sampleEmailRequest('0000000000000301')));
  const after = auth.getState();
  assert.equal(before.state, 'AUTHENTICATED');
  assert.equal(after.state, 'AUTHENTICATED');
  assert.equal(after.identity.id, before.identity.id);
  assert.equal(after.session.id, before.session.id);
});
