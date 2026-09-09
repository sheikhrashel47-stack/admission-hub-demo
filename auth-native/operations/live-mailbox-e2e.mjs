import { randomBytes } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const MAILBOX_API = 'https://api.mail.tm';
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

async function readOtp(mailbox, timeoutMs = 150_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const list = await jsonRequest(`${MAILBOX_API}/messages?page=1`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${mailbox.token}` }
    }, 'mailbox-poll');
    if (list.response.ok) {
      const messages = members(list.body).filter(item => /admission hub/i.test(String(item?.subject || '')));
      for (const summary of messages) {
        const detail = await jsonRequest(`${MAILBOX_API}/messages/${encodeURIComponent(summary.id)}`, {
          headers: { Accept: 'application/json', Authorization: `Bearer ${mailbox.token}` }
        }, 'mailbox-read');
        if (!detail.response.ok) continue;
        const content = `${detail.body?.text || ''} ${Array.isArray(detail.body?.html) ? detail.body.html.join(' ') : detail.body?.html || ''}`
          .replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ');
        const match = content.match(/(?:কোড|code)[^0-9]{0,120}([0-9]{6})/i);
        if (match) return match[1];
      }
    }
    await sleep(3000);
  }
  throw new LiveCheckError('mailbox-poll', 0, 'OTP_NOT_RECEIVED');
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

export async function runLiveMailboxE2E({ base = process.env.AUTH_LIVE_BASE || 'https://admissionhub.pages.dev' } = {}) {
  const normalizedBase = String(base).replace(/\/+$/, '');
  if (!/^https:\/\/[A-Za-z0-9.-]+$/.test(normalizedBase)) throw new LiveCheckError('configuration', 0, 'INVALID_BASE');
  let mailbox;
  try {
    let config = null;
    for (let attempt = 0; attempt < 12; attempt += 1) {
      config = await appRequest(normalizedBase, '/api/auth/v1/config');
      if (config.response.ok && config.body?.auth?.version === 'cloudflare-native-v1') break;
      await sleep(5000);
    }
    if (!config?.response?.ok || config.body?.auth?.version !== 'cloudflare-native-v1') throw new LiveCheckError('config', config?.response?.status || 0, config?.body?.error?.code || 'CONFIG');
    if (config.body?.auth?.deliveryLimit?.daily !== 200 || config.body?.auth?.deliveryLimit?.monthly !== 6000) throw new LiveCheckError('config', 0, 'QUOTA_CONTRACT');

    mailbox = await createMailbox();
    const requested = await appRequest(normalizedBase, '/api/auth/v1/otp/request', {
      method: 'POST', body: { email: mailbox.address }
    });
    if (requested.response.status !== 202 || !requested.body?.challenge?.id) {
      throw new LiveCheckError('otp-request', requested.response.status, requested.body?.error?.code || 'OTP_REQUEST');
    }
    if (JSON.stringify(requested.body).toLowerCase().includes(mailbox.address.toLowerCase())) throw new LiveCheckError('otp-request', 0, 'RAW_EMAIL_EXPOSED');
    const challengeId = requested.body.challenge.id;
    const device = cookiePair(requested.response, '__Host-ah_device');
    if (!device) throw new LiveCheckError('otp-request', 0, 'DEVICE_COOKIE_MISSING');

    const otp = await readOtp(mailbox);
    const verified = await appRequest(normalizedBase, '/api/auth/v1/otp/verify', {
      method: 'POST', cookie: device,
      body: { email: mailbox.address, challengeId, code: otp }
    });
    if (!verified.response.ok || verified.body?.authenticated !== true || !verified.body?.user?.id) {
      throw new LiveCheckError('otp-verify', verified.response.status, verified.body?.error?.code || 'OTP_VERIFY');
    }
    const setCookie = String(verified.response.headers.get('set-cookie') || '');
    if (!/^__Host-ah_session=[A-Za-z0-9_-]+;/i.test(setCookie)
      || !/HttpOnly/i.test(setCookie) || !/Secure/i.test(setCookie)
      || !/SameSite=Strict/i.test(setCookie) || !/Path=\//i.test(setCookie)) {
      throw new LiveCheckError('otp-verify', 0, 'SESSION_COOKIE_POLICY');
    }
    if (/sessionToken/i.test(JSON.stringify(verified.body))) throw new LiveCheckError('otp-verify', 0, 'SESSION_TOKEN_EXPOSED');
    const session = cookiePair(verified.response, '__Host-ah_session');

    const current = await appRequest(normalizedBase, '/api/auth/v1/session', { cookie: `${session}; ${device}` });
    if (!current.response.ok || current.body?.user?.id !== verified.body.user.id) throw new LiveCheckError('session', current.response.status, current.body?.error?.code || 'SESSION');

    const replay = await appRequest(normalizedBase, '/api/auth/v1/otp/verify', {
      method: 'POST', cookie: device,
      body: { email: mailbox.address, challengeId, code: otp }
    });
    if (replay.response.status !== 409 || replay.body?.error?.code !== 'OTP_USED') throw new LiveCheckError('replay', replay.response.status, replay.body?.error?.code || 'REPLAY_ACCEPTED');

    const logout = await appRequest(normalizedBase, '/api/auth/v1/session/logout', { method: 'POST', cookie: session, body: {} });
    if (!logout.response.ok || !/Max-Age=0/i.test(String(logout.response.headers.get('set-cookie') || ''))) throw new LiveCheckError('logout', logout.response.status, logout.body?.error?.code || 'LOGOUT');
    const after = await appRequest(normalizedBase, '/api/auth/v1/session', { cookie: session });
    if (after.response.status !== 401) throw new LiveCheckError('logout-check', after.response.status, 'SESSION_STILL_ACTIVE');
    return Object.freeze({ ok: true, delivery: 'external-inbox', otp: 'verified-not-printed', replay: 'rejected', logout: 'revoked' });
  } finally {
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
    stdout.write(`NATIVE_AUTH_LIVE_E2E status=PASS delivery=${result.delivery} otp=${result.otp} replay=${result.replay} logout=${result.logout} credentialsPrinted=false\n`);
  } catch (error) {
    const safe = error instanceof LiveCheckError ? error : new LiveCheckError('unexpected');
    stderr.write(`::error title=Native Auth live E2E failed::stage=${safe.stage} status=${safe.status} code=${safe.code}\n`);
    process.exitCode = 1;
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (invokedPath === import.meta.url) main();
