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
const UI_VERSION = '20260912-hero-personal-dob-modern-v2';
const SHELL_VERSION = 'v242-hero-personal-dob-modern-20260912';

const signupStart = JS.indexOf('<form class="ah-account-view ah-signup-view"');
const signupEnd = JS.indexOf('<div class="ah-account-view ah-created-view"', signupStart);
const signup = JS.slice(signupStart, signupEnd);
const personalStart = signup.indexOf('data-signup-panel="personal"');
const schoolStart = signup.indexOf('data-signup-panel="school"');
const personal = signup.slice(personalStart, schoolStart);
const securityStart = signup.indexOf('data-signup-panel="security"');
const security = signup.slice(securityStart);
const mediaTag = /<(?:img|picture|source|canvas|video|object|embed)(?:\s|>)/i;

test('Signup 01 Personal is an input-bound native profile UI, not artwork or screenshot', () => {
  assert.ok(signupStart > 0 && signupEnd > signupStart);
  assert.match(signup, /data-personal-visual-contract="interactive-native-personal-v1"/);
  assert.match(signup, /data-media-contract="zero-raster-entry-v1"/);
  assert.match(signup, /<i>01<\/i><span>Personal<\/span><small>তোমার পরিচয়<\/small>/);
  assert.match(signup, /<i>02<\/i><span>Education<\/span><small>শিক্ষার তথ্য<\/small>/);
  assert.match(signup, /<i>03<\/i><span>Security<\/span><small>নিরাপদ account<\/small>/);
  assert.match(personal, /data-profile-preview-contract="input-bound-profile-v1"/);
  assert.match(personal, /data-role="personal-live-initials"/);
  assert.match(personal, /data-role="personal-live-name"/);
  assert.match(personal, /data-role="personal-completion"/);
  assert.match(personal, /data-personal-check="name"/);
  assert.match(personal, /data-personal-check="dob"/);
  assert.match(personal, /চলো, আপনার/);
  assert.match(personal, /আপনার সম্পর্কে কিছু তথ্য/);
  assert.match(personal, /পরের ধাপ/);
  assert.doesNotMatch(personal, mediaTag);
  assert.doesNotMatch(personal, /ah-native-profile|ah-native-pedestal|ah-native-book|ah-native-cap|ah-native-leaf|ah-personal-landscape/);
});

test('live Personal preview changes from the real name and DOB control state', () => {
  assert.match(JS, /const updatePersonalPreview = \(\) => \{/);
  assert.match(JS, /const completion = \(nameReady \? 50 : name \? 20 : 0\) \+ \(dobReady \? 50 : 0\)/);
  assert.match(JS, /initialNode\.textContent = initials/);
  assert.match(JS, /nameNode\.textContent = name \|\| 'তোমার নাম এখানে দেখা যাবে'/);
  assert.match(JS, /completionNode\.textContent = `\$\{completion\}%`/);
  assert.match(JS, /--ah-profile-progress/);
  assert.match(JS, /--ah-profile-percent/);
  assert.match(JS, /nameCheck\.classList\.toggle\('ready', nameReady\)/);
  assert.match(JS, /dobCheck\.classList\.toggle\('ready', dobReady\)/);
  assert.match(JS, /updateDobPreview = \(\) => \{[\s\S]{0,900}updatePersonalPreview\(\)/);
  assert.match(JS, /#ah-signup-name'\)\.addEventListener\('input',[\s\S]{0,500}updatePersonalPreview\(\)/);
  assert.match(CSS, /\.ah-live-avatar-ring\{[^}]+conic-gradient\(#0ba576 var\(--ah-profile-progress\)/);
  assert.match(CSS, /\.ah-live-progress-bar i\{[^}]+width:var\(--ah-profile-percent\)/);
});

test('name and all DOB selectors stay combined on Personal without collecting Email early', () => {
  for (const id of ['ah-signup-name', 'ah-dob-day', 'ah-dob-month', 'ah-dob-year']) assert.match(personal, new RegExp(`id="${id}"`));
  assert.equal((personal.match(/<select /g) || []).length, 3);
  assert.doesNotMatch(signup, /data-signup-panel="dob"/);
  assert.doesNotMatch(personal, /id="ah-signup-email"/);
  assert.match(security, /id="ah-signup-email"/);
  assert.match(JS, /const order = \['personal', 'school', 'college', 'security'\]/);
  assert.match(JS, /const validatePersonal = \(\) => \{[\s\S]{0,500}return validateDob\(\)/);
  assert.match(JS, /const validateSecurity = \(\) => \{[\s\S]{0,350}সঠিক Email address/);
});

test('both rejected image-based entry designs are absent and mobile spacing is fluid', () => {
  assert.equal(existsSync(new URL('./onboarding-welcome-hero.webp', import.meta.url)), false);
  assert.equal(existsSync(new URL('./onboarding-personal-hero.webp', import.meta.url)), false);
  assert.doesNotMatch(JS, /onboarding-(?:welcome|personal)-hero\.webp/);
  assert.doesNotMatch(SW, /onboarding-(?:welcome|personal)-hero\.webp/);
  assert.doesNotMatch(JS, mediaTag);
  assert.doesNotMatch(CSS, /background(?:-image)?\s*:[^;{}]*url\s*\(/i);
  assert.match(CSS, /Personal — real input-bound profile preview, not an illustration or image/);
  assert.match(CSS, /\.ah-personal-panel\{[^}]*width:min\(calc\(100% - 32px\),980px\)/);
  assert.match(CSS, /@media\(max-width:390px\)[\s\S]+\.ah-signup-progress,.ah-personal-panel\{width:calc\(100% - 24px\)\}/);
  assert.match(CSS, /\.ah-personal-card\{[^}]+border-radius:25px[^}]+background:rgba\(255,255,255,\.94\)/);
  assert.match(CSS, /\.ah-personal-next\{[^}]+min-height:56px[^}]+border-radius:17px/);
  assert.match(CSS, /\.ah-personal-dob-card select\{[^}]+font:850 16px/);
  assert.match(CSS, /@media\(prefers-reduced-motion:reduce\)/);
  assert.doesNotMatch(CSS, /https?:\/\//);
});

test('code-native release markers and fail-closed publication checks are synchronized', () => {
  for (const asset of [`account-access.css?v=${UI_VERSION}`, `account-access.js?v=${UI_VERSION}`]) {
    assert.ok(HTML.includes(asset), asset);
    assert.ok(SW.includes(asset), asset);
  }
  assert.ok(HTML.includes(`sw.js?v=${SHELL_VERSION}`));
  assert.ok(HTML.includes(`expectedSwVersion = '${SHELL_VERSION}'`));
  assert.ok(SW.includes(`const BUILD_ID = '${SHELL_VERSION}'`));
  assert.ok(BUNDLE_GUARD.includes('test ! -e dist/onboarding-welcome-hero.webp'));
  assert.ok(BUNDLE_GUARD.includes('test ! -e dist/onboarding-personal-hero.webp'));
  assert.ok(RELEASE.includes('data-personal-visual-contract="interactive-native-personal-v1"'));
  assert.ok(RELEASE.includes('data-profile-preview-contract="input-bound-profile-v1"'));
  assert.ok(RELEASE.includes('data-media-contract="zero-raster-entry-v1"'));
  assert.ok(RELEASE.includes('updatePersonalPreview'));
  assert.ok(RELEASE.includes('Personal — real input-bound profile preview'));
  assert.ok(RELEASE.includes(`const BUILD_ID = '${SHELL_VERSION}'`));
  assert.doesNotMatch(RELEASE, /fetch_public[^\n]+onboarding-(?:welcome|personal)-hero\.webp/);
});

test('Signup stays AI-free while the ordinary application AI remains shipped', () => {
  assert.doesNotMatch(JS, /\/api\/ai\/chat|data-role="guide|class="ah-guide/);
  assert.doesNotMatch(CSS, /\.ah-guide/);
  assert.match(HTML, /<script defer src="\.\/ai-agent-chat\.js\?v=agent-f1-ui-chatv15-identity"><\/script>/);
  assert.match(SW, /\.\/ai-agent-chat\.js\?v=agent-f1-ui-chatv15-identity/);
});
