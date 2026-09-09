import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, relative, sep } from 'node:path';

const root = process.cwd();
const read = file => readFileSync(resolve(root, file), 'utf8');
const walk = directory => readdirSync(resolve(root, directory)).flatMap(name => {
  const full = resolve(root, directory, name);
  return statSync(full).isDirectory() ? walk(relative(root, full)) : [relative(root, full).split(sep).join('/')];
});
const runtime = walk('auth-native').filter(file => file.endsWith('.mjs') && !file.includes('/testing/') && !file.includes('/operations/')).map(read).join('\n');
const clientScript = existsSync(resolve(root, 'account-access.js')) ? read('account-access.js') : '';
const client = ['account-access.js', 'account-access.css'].filter(file => existsSync(resolve(root, file))).map(read).join('\n');
const worker = read('gk-agent-worker.js');
const bundle = read('worker-bundle.mjs');
const wrangler = read('wrangler.toml');
const pagesWorker = read('_worker.js');
const pagesWorkflow = read('.github/workflows/cf-pages.yml');
const serviceWorker = read('sw.js');

const forbiddenLegacyRoutes = [
  '/api/auth/login', '/api/auth/register', '/api/auth/register-email', '/api/auth/google',
  '/api/auth/otp/send', '/api/auth/password', '/api/auth/delete', '/api/profile',
  '/api/onboarding', '/api/state', '/api/re-auth', '/api/sessions/revoke'
];

test('native Auth authority, storage, API, and client boundaries exist', () => {
  const required = [
    'auth-native/core/auth-engine.mjs', 'auth-native/core/crypto.mjs', 'auth-native/core/errors.mjs',
    'auth-native/storage/sqlite-auth-repository.mjs', 'auth-native/worker/auth-authority-do.mjs',
    'auth-native/worker/public-auth-handler.mjs', 'native-auth.test.mjs', 'native-auth-protection.test.mjs'
  ];
  assert.deepEqual(required.filter(file => !existsSync(resolve(root, file))), []);
});

test('runtime uses Web Crypto and has no weak random, plaintext-password, bearer, JWT, or browser storage primitive', () => {
  assert.doesNotMatch(runtime, /Math\.random|bcrypt|password_hash|issueToken|jsonwebtoken|\bJWT\b|Bearer\s/i);
  assert.match(runtime, /getRandomValues/);
  assert.match(runtime, /subtle\.sign\('HMAC'/);
  assert.doesNotMatch(runtime, /localStorage|sessionStorage|document\.cookie|indexedDB/i);
  assert.doesNotMatch(runtime, /console\.(log|info|warn|error|debug)\s*\(/);
});

test('SQLite authority never defines plaintext email, OTP, or session-token columns', () => {
  const storage = read('auth-native/storage/sqlite-auth-repository.mjs');
  assert.match(storage, /email_ref TEXT NOT NULL UNIQUE/);
  assert.match(storage, /code_mac TEXT NOT NULL/);
  assert.match(storage, /session_ref TEXT PRIMARY KEY/);
  assert.doesNotMatch(storage, /\bemail TEXT|otp_code|plain(?:text)?_code|session_token/i);
  assert.match(storage, /transactionSync/);
});

test('public API is versioned, returns only HttpOnly Strict session cookie, and keeps delivery internal', () => {
  const handler = read('auth-native/worker/public-auth-handler.mjs');
  assert.match(handler, /\/api\/auth\/v1/);
  assert.match(handler, /HttpOnly; Secure; SameSite=Strict/);
  assert.match(handler, /SIGNUP_VERIFICATION/);
  assert.doesNotMatch(handler, /localStorage|sessionStorage|Authorization.*Bearer|sessionToken:\s*verified\.sessionToken/);
  assert.match(handler, /deliveryLimit:\s*\{ daily: 200, monthly: 6000 \}/);
});

test('legacy retired account implementation remains absent', () => {
  for (const route of forbiddenLegacyRoutes) {
    assert.equal(worker.includes(route), false, route);
    assert.equal(bundle.includes(route), false, route);
  }
  assert.doesNotMatch(worker, /premium-auth|passkey|GOOGLE_CLIENT_ID|hashPassword|verifyPassword/);
});

test('Worker bundle and Wrangler expose distinct SQLite Auth Durable Object', () => {
  assert.match(worker, /AdmissionAuthAuthority/);
  assert.match(worker, /createNativeAuthHandler/);
  assert.match(bundle, /AdmissionAuthAuthority/);
  assert.match(bundle, /AUTH_API_PREFIX = "\/api\/auth\/v1"/);
  assert.match(bundle, /\$\{AUTH_API_PREFIX\}\/otp\/request/);
  assert.match(wrangler, /name = "AUTH_AUTHORITY"/);
  assert.match(wrangler, /new_sqlite_classes = \["AdmissionAuthAuthority"\]/);
});

test('Pages excludes server-only native Auth source and keeps defensive source block', () => {
  assert.match(pagesWorkflow, /--exclude='auth-native'/);
  assert.match(pagesWorker, /\/auth-native\//);
});

test('service worker bypasses all Auth responses instead of caching identity state', () => {
  assert.match(serviceWorker, /requestUrl\.pathname\.startsWith\('\/api\/auth\/'\)/);
  assert.match(serviceWorker, /fetch\(request, \{ cache: 'no-store' \}\)/);
});

test('client never handles a browser-readable auth token or OTP persistence', () => {
  if (!client) return;
  assert.doesNotMatch(client, /localStorage|document\.cookie|Authorization\s*:\s*['"`]Bearer/i);
  assert.doesNotMatch(client, /sessionStorage\.setItem\([^\n]*(?:otp|code|token)/i);
  const persisted = (clientScript.match(/const publicState = \{[\s\S]*?\n\s*\};/) || [''])[0];
  assert.ok(persisted);
  assert.doesNotMatch(persisted, /\bemail\s*:/);
  assert.match(client, /credentials:\s*'same-origin'/);
});
