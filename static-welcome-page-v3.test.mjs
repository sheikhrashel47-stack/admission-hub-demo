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

test('account access is a real document page, not popup or dialog semantics', () => {
  assert.match(JS, /pageHost\.id = 'ah-account-page'/);
  assert.match(JS, /<main class="ah-account-shell" aria-labelledby="ah-account-title"[^>]+data-visual-contract="static-page-system-v3">/);
  assert.doesNotMatch(JS, /ah-account-overlay|ah-account-modal|role="dialog"|aria-modal="true"|aria-haspopup', 'dialog'/);
  assert.match(JS, /document\.body\.classList\.toggle\('ah-account-page-active', visible\)/);
  assert.match(JS, /node\.inert = visible/);
  assert.doesNotMatch(JS, /document\.documentElement\.style\.overflow = 'hidden'/);
  assert.doesNotMatch(JS, /event\.target === pageHost|focus escaped dialog/);

  assert.match(CSS, /\.ah-account-page\{position:relative;display:block;[^}]+min-height:100dvh/);
  assert.match(CSS, /body\.ah-account-page-active>#app/);
  assert.match(CSS, /width:min\(100%,430px\)/);
  assert.match(CSS, /\.ah-account-shell\{[^}]+border-radius:0[^}]+box-shadow:none/);
  assert.match(CSS, /@media\(prefers-reduced-motion:reduce\)/);
});

test('Welcome follows the supplied first-page composition and exposes exactly four entry paths', () => {
  const welcome = between(JS, '<div class="ah-account-view ah-welcome-view"', '<form class="ah-account-view ah-login-view"');
  assert.match(welcome, /data-page-contract="static-reference-welcome-v3"/);
  assert.match(welcome, /ADMISSION <em>HUB<\/em>/);
  assert.match(welcome, /Your Smarter Admission Companion/);
  assert.match(welcome, /data-role="welcome-language"/);
  assert.match(welcome, /<option value="bn">বাংলা<\/option><option value="en">English<\/option>/);
  assert.match(welcome, /onboarding-welcome-hero\.webp\?v=static-reference-welcome-v3/);
  assert.match(welcome, /width="853" height="625"/);
  assert.match(welcome, /তোমার স্বপ্নের\|বিশ্ববিদ্যালয়ের পথে,\|প্রথম ধাপটা আজ থেকেই।/);
  assert.match(welcome, /পড়াশোনা, practice আর preparation/);

  for (const benefit of ['Learn', 'Practice', 'Improve', 'Achieve']) assert.match(welcome, new RegExp(`<strong>${benefit}<\\/strong>`));
  assert.equal((welcome.match(/<article>/g) || []).length, 4);
  assert.deepEqual([...welcome.matchAll(/data-role="(welcome-signup|welcome-login|continue-guest|welcome-google-button)"/g)].map(match => match[1]).sort(), [
    'continue-guest', 'welcome-google-button', 'welcome-login', 'welcome-signup'
  ]);
  assert.doesNotMatch(welcome, /data-role="close"|AI Assistant|ah-guide|robot/i);
  assert.match(welcome, /ah-welcome-landscape/);

  const image = statSync(new URL('./onboarding-welcome-hero.webp', import.meta.url));
  assert.ok(image.size > 30_000 && image.size < 80_000, `hero bytes=${image.size}`);
  const header = readFileSync(new URL('./onboarding-welcome-hero.webp', import.meta.url)).subarray(0, 12);
  assert.equal(header.subarray(0, 4).toString(), 'RIFF');
  assert.equal(header.subarray(8, 12).toString(), 'WEBP');
});

test('Welcome is a one-viewport mobile composition with accessible controls', () => {
  assert.match(CSS, /\.ah-welcome-view\{[\s\S]*min-height:max\(100dvh,780px\)/);
  assert.match(CSS, /grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
  assert.match(CSS, /\.ah-entry-actions\{[\s\S]*width:min\(68%,292px\)/);
  assert.match(CSS, /\.ah-entry-actions button\{[\s\S]*min-height:49px/);
  assert.match(CSS, /\.ah-welcome-landscape\{position:absolute/);
  assert.match(JS, /setWelcomeLanguage/);
  assert.match(JS, /document\.documentElement\.lang = selected/);
  assert.match(JS, /fetchpriority="high"/);
  assert.doesNotMatch(JS, /<canvas|WebGL|<video/i);
});

test('unsupported verification methods remain truthful and fail closed', () => {
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

test('AI Assistant is disabled and absent from all reachable public navigation', () => {
  assert.match(JS, /const ASSISTANT_ENABLED = false/);
  assert.match(JS, /data-assistant-enabled="false" hidden aria-hidden="true"/);
  assert.match(JS, /data-role="guide-open"[^>]+hidden disabled/);
  assert.match(CSS, /\.ah-guide,\n\.ah-account-shell[^\n]+ \.ah-guide-orb\{display:none!important\}/);
  assert.doesNotMatch(HTML, /ai-agent-chat\.js/);
  assert.doesNotMatch(SW, /ai-agent-chat\.js/);
  assert.doesNotMatch(HTML, /\{key:'ai'/);
  assert.doesNotMatch(DASH_JS, /navigate\((?:\\?'|\")ai/);
});

test('custom Guest Dashboard is removed and Guest returns to the ordinary app route', () => {
  for (const source of [DASH_JS, DASH_CSS, NAV_JS, HTML]) {
    assert.doesNotMatch(source, /reference-guest-v2|data-guest-nav|dv2-guest|ah-guest-dashboard/);
  }
  assert.match(JS, /rememberEntry\('guest'\);[\s\S]{0,120}close\(\);\s*navigateDashboard\(\);\s*notify\(\)/);
  assert.match(HTML, /const NAV_TABS=\[[\s\S]*key:'dashboard'[\s\S]*key:'question-bank'[\s\S]*key:'exam'[\s\S]*key:'history'/);
  assert.doesNotMatch(HTML, /key:'ai'/);
});

test('static Welcome assets and service-worker release markers are synchronized', () => {
  const uiVersion = '20260911-static-reference-welcome-v3';
  const shellVersion = 'v236-static-welcome-20260911';
  for (const asset of [`account-access.css?v=${uiVersion}`, `account-access.js?v=${uiVersion}`, 'dashboard-v2.css?v=dash2f9', 'dashboard-v2.js?v=dash2f9']) {
    assert.match(HTML, new RegExp(asset.replace(/[.?]/g, value => `\\${value}`)));
    assert.match(SW, new RegExp(asset.replace(/[.?]/g, value => `\\${value}`)));
  }
  assert.match(SW, /onboarding-welcome-hero\.webp\?v=static-reference-welcome-v3/);
  assert.match(SW, new RegExp(`const BUILD_ID = '${shellVersion}'`));
  assert.match(HTML, new RegExp(`expectedSwVersion = '${shellVersion}'`));
  assert.match(HTML, new RegExp(`sw\\.js\\?v=${shellVersion}`));
  assert.ok(HTML.indexOf('institutions-bd.js?v=bd-institutions-v1') < HTML.indexOf(`account-access.js?v=${uiVersion}`));
  assert.ok(HTML.indexOf(`account-access.js?v=${uiVersion}`) < HTML.indexOf('dashboard-v2.js?v=dash2f9'));
});

test('protected publication remains the only release path for static Welcome v3', () => {
  assert.match(PAGES_GUARD, /Cloudflare Pages Bundle Guard \(No Deploy\)/);
  assert.doesNotMatch(PAGES_GUARD, /wrangler-action|pages deploy dist/);
  assert.match(RELEASE_WORKFLOW, /environment: email-gateway-production/);
  assert.match(RELEASE_WORKFLOW, /npm run test:production-auth/);
  assert.match(RELEASE_WORKFLOW, /npm run audit:premium-browser/);
  assert.match(RELEASE_WORKFLOW, /pages deploy dist --project-name admissionhub --branch main/);
  assert.match(RELEASE_WORKFLOW, /public-release-verification/);
  assert.doesNotMatch(RELEASE_WORKFLOW, /printf '%s' \"\$[a-z_]+\" \| grep -Fq/);
});
