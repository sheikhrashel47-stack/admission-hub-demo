/* ============================================================
   ADMISSION HUB — Onboarding (v11 · AI premium design)
   User HTML (index 11.html) → integrated with app:
   - window.AHOnboard = { maybeStart, start } API (অক্ষত)
   - per-user persist (localStorage + worker /pub/onboarding)
   - resume, back, selection, gauge, plan build, dashboard
   - real university logos (icons/uni/du.png etc.)
   ============================================================ */
(() => {
  'use strict';
  if (window.AHOnboard) return;

  const PUB = 'https://admission-gk.admissionhub.workers.dev/api';
  const TOTAL = 10;

  const UNIVERSITIES = [
    { code: 'du',  short: 'ঢাবি', name: 'ঢাকা বিশ্ববিদ্যালয়',      en: 'University of Dhaka',        logo: 'icons/uni/du.png' },
    { code: 'ju',  short: 'জাবি', name: 'জাহাঙ্গীরনগর বিশ্ববিদ্যালয়', en: 'Jahangirnagar University',  logo: 'icons/uni/ju.png' },
    { code: 'ru',  short: 'রাবি', name: 'রাজশাহী বিশ্ববিদ্যালয়',   en: 'University of Rajshahi',     logo: 'icons/uni/ru.png' },
    { code: 'cu',  short: 'চবি', name: 'চট্টগ্রাম বিশ্ববিদ্যালয়', en: 'University of Chittagong',   logo: 'icons/uni/cu.png' },
    { code: 'ku',  short: 'খুবি', name: 'খুলনা বিশ্ববিদ্যালয়',      en: 'Khulna University',          logo: '' },
    { code: 'bau', short: 'বাকৃবি', name: 'বাংলাদেশ কৃষি বিশ্ববিদ্যালয়', en: 'Bangladesh Agricultural University', logo: '' }
  ];
  const SUBJECTS = ['বাংলা', 'English', 'GK', 'ICT', 'Math'];
  const SUBJ_COUNT = { 'বাংলা': 20, 'English': 16, 'GK': 10, 'ICT': 12, 'Math': 14 };
  const SUBJ_ICON = {
    'বাংলা': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
    'English': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
    'GK': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
    'ICT': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0891b2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3"/></svg>',
    'Math': '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16M4 20h16M4 4l16 16M20 4L4 20"/></svg>'
  };


  /* ---- curriculum-driven helpers (user uni+unit = source of truth) ---- */
  const cur = () => (window.ADM && typeof window.ADM.subjectsFor === 'function') ? window.ADM : null;
  function unitOptions(uniCode) {
    const c = cur();
    if (c && uniCode) { const u = c.unitList(uniCode); if (u && u.length) return u; }
    return ['A', 'B', 'C', 'D'];
  }
  function weakChipsHtml() {
    const c = cur(); const uniCode = data.targetUniversityIds[0]; const unit = (data.targetUnits || [])[0];
    let list = null;
    if (c && uniCode) {
      const subs = c.subjectsFor(uniCode, unit).map(x => x && x.name).filter(Boolean);
      if (subs.length) list = subs;
    }
    if (!list) list = SUBJECTS;
    return list.map(x => `<div class="chip ${(data.weakSubjects || []).includes(x) ? 'selected' : ''}" data-sub="${esc(x)}">${x} ${IC.chipCheck}</div>`).join('');
  }
  function renderWeakChips() { const el = document.getElementById('weakChips'); if (el) el.innerHTML = weakChipsHtml(); }
  function focusRows(uniCode, unit) {
    const c = cur();
    let subs = (c && uniCode) ? c.focusFor(uniCode, unit, 3) : [];
    if (!subs || !subs.length) subs = [
      { name: 'বাংলা', count: SUBJ_COUNT['বাংলা'] || 12 }, { name: 'English', count: SUBJ_COUNT['English'] || 12 }, { name: 'GK', count: SUBJ_COUNT['GK'] || 12 }
    ];
    return subs.map(x => `
          <div class="focus-row">
            <div class="focus-ic" style="background:${'#eef2ff'};">${SUBJ_ICON[x.name] || IC.goalBook}</div>
            <span class="name">${esc(x.name)}</span>
            <span class="count">${Number(x.count) || 12} টি প্রশ্ন</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </div>`).join('');
  }
  function refreshDash() {
    const uniSel = selectedUni();
    const unit = (data.targetUnits || [])[0] || '';
    const dn = document.getElementById('dashUniName'); if (dn) dn.textContent = uniSel ? uniSel.name : 'বিশ্ববিদ্যালয় বাছাই করো';
    const du = document.getElementById('dashUnitName'); if (du) du.textContent = unit ? (unit + ' ইউনিট') : 'ইউনিট বাছাই করো';
    const fc = document.getElementById('dashFocus'); if (fc) fc.innerHTML = focusRows(uniSel ? uniSel.code : '', unit);
    const days = Number(data.weeklyDays) || 5; const pct = Math.round(days / 7 * 100);
    const rt = document.getElementById('ringText'); if (rt) rt.textContent = pct + '%';
    const rp = document.getElementById('ringProgress'); if (rp) rp.setAttribute('stroke-dashoffset', String(150.8 - 150.8 * pct / 100));
  }
  let step = 1;
  let data = blank();

  function blank() {
    return {
      step: 1, completed: false,
      goal: 'uni', targetUniversityIds: [], targetUniversities: [], targetUnits: [],
      studyGoal: 'top', currentLevel: 50, weakSubjects: ['বাংলা', 'English', 'GK'],
      session: '10-20', weeklyDays: 5, plan: null
    };
  }
  function ensureDefaults() {
    if (!data.weakSubjects || !data.weakSubjects.length) data.weakSubjects = ['বাংলা', 'English', 'GK'];
    if (!data.session) data.session = '10-20';
    if (!data.weeklyDays) data.weeklyDays = 5;
    if (!data.studyGoal) data.studyGoal = 'top';
    if (typeof data.currentLevel !== 'number') data.currentLevel = 50;
  }

  const uid = () => {
    try {
      const u = JSON.parse(localStorage.getItem('ahPubUser') || sessionStorage.getItem('ahPubUser') || 'null');
      return (u && (u.uid || u.id)) || 'anon';
    } catch (_) { return 'anon'; }
  };
  const userName = () => {
    try {
      const u = JSON.parse(localStorage.getItem('ahPubUser') || sessionStorage.getItem('ahPubUser') || 'null');
      return (u && (u.displayName || u.name)) || '';
    } catch (_) { return ''; }
  };
  const token = () => { try { return localStorage.getItem('ahPubToken') || sessionStorage.getItem('ahPubToken') || ''; } catch (_) { return ''; } };
  const storeKey = () => 'ahOnboard:' + uid();
  function persistLocal() { try { localStorage.setItem(storeKey(), JSON.stringify(data)); } catch (_) {} }
  function loadLocal() {
    try {
      const o = JSON.parse(localStorage.getItem(storeKey()) || 'null');
      if (o && typeof o === 'object') data = Object.assign(blank(), o);
    } catch (_) {}
  }
  async function api(path, opts) {
    const res = await fetch(PUB + path, opts);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.error || ('http-' + res.status));
    return j;
  }
  function authH() { return { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token() }; }
  async function saveRemote(extra) {
    data = Object.assign(data, extra || {}, { step: data.step });
    ensureDefaults();
    persistLocal();
    if (!token()) return;
    try {
      const r = await api('/onboarding', { method: 'PUT', headers: authH(), body: JSON.stringify(data) });
      if (r.onboarding) data = Object.assign(data, r.onboarding);
      if (r.user) {
        try { localStorage.setItem('ahPubUser', JSON.stringify(r.user)); sessionStorage.setItem('ahPubUser', JSON.stringify(r.user)); } catch (_) {}
      }
    } catch (_) {}
  }

  const esc = s => String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const gate = () => document.getElementById('ahOnboardGate');
  function showGate(on) {
    document.documentElement.dataset.ob = on ? '1' : '0';
    const g = gate();
    if (g) g.style.display = on ? 'block' : 'none';
  }

  /* ---------------- icons (হুবহু HTML থেকে) ---------------- */
  const IC = {
    arrowR: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
    back: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>',
    check: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    search: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    menu: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
    bell: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
    chipCheck: '<svg viewBox="0 0 24 24" fill="none" stroke="#1c7f45" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    goalCap: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1c7f45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
    goalBook: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
    goalSsc: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
    goalBcs: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>',
    aimTrophy: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>',
    aimGood: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
    aimFast: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ca8a04" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    sessClock: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    sessCal: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'
  };
  function uniLogoSvg() {
    return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1c7f45" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 6 6 9l6 3 6-3-6-3z"/><path d="M8 11v4c0 1 1.8 2 4 2s4-1 4-2v-4"/></svg>';
  }
  function uniLogoHtml(u) {
    if (u && u.logo) return '<img src="' + esc(u.logo) + '" alt="' + esc(u.short) + '">';
    return uniLogoSvg();
  }

  /* ---------------- screen builders ---------------- */
  function sWelcome() {
    return `<div class="screen active" id="s0">
      <div class="logo-mark">
        <div class="logo-icon-box">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#1c7f45" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c0 1.1 2.7 3 6 3s6-1.9 6-3v-5"/></svg>
        </div>
        <div class="logo-text">ADMISSION<br>HUB</div>
      </div>
      <h1 class="title">তোমার স্বপ্নের অ্যাডমিশনের যাত্রা শুরু হোক আজই</h1>
      <p class="subtitle">কয়েকটি তথ্য দাও, আমরা তোমার জন্য তৈরি করবো পার্সোনাল প্রিপারেশন প্ল্যান।</p>
      <div class="illus-box">
        <svg viewBox="0 0 300 170" width="100%" height="auto">
          <rect x="0" y="130" width="300" height="40" fill="#eef2f0"/>
          <circle cx="40" cy="120" r="26" fill="#cdeedb"/>
          <rect x="36" y="120" width="8" height="34" fill="#a9d9bd"/>
          <circle cx="264" cy="112" r="22" fill="#cdeedb"/>
          <rect x="260" y="112" width="8" height="42" fill="#a9d9bd"/>
          <rect x="95" y="60" width="110" height="90" fill="#1c7f45"/>
          <polygon points="90,60 150,28 210,60" fill="#136534"/>
          <rect x="115" y="80" width="16" height="20" fill="#eafaf0"/>
          <rect x="142" y="80" width="16" height="20" fill="#eafaf0"/>
          <rect x="169" y="80" width="16" height="20" fill="#eafaf0"/>
          <rect x="115" y="112" width="16" height="20" fill="#eafaf0"/>
          <rect x="169" y="112" width="16" height="20" fill="#eafaf0"/>
          <rect x="140" y="112" width="20" height="38" fill="#eafaf0"/>
          <circle cx="150" cy="42" r="5" fill="#f4b400"/>
        </svg>
      </div>
      <div class="bottom-area">
        <button class="btn-primary" data-next="1">চল শুরু করি ${IC.arrowR}</button>
      </div>
    </div>`;
  }
  function sGoal() {
    const goals = [
      { id: 'uni', t: 'বিশ্ববিদ্যালয় ভর্তি', ic: '#eafaf0', svg: IC.goalCap },
      { id: 'hsc', t: 'HSC / আলিম', ic: '#e8f0fe', svg: IC.goalBook },
      { id: 'ssc', t: 'SSC / দাখিল', ic: '#eef2ff', svg: IC.goalSsc },
      { id: 'bcs', t: 'বিসিএস / চাকরি', ic: '#fff3e0', svg: IC.goalBcs }
    ];
    return `<div class="screen" id="s1">
      ${topbar(1, 0)}
      <h1 class="title">তুমি কী জন্য প্রস্তুতি নিচ্ছো?</h1>
      <p class="subtitle" style="margin-bottom:18px;"></p>
      ${goals.map(g => `
        <div class="option-card ${data.goal === g.id ? 'selected' : ''}" data-goal="${g.id}">
          <div class="option-icon" style="background:${g.ic};">${g.svg}</div>
          <div class="option-text"><p class="t">${g.t}</p></div>
          <div class="check-badge">${IC.check}</div>
        </div>`).join('')}
      <button class="fab-next" data-next="2">${IC.arrowR}</button>
    </div>`;
  }
  function sUniversity() {
    return `<div class="screen" id="s2">
      ${topbar(2, 1)}
      <h1 class="title">তোমার টার্গেট বিশ্ববিদ্যালয় কোনটি?</h1>
      <div class="search-box">${IC.search}<input id="uniSearch" type="text" placeholder="বিশ্ববিদ্যালয় খুঁজুন..."></div>
      <p class="section-label">জনপ্রিয় বিশ্ববিদ্যালয়</p>
      <div class="uni-grid" id="uniGrid"></div>
      <div class="uni-confirm" id="uniConfirm">
        <div class="uni-logo" id="confirmLogo"></div>
        <div style="flex:1;">
          <p class="t" id="confirmName">ঢাকা বিশ্ববিদ্যালয়</p>
          <p class="d" id="confirmSub">University of Dhaka</p>
        </div>
        <div class="check-badge" style="opacity:1;transform:scale(1);">${IC.check}</div>
      </div>
      <button class="fab-next" data-next="3" style="bottom:96px;">${IC.arrowR}</button>
    </div>`;
  }
  function sUnit() {
    return `<div class="screen" id="s3">
      ${topbar(3, 2)}
      <h1 class="title">কোন ইউনিটের জন্য প্রস্তুতি নিচ্ছো?</h1>
      <div class="uni-hero">
        <div class="uni-logo" id="unitLogo"></div>
        <p class="name" id="unitUniName">ঢাকা বিশ্ববিদ্যালয়</p>
      </div>
      <div class="unit-grid">
        ${unitOptions(data.targetUniversityIds[0]).map(x => `<div class="unit-card ${data.targetUnits[0] === x ? 'selected' : ''}" data-unit="${x}">${x} ইউনিট</div>`).join('')}
      </div>
      <p class="subtitle" id="unitHint" style="margin-top:10px;color:#b45309;display:${data.targetUniversityIds[0] ? 'none' : 'block'};">আগে বিশ্ববিদ্যালয় বাছাই করো — ইউনিট তার অনুযায়ী দেখাবে</p>
      <button class="fab-next" data-next="4">${IC.arrowR}</button>
    </div>`;
  }
  function sStudyGoal() {
    const aims = [
      { id: 'top', t: 'টপ র‍্যাংক', d: 'সেরাদের মধ্যে থাকতে চাই', ic: '#fef3c7', svg: IC.aimTrophy },
      { id: 'good', t: 'ভালো প্রস্তুতি', d: 'ভালোভাবে প্রস্তুতি নিতে চাই', ic: '#fee2e2', svg: IC.aimGood },
      { id: 'fast', t: 'স্মার্ট ও ফাস্ট', d: 'কম সময়ে কার্যকর প্রস্তুতি চাই', ic: '#fef9c3', svg: IC.aimFast }
    ];
    return `<div class="screen" id="s4">
      ${topbar(4, 3)}
      <h1 class="title">তোমার লক্ষ্য কী?</h1>
      <p class="subtitle">একটি বেছে নাও</p>
      ${aims.map(a => `
        <div class="goal-card ${data.studyGoal === a.id ? 'selected' : ''}" data-aim="${a.id}">
          <div class="option-icon" style="background:${a.ic};">${a.svg}</div>
          <div class="option-text"><p class="t">${a.t}</p><p class="d">${a.d}</p></div>
          <div class="check-badge">${IC.check}</div>
        </div>`).join('')}
      <button class="fab-next" data-next="5">${IC.arrowR}</button>
    </div>`;
  }
  function sLevel() {
    return `<div class="screen" id="s5">
      ${topbar(5, 4)}
      <h1 class="title">তুমি এখন কতটুকু প্রস্তুত?</h1>
      <div class="gauge-wrap">
        <svg id="gaugeSvg" viewBox="0 0 200 115" width="230">
          <path d="M15 100 A85 85 0 0 1 68 21" fill="none" stroke="#22c55e" stroke-width="14" stroke-linecap="round"/>
          <path d="M68 21 A85 85 0 0 1 132 21" fill="none" stroke="#eab308" stroke-width="14" stroke-linecap="round"/>
          <path d="M132 21 A85 85 0 0 1 185 100" fill="none" stroke="#f97316" stroke-width="14" stroke-linecap="round"/>
          <line id="needle" x1="100" y1="100" x2="30" y2="100" stroke="#111827" stroke-width="4" stroke-linecap="round"/>
          <circle cx="100" cy="100" r="7" fill="#111827"/>
        </svg>
        <div class="gauge-pct"><span id="gaugePct">0</span>%</div>
        <div class="gauge-label" id="gaugeText">শুরুর দিকে</div>
      </div>
      <p class="subtitle" style="margin-bottom:14px;font-weight:700;color:#111827;">কোন বিষয়গুলোতে বেশি মনোযোগ প্রয়োজন?</p>
      <div class="chip-row" id="weakChips">${weakChipsHtml()}</div>
      <button class="fab-next" data-next="6">${IC.arrowR}</button>
    </div>`;
  }
  function sHabit() {
    const sessions = [
      { id: '10-20', t: '10-20 মিনিট', d: 'কুইক সেশন' },
      { id: '30-60', t: '30-60 মিনিট', d: 'ফোকাসড স্টাডি' },
      { id: '1-2h', t: '1-2 ঘন্টা', d: 'গভীর পড়াশোনা' },
      { id: 'flex', t: 'যখন পারি', d: 'ফ্লেক্সিবল' }
    ];
    return `<div class="screen" id="s6">
      ${topbar(6, 5)}
      <h1 class="title">তুমি কীভাবে পড়তে বেশি স্বাচ্ছন্দ্যবোধ করো?</h1>
      <div class="habit-grid">
        ${sessions.map((s, i) => `
          <div class="habit-card ${data.session === s.id ? 'selected' : ''}" data-sess="${s.id}">
            <div class="chk">${IC.check}</div>
            <div class="ic">${i === 1 ? IC.sessCal : IC.sessClock}</div>
            <p class="t">${s.t}</p><p class="d">${s.d}</p>
          </div>`).join('')}
      </div>
      <p class="subtitle" style="margin-bottom:14px;font-weight:700;color:#111827;">সপ্তাহে কয়দিন পড়তে পারবে?</p>
      <div class="day-row">
        ${[3, 4, 5, 6, 7].map(d => `<div class="day-pill ${Number(data.weeklyDays) === d ? 'selected' : ''}" data-day="${d}">${d} দিন</div>`).join('')}
      </div>
      <button class="fab-next" data-next="7">${IC.arrowR}</button>
    </div>`;
  }
  function sAlmost() {
    return `<div class="screen" id="s7" data-tap-next="8">
      <h1 class="title" style="font-size:21px;">আর মাত্র একটু বাকি!</h1>
      <div class="clip-illus">
        <div class="confetti" style="left:8px;top:14px;width:8px;height:8px;background:#f97316;transform:rotate(20deg);"></div>
        <div class="confetti" style="right:14px;top:6px;width:7px;height:7px;background:#eab308;border-radius:50%;"></div>
        <div class="confetti" style="left:2px;bottom:40px;width:6px;height:6px;background:#3b82f6;border-radius:50%;"></div>
        <div class="confetti" style="right:4px;bottom:60px;width:9px;height:9px;background:#22c55e;transform:rotate(45deg);"></div>
        <div class="confetti" style="left:30px;top:0px;width:6px;height:6px;background:#ec4899;border-radius:50%;"></div>
        <div class="confetti" style="right:26px;bottom:10px;width:7px;height:7px;background:#a855f7;transform:rotate(10deg);"></div>
        <svg viewBox="0 0 220 220" width="220" height="220">
          <rect x="45" y="30" width="130" height="170" rx="12" fill="#fff" stroke="#e5e7eb" stroke-width="3"/>
          <rect x="85" y="18" width="50" height="24" rx="6" fill="#f97316"/>
          <line x1="65" y1="70" x2="150" y2="70" stroke="#e5e7eb" stroke-width="3"/>
          <circle cx="70" cy="105" r="9" fill="#eafaf0" stroke="#1c7f45" stroke-width="2"/>
          <polyline points="66,105 69,108 75,101" fill="none" stroke="#1c7f45" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
          <line x1="88" y1="105" x2="150" y2="105" stroke="#e5e7eb" stroke-width="6" stroke-linecap="round"/>
          <circle cx="70" cy="135" r="9" fill="#eafaf0" stroke="#1c7f45" stroke-width="2"/>
          <polyline points="66,135 69,138 75,131" fill="none" stroke="#1c7f45" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
          <line x1="88" y1="135" x2="150" y2="135" stroke="#e5e7eb" stroke-width="6" stroke-linecap="round"/>
          <circle cx="70" cy="165" r="9" fill="#eafaf0" stroke="#1c7f45" stroke-width="2"/>
          <polyline points="66,165 69,168 75,161" fill="none" stroke="#1c7f45" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
          <line x1="88" y1="165" x2="140" y2="165" stroke="#e5e7eb" stroke-width="6" stroke-linecap="round"/>
          <g transform="rotate(45 175 55)">
            <rect x="170" y="10" width="10" height="70" rx="4" fill="#f97316"/>
            <polygon points="170,80 180,80 175,95" fill="#fcd34d"/>
          </g>
        </svg>
      </div>
      <p class="subtitle">তোমার তথ্যগুলো আমরা সাজিয়ে নিচ্ছি পার্সোনাল প্ল্যান তৈরির জন্য।</p>
      <div class="dots-row">
        <div class="dot active"></div><div class="dot"></div><div class="dot"></div><div class="dot"></div>
      </div>
    </div>`;
  }
  function sBuilding() {
    const steps = [
      'তোমার লক্ষ্য বিশ্লেষণ',
      'তোমার বর্তমান অবস্থা মূল্যায়ন',
      'বিষয়ভিত্তিক প্ল্যান তৈরি',
      'সময়ের উপর ভিত্তি করে সাজানো'
    ];
    return `<div class="screen" id="s8">
      ${topbar(9, 6)}
      <h1 class="title">তোমার জন্য পার্সোনাল প্ল্যান তৈরি হচ্ছে...</h1>
      <div>
        ${steps.map((t, i) => `
          <div class="plan-item">
            <div class="plan-icon" id="plan-ic-${i + 1}">
              ${i === 2 ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' : i === 3 ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'}
            </div>
            <span class="lbl">${t}</span>
          </div>`).join('')}
      </div>
      <div class="plan-bar-wrap">
        <div class="plan-bar-track"><div class="plan-bar-fill" id="planBarFill"></div></div>
        <p class="plan-pct-label"><span id="planPctText">0</span>% সম্পন্ন</p>
      </div>
    </div>`;
  }
  function sDash() {
    const uniSel = selectedUni();
    const unit = (data.targetUnits || [])[0] || '';
    const focusHtml = focusRows(uniSel ? uniSel.code : '', unit);
    const days = Number(data.weeklyDays) || 5;
    const ringPct = Math.round(days / 7 * 100);
    return `<div class="screen" id="s9">
      <div class="dash-top">
        <button class="icon-btn">${IC.menu}</button>
        <button class="icon-btn">${IC.bell}</button>
      </div>
      <p class="greet">অভিনন্দন, ${esc((userName() || 'Rashed').split(' ')[0])}! 🎉</p>
      <p class="greet-sub">তোমার প্রস্তুতি শুরু হোক এখনই!</p>
      <div class="goal-hero-card">
        <p class="lbl">তোমার লক্ষ্য</p>
        <p class="name" id="dashUniName">${esc(uniSel ? uniSel.name : 'বিশ্ববিদ্যালয় বাছাই করো')}</p>
        <p class="unit" id="dashUnitName">${unit ? (unit + ' ইউনিট') : 'ইউনিট বাছাই করো'}</p>
        <svg width="90" height="70" style="position:absolute;right:8px;bottom:0;opacity:.35;" viewBox="0 0 90 70">
          <rect x="15" y="20" width="60" height="50" fill="#fff"/>
          <polygon points="10,20 45,4 80,20" fill="#fff"/>
          <rect x="25" y="32" width="8" height="10" fill="#136534"/>
          <rect x="41" y="32" width="8" height="10" fill="#136534"/>
          <rect x="57" y="32" width="8" height="10" fill="#136534"/>
          <rect x="38" y="50" width="14" height="20" fill="#136534"/>
        </svg>
      </div>
      <p class="section-title">আজকের ফোকাস</p>
      <div class="focus-card" id="dashFocus">${focusHtml}</div>
      <div class="week-row">
        <div>
          <p class="wt">সাপ্তাহিক অগ্রগতি</p>
          <p class="wd">${days}/${7} দিন</p>
        </div>
        <svg width="56" height="56" viewBox="0 0 56 56">
          <circle cx="28" cy="28" r="24" fill="none" stroke="#eafaf0" stroke-width="6"/>
          <circle id="ringProgress" cx="28" cy="28" r="24" fill="none" stroke="#1c7f45" stroke-width="6" stroke-linecap="round" stroke-dasharray="150.8" stroke-dashoffset="150.8" transform="rotate(-90 28 28)"/>
          <text id="ringText" x="28" y="32" text-anchor="middle" font-size="12" font-weight="700" fill="#111827">0%</text>
        </svg>
      </div>
      <button class="btn-primary" id="dashStart">আমার প্রস্তুতি শুরু করি ${IC.arrowR}</button>
    </div>`;
  }
  function topbar(screenIdx, backTo) {
    return `<div class="topbar">
      <button class="back-btn" data-back="${backTo}">${IC.back}</button>
      <div class="progress-track"><div class="progress-fill" id="pf-${screenIdx}"></div></div>
    </div>`;
  }

  /* ---------------- mount / show ---------------- */
  function mount() {
    const g = gate(); if (!g) return;
    g.innerHTML = `<div class="app-shell">
      ${sWelcome()}${sGoal()}${sUniversity()}${sUnit()}${sStudyGoal()}${sLevel()}${sHabit()}${sAlmost()}${sBuilding()}${sDash()}
    </div>`;
    bind();
    renderUniGrid('');
    updateUniConfirm();
  }
  const screenIndex = s => Math.max(0, Math.min(9, s - 1)); // step 1..10 → 0..9
  const progressOrder = [1, 2, 3, 4, 5, 6, 8]; // screen ids (0-based) with topbar
  function showScreen(stepIdx) {
    const idx = screenIndex(stepIdx);
    document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
    const target = document.getElementById('s' + idx);
    if (target) target.classList.add('active');
    updateProgress(idx);
    const g = gate(); if (g) g.scrollTop = 0;
    // side effects
    if (idx === 5) animateGauge();
    if (idx === 7) startAlmostTimer();
    if (idx === 8) runPlan();
    if (idx === 9) { animateRing(); refreshDash(); }
  }
  function updateProgress(idx) {
    const pos = progressOrder.indexOf(idx);
    if (pos === -1) return;
    const pct = ((pos + 1) / progressOrder.length) * 100;
    const el = document.getElementById('pf-' + idx);
    if (el) el.style.width = pct + '%';
  }

  /* ---------------- university grid ---------------- */
  function uniList(filter) {
    const f = (filter || '').trim().toLowerCase();
    if (!f) return UNIVERSITIES;
    return UNIVERSITIES.filter(u => (u.name + ' ' + u.en + ' ' + u.short).toLowerCase().includes(f));
  }
  function selectedUni() { return UNIVERSITIES.find(u => u.code === data.targetUniversityIds[0]) || null; }
  function renderUniGrid(filter) {
    const grid = document.getElementById('uniGrid'); if (!grid) return;
    const list = uniList(filter);
    grid.innerHTML = list.map(u => `
      <div class="uni-item ${data.targetUniversityIds[0] === u.code ? 'selected' : ''}" data-uni="${u.code}">
        <div class="uni-logo">${uniLogoHtml(u)}</div>
        <span>${esc(u.short)}</span>
      </div>`).join('');
  }
  function updateUniConfirm() {
    const u = selectedUni();
    if (!u) return;
    const cn = document.getElementById('confirmName'); if (cn) cn.textContent = u.name;
    const cs = document.getElementById('confirmSub'); if (cs) cs.textContent = u.en;
    const cl = document.getElementById('confirmLogo'); if (cl) cl.innerHTML = uniLogoHtml(u);
    const ul = document.getElementById('unitLogo'); if (ul) ul.innerHTML = uniLogoHtml(u);
    const un = document.getElementById('unitUniName'); if (un) un.textContent = u.name;
    const dn = document.getElementById('dashUniName'); if (dn) dn.textContent = u.name;
  }

  /* ---------------- gauge ---------------- */
  function gaugeLabel(v) {
    return v < 34 ? 'শুরুর দিকে' : v < 67 ? 'মাঝামাঝি' : 'চমৎকার';
  }
  function setNeedle(v) {
    const needle = document.getElementById('needle');
    const pct = document.getElementById('gaugePct');
    const txt = document.getElementById('gaugeText');
    if (!needle) return;
    const val = Math.max(0, Math.min(100, v));
    if (pct) pct.textContent = val;
    if (txt) txt.textContent = gaugeLabel(val);
    const angle = 180 - (val / 100 * 180);
    const rad = angle * Math.PI / 180;
    needle.setAttribute('x2', (100 + 70 * Math.cos(rad)).toFixed(1));
    needle.setAttribute('y2', (100 - 70 * Math.sin(rad)).toFixed(1));
  }
  function animateGauge() {
    const target = Math.max(0, Math.min(100, Number(data.currentLevel) || 50));
    const dur = 900, start = performance.now();
    (function frame(now) {
      const t = Math.min(1, (now - start) / dur);
      setNeedle(Math.round(target * t));
      if (t < 1) requestAnimationFrame(frame);
    })(performance.now());
  }

  /* ---------------- screen 8 auto / screen 9 plan ---------------- */
  let almostTimer = null;
  function startAlmostTimer() {
    clearTimeout(almostTimer);
    almostTimer = setTimeout(() => { if (step === 8) nextStep(); }, 2500);
  }
  let planTimer = null;
  async function runPlan() {
    clearInterval(planTimer);
    const fill = document.getElementById('planBarFill');
    const pctText = document.getElementById('planPctText');
    const icons = [1, 2, 3, 4].map(n => document.getElementById('plan-ic-' + n));
    icons.forEach(ic => ic && ic.classList.remove('done'));
    if (fill) fill.style.width = '0%';
    if (pctText) pctText.textContent = '0';
    let pct = 0;
    await new Promise(res => {
      planTimer = setInterval(() => {
        pct += 2;
        if (pct > 100) pct = 100;
        if (fill) fill.style.width = pct + '%';
        if (pctText) pctText.textContent = pct;
        if (pct >= 25) icons[0] && icons[0].classList.add('done');
        if (pct >= 50) icons[1] && icons[1].classList.add('done');
        if (pct >= 75) icons[2] && icons[2].classList.add('done');
        if (pct >= 100) {
          icons[3] && icons[3].classList.add('done');
          clearInterval(planTimer);
          setTimeout(res, 700);
        }
      }, 40);
    });
    if (step !== 9) return;
    data.completed = true;
    data.step = 10;
    await saveRemote({ completed: true, step: 10 });
    step = 10;
    showScreen(10);
  }
  function animateRing() {
    const circle = document.getElementById('ringProgress');
    const text = document.getElementById('ringText');
    if (!circle) return;
    const days = Number(data.weeklyDays) || 5;
    const target = Math.round(days / 7 * 100);
    const circumference = 150.8;
    let val = 0;
    const dur = 900, start = performance.now();
    (function frame(now) {
      const t = Math.min(1, (now - start) / dur);
      val = Math.round(target * t);
      circle.setAttribute('stroke-dashoffset', (circumference - val / 100 * circumference).toFixed(1));
      if (text) text.textContent = val + '%';
      if (t < 1) requestAnimationFrame(frame);
    })(performance.now());
  }

  /* ---------------- navigation ---------------- */
  function nextStep() {
    if (step >= 10) return finish();
    step += 1;
    saveRemote();
    showScreen(step);
  }
  function goBack(to) {
    step = Math.max(1, Math.min(9, Number(to) || step - 1));
    saveRemote();
    showScreen(step);
  }

  /* ---------------- finish ---------------- */
  function finish() {
    showGate(false);
    try { localStorage.removeItem(storeKey()); } catch (_) {}
    if (typeof navigate === 'function') navigate('dashboard');
    else if (typeof render === 'function') render();
  }

  /* ---------------- bind ---------------- */
  function bind() {
    const g = gate(); if (!g) return;
    g.addEventListener('click', (e) => {
      const nxt = e.target.closest('[data-next]');
      if (nxt) { nextStep(); return; }
      const bck = e.target.closest('[data-back]');
      if (bck) { goBack(bck.getAttribute('data-back')); return; }
      const tap = e.target.closest('[data-tap-next]');
      if (tap) { nextStep(); return; }
      const goal = e.target.closest('[data-goal]');
      if (goal) {
        data.goal = goal.getAttribute('data-goal');
        saveRemote(); syncSelected('[data-goal]', data.goal); return;
      }
      const uni = e.target.closest('[data-uni]');
      if (uni) {
        const code = uni.getAttribute('data-uni');
        data.targetUniversityIds = [code];
        data.targetUniversities = [(() => { const u = UNIVERSITIES.find(x => x.code === code); return u ? u.name : code; })()];
        saveRemote(); renderUniGrid(document.getElementById('uniSearch') ? document.getElementById('uniSearch').value : ''); updateUniConfirm(); renderWeakChips(); refreshDash(); return;
      }
      const unit = e.target.closest('[data-unit]');
      if (unit) {
        data.targetUnits = [unit.getAttribute('data-unit')];
        saveRemote(); syncSelected('[data-unit]', data.targetUnits[0]); renderWeakChips(); refreshDash(); return;
      }
      const aim = e.target.closest('[data-aim]');
      if (aim) {
        data.studyGoal = aim.getAttribute('data-aim');
        saveRemote(); syncSelected('[data-aim]', data.studyGoal); return;
      }
      const sub = e.target.closest('[data-sub]');
      if (sub) {
        const v = sub.getAttribute('data-sub');
        const set = new Set(data.weakSubjects);
        if (set.has(v)) set.delete(v); else set.add(v);
        data.weakSubjects = [...set];
        saveRemote(); sub.classList.toggle('selected'); return;
      }
      const sess = e.target.closest('[data-sess]');
      if (sess) {
        data.session = sess.getAttribute('data-sess');
        saveRemote(); syncSelected('[data-sess]', data.session); return;
      }
      const day = e.target.closest('[data-day]');
      if (day) {
        data.weeklyDays = Number(day.getAttribute('data-day'));
        saveRemote(); syncSelected('[data-day]', String(data.weeklyDays)); return;
      }
      const start = e.target.closest('#dashStart');
      if (start) { finish(); return; }
    });
    // gauge drag/tap
    const svg = document.getElementById('gaugeSvg');
    if (svg) {
      const apply = (clientX) => {
        const r = svg.getBoundingClientRect();
        if (!r.width) return;
        const p = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
        data.currentLevel = Math.round(p * 100);
        setNeedle(data.currentLevel);
      };
      svg.addEventListener('pointerdown', (e) => { e.preventDefault(); apply(e.clientX); });
      svg.addEventListener('pointermove', (e) => { if (e.buttons) apply(e.clientX); });
    }
    // search
    const sq = document.getElementById('uniSearch');
    if (sq) sq.addEventListener('input', () => renderUniGrid(sq.value));
  }
  function syncSelected(sel, val) {
    document.querySelectorAll(sel).forEach(el => {
      const isSel = el.getAttribute('data-value') === val || el.getAttribute('data-goal') === val || el.getAttribute('data-uni') === val || el.getAttribute('data-unit') === val || el.getAttribute('data-aim') === val || el.getAttribute('data-sub') === val || el.getAttribute('data-sess') === val || el.getAttribute('data-day') === val;
      el.classList.toggle('selected', isSel);
    });
  }

  /* ---------------- boot ---------------- */
  async function maybeStart() {
    if (!token()) return false;
    loadLocal();
    try {
      const r = await api('/onboarding', { headers: authH() });
      if (r.onboarding) {
        /* KV-রিপ্লিকেশন-বিলম্ব-সহন: সার্ভার পুরনো (completed:false) হলেও স্থানীয় completed হারানো যাবে না */
        const done = !!data.completed || !!r.onboarding.completed;
        data = Object.assign(blank(), r.onboarding, data);
        data.completed = done;
      }
    } catch (_) {}
    ensureDefaults();
    if (data.completed) return false;
    step = Math.max(1, Math.min(10, Number(data.step) || 1));
    showGate(true);
    mount();
    showScreen(step);
    return true;
  }

  window.AHOnboard = { maybeStart, start: maybeStart };
})();
