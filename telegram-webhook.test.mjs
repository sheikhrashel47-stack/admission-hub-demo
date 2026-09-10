import test from 'node:test';
import assert from 'node:assert/strict';
import { AUTH_API_PREFIX, createNativeAuthHandler } from './auth-native/worker/public-auth-handler.mjs';
import { deriveTelegramWebhookSecret } from './auth-native/verification/telegram-security.mjs';

const WEBHOOK_SECRET = `telegram-webhook-${'s'.repeat(32)}`;
const LINK_TOKEN = 'L'.repeat(43);

class Authority {
  constructor() { this.calls = []; }
  idFromName(name) { return name; }
  get() { return { fetch: this.fetch.bind(this) }; }
  async fetch(input, init) {
    const request = input instanceof Request ? input : new Request(input, init);
    const body = await request.json();
    const path = new URL(request.url).pathname;
    this.calls.push({ path, body });
    if (path.endsWith('/activate')) return Response.json({ ok: true, result: { ready: true, identityReady: true, webhookReady: true, endpointAccepted: true, webhookChanged: true } });
    if (path.endsWith('/deactivate')) return Response.json({ ok: true, result: { removed: true } });
    return Response.json({ ok: true, result: { accepted: true, identityKind: 'telegram-account', phoneOwnership: false } });
  }
}

const updateRequest = ({ secret = '', update = {} } = {}) => new Request(`https://worker.example${AUTH_API_PREFIX}/telegram/webhook`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    ...(secret ? { 'X-Telegram-Bot-Api-Secret-Token': secret } : {})
  },
  body: JSON.stringify({
    update_id: 12345,
    message: {
      from: { id: 99887766, is_bot: false },
      chat: { id: 99887766, type: 'private' },
      text: `/start ${LINK_TOKEN}`
    },
    ...update
  })
});

test('Telegram webhook rejects missing secret before parsing or touching authority', async () => {
  const authority = new Authority();
  const handler = createNativeAuthHandler({ fetchImpl: async () => Response.json({}) });
  const response = await handler(updateRequest(), { AUTH_AUTHORITY: authority, TELEGRAM_AUTH_WEBHOOK_SECRET: WEBHOOK_SECRET });
  assert.equal(response.status, 403);
  assert.equal(authority.calls.length, 0);
});

test('Telegram webhook accepts only a private same-user /start token and returns no identity or token', async () => {
  const authority = new Authority();
  const handler = createNativeAuthHandler({ fetchImpl: async () => Response.json({}) });
  const env = { AUTH_AUTHORITY: authority, TELEGRAM_AUTH_WEBHOOK_SECRET: WEBHOOK_SECRET };
  const response = await handler(updateRequest({ secret: WEBHOOK_SECRET }), env);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(authority.calls.length, 1);
  assert.equal(authority.calls[0].path, '/internal/verification/telegram/webhook');
  assert.deepEqual(authority.calls[0].body.input, { linkToken: LINK_TOKEN, telegramUserId: '99887766', chatId: '99887766' });

  const group = await handler(updateRequest({
    secret: WEBHOOK_SECRET,
    update: { message: { from: { id: 99887766 }, chat: { id: -100123, type: 'group' }, text: `/start ${LINK_TOKEN}` } }
  }), env);
  assert.equal(group.status, 200);
  assert.equal(authority.calls.length, 1);
});

test('Telegram webhook accepts the HMAC-derived secret without exposing or reusing the Auth root secret', async () => {
  const authority = new Authority();
  const handler = createNativeAuthHandler({ fetchImpl: async () => Response.json({}) });
  const rootSecret = `auth-root-${'r'.repeat(48)}`;
  const derived = await deriveTelegramWebhookSecret(rootSecret);
  assert.match(derived, /^[A-Za-z0-9_-]{20,256}$/);
  assert.notEqual(derived, rootSecret);
  const response = await handler(updateRequest({ secret: derived }), {
    AUTH_AUTHORITY: authority,
    AUTH_HMAC_SECRET: rootSecret
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(authority.calls.length, 1);
});

const activationRequest = ({ proof = '', action = 'activate', hostname = 'admission-gk.admissionhub.workers.dev' } = {}) => new Request(
  `https://${hostname}${AUTH_API_PREFIX}/telegram/canary/${action}`,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(proof ? { 'X-AH-Telegram-Activation': proof } : {})
    },
    body: '{}'
  }
);

test('Telegram canary activation is direct-Worker, transient-secret protected, and returns bounded booleans only', async () => {
  const authority = new Authority();
  const handler = createNativeAuthHandler({ fetchImpl: async () => Response.json({}) });
  const proof = 'P'.repeat(48);
  const env = {
    AUTH_AUTHORITY: authority,
    VERIFICATION_AUTH_ACTIVATION: 'canary',
    TELEGRAM_CANARY_ACTIVATION_SECRET: proof
  };

  const denied = await handler(activationRequest(), env);
  assert.equal(denied.status, 403);
  const wrongHost = await handler(activationRequest({ proof, hostname: 'admissionhub.pages.dev' }), env);
  assert.equal(wrongHost.status, 403);
  assert.equal(authority.calls.length, 0);

  const activated = await handler(activationRequest({ proof }), env);
  assert.equal(activated.status, 200);
  assert.deepEqual(await activated.json(), {
    ok: true,
    ready: true,
    identityReady: true,
    webhookReady: true,
    endpointAccepted: true,
    webhookChanged: true
  });
  assert.equal(authority.calls[0].path, '/internal/verification/telegram/activate');

  const deactivated = await handler(activationRequest({ proof, action: 'deactivate' }), env);
  assert.equal(deactivated.status, 200);
  assert.deepEqual(await deactivated.json(), { ok: true, removed: true });
  assert.equal(authority.calls[1].path, '/internal/verification/telegram/deactivate');
});
