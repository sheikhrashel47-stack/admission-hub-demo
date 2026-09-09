import { AUTH_NATIVE_VERSION } from '../core/auth-engine.mjs';
import { randomToken } from '../core/crypto.mjs';
import { AUTH_ERROR_CODES, asNativeAuthError, NativeAuthError } from '../core/errors.mjs';

export const AUTH_API_PREFIX = '/api/auth/v1';
export const AUTH_SESSION_COOKIE = '__Host-ah_session';
export const AUTH_DEVICE_COOKIE = '__Host-ah_device';
const AUTHORITY_NAME = 'admission-hub-global-auth-v1';
const MAX_BODY_BYTES = 4096;
const YEAR_SECONDS = 365 * 24 * 60 * 60;

const JSON_HEADERS = Object.freeze({
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store, max-age=0',
  Pragma: 'no-cache',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Cross-Origin-Resource-Policy': 'same-site',
  Vary: 'Origin'
});

const allowedOrigin = origin => {
  if (!origin) return true;
  try {
    const url = new URL(origin);
    if (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)) return true;
    if (url.protocol !== 'https:') return false;
    return url.hostname === 'admissionhub.pages.dev'
      || /^[a-z0-9-]+\.admissionhub\.pages\.dev$/i.test(url.hostname)
      || url.hostname === 'admission-gk.admissionhub.workers.dev';
  } catch { return false; }
};

const corsHeaders = request => {
  const origin = request.headers.get('Origin') || '';
  return origin && allowedOrigin(origin) ? {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Credentials': 'true'
  } : {};
};

const json = (request, status, body, headers = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { ...JSON_HEADERS, ...corsHeaders(request), ...headers }
});

const cookies = request => Object.fromEntries(
  String(request.headers.get('Cookie') || '').split(';').map(part => part.trim()).filter(Boolean).map(part => {
    const index = part.indexOf('=');
    return index < 1 ? ['', ''] : [part.slice(0, index), part.slice(index + 1)];
  }).filter(([key]) => key)
);

const sessionCookie = (token, maxAge) => `${AUTH_SESSION_COOKIE}=${token}; Path=/; Max-Age=${Math.max(0, Math.floor(maxAge))}; HttpOnly; Secure; SameSite=Strict`;
const deviceCookie = token => `${AUTH_DEVICE_COOKIE}=${token}; Path=/; Max-Age=${YEAR_SECONDS}; HttpOnly; Secure; SameSite=Lax`;

async function readJson(request) {
  if (!String(request.headers.get('Content-Type') || '').toLowerCase().startsWith('application/json')) {
    throw new NativeAuthError(AUTH_ERROR_CODES.INVALID_INPUT);
  }
  const declared = Number(request.headers.get('Content-Length') || 0);
  if (declared > MAX_BODY_BYTES || !request.body) throw new NativeAuthError(AUTH_ERROR_CODES.INVALID_INPUT);
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let raw = '';
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      throw new NativeAuthError(AUTH_ERROR_CODES.INVALID_INPUT);
    }
    raw += decoder.decode(value, { stream: true });
  }
  raw += decoder.decode();
  if (!raw) throw new NativeAuthError(AUTH_ERROR_CODES.INVALID_INPUT);
  try { return JSON.parse(raw); } catch { throw new NativeAuthError(AUTH_ERROR_CODES.INVALID_INPUT); }
}

const clientContext = (request, existingDeviceId = '') => {
  const deviceId = /^[A-Za-z0-9_-]{20,96}$/.test(existingDeviceId) ? existingDeviceId : randomToken(24);
  return Object.freeze({
    deviceId,
    isNewDevice: deviceId !== existingDeviceId,
    ip: String(request.headers.get('CF-Connecting-IP') || 'unknown').slice(0, 96),
    userAgent: String(request.headers.get('User-Agent') || '').slice(0, 300)
  });
};

async function callAuthority(env, path, body, method = 'POST') {
  if (!env?.AUTH_AUTHORITY || typeof env.AUTH_AUTHORITY.idFromName !== 'function') {
    throw new NativeAuthError(AUTH_ERROR_CODES.NOT_CONFIGURED);
  }
  let response;
  try {
    const id = env.AUTH_AUTHORITY.idFromName(AUTHORITY_NAME);
    const stub = env.AUTH_AUTHORITY.get(id);
    response = await stub.fetch(`https://auth.internal${path}`, method === 'GET' ? { method } : {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body || {})
    });
  } catch {
    throw new NativeAuthError(AUTH_ERROR_CODES.STORAGE_UNAVAILABLE);
  }
  let data;
  try { data = await response.json(); } catch { throw new NativeAuthError(AUTH_ERROR_CODES.STORAGE_UNAVAILABLE); }
  if (!response.ok || !data?.ok) {
    throw new NativeAuthError(data?.error?.code || AUTH_ERROR_CODES.STORAGE_UNAVAILABLE, {
      retryAfter: data?.error?.retryAfter || response.headers.get('Retry-After')
    });
  }
  return data.result || data;
}

function deliverySucceeded(result) {
  return Boolean(result?.ok && ['ACCEPTED', 'QUEUED', 'SENT', 'DELIVERED'].includes(result.status));
}

export function createNativeAuthHandler({ sendEmail } = {}) {
  if (typeof sendEmail !== 'function') throw new TypeError('sendEmail dependency is required.');

  return async function handleNativeAuthRequest(request, env, executionContext) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith(`${AUTH_API_PREFIX}/`) && url.pathname !== AUTH_API_PREFIX) return null;

    if (!allowedOrigin(request.headers.get('Origin') || '')) {
      return json(request, 403, { ok: false, error: { code: 'ORIGIN_FORBIDDEN', message: 'অনুমোদিত উৎস নয়।' } });
    }
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          ...JSON_HEADERS,
          ...corsHeaders(request),
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'content-type',
          'Access-Control-Max-Age': '600'
        }
      });
    }

    try {
      if (request.method === 'GET' && url.pathname === `${AUTH_API_PREFIX}/config`) {
        const health = await callAuthority(env, '/internal/ping', null, 'GET');
        return json(request, 200, {
          ok: true,
          auth: {
            version: AUTH_NATIVE_VERSION,
            mode: 'passwordless-email-otp',
            storage: health.storage,
            otp: { digits: 6, expiresIn: 600, resendAfter: 60, maxAttempts: 5 },
            session: { transport: 'secure-http-only-cookie', maxAge: 2592000 },
            deliveryLimit: { daily: 200, monthly: 6000 }
          }
        });
      }

      if (request.method === 'POST' && url.pathname === `${AUTH_API_PREFIX}/otp/request`) {
        const body = await readJson(request);
        const jar = cookies(request);
        const context = clientContext(request, jar[AUTH_DEVICE_COOKIE]);
        const prepared = await callAuthority(env, '/internal/otp/prepare', {
          input: { email: body.email }, context
        });
        const requestId = `authotp:${prepared.challengeId}`;
        let delivery;
        try {
          delivery = await sendEmail(env, executionContext, {
            type: 'SIGNUP_VERIFICATION',
            recipient: prepared.email,
            subject: 'Admission Hub নিরাপত্তা কোড',
            template: 'SIGNUP_VERIFICATION',
            variables: { otp: prepared.code, purpose: 'নিরাপদ অ্যাকাউন্ট যাচাই' },
            requestId,
            idempotencyKey: requestId,
            priority: 'HIGH',
            context: { ip: context.ip, deviceId: context.deviceId }
          });
        } catch (error) {
          const uncertain = Boolean(error?.uncertain || error?.dispatched);
          await callAuthority(env, '/internal/otp/delivery', {
            challengeId: prepared.challengeId,
            delivery: { accepted: false, uncertain, provider: error?.providerId || null }
          });
          if (!uncertain) throw new NativeAuthError(AUTH_ERROR_CODES.DELIVERY_UNAVAILABLE);
          delivery = { ok: false, uncertain: true, status: 'UNCERTAIN' };
        }
        if (!deliverySucceeded(delivery) && !delivery?.uncertain) {
          await callAuthority(env, '/internal/otp/delivery', {
            challengeId: prepared.challengeId,
            delivery: { accepted: false, uncertain: false, provider: delivery?.providerId || null }
          });
          throw new NativeAuthError(AUTH_ERROR_CODES.DELIVERY_UNAVAILABLE);
        }
        if (deliverySucceeded(delivery)) {
          await callAuthority(env, '/internal/otp/delivery', {
            challengeId: prepared.challengeId,
            delivery: { accepted: true, uncertain: false, provider: delivery.providerId || null }
          });
        }
        return json(request, 202, {
          ok: true,
          challenge: {
            id: prepared.challengeId,
            emailMasked: prepared.emailMask,
            expiresAt: prepared.expiresAt,
            expiresIn: prepared.expiresIn,
            resendAfter: prepared.resendAfter,
            delivery: delivery?.uncertain ? 'uncertain' : 'accepted'
          }
        }, context.isNewDevice ? { 'Set-Cookie': deviceCookie(context.deviceId) } : {});
      }

      if (request.method === 'POST' && url.pathname === `${AUTH_API_PREFIX}/otp/verify`) {
        const body = await readJson(request);
        const jar = cookies(request);
        const context = clientContext(request, jar[AUTH_DEVICE_COOKIE]);
        const verified = await callAuthority(env, '/internal/otp/verify', {
          input: { email: body.email, challengeId: body.challengeId, code: body.code }, context
        });
        const maxAge = Math.max(1, Math.floor((Number(verified.sessionExpiresAt) - Date.now()) / 1000));
        return json(request, 200, {
          ok: true,
          authenticated: true,
          created: verified.created,
          user: verified.user,
          session: { expiresAt: verified.sessionExpiresAt }
        }, { 'Set-Cookie': sessionCookie(verified.sessionToken, maxAge) });
      }

      if (request.method === 'GET' && url.pathname === `${AUTH_API_PREFIX}/session`) {
        const token = cookies(request)[AUTH_SESSION_COOKIE];
        if (!token) throw new NativeAuthError(AUTH_ERROR_CODES.SESSION_INVALID);
        const session = await callAuthority(env, '/internal/session/get', { sessionToken: token });
        return json(request, 200, { ok: true, authenticated: true, ...session });
      }

      if (request.method === 'POST' && url.pathname === `${AUTH_API_PREFIX}/session/logout`) {
        const token = cookies(request)[AUTH_SESSION_COOKIE];
        if (token) await callAuthority(env, '/internal/session/revoke', { sessionToken: token });
        return json(request, 200, { ok: true, authenticated: false }, {
          'Set-Cookie': sessionCookie('', 0)
        });
      }

      return json(request, 404, { ok: false, error: { code: 'NOT_FOUND', message: 'Endpoint পাওয়া যায়নি।' } });
    } catch (cause) {
      const error = asNativeAuthError(cause);
      return json(request, error.status, { ok: false, error: error.toPublic() }, error.retryAfter ? { 'Retry-After': String(error.retryAfter) } : {});
    }
  };
}
