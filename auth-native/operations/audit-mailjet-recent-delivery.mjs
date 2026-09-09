import { pathToFileURL } from 'node:url';

const MAILJET_BASES = new Set(['https://api.mailjet.com', 'https://api.us.mailjet.com']);
const WINDOW_MS = 6 * 60 * 60 * 1000;

const required = (env, name) => {
  const value = String(env[name] || '').trim();
  if (!value) throw new Error(`Required environment value is missing: ${name}.`);
  return value;
};

const basicAuthorization = (username, password) =>
  `Basic ${Buffer.from(`${username}:${password}`, 'utf8').toString('base64')}`;

function bucket(status) {
  const value = String(status || '').trim().toLowerCase();
  if (['sent', 'delivered', 'opened', 'clicked'].includes(value)) return 'delivered';
  if (['queued', 'pending', 'processing', 'prequeued', 'unknown'].includes(value)) return 'queued';
  if (['blocked', 'spam', 'unsub'].includes(value)) return 'blocked';
  if (['bounce', 'bounced', 'hard_bounce', 'soft_bounce', 'failed'].includes(value)) return 'bounced';
  if (['retrying', 'deferred', 'throttled'].includes(value)) return 'retrying';
  return 'other';
}

export async function auditRecentMailjetDelivery({ env = process.env, fetchImpl = globalThis.fetch, now = Date.now() } = {}) {
  const apiKey = required(env, 'MAILJET_API_KEY');
  const secretKey = required(env, 'MAILJET_SECRET_KEY');
  const apiBase = MAILJET_BASES.has(String(env.MAILJET_API_BASE || '').trim())
    ? String(env.MAILJET_API_BASE).trim()
    : 'https://api.mailjet.com';
  let response;
  try {
    response = await fetchImpl(`${apiBase}/v3/REST/message?Limit=100&Sort=ArrivedAt%20DESC&ShowContactAlt=false&ShowSubject=false`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: basicAuthorization(apiKey, secretKey),
        'Cache-Control': 'no-store'
      },
      signal: AbortSignal.timeout(15_000)
    });
  } catch {
    throw new Error('Mailjet recent-delivery metadata was unreachable.');
  }
  if (!response.ok) throw new Error(`Mailjet recent-delivery metadata failed with status ${response.status}.`);
  let payload;
  try { payload = await response.json(); }
  catch { throw new Error('Mailjet recent-delivery metadata was invalid.'); }
  const cutoff = now - WINDOW_MS;
  const records = (Array.isArray(payload?.Data) ? payload.Data : []).filter(record => {
    const arrived = Date.parse(String(record?.ArrivedAt || ''));
    return Number.isFinite(arrived) && arrived >= cutoff && arrived <= now + 60_000;
  });
  const counts = { delivered: 0, queued: 0, blocked: 0, bounced: 0, retrying: 0, other: 0 };
  for (const record of records) counts[bucket(record?.Status)] += 1;
  return Object.freeze({ recent: records.length, ...counts });
}

async function main({ env = process.env, stdout = process.stdout } = {}) {
  const result = await auditRecentMailjetDelivery({ env });
  stdout.write(`MAILJET_DELIVERY_AUDIT recent=${result.recent} delivered=${result.delivered} queued=${result.queued} blocked=${result.blocked} bounced=${result.bounced} retrying=${result.retrying} other=${result.other} windowHours=6 readOnly=true valuesPrinted=false\n`);
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (invokedPath === import.meta.url) {
  main().catch(error => {
    process.stderr.write(`::error title=Mailjet recent-delivery audit failed::${error.message}\n`);
    process.exitCode = 1;
  });
}
