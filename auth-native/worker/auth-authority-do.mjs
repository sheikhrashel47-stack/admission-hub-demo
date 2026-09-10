import { CloudflareNativeAuthEngine } from '../core/auth-engine.mjs';
import { asNativeAuthError, AUTH_ERROR_CODES, NativeAuthError } from '../core/errors.mjs';
import { SqliteAuthRepository } from '../storage/sqlite-auth-repository.mjs';
import { VerificationOrchestrator } from '../verification/orchestrator.mjs';
import { createConfiguredVerificationProviders } from '../verification/providers.mjs';
import { SqliteVerificationRepository } from '../verification/sqlite-verification-repository.mjs';

const JSON_HEADERS = Object.freeze({
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store, max-age=0',
  Pragma: 'no-cache',
  'X-Content-Type-Options': 'nosniff'
});

const response = (status, body, extraHeaders = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { ...JSON_HEADERS, ...extraHeaders }
});

async function readJson(request) {
  const raw = await request.text();
  if (!raw || raw.length > 32_768) throw new NativeAuthError(AUTH_ERROR_CODES.INVALID_INPUT);
  try { return JSON.parse(raw); } catch { throw new NativeAuthError(AUTH_ERROR_CODES.INVALID_INPUT); }
}

export class AdmissionAuthAuthority {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.ready = state.blockConcurrencyWhile(async () => {
      this.repository = new SqliteAuthRepository(state.storage);
      this.repository.migrate();
      this.verificationRepository = new SqliteVerificationRepository(state.storage);
      this.verificationRepository.migrate();
      this.engine = new CloudflareNativeAuthEngine({
        repository: this.repository,
        hmacSecret: env.AUTH_HMAC_SECRET
      });
      const persistedVerificationConfig = await this.verificationRepository.getRuntimeConfig();
      this.verification = new VerificationOrchestrator({
        repository: this.verificationRepository,
        hmacSecret: env.AUTH_HMAC_SECRET,
        config: persistedVerificationConfig || env.VERIFICATION_ORCHESTRATOR_CONFIG,
        providers: createConfiguredVerificationProviders(env),
        activated: env.VERIFICATION_AUTH_ACTIVATION === 'enabled'
      });
    });
  }

  async #scheduleExpiry() {
    const expiries = await Promise.all([this.engine.nextExpiry(), this.verification.nextExpiry()]);
    const next = expiries.filter(Boolean).sort((left, right) => left - right)[0] || null;
    if (!next) return;
    const scheduled = await this.state.storage.getAlarm();
    if (!scheduled || next < scheduled) await this.state.storage.setAlarm(next);
  }

  async #verificationIdentity(input = {}) {
    const session = await this.engine.getFirebaseSession(input.sessionToken, {
      email: input.email,
      subject: input.subject
    });
    return { ...input, userId: session.user.id };
  }

  async fetch(request) {
    try {
      await this.ready;
      const url = new URL(request.url);
      if (request.method === 'GET' && url.pathname === '/internal/ping') {
        return response(200, { ok: true, ...(await this.engine.ping()) });
      }
      if (request.method !== 'POST') return response(405, { ok: false, error: { code: 'METHOD_NOT_ALLOWED' } }, { Allow: 'POST' });
      const body = await readJson(request);
      if (url.pathname === '/internal/firebase/rate') {
        const result = await this.engine.consumeFirebaseOperation(body.input, body.context);
        await this.#scheduleExpiry();
        return response(200, { ok: true, result });
      }
      if (url.pathname === '/internal/firebase/session/create') {
        const result = await this.engine.establishFirebaseSession(body.input, body.context);
        await this.#scheduleExpiry();
        return response(200, { ok: true, result });
      }
      if (url.pathname === '/internal/firebase/session/get') {
        const result = await this.engine.getFirebaseSession(body.sessionToken, body.input);
        return response(200, { ok: true, result });
      }
      if (url.pathname === '/internal/passkey/registration/begin') {
        const result = await this.engine.beginPasskeyRegistration(body.input, body.context);
        await this.#scheduleExpiry();
        return response(200, { ok: true, result });
      }
      if (url.pathname === '/internal/passkey/registration/finish') {
        const result = await this.engine.finishPasskeyRegistration(body.input, body.context);
        await this.#scheduleExpiry();
        return response(200, { ok: true, result });
      }
      if (url.pathname === '/internal/passkey/authentication/begin') {
        const result = await this.engine.beginPasskeyAuthentication(body.context);
        await this.#scheduleExpiry();
        return response(200, { ok: true, result });
      }
      if (url.pathname === '/internal/passkey/authentication/finish') {
        const result = await this.engine.finishPasskeyAuthentication(body.input, body.context);
        await this.#scheduleExpiry();
        return response(200, { ok: true, result });
      }
      if (url.pathname === '/internal/passkey/session/complete') {
        const result = await this.engine.completePasskeySession(body.input, body.context);
        await this.#scheduleExpiry();
        return response(200, { ok: true, result });
      }
      if (url.pathname === '/internal/passkey/status') {
        const result = await this.engine.getPasskeyStatus(body.input, body.context);
        return response(200, { ok: true, result });
      }
      if (url.pathname === '/internal/passkey/remove') {
        const result = await this.engine.removePasskey(body.input, body.context);
        return response(200, { ok: true, result });
      }
      if (url.pathname === '/internal/verification/capabilities') {
        const result = await this.verification.capabilities();
        return response(200, { ok: true, result });
      }
      if (url.pathname === '/internal/verification/request') {
        const input = await this.#verificationIdentity(body.input);
        const result = await this.verification.requestVerification(input, body.context);
        await this.#scheduleExpiry();
        return response(200, { ok: true, result });
      }
      if (url.pathname === '/internal/verification/verify') {
        const input = await this.#verificationIdentity(body.input);
        const result = await this.verification.verify(input, body.context);
        await this.#scheduleExpiry();
        return response(200, { ok: true, result });
      }
      if (url.pathname === '/internal/verification/telegram/webhook') {
        const result = await this.verification.confirmTelegramWebhook(body.input);
        await this.#scheduleExpiry();
        return response(200, { ok: true, result });
      }
      if (url.pathname === '/internal/verification/admin/status') {
        const result = await this.verification.adminStatus();
        return response(200, { ok: true, result });
      }
      if (url.pathname === '/internal/verification/admin/config') {
        const result = await this.verification.updateConfig(body.config);
        await this.#scheduleExpiry();
        return response(200, { ok: true, result });
      }
      if (url.pathname === '/internal/session/get') {
        const result = await this.engine.getSession(body.sessionToken);
        return response(200, { ok: true, result });
      }
      if (url.pathname === '/internal/session/revoke') {
        const result = await this.engine.revokeSession(body.sessionToken);
        return response(200, { ok: true, result });
      }
      return response(404, { ok: false, error: { code: 'NOT_FOUND' } });
    } catch (cause) {
      const error = asNativeAuthError(cause);
      return response(error.status, { ok: false, error: error.toPublic() }, error.retryAfter ? { 'Retry-After': String(error.retryAfter) } : {});
    }
  }

  async alarm() {
    try {
      await this.ready;
      await Promise.all([this.engine.cleanup(), this.verification.cleanup()]);
      const expiries = await Promise.all([this.engine.nextExpiry(), this.verification.nextExpiry()]);
      const next = expiries.filter(Boolean).sort((left, right) => left - right)[0] || null;
      if (next) await this.state.storage.setAlarm(next);
    } catch {
      await this.state.storage.setAlarm(Date.now() + 60 * 60 * 1000);
    }
  }
}
