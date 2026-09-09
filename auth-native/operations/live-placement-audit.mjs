import { randomBytes } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const FIREBASE_API = 'https://identitytoolkit.googleapis.com/v1';
const TESTER_API = 'https://mailtester.ai';
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const random = length => randomBytes(length).toString('hex');

class PlacementAuditError extends Error {
  constructor(stage, code = 'AUDIT_FAILED', status = 0) {
    super(code);
    this.stage = stage;
    this.code = code;
    this.status = status;
  }
}

async function requestJson(url, options = {}, stage = 'request') {
  let response;
  try {
    response = await fetch(url, { ...options, signal: AbortSignal.timeout(options.timeoutMs || 20_000) });
  } catch { throw new PlacementAuditError(stage, 'NETWORK'); }
  let body = {};
  try { body = await response.json(); } catch {}
  return { response, body };
}

const boundedNumber = (value, minimum = 0, maximum = 100) => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= minimum && number <= maximum ? number : null;
};

const boundedEnum = value => {
  const text = String(value || '').trim().toLowerCase();
  return text && text.length <= 40 && /^[a-z0-9 _.-]+$/.test(text) ? text : null;
};

const resultStatus = (results, type) => boundedEnum(results.find(item => item?.check_type === type)?.status) || 'unknown';

function providerPlacement(report, provider) {
  const allowed = new Set(['destination', 'placement', 'folder', 'category', 'status', 'score', 'percentage', 'inbox', 'promotions', 'spam', 'primary']);
  const seen = new Set();
  const queue = [{ value: report, depth: 0 }];
  while (queue.length) {
    const { value, depth } = queue.shift();
    if (!value || typeof value !== 'object' || seen.has(value) || depth > 7) continue;
    seen.add(value);
    for (const [key, child] of Object.entries(value)) {
      if (key.toLowerCase() === provider && child && typeof child === 'object') {
        const safe = {};
        for (const [signal, raw] of Object.entries(child)) {
          if (!allowed.has(signal.toLowerCase())) continue;
          const number = boundedNumber(raw);
          const text = boundedEnum(raw);
          if (number !== null) safe[signal] = number;
          else if (text) safe[signal] = text;
        }
        if (Object.keys(safe).length) return Object.freeze(safe);
      }
      if (child && typeof child === 'object') queue.push({ value: child, depth: depth + 1 });
    }
  }
  return null;
}

export function summarizePlacementReport(report = {}) {
  const technical = report?.technical_analysis || {};
  const results = Array.isArray(technical?.results) ? technical.results : [];
  const score = boundedNumber(technical?.view?.score?.value ?? report?.deliverability_score ?? technical?.total_score);
  const spamResult = results.find(item => item?.check_type === 'spamassassin');
  const spamDetails = spamResult?.details || {};
  const prediction = report?.ai_analysis?.ai_prediction || {};
  const placement = {
    inbox: boundedNumber(prediction.inbox),
    promotions: boundedNumber(prediction.promotions),
    spam: boundedNumber(prediction.spam),
    primary: boundedEnum(prediction.primary_destination),
    confidence: boundedEnum(prediction.confidence)
  };
  const safePlacement = Object.fromEntries(Object.entries(placement).filter(([, value]) => value !== null));
  return Object.freeze({
    status: boundedEnum(report?.status_info?.status) || 'unknown',
    score,
    authentication: Object.freeze({
      spf: resultStatus(results, 'SPF'),
      dkim: resultStatus(results, 'DKIM'),
      dmarc: resultStatus(results, 'DMARC')
    }),
    spamFilter: spamResult ? Object.freeze({
      status: boundedEnum(spamResult.status) || 'unknown',
      isSpam: Boolean(spamDetails.is_spam),
      score: boundedNumber(spamDetails.raw_spamassassin_score, -100, 100),
      threshold: boundedNumber(spamDetails.raw_required_score, 0, 100)
    }) : null,
    placement: Object.keys(safePlacement).length ? Object.freeze(safePlacement) : null,
    providers: Object.freeze({
      gmail: providerPlacement(report, 'gmail'),
      outlook: providerPlacement(report, 'outlook'),
      yahoo: providerPlacement(report, 'yahoo')
    })
  });
}

async function firebaseRequest(apiKey, path, body, stage) {
  return requestJson(`${FIREBASE_API}${path}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body)
  }, stage);
}

async function cleanup(apiKey, email, password) {
  if (!apiKey || !email || !password) return;
  try {
    const signed = await firebaseRequest(apiKey, '/accounts:signInWithPassword', {
      email, password, returnSecureToken: true
    }, 'cleanup-signin');
    if (!signed.response.ok || !signed.body?.idToken) return;
    await firebaseRequest(apiKey, '/accounts:delete', { idToken: signed.body.idToken }, 'cleanup-delete');
  } catch {}
}

async function waitForReport(mailbox, timeoutMs = 180_000) {
  const deadline = Date.now() + timeoutMs;
  let latest = null;
  while (Date.now() < deadline) {
    const result = await requestJson(`${TESTER_API}/api/report/${encodeURIComponent(mailbox)}`, {
      headers: { Accept: 'application/json' }
    }, 'report');
    if (result.response.ok) {
      latest = result.body;
      const status = String(latest?.status_info?.status || '');
      if (['technical_completed', 'ai_completed', 'ai_failed', 'completed'].includes(status) && latest?.technical_analysis) return latest;
    }
    await sleep(4000);
  }
  if (latest?.technical_analysis) return latest;
  throw new PlacementAuditError('report', 'REPORT_TIMEOUT');
}

export async function runLivePlacementAudit({
  base = process.env.AUTH_LIVE_BASE || 'https://admissionhub.pages.dev',
  apiKey = process.env.FIREBASE_WEB_API_KEY
} = {}) {
  const normalizedBase = String(base).replace(/\/+$/, '');
  const key = String(apiKey || '').trim();
  if (!/^https:\/\/[A-Za-z0-9.-]+$/.test(normalizedBase)) throw new PlacementAuditError('configuration', 'INVALID_BASE');
  if (!/^[A-Za-z0-9_-]{20,128}$/.test(key)) throw new PlacementAuditError('configuration', 'FIREBASE_KEY_MISSING');
  let email = '';
  let password = '';
  try {
    const mailbox = await requestJson(`${TESTER_API}/api/ai/mailbox`, { headers: { Accept: 'application/json' } }, 'mailbox');
    email = String(mailbox.body?.mailbox || '').trim().toLowerCase();
    const reportUrl = String(mailbox.body?.report_url || '');
    let reportHost = '';
    try { reportHost = new URL(reportUrl).hostname; } catch {}
    if (!mailbox.response.ok || !/^[^@\s]+@in\.mailtester\.ai$/.test(email) || reportHost !== 'mailtester.ai') {
      throw new PlacementAuditError('mailbox', 'MAILBOX_UNAVAILABLE', mailbox.response.status);
    }
    password = `${random(24)}Z!9`;
    const signup = await requestJson(`${normalizedBase}/api/auth/v1/signup`, {
      method: 'POST',
      headers: { Origin: normalizedBase, Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    }, 'signup');
    if (signup.response.status !== 202 || signup.body?.accountCreated !== true || signup.body?.verification?.sent !== true) {
      throw new PlacementAuditError('signup', String(signup.body?.error?.code || 'SIGNUP_FAILED').slice(0, 60), signup.response.status);
    }
    const report = await waitForReport(email);
    const summary = summarizePlacementReport(report);
    if (summary.score === null || summary.authentication.spf === 'unknown' || summary.authentication.dkim === 'unknown') {
      throw new PlacementAuditError('report', 'INCOMPLETE_TECHNICAL_REPORT');
    }
    return Object.freeze({ ok: true, summary });
  } finally {
    await cleanup(key, email, password);
  }
}

async function main({ stdout = process.stdout, stderr = process.stderr } = {}) {
  try {
    const result = await runLivePlacementAudit();
    stdout.write(`::notice title=Firebase inbox-placement audit::${JSON.stringify(result.summary)} credentialsPrinted=false mailboxPrinted=false reportUrlPrinted=false tokenPrinted=false\n`);
  } catch (error) {
    const safe = error instanceof PlacementAuditError ? error : new PlacementAuditError('unexpected');
    const code = String(safe.code || 'AUDIT_FAILED').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 80);
    stderr.write(`::error title=Firebase inbox-placement audit failed::stage=${safe.stage} status=${safe.status} code=${code}\n`);
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (invokedPath === import.meta.url) main();
