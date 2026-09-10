import { AUTH_NATIVE_VERSION, FIREBASE_VERIFICATION_RESEND_COOLDOWN_MS } from '../core/auth-engine.mjs';
import { constantTimeEqual, normalizeAuthEmail, randomToken } from '../core/crypto.mjs';
import { AUTH_ERROR_CODES, asNativeAuthError, NativeAuthError } from '../core/errors.mjs';
import { FirebaseEmailPasswordProvider, FirebaseRequestError } from '../providers/firebase-auth.mjs';
import { verificationConfig } from '../verification/config.mjs';

export const AUTH_API_PREFIX = '/api/auth/v1';
export const AUTH_SESSION_COOKIE = '__Host-ah_session';
export const AUTH_FIREBASE_COOKIE = '__Host-ah_firebase';
export const AUTH_DEVICE_COOKIE = '__Host-ah_device';
const AUTHORITY_NAME = 'admission-hub-global-auth-v1';
const MAX_BODY_BYTES = 24 * 1024;
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
  if (!origin) return false;
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
    userAgent: String(request.headers.get('User-Agent') || '').slice(0, 300),
    origin: String(request.headers.get('Origin') || new URL(request.url).origin).slice(0, 256)
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

const telegramWebhookInput = body => {
  const message = body?.message;
  const telegramUserId = String(message?.from?.id || '');
  const chatId = String(message?.chat?.id || '');
  const text = String(message?.text || '');
  const match = text.match(/^\/start(?:@[A-Za-z0-9_]{5,32})? ([A-Za-z0-9_-]{32,64})$/);
  if (!Number.isSafeInteger(body?.update_id) || message?.chat?.type !== 'private' || message?.from?.is_bot === true || telegramUserId !== chatId || !/^[1-9]\d{0,19}$/.test(telegramUserId) || !match) {
    throw new NativeAuthError(AUTH_ERROR_CODES.INVALID_INPUT);
  }
  return Object.freeze({ linkToken: match[1], telegramUserId, chatId });
};

const googleCredential = body => {
  const accessToken = String(body?.accessToken || '').trim();
  const idToken = String(body?.idToken || '').trim();
  if (Boolean(accessToken) === Boolean(idToken)) throw new NativeAuthError(AUTH_ERROR_CODES.INVALID_INPUT);
  const value = accessToken || idToken;
  if (value.length < 20 || value.length > 4096 || /[\r\n\u0000;]/.test(value)) throw new NativeAuthError(AUTH_ERROR_CODES.INVALID_INPUT);
  return Object.freeze(accessToken ? { accessToken } : { idToken });
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
  if (/ACCESS_NOT_CONFIGURED|SERVICE_DISABLED|API_NOT_ACTIVATED/.test(reason)) return Object.freeze({ code: 'IDENTITY_TOOLKIT_DISABLED', providerStatus });
  if (/API_KEY/.test(reason)) return Object.freeze({ code: 'API_KEY_REJECTED', providerStatus });
  if (reason === 'PROJECT_NOT_FOUND') return Object.freeze({ code: 'PROJECT_NOT_FOUND', providerStatus });
  if (reason === 'OPERATION_NOT_ALLOWED') return Object.freeze({ code: 'PROVIDER_DISABLED', providerStatus });
  return Object.freeze({ code: providerStatus ? `PROVIDER_HTTP_${providerStatus}` : 'PROVIDER_CHECK_FAILED', providerStatus });
}

const PROVIDER_DIAGNOSTIC_REASONS = new Set([
  'NETWORK_ERROR', 'INVALID_PROVIDER_RESPONSE', 'INVALID_IDP_RESPONSE', 'NOT_CONFIGURED', 'API_KEY_INVALID',
  'PROJECT_NOT_FOUND', 'OPERATION_NOT_ALLOWED', 'INVALID_EMAIL', 'MISSING_EMAIL',
  'MISSING_PASSWORD', 'EMAIL_EXISTS', 'WEAK_PASSWORD', 'INVALID_LOGIN_CREDENTIALS',
  'EMAIL_NOT_FOUND', 'INVALID_PASSWORD', 'USER_DISABLED', 'TOO_MANY_ATTEMPTS_TRY_LATER',
  'TOO_MANY_ATTEMPTS', 'IP_BLOCKED', 'QUOTA_EXCEEDED', 'INVALID_CONTINUE_URI',
  'UNAUTHORIZED_DOMAIN', 'INVALID_REFRESH_TOKEN', 'TOKEN_EXPIRED', 'INVALID_ID_TOKEN',
  'USER_NOT_FOUND', 'FEDERATED_USER_ID_ALREADY_LINKED', 'MISSING_RECAPTCHA_TOKEN',
  'INVALID_RECAPTCHA_TOKEN', 'CAPTCHA_CHECK_FAILED', 'RECAPTCHA_CHECK_FAILED'
]);

function providerDiagnostic(cause, stage) {
  const operation = String(stage || 'auth').toUpperCase().replace(/[^A-Z0-9_]/g, '_').slice(0, 24) || 'AUTH';
  if (!(cause instanceof FirebaseRequestError)) return `${operation}_UNEXPECTED`;
  const reason = PROVIDER_DIAGNOSTIC_REASONS.has(cause.reason)
    ? cause.reason
    : cause.status >= 100 && cause.status <= 599 ? `HTTP_${cause.status}` : 'UNKNOWN';
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
    return tagged(new NativeAuthError(stage.startsWith('google') ? AUTH_ERROR_CODES.GOOGLE_UNAVAILABLE : AUTH_ERROR_CODES.NOT_CONFIGURED));
  }
  if (['INVALID_EMAIL', 'MISSING_EMAIL', 'MISSING_PASSWORD', 'INVALID_IDP_RESPONSE'].includes(reason)) return tagged(new NativeAuthError(AUTH_ERROR_CODES.INVALID_INPUT));
  if (reason === 'EMAIL_EXISTS' && stage.startsWith('google')) return tagged(new NativeAuthError(AUTH_ERROR_CODES.ACCOUNT_LINK_REQUIRED));
  if (reason === 'EMAIL_EXISTS') return tagged(new NativeAuthError(AUTH_ERROR_CODES.EMAIL_ALREADY_IN_USE));
  if (reason === 'FEDERATED_USER_ID_ALREADY_LINKED') return tagged(new NativeAuthError(AUTH_ERROR_CODES.ACCOUNT_CONFLICT));
  if (reason === 'WEAK_PASSWORD') return tagged(new NativeAuthError(AUTH_ERROR_CODES.WEAK_PASSWORD));
  if (['INVALID_LOGIN_CREDENTIALS', 'EMAIL_NOT_FOUND', 'INVALID_PASSWORD'].includes(reason)) return tagged(new NativeAuthError(AUTH_ERROR_CODES.INVALID_CREDENTIALS));
  if (reason === 'USER_DISABLED') return tagged(new NativeAuthError(AUTH_ERROR_CODES.ACCOUNT_DISABLED));
  if (['TOO_MANY_ATTEMPTS_TRY_LATER', 'TOO_MANY_ATTEMPTS', 'IP_BLOCKED'].includes(reason)) {
    return tagged(new NativeAuthError(AUTH_ERROR_CODES.RATE_LIMITED, { retryAfter: 60 }));
  }
  if (stage === 'verification' && ['QUOTA_EXCEEDED', 'INVALID_CONTINUE_URI', 'UNAUTHORIZED_DOMAIN', 'NETWORK_ERROR', 'INVALID_PROVIDER_RESPONSE'].includes(reason)) {
    return tagged(new NativeAuthError(AUTH_ERROR_CODES.VERIFICATION_UNAVAILABLE));
  }
  if (['refresh', 'lookup-session', 'passkey-refresh'].includes(stage) && ['INVALID_REFRESH_TOKEN', 'TOKEN_EXPIRED', 'INVALID_ID_TOKEN', 'USER_NOT_FOUND'].includes(reason)) {
    return tagged(new NativeAuthError(AUTH_ERROR_CODES.SESSION_INVALID));
  }
  return tagged(new NativeAuthError(stage.startsWith('google') ? AUTH_ERROR_CODES.GOOGLE_UNAVAILABLE : AUTH_ERROR_CODES.AUTH_PROVIDER_UNAVAILABLE));
}

const assertProviderUser = (signed, user) => {
  if (signed.subject !== user.subject) throw new NativeAuthError(AUTH_ERROR_CODES.AUTH_PROVIDER_UNAVAILABLE);
  if (user.disabled) throw new NativeAuthError(AUTH_ERROR_CODES.ACCOUNT_DISABLED);
};

const firebaseReadySession = async ({ provider, jar, env, context }) => {
  const sessionToken = jar[AUTH_SESSION_COOKIE];
  const refreshToken = jar[AUTH_FIREBASE_COOKIE];
  if (!sessionToken || !refreshToken) throw new NativeAuthError(AUTH_ERROR_CODES.SESSION_INVALID);
  let refreshed;
  let user;
  try { refreshed = await provider.refresh(refreshToken); } catch (cause) { throw providerError(cause, 'refresh'); }
  try { user = await provider.lookup(refreshed.idToken); } catch (cause) { throw providerError(cause, 'lookup-session'); }
  assertProviderUser(refreshed, user);
  if (!user.emailVerified) throw new NativeAuthError(AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED);
  const session = await callAuthority(env, '/internal/firebase/session/get', {
    sessionToken,
    input: { email: user.email, subject: user.subject }
  });
  return Object.freeze({ sessionToken, refreshed, user, session });
};

const sessionCookies = (established, refreshToken, context) => {
  const maxAge = Math.max(1, Math.min(SESSION_SECONDS, Math.floor((Number(established.sessionExpiresAt || established.expiresAt) - Date.now()) / 1000)));
  const values = [];
  if (established.sessionToken) values.push(sessionCookie(established.sessionToken, maxAge));
  values.push(firebaseCookie(refreshToken, maxAge));
  if (context.isNewDevice) values.push(deviceCookie(context.deviceId));
  return values;
};

const authSuccess = (request, established, refreshToken, context) => json(request, 200, {
  ok: true,
  authenticated: true,
  emailVerified: true,
  created: Boolean(established.created),
  user: established.user,
  session: { expiresAt: established.sessionExpiresAt }
}, { 'Set-Cookie': sessionCookies(established, refreshToken, context) });

const googleActivated = env => env?.GOOGLE_AUTH_ACTIVATION === 'enabled';
const validWebhookSecret = value => /^[A-Za-z0-9_-]{20,256}$/.test(String(value || ''));
const adminAuthorized = (request, env) => {
  const expected = String(env?.ADMIN_TOKEN || '');
  const supplied = String(request.headers.get('X-AH-Admin-Token') || '');
  return expected.length >= 20 && supplied.length === expected.length && constantTimeEqual(supplied, expected);
};
const passkeyEndpointReady = env => ['canary', 'enabled'].includes(String(env?.PASSKEY_AUTH_ACTIVATION || ''));
const passkeyPublished = env => env?.PASSKEY_AUTH_ACTIVATION === 'enabled';

export function createNativeAuthHandler({ fetchImpl = globalThis.fetch } = {}) {
  const publicConfigCache = new WeakMap();
  return async function handleNativeAuthRequest(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith(`${AUTH_API_PREFIX}/`) && url.pathname !== AUTH_API_PREFIX) return null;
    const origin = request.headers.get('Origin') || '';
    const originOptional = request.method === 'GET'
      || (request.method === 'POST' && url.pathname === `${AUTH_API_PREFIX}/telegram/webhook`);
    if ((!origin && !originOptional) || (origin && !allowedOrigin(origin))) {
      return json(request, 403, { ok: false, error: { code: 'ORIGIN_FORBIDDEN', message: 'অনুমোদিত উৎস নয়।' } });
    }
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          ...JSON_HEADERS,
          ...corsHeaders(request),
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'content-type, x-ah-admin-token',
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
      if (request.method === 'POST' && url.pathname === `${AUTH_API_PREFIX}/telegram/webhook`) {
        const expected = String(env?.TELEGRAM_AUTH_WEBHOOK_SECRET || '');
        const supplied = String(request.headers.get('X-Telegram-Bot-Api-Secret-Token') || '');
        if (!validWebhookSecret(expected) || supplied.length !== expected.length || !constantTimeEqual(supplied, expected)) {
          return json(request, 403, { ok: false, error: { code: 'FORBIDDEN', message: 'অনুমতি নেই।' } });
        }
        const payload = await readJson(request);
        let input;
        try { input = telegramWebhookInput(payload); }
        catch { return json(request, 200, { ok: true }); }
        try { await callAuthority(env, '/internal/verification/telegram/webhook', { input }); }
        catch (cause) {
          if (cause?.code !== AUTH_ERROR_CODES.OTP_INVALID) throw cause;
        }
        return json(request, 200, { ok: true });
      }

      if (request.method === 'GET' && url.pathname === `${AUTH_API_PREFIX}/config`) {
        const cached = publicConfigCache.get(env);
        if (cached && cached.expiresAt > Date.now()) return json(request, 200, cached.body);
        const health = await callAuthority(env, '/internal/ping', null, 'GET');
        let firebaseReady = false;
        let project = null;
        let availability = Object.freeze({ code: provider.configured ? 'PROJECT_CHECK_FAILED' : 'CREDENTIAL_MISSING', providerStatus: 0 });
        if (provider.configured) {
          try {
            project = await provider.inspectProject();
            firebaseReady = project.projectIdentified && project.continueDomainAuthorized;
            availability = Object.freeze({
              code: !project.projectIdentified ? 'PROJECT_NOT_IDENTIFIED' : !project.continueDomainAuthorized ? 'PAGES_DOMAIN_NOT_AUTHORIZED' : 'READY',
              providerStatus: 0
            });
          } catch (cause) { availability = providerAvailabilityFailure(cause); }
        }
        const available = firebaseReady && health.ok === true;
        let google = { available: false, availabilityCode: googleActivated(env) ? 'PROVIDER_CHECK_FAILED' : 'LIVE_E2E_NOT_APPROVED' };
        if (available && googleActivated(env)) {
          try {
            const discovered = project?.google?.enabled && project.google.clientId
              ? { available: true, clientId: project.google.clientId }
              : await provider.inspectGoogleProvider();
            google = { available: discovered.available === true, availabilityCode: 'READY', clientId: discovered.clientId };
          } catch (cause) {
            const failure = providerAvailabilityFailure(cause);
            google = { available: false, availabilityCode: failure.code };
          }
        }
        let backup = { available: false, availabilityCode: 'NOT_ACTIVATED', genericFlow: true, providerNamesExposed: false };
        if (available) {
          try { backup = await callAuthority(env, '/internal/verification/capabilities', {}); }
          catch { backup = { available: false, availabilityCode: 'STATUS_UNAVAILABLE', genericFlow: true, providerNamesExposed: false }; }
        }
        const passkeyAvailable = available && health.schema >= 3 && passkeyPublished(env);
        const body = {
          ok: true,
          auth: {
            version: AUTH_NATIVE_VERSION,
            mode: 'firebase-canonical-multi-method',
            provider: 'firebase',
            available,
            availabilityCode: available ? 'READY' : availability.code,
            providerStatus: availability.providerStatus,
            storage: health.storage,
            emailVerifiedRequired: true,
            methods: {
              google,
              passkey: {
                available: passkeyAvailable,
                availabilityCode: passkeyAvailable ? 'READY' : passkeyEndpointReady(env) ? 'LIVE_E2E_PENDING' : 'NOT_ACTIVATED',
                requiresEnrollment: true,
                neverMandatory: true
              },
              emailPassword: { available, availabilityCode: available ? 'READY' : availability.code },
              backup
            },
            verificationEmail: {
              kind: 'address-verification',
              dailyCapacity: 1000,
              resendCooldownSeconds: FIREBASE_VERIFICATION_RESEND_SECONDS
            },
            registeredAccountLimit: 'unlimited',
            session: { transport: 'secure-http-only-cookie', maxAge: SESSION_SECONDS }
          }
        };
        publicConfigCache.set(env, { body, expiresAt: Date.now() + 30_000 });
        return json(request, 200, body);
      }

      if (request.method === 'POST' && url.pathname === `${AUTH_API_PREFIX}/signup`) {
        if (!provider.configured) throw new NativeAuthError(AUTH_ERROR_CODES.NOT_CONFIGURED);
        const input = credentials(await readJson(request));
        const prepared = await callAuthority(env, '/internal/firebase/rate', { input: { operation: 'signup', email: input.email }, context });
        let signed;
        try { signed = await provider.signUp(prepared.email, input.password); } catch (cause) { throw providerError(cause, 'signup'); }
        try {
          await callAuthority(env, '/internal/firebase/rate', { input: { operation: 'verification-send', email: prepared.email }, context });
        } catch (cause) {
          try { await provider.deleteAccount(signed.idToken); } catch {}
          throw cause;
        }
        try { await provider.sendVerificationEmail(signed.idToken, prepared.email); } catch (cause) { throw providerError(cause, 'verification'); }
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
        const prepared = await callAuthority(env, '/internal/firebase/rate', { input: { operation: 'verification-resend', email: input.email }, context });
        let signed;
        let user;
        try { signed = await provider.signIn(prepared.email, input.password); } catch (cause) { throw providerError(cause, 'signin'); }
        try { user = await provider.lookup(signed.idToken); } catch (cause) { throw providerError(cause, 'lookup'); }
        assertProviderUser(signed, user);
        if (user.emailVerified) return json(request, 200, { ok: true, alreadyVerified: true, authenticated: false });
        await callAuthority(env, '/internal/firebase/rate', { input: { operation: 'verification-send', email: user.email }, context });
        try { await provider.sendVerificationEmail(signed.idToken, user.email); } catch (cause) { throw providerError(cause, 'verification'); }
        return json(request, 202, {
          ok: true,
          authenticated: false,
          verification: { sent: true, emailMasked: prepared.emailMask, dailyCapacity: 1000, resendAfter: FIREBASE_VERIFICATION_RESEND_SECONDS }
        }, context.isNewDevice ? { 'Set-Cookie': deviceCookie(context.deviceId) } : {});
      }

      if (request.method === 'POST' && url.pathname === `${AUTH_API_PREFIX}/login`) {
        if (!provider.configured) throw new NativeAuthError(AUTH_ERROR_CODES.NOT_CONFIGURED);
        const input = credentials(await readJson(request));
        const prepared = await callAuthority(env, '/internal/firebase/rate', { input: { operation: 'login', email: input.email }, context });
        let signed;
        let user;
        try { signed = await provider.signIn(prepared.email, input.password); } catch (cause) { throw providerError(cause, 'signin'); }
        try { user = await provider.lookup(signed.idToken); } catch (cause) { throw providerError(cause, 'lookup'); }
        assertProviderUser(signed, user);
        if (!user.emailVerified) throw new NativeAuthError(AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED);
        const established = await callAuthority(env, '/internal/firebase/session/create', { input: { email: user.email, subject: user.subject }, context });
        return authSuccess(request, established, signed.refreshToken, context);
      }

      if (request.method === 'POST' && url.pathname === `${AUTH_API_PREFIX}/google`) {
        if (!provider.configured || !googleActivated(env)) throw new NativeAuthError(AUTH_ERROR_CODES.GOOGLE_UNAVAILABLE);
        try { await provider.inspectGoogleProvider(); } catch (cause) { throw providerError(cause, 'google-config'); }
        const credential = googleCredential(await readJson(request));
        await callAuthority(env, '/internal/firebase/rate', { input: { operation: 'google' }, context });
        let signed;
        let user;
        try { signed = await provider.signInWithGoogle(credential); } catch (cause) { throw providerError(cause, 'google-signin'); }
        try { user = await provider.lookup(signed.idToken); } catch (cause) { throw providerError(cause, 'google-lookup'); }
        assertProviderUser(signed, user);
        if (!user.providers.includes('google.com')) throw new NativeAuthError(AUTH_ERROR_CODES.ACCOUNT_CONFLICT);
        if (!user.emailVerified) throw new NativeAuthError(AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED);
        let established;
        try {
          established = await callAuthority(env, '/internal/firebase/session/create', { input: { email: user.email, subject: user.subject }, context });
        } catch (cause) {
          if (cause?.code === AUTH_ERROR_CODES.ACCOUNT_CONFLICT && signed.isNewUser) {
            let deleted = false;
            try { deleted = (await provider.deleteAccount(signed.idToken))?.deleted === true; } catch {}
            if (!deleted) throw new NativeAuthError(AUTH_ERROR_CODES.ACCOUNT_CONFLICT);
            throw new NativeAuthError(AUTH_ERROR_CODES.ACCOUNT_LINK_REQUIRED);
          }
          throw cause;
        }
        return authSuccess(request, established, signed.refreshToken, context);
      }

      if (request.method === 'POST' && url.pathname === `${AUTH_API_PREFIX}/google/link`) {
        if (!provider.configured || !googleActivated(env)) throw new NativeAuthError(AUTH_ERROR_CODES.GOOGLE_UNAVAILABLE);
        const body = await readJson(request);
        const input = credentials(body);
        const credential = googleCredential(body);
        if (!credential.accessToken) throw new NativeAuthError(AUTH_ERROR_CODES.INVALID_INPUT);
        const email = normalizeAuthEmail(input.email);
        let googleIdentity;
        try { googleIdentity = await provider.googleIdentity(credential.accessToken); } catch (cause) { throw providerError(cause, 'google-identity'); }
        if (normalizeAuthEmail(googleIdentity.email) !== email) throw new NativeAuthError(AUTH_ERROR_CODES.ACCOUNT_CONFLICT);
        const prepared = await callAuthority(env, '/internal/firebase/rate', { input: { operation: 'login', email }, context });
        let passwordSession;
        let passwordUser;
        try { passwordSession = await provider.signIn(prepared.email, input.password); } catch (cause) { throw providerError(cause, 'signin'); }
        try { passwordUser = await provider.lookup(passwordSession.idToken); } catch (cause) { throw providerError(cause, 'lookup'); }
        assertProviderUser(passwordSession, passwordUser);
        if (!passwordUser.emailVerified) throw new NativeAuthError(AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED);
        let linked;
        let user;
        try { linked = await provider.linkGoogle(passwordSession.idToken, credential); } catch (cause) { throw providerError(cause, 'google-link'); }
        if (linked.subject !== passwordSession.subject) throw new NativeAuthError(AUTH_ERROR_CODES.ACCOUNT_CONFLICT);
        try { user = await provider.lookup(linked.idToken); } catch (cause) { throw providerError(cause, 'google-lookup'); }
        assertProviderUser(linked, user);
        if (!user.providers.includes('google.com') || !user.googleSubjects.includes(googleIdentity.subject)) {
          throw new NativeAuthError(AUTH_ERROR_CODES.ACCOUNT_CONFLICT);
        }
        const established = await callAuthority(env, '/internal/firebase/session/create', { input: { email: user.email, subject: user.subject }, context });
        return authSuccess(request, established, linked.refreshToken, context);
      }

      if (request.method === 'POST' && url.pathname === `${AUTH_API_PREFIX}/passkey/registration/begin`) {
        if (!provider.configured || !passkeyEndpointReady(env)) throw new NativeAuthError(AUTH_ERROR_CODES.PASSKEY_UNAVAILABLE);
        const current = await firebaseReadySession({ provider, jar, env, context });
        const result = await callAuthority(env, '/internal/passkey/registration/begin', {
          input: {
            sessionToken: current.sessionToken,
            refreshToken: current.refreshed.refreshToken,
            email: current.user.email,
            subject: current.user.subject
          },
          context
        });
        return json(request, 200, { ok: true, ...result }, {
          'Set-Cookie': sessionCookies(current.session, current.refreshed.refreshToken, context)
        });
      }

      if (request.method === 'POST' && url.pathname === `${AUTH_API_PREFIX}/passkey/registration/finish`) {
        if (!provider.configured || !passkeyEndpointReady(env)) throw new NativeAuthError(AUTH_ERROR_CODES.PASSKEY_UNAVAILABLE);
        const body = await readJson(request);
        const current = await firebaseReadySession({ provider, jar, env, context });
        const result = await callAuthority(env, '/internal/passkey/registration/finish', {
          input: {
            challengeId: body.challengeId,
            response: body.response,
            sessionToken: current.sessionToken,
            refreshToken: current.refreshed.refreshToken,
            email: current.user.email,
            subject: current.user.subject
          },
          context
        });
        return json(request, 200, { ok: true, ...result }, {
          'Set-Cookie': sessionCookies(current.session, current.refreshed.refreshToken, context)
        });
      }

      if (request.method === 'POST' && url.pathname === `${AUTH_API_PREFIX}/passkey/authentication/begin`) {
        if (!provider.configured || !passkeyEndpointReady(env)) throw new NativeAuthError(AUTH_ERROR_CODES.PASSKEY_UNAVAILABLE);
        const result = await callAuthority(env, '/internal/passkey/authentication/begin', { context });
        return json(request, 200, { ok: true, ...result }, context.isNewDevice ? { 'Set-Cookie': deviceCookie(context.deviceId) } : {});
      }

      if (request.method === 'POST' && url.pathname === `${AUTH_API_PREFIX}/passkey/authentication/finish`) {
        if (!provider.configured || !passkeyEndpointReady(env)) throw new NativeAuthError(AUTH_ERROR_CODES.PASSKEY_UNAVAILABLE);
        const body = await readJson(request);
        const assertion = await callAuthority(env, '/internal/passkey/authentication/finish', {
          input: { challengeId: body.challengeId, response: body.response },
          context
        });
        let refreshed;
        let user;
        try { refreshed = await provider.refresh(assertion.refreshToken); } catch (cause) { throw providerError(cause, 'passkey-refresh'); }
        try { user = await provider.lookup(refreshed.idToken); } catch (cause) { throw providerError(cause, 'lookup-session'); }
        assertProviderUser(refreshed, user);
        if (!user.emailVerified) throw new NativeAuthError(AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED);
        const established = await callAuthority(env, '/internal/passkey/session/complete', {
          input: {
            loginTicket: assertion.loginTicket,
            refreshToken: refreshed.refreshToken,
            email: user.email,
            subject: user.subject
          },
          context
        });
        return authSuccess(request, established, refreshed.refreshToken, context);
      }

      if (request.method === 'GET' && url.pathname === `${AUTH_API_PREFIX}/passkey/status`) {
        if (!provider.configured || !passkeyEndpointReady(env)) throw new NativeAuthError(AUTH_ERROR_CODES.PASSKEY_UNAVAILABLE);
        const current = await firebaseReadySession({ provider, jar, env, context });
        const result = await callAuthority(env, '/internal/passkey/status', {
          input: { sessionToken: current.sessionToken, email: current.user.email, subject: current.user.subject },
          context
        });
        return json(request, 200, { ok: true, ...result }, {
          'Set-Cookie': sessionCookies(current.session, current.refreshed.refreshToken, context)
        });
      }

      if (request.method === 'POST' && url.pathname === `${AUTH_API_PREFIX}/passkey/remove`) {
        if (!provider.configured || !passkeyEndpointReady(env)) throw new NativeAuthError(AUTH_ERROR_CODES.PASSKEY_UNAVAILABLE);
        const body = await readJson(request);
        const current = await firebaseReadySession({ provider, jar, env, context });
        const result = await callAuthority(env, '/internal/passkey/remove', {
          input: {
            credentialId: body.credentialId,
            sessionToken: current.sessionToken,
            email: current.user.email,
            subject: current.user.subject
          },
          context
        });
        return json(request, 200, { ok: true, ...result }, {
          'Set-Cookie': sessionCookies(current.session, current.refreshed.refreshToken, context)
        });
      }

      if (request.method === 'POST' && url.pathname === `${AUTH_API_PREFIX}/backup/request`) {
        if (!provider.configured) throw new NativeAuthError(AUTH_ERROR_CODES.BACKUP_UNAVAILABLE);
        const body = await readJson(request);
        const contact = String(body.contact || '').trim();
        if (contact && !/^\+[1-9]\d{7,14}$/.test(contact)) throw new NativeAuthError(AUTH_ERROR_CODES.INVALID_INPUT);
        const current = await firebaseReadySession({ provider, jar, env, context });
        const result = await callAuthority(env, '/internal/verification/request', {
          input: {
            sessionToken: current.sessionToken,
            email: current.user.email,
            subject: current.user.subject,
            purpose: body.purpose === 'sensitive-action' ? 'sensitive-action' : 'account-backup',
            contact,
            allowTelegramLink: true
          },
          context
        });
        return json(request, 202, { ok: true, ...result }, {
          'Set-Cookie': sessionCookies(current.session, current.refreshed.refreshToken, context)
        });
      }

      if (request.method === 'POST' && url.pathname === `${AUTH_API_PREFIX}/backup/verify`) {
        if (!provider.configured) throw new NativeAuthError(AUTH_ERROR_CODES.BACKUP_UNAVAILABLE);
        const body = await readJson(request);
        const current = await firebaseReadySession({ provider, jar, env, context });
        const result = await callAuthority(env, '/internal/verification/verify', {
          input: {
            sessionToken: current.sessionToken,
            email: current.user.email,
            subject: current.user.subject,
            purpose: body.purpose === 'sensitive-action' ? 'sensitive-action' : 'account-backup',
            attemptId: body.attemptId,
            code: body.code,
            evidence: body.evidence
          },
          context
        });
        return json(request, 200, { ok: true, ...result }, {
          'Set-Cookie': sessionCookies(current.session, current.refreshed.refreshToken, context)
        });
      }

      if (request.method === 'GET' && url.pathname === `${AUTH_API_PREFIX}/admin/verification/status`) {
        if (!adminAuthorized(request, env)) return json(request, 403, { ok: false, error: { code: 'FORBIDDEN', message: 'অনুমতি নেই।' } });
        const result = await callAuthority(env, '/internal/verification/admin/status', {});
        return json(request, 200, { ok: true, ...result });
      }

      if (request.method === 'POST' && url.pathname === `${AUTH_API_PREFIX}/admin/verification/config`) {
        if (!adminAuthorized(request, env)) return json(request, 403, { ok: false, error: { code: 'FORBIDDEN', message: 'অনুমতি নেই।' } });
        const body = await readJson(request);
        const result = await callAuthority(env, '/internal/verification/admin/config', { config: verificationConfig(body.config) });
        publicConfigCache.delete(env);
        return json(request, 200, { ok: true, ...result });
      }

      if (request.method === 'GET' && url.pathname === `${AUTH_API_PREFIX}/session`) {
        const current = await firebaseReadySession({ provider, jar, env, context });
        const maxAge = Math.max(1, Math.min(SESSION_SECONDS, Math.floor((Number(current.session.expiresAt) - Date.now()) / 1000)));
        return json(request, 200, { ok: true, authenticated: true, emailVerified: true, ...current.session }, {
          'Set-Cookie': [firebaseCookie(current.refreshed.refreshToken, maxAge), ...(context.isNewDevice ? [deviceCookie(context.deviceId)] : [])]
        });
      }

      if (request.method === 'POST' && url.pathname === `${AUTH_API_PREFIX}/session/logout`) {
        const sessionToken = jar[AUTH_SESSION_COOKIE];
        if (sessionToken) await callAuthority(env, '/internal/session/revoke', { sessionToken });
        return json(request, 200, { ok: true, authenticated: false }, { 'Set-Cookie': clearAuthCookies() });
      }

      return json(request, 404, { ok: false, error: { code: 'NOT_FOUND', message: 'Endpoint পাওয়া যায়নি।' } });
    } catch (cause) {
      const error = asNativeAuthError(cause);
      const clearSession = Boolean(jar[AUTH_SESSION_COOKIE])
        && [AUTH_ERROR_CODES.SESSION_INVALID, AUTH_ERROR_CODES.EMAIL_NOT_VERIFIED, AUTH_ERROR_CODES.ACCOUNT_DISABLED].includes(error.code);
      if (clearSession && jar[AUTH_SESSION_COOKIE]) {
        try { await callAuthority(env, '/internal/session/revoke', { sessionToken: jar[AUTH_SESSION_COOKIE] }); } catch {}
      }
      const providerDiagnosticCode = /^[A-Z0-9_]{1,80}$/.test(String(error.providerDiagnostic || '')) ? String(error.providerDiagnostic) : '';
      return json(request, error.status, { ok: false, error: error.toPublic() }, {
        ...(error.retryAfter ? { 'Retry-After': String(error.retryAfter) } : {}),
        ...(providerDiagnosticCode ? { 'X-AH-Auth-Diagnostic': providerDiagnosticCode } : {}),
        ...(clearSession ? { 'Set-Cookie': clearAuthCookies() } : {})
      });
    }
  };
}

export const __publicAuthTest = Object.freeze({ allowedOrigin, providerError, googleActivated, adminAuthorized, passkeyEndpointReady, passkeyPublished });
