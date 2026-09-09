import { pathToFileURL } from 'node:url';
import { inventoryCloudflareWorkerBindings } from '../../email-gateway/operations/inventory-cloudflare-bindings.mjs';

export async function inspectFirebaseWorkerBinding({ accountId, apiToken, scriptName = 'admission-gk', fetchImpl = globalThis.fetch } = {}) {
  const inventory = await inventoryCloudflareWorkerBindings({ accountId, apiToken, scriptName, fetchImpl });
  return Object.freeze({ installed: inventory.names.includes('FIREBASE_WEB_API_KEY') });
}

export async function verifyFirebaseWorkerBinding(options = {}) {
  const result = await inspectFirebaseWorkerBinding(options);
  if (!result.installed) throw new Error('Firebase Worker binding is not installed.');
  return result;
}

async function main({ env = process.env, stdout = process.stdout, stderr = process.stderr } = {}) {
  try {
    const result = await inspectFirebaseWorkerBinding({
      accountId: env.CLOUDFLARE_ACCOUNT_ID,
      apiToken: env.CLOUDFLARE_API_TOKEN,
      scriptName: env.CLOUDFLARE_WORKER_NAME || 'admission-gk'
    });
    const expected = env.FIREBASE_WORKER_BINDING_EXPECT || 'present';
    if (expected === 'present' && !result.installed) throw new Error('BINDING_ABSENT');
    if (expected === 'absent' && result.installed) throw new Error('BINDING_ALREADY_PRESENT');
    if (!['present', 'absent'].includes(expected)) throw new Error('EXPECTATION_INVALID');
    stdout.write(`FIREBASE_WORKER_BINDING status=PASS installed=${result.installed} expectation=${expected} valuePrinted=false\n`);
  } catch (error) {
    const code = String(error?.message || 'BINDING_CHECK_FAILED').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 80);
    stderr.write(`::error title=Firebase Worker binding check failed::code=${code}\n`);
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (invokedPath === import.meta.url) main();
