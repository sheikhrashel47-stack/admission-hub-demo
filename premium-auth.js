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
  let draft = { name: '', id: '', password: '', purpose: 'signup', masked: '', wait: 45 };
  let syncing = false;
  let otpTimer = 0;

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
  const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let fxRaf = 0, fx = null, particles = [];

  function sceneHTML(kind) {
    if (kind === 'welcome') return `<div class="ah-orb ah-orb-a"></div><div class="ah-orb ah-orb-b"></div><div class="ah-orb ah-orb-c"></div>
      <div class="ah-cap"><i class="top"></i><i class="tassel"></i></div>
      <div class="ah-crest"><i class="disc"></i><i class="wreath"></i><i class="book"></i></div>
      <div class="ah-open"><b></b><b></b></div>`;
    if (kind === 'book') return `<div class="ah-rig"><div class="ah-book"><i class="f"></i><i class="p"></i><i class="s"></i><i class="b"></i></div><div class="ah-ped"></div></div>`;
    if (kind === 'folk') return `<div class="ah-rig"><div class="ah-folk"><div class="p p1"></div><div class="ah-book" style="left:58%;top:58%;margin:0;transform:scale(.7)"><i class="f"></i><i class="p"></i><i class="s"></i><i class="b"></i></div><div class="p p2"></div></div><div class="ah-ped"></div></div>`;
    if (kind === 'lock') return `<div class="ah-rig"><div class="ah-shield"><div class="body"></div><div class="lock"></div></div><div class="ah-ped"></div></div>`;
    if (kind === 'ok') return `<div class="ah-rig"><div class="ah-shield"><div class="body"></div><div class="ok"></div></div><div class="ah-ped"></div></div>`;
    return '';
  }

  function ensureStage() {
    const el = gateEl(); if (!el) return null;
    let stage = el.querySelector('.ah-stage');
    if (!stage) {
      el.innerHTML = `<div class="ah-stage ah-dark"><canvas class="ah-fx"></canvas><div class="ah-world" id="ahWorld"></div><div class="ah-ui" id="ahAuthUI"></div></div>`;
      stage = el.querySelector('.ah-stage');
    }
    if (stage && !stage.__wired) {
      stage.__wired = true;
      bindParallax(stage);
      startFx(stage);
    }
    return stage;
  }
  function setScene(kind, dark) {
    const stage = ensureStage(); if (!stage) return;
    stage.classList.toggle('ah-dark', !!dark);
    stage.classList.toggle('ah-light', !dark);
    const world = stage.querySelector('.ah-world');
    if (world) world.innerHTML = sceneHTML(kind);
  }
  function bindParallax(stage) {
    if (reduced() || stage.__par) return;
    stage.__par = true;
    const tilt = (x, y) => {
      const world = stage.querySelector('.ah-world');
      if (!world) return;
      world.style.transform = `rotateY(${x * 10}deg) rotateX(${-y * 8}deg)`;
    };
    stage.addEventListener('pointermove', e => {
      const r = stage.getBoundingClientRect();
      tilt((e.clientX - r.left) / r.width - .5, (e.clientY - r.top) / r.height - .5);
    }, { passive: true });
    stage.addEventListener('pointerleave', () => tilt(0, 0));
  }
  function startFx(stage) {
    const c = stage.querySelector('.ah-fx'); if (!c || reduced()) return;
    const ctx = c.getContext('2d');
    const low = (navigator.hardwareConcurrency || 4) < 4 || navigator.connection && navigator.connection.saveData;
    const n = low ? 18 : 36;
    const resize = () => { c.width = stage.clientWidth; c.height = stage.clientHeight; };
    resize();
    particles = Array.from({ length: n }, () => ({
      x: Math.random(), y: Math.random(), z: Math.random(),
      s: 0.6 + Math.random() * 1.6, v: 0.0004 + Math.random() * 0.0008
    }));
    cancelAnimationFrame(fxRaf);
    const tick = () => {
      if (document.documentElement.dataset.ah !== 'out') { fxRaf = requestAnimationFrame(tick); return; }
      const w = c.width, h = c.height;
      ctx.clearRect(0, 0, w, h);
      const dark = stage.classList.contains('ah-dark');
      ctx.fillStyle = dark ? 'rgba(180,255,220,.28)' : 'rgba(15,107,79,.16)';
      for (const p of particles) {
        p.y -= p.v; if (p.y < -0.02) p.y = 1.02;
        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, p.s, 0, Math.PI * 2);
        ctx.fill();
      }
      fxRaf = requestAnimationFrame(tick);
    };
    fxRaf = requestAnimationFrame(tick);
    window.addEventListener('resize', resize, { passive: true });
  }

  const paint = (html, scene, dark) => {
    ensureStage();
    setScene(scene, dark);
    const ui = document.getElementById('ahAuthUI');
    if (ui) ui.innerHTML = html;
    bind();
  };

  const errBox = id => `<div class="ah-err" id="${id}"></div>`;
  const showErr = (id, m) => { const n = document.getElementById(id); if (n) n.textContent = m || ''; };
  const gSvg = `<svg class="ah-g" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.2-3.5 5.7-6.7 7.1l.1.1 6.3 5.3C36.9 41.5 44 36 44 24c0-1.3-.1-2.5-.4-3.5z"/></svg>`;
  const passField = (id, ph) => `<div class="ah-eye"><input class="ah-inp" id="${id}" type="password" placeholder="${ph}" autocomplete="new-password"><button type="button" data-eye="${id}" aria-label="Show password">Show</button></div>`;

  const welcome = () => paint(`
    <div style="flex:1"></div>
    <h1 class="ah-brand">ADMISSION HUB</h1>
    <p class="ah-tag">Learn Smart, Achieve More</p>
    <button class="ah-cta" type="button" data-go="login">Get Started <span>→</span></button>
  `, 'welcome', true);

  const login = (tab) => {
    tab = tab || 'pass';
    paint(`<button class="ah-back" type="button" data-go="welcome" aria-label="Back">←</button>
      <div style="height:150px"></div>
      <div class="ah-kicker">Welcome Back,<br>Scholar!</div>
      <p class="ah-sub">Login to continue your learning journey</p>
      <div class="ah-card">
        <div class="ah-tabs">
          <button type="button" class="${tab === 'pass' ? 'on' : ''}" data-go="login">Login</button>
          <button type="button" class="${tab === 'otp' ? 'on' : ''}" data-go="loginOtp">Login with OTP</button>
        </div>
        <label class="ah-lab">Email or Mobile Number</label>
        <input class="ah-inp" id="ahId" type="text" inputmode="email" placeholder="Email or Mobile Number" value="${esc(draft.id)}">
        ${tab === 'pass' ? `<label class="ah-lab">Password</label>${passField('ahPass', 'Password')}
          <div style="text-align:right;margin-top:8px"><button class="ah-link" type="button" data-go="forgot">Forgot Password?</button></div>
          ${errBox('ahErr')}
          <button class="ah-btn" type="button" id="ahDoLogin">Login</button>` : `${errBox('ahErr')}<button class="ah-btn" type="button" id="ahDoLoginOtp">Send OTP</button>`}
        <div class="ah-or">or continue with</div>
        <div id="ahGoogleSlot"><button class="ah-btn sec" type="button" id="ahGoogle">${gSvg} Continue with Google</button></div>
      </div>
      <div class="ah-foot">Don't have an account? <button class="ah-link" type="button" data-go="signup">Sign Up</button></div>
    `, 'book', false);
    mountGoogle();
  };

  const signup = () => paint(`<button class="ah-back" type="button" data-go="login">←</button>
    <div style="height:132px"></div>
    <div class="ah-kicker">Create Your<br>Account</div>
    <p class="ah-sub">Join thousands of learners on Admission Hub</p>
    <div class="ah-card">
      <label class="ah-lab">Full Name</label>
      <input class="ah-inp" id="ahName" placeholder="তোমার পূর্ণ নাম" value="${esc(draft.name)}">
      <label class="ah-lab">Email or Mobile Number</label>
      <input class="ah-inp" id="ahId" placeholder="name@gmail.com অথবা 01XXXXXXXXX" value="${esc(draft.id)}">
      <label class="ah-lab">Password</label>${passField('ahPass', 'কমপক্ষে ৮ অক্ষর, অক্ষর+সংখ্যা')}
      <label class="ah-lab">Confirm Password</label>${passField('ahPass2', 'Confirm Password')}
      <label class="ah-check"><input id="ahTerms" type="checkbox"> I agree to the Terms & Conditions and Privacy Policy</label>
      ${errBox('ahErr')}
      <button class="ah-btn" type="button" id="ahDoSignup">Sign Up</button>
    </div>
    <div class="ah-foot">Already have an account? <button class="ah-link" type="button" data-go="login">Login</button></div>
  `, 'folk', false);

  const otpScreen = () => paint(`<button class="ah-back" type="button" data-go="${draft.purpose === 'reset' ? 'forgot' : (draft.purpose === 'signup' ? 'signup' : 'login')}">←</button>
    <div style="height:150px"></div>
    <div class="ah-kicker">Verify Your<br>Number</div>
    <p class="ah-sub">We sent a 6-digit code to<br><b>${esc(draft.masked || draft.id)}</b><br><button class="ah-link" type="button" data-go="${draft.purpose === 'signup' ? 'signup' : 'login'}">Change Number</button></p>
    <div class="ah-card">
      <div class="ah-otp" id="ahOtp">${[0,1,2,3,4,5].map(i => `<input maxlength="1" inputmode="numeric" pattern="[0-9]*" data-otp="${i}" autocomplete="${i ? 'off' : 'one-time-code'}">`).join('')}</div>
      <div class="ah-foot" id="ahOtpWait">Resend code in 00:<b id="ahSec">${draft.wait || 45}</b></div>
      <button class="ah-link" type="button" id="ahResend" style="display:none;width:100%;margin-top:8px">Resend Code</button>
      ${errBox('ahErr')}
      <button class="ah-btn" type="button" id="ahDoVerify">Verify & Continue</button>
    </div>
  `, 'lock', false);

  const success = (title, sub, goTxt) => paint(`<div class="ah-success-copy">
    <div style="height:168px"></div>
    <div class="ah-kicker">${title}</div>
    <p class="ah-sub">${sub}</p>
    <button class="ah-btn" type="button" id="ahEnter">${goTxt}</button>
  </div>`, 'ok', false);

  const forgot = () => paint(`<button class="ah-back" type="button" data-go="login">←</button>
    <div style="height:132px"></div>
    <div class="ah-kicker">Forgot<br>Password</div>
    <p class="ah-sub">ইমেইল বা মোবাইলে ভেরিফিকেশন কোড যাবে</p>
    <div class="ah-card">
      <label class="ah-lab">Email or Mobile Number</label>
      <input class="ah-inp" id="ahId" value="${esc(draft.id)}" placeholder="Email or Mobile Number">
      ${errBox('ahErr')}
      <button class="ah-btn" type="button" id="ahDoForgot">Send Code</button>
    </div>
  `, 'lock', false);

  const reset = () => paint(`<button class="ah-back" type="button" data-go="forgot">←</button>
    <div class="ah-kicker">New Password</div>
    <p class="ah-sub">নতুন পাসওয়ার্ড সেট করো</p>
    <div class="ah-card">
      <label class="ah-lab">New Password</label>${passField('ahPass', 'কমপক্ষে ৮ অক্ষর')}
      <label class="ah-lab">Confirm Password</label>${passField('ahPass2', 'Confirm Password')}
      ${errBox('ahErr')}
      <button class="ah-btn" type="button" id="ahDoReset">Update Password</button>
    </div>
  `, 'book', false);

  function esc(s) { return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  function go(name) {
    view = name;
    if (name === 'welcome') return welcome();
    if (name === 'login') return login('pass');
    if (name === 'loginOtp') return login('otp');
    if (name === 'signup') return signup();
    if (name === 'otp') return otpScreen();
    if (name === 'forgot') return forgot();
    if (name === 'reset') return reset();
    if (name === 'ok') return success('Welcome Aboard! 🎉', 'Your account has been verified successfully.', 'Go to Dashboard');
    if (name === 'resetOk') return success('All Set! 🎉', 'Your password has been updated successfully.', 'Login');
  }

  function bind() {
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
    const enter = document.getElementById('ahEnter');
    if (enter) enter.onclick = () => { if (view === 'resetOk') go('login'); else enterApp(); };
    const resend = document.getElementById('ahResend');
    if (resend) resend.onclick = resendOtp;
    setupOtpInputs();
    startOtpCountdown();
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
  function startOtpCountdown() {
    const sec = document.getElementById('ahSec');
    if (!sec) return;
    clearInterval(otpTimer);
    let n = Number(draft.wait || 45);
    otpTimer = setInterval(() => {
      n -= 1;
      if (sec) sec.textContent = String(Math.max(0, n));
      if (n <= 0) {
        clearInterval(otpTimer);
        const w = document.getElementById('ahOtpWait'); if (w) w.style.display = 'none';
        const r = document.getElementById('ahResend'); if (r) r.style.display = 'block';
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
      draft.masked = data.masked; draft.wait = data.wait || 45;
      go('otp');
    } catch (e) { showErr('ahErr', e.message); }
  }
  async function doSignup() {
    try {
      draft.name = document.getElementById('ahName').value.trim();
      draft.id = document.getElementById('ahId').value.trim();
      const password = document.getElementById('ahPass').value;
      const confirm = document.getElementById('ahPass2').value;
      if (!document.getElementById('ahTerms').checked) return showErr('ahErr', 'শর্তাবলীতে রাজি হতে হবে');
      if (password !== confirm) return showErr('ahErr', 'পাসওয়ার্ড দুটো মিলছে না');
      draft.password = password;
      draft.purpose = 'signup';
      const data = await api('/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: draft.name, id: draft.id, password, confirm }) });
      draft.masked = data.masked; draft.wait = data.wait || 45;
      go('otp');
    } catch (e) { showErr('ahErr', e.message); }
  }
  async function doVerify() {
    try {
      const code = readOtp();
      if (code.length !== 6) return showErr('ahErr', '৬ অঙ্কের কোড লেখো');
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
      draft.wait = data.wait || 45;
      go('otp');
    } catch (e) { showErr('ahErr', e.message); }
  }
  async function doForgot() {
    try {
      draft.id = document.getElementById('ahId').value.trim();
      draft.purpose = 'reset';
      const data = await api('/auth/forgot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: draft.id }) });
      draft.masked = data.masked; draft.wait = data.wait || 45;
      go('otp');
    } catch (e) { showErr('ahErr', e.message); }
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

  function mountGoogle() {
    const slot = document.getElementById('ahGoogleSlot');
    if (!slot) return;
    if (!cfg.google || !cfg.googleClientId) {
      slot.innerHTML = '';
      return;
    }
    loadGis().then(() => {
      if (!window.google || !google.accounts || !google.accounts.id) return;
      slot.innerHTML = '<div id="ahGisBtn" style="display:flex;justify-content:center"></div>';
      try {
        google.accounts.id.initialize({
          client_id: cfg.googleClientId,
          callback: async (resp) => {
            try {
              const data = await api('/auth/google', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: resp.credential }) });
              await afterAuth(data);
            } catch (e) { showErr('ahErr', e.message); }
          },
          ux_mode: 'popup'
        });
        google.accounts.id.renderButton(document.getElementById('ahGisBtn'), { theme: 'outline', size: 'large', width: 320, text: 'continue_with', shape: 'rectangular' });
      } catch (_) {}
    }).catch(() => {});
  }
  function loadGis() {
    return new Promise((resolve, reject) => {
      if (window.google && google.accounts) return resolve();
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.onload = () => resolve();
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  async function doGoogle() {
    if (!cfg.googleClientId) return showErr('ahErr', 'Google লগইন এখন সেটআপ নেই');
    try {
      await loadGis();
      google.accounts.id.initialize({
        client_id: cfg.googleClientId,
        callback: async (resp) => {
          try {
            const data = await api('/auth/google', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: resp.credential }) });
            await afterAuth(data);
          } catch (e) { showErr('ahErr', e.message); }
        }
      });
      google.accounts.id.prompt();
    } catch (e) { showErr('ahErr', e.message || 'Google লগইন ব্যর্থ'); }
  }

  async function afterAuth(data) {
    setSession(data.token, data.user);
    await enterApp();
  }

  async function enterApp() {
    setGate(false);
    try { await pullState(); } catch (_) {}
    try { if (window.AdmissionCloudContent) await AdmissionCloudContent.pull(); } catch (_) {}
    try { await pushState(); } catch (_) {}
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
    try { cfg = await api('/auth/config'); } catch (_) {}
    window.AH_AUTH_CONFIG = cfg;
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

  document.addEventListener('ah-get-started', () => { setGate(true); go('login'); });
  window.AHAuth = { isAuthed: authed, user, token, logout, pushState, pullState, openLogin: () => { setGate(true); go('login'); }, renderProfile, renderEdit };
  window.AdmissionAccount = window.AHAuth;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 20));
  else setTimeout(boot, 20);
})();
