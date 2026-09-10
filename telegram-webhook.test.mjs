import test from 'node:test';
import assert from 'node:assert/strict';
import { AUTH_API_PREFIX, createNativeAuthHandler } from './auth-native/worker/public-auth-handler.mjs';

const WEBHOOK_SECRET = `telegram-webhook-${'s'.repeat(32)}`;
const LINK_TOKEN = 'L'.repeat(43);

class Authority {
  constructor() { this.calls = []; }
  idFromName(name) { return name; }
  get() { return { fetch: this.fetch.bind(this) }; }
  async fetch(input, init) {
    const request = input instanceof Request ? input : new Request(input, init);
    const body = await request.json();
    this.calls.push({ path: new URL(request.url).pathname, body });
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
