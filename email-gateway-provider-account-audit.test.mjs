import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { auditProviderAccounts, assertProviderAuditRequirements } from './email-gateway/operations/audit-provider-accounts.mjs';

const privateValues = Object.freeze({
  RESEND_API_KEY: 'private-resend-value',
  BREVO_API_KEY: ['xkey', 'sib-private-brevo-value'].join(''),
  MAILJET_API_KEY: 'private-mailjet-public-value',
  MAILJET_SECRET_KEY: 'private-mailjet-secret-value',
  MAILTRAP_API_KEY: 'private-mailtrap-value',
  MAILERSEND_API_KEY: 'private-mailersend-value',
  SENDPULSE_API_KEY: 'private-sendpulse-value',
  COURIER_API_KEY: 'private-courier-value',
  MAILJET_FROM_ADDRESS: 'private-mailjet-address@example.test',
  MAILJET_SENDER_VERIFIED: 'true'
});

const jsonResponse = (status, payload) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => payload
});

test('provider account audit performs GET-only checks and returns counts without values or addresses', async () => {
  const calls = [];
  const hiddenAddresses = ['private-brevo-address@example.test', 'private-mailjet-address@example.test', 'private-account-address@example.test'];
  const fetchImpl = async (input, init = {}) => {
    const url = String(input);
    calls.push({ url, method: init.method, headers: init.headers });
    if (url === 'https://api.resend.com/domains') return jsonResponse(200, { data: [] });
    if (url === 'https://api.brevo.com/v3/account') return jsonResponse(200, { email: 'private-account-address@example.test' });
    if (url === 'https://api.brevo.com/v3/senders') return jsonResponse(200, { senders: [{ email: hiddenAddresses[0], active: true }] });
    if (url.startsWith('https://api.mailjet.com/v3/REST/sender')) return jsonResponse(200, { Data: [{ Email: hiddenAddresses[1], Status: 'Validated' }] });
    if (url === 'https://mailtrap.io/api/accounts') return jsonResponse(200, [{ id: 123, name: 'private-account-name' }]);
    if (url === 'https://mailtrap.io/api/accounts/123/sending_domains') return jsonResponse(200, [{ domain_name: 'private-domain.test', dns_verified: false, compliance_status: 'initial' }]);
    if (url.startsWith('https://api.mailersend.com/v1/domains')) return jsonResponse(200, { data: [{ name: 'trial.private.test', is_verified: false }] });
    if (url === 'https://api.sendpulse.com/smtp/senders') return jsonResponse(200, ['private-sendpulse-address@example.test']);
    if (url === 'https://api.courier.com/messages?limit=1') return jsonResponse(200, { results: [{ recipient: 'private-recipient@example.test' }] });
    throw new Error(`Unexpected URL: ${url}`);
  };

  const audits = await auditProviderAccounts({
    env: { ...privateValues, BREVO_API_KEY: `  ${privateValues.BREVO_API_KEY}  ` },
    fetchImpl
  });

  assert.equal(audits.length, 7);
  assert.ok(audits.every(audit => audit.auth === 'VALID'));
  assert.equal(audits.find(audit => audit.provider === 'brevo').activeSenders, 1);
  assert.equal(audits.find(audit => audit.provider === 'brevo').credentialShape, 'STANDARD_API_PREFIX');
  assert.equal(audits.find(audit => audit.provider === 'mailjet').activeSenders, 1);
  assert.equal(audits.find(audit => audit.provider === 'mailjet').configuredSenderState, 'MATCHED_ACTIVE_SENDER');
  assert.doesNotThrow(() => assertProviderAuditRequirements(audits, { PROVIDER_ACCOUNT_REQUIRE_MAILJET_READY: 'true' }));
  assert.equal(audits.find(audit => audit.provider === 'resend').readiness, 'ACCOUNT_EMAIL_TEST_ONLY');
  assert.equal(audits.find(audit => audit.provider === 'mailtrap').readiness, 'SANDBOX_OR_DEMO_ONLY');
  assert.ok(calls.every(call => call.method === 'GET'));
  assert.equal(calls.find(call => call.url.includes('api.brevo.com')).headers['api-key'], privateValues.BREVO_API_KEY);

  const serialized = JSON.stringify(audits);
  for (const value of [...Object.values(privateValues), ...hiddenAddresses]) {
    assert.doesNotMatch(serialized, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.doesNotMatch(serialized, /private-domain|private-account|private-recipient|trial\.private/);
});

test('provider account audit distinguishes invalid and unreachable credentials without response bodies', async () => {
  const fetchImpl = async input => {
    const url = String(input);
    if (url.includes('api.brevo.com')) return jsonResponse(401, { message: 'private provider response' });
    if (url.includes('api.sendpulse.com')) throw new Error('private transport detail');
    if (url.includes('mailtrap.io/api/accounts')) return jsonResponse(403, { error: 'private scope detail' });
    if (url.includes('api.resend.com')) return jsonResponse(429, { error: 'private quota detail' });
    if (url.includes('api.mailjet.com')) return jsonResponse(500, { error: 'private outage detail' });
    if (url.includes('api.mailersend.com')) return jsonResponse(422, { error: 'private request detail' });
    if (url.includes('api.courier.com')) return jsonResponse(200, {});
    throw new Error('unexpected');
  };

  const audits = await auditProviderAccounts({ env: privateValues, fetchImpl });
  const byProvider = Object.fromEntries(audits.map(audit => [audit.provider, audit]));
  assert.equal(byProvider.brevo.auth, 'INVALID');
  assert.equal(byProvider.sendpulse.auth, 'UNREACHABLE');
  assert.equal(byProvider.mailtrap.auth, 'SCOPE_OR_ACCOUNT_BLOCKED');
  assert.equal(byProvider.resend.auth, 'RATE_LIMITED');
  assert.equal(byProvider.mailjet.auth, 'PROVIDER_UNAVAILABLE');
  assert.equal(byProvider.mailersend.auth, 'REQUEST_REJECTED');
  assert.equal(byProvider.courier.auth, 'VALID');
  assert.doesNotMatch(JSON.stringify(audits), /private provider|private transport|private scope|private quota|private outage|private request/);
});

test('protected Mailjet readiness gate requires the exact source address and declared evidence', async () => {
  const fetchImpl = async input => {
    const url = String(input);
    if (url === 'https://api.resend.com/domains') return jsonResponse(200, { data: [] });
    if (url === 'https://api.brevo.com/v3/account') return jsonResponse(401, {});
    if (url.startsWith('https://api.mailjet.com/')) return jsonResponse(200, { Data: [{ Email: 'different-private-address@example.test', Status: 'Active' }] });
    if (url === 'https://mailtrap.io/api/accounts') return jsonResponse(200, []);
    if (url.startsWith('https://api.mailersend.com/')) return jsonResponse(200, { data: [] });
    if (url === 'https://api.sendpulse.com/smtp/senders') return jsonResponse(200, []);
    if (url === 'https://api.courier.com/messages?limit=1') return jsonResponse(200, {});
    throw new Error(`Unexpected URL: ${url}`);
  };

  const mismatch = await auditProviderAccounts({ env: privateValues, fetchImpl });
  const mailjet = mismatch.find(audit => audit.provider === 'mailjet');
  assert.equal(mailjet.configuredSenderState, 'SOURCE_ADDRESS_NOT_ACTIVE');
  assert.throws(
    () => assertProviderAuditRequirements(mismatch, { PROVIDER_ACCOUNT_REQUIRE_MAILJET_READY: 'true' }),
    /Configured Mailjet sender evidence is not ready/
  );
  assert.doesNotMatch(JSON.stringify(mismatch), /different-private-address|private-mailjet-address/);

  const evidenceFalse = await auditProviderAccounts({
    env: { ...privateValues, MAILJET_SENDER_VERIFIED: 'false' },
    fetchImpl: async input => {
      const url = String(input);
      if (url.startsWith('https://api.mailjet.com/')) return jsonResponse(200, { Data: [{ Email: privateValues.MAILJET_FROM_ADDRESS, Status: 'Validated' }] });
      return fetchImpl(input);
    }
  });
  assert.equal(evidenceFalse.find(audit => audit.provider === 'mailjet').configuredSenderState, 'SOURCE_EVIDENCE_FALSE');
});

test('Brevo account authentication remains distinct from sender-read permission', async () => {
  const fetchImpl = async input => {
    const url = String(input);
    if (url === 'https://api.brevo.com/v3/account') return jsonResponse(200, { email: 'private-account-address@example.test' });
    if (url === 'https://api.brevo.com/v3/senders') return jsonResponse(403, { message: 'private permission detail' });
    if (url === 'https://api.resend.com/domains') return jsonResponse(200, { data: [] });
    if (url.startsWith('https://api.mailjet.com/')) return jsonResponse(200, { Data: [] });
    if (url === 'https://mailtrap.io/api/accounts') return jsonResponse(200, []);
    if (url.startsWith('https://api.mailersend.com/')) return jsonResponse(200, { data: [] });
    if (url === 'https://api.sendpulse.com/smtp/senders') return jsonResponse(200, []);
    if (url === 'https://api.courier.com/messages?limit=1') return jsonResponse(200, {});
    throw new Error(`Unexpected URL: ${url}`);
  };

  const audits = await auditProviderAccounts({ env: privateValues, fetchImpl });
  const brevo = audits.find(audit => audit.provider === 'brevo');
  assert.equal(brevo.auth, 'VALID');
  assert.equal(brevo.readiness, 'SENDER_READ_PERMISSION_BLOCKED');
  assert.doesNotMatch(JSON.stringify(audits), /private-account-address|private permission/);
});

test('provider account audit workflow is manual, OIDC-only and cannot send or mutate provider state', async () => {
  const [workflow, script] = await Promise.all([
    readFile(new URL('./.github/workflows/email-gateway-provider-account-audit.yml', import.meta.url), 'utf8'),
    readFile(new URL('./email-gateway/operations/audit-provider-accounts.mjs', import.meta.url), 'utf8')
  ]);

  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /github\.ref == 'refs\/heads\/main'/);
  assert.match(workflow, /environment: email-gateway-production/);
  assert.match(workflow, /method: oidc/);
  assert.match(workflow, /Infisical\/secrets-action@[0-9a-f]{40}/);
  assert.doesNotMatch(workflow, /secrets\.|wrangler|cloudflare|secret bulk|deploy/i);
  assert.doesNotMatch(script, /method:\s*['"](?:POST|PUT|PATCH|DELETE)['"]/);
  assert.doesNotMatch(script, /api\.resend\.com\/emails|api\.brevo\.com\/v3\/smtp\/email|api\.mailjet\.com\/v3\.1\/send|send\.api\.mailtrap\.io|api\.mailersend\.com\/v1\/email|api\.sendpulse\.com\/smtp\/emails|api\.courier\.com\/send/);
});
