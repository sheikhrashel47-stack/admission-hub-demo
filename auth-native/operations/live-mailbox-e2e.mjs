import { randomBytes } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const MAILBOX_API = 'https://api.mail.tm';
const FIREBASE_API = 'https://identitytoolkit.googleapis.com/v1';
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const random = length => randomBytes(length).toString('hex');

class LiveCheckError extends Error {
  constructor(stage, status = 0, code = 'CHECK_FAILED') {
    super(code);
    this.stage = stage;
    this.status = status;
    this.code = code;
  }
}

async function jsonRequest(url, options = {}, stage = 'request') {
  let response;
  try {
    response = await fetch(url, { ...options, signal: AbortSignal.timeout(options.timeoutMs || 20_000) });
  } catch { throw new LiveCheckError(stage, 0, 'NETWORK'); }
  let body = {};
  try { body = await response.json(); } catch {}
  return { response, body };
}

const members = body => Array.isArray(body) ? body : Array.isArray(body?.['hydra:member']) ? body['hydra:member'] : [];

async function createMailbox() {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const domains = await jsonRequest(`${MAILBOX_API}/domains?page=1`, { headers: { Accept: 'application/json' } }, 'mailbox-domain');
    if (!domains.response.ok) throw new LiveCheckError('mailbox-domain', domains.response.status, 'MAILBOX_DOMAIN');
    const domain = members(domains.body).find(item => item?.isActive !== false)?.domain;
    if (!domain) throw new LiveCheckError('mailbox-domain', 0, 'NO_DOMAIN');
    const address = `ah-${random(8)}@${domain}`;
    const password = `${random(20)}A!7`;
    const account = await jsonRequest(`${MAILBOX_API}/accounts`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address, password })
    }, 'mailbox-account');
    if (!account.response.ok) { await sleep(1200); continue; }
    const auth = await jsonRequest(`${MAILBOX_API}/token`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address, password })
    }, 'mailbox-token');
    if (!auth.response.ok || !auth.body?.token || !account.body?.id) throw new LiveCheckError('mailbox-token', auth.response.status, 'MAILBOX_TOKEN');
    return { address, token: auth.body.token, id: account.body.id };
  }
  throw new LiveCheckError('mailbox-account', 0, 'MAILBOX_CREATE');
}

const decodeHtml = value => String(value || '')
  .replace(/&amp;/gi, '&')
  .replace(/&#0*38;/gi, '&')
  .replace(/&#x0*26;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#0*39;|&apos;/gi, "'");

export function verificationAction(content) {
  const decoded = decodeHtml(content);
  const candidates = decoded.match(/https?:\/\/[^\s"'<>]+/gi) || [];
  for (const candidate of candidates) {
    let value = candidate.replace(/[),.;]+$/, '');
    for (let depth = 0; depth < 3; depth += 1) {
      try {
        const url = new URL(value);
        if (url.searchParams.get('mode') === 'verifyEmail' && url.searchParams.get('oobCode')) {
          return {
            oobCode: url.searchParams.get('oobCode'),
            continueUrl: url.searchParams.get('continueUrl') || ''
          };
        }
        const nested = ['continue', 'url', 'q'].map(name => url.searchParams.get(name)).find(Boolean);
        if (!nested) break;
        value = decodeURIComponent(nested);
      } catch { break; }
    }
  }
  return null;
}

async function readVerificationAction(mailbox, timeoutMs = 180_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const list = await jsonRequest(`${MAILBOX_API}/messages?page=1`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${mailbox.token}` }
    }, 'mailbox-poll');
    if (list.response.ok) {
      for (const summary of members(list.body)) {
        const detail = await jsonRequest(`${MAILBOX_API}/messages/${encodeURIComponent(summary.id)}`, {
          headers: { Accept: 'application/json', Authorization: `Bearer ${mailbox.token}` }
        }, 'mailbox-read');
        if (!detail.response.ok) continue;
        const content = `${detail.body?.text || ''} ${Array.isArray(detail.body?.html) ? detail.body.html.join(' ') : detail.body?.html || ''}`;
        const action = verificationAction(content);
        if (action) return action;
      }
    }
    await sleep(3000);
  }
  throw new LiveCheckError('mailbox-poll', 0, 'VERIFICATION_EMAIL_NOT_RECEIVED');
}

const cookiePair = (response, name) => {
  const value = String(response.headers.get('set-cookie') || '');
  const match = value.match(new RegExp(`(?:^|,\\s*)(${name}=[^;]*)`));
  return match?.[1] || '';
};

async function appRequest(base, path, { method = 'GET', body, cookie = '' } = {}) {
  return jsonRequest(`${base}${path}`, {
    method,
    headers: {
      Origin: base,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  }, `app-${path}`);
}

async function firebaseRequest(apiKey, path, body, stage) {
  return jsonRequest(`${FIREBASE_API}${path}?key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body)
  }, stage);
}

async function deleteFirebaseAccount(apiKey, email, password) {
  if (!apiKey || !email || !password) return;
  try {
    const signed = await firebaseRequest(apiKey, '/accounts:signInWithPassword', {
      email, password, returnSecureToken: true
    }, 'cleanup-signin');
    if (!signed.response.ok || !signed.body?.idToken) return;
    await firebaseRequest(apiKey, '/accounts:delete', { idToken: signed.body.idToken }, 'cleanup-delete');
  } catch {}
}

export async function runLiveMailboxE2E({
  base = process.env.AUTH_LIVE_BASE || 'https://admissionhub.pages.dev',
  apiKey = process.env.FIREBASE_WEB_API_KEY
} = {}) {
  const normalizedBase = String(base).replace(/\/+$/, '');
  const key = String(apiKey || '').trim();
  if (!/^https:\/\/[A-Za-z0-9.-]+$/.test(normalizedBase)) throw new LiveCheckError('configuration', 0, 'INVALID_BASE');
  if (!/^[A-Za-z0-9_-]{20,128}$/.test(key)) throw new LiveCheckError('configuration', 0, 'FIREBASE_KEY_MISSING');
  let mailbox;
  let accountPassword = '';
  try {
    let config = null;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      config = await appRequest(normalizedBase, '/api/auth/v1/config');
      if (config.response.ok && config.body?.auth?.version === 'firebase-email-password-v1' && config.body?.auth?.available === true) break;
      await sleep(5000);
    }
    if (!config?.response?.ok || config.body?.auth?.version !== 'firebase-email-password-v1' || config.body?.auth?.available !== true) {
      throw new LiveCheckError(
        'config',
        config?.body?.auth?.providerStatus || config?.response?.status || 0,
        config?.body?.auth?.availabilityCode || config?.body?.error?.code || 'CONFIG'
      );
    }
    if (config.body?.auth?.verificationEmail?.dailyCapacity !== 1000 || config.body?.auth?.registeredAccountLimit !== 'unlimited') {
      throw new LiveCheckError('config', 0, 'QUOTA_CONTRACT');
    }

    mailbox = await createMailbox();
    accountPassword = `${random(24)}Z!9`;
    const signup = await appRequest(normalizedBase, '/api/auth/v1/signup', {
      method: 'POST', body: { email: mailbox.address, password: accountPassword }
    });
    if (signup.response.status !== 202 || signup.body?.accountCreated !== true || signup.body?.verification?.sent !== true) {
      throw new LiveCheckError('signup', signup.response.status, signup.body?.error?.code || 'SIGNUP');
    }
    if (signup.body?.authenticated !== false || cookiePair(signup.response, '__Host-ah_session')) {
      throw new LiveCheckError('signup', 0, 'UNVERIFIED_SESSION_ISSUED');
    }
    if (JSON.stringify(signup.body).toLowerCase().includes(mailbox.address.toLowerCase())) {
      throw new LiveCheckError('signup', 0, 'RAW_EMAIL_EXPOSED');
    }
    const device = cookiePair(signup.response, '__Host-ah_device');
    if (!device) throw new LiveCheckError('signup', 0, 'DEVICE_COOKIE_MISSING');

    const denied = await appRequest(normalizedBase, '/api/auth/v1/login', {
      method: 'POST', cookie: device, body: { email: mailbox.address, password: accountPassword }
    });
    if (denied.response.status !== 403 || denied.body?.error?.code !== 'EMAIL_NOT_VERIFIED' || cookiePair(denied.response, '__Host-ah_session')) {
      throw new LiveCheckError(
        'verified-gate',
        denied.response.status,
        denied.response.headers.get('x-ah-auth-diagnostic') || denied.body?.error?.code || 'UNVERIFIED_ACCESS'
      );
    }

    const action = await readVerificationAction(mailbox);
    if (!action.oobCode) throw new LiveCheckError('verification-link', 0, 'CODE_MISSING');
    if (action.continueUrl) {
      let continueHost = '';
      try { continueHost = new URL(action.continueUrl).hostname; } catch {}
      if (continueHost !== 'admissionhub.pages.dev') throw new LiveCheckError('verification-link', 0, 'CONTINUE_URL_MISMATCH');
    }
    const confirmed = await firebaseRequest(key, '/accounts:update', { oobCode: action.oobCode }, 'verification-confirm');
    if (!confirmed.response.ok || !confirmed.body?.localId) {
      throw new LiveCheckError('verification-confirm', confirmed.response.status, confirmed.body?.error?.message || 'CONFIRM_FAILED');
    }

    const login = await appRequest(normalizedBase, '/api/auth/v1/login', {
      method: 'POST', cookie: device, body: { email: mailbox.address, password: accountPassword }
    });
    if (!login.response.ok || login.body?.authenticated !== true || login.body?.emailVerified !== true || !login.body?.user?.id) {
      throw new LiveCheckError('login', login.response.status, login.body?.error?.code || 'LOGIN');
    }
    if (/sessionToken|refreshToken|idToken/i.test(JSON.stringify(login.body))) throw new LiveCheckError('login', 0, 'CREDENTIAL_EXPOSED');
    const session = cookiePair(login.response, '__Host-ah_session');
    const firebase = cookiePair(login.response, '__Host-ah_firebase');
    const setCookie = String(login.response.headers.get('set-cookie') || '');
    if (!session || !firebase || !/HttpOnly/i.test(setCookie) || !/Secure/i.test(setCookie) || !/SameSite=Strict/i.test(setCookie)) {
      throw new LiveCheckError('login', 0, 'SESSION_COOKIE_POLICY');
    }

    const current = await appRequest(normalizedBase, '/api/auth/v1/session', { cookie: `${session}; ${firebase}; ${device}` });
    if (!current.response.ok || current.body?.emailVerified !== true || current.body?.user?.id !== login.body.user.id) {
      throw new LiveCheckError('session', current.response.status, current.body?.error?.code || 'SESSION');
    }

    const logout = await appRequest(normalizedBase, '/api/auth/v1/session/logout', {
      method: 'POST', cookie: `${session}; ${firebase}`, body: {}
    });
    if (!logout.response.ok || !/Max-Age=0/i.test(String(logout.response.headers.get('set-cookie') || ''))) {
      throw new LiveCheckError('logout', logout.response.status, logout.body?.error?.code || 'LOGOUT');
    }
    const after = await appRequest(normalizedBase, '/api/auth/v1/session', { cookie: `${session}; ${firebase}` });
    if (after.response.status !== 401) throw new LiveCheckError('logout-check', after.response.status, 'SESSION_STILL_ACTIVE');

    return Object.freeze({ ok: true, delivery: 'firebase-external-inbox', verifiedGate: 'enforced', session: 'verified', logout: 'revoked' });
  } finally {
    await deleteFirebaseAccount(key, mailbox?.address, accountPassword);
    if (mailbox?.id && mailbox?.token) {
      try {
        await fetch(`${MAILBOX_API}/accounts/${encodeURIComponent(mailbox.id)}`, {
          method: 'DELETE', headers: { Authorization: `Bearer ${mailbox.token}` }, signal: AbortSignal.timeout(10_000)
        });
      } catch {}
    }
  }
}

async function main({ stdout = process.stdout, stderr = process.stderr } = {}) {
  try {
    const result = await runLiveMailboxE2E();
    stdout.write(`FIREBASE_AUTH_LIVE_E2E status=PASS delivery=${result.delivery} verifiedGate=${result.verifiedGate} session=${result.session} logout=${result.logout} credentialsPrinted=false\n`);
  } catch (error) {
    const safe = error instanceof LiveCheckError ? error : new LiveCheckError('unexpected');
    const code = String(safe.code || 'CHECK_FAILED').split(/\s*:\s*/, 1)[0].replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 80);
    stderr.write(`::error title=Firebase Auth live E2E failed::stage=${safe.stage} status=${safe.status} code=${code}\n`);
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (invokedPath === import.meta.url) main();
