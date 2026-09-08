import { ProviderAdapter, basicAuthorization } from './base-provider.mjs';
import { PROVIDER_CAPABILITIES } from '../core/constants.mjs';

export class MailjetProvider extends ProviderAdapter {
  #apiKey; #secretKey; #fromAddress; #fromName; #apiBase;
  constructor({ apiKey, secretKey, fromAddress, fromName = 'Admission Hub', apiBase = 'https://api.mailjet.com', fetchImpl }) {
    super({ id: 'mailjet', name: 'Mailjet', fetchImpl, capabilities: [PROVIDER_CAPABILITIES.API, PROVIDER_CAPABILITIES.SMTP, PROVIDER_CAPABILITIES.TRANSACTIONAL, PROVIDER_CAPABILITIES.HTML, PROVIDER_CAPABILITIES.TEXT, PROVIDER_CAPABILITIES.CUSTOM_DOMAIN, PROVIDER_CAPABILITIES.WEBHOOKS, PROVIDER_CAPABILITIES.DELIVERY_EVENTS] });
    this.#apiKey = String(apiKey || ''); this.#secretKey = String(secretKey || ''); this.#fromAddress = String(fromAddress || ''); this.#fromName = String(fromName || 'Admission Hub'); this.#apiBase = String(apiBase || 'https://api.mailjet.com').replace(/\/$/, '');
  }
  async verifyConfiguration() {
    const apiBaseValid = ['https://api.mailjet.com', 'https://api.us.mailjet.com'].includes(this.#apiBase);
    return Object.freeze({ configured: Boolean(this.#apiKey && this.#secretKey && this.#fromAddress && apiBaseValid), missing: [!this.#apiKey && 'apiKey', !this.#secretKey && 'secretKey', !this.#fromAddress && 'fromAddress', !apiBaseValid && 'apiBase'].filter(Boolean) });
  }
  checkHealth(context = {}) {
    return this.probeHttp({
      url: `${this.#apiBase}/v3/REST/sender?SenderEmail=${encodeURIComponent(this.#fromAddress)}`, signal: context.signal,
      headers: { Authorization: basicAuthorization(this.#apiKey, this.#secretKey) },
      mapResult: data => {
        const sender = Array.isArray(data?.Data) ? data.Data.find(item => String(item?.Email || item?.SenderEmail || '').toLowerCase() === this.#fromAddress.toLowerCase()) : null;
        const senderVerified = Boolean(sender && ['active', 'validated'].includes(String(sender.Status || '').toLowerCase()));
        return { status: senderVerified ? 'HEALTHY' : 'DEGRADED', senderVerified };
      }
    });
  }
  sendEmail(message, context = {}) {
    return this.sendHttp({
      url: `${this.#apiBase}/v3.1/send`, signal: context.signal, requestId: context.requestId, deliveryAttemptId: context.deliveryAttemptId,
      headers: { 'Content-Type': 'application/json', Authorization: basicAuthorization(this.#apiKey, this.#secretKey) },
      body: { Messages: [{ From: { Email: this.#fromAddress, Name: this.#fromName }, To: [{ Email: message.recipient }], Subject: message.subject, TextPart: message.text, HTMLPart: message.html, CustomID: context.requestRef }] },
      mapResponse: data => ({ providerMessageId: data?.Messages?.[0]?.To?.[0]?.MessageUUID })
    });
  }
}
