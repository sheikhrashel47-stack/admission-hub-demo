import { AuthError, classifyAuthError } from './errors.mjs';
import { AUTH_ERROR_CODES, AUTH_ERROR_TYPES } from './constants.mjs';

const defaultSleep = (ms, signal) => new Promise((resolve, reject) => {
  if (signal?.aborted) return reject(cancelled(signal.reason));
  const finish = () => { signal?.removeEventListener('abort', stop); resolve(); };
  const timer = setTimeout(finish, ms);
  const stop = () => { clearTimeout(timer); signal?.removeEventListener('abort', stop); reject(cancelled(signal.reason)); };
  signal?.addEventListener('abort', stop, { once: true });
});

const cancelled = reason => new AuthError({
  type: AUTH_ERROR_TYPES.USER_ERROR,
  code: AUTH_ERROR_CODES.CANCELLED,
  safeMessage: 'Authentication operation was cancelled.',
  retryable: false,
  cause: reason instanceof Error ? reason : null
});

const timeoutError = name => new AuthError({
  type: AUTH_ERROR_TYPES.NETWORK_ERROR,
  code: AUTH_ERROR_CODES.TIMEOUT,
  safeMessage: `${name} timed out.`,
  retryable: true
});

const requestId = () => {
  try { return crypto.randomUUID(); } catch (_) { return `auth-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`; }
};

export class AuthOperationRunner {
  #defaults;
  #sleep;
  #active = new Map();

  constructor({ defaults, sleep = defaultSleep } = {}) {
    this.#defaults = Object.freeze({ timeoutMs: 8000, maxRetries: 1, baseDelayMs: 180, maxDelayMs: 1500, ...(defaults || {}) });
    this.#sleep = sleep;
  }

  get activeCount() {
    return this.#active.size;
  }

  run(name, task, options = {}) {
    if (typeof task !== 'function') return Promise.reject(new TypeError('Auth operation task must be a function.'));
    const key = String(options.singleFlightKey || name);
    if (options.singleFlight !== false && this.#active.has(key)) return this.#active.get(key);
    const promise = this.#execute(String(name), task, options).finally(() => {
      if (this.#active.get(key) === promise) this.#active.delete(key);
    });
    if (options.singleFlight !== false) this.#active.set(key, promise);
    return promise;
  }

  async #execute(name, task, options) {
    const settings = { ...this.#defaults, ...options };
    const timeoutMs = Math.max(1, Math.min(30000, Number(settings.timeoutMs) || this.#defaults.timeoutMs));
    const maxRetries = Math.max(0, Math.min(3, Math.floor(Number(settings.maxRetries) || 0)));
    const idempotencyKey = String(settings.idempotencyKey || requestId());
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (settings.signal?.aborted) throw cancelled(settings.signal.reason);
      const controller = new AbortController();
      const relay = () => controller.abort(settings.signal?.reason);
      settings.signal?.addEventListener('abort', relay, { once: true });
      let timer;
      let abortListener;
      try {
        const timeout = new Promise((_, reject) => {
          timer = setTimeout(() => { reject(timeoutError(name)); controller.abort('timeout'); }, timeoutMs);
        });
        const cancellation = new Promise((_, reject) => {
          abortListener = () => {
            if (controller.signal.reason === 'timeout') return;
            reject(cancelled(controller.signal.reason));
          };
          controller.signal.addEventListener('abort', abortListener, { once: true });
          if (controller.signal.aborted) abortListener();
        });
        return await Promise.race([
          Promise.resolve().then(() => task({ attempt, signal: controller.signal, idempotencyKey })),
          timeout,
          cancellation
        ]);
      } catch (error) {
        lastError = classifyAuthError(error);
        if (settings.signal?.aborted) throw cancelled(settings.signal.reason);
        if (!lastError.retryable || attempt >= maxRetries) throw lastError;
        const delay = Math.min(Number(settings.maxDelayMs), Number(settings.baseDelayMs) * (2 ** attempt));
        await this.#sleep(Math.max(0, delay), settings.signal);
      } finally {
        clearTimeout(timer);
        if (abortListener) controller.signal.removeEventListener('abort', abortListener);
        settings.signal?.removeEventListener('abort', relay);
      }
    }
    throw lastError || new AuthError();
  }
}
