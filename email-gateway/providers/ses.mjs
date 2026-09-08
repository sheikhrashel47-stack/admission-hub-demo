import { ProviderAdapter } from './base-provider.mjs';
import { PROVIDER_CAPABILITIES } from '../core/constants.mjs';
import { hmacSha256Bytes, hmacSha256Hex, sha256Hex } from '../core/crypto.mjs';

const amzDate = date => date.toISOString().replace(/[:-]|\.\d{3}/g, '');

export class SesProvider extends ProviderAdapter {
  #accessKeyId; #secretAccessKey; #sessionToken; #region; #fromAddress; #now;
  constructor({ accessKeyId, secretAccessKey, sessionToken = '', region = 'us-east-1', fromAddress, fetchImpl, now = () => Date.now() }) {
    super({ id: 'ses', name: 'Amazon SES', fetchImpl, capabilities: [PROVIDER_CAPABILITIES.API, PROVIDER_CAPABILITIES.SMTP, PROVIDER_CAPABILITIES.TRANSACTIONAL, PROVIDER_CAPABILITIES.HTML, PROVIDER_CAPABILITIES.TEXT, PROVIDER_CAPABILITIES.CUSTOM_DOMAIN, PROVIDER_CAPABILITIES.WEBHOOKS, PROVIDER_CAPABILITIES.DELIVERY_EVENTS] });
    this.#accessKeyId = String(accessKeyId || ''); this.#secretAccessKey = String(secretAccessKey || ''); this.#sessionToken = String(sessionToken || ''); this.#region = String(region || 'us-east-1'); this.#fromAddress = String(fromAddress || ''); this.#now = now;
  }
  async verifyConfiguration() {
    const regionValid = /^[a-z]{2}(?:-gov)?-[a-z]+-\d$/.test(this.#region);
    return Object.freeze({ configured: Boolean(this.#accessKeyId && this.#secretAccessKey && this.#fromAddress && regionValid), missing: [!this.#accessKeyId && 'accessKeyId', !this.#secretAccessKey && 'secretAccessKey', !this.#fromAddress && 'fromAddress', !regionValid && 'region'].filter(Boolean) });
  }
  async sendEmail(message, context = {}) {
    const host = `email.${this.#region}.amazonaws.com`;
    const path = '/v2/email/outbound-emails';
    const body = JSON.stringify({
      FromEmailAddress: this.#fromAddress,
      Destination: { ToAddresses: [message.recipient] },
      Content: { Simple: { Subject: { Data: message.subject, Charset: 'UTF-8' }, Body: { Text: { Data: message.text, Charset: 'UTF-8' }, Html: { Data: message.html, Charset: 'UTF-8' } } } },
      EmailTags: [{ Name: 'request_ref', Value: context.requestRef }]
    });
    const date = new Date(this.#now());
    const timestamp = amzDate(date);
    const dateStamp = timestamp.slice(0, 8);
    const payloadHash = await sha256Hex(body);
    const canonical = {
      'content-type': 'application/json',
      host,
      'x-amz-date': timestamp,
      ...(this.#sessionToken ? { 'x-amz-security-token': this.#sessionToken } : {})
    };
    const signedHeaders = Object.keys(canonical).sort().join(';');
    const canonicalHeaders = Object.keys(canonical).sort().map(key => `${key}:${canonical[key].trim()}\n`).join('');
    const canonicalRequest = `POST\n${path}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
    const scope = `${dateStamp}/${this.#region}/ses/aws4_request`;
    const stringToSign = `AWS4-HMAC-SHA256\n${timestamp}\n${scope}\n${await sha256Hex(canonicalRequest)}`;
    const dateKey = await hmacSha256Bytes(`AWS4${this.#secretAccessKey}`, dateStamp);
    const regionKey = await hmacSha256Bytes(dateKey, this.#region);
    const serviceKey = await hmacSha256Bytes(regionKey, 'ses');
    const signingKey = await hmacSha256Bytes(serviceKey, 'aws4_request');
    const signature = await hmacSha256Hex(signingKey, stringToSign);
    const authorization = `AWS4-HMAC-SHA256 Credential=${this.#accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    return this.sendHttp({
      url: `https://${host}${path}`, signal: context.signal, requestId: context.requestId,
      headers: { 'Content-Type': 'application/json', 'X-Amz-Date': timestamp, ...(this.#sessionToken ? { 'X-Amz-Security-Token': this.#sessionToken } : {}), Authorization: authorization },
      body,
      mapResponse: data => ({ providerMessageId: data?.MessageId })
    });
  }
}
