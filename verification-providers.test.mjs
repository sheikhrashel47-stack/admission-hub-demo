import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BridgeOtpVerificationProvider,
  createConfiguredVerificationProviders,
  OfficialWhatsAppVerificationProvider,
  TelegramLinkVerificationProvider
} from './auth-native/verification/providers.mjs';
import { VERIFICATION_FAILURE_CLASS } from './auth-native/verification/provider-contract.mjs';

const json = (body, status = 200) => Response.json(body, { status });
const KEY = `provider-key-${'k'.repeat(32)}`;

test('three OTP bridge slots implement the shared contract and fail closed when not securely configured', async () => {
  const providers = createConfiguredVerificationProviders({});
  assert.deepEqual(providers.map(row => row.id), ['otp-a', 'otp-b', 'otp-c', 'whatsapp', 'telegram']);
  for (const provider of providers) {
    assert.equal((await provider.checkAvailability()).available, false);
    assert.equal((await provider.getRemainingQuota()).remaining, 0);
    assert.equal((await provider.getProviderStatus()).configured, false);
    await assert.rejects(
      () => provider.sendVerification({}),
      error => error?.failureClass === VERIFICATION_FAILURE_CLASS.HARD
    );
  }
});

test('OTP bridge uses bounded HTTPS server calls for health, exact quota, and delivery', async () => {
  const calls = [];
  const provider = new BridgeOtpVerificationProvider({
    id: 'otp-a',
    origin: 'https://otp-bridge.example',
    apiKey: KEY,
    declaredDailyQuota: 250,
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), init });
      if (String(url).endsWith('/health')) return json({ ok: true, ready: true });
      if (String(url).endsWith('/quota')) return json({ remaining: 88, limit: 100, resetAt: 1_900_000_000_000 });
      return json({ accepted: true, messageRef: 'message-reference-1234567890' });
    }
  });
  assert.deepEqual(await provider.checkAvailability(), { available: true, code: 'READY' });
  assert.deepEqual(await provider.getRemainingQuota(), { remaining: 88, limit: 100, resetAt: 1_900_000_000_000, source: 'provider-api' });
  assert.deepEqual(await provider.sendVerification({
    attemptId: 'attempt-12345678901234567890',
    destination: 'student@example.com',
    code: '123456',
    purpose: 'account-backup',
    expiresAt: 1_800_000_300_000
  }), { accepted: true });
  const send = calls.find(call => call.url.endsWith('/send'));
  assert.equal(send.init.headers['X-Verification-Key'], KEY);
  const body = JSON.parse(send.init.body);
  assert.equal(body.code, '123456');
  assert.equal(body.destination, 'student@example.com');
});

test('OTP bridge classifies user, hard, and temporary provider failures for safe retry decisions', async () => {
  for (const row of [
    { status: 400, expected: VERIFICATION_FAILURE_CLASS.USER },
    { status: 401, expected: VERIFICATION_FAILURE_CLASS.HARD },
    { status: 503, expected: VERIFICATION_FAILURE_CLASS.TEMPORARY }
  ]) {
    const provider = new BridgeOtpVerificationProvider({
      id: 'otp-a', origin: 'https://otp-bridge.example', apiKey: KEY, declaredDailyQuota: 10,
      fetchImpl: async () => json({ error: { code: `REMOTE_MUST_NOT_LEAK_${KEY}` } }, row.status)
    });
    await assert.rejects(
      () => provider.sendVerification({ destination: 'student@example.com', code: '123456' }),
      error => error?.failureClass === row.expected && error?.code === `PROVIDER_HTTP_${row.status}`
    );
  }
});

test('WhatsApp adapter calls only the official Graph API with an approved template and locally verified code', async () => {
  const calls = [];
  const provider = new OfficialWhatsAppVerificationProvider({
    graphVersion: 'v99.0',
    phoneNumberId: '123456789012345',
    accessToken: `meta-token-${'m'.repeat(40)}`,
    templateName: 'admission_hub_verification',
    templateLanguage: 'bn_BD',
    declaredDailyQuota: 100,
    fetchImpl: async (url, init) => {
      calls.push({ url: String(url), init });
      return init.method === 'GET'
        ? json({ id: '123456789012345' })
        : json({ messages: [{ id: 'wamid-message-reference-1234567890' }] });
    }
  });
  assert.equal((await provider.checkAvailability()).available, true);
  await provider.sendVerification({ destination: '+8801700000000', code: '654321' });
  const send = calls.find(call => call.init.method === 'POST');
  assert.match(send.url, /^https:\/\/graph\.facebook\.com\/v99\.0\/123456789012345\/messages$/);
  assert.match(send.init.headers.Authorization, /^Bearer /);
  const body = JSON.parse(send.init.body);
  assert.equal(body.messaging_product, 'whatsapp');
  assert.equal(body.type, 'template');
  assert.equal(body.template.name, 'admission_hub_verification');
  assert.equal(body.template.components[0].parameters[0].text, '654321');
  assert.equal(provider.verificationMode, 'local-code');
});

test('Telegram adapter creates a one-time bot link but requires server-confirmed webhook evidence', async () => {
  let getMeCalls = 0;
  const provider = new TelegramLinkVerificationProvider({
    botUsername: 'AdmissionHubVerifyBot',
    botToken: `123456:${'t'.repeat(35)}`,
    webhookSecret: `webhook-${'w'.repeat(32)}`,
    webhookUrl: 'https://admission-gk.admissionhub.workers.dev/api/auth/v1/telegram/webhook',
    declaredDailyQuota: 100,
    fetchImpl: async url => {
      getMeCalls += 1;
      assert.match(String(url), /^https:\/\/api\.telegram\.org\/bot/);
      return String(url).endsWith('/getWebhookInfo')
        ? json({ ok: true, result: { url: 'https://admission-gk.admissionhub.workers.dev/api/auth/v1/telegram/webhook' } })
        : json({ ok: true, result: { username: 'AdmissionHubVerifyBot' } });
    }
  });
  assert.equal((await provider.checkAvailability()).available, true);
  const linkToken = 'A'.repeat(43);
  const sent = await provider.sendVerification({ linkToken });
  assert.equal(sent.accepted, true);
  const link = new URL(sent.interaction.url);
  assert.equal(link.origin, 'https://t.me');
  assert.equal(link.searchParams.get('start'), linkToken);
  assert.equal(getMeCalls, 2);
  assert.deepEqual(await provider.verifyCode({ serverConfirmed: false }), { verified: false, identityKind: 'telegram-account', phoneOwnership: false });
  assert.deepEqual(await provider.verifyCode({ serverConfirmed: true }), { verified: true, identityKind: 'telegram-account', phoneOwnership: false });
});
