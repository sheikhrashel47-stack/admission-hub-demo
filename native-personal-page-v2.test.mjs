import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const read = name => readFileSync(new URL(`./${name}`, import.meta.url), 'utf8');
const JS = read('account-access.js');
const CSS = read('account-access.css');
const HTML = read('index.html');
const SW = read('sw.js');
const RELEASE = read('.github/workflows/telegram-auth-canary-activate.yml');
const BUNDLE_GUARD = read('.github/workflows/cf-pages.yml');
const UI_VERSION = '20260911-native-personal-v2-ai-scope';
const SHELL_VERSION = 'v239-native-personal-20260911';

const signupStart = JS.indexOf('<form class="ah-account-view ah-signup-view"');
const signupEnd = JS.indexOf('<div class="ah-account-view ah-created-view"', signupStart);
const signup = JS.slice(signupStart, signupEnd);
const personalStart = signup.indexOf('data-signup-panel="personal"');
const schoolStart = signup.indexOf('data-signup-panel="school"');
const personal = signup.slice(personalStart, schoolStart);
const securityStart = signup.indexOf('data-signup-panel="security"');
const security = signup.slice(securityStart);

test('Signup 01 Personal keeps the supplied composition with native DOM/CSS artwork', () => {
  assert.ok(signupStart > 0 && signupEnd > signupStart);
  assert.match(signup, /data-personal-visual-contract="native-reference-personal-v2"/);
  assert.match(signup, /<i>01<\/i><span>Personal<\/span>/);
  assert.match(signup, /<i>02<\/i><span>Education<\/span>/);
  assert.match(signup, /<i>03<\/i><span>Security<\/span>/);
  assert.match(personal, /data-illustration-contract="native-dom-profile-v1"/);
  for (const part of ['ah-native-profile', 'ah-native-pedestal', 'ah-native-book', 'ah-native-cap', 'ah-native-leaf']) {
    assert.match(personal, new RegExp(`class="[^"]*${part}`));
    assert.match(CSS, new RegExp(`\\.${part}(?:\\{|>)`));
  }
  assert.doesNotMatch(personal, /<img|<canvas|<video|onboarding-personal-hero\.webp/);
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

test('Personal has no pasted screenshot asset and stays mobile-first', () => {
  assert.equal(existsSync(new URL('./onboarding-personal-hero.webp', import.meta.url)), false);
  assert.doesNotMatch(JS, /onboarding-personal-hero\.webp/);
  assert.doesNotMatch(SW, /onboarding-personal-hero\.webp/);
  assert.match(CSS, /Page 2 — native responsive Signup 01 \/ Personal; no screenshot or raster hero/);
  assert.match(CSS, /\.ah-native-profile\{[\s\S]{0,420}linear-gradient/);
  assert.match(CSS, /\.ah-native-pedestal\{[\s\S]{0,420}linear-gradient/);
  assert.match(CSS, /min-height:max\(100dvh,844px\)/);
  assert.match(CSS, /\.ah-personal-card\{[\s\S]{0,260}background:rgba\(255,255,255,\.86\)/);
  assert.match(CSS, /\.ah-personal-next\{[\s\S]{0,450}border-radius:999px/);
  assert.match(CSS, /\.ah-personal-dob-card \.ah-dob-selectors select\{[\s\S]{0,450}font:850 16px/);
  assert.match(CSS, /@media\(prefers-reduced-motion:reduce\)/);
  assert.doesNotMatch(CSS, /https?:\/\//);
});

test('native Personal release markers and protected publication checks are synchronized', () => {
  for (const asset of [`account-access.css?v=${UI_VERSION}`, `account-access.js?v=${UI_VERSION}`]) {
    assert.ok(HTML.includes(asset), asset);
    assert.ok(SW.includes(asset), asset);
  }
  assert.ok(HTML.includes(`sw.js?v=${SHELL_VERSION}`));
  assert.ok(HTML.includes(`expectedSwVersion = '${SHELL_VERSION}'`));
  assert.ok(SW.includes(`const BUILD_ID = '${SHELL_VERSION}'`));
  assert.ok(BUNDLE_GUARD.includes('test ! -e dist/onboarding-personal-hero.webp'));
  assert.ok(RELEASE.includes('data-personal-visual-contract="native-reference-personal-v2"'));
  assert.ok(RELEASE.includes('data-illustration-contract="native-dom-profile-v1"'));
  assert.ok(RELEASE.includes('no screenshot or raster hero'));
  assert.ok(RELEASE.includes(`const BUILD_ID = '${SHELL_VERSION}'`));
  assert.doesNotMatch(RELEASE, /fetch_public[^\n]+onboarding-personal-hero\.webp/);
});

test('Signup stays AI-free while the ordinary application AI remains shipped', () => {
  assert.doesNotMatch(JS, /\/api\/ai\/chat|data-role="guide|class="ah-guide/);
  assert.doesNotMatch(CSS, /\.ah-guide/);
  assert.match(HTML, /<script defer src="\.\/ai-agent-chat\.js\?v=agent-f1-ui-chatv15-identity"><\/script>/);
  assert.match(SW, /\.\/ai-agent-chat\.js\?v=agent-f1-ui-chatv15-identity/);
});
