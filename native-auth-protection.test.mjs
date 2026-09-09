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
const handler = read('auth-native/worker/public-auth-handler.mjs');
const provider = read('auth-native/providers/firebase-auth.mjs');
const client = ['account-access.js', 'account-access.css'].filter(file => existsSync(resolve(root, file))).map(read).join('\n');
const worker = read('gk-agent-worker.js');
const bundle = read('worker-bundle.mjs');
const wrangler = read('wrangler.toml');
const pagesWorker = read('_worker.js');
const pagesWorkflow = read('.github/workflows/cf-pages.yml');
const activationWorkflow = read('.github/workflows/native-auth-activate.yml');
const boundaryWorkflow = read('.github/workflows/firebase-auth-boundary-deploy.yml');
const serviceWorker = read('sw.js');

const forbiddenLegacyRoutes = [
  '/api/auth/login', '/api/auth/register', '/api/auth/register-email', '/api/auth/google',
  '/api/auth/otp/send', '/api/auth/password', '/api/auth/delete', '/api/profile',
  '/api/onboarding', '/api/state', '/api/re-auth', '/api/sessions/revoke'
];

test('Firebase Auth authority, storage, provider, API, and client boundaries exist', () => {
  const required = [
    'auth-native/core/auth-engine.mjs', 'auth-native/core/crypto.mjs', 'auth-native/core/errors.mjs',
    'auth-native/providers/firebase-auth.mjs', 'auth-native/storage/sqlite-auth-repository.mjs',
    'auth-native/worker/auth-authority-do.mjs', 'auth-native/worker/public-auth-handler.mjs',
    'native-auth.test.mjs', 'native-auth-protection.test.mjs'
  ];
  assert.deepEqual(required.filter(file => !existsSync(resolve(root, file))), []);
});

test('runtime uses Web Crypto and has no weak random, plaintext credential store, bearer token, or logging primitive', () => {
  assert.doesNotMatch(runtime, /Math\.random|bcrypt|password_hash|issueToken|jsonwebtoken|Authorization.*Bearer/i);
  assert.match(runtime, /getRandomValues/);
  assert.match(runtime, /subtle\.sign\('HMAC'/);
  assert.doesNotMatch(runtime, /localStorage|sessionStorage|document\.cookie|indexedDB/i);
  assert.doesNotMatch(runtime, /console\.(log|info|warn|error|debug)\s*\(/);
});

test('SQLite authority stores HMAC references and never plaintext email, password, or session token', () => {
  const storage = read('auth-native/storage/sqlite-auth-repository.mjs');
  assert.match(storage, /email_ref TEXT NOT NULL UNIQUE/);
  assert.match(storage, /subject_ref TEXT NOT NULL/);
  assert.match(storage, /session_ref TEXT PRIMARY KEY/);
  assert.doesNotMatch(storage, /\bemail TEXT|password(?:_hash)? TEXT|plain(?:text)?_password|session_token/i);
  assert.match(storage, /transactionSync/);
  assert.match(storage, /auth_external_identities/);
});

test('public API uses Email and Password, standard Firebase address verification, and verified-only access', () => {
  assert.match(handler, /\/api\/auth\/v1/);
  assert.match(handler, /\$\{AUTH_API_PREFIX\}\/signup/);
  assert.match(handler, /\$\{AUTH_API_PREFIX\}\/login/);
  assert.match(handler, /\$\{AUTH_API_PREFIX\}\/verification\/resend/);
  assert.match(handler, /if \(!user\.emailVerified\)/);
  assert.match(provider, /accounts:signUp/);
  assert.match(provider, /accounts:signInWithPassword/);
  assert.match(provider, /requestType: 'VERIFY_EMAIL'/);
  assert.match(provider, /accounts:lookup/);
  assert.doesNotMatch(handler, /\/otp\/request|\/otp\/verify|sendEmail|SIGNUP_VERIFICATION/);
});

test('verification architecture exposes the official Spark 1000/day capacity and no registered-user cap', () => {
  assert.match(handler, /dailyCapacity: 1000/);
  assert.match(handler, /registeredAccountLimit: 'unlimited'/);
  assert.match(runtime, /firebase-verification-global-day[\s\S]*limit: 1000/);
  assert.doesNotMatch(handler, /dailyCapacity:\s*5\b|daily:\s*5\b/);
});

test('email-link sign-in is not implemented', () => {
  assert.doesNotMatch(provider, /accounts:signInWithEmailLink|EMAIL_SIGNIN|sendSignInLinkToEmail|isSignInWithEmailLink/);
  assert.doesNotMatch(client, /signInWithEmailLink|sendSignInLinkToEmail|isSignInWithEmailLink/);
});

test('credentials remain in server-managed HttpOnly cookies and are never returned to client code', () => {
  assert.match(handler, /HttpOnly; Secure; SameSite=Strict/);
  assert.match(handler, /AUTH_FIREBASE_COOKIE/);
  assert.match(handler, /AUTH_SESSION_COOKIE/);
  assert.doesNotMatch(handler, /sessionToken:\s*established\.sessionToken|refreshToken:\s*signed\.refreshToken/);
  assert.doesNotMatch(client, /localStorage|sessionStorage|document\.cookie|Authorization\s*:\s*['"`]Bearer/i);
  assert.match(client, /credentials:\s*'same-origin'/);
  assert.doesNotMatch(client, /firebase(?:Refresh|Id)?Token/i);
});

test('legacy retired account implementation remains absent', () => {
  for (const route of forbiddenLegacyRoutes) {
    assert.equal(worker.includes(route), false, route);
    assert.equal(bundle.includes(route), false, route);
  }
  assert.doesNotMatch(worker, /premium-auth|passkey|GOOGLE_CLIENT_ID|hashPassword|verifyPassword/);
});

test('Worker bundle and Wrangler expose Firebase Auth with the distinct SQLite authority', () => {
  assert.match(worker, /AdmissionAuthAuthority/);
  assert.match(worker, /createNativeAuthHandler/);
  assert.match(bundle, /AdmissionAuthAuthority/);
  assert.match(bundle, /AUTH_API_PREFIX = "\/api\/auth\/v1"/);
  assert.match(bundle, /accounts:signInWithPassword/);
  assert.match(bundle, /requestType: "VERIFY_EMAIL"/);
  assert.match(wrangler, /name = "AUTH_AUTHORITY"/);
  assert.match(wrangler, /new_sqlite_classes = \["AdmissionAuthAuthority"\]/);
  assert.match(wrangler, /FIREBASE_CONTINUE_URL = "https:\/\/admissionhub\.pages\.dev\//);
});

test('Firebase deployment recovery captures the active version and installs the secret after pinned deployment', () => {
  for (const workflow of [activationWorkflow, boundaryWorkflow]) {
    assert.match(workflow, /wrangler@4\.35\.0 deployments status --name admission-gk --json/);
    assert.doesNotMatch(workflow, /deployments list --name admission-gk|x\?\.\[0\]/);
    assert.match(workflow, /wranglerVersion: '4\.35\.0'/);
    assert.match(workflow, /rollback "\$PREVIOUS_WORKER_VERSION"/);
  }
  const deployAt = activationWorkflow.indexOf('Deploy Worker and SQLite Auth schema fail closed');
  const secretAt = activationWorkflow.indexOf('Install Firebase Web API key on the deployed Worker version');
  const bindingAt = activationWorkflow.indexOf('Verify Firebase binding exists without reading its value');
  assert.ok(deployAt >= 0 && deployAt < secretAt && secretAt < bindingAt);
});

test('Pages excludes server-only Auth source and keeps defensive source block', () => {
  assert.match(pagesWorkflow, /--exclude='auth-native'/);
  assert.match(pagesWorker, /\/auth-native\//);
});

test('service worker bypasses all Auth responses instead of caching identity state', () => {
  assert.match(serviceWorker, /requestUrl\.pathname\.startsWith\('\/api\/auth\/'\)/);
  assert.match(serviceWorker, /fetch\(request, \{ cache: 'no-store' \}\)/);
});
