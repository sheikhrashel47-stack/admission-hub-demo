import { AuthServiceBoundary } from './service-base.mjs';
import { assertIdentityResult } from '../core/validation.mjs';

export class IdentityService extends AuthServiceBoundary {
  constructor(port) { super('identity', port); }
  async resolve(authentication, context) { return assertIdentityResult(await this.invoke('resolve', authentication, context)); }
}
