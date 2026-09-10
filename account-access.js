(() => {
  'use strict';

  const API = '/api/auth/v1';
  const state = {
    session: null,
    verification: null,
    backup: null,
    passkeys: [],
    busy: false,
    initialized: false,
    available: null,
    resendTimer: null,
    resendCooldownSeconds: 60,
    capabilities: {
      google: { available: false, clientId: '' },
      passkey: { available: false },
      backup: { available: false, contactInput: 'none' }
    },
    googleClientId: '',
    googleReady: false,
    googlePromise: null
  };

  const launcher = document.createElement('button');
  launcher.type = 'button';
  launcher.className = 'ah-account-launcher';
  launcher.setAttribute('aria-label', 'অ্যাকাউন্ট খুলুন');
  launcher.setAttribute('aria-haspopup', 'dialog');
  launcher.dataset.authenticated = 'false';
  launcher.innerHTML = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 12.2a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 7.3c.9-3.3 3.3-5 7-5s6.1 1.7 7 5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg><span class="ah-account-launcher-label">অ্যাকাউন্ট</span><span class="ah-account-dot" aria-hidden="true"></span>';

  const overlay = document.createElement('div');
  overlay.className = 'ah-account-overlay';
  overlay.hidden = true;
  overlay.innerHTML = `
    <section class="ah-account-modal" role="dialog" aria-modal="true" aria-labelledby="ah-account-title">
      <button class="ah-account-close" type="button" aria-label="বন্ধ করুন">×</button>
      <header class="ah-account-head">
        <p class="ah-account-kicker">নিরাপদ অ্যাকাউন্ট</p>
        <h2 class="ah-account-title" id="ah-account-title">Admission Hub অ্যাকাউন্ট</h2>
        <p class="ah-account-subtitle">Google বা Passkey দিয়ে দ্রুত প্রবেশ করুন। চাইলে আগের মতো ইমেইল ও পাসওয়ার্ডও ব্যবহার করতে পারবেন।</p>
      </header>
      <div class="ah-account-body">
        <div class="ah-account-message" data-role="message" hidden aria-live="polite"></div>

        <form class="ah-account-view" data-view="login" novalidate>
          <div class="ah-account-preferred" data-role="preferred-methods" hidden>
            <p class="ah-account-preferred-label">দ্রুত ও নিরাপদ প্রবেশ</p>
            <div class="ah-account-google" data-role="google-button" hidden></div>
            <button class="ah-account-method ah-account-passkey" type="button" data-role="passkey-login" hidden>
              <span aria-hidden="true">◉</span><span>Passkey দিয়ে প্রবেশ</span>
            </button>
            <p class="ah-account-method-help" data-role="method-help" hidden></p>
            <div class="ah-account-divider"><span>অথবা ইমেইল দিয়ে</span></div>
          </div>
          <div class="ah-account-field">
            <label class="ah-account-label" for="ah-login-email">ইমেইল</label>
            <input class="ah-account-input" id="ah-login-email" name="email" type="email" inputmode="email" autocomplete="email" maxlength="254" placeholder="name@example.com" required>
          </div>
          <div class="ah-account-field">
            <label class="ah-account-label" for="ah-login-password">পাসওয়ার্ড</label>
            <input class="ah-account-input" id="ah-login-password" name="password" type="password" autocomplete="current-password" minlength="8" maxlength="128" placeholder="আপনার পাসওয়ার্ড" required>
          </div>
          <button class="ah-account-primary" type="submit">লগইন করুন</button>
          <p class="ah-account-switch">নতুন ব্যবহারকারী? <button class="ah-account-link" type="button" data-role="show-signup">অ্যাকাউন্ট তৈরি করুন</button></p>
          <p class="ah-account-note">সব পদ্ধতিতেই একই Firebase অ্যাকাউন্ট খোলে। Passkey কখনো বাধ্যতামূলক নয় এবং credential browser-readable storage-এ রাখা হয় না।</p>
        </form>

        <form class="ah-account-view" data-view="signup" hidden novalidate>
          <div class="ah-account-field">
            <label class="ah-account-label" for="ah-signup-email">ইমেইল</label>
            <input class="ah-account-input" id="ah-signup-email" name="email" type="email" inputmode="email" autocomplete="email" maxlength="254" placeholder="name@example.com" required>
          </div>
          <div class="ah-account-field">
            <label class="ah-account-label" for="ah-signup-password">পাসওয়ার্ড</label>
            <input class="ah-account-input" id="ah-signup-password" name="password" type="password" autocomplete="new-password" minlength="8" maxlength="128" placeholder="কমপক্ষে ৮ অক্ষর" required>
          </div>
          <div class="ah-account-field">
            <label class="ah-account-label" for="ah-signup-confirm">পাসওয়ার্ড আবার লিখুন</label>
            <input class="ah-account-input" id="ah-signup-confirm" name="confirm" type="password" autocomplete="new-password" minlength="8" maxlength="128" placeholder="একই পাসওয়ার্ড" required>
          </div>
          <button class="ah-account-primary" type="submit">সাইনআপ করুন</button>
          <p class="ah-account-switch">আগে থেকেই অ্যাকাউন্ট আছে? <button class="ah-account-link" type="button" data-role="show-login">লগইন করুন</button></p>
          <p class="ah-account-note">সাইনআপের পর Firebase ইমেইল যাচাইয়ের একটি নিরাপদ লিংক পাঠাবে। লিংকে ক্লিক করলেই যাচাই সম্পন্ন হবে।</p>
        </form>

        <div class="ah-account-view" data-view="verify" hidden>
          <div class="ah-account-verify-badge" aria-hidden="true">✉</div>
          <h3 class="ah-account-view-title">ইমেইল যাচাই করুন</h3>
          <p class="ah-account-mask">Firebase থেকে ইমেইল যাচাইয়ের লিংক পাঠানো হয়েছে <strong data-role="mask">আপনার ইমেইলে</strong>। Inbox-এর সঙ্গে Spam/Promotions-ও দেখুন এবং লিংকে ক্লিক করুন।</p>
          <button class="ah-account-primary" type="button" data-role="verified-login">যাচাই করেছি—এখন লগইন</button>
          <details class="ah-account-resend">
            <summary>ইমেইলটি আবার পাঠাবেন?</summary>
            <form data-role="resend-form" novalidate>
              <div class="ah-account-field">
                <label class="ah-account-label" for="ah-resend-email">ইমেইল</label>
                <input class="ah-account-input" id="ah-resend-email" type="email" autocomplete="email" maxlength="254" required>
              </div>
              <div class="ah-account-field">
                <label class="ah-account-label" for="ah-resend-password">পাসওয়ার্ড</label>
                <input class="ah-account-input" id="ah-resend-password" type="password" autocomplete="current-password" minlength="8" maxlength="128" required>
              </div>
              <p class="ah-account-resend-status" data-role="resend-status" aria-live="polite"></p>
              <button class="ah-account-secondary" type="submit" data-role="resend-submit">যাচাইয়ের ইমেইল আবার পাঠান</button>
            </form>
          </details>
          <p class="ah-account-switch"><button class="ah-account-link" type="button" data-role="verify-back">অন্য ইমেইলে সাইনআপ</button></p>
        </div>

        <form class="ah-account-view" data-view="google-link" hidden novalidate>
          <div class="ah-account-verify-badge" aria-hidden="true">G</div>
          <h3 class="ah-account-view-title">আগের অ্যাকাউন্টে Google যুক্ত করুন</h3>
          <p class="ah-account-mask">একই ইমেইলে আগের অ্যাকাউন্ট আছে। একবার সেই ইমেইল ও পাসওয়ার্ড দিন; Google নতুন অ্যাকাউন্ট না বানিয়ে নিরাপদে আগের Firebase অ্যাকাউন্টেই যুক্ত হবে।</p>
          <div class="ah-account-field">
            <label class="ah-account-label" for="ah-link-email">ইমেইল</label>
            <input class="ah-account-input" id="ah-link-email" type="email" autocomplete="email" maxlength="254" required>
          </div>
          <div class="ah-account-field">
            <label class="ah-account-label" for="ah-link-password">পাসওয়ার্ড</label>
            <input class="ah-account-input" id="ah-link-password" type="password" autocomplete="current-password" minlength="8" maxlength="128" required>
          </div>
          <button class="ah-account-primary" type="submit">Google যুক্ত করে প্রবেশ করুন</button>
          <p class="ah-account-switch"><button class="ah-account-link" type="button" data-role="link-cancel">ইমেইল লগইনে ফিরুন</button></p>
        </form>

        <form class="ah-account-view" data-view="backup-prepare" hidden novalidate>
          <div class="ah-account-verify-badge" aria-hidden="true">✓</div>
          <h3 class="ah-account-view-title">বিকল্পভাবে যাচাই করুন</h3>
          <p class="ah-account-mask">আপনার জন্য পাওয়া নিরাপদ উপায়ে যাচাই হবে।</p>
          <div class="ah-account-field" data-role="backup-contact-field">
            <label class="ah-account-label" for="ah-backup-contact">মোবাইল নম্বর <span data-role="backup-contact-mode">(ঐচ্ছিক)</span></label>
            <input class="ah-account-input" id="ah-backup-contact" type="tel" inputmode="tel" autocomplete="tel" maxlength="16" placeholder="+8801XXXXXXXXX">
          </div>
          <button class="ah-account-primary" type="submit">যাচাই শুরু করুন</button>
          <p class="ah-account-switch"><button class="ah-account-link" type="button" data-role="backup-prepare-cancel">ফিরে যান</button></p>
        </form>

        <form class="ah-account-view" data-view="backup" hidden novalidate>
          <div class="ah-account-verify-badge" aria-hidden="true">✓</div>
          <h3 class="ah-account-view-title">বিকল্পভাবে যাচাই করুন</h3>
          <p class="ah-account-mask" data-role="backup-instruction">নিরাপদ যাচাই কোডটি লিখুন।</p>
          <div class="ah-account-interaction" data-role="backup-interaction" hidden>
            <a class="ah-account-primary ah-account-external" data-role="backup-link" target="_blank" rel="noopener noreferrer">Telegram bot খুলুন</a>
            <p>শুধু Telegram খোলা সফল যাচাই নয়। Bot নিশ্চিত করার পর নিচের বোতাম চাপুন। Telegram পরিচয় ফোন নম্বরের মালিকানার প্রমাণ নয়।</p>
          </div>
          <div class="ah-account-field" data-role="backup-code-field">
            <label class="ah-account-label" for="ah-backup-code">৬ সংখ্যার কোড</label>
            <input class="ah-account-input ah-account-otp" id="ah-backup-code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required>
          </div>
          <button class="ah-account-primary" type="submit" data-role="backup-verify">যাচাই করুন</button>
          <p class="ah-account-switch"><button class="ah-account-link" type="button" data-role="backup-cancel">ফিরে যান</button></p>
        </form>

        <div class="ah-account-view" data-view="signed" hidden>
          <div class="ah-account-secure">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 10V8a5 5 0 0 1 10 0v2m-11 0h12v10H6V10Zm6 4v2" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <div><h3>যাচাইকৃত অ্যাকাউন্ট সক্রিয়</h3><p>Firebase নিশ্চিত করেছে যে আপনার একই অ্যাকাউন্টটি নিরাপদে সক্রিয় আছে।</p></div>
          </div>
          <div class="ah-account-identity">
            <p class="ah-account-identity-label">যাচাইকৃত ইমেইল</p>
            <p class="ah-account-identity-value" data-role="identity">—</p>
          </div>
          <section class="ah-account-security-tools" data-role="passkey-tools" hidden>
            <div class="ah-account-tool-head"><div><h3>Passkey</h3><p data-role="passkey-status">এই ডিভাইসে দ্রুত প্রবেশ চালু করতে পারেন।</p></div><span aria-hidden="true">◉</span></div>
            <div data-role="passkey-list"></div>
            <button class="ah-account-secondary" type="button" data-role="passkey-add">নতুন Passkey যোগ করুন</button>
          </section>
          <button class="ah-account-secondary" type="button" data-role="backup-start" hidden>বিকল্পভাবে যাচাই করুন</button>
          <button class="ah-account-secondary" type="button" data-role="logout">লগ আউট</button>
          <p class="ah-account-fine">Firebase credential ও নিরাপদ সেশন HttpOnly cookie-তে সুরক্ষিত থাকে; JavaScript সেগুলো পড়তে পারে না।</p>
        </div>
      </div>
    </section>`;

  const $ = selector => overlay.querySelector(selector);
  const message = (text = '', kind = 'info') => {
    const node = $('[data-role="message"]');
    if (!node) return;
    node.textContent = text;
    node.dataset.kind = kind;
    node.hidden = !text;
  };

  const resendSecondsRemaining = () => Math.max(0, Math.ceil((Number(state.verification?.resendUntil || 0) - Date.now()) / 1000));
  const updateResendCooldown = () => {
    const button = $('[data-role="resend-submit"]');
    const status = $('[data-role="resend-status"]');
    if (!button || !status) return;
    const remaining = resendSecondsRemaining();
    button.disabled = state.busy || remaining > 0;
    button.textContent = remaining > 0 ? `আবার পাঠানো যাবে (${remaining.toLocaleString('bn-BD')} সেকেন্ড)` : 'যাচাইয়ের ইমেইল আবার পাঠান';
    status.textContent = remaining > 0 ? `নিরাপত্তার জন্য ${remaining.toLocaleString('bn-BD')} সেকেন্ড পর আবার পাঠাতে পারবেন।` : 'প্রয়োজনে এখন আবার পাঠাতে পারেন।';
    if (remaining === 0 && state.resendTimer) { clearInterval(state.resendTimer); state.resendTimer = null; }
  };
  const startResendCooldown = seconds => {
    const duration = Math.min(86400, Math.max(0, Math.ceil(Number(seconds) || 0)));
    if (!state.verification) return;
    state.verification.resendUntil = Date.now() + duration * 1000;
    if (state.resendTimer) clearInterval(state.resendTimer);
    state.resendTimer = duration > 0 ? setInterval(updateResendCooldown, 1000) : null;
    updateResendCooldown();
  };
  const clearResendCooldown = () => {
    if (state.resendTimer) clearInterval(state.resendTimer);
    state.resendTimer = null;
    if (state.verification) state.verification.resendUntil = 0;
    updateResendCooldown();
  };

  const notify = () => {
    const detail = Object.freeze({
      authenticated: Boolean(state.session?.authenticated && state.session?.emailVerified),
      emailVerified: Boolean(state.session?.emailVerified),
      user: state.session?.user || null
    });
    window.dispatchEvent(new CustomEvent('admissionhub:authchange', { detail }));
  };

  const setBusy = busy => {
    state.busy = Boolean(busy);
    overlay.querySelectorAll('button,input').forEach(element => { element.disabled = state.busy; });
    overlay.querySelectorAll('.ah-account-primary').forEach(button => {
      if (!button.dataset.label) button.dataset.label = button.textContent;
      const isActive = button.closest('.ah-account-view:not([hidden])');
      button.innerHTML = state.busy && isActive ? '<span class="ah-account-spinner" aria-hidden="true"></span>অপেক্ষা করুন…' : button.dataset.label;
    });
    updateResendCooldown();
  };

  const renderPasskeys = () => {
    const list = $('[data-role="passkey-list"]');
    const status = $('[data-role="passkey-status"]');
    if (!list || !status) return;
    list.textContent = '';
    status.textContent = state.passkeys.length
      ? `${state.passkeys.length.toLocaleString('bn-BD')}টি Passkey যুক্ত আছে। Passkey কখনো বাধ্যতামূলক নয়।`
      : 'এই ডিভাইসে দ্রুত প্রবেশ চালু করতে পারেন। Passkey বাধ্যতামূলক নয়।';
    state.passkeys.forEach((credential, index) => {
      const row = document.createElement('div');
      row.className = 'ah-account-passkey-row';
      const label = document.createElement('span');
      label.textContent = `Passkey ${Number(index + 1).toLocaleString('bn-BD')}`;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'ah-account-link';
      remove.dataset.credentialId = credential.id;
      remove.textContent = 'সরান';
      remove.addEventListener('click', () => removePasskey(credential.id));
      row.append(label, remove);
      list.append(row);
    });
  };

  const showView = (name, keepMessage = false) => {
    overlay.querySelectorAll('[data-view]').forEach(view => { view.hidden = view.dataset.view !== name; });
    if (!keepMessage) message();
    if (name === 'login') setTimeout(() => $('#ah-login-email')?.focus(), 30);
    if (name === 'signup') setTimeout(() => $('#ah-signup-email')?.focus(), 30);
    if (name === 'verify') {
      $('[data-role="mask"]').textContent = state.verification?.emailMasked || 'আপনার ইমেইলে';
      if (state.verification?.email) $('#ah-resend-email').value = state.verification.email;
      updateResendCooldown();
    }
    if (name === 'signed') {
      $('[data-role="identity"]').textContent = state.session?.user?.emailMasked || 'যাচাইকৃত অ্যাকাউন্ট';
      renderPasskeys();
    }
    if (name === 'backup' && !state.backup?.interaction) setTimeout(() => $('#ah-backup-code')?.focus(), 30);
  };

  const configureBackupView = interaction => {
    const remote = interaction?.type === 'telegram-link' && interaction?.proof === 'webhook-required';
    const panel = $('[data-role="backup-interaction"]');
    const codeField = $('[data-role="backup-code-field"]');
    const code = $('#ah-backup-code');
    const instruction = $('[data-role="backup-instruction"]');
    const verify = $('[data-role="backup-verify"]');
    panel.hidden = !remote;
    codeField.hidden = remote;
    code.required = !remote;
    instruction.textContent = remote
      ? 'নিরাপদ একবারের লিংক দিয়ে Telegram bot-এ পরিচয় নিশ্চিত করুন।'
      : 'নিরাপদ যাচাই কোডটি লিখুন।';
    const verifyLabel = remote ? 'Bot নিশ্চিত করেছে—যাচাই করুন' : 'যাচাই করুন';
    verify.textContent = verifyLabel;
    verify.dataset.label = verifyLabel;
    const link = $('[data-role="backup-link"]');
    if (remote) link.href = interaction.url;
    else link.removeAttribute('href');
  };

  const canaryConfigPath = () => {
    try {
      const current = new URL(location.href);
      const query = new URLSearchParams();
      for (const name of ['googleCanary', 'passkeyCanary']) {
        if (current.searchParams.get(name) === '1') query.set(name, '1');
      }
      const suffix = query.toString();
      return `/config${suffix ? `?${suffix}` : ''}`;
    } catch (_) { return '/config'; }
  };

  const api = async (path, options = {}) => {
    let response;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 18000);
    try {
      response = await fetch(`${API}${path}`, {
        method: options.method || 'GET',
        credentials: 'same-origin',
        signal: controller.signal,
        headers: options.body ? { 'Content-Type': 'application/json' } : {},
        ...(options.body ? { body: JSON.stringify(options.body) } : {})
      });
    } catch (error) {
      const text = error?.name === 'AbortError' ? 'সেবাটি সময়মতো সাড়া দেয়নি—আবার চেষ্টা করুন।' : 'ইন্টারনেট সংযোগ পাওয়া যাচ্ছে না।';
      throw Object.assign(new Error(text), { status: 0 });
    } finally { clearTimeout(timeout); }
    let data = {};
    try { data = await response.json(); } catch (_) {}
    if (!response.ok) {
      const error = new Error(data?.error?.message || 'সাময়িক সমস্যা হয়েছে—আবার চেষ্টা করুন।');
      error.status = response.status;
      error.code = data?.error?.code;
      error.retryAfter = Number(data?.error?.retryAfter || response.headers.get('Retry-After') || 0);
      throw error;
    }
    return data;
  };

  const updateLauncher = () => {
    const signed = Boolean(state.session?.authenticated && state.session?.emailVerified);
    launcher.dataset.authenticated = String(signed);
    launcher.setAttribute('aria-label', signed ? 'যাচাইকৃত অ্যাকাউন্ট সক্রিয়' : 'অ্যাকাউন্ট খুলুন');
    const label = launcher.querySelector('.ah-account-launcher-label');
    if (label) label.textContent = signed ? 'সক্রিয়' : 'অ্যাকাউন্ট';
    notify();
  };

  const passkeyBrowserReady = () => Boolean(
    window.isSecureContext !== false &&
    window.PublicKeyCredential &&
    navigator.credentials &&
    typeof navigator.credentials.get === 'function' &&
    typeof navigator.credentials.create === 'function'
  );

  const decodeBase64Url = value => {
    const normalized = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(normalized + '='.repeat((4 - (normalized.length % 4)) % 4));
    return Uint8Array.from(raw, character => character.charCodeAt(0));
  };
  const encodeBase64Url = value => {
    const bytes = new Uint8Array(value || new ArrayBuffer(0));
    let binary = '';
    bytes.forEach(byte => { binary += String.fromCharCode(byte); });
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  };
  const publicKeyOptions = (options, registration) => {
    const converted = { ...options, challenge: decodeBase64Url(options.challenge) };
    if (registration) converted.user = { ...options.user, id: decodeBase64Url(options.user.id) };
    const key = registration ? 'excludeCredentials' : 'allowCredentials';
    if (Array.isArray(options[key])) converted[key] = options[key].map(item => ({ ...item, id: decodeBase64Url(item.id) }));
    return converted;
  };
  const registrationPayload = credential => ({
    rawId: encodeBase64Url(credential.rawId),
    clientDataJSON: encodeBase64Url(credential.response.clientDataJSON),
    attestationObject: encodeBase64Url(credential.response.attestationObject),
    transports: typeof credential.response.getTransports === 'function' ? credential.response.getTransports() : []
  });
  const assertionPayload = credential => ({
    rawId: encodeBase64Url(credential.rawId),
    clientDataJSON: encodeBase64Url(credential.response.clientDataJSON),
    authenticatorData: encodeBase64Url(credential.response.authenticatorData),
    signature: encodeBase64Url(credential.response.signature),
    ...(credential.response.userHandle ? { userHandle: encodeBase64Url(credential.response.userHandle) } : {})
  });
  const passkeyErrorMessage = error => {
    if (error?.name === 'NotAllowedError') return 'Passkey অনুরোধটি বাতিল বা সময় শেষ হয়েছে—চাইলে আবার চেষ্টা করুন।';
    if (error?.name === 'SecurityError') return 'এই browser বা ঠিকানায় Passkey নিরাপদভাবে ব্যবহার করা যাচ্ছে না।';
    if (error?.name === 'InvalidStateError') return 'এই Passkeyটি আগে থেকেই যুক্ত আছে।';
    return error?.message || 'Passkey যাচাই হয়নি—অন্য পদ্ধতি ব্যবহার করুন।';
  };

  const establishSession = (result, text) => {
    state.session = result;
    state.verification = null;
    state.backup = null;
    clearResendCooldown();
    updateLauncher();
    showView('signed');
    message(text, 'success');
    refreshPasskeyStatus();
  };

  const refreshPasskeyStatus = async () => {
    if (!state.session || !state.capabilities.passkey.available || !passkeyBrowserReady()) {
      state.passkeys = [];
      renderPasskeys();
      return;
    }
    try {
      const result = await api('/passkey/status');
      state.passkeys = Array.isArray(result.credentials) ? result.credentials : [];
      renderPasskeys();
    } catch (_) {
      state.passkeys = [];
      renderPasskeys();
    }
  };

  const loginWithPasskey = async () => {
    if (state.busy) return;
    if (!passkeyBrowserReady()) return message('এই browser বা ডিভাইসে Passkey পাওয়া যাচ্ছে না।', 'info');
    setBusy(true);
    try {
      const begin = await api('/passkey/authentication/begin', { method: 'POST', body: {} });
      const credential = await navigator.credentials.get({ publicKey: publicKeyOptions(begin.options, false) });
      if (!credential) throw new DOMException('Passkey cancelled', 'NotAllowedError');
      const result = await api('/passkey/authentication/finish', {
        method: 'POST',
        body: { challengeId: begin.challengeId, response: assertionPayload(credential) }
      });
      establishSession(result, 'Passkey দিয়ে একই Firebase অ্যাকাউন্টে প্রবেশ হয়েছে।');
    } catch (error) { message(passkeyErrorMessage(error), 'error'); }
    finally { setBusy(false); }
  };

  const addPasskey = async () => {
    if (state.busy || !state.session) return;
    if (!passkeyBrowserReady()) return message('এই browser বা ডিভাইসে Passkey যোগ করা যাচ্ছে না।', 'info');
    setBusy(true);
    try {
      const begin = await api('/passkey/registration/begin', { method: 'POST', body: {} });
      const credential = await navigator.credentials.create({ publicKey: publicKeyOptions(begin.options, true) });
      if (!credential) throw new DOMException('Passkey cancelled', 'NotAllowedError');
      const result = await api('/passkey/registration/finish', {
        method: 'POST',
        body: { challengeId: begin.challengeId, response: registrationPayload(credential) }
      });
      await refreshPasskeyStatus();
      message(result.registered ? 'Passkey নিরাপদভাবে যুক্ত হয়েছে।' : 'Passkey যোগ করা যায়নি।', result.registered ? 'success' : 'error');
    } catch (error) { message(passkeyErrorMessage(error), 'error'); }
    finally { setBusy(false); }
  };

  async function removePasskey(credentialId) {
    if (state.busy || !credentialId) return;
    setBusy(true);
    try {
      await api('/passkey/remove', { method: 'POST', body: { credentialId } });
      await refreshPasskeyStatus();
      message('Passkey সরানো হয়েছে। অন্য লগইন পদ্ধতি চালু থাকবে।', 'success');
    } catch (error) { message(error.message, 'error'); }
    finally { setBusy(false); }
  }

  const handleGoogleCredential = async response => {
    const credential = String(response?.credential || '');
    if (state.busy || credential.length < 20) return message('Google সাইন-ইন সম্পন্ন হয়নি—ইমেইল দিয়ে চেষ্টা করুন।', 'error');
    setBusy(true);
    try {
      const result = await api('/google', { method: 'POST', body: { idToken: credential } });
      establishSession(result, 'Google দিয়ে একই Firebase অ্যাকাউন্টে প্রবেশ হয়েছে।');
    } catch (error) {
      if (error.code === 'ACCOUNT_LINK_REQUIRED') showView('google-link');
      message(error.message, 'error');
    } finally { setBusy(false); }
  };

  const loadGoogle = clientId => {
    if (!clientId || state.googlePromise) return state.googlePromise || Promise.resolve(false);
    state.googleClientId = clientId;
    state.googlePromise = new Promise(resolve => {
      const initialize = () => {
        try {
          if (!window.google?.accounts?.id) throw new Error('Google Identity unavailable');
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleGoogleCredential,
            ux_mode: 'popup',
            cancel_on_tap_outside: false,
            context: 'signin'
          });
          const host = $('[data-role="google-button"]');
          host.textContent = '';
          window.google.accounts.id.renderButton(host, {
            type: 'standard', theme: 'outline', size: 'large', shape: 'rectangular', text: 'continue_with', width: 354
          });
          host.hidden = false;
          state.googleReady = true;
          resolve(true);
        } catch (_) { resolve(false); }
      };
      if (window.google?.accounts?.id) return initialize();
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.referrerPolicy = 'no-referrer';
      const timer = setTimeout(() => resolve(false), 10000);
      script.onload = () => { clearTimeout(timer); initialize(); };
      script.onerror = () => { clearTimeout(timer); resolve(false); };
      document.head.append(script);
    }).then(ready => {
      if (!ready) {
        const help = $('[data-role="method-help"]');
        help.textContent = 'Google popup এই browser-এ খোলা যায়নি—Passkey বা ইমেইল ব্যবহার করুন।';
        help.hidden = false;
      }
      return ready;
    });
    return state.googlePromise;
  };

  const linkGoogle = async (email, password) => {
    if (!window.google?.accounts?.oauth2 || !state.googleClientId) throw new Error('Google popup এখন পাওয়া যাচ্ছে না—ইমেইল লগইন ব্যবহার করুন।');
    const accessToken = await new Promise((resolve, reject) => {
      let settled = false;
      let timer;
      const finish = (action, value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        action(value);
      };
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: state.googleClientId,
        scope: 'openid email profile',
        callback: result => {
          if (result?.error || !result?.access_token) finish(reject, new Error('Google অনুমতি পাওয়া যায়নি।'));
          else finish(resolve, result.access_token);
        },
        error_callback: () => finish(reject, new Error('Google popup বন্ধ বা block হয়েছে—আবার চেষ্টা করুন।'))
      });
      timer = setTimeout(() => finish(reject, new Error('Google অনুমতির সময় শেষ হয়েছে—আবার চেষ্টা করুন।')), 60000);
      try { client.requestAccessToken({ prompt: 'select_account' }); }
      catch (_) { finish(reject, new Error('Google popup খোলা যায়নি—browser popup অনুমতি দিন।')); }
    });
    return api('/google/link', { method: 'POST', body: { email, password, accessToken } });
  };

  const applyCapabilities = auth => {
    state.available = auth?.available === true;
    const methods = auth?.methods || {};
    state.capabilities.google = {
      available: methods.google?.available === true && typeof methods.google?.clientId === 'string',
      clientId: methods.google?.clientId || ''
    };
    state.capabilities.passkey = { available: methods.passkey?.available === true && passkeyBrowserReady() };
    state.capabilities.backup = {
      available: methods.backup?.available === true,
      contactInput: ['none', 'optional', 'required'].includes(methods.backup?.contactInput) ? methods.backup.contactInput : 'none'
    };
    const preferred = $('[data-role="preferred-methods"]');
    const passkey = $('[data-role="passkey-login"]');
    const passkeyTools = $('[data-role="passkey-tools"]');
    const backup = $('[data-role="backup-start"]');
    passkey.hidden = !state.capabilities.passkey.available;
    passkeyTools.hidden = !state.capabilities.passkey.available;
    backup.hidden = !state.capabilities.backup.available;
    preferred.hidden = !(state.capabilities.google.available || state.capabilities.passkey.available);
    if (state.capabilities.google.available) loadGoogle(state.capabilities.google.clientId);
  };

  const refreshSession = async () => {
    try {
      const current = await api('/session');
      state.session = current?.authenticated && current?.emailVerified ? current : null;
    } catch (error) { if ([401, 403].includes(error.status)) state.session = null; }
    updateLauncher();
    if (!overlay.hidden && state.session) showView('signed');
    if (state.session) refreshPasskeyStatus();
    return state.session;
  };

  const open = () => {
    overlay.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    if (state.session?.authenticated && state.session?.emailVerified) showView('signed');
    else showView('login');
    if (state.available === false) message('Firebase account service এখনো চালু করা হয়নি।', 'info');
  };
  const close = () => {
    overlay.hidden = true;
    document.documentElement.style.overflow = '';
    message();
    launcher.focus();
  };
  const prefillLogin = email => { if (email) $('#ah-login-email').value = email; };
  const ensureAvailable = () => {
    if (state.available === true) return true;
    message('Firebase account service এখনো চালু করা হয়নি।', 'info');
    return false;
  };

  const requestBackup = async (contact = '') => {
    if (state.busy || !state.session || !state.capabilities.backup.available) return;
    setBusy(true);
    try {
      const result = await api('/backup/request', {
        method: 'POST',
        body: { purpose: 'account-backup', ...(contact ? { contact } : {}) }
      });
      state.backup = { attemptId: result.attemptId, purpose: 'account-backup', interaction: result.interaction || null };
      $('#ah-backup-code').value = '';
      $('#ah-backup-contact').value = '';
      configureBackupView(state.backup.interaction);
      showView('backup');
      message(result.interaction ? 'একবারের নিরাপদ লিংক তৈরি হয়েছে। Bot নিশ্চিত না করা পর্যন্ত যাচাই সম্পন্ন হবে না।' : 'যাচাই কোড পাঠানো হয়েছে।', 'success');
    } catch (error) { message(error.message, 'error'); }
    finally { setBusy(false); }
  };

  const initialize = () => {
    if (state.initialized || !document.body) return;
    state.initialized = true;
    document.body.append(launcher, overlay);
    launcher.addEventListener('click', open);
    $('.ah-account-close').addEventListener('click', close);
    overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && !overlay.hidden) close(); });

    $('[data-role="show-signup"]').addEventListener('click', () => {
      $('#ah-signup-email').value = $('#ah-login-email').value;
      $('#ah-login-password').value = '';
      showView('signup');
    });
    $('[data-role="show-login"]').addEventListener('click', () => {
      prefillLogin($('#ah-signup-email').value);
      $('#ah-signup-password').value = '';
      $('#ah-signup-confirm').value = '';
      showView('login');
    });
    $('[data-role="passkey-login"]').addEventListener('click', loginWithPasskey);
    $('[data-role="passkey-add"]').addEventListener('click', addPasskey);

    $('[data-view="signup"]').addEventListener('submit', async event => {
      event.preventDefault();
      if (state.busy || !ensureAvailable()) return;
      const email = $('#ah-signup-email').value.trim();
      const password = $('#ah-signup-password').value;
      const confirm = $('#ah-signup-confirm').value;
      if (!email || !$('#ah-signup-email').checkValidity()) return message('সঠিক ইমেইল ঠিকানা লিখুন।', 'error');
      if (password.length < 8) return message('কমপক্ষে ৮ অক্ষরের পাসওয়ার্ড দিন।', 'error');
      if (password !== confirm) return message('দুইবার লেখা পাসওয়ার্ড মিলছে না।', 'error');
      setBusy(true);
      try {
        const result = await api('/signup', { method: 'POST', body: { email, password } });
        state.verification = { email, emailMasked: result.verification?.emailMasked || email, resendUntil: 0 };
        startResendCooldown(result.verification?.resendAfter || state.resendCooldownSeconds);
        showView('verify');
        message('অ্যাকাউন্ট তৈরি হয়েছে। ইমেইলের যাচাইয়ের লিংকে ক্লিক করুন।', 'success');
      } catch (error) {
        if (error.code === 'EMAIL_ALREADY_IN_USE') {
          clearResendCooldown(); state.verification = null; prefillLogin(email); showView('login');
        } else if (error.code === 'VERIFICATION_UNAVAILABLE') {
          state.verification = { email, emailMasked: email, resendUntil: 0 };
          startResendCooldown(error.retryAfter || state.resendCooldownSeconds);
          showView('verify');
        }
        message(error.message, 'error');
      } finally {
        $('#ah-signup-password').value = '';
        $('#ah-signup-confirm').value = '';
        setBusy(false);
      }
    });

    $('[data-view="login"]').addEventListener('submit', async event => {
      event.preventDefault();
      if (state.busy || !ensureAvailable()) return;
      const email = $('#ah-login-email').value.trim();
      const password = $('#ah-login-password').value;
      if (!email || !$('#ah-login-email').checkValidity()) return message('সঠিক ইমেইল ঠিকানা লিখুন।', 'error');
      if (password.length < 8) return message('পাসওয়ার্ডটি সঠিকভাবে লিখুন।', 'error');
      setBusy(true);
      try {
        const result = await api('/login', { method: 'POST', body: { email, password } });
        establishSession(result, 'যাচাইকৃত অ্যাকাউন্টে লগইন হয়েছে।');
      } catch (error) {
        if (error.code === 'EMAIL_NOT_VERIFIED') {
          clearResendCooldown(); state.verification = { email, emailMasked: email, resendUntil: 0 }; showView('verify');
        }
        message(error.message, 'error');
      } finally { $('#ah-login-password').value = ''; setBusy(false); }
    });

    $('[data-view="google-link"]').addEventListener('submit', async event => {
      event.preventDefault();
      if (state.busy) return;
      const email = $('#ah-link-email').value.trim();
      const password = $('#ah-link-password').value;
      if (!email || !$('#ah-link-email').checkValidity() || password.length < 8) return message('আগের অ্যাকাউন্টের ইমেইল ও পাসওয়ার্ড লিখুন।', 'error');
      setBusy(true);
      try {
        const result = await linkGoogle(email, password);
        establishSession(result, 'Google আগের Firebase অ্যাকাউন্টে নিরাপদে যুক্ত হয়েছে।');
      } catch (error) { message(error.message, 'error'); }
      finally { $('#ah-link-password').value = ''; setBusy(false); }
    });
    $('[data-role="link-cancel"]').addEventListener('click', () => { $('#ah-link-password').value = ''; prefillLogin($('#ah-link-email').value); showView('login'); });

    $('[data-role="verified-login"]').addEventListener('click', () => {
      prefillLogin(state.verification?.email || '');
      showView('login');
      message('যাচাই শেষ হলে ইমেইল ও পাসওয়ার্ড দিয়ে লগইন করুন।', 'success');
    });
    $('[data-role="verify-back"]').addEventListener('click', () => {
      clearResendCooldown(); state.verification = null;
      $('#ah-resend-email').value = ''; $('#ah-resend-password').value = '';
      showView('signup');
    });

    $('[data-role="resend-form"]').addEventListener('submit', async event => {
      event.preventDefault();
      if (state.busy || !ensureAvailable()) return;
      const remaining = resendSecondsRemaining();
      if (remaining > 0) return message(`আরও ${remaining.toLocaleString('bn-BD')} সেকেন্ড পর আবার পাঠাতে পারবেন।`, 'info');
      const email = $('#ah-resend-email').value.trim();
      const password = $('#ah-resend-password').value;
      if (!email || !$('#ah-resend-email').checkValidity() || password.length < 8) return message('ইমেইল ও পাসওয়ার্ড সঠিকভাবে লিখুন।', 'error');
      setBusy(true);
      try {
        const result = await api('/verification/resend', { method: 'POST', body: { email, password } });
        if (result.alreadyVerified) {
          clearResendCooldown(); state.verification = null; prefillLogin(email); showView('login');
          message('ইমেইল ইতিমধ্যে যাচাইকৃত—এখন লগইন করুন।', 'success');
        } else {
          state.verification = { email, emailMasked: result.verification?.emailMasked || email, resendUntil: 0 };
          startResendCooldown(result.verification?.resendAfter || state.resendCooldownSeconds);
          showView('verify');
          message('ইমেইল যাচাইয়ের নতুন বার্তা পাঠানো হয়েছে।', 'success');
        }
      } catch (error) {
        if (error.retryAfter > 0) startResendCooldown(error.retryAfter);
        message(error.message, 'error');
      } finally { $('#ah-resend-password').value = ''; setBusy(false); }
    });

    $('[data-role="backup-start"]').addEventListener('click', () => {
      if (state.busy || !state.session || !state.capabilities.backup.available) return;
      const mode = state.capabilities.backup.contactInput;
      if (mode === 'none') return requestBackup();
      $('[data-role="backup-contact-mode"]').textContent = mode === 'required' ? '(প্রয়োজন)' : '(ঐচ্ছিক)';
      $('#ah-backup-contact').required = mode === 'required';
      $('#ah-backup-contact').value = '';
      showView('backup-prepare');
      setTimeout(() => $('#ah-backup-contact')?.focus(), 30);
    });
    $('[data-view="backup-prepare"]').addEventListener('submit', event => {
      event.preventDefault();
      if (state.busy) return;
      const contact = $('#ah-backup-contact').value.trim();
      if (state.capabilities.backup.contactInput === 'required' && !contact) return message('আন্তর্জাতিক ফরম্যাটে মোবাইল নম্বর লিখুন।', 'error');
      if (contact && !/^\+[1-9]\d{7,14}$/.test(contact)) return message('মোবাইল নম্বর +8801XXXXXXXXX ফরম্যাটে লিখুন।', 'error');
      requestBackup(contact);
    });
    $('[data-role="backup-prepare-cancel"]').addEventListener('click', () => { $('#ah-backup-contact').value = ''; showView('signed'); });
    $('[data-view="backup"]').addEventListener('submit', async event => {
      event.preventDefault();
      if (state.busy || !state.backup) return;
      const code = $('#ah-backup-code').value.trim();
      const remote = state.backup.interaction?.type === 'telegram-link';
      if (!remote && !/^\d{6}$/.test(code)) return message('৬ সংখ্যার কোড লিখুন।', 'error');
      setBusy(true);
      try {
        await api('/backup/verify', {
          method: 'POST',
          body: {
            attemptId: state.backup.attemptId,
            purpose: state.backup.purpose,
            ...(remote ? { evidence: 'telegram-webhook-confirmed' } : { code })
          }
        });
        state.backup = null;
        $('#ah-backup-code').value = '';
        showView('signed');
        message('বিকল্প যাচাই সফল হয়েছে। একই Firebase অ্যাকাউন্ট ও সেশন চালু আছে।', 'success');
      } catch (error) { $('#ah-backup-code').value = ''; message(error.message, 'error'); }
      finally { setBusy(false); }
    });
    $('[data-role="backup-cancel"]').addEventListener('click', () => { state.backup = null; $('#ah-backup-code').value = ''; configureBackupView(null); showView('signed'); });

    $('[data-role="logout"]').addEventListener('click', async () => {
      if (state.busy) return;
      setBusy(true);
      try {
        await api('/session/logout', { method: 'POST', body: {} });
        state.session = null; state.passkeys = []; state.backup = null;
        updateLauncher(); showView('login'); message('নিরাপদভাবে লগ আউট হয়েছে।', 'success');
      } catch (error) { message(error.message, 'error'); }
      finally { setBusy(false); }
    });

    api(canaryConfigPath()).then(result => {
      applyCapabilities(result?.auth || {});
      const cooldown = Number(result?.auth?.verificationEmail?.resendCooldownSeconds);
      if (Number.isFinite(cooldown) && cooldown >= 1 && cooldown <= 86400) state.resendCooldownSeconds = Math.ceil(cooldown);
    }).catch(() => { state.available = false; applyCapabilities({ available: false }); });
    refreshSession();

    try {
      const current = new URL(location.href);
      if (current.searchParams.get('firebaseVerified') === '1') {
        current.searchParams.delete('firebaseVerified');
        history.replaceState(null, '', current.pathname + current.search + current.hash);
        open();
        message('ইমেইল যাচাই সম্পন্ন হয়েছে—এখন পাসওয়ার্ড দিয়ে লগইন করুন।', 'success');
      }
    } catch (_) {}
  };

  window.AdmissionAccount = Object.freeze({
    open,
    refresh: refreshSession,
    getSession: () => state.session,
    isVerified: () => Boolean(state.session?.authenticated && state.session?.emailVerified),
    requireVerified() {
      const allowed = Boolean(state.session?.authenticated && state.session?.emailVerified);
      if (!allowed) open();
      return allowed;
    }
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
