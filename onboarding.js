/* ============================================================
   ADMISSION HUB — Onboarding (Phase 6 v4) · Exact-clone UI
   ১০ স্ক্রিন: Welcome → Goal → University → Unit → Study Goal →
   Current Level → Study Habit → Almost Done → Building → Dashboard
   Flat minimal clone · real university logos · spec content verbatim
   ============================================================ */
(() => {
  'use strict';
  if (window.AHOnboard) return;

  const PUB = 'https://admission-gk.rashelzayan213.workers.dev/pub';
  const TOTAL = 10;
  const LOGO = {
    du:  'icons/uni/du.png',
    ju:  'icons/uni/ju.png',
    ru:  'icons/uni/ru.png',
    cu:  'icons/uni/cu.png',
    gst: 'icons/uni/gst.png'
  };
  const UNIS = [
    { id: 'du',  name: 'ঢাকা বিশ্ববিদ্যালয়',      nameEn: 'University of Dhaka',        short: 'DU',  units: ['A', 'B', 'C', 'D'] },
    { id: 'ju',  name: 'জাহাঙ্গীরনগর বিশ্ববিদ্যালয়', nameEn: 'Jahangirnagar University',  short: 'JU',  units: ['A', 'B', 'C', 'D'] },
    { id: 'ru',  name: 'রাজশাহী বিশ্ববিদ্যালয়',   nameEn: 'University of Rajshahi',     short: 'RU',  units: ['A', 'B', 'C', 'D'] },
    { id: 'cu',  name: 'চট্টগ্রাম বিশ্ববিদ্যালয়', nameEn: 'University of Chittagong',   short: 'CU',  units: ['A', 'B', 'C', 'D'] },
    { id: 'gst', name: 'গুচ্ছ (GST)',              nameEn: 'GST Admission Test',         short: 'GST', units: ['A', 'B', 'C', 'D'] }
  ];
  const GOALS = [
    { id: 'uni', t: 'বিশ্ববিদ্যালয় ভর্তি', svg: 'cap' },
    { id: 'hsc', t: 'HSC', svg: 'book' },
    { id: 'ssc', t: 'SSC', svg: 'note' },
    { id: 'bcs', t: 'BCS', svg: 'bag' }
  ];
  const AIMS = [
    { id: 'top',  t: 'টপ র্যাঙ্ক',     s: 'সেরাদের মধ্যে থাকতে চাই' },
    { id: 'good', t: 'ভালো প্রস্তুতি',  s: 'ভারসাম্যপূর্ণ প্রস্তুতি' },
    { id: 'fast', t: 'স্মার্ট ও ফাস্ট', s: 'কম সময়ে কার্যকর প্রস্তুতি' }
  ];
  const SESSIONS = [
    { id: 's10',  t: '১০–২০ মিনিট' },
    { id: 's30',  t: '৩০–৬০ মিনিট' },
    { id: 's1h',  t: '১–২ ঘণ্টা' },
    { id: 'flex', t: 'ফ্লেক্সিবল' }
  ];
  const BASE_SUBJECTS = ['বাংলা', 'English', 'GK', 'ICT', 'Math'];
  const BANGLA_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  const bn = n => String(n).replace(/\d/g, d => BANGLA_DIGITS[+d]);

  let step = 1;
  let q = '';
  let data = blank();

  function blank() {
    return {
      step: 1, completed: false,
      goal: '', targetUniversityIds: [], targetUniversities: [], targetUnits: [],
      studyGoal: '', currentLevel: 50, weakSubjects: [],
      session: '', weeklyDays: 5, plan: null
    };
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
  function persistLocal() {
    try { localStorage.setItem(storeKey(), JSON.stringify(data)); } catch (_) {}
  }
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
    data = Object.assign(data, extra || {}, { step });
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

  /* ---------------- icons (Lucide/Phosphor style, stroke) ---------------- */
  const IC = {
    back: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
    search: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#A8A8A4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>',
    menu: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#171717" stroke-width="2.1" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    bell: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#171717" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 9a6 6 0 10-12 0c0 6-2.5 7-2.5 7h17S18 15 18 9"/><path d="M10.3 20a2 2 0 003.4 0"/></svg>',
    cap: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#087A45" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10l9-5 9 5-9 5-9-5z"/><path d="M7 12.5V16c0 1.5 2.2 2.5 5 2.5s5-1 5-2.5v-3.5"/></svg>',
    book: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#2B6CB0" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 016.5 17H20V4H6.5A2.5 2.5 0 004 6.5v13z"/><path d="M4 19.5A2.5 2.5 0 006.5 22H20v-5"/></svg>',
    note: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#2F855A" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9l-6-6z"/><path d="M14 3v6h6M9 13h6M9 17h4"/></svg>',
    bag: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#B7791F" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M8 8V6a4 4 0 018 0v2"/><rect x="3" y="8" width="18" height="12" rx="2"/></svg>',
    trophy: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#087A45" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8M12 17v4M7 4h10v6a5 5 0 01-10 0V4z"/><path d="M7 6H4v1a3 3 0 003 3M17 6h3v1a3 3 0 01-3 3"/></svg>',
    trend: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#087A45" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg>',
    zap: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#087A45" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#A8A8A4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>'
  };
  const STATUS_BAR = () => `<div class="ob-statusbar" aria-hidden="true">
    <span class="ob-st-time">9:41</span>
    <span class="ob-st-icons">
      <svg viewBox="0 0 18 12" width="17" height="11" fill="none" stroke="#171717" stroke-width="1.6" stroke-linecap="round"><path d="M1 9.5L5.5 5l3 3 4-4 3.5 3.5"/></svg>
      <svg viewBox="0 0 16 12" width="15" height="11" fill="none" stroke="#171717" stroke-width="1.6" stroke-linecap="round"><path d="M2 8.5A6.4 6.4 0 0113.5 8.5M4.5 9.5a3.5 3.5 0 016 0"/><circle cx="7.6" cy="11" r="1.1" fill="#171717" stroke="none"/></svg>
      <svg viewBox="0 0 26 12" width="24" height="11" aria-hidden="true"><rect x="0.5" y="0.5" width="21" height="11" rx="3" fill="none" stroke="#171717" stroke-width="1.1"/><rect x="2" y="2" width="15" height="8" rx="1.6" fill="#171717"/><path d="M23.5 4v4" stroke="#171717" stroke-width="1.5" stroke-linecap="round"/></svg>
    </span>
  </div>`;

  /* ---------------- illustrations (inline SVG) ---------------- */
  function campusScene() {
    return `<svg viewBox="0 0 330 190" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="330" height="190" fill="#FDF7EC"/>
      <circle cx="272" cy="44" r="26" fill="#FFE3A3"/>
      <path d="M0 140 Q70 116 150 136 T330 128 V190 H0 Z" fill="#EAF4E4"/>
      <rect x="24" y="86" width="58" height="64" rx="4" fill="#FFFFFF" stroke="#E8E4DA" stroke-width="1.5"/>
      <path d="M18 88 L53 62 L88 88 Z" fill="#87C6A8"/>
      <rect x="34" y="110" width="12" height="16" rx="2" fill="#A8C7E8"/>
      <rect x="58" y="110" width="12" height="16" rx="2" fill="#A8C7E8"/>
      <rect x="108" y="98" width="64" height="52" rx="4" fill="#FFFFFF" stroke="#E8E4DA" stroke-width="1.5"/>
      <path d="M102 100 L140 76 L178 100 Z" fill="#87C6A8"/>
      <rect x="120" y="118" width="14" height="18" rx="2" fill="#A8C7E8"/>
      <rect x="146" y="118" width="14" height="18" rx="2" fill="#A8C7E8"/>
      <rect x="198" y="106" width="46" height="44" rx="4" fill="#FFFFFF" stroke="#E8E4DA" stroke-width="1.5"/>
      <path d="M193 108 L221 88 L249 108 Z" fill="#87C6A8"/>
      <rect x="208" y="122" width="12" height="14" rx="2" fill="#A8C7E8"/>
      <circle cx="258" cy="158" r="15" fill="#B9DCA9"/>
      <circle cx="258" cy="158" r="8" fill="#CDE9BE"/>
      <circle cx="86" cy="168" r="13" fill="#B9DCA9"/>
      <circle cx="150" cy="170" r="16" fill="#A8D39A"/>
      <circle cx="300" cy="172" r="12" fill="#B9DCA9"/>
      <path d="M10 176 h22 M16 170 v12 M20 168 v14" stroke="#C9B98F" stroke-width="3" stroke-linecap="round"/>
      <path d="M300 184 h18 M306 178 v12" stroke="#C9B98F" stroke-width="3" stroke-linecap="round"/>
    </svg>`;
  }
  function clipboardScene() {
    return `<svg viewBox="0 0 190 150" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="52" y="22" width="86" height="104" rx="10" fill="#FFFFFF" stroke="#E2E2DE" stroke-width="2"/>
      <rect x="76" y="16" width="38" height="14" rx="5" fill="#DCDDD8"/>
      <path d="M82 60 h26 M82 76 h34 M82 92 h26" stroke="#087A45" stroke-width="4" stroke-linecap="round"/>
      <rect x="118" y="70" width="40" height="52" rx="6" fill="#EEF8EB" stroke="#CBE3D2" stroke-width="1.5"/>
      <path d="M124 90 h28 M124 100 h20 M124 110 h14" stroke="#87C6A8" stroke-width="3.5" stroke-linecap="round"/>
      <rect x="126" y="30" width="46" height="14" rx="4" fill="#FFE9B8"/>
      <path d="M146 22 L176 44 M174 38 L176 44 L170 46" stroke="#C98A2C" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    </svg>`;
  }
  function goalCampus() {
    return `<svg viewBox="0 0 90 62" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="72" cy="14" r="9" fill="#FFE3A3"/>
      <path d="M0 46 Q22 38 44 45 T90 43 V62 H0 Z" fill="#D9EFCD"/>
      <rect x="6" y="26" width="20" height="24" rx="3" fill="#FFFFFF"/>
      <path d="M3 28 L16 16 L29 28 Z" fill="#87C6A8"/>
      <rect x="11" y="36" width="5" height="7" rx="1" fill="#A8C7E8"/>
      <rect x="34" y="30" width="24" height="20" rx="3" fill="#FFFFFF"/>
      <path d="M31 32 L46 22 L61 32 Z" fill="#87C6A8"/>
      <rect x="41" y="38" width="5" height="7" rx="1" fill="#A8C7E8"/>
      <rect x="52" y="38" width="5" height="7" rx="1" fill="#A8C7E8"/>
      <circle cx="20" cy="56" r="6" fill="#B9DCA9"/>
    </svg>`;
  }

  /* ---------------- shared: status bar + progress ---------------- */
  function progressHtml() {
    const fill = step >= 9 ? 4 : step >= 5 ? 3 : step >= 3 ? 2 : 1;
    return `${STATUS_BAR()}
      <div class="ob-top">
        ${step > 1 && step < 9 ? `<button class="ob-back" type="button" id="obBack" aria-label="Back">${IC.back}</button>` : '<span style="width:38px"></span>'}
        <div class="ob-prog">${[0, 1, 2, 3].map(i => `<i class="${i < fill ? 'on' : ''}"></i>`).join('')}</div>
      </div>`;
  }
  function paint(html) {
    const g = gate(); if (!g) return;
    g.innerHTML = `<section class="ob-screen ob-fade">${html}</section>`;
    bind();
  }

  /* ---------------- helpers ---------------- */
  function uniById(id) { return UNIS.find(u => u.id === id) || null; }
  function selectedUni() { return uniById(data.targetUniversityIds[0]); }
  function levelLabel(v) {
    if (v < 20) return 'একদম শুরু';
    if (v < 40) return 'শুরুর দিকে';
    if (v < 60) return 'মাঝামাঝি';
    if (v < 80) return 'ভালো প্রস্তুতি';
    return 'প্রায় প্রস্তুত';
  }
  function focusRows() {
    const subs = (data.weakSubjects && data.weakSubjects.length ? data.weakSubjects : BASE_SUBJECTS).slice(0, 3);
    const ics = ['📘', '✏️', '✅'];
    return subs.map((s, i) => `
      <div class="ob-focus-row">
        <span class="ob-focus-ic">${ics[i] || '📖'}</span>
        <div class="ob-focus-txt"><b>${esc(s)}</b><span>আজকের ফোকাস</span></div>
        <span class="ob-focus-meta">${IC.arrow}</span>
      </div>`).join('');
  }
  function ringHtml(pct) {
    const r = 30, c = 2 * Math.PI * r, off = c * (1 - pct / 100);
    return `<div class="ob-ring"><svg viewBox="0 0 72 72">
      <circle cx="36" cy="36" r="${r}" fill="none" stroke="#E2E2DE" stroke-width="6"/>
      <circle cx="36" cy="36" r="${r}" fill="none" stroke="#087A45" stroke-width="6" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}"/>
    </svg><span class="ob-ring-val">${pct}%</span></div>`;
  }

  /* ---------------- screens ---------------- */
  function render() {
    if (step === 1) return paint(`${STATUS_BAR()}
      <div class="ob-hero">
        <div class="ob-logo-mark">
          <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="#087A45" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10.5L12 6l8 4.5L12 15l-8-4.5z"/><path d="M8 12.8V16c0 1.4 1.8 2.5 4 2.5s4-1.1 4-2.5v-3.2"/></svg>
        </div>
        <p class="ob-wordmark">ADMISSION&nbsp;HUB</p>
        <h1 class="ob-h">তোমার স্বপ্নের অ্যাডমিশনের<br>যাত্রা শুরু হোক আজই</h1>
        <p class="ob-p">কয়েকটি সহজ প্রশ্নের উত্তর দাও,<br>তোমার জন্য তৈরি হোক পার্সোনাল প্ল্যান।</p>
        <div class="ob-illo">${campusScene()}</div>
      </div>
      <div class="ob-dock"><button class="ob-btn" type="button" id="obNext">চল শুরু করি →</button></div>`);

    if (step === 2) return paint(`${progressHtml()}
      <div class="ob-scroll">
        <h1 class="ob-h">তুমি কোন লক্ষ্যে এগোতে চাও?</h1>
        <div class="ob-list">${GOALS.map(g => `
          <button class="ob-card ${data.goal === g.id ? 'on' : ''}" data-goal="${g.id}" type="button">
            <span class="ic">${IC[g.svg]}</span>
            <span class="t"><b>${g.t}</b></span>
            <span class="ob-tick">✓</span>
          </button>`).join('')}
        </div>
        <p class="ob-err" id="obErr"></p>
      </div>
      <div class="ob-dock"><button class="ob-btn" type="button" id="obNext">এগিয়ে যাই →</button></div>`);

    if (step === 3) {
      const s = q.trim().toLowerCase();
      const list = s ? UNIS.filter(u => (u.name + ' ' + u.nameEn + ' ' + u.short).toLowerCase().includes(s)) : UNIS;
      const sel = selectedUni();
      return paint(`${progressHtml()}
        <div class="ob-scroll">
          <h1 class="ob-h">কোন বিশ্ববিদ্যালয়ে<br>ভর্তি হতে চাও?</h1>
          <div class="ob-search">${IC.search}<input id="obQ" placeholder="বিশ্ববিদ্যালয় খুঁজুন..." value="${esc(q)}"></div>
          <div class="ob-uni-grid">${list.map(u => `
            <button class="ob-uni-tile ${data.targetUniversityIds.includes(u.id) ? 'on' : ''}" data-uni="${u.id}" type="button">
              <img src="${LOGO[u.id]}" alt="${esc(u.short)}" loading="lazy">
              <span>${esc(u.short)}</span>
              <span class="ob-uni-check">✓</span>
            </button>`).join('')}
          </div>
          ${sel ? `<div class="ob-picked"><img src="${LOGO[sel.id]}" alt=""><div><strong>${esc(sel.name)}</strong><small>${esc(sel.nameEn)}</small></div></div>` : ''}
          <p class="ob-err" id="obErr"></p>
        </div>
        <div class="ob-dock"><button class="ob-btn" type="button" id="obNext">এগিয়ে যাই →</button></div>`);
    }

    if (step === 4) {
      const u = selectedUni() || UNIS[0];
      return paint(`${progressHtml()}
        <div class="ob-scroll">
          <div class="ob-unit-head">
            <img src="${LOGO[u.id]}" alt="">
            <div><strong>${esc(u.name)}</strong><small>${esc(u.nameEn)}</small></div>
          </div>
          <h1 class="ob-h">কোন ইউনিটে ভর্তি<br>হতে চাও?</h1>
          <p class="ob-p">একটি বেছে নাও</p>
          <div class="ob-unit-grid">${(u.units || ['A', 'B', 'C', 'D']).map(x => `
            <button class="ob-unit ${data.targetUnits.includes(x) ? 'on' : ''}" data-unit="${x}" type="button">
              <b>${x}</b><span>${x} ইউনিট</span>
            </button>`).join('')}
          </div>
          <p class="ob-err" id="obErr"></p>
        </div>
        <div class="ob-dock"><button class="ob-btn" type="button" id="obNext">এগিয়ে যাই →</button></div>`);
    }

    if (step === 5) return paint(`${progressHtml()}
      <div class="ob-scroll">
        <h1 class="ob-h">তোমার মূল লক্ষ্য কী?</h1>
        <p class="ob-p">একটি বেছে নাও</p>
        <div class="ob-list">${AIMS.map(a => `
          <button class="ob-card ${data.studyGoal === a.id ? 'on' : ''}" data-aim="${a.id}" type="button">
            <span class="ic">${IC[a.id === 'top' ? 'trophy' : a.id === 'good' ? 'trend' : 'zap']}</span>
            <span class="t"><b>${a.t}</b><small>${a.s}</small></span>
            <span class="ob-tick">✓</span>
          </button>`).join('')}
        </div>
        <p class="ob-err" id="obErr"></p>
      </div>
      <div class="ob-dock"><button class="ob-btn" type="button" id="obNext">এগিয়ে যাই →</button></div>`);

    if (step === 6) {
      const v = Number(data.currentLevel || 50);
      return paint(`${progressHtml()}
        <div class="ob-scroll">
          <h1 class="ob-h">তোমার বর্তমান<br>প্রস্তুতি কেমন?</h1>
          <div class="ob-gauge-wrap">
            <div class="ob-gauge" id="obGauge">
              <svg viewBox="0 0 200 110">
                <defs><linearGradient id="obGaugeGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stop-color="#3ECF8E"/><stop offset="1" stop-color="#FFD166"/>
                </linearGradient></defs>
                <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="#EEEDE9" stroke-width="16" stroke-linecap="round"/>
                <path id="obGaugeVal" d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="url(#obGaugeGrad)" stroke-width="16" stroke-linecap="round" stroke-dasharray="0 260"/>
              </svg>
              <div class="ob-gval">${v}%</div>
            </div>
            <div class="ob-glab" id="obGaugeLab">${levelLabel(v)}</div>
          </div>
          <p class="ob-p" style="margin-top:16px">কোন কোন বিষয়ে বেশি<br>মনোযোগ দরকার?</p>
          <div class="ob-chips">${BASE_SUBJECTS.map(s => `
            <button class="ob-chip ${data.weakSubjects.includes(s) ? 'on' : ''}" data-sub="${esc(s)}" type="button">${esc(s)}<span class="ob-tick">✓</span></button>`).join('')}
          </div>
        </div>
        <div class="ob-dock"><button class="ob-btn" type="button" id="obNext">এগিয়ে যাই →</button></div>`);
    }

    if (step === 7) return paint(`${progressHtml()}
      <div class="ob-scroll">
        <h1 class="ob-h">তোমার পড়ার<br>অভ্যাস কেমন?</h1>
        <p class="ob-p">প্রতিদিন কতক্ষণ পড়তে পারবে?</p>
        <div class="ob-sess-grid">${SESSIONS.map(s => `
          <button class="ob-sess ${data.session === s.id ? 'on' : ''}" data-sess="${s.id}" type="button">
            <b>${s.t}</b>
          </button>`).join('')}
        </div>
        <p class="ob-p" style="margin-top:20px">সপ্তাহে কতদিন পড়তে পারবে?</p>
        <div class="ob-days">${[3, 4, 5, 6, 7].map(d => `
          <button class="ob-day ${Number(data.weeklyDays) === d ? 'on' : ''}" data-day="${d}" type="button">${bn(d)}</button>`).join('')}
        </div>
        <p class="ob-err" id="obErr"></p>
      </div>
      <div class="ob-dock"><button class="ob-btn" type="button" id="obNext">এগিয়ে যাই →</button></div>`);

    if (step === 8) return paint(`${progressHtml()}
      <div class="ob-center">
        <div class="ob-illo-center">${clipboardScene()}</div>
        <h1 class="ob-h">আর মাত্র একটু বাকি!</h1>
        <p class="ob-p">তোমার জন্য সেরা প্রস্তুতির<br>প্ল্যান তৈরি করা হচ্ছে।</p>
      </div>
      <div class="ob-dock">
        <div style="display:flex;gap:8px;justify-content:center;margin-bottom:14px">
          ${[0, 1, 2, 3].map(i => `<i style="width:8px;height:8px;border-radius:50%;background:${i < 4 ? '#087A45' : '#E2E2DE'}"></i>`).join('')}
        </div>
        <button class="ob-btn" type="button" id="obNext">প্ল্যান তৈরি করি →</button>
      </div>`);

    if (step === 9) return paint(`${progressHtml()}
      <div class="ob-scroll ob-build">
        <h1 class="ob-h">তোমার জন্য পার্সোনাল<br>প্ল্যান তৈরি হচ্ছে...</h1>
        <div class="ob-listcheck">
          <div class="ob-li" data-st="0"><span class="ob-li-ic" style="background:#2EB872">${IC.trophy.replace('width="22"', 'width="16"').replace('stroke="#087A45"', 'stroke="#fff"')}</span> লক্ষ্য বিশ্লেষণ</div>
          <div class="ob-li" data-st="1"><span class="ob-li-ic" style="background:#2AA8A0"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l8 4-8 4-8-4 8-4z"/><path d="M4 10l8 4 8-4M4 15l8 4 8-4"/></svg></span> ইউনিট সিলেবাস ম্যাপিং</div>
          <div class="ob-li" data-st="2"><span class="ob-li-ic" style="background:#4A90D9"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9l-6-6z"/><path d="M14 3v6h6M9 13h6M9 17h4"/></svg></span> দুর্বল বিষয় বিশ্লেষণ</div>
          <div class="ob-li" data-st="3"><span class="ob-li-ic" style="background:#E0A03C"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6"/></svg></span> পার্সোনাল স্টাডি প্ল্যান</div>
        </div>
        <div class="ob-progress-track"><div class="ob-progress-fill" id="obProgFill"></div></div>
        <p class="ob-progress-lab" id="obProgLab">০% সম্পন্ন</p>
      </div>`);

    /* step 10 — ready dashboard */
    const name = (userName() || 'Rashed').trim().split(' ')[0];
    const uni = selectedUni() || uniById('du');
    const unit = (data.targetUnits || [])[0] || 'A';
    const pct = 71;
    return paint(`${STATUS_BAR()}
      <div class="ob-dash">
        <div class="ob-dash-top">
          <button class="ob-iconbtn" type="button" aria-label="Menu">${IC.menu}</button>
          <span class="ob-wordmark" style="margin:0;font-size:13px">ADMISSION&nbsp;HUB</span>
          <button class="ob-iconbtn" type="button" aria-label="Notifications">${IC.bell}</button>
        </div>
        <div class="ob-dash-body">
          <p class="ob-greet">অভিনন্দন, ${esc(name)}! 🎉</p>
          <p class="ob-greet-sub">তোমার পার্সোনাল প্রিপারেশন প্ল্যান তৈরি!</p>
          <div class="ob-goal-card">
            <div class="ob-goal-txt"><b>তোমার লক্ষ্য</b><span>${esc(uni.name)} — ${unit} ইউনিট<br>${esc(data.studyGoal === 'top' ? 'টপ র্যাঙ্ক' : data.studyGoal === 'good' ? 'ভালো প্রস্তুতি' : 'স্মার্ট ও ফাস্ট')}</span></div>
            <div class="ob-goal-illo">${goalCampus()}</div>
          </div>
          <div class="ob-section-title">আজকের ফোকাস</div>
          ${focusRows()}
          <div class="ob-section-title">সাপ্তাহিক লক্ষ্য</div>
          <div class="ob-weekly">
            ${ringHtml(pct)}
            <div class="ob-weekly-txt"><b>${bn(Number(data.weeklyDays) || 5)}/${bn(7)} দিন</b><span>সপ্তাহে ${bn(Number(data.weeklyDays) || 5)} দিন পড়ার<br>পরিকল্পনা করা হয়েছে</span></div>
          </div>
        </div>
      </div>
      <div class="ob-cta"><button class="ob-btn" type="button" id="obGo">আমার ড্যাশবোর্ডে যাই →</button></div>`);
  }

  function err(m) { const e = document.getElementById('obErr'); if (e) e.textContent = m || ''; }

  /* ---------------- navigation ---------------- */
  function nextStep() {
    if (step === 2 && !data.goal) return err('একটি লক্ষ্য বেছে নাও');
    if (step === 3 && !data.targetUniversityIds.length) return err('একটি বিশ্ববিদ্যালয় বেছে নাও');
    if (step === 4 && !data.targetUnits.length) return err('একটি ইউনিট বেছে নাও');
    if (step === 5 && !data.studyGoal) return err('একটি লক্ষ্য বেছে নাও');
    if (step === 7 && !data.session) return err('পড়ার সময় বেছে নাও');
    if (step === 2 && !needsUni()) { step = 5; saveRemote(); return render(); }
    if (step === 8) { step = 9; saveRemote(); render(); return runPlan(); }
    if (step < 10) { step += 1; saveRemote(); render(); }
  }
  function prev() {
    if (step === 5 && !needsUni()) step = 2;
    else if (step === 4) step = 3;
    else if (step > 1) step -= 1;
    if (step < 2) step = 1;
    saveRemote(); render();
  }
  function needsUni() { return data.goal === 'uni'; }

  /* ---------------- plan building (step 9) ---------------- */
  async function runPlan() {
    const rows = [...document.querySelectorAll('.ob-li')];
    const fill = document.getElementById('obProgFill');
    const lab = document.getElementById('obProgLab');
    const tick = 320;
    for (let i = 0; i < rows.length; i++) {
      rows.forEach(el => el.classList.remove('now'));
      rows[i].classList.add('now');
      if (i) rows[i - 1].classList.add('ok');
      const p = Math.round(10 + i * 27);
      if (fill) fill.style.width = Math.min(p, 91) + '%';
      if (lab) lab.textContent = bn(Math.min(p, 91)) + '% সম্পন্ন';
      await new Promise(r => setTimeout(r, tick));
    }
    rows.forEach(el => el.classList.add('ok'));
    if (fill) fill.style.width = '91%';
    if (lab) lab.textContent = '৯১% সম্পন্ন';
    data.completed = true;
    data.step = 10;
    await saveRemote({ completed: true, step: 10 });
    await new Promise(r => setTimeout(r, 500));
    step = 10;
    render();
  }

  /* ---------------- finish: 3D splash → dashboard ---------------- */
  function finish() {
    showGate(false);
    try { localStorage.removeItem(storeKey()); } catch (_) {}
    showSplash();
    setTimeout(() => {
      hideSplash();
      if (typeof navigate === 'function') navigate('dashboard');
      else if (typeof render === 'function') render();
    }, 1600);
  }
  function showSplash() {
    let s = document.getElementById('ahSplash');
    if (!s) {
      s = document.createElement('div');
      s.id = 'ahSplash';
      s.className = 'ah-splash';
      s.innerHTML = `<div class="ah-splash-in">
        <span class="ah3d ah3d-lg" aria-hidden="true"><span class="ring r1"></span><span class="ring r2"></span><span class="ring r3"></span><span class="cube"><i class="f1"></i><i class="f2"></i><i class="f3"></i><i class="f4"></i><i class="f5"></i><i class="f6"></i></span><span class="dot d1"></span><span class="dot d2"></span><span class="dot d3"></span><span class="dot d4"></span></span>
        <p class="ah-splash-t">ADMISSION HUB</p>
        <div class="ah3d-bar"><i></i></div>
        <p class="ah-splash-s">তোমার ড্যাশবোর্ড তৈরি হচ্ছে…</p>
      </div>`;
      document.body.appendChild(s);
    }
    s.classList.add('show');
  }
  function hideSplash() {
    const s = document.getElementById('ahSplash');
    if (s) s.classList.remove('show');
  }

  /* ---------------- bind ---------------- */
  function bind() {
    const n = document.getElementById('obNext'); if (n) n.onclick = nextStep;
    const b = document.getElementById('obBack'); if (b) b.onclick = prev;
    const g = document.getElementById('obGo'); if (g) g.onclick = finish;
    gate()?.querySelectorAll('[data-goal]').forEach(el => el.onclick = () => { data.goal = el.getAttribute('data-goal'); render(); });
    gate()?.querySelectorAll('[data-uni]').forEach(el => el.onclick = () => {
      const id = el.getAttribute('data-uni');
      const u = uniById(id);
      data.targetUniversityIds = [id];
      data.targetUniversities = u ? [u.name] : [id];
      data.targetUnits = [];
      render();
    });
    gate()?.querySelectorAll('[data-unit]').forEach(el => el.onclick = () => {
      const x = el.getAttribute('data-unit');
      const set = new Set(data.targetUnits);
      if (set.has(x)) set.delete(x); else set.add(x);
      data.targetUnits = [...set];
      render();
    });
    gate()?.querySelectorAll('[data-aim]').forEach(el => el.onclick = () => { data.studyGoal = el.getAttribute('data-aim'); render(); });
    gate()?.querySelectorAll('[data-sub]').forEach(el => el.onclick = () => {
      const x = el.getAttribute('data-sub');
      const set = new Set(data.weakSubjects);
      if (set.has(x)) set.delete(x); else set.add(x);
      data.weakSubjects = [...set];
      render();
    });
    gate()?.querySelectorAll('[data-sess]').forEach(el => el.onclick = () => { data.session = el.getAttribute('data-sess'); render(); });
    gate()?.querySelectorAll('[data-day]').forEach(el => el.onclick = () => { data.weeklyDays = Number(el.getAttribute('data-day')); render(); });

    const gauge = document.getElementById('obGauge');
    if (gauge) {
      const apply = (clientX) => {
        const r = gauge.getBoundingClientRect();
        if (!r.width) return;
        let p = (clientX - r.left) / r.width;
        p = Math.max(0, Math.min(1, p));
        const v = Math.round(p * 100);
        data.currentLevel = v;
        const val = document.getElementById('obGaugeVal');
        if (val) val.setAttribute('stroke-dasharray', Math.max(1, v * 2.51) + ' 260');
        const gv = gauge.querySelector('.ob-gval'); if (gv) gv.textContent = v + '%';
        const gl = document.getElementById('obGaugeLab'); if (gl) gl.textContent = levelLabel(v);
      };
      gauge.addEventListener('pointerdown', e => {
        e.preventDefault();
        if (gauge.setPointerCapture) { try { gauge.setPointerCapture(e.pointerId); } catch (_) {} }
        apply(e.clientX);
      });
      gauge.addEventListener('pointermove', e => { if (e.buttons) apply(e.clientX); });
    }
    const sq = document.getElementById('obQ');
    if (sq) sq.oninput = () => { q = sq.value; render(); const again = document.getElementById('obQ'); if (again) { again.focus(); again.value = q; again.setSelectionRange(q.length, q.length); } };
  }

  /* ---------------- boot ---------------- */
  async function maybeStart() {
    if (!token()) return false;
    loadLocal();
    try {
      const r = await api('/onboarding', { headers: authH() });
      if (r.onboarding) data = Object.assign(blank(), data, r.onboarding);
    } catch (_) {}
    if (data.completed) return false;
    step = Math.max(1, Number(data.step) || 1);
    if (step > 9 && !data.completed) step = 9;
    showGate(true);
    render();
    if (step === 9) runPlan();
    return true;
  }

  window.AHOnboard = { maybeStart, start: maybeStart };
})();
