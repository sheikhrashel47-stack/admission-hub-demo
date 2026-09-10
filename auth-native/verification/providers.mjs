import {
  VERIFICATION_CHANNELS,
  VERIFICATION_FAILURE_CLASS,
  VERIFICATION_MODES,
  VerificationProviderError
} from './provider-contract.mjs';
import { deriveTelegramWebhookSecret, validTelegramWebhookSecret } from './telegram-security.mjs';

const safeInteger = (value, min = 0, max = Number.MAX_SAFE_INTEGER) => {
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max ? number : 0;
};
const validSecret = value => typeof value === 'string' && value.length >= 20 && value.length <= 4096 && !/[\r\n\u0000]/.test(value);
const validTelegramBotToken = value => /^[1-9]\d{5,19}:[A-Za-z0-9_-]{30,100}$/.test(String(value || ''));
const validTelegramBotUsername = value => /^(?=.{5,32}$)[A-Za-z][A-Za-z0-9_]*bot$/i.test(String(value || ''));

function httpsOrigin(value) {
  try {
    const url = new URL(String(value || ''));
    if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash) return '';
    return url.origin;
  } catch { return ''; }
}

function telegramWebhookEndpoint(value) {
  try {
    const url = new URL(String(value || ''));
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/api/auth/v1/telegram/webhook') return '';
    if (!['admissionhub.pages.dev', 'admission-gk.admissionhub.workers.dev'].includes(url.hostname)) return '';
    return url.href;
  } catch { return ''; }
}

async function boundedJson(response, maximum = 32 * 1024) {
  if (!response.body) return {};
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maximum) {
      await reader.cancel();
      throw new VerificationProviderError('INVALID_PROVIDER_RESPONSE', VERIFICATION_FAILURE_CLASS.HARD);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  if (!total) return {};
  try { return JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new VerificationProviderError('INVALID_PROVIDER_RESPONSE', VERIFICATION_FAILURE_CLASS.HARD); }
}

function httpFailure(response, _payload, { userStatuses = [400, 404, 422] } = {}) {
  const status = Number(response?.status || 0);
  const code = status >= 100 && status <= 599 ? `PROVIDER_HTTP_${status}` : 'PROVIDER_FAILURE';
  if (userStatuses.includes(status)) return new VerificationProviderError(code, VERIFICATION_FAILURE_CLASS.USER);
  if ([401, 403].includes(status)) return new VerificationProviderError(code, VERIFICATION_FAILURE_CLASS.HARD);
  if (status === 429 || status >= 500 || status === 0) return new VerificationProviderError(code, VERIFICATION_FAILURE_CLASS.TEMPORARY, { retryAfter: 60 });
  return new VerificationProviderError(code, VERIFICATION_FAILURE_CLASS.HARD);
}

async function fetchJson(fetchImpl, url, init = {}) {
  let response;
  try {
    response = await fetchImpl(url, { ...init, redirect: 'manual', signal: init.signal || AbortSignal.timeout(12_000) });
  } catch { throw new VerificationProviderError('NETWORK_ERROR', VERIFICATION_FAILURE_CLASS.TEMPORARY); }
  const payload = await boundedJson(response);
  if (!response.ok) throw httpFailure(response, payload);
  return payload;
}

export class BridgeOtpVerificationProvider {
  constructor({ id, origin, apiKey, declaredDailyQuota, fetchImpl = globalThis.fetch } = {}) {
    this.id = String(id || '');
    this.channel = VERIFICATION_CHANNELS.OTP;
    this.verificationMode = VERIFICATION_MODES.LOCAL_CODE;
    this.origin = httpsOrigin(origin);
    this.apiKey = String(apiKey || '');
    this.declaredDailyQuota = safeInteger(declaredDailyQuota, 1, 10_000_000);
    this.fetch = typeof fetchImpl === 'function' ? fetchImpl.bind(globalThis) : null;
    this.configured = Boolean(this.origin && validSecret(this.apiKey) && this.declaredDailyQuota && this.fetch);
  }

  #headers(content = false) {
    return {
      Accept: 'application/json',
      'Cache-Control': 'no-store',
      'X-Verification-Key': this.apiKey,
      ...(content ? { 'Content-Type': 'application/json' } : {})
    };
  }

  async checkAvailability() {
    if (!this.configured) return { available: false, code: 'NOT_CONFIGURED' };
    try {
      const payload = await fetchJson(this.fetch, `${this.origin}/v1/verification/health`, { method: 'GET', headers: this.#headers() });
      return { available: payload?.ok === true && payload?.ready === true, code: payload?.ready === true ? 'READY' : 'NOT_READY' };
    } catch (error) { throw error; }
  }

  async getRemainingQuota() {
    if (!this.configured) return { remaining: 0, limit: 0, resetAt: 0, source: 'not-configured' };
    const payload = await fetchJson(this.fetch, `${this.origin}/v1/verification/quota`, { method: 'GET', headers: this.#headers() });
    const limit = safeInteger(payload?.limit, 1, this.declaredDailyQuota) || this.declaredDailyQuota;
    const remaining = Math.min(limit, safeInteger(payload?.remaining, 0, limit));
    const resetAt = safeInteger(payload?.resetAt, 0, 9_000_000_000_000);
    if (!resetAt) throw new VerificationProviderError('INVALID_QUOTA_RESPONSE', VERIFICATION_FAILURE_CLASS.HARD);
    return { remaining, limit, resetAt, source: 'provider-api' };
  }

  async sendVerification(input = {}) {
    if (!this.configured) throw new VerificationProviderError('NOT_CONFIGURED', VERIFICATION_FAILURE_CLASS.HARD);
    if (!/^\d{6}$/.test(String(input.code || '')) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(input.destination || ''))) {
      throw new VerificationProviderError('INVALID_DESTINATION', VERIFICATION_FAILURE_CLASS.USER);
    }
    const payload = await fetchJson(this.fetch, `${this.origin}/v1/verification/send`, {
      method: 'POST',
      headers: this.#headers(true),
      body: JSON.stringify({
        attemptId: input.attemptId,
        destination: input.destination,
        code: input.code,
        purpose: input.purpose,
        expiresAt: input.expiresAt
      })
    });
    if (payload?.accepted !== true || !/^[A-Za-z0-9_-]{6,128}$/.test(String(payload?.messageRef || ''))) {
      throw new VerificationProviderError('INVALID_PROVIDER_RESPONSE', VERIFICATION_FAILURE_CLASS.HARD);
    }
    return { accepted: true };
  }

  async verifyCode() { throw new VerificationProviderError('LOCAL_VERIFICATION_ONLY', VERIFICATION_FAILURE_CLASS.USER); }
  async getProviderStatus() {
    return { status: this.configured ? 'configured' : 'disabled', configured: this.configured };
  }
}

export class OfficialWhatsAppVerificationProvider {
  constructor({ graphVersion, phoneNumberId, accessToken, templateName, templateLanguage = 'en_US', declaredDailyQuota, fetchImpl = globalThis.fetch } = {}) {
    this.id = 'whatsapp';
    this.channel = VERIFICATION_CHANNELS.WHATSAPP;
    this.verificationMode = VERIFICATION_MODES.LOCAL_CODE;
    this.graphVersion = /^v\d{1,2}\.\d$/.test(String(graphVersion || '')) ? String(graphVersion) : '';
    this.phoneNumberId = /^\d{6,32}$/.test(String(phoneNumberId || '')) ? String(phoneNumberId) : '';
    this.accessToken = String(accessToken || '');
    this.templateName = /^[a-z0-9_]{3,128}$/.test(String(templateName || '')) ? String(templateName) : '';
    this.templateLanguage = /^[a-z]{2,3}(?:_[A-Z]{2})?$/.test(String(templateLanguage || '')) ? String(templateLanguage) : '';
    this.declaredDailyQuota = safeInteger(declaredDailyQuota, 1, 10_000_000);
    this.fetch = typeof fetchImpl === 'function' ? fetchImpl.bind(globalThis) : null;
    this.configured = Boolean(this.graphVersion && this.phoneNumberId && validSecret(this.accessToken) && this.templateName && this.templateLanguage && this.declaredDailyQuota && this.fetch);
  }

  #url(suffix = '') { return `https://graph.facebook.com/${this.graphVersion}/${this.phoneNumberId}${suffix}`; }
  #headers(content = false) {
    return {
      Accept: 'application/json',
      Authorization: `Bearer ${this.accessToken}`,
      'Cache-Control': 'no-store',
      ...(content ? { 'Content-Type': 'application/json' } : {})
    };
  }

  async checkAvailability() {
    if (!this.configured) return { available: false, code: 'NOT_CONFIGURED' };
    const payload = await fetchJson(this.fetch, `${this.#url()}?fields=id`, { method: 'GET', headers: this.#headers() });
    return { available: String(payload?.id || '') === this.phoneNumberId, code: String(payload?.id || '') === this.phoneNumberId ? 'READY' : 'PHONE_ID_MISMATCH' };
  }

  async getRemainingQuota({ now = Date.now() } = {}) {
    if (!this.configured) return { remaining: 0, limit: 0, resetAt: 0, source: 'not-configured' };
    const resetAt = (Math.floor(Number(now) / 86_400_000) + 1) * 86_400_000;
    return { remaining: this.declaredDailyQuota, limit: this.declaredDailyQuota, resetAt, source: 'operator-declared-cap' };
  }

  async sendVerification(input = {}) {
    if (!this.configured) throw new VerificationProviderError('NOT_CONFIGURED', VERIFICATION_FAILURE_CLASS.HARD);
    const destination = String(input.destination || '');
    const code = String(input.code || '');
    if (!/^\+[1-9]\d{7,14}$/.test(destination) || !/^\d{6}$/.test(code)) {
      throw new VerificationProviderError('INVALID_DESTINATION', VERIFICATION_FAILURE_CLASS.USER);
    }
    const payload = await fetchJson(this.fetch, this.#url('/messages'), {
      method: 'POST',
      headers: this.#headers(true),
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: destination.slice(1),
        type: 'template',
        template: {
          name: this.templateName,
          language: { code: this.templateLanguage },
          components: [{ type: 'body', parameters: [{ type: 'text', text: code }] }]
        }
      })
    });
    if (!validSecret(String(payload?.messages?.[0]?.id || ''))) {
      throw new VerificationProviderError('INVALID_PROVIDER_RESPONSE', VERIFICATION_FAILURE_CLASS.HARD);
    }
    return { accepted: true };
  }

  async verifyCode() { throw new VerificationProviderError('LOCAL_VERIFICATION_ONLY', VERIFICATION_FAILURE_CLASS.USER); }
  async getProviderStatus() {
    return { status: this.configured ? 'configured' : 'disabled', configured: this.configured, officialApi: true };
  }
}

export class TelegramLinkVerificationProvider {
  constructor({ botUsername, botToken, webhookSecret, webhookSecretSource, webhookUrl, declaredDailyQuota, fetchImpl = globalThis.fetch, cryptoImpl = globalThis.crypto } = {}) {
    this.id = 'telegram';
    this.channel = VERIFICATION_CHANNELS.TELEGRAM;
    this.verificationMode = VERIFICATION_MODES.PROVIDER_EVIDENCE;
    this.botUsername = validTelegramBotUsername(botUsername) ? String(botUsername) : '';
    this.botToken = validTelegramBotToken(botToken) ? String(botToken) : '';
    this.botId = this.botToken ? this.botToken.split(':', 1)[0] : '';
    this.webhookSecret = validTelegramWebhookSecret(webhookSecret) ? String(webhookSecret) : '';
    this.webhookSecretSource = validSecret(webhookSecretSource) ? String(webhookSecretSource) : '';
    this.webhookUrl = telegramWebhookEndpoint(webhookUrl);
    this.declaredDailyQuota = safeInteger(declaredDailyQuota, 1, 10_000_000);
    this.fetch = typeof fetchImpl === 'function' ? fetchImpl.bind(globalThis) : null;
    this.crypto = cryptoImpl;
    this.resolvedBotUsername = '';
    this.configured = Boolean(
      this.botToken && (this.webhookSecret || this.webhookSecretSource)
      && this.webhookUrl && this.declaredDailyQuota && this.fetch
    );
  }

  #base(method) { return `https://api.telegram.org/bot${this.botToken}/${method}`; }
  #headers(content = false) {
    return {
      Accept: 'application/json',
      'Cache-Control': 'no-store',
      ...(content ? { 'Content-Type': 'application/json' } : {})
    };
  }

  async #resolvedWebhookSecret() {
    if (this.webhookSecret) return this.webhookSecret;
    const derived = await deriveTelegramWebhookSecret(this.webhookSecretSource, this.crypto);
    if (!derived) throw new VerificationProviderError('NOT_CONFIGURED', VERIFICATION_FAILURE_CLASS.HARD);
    return derived;
  }

  async #identity() {
    const identity = await fetchJson(this.fetch, this.#base('getMe'), { method: 'GET', headers: this.#headers() });
    const username = String(identity?.result?.username || '');
    const providerId = String(identity?.result?.id || '');
    const ready = identity?.ok === true
      && identity?.result?.is_bot === true
      && providerId === this.botId
      && validTelegramBotUsername(username)
      && (!this.botUsername || username.toLowerCase() === this.botUsername.toLowerCase());
    if (ready) this.resolvedBotUsername = username;
    return { ready, username };
  }

  async #webhookInfo() {
    return fetchJson(this.fetch, this.#base('getWebhookInfo'), { method: 'GET', headers: this.#headers() });
  }

  async #deleteWebhook() {
    const payload = await fetchJson(this.fetch, this.#base('deleteWebhook'), {
      method: 'POST',
      headers: this.#headers(true),
      body: JSON.stringify({ drop_pending_updates: false })
    });
    if (payload?.ok !== true || payload?.result !== true) {
      throw new VerificationProviderError('INVALID_PROVIDER_RESPONSE', VERIFICATION_FAILURE_CLASS.HARD);
    }
  }

  async checkAvailability() {
    if (!this.configured) return { available: false, code: 'NOT_CONFIGURED' };
    const [identity, webhook] = await Promise.all([this.#identity(), this.#webhookInfo()]);
    const currentUrl = String(webhook?.result?.url || '');
    const webhookReady = webhook?.ok === true && currentUrl === this.webhookUrl;
    const updates = webhook?.result?.allowed_updates;
    const updateScopeReady = !Array.isArray(updates) || (updates.length === 1 && updates[0] === 'message');
    return {
      available: identity.ready && webhookReady && updateScopeReady,
      code: !identity.ready ? 'BOT_IDENTITY_MISMATCH' : !webhookReady ? 'WEBHOOK_NOT_READY' : !updateScopeReady ? 'WEBHOOK_SCOPE_MISMATCH' : 'READY'
    };
  }

  async configureWebhook() {
    if (!this.configured) throw new VerificationProviderError('NOT_CONFIGURED', VERIFICATION_FAILURE_CLASS.HARD);
    const identity = await this.#identity();
    if (!identity.ready) throw new VerificationProviderError('BOT_IDENTITY_MISMATCH', VERIFICATION_FAILURE_CLASS.HARD);
    const before = await this.#webhookInfo();
    const previousUrl = String(before?.result?.url || '');
    if (previousUrl && previousUrl !== this.webhookUrl) {
      throw new VerificationProviderError('WEBHOOK_CONFLICT', VERIFICATION_FAILURE_CLASS.HARD);
    }
    const changed = !previousUrl;
    try {
      const secret = await this.#resolvedWebhookSecret();
      const configured = await fetchJson(this.fetch, this.#base('setWebhook'), {
        method: 'POST',
        headers: this.#headers(true),
        body: JSON.stringify({
          url: this.webhookUrl,
          secret_token: secret,
          allowed_updates: ['message'],
          drop_pending_updates: false
        })
      });
      if (configured?.ok !== true || configured?.result !== true) {
        throw new VerificationProviderError('INVALID_PROVIDER_RESPONSE', VERIFICATION_FAILURE_CLASS.HARD);
      }
      const after = await this.#webhookInfo();
      const scope = after?.result?.allowed_updates;
      const webhookReady = after?.ok === true
        && String(after?.result?.url || '') === this.webhookUrl
        && (!Array.isArray(scope) || (scope.length === 1 && scope[0] === 'message'));
      if (!webhookReady) throw new VerificationProviderError('WEBHOOK_NOT_READY', VERIFICATION_FAILURE_CLASS.HARD);
      const probe = await fetchJson(this.fetch, this.webhookUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Cache-Control': 'no-store',
          'Content-Type': 'application/json',
          'X-Telegram-Bot-Api-Secret-Token': secret
        },
        body: JSON.stringify({ update_id: 0 })
      });
      if (probe?.ok !== true) throw new VerificationProviderError('WEBHOOK_ENDPOINT_REJECTED', VERIFICATION_FAILURE_CLASS.HARD);
      return Object.freeze({ ready: true, identityReady: true, webhookReady: true, endpointAccepted: true, webhookChanged: changed });
    } catch (cause) {
      if (changed) await this.#deleteWebhook().catch(() => {});
      throw cause;
    }
  }

  async removeConfiguredWebhook() {
    if (!this.configured) throw new VerificationProviderError('NOT_CONFIGURED', VERIFICATION_FAILURE_CLASS.HARD);
    const current = await this.#webhookInfo();
    if (String(current?.result?.url || '') !== this.webhookUrl) return Object.freeze({ removed: false });
    await this.#deleteWebhook();
    return Object.freeze({ removed: true });
  }

  async getRemainingQuota({ now = Date.now() } = {}) {
    if (!this.configured) return { remaining: 0, limit: 0, resetAt: 0, source: 'not-configured' };
    return {
      remaining: this.declaredDailyQuota,
      limit: this.declaredDailyQuota,
      resetAt: (Math.floor(Number(now) / 86_400_000) + 1) * 86_400_000,
      source: 'internal-safety-cap'
    };
  }

  async sendVerification(input = {}) {
    if (!this.configured) throw new VerificationProviderError('NOT_CONFIGURED', VERIFICATION_FAILURE_CLASS.HARD);
    if (!/^[A-Za-z0-9_-]{32,64}$/.test(String(input.linkToken || ''))) {
      throw new VerificationProviderError('INVALID_LINK_TOKEN', VERIFICATION_FAILURE_CLASS.HARD);
    }
    if (!this.resolvedBotUsername) {
      const identity = await this.#identity();
      if (!identity.ready) throw new VerificationProviderError('BOT_IDENTITY_MISMATCH', VERIFICATION_FAILURE_CLASS.HARD);
    }
    const link = new URL(`https://t.me/${this.resolvedBotUsername}`);
    link.searchParams.set('start', input.linkToken);
    return { accepted: true, interaction: { type: 'telegram-link', url: link.href } };
  }

  async verifyCode(input = {}) {
    return { verified: input.serverConfirmed === true, identityKind: 'telegram-account', phoneOwnership: false };
  }

  async getProviderStatus() {
    return { status: this.configured ? 'configured' : 'disabled', configured: this.configured, identityKind: 'telegram-account', phoneOwnership: false };
  }
}

export function createConfiguredVerificationProviders(env = {}, { fetchImpl = globalThis.fetch } = {}) {
  return [
    new BridgeOtpVerificationProvider({ id: 'otp-a', origin: env.OTP_A_PROVIDER_ORIGIN, apiKey: env.OTP_A_PROVIDER_KEY, declaredDailyQuota: env.OTP_A_DAILY_QUOTA, fetchImpl }),
    new BridgeOtpVerificationProvider({ id: 'otp-b', origin: env.OTP_B_PROVIDER_ORIGIN, apiKey: env.OTP_B_PROVIDER_KEY, declaredDailyQuota: env.OTP_B_DAILY_QUOTA, fetchImpl }),
    new BridgeOtpVerificationProvider({ id: 'otp-c', origin: env.OTP_C_PROVIDER_ORIGIN, apiKey: env.OTP_C_PROVIDER_KEY, declaredDailyQuota: env.OTP_C_DAILY_QUOTA, fetchImpl }),
    new OfficialWhatsAppVerificationProvider({
      graphVersion: env.WHATSAPP_GRAPH_VERSION,
      phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
      accessToken: env.WHATSAPP_ACCESS_TOKEN,
      templateName: env.WHATSAPP_TEMPLATE_NAME,
      templateLanguage: env.WHATSAPP_TEMPLATE_LANGUAGE,
      declaredDailyQuota: env.WHATSAPP_DAILY_QUOTA,
      fetchImpl
    }),
    new TelegramLinkVerificationProvider({
      botUsername: env.TELEGRAM_AUTH_BOT_USERNAME,
      botToken: env.TELEGRAM_AUTH_BOT_TOKEN || env.TG_BOT_TOKEN,
      webhookSecret: env.TELEGRAM_AUTH_WEBHOOK_SECRET,
      webhookSecretSource: env.AUTH_HMAC_SECRET,
      webhookUrl: env.TELEGRAM_AUTH_WEBHOOK_URL,
      declaredDailyQuota: env.TELEGRAM_AUTH_DAILY_QUOTA,
      fetchImpl
    })
  ];
}

export const __verificationProvidersTest = Object.freeze({ httpsOrigin, boundedJson, httpFailure });
