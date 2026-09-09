import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const script = readFileSync(new URL('./account-access.js', import.meta.url), 'utf8');
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

const reply = (status, body, headers = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: name => headers[String(name).toLowerCase()] || null },
  async json() { return body; }
});

async function waitFor(predicate, timeout = 1000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (predicate()) return;
    await sleep(5);
  }
  throw new Error('Timed out waiting for UI state.');
}

function setup({ loginVerified = false } = {}) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'https://admissionhub.pages.dev/',
    runScripts: 'dangerously',
    pretendToBeVisual: true
  });
  const calls = [];
  let verified = loginVerified;
  dom.window.fetch = async (url, options = {}) => {
    const path = String(url);
    const body = options.body ? JSON.parse(options.body) : null;
    calls.push({ path, method: options.method || 'GET', body });
    if (path.endsWith('/config')) return reply(200, { auth: { available: true } });
    if (path.endsWith('/session') && (options.method || 'GET') === 'GET') {
      return reply(401, { error: { code: 'SESSION_INVALID', message: 'সেশন নেই।' } });
    }
    if (path.endsWith('/signup')) {
      return reply(202, {
        accountCreated: true,
        authenticated: false,
        verification: { sent: true, emailMasked: 's***@example.com', dailyCapacity: 1000 }
      });
    }
    if (path.endsWith('/login')) {
      if (!verified) return reply(403, { error: { code: 'EMAIL_NOT_VERIFIED', message: 'ইমেইল যাচাই করুন।' } });
      return reply(200, {
        authenticated: true,
        emailVerified: true,
        user: { id: 'usr_test', emailMasked: 's***@example.com', status: 'active' },
        session: { expiresAt: Date.now() + 100000 }
      });
    }
    if (path.endsWith('/verification/resend')) {
      return reply(202, { authenticated: false, verification: { sent: true, emailMasked: 's***@example.com' } });
    }
    if (path.endsWith('/session/logout')) return reply(200, { authenticated: false });
    return reply(404, { error: { message: 'not found' } });
  };
  dom.window.eval(script);
  return { dom, window: dom.window, document: dom.window.document, calls, setVerified: value => { verified = value; } };
}

test('signup UI collects Email and Password, clears passwords, and waits for standard verification', async () => {
  const app = setup();
  await waitFor(() => app.document.querySelector('.ah-account-launcher'));
  await waitFor(() => app.calls.some(call => call.path.endsWith('/config')));
  await sleep(0);
  app.document.querySelector('.ah-account-launcher').click();
  app.document.querySelector('[data-role="show-signup"]').click();
  app.document.querySelector('#ah-signup-email').value = 'student@example.com';
  app.document.querySelector('#ah-signup-password').value = 'Secure-password-44';
  app.document.querySelector('#ah-signup-confirm').value = 'Secure-password-44';
  app.document.querySelector('[data-view="signup"]').dispatchEvent(new app.window.Event('submit', { bubbles: true, cancelable: true }));
  await waitFor(() => app.calls.some(call => call.path.endsWith('/signup')));
  await waitFor(() => app.document.querySelector('[data-view="verify"]').hidden === false);

  const signupCall = app.calls.find(call => call.path.endsWith('/signup'));
  assert.deepEqual(signupCall.body, { email: 'student@example.com', password: 'Secure-password-44' });
  assert.equal(app.document.querySelector('#ah-signup-password').value, '');
  assert.equal(app.document.querySelector('#ah-signup-confirm').value, '');
  assert.equal(app.window.AdmissionAccount.isVerified(), false);
  assert.match(app.document.querySelector('[data-view="verify"]').textContent, /ইমেইল যাচাই করুন/);
  app.dom.window.close();
});

test('UI blocks unverified login and exposes verified state only after server-confirmed login', async () => {
  const app = setup();
  let latestAuth = null;
  app.window.addEventListener('admissionhub:authchange', event => { latestAuth = event.detail; });
  await waitFor(() => app.document.querySelector('.ah-account-launcher'));
  await waitFor(() => app.calls.some(call => call.path.endsWith('/config')));
  await sleep(0);
  app.document.querySelector('.ah-account-launcher').click();
  app.document.querySelector('#ah-login-email').value = 'student@example.com';
  app.document.querySelector('#ah-login-password').value = 'Secure-password-44';
  app.document.querySelector('[data-view="login"]').dispatchEvent(new app.window.Event('submit', { bubbles: true, cancelable: true }));
  await waitFor(() => app.document.querySelector('[data-view="verify"]').hidden === false);
  assert.equal(app.window.AdmissionAccount.isVerified(), false);
  assert.equal(app.document.querySelector('#ah-login-password').value, '');

  app.setVerified(true);
  app.document.querySelector('[data-role="verified-login"]').click();
  app.document.querySelector('#ah-login-password').value = 'Secure-password-44';
  app.document.querySelector('[data-view="login"]').dispatchEvent(new app.window.Event('submit', { bubbles: true, cancelable: true }));
  await waitFor(() => app.document.querySelector('[data-view="signed"]').hidden === false);
  assert.equal(app.window.AdmissionAccount.isVerified(), true);
  assert.equal(latestAuth.authenticated, true);
  assert.equal(latestAuth.emailVerified, true);
  assert.equal(app.document.querySelector('.ah-account-launcher').dataset.authenticated, 'true');
  app.dom.window.close();
});
