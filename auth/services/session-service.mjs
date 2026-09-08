import { AuthServiceBoundary } from './service-base.mjs';
import { assertSessionResult } from '../core/validation.mjs';

export class SessionService extends AuthServiceBoundary {
  constructor(port) { super('session', port); }
  restore(context) { return this.invoke('restore', undefined, context); }
  validate(session, context) { return this.invoke('validate', session, context); }
  async create(input, context) { return assertSessionResult(await this.invoke('create', input, context)); }
  async refresh(session, context) { return assertSessionResult(await this.invoke('refresh', session, context)); }
  revoke(session, context) { return this.invoke('revoke', session, context); }
}
