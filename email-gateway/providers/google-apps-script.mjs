import { ProviderAdapter } from './base-provider.mjs';
import { PROVIDER_CAPABILITIES } from '../core/constants.mjs';
import { hmacSha256Base64Url } from '../core/crypto.mjs';

export class GoogleAppsScriptProvider extends ProviderAdapter {
  #webAppUrl; #sharedSecret;
  constructor({ webAppUrl, sharedSecret, fetchImpl }) {
    super({ id: 'google-apps-script', name: 'Google Apps Script (Emergency)', fetchImpl, capabilities: [PROVIDER_CAPABILITIES.API, PROVIDER_CAPABILITIES.TRANSACTIONAL, PROVIDER_CAPABILITIES.HTML, PROVIDER_CAPABILITIES.TEXT, PROVIDER_CAPABILITIES.IDEMPOTENCY] });
    this.#webAppUrl = String(webAppUrl || ''); this.#sharedSecret = String(sharedSecret || '');
  }
  async verifyConfiguration() {
    let validUrl = false;
    try {
      const url = new URL(this.#webAppUrl);
      validUrl = url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash && url.hostname === 'script.google.com' && /^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url.pathname);
    } catch (_) {}
    const secretValid = this.#sharedSecret.length >= 32;
    return Object.freeze({ configured: Boolean(validUrl && secretValid), missing: [!validUrl && 'webAppUrl', !secretValid && 'sharedSecret'].filter(Boolean) });
  }
  async sendEmail(message, context = {}) {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const canonical = `${context.requestId}\n${timestamp}\n${message.recipient}\n${message.subject}`;
    const signature = await hmacSha256Base64Url(this.#sharedSecret, canonical);
    return this.sendHttp({
      url: this.#webAppUrl, signal: context.signal, requestId: context.requestId,
      headers: { 'Content-Type': 'application/json' },
      body: { requestId: context.requestId, timestamp, signature, recipient: message.recipient, subject: message.subject, text: message.text, html: message.html },
      mapResponse: data => ({ providerMessageId: data?.messageId || data?.id })
    });
  }
}
