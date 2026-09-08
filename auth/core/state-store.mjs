import { AUTH_STATES } from './constants.mjs';
import { assertTransition } from './state-machine.mjs';
import { publicAuthError } from './errors.mjs';

const freeze = value => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const item of Object.values(value)) freeze(item);
  return Object.freeze(value);
};

const safeIdentity = identity => {
  if (!identity || typeof identity !== 'object') return null;
  const id = String(identity.id || identity.userId || '').trim();
  if (!id) return null;
  return freeze({ id, status: String(identity.status || 'active'), displayName: identity.displayName ? String(identity.displayName).slice(0, 120) : null });
};

export function toPublicSession(session) {
  if (!session || typeof session !== 'object') return null;
  const id = String(session.id || session.sessionId || '').trim();
  if (!id) return null;
  const number = value => Number.isFinite(Number(value)) ? Number(value) : null;
  return freeze({
    id,
    status: String(session.status || 'active'),
    issuedAt: number(session.issuedAt),
    expiresAt: number(session.expiresAt),
    deviceId: session.deviceId ? String(session.deviceId).slice(0, 160) : null,
    remembered: Boolean(session.remembered)
  });
}

const initialSnapshot = now => freeze({
  state: AUTH_STATES.INITIALIZING,
  initialized: false,
  authenticated: false,
  identity: null,
  session: null,
  operation: null,
  error: null,
  revision: 0,
  updatedAt: now()
});

export class AuthStateStore {
  #snapshot;
  #listeners = new Set();
  #now;

  constructor({ now = () => Date.now() } = {}) {
    this.#now = now;
    this.#snapshot = initialSnapshot(this.#now);
  }

  getSnapshot() {
    return this.#snapshot;
  }

  transition(state, patch = {}) {
    assertTransition(this.#snapshot.state, state);
    const identity = 'identity' in patch ? safeIdentity(patch.identity) : this.#snapshot.identity;
    const session = 'session' in patch ? toPublicSession(patch.session) : this.#snapshot.session;
    const carriesAuthContext = [AUTH_STATES.AUTHENTICATED, AUTH_STATES.REFRESHING, AUTH_STATES.RECOVERING, AUTH_STATES.LOGGING_OUT].includes(state) && Boolean(identity && session);
    const authenticated = [AUTH_STATES.AUTHENTICATED, AUTH_STATES.REFRESHING, AUTH_STATES.RECOVERING].includes(state) && carriesAuthContext;
    const next = freeze({
      state,
      initialized: 'initialized' in patch ? Boolean(patch.initialized) : this.#snapshot.initialized,
      authenticated,
      identity: carriesAuthContext ? identity : null,
      session: carriesAuthContext ? session : null,
      operation: patch.operation == null ? null : String(patch.operation).slice(0, 80),
      error: patch.error ? publicAuthError(patch.error) : null,
      revision: this.#snapshot.revision + 1,
      updatedAt: this.#now()
    });
    this.#snapshot = next;
    for (const listener of [...this.#listeners]) {
      try { listener(next); } catch (_) {}
    }
    return next;
  }

  update(patch = {}) {
    return this.transition(this.#snapshot.state, patch);
  }

  subscribe(listener, { emitCurrent = true } = {}) {
    if (typeof listener !== 'function') throw new TypeError('Auth state listener must be a function.');
    this.#listeners.add(listener);
    if (emitCurrent) {
      try { listener(this.#snapshot); } catch (_) {}
    }
    let active = true;
    return () => {
      if (!active) return false;
      active = false;
      return this.#listeners.delete(listener);
    };
  }

  listenerCount() {
    return this.#listeners.size;
  }
}
