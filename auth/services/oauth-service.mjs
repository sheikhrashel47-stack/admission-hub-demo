import { AuthServiceBoundary } from './service-base.mjs';
import { assertAuthenticationResult } from '../core/validation.mjs';

export class OAuthService extends AuthServiceBoundary {
  constructor(port) { super('oauth', port); }
  async authenticate(input, context) { return assertAuthenticationResult(await this.invoke('authenticate', input, context)); }
}
