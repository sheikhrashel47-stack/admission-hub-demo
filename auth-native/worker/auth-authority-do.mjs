import { CloudflareNativeAuthEngine } from '../core/auth-engine.mjs';
import { asNativeAuthError, AUTH_ERROR_CODES, NativeAuthError } from '../core/errors.mjs';
import { SqliteAuthRepository } from '../storage/sqlite-auth-repository.mjs';

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
  if (!raw || raw.length > 16_384) throw new NativeAuthError(AUTH_ERROR_CODES.INVALID_INPUT);
  try { return JSON.parse(raw); } catch { throw new NativeAuthError(AUTH_ERROR_CODES.INVALID_INPUT); }
}

export class AdmissionAuthAuthority {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.ready = state.blockConcurrencyWhile(async () => {
      this.repository = new SqliteAuthRepository(state.storage);
      this.repository.migrate();
      this.engine = new CloudflareNativeAuthEngine({
        repository: this.repository,
        hmacSecret: env.AUTH_HMAC_SECRET
      });
    });
  }

  async #scheduleExpiry() {
    const next = await this.engine.nextExpiry();
    if (!next) return;
    const scheduled = await this.state.storage.getAlarm();
    if (!scheduled || next < scheduled) await this.state.storage.setAlarm(next);
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
      if (url.pathname === '/internal/otp/prepare') {
        const result = await this.engine.prepareOtp(body.input, body.context);
        await this.#scheduleExpiry();
        return response(200, { ok: true, result });
      }
      if (url.pathname === '/internal/otp/delivery') {
        const result = await this.engine.markDelivery(body.challengeId, body.delivery);
        return response(200, { ok: true, result });
      }
      if (url.pathname === '/internal/otp/verify') {
        const result = await this.engine.verifyOtp(body.input, body.context);
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
      await this.engine.cleanup();
      const next = await this.engine.nextExpiry();
      if (next) await this.state.storage.setAlarm(next);
    } catch {
      await this.state.storage.setAlarm(Date.now() + 60 * 60 * 1000);
    }
  }
}
