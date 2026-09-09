import { AUTH_NATIVE_VERSION, FIREBASE_VERIFICATION_RESEND_COOLDOWN_MS } from '../core/auth-engine.mjs';
import { randomToken } from '../core/crypto.mjs';
import { AUTH_ERROR_CODES, asNativeAuthError, NativeAuthError } from '../core/errors.mjs';
import { FirebaseEmailPasswordProvider, FirebaseRequestError } from '../providers/firebase-auth.mjs';

export const AUTH_API_PREFIX = '/api/auth/v1';
export const AUTH_SESSION_COOKIE = '__Host-ah_session';
export const AUTH_FIREBASE_COOKIE = '__Host-ah_firebase';
export const AUTH_DEVICE_COOKIE = '__Host-ah_device';
const AUTHORITY_NAME = 'admission-hub-global-auth-v1';
const MAX_BODY_BYTES = 4096;
const YEAR_SECONDS = 365 * 24 * 60 * 60;
const SESSION_SECONDS = 30 * 24 * 60 * 60;
const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128;
const FIREBASE_VERIFICATION_RESEND_SECONDS = Math.floor(FIREBASE_VERIFICATION_RESEND_COOLDOWN_MS / 1000);

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

const json = (request, status, body, extraHeaders = {}) => {
  const headers = new Headers({ ...JSON_HEADERS, ...corsHeaders(request) });
  for (const [name, value] of Object.entries(extraHeaders || {})) {
    if (Array.isArray(value)) value.forEach(item => headers.append(name, item));
    else headers.set(name, value);
  }
  return new Response(JSON.stringify(body), { status, headers });
};

const cookies = request => Object.fromEntries(
  String(request.headers.get('Cookie') || '').split(';').map(part => part.trim()).filter(Boolean).map(part => {
    const index = part.indexOf('=');
    if (index < 1) return ['', ''];
    const value = part.slice(index + 1);
    try { return [part.slice(0, index), decodeURIComponent(value)]; } catch { return [part.slice(0, index), '']; }
  }).filter(([key]) => key)
);

const secureCookie = (name, token, maxAge) => `${name}=${encodeURIComponent(String(token || ''))}; Path=/; Max-Age=${Math.max(0, Math.floor(maxAge))}; HttpOnly; Secure; SameSite=Strict`;
const sessionCookie = (token, maxAge) => secureCookie(AUTH_SESSION_COOKIE, token, maxAge);
const firebaseCookie = (token, maxAge) => secureCookie(AUTH_FIREBASE_COOKIE, token, maxAge);
const deviceCookie = token => `${AUTH_DEVICE_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${YEAR_SECONDS}; HttpOnly; Secure; SameSite=Lax`;
const clearAuthCookies = () => [sessionCookie('', 0), firebaseCookie('', 0)];

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

const credentials = body => {
  const email = String(body?.email || '').trim();
  const password = typeof body?.password === 'string' ? body.password : '';
  if (!email || password.length < PASSWORD_MIN || password.length > PASSWORD_MAX || /[\r\n\u0000]/.test(password)) {
    throw new NativeAuthError(password && password.length < PASSWORD_MIN ? AUTH_ERROR_CODES.WEAK_PASSWORD : AUTH_ERROR_CODES.INVALID_INPUT);
  }
  return Object.freeze({ email, password });
};

async function callAuthority(env, path, body, method = 'POST') {
  if (!env?.AUTH_AUTHORITY || typeof env.AUTH_AUTHORITY.idFromName !== 'function') {
    throw new NativeAuthError(AUTH_ERROR_CODES.NOT_CONFIGURED);
  }
  let response;
  try {
    const id = env.AUTH_AUTHORITY.idFromName(AUTHORITY_NAME);
    const stub = env.AUTH_AUTHORITY.get(id, { locationHint: 'apac' });
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

function providerAvailabilityFailure(cause) {
  if (!(cause instanceof FirebaseRequestError)) return Object.freeze({ code: 'PROVIDER_CHECK_FAILED', providerStatus: 0 });
  const reason = String(cause.reason || '');
  const providerStatus = Number.isInteger(cause.status) && cause.status >= 100 && cause.status <= 599 ? cause.status : 0;
  if (reason === 'NETWORK_ERROR') return Object.freeze({ code: 'PROVIDER_NETWORK_ERROR', providerStatus });
  if (/REFERER|REFERRER/.test(reason)) return Object.freeze({ code: 'API_KEY_REFERRER_RESTRICTED', providerStatus });
  if (/ACCESS_NOT_CONFIGURED|SERVICE_DISABLED|API_NOT_ACTIVATED/.test(reason)) {
    return Object.freeze({ code: 'IDENTITY_TOOLKIT_DISABLED', providerStatus });
  }
  if (/API_KEY/.test(reason)) return Object.freeze({ code: 'API_KEY_REJECTED', providerStatus });
  if (reason === 'PROJECT_NOT_FOUND') return Object.freeze({ code: 'PROJECT_NOT_FOUND', providerStatus });
  return Object.freeze({ code: providerStatus ? `PROVIDER_HTTP_${providerStatus}` : 'PROVIDER_CHECK_FAILED', providerStatus });
}

const PROVIDER_DIAGNOSTIC_REASONS = new Set([
  'NETWORK_ERROR', 'INVALID_PROVIDER_RESPONSE', 'NOT_CONFIGURED', 'API_KEY_INVALID',
  'PROJECT_NOT_FOUND', 'OPERATION_NOT_ALLOWED', 'INVALID_EMAIL', 'MISSING_EMAIL',
  'MISSING_PASSWORD', 'EMAIL_EXISTS', 'WEAK_PASSWORD', 'INVALID_LOGIN_CREDENTIALS',
  'EMAIL_NOT_FOUND', 'INVALID_PASSWORD', 'USER_DISABLED', 'TOO_MANY_ATTEMPTS_TRY_LATER',
  'TOO_MANY_ATTEMPTS', 'IP_BLOCKED', 'QUOTA_EXCEEDED', 'INVALID_CONTINUE_URI',
  'UNAUTHORIZED_DOMAIN', 'INVALID_REFRESH_TOKEN', 'TOKEN_EXPIRED', 'INVALID_ID_TOKEN',
  'USER_NOT_FOUND', 'MISSING_RECAPTCHA_TOKEN', 'INVALID_RECAPTCHA_TOKEN',
  'CAPTCHA_CHECK_FAILED', 'RECAPTCHA_CHECK_FAILED'
]);

function providerDiagnostic(cause, stage) {
  const operation = String(stage || 'auth').toUpperCase().replace(/[^A-Z0-9_]/g, '_').slice(0, 24) || 'AUTH';
  if (!(cause instanceof FirebaseRequestError)) return `${operation}_UNEXPECTED`;
  const reason = PROVIDER_DIAGNOSTIC_REASONS.has(cause.reason)
    ? cause.reason
    : cause.status >= 100 && cause.status <= 599
      ? `HTTP_${cause.status}`
      : 'UNKNOWN';
  return `${operation}_${reason}`;
}

function providerError(cause, stage = 'auth') {
  const tagged = error => {
    error.providerDiagnostic = providerDiagnostic(cause, stage);
    return error;
  };
  if (!(cause instanceof FirebaseRequestError)) return tagged(new NativeAuthError(AUTH_ERROR_CODES.AUTH_PROVIDER_UNAVAILABLE));
  const reason = cause.reason;
  if (reason === 'NOT_CONFIGURED' || ['API_KEY_INVALID', 'PROJECT_NOT_FOUND', 'OPERATION_NOT_ALLOWED'].includes(reason)) {
    return tagged(new NativeAuthError(AUTH_ERROR_CODES.NOT_CONFIGURED));
  }
  if (['INVALID_EMAIL', 'MISSING_EMAIL', 'MISSING_PASSWORD'].includes(reason)) return tagged(new NativeAuthError(AUTH_ERROR_CODES.INVALID_INPUT));
  if (reason === 'EMAIL_EXISTS') return tagged(new NativeAuthError(AUTH_ERROR_CODES.EMAIL_ALREADY_IN_USE));
  if (reason === 'WEAK_PASSWORD') return tagged(new NativeAuthError(AUTH_ERROR_CODES.WEAK_PASSWORD));
  if (['INVALID_LOGIN_CREDENTIALS', 'EMAIL_NOT_FOUND', 'INVALID_PASSWORD'].includes(reason)) {
    return tagged(new NativeAuthError(AUTH_ERROR_CODES.INVALID_CREDENTIALS));
  }
  if (reason === 'USER_DISABLED') return tagged(new NativeAuthError(AUTH_ERROR_CODES.ACCOUNT_DISABLED));
  if (['TOO_MANY_ATTEMPTS_TRY_LATER', 'TOO_MANY_ATTEMPTS', 'IP_BLOCKED'].includes(reason)) {
    return tagged(new NativeAuthError(AUTH_ERROR_CODES.RATE_LIMITED, { retryAfter: 60 }));
  }
  if (stage === 'verification' && ['QUOTA_EXCEEDED', 'INVALID_CONTINUE_URI', 'UNAUTHORIZED_DOMAIN', 'NETWORK_ERROR', 'INVALID_PROVIDER_RESPONSE'].includes(reason)) {
    return tagged(new NativeAuthError(AUTH_ERROR_CODES.VERIFICATION_UNAVAILABLE));
  }
  if (['refresh', 'lookup-session'].includes(stage) && ['INVALID_REFRESH_TOKEN', 'TOKEN_EXPIRED', 'INVALID_ID_TOKEN', 'USER_NOT_FOUND'].includes(reason)) {
    return tagged(new NativeAuthError(AUTH_ERROR_CODES.SESSION_INVALID));
  }
  return tagged(new NativeAuthError(AUTH_ERROR_CODES.AUTH_PROVIDER_UNAVAILABLE));
}

const assertProviderUser = (signed, user) => {
  if (signed.subject !== user.subject) throw new NativeAuthError(AUTH_ERROR_CODES.AUTH_PROVIDER_UNAVAILABLE);
  if (user.disabled) throw new NativeAuthError(AUTH_ERROR_CODES.ACCOUNT_DISABLED);
};

export function createNativeAuthHandler({ fetchImpl = globalThis.fetch } = {}) {
  return async function handleNativeAuthRequest(request, env) {
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

    const provider = new FirebaseEmailPasswordProvider({
      apiKey: env?.FIREBASE_WEB_API_KEY,
      continueUrl: env?.FIREBASE_CONTINUE_URL,
      fetchImpl
    });
    const jar = cookies(request);
    const context = clientContext(request, jar[AUTH_DEVICE_COOKIE]);

    try {
      if (request.method === 'GET' && url.pathname === `${AUTH_API_PREFIX}/config`) {
        const health = await callAuthority(env, '/internal/ping', null, 'GET');
        let firebaseReady = false;
        let availability = Object.freeze({
          code: provider.configured ? 'PROJECT_CHECK_FAILED' : 'CREDENTIAL_MISSING',
          providerStatus: 0
        });
        if (provider.configured) {
          try {
            const inspected = await provider.inspectProject();
            firebaseReady = inspected.projectIdentified && inspected.continueDomainAuthorized;
            availability = Object.freeze({
              code: !inspected.projectIdentified
                ? 'PROJECT_NOT_IDENTIFIED'
                : !inspected.continueDomainAuthorized
                  ? 'PAGES_DOMAIN_NOT_AUTHORIZED'
                  : 'READY',
              providerStatus: 0
            });
          } catch (cause) {
            availability = providerAvailabilityFailure(cause);
          }
        }
        const available = firebaseReady && health.ok === true;
        return json(request, 200, {
          ok: true,
          auth: {
            version: AUTH_NATIVE_VERSION,
            mode: 'email-password-with-email-verification',
            provider: 'firebase',
            available,
            availabilityCode: available ? 'READY' : availability.code,
            providerStatus: availability.providerStatus,
            storage: health.storage,
            emailVerifiedRequired: true,
            verificationEmail: {
              kind: 'address-verification',
              dailyCapacity: 1000,
              resendCooldownSeconds: FIREBASE_VERIFICATION_RESEND_SECONDS
            },
            registeredAccountLimit: 'unlimited',
            session: { transport: 'secure-http-only-cookie', maxAge: SESSION_SECONDS }
          }
        });
      }

      if (request.method === 'POST' && url.pathname === `${AUTH_API_PREFIX}/signup`) {
        if (!provider.configured) throw new NativeAuthError(AUTH_ERROR_CODES.NOT_CONFIGURED);
        const input = credentials(await readJson(request));
        const prepared = await callAuthority(env, '/internal/firebase/rate', {
          input: { operation: 'signup', email: input.email }, context
        });
        let signed;
        try { signed = await provider.signUp(prepared.email, input.password); }
        catch (cause) { throw providerError(cause, 'signup'); }
        try {
          await callAuthority(env, '/internal/firebase/rate', {
            input: { operation: 'verification-send', email: prepared.email }, context
          });
        } catch (cause) {
          try { await provider.deleteAccount(signed.idToken); } catch {}
          throw cause;
        }
        try { await provider.sendVerificationEmail(signed.idToken, prepared.email); }
        catch (cause) { throw providerError(cause, 'verification'); }
        return json(request, 202, {
          ok: true,
          accountCreated: true,
          authenticated: false,
          verification: {
            sent: true,
            emailMasked: prepared.emailMask,
            requiredBeforeLogin: true,
            dailyCapacity: 1000,
            resendAfter: FIREBASE_VERIFICATION_RESEND_SECONDS
          }
        }, context.isNewDevice ? { 'Set-Cookie': deviceCookie(context.deviceId) } : {});
      }

      if (request.method === 'POST' && url.pathname === `${AUTH_API_PREFIX}/verification/resend`) {
        if (!provider.configured) throw new NativeAuthError(AUTH_ERROR_CODES.NOT_CONFIGURED);
        const input = credentials(await readJson(request));
        const prepared = await callAuthority(env, '/internal/firebase/rate', {
          input: { operation: 'verification-resend', email: input.email }, context
        });
        let signed;
        let user;
        try { signed = await provider.signIn(prepared.email, input.password); }
        catch (cause) { throw providerError(cause, 'signin'); }
        try { user = await provider.lookup(signed.idToken); }
        catch (cause) { throw providerError(cause, 'lookup'); }
        assertProviderUser(signed, user);
        if (user.emailVerified) {
          return json(request, 200, { ok: true, alreadyVerified: true, authenticated: false });
        }
        await callAuthority(env, '/internal/firebase/rate', {
          input: { operation: 'verification-send', email: user.email }, context
        });
        try { await provider.sendVerificationEmail(signed.idToken, user.email); }
        catch (cause) { throw providerError(cause, 'verification'); }
        return json(request, 202, {
          ok: true,
          authenticated: false,
          verification: {
            sent: true,
            emailMasked: prepared.emailMask,
            dailyCapacity: 1000,
            resendAfter: FIREBASE_VERIFICATION_RESEND_SECONDS
          }
        }, context.isNewDevice ? { 'Set-Cookie': deviceCookie(context.deviceId) } : {});
      }

      if (request.method === 'POST' && url.pathname === `${AUTH_API_PREFIX}/login`) {
        if (!provider.configured) throw new NativeAuthError(AUTH_ERROR_CODES.NOT_CONFIGURED);
        const input = credentials(await readJson(request));
        const prepared = await callAuthority(env, '/internal/firebase/rate', {
          input: { operation: 'login', email: input.email }, context
        });
        let signed;
        let user;
        try { signed = await provider.signIn(prepared.email, input.password); }
        catch (cause) { throw providerError(cause, 'signin'); }
        try { user = await provider.lookup(signed.idToken); }
        catch (cause) { throw providerError(cause, 'lookup'); }
        assertProviderUser(signed, user);
        if (!user.emailVerified) throw new NativeAuthError(AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED);
        const established = await callAuthority(env, '/internal/firebase/session/create', {
          input: { email: user.email, subject: user.subject }, context
        });
        const maxAge = Math.max(1, Math.min(SESSION_SECONDS, Math.floor((Number(established.sessionExpiresAt) - Date.now()) / 1000)));
        const setCookies = [sessionCookie(established.sessionToken, maxAge), firebaseCookie(signed.refreshToken, maxAge)];
        if (context.isNewDevice) setCookies.push(deviceCookie(context.deviceId));
        return json(request, 200, {
          ok: true,
          authenticated: true,
          emailVerified: true,
          created: established.created,
          user: established.user,
          session: { expiresAt: established.sessionExpiresAt }
        }, { 'Set-Cookie': setCookies });
      }

      if (request.method === 'GET' && url.pathname === `${AUTH_API_PREFIX}/session`) {
        const sessionToken = jar[AUTH_SESSION_COOKIE];
        const refreshToken = jar[AUTH_FIREBASE_COOKIE];
        if (!sessionToken || !refreshToken) throw new NativeAuthError(AUTH_ERROR_CODES.SESSION_INVALID);
        let refreshed;
        let user;
        try { refreshed = await provider.refresh(refreshToken); }
        catch (cause) { throw providerError(cause, 'refresh'); }
        try { user = await provider.lookup(refreshed.idToken); }
        catch (cause) { throw providerError(cause, 'lookup-session'); }
        assertProviderUser(refreshed, user);
        if (!user.emailVerified) throw new NativeAuthError(AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED);
        const session = await callAuthority(env, '/internal/firebase/session/get', {
          sessionToken,
          input: { email: user.email, subject: user.subject }
        });
        const maxAge = Math.max(1, Math.min(SESSION_SECONDS, Math.floor((Number(session.expiresAt) - Date.now()) / 1000)));
        return json(request, 200, {
          ok: true,
          authenticated: true,
          emailVerified: true,
          ...session
        }, { 'Set-Cookie': firebaseCookie(refreshed.refreshToken, maxAge) });
      }

      if (request.method === 'POST' && url.pathname === `${AUTH_API_PREFIX}/session/logout`) {
        const sessionToken = jar[AUTH_SESSION_COOKIE];
        if (sessionToken) await callAuthority(env, '/internal/session/revoke', { sessionToken });
        return json(request, 200, { ok: true, authenticated: false }, { 'Set-Cookie': clearAuthCookies() });
      }

      return json(request, 404, { ok: false, error: { code: 'NOT_FOUND', message: 'Endpoint পাওয়া যায়নি।' } });
    } catch (cause) {
      const error = asNativeAuthError(cause);
      const clearSession = [AUTH_ERROR_CODES.SESSION_INVALID, AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED, AUTH_ERROR_CODES.ACCOUNT_DISABLED].includes(error.code)
        && url.pathname === `${AUTH_API_PREFIX}/session`;
      if (clearSession && jar[AUTH_SESSION_COOKIE]) {
        try { await callAuthority(env, '/internal/session/revoke', { sessionToken: jar[AUTH_SESSION_COOKIE] }); } catch {}
      }
      const providerDiagnosticCode = /^[A-Z0-9_]{1,80}$/.test(String(error.providerDiagnostic || ''))
        ? String(error.providerDiagnostic)
        : '';
      return json(request, error.status, { ok: false, error: error.toPublic() }, {
        ...(error.retryAfter ? { 'Retry-After': String(error.retryAfter) } : {}),
        ...(providerDiagnosticCode ? { 'X-AH-Auth-Diagnostic': providerDiagnosticCode } : {}),
        ...(clearSession ? { 'Set-Cookie': clearAuthCookies() } : {})
      });
    }
  };
}
