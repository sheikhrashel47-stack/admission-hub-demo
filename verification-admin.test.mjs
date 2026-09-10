import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AUTH_API_PREFIX, createNativeAuthHandler } from './auth-native/worker/public-auth-handler.mjs';

const controlCenter = readFileSync(new URL('./verification-control-center.html', import.meta.url), 'utf8');
const ADMIN_TOKEN = `admin-${'a'.repeat(40)}`;

class Authority {
  constructor() { this.calls = []; }
  idFromName(name) { return name; }
  get() { return { fetch: this.fetch.bind(this) }; }
  async fetch(input, init) {
    const request = input instanceof Request ? input : new Request(input, init);
    const path = new URL(request.url).pathname;
    const body = request.method === 'GET' ? {} : await request.json();
    this.calls.push({ path, body });
    const result = {
      enabled: false,
      policy: { codeTtlSeconds: 300, maxAttempts: 5 },
      providers: [{
        id: 'otp-a', channel: 'otp', enabled: false, configured: false, priority: 10,
        quota: { local: { used: 0, remaining: 0, limit: 0, resetAt: 0 }, remote: { used: 0, remaining: 0, limit: 0, resetAt: 0 }, low: true },
        health: { circuit: 'closed', successCount: 0, failureCount: 0, latencyMs: 0, lastReason: 'NONE' }
      }],
      recentEvents: []
    };
    return Response.json({ ok: true, result });
  }
}

const request = (path, { method = 'GET', token = '', body } = {}) => new Request(`https://worker.example${path}`, {
  method,
  headers: {
    Origin: 'https://admissionhub.pages.dev',
    ...(token ? { 'X-AH-Admin-Token': token } : {}),
    ...(body ? { 'Content-Type': 'application/json' } : {})
  },
  ...(body ? { body: JSON.stringify(body) } : {})
});

test('Verification Control Center stores no token in browser storage and contains no provider credential fields', () => {
  assert.doesNotMatch(controlCenter, /(?:window\.)?(?:localStorage|sessionStorage|indexedDB)\s*(?:\.|\[)|document\.cookie\s*=/i);
  assert.doesNotMatch(controlCenter, /name=["']?(api[_-]?key|secret|access[_-]?token|private[_-]?key)/i);
  assert.match(controlCenter, /Provider priority ও quota/);
  assert.match(controlCenter, /সাম্প্রতিক নিরাপদ ঘটনা/);
  assert.match(controlCenter, /pagehide[\s\S]*token=''/);
});

test('admin verification status and policy routes fail closed without the existing admin secret', async () => {
  const authority = new Authority();
  const handler = createNativeAuthHandler({ fetchImpl: async () => Response.json({}) });
  const env = { AUTH_AUTHORITY: authority, ADMIN_TOKEN };
  for (const supplied of ['', 'wrong-token-that-is-long-enough-12345']) {
    const response = await handler(request(`${AUTH_API_PREFIX}/admin/verification/status`, { token: supplied }), env);
    assert.equal(response.status, 403);
    assert.equal((await response.json()).error.code, 'FORBIDDEN');
  }
  assert.equal(authority.calls.length, 0);
});

test('admin status is sanitized and config strips secret-shaped fields before the Durable Object call', async () => {
  const authority = new Authority();
  const handler = createNativeAuthHandler({ fetchImpl: async () => Response.json({}) });
  const env = { AUTH_AUTHORITY: authority, ADMIN_TOKEN };
  const status = await handler(request(`${AUTH_API_PREFIX}/admin/verification/status`, { token: ADMIN_TOKEN }), env);
  assert.equal(status.status, 200);
  assert.equal((await status.json()).providers[0].configured, false);

  const save = await handler(request(`${AUTH_API_PREFIX}/admin/verification/config`, {
    method: 'POST', token: ADMIN_TOKEN,
    body: {
      config: {
        enabled: true,
        apiKey: 'must-never-cross-boundary',
        policy: { codeTtlSeconds: 240, maxAttempts: 4, secret: 'must-never-cross-boundary' },
        providers: [{ id: 'otp-a', enabled: true, priority: 9, dailyQuota: 100, accessToken: 'must-never-cross-boundary' }]
      }
    }
  }), env);
  assert.equal(save.status, 200);
  const forwarded = authority.calls.find(call => call.path.endsWith('/admin/config')).body;
  const serialized = JSON.stringify(forwarded);
  assert.equal(serialized.includes('must-never-cross-boundary'), false);
  assert.equal(serialized.includes('apiKey'), false);
  assert.equal(serialized.includes('accessToken'), false);
  assert.equal(forwarded.config.policy.maxAttempts, 4);
  assert.equal(forwarded.config.providers.find(row => row.id === 'otp-a').priority, 9);
});
