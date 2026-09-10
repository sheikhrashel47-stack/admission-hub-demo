import { pathToFileURL } from 'node:url';
import { inventoryCloudflareWorkerBindings } from '../../email-gateway/operations/inventory-cloudflare-bindings.mjs';

const REQUIRED_BINDINGS = Object.freeze(['AUTH_HMAC_SECRET', 'FIREBASE_WEB_API_KEY', 'TG_BOT_TOKEN']);

export function summarizeTelegramBindings(names = []) {
  const installed = new Set(Array.isArray(names) ? names : []);
  const requirements = Object.fromEntries(REQUIRED_BINDINGS.map(name => [name, installed.has(name)]));
  return Object.freeze({
    ready: REQUIRED_BINDINGS.every(name => requirements[name]),
    authAuthority: requirements.AUTH_HMAC_SECRET,
    firebaseAuthority: requirements.FIREBASE_WEB_API_KEY,
    botCredential: requirements.TG_BOT_TOKEN,
    valuesRead: false
  });
}

export async function verifyTelegramBindings({ accountId, apiToken, scriptName = 'admission-gk', fetchImpl = globalThis.fetch } = {}) {
  const inventory = await inventoryCloudflareWorkerBindings({ accountId, apiToken, scriptName, fetchImpl });
  const result = summarizeTelegramBindings(inventory.names);
  if (!result.ready) throw new Error('REQUIRED_BINDING_ABSENT');
  return result;
}

async function main({ env = process.env, stdout = process.stdout, stderr = process.stderr } = {}) {
  try {
    const result = await verifyTelegramBindings({
      accountId: env.CLOUDFLARE_ACCOUNT_ID,
      apiToken: env.CLOUDFLARE_API_TOKEN,
      scriptName: env.CLOUDFLARE_WORKER_NAME || 'admission-gk'
    });
    stdout.write(`TELEGRAM_BINDINGS status=READY authAuthority=${result.authAuthority} firebaseAuthority=${result.firebaseAuthority} botCredential=${result.botCredential} valuesRead=${result.valuesRead} namesPrinted=false\n`);
  } catch (cause) {
    const code = String(cause?.message || 'BINDING_CHECK_FAILED').toUpperCase().replace(/[^A-Z0-9_-]/g, '_').slice(0, 80);
    stderr.write(`::error title=Telegram binding check failed::code=${code} valuesRead=false namesPrinted=false\n`);
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (invokedPath === import.meta.url) main();
