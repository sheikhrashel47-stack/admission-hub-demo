const IDENTITY_TOOLKIT = 'https://identitytoolkit.googleapis.com/v1';
const SECURE_TOKEN = 'https://securetoken.googleapis.com/v1/token';
const DEFAULT_CONTINUE_URL = 'https://admissionhub.pages.dev/?firebaseVerified=1';

export class FirebaseRequestError extends Error {
  constructor(reason = 'FIREBASE_UNAVAILABLE', status = 0) {
    super(reason);
    this.name = 'FirebaseRequestError';
    this.reason = String(reason || 'FIREBASE_UNAVAILABLE').slice(0, 80);
    this.status = Number(status || 0);
  }
}

const errorReason = payload => String(payload?.error?.message || 'FIREBASE_UNAVAILABLE')
  .split(/\s*:\s*/, 1)[0]
  .trim()
  .toUpperCase()
  .replace(/[^A-Z0-9_-]/g, '_')
  .slice(0, 80) || 'FIREBASE_UNAVAILABLE';

const validApiKey = value => /^[A-Za-z0-9_-]{20,128}$/.test(String(value || ''));
const validToken = value => typeof value === 'string' && value.length >= 20 && value.length <= 4096 && !/[\r\n\u0000;]/.test(value);
const validSubject = value => typeof value === 'string' && value.length >= 1 && value.length <= 256 && !/[\r\n\u0000]/.test(value);

function safeContinueUrl(value) {
  try {
    const url = new URL(String(value || DEFAULT_CONTINUE_URL));
    if (url.protocol !== 'https:' || url.hostname !== 'admissionhub.pages.dev') return DEFAULT_CONTINUE_URL;
    return url.href;
  } catch { return DEFAULT_CONTINUE_URL; }
}

export class FirebaseEmailPasswordProvider {
  constructor({ apiKey, continueUrl, fetchImpl = globalThis.fetch } = {}) {
    this.apiKey = String(apiKey || '').trim();
    this.continueUrl = safeContinueUrl(continueUrl);
    this.fetch = typeof fetchImpl === 'function' ? fetchImpl.bind(globalThis) : fetchImpl;
  }

  get configured() { return validApiKey(this.apiKey) && typeof this.fetch === 'function'; }

  async inspectProject() {
    if (!this.configured) throw new FirebaseRequestError('NOT_CONFIGURED');
    let response;
    try {
      response = await this.fetch(`${IDENTITY_TOOLKIT}/projects?key=${encodeURIComponent(this.apiKey)}`, {
        method: 'GET',
        headers: { Accept: 'application/json', 'Cache-Control': 'no-store' },
        signal: AbortSignal.timeout(12_000)
      });
    } catch { throw new FirebaseRequestError('NETWORK_ERROR'); }
    let payload = {};
    try { payload = await response.json(); } catch {}
    if (!response.ok) throw new FirebaseRequestError(errorReason(payload), response.status);
    const authorizedDomains = Array.isArray(payload?.authorizedDomains)
      ? payload.authorizedDomains.map(value => String(value).toLowerCase())
      : [];
    return Object.freeze({
      projectIdentified: typeof payload?.projectId === 'string' && payload.projectId.length > 3,
      continueDomainAuthorized: authorizedDomains.includes(new URL(this.continueUrl).hostname)
    });
  }

  async #post(url, body, { form = false } = {}) {
    if (!this.configured) throw new FirebaseRequestError('NOT_CONFIGURED');
    let response;
    try {
      response = await this.fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': form ? 'application/x-www-form-urlencoded' : 'application/json',
          Accept: 'application/json',
          'Cache-Control': 'no-store'
        },
        body: form ? String(body) : JSON.stringify(body),
        signal: AbortSignal.timeout(12_000)
      });
    } catch { throw new FirebaseRequestError('NETWORK_ERROR'); }
    let payload = {};
    try { payload = await response.json(); } catch {}
    if (!response.ok) throw new FirebaseRequestError(errorReason(payload), response.status);
    return payload;
  }

  async signUp(email, password) {
    const payload = await this.#post(`${IDENTITY_TOOLKIT}/accounts:signUp?key=${encodeURIComponent(this.apiKey)}`, {
      email, password, returnSecureToken: true
    });
    if (!validToken(payload?.idToken) || !validSubject(payload?.localId)) {
      throw new FirebaseRequestError('INVALID_PROVIDER_RESPONSE');
    }
    return Object.freeze({ idToken: payload.idToken, subject: payload.localId });
  }

  async sendVerificationEmail(idToken, email) {
    if (!validToken(idToken)) throw new FirebaseRequestError('INVALID_ID_TOKEN');
    const payload = await this.#post(`${IDENTITY_TOOLKIT}/accounts:sendOobCode?key=${encodeURIComponent(this.apiKey)}`, {
      requestType: 'VERIFY_EMAIL',
      idToken,
      email,
      continueUrl: this.continueUrl,
      canHandleCodeInApp: false
    });
    if (typeof payload?.email !== 'string' || payload.email.trim().toLowerCase() !== String(email || '').trim().toLowerCase()) {
      throw new FirebaseRequestError('INVALID_PROVIDER_RESPONSE');
    }
    return Object.freeze({ accepted: true });
  }

  async deleteAccount(idToken) {
    if (!validToken(idToken)) throw new FirebaseRequestError('INVALID_ID_TOKEN');
    await this.#post(`${IDENTITY_TOOLKIT}/accounts:delete?key=${encodeURIComponent(this.apiKey)}`, { idToken });
    return Object.freeze({ deleted: true });
  }

  async signIn(email, password) {
    const payload = await this.#post(`${IDENTITY_TOOLKIT}/accounts:signInWithPassword?key=${encodeURIComponent(this.apiKey)}`, {
      email, password, returnSecureToken: true
    });
    if (!validToken(payload?.idToken) || !validToken(payload?.refreshToken) || !validSubject(payload?.localId)) {
      throw new FirebaseRequestError('INVALID_PROVIDER_RESPONSE');
    }
    return Object.freeze({
      idToken: payload.idToken,
      refreshToken: payload.refreshToken,
      subject: payload.localId,
      expiresIn: Math.max(60, Number(payload.expiresIn || 3600))
    });
  }

  async lookup(idToken) {
    if (!validToken(idToken)) throw new FirebaseRequestError('INVALID_ID_TOKEN');
    const payload = await this.#post(`${IDENTITY_TOOLKIT}/accounts:lookup?key=${encodeURIComponent(this.apiKey)}`, { idToken });
    const user = Array.isArray(payload?.users) ? payload.users[0] : null;
    if (!user || !validSubject(user.localId) || typeof user.email !== 'string') {
      throw new FirebaseRequestError('INVALID_PROVIDER_RESPONSE');
    }
    return Object.freeze({
      subject: user.localId,
      email: user.email,
      emailVerified: user.emailVerified === true,
      disabled: user.disabled === true
    });
  }

  async refresh(refreshToken) {
    if (!validToken(refreshToken)) throw new FirebaseRequestError('INVALID_REFRESH_TOKEN');
    const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken });
    const payload = await this.#post(`${SECURE_TOKEN}?key=${encodeURIComponent(this.apiKey)}`, body, { form: true });
    if (!validToken(payload?.id_token) || !validToken(payload?.refresh_token) || !validSubject(payload?.user_id)) {
      throw new FirebaseRequestError('INVALID_PROVIDER_RESPONSE');
    }
    return Object.freeze({
      idToken: payload.id_token,
      refreshToken: payload.refresh_token,
      subject: payload.user_id,
      expiresIn: Math.max(60, Number(payload.expires_in || 3600))
    });
  }
}
