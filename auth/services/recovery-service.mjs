import { AuthServiceBoundary } from './service-base.mjs';

export class RecoveryService extends AuthServiceBoundary {
  constructor(port) { super('recovery', port); }
  begin(input, context) { return this.invoke('begin', input, context); }
  complete(input, context) { return this.invoke('complete', input, context); }
}
