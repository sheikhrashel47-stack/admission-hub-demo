import { pathToFileURL } from 'node:url';
import { inventoryCloudflareWorkerBindings } from '../../email-gateway/operations/inventory-cloudflare-bindings.mjs';

export async function verifyFirebaseWorkerBinding({ accountId, apiToken, scriptName = 'admission-gk', fetchImpl = globalThis.fetch } = {}) {
  const inventory = await inventoryCloudflareWorkerBindings({ accountId, apiToken, scriptName, fetchImpl });
  if (!inventory.names.includes('FIREBASE_WEB_API_KEY')) throw new Error('Firebase Worker binding is not installed.');
  return Object.freeze({ installed: true });
}

async function main({ env = process.env, stdout = process.stdout, stderr = process.stderr } = {}) {
  try {
    const result = await verifyFirebaseWorkerBinding({
      accountId: env.CLOUDFLARE_ACCOUNT_ID,
      apiToken: env.CLOUDFLARE_API_TOKEN,
      scriptName: env.CLOUDFLARE_WORKER_NAME || 'admission-gk'
    });
    stdout.write(`FIREBASE_WORKER_BINDING status=PASS installed=${result.installed} valuePrinted=false\n`);
  } catch {
    stderr.write('::error title=Firebase Worker binding check failed::required binding is absent or inventory access failed\n');
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (invokedPath === import.meta.url) main();
