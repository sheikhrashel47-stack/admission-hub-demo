import { createAuthConfig } from './core/config.mjs';
import { mergePorts } from './core/contracts.mjs';
import { AuthStateStore } from './core/state-store.mjs';
import { AuthOperationRunner } from './core/operation-runner.mjs';
import { AuthenticationCore } from './core/auth-core.mjs';
import { AUTH_PUBLIC_METHODS } from './core/constants.mjs';
import { AuthService } from './services/auth-service.mjs';
import { SessionService } from './services/session-service.mjs';
import { VerificationService } from './services/verification-service.mjs';
import { RecoveryService } from './services/recovery-service.mjs';
import { PasskeyService } from './services/passkey-service.mjs';
import { OAuthService } from './services/oauth-service.mjs';
import { SecurityService } from './services/security-service.mjs';
import { DeviceSessionService } from './services/device-session-service.mjs';
import { IdentityService } from './services/identity-service.mjs';

const bindPublicContract = core => {
  const contract = {};
  for (const method of AUTH_PUBLIC_METHODS) contract[method] = core[method].bind(core);
  return Object.freeze(contract);
};

export function createAuthFoundation({ ports: portOverrides = {}, config: configOverrides = {}, runtime = {} } = {}) {
  const config = createAuthConfig(configOverrides);
  const ports = mergePorts(portOverrides);
  const services = Object.freeze({
    auth: new AuthService(ports.auth),
    session: new SessionService(ports.session),
    verification: new VerificationService(ports.verification),
    recovery: new RecoveryService(ports.recovery),
    passkey: new PasskeyService(ports.passkey),
    oauth: new OAuthService(ports.oauth),
    security: new SecurityService(ports.security),
    deviceSession: new DeviceSessionService(ports.deviceSession),
    identity: new IdentityService(ports.identity)
  });
  const store = new AuthStateStore({ now: runtime.now });
  const runner = new AuthOperationRunner({ defaults: config.operation, sleep: runtime.sleep });
  const core = new AuthenticationCore({ services, store, runner, config });
  return bindPublicContract(core);
}
