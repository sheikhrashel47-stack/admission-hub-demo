/* Phase 3 — public product accounts + personal cloud data. UI language matches existing cards. */
(() => {
  'use strict';
  if (window.__ahUserAccount) return;
  window.__ahUserAccount = true;
  const WORKER = 'https://admission-gk.admissionhub.workers.dev';
  const PUB = WORKER + '/api';
  const LS_TOKEN = 'ahPubToken';
  const LS_USER = 'ahPubUser';
  const PERSONAL = ['examResults', 'mistakes', 'settings', 'dailyStats', 'activityLogs', 'notes', 'admissionPlans', 'planDays', 'deletedQuestions'];
  /* মাল্টি-ডিভাইস মার্জ: per-row সর্বশেষ-সময় জেতে; খালি-পক্ষ কখনো মুছে না (data-loss নয়) */
  const rowTs = (x) => Number((x && (x.updatedAt || x.at || x.ts || x.date)) || 0) || 0;
  const mergeRows = (local, remote) => {
    const m = new Map();
    (Array.isArray(local) ? local : []).forEach((x) => { if (x && x.id) m.set(String(x.id), x); });
    (Array.isArray(remote) ? remote : []).forEach((x) => {
      if (!x || !x.id) return;
      const k = String(x.id), cur = m.get(k);
      if (!cur || rowTs(x) >= rowTs(cur)) m.set(k, x); /* সর্বশেষ সংস্করণ */
    });
    return [...m.values()];
  };
  const mergeSettings = (local, remote) => {
    const a = (local && typeof local === 'object') ? local : {};
    const b = (remote && typeof remote === 'object') ? remote : {};
    return Object.assign({}, a, b);
  };
  let config = { google: false, googleClientId: '' };
  let syncing = false;

  const token = () => { try { return localStorage.getItem(LS_TOKEN) || ''; } catch (_) { return ''; } };
  const user = () => { try { return JSON.parse(localStorage.getItem(LS_USER) || 'null'); } catch (_) { return null; } };
  const setSession = (tok, u) => {
    try {
      if (tok) localStorage.setItem(LS_TOKEN, tok); else localStorage.removeItem(LS_TOKEN);
      if (u) localStorage.setItem(LS_USER, JSON.stringify(u)); else localStorage.removeItem(LS_USER);
    } catch (_) {}
  };
  const authH = () => ({ 'Content-Type': 'application/json', Authorization: 'Bearer ' + token() });
  const toast = m => { if (typeof window.toast === 'function') window.toast(m); };

  const api = async (path, opts = {}) => {
    const res = await fetch(PUB + path, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || ('http-' + res.status));
    return data;
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
    if (!doc || typeof doc !== 'object') return false;
    for (const st of PERSONAL) {
      const incoming = Array.isArray(doc[st]) ? doc[st] : (st === 'settings' && doc[st] ? [doc[st]] : []);
      if (!incoming.length) continue; /* সার্ভারে কিছু নেই → স্থানীয় ওভাররাইট নয় */
      if (st === 'settings') {
        const cur = (typeof dbGet === 'function') ? await dbGet(st, 'main').catch(() => null) : null;
        const merged = mergeSettings(cur || {}, incoming[0]);
        if (typeof dbPut === 'function') { await dbPut(st, Object.assign({ id: 'main' }, merged)).catch(() => {}); }
        continue;
      }
      const local = (typeof dbGetAll === 'function') ? await dbGetAll(st).catch(() => []) : [];
      const merged = mergeRows(local, incoming.filter(x => x && x.id));
      if (window.AdmissionCloudContent && AdmissionCloudContent.putManyFast) await AdmissionCloudContent.putManyFast(st, merged);
      else if (typeof dbPutMany === 'function') await dbPutMany(st, merged);
    }
    if (typeof loadCache === 'function') await loadCache();
    if (typeof applyTheme === 'function') applyTheme();
    if (typeof render === 'function') render();
    return true;
  };

  const pushState = async () => {
    if (!token() || syncing) return;
    syncing = true;
    try {
      const body = await collectPersonal();
      await api('/state', { method: 'POST', headers: authH(), body: JSON.stringify(body) });
      window.__ahUserLastPush = Date.now();
    } catch (e) {
      window.__ahUserSyncErr = String(e.message || e).slice(0, 120);
    } finally { syncing = false; }
  };

  const pullState = async () => {
    if (!token()) return;
    try {
      const doc = await api('/state', { headers: authH() });
      if (doc && doc.v) await applyPersonal(doc);
    } catch (e) {
      window.__ahUserSyncErr = String(e.message || e).slice(0, 120);
    }
  };

  const afterLogin = async (data) => {
    setSession(data.token, data.user);
    toast('লগইন হয়েছে');
    closeSheet();
    await pullState();
    await pushState();
    mountCard();
  };

  const exportData = async () => {
    if (!token()) return;
    try {
      const res = await fetch(PUB + '/export', { headers: { Authorization: 'Bearer ' + token() } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || ('http-' + res.status));
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'admission-hub-my-data-' + new Date().toISOString().slice(0, 10) + '.json';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      toast('তোমার ডেটা ডাউনলোড হয়েছে (JSON)');
    } catch (e) { toast(String(e.message || e), true); }
  };

  const logout = async () => {
    try { if (token()) await api('/auth/logout', { method: 'POST', headers: authH() }); } catch (_) {}
    setSession('', null);
    toast('লগআউট হয়েছে');
    mountCard();
  };

  const closeSheet = () => document.getElementById('ah-account-sheet')?.remove();

  const sheet = (inner) => {
    closeSheet();
    const wrap = document.createElement('div');
    wrap.id = 'ah-account-sheet';
    wrap.innerHTML = `<div class="modal-bg" onclick="if(event.target===this)this.remove()" style="z-index:4000"><div class="modal" onclick="event.stopPropagation()">${inner}</div></div>`;
    wrap.querySelector('.modal-bg').onclick = (e) => { if (e.target.classList.contains('modal-bg')) closeSheet(); };
    document.body.appendChild(wrap);
  };

  const field = (id, label, type, ph) => `<label class="muted" style="display:block;margin:10px 0 4px;font-size:12px">${label}</label><input id="${id}" class="input" type="${type}" placeholder="${ph}" autocomplete="off" style="width:100%;padding:12px 12px;border:1px solid var(--line);border-radius:12px;background:var(--card);color:var(--text);font-size:16px">`;

  const openRegister = () => {
    sheet(`<h3 style="margin:0 0 8px">নতুন অ্যাকাউন্ট</h3>
      <p class="muted" style="margin:0 0 12px">ইমেইল বা মোবাইল + পাসওয়ার্ড। তোমার পরীক্ষার হিস্ট্রি ক্লাউডে সেভ হবে।</p>
      ${field('ahAccName', 'নাম', 'text', 'তোমার নাম')}
      ${field('ahAccId', 'ইমেইল বা মোবাইল', 'text', 'name@gmail.com অথবা 01XXXXXXXXX')}
      ${field('ahAccPass', 'পাসওয়ার্ড', 'password', 'কমপক্ষে ৬ অক্ষর')}
      <div style="display:flex;gap:8px;margin-top:16px">
        <button class="btn" id="ahAccGo" style="flex:1">তৈরি করো</button>
        <button class="btn secondary" id="ahAccOtp" type="button">OTP</button>
      </div>
      <button class="btn ghost" id="ahAccLoginLink" style="width:100%;margin-top:8px">আগে থেকে অ্যাকাউন্ট আছে? লগইন</button>`);
    document.getElementById('ahAccGo').onclick = async () => {
      try {
        const data = await api('/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: document.getElementById('ahAccName').value, id: document.getElementById('ahAccId').value, password: document.getElementById('ahAccPass').value }) });
        await afterLogin(data);
      } catch (e) { toast(String(e.message || e)); }
    };
    document.getElementById('ahAccOtp').onclick = () => openOtp();
    document.getElementById('ahAccLoginLink').onclick = () => openLogin();
  };

  const openLogin = () => {
    sheet(`<h3 style="margin:0 0 8px">লগইন</h3>
      ${field('ahAccId', 'ইমেইল বা মোবাইল', 'text', 'name@gmail.com অথবা 01XXXXXXXXX')}
      ${field('ahAccPass', 'পাসওয়ার্ড', 'password', 'পাসওয়ার্ড')}
      <div style="display:flex;gap:8px;margin-top:16px">
        <button class="btn" id="ahAccGo" style="flex:1">লগইন</button>
        <button class="btn secondary" id="ahAccOtp" type="button">OTP</button>
      </div>
      <button class="btn ghost" id="ahAccRegLink" style="width:100%;margin-top:8px">নতুন অ্যাকাউন্ট</button>`);
    document.getElementById('ahAccGo').onclick = async () => {
      try {
        const data = await api('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: document.getElementById('ahAccId').value, password: document.getElementById('ahAccPass').value }) });
        await afterLogin(data);
      } catch (e) { toast(String(e.message || e)); }
    };
    document.getElementById('ahAccOtp').onclick = () => openOtp();
    document.getElementById('ahAccRegLink').onclick = () => openRegister();
  };

  const openOtp = () => {
    sheet(`<h3 style="margin:0 0 8px">OTP লগইন</h3>
      ${field('ahAccId', 'ইমেইল বা মোবাইল', 'text', 'name@gmail.com অথবা 01XXXXXXXXX')}
      ${field('ahAccName', 'নাম (নতুন হলে)', 'text', 'ঐচ্ছিক')}
      <button class="btn" id="ahAccSend" style="width:100%;margin-top:14px">কোড পাঠাও</button>
      <div id="ahAccOtpBox" style="display:none;margin-top:12px">
        ${field('ahAccCode', '৬ অঙ্কের কোড', 'text', '000000')}
        <button class="btn" id="ahAccVerify" style="width:100%;margin-top:12px">ভেরিফাই</button>
      </div>`);
    document.getElementById('ahAccSend').onclick = async () => {
      try {
        const data = await api('/auth/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: document.getElementById('ahAccId').value }) });
        document.getElementById('ahAccOtpBox').style.display = 'block';
        toast(data.note || 'কোড পাঠানো হয়েছে');
        if (data.demo && data.code) document.getElementById('ahAccCode').value = data.code;
      } catch (e) { toast(String(e.message || e)); }
    };
    document.getElementById('ahAccVerify').onclick = async () => {
      try {
        const data = await api('/auth/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: document.getElementById('ahAccId').value, code: document.getElementById('ahAccCode').value, name: document.getElementById('ahAccName').value }) });
        await afterLogin(data);
      } catch (e) { toast(String(e.message || e)); }
    };
  };

  const cardHtml = () => {
    const u = user();
    if (u && token()) {
      return `<section class="card" id="ah-account-card"><div class="row between"><b>অ্যাকাউন্ট</b><span class="muted" style="font-size:11px">${u.status === 'verified' || u.verified ? 'ভেরিফায়েড' : 'লগইন'}</span></div>
        <div style="margin-top:8px;font-size:15px;font-weight:700">${u.name || 'শিক্ষার্থী'}</div>
        <div class="muted" style="font-size:12px;margin-top:3px">${u.contact || u.id || ''} · ID ${String(u.uid || u.id || '').slice(0, 12)}</div>
        <div class="muted" style="font-size:11px;margin-top:6px" id="ahSyncStatus">${
          window.__ahUserLastPush ? '☁️ শেষ সিঙ্ক: ' + new Date(window.__ahUserLastPush).toLocaleTimeString('bn-BD') : '☁️ সিঙ্ক-অপেক্ষায়…'
        }</div>
        <div class="row" style="gap:8px;margin-top:12px">
          <button class="btn secondary sm" type="button" id="ahAccSync">ক্লাউড সিঙ্ক</button>
          <button class="btn ghost sm" type="button" id="ahAccExport">ডেটা ডাউনলোড</button>
          <button class="btn ghost sm" type="button" id="ahAccOut">লগআউট</button>
        </div></section>`;
    }
    return `<section class="card" id="ah-account-card"><b>অ্যাকাউন্ট</b>
      <p class="muted" style="margin:8px 0 12px;font-size:13px">লগইন করলে হিস্ট্রি, প্রোগ্রেস আর ভুল অন্য ফোনেও ফিরে আসবে। প্রশ্নব্যাংক সবার জন্য একই।</p>
      <div class="row" style="gap:8px"><button class="btn sm" type="button" id="ahAccIn">লগইন</button>
      <button class="btn secondary sm" type="button" id="ahAccNew">নতুন অ্যাকাউন্ট</button></div></section>`;
  };

  const bindCard = () => {
    document.getElementById('ahAccIn')?.addEventListener('click', openLogin);
    document.getElementById('ahAccNew')?.addEventListener('click', openRegister);
    document.getElementById('ahAccOut')?.addEventListener('click', logout);
    document.getElementById('ahAccSync')?.addEventListener('click', async () => { await pushState(); toast('সিঙ্ক হয়েছে'); refreshSyncStatus(); });
    document.getElementById('ahAccExport')?.addEventListener('click', exportData);
    document.getElementById('ahSyncStatus') && (window.__ahSyncStatusEl = document.getElementById('ahSyncStatus'));
    if (window.__ahSyncStatusEl) refreshSyncStatus();
  };

  function refreshSyncStatus() {
    const el = window.__ahSyncStatusEl || document.getElementById('ahSyncStatus');
    if (!el) return;
    if (window.__ahUserSyncErr) el.textContent = '⚠️ সিঙ্ক-সমস্যা: ' + String(window.__ahUserSyncErr).slice(0, 60);
    else if (window.__ahUserLastPush) el.textContent = '☁️ শেষ সিঙ্ক: ' + new Date(window.__ahUserLastPush).toLocaleTimeString('bn-BD');
    else el.textContent = '☁️ সিঙ্ক-অপেক্ষায়…';
  }

  const mountCard = () => {
    const app = document.getElementById('app');
    if (!app) return;
    const path = String(location.hash.replace(/^#\/?/, '').split('?')[0] || 'dashboard');
    const existing = document.getElementById('ah-account-card');
    if (path !== 'settings' && path !== 'dashboard') { existing?.remove(); return; }
    const html = cardHtml();
    if (existing) { existing.outerHTML = html; bindCard(); return; }
    if (path === 'settings') {
      const page = app.querySelector('.page');
      if (page) page.insertAdjacentHTML('afterbegin', html);
    } else {
      const page = app.querySelector('.page');
      if (page) page.insertAdjacentHTML('afterbegin', html);
    }
    bindCard();
  };

  const hook = () => {
    if (window.__ahAccountHooked) return;
    window.__ahAccountHooked = true;
    const wrap = name => {
      const orig = window[name];
      if (typeof orig !== 'function') return;
      window[name] = function () {
        const r = orig.apply(this, arguments);
        setTimeout(mountCard, 0);
        return r;
      };
    };
    wrap('renderSettings');
    wrap('renderDashboard');
    wrap('render');
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
  };

  const start = async () => {
    try { config = await api('/auth/config'); } catch (_) {}
    window.AH_AUTH_CONFIG = config;
    hook();
    if (window.__admissionBootPromise) { try { await window.__admissionBootPromise; } catch (_) {} }
    if (token()) {
      try {
        const me = await api('/auth/me', { headers: authH() });
        if (me.user) setSession(token(), me.user);
        if (me.user && (me.user.status === 'disabled' || me.user.status === 'suspended' || me.user.blocked)) {
          toast('অ্যাকাউন্ট বন্ধ — সাপোর্টে যোগাযোগ করো');
          setSession('', null);
        } else await pullState();
      } catch (_) { /* expired token: keep local data */ }
    }
    mountCard();
    setInterval(() => { if (token()) pushState().catch(() => {}); }, 90000);
  };

  window.AdmissionAccount = { openLogin, openRegister, logout, pushState, pullState, user, token };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(start, 80));
  else setTimeout(start, 80);
})();
