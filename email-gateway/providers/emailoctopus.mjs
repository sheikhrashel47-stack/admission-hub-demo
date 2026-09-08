import { ProviderAdapter } from './base-provider.mjs';
import { EMAIL_FAILURE_CODES, PROVIDER_CAPABILITIES } from '../core/constants.mjs';
import { EmailGatewayError } from '../core/errors.mjs';

export class EmailOctopusProvider extends ProviderAdapter {
  #apiKey;
  constructor({ apiKey, fetchImpl }) {
    super({ id: 'emailoctopus', name: 'EmailOctopus', fetchImpl, capabilities: [PROVIDER_CAPABILITIES.API] });
    this.#apiKey = String(apiKey || '');
  }

  async verifyConfiguration() {
    return Object.freeze({ configured: Boolean(this.#apiKey), missing: [!this.#apiKey && 'apiKey'].filter(Boolean), transactional: false });
  }

  checkHealth(context = {}) {
    return this.probeHttp({
      url: 'https://api.emailoctopus.com/lists?limit=1', signal: context.signal,
      headers: { Authorization: `Bearer ${this.#apiKey}` },
      mapResult: () => ({ status: 'INELIGIBLE', transactional: false })
    });
  }

  async sendEmail() {
    throw new EmailGatewayError({
      code: EMAIL_FAILURE_CODES.NOT_CONFIGURED,
      safeMessage: 'EmailOctopus does not expose a transactional send API for OTP delivery.',
      retryable: false,
      uncertain: false,
      dispatched: false,
      providerId: this.id
    });
  }
}
