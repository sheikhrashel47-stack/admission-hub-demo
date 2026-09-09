import { pathToFileURL } from 'node:url';

const PROVIDERS = Object.freeze([
  'resend', 'brevo', 'mailjet', 'mailtrap', 'mailersend', 'sendpulse', 'courier'
]);

const credentialNames = Object.freeze([
  'RESEND_API_KEY',
  'BREVO_API_KEY',
  'MAILJET_API_KEY',
  'MAILJET_SECRET_KEY',
  'MAILTRAP_API_KEY',
  'MAILERSEND_API_KEY',
  'SENDPULSE_API_KEY',
  'COURIER_API_KEY'
]);

const integerCount = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
const basicAuthorization = (username, password) => `Basic ${Buffer.from(`${username}:${password}`, 'utf8').toString('base64')}`;

function authState(status) {
  if (status >= 200 && status < 300) return 'VALID';
  if (status === 401) return 'INVALID';
  if (status === 403) return 'SCOPE_OR_ACCOUNT_BLOCKED';
  if (status === 429) return 'RATE_LIMITED';
  return status >= 500 ? 'PROVIDER_UNAVAILABLE' : 'REQUEST_REJECTED';
}

async function readOnlyRequest({ url, headers, fetchImpl }) {
  try {
    const response = await fetchImpl(url, {
      method: 'GET',
      headers: { Accept: 'application/json', 'Cache-Control': 'no-store', ...headers },
      signal: AbortSignal.timeout(15_000)
    });
    const state = authState(response.status);
    if (!response.ok) return Object.freeze({ auth: state, payload: null });
    let payload = null;
    try {
      payload = await response.json();
    } catch {
      return Object.freeze({ auth: 'VALID', payload: null });
    }
    return Object.freeze({ auth: 'VALID', payload });
  } catch {
    return Object.freeze({ auth: 'UNREACHABLE', payload: null });
  }
}

const result = (provider, auth, readiness, { activeSenders = 0, verifiedDomains = 0 } = {}) => Object.freeze({
  provider,
  auth,
  readiness,
  activeSenders: integerCount(activeSenders),
  verifiedDomains: integerCount(verifiedDomains)
});

async function auditResend(env, fetchImpl) {
  const response = await readOnlyRequest({
    url: 'https://api.resend.com/domains',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}` },
    fetchImpl
  });
  if (response.auth !== 'VALID') return result('resend', response.auth, 'NOT_READY');
  const domains = Array.isArray(response.payload?.data) ? response.payload.data : [];
  const verifiedDomains = domains.filter(domain => domain?.status === 'verified' && domain?.capabilities?.sending !== 'disabled').length;
  return result('resend', 'VALID', verifiedDomains ? 'LIVE_DOMAIN_AVAILABLE' : 'ACCOUNT_EMAIL_TEST_ONLY', { verifiedDomains });
}

async function auditBrevo(env, fetchImpl) {
  const headers = { 'api-key': env.BREVO_API_KEY };
  const accountResponse = await readOnlyRequest({
    url: 'https://api.brevo.com/v3/account',
    headers,
    fetchImpl
  });
  if (accountResponse.auth !== 'VALID') return result('brevo', accountResponse.auth, 'NOT_READY');

  const senderResponse = await readOnlyRequest({
    url: 'https://api.brevo.com/v3/senders',
    headers,
    fetchImpl
  });
  if (senderResponse.auth !== 'VALID') {
    const readiness = senderResponse.auth === 'SCOPE_OR_ACCOUNT_BLOCKED' || senderResponse.auth === 'INVALID'
      ? 'SENDER_READ_PERMISSION_BLOCKED'
      : 'SENDER_CHECK_INDETERMINATE';
    return result('brevo', 'VALID', readiness);
  }
  const senders = Array.isArray(senderResponse.payload?.senders) ? senderResponse.payload.senders : [];
  const activeSenders = senders.filter(sender => sender?.active === true).length;
  return result('brevo', 'VALID', activeSenders ? 'ACTIVE_SENDER_AVAILABLE' : 'SENDER_MISSING', { activeSenders });
}

async function auditMailjet(env, fetchImpl) {
  const apiBase = ['https://api.mailjet.com', 'https://api.us.mailjet.com'].includes(env.MAILJET_API_BASE)
    ? env.MAILJET_API_BASE
    : 'https://api.mailjet.com';
  const response = await readOnlyRequest({
    url: `${apiBase}/v3/REST/sender?Limit=1000`,
    headers: { Authorization: basicAuthorization(env.MAILJET_API_KEY, env.MAILJET_SECRET_KEY) },
    fetchImpl
  });
  if (response.auth !== 'VALID') return result('mailjet', response.auth, 'NOT_READY');
  const senders = Array.isArray(response.payload?.Data) ? response.payload.Data : [];
  const activeSenders = senders.filter(sender => ['active', 'validated'].includes(String(sender?.Status || '').toLowerCase())).length;
  return result('mailjet', 'VALID', activeSenders ? 'ACTIVE_SENDER_AVAILABLE' : 'SENDER_MISSING', { activeSenders });
}

async function auditMailtrap(env, fetchImpl) {
  const headers = { Authorization: `Bearer ${env.MAILTRAP_API_KEY}` };
  const accountsResponse = await readOnlyRequest({ url: 'https://mailtrap.io/api/accounts', headers, fetchImpl });
  if (accountsResponse.auth !== 'VALID') return result('mailtrap', accountsResponse.auth, 'NOT_READY');
  const accounts = (Array.isArray(accountsResponse.payload) ? accountsResponse.payload : [])
    .map(account => account?.id)
    .filter(id => typeof id === 'number' || (typeof id === 'string' && /^\d{1,20}$/.test(id)))
    .slice(0, 20);
  const domainResponses = await Promise.all(accounts.map(accountId => readOnlyRequest({
    url: `https://mailtrap.io/api/accounts/${encodeURIComponent(String(accountId))}/sending_domains`,
    headers,
    fetchImpl
  })));
  const verifiedDomains = domainResponses.reduce((count, domainsResponse) => {
    if (domainsResponse.auth !== 'VALID') return count;
    const domains = Array.isArray(domainsResponse.payload) ? domainsResponse.payload : [];
    return count + domains.filter(domain => domain?.dns_verified === true && domain?.compliance_status === 'compliant').length;
  }, 0);
  return result('mailtrap', 'VALID', verifiedDomains ? 'LIVE_DOMAIN_AVAILABLE' : 'SANDBOX_OR_DEMO_ONLY', { verifiedDomains });
}

async function auditMailerSend(env, fetchImpl) {
  const response = await readOnlyRequest({
    url: 'https://api.mailersend.com/v1/domains?limit=100',
    headers: { Authorization: `Bearer ${env.MAILERSEND_API_KEY}` },
    fetchImpl
  });
  if (response.auth !== 'VALID') return result('mailersend', response.auth, 'NOT_READY');
  const domains = Array.isArray(response.payload?.data) ? response.payload.data : [];
  const verifiedDomains = domains.filter(domain => domain?.is_verified === true && domain?.domain_settings?.send_paused !== true).length;
  return result('mailersend', 'VALID', verifiedDomains ? 'VERIFIED_OR_TRIAL_DOMAIN_PRESENT' : 'TRIAL_OR_SANDBOX_ONLY', { verifiedDomains });
}

async function auditSendPulse(env, fetchImpl) {
  const response = await readOnlyRequest({
    url: 'https://api.sendpulse.com/smtp/senders',
    headers: { Authorization: `Bearer ${env.SENDPULSE_API_KEY}` },
    fetchImpl
  });
  if (response.auth !== 'VALID') return result('sendpulse', response.auth, 'NOT_READY');
  const senders = Array.isArray(response.payload) ? response.payload : [];
  const activeSenders = senders.filter(sender => typeof sender === 'string' || sender?.status === 'Active' || sender?.status === 1 || sender?.is_allowed_for_smtp === true).length;
  return result('sendpulse', 'VALID', activeSenders ? 'ACTIVE_SENDER_AVAILABLE' : 'SENDER_MISSING', { activeSenders });
}

async function auditCourier(env, fetchImpl) {
  const response = await readOnlyRequest({
    url: 'https://api.courier.com/messages?limit=1',
    headers: { Authorization: `Bearer ${env.COURIER_API_KEY}` },
    fetchImpl
  });
  return response.auth === 'VALID'
    ? result('courier', 'VALID', 'ACCOUNT_VALID_PROVIDER_SETUP_UNVERIFIED')
    : result('courier', response.auth, 'NOT_READY');
}

export async function auditProviderAccounts({ env = {}, fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('A fetch implementation is required.');
  const missing = credentialNames.filter(name => typeof env[name] !== 'string' || env[name].trim() === '');
  if (missing.length) throw new Error(`Provider account audit is missing credential names: ${missing.sort().join(', ')}`);
  const normalizedEnv = Object.freeze({
    ...env,
    ...Object.fromEntries(credentialNames.map(name => [name, env[name].trim()]))
  });

  const audits = await Promise.all([
    auditResend(normalizedEnv, fetchImpl),
    auditBrevo(normalizedEnv, fetchImpl),
    auditMailjet(normalizedEnv, fetchImpl),
    auditMailtrap(normalizedEnv, fetchImpl),
    auditMailerSend(normalizedEnv, fetchImpl),
    auditSendPulse(normalizedEnv, fetchImpl),
    auditCourier(normalizedEnv, fetchImpl)
  ]);
  return Object.freeze(audits);
}

async function main({ env = process.env, stdout = process.stdout } = {}) {
  const audits = await auditProviderAccounts({ env });
  for (const audit of audits) {
    stdout.write(`PROVIDER_ACCOUNT_AUDIT provider=${audit.provider} auth=${audit.auth} readiness=${audit.readiness} activeSenders=${audit.activeSenders} verifiedDomains=${audit.verifiedDomains}\n`);
  }
  const valid = audits.filter(audit => audit.auth === 'VALID').length;
  stdout.write(`PROVIDER_ACCOUNT_AUDIT_SUMMARY checked=${PROVIDERS.length} valid=${valid} nonValid=${PROVIDERS.length - valid} noSend=true valuesPrinted=false\n`);
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (invokedPath === import.meta.url) {
  main().catch(error => {
    process.stderr.write(`::error title=Provider account no-send audit failed::${error.message}\n`);
    process.exitCode = 1;
  });
}
