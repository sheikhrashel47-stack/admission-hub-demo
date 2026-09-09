(() => {
  'use strict';

  const API = '/api/auth/v1';
  const PENDING_KEY = 'admissionHubPendingAccountV1';
  const state = { session: null, pending: null, busy: false, timer: null, initialized: false };
  const $ = selector => document.querySelector(selector);

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
        <p class="ah-account-subtitle">একই ইমেইলে সাইনআপ ও লগইন—কোনো পাসওয়ার্ড মনে রাখতে হবে না।</p>
      </header>
      <div class="ah-account-body">
        <div class="ah-account-message" data-role="message" hidden aria-live="polite"></div>
        <form class="ah-account-view" data-view="email" novalidate>
          <label class="ah-account-label" for="ah-account-email">আপনার ইমেইল</label>
          <input class="ah-account-input" id="ah-account-email" name="email" type="email" inputmode="email" autocomplete="email" maxlength="254" placeholder="name@example.com" required>
          <button class="ah-account-primary" type="submit" data-role="send">যাচাই কোড পাঠান</button>
          <p class="ah-account-note">অ্যাপটি লগইন ছাড়াও ব্যবহার করা যায়। অ্যাকাউন্ট খুললে এই ডিভাইসে একটি নিরাপদ HttpOnly সেশন থাকবে।</p>
        </form>
        <form class="ah-account-view" data-view="verify" hidden novalidate>
          <p class="ah-account-mask">ছয় সংখ্যার কোড পাঠানো হয়েছে <strong data-role="mask">আপনার ইমেইলে</strong>।</p>
          <label class="ah-account-label" for="ah-account-otp">যাচাই কোড</label>
          <input class="ah-account-input ah-account-otp" id="ah-account-otp" name="verification" type="text" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" placeholder="••••••" required>
          <button class="ah-account-primary" type="submit" data-role="verify">নিরাপদভাবে প্রবেশ করুন</button>
          <div class="ah-account-row">
            <button class="ah-account-link" type="button" data-role="back">ইমেইল বদলান</button>
            <button class="ah-account-link" type="button" data-role="resend">আবার পাঠান</button>
          </div>
          <p class="ah-account-note" data-role="countdown">কোডটি ১০ মিনিট কার্যকর থাকবে।</p>
        </form>
        <div class="ah-account-view" data-view="signed" hidden>
          <div class="ah-account-secure">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 10V8a5 5 0 0 1 10 0v2m-11 0h12v10H6V10Zm6 4v2" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <div><h3>নিরাপদ সেশন সক্রিয়</h3><p>সেশনটি ব্রাউজার-পঠনযোগ্য storage-এ রাখা হয়নি।</p></div>
          </div>
          <div class="ah-account-identity">
            <p class="ah-account-identity-label">যাচাইকৃত ইমেইল</p>
            <p class="ah-account-identity-value" data-role="identity">—</p>
          </div>
          <button class="ah-account-secondary" type="button" data-role="logout">লগ আউট</button>
          <p class="ah-account-fine">Admission Hub কখনো ইমেইলের OTP বা নিরাপদ সেশন browser-readable storage-এ রাখে না।</p>
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
  };

  const showView = name => {
    overlay.querySelectorAll('[data-view]').forEach(view => { view.hidden = view.dataset.view !== name; });
    message();
    if (name === 'verify') {
      $('[data-role="mask"]').textContent = state.pending?.emailMasked || 'আপনার ইমেইলে';
      setTimeout(() => $('#ah-account-otp')?.focus(), 30);
      startCountdown();
    } else if (name === 'signed') {
      $('[data-role="identity"]').textContent = state.session?.user?.emailMasked || 'যাচাইকৃত অ্যাকাউন্ট';
      clearInterval(state.timer);
    } else {
      const send = $('[data-role="send"]');
      if (send) {
        send.dataset.label = state.pending?.challengeId && !state.pending.email ? 'আগের কোড ব্যবহার করুন' : 'যাচাই কোড পাঠান';
        send.textContent = send.dataset.label;
      }
      setTimeout(() => $('#ah-account-email')?.focus(), 30);
      clearInterval(state.timer);
    }
  };

  const savePending = value => {
    state.pending = value;
    try {
      if (value) {
        const publicState = {
          challengeId: value.challengeId,
          emailMasked: value.emailMasked,
          expiresAt: value.expiresAt,
          resendAt: value.resendAt
        };
        sessionStorage.setItem(PENDING_KEY, JSON.stringify(publicState));
      } else sessionStorage.removeItem(PENDING_KEY);
    } catch (_) {}
  };

  const restorePending = () => {
    try {
      const value = JSON.parse(sessionStorage.getItem(PENDING_KEY) || 'null');
      if (!value || !/^[A-Za-z0-9_-]{24,64}$/.test(value.challengeId) || Number(value.expiresAt) <= Date.now()) {
        sessionStorage.removeItem(PENDING_KEY);
        return null;
      }
      return { ...value, email: '' };
    } catch (_) { return null; }
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
    const signed = Boolean(state.session?.authenticated);
    launcher.dataset.authenticated = String(signed);
    launcher.setAttribute('aria-label', signed ? 'নিরাপদ অ্যাকাউন্ট সক্রিয়' : 'অ্যাকাউন্ট খুলুন');
    const label = launcher.querySelector('.ah-account-launcher-label');
    if (label) label.textContent = signed ? 'সক্রিয়' : 'অ্যাকাউন্ট';
  };

  const refreshSession = async () => {
    try {
      const current = await api('/session');
      state.session = current;
      savePending(null);
    } catch (error) {
      if (error.status === 401 || error.status === 403) state.session = null;
    }
    updateLauncher();
    if (!overlay.hidden && state.session?.authenticated) showView('signed');
    return state.session;
  };

  const startCountdown = () => {
    clearInterval(state.timer);
    const render = () => {
      if (!state.pending) return;
      const now = Date.now();
      const resend = $('[data-role="resend"]');
      const countdown = $('[data-role="countdown"]');
      const resendSeconds = Math.max(0, Math.ceil((Number(state.pending.resendAt) - now) / 1000));
      const expirySeconds = Math.max(0, Math.ceil((Number(state.pending.expiresAt) - now) / 1000));
      if (resend) {
        resend.disabled = state.busy || resendSeconds > 0;
        resend.textContent = resendSeconds ? `আবার পাঠান (${resendSeconds}s)` : 'আবার পাঠান';
      }
      if (countdown) countdown.textContent = expirySeconds
        ? `কোডটি আর ${Math.floor(expirySeconds / 60)}:${String(expirySeconds % 60).padStart(2, '0')} মিনিট কার্যকর।`
        : 'কোডটির সময় শেষ—নতুন কোড নিন।';
      if (!expirySeconds) clearInterval(state.timer);
    };
    render();
    state.timer = setInterval(render, 1000);
  };

  const requestOtp = async email => {
    const result = await api('/otp/request', { method: 'POST', body: { email } });
    savePending({
      email: String(email).trim().toLowerCase(),
      challengeId: result.challenge.id,
      emailMasked: result.challenge.emailMasked,
      expiresAt: Number(result.challenge.expiresAt),
      resendAt: Date.now() + Number(result.challenge.resendAfter || 60) * 1000
    });
    showView('verify');
    if (result.challenge.delivery === 'uncertain') {
      message('ইমেইল পাঠানোর নিশ্চিত খবর পাওয়া যায়নি। কোড এলে দিন; না এলে এক মিনিট পরে আবার পাঠান।', 'info');
    } else {
      message('কোড পাঠানো হয়েছে। Inbox-এর পাশাপাশি Spam/Promotions-ও দেখুন।', 'success');
    }
  };

  const open = () => {
    overlay.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    if (state.session?.authenticated) showView('signed');
    else {
      state.pending = state.pending && Number(state.pending.expiresAt) > Date.now() ? state.pending : restorePending();
      if (state.pending?.email) {
        $('#ah-account-email').value = state.pending.email;
        showView('verify');
      } else {
        $('#ah-account-email').value = '';
        showView('email');
        if (state.pending) message('আগে পাঠানো কোড ব্যবহার করতে একই ইমেইলটি আবার লিখুন।', 'info');
      }
    }
  };

  const close = () => {
    overlay.hidden = true;
    document.documentElement.style.overflow = '';
    message();
    launcher.focus();
  };

  const initialize = () => {
    if (state.initialized || !document.body) return;
    state.initialized = true;
    document.body.append(launcher, overlay);
    launcher.addEventListener('click', open);
    $('.ah-account-close').addEventListener('click', close);
    overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape' && !overlay.hidden) close(); });

    $('[data-view="email"]').addEventListener('submit', async event => {
      event.preventDefault();
      const email = $('#ah-account-email').value.trim();
      if (!email || !$('#ah-account-email').checkValidity()) return message('সঠিক ইমেইল ঠিকানা লিখুন।', 'error');
      if (state.pending?.challengeId && !state.pending.email && Number(state.pending.expiresAt) > Date.now()) {
        state.pending = { ...state.pending, email: email.toLowerCase() };
        showView('verify');
        message('ইমেইলে পাওয়া আগের ছয় সংখ্যার কোডটি দিন।', 'info');
        return;
      }
      setBusy(true);
      try { await requestOtp(email); }
      catch (error) { message(error.message, 'error'); }
      finally { setBusy(false); startCountdown(); }
    });

    $('[data-view="verify"]').addEventListener('submit', async event => {
      event.preventDefault();
      const submittedDigits = $('#ah-account-otp').value.replace(/\D/g, '');
      if (!state.pending || submittedDigits.length !== 6) return message('ছয় সংখ্যার কোডটি লিখুন।', 'error');
      setBusy(true);
      try {
        const result = await api('/otp/verify', {
          method: 'POST',
          body: { email: state.pending.email, challengeId: state.pending.challengeId, code: submittedDigits }
        });
        state.session = result;
        $('#ah-account-otp').value = '';
        savePending(null);
        updateLauncher();
        showView('signed');
        message(result.created ? 'অ্যাকাউন্ট তৈরি ও যাচাই সম্পন্ন হয়েছে।' : 'নিরাপদভাবে লগইন হয়েছে।', 'success');
      } catch (error) {
        message(error.message, 'error');
        $('#ah-account-otp').select();
      } finally { setBusy(false); }
    });

    $('[data-role="back"]').addEventListener('click', () => {
      savePending(null);
      $('#ah-account-otp').value = '';
      showView('email');
    });

    $('[data-role="resend"]').addEventListener('click', async () => {
      if (!state.pending || Number(state.pending.resendAt) > Date.now()) return;
      setBusy(true);
      try { await requestOtp(state.pending.email); }
      catch (error) { message(error.message, 'error'); }
      finally { setBusy(false); startCountdown(); }
    });

    $('[data-role="logout"]').addEventListener('click', async () => {
      setBusy(true);
      try {
        await api('/session/logout', { method: 'POST', body: {} });
        state.session = null;
        updateLauncher();
        showView('email');
        message('নিরাপদভাবে লগ আউট হয়েছে।', 'success');
      } catch (error) { message(error.message, 'error'); }
      finally { setBusy(false); }
    });

    $('#ah-account-otp').addEventListener('input', event => {
      event.target.value = event.target.value.replace(/\D/g, '').slice(0, 6);
    });

    refreshSession();
  };

  window.AdmissionAccount = Object.freeze({ open, refresh: refreshSession, getSession: () => state.session });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
