import test from 'node:test';
import assert from 'node:assert/strict';
import { auditCloudflareProviderLocations } from './email-gateway/operations/audit-cloudflare-provider-locations.mjs';

const response = result => ({
  ok: true,
  status: 200,
  json: async () => ({ success: true, result })
});

test('Cloudflare provider-location audit reports only provider binding names across Workers and Pages', async () => {
  const privateValues = ['never-print-worker-value', 'never-print-page-value'];
  const fetchImpl = async input => {
    const url = String(input);
    if (url.endsWith('/workers/scripts')) return response([{ id: 'admission-gk' }, { id: 'other-worker' }]);
    if (url.endsWith('/workers/scripts/admission-gk/secrets')) {
      return response([
        { name: 'RESEND_KEY', text: privateValues[0] },
        { name: 'MAILJET_API_KEY' },
        { name: 'ADMIN_TOKEN' }
      ]);
    }
    if (url.endsWith('/workers/scripts/other-worker/secrets')) return response([{ name: 'UNRELATED_TOKEN' }]);
    if (url.endsWith('/pages/projects')) return response([{ name: 'admissionhub' }]);
    if (url.endsWith('/pages/projects/admissionhub')) {
      return response({
        deployment_configs: {
          production: {
            env_vars: {
              BREVO_KEY: { type: 'secret_text', value: privateValues[1] },
              GOOGLE_CLIENT_ID: { type: 'plain_text', value: 'not-provider-data' }
            }
          },
          preview: { env_vars: { RESEND_API_KEY: { type: 'secret_text', value: 'also-private' } } }
        }
      });
    }
    throw new Error(`Unexpected request: ${url}`);
  };

  const locations = await auditCloudflareProviderLocations({
    accountId: 'account-id',
    apiToken: 'api-token',
    fetchImpl
  });

  assert.deepEqual(locations.map(location => ({ ...location, names: [...location.names] })), [
    { type: 'worker', name: 'admission-gk', environment: null, names: ['MAILJET_API_KEY', 'RESEND_KEY'] },
    { type: 'pages', name: 'admissionhub', environment: 'production', names: ['BREVO_KEY'] },
    { type: 'pages', name: 'admissionhub', environment: 'preview', names: ['RESEND_API_KEY'] }
  ]);
  const serialized = JSON.stringify(locations);
  for (const value of privateValues) assert.doesNotMatch(serialized, new RegExp(value));
  assert.doesNotMatch(serialized, /ADMIN_TOKEN|GOOGLE_CLIENT_ID|UNRELATED_TOKEN/);
});

test('Cloudflare provider-location audit bounds transport failures without response details', async () => {
  await assert.rejects(
    auditCloudflareProviderLocations({
      accountId: 'account-id',
      apiToken: 'api-token',
      fetchImpl: async () => ({ ok: false, status: 403 })
    }),
    error => {
      assert.match(error.message, /HTTP 403/);
      assert.doesNotMatch(error.message, /api-token|response body/);
      return true;
    }
  );
});
