/* Phase 3 — dedicated premium auth gate + profile. Phase 1 screens untouched. */
(() => {
  'use strict';
  if (window.__ahPremiumAuth) return;
  window.__ahPremiumAuth = true;
  const WORKER = 'https://admission-gk.admissionhub.workers.dev';
  const PUB = WORKER + '/api'; // auth/API routes live under /api on the live Worker
  const CANONICAL_WORKER = 'https://admission-gk.admissionhub.workers.dev'; // আজীবন-লক: ভুল ঠিকানায় পড়লেও এখানে fallback (AUTH_ENDPOINTS_GUARD.test.mjs গার্ড করে)
  const LS_TOKEN = 'ahPubToken';
  const LS_USER = 'ahPubUser';
  const PERSONAL = ['examResults', 'mistakes', 'settings', 'dailyStats', 'activityLogs', 'notes', 'vocabulary'];
  let cfg = { google: false, googleClientId: '', email: false, sms: false };
  let view = 'welcome';
  let typeGen = 0;
  let lang = 'bn';
  try { if (localStorage.getItem('ahLang') === 'en') lang = 'en'; } catch (_) {}
  const LINES = {
    bn: ['আসসালামু আলাইকুম! আপনাকে পেয়ে আমরা আনন্দিত।', 'চলুন, একসাথে শুরু করি নতুন এক অভিজ্ঞতা।'],
    en: ['Welcome! Let’s get started.', 'Make every moment of learning count.']
  };
  const I18N = {
    en: {
      tag: 'Learn Smart, Achieve More', start: 'Get Started',
      create: 'Create Your Account', tell: 'Tell us a little about you',
      fullName: 'Full Name', dob: 'Date of Birth', school: 'School name', college: 'College name',
      optional: '(optional)', cont: 'Continue', or: 'or', google: 'Continue with Google', confirm: 'Confirm Password',
      haveAcc: 'Already have an account?', login: 'Login',
      welcomeBack: 'Welcome Back,<br>Scholar! 👋', loginSub: 'Passkey, Google, or email',
      passkey: 'Continue with Passkey', orPass: 'or password', email: 'Email', password: 'Password',
      noAcc: "Don't have an account?", signup: 'Sign Up',
      verifyTitle: 'Verify your email', verifySub: 'We will send a 6-digit code to your email. Enter it below to activate your account.',
      emailWay: 'Send code to my email', hint: 'Choose whichever is more convenient for you.',
      emailTitle: 'Verify your email', emailSub: "We'll send a 6-digit code to this email",
      sendLink: 'Send verification code', checkEmail: 'Check your email',
      linkSent: 'A verification code has been sent to',
      linkTap: 'Enter the 6-digit code from that email to activate your account.',
      processing: 'Processing…', waitingMail: 'Keep this page open. Once the code is confirmed, this device will sign you in.',
      linkExpires: 'Code expires in', linkExpired: 'The verification code has expired. Please request a new one.',
      resendLink: 'Resend code', forgot: 'Forgot password?',
      forgotTitle: 'Recover password', forgotSub: 'Enter the email address used to create your account. A verification code will be sent only to that address.',
      sendCode: 'Send verification code', otpTitle: 'Enter verification code',
      otpSub: 'A six-digit code has been sent to', resendCode: 'Resend code', resendIn: 'Resend available in',
      verifyContinue: 'Verify and continue', newPass: 'Set a new password',
      newPassSub: 'Choose a new password for your Admission Hub account.', updatePass: 'Update password',
      resetOkTitle: 'Password updated', resetOkSub: 'Your password has been changed. You may now continue.',
      goDash: 'Continue'
    },
    bn: {
      tag: 'জ্ঞান অর্জন করুন, লক্ষ্যে পৌঁছান', start: 'শুরু করুন',
      create: 'অ্যাকাউন্ট তৈরি করুন', tell: 'আপনার তথ্য প্রদান করুন',
      fullName: 'পূর্ণ নাম', dob: 'জন্ম তারিখ', school: 'বিদ্যালয়ের নাম', college: 'কলেজের নাম',
      optional: '(ঐচ্ছিক)', cont: 'এগিয়ে যান', or: 'অথবা', google: 'গুগল দিয়ে এগিয়ে যান', confirm: 'পাসওয়ার্ড নিশ্চিত করুন',
      haveAcc: 'পূর্বে অ্যাকাউন্ট রয়েছে?', login: 'প্রবেশ করুন',
      welcomeBack: 'স্বাগতম,<br>শিক্ষার্থী', loginSub: 'পাসকি, গুগল অথবা ইমেইল',
      passkey: 'পাসকি দিয়ে এগিয়ে যান', orPass: 'অথবা পাসওয়ার্ড', email: 'ইমেইল', password: 'পাসওয়ার্ড',
      noAcc: 'অ্যাকাউন্ট নেই?', signup: 'নিবন্ধন করুন',
      verifyTitle: 'ইমেইল যাচাই করুন', verifySub: 'আপনার ইমেইলে ৬-অঙ্কের কোড পাঠানো হবে। কোডটি লিখে অ্যাকাউন্ট সক্রিয় করুন।',
      emailWay: 'ইমেইলে কোড পাঠান', hint: 'আপনার সুবিধামতো পদ্ধতি বেছে নিন।',
      emailTitle: 'ইমেইল যাচাইকরণ', emailSub: 'এই ইমেইলে একটি ৬-অঙ্কের কোড পাঠানো হবে',
      sendLink: 'কোড পাঠান', checkEmail: 'ইমেইল দেখুন',
      linkSent: 'যাচাইকরণ কোড প্রেরণ করা হয়েছে',
      linkTap: 'ইমেইলের ৬-অঙ্কের কোডটি লিখে অ্যাকাউন্ট সক্রিয় করুন।',
      processing: 'প্রক্রিয়াকরণ চলছে…', waitingMail: 'এই পাতা খোলা রাখুন। কোড নিশ্চিত হলে এই ডিভাইসে স্বয়ংক্রিয়ভাবে প্রবেশ করবে।',
      linkExpires: 'কোডের মেয়াদ', linkExpired: 'যাচাইকরণ কোডের মেয়াদ শেষ হয়েছে। নতুন কোড প্রেরণ করুন।',
      resendLink: 'কোড আবার পাঠান', forgot: 'পাসওয়ার্ড ভুলে গেছেন?',
      forgotTitle: 'পাসওয়ার্ড পুনরুদ্ধার', forgotSub: 'যে ইমেইল ঠিকানায় অ্যাকাউন্ট খুলেছিলেন সেটি লিখুন। যাচাইকরণ কোড কেবল সেই ঠিকানায় প্রেরণ করা হবে।',
      sendCode: 'যাচাইকরণ কোড পাঠান', otpTitle: 'যাচাইকরণ কোড লিখুন',
      otpSub: 'ছয় অঙ্কের কোড প্রেরণ করা হয়েছে', resendCode: 'কোড পুনরায় পাঠান', resendIn: 'পুনরায় পাঠানো যাবে',
      verifyContinue: 'যাচাই করে এগিয়ে যান', newPass: 'নতুন পাসওয়ার্ড নির্ধারণ',
      newPassSub: 'Admission Hub অ্যাকাউন্টের জন্য একটি নতুন পাসওয়ার্ড নির্ধারণ করুন।', updatePass: 'পাসওয়ার্ড হালনাগাদ করুন',
      resetOkTitle: 'পাসওয়ার্ড হালনাগাদ হয়েছে', resetOkSub: 'আপনার পাসওয়ার্ড পরিবর্তন সম্পন্ন হয়েছে। এখন প্রবেশ করতে পারেন।',
      goDash: 'এগিয়ে যান'
    }
  };
  const t = k => (I18N[lang] && I18N[lang][k]) || I18N.en[k] || k;
  let draft = { name: '', dob: '', school: '', college: '', id: '', password: '', purpose: 'signup', masked: '', wait: 45 };
  let syncing = false;
  let otpTimer = 0;
  let waitPoll = 0;

  const readStore = (k) => {
    try { return localStorage.getItem(k) || sessionStorage.getItem(k) || ''; } catch (_) { return ''; }
  };
  const token = () => readStore(LS_TOKEN);
  const user = () => { try { return JSON.parse(readStore(LS_USER) || 'null'); } catch (_) { return null; } };
  const setSession = (tok, u) => {
    const write = (k, v) => {
      try {
        if (v) { localStorage.setItem(k, v); sessionStorage.setItem(k, v); }
        else { localStorage.removeItem(k); sessionStorage.removeItem(k); }
      } catch (_) {}
    };
    write(LS_TOKEN, tok || '');
    write(LS_USER, u ? JSON.stringify(u) : '');
  };
  const authed = () => !!token();
  const authH = () => ({ 'Content-Type': 'application/json', Authorization: 'Bearer ' + token() });
  const toast = m => { if (typeof window.toast === 'function') window.toast(m); };

  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
    const retryableStatus = status => status === 408 || status === 425 || status === 429 || status >= 500;
    const networkFailure = error => /Failed to fetch|NetworkError|Load failed|timed out|network/i.test(String(error && error.message || error));
    const api = async (path, opts = {}) => {
      const method = String(opts.method || 'GET').toUpperCase();
      const canRetry = method === 'GET' || path === '/auth/config';
      // আজীবন-লক: এসব public auth endpoint-এ ভুল পথ ধরে "আগে লগইন" এলে canonical-এ ১ বার retry
      const PUBLIC_AUTH = ['/auth/config','/auth/register-email','/auth/otp/send','/auth/otp/verify','/auth/verify','/auth/request','/auth/forgot','/auth/reset','/auth/verify-link','/auth/google','/auth/passkey/register/begin','/auth/passkey/register/finish','/auth/passkey/login/begin','/auth/passkey/login/finish','/auth/wait'];
      const canonicalBase = CANONICAL_WORKER + '/api';
      let last;
      for (let attempt = 0; attempt < (canRetry ? 3 : 1); attempt += 1) {
        try {
          let res;
          try {
            res = await fetch(PUB + path, opts);
          } catch (e) {
            if (PUB !== canonicalBase) res = await fetch(canonicalBase + path, opts); // network fail → canonical fallback
            else throw e;
          }
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            if (PUB !== canonicalBase && PUBLIC_AUTH.includes(path) && (res.status === 401 || res.status === 404) && /আগে লগইন|not-found/.test(String(data.error || ''))) {
              res = await fetch(canonicalBase + path, opts);
              const data2 = await res.json().catch(() => ({}));
              if (!res.ok) {
                last = new Error(data2.error || ('http-' + res.status));
                if (canRetry && retryableStatus(res.status) && attempt < 2) { await wait(350 * (attempt + 1)); continue; }
                throw last;
              }
              return data2;
            }
            last = new Error(data.error || ('http-' + res.status));
            if (canRetry && retryableStatus(res.status) && attempt < 2) { await wait(350 * (attempt + 1)); continue; }
            throw last;
          }
          return data;
        } catch (error) {
          last = error;
          if (canRetry && networkFailure(error) && attempt < 2) { await wait(350 * (attempt + 1)); continue; }
          throw error;
        }
      }
      throw last || new Error('network-error');
    };

    // ইউজার-বান্ধব ত্রুটি: সেশন/লগইন-সম্পর্কিত raw message-কে পরিষ্কার বাংলায় রূপ দাও
    const sessionErr = e => /আগে লগইন|http-401|http-403|অ্যাকাউন্ট বন্ধ/.test(String((e && e.message) || e || ''));
    const authFriendly = e => {
      const m = String((e && e.message) || e || '');
      if (/http-401/.test(m)) return lang === 'bn' ? 'তোমার সেশন শেষ হয়ে গেছে — আবার লগইন করো' : 'Your session ended — please sign in again';
      if (/http-403/.test(m) || /অ্যাকাউন্ট বন্ধ/.test(m)) return lang === 'bn' ? 'এই কাজের অনুমতি নেই' : 'Not allowed to do this';
      if (/আগে লগইন/.test(m)) return lang === 'bn' ? 'প্রথমে নিজের অ্যাকাউন্টে লগইন করো' : 'Please sign in to your account first';
      return m;
    };

      const setGate = on => {
    document.documentElement.dataset.ah = on ? 'out' : 'in';
    document.body.classList.toggle('ah-gated', !!on);
    const g = document.getElementById('ahAuthGate');
    if (g) g.style.display = on ? 'block' : 'none';
    if (on) {
      const nav = document.getElementById('navRoot');
      if (nav) nav.innerHTML = '';
    }
  };

  const collectPersonal = async () => {
    const out = { v: 1, at: Date.now() };
    for (const st of PERSONAL) {
      const rows = typeof dbGetAll === 'function' ? await dbGetAll(st).catch(() => []) : [];
      out[st] = Array.isArray(rows) ? rows : (rows ? [rows] : []);
    }
    return out;
  };
  const applyPersonal = async (doc) => {
    if (!doc || typeof doc !== 'object') return;
    for (const st of PERSONAL) {
      const rows = Array.isArray(doc[st]) ? doc[st] : [];
      if (!rows.length) continue;
      if (window.AdmissionCloudContent && AdmissionCloudContent.putManyFast) await AdmissionCloudContent.putManyFast(st, rows.filter(x => x && x.id));
      else if (typeof dbPutMany === 'function') await dbPutMany(st, rows.filter(x => x && x.id));
    }
    if (typeof loadCache === 'function') await loadCache();
  };
  const pushState = async () => {
    if (!token() || syncing) return;
    syncing = true;
    try { await api('/state', { method: 'POST', headers: authH(), body: JSON.stringify(await collectPersonal()) }); }
    catch (e) { window.__ahUserSyncErr = String(e.message || e).slice(0, 120); }
    finally { syncing = false; }
  };
  const pullState = async () => {
    if (!token()) return;
    try {
      const doc = await api('/state', { headers: authH() });
      if (doc && doc.v) await applyPersonal(doc);
    } catch (_) {}
  };

  const gateEl = () => document.getElementById('ahAuthGate');
  const paint = html => {
    const el = gateEl(); if (!el) return;
    el.innerHTML = html;
    bind();
  };
  const errBox = id => `<div class="ah-err" id="${id}"></div>`;
  const showErr = (id, m) => { const n = document.getElementById(id); if (n) n.textContent = m || ''; };
  const S = () => window.AHAuth3D || {};
  const ico = k => (S().ico && S().ico[k]) || '';
  const passRow = (id, ph, auto) => `<div class="ah-field"><input class="ah-inp" id="${id}" type="password" placeholder="${ph}" autocomplete="${auto||'current-password'}"><button class="ah-eye" type="button" data-eye="${id}" aria-label="Show password">${ico('eye')}</button></div>`;

  const welcome = () => {
    paint(`<section class="ah-screen ah-welcome ah-glass">
    ${S().welcomeScene ? S().welcomeScene() : ''}
    <div class="ah-lang-stage">
      <div class="ah-lang-btns" id="ahLangBtns">
        <button type="button" class="ah-lang${lang === 'en' ? ' on' : ''}" data-lang="en">English</button>
        <button type="button" class="ah-lang${lang === 'bn' ? ' on' : ''}" data-lang="bn">বাংলা</button>
      </div>
      <div class="ah-type" id="ahType">
        <p class="ah-type-l" id="ahType1"></p>
        <p class="ah-type-l" id="ahType2"></p>
      </div>
    </div>
    <div class="ah-dock">
      <h1>ADMISSION HUB</h1>
      <p class="ah-tag">${t('tag')}</p>
      <button class="ah-getstarted" type="button" data-go="signup">${t('start')}</button>
      <button class="ah-guestlink" type="button" data-guest-go>${lang === 'bn' ? 'আপাতত গেস্ট হিসেবে চালিয়ে যাও' : 'Continue as guest for now'}</button>
    </div>
  </section>`);
    startWelcomeType(lang);
  };

  const login = () => {
    paint(`<section class="ah-screen ah-light">
      <button class="ah-back" type="button" data-go="welcome" aria-label="Back">${ico('back')}</button>
      <div class="ah-hero-slot">${S().loginHero ? S().loginHero() : ''}</div>
      <h1 class="ah-h">${t('welcomeBack')}</h1>
      <p class="ah-p">${t('loginSub')}</p>
      <div class="ah-form">
        <button class="ah-btn" type="button" id="ahPasskey">${t('passkey')}</button>
        <div id="ahGoogleSlot"><button class="ah-btn sec" type="button" id="ahGoogle">${ico('g')} ${t('google')}</button></div>
        <div class="ah-or">${t('orPass')}</div>
        <label class="ah-lab">${t('email')}</label>
        <input class="ah-inp" id="ahId" placeholder="${t('email')}" value="${esc(draft.id)}" autocomplete="username">
        <label class="ah-lab">${t('password')}</label>${passRow('ahPass', t('password'), 'current-password')}
        <button class="ah-forgot" type="button" data-go="forgot">${t('forgot')}</button>
        <button class="ah-btn sec" type="button" id="ahDoLogin">${t('login')}</button>
        ${errBox('ahErr')}
        <div class="ah-foot">${t('noAcc')} <button type="button" data-go="signup">${t('signup')}</button></div>
      </div>
    </section>`);
    mountGoogle();
  };

  const signup = () => {
    paint(`<section class="ah-screen ah-light">
    <button class="ah-back" type="button" data-go="welcome" aria-label="Back">${ico('back')}</button>
    <div class="ah-hero-slot">${S().signupHero ? S().signupHero() : ''}</div>
    <h1 class="ah-h">${t('create')}</h1>
    <p class="ah-p">${t('tell')}</p>
    <div class="ah-form">
      <label class="ah-lab">${t('fullName')}</label>
      <input class="ah-inp" id="ahName" placeholder="${t('fullName')}" value="${esc(draft.name)}" autocomplete="name">
      <label class="ah-lab">${t('dob')}</label>
      <input class="ah-inp" id="ahDob" type="date" value="${esc(draft.dob)}" autocomplete="bday">
      <label class="ah-lab">${t('school')} <span class="ah-opt">${t('optional')}</span></label>
      <input class="ah-inp" id="ahSchool" placeholder="${t('school')}" value="${esc(draft.school)}">
      <label class="ah-lab">${t('college')} <span class="ah-opt">${t('optional')}</span></label>
      <input class="ah-inp" id="ahCollege" placeholder="${t('college')}" value="${esc(draft.college)}">
      <label class="ah-lab">${t('password')}</label>${passRow('ahPass', t('password'), 'new-password')}
      <label class="ah-lab">${t('confirm')}</label>${passRow('ahPass2', t('confirm'), 'new-password')}
      <button class="ah-btn" type="button" id="ahContinue">${t('cont')}</button>
      <div class="ah-or">${t('or')}</div>
      <div id="ahGoogleSlot"><button class="ah-btn sec" type="button" id="ahGoogle">${ico('g')} ${t('google')}</button></div>
      ${errBox('ahErr')}
      <div class="ah-foot">${t('haveAcc')} <button type="button" data-go="login">${t('login')}</button></div>
    </div>
  </section>`);
    mountGoogle();
  };

  const signupVerify = () => {
    paint(`<section class="ah-screen ah-light">
    <button class="ah-back" type="button" data-go="signup" aria-label="Back">${ico('back')}</button>
    <h1 class="ah-h">${t('verifyTitle')}</h1>
    <p class="ah-p">${t('verifySub')}</p>
    <div class="ah-form">
      <button class="ah-btn sec" type="button" id="ahEmailWay">${t('emailWay')}</button>
      <button class="ah-btn" type="button" id="ahPasskey">${t('passkey')}</button>
      <p class="ah-hint">${t('hint')}</p>
      ${errBox('ahErr')}
    </div>
  </section>`);
  };

  const emailVerify = () => {
    paint(`<section class="ah-screen ah-light">
    <button class="ah-back" type="button" data-go="verify" aria-label="Back">${ico('back')}</button>
    <h1 class="ah-h">${t('emailTitle')}</h1>
    <p class="ah-p">${t('emailSub')}</p>
    <div class="ah-form">
      <label class="ah-lab">${t('email')}</label>
      <input class="ah-inp" id="ahId" placeholder="${t('email')}" value="${esc(draft.id)}" autocomplete="email" inputmode="email">
      <button class="ah-btn" type="button" id="ahDoSignup">${t('sendLink')}</button>
      ${errBox('ahErr')}
    </div>
  </section>`);
  };

  const otpScreen = () => paint(`<section class="ah-screen ah-light ah-center">
    <button class="ah-back" type="button" data-go="${draft.purpose==='reset'?'forgot':(draft.purpose==='signup'?'signup':'login')}" aria-label="Back">${ico('back')}</button>
    <h1 class="ah-h">${t('otpTitle')}</h1>
    <p class="ah-p">${t('otpSub')}<br><b>${esc(draft.masked || draft.id)}</b></p>
    <div class="ah-otp" id="ahOtp">${[0,1,2,3,4,5].map(i=>`<input maxlength="1" inputmode="numeric" data-otp="${i}" autocomplete="${i?'off':'one-time-code'}">`).join('')}</div>
    <p class="ah-count-lab">${t('linkExpires')}</p>
    <div class="ah-count" id="ahCount">15:00</div>
    <div class="ah-resend" id="ahOtpWait">${t('resendIn')} <span id="ahSec">${esc(String(draft.wait||120))}</span>s</div>
    <button class="ah-btn sec" type="button" id="ahResend" disabled>${t('resendCode')}</button>
    <button class="ah-btn" type="button" id="ahDoVerify">${t('verifyContinue')}</button>
    ${errBox('ahErr')}
  </section>`);

  const success = (title, sub, goTxt) => paint(`<section class="ah-screen ah-light ah-center ah-ok">
    <div class="ah-hero-slot">${S().successHero ? S().successHero() : ''}</div>
    <h1 class="ah-h">${title}</h1>
    ${sub ? `<p class="ah-p">${sub}</p>` : ''}
    <button class="ah-btn" type="button" id="ahEnter">${goTxt}</button>
  </section>`);

  const forgot = () => paint(`<section class="ah-screen ah-light">
    <button class="ah-back" type="button" data-go="login" aria-label="Back">${ico('back')}</button>
    <h1 class="ah-h">${t('forgotTitle')}</h1>
    <p class="ah-p">${t('forgotSub')}</p>
    <div class="ah-form">
      <label class="ah-lab">${t('email')}</label>
      <input class="ah-inp" id="ahId" placeholder="${t('email')}" value="${esc(draft.id)}" autocomplete="email" inputmode="email">
      <button class="ah-btn" type="button" id="ahDoForgot">${t('sendCode')}</button>
      ${errBox('ahErr')}
    </div>
  </section>`);

  const reset = () => paint(`<section class="ah-screen ah-light">
    <button class="ah-back" type="button" data-go="forgot" aria-label="Back">${ico('back')}</button>
    <h1 class="ah-h">${t('newPass')}</h1>
    <p class="ah-p">${t('newPassSub')}</p>
    <div class="ah-form">
      <label class="ah-lab">${t('password')}</label>${passRow('ahPass', t('password'), 'new-password')}
      <label class="ah-lab">${t('confirm')}</label>${passRow('ahPass2', t('confirm'), 'new-password')}
      <button class="ah-btn" type="button" id="ahDoReset">${t('updatePass')}</button>
      ${errBox('ahErr')}
    </div>
  </section>`);

  const checkMail = () => paint(`<section class="ah-screen ah-light ah-center ah-mail">
    <button class="ah-back" type="button" data-go="emailv" aria-label="Back">${ico('back')}</button>
    <p class="ah-kicker">ADMISSION HUB</p>
    <h1 class="ah-h">${t('checkEmail')}</h1>
    <p class="ah-p">${t('linkSent')}<br><b>${esc(draft.masked || draft.id)}</b></p>
    <p class="ah-p">${t('linkTap')}</p>
    <button class="ah-btn" type="button" id="ahGoOtp">${lang==='bn'?'🔢 কোড লিখুন':'🔢 Enter the code'}</button>
    <div class="ah-resend" style="margin-top:14px">${t('linkExpires')}: <span id="ahCount">15:00</span></div>
    <button class="ah-btn sec" type="button" id="ahResendLink" disabled>${t('resendLink')}</button>
    ${errBox('ahErr')}
  </section>`);

  function esc(s) { return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  // অন্য ব্রাউজারে যাচাই করা হলে এই স্ক্রিন
  const crossBrowser = () => paint(`<section class="ah-screen ah-light ah-center">
    <p class="ah-kicker">ADMISSION HUB</p>
    <div style="font-size:46px;margin:6px 0 10px">✅</div>
    <h1 class="ah-h">${lang==='bn'?'ইমেইল যাচাই সম্পন্ন!':'Email verified!'}</h1>
    <p class="ah-p">${lang==='bn'
      ? 'যে ডিভাইস/ব্রাউজারে অ্যাকাউন্ট খুলেছিলে, সেখানে ফিরে গেলেই স্বয়ংক্রিয়ভাবে প্রবেশ হয়ে যাবে।'
      : 'Return to the browser where you opened the account — it will sign you in automatically.'}</p>
    <div class="ah-dock">
      <button class="ah-btn" type="button" id="ahCrossLogin">${lang==='bn'?'এখানে লগইন করো':'Login here'}</button>
    </div>
    ${errBox('ahErr')}
  </section>`);

  // Verify-লিংক থেকে ফেরত: same-browser চেক
  async function handleVerifyReturn() {
    let p = null;
    try { p = new URLSearchParams(location.search); } catch (_) { return; }
    const w = p.get('w') || '';
    const v = p.get('verified');
    if (!v || !w) return;
    try { history.replaceState(null, '', location.pathname + location.hash); } catch (_) {}
    const same = (() => { try { return localStorage.getItem('ahWaitId') === w; } catch (_) { return false; } })();
    if (same) {
      // একই ব্রাউজার → কোনো বার্তা নয়; সরাসরি অটো-প্রবেশ
      view = 'verifying';
      paint(`<section class="ah-screen ah-light ah-center">
        <p class="ah-kicker">ADMISSION HUB</p>
        <span class="ah3d" aria-hidden="true" style="margin:10px auto 6px"><span class="ring r1"></span><span class="ring r2"></span><span class="ring r3"></span><span class="cube"><i class="f1"></i><i class="f2"></i><i class="f3"></i><i class="f4"></i><i class="f5"></i><i class="f6"></i></span><span class="dot d1"></span><span class="dot d2"></span><span class="dot d3"></span><span class="dot d4"></span></span>
        <h1 class="ah-h">${lang==='bn'?'যাচাই সম্পন্ন — প্রবেশ করা হচ্ছে…':'Verified — signing you in…'}</h1>
      </section>`);
      try {
        const d = await api('/auth/wait', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ waitId: w }) });
        if (d && d.token) { await afterAuth(d); return; }
      } catch (_) {}
      go('ok');
      return;
    }
    // ভিন্ন ব্রাউজার → শুধু তখনই বার্তা
    go('crossbrowser');
  }

  function go(name) {
    typeGen += 1;
    waitPoll += 1;
    view = name;
    if (name === 'welcome') return welcome();
    if (name === 'login' || name === 'loginOtp') return login();
    if (name === 'signup') return signup();
    if (name === 'verify') return signupVerify();
    if (name === 'emailv') return emailVerify();
    if (name === 'checkmail') return checkMail();
    if (name === 'otp') return otpScreen();
    if (name === 'forgot') return forgot();
    if (name === 'reset') return reset();
    if (name === 'crossbrowser') return crossBrowser();
    if (name === 'ok') return success(lang==='bn' ? 'অ্যাকাউন্ট সক্রিয় হয়েছে' : 'Account verified', lang==='bn' ? 'যাচাইকরণ সম্পন্ন হয়েছে।' : 'Verification is complete.', t('goDash'));
    if (name === 'resetOk') return success(t('resetOkTitle'), t('resetOkSub'), t('login'));
  }

  function bind() {
    document.querySelectorAll('.ah-in').forEach(inp => {
      const sync = () => inp.classList.toggle('has', !!inp.value);
      sync(); inp.addEventListener('input', sync);
    });
    const root = gateEl(); if (!root) return;
    root.querySelectorAll('[data-go]').forEach(b => b.onclick = () => go(b.getAttribute('data-go')));
    root.querySelectorAll('[data-guest-go]').forEach(b => b.onclick = () => { clearPendingAuth(); enterGuest(); });
    root.querySelectorAll('[data-eye]').forEach(b => b.onclick = () => {
      const inp = document.getElementById(b.getAttribute('data-eye'));
      if (!inp) return;
      inp.type = inp.type === 'password' ? 'text' : 'password';
    });
    const loginBtn = document.getElementById('ahDoLogin');
    if (loginBtn) loginBtn.onclick = doLogin;
    const otpLogin = document.getElementById('ahDoLoginOtp');
    if (otpLogin) otpLogin.onclick = doLoginOtp;
    const su = document.getElementById('ahDoSignup');
    if (su) su.onclick = doSignup;
    const v = document.getElementById('ahDoVerify');
    if (v) v.onclick = doVerify;
    const f = document.getElementById('ahDoForgot');
    if (f) f.onclick = doForgot;
    const r = document.getElementById('ahDoReset');
    if (r) r.onclick = doReset;
    const gbtn = document.getElementById('ahGoogle');
    if (gbtn) gbtn.onclick = doGoogle;
    const pk = document.getElementById('ahPasskey');
    if (pk) pk.onclick = () => {
      if (view === 'login') return doPasskeyLogin();
      if (view === 'verify') return doPasskeyRegister();
      showErr('ahErr', lang === 'bn' ? 'পাসকি যোগ করতে আগে অ্যাকাউন্টে ঢুকুন। তারপর প্রোফাইল → নিরাপত্তা → পাসকি থেকে যোগ করুন।' : 'To add a passkey, sign in first. Then open Profile → Security → Passkeys.');
    };
    const goOtp = document.getElementById('ahGoOtp');
    if (goOtp) goOtp.onclick = () => go('otp');
    const cont = document.getElementById('ahContinue');
    if (cont) cont.onclick = doContinueProfile;
    const ew = document.getElementById('ahEmailWay');
    if (ew) ew.onclick = () => go('emailv');
    root.querySelectorAll('[data-lang]').forEach(b => b.onclick = () => startWelcomeType(b.getAttribute('data-lang')));
    ['ahName','ahDob','ahSchool','ahCollege'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', grabProfile);
      el.addEventListener('change', grabProfile);
    });
    const enter = document.getElementById('ahEnter');
    if (enter) enter.onclick = () => { if (view === 'resetOk') go('login'); else enterApp(); };
    const crossL = document.getElementById('ahCrossLogin');
    if (crossL) crossL.onclick = () => go('login');
    const resend = document.getElementById('ahResend');
    if (resend) resend.onclick = resendOtp;
    const rl = document.getElementById('ahResendLink');
    if (rl) rl.onclick = resendVerifyLink;
    setupOtpInputs();
    startOtpCountdown();
    if (document.getElementById('ahCount')) startLinkCountdown();
    if (view === 'checkmail' && draft.waitId) pollWait(draft.waitId);
    bindTilt();
    lockAuthGestures();
  }
  function lockAuthGestures() {
    const g = gateEl(); if (!g || g.dataset.zoomLock) return;
    g.dataset.zoomLock = '1';
    const stop = e => { if (e.touches && e.touches.length > 1) e.preventDefault(); };
    g.addEventListener('touchstart', stop, { passive: false });
    g.addEventListener('touchmove', stop, { passive: false });
    g.addEventListener('gesturestart', e => e.preventDefault());
  }
  function glyphs(s) {
    try {
      if (typeof Intl !== 'undefined' && Intl.Segmenter) {
        return [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(s)].map(x => x.segment);
      }
    } catch (_) {}
    return Array.from(s);
  }
  function startWelcomeType(next) {
    lang = next === 'bn' ? 'bn' : 'en';
    try { localStorage.setItem('ahLang', lang); } catch (_) {}
    document.querySelectorAll('[data-lang]').forEach(b => b.classList.toggle('on', b.getAttribute('data-lang') === lang));
    const tag = document.querySelector('.ah-welcome .ah-tag');
    const gs = document.querySelector('.ah-getstarted');
    if (tag) tag.textContent = t('tag');
    if (gs) gs.textContent = t('start');
    const l1 = document.getElementById('ahType1');
    const l2 = document.getElementById('ahType2');
    if (!l1 || !l2) return;
    l1.textContent = '';
    l2.textContent = '';
    const lines = LINES[lang];
    const g1 = glyphs(lines[0]);
    const g2 = glyphs(lines[1]);
    const instant = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const gen = ++typeGen;
    const add = (el, ch) => {
      el.querySelector('.ah-caret')?.remove();
      el.appendChild(document.createTextNode(ch));
      const c = document.createElement('i');
      c.className = 'ah-caret';
      el.appendChild(c);
    };
    if (instant) {
      l1.textContent = lines[0];
      l2.textContent = lines[1];
      return;
    }
    let i = 0;
    const tick = () => {
      if (gen !== typeGen) return;
      if (i < g1.length) { add(l1, g1[i]); i += 1; setTimeout(tick, 14); return; }
      l1.querySelector('.ah-caret')?.remove();
      const j = i - g1.length;
      if (j < g2.length) { add(l2, g2[j]); i += 1; setTimeout(tick, 14); return; }
      l2.querySelector('.ah-caret')?.remove();
    };
    tick();
  }
  function bindTilt() {
    const sc = document.querySelector('#ahAuthGate [data-tilt]');
    if (!sc || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const parent = sc.closest('.ah-scene, .ah-hero-slot') || sc;
    const apply = (x, y) => {
      const r = parent.getBoundingClientRect();
      const px = (x - r.left) / Math.max(1, r.width) - 0.5;
      const py = (y - r.top) / Math.max(1, r.height) - 0.5;
      sc.style.transform = `rotateX(${(-py * 10).toFixed(2)}deg) rotateY(${(px * 12).toFixed(2)}deg)`;
    };
    parent.addEventListener('pointermove', e => apply(e.clientX, e.clientY));
    parent.addEventListener('pointerleave', () => { sc.style.transform = ''; });
  }

  function setupOtpInputs() {
    const box = document.getElementById('ahOtp'); if (!box) return;
    const ins = [...box.querySelectorAll('input')];
    ins[0] && ins[0].focus();
    ins.forEach((inp, i) => {
      inp.addEventListener('input', e => {
        const v = e.target.value.replace(/\D/g, '').slice(-1);
        e.target.value = v;
        if (v && ins[i + 1]) ins[i + 1].focus();
        if (ins.every(x => x.value) && ins.length === 6) doVerify();
      });
      inp.addEventListener('keydown', e => {
        if (e.key === 'Backspace' && !inp.value && ins[i - 1]) ins[i - 1].focus();
      });
      inp.addEventListener('paste', e => {
        const t = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
        if (!t) return;
        e.preventDefault();
        t.split('').forEach((ch, n) => { if (ins[n]) ins[n].value = ch; });
        ins[Math.min(t.length, 5)].focus();
      });
    });
  }
  function readOtp() {
    const box = document.getElementById('ahOtp'); if (!box) return '';
    return [...box.querySelectorAll('input')].map(i => i.value).join('');
  }
  function fmtClock(n) {
    n = Math.max(0, Number(n) || 0);
    const m = String(Math.floor(n / 60)).padStart(2, '0');
    const s = String(n % 60).padStart(2, '0');
    return m + ':' + s;
  }
  function startLinkCountdown() {
    const el = document.getElementById('ahCount');
    if (!el) return;
    clearInterval(otpTimer);
    let n = Number(draft.linkSec || draft.wait || 900);
    el.textContent = fmtClock(n);
    const btn = document.getElementById('ahResendLink') || document.getElementById('ahResend');
    if (btn) btn.disabled = true;
    otpTimer = setInterval(() => {
      n -= 1;
      const clock = document.getElementById('ahCount');
      if (clock) clock.textContent = fmtClock(n);
      const sec = document.getElementById('ahSec');
      if (sec) sec.textContent = String(Math.max(0, n));
      if (n <= 0) {
        clearInterval(otpTimer);
        const w = document.getElementById('ahOtpWait'); if (w) w.style.display = 'none';
        const r = document.getElementById('ahResendLink') || document.getElementById('ahResend');
        if (r) { r.disabled = false; r.style.display = 'flex'; }
        if (document.getElementById('ahWaitNote')) showErr('ahErr', t('linkExpired'));
      }
    }, 1000);
  }
  function startOtpCountdown() {
    if (document.getElementById('ahCount')) return;
    const sec = document.getElementById('ahSec');
    if (!sec) return;
    clearInterval(otpTimer);
    let n = Number(draft.wait || 120);
    otpTimer = setInterval(() => {
      n -= 1;
      if (sec) sec.textContent = String(Math.max(0, n));
      if (n <= 0) {
        clearInterval(otpTimer);
        const w = document.getElementById('ahOtpWait'); if (w) w.style.display = 'none';
        const r = document.getElementById('ahResend'); if (r) { r.disabled = false; r.style.display = 'flex'; }
      }
    }, 1000);
  }

  async function doLogin() {
    try {
      draft.id = document.getElementById('ahId').value.trim();
      const password = document.getElementById('ahPass').value;
      if (!draft.id || !password) return showErr('ahErr', 'ইমেইল/মোবাইল ও পাসওয়ার্ড লাগবে');
      document.getElementById('ahDoLogin')?.classList.add('ah-busy');
      const data = await api('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: draft.id, password }) });
      await afterAuth(data);
    } catch (e) { showErr('ahErr', authFriendly(e)); }
  }
  async function doLoginOtp() {
    try {
      draft.id = document.getElementById('ahId').value.trim();
      draft.purpose = 'login';
      const data = await api('/auth/otp/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: draft.id, purpose: 'login' }) });
      draft.masked = data.masked; draft.wait = data.wait || 900;
      go('otp');
    } catch (e) { showErr('ahErr', authFriendly(e)); }
  }
  function grabProfile() {
    const n = document.getElementById('ahName');
    const d = document.getElementById('ahDob');
    const s = document.getElementById('ahSchool');
    const c = document.getElementById('ahCollege');
    const p = document.getElementById('ahPass');
    const p2 = document.getElementById('ahPass2');
    if (n) draft.name = n.value.trim();
    if (d) draft.dob = d.value;
    if (s) draft.school = s.value.trim();
    if (c) draft.college = c.value.trim();
    if (p) draft.password = p.value;
    if (p2) draft.confirm = p2.value;
  }
  function doContinueProfile() {
    grabProfile();
    if (!draft.name || draft.name.length < 2) return showErr('ahErr', lang==='bn'?'পূর্ণ নাম লিখুন':'Enter your full name');
    if (!draft.dob) return showErr('ahErr', lang==='bn'?'জন্ম তারিখ দিন':'Enter date of birth');
    const pass = String(draft.password || '');
    const conf = String(draft.confirm || '');
    if (pass.length < 8) return showErr('ahErr', lang==='bn'?'পাসওয়ার্ড কমপক্ষে ৮ অক্ষর':'Password must be at least 8 characters');
    if (!/[A-Za-z]/.test(pass) || !/\d/.test(pass)) return showErr('ahErr', lang==='bn'?'পাসওয়ার্ডে অক্ষর ও সংখ্যা উভয়ই থাকতে হবে':'Password needs letters and numbers');
    if (pass !== conf) return showErr('ahErr', lang==='bn'?'পাসওয়ার্ড দুটি মিলছে না':'Passwords do not match');
    go('verify');
  }
  async function doSignup() {
    const btn = document.getElementById('ahDoSignup');
    const prev = btn ? btn.innerHTML : '';
    try {
      draft.id = (document.getElementById('ahId') && document.getElementById('ahId').value.trim()) || draft.id;
      if (!draft.id) return showErr('ahErr', lang==='bn'?'ইমেইল লিখুন':'Enter your email');
      draft.purpose = 'signup';
      if (btn) { btn.classList.add('ah-busy'); btn.disabled = true; btn.innerHTML = '<i class="ah-spin"></i>' + t('processing'); }
      const data = await api('/auth/register-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: draft.name, id: draft.id, dob: draft.dob, school: draft.school, college: draft.college, password: draft.password, confirm: draft.confirm }) });
      draft.masked = data.masked;
      draft.waitId = data.waitId || '';
      draft.wait = Number(data.wait || 120);
      draft.linkSec = Number(data.expiresIn || 120);
      persistWait();
      go('otp');
    } catch (e) {
      if (btn) { btn.classList.remove('ah-busy'); btn.disabled = false; btn.innerHTML = prev || t('sendLink'); }
      const m = String((e && e.message) || e || '');
      if (/আগেই আছে|ইতিমধ্যে|already exists/i.test(m)) {
        // এটা ভুল বার্তা নয় — এই ইমেইল আগে থেকেই registered। ইউজারকে সরাসরি লগইন স্ক্রিনে নিয়ে যাও।
        draft.id = (document.getElementById('ahId') && document.getElementById('ahId').value.trim()) || draft.id;
        setGate(true);
        go('login');
        const box = document.getElementById('ahErr');
        if (box) box.textContent = lang==='bn'
          ? 'এই ইমেইল দিয়ে আগেই অ্যাকাউন্ট খোলা হয়েছে — নিচে পাসওয়ার্ড দিয়ে লগইন করো। পাসওয়ার্ড ভুলে গেলে "পাসওয়ার্ড ভুলে গেছেন?" চাপো।'
          : 'An account already exists for this email — sign in below. Forgot your password? Use "Forgot password?".';
      } else {
        showErr('ahErr', authFriendly(e));
      }
    }
  }
  async function resendVerifyLink() {
    const btn = document.getElementById('ahResendLink');
    const prev = btn ? btn.innerHTML : '';
    try {
      if (btn) { btn.classList.add('ah-busy'); btn.disabled = true; btn.innerHTML = '<i class="ah-spin"></i>' + t('processing'); }
      const data = await api('/auth/register-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: draft.name, id: draft.id, dob: draft.dob, school: draft.school, college: draft.college, password: draft.password, confirm: draft.confirm }) });
      draft.masked = data.masked || draft.masked;
      draft.waitId = data.waitId || '';
      draft.wait = Number(data.wait || 120);
      draft.linkSec = Number(data.expiresIn || 120);
      persistWait();
      go('otp');
    } catch (e) {
      if (btn) { btn.classList.remove('ah-busy'); btn.disabled = false; btn.innerHTML = prev || t('resendLink'); }
      showErr('ahErr', authFriendly(e));
    }
  }
  function persistWait() {
    try {
      sessionStorage.setItem('ahWait', JSON.stringify({
        waitId: draft.waitId, id: draft.id, masked: draft.masked, name: draft.name,
        dob: draft.dob, school: draft.school, college: draft.college,
        password: draft.password, confirm: draft.confirm,
        until: Date.now() + (draft.linkSec || 120) * 1000
      }));
      // Same-browser marker: persists across tabs so the verify link can detect
      // "same browser" and skip the return-to-device message.
      if (draft.waitId) localStorage.setItem('ahWaitId', draft.waitId);
    } catch (_) {}
  }
  function readWait() {
    try {
      const o = JSON.parse(sessionStorage.getItem('ahWait') || 'null');
      if (!o || o.until < Date.now()) return null;
      return o;
    } catch (_) { return null; }
  }
  function clearWait() { try { sessionStorage.removeItem('ahWait'); } catch (_) {} }
  async function pollWait(waitId) {
    const n = ++waitPoll;
    const poke = async () => {
      if (n !== waitPoll) return true;
      if (!document.getElementById('ahWaitNote') && view !== 'checkmail') return true;
      try {
        const data = await api('/auth/wait', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ waitId: waitId || draft.waitId, id: draft.id }) });
        if (data && data.token) { clearWait(); await afterAuth(data); return true; }
      } catch (_) {}
      return false;
    };
    if (await poke()) return;
    const onVis = () => { if (!document.hidden) poke(); };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pageshow', onVis);
    window.addEventListener('focus', onVis);
    try {
      while (n === waitPoll) {
        await new Promise(r => setTimeout(r, document.hidden ? 1500 : 800));
        if (n !== waitPoll) return;
        if (await poke()) return;
      }
    } finally {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pageshow', onVis);
      window.removeEventListener('focus', onVis);
    }
  }
  async function doVerify() {
    try {
      const code = readOtp();
      if (code.length !== 6) return showErr('ahErr', lang==='bn'?'ছয় অঙ্কের কোড লিখুন':'Enter the six-digit code');
      if (draft.purpose === 'reset') {
        await api('/auth/otp/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: draft.id, code, purpose: 'reset' }) });
        go('reset');
        return;
      }
      const data = await api('/auth/otp/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: draft.id, code, purpose: draft.purpose, name: draft.name }) });
      setSession(data.token, data.user);
      go('ok');
    } catch (e) { showErr('ahErr', authFriendly(e)); }
  }
  async function resendOtp() {
    try {
      const data = await api('/auth/otp/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: draft.id, purpose: draft.purpose }) });
      draft.wait = data.wait || 900;
      go('otp');
    } catch (e) { showErr('ahErr', authFriendly(e)); }
  }
  async function doForgot() {
    const btn = document.getElementById('ahDoForgot');
    const prev = btn ? btn.innerHTML : '';
    try {
      draft.id = document.getElementById('ahId').value.trim();
      if (!draft.id) return showErr('ahErr', lang==='bn'?'নিবন্ধিত ইমেইল লিখুন':'Enter your registered email');
      draft.purpose = 'reset';
      if (btn) { btn.classList.add('ah-busy'); btn.disabled = true; btn.innerHTML = '<i class="ah-spin"></i>' + t('processing'); }
      const data = await api('/auth/forgot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: draft.id }) });
      draft.masked = data.masked; draft.wait = data.wait || data.expiresIn || 900; draft.linkSec = draft.wait;
      go('otp');
    } catch (e) {
      if (btn) { btn.classList.remove('ah-busy'); btn.disabled = false; btn.innerHTML = prev || t('sendCode'); }
      showErr('ahErr', authFriendly(e));
    }
  }
  async function doReset() {
    try {
      const password = document.getElementById('ahPass').value;
      const confirm = document.getElementById('ahPass2').value;
      const data = await api('/auth/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: draft.id, password, confirm }) });
      if (data.token) setSession(data.token, data.user);
      go('resetOk');
    } catch (e) { showErr('ahErr', authFriendly(e)); }
  }


  function b64urlToBuf(s) {
    s = String(s || '').replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    const bin = atob(s);
    const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u.buffer;
  }
  function bufToB64url(buf) {
    const u = new Uint8Array(buf);
    let s = '';
    for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }
  async function doPasskeyRegister() {
    try {
      if (!window.PublicKeyCredential) return showErr('ahErr', 'এই ডিভাইসে Passkey নেই');
      const begin = await api('/auth/passkey/register/begin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const opt = begin.options;
      opt.challenge = b64urlToBuf(opt.challenge);
      opt.user.id = b64urlToBuf(opt.user.id);
      const cred = await navigator.credentials.create({ publicKey: opt });
      const att = cred.response;
      const data = await api('/auth/passkey/register/finish', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chalId: begin.chalId,
          id: cred.id,
          rawId: bufToB64url(cred.rawId),
          clientDataJSON: bufToB64url(att.clientDataJSON),
          attestationObject: bufToB64url(att.attestationObject),
          publicKey: att.getPublicKey ? bufToB64url(att.getPublicKey()) : '',
          publicKeyAlgorithm: att.getPublicKeyAlgorithm ? att.getPublicKeyAlgorithm() : -7,
          name: draft.name, dob: draft.dob, school: draft.school, college: draft.college, password: draft.password, confirm: draft.confirm
        })
      });
      await afterAuth(data);
    } catch (e) {
      const m = String((e && e.message) || '');
      if (e && e.name === 'NotFoundError') showErr('ahErr', lang === 'bn' ? 'এই ডিভাইসে পাসকি সেটআপ করা যায়নি — ফেসআইডি/টাচআইডি থাকলে চেষ্টা করো, নয়তো ইমেইল দিয়ে যাও' : 'Could not create a passkey on this device — try Face/Touch ID, or use email');
      else if (e && e.name === 'NotAllowedError') showErr('ahErr', 'Passkey বাতিল — আবার চেষ্টা করো');
      else if (/Failed to fetch|NetworkError|network/i.test(m)) showErr('ahErr', lang === 'bn' ? 'ইন্টারনেট সংযোগ নেই — আবার চেষ্টা করো' : 'No internet connection — try again');
      else showErr('ahErr', (e && e.message) || 'Passkey ব্যর্থ');
    }
  }
  async function doPasskeyLogin() {
    try {
      if (!window.PublicKeyCredential) return showErr('ahErr', 'এই ডিভাইসে Passkey নেই');
      const begin = await api('/auth/passkey/login/begin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const opt = begin.options;
      opt.challenge = b64urlToBuf(opt.challenge);
      const cred = await navigator.credentials.get({ publicKey: opt });
      const as = cred.response;
      const data = await api('/auth/passkey/login/finish', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chalId: begin.chalId,
          id: cred.id,
          rawId: bufToB64url(cred.rawId),
          clientDataJSON: bufToB64url(as.clientDataJSON),
          authenticatorData: bufToB64url(as.authenticatorData),
          signature: bufToB64url(as.signature),
          userHandle: as.userHandle ? bufToB64url(as.userHandle) : ''
        })
      });
      await afterAuth(data);
    } catch (e) {
      showErr('ahErr', e.name === 'NotAllowedError' ? 'Passkey বাতিল' : (e.message || 'Passkey ব্যর্থ'));
    }
  }

  function googleBody(extra) {
    return JSON.stringify(Object.assign({ name: draft.name, dob: draft.dob, school: draft.school, college: draft.college }, extra));
  }
  async function finishGoogle(extra) {
    const data = await api('/auth/google', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: googleBody(extra) });
    await afterAuth(data);
  }
  function mountGoogle() {
    if (cfg.googleClientId) loadGis().catch(() => {});
  }
  let gisPromise = null;
    function loadGis() {
      if (window.google && window.google.accounts && window.google.accounts.oauth2) return Promise.resolve();
      if (gisPromise) return gisPromise;
      gisPromise = new Promise((resolve, reject) => {
        const existing = document.querySelector('script[data-ah-google-identity]');
        if (existing) {
          existing.addEventListener('load', () => resolve(), { once: true });
          existing.addEventListener('error', () => { gisPromise = null; reject(new Error('Google লোড হয়নি')); }, { once: true });
          return;
        }
        const s = document.createElement('script');
        s.src = 'https://accounts.google.com/gsi/client';
        s.async = true;
        s.defer = true;
        s.dataset.ahGoogleIdentity = '1';
        s.onload = () => resolve();
        s.onerror = () => { gisPromise = null; reject(new Error('Google লোড হয়নি')); };
        document.head.appendChild(s);
      });
      return gisPromise;
    }
    async function loadAuthConfig() {
      const next = await api('/auth/config', { cache: 'no-store' });
      if (!next || typeof next !== 'object') throw new Error('auth-config-invalid');
      cfg = next;
      window.AH_AUTH_CONFIG = cfg;
      return cfg;
    }

      function startGooglePicker() {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: cfg.googleClientId,
      scope: 'openid email profile',
      prompt: 'select_account',
      callback: async (resp) => {
        if (!resp || resp.error || !resp.access_token) {
          showErr('ahErr', lang === 'bn' ? 'গুগল লগইন বাতিল হয়েছে' : 'Google sign-in cancelled');
          return;
        }
        try { await finishGoogle({ accessToken: resp.access_token }); }
        catch (e) { showErr('ahErr', authFriendly(e)); }
      }
    });
    client.requestAccessToken({ prompt: 'select_account' });
  }
  async function doGoogle() {
      const btn = document.getElementById('ahGoogle');
      const prev = btn ? btn.innerHTML : '';
      try {
        if (btn) { btn.classList.add('ah-busy'); btn.disabled = true; btn.innerHTML = '<i class="ah-spin"></i>' + (lang === 'bn' ? 'গুগল প্রস্তুত হচ্ছে…' : 'Loading Google…'); }
        let liveCfg = null;
        try { liveCfg = await loadAuthConfig(); } catch (_) {}
        if (liveCfg && liveCfg.googleClientId) {
          cfg = liveCfg;
        } else {
          // config-এ client_id না পেলে built-in fallback — নেটওয়ার্ক দুর্বল হলেও গুগল কাজ করবেই
          cfg = Object.assign({}, cfg, { google: true, googleClientId: '673030739375-i91ini3ianip5sa88qemhjcao2hl3e3s.apps.googleusercontent.com' });
        }
        await loadGis();
        startGooglePicker();
      } catch (e) {
        const msg = networkFailure(e) ? (lang === 'bn' ? 'গুগল সংযোগ পাওয়া যাচ্ছে না। ইন্টারনেট ঠিক করে আবার চেষ্টা করুন, অথবা ইমেইল দিয়ে ঢুকুন।' : 'Google could not be reached. Check your connection or use email sign-in.') : (authFriendly(e) || (lang === 'bn' ? 'গুগল লগইন ব্যর্থ হয়েছে' : 'Google login failed'));
        showErr('ahErr', msg);
      } finally {
        if (btn) { btn.classList.remove('ah-busy'); btn.disabled = false; if (prev) btn.innerHTML = prev; }
      }
    }

      async function afterAuth(data) {
    clearWait();
    setSession(data.token, data.user);
    await enterApp();
  }

  async function enterApp() {
    setGate(false);
    try { await pullState(); } catch (_) {}
    try { if (window.AdmissionCloudContent) await AdmissionCloudContent.pull(); } catch (_) {}
    try { await pushState(); } catch (_) {}
    if (window.AHOnboard && typeof AHOnboard.maybeStart === 'function') {
      const onb = await AHOnboard.maybeStart();
      if (onb) return;
    }
    if (typeof navigate === 'function') navigate('dashboard');
    else if (typeof render === 'function') render();
  }

  async function logout() {
    try { if (token()) await api('/auth/logout', { method: 'POST', headers: authH() }); } catch (_) {}
    setSession('', null);
    enterGuest();
    toast(lang === 'bn' ? 'লগআউট হয়েছে — তোমার ডেটা এই ডিভাইসে নিরাপদ আছে' : 'Signed out — your data stays safe on this device');
  }

  function routePath() {
    return String((window.Router && Router.path) || location.hash.replace(/^#\/?/, '').split('?')[0] || 'dashboard');
  }
  function wrapRender() {
    const cur = window.render;
    if (!cur || cur.__ahAuthWrap) return;
    const wrapped = function () {
      if (document.documentElement.dataset.ah === 'out') return;
      const p = routePath();
      if (p === 'profile' || p.startsWith('profile/')) return renderProfileRoute();
      return cur.apply(this, arguments);
    };
    wrapped.__ahAuthWrap = true;
    window.render = wrapped;
  }

  function injectAvatar() {
    const paint = () => {
      if (document.documentElement.dataset.ah === 'out') return;
      const u = user() || {};
      document.querySelectorAll('#navRoot .navbtn').forEach(b => {
        const spans = b.querySelectorAll('span');
        const label = spans.length ? (spans[spans.length - 1].textContent || '') : '';
        const ic = b.querySelector('.ic');
        if (label === 'Profile' && ic) {
          const s = 21;
          if (u.photo) ic.innerHTML = `<img src="${u.photo}" style="width:${s}px;height:${s}px;border-radius:50%;object-fit:cover;vertical-align:-6px;border:1.5px solid var(--emerald)">`;
          else ic.innerHTML = u.name
            ? `<span class="ah-navmono" style="width:${s}px;height:${s}px;display:inline-grid;place-items:center;border-radius:50%;background:var(--emerald);color:#fff;font-size:${Math.round(s * 0.5)}px;font-weight:800;vertical-align:-6px;margin:0 auto">${esc(String(u.name).trim().charAt(0).toUpperCase())}</span>`
            : `<span style="width:${s}px;height:${s}px;display:inline-grid;place-items:center;border-radius:50%;background:linear-gradient(145deg,#cfe9dd,#9fd4bd);color:#14533d;font-size:12px;vertical-align:-6px;margin:0 auto;box-shadow:inset 0 0 0 1.5px rgba(20,83,61,.25)">👤</span>`;
        }
      });
    };
    if (document.readyState !== 'loading') setTimeout(paint, 60);
    document.addEventListener('admission:route-rendered', paint);
  }

  function completion(u) {
    const keys = ['name', 'email', 'mobile', 'photo', 'institution', 'targetUniversity', 'targetUnit', 'admissionYear', 'bio', 'dob'];
    const n = keys.filter(k => u && String(u[k] || '').trim()).length;
    return Math.round(n / keys.length * 100);
  }

  /* ═══════════ PREMIUM PROFILE SYSTEM (blueprint A–Z) ═══════════ */
  function profTime(ts) {
    if (!ts) return '—';
    const d = new Date(ts), now = new Date();
    const diff = now - d;
    if (diff < 60000) return 'এইমাত্র';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' মিনিট আগে';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' ঘণ্টা আগে';
    if (diff < 604800000) return Math.floor(diff / 86400000) + ' দিন আগে';
    return d.toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function goalLabel(g) {
    return ({ uni: 'বিশ্ববিদ্যালয় ভর্তি', hsc: 'HSC / আলিম', ssc: 'SSC / দাখিল', bcs: 'বিসিএস / চাকরি' })[g] || '';
  }
  function aimLabel(s) {
    return ({ top: 'টপ র‍্যাংক', good: 'ভালো প্রস্তুতি', fast: 'স্মার্ট ও ফাস্ট' })[s] || '';
  }
  function computeAchievements(stats, streak) {
    const tq = (stats && stats.totalQuestions) || 0, ex = (stats && stats.exams) || 0, ba = (stats && stats.bestAcc) || 0;
    return [
      { id: 'first', icon: '🎯', t: 'প্রথম পরীক্ষা', d: 'একটি পরীক্ষা সম্পন্ন করো', done: ex >= 1, p: Math.min(1, ex / 1), cur: ex, goal: 1 },
      { id: 'q100', icon: '📚', t: '১০০ প্রশ্ন', d: 'মোট ১০০ প্রশ্নের সমাধান', done: tq >= 100, p: Math.min(1, tq / 100), cur: tq, goal: 100 },
      { id: 'q1000', icon: '📚', t: '১০০০ প্রশ্ন', d: 'মোট ১০০০ প্রশ্নের সমাধান', done: tq >= 1000, p: Math.min(1, tq / 1000), cur: tq, goal: 1000 },
      { id: 'ex10', icon: '📝', t: '১০টি পরীক্ষা', d: '১০টি পরীক্ষা সম্পন্ন করো', done: ex >= 10, p: Math.min(1, ex / 10), cur: ex, goal: 10 },
      { id: 's7', icon: '🔥', t: '৭ দিনের ধারা', d: 'টানা ৭ দিন প্রস্তুতি', done: streak >= 7, p: Math.min(1, streak / 7), cur: streak, goal: 7 },
      { id: 's30', icon: '🏆', t: '৩০ দিনের ধারা', d: 'টানা ৩০ দিন প্রস্তুতি', done: streak >= 30, p: Math.min(1, streak / 30), cur: streak, goal: 30 },
      { id: 'pb', icon: '⭐', t: 'ব্যক্তিগত সেরা', d: 'এক পরীক্ষায় ৯০%+ নির্ভুলতা', done: ba >= 90, p: Math.min(1, ba / 90), cur: Math.round(ba), goal: 90 }
    ];
  }
  function prepPercent(u, stats) {
    const tq = (stats && stats.totalQuestions) || 0, ex = (stats && stats.exams) || 0;
    const academic = (u && u.onboardingCompleted) ? 40 : 0;
    const q = Math.round(30 * Math.min(1, tq / 1000));
    const e = Math.round(30 * Math.min(1, ex / 10));
    return { pct: Math.min(100, academic + q + e), academic, q, e };
  }
  function profAvatar(u, size, cls) {
    const monogram = esc(String(u.name || 'S').trim().charAt(0).toUpperCase());
    return u.photo
      ? `<img class="ah-pf-av ${cls || ''}" src="${u.photo}" alt="" style="width:${size}px;height:${size}px">`
      : `<div class="ah-pf-av ah-pf-mono ${cls || ''}" style="width:${size}px;height:${size}px;font-size:${Math.round(size * 0.42)}px">${monogram}</div>`;
  }
  function secRow(icon, label, sub, status, href, act) {
    const stHtml = status === true ? '<span class="ah-pf-ok">● সুরক্ষিত</span>' : (status === false ? '<span class="ah-pf-warn">● প্রয়োজন</span>' : `<span class="muted">${status || ''}</span>`);
    return `<div class="ah-pf-row" onclick="${href ? `navigate('${href}')` : (act || '')}">
      <span class="ah-pf-ri">${icon}</span>
      <span class="ah-pf-rt"><b>${label}</b><i>${sub || ''}</i></span>
      <span class="ah-pf-rv">${stHtml}</span>
      <span class="ah-pf-chev">›</span>
    </div>`;
  }
  function shellProfile(html, opts) {
    if (typeof renderShell === 'function') renderShell(html, Object.assign({ title: 'Profile', back: "navigate('dashboard')" }, opts || {}));
  }
  function passField(id, ph) {
    return `<div class="ah-field"><input class="ah-inp" id="${id}" type="password" placeholder="${ph}" autocomplete="new-password"><button class="ah-eye" type="button" data-eye="${id}" aria-label="Show password">👁</button></div>`;
  }

  function renderProfile() {
    const u = user() || {};
    const stats = (typeof computeLifetimeStats === 'function') ? computeLifetimeStats() : { exams: 0, totalQuestions: 0, attempted: 0, accuracy: 0, bestAcc: 0, correct: 0 };
    const streak = (typeof computeStreak === 'function') ? computeStreak() : 0;
    const ach = computeAchievements(stats, streak);
    const doneAch = ach.filter(a => a.done).length;
    const prep = prepPercent(u, stats);
    const providers = u.providers || [];
    const hasPw = providers.includes('password') || providers.includes('email') || (!providers.length && !!u.email);
    const hasPk = providers.includes('passkey');
    const hasG = providers.includes('google');
    const onb = !!(u.onboardingCompleted);
    const uniGoal = u.goal === 'uni' ? (u.targetUniversity || 'বিশ্ববিদ্যালয়') : (goalLabel(u.goal) || 'প্রস্তুতি লক্ষ্য');
    const goalChip = onb ? uniGoal : '<span class="ah-pf-chip ghost" onclick="navigate(\'profile/academic\')">🎯 লক্ষ্য ঠিক করো</span>';
    const memberSince = u.created ? new Date(u.created).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
    const accId = String(u.uid || u.id || '');
    const accShort = accId.length > 20 ? accId.slice(0, 5) + '…' + accId.slice(-4) : accId;
    const html = `<div class="ah-pf">
      <div class="ah-pf-hero">
        <div class="ah-pf-orb" aria-hidden="true"></div>
        <div class="ah-pf-orb o2" aria-hidden="true"></div>
        <div class="ah-pf-avatar">
          <span class="ah-pf-ring" aria-hidden="true"></span>
          <span class="ah-pf-ring r2" aria-hidden="true"></span>
          ${profAvatar(u, 92)}
        </div>
        <div class="ah-pf-name">${esc(u.name || 'Scholar')} ${u.verified ? '<span class="ah-pf-vbadge" title="যাচাইকৃত">✓</span>' : ''}</div>
        <div class="ah-pf-tag">${esc(u.bio || (lang === 'bn' ? 'স্বপ্ন দেখো, বড় কিছু অর্জন করো' : 'Dream big, achieve bigger'))}</div>
        <div class="ah-pf-goal">${goalChip}</div>
        <div class="ah-pf-meta"><span>সদস্য ${memberSince}</span><span class="dot">·</span><span>Account ID: <b>${esc(accShort)}</b></span></div>
      </div>

      <div class="ah-pf-body">
        <section class="ah-pf-sec" id="pfAcademicSlot">
          <div class="ah-pf-sec-h"><h2>একাডেমিক প্রোফাইল</h2><button class="ah-pf-linkbtn" onclick="navigate('profile/academic')">বিস্তারিত ›</button></div>
          <div class="ah-pf-acad">
            ${onb ? `<div class="ah-pf-acad-grid">
              <div class="ah-pf-acad-i"><span class="ic">🎯</span><div><b>লক্ষ্য</b><i>${esc(goalLabel(u.goal) || u.goal || 'বিশ্ববিদ্যালয় ভর্তি')}</i></div></div>
              <div class="ah-pf-acad-i"><span class="ic">🏛</span><div><b>বিশ্ববিদ্যালয়</b><i>${esc(u.targetUniversity || '—')}</i></div></div>
              <div class="ah-pf-acad-i"><span class="ic">📋</span><div><b>ইউনিট</b><i>${esc(String(u.targetUnit || '').split(',').filter(Boolean).join(' · ') || '—')}</i></div></div>
              <div class="ah-pf-acad-i"><span class="ic">🎯</span><div><b>প্রস্তুতির লক্ষ্য</b><i>${esc(aimLabel(u.studyGoal) || u.studyGoal || '—')}</i></div></div>
            </div>
            <div class="ah-pf-acad-lv"><b>প্রস্তুতি স্তর</b><div class="ah-pf-bar"><i style="width:${Math.max(4, Math.min(100, Number(u.currentLevel) || 0))}%"></i></div><span>${Number(u.currentLevel) || 0}%</span></div>`
            : `<div class="ah-pf-empty"><span class="ic">🎓</span><b>একাডেমিক প্রোফাইল এখনো তৈরি হয়নি</b><p>তোমার লক্ষ্য, পছন্দের বিশ্ববিদ্যালয় ও ইউনিট জানালে প্রস্তুতির রোডম্যাপ তৈরি হবে।</p><button class="ah-pf-cta" onclick="navigate('profile/academic')">Start Preparing →</button></div>`}
          </div>
        </section>

        <section class="ah-pf-sec">
          <div class="ah-pf-sec-h"><h2>স্ন্যাপশট</h2><span class="ah-pf-live">লাইভ</span></div>
          <div class="ah-pf-snap">
            <div class="t"><b>${stats.exams}</b><span>পরীক্ষা</span></div>
            <div class="t"><b>${(stats.totalQuestions || 0).toLocaleString('bn-BD')}</b><span>প্রশ্ন</span></div>
            <div class="t"><b>${(stats.accuracy || 0)}%</b><span>নির্ভুলতা</span></div>
            <div class="t"><b>${streak}</b><span>দিনের ধারা</span></div>
          </div>
        </section>

        <section class="ah-pf-sec">
          <div class="ah-pf-sec-h"><h2>প্রস্তুতি অগ্রগতি</h2></div>
          <div class="ah-pf-prep">
            <div class="ah-pf-ringwrap">
              <svg viewBox="0 0 120 120" class="ah-pf-ringsvg">
                <circle class="bg" cx="60" cy="60" r="52"/>
                <circle class="fg" cx="60" cy="60" r="52" style="stroke-dasharray:${2 * Math.PI * 52 * (prep.pct / 100)} ${2 * Math.PI * 52}"/>
              </svg>
              <div class="ah-pf-ringnum"><b>${prep.pct}%</b><span>প্রস্তুত</span></div>
            </div>
            <div class="ah-pf-prep-side">
              <div class="li"><span>একাডেমিক</span><div class="ah-pf-bar"><i style="width:${prep.academic}%"></i></div><b>${prep.academic}%</b></div>
              <div class="li"><span>প্রশ্ন সমাধান</span><div class="ah-pf-bar"><i style="width:${prep.q}%"></i></div><b>${prep.q}%</b></div>
              <div class="li"><span>পরীক্ষা</span><div class="ah-pf-bar"><i style="width:${prep.e}%"></i></div><b>${prep.e}%</b></div>
              <div class="muted" style="font-size:11.5px;line-height:1.5;margin-top:8px">আসল অগ্রগতি ডেটা থেকে হিসাব করা। একাডেমিক ৪০% · প্রশ্ন ৩০% · পরীক্ষা ৩০%।</div>
            </div>
          </div>
        </section>

        <section class="ah-pf-sec">
          <div class="ah-pf-sec-h"><h2>অর্জন</h2><span class="ah-pf-count">${doneAch}/${ach.length}</span></div>
          <div class="ah-pf-ach">
            ${ach.map(a => `
              <div class="ah-pf-achi ${a.done ? 'done' : 'lock'}">
                <span class="ic">${a.icon}</span>
                <b>${a.t}</b>
                <i>${a.done ? a.d : (Math.min(a.cur, a.goal).toLocaleString('bn-BD') + ' / ' + a.goal.toLocaleString('bn-BD'))}</i>
                ${a.done ? '<em>✓ অর্জিত</em>' : `<div class="ah-pf-bar"><i style="width:${Math.max(3, Math.round(a.p * 100))}%"></i></div>`}
              </div>`).join('')}
          </div>
        </section>

        <section class="ah-pf-sec">
          <div class="ah-pf-sec-h"><h2>সিকিউরিটি সেন্টার</h2><button class="ah-pf-linkbtn" onclick="navigate('profile/security')">সব ›</button></div>
          <div class="ah-pf-card">
            ${secRow('🔑', 'পাসওয়ার্ড', hasPw ? 'সেট করা আছে' : 'সেট করা নেই', hasPw, 'profile/security/password')}
            ${secRow('🪪', 'পাসকি (Passkey)', hasPk ? 'এই ডিভাইসে যুক্ত' : 'যুক্ত করা যায়', hasPk, 'profile/security/passkeys')}
            ${secRow('🔗', 'গুগল অ্যাকাউন্ট', hasG ? (u.email || 'যুক্ত') : 'সংযোগ করা যায়', hasG, 'profile/security/google')}
            ${secRow('✉️', 'ইমেইল', u.email || '—', !!u.emailVerified, 'profile/edit')}
            ${secRow('📱', 'মোবাইল', u.mobile || '—', !!u.mobileVerified, 'profile/edit')}
            <button class="ah-pf-securebtn" onclick="AHProf.secureNow()">🛡 Secure My Account</button>
          </div>
        </section>

        <section class="ah-pf-sec">
          <div class="ah-pf-sec-h"><h2>ডিভাইস ও সেশন</h2><button class="ah-pf-linkbtn" onclick="navigate('profile/devices')">সব ›</button></div>
          <div class="ah-pf-card" id="pfDevicesSlot">
            <div class="ah-pf-row" onclick="navigate('profile/devices')">
              <span class="ah-pf-ri">📱</span>
              <span class="ah-pf-rt"><b>সক্রিয় সেশন</b><i>লোড হচ্ছে…</i></span>
              <span class="ah-pf-rv"><span class="muted">—</span></span>
              <span class="ah-pf-chev">›</span>
            </div>
          </div>
        </section>

        <section class="ah-pf-sec">
          <div class="ah-pf-sec-h"><h2>সাম্প্রতিক সিকিউরিটি অ্যাক্টিভিটি</h2><button class="ah-pf-linkbtn" onclick="navigate('profile/activity')">সব ›</button></div>
          <div class="ah-pf-card" id="pfActivitySlot">
            <div class="ah-pf-act-empty muted">লোড হচ্ছে…</div>
          </div>
        </section>

        <section class="ah-pf-sec">
          <div class="ah-pf-sec-h"><h2>পছন্দসমূহ</h2></div>
          <div class="ah-pf-card">
            <div class="ah-pf-row" onclick="navigate('profile/notifications')"><span class="ah-pf-ri">🔔</span><span class="ah-pf-rt"><b>নোটিফিকেশন</b><i>পড়াশোনা + সিকিউরিটি সতর্কতা</i></span><span class="ah-pf-chev">›</span></div>
            <div class="ah-pf-row" onclick="navigate('profile/appearance')"><span class="ah-pf-ri">🎨</span><span class="ah-pf-rt"><b>চেহারা (Appearance)</b><i>থিম, অ্যাকসেন্ট, ঘনত্ব</i></span><span class="ah-pf-chev">›</span></div>
            <div class="ah-pf-row" onclick="navigate('profile/language')"><span class="ah-pf-ri">🌐</span><span class="ah-pf-rt"><b>ভাষা</b><i>${lang === 'bn' ? 'বাংলা' : 'English'}</i></span><span class="ah-pf-chev">›</span></div>
          </div>
        </section>

        <section class="ah-pf-sec">
          <div class="ah-pf-sec-h"><h2>ডেটা ও গোপনীয়তা</h2></div>
          <div class="ah-pf-card">
            <div class="ah-pf-row" onclick="navigate('profile/data')"><span class="ah-pf-ri">📦</span><span class="ah-pf-rt"><b>ডেটা এক্সপোর্ট</b><i>সম্পূর্ণ কাঠামোবদ্ধ অনুলিপি</i></span><span class="ah-pf-chev">›</span></div>
            <div class="ah-pf-row danger" onclick="navigate('profile/delete')"><span class="ah-pf-ri">🗑</span><span class="ah-pf-rt"><b>অ্যাকাউন্ট মুছো</b><i>স্থায়ীভাবে ডেটা সরিয়ে ফেলা</i></span><span class="ah-pf-chev">›</span></div>
          </div>
        </section>

        <button class="ah-pf-logout" onclick="AHProf.logout()">লগ আউট</button>
        <div class="ah-pf-foot muted">Admission Hub · সংস্করণ ১২</div>
      </div>
    </div>`;
    shellProfile(html);
    loadProfileExtras();
  }

  async function loadProfileExtras() {
    try {
      const [onb, sess] = await Promise.all([
        api('/onboarding', { headers: authH() }).catch(() => null),
        api('/sessions', { headers: authH() }).catch(() => null)
      ]);
      if (onb && onb.onboarding) {
        const o = onb.onboarding;
        const slot = document.getElementById('pfAcademicSlot');
        if (slot && o.completed) {
          const weak = Array.isArray(o.weakSubjects) && o.weakSubjects.length ? o.weakSubjects.slice(0, 4).map(esc).join(' · ') : '';
          const unis = Array.isArray(o.targetUniversities) && o.targetUniversities.length ? esc(o.targetUniversities.join(', ')) : (user().targetUniversity ? esc(user().targetUniversity) : '');
          const units = Array.isArray(o.targetUnits) && o.targetUnits.length ? esc(o.targetUnits.join(' · ')) : '';
          const goal = o.goal ? esc(goalLabel(o.goal) || o.goal) : 'বিশ্ববিদ্যালয় ভর্তি';
          slot.querySelector('.ah-pf-acad').innerHTML =
            `<div class="ah-pf-acad-grid">
              <div class="ah-pf-acad-i"><span class="ic">🎯</span><div><b>লক্ষ্য</b><i>${goal}</i></div></div>
              <div class="ah-pf-acad-i"><span class="ic">🏛</span><div><b>বিশ্ববিদ্যালয়</b><i>${unis || '—'}</i></div></div>
              <div class="ah-pf-acad-i"><span class="ic">📋</span><div><b>ইউনিট</b><i>${units || '—'}</i></div></div>
              <div class="ah-pf-acad-i"><span class="ic">📖</span><div><b>দুর্বল বিষয়</b><i>${weak || '—'}</i></div></div>
            </div>
            <div class="ah-pf-acad-lv"><b>প্রস্তুতি স্তর</b><div class="ah-pf-bar"><i style="width:${Math.max(4, Math.min(100, Number(o.currentLevel) || 0))}%"></i></div><span>${Number(o.currentLevel) || 0}%</span></div>`;
        }
      }
      if (sess && Array.isArray(sess.sessions)) {
        const s = sess.sessions;
        const cur = s.find(x => x.current) || s[0];
        const slot = document.getElementById('pfDevicesSlot');
        if (slot) {
          const live = s.filter(x => x.live).length;
          slot.innerHTML = `<div class="ah-pf-row" onclick="navigate('profile/devices')">
            <span class="ah-pf-ri">${cur ? curIcon(cur) : '📱'}</span>
            <span class="ah-pf-rt"><b>${s.length}টি ডিভাইস</b><i>${cur ? (cur.browser + ' · ' + profTime(cur.lastSeen)) : ''}</i></span>
            <span class="ah-pf-rv"><span class="ah-pf-ok">● ${live} সক্রিয়</span></span>
            <span class="ah-pf-chev">›</span></div>`;
        }
      }
    } catch (_) {}
    try {
      const data = await api('/security/activity', { headers: authH() });
      const arr = Array.isArray(data.activity) ? data.activity : [];
      const slot = document.getElementById('pfActivitySlot');
      if (slot) {
        if (!arr.length) slot.innerHTML = '<div class="ah-pf-act-empty">এখনো কোনো সিকিউরিটি ইভেন্ট নেই</div>';
        else slot.innerHTML = arr.slice(0, 4).map(a => `<div class="ah-pf-act">
          <span class="dot"></span>
          <div><b>${esc(a.detail || a.type)}</b><i>${profTime(a.at)}</i></div>
        </div>`).join('');
      }
    } catch (_) {}
  }
  function curIcon(s) {
    if (s.mobile) return '📱';
    if (s.device === 'iPhone' || s.device === 'iPad') return '📱';
    if (s.device === 'Windows' || s.device === 'Mac' || s.device === 'Linux') return '💻';
    return '🖥';
  }

  /* ─────────── Edit profile ─────────── */
  function renderEdit() {
    const u = user() || {};
    const html = `<div class="ah-pf" style="padding:6px 0 30px">
      <div class="ah-pf-editav">
        <div class="ah-pf-avatar sm">${profAvatar(u, 84)}</div>
        <button class="ah-pf-linkbtn" onclick="AHProf.photo()">ছবি পরিবর্তন</button>
      </div>
      <label class="ah-pf-lab">পূর্ণ নাম</label><input class="ah-inp" id="pfName" value="${esc(u.name || '')}" autocomplete="name">
      <label class="ah-pf-lab">প্রদর্শন নাম</label><input class="ah-inp" id="pfDisplay" value="${esc(u.displayName || '')}" placeholder="ছোট নাম">
      <label class="ah-pf-lab">জন্ম তারিখ <span class="ah-pf-opt">(ঐচ্ছিক)</span></label><input class="ah-inp" id="pfDob" value="${esc(u.dob || '')}" placeholder="12 May 2003" inputmode="text">
      <label class="ah-pf-lab">বিদ্যালয় <span class="ah-pf-opt">(ঐচ্ছিক)</span></label><input class="ah-inp" id="pfSchool" value="${esc(u.institution || '')}" placeholder="বিদ্যালয়ের নাম">
      <label class="ah-pf-lab">কলেজ <span class="ah-pf-opt">(ঐচ্ছিক)</span></label><input class="ah-inp" id="pfCollege" value="${esc(u.institution || '')}" placeholder="কলেজের নাম">
      <label class="ah-pf-lab">সংক্ষিপ্ত পরিচিতি <span class="ah-pf-opt">(ঐচ্ছিক)</span></label><input class="ah-inp" id="pfBio" value="${esc(u.bio || '')}" maxlength="200">
      <label class="ah-pf-lab">ইমেইল <span class="ah-pf-locknote">🔒 পরিবর্তনে পাসওয়ার্ড লাগবে</span></label>
      <div class="ah-field"><input class="ah-inp" id="pfEmail" value="${esc(u.email || '')}" type="email" autocomplete="email">${u.emailVerified ? '<span class="ah-pf-verify-badge">✓</span>' : ''}</div>
      <label class="ah-pf-lab">মোবাইল <span class="ah-pf-locknote">🔒 পরিবর্তনে পাসওয়ার্ড লাগবে</span></label>
      <div class="ah-field"><input class="ah-inp" id="pfMobile" value="${esc(u.mobile || '')}" type="tel" autocomplete="tel">${u.mobileVerified ? '<span class="ah-pf-verify-badge">✓</span>' : ''}</div>
      <button class="ah-btn" id="pfSave">সংরক্ষণ করো</button>
    </div>`;
    shellProfile(html, { title: 'Edit Profile', back: "navigate('profile')" });
    document.getElementById('pfSave').addEventListener('click', AHProf.saveEdit);
  }
  async function saveEdit() {
    const g = id => document.getElementById(id);
    const email = g('pfEmail').value.trim();
    const mobile = g('pfMobile').value.trim();
    const base = {
      name: g('pfName').value.trim(),
      displayName: g('pfDisplay').value.trim(),
      dob: g('pfDob').value.trim(),
      institution: g('pfSchool').value.trim() || g('pfCollege').value.trim(),
      bio: g('pfBio').value.trim(),
      targetUniversity: (user() || {}).targetUniversity || '',
      targetUnit: (user() || {}).targetUnit || '',
      admissionYear: (user() || {}).admissionYear || ''
    };
    const emailChanged = email !== String((user() || {}).email || '').toLowerCase();
    const mobileChanged = mobile !== String((user() || {}).mobile || '');
    try {
      if (emailChanged || mobileChanged) {
        const pw = await reauthPrompt('পরিচিতি (ইমেইল/মোবাইল) পরিবর্তন নিশ্চিত করতে পাসওয়ার্ড দাও');
        if (pw === null) return;
        const data = await api('/profile', { method: 'PUT', headers: authH(), body: JSON.stringify(Object.assign({}, base, { email, mobile, password: pw })) });
        setSession(token(), data.user);
        toast('প্রোফাইল আপডেট হয়েছে');
        navigate('profile');
      } else {
        const data = await api('/profile', { method: 'PUT', headers: authH(), body: JSON.stringify(base) });
        setSession(token(), data.user);
        toast('প্রোফাইল আপডেট হয়েছে');
        navigate('profile');
      }
    } catch (e) { toast(e.message); }
  }

  /* ─────────── Security center ─────────── */
  function renderSecurity() {
    const u = user() || {};
    const providers = u.providers || [];
    const hasPw = providers.includes('password') || providers.includes('email') || (!providers.length && !!u.email);
    const hasPk = providers.includes('passkey');
    const hasG = providers.includes('google');
    const html = `<div class="ah-pf" style="padding:6px 0 30px">
      <div class="ah-pf-sec-h"><h2>লগইন পদ্ধতি</h2></div>
      <div class="ah-pf-card">
        ${secRow('🔑', 'পাসওয়ার্ড', hasPw ? 'সেট করা আছে · শেষ আপডেট অজানা' : 'এখনো সেট করা নেই', hasPw, 'profile/security/password')}
        ${secRow('🪪', 'পাসকি (Passkey)', hasPk ? 'এই ডিভাইসে যুক্ত' : 'যোগ করা যায়নি', hasPk, 'profile/security/passkeys')}
        ${secRow('🔗', 'গুগল অ্যাকাউন্ট', hasG ? (u.email || 'যুক্ত') : 'সংযোগ করা যায়', hasG, 'profile/security/google')}
      </div>
      <div class="ah-pf-sec-h" style="margin-top:22px"><h2>যোগাযোগ যাচাইকরণ</h2></div>
      <div class="ah-pf-card">
        ${secRow('✉️', 'ইমেইল', u.email || 'যোগ করা হয়নি', !!u.emailVerified, 'profile/edit')}
        ${secRow('📱', 'মোবাইল', u.mobile || 'যোগ করা হয়নি', !!u.mobileVerified, 'profile/edit')}
      </div>
      <div class="ah-pf-sec-h" style="margin-top:22px"><h2>নিরাপত্তা স্কোর</h2></div>
      <div class="ah-pf-card">
        <div class="ah-pf-score">
          <div class="ah-pf-score-ring">
            <svg viewBox="0 0 120 120"><circle class="bg" cx="60" cy="60" r="52"/><circle class="fg" cx="60" cy="60" r="52" style="stroke-dasharray:${2 * Math.PI * 52 * (secScore(u) / 100)} ${2 * Math.PI * 52}"/></svg>
            <b>${secScore(u)}%</b>
          </div>
          <div class="ah-pf-score-list">
            ${scoreItem('পাসওয়ার্ড সেট', hasPw)}
            ${scoreItem('ইমেইল যাচাইকৃত', !!u.emailVerified)}
            ${scoreItem('পাসকি সক্রিয়', hasPk)}
            ${scoreItem('গুগল ব্যাকআপ', hasG)}
          </div>
        </div>
        <button class="ah-pf-securebtn" onclick="AHProf.secureNow()">🛡 Secure My Account</button>
      </div>
      <button class="ah-pf-dangerbtn" onclick="navigate('profile/delete')">অ্যাকাউন্ট মুছে ফেলো</button>
    </div>`;
    shellProfile(html, { title: 'Security', back: "navigate('profile')" });
  }
  function scoreItem(label, ok) {
    return `<div class="li ${ok ? 'ok' : ''}"><span>${ok ? '✓' : '○'} ${label}</span><i>${ok ? 'সম্পন্ন' : 'বাকি'}</i></div>`;
  }
  function secScore(u) {
    const providers = u.providers || [];
    const hasPw = providers.includes('password') || providers.includes('email') || (!providers.length && !!u.email);
    const hasPk = providers.includes('passkey');
    const hasG = providers.includes('google');
    let s = 0;
    if (hasPw) s += 35;
    if (u.emailVerified) s += 25;
    if (hasPk) s += 25;
    if (hasG) s += 15;
    return s;
  }
  function renderPassword() {
    const html = `<div class="ah-pf" style="padding:6px 0 30px">
      <p class="muted" style="font-size:13px;line-height:1.55;margin:0 0 14px">নতুন পাসওয়ার্ডে কমপক্ষে ৮ অক্ষর, একটি বড় হাতের অক্ষর ও একটি সংখ্যা থাকা উচিত। পাসওয়ার্ড কখনো কারো সাথে শেয়ার করো না।</p>
      <label class="ah-pf-lab">বর্তমান পাসওয়ার্ড</label>${passField('curPass', 'বর্তমান পাসওয়ার্ড')}
      <label class="ah-pf-lab">নতুন পাসওয়ার্ড</label>${passField('newPass', 'নতুন পাসওয়ার্ড')}
      <label class="ah-pf-lab">নতুন পাসওয়ার্ড আবার</label>${passField('newPass2', 'নিশ্চিত করো')}
      ${errBox('ahErr')}
      <button class="ah-btn" id="ahChPass">পাসওয়ার্ড বদলাও</button>
      <button class="ah-btn sec" style="margin-top:10px" onclick="navigate('profile/security')">ফিরে যাও</button>
    </div>`;
    shellProfile(html, { title: 'Password', back: "navigate('profile/security')" });
    document.querySelectorAll('[data-eye]').forEach(b => b.onclick = () => {
      const inp = document.getElementById(b.getAttribute('data-eye'));
      if (inp) inp.type = inp.type === 'password' ? 'text' : 'password';
    });
    document.getElementById('ahChPass').addEventListener('click', async () => {
      try {
        await api('/auth/password', { method: 'POST', headers: authH(), body: JSON.stringify({ current: document.getElementById('curPass').value, password: document.getElementById('newPass').value, confirm: document.getElementById('newPass2').value }) });
        toast('পাসওয়ার্ড বদলেছে');
        navigate('profile/security');
      } catch (e) { showErr('ahErr', authFriendly(e)); }
    });
  }
  function renderPasskeys() {
    const u = user() || {};
    const hasPk = (u.providers || []).includes('passkey');
    const html = `<div class="ah-pf" style="padding:6px 0 30px">
      <div class="ah-pf-card">
        <div class="ah-pf-row-static">
          <span class="ah-pf-ri">🪪</span>
          <span class="ah-pf-rt"><b>এই ডিভাইসের পাসকি</b><i>${hasPk ? 'Face ID / Touch ID / পিন দিয়ে দ্রুত লগইন' : 'কোনো পাসকি নেই'}</i></span>
          <span class="ah-pf-ok">${hasPk ? '● সক্রিয়' : '—'}</span>
        </div>
        ${hasPk ? `<button class="ah-btn sec" style="margin-top:12px" onclick="AHProf.removePasskey()">পাসকি সরাও</button>` : ''}
      </div>
      ${hasPk ? '' : `<div class="ah-pf-empty" style="margin-top:14px"><span class="ic">🪪</span><b>পাসকি এখনো নেই</b><p>পাসওয়ার্ড টাইপ না করেই Face ID / Touch ID দিয়ে ঢুকতে পারবে।</p><button class="ah-pf-cta" onclick="AHProf.addPasskey()">পাসকি যোগ করো</button></div>`}
      <p class="muted" style="font-size:12px;line-height:1.55;margin-top:14px">পাসকি শুধু এই ডিভাইসে থাকে, Admission Hub-এ পাসওয়ার্ড হিসেবে সংরক্ষিত হয় না।</p>
    </div>`;
    shellProfile(html, { title: 'Passkeys', back: "navigate('profile/security')" });
  }
  async function addPasskey() {
    try {
      if (!window.PublicKeyCredential) return toast('এই ডিভাইসে পাসকি নেই');
      const begin = await api('/auth/passkey/add/begin', { method: 'POST', headers: authH() });
      const opt = begin.options;
      opt.challenge = b64urlToBuf(opt.challenge);
      opt.user.id = b64urlToBuf(opt.user.id);
      const cred = await navigator.credentials.create({ publicKey: opt });
      const att = cred.response;
      const data = await api('/auth/passkey/add/finish', {
        method: 'POST', headers: authH(),
        body: JSON.stringify({
          chalId: begin.chalId, id: cred.id, rawId: bufToB64url(cred.rawId),
          clientDataJSON: bufToB64url(att.clientDataJSON), attestationObject: bufToB64url(att.attestationObject),
          publicKey: att.getPublicKey ? bufToB64url(att.getPublicKey()) : '',
          publicKeyAlgorithm: att.getPublicKeyAlgorithm ? att.getPublicKeyAlgorithm() : -7
        })
      });
      setSession(token(), data.user);
      toast('পাসকি যোগ হয়েছে');
      navigate('profile/security/passkeys');
    } catch (e) { toast(e.name === 'NotAllowedError' ? 'পাসকি বাতিল' : (e.message || 'পাসকি ব্যর্থ')); }
  }
  async function removePasskey() {
    if (!window.confirm('এই ডিভাইসের পাসকি সরানো হবে। নিশ্চিত?')) return;
    try {
      const data = await api('/auth/passkey/remove', { method: 'POST', headers: authH() });
      setSession(token(), data.user);
      toast('পাসকি সরানো হয়েছে');
      navigate('profile/security/passkeys');
    } catch (e) { toast(e.message); }
  }
  function renderGoogle() {
    const u = user() || {};
    const hasG = (u.providers || []).includes('google');
    const html = `<div class="ah-pf" style="padding:6px 0 30px">
      <div class="ah-pf-card">
        <div class="ah-pf-row-static">
          <span class="ah-pf-ri">🔗</span>
          <span class="ah-pf-rt"><b>গুগল অ্যাকাউন্ট</b><i>${hasG ? esc(u.email || 'যুক্ত') : 'সংযোগ করা হয়নি'}</i></span>
          <span class="ah-pf-ok">${hasG ? '● যুক্ত' : '—'}</span>
        </div>
        ${hasG
          ? `<button class="ah-btn sec" style="margin-top:12px" onclick="AHProf.unlinkGoogle()">গুগল লিংক সরাও</button>`
          : `<button class="ah-btn" style="margin-top:12px" id="ahGLink">গুগল দিয়ে সংযোগ করো</button>`}
      </div>
      <p class="muted" style="font-size:12px;line-height:1.55;margin-top:14px">গুগল যুক্ত থাকলে পাসওয়ার্ড ভুলে গেলেও গুগল দিয়ে ঢোকা যায়। শুধু যাচাইকৃত গুগল অ্যাকাউন্টই যুক্ত হয়।</p>
    </div>`;
    shellProfile(html, { title: 'Google', back: "navigate('profile/security')" });
    const btn = document.getElementById('ahGLink');
    if (btn) btn.addEventListener('click', () => linkGoogle());
  }
  async function linkGoogle() {
    try {
      if (!window.google || !window.google.accounts) return toast('গুগল সংযোগ লোড হয়নি — একটু পরে আবার চেষ্টা করো');
      await new Promise((res, rej) => {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: (window.AH_AUTH_CONFIG && window.AH_AUTH_CONFIG.googleClientId) || '',
          scope: 'email profile openid',
          callback: async (resp) => {
            if (resp && resp.access_token) {
              try {
                const data = await api('/auth/google/link', { method: 'POST', headers: authH(), body: JSON.stringify({ accessToken: resp.access_token }) });
                setSession(token(), data.user);
                toast('গুগল যুক্ত হয়েছে');
                res(navigate('profile/security/google'));
              } catch (e) { rej(e); }
            } else rej(new Error('গুগল লগইন বাতিল হয়েছে'));
          }
        });
        tokenClient.requestAccessToken();
      });
    } catch (e) { toast(e.message); }
  }
  async function unlinkGoogle() {
    if (!window.confirm('গুগল লিংক সরানো হবে? পাসওয়ার্ড দিয়ে ঢোকা যাবে।')) return;
    try {
      const data = await api('/auth/google/unlink', { method: 'POST', headers: authH() });
      setSession(token(), data.user);
      toast('গুগল লিংক সরানো হয়েছে');
      navigate('profile/security/google');
    } catch (e) { toast(e.message); }
  }
  async function secureNow() {
    const u = user() || {};
    const providers = u.providers || [];
    const hasPw = providers.includes('password') || providers.includes('email') || (!providers.length && !!u.email);
    const steps = [];
    if (!hasPw) steps.push({ icon: '🔑', t: 'পাসওয়ার্ড সেট করো', a: 'navigate(\'profile/security/password\')' });
    if (!u.emailVerified) steps.push({ icon: '✉️', t: 'ইমেইল যাচাই করো', a: 'navigate(\'profile/edit\')' });
    if (!providers.includes('passkey')) steps.push({ icon: '🪪', t: 'পাসকি যোগ করো', a: 'navigate(\'profile/security/passkeys\')' });
    if (steps.length === 0) return toast('🛡 তোমার অ্যাকাউন্ট ভালোভাবে সুরক্ষিত!');
    const html = `<div class="ah-pf" style="padding:6px 0 30px">
      <div class="ah-pf-score-banner">🛡 অ্যাকাউন্ট আরও সুরক্ষিত করতে এই ধাপগুলো করো</div>
      ${steps.map((s, i) => `<div class="ah-pf-row" onclick="${s.a}"><span class="ah-pf-ri">${s.icon}</span><span class="ah-pf-rt"><b>${s.t}</b></span><span class="ah-pf-chev">›</span></div>`).join('')}
    </div>`;
    shellProfile(html, { title: 'Secure My Account', back: "navigate('profile/security')" });
  }

  /* ─────────── Devices & sessions ─────────── */
  function renderDevices() {
    const html = `<div class="ah-pf" style="padding:6px 0 30px" id="devRoot">
      <div class="muted" style="text-align:center;padding:40px 0">সেশন লোড হচ্ছে…</div>
    </div>`;
    shellProfile(html, { title: 'Devices & Sessions', back: "navigate('profile')" });
    loadDevices();
  }
  async function loadDevices() {
    const root = document.getElementById('devRoot');
    if (!root) return;
    try {
      const data = await api('/sessions', { headers: authH() });
      const s = Array.isArray(data.sessions) ? data.sessions : [];
      const live = s.filter(x => x.live);
      const cur = s.find(x => x.current);
      root.innerHTML = `<div class="ah-pf-card">
        <div class="ah-pf-row-static">
          <span class="ah-pf-ri">📊</span>
          <span class="ah-pf-rt"><b>${s.length}টি ডিভাইস · ${live.length}টি সক্রিয়</b><i>সব সেশন যেখানে লগইন আছে</i></span>
        </div>
      </div>
      ${s.map(x => `
        <div class="ah-pf-card dev">
          <div class="ah-pf-row-static">
            <span class="ah-pf-ri">${curIcon(x)}</span>
            <span class="ah-pf-rt">
              <b>${esc(x.device || 'ডিভাইস')}${x.current ? ' <em class="ah-pf-cur">এই ডিভাইস</em>' : ''}</b>
              <i>${esc(x.browser || '')} · প্রথম দেখা ${profTime(x.firstSeen)} · শেষ সক্রিয় ${profTime(x.lastSeen)}</i>
              <span class="ah-pf-sessid">সেশন ID: ${esc(x.id || '—')}</span>
            </span>
          </div>
          ${x.current ? '' : `<button class="ah-btn sec sm" style="margin-top:10px" onclick="AHProf.revokeSession('${esc(x.id)}')">এই সেশন বন্ধ করো</button>`}
        </div>`).join('')}
      <button class="ah-btn sec" style="margin-top:16px" onclick="AHProf.revokeOthers()">অন্য সব ডিভাইস থেকে লগ আউট</button>`;
    } catch (e) { root.innerHTML = '<div class="ah-pf-empty"><span class="ic">⚠️</span><b>সেশন লোড হয়নি</b><p>' + esc(e.message) + '</p></div>'; }
  }
  async function revokeSession(id) {
    if (!window.confirm('এই ডিভাইসের সেশন বন্ধ করবে?')) return;
    try {
      await api('/sessions/revoke', { method: 'POST', headers: authH(), body: JSON.stringify({ token: id }) });
      toast('সেশন বন্ধ হয়েছে');
      loadDevices();
    } catch (e) { toast(e.message); }
  }
  async function revokeOthers() {
    if (!window.confirm('এই ডিভাইস ছাড়া সব জায়গা থেকে লগ আউট হবে। নিশ্চিত?')) return;
    try {
      await api('/sessions/revoke-others', { method: 'POST', headers: authH() });
      toast('অন্য সব সেশন বন্ধ হয়েছে');
      loadDevices();
    } catch (e) { toast(e.message); }
  }

  /* ─────────── Security activity ─────────── */
  function renderActivity() {
    const html = `<div class="ah-pf" style="padding:6px 0 30px" id="actRoot">
      <div class="muted" style="text-align:center;padding:40px 0">লোড হচ্ছে…</div>
    </div>`;
    shellProfile(html, { title: 'Security Activity', back: "navigate('profile')" });
    loadActivity();
  }
  async function loadActivity() {
    const root = document.getElementById('actRoot');
    if (!root) return;
    try {
      const data = await api('/security/activity', { headers: authH() });
      const arr = Array.isArray(data.activity) ? data.activity : [];
      if (!arr.length) {
        root.innerHTML = '<div class="ah-pf-empty"><span class="ic">🛡</span><b>কোনো ইভেন্ট নেই</b><p>লগইন, পাসওয়ার্ড পরিবর্তন বা সেশন কার্যকলাপ এখানে দেখাবে।</p></div>';
        return;
      }
      root.innerHTML = `<div class="ah-pf-card">${arr.map(a => `<div class="ah-pf-act">
        <span class="dot"></span>
        <div><b>${esc(a.detail || a.type)}</b><i>${profTime(a.at)}</i></div>
      </div>`).join('')}</div>`;
    } catch (e) { root.innerHTML = '<div class="ah-pf-empty"><span class="ic">⚠️</span><b>লোড হয়নি</b><p>' + esc(e.message) + '</p></div>'; }
  }

  /* ─────────── Academic profile ─────────── */
  function renderAcademic() {
    const u = user() || {};
    const html = `<div class="ah-pf" style="padding:6px 0 30px" id="acadRoot">
      <div class="muted" style="text-align:center;padding:40px 0">লোড হচ্ছে…</div>
    </div>`;
    shellProfile(html, { title: 'Academic Profile', back: "navigate('profile')" });
    (async () => {
      const root = document.getElementById('acadRoot');
      if (!root) return;
      let onb = null;
      try { const d = await api('/onboarding', { headers: authH() }); onb = d.onboarding; } catch (_) {}
      const o = onb || {};
      const completed = !!(o.completed || u.onboardingCompleted);
      if (!completed) {
        root.innerHTML = `<div class="ah-pf-empty"><span class="ic">🎓</span><b>একাডেমিক প্রোফাইল এখনো তৈরি হয়নি</b>
          <p>লক্ষ্য, পছন্দের বিশ্ববিদ্যালয়, ইউনিট আর দুর্বল বিষয় ঠিক করলে প্রস্তুতির রোডম্যাপ তৈরি হবে।</p>
          <button class="ah-pf-cta" onclick="AHProf.startOnboarding()">Start Preparing →</button></div>`;
        return;
      }
      const goal = o.goal ? (goalLabel(o.goal) || o.goal) : (u.goal ? (goalLabel(u.goal) || u.goal) : 'বিশ্ববিদ্যালয় ভর্তি');
      const unis = (Array.isArray(o.targetUniversities) && o.targetUniversities.length) ? o.targetUniversities : ((u.targetUniversity ? [u.targetUniversity] : []));
      const units = (Array.isArray(o.targetUnits) && o.targetUnits.length) ? o.targetUnits : (u.targetUnit ? String(u.targetUnit).split(',').filter(Boolean) : []);
      const weak = (Array.isArray(o.weakSubjects) && o.weakSubjects.length) ? o.weakSubjects : [];
      const aim = o.studyGoal ? (aimLabel(o.studyGoal) || o.studyGoal) : (u.studyGoal ? (aimLabel(u.studyGoal) || u.studyGoal) : '');
      root.innerHTML = `<div class="ah-pf-card">
        <div class="ah-pf-acad-big"><span class="ic">🎯</span><div><b>লক্ষ্য</b><i>${esc(goal)}</i></div></div>
        <div class="ah-pf-acad-big"><span class="ic">🏛</span><div><b>বিশ্ববিদ্যালয়</b><i>${unis.map(esc).join(', ') || '—'}</i></div></div>
        <div class="ah-pf-acad-big"><span class="ic">📋</span><div><b>ইউনিট</b><i>${units.map(esc).join(' · ') || '—'}</i></div></div>
        <div class="ah-pf-acad-big"><span class="ic">🎯</span><div><b>প্রস্তুতির লক্ষ্য</b><i>${esc(aim) || '—'}</i></div></div>
        <div class="ah-pf-acad-big"><span class="ic">📖</span><div><b>দুর্বল বিষয়</b><i>${weak.map(esc).join(' · ') || '—'}</i></div></div>
        <div class="ah-pf-acad-big"><span class="ic">📊</span><div><b>প্রস্তুতি স্তর</b><i>${Number(o.currentLevel) || Number(u.currentLevel) || 0}%</i></div></div>
      </div>
      <button class="ah-btn sec" style="margin-top:14px" onclick="AHProf.startOnboarding()">একাডেমিক প্রোফাইল আপডেট করো</button>`;
    })();
  }
  async function startOnboarding() {
    try {
      if (window.AHOnboard && typeof AHOnboard.start === 'function') { AHOnboard.start(); return; }
      if (window.AHOnboard && typeof AHOnboard.maybeStart === 'function') { await AHOnboard.maybeStart(true); return; }
      toast('অনবোর্ডিং চালু করা যায়নি');
    } catch (e) { toast(e.message); }
  }

  /* ─────────── Preferences ─────────── */
  function renderNotifications() {
    const html = `<div class="ah-pf" style="padding:6px 0 30px">
      <div class="ah-pf-card">
        <div class="ah-pf-row-static"><span class="ah-pf-ri">📖</span><span class="ah-pf-rt"><b>পড়াশোনার রিমাইন্ডার</b><i>দৈনিক লক্ষ্য, ধারা, পরীক্ষার স্মরণ</i></span></div>
        <div class="ah-pf-row-static"><span class="ah-pf-ri">🛡</span><span class="ah-pf-rt"><b>সিকিউরিটি সতর্কতা</b><i>নতুন ডিভাইস, লগইন, পাসওয়ার্ড পরিবর্তন — সবসময় চালু</i></span><span class="ah-pf-ok">● চালু</span></div>
      </div>
      <button class="ah-btn sec" style="margin-top:14px" onclick="if(window.NotificationHub)NotificationHub.openSettings();else toast('নোটিফিকেশন সেটিংস এখানে নেই')">⚙️ নোটিফিকেশন সেটিংস খোলো</button>
      <p class="muted" style="font-size:12px;line-height:1.55;margin-top:12px">সিকিউরিটি সতর্কতা বন্ধ করা যায় না — অ্যাকাউন্টের নিরাপত্তার জন্য এগুলো সবসময় সক্রিয় থাকে।</p>
    </div>`;
    shellProfile(html, { title: 'Notifications', back: "navigate('profile')" });
  }
  function renderAppearance() {
    const s = (window.CACHE && CACHE.settings) || {};
    const theme = s.theme || 'light', accent = s.accent || 'emerald';
    const themes = [['light', 'Emerald Light'], ['dark', 'Soft Dark'], ['midnight', 'Midnight'], ['focus', 'Focus Mode']];
    const accents = [['emerald', 'Emerald'], ['blue', 'Blue'], ['violet', 'Violet'], ['amber', 'Amber']];
    const html = `<div class="ah-pf" style="padding:6px 0 30px">
      <div class="ah-pf-sec-h"><h2>থিম</h2></div>
      <div class="ah-pf-chipgrid">${themes.map(([v, l]) => `<button class="ah-pf-chip ${theme === v ? 'on' : ''}" onclick="AHProf.theme('${v}')">${l}</button>`).join('')}</div>
      <div class="ah-pf-sec-h" style="margin-top:22px"><h2>অ্যাকসেন্ট</h2></div>
      <div class="ah-pf-chipgrid">${accents.map(([v, l]) => `<button class="ah-pf-chip ${accent === v ? 'on' : ''}" onclick="AHProf.accent('${v}')">${l}</button>`).join('')}</div>
      <div class="ah-pf-sec-h" style="margin-top:22px"><h2>সিস্টেম</h2></div>
      <div class="ah-pf-card">
        <label class="ah-pf-lab">UI ঘনত্ব</label>
        <select class="ah-inp" onchange="AHProf.density(this.value)"><option value="comfortable" ${(s.density || 'comfortable') === 'comfortable' ? 'selected' : ''}>Comfortable</option><option value="compact" ${s.density === 'compact' ? 'selected' : ''}>Compact</option></select>
        <label class="ah-pf-lab" style="margin-top:14px">কার্ড স্টাইল</label>
        <select class="ah-inp" onchange="AHProf.cardStyle(this.value)"><option value="soft" ${(s.cardStyle || 'soft') === 'soft' ? 'selected' : ''}>Soft</option><option value="minimal" ${s.cardStyle === 'minimal' ? 'selected' : ''}>Minimal</option><option value="elevated" ${s.cardStyle === 'elevated' ? 'selected' : ''}>Elevated</option></select>
      </div>
      <p class="muted" style="font-size:12px;line-height:1.55;margin-top:12px">থিম পছন্দ তোমার ডিভাইসে সংরক্ষিত থাকে এবং সব স্ক্রিনে প্রযোজ্য।</p>
    </div>`;
    shellProfile(html, { title: 'Appearance', back: "navigate('profile')" });
  }
  function renderLanguage() {
    const html = `<div class="ah-pf" style="padding:6px 0 30px">
      <div class="ah-pf-chipgrid" style="margin-top:8px">
        <button class="ah-pf-chip big ${lang === 'bn' ? 'on' : ''}" onclick="AHProf.lang('bn')">বাংলা</button>
        <button class="ah-pf-chip big ${lang === 'en' ? 'on' : ''}" onclick="AHProf.lang('en')">English</button>
      </div>
      <p class="muted" style="font-size:12px;line-height:1.55;margin-top:14px">আবেদন, প্রশ্ন ও অ্যাপের ভাষা। কিছু স্ক্রিনে ইংরেজি/বাংলা দুটোই দেখানো হয়।</p>
    </div>`;
    shellProfile(html, { title: 'Language', back: "navigate('profile')" });
  }

  /* ─────────── Data & privacy ─────────── */
  function renderData() {
    const u = user() || {};
    const html = `<div class="ah-pf" style="padding:6px 0 30px">
      <div class="ah-pf-card">
        <div class="ah-pf-row-static"><span class="ah-pf-ri">📦</span><span class="ah-pf-rt"><b>সম্পূর্ণ ডেটা এক্সপোর্ট</b><i>অ্যাকাউন্ট, প্রোফাইল, সেশন, কার্যকলাপ, পরীক্ষার ফলাফল — কাঠামোবদ্ধ JSON</i></span></div>
        <button class="ah-btn" style="margin-top:12px" onclick="AHProf.exportData()">এক্সপোর্ট ডাউনলোড করো</button>
      </div>
      <div class="ah-pf-sec-h" style="margin-top:22px"><h2>তোমার ডেটা সম্পর্কে</h2></div>
      <div class="ah-pf-card">
        <div class="ah-pf-row-static"><span class="ah-pf-ri">☁️</span><span class="ah-pf-rt"><b>ক্লাউড স্টোরেজ</b><i>তোমার ডেটা শুধু তোমার অ্যাকাউন্টেই থাকে — অন্য ব্যবহারকারী দেখতে পায় না</i></span></div>
        <div class="ah-pf-row-static"><span class="ah-pf-ri">🔐</span><span class="ah-pf-rt"><b>HTTPS + যাচাই</b><i>সব যোগাযোগ সুরক্ষিত চ্যানেলে হয়</i></span></div>
        <div class="ah-pf-row-static"><span class="ah-pf-ri">🗑</span><span class="ah-pf-rt"><b>মুছে ফেলা</b><i>অ্যাকাউন্ট মুছলে সব ডেটা স্থায়ীভাবে সরানো হয়</i></span></div>
      </div>
    </div>`;
    shellProfile(html, { title: 'Data & Privacy', back: "navigate('profile')" });
  }
  async function exportData() {
    try {
      const data = await api('/export', { headers: authH() });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'admission-hub-export-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 500);
      toast('এক্সপোর্ট ডাউনলোড শুরু হয়েছে');
    } catch (e) { toast(e.message); }
  }
  function renderDelete() {
    const html = `<div class="ah-pf" style="padding:6px 0 30px">
      <div class="ah-pf-dangercard">
        <div class="ah-pf-dangerhead">🗑 অ্যাকাউন্ট মুছে ফেলা</div>
        <p>অ্যাকাউন্ট মুছে ফেললে যা যা স্থায়ীভাবে হারাবে:</p>
        <ul>
          <li>প্রোফাইল, ছবি ও একাডেমিক তথ্য</li>
          <li>সব পরীক্ষার ফলাফল ও ইতিহাস</li>
          <li>ভোকাবুলারি, নোট ও প্রস্তুতি ডেটা</li>
          <li>সেশন, পাসকি ও গুগল লিংক</li>
        </ul>
        <p class="muted" style="font-size:12.5px">এই কাজটি ফেরানো যাবে না। আগে চাইলে <a class="ah-pf-linkbtn" onclick="AHProf.exportData()">ডেটা এক্সপোর্ট</a> করে নাও।</p>
        <button class="ah-pf-dangerbtn big" onclick="AHProf.requestDelete()">অ্যাকাউন্ট মুছে ফেলো</button>
      </div>
    </div>`;
    shellProfile(html, { title: 'Delete Account', back: "navigate('profile')" });
  }
  async function requestDelete() {
    try {
      const pw = await reauthPrompt('অ্যাকাউন্ট মুছে ফেলতে পাসওয়ার্ড দাও');
      if (pw === null) return;
      if (!window.confirm('সত্যিই কি তোমার অ্যাকাউন্ট স্থায়ীভাবে মুছে ফেলবে? এটি ফেরানো যাবে না।')) return;
      await api('/auth/delete', { method: 'POST', headers: authH(), body: JSON.stringify({ password: pw }) });
      await logout();
      toast('অ্যাকাউন্ট মুছে ফেলা হয়েছে');
    } catch (e) { toast(e.message); }
  }

  /* ─────────── Re-auth sheet ─────────── */
  function reauthPrompt(title) {
    return new Promise(resolve => {
      const wrap = document.createElement('div');
      wrap.className = 'ah-sheet ah-reauth';
      wrap.innerHTML = `<div class="box">
        <div style="font-weight:800;margin-bottom:6px">${esc(title)}</div>
        <p class="muted" style="font-size:12.5px;margin:0 0 10px">নিরাপত্তার জন্য তোমার বর্তমান পাসওয়ার্ড নিশ্চিত করতে হবে।</p>
        <div class="ah-field"><input class="ah-inp" id="raPass" type="password" placeholder="বর্তমান পাসওয়ার্ড" autocomplete="current-password"><button class="ah-eye" type="button" data-eye="raPass">👁</button></div>
        <div class="ah-err" id="raErr" style="min-height:18px"></div>
        <button class="ah-btn" id="raOk">নিশ্চিত করো</button>
        <button class="ah-btn sec" id="raNo" style="margin-top:10px">বাতিল</button>
      </div>`;
      wrap.addEventListener('click', e => { if (e.target === wrap) { wrap.remove(); resolve(null); } });
      document.body.appendChild(wrap);
      wrap.querySelector('[data-eye]').onclick = () => { const i = document.getElementById('raPass'); i.type = i.type === 'password' ? 'text' : 'password'; };
      wrap.querySelector('#raNo').onclick = () => { wrap.remove(); resolve(null); };
      const ok = async () => {
        const pw = document.getElementById('raPass').value;
        try {
          await api('/re-auth', { method: 'POST', headers: authH(), body: JSON.stringify({ password: pw }) });
          wrap.remove();
          resolve(pw);
        } catch (e) {
          document.getElementById('raErr').textContent = e.message;
        }
      };
      wrap.querySelector('#raOk').onclick = ok;
      wrap.querySelector('#raPass').addEventListener('keydown', e => { if (e.key === 'Enter') ok(); });
      setTimeout(() => { const i = document.getElementById('raPass'); if (i) i.focus(); }, 80);
    });
  }

  /* ─────────── Photo (crop + compress) ─────────── */
  function openPhotoSheet() {
    const wrap = document.createElement('div');
    wrap.className = 'ah-sheet';
    wrap.innerHTML = `<div class="box">
      <div style="font-weight:800;margin-bottom:8px">প্রোফাইল ছবি</div>
      <button class="row" type="button" id="ahCam">📷 ছবি তুলো</button>
      <button class="row" type="button" id="ahGal">🖼 গ্যালারি থেকে বেছে নাও</button>
      ${(user() || {}).photo ? '<button class="row" type="button" id="ahRem">🗑 ছবি সরাও</button>' : ''}
      <button class="ah-btn sec" type="button" id="ahCan" style="margin-top:14px">বাতিল</button>
      <input id="ahFileCam" type="file" accept="image/*" capture="environment" hidden>
      <input id="ahFileGal" type="file" accept="image/*" hidden>
    </div>`;
    wrap.addEventListener('click', e => { if (e.target === wrap) wrap.remove(); });
    document.body.appendChild(wrap);
    wrap.querySelector('#ahCan').onclick = () => wrap.remove();
    wrap.querySelector('#ahCam').onclick = () => wrap.querySelector('#ahFileCam').click();
    wrap.querySelector('#ahGal').onclick = () => wrap.querySelector('#ahFileGal').click();
    const rem = wrap.querySelector('#ahRem');
    if (rem) rem.onclick = async () => {
      try {
        const data = await api('/profile/photo', { method: 'POST', headers: authH(), body: JSON.stringify({ remove: true }) });
        setSession(token(), data.user); wrap.remove();
        toast('ছবি সরানো হয়েছে');
        const p = routePath();
        if (p === 'profile/edit') renderEdit(); else renderProfile();
      } catch (e) { toast(e.message); }
    };
    const onFile = async ev => {
      const f = ev.target.files && ev.target.files[0]; if (!f) return;
      if (!/^image\//.test(f.type)) return toast('শুধু ছবি দাও');
      if (f.size > 10 * 1024 * 1024) return toast('ছবি খুব বড় (সর্বোচ্চ ১০MB)');
      wrap.remove();
      cropPreview(f);
    };
    wrap.querySelector('#ahFileCam').onchange = onFile;
    wrap.querySelector('#ahFileGal').onchange = onFile;
  }
  function cropPreview(file) {
    const wrap = document.createElement('div');
    wrap.className = 'ah-sheet';
    wrap.innerHTML = `<div class="box">
      <div style="font-weight:800;margin-bottom:10px">ছবি ঠিক করে নাও</div>
      <div class="ah-cropstage"><img id="ahCropImg" alt="preview"></div>
      <div class="muted" style="font-size:12px;text-align:center;margin:8px 0">বর্গাকার ক্রপ স্বয়ংক্রিয় — ছবি কমপ্রেস হয়ে সংরক্ষণ হবে</div>
      <button class="ah-btn" id="ahCropOk">এটাই রাখো</button>
      <button class="ah-btn sec" id="ahCropNo" style="margin-top:10px">আবার বেছে নাও</button>
    </div>`;
    document.body.appendChild(wrap);
    const img = wrap.querySelector('#ahCropImg');
    img.onload = () => {
      const s = 256;
      const c = document.createElement('canvas');
      c.width = s; c.height = s;
      const ctx = c.getContext('2d');
      const m = Math.min(img.naturalWidth, img.naturalHeight);
      ctx.drawImage(img, (img.naturalWidth - m) / 2, (img.naturalHeight - m) / 2, m, m, 0, 0, s, s);
      const dataUrl = c.toDataURL('image/jpeg', 0.72);
      if (dataUrl.length > 220000) return toast('ছবি খুব ভারী — অন্য ছবি দাও');
      wrap.querySelector('#ahCropOk').onclick = async () => {
        try {
          const data = await api('/profile/photo', { method: 'POST', headers: authH(), body: JSON.stringify({ dataUrl }) });
          setSession(token(), data.user);
          wrap.remove();
          toast('ছবি আপলোড হয়েছে');
          const p = routePath();
          if (p === 'profile/edit') renderEdit(); else renderProfile();
        } catch (e) { toast(e.message); }
      };
    };
    img.onerror = () => { wrap.remove(); toast('ছবি পড়া যায়নি'); };
    img.src = URL.createObjectURL(file);
    wrap.querySelector('#ahCropNo').onclick = () => { wrap.remove(); openPhotoSheet(); };
    wrap.addEventListener('click', e => { if (e.target === wrap) { URL.revokeObjectURL(img.src); wrap.remove(); } });
  }

  async function enterApp() {
    setGate(false);
    try { await pullState(); } catch (_) {}
    try { if (window.AdmissionCloudContent) await AdmissionCloudContent.pull(); } catch (_) {}
    try { await pushState(); } catch (_) {}
    if (window.AHOnboard && typeof AHOnboard.maybeStart === 'function') {
      const onb = await AHOnboard.maybeStart();
      if (onb) return;
    }
    if (typeof navigate === 'function') navigate(pendingRoute() || 'dashboard');
    else if (typeof render === 'function') render();
    clearPendingAuth();
    stopGuestBadger();
    window.__ahGuestMode = false;
  }

  /* ═══════════ GUEST-FIRST AUTH UX (v177) ═══════════
     - app প্রথম পেইন্টেই guest mode → কোন login wall নেই
     - personal/cloud feature-এ premium login prompt (bottom sheet)
     - "Not now" → একই action-এ session-জুড়ে আর prompt নয়
     - guest data সবই local stores-এ; login করলে applyPersonal+pushState
       (id-ভিত্তিক upsert) → duplicate ছাড়া cloud merge
     - 🚨 পুরনো সেশন (ahPubToken/ahPubUser) কখনো মুছে না — কেবল নিঃশব্দে restore */
  const GUEST_SKIP_PREFIX = 'ahGuestPromptSkip:';
  const pendingRoute = () => String(window.__ahPendingAuthRoute || '');
  const setPendingAuth = route => { window.__ahPendingAuthRoute = route || ''; };
  const clearPendingAuth = () => { window.__ahPendingAuthRoute = ''; };
  const promptSkipped = action => {
    try { return sessionStorage.getItem(GUEST_SKIP_PREFIX + action) === '1'; } catch (_) { return false; }
  };
  const markPromptSkipped = action => {
    try { sessionStorage.setItem(GUEST_SKIP_PREFIX + action, '1'); } catch (_) {}
  };
  const closeAuthPrompt = () => {
    const ev = document.getElementById('ahAuthPrompt');
    if (ev) ev.remove();
    document.body.classList.remove('ah-prompt-open');
  };
  const openAuthPrompt = (action, opts) => {
    if (authed()) return true;
    try {
      if (promptSkipped(action)) { toast(lang === 'bn' ? 'এই কাজটা এই ডিভাইসে তার নিজের মতোই চলে — অ্যাকাউন্ট যেকোনো সময় খুলতে পারো' : 'This works locally on this device — you can create an account anytime'); return false; }
    } catch (_) {}
    closeAuthPrompt();
    const o = opts || {};
    const title = o.title || (lang === 'bn' ? 'Keep Your Preparation Safe' : 'Keep Your Preparation Safe');
    const sub = o.sub || (lang === 'bn'
      ? 'ফ্রি অ্যাকাউন্ট খুলে তোমার পরীক্ষা, ভুল ও অগ্রগতি সব ডিভাইসে সেভ রাখো।'
      : 'Create your free account to save your exams, mistakes and progress across devices.');
    
    const wrap = document.createElement('div');
    wrap.id = 'ahAuthPrompt';
    wrap.className = 'ah-prompt-wrap';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.setAttribute('aria-label', 'Keep Your Preparation Safe');
    wrap.innerHTML = `
      <div class="ah-prompt-backdrop" data-ah-prompt-close></div>
      <section class="ah-prompt-sheet" role="document">
        <button class="ah-prompt-x" type="button" data-ah-prompt-close aria-label="বন্ধ করুন">×</button>
        <div class="ah-prompt-scene" aria-hidden="true">
          <span class="ah-prompt-orb a"></span><span class="ah-prompt-orb b"></span><span class="ah-prompt-orb c"></span>
          <svg class="ah-prompt-spark" viewBox="0 0 48 48" aria-hidden="true"><path d="M24 4c1.8 11.2 6.8 16.2 18 18-11.2 1.8-16.2 6.8-18 18-1.8-11.2-6.8-16.2-18-18 11.2-1.8 16.2-6.8 18-18z"/></svg>
        </div>
        <div class="ah-prompt-eyebrow">ADMISSION HUB · ${lang === 'bn' ? 'ফ্রি অ্যাকাউন্ট' : 'FREE ACCOUNT'}</div>
        <h2 class="ah-prompt-title">${title}</h2>
        <p class="ah-prompt-sub">${sub}</p>
        <div class="ah-prompt-benefits">
          <span>☁️ ${lang === 'bn' ? 'ক্লাউড ব্যাকআপ' : 'Cloud backup'}</span>
          <span>🔄 ${lang === 'bn' ? 'সব ডিভাইসে সিঙ্ক' : 'Sync across devices'}</span>
          <span>🔐 ${lang === 'bn' ? 'নিরাপদ ও বিচ্ছিন্ন' : 'Secure & isolated'}</span>
        </div>
        <button class="ah-prompt-google" type="button" data-ah-prompt-google>
          <svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.8-2.1 5.1-4.4 6.7v5.6h7.1c4.2-3.9 6.6-9.6 6.6-16.3z"/><path fill="#34A853" d="M24 46c6 0 11-2 14.6-5.3l-7.1-5.6c-2 1.3-4.5 2.1-7.5 2.1-5.8 0-10.7-3.9-12.5-9.2H4.2v5.7C7.8 41.3 15.3 46 24 46z"/><path fill="#FBBC05" d="M11.5 28c-.4-1.3-.7-2.6-.7-4s.3-2.7.7-4v-5.7H4.2C2.7 17.1 2 20.4 2 24s.7 6.9 2.2 9.7L11.5 28z"/><path fill="#EA4335" d="M24 10.8c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C35 4.5 30 2 24 2 15.3 2 7.8 6.7 4.2 14.3l7.3 5.7c1.8-5.3 6.7-9.2 12.5-9.2z"/></svg>
          <span>Continue with Google</span>
        </button>
        <button class="ah-prompt-email" type="button" data-ah-prompt-email>
          <span class="ah-prompt-email-ic">✉️</span>
          <span>Continue with Email</span>
        </button>
        <button class="ah-prompt-later" type="button" data-ah-prompt-later>${o.laterLabel || (lang === 'bn' ? 'Not now' : 'Not now')}</button>
        <p class="ah-prompt-safe">🔒 ${lang === 'bn' ? 'তোমার ডেটা এই ডিভাইসে থাকবে — কিছু মুছে যাবে না' : 'Your data stays on this device — nothing is lost'}</p>
      </section>`;
    document.body.appendChild(wrap);
    document.body.classList.add('ah-prompt-open');
    const goGoogle = () => {
      closeAuthPrompt();
      doGoogle();
    };
    const goEmail = () => {
      closeAuthPrompt();
      setPendingAuth(pendingRoute() || (window.Router && Router.path) || 'dashboard');
      setGate(true);
      go('login');
    };
    wrap.querySelector('[data-ah-prompt-google]').onclick = goGoogle;
    wrap.querySelector('[data-ah-prompt-email]').onclick = goEmail;
    wrap.querySelector('[data-ah-prompt-later]').onclick = () => {
      markPromptSkipped(action);
      closeAuthPrompt();
      toast(lang === 'bn' ? 'ঠিক আছে — এই কাজটা এবার আর জিজ্ঞেস করব না' : 'Got it — I won’t ask again for this');
    };
    wrap.querySelectorAll('[data-ah-prompt-close]').forEach(el => { el.onclick = closeAuthPrompt; });
    return false;
  };

  /* — Guest mode-এ ঢোকা: কোন wall নেই, সব local-ই available —
     entry: boot() (no token / 401) ও logout() */
  function enterGuest() {
    setGate(false);
    window.__ahGuestMode = true;
    try {
      if (typeof navigate === 'function') navigate(pendingRoute() || routePath() || 'dashboard');
      else if (typeof render === 'function') render();
    } catch (_) {}
    clearPendingAuth();
    hydrateGuestPages();
    startGuestBadger();
  }

  /* — local/cloud ফিচার পেজগুলোর render-এর পরে গেস্ট ব্যাজ বসানোর হুক — */
  function hydrateGuestPages() {
    ['renderHistory', 'renderMistakes', 'renderExamResult', 'renderDashboard'].forEach(name => {
      if (typeof window[name] !== 'function') return;
      const orig = window[name];
      if (orig.__ahGuestWrap) return;
      const wrapped = function () {
        const ret = orig.apply(this, arguments);
        try { mountGuestBadges(); } catch (_) {}
        return ret;
      };
      wrapped.__ahGuestWrap = true;
      window[name] = wrapped;
    });
  }
  function startGuestBadger() {
    if (window.__ahGuestBadger) return;
    window.__ahGuestBadger = setInterval(() => {
      if (authed()) return stopGuestBadger();
      try { mountGuestBadges(); } catch (_) {}
    }, 1200);
  }
  function stopGuestBadger() {
    if (window.__ahGuestBadger) { clearInterval(window.__ahGuestBadger); window.__ahGuestBadger = null; }
    document.querySelectorAll('[data-ah-guest-badge]').forEach(el => el.remove());
  }

  const badgeCta = (action, icon, title, sub, laterLabel) => `
    <div class="ah-guest-note" data-ah-guest-badge role="note">
      <span class="ah-guest-note-ic">${icon}</span>
      <div class="ah-guest-note-body">
        <b>${title}</b><i>${sub}</i>
      </div>
      <button class="ah-guest-note-btn" type="button" data-ah-guest-action="${action}" data-ah-guest-later="${laterLabel || ''}">${lang === 'bn' ? 'ফ্রি অ্যাকাউন্ট' : 'Free account'}</button>
    </div>`;
  const afterBadgeInject = () => {
    document.querySelectorAll('[data-ah-guest-action]').forEach(btn => {
      if (btn.__ahGuestBound) return;
      btn.__ahGuestBound = true;
      btn.onclick = () => openAuthPrompt(btn.getAttribute('data-ah-guest-action'), { laterLabel: btn.getAttribute('data-ah-guest-later') || '' });
    });
  };
  function mountGuestBadges() {
    if (authed()) return;
    try {
      const p = String((window.Router && Router.path) || '');
      const seal = (where) => { if (!where) return; };
      // 1) Dashboard — ক্লাউড সিঙ্ক কার্ড
      if (p === 'dashboard' && !document.querySelector('.dashboard-existing [data-ah-guest-badge]')) {
        const host = document.querySelector('.dashboard-existing');
        if (host) {
          const el = document.createElement('div');
          el.innerHTML = badgeCta('sync', '☁️',
            lang === 'bn' ? 'অগ্রগতি সব ডিভাইসে সিঙ্ক করো' : 'Sync progress across devices',
            lang === 'bn' ? 'ফ্রি অ্যাকাউন্টে তোমার পরীক্ষা, ভুল ও প্রগ্রেস ক্লাউডে থাকবে' : 'Free account keeps your exams, mistakes and progress in the cloud');
          host.insertBefore(el.firstChild, host.firstChild);
        }
      }
      // 2) History — ক্লাউড হিস্ট্রি ব্যাজ
      if ((p === 'history' || p.startsWith('history/')) && !document.querySelector('[data-ah-guest-badge]')) {
        const host = document.querySelector('.page > .card:first-child, .page > section:first-child, .page > div:first-child');
        if (host) {
          const wrap = document.createElement('div');
          wrap.innerHTML = badgeCta('history', '🕐',
            lang === 'bn' ? 'ক্লাউড হিস্ট্রি আনলক করো' : 'Unlock cloud history',
            lang === 'bn' ? 'অ্যাকাউন্ট খুললে সব পরীক্ষার ইতিহাস স্থায়ী থাকবে — ডিভাইস বদলালেও' : 'Sign in to keep your full exam history permanently, on any device');
          const hostParent = host.parentElement || document.querySelector('#app .page') || document.body;
          hostParent.insertBefore(wrap.firstChild, host);
        }
      }
      // 3) Mistakes — ভুলের খাতা ক্লাউড-সিঙ্ক ব্যাজ
      if ((p === 'mistakes' || p.startsWith('mistakes/')) && !document.querySelector('[data-ah-guest-badge]')) {
        const host = document.querySelector('.page > .card:first-child, .page > section:first-child, .page > div:first-child');
        if (host) {
          const wrap = document.createElement('div');
          wrap.innerHTML = badgeCta('mistakes', '❌',
            lang === 'bn' ? 'মিস্টেক ব্যাংক ক্লাউডে রাখো' : 'Keep your mistake bank in the cloud',
            lang === 'bn' ? 'ফ্রি অ্যাকাউন্টে ভুলগুলো সব ডিভাইসে সিঙ্ক হবে — কখনো হারাবে না' : 'Free account syncs your mistakes across devices — never lost');
          const hostParent = host.parentElement || document.querySelector('#app .page') || document.body;
          hostParent.insertBefore(wrap.firstChild, host);
        }
      }
      // 4) Exam result — result অ্যাকাউন্টে সেভ কার্ড
      if (p === 'exam/result' && !document.querySelector('[data-ah-guest-badge]')) {
        const host = document.querySelector('.page, #app > main, #app');
        if (host) {
          const el = document.createElement('div');
          el.innerHTML = `
            <div class="ah-guest-note ah-guest-result" data-ah-guest-badge role="note">
              <span class="ah-guest-note-ic">💾</span>
              <div class="ah-guest-note-body">
                <b>${lang === 'bn' ? 'এই ফলাফল তোমার অ্যাকাউন্টে সেভ করো' : 'Save this result to your account'}</b>
                <i>${lang === 'bn' ? 'ফ্রি অ্যাকাউন্ট খুললে ফলাফল স্থায়ী হিস্ট্রিতে থাকবে — সব ডিভাইসে' : 'A free account keeps it in your permanent history, on every device'}</i>
              </div>
              <button class="ah-guest-note-btn" type="button" data-ah-guest-action="result-save" data-ah-guest-later="Later">${lang === 'bn' ? 'সেভ করো' : 'Save'}</button>
            </div>`;
          host.appendChild(el.firstChild);
        }
      }
      afterBadgeInject();
    } catch (_) {}
  }

  /* — গেস্ট প্রোফাইল: personal profile আনলক করতে account-এর CTA —
     স্পেক ১১: গেস্ট Profile icon → unlock card + Google/Email */
  function renderGuestProfile(path) {
    let exams = 0, correct = 0, attempted = 0, streak = 0;
    try {
      const st = (typeof computeLifetimeStats === 'function') ? computeLifetimeStats() : null;
      if (st) { exams = st.exams || 0; correct = st.correct || 0; attempted = st.attempted || 0; }
      if (typeof computeStreak === 'function') streak = computeStreak() || 0;
    } catch (_) {}
    const acc = attempted > 0 ? Math.round((correct / attempted) * 100) : 0;
    const nav = typeof bottomNavHtml === 'function' ? bottomNavHtml('profile') : '';
    renderShell(`<main class="page ah-pf ah-guest-profile">
      <header class="ah-pf-hero ah-guest-hero">
        <div class="ah-guest-avatar">👤</div>
        <div>
          <h1>${lang === 'bn' ? 'গেস্ট শিক্ষার্থী' : 'Guest learner'}</h1>
          <p>${lang === 'bn' ? 'তোমার প্রোফাইল আনলক করতে ফ্রি অ্যাকাউন্ট খোলো' : 'Create your free account to unlock your personal Admission Hub profile'}</p>
        </div>
      </header>
      <div class="ah-guest-stats">
        <span><b>${exams}</b><i>${lang === 'bn' ? 'পরীক্ষা' : 'Exams'}</i></span>
        <span><b>${attempted}</b><i>${lang === 'bn' ? 'প্রশ্ন' : 'Questions'}</i></span>
        <span><b>${acc}%</b><i>${lang === 'bn' ? 'সঠিকতা' : 'Accuracy'}</i></span>
        <span><b>${streak}</b><i>${lang === 'bn' ? 'দিন' : 'Days'}</i></span>
      </div>
      <section class="ah-guest-cta ah-glass-card">
        <div class="ah-guest-cta-art" aria-hidden="true">
          <span class="ah-prompt-orb a"></span><span class="ah-prompt-orb b"></span>
          <svg class="ah-prompt-spark" viewBox="0 0 48 48"><path d="M24 4c1.8 11.2 6.8 16.2 18 18-11.2 1.8-16.2 6.8-18 18-1.8-11.2-6.8-16.2-18-18 11.2-1.8 16.2-6.8 18-18z"/></svg>
        </div>
        <h2>${lang === 'bn' ? 'তোমার প্রস্তুতি নিরাপদ রাখো' : 'Keep your preparation safe'}</h2>
        <p>${lang === 'bn' ? 'ফ্রি অ্যাকাউন্টে তোমার পরীক্ষা, ভুল ও অগ্রগতি সেভ থাকবে — সব ডিভাইসে, চিরকাল।' : 'Save your exams, mistakes and progress in a free account — on every device, forever.'}</p>
        <button class="ah-prompt-google" type="button" data-ah-guest-profile-google>
          <svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-3.1-.4-4.5H24v8.5h11.8c-.5 2.8-2.1 5.1-4.4 6.7v5.6h7.1c4.2-3.9 6.6-9.6 6.6-16.3z"/><path fill="#34A853" d="M24 46c6 0 11-2 14.6-5.3l-7.1-5.6c-2 1.3-4.5 2.1-7.5 2.1-5.8 0-10.7-3.9-12.5-9.2H4.2v5.7C7.8 41.3 15.3 46 24 46z"/><path fill="#FBBC05" d="M11.5 28c-.4-1.3-.7-2.6-.7-4s.3-2.7.7-4v-5.7H4.2C2.7 17.1 2 20.4 2 24s.7 6.9 2.2 9.7L11.5 28z"/><path fill="#EA4335" d="M24 10.8c3.2 0 6.1 1.1 8.4 3.3l6.3-6.3C35 4.5 30 2 24 2 15.3 2 7.8 6.7 4.2 14.3l7.3 5.7c1.8-5.3 6.7-9.2 12.5-9.2z"/></svg>
          <span>Continue with Google</span>
        </button>
        <button class="ah-prompt-email" type="button" data-ah-guest-profile-email>
          <span class="ah-prompt-email-ic">✉️</span>
          <span>Continue with Email</span>
        </button>
        <button class="ah-prompt-later" type="button" data-ah-guest-profile-later>${lang === 'bn' ? 'Not now' : 'Not now'}</button>
        <p class="ah-guest-safe">🔒 ${lang === 'bn' ? 'তোমার ডেটা এই ডিভাইসে থাকবে — কিছু মুছে যাবে না' : 'Your data stays on this device — nothing is lost'}</p>
      </section>
    </main>`, { topbar: false });
    const g = document.querySelector('[data-ah-guest-profile-google]');
    if (g) g.onclick = () => { setPendingAuth('profile'); doGoogle(); };
    const e = document.querySelector('[data-ah-guest-profile-email]');
    if (e) e.onclick = () => { setPendingAuth('profile'); setGate(true); go('login'); };
    const l = document.querySelector('[data-ah-guest-profile-later]');
    if (l) l.onclick = () => { markPromptSkipped('profile'); toast(lang === 'bn' ? 'ঠিক আছে — এইবার আর জিজ্ঞেস করব না' : 'Got it — I won’t ask again for this'); };
  }

  function renderProfileRoute() {
    const p = routePath();
    if (!authed()) return renderGuestProfile(p);
    if (p === 'profile') return renderProfile();
    if (p === 'profile/edit') return renderEdit();
    if (p === 'profile/security') return renderSecurity();
    if (p === 'profile/security/password') return renderPassword();
    if (p === 'profile/security/passkeys') return renderPasskeys();
    if (p === 'profile/security/google') return renderGoogle();
    if (p === 'profile/devices') return renderDevices();
    if (p === 'profile/activity') return renderActivity();
    if (p === 'profile/academic') return renderAcademic();
    if (p === 'profile/notifications') return renderNotifications();
    if (p === 'profile/appearance') return renderAppearance();
    if (p === 'profile/language') return renderLanguage();
    if (p === 'profile/data') return renderData();
    if (p === 'profile/delete') return renderDelete();
    return renderProfile();
  }
  window.AHProf = {
    photo: () => openPhotoSheet(),
    saveEdit,
    logout,
    secureNow,
    addPasskey,
    removePasskey,
    linkGoogle,
    unlinkGoogle,
    revokeSession,
    revokeOthers,
    exportData,
    requestDelete,
    theme: t => { if (typeof setTheme === 'function') setTheme(t); else toast('থিম বদলানো যায়নি'); },
    accent: a => { if (typeof setAccent === 'function') setAccent(a); else toast('অ্যাকসেন্ট বদলানো যায়নি'); },
    density: v => { if (window.CACHE) { CACHE.settings = CACHE.settings || {}; CACHE.settings.density = v; if (typeof persistUpgradeSetting === 'function') persistUpgradeSetting(); } },
    cardStyle: v => { if (window.CACHE) { CACHE.settings = CACHE.settings || {}; CACHE.settings.cardStyle = v; if (typeof persistUpgradeSetting === 'function') persistUpgradeSetting(); } },
    lang: l => {
      lang = l === 'bn' ? 'bn' : 'en';
      try { localStorage.setItem('ahLang', lang); } catch (_) {}
      toast(lang === 'bn' ? 'ভাষা বাংলা হয়েছে' : 'Language set to English');
      renderProfileRoute();
    },
    startOnboarding
  };
  function hookPersonalWrites() {
    if (window.__ahAuthWriteHook) return;
    window.__ahAuthWriteHook = true;
    ['dbPut', 'dbPutMany'].forEach(name => {
      const orig = window[name];
      if (typeof orig !== 'function') return;
      window[name] = function () {
        const store = arguments[0];
        const ret = orig.apply(this, arguments);
        if (PERSONAL.includes(store) && token()) {
          clearTimeout(window.__ahUserPushT);
          window.__ahUserPushT = setTimeout(() => { pushState().catch(() => {}); }, 2500);
        }
        return ret;
      };
    });
  }

  async function boot() {
    wrapRender();
    hookPersonalWrites();
    try {
      const tok = new URLSearchParams(location.search).get('verify');
      if (tok) {
        const data = await api('/auth/verify-link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: tok }) });
        history.replaceState({}, '', location.pathname + location.hash);
        await afterAuth(data);
        return;
      }
    } catch (e) { showErr('ahErr', authFriendly(e)); }
    try { cfg = await loadAuthConfig(); } catch (_) { cfg = { google: true, googleClientId: '673030739375-i91ini3ianip5sa88qemhjcao2hl3e3s.apps.googleusercontent.com', email: true, sms: false }; }
    if (cfg && cfg.googleClientId) loadGis().catch(() => {});
    window.AH_AUTH_CONFIG = cfg;
    const held = readWait();
    if (!token() && held && (held.waitId || held.id)) {
      draft.waitId = held.waitId || '';
      draft.id = held.id || draft.id;
      draft.masked = held.masked || draft.masked;
      draft.name = held.name || draft.name;
      draft.dob = held.dob || draft.dob;
      draft.school = held.school || draft.school;
      draft.college = held.college || draft.college;
      draft.password = held.password || draft.password;
      draft.confirm = held.confirm || draft.confirm;
      draft.linkSec = Math.max(5, Math.ceil((held.until - Date.now()) / 1000));
      setGate(true);
      go('checkmail');
      return;
    }
    const g = gateEl();
    if (g && !g.innerHTML.trim()) welcome();
    if (token()) {
      try {
        /* KV-রিপ্লিকেশন-সহন: লগইন-পর প্রথম me ৪০১ দিলেও রিট্রাই (৪×backoff) — সেশন ভুলে গেস্টে ফেলা না */
        let me = null, meErr = null;
        for (let att = 0; att < 4; att++) {
          try { me = await api('/auth/me', { headers: authH() }); break; }
          catch (e) { meErr = e; await new Promise((r) => setTimeout(r, 700 * (att + 1))); }
        }
        if (!me) throw (meErr || new Error('http-401'));
        if (me.user && (me.user.status === 'disabled' || me.user.status === 'suspended')) {
          setSession('', null); setGate(true); go('login'); return;
        }
        if (me.user) setSession(token(), me.user);
        setGate(false);
        await pullState();
        if (window.AdmissionCloudContent) AdmissionCloudContent.pull().catch(() => {});
        if (window.AHOnboard && typeof AHOnboard.maybeStart === 'function') {
          const onb = await AHOnboard.maybeStart();
          if (onb) return;
        }
      } catch (e) {
        const msg = String(e && e.message || e);
        if (/আগে লগইন|http-401|http-403|অ্যাকাউন্ট বন্ধ/.test(msg)) {
          setSession('', null);
          enterGuest();
          toast(lang === 'bn' ? 'সেশন শেষ হয়ে গেছে — গেস্ট মোডে চালিয়ে যাও' : 'Session ended — continuing in guest mode');
        } else {
          setGate(false);
        }
      }
    } else {
      enterGuest();
    }
    
    setInterval(() => { if (token()) pushState().catch(() => {}); }, 90000);
    let n = 0;
    setInterval(wrapRender, 800);
  }

  document.addEventListener('ah-get-started', () => { setGate(true); go('signup'); });
  window.AHAuth = { isAuthed: authed, isGuest: () => !authed(), user, token, logout, pushState, pullState, openLogin: () => { setGate(true); go('login'); }, prompt: openAuthPrompt, promptSkipped, enterGuest, closePrompt: closeAuthPrompt, renderProfile, renderProfileRoute, GuestBadges: mountGuestBadges };
  window.AdmissionAccount = window.AHAuth;
  injectAvatar();
  handleVerifyReturn();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 20));
  else setTimeout(boot, 20);
})();
