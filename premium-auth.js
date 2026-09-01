/* Phase 3 — dedicated premium auth gate + profile. Phase 1 screens untouched. */
(() => {
  'use strict';
  if (window.__ahPremiumAuth) return;
  window.__ahPremiumAuth = true;
  const WORKER = 'https://admission-gk.rashelzayan213.workers.dev';
  const PUB = WORKER + '/pub';
  const LS_TOKEN = 'ahPubToken';
  const LS_USER = 'ahPubUser';
  const PERSONAL = ['examResults', 'mistakes', 'settings', 'dailyStats', 'activityLogs', 'notes'];
  let cfg = { google: false, googleClientId: '', email: false, sms: false };
  let view = 'welcome';
  let typeGen = 0;
  let lang = 'en';
  try { if (localStorage.getItem('ahLang') === 'bn') lang = 'bn'; } catch (_) {}
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
      verifyTitle: 'Verify your account', verifySub: 'One last step to secure your account',
      emailWay: 'Continue with Email Verification', hint: 'Choose whichever is more convenient for you.',
      emailTitle: 'Verify your email', emailSub: "We'll send a verification link",
      sendLink: 'Send verification link', checkEmail: 'Confirm your email',
      linkSent: 'A verification message has been sent to',
      linkTap: 'Open the link in that message to activate your account.',
      processing: 'Processing…', waitingMail: 'Please keep this page open. Once the link is confirmed, this device will sign you in.',
      linkExpires: 'Link expires in', linkExpired: 'The verification link has expired. Please request a new one.',
      resendLink: 'Resend verification link', forgot: 'Forgot password?',
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
      verifyTitle: 'অ্যাকাউন্ট যাচাইকরণ', verifySub: 'নিরাপত্তার জন্য শেষ ধাপ',
      emailWay: 'ইমেইল যাচাইকরণ', hint: 'আপনার সুবিধামতো পদ্ধতি বেছে নিন।',
      emailTitle: 'ইমেইল যাচাইকরণ', emailSub: 'যাচাইকরণ লিংক প্রেরণ করা হবে',
      sendLink: 'যাচাইকরণ লিংক পাঠান', checkEmail: 'ইমেইল নিশ্চিতকরণ',
      linkSent: 'যাচাইকরণ বার্তা প্রেরণ করা হয়েছে',
      linkTap: 'বার্তার লিংক খুললে আপনার অ্যাকাউন্ট সক্রিয় হবে।',
      processing: 'প্রক্রিয়াকরণ চলছে…', waitingMail: 'এই পাতা খোলা রাখুন। লিংক নিশ্চিত হলে এই ডিভাইসে স্বয়ংক্রিয়ভাবে প্রবেশ করবে।',
      linkExpires: 'লিংকের মেয়াদ', linkExpired: 'যাচাইকরণ লিংকের মেয়াদ শেষ হয়েছে। নতুন লিংক প্রেরণ করুন।',
      resendLink: 'নতুন লিংক প্রেরণ করুন', forgot: 'পাসওয়ার্ড ভুলে গেছেন?',
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

  const api = async (path, opts = {}) => {
    const res = await fetch(PUB + path, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || ('http-' + res.status));
    return data;
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
    <p class="ah-count-lab">${t('linkExpires')}</p>
    <div class="ah-count" id="ahCount">15:00</div>
    <p class="ah-p" id="ahWaitNote">${t('waitingMail')}</p>
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
    if (pk) pk.onclick = () => (view === 'login' ? doPasskeyLogin() : doPasskeyRegister());
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
    } catch (e) { showErr('ahErr', e.message); }
  }
  async function doLoginOtp() {
    try {
      draft.id = document.getElementById('ahId').value.trim();
      draft.purpose = 'login';
      const data = await api('/auth/otp/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: draft.id, purpose: 'login' }) });
      draft.masked = data.masked; draft.wait = data.wait || 900;
      go('otp');
    } catch (e) { showErr('ahErr', e.message); }
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
      if (btn) { btn.classList.add('ah-busy'); btn.disabled = true; btn.innerHTML = '<i class="ah-spin"></i>' + t('processing'); }
      const data = await api('/auth/register-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: draft.name, id: draft.id, dob: draft.dob, school: draft.school, college: draft.college, password: draft.password, confirm: draft.confirm }) });
      draft.masked = data.masked;
      draft.waitId = data.waitId || '';
      draft.linkSec = Number(data.expiresIn || 900);
      persistWait();
      go('checkmail');
    } catch (e) {
      if (btn) { btn.classList.remove('ah-busy'); btn.disabled = false; btn.innerHTML = prev || t('sendLink'); }
      showErr('ahErr', e.message);
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
      draft.linkSec = Number(data.expiresIn || 900);
      persistWait();
      go('checkmail');
    } catch (e) {
      if (btn) { btn.classList.remove('ah-busy'); btn.disabled = false; btn.innerHTML = prev || t('resendLink'); }
      showErr('ahErr', e.message);
    }
  }
  function persistWait() {
    try {
      sessionStorage.setItem('ahWait', JSON.stringify({
        waitId: draft.waitId, id: draft.id, masked: draft.masked, name: draft.name,
        dob: draft.dob, school: draft.school, college: draft.college,
        password: draft.password, confirm: draft.confirm,
        until: Date.now() + 15 * 60 * 1000
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
    } catch (e) { showErr('ahErr', e.message); }
  }
  async function resendOtp() {
    try {
      const data = await api('/auth/otp/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: draft.id, purpose: draft.purpose }) });
      draft.wait = data.wait || 900;
      go('otp');
    } catch (e) { showErr('ahErr', e.message); }
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
      showErr('ahErr', e.message);
    }
  }
  async function doReset() {
    try {
      const password = document.getElementById('ahPass').value;
      const confirm = document.getElementById('ahPass2').value;
      const data = await api('/auth/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: draft.id, password, confirm }) });
      if (data.token) setSession(data.token, data.user);
      go('resetOk');
    } catch (e) { showErr('ahErr', e.message); }
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
      showErr('ahErr', e.name === 'NotAllowedError' ? 'Passkey বাতিল' : (e.message || 'Passkey ব্যর্থ'));
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
  function loadGis() {
    return new Promise((resolve, reject) => {
      if (window.google && google.accounts && google.accounts.oauth2) return resolve();
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Google লোড হয়নি'));
      document.head.appendChild(s);
    });
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
        catch (e) { showErr('ahErr', e.message); }
      }
    });
    client.requestAccessToken({ prompt: 'select_account' });
  }
  async function doGoogle() {
    if (!cfg.googleClientId) return showErr('ahErr', lang === 'bn' ? 'গুগল লগইন এখন সেটআপ নেই' : 'Google login is not set up');
    const btn = document.getElementById('ahGoogle');
    try {
      if (window.google && google.accounts && google.accounts.oauth2) {
        startGooglePicker();
        return;
      }
      if (btn) { btn.classList.add('ah-busy'); btn.disabled = true; }
      await loadGis();
      startGooglePicker();
    } catch (e) { showErr('ahErr', e.message || (lang === 'bn' ? 'গুগল লগইন ব্যর্থ' : 'Google login failed')); }
    finally { if (btn) { btn.classList.remove('ah-busy'); btn.disabled = false; } }
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
    setGate(true);
    go('welcome');
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
      if (p === 'profile') return renderProfile();
      if (p === 'profile/edit') return renderEdit();
      if (p === 'profile/security') return renderSecurity();
      return cur.apply(this, arguments);
    };
    wrapped.__ahAuthWrap = true;
    window.render = wrapped;
  }

  function injectAvatar() {}

  function completion(u) {
    const keys = ['name', 'email', 'mobile', 'photo', 'institution', 'targetUniversity', 'targetUnit', 'admissionYear', 'bio', 'dob'];
    const n = keys.filter(k => u && String(u[k] || '').trim()).length;
    return Math.round(n / keys.length * 100);
  }

  function renderProfile() {
    const u = user() || {};
    const pct = completion(u);
    const stats = (typeof computeLifetimeStats === 'function') ? computeLifetimeStats() : { exams: 0 };
    const exams = (window.CACHE && CACHE.examResults) ? CACHE.examResults.length : (stats.exams || 0);
    const avg = (window.CACHE && CACHE.examResults && CACHE.examResults.length)
      ? Math.round(CACHE.examResults.reduce((s, x) => s + (Number(x.pct || x.percent || 0)), 0) / CACHE.examResults.length) : 0;
    const html = `<div class="ah-prof" style="padding:8px 4px 24px;text-align:center">
      <div style="position:relative;display:inline-block;margin:8px 0 10px">
        ${u.photo ? `<img class="ah-av" src="${u.photo}" style="width:92px;height:92px">` : `<div class="ah-av" style="width:92px;height:92px;display:grid;place-items:center;font-size:32px;color:#fff">${esc((u.name || 'S')[0])}</div>`}
      </div>
      <div style="font-size:22px;font-weight:800">${esc(u.name || 'Scholar')}</div>
      <div class="muted" style="margin:4px 0 14px">${esc(u.bio || 'Dream Big, Achieve Bigger')} ${u.verified ? '✓' : ''}</div>
      <div class="card" style="text-align:left;font-size:13px">
        <div class="row between" style="padding:8px 0"><span class="muted">User ID</span><b>${esc(String(u.uid || '').slice(0, 14))}</b></div>
        <div class="row between" style="padding:8px 0"><span class="muted">Email</span><span>${esc(u.email || '—')} ${u.emailVerified ? '<span style="color:#0f6b4f">Verified</span>' : ''}</span></div>
        <div class="row between" style="padding:8px 0"><span class="muted">Mobile</span><span>${esc(u.mobile || '—')} ${u.mobileVerified ? '<span style="color:#0f6b4f">Verified</span>' : ''}</span></div>
        <div class="row between" style="padding:8px 0"><span class="muted">Member Since</span><b>${u.created ? new Date(u.created).toLocaleDateString() : '—'}</b></div>
        <div class="row between" style="padding:8px 0"><span class="muted">Account Status</span><b style="color:#0f6b4f">${esc(u.status || 'active')}</b></div>
      </div>
      <div class="card" style="text-align:left;margin-top:10px">
        <div class="row between"><span>Profile Completion</span><b>${pct}%</b></div>
        <div class="ah-bar" style="margin-top:8px"><i style="width:${pct}%"></i></div>
      </div>
      <div class="stat">
        <div><b>${exams}</b><span class="muted">Tests Taken</span></div>
        <div><b>${avg}%</b><span class="muted">Avg. Score</span></div>
        <div><b>—</b><span class="muted">Study Time</span></div>
      </div>
      <button class="btn" style="width:100%;margin-top:16px" type="button" onclick="navigate('profile/edit')">Edit Profile</button>
      <button class="btn ghost" style="width:100%;margin-top:8px" type="button" onclick="navigate('profile/security')">Security</button>
      <button class="btn ghost" style="width:100%;margin-top:8px;color:#c0392b" type="button" id="ahLogoutBtn">Logout</button>
    </div>`;
    if (typeof renderShell === 'function') renderShell(html, { title: '', back: "navigate('dashboard')", actions: ['<button class="iconbtn" onclick="navigate(\'profile/edit\')" aria-label="Edit">✎</button>'] });
    document.getElementById('ahLogoutBtn')?.addEventListener('click', logout);
  }

  function renderEdit() {
    const u = user() || {};
    const html = `<div style="padding:4px 2px 28px">
      <div style="text-align:center;margin:8px 0 14px">
        ${u.photo ? `<img class="ah-av" src="${u.photo}" style="width:88px;height:88px">` : `<div class="ah-av" style="width:88px;height:88px;margin:0 auto;display:grid;place-items:center;color:#fff;font-size:28px">${esc((u.name || 'S')[0])}</div>`}
        <div><button class="ah-link" type="button" id="ahPhotoBtn">Change Photo</button></div>
      </div>
      <label class="ah-lab">Full Name</label><input class="ah-inp" id="pfName" value="${esc(u.name || '')}">
      <label class="ah-lab">Display Name</label><input class="ah-inp" id="pfDisplay" value="${esc(u.displayName || '')}">
      <label class="ah-lab">Email</label><input class="ah-inp" id="pfEmail" value="${esc(u.email || '')}" disabled>
      <label class="ah-lab">Mobile</label><input class="ah-inp" id="pfMobile" value="${esc(u.mobile || '')}" disabled>
      <label class="ah-lab">Date of Birth (optional)</label><input class="ah-inp" id="pfDob" value="${esc(u.dob || '')}" placeholder="12 May 2003">
      <label class="ah-lab">Institution / College (optional)</label><input class="ah-inp" id="pfInst" value="${esc(u.institution || '')}">
      <label class="ah-lab">Target University (optional)</label><input class="ah-inp" id="pfUni" value="${esc(u.targetUniversity || '')}">
      <label class="ah-lab">Target Unit (optional)</label><input class="ah-inp" id="pfUnit" value="${esc(u.targetUnit || '')}">
      <label class="ah-lab">Admission Year (optional)</label><input class="ah-inp" id="pfYear" value="${esc(u.admissionYear || '')}">
      <label class="ah-lab">Short Bio (optional)</label><input class="ah-inp" id="pfBio" value="${esc(u.bio || '')}" maxlength="200">
      <button class="ah-btn" type="button" id="pfSave">Save Changes</button>
    </div>`;
    if (typeof renderShell === 'function') renderShell(html, { title: 'Edit Profile', back: "navigate('profile')" });
    document.getElementById('ahPhotoBtn')?.addEventListener('click', openPhotoSheet);
    document.getElementById('pfSave')?.addEventListener('click', async () => {
      try {
        const body = {
          name: document.getElementById('pfName').value,
          displayName: document.getElementById('pfDisplay').value,
          dob: document.getElementById('pfDob').value,
          institution: document.getElementById('pfInst').value,
          targetUniversity: document.getElementById('pfUni').value,
          targetUnit: document.getElementById('pfUnit').value,
          admissionYear: document.getElementById('pfYear').value,
          bio: document.getElementById('pfBio').value
        };
        const data = await api('/profile', { method: 'PUT', headers: authH(), body: JSON.stringify(body) });
        setSession(token(), data.user);
        toast('প্রোফাইল আপডেট হয়েছে');
        navigate('profile');
      } catch (e) { toast(e.message); }
    });
  }

  function renderSecurity() {
    const html = `<div style="padding:8px 2px 28px">
      <div class="ah-kicker" style="font-size:22px">Security</div>
      <label class="ah-lab">Current Password</label>${passField('curPass', 'Current Password')}
      <label class="ah-lab">New Password</label>${passField('newPass', 'New Password')}
      <label class="ah-lab">Confirm New Password</label>${passField('newPass2', 'Confirm')}
      ${errBox('ahErr')}
      <button class="ah-btn" type="button" id="ahChPass">Change Password</button>
      <button class="btn ghost" style="width:100%;margin-top:24px;color:#c0392b" type="button" id="ahDel">Delete Account</button>
    </div>`;
    if (typeof renderShell === 'function') renderShell(html, { title: 'Security', back: "navigate('profile')" });
    document.querySelectorAll('[data-eye]').forEach(b => b.onclick = () => {
      const inp = document.getElementById(b.getAttribute('data-eye'));
      if (inp) inp.type = inp.type === 'password' ? 'text' : 'password';
    });
    document.getElementById('ahChPass')?.addEventListener('click', async () => {
      try {
        await api('/auth/password', { method: 'POST', headers: authH(), body: JSON.stringify({ current: document.getElementById('curPass').value, password: document.getElementById('newPass').value, confirm: document.getElementById('newPass2').value }) });
        toast('পাসওয়ার্ড বদলেছে');
      } catch (e) { showErr('ahErr', e.message); }
    });
    document.getElementById('ahDel')?.addEventListener('click', async () => {
      if (!confirm('অ্যাকাউন্ট মুছে যাবে। নিশ্চিত?')) return;
      const password = prompt('পাসওয়ার্ড লেখো') || '';
      try {
        await api('/auth/delete', { method: 'POST', headers: authH(), body: JSON.stringify({ password }) });
        await logout();
      } catch (e) { toast(e.message); }
    });
  }

  function passField(id, ph) {
    return `<div class="ah-field"><input class="ah-inp" id="${id}" type="password" placeholder="${ph}"><button class="ah-eye" type="button" data-eye="${id}" aria-label="Show password">👁</button></div>`;
  }

  function openPhotoSheet() {
    const wrap = document.createElement('div');
    wrap.className = 'ah-sheet';
    wrap.innerHTML = `<div class="box">
      <div style="font-weight:800;margin-bottom:8px">Change Profile Photo</div>
      <button class="row" type="button" id="ahCam">📷 Take Photo</button>
      <button class="row" type="button" id="ahGal">🖼 Choose from Gallery</button>
      <button class="row" type="button" id="ahRem">🗑 Remove Photo</button>
      <button class="ah-btn sec" type="button" id="ahCan">Cancel</button>
      <input id="ahFileCam" type="file" accept="image/*" capture="environment" hidden>
      <input id="ahFileGal" type="file" accept="image/*" hidden>
    </div>`;
    wrap.addEventListener('click', e => { if (e.target === wrap) wrap.remove(); });
    document.body.appendChild(wrap);
    wrap.querySelector('#ahCan').onclick = () => wrap.remove();
    wrap.querySelector('#ahCam').onclick = () => wrap.querySelector('#ahFileCam').click();
    wrap.querySelector('#ahGal').onclick = () => wrap.querySelector('#ahFileGal').click();
    wrap.querySelector('#ahRem').onclick = async () => {
      try {
        const data = await api('/profile/photo', { method: 'POST', headers: authH(), body: JSON.stringify({ remove: true }) });
        setSession(token(), data.user); wrap.remove(); renderEdit();
      } catch (e) { toast(e.message); }
    };
    const onFile = async ev => {
      const f = ev.target.files && ev.target.files[0]; if (!f) return;
      if (!/^image\//.test(f.type)) return toast('শুধু ছবি');
      if (f.size > 8 * 1024 * 1024) return toast('ছবি খুব বড়');
      const dataUrl = await compressImage(f);
      try {
        const data = await api('/profile/photo', { method: 'POST', headers: authH(), body: JSON.stringify({ dataUrl }) });
        setSession(token(), data.user); wrap.remove(); renderEdit();
      } catch (e) { toast(e.message); }
    };
    wrap.querySelector('#ahFileCam').onchange = onFile;
    wrap.querySelector('#ahFileGal').onchange = onFile;
  }

  function compressImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const s = 256;
        const c = document.createElement('canvas');
        c.width = s; c.height = s;
        const ctx = c.getContext('2d');
        const m = Math.min(img.width, img.height);
        ctx.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, s, s);
        resolve(c.toDataURL('image/jpeg', 0.72));
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

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
    } catch (e) { showErr('ahErr', e.message); }
    try { cfg = await api('/auth/config'); } catch (_) {}
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
        const me = await api('/auth/me', { headers: authH() });
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
          setSession('', null); setGate(true); go('welcome');
        } else {
          setGate(false);
        }
      }
    } else {
      setGate(true);
      if (view === 'welcome') welcome();
    }
    
    setInterval(() => { if (token()) pushState().catch(() => {}); }, 90000);
    let n = 0;
    setInterval(wrapRender, 800);
  }

  document.addEventListener('ah-get-started', () => { setGate(true); go('signup'); });
  window.AHAuth = { isAuthed: authed, user, token, logout, pushState, pullState, openLogin: () => { setGate(true); go('login'); }, renderProfile, renderEdit };
  window.AdmissionAccount = window.AHAuth;
  handleVerifyReturn();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 20));
  else setTimeout(boot, 20);
})();
