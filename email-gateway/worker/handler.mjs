import { safeParseEmailGatewayConfig } from '../core/config.mjs';
import { INTERNAL_EMAIL_PATHS, EMAIL_FAILURE_CODES } from '../core/constants.mjs';
import { verifyInternalRequest, signingSecretsFromEnv } from '../core/internal-auth.mjs';
import { EmailGatewayError, asEmailGatewayError, toPublicEmailError } from '../core/errors.mjs';
import { DurableObjectEmailStore } from '../storage/durable-object-store.mjs';
import { createEmailGateway } from '../create-email-gateway.mjs';

const HEADERS = Object.freeze({
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer'
});

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: HEADERS });
const notFound = () => json({ error: 'not-found' }, 404);

async function readBoundedBody(request, maximum) {
  const declared = Number(request.headers.get('Content-Length') || 0);
  if (Number.isFinite(declared) && declared > maximum) throw new EmailGatewayError({ code: EMAIL_FAILURE_CODES.INVALID_REQUEST, safeMessage: 'Email request body is too large.', status: 413 });
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maximum) {
      await reader.cancel();
      throw new EmailGatewayError({ code: EMAIL_FAILURE_CODES.INVALID_REQUEST, safeMessage: 'Email request body is too large.', status: 413 });
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(bytes);
}

export async function handleInternalEmailRequest(request, env = {}, ctx = {}, runtime = {}) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/internal/email/')) return null;
  if (!Object.values(INTERNAL_EMAIL_PATHS).includes(url.pathname) || request.method === 'OPTIONS') return notFound();
  const secrets = runtime.signingSecrets || signingSecretsFromEnv(env);
  if (!Object.keys(secrets).length) return notFound();

  try {
    const config = runtime.config || safeParseEmailGatewayConfig(env.EMAIL_GATEWAY_CONFIG);
    const expectedMethod = url.pathname === INTERNAL_EMAIL_PATHS.HEALTH ? 'GET' : 'POST';
    if (request.method !== expectedMethod) return json({ error: 'method-not-allowed' }, 405);
    const bodyText = expectedMethod === 'GET' ? '' : await readBoundedBody(request, config.request.maxBodyBytes);
    const store = runtime.store || new DurableObjectEmailStore(env.EMAIL_COORDINATOR, { now: runtime.now });
    await verifyInternalRequest({ request, bodyText, secrets, store, config, now: runtime.now, crypto: runtime.crypto });
    const gateway = runtime.gateway || await createEmailGateway({
      config,
      store,
      env,
      privatePepper: env.EMAIL_RECIPIENT_HASH_PEPPER,
      runtime: { ...runtime, fetchImpl: runtime.fetchImpl || globalThis.fetch }
    });

    if (url.pathname === INTERNAL_EMAIL_PATHS.HEALTH) {
      return json(await gateway.healthCheck({ includeEvents: url.searchParams.get('events') === '1' }));
    }
    let input;
    try { input = JSON.parse(bodyText); } catch (_) { throw new EmailGatewayError({ code: EMAIL_FAILURE_CODES.INVALID_REQUEST, safeMessage: 'Email request JSON is invalid.', status: 400 }); }
    if (url.pathname === INTERNAL_EMAIL_PATHS.SEND) return json(await gateway.send(input), 202);
    if (url.pathname === INTERNAL_EMAIL_PATHS.DELIVERY_EVENT) return json(await gateway.recordDeliveryEvent(input), 202);
    return notFound();
  } catch (error) {
    const normalized = asEmailGatewayError(error);
    const safe = toPublicEmailError(normalized);
    return json({ ok: false, error: safe }, normalized.status || 500);
  }
}

export const __emailWorkerTest = Object.freeze({ readBoundedBody });
