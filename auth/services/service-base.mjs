import { assertPort, PORT_METHODS } from '../core/contracts.mjs';

export class AuthServiceBoundary {
  constructor(name, port) {
    this.name = name;
    this.port = assertPort(name, port, PORT_METHODS[name]);
  }

  invoke(method, payload, context = {}) {
    return this.port[method](payload, context);
  }
}
