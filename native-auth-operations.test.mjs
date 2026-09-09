import test from 'node:test';
import assert from 'node:assert/strict';
import {
  discoverActiveMailjetSender,
  prepareProductionSecrets,
  productionEmailGatewayConfig
} from './auth-native/operations/prepare-production-secrets.mjs';

const ENV = Object.freeze({
  MAILJET_API_KEY: 'mailjet-test-key',
  MAILJET_SECRET_KEY: 'mailjet-test-secret',
  MAILJET_FROM_ADDRESS: 'stale@admissionhub.pages.dev',
  CLOUDFLARE_ACCOUNT_ID: 'account-test',
  CLOUDFLARE_API_TOKEN: 'cloudflare-test-token'
});

const response = body => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });

const fetchFixture = ({ existing = [] } = {}) => async (url, options) => {
  if (String(url).includes('/v3/REST/sender')) {
    assert.match(String(options?.headers?.Authorization), /^Basic /);
    return response({ Data: [
      { Email: 'stale@admissionhub.pages.dev', Name: 'Pending', Status: 'Pending' },
      { Email: 'active.sender@example.com', Name: 'Admission Hub', Status: 'Active', IsDefaultSender: true }
    ] });
  }
  if (String(url).includes('/workers/scripts/admission-gk/secrets')) {
    assert.equal(options?.headers?.Authorization, 'Bearer cloudflare-test-token');
    return response({ success: true, result: existing.map(name => ({ name, type: 'secret_text' })) });
  }
  return new Response('not found', { status: 404 });
};

test('activation privately selects an Active Mailjet sender instead of stale Pending source', async () => {
  const sender = await discoverActiveMailjetSender({ env: ENV, fetchImpl: fetchFixture() });
  assert.equal(sender.address, 'active.sender@example.com');
  assert.equal(sender.name, 'Admission Hub');
  assert.equal(sender.apiBase, 'https://api.mailjet.com');
});

test('activation accepts an enabled account-wide MetaSender when the API-key sender list is Pending', async () => {
  const fetchImpl = async url => {
    if (String(url).includes('/v3/REST/metasender')) {
      return response({ Data: [
        { Email: '*@domain.example', IsEnabled: true },
        { Email: 'pretend@admissionhub.pages.dev', IsEnabled: true },
        { Email: 'shared.active@example.com', IsEnabled: true }
      ] });
    }
    if (String(url).includes('/v3/REST/sender')) return response({ Data: [{ Email: 'pending@example.com', Status: 'Pending' }] });
    return new Response('not found', { status: 404 });
  };
  const sender = await discoverActiveMailjetSender({ env: ENV, fetchImpl });
  assert.equal(sender.address, 'shared.active@example.com');
});

test('activation can discover an Active sender on an authorized Mailjet sub-account without printing credentials', async () => {
  const childKey = 'child-mailjet-api-key';
  const childSecret = 'child-mailjet-secret-key';
  const childAuthorization = `Basic ${Buffer.from(`${childKey}:${childSecret}`, 'utf8').toString('base64')}`;
  const fetchImpl = async (url, options = {}) => {
    const target = String(url);
    if (target.includes('/v3/REST/apikey')) return response({ Data: [{ APIKey: childKey, SecretKey: childSecret, IsActive: true }] });
    if (target.includes('/v3/REST/metasender')) return response({ Data: [] });
    if (target.includes('/v3/REST/sender')) {
      return options?.headers?.Authorization === childAuthorization
        ? response({ Data: [{ Email: 'subaccount.active@example.com', Status: 'Active' }] })
        : response({ Data: [{ Email: 'pending@example.com', Status: 'Pending' }] });
    }
    return new Response('not found', { status: 404 });
  };
  const sender = await discoverActiveMailjetSender({ env: ENV, fetchImpl });
  assert.equal(sender.address, 'subaccount.active@example.com');
  assert.equal(sender.apiKey, childKey);
  assert.equal(sender.secretKey, childSecret);
});

test('activation uses Mailjet SandboxMode to prove an existing repository-owner sender without delivery', async () => {
  let sandboxPayload = null;
  const fetchImpl = async (url, options = {}) => {
    const target = String(url);
    if (target.includes('/v3/REST/sender') || target.includes('/v3/REST/metasender')) return response({ Data: [] });
    if (target.includes('/v3/REST/apikey')) return response({ Data: [] });
    if (target.endsWith('/v3.1/send')) {
      sandboxPayload = JSON.parse(options.body);
      return response({ Messages: [{ Status: 'success', To: [] }] });
    }
    return new Response('not found', { status: 404 });
  };
  const sender = await discoverActiveMailjetSender({
    env: ENV, fetchImpl, senderCandidates: ['owner.sender@example.org']
  });
  assert.equal(sender.address, 'owner.sender@example.org');
  assert.equal(sender.evidence, 'sandbox');
  assert.equal(sandboxPayload.SandboxMode, true);
  assert.equal(sandboxPayload.Messages.length, 1);
  assert.equal(sandboxPayload.Messages[0].From.Email, 'owner.sender@example.org');
});

test('activation config enables only Mailjet and caps free quota at 200/day and 6000/month', () => {
  const config = productionEmailGatewayConfig();
  assert.equal(config.environment, 'production');
  assert.equal(config.router.maxProviderAttempts, 1);
  assert.equal(config.router.emergencyMaxAttempts, 0);
  for (const [provider, policy] of Object.entries(config.providerPolicies)) {
    assert.equal(policy.enabled, provider === 'mailjet', provider);
    assert.equal(policy.dailyLimit, provider === 'mailjet' ? 200 : 0, provider);
    assert.equal(policy.monthlyLimit, provider === 'mailjet' ? 6000 : 0, provider);
    assert.equal(policy.emergency, false, provider);
  }
});

test('activation creates missing persistent HMAC/internal secrets without replacing existing names', async () => {
  let sequence = 0;
  const generated = await prepareProductionSecrets({
    env: ENV,
    fetchImpl: fetchFixture({ existing: ['EMAIL_INTERNAL_SECRET'] }),
    randomSecret: () => `generated-${++sequence}-${'x'.repeat(40)}`
  });
  assert.deepEqual(generated.reused, ['EMAIL_INTERNAL_SECRET']);
  assert.deepEqual(generated.generated, ['AUTH_HMAC_SECRET', 'EMAIL_PRIVATE_PEPPER']);
  assert.equal('EMAIL_INTERNAL_SECRET' in generated.secrets, false);
  assert.match(generated.secrets.AUTH_HMAC_SECRET, /^generated-1-/);
  assert.match(generated.secrets.EMAIL_PRIVATE_PEPPER, /^generated-2-/);
  assert.equal(generated.secrets.MAILJET_FROM_ADDRESS, 'active.sender@example.com');
  assert.equal(generated.secrets.MAILJET_SENDER_VERIFIED, 'true');
  assert.equal(generated.secrets.MAILJET_SANDBOX_SENDER_VERIFIED, 'false');
  assert.equal(generated.secrets.EMAIL_PROVIDER_ACTIVATION, 'enabled');
  const config = JSON.parse(generated.secrets.EMAIL_GATEWAY_CONFIG);
  assert.equal(config.providerPolicies.mailjet.dailyLimit, 200);
});

test('activation refuses to proceed when no Active Mailjet sender exists', async () => {
  const fetchImpl = async url => String(url).includes('/v3/REST/sender')
    ? response({ Data: [{ Email: 'pending@example.com', Status: 'Pending' }] })
    : response({ success: true, result: [] });
  await assert.rejects(() => prepareProductionSecrets({ env: ENV, fetchImpl }), /no Active individual sender/i);
});
