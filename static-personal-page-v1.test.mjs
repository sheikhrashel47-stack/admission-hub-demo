import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';

const read = name => readFileSync(new URL(`./${name}`, import.meta.url), 'utf8');
const JS = read('account-access.js');
const CSS = read('account-access.css');
const HTML = read('index.html');
const SW = read('sw.js');
const RELEASE = read('.github/workflows/telegram-auth-canary-activate.yml');
const BUNDLE_GUARD = read('.github/workflows/cf-pages.yml');
const UI_VERSION = '20260911-static-reference-personal-v1-ai-scope';
const SHELL_VERSION = 'v238-personal-20260911';

const signupStart = JS.indexOf('<form class="ah-account-view ah-signup-view"');
const signupEnd = JS.indexOf('<div class="ah-account-view ah-created-view"', signupStart);
const signup = JS.slice(signupStart, signupEnd);
const personalStart = signup.indexOf('data-signup-panel="personal"');
const schoolStart = signup.indexOf('data-signup-panel="school"');
const personal = signup.slice(personalStart, schoolStart);
const securityStart = signup.indexOf('data-signup-panel="security"');
const security = signup.slice(securityStart);

test('Signup 01 Personal keeps the supplied static-reference structure and copy', () => {
  assert.ok(signupStart > 0 && signupEnd > signupStart);
  assert.match(signup, /data-personal-visual-contract="static-reference-personal-v1"/);
  assert.match(signup, /<i>01<\/i><span>Personal<\/span>/);
  assert.match(signup, /<i>02<\/i><span>Education<\/span>/);
  assert.match(signup, /<i>03<\/i><span>Security<\/span>/);
  assert.match(personal, /onboarding-personal-hero\.webp\?v=static-reference-personal-v1/);
  assert.match(personal, /চলো, তোমার/);
  assert.match(personal, /পরিচয়টা তৈরি করি/);
  assert.match(personal, /তোমার সম্পর্কে একটু বলো/);
  assert.match(personal, /পূর্ণ নাম লিখো/);
  assert.match(personal, /তোমার তথ্য নিরাপদ রাখা হবে/);
  assert.match(personal, /পরের ধাপ/);
  assert.match(personal, /ah-personal-landscape/);
});

test('name and all DOB selectors are combined on Personal without collecting Email early', () => {
  for (const id of ['ah-signup-name', 'ah-dob-day', 'ah-dob-month', 'ah-dob-year']) {
    assert.match(personal, new RegExp(`id="${id}"`));
  }
  assert.equal((personal.match(/<select /g) || []).length, 3);
  assert.doesNotMatch(signup, /data-signup-panel="dob"/);
  assert.doesNotMatch(personal, /id="ah-signup-email"/);
  assert.match(security, /id="ah-signup-email"/);
  assert.match(JS, /const order = \['personal', 'school', 'college', 'security'\]/);
  assert.match(JS, /const validatePersonal = \(\) => \{[\s\S]{0,500}return validateDob\(\)/);
  assert.match(JS, /const validateSecurity = \(\) => \{[\s\S]{0,350}সঠিক Email address/);
});

test('Personal reference image is a compact local WebP and CSS remains mobile-first', () => {
  const path = new URL('./onboarding-personal-hero.webp', import.meta.url);
  const image = statSync(path);
  const header = readFileSync(path).subarray(0, 12);
  assert.ok(image.size >= 15000 && image.size <= 60000, `unexpected Personal hero size: ${image.size}`);
  assert.equal(header.subarray(0, 4).toString('ascii'), 'RIFF');
  assert.equal(header.subarray(8, 12).toString('ascii'), 'WEBP');
  assert.match(CSS, /Page 2 — exact-reference Signup 01 \/ Personal/);
  assert.match(CSS, /min-height:max\(100dvh,844px\)/);
  assert.match(CSS, /\.ah-personal-card\{[\s\S]{0,260}background:rgba\(255,255,255,\.86\)/);
  assert.match(CSS, /\.ah-personal-next\{[\s\S]{0,450}border-radius:999px/);
  assert.match(CSS, /\.ah-personal-dob-card \.ah-dob-selectors select\{[\s\S]{0,450}font:850 16px/);
  assert.match(CSS, /@media\(prefers-reduced-motion:reduce\)/);
  assert.doesNotMatch(CSS, /https?:\/\//);
});

test('Personal release markers, precache, protected publication and public asset checks are synchronized', () => {
  for (const asset of [`account-access.css?v=${UI_VERSION}`, `account-access.js?v=${UI_VERSION}`]) {
    assert.ok(HTML.includes(asset), asset);
    assert.ok(SW.includes(asset), asset);
  }
  assert.ok(HTML.includes(`sw.js?v=${SHELL_VERSION}`));
  assert.ok(HTML.includes(`expectedSwVersion = '${SHELL_VERSION}'`));
  assert.ok(SW.includes(`const BUILD_ID = '${SHELL_VERSION}'`));
  assert.ok(SW.includes('./onboarding-personal-hero.webp?v=static-reference-personal-v1'));
  assert.ok(BUNDLE_GUARD.includes('test -s dist/onboarding-personal-hero.webp'));
  assert.ok(RELEASE.includes('onboarding-personal-hero.webp?v=static-reference-personal-v1'));
  assert.ok(RELEASE.includes('data-personal-visual-contract="static-reference-personal-v1"'));
  assert.ok(RELEASE.includes('Page 2 — exact-reference Signup 01 / Personal'));
  assert.ok(RELEASE.includes(`const BUILD_ID = '${SHELL_VERSION}'`));
});

test('Signup stays AI-free while the ordinary application AI remains shipped', () => {
  assert.doesNotMatch(JS, /\/api\/ai\/chat|data-role="guide|class="ah-guide/);
  assert.doesNotMatch(CSS, /\.ah-guide/);
  assert.match(HTML, /<script defer src="\.\/ai-agent-chat\.js\?v=agent-f1-ui-chatv15-identity"><\/script>/);
  assert.match(SW, /\.\/ai-agent-chat\.js\?v=agent-f1-ui-chatv15-identity/);
});
