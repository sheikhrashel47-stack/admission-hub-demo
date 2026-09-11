import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';

const read = name => readFileSync(new URL(`./${name}`, import.meta.url), 'utf8');
const JS = read('account-access.js');
const CSS = read('account-access.css');
const DASH_JS = read('dashboard-v2.js');
const DASH_CSS = read('dashboard-v2.css');
const NAV_JS = read('phase12-ui.js');
const HTML = read('index.html');
const SW = read('sw.js');
const PAGES_GUARD = read('.github/workflows/cf-pages.yml');
const RELEASE_WORKFLOW = read('.github/workflows/telegram-auth-canary-activate.yml');

const between = (source, start, end) => {
  const from = source.indexOf(start);
  assert.notEqual(from, -1, `missing start marker: ${start}`);
  const to = source.indexOf(end, from + start.length);
  assert.notEqual(to, -1, `missing end marker: ${end}`);
  return source.slice(from, to);
};

test('reference visual contract owns one narrow mobile onboarding state machine', () => {
  assert.match(JS, /data-visual-contract="reference-onboarding-v2"/);
  assert.match(CSS, /supplied 18-screen mint\/emerald narrow-phone system is the visual source of truth/);
  assert.match(CSS, /width:min\(390px,100%\)/);
  assert.match(CSS, /height:100dvh/);
  assert.match(CSS, /overflow-x:hidden/);
  assert.match(CSS, /@media\(prefers-reduced-motion:reduce\)/);
  assert.doesNotMatch(JS, /CB461141-CC7D-49B9-B3C6-B00945A6CAF9|<canvas|WebGL/i);

  for (const panel of ['personal', 'dob', 'school', 'college', 'security']) {
    assert.match(JS, new RegExp(`data-signup-panel="${panel}"`), `missing progressive ${panel} panel`);
  }
  for (const view of ['welcome', 'login', 'created', 'verify', 'email-intro', 'whatsapp-info', 'telegram-intro', 'telegram', 'verified', 'security-setup', 'success']) {
    assert.match(JS, new RegExp(`data-view="${view}"`), `missing reference state ${view}`);
  }
  assert.match(JS, /aria-label="Password requirements"/);
  assert.ok(JS.includes("if (!/[A-Z]/.test(password))"));
  assert.ok(JS.includes("if (!/\\d/.test(password))"));
});

test('Welcome uses the original close-matched academic hero and exactly four entry paths', () => {
  const welcome = between(JS, '<div class="ah-account-view ah-welcome-view"', '<form class="ah-account-view ah-login-view"');
  assert.match(welcome, /onboarding-welcome-hero\.webp\?v=reference-onboarding-v2/);
  assert.match(welcome, /তোমার স্বপ্নের বিশ্ববিদ্যালয়ের পথে/);
  assert.deepEqual([...welcome.matchAll(/data-role="(welcome-signup|welcome-login|continue-guest|welcome-google-button)"/g)].map(match => match[1]).sort(), [
    'continue-guest', 'welcome-google-button', 'welcome-login', 'welcome-signup'
  ]);
  const image = statSync(new URL('./onboarding-welcome-hero.webp', import.meta.url));
  assert.ok(image.size > 20_000 && image.size < 100_000, `hero bytes=${image.size}`);
  const header = readFileSync(new URL('./onboarding-welcome-hero.webp', import.meta.url)).subarray(0, 12);
  assert.equal(header.subarray(0, 4).toString(), 'RIFF');
  assert.equal(header.subarray(8, 12).toString(), 'WEBP');
});

test('unsupported methods fail closed while real Telegram owns the only six-box OTP visual', () => {
  const methods = between(JS, '<div class="ah-method-stack">', '</div>\n            <p class="ah-account-note">শুধু available');
  assert.equal((methods.match(/<button class="ah-method-card/g) || []).length, 4);
  assert.match(methods, /Email OTP নয়/);
  assert.match(methods, /disabled aria-disabled="true"[\s\S]*?<strong>Passkey<\/strong>/);
  assert.match(methods, /WhatsApp[\s\S]*এখন verification পাওয়া যাচ্ছে না/);
  assert.match(methods, /Telegram[\s\S]*real ৬ সংখ্যার code/);

  const email = between(JS, 'data-role="verification-email-panel"', '<p class="ah-account-switch"><button class="ah-account-link" type="button" data-role="verify-back"');
  assert.equal((email.match(/data-otp-digit/g) || []).length, 0);
  assert.match(email, /Verification link/);
  const telegram = between(JS, '<form class="ah-account-view ah-account-telegram-view"', '<form class="ah-account-view" data-view="google-link"');
  assert.equal((telegram.match(/data-otp-digit="[0-5]"/g) || []).length, 6);
  assert.match(JS, /data-view="whatsapp-info"[\s\S]*type="button" disabled>Continue with WhatsApp/);
  assert.ok(JS.includes(`$('[data-role="email-verification-start"]').addEventListener('click', () => showView('email-intro'))`));
  assert.ok(JS.includes(`$('[data-role="email-intro-continue"]').addEventListener('click', beginEmailVerification)`));
});

test('Assistant is user-opened, full-page, secret-safe, and never an automatic Welcome path', () => {
  assert.match(JS, /data-role="guide" hidden/);
  assert.match(JS, /data-role="guide-open"/);
  assert.match(CSS, /\.ah-guide\{[\s\S]*inset:0/);
  assert.match(JS, /Password, OTP বা secret কখনো chat-এ লিখবে না/);
  assert.match(JS, /sensitiveGuideInput/);
  assert.doesNotMatch(JS, /showView\('welcome'\)[\s\S]{0,120}guide\.hidden\s*=\s*false/);
});

test('Guest dashboard continues the same visual language with four real routes and four-tab navigation', () => {
  assert.match(DASH_JS, /data-dashboard-contract="reference-guest-v2"/);
  const cards = between(DASH_JS, 'const cards = [', '];\n    return \'<div class="dv2-guest-root"');
  for (const label of ['Question Bank', 'Practice', 'Progress', 'Resources']) assert.match(cards, new RegExp(label));
  assert.equal((cards.match(/^\s*\['/gm) || []).length, 4);
  assert.match(DASH_JS, /Guest activity শুধু এই device-এ থাকে/);
  assert.match(DASH_JS, /admission:route-rendered[\s\S]*classList\.toggle\('ah-guest-dashboard', guestMode\(\)\)/);
  assert.match(DASH_JS, /admissionhub:authchange[\s\S]*classList\.toggle\('ah-guest-dashboard', shouldBeGuest\)/);
  assert.match(DASH_CSS, /max-width:390px/);
  assert.match(DASH_CSS, /body\.ah-guest-dashboard \.ah-account-launcher/);
  assert.match(DASH_CSS, /onboarding-welcome-hero\.webp\?v=reference-onboarding-v2/);
  assert.match(NAV_JS, /data-guest-nav="reference-guest-v2"/);
  for (const label of ['Home', 'Practice', 'Progress', 'More']) assert.match(NAV_JS, new RegExp(`label: '${label}'`));
  assert.match(NAV_JS, /const tabs = \[[\s\S]*?\];/);
});

test('reference assets and service-worker release markers are synchronized', () => {
  const uiVersion = '20260911-reference-onboarding-v2';
  const shellVersion = 'v235-reference-onboarding-20260911';
  for (const asset of [`account-access.css?v=${uiVersion}`, `account-access.js?v=${uiVersion}`, 'dashboard-v2.css?v=dash2f8', 'dashboard-v2.js?v=dash2f8']) {
    assert.match(HTML, new RegExp(asset.replace(/[.?]/g, value => `\\${value}`)));
    assert.match(SW, new RegExp(asset.replace(/[.?]/g, value => `\\${value}`)));
  }
  assert.match(SW, /onboarding-welcome-hero\.webp\?v=reference-onboarding-v2/);
  assert.match(SW, new RegExp(`const BUILD_ID = '${shellVersion}'`));
  assert.match(HTML, new RegExp(`expectedSwVersion = '${shellVersion}'`));
  assert.match(HTML, new RegExp(`sw\\.js\\?v=${shellVersion}`));
});

test('a merge cannot bypass the protected Telegram publication path for visual v2', () => {
  assert.match(PAGES_GUARD, /Cloudflare Pages Bundle Guard \(No Deploy\)/);
  assert.doesNotMatch(PAGES_GUARD, /wrangler-action|pages deploy dist/);
  assert.match(RELEASE_WORKFLOW, /environment: email-gateway-production/);
  assert.match(RELEASE_WORKFLOW, /npm run test:production-auth/);
  assert.match(RELEASE_WORKFLOW, /npm run audit:premium-browser/);
  assert.match(RELEASE_WORKFLOW, /pages deploy dist --project-name admissionhub --branch main/);
  assert.match(RELEASE_WORKFLOW, /v235-reference-onboarding-20260911/);
});
