import { AUTH_METHODS, AUTH_STATES, AUTH_ERROR_CODES, AUTH_ERROR_TYPES } from './constants.mjs';
import { AuthError, classifyAuthError } from './errors.mjs';
import { assertAuthenticationResult } from './validation.mjs';

const stale = () => new AuthError({
  type: AUTH_ERROR_TYPES.AUTH_ERROR,
  code: AUTH_ERROR_CODES.STALE_OPERATION,
  safeMessage: 'A newer authentication operation replaced this result.',
  retryable: false
});

const operationId = () => {
  try { return crypto.randomUUID(); } catch (_) { return `auth-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`; }
};

export class AuthenticationCore {
  #services;
  #store;
  #runner;
  #config;
  #internalSession = null;
  #internalIdentity = null;
  #epoch = 0;
  #active = new Map();
  #controller = null;

  constructor({ services, store, runner, config }) {
    this.#services = services;
    this.#store = store;
    this.#runner = runner;
    this.#config = config;
  }

  initialize() {
    if (this.#store.getSnapshot().initialized) return Promise.resolve(this.#store.getSnapshot());
    return this.#singleFlight('initialize', async () => {
      const epoch = ++this.#epoch;
      this.#store.transition(AUTH_STATES.CHECKING_SESSION, { operation: 'restore-session', error: null });
      try {
        const restored = await this.#runner.run('Session restore', context => this.#services.session.restore(context), {
          singleFlightKey: 'session-restore',
          timeoutMs: this.#config.session.restoreTimeoutMs,
          maxRetries: this.#config.operation.maxRetries
        });
        if (epoch !== this.#epoch) throw stale();
        if (!restored) return this.#toUnauthenticated({ initialized: true });
        const valid = await this.#runner.run('Session validation', context => this.#services.session.validate(restored, context), {
          singleFlightKey: 'session-validation',
          timeoutMs: this.#config.operation.timeoutMs,
          maxRetries: this.#config.operation.maxRetries
        });
        if (epoch !== this.#epoch) throw stale();
        if (!valid) {
          const error = new AuthError({ type: AUTH_ERROR_TYPES.SESSION_ERROR, code: AUTH_ERROR_CODES.SESSION_INVALID, safeMessage: 'Saved session is no longer valid.', retryable: false });
          return this.#toUnauthenticated({ initialized: true, error });
        }
        const identity = restored.identity || await this.#runner.run('Session identity resolution', context => this.#services.identity.resolve(restored.authentication || restored, { ...context, reason: 'session-restore' }), {
          singleFlightKey: 'session-identity-resolution',
          timeoutMs: this.#config.operation.timeoutMs,
          maxRetries: this.#config.operation.maxRetries
        });
        if (epoch !== this.#epoch) throw stale();
        this.#internalSession = restored;
        this.#internalIdentity = identity;
        return this.#store.transition(AUTH_STATES.AUTHENTICATED, { initialized: true, identity, session: restored, operation: null, error: null });
      } catch (error) {
        const authError = classifyAuthError(error, { type: AUTH_ERROR_TYPES.SESSION_ERROR });
        if (authError.code === AUTH_ERROR_CODES.STALE_OPERATION) throw authError;
        if (this.#store.getSnapshot().state === AUTH_STATES.CHECKING_SESSION) this.#store.transition(AUTH_STATES.RECOVERING, { initialized: false, operation: 'session-recovery', error: authError });
        return this.#toUnauthenticated({ initialized: true, error: authError });
      }
    });
  }

  signIn(input) {
    return this.#singleFlight('auth-mutation', () => this.#authenticate('sign-in', input));
  }

  signUp(input) {
    return this.#singleFlight('auth-mutation', () => this.#authenticate('sign-up', input));
  }

  async #authenticate(kind, input) {
    if (!this.#store.getSnapshot().initialized) await this.initialize();
    if (this.isAuthenticated()) return this.#store.getSnapshot();
    const currentState = this.#store.getSnapshot().state;
    if ([AUTH_STATES.LOGGING_OUT, AUTH_STATES.RECOVERING, AUTH_STATES.CHECKING_SESSION].includes(currentState)) {
      throw new AuthError({ type: AUTH_ERROR_TYPES.AUTH_ERROR, code: AUTH_ERROR_CODES.BUSY, safeMessage: 'Another authentication operation is still finishing.', retryable: false });
    }
    const epoch = ++this.#epoch;
    this.#controller?.abort('replaced');
    const controller = new AbortController();
    const requestId = operationId();
    this.#controller = controller;
    this.#store.transition(AUTH_STATES.AUTHENTICATING, { initialized: true, operation: kind, error: null });
    try {
      const authentication = await this.#runner.run(kind, async context => {
        const method = String(input?.method || AUTH_METHODS.PASSWORD);
        if (kind === 'sign-up') {
          if (method === AUTH_METHODS.GOOGLE) return this.#services.oauth.authenticate(input, context);
          return this.#services.auth.signUp(input, context);
        }
        if (method === AUTH_METHODS.GOOGLE) return this.#services.oauth.authenticate(input, context);
        if (method === AUTH_METHODS.PASSKEY) return this.#services.passkey.authenticate(input, context);
        if (method === AUTH_METHODS.EMAIL_OTP) return assertAuthenticationResult(await this.#services.verification.verify(input, context));
        return this.#services.auth.signIn(input, context);
      }, {
        singleFlightKey: 'authentication',
        signal: controller.signal,
        idempotencyKey: requestId,
        timeoutMs: this.#config.operation.timeoutMs,
        maxRetries: kind === 'sign-up' ? 0 : this.#config.operation.maxRetries
      });
      if (epoch !== this.#epoch) throw stale();
      await this.#runner.run('Security assessment', context => this.#services.security.assess({ event: kind, method: input?.method || AUTH_METHODS.PASSWORD, providerIdentity: authentication.providerIdentity }, context), {
        singleFlightKey: 'security-assessment', signal: controller.signal, idempotencyKey: requestId,
        timeoutMs: this.#config.operation.timeoutMs, maxRetries: 0
      });
      const identity = await this.#runner.run('Identity resolution', context => this.#services.identity.resolve(authentication, { ...context, reason: kind }), {
        singleFlightKey: 'identity-resolution', signal: controller.signal, idempotencyKey: requestId,
        timeoutMs: this.#config.operation.timeoutMs, maxRetries: this.#config.operation.maxRetries
      });
      const session = await this.#runner.run('Session creation', context => this.#services.session.create({ authentication, identity, rememberMe: input?.rememberMe !== false }, context), {
        singleFlightKey: 'session-create', signal: controller.signal, idempotencyKey: requestId,
        timeoutMs: this.#config.operation.timeoutMs, maxRetries: 0
      });
      if (epoch !== this.#epoch) throw stale();
      this.#internalIdentity = identity;
      this.#internalSession = session;
      const snapshot = this.#store.transition(AUTH_STATES.AUTHENTICATED, { initialized: true, identity, session, operation: null, error: null });
      Promise.resolve(this.#services.security.record({ event: `${kind}-success`, method: input?.method || AUTH_METHODS.PASSWORD }, {})).catch(() => {});
      return snapshot;
    } catch (error) {
      const authError = classifyAuthError(error);
      if (epoch === this.#epoch) {
        this.#internalIdentity = null;
        this.#internalSession = null;
        if (authError.code === AUTH_ERROR_CODES.SECURITY_CHALLENGE_REQUIRED && this.#store.getSnapshot().state === AUTH_STATES.AUTHENTICATING) {
          this.#store.transition(AUTH_STATES.RECOVERING, { initialized: true, operation: 'security-challenge', error: authError });
        }
        if (this.#store.getSnapshot().state !== AUTH_STATES.UNAUTHENTICATED) this.#toUnauthenticated({ initialized: true, error: authError });
      }
      Promise.resolve(this.#services.security.record({ event: `${kind}-failed`, errorType: authError.type, errorCode: authError.code }, {})).catch(() => {});
      throw authError;
    } finally {
      if (this.#controller === controller) this.#controller = null;
    }
  }

  signOut() {
    return this.#singleFlight('sign-out', async () => {
      const wasAuthenticated = this.isAuthenticated() || Boolean(this.#internalSession);
      ++this.#epoch;
      this.#controller?.abort('logout');
      this.#controller = null;
      const state = this.#store.getSnapshot().state;
      if (state !== AUTH_STATES.LOGGING_OUT && state !== AUTH_STATES.UNAUTHENTICATED) this.#store.transition(AUTH_STATES.LOGGING_OUT, { initialized: true, operation: 'sign-out', error: null });
      const session = this.#internalSession;
      this.#internalSession = null;
      this.#internalIdentity = null;
      let error = null;
      if (wasAuthenticated && session) {
        try {
          await this.#runner.run('Session revoke', context => this.#services.session.revoke(session, context), {
            singleFlightKey: 'session-revoke',
            timeoutMs: this.#config.operation.timeoutMs,
            maxRetries: 0
          });
        } catch (cause) { error = classifyAuthError(cause, { type: AUTH_ERROR_TYPES.SESSION_ERROR }); }
      }
      if (this.#store.getSnapshot().state === AUTH_STATES.LOGGING_OUT) return this.#toUnauthenticated({ initialized: true, error });
      if (this.#store.getSnapshot().state === AUTH_STATES.UNAUTHENTICATED) return this.#store.update({ initialized: true, error });
      return this.#toUnauthenticated({ initialized: true, error });
    });
  }

  verify(input) {
    return this.#recoveryOperation('verify', context => this.#services.verification.verify(input, context));
  }

  recover(input) {
    return this.#recoveryOperation('recover', context => input?.stage === 'complete' ? this.#services.recovery.complete(input, context) : this.#services.recovery.begin(input, context));
  }

  async #recoveryOperation(name, task) {
    if (!this.#store.getSnapshot().initialized) await this.initialize();
    return this.#singleFlight('recovery', async () => {
      const hadAuth = this.isAuthenticated();
      this.#store.transition(AUTH_STATES.RECOVERING, { initialized: true, operation: name, error: null });
      try {
        const result = await this.#runner.run(name, task, { singleFlightKey: name, timeoutMs: this.#config.operation.timeoutMs, maxRetries: this.#config.operation.maxRetries });
        if (hadAuth && this.#internalIdentity && this.#internalSession) this.#store.transition(AUTH_STATES.AUTHENTICATED, { initialized: true, identity: this.#internalIdentity, session: this.#internalSession });
        else this.#toUnauthenticated({ initialized: true });
        return result;
      } catch (error) {
        const authError = classifyAuthError(error);
        if (hadAuth && this.#internalIdentity && this.#internalSession) this.#store.transition(AUTH_STATES.AUTHENTICATED, { initialized: true, identity: this.#internalIdentity, session: this.#internalSession, error: authError });
        else this.#toUnauthenticated({ initialized: true, error: authError });
        throw authError;
      }
    });
  }

  getCurrentUser() { return this.#store.getSnapshot().identity; }
  getSession() { return this.#store.getSnapshot().session; }
  getState() { return this.#store.getSnapshot(); }
  isAuthenticated() { return this.#store.getSnapshot().authenticated; }
  subscribe(listener, options) { return this.#store.subscribe(listener, options); }

  #toUnauthenticated({ initialized = true, error = null } = {}) {
    this.#internalSession = null;
    this.#internalIdentity = null;
    return this.#store.transition(AUTH_STATES.UNAUTHENTICATED, { initialized, identity: null, session: null, operation: null, error });
  }

  #singleFlight(key, factory) {
    if (this.#active.has(key)) return this.#active.get(key);
    const promise = Promise.resolve().then(factory).finally(() => {
      if (this.#active.get(key) === promise) this.#active.delete(key);
    });
    this.#active.set(key, promise);
    return promise;
  }
}
