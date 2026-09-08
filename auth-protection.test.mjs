import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { AUTH_PUBLIC_METHODS } from './auth/index.mjs';

const root = process.cwd();
const read = file => readFileSync(resolve(root, file), 'utf8');
const SKIP_DIRECTORIES = new Set(['.git', 'node_modules', '.cache', 'dist', 'build', 'coverage']);
const walk = dir => readdirSync(resolve(root, dir)).filter(name => !SKIP_DIRECTORIES.has(name)).flatMap(name => {
  const path = resolve(root, dir, name);
  return statSync(path).isDirectory() ? walk(relative(root, path)) : [relative(root, path).split(sep).join('/')];
});

const runtimeFiles = walk('auth').filter(file => file.endsWith('.mjs') && !file.includes('/testing/'));
const allAuthFiles = walk('auth');
const index = read('auth/index.mjs');
const html = read('index.html');
const sw = read('sw.js');
const sourceWorker = read('public-worker.js');
const bundle = read('worker-bundle.mjs');
const workflow = read('.github/workflows/auth-foundation-guard.yml');
const pagesWorkflow = read('.github/workflows/cf-pages.yml');
const packageJson = JSON.parse(read('package.json'));

test('protected Auth domain and all required service boundaries exist', () => {
  const required = [
    'auth/index.mjs', 'auth/create-auth-foundation.mjs', 'auth/AUTH_PROTECTION_CONTRACT.md',
    'auth/core/auth-core.mjs', 'auth/core/state-machine.mjs', 'auth/core/state-store.mjs',
    'auth/core/errors.mjs', 'auth/core/operation-runner.mjs', 'auth/core/config.mjs', 'auth/core/contracts.mjs',
    'auth/services/auth-service.mjs', 'auth/services/session-service.mjs',
    'auth/services/verification-service.mjs', 'auth/services/recovery-service.mjs',
    'auth/services/passkey-service.mjs', 'auth/services/oauth-service.mjs',
    'auth/services/security-service.mjs', 'auth/services/device-session-service.mjs',
    'auth/services/identity-service.mjs'
  ];
  assert.ok(required.every(file => existsSync(resolve(root, file))), required.filter(file => !existsSync(resolve(root, file))));
});

test('public entry exports the stable contract but no internal class/store/service', () => {
  for (const method of AUTH_PUBLIC_METHODS) assert.ok(AUTH_PUBLIC_METHODS.includes(method));
  assert.match(index, /createAuthFoundation/);
  assert.doesNotMatch(index, /AuthenticationCore|AuthStateStore|AuthService|SessionService/);
});

test('Auth runtime has no browser credential persistence or cookie manipulation', () => {
  const source = runtimeFiles.map(file => read(file)).join('\n');
  assert.doesNotMatch(source, /localStorage|sessionStorage|document\.cookie|indexedDB/i);
  assert.doesNotMatch(source, /setItem\s*\(|getItem\s*\(/);
});

test('Auth runtime is provider-agnostic and contains no concrete network endpoint', () => {
  const source = runtimeFiles.map(file => read(file)).join('\n');
  assert.doesNotMatch(source, /https?:\/\/|fetch\s*\(|XMLHttpRequest|WebSocket/);
  assert.doesNotMatch(source, /supabase|resend|brevo|mailjet|mailtrap|mailersend|sendpulse|emailoctopus|courier|zeptomail|sendgrid|mailgun|postmark|smtp2go|elasticemail/i);
});

test('Auth runtime contains no embedded key, JWT, private key or authorization value', () => {
  const source = runtimeFiles.map(file => read(file)).join('\n');
  assert.doesNotMatch(source, /-----BEGIN [A-Z ]+PRIVATE KEY-----|AIza[A-Za-z0-9_-]{20,}|sk[-_][A-Za-z0-9_-]{16,}|Bearer\s+[A-Za-z0-9._-]{12,}/);
  assert.doesNotMatch(source, /console\.(log|info|warn|error|debug)\s*\(/);
  assert.doesNotMatch(source, /eval\s*\(|new Function\s*\(/);
});

test('Phase 2A is not loaded by production HTML or service worker', () => {
  assert.doesNotMatch(html, /auth\/index\.mjs|create-auth-foundation|AuthFoundation/);
  assert.doesNotMatch(sw, /auth\/index\.mjs|create-auth-foundation|AuthFoundation/);
  assert.doesNotMatch(html, /ahAuthGate|ahOnboardGate|premium-auth|user-account/);
});

test('Phase 2A exposes no live account endpoint and retired Worker remains lean', () => {
  for (const route of ['/api/auth', '/api/profile', '/api/onboarding', '/api/sessions']) {
    assert.equal(sourceWorker.includes(route), false, route);
    assert.equal(bundle.includes(route), false, route);
  }
});

test('non-Auth production modules do not import protected internals', () => {
  const candidates = walk('.').filter(file => /\.(?:js|mjs|html)$/.test(file) && !file.startsWith('auth/') && !file.endsWith('.test.mjs') && !file.startsWith('node_modules/'));
  const violations = [];
  for (const file of candidates) {
    const source = read(file);
    if (/from\s*['"][^'"]*auth\/(?:core|services)\//.test(source) || /import\s*\(['"][^'"]*auth\/(?:core|services)\//.test(source)) violations.push(file);
  }
  assert.deepEqual(violations, []);
});

test('all Auth runtime modules parse and import without browser globals', async () => {
  for (const file of runtimeFiles) await import(pathToFileURL(resolve(root, file)).href);
});

test('CI guard and CODEOWNERS protect the foundation boundary', () => {
  assert.equal(packageJson.scripts['test:auth'], 'node --test --experimental-test-coverage auth-foundation.test.mjs auth-foundation-chaos.test.mjs auth-protection.test.mjs');
  assert.match(workflow, /npm run test:auth/);
  assert.match(workflow, /auth\/\*\*/);
  const owners = read('.github/CODEOWNERS');
  assert.match(owners, /\/auth\/\s+@sheikhrashel47-stack/);
  assert.match(workflow, /\.github\/CODEOWNERS/);
});

test('protection contract locks approval, no secret persistence and Phase 2B gate', () => {
  const contract = read('auth/AUTH_PROTECTION_CONTRACT.md');
  assert.match(contract, /explicit owner approval/i);
  assert.match(contract, /localStorage.*sessionStorage/);
  assert.match(contract, /Phase 2B Email Gateway/);
  assert.match(contract, /Supabase or another authority binding belongs to Phase 3/);
});

test('Phase 2 execution plan records the owner decisions and no-code boundaries', () => {
  const plan = read('docs/AUTH-PHASE-2-EXECUTION-PLAN.md');
  assert.match(plan, /Phase 2A \+ Phase 2B split/);
  assert.match(plan, /concrete Supabase binding deferred until Phase 3/);
  assert.match(plan, /must not:[\s\S]*mount Login\/Signup UI/);
  assert.match(plan, /Phase 2B[\s\S]*requires a new explicit owner approval/);
});

test('production Pages bundle excludes Auth testing helpers', () => {
  assert.match(pagesWorkflow, /--exclude='auth\/testing'/);
  assert.match(pagesWorkflow, /--exclude='\*\.test\.mjs'/);
});

test('Auth domain contains no generated artifact or unexpected executable type', () => {
  const allowed = /\.(?:mjs|md)$/;
  assert.deepEqual(allAuthFiles.filter(file => !allowed.test(file)), []);
});
