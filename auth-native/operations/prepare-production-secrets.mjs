import { chmod, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { safeParseEmailGatewayConfig } from '../../email-gateway/core/config.mjs';

const WORKER_NAME = 'admission-gk';
const CLOUDFLARE_API = 'https://api.cloudflare.com/client/v4';
const MAILJET_BASES = new Set(['https://api.mailjet.com', 'https://api.us.mailjet.com']);
const REQUIRED_MAILJET = Object.freeze(['MAILJET_API_KEY', 'MAILJET_SECRET_KEY']);
const PRESERVED_SECRETS = Object.freeze(['AUTH_HMAC_SECRET', 'EMAIL_INTERNAL_SECRET', 'EMAIL_PRIVATE_PEPPER']);
const PROVIDERS = Object.freeze(['resend', 'brevo', 'mailjet', 'mailtrap', 'mailersend', 'sendpulse', 'emailoctopus', 'courier']);

const required = (env, name) => {
  const value = String(env[name] || '').trim();
  if (!value) throw new Error(`Required environment value is missing: ${name}.`);
  return value;
};

const token = () => randomBytes(48).toString('base64url');
const basicAuthorization = (username, password) => `Basic ${Buffer.from(`${username}:${password}`, 'utf8').toString('base64')}`;

async function fetchJson(url, options, fetchImpl) {
  const response = await fetchImpl(url, { ...options, signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`Bounded provider or deployment metadata request failed with status ${response.status}.`);
  try { return await response.json(); } catch { throw new Error('Bounded provider or deployment metadata response was invalid.'); }
}

export async function discoverActiveMailjetSender({ env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const apiKey = required(env, 'MAILJET_API_KEY');
  const secretKey = required(env, 'MAILJET_SECRET_KEY');
  const apiBase = MAILJET_BASES.has(String(env.MAILJET_API_BASE || '').trim()) ? String(env.MAILJET_API_BASE).trim() : 'https://api.mailjet.com';
  const requestOptions = {
    method: 'GET',
    headers: { Accept: 'application/json', Authorization: basicAuthorization(apiKey, secretKey), 'Cache-Control': 'no-store' }
  };
  const senderPayload = await fetchJson(`${apiBase}/v3/REST/sender?Limit=1000`, requestOptions, fetchImpl);
  let metaPayload = null;
  try {
    metaPayload = await fetchJson(`${apiBase}/v3/REST/metasender?Limit=1000`, requestOptions, fetchImpl);
  } catch {}
  const senders = Array.isArray(senderPayload?.Data) ? senderPayload.Data : [];
  const metaSenders = Array.isArray(metaPayload?.Data) ? metaPayload.Data : [];
  const active = [
    ...senders.map(record => ({
      address: String(record?.Email || record?.SenderEmail || '').trim().toLowerCase(),
      active: ['active', 'validated'].includes(String(record?.Status || '').trim().toLowerCase()),
      isDefault: record?.IsDefaultSender === true || record?.IsDefaultSender === 1,
      source: 'sender'
    })),
    ...metaSenders.map(record => ({
      address: String(record?.Email || '').trim().toLowerCase(),
      active: record?.IsEnabled === true || record?.IsEnabled === 1 || String(record?.IsEnabled || '').toLowerCase() === 'true',
      isDefault: false,
      source: 'metasender'
    }))
  ].filter(record => record.active
    && !record.address.startsWith('*@')
    && !/@(?:[^@.]+\.)*pages\.dev$/i.test(record.address)
    && /^[^\s@<>]{1,64}@[^\s@<>]{1,190}\.[A-Za-z]{2,63}$/.test(record.address));
  const unique = [...new Map(active.map(record => [record.address, record])).values()];
  if (!unique.length) throw new Error('Mailjet has no Active individual sender available for production activation.');
  const configured = String(env.MAILJET_FROM_ADDRESS || '').trim().toLowerCase();
  unique.sort((left, right) => {
    const score = record => (record.address === configured ? 100 : 0)
      + (record.isDefault ? 20 : 0)
      + (record.source === 'sender' ? 5 : 0);
    return score(right) - score(left) || left.address.localeCompare(right.address);
  });
  const selected = unique[0];
  return Object.freeze({
    apiBase,
    address: selected.address,
    name: 'Admission Hub'
  });
}

export async function listWorkerSecretNames({ accountId, apiToken, fetchImpl = globalThis.fetch } = {}) {
  const payload = await fetchJson(
    `${CLOUDFLARE_API}/accounts/${encodeURIComponent(accountId)}/workers/scripts/${WORKER_NAME}/secrets`,
    { method: 'GET', headers: { Accept: 'application/json', Authorization: `Bearer ${apiToken}` } },
    fetchImpl
  );
  if (payload?.success !== true || !Array.isArray(payload.result)) throw new Error('Cloudflare secret inventory response was unsuccessful.');
  return new Set(payload.result.map(item => String(item?.name || '')).filter(Boolean));
}

export function productionEmailGatewayConfig() {
  const providerPolicies = Object.fromEntries(PROVIDERS.map((provider, index) => [provider, {
    enabled: provider === 'mailjet',
    priority: index + 1,
    weight: 1,
    dailyLimit: provider === 'mailjet' ? 200 : 0,
    monthlyLimit: provider === 'mailjet' ? 6000 : 0,
    timeoutMs: 6500,
    maxConcurrent: provider === 'mailjet' ? 5 : 1,
    emergency: false,
    costWeight: provider === 'mailjet' ? 0 : 100
  }]));
  return Object.freeze({
    environment: 'production',
    router: {
      mode: 'priority', maxProviderAttempts: 1, globalDeadlineMs: 9000,
      defaultProviderTimeoutMs: 6500, emergencyMaxAttempts: 0
    },
    providerPolicies
  });
}

export async function prepareProductionSecrets({ env = process.env, fetchImpl = globalThis.fetch, randomSecret = token } = {}) {
  for (const name of REQUIRED_MAILJET) required(env, name);
  const accountId = required(env, 'CLOUDFLARE_ACCOUNT_ID');
  const apiToken = required(env, 'CLOUDFLARE_API_TOKEN');
  const selected = await discoverActiveMailjetSender({ env, fetchImpl });
  const existing = await listWorkerSecretNames({ accountId, apiToken, fetchImpl });
  const config = productionEmailGatewayConfig();
  safeParseEmailGatewayConfig(JSON.stringify(config));

  const output = {
    MAILJET_API_KEY: required(env, 'MAILJET_API_KEY'),
    MAILJET_SECRET_KEY: required(env, 'MAILJET_SECRET_KEY'),
    MAILJET_API_BASE: selected.apiBase,
    MAILJET_FROM_ADDRESS: selected.address,
    MAILJET_FROM_NAME: selected.name,
    MAILJET_SENDER_VERIFIED: 'true',
    EMAIL_PROVIDER_ACTIVATION: 'enabled',
    EMAIL_GATEWAY_CONFIG: JSON.stringify(config)
  };
  for (const name of PRESERVED_SECRETS) if (!existing.has(name)) output[name] = randomSecret();
  return Object.freeze({
    secrets: Object.freeze(output),
    generated: Object.freeze(PRESERVED_SECRETS.filter(name => !existing.has(name))),
    reused: Object.freeze(PRESERVED_SECRETS.filter(name => existing.has(name)))
  });
}

async function main({ env = process.env, fetchImpl = globalThis.fetch, stdout = process.stdout } = {}) {
  const destination = required(env, 'AUTH_SECRET_BULK_FILE');
  const prepared = await prepareProductionSecrets({ env, fetchImpl });
  await writeFile(destination, `${JSON.stringify(prepared.secrets)}\n`, { mode: 0o600 });
  await chmod(destination, 0o600);
  stdout.write(`NATIVE_AUTH_ACTIVATION prepared=${Object.keys(prepared.secrets).length} generated=${prepared.generated.length} reused=${prepared.reused.length} mailjetSender=active-private-selection dailyLimit=200 monthlyLimit=6000 valuesPrinted=false\n`);
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (invokedPath === import.meta.url) {
  main().catch(error => {
    process.stderr.write(`::error title=Native Auth production secret preparation failed::${error.message}\n`);
    process.exitCode = 1;
  });
}
