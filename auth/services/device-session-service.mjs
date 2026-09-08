import { AuthServiceBoundary } from './service-base.mjs';

export class DeviceSessionService extends AuthServiceBoundary {
  constructor(port) { super('deviceSession', port); }
  list(context) { return this.invoke('list', undefined, context); }
  revoke(sessionId, context) { return this.invoke('revoke', { sessionId }, context); }
  revokeAll(input = {}, context) { return this.invoke('revokeAll', input, context); }
  markTrusted(sessionId, context) { return this.invoke('markTrusted', { sessionId }, context); }
}
