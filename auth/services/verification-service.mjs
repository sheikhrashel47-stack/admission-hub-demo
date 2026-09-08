import { AuthServiceBoundary } from './service-base.mjs';

export class VerificationService extends AuthServiceBoundary {
  constructor(port) { super('verification', port); }
  send(input, context) { return this.invoke('send', input, context); }
  verify(input, context) { return this.invoke('verify', input, context); }
}
