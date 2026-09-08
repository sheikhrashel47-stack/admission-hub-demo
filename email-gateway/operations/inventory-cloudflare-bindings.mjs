import { pathToFileURL } from 'node:url';

const ACTIVE_TRANSACTIONAL_PREFIXES = Object.freeze([
  'RESEND', 'BREVO', 'MAILJET', 'MAILTRAP', 'MAILERSEND', 'SENDPULSE', 'COURIER'
]);

export const REQUIRED_EMAIL_GATEWAY_BINDINGS = Object.freeze([
  'EMAIL_GATEWAY_CONFIG',
  'EMAIL_GATEWAY_SIGNING_SECRET',
  'EMAIL_PROVIDER_ACTIVATION',
  'EMAIL_RECIPIENT_HASH_PEPPER',
  ...ACTIVE_TRANSACTIONAL_PREFIXES.flatMap(prefix => [
    `${prefix}_API_KEY`,
    `${prefix}_FROM_ADDRESS`,
    `${prefix}_FROM_NAME`,
    `${prefix}_SENDER_VERIFIED`
  ]),
  'MAILJET_SECRET_KEY'
].sort());

const bindingName = value => typeof value === 'string' && /^[A-Z][A-Z0-9_]{0,127}$/.test(value);

export function summarizeWorkerSecretBindings(payload) {
  const records = Array.isArray(payload?.result) ? payload.result : [];
  const names = [...new Set(records.map(record => record?.name).filter(bindingName))].sort();
  const nameSet = new Set(names);
  const missingRequiredNames = REQUIRED_EMAIL_GATEWAY_BINDINGS.filter(name => !nameSet.has(name));
  return Object.freeze({
    names: Object.freeze(names),
    missingRequiredNames: Object.freeze(missingRequiredNames),
    requiredBindingNamesComplete: missingRequiredNames.length === 0
  });
}

export async function inventoryCloudflareWorkerBindings({
  accountId,
  apiToken,
  scriptName = 'admission-gk',
  fetchImpl = globalThis.fetch
} = {}) {
  if (!accountId || !apiToken) throw new Error('Required Cloudflare deployment credential is not available.');
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(scriptName)) throw new Error('Worker script name is invalid.');
  if (typeof fetchImpl !== 'function') throw new Error('A fetch implementation is required.');

  const endpoint = `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/workers/scripts/${encodeURIComponent(scriptName)}/secrets`;
  const response = await fetchImpl(endpoint, {
    method: 'GET',
    headers: { Authorization: `Bearer ${apiToken}`, Accept: 'application/json' },
    signal: AbortSignal.timeout(15_000)
  });
  if (!response.ok) throw new Error(`Cloudflare binding inventory request failed (HTTP ${response.status}).`);
  const payload = await response.json();
  if (payload?.success !== true) throw new Error('Cloudflare binding inventory response was unsuccessful.');
  return summarizeWorkerSecretBindings(payload);
}

async function main({ env = process.env, stdout = process.stdout } = {}) {
  const summary = await inventoryCloudflareWorkerBindings({
    accountId: env.CLOUDFLARE_ACCOUNT_ID,
    apiToken: env.CLOUDFLARE_API_TOKEN,
    scriptName: env.CLOUDFLARE_WORKER_NAME || 'admission-gk'
  });
  const present = summary.names.length ? summary.names.join(', ') : 'none';
  stdout.write(`::notice title=Worker secret binding names::${present}\n`);
  if (!summary.requiredBindingNamesComplete) {
    stdout.write(`::warning title=Email Gateway activation prerequisites incomplete::Missing required binding names: ${summary.missingRequiredNames.join(', ')}\n`);
    if (env.EMAIL_GATEWAY_REQUIRE_COMPLETE_BINDINGS === 'true') {
      throw new Error(`Required Worker binding names remain missing: ${summary.missingRequiredNames.join(', ')}`);
    }
  } else {
    stdout.write('::notice title=Email Gateway binding-name prerequisite::All required binding names are present; provider account and sender validation are still required.\n');
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (invokedPath === import.meta.url) {
  main().catch(error => {
    process.stderr.write(`::error title=Worker binding inventory failed::${error.message}\n`);
    process.exitCode = 1;
  });
}
