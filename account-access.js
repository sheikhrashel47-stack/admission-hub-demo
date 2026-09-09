(() => {
  'use strict';

  const API = '/api/auth/v1';
  const state = {
    session: null,
    verification: null,
    busy: false,
    initialized: false,
    available: null,
    resendTimer: null,
    resendCooldownSeconds: 60
  };
  const $ = selector => overlay.querySelector(selector);

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
        <p class="ah-account-subtitle">ইমেইল ও পাসওয়ার্ডে সাইনআপ করুন। ইমেইল যাচাই না হওয়া পর্যন্ত অ্যাকাউন্টে প্রবেশ বন্ধ থাকবে।</p>
      </header>
      <div class="ah-account-body">
        <div class="ah-account-message" data-role="message" hidden aria-live="polite"></div>

        <form class="ah-account-view" data-view="login" novalidate>
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
          <p class="ah-account-note">শুধু Firebase-এ যাচাইকৃত ইমেইল দিয়ে লগইন হবে। নিরাপদ সেশন browser-readable storage-এ রাখা হয় না।</p>
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

        <div class="ah-account-view" data-view="signed" hidden>
          <div class="ah-account-secure">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 10V8a5 5 0 0 1 10 0v2m-11 0h12v10H6V10Zm6 4v2" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <div><h3>যাচাইকৃত অ্যাকাউন্ট সক্রিয়</h3><p>Firebase নিশ্চিত করেছে যে ইমেইলটি যাচাই করা হয়েছে।</p></div>
          </div>
          <div class="ah-account-identity">
            <p class="ah-account-identity-label">যাচাইকৃত ইমেইল</p>
            <p class="ah-account-identity-value" data-role="identity">—</p>
          </div>
          <button class="ah-account-secondary" type="button" data-role="logout">লগ আউট</button>
          <p class="ah-account-fine">Firebase credential ও নিরাপদ সেশন HttpOnly cookie-তে সুরক্ষিত থাকে; JavaScript সেগুলো পড়তে পারে না।</p>
        </div>
      </div>
    </section>`;

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
    button.textContent = remaining > 0
      ? `আবার পাঠানো যাবে (${remaining.toLocaleString('bn-BD')} সেকেন্ড)`
      : 'যাচাইয়ের ইমেইল আবার পাঠান';
    status.textContent = remaining > 0
      ? `নিরাপত্তার জন্য ${remaining.toLocaleString('bn-BD')} সেকেন্ড পর আবার পাঠাতে পারবেন।`
      : 'প্রয়োজনে এখন আবার পাঠাতে পারেন।';
    if (remaining === 0 && state.resendTimer) {
      clearInterval(state.resendTimer);
      state.resendTimer = null;
    }
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
      button.innerHTML = state.busy && isActive
        ? '<span class="ah-account-spinner" aria-hidden="true"></span>অপেক্ষা করুন…'
        : button.dataset.label;
    });
    updateResendCooldown();
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
    if (name === 'signed') $('[data-role="identity"]').textContent = state.session?.user?.emailMasked || 'যাচাইকৃত অ্যাকাউন্ট';
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

  const refreshSession = async () => {
    try {
      const current = await api('/session');
      state.session = current?.authenticated && current?.emailVerified ? current : null;
    } catch (error) {
      if ([401, 403].includes(error.status)) state.session = null;
    }
    updateLauncher();
    if (!overlay.hidden && state.session) showView('signed');
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

  const prefillLogin = email => {
    if (email) $('#ah-login-email').value = email;
  };

  const ensureAvailable = () => {
    if (state.available === true) return true;
    message('Firebase account service এখনো চালু করা হয়নি।', 'info');
    return false;
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
        $('#ah-signup-password').value = '';
        $('#ah-signup-confirm').value = '';
        showView('verify');
        message('অ্যাকাউন্ট তৈরি হয়েছে। ইমেইলের যাচাইয়ের লিংকে ক্লিক করুন।', 'success');
      } catch (error) {
        if (error.code === 'EMAIL_ALREADY_IN_USE') {
          clearResendCooldown();
          state.verification = null;
          prefillLogin(email);
          showView('login');
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
        state.session = result;
        clearResendCooldown();
        state.verification = null;
        updateLauncher();
        showView('signed');
        message('যাচাইকৃত অ্যাকাউন্টে লগইন হয়েছে।', 'success');
      } catch (error) {
        if (error.code === 'EMAIL_NOT_VERIFIED') {
          clearResendCooldown();
          state.verification = { email, emailMasked: email, resendUntil: 0 };
          showView('verify');
        }
        message(error.message, 'error');
      } finally {
        $('#ah-login-password').value = '';
        setBusy(false);
      }
    });

    $('[data-role="verified-login"]').addEventListener('click', () => {
      prefillLogin(state.verification?.email || '');
      showView('login');
      message('যাচাই শেষ হলে ইমেইল ও পাসওয়ার্ড দিয়ে লগইন করুন।', 'success');
    });

    $('[data-role="verify-back"]').addEventListener('click', () => {
      clearResendCooldown();
      state.verification = null;
      $('#ah-resend-email').value = '';
      $('#ah-resend-password').value = '';
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
          clearResendCooldown();
          state.verification = null;
          prefillLogin(email);
          showView('login');
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
      }
      finally {
        $('#ah-resend-password').value = '';
        setBusy(false);
      }
    });

    $('[data-role="logout"]').addEventListener('click', async () => {
      if (state.busy) return;
      setBusy(true);
      try {
        await api('/session/logout', { method: 'POST', body: {} });
        state.session = null;
        updateLauncher();
        showView('login');
        message('নিরাপদভাবে লগ আউট হয়েছে।', 'success');
      } catch (error) { message(error.message, 'error'); }
      finally { setBusy(false); }
    });

    api('/config').then(result => {
      state.available = result?.auth?.available === true;
      const cooldown = Number(result?.auth?.verificationEmail?.resendCooldownSeconds);
      if (Number.isFinite(cooldown) && cooldown >= 1 && cooldown <= 86400) state.resendCooldownSeconds = Math.ceil(cooldown);
    }).catch(() => { state.available = false; });
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
