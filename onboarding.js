/* Phase 6 — personalized onboarding. Auth / Phase 1 screens untouched. */
(() => {
  'use strict';
  if (window.AHOnboard) return;

  const PUB = 'https://admission-gk.rashelzayan213.workers.dev/pub';
  const TOTAL = 9;
  const FALLBACK_UNI = [
    { id: 'du', name: 'ঢাকা বিশ্ববিদ্যালয়', short: 'DU', units: ['A', 'B', 'C', 'D'] },
    { id: 'cu', name: 'চট্টগ্রাম বিশ্ববিদ্যালয়', short: 'CU', units: ['A', 'B', 'C', 'D'] },
    { id: 'ru', name: 'রাজশাহী বিশ্ববিদ্যালয়', short: 'RU', units: ['A', 'B', 'C', 'D'] },
    { id: 'ju', name: 'জাহাঙ্গীরনগর বিশ্ববিদ্যালয়', short: 'JU', units: ['A', 'B', 'C', 'D'] },
    { id: 'ku', name: 'খুলনা বিশ্ববিদ্যালয়', short: 'KU', units: ['A', 'B', 'C', 'D'] },
    { id: 'cou', name: 'কুমিল্লা বিশ্ববিদ্যালয়', short: 'CoU', units: ['A', 'B', 'C'] },
    { id: 'other', name: 'অন্যান্য', short: 'OTH', units: ['A', 'B', 'C', 'D'] }
  ];
  const GOALS = [
    { id: 'uni', t: 'বিশ্ববিদ্যালয় ভর্তি', ic: '#dbeade', svg: 'cap' },
    { id: 'hsc', t: 'HSC / আলিম', ic: '#e4eefc', svg: 'book' },
    { id: 'ssc', t: 'SSC / দাখিল', ic: '#e7f6ea', svg: 'note' },
    { id: 'bcs', t: 'বিসিএস / চাকরি', ic: '#f3eadb', svg: 'bag' },
    { id: 'other', t: 'অন্যান্য', ic: '#eeeef3', svg: 'dots' }
  ];
  const AIMS = [
    { id: 'top', t: 'টপ র্যাঙ্ক', s: 'সেরাদের মধ্যে থাকতে চাই' },
    { id: 'good', t: 'ভালো প্রস্তুতি', s: 'ভারসাম্যপূর্ণ প্রস্তুতি নিতে চাই' },
    { id: 'fast', t: 'স্মার্ট ও ফাস্ট', s: 'কম সময়ে কার্যকর প্রস্তুতি চাই' },
    { id: 'weak', t: 'দুর্বলতা কাটানো', s: 'যেখানে পিছিয়ে, সেখানে জোর' }
  ];
  const LEVELS = [
    [0, 'একদম শুরু'], [15, 'Beginner'], [25, '২৫%'], [50, '৫০%'], [75, '৭৫%'], [90, 'Almost Ready'], [100, 'Exam Ready']
  ];

  let catalog = FALLBACK_UNI.slice();
  let step = 1;
  let q = '';
  let busy = false;
  let data = blank();

  function blank() {
    return {
      step: 1, completed: false,
      goal: '', targetUniversities: [], targetUniversityIds: [], targetUnits: [],
      studyGoal: '', currentLevel: 50, weakSubjects: [],
      dailyHours: 2, weeklyDays: 5, preferredTime: 'flexible', plan: null
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
      return (u && (u.displayName || u.name)) || 'শিক্ষার্থী';
    } catch (_) { return 'শিক্ষার্থী'; }
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

  function ico(kind) {
    const m = {
      cap: '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="#1e7a4c" d="M3 10l9-5 9 5-9 5-9-5zm2 3.2V17c0 1.5 3.1 3 7 3s7-1.5 7-3v-3.8l-7 3.9-7-3.9z"/></svg>',
      book: '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="#2b6cb0" d="M5 4h9a3 3 0 013 3v13H8a3 3 0 01-3-3V4zm3 2v12h.2A4.8 4.8 0 0112 16h5V7a1 1 0 00-1-1H8z"/></svg>',
      note: '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="#2f855a" d="M6 3h9l5 5v13H6V3zm9 1.5V9h4.5"/></svg>',
      bag: '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="#b7791f" d="M8 7V6a4 4 0 118 0v1h3v13H5V7h3zm2 0h4V6a2 2 0 10-4 0v1z"/></svg>',
      dots: '<svg viewBox="0 0 24 24" width="22" height="22"><circle cx="6" cy="12" r="2" fill="#718096"/><circle cx="12" cy="12" r="2" fill="#718096"/><circle cx="18" cy="12" r="2" fill="#718096"/></svg>',
      back: '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="none" stroke="currentColor" stroke-width="2.2" d="M15 5l-7 7 7 7"/></svg>'
    };
    return m[kind] || '';
  }

  // ── ইউনিভার্সিটি লোগো বেজ (প্রিমিয়াম SVG এমব্লেম) ─────────────
  const UNI_BRAND = {
    du:  { c1: '#0f9d63', c2: '#065f3c', icon: 'M12 4l7 4v5l-7-4-7 4V8l7-4zM5 14.5v4L12 22l7-3.5v-4L12 19l-7-4.5z' },
    cu:  { c1: '#e23b3b', c2: '#8f1d1d', icon: 'M12 4l7 4v5l-7-4-7 4V8l7-4zM5 14.5v4L12 22l7-3.5v-4L12 19l-7-4.5z' },
    ru:  { c1: '#1fa35c', c2: '#0b5e31', icon: 'M4 7l8-3 8 3-8 3-8-3zM6 9.5V15c0 1.6 2.7 3 6 3s6-1.4 6-3V9.5l-6 2.3-6-2.3z' },
    ju:  { c1: '#3b82f6', c2: '#1d4fa8', icon: 'M4 7l8-3 8 3-8 3-8-3zM6 9.5V15c0 1.6 2.7 3 6 3s6-1.4 6-3V9.5l-6 2.3-6-2.3z' },
    ku:  { c1: '#0ea5a5', c2: '#0b5c5c', icon: 'M4 7l8-3 8 3-8 3-8-3zM6 9.5V15c0 1.6 2.7 3 6 3s6-1.4 6-3V9.5l-6 2.3-6-2.3z' },
    cou: { c1: '#8b5cf6', c2: '#5b21b6', icon: 'M12 4l7 4v5l-7-4-7 4V8l7-4zM5 14.5v4L12 22l7-3.5v-4L12 19l-7-4.5z' },
    other:{ c1: '#64748b', c2: '#334155', icon: 'M5 12h14M12 5v14' }
  };
  function uniLogo(u) {
    const b = UNI_BRAND[u.id] || UNI_BRAND.other;
    const short = (u.short || u.id || 'OTH').slice(0, 3).toUpperCase();
    return `<svg class="ob-logo" width="56" height="56" viewBox="0 0 64 64" aria-hidden="true">
      <defs><linearGradient id="obg${u.id}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${b.c1}"/><stop offset="1" stop-color="${b.c2}"/>
      </linearGradient></defs>
      <circle cx="32" cy="32" r="29" fill="url(#obg${u.id})" stroke="rgba(255,255,255,.55)" stroke-width="1.5"/>
      <circle cx="32" cy="32" r="24.5" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="1" stroke-dasharray="3 3"/>
      <path d="${b.icon}" fill="rgba(255,255,255,.92)" transform="translate(10 10) scale(1.85)"/>
      <text x="32" y="49" text-anchor="middle" font-size="10.5" font-weight="800" font-family="Arial,sans-serif" fill="#fff" letter-spacing="1">${short}</text>
    </svg>`;
  }

  function world() {
    return `<div class="ob-stage" aria-hidden="true">
      <i class="ob-orb a"></i><i class="ob-orb b"></i><i class="ob-orb c"></i>
      ${[0,1,2,3,4,5,6,7,8,9,10,11].map(i => `<i class="ob-part" style="left:${6+i*8}%;animation-delay:${i*.55}s"></i>`).join('')}
      <div class="ob-scene">
        <div class="stage3d">
          <div class="ob-cap">
            <div class="board"></div>
            <div class="top"></div>
            <div class="btn"></div>
            <div class="tassel"></div>
          </div>
          <div class="ob-book b1"></div>
          <div class="ob-book b2"></div>
          <div class="ob-book b3"></div>
          <div class="ob-ring r1"></div>
          <div class="ob-ring r2"></div>
          <div class="ob-coin c1"></div>
          <div class="ob-coin c2"></div>
        </div>
      </div>
    </div>`;
  }

  function progressHtml() {
    const n = Math.min(step, TOTAL);
    return `<div class="ob-top">
      ${step > 1 && step < 10 ? `<button class="ob-back" type="button" id="obBack" aria-label="Back">${ico('back')}</button>` : '<span style="width:36px"></span>'}
      <div class="ob-prog">${Array.from({ length: TOTAL }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</div>
    </div>`;
  }

  function paint(html) {
    const g = gate(); if (!g) return;
    g.innerHTML = `<section class="ob-screen">${html}</section>`;
    bind();
  }

  function needsUni() { return data.goal === 'uni'; }
  function unis() {
    const list = catalog.length ? catalog : FALLBACK_UNI;
    const s = q.trim().toLowerCase();
    if (!s) return list;
    return list.filter(u => (u.name + (u.short || '') + (u.nameEn || '')).toLowerCase().includes(s));
  }
  function selectedUni() {
    const id = data.targetUniversityIds[0];
    return (catalog.find(u => u.id === id) || FALLBACK_UNI.find(u => u.id === id) || null);
  }
  function subjects() {
    const fromBank = (typeof CACHE !== 'undefined' && Array.isArray(CACHE.subjects))
      ? CACHE.subjects.map(s => s.name).filter(Boolean)
      : [];
    const base = ['বাংলা', 'English', 'GK', 'ICT', 'Math'];
    const all = [];
    [...base, ...fromBank].forEach(n => { if (n && !all.includes(n)) all.push(n); });
    return all.slice(0, 10);
  }
  function levelLabel(v) {
    let lab = LEVELS[0][1];
    LEVELS.forEach(([n, t]) => { if (v >= n) lab = t; });
    return lab;
  }

  function render() {
    if (step === 1) return paint(`${world()}
      <div class="ob-center">
        <p class="ob-kicker">ADMISSION HUB</p>
        <h1 class="ob-h">তোমার স্বপ্নের অ্যাডমিশনের যাত্রা শুরু হোক আজই</h1>
        <p class="ob-p">কয়েকটি তথ্য দাও, আমরা তোমার জন্য তৈরি করবো পার্সোনাল প্রিপারেশন প্ল্যান।</p>
      </div>
      <div class="ob-dock"><button class="ob-btn" type="button" id="obNext">চল শুরু করি →</button></div>`);

    if (step === 2) return paint(`${progressHtml()}
      <div class="ob-scroll">
      <h1 class="ob-h">তুমি এখন কোন লক্ষ্যে এগোচ্ছো?</h1>
      <div class="ob-list">${GOALS.map(g => `<button class="ob-card ${data.goal === g.id ? 'on' : ''}" data-goal="${g.id}" type="button"><span class="ic" style="background:${g.ic}">${ico(g.svg)}</span><span>${g.t}</span><span class="ob-tick">✓</span></button>`).join('')}</div>
      <p class="ob-err" id="obErr"></p>
      </div>
      <div class="ob-dock"><button class="ob-btn" type="button" id="obNext">এগিয়ে যান</button></div>`);

    if (step === 3) {
      const list = unis();
      return paint(`${progressHtml()}
        <div class="ob-scroll">
        <h1 class="ob-h">কোন বিশ্ববিদ্যালয়ে তোমার লক্ষ্য?</h1>
        <div class="ob-search">${ico('book').replace('width="22"','width="18"')}<input id="obQ" placeholder="বিশ্ববিদ্যালয় খুঁজুন..." value="${esc(q)}"></div>
        <div class="ob-uni">${list.slice(0, 8).map(u => `<button class="ob-chip ${data.targetUniversityIds.includes(u.id) ? 'on' : ''}" data-uni="${esc(u.id)}" type="button">${uniLogo(u)}${esc(u.name)}<span class="ob-tick">✓</span></button>`).join('')}</div>
        ${selectedUni() ? `<div class="ob-picked">${uniLogo(selectedUni())}<div><strong>${esc(selectedUni().name)}</strong><small>✓ নির্বাচিত</small></div></div>` : ''}
        <p class="ob-err" id="obErr"></p>
        </div>
        <div class="ob-dock"><button class="ob-btn" type="button" id="obNext">এগিয়ে যান</button></div>`);
    }

    if (step === 4) {
      const u = selectedUni() || FALLBACK_UNI[0];
      const units = u.units || ['A', 'B', 'C', 'D'];
      return paint(`${progressHtml()}
        <div class="ob-scroll">
        <div class="ob-picked" style="margin-bottom:14px">${uniLogo(u)}<div><strong>${esc(u.name)}</strong><small>${esc(u.short || u.id)}</small></div></div>
        <h1 class="ob-h">কোন ইউনিটের জন্য প্রস্তুতি নিচ্ছো?</h1>
        <p class="ob-p">এক বা একাধিক বেছে নাও</p>
        <div class="ob-grid">${units.map(x => `<button class="ob-chip ${data.targetUnits.includes(x) ? 'on' : ''}" data-unit="${x}" type="button">${x} ইউনিট<span class="ob-tick">✓</span></button>`).join('')}</div>
        <p class="ob-err" id="obErr"></p>
        </div>
        <div class="ob-dock"><button class="ob-btn" type="button" id="obNext">এগিয়ে যান</button></div>`);
    }

    if (step === 5) return paint(`${progressHtml()}
      <div class="ob-scroll">
      <h1 class="ob-h">তোমার মূল লক্ষ্য কী?</h1>
      <div class="ob-list">${AIMS.map(a => `<button class="ob-card ${data.studyGoal === a.id ? 'on' : ''}" data-aim="${a.id}" type="button"><span class="ic" style="background:rgba(255,255,255,.12)">${a.id === 'top' ? '🏆' : a.id === 'good' ? '📈' : a.id === 'fast' ? '⚡' : '🎯'}</span><span>${a.t}<br><small style="font-weight:500;color:var(--ob-sub);font-size:12px">${a.s}</small></span><span class="ob-tick">✓</span></button>`).join('')}</div>
      <p class="ob-err" id="obErr"></p>
      </div>
      <div class="ob-dock"><button class="ob-btn" type="button" id="obNext">এগিয়ে যান</button></div>`);

    if (step === 6) {
      const v = Number(data.currentLevel || 50);
      return paint(`${progressHtml()}
        <div class="ob-scroll">
        <h1 class="ob-h">তোমার বর্তমান প্রস্তুতি কেমন?</h1>
        <div class="ob-gauge">
          <svg class="ob-gauge-arc" viewBox="0 0 200 110">
            <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="rgba(255,255,255,.16)" stroke-width="14" stroke-linecap="round"/>
            <path id="obGaugeVal" d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="url(#obGaugeGrad)" stroke-width="14" stroke-linecap="round" stroke-dasharray="${Math.max(1, v * 2.5)} 260" style="filter:drop-shadow(0 0 6px rgba(110,242,178,.6))"/>
            <defs><linearGradient id="obGaugeGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#17d185"/><stop offset="1" stop-color="#ffd166"/></linearGradient></defs>
          </svg>
          <div class="ob-gval">${v}%</div>
          <div class="ob-glab">${esc(levelLabel(v))}</div>
          <input class="ob-range" id="obLvl" type="range" min="0" max="100" step="5" value="${v}">
        </div>
        <p class="ob-p" style="margin-top:14px">কোন বিষয়গুলোতে বেশি মনোযোগ দরকার?</p>
        <div class="ob-grid">${subjects().map(s => `<button class="ob-chip ${data.weakSubjects.includes(s) ? 'on' : ''}" data-sub="${esc(s)}" type="button">${esc(s)}<span class="ob-tick">✓</span></button>`).join('')}</div>
        </div>
        <div class="ob-dock"><button class="ob-btn" type="button" id="obNext">এগিয়ে যান</button></div>`);
    }

    if (step === 7) return paint(`${progressHtml()}
      <div class="ob-scroll">
      <h1 class="ob-h">প্রতিদিন কতক্ষণ পড়তে পারবে?</h1>
      <div class="ob-grid">${[1,2,3,4,5].map(h => `<button class="ob-chip ${Number(data.dailyHours) === h ? 'on' : ''}" data-hr="${h}" type="button">${h === 5 ? '৫+ ঘণ্টা' : h + ' ঘণ্টা'}<span class="ob-tick">✓</span></button>`).join('')}</div>
      <p class="ob-p" style="margin-top:18px">সপ্তাহে কয়দিন পড়তে পারবে?</p>
      <div class="ob-days">${[1,2,3,4,5,6,7].map(d => `<button type="button" data-day="${d}" class="${Number(data.weeklyDays) === d ? 'on' : ''}">${d}</button>`).join('')}</div>
      <p class="ob-p" style="margin-top:18px">পড়ার সময় (ঐচ্ছিক)</p>
      <div class="ob-grid">${[['morning','সকাল'],['afternoon','দুপুর'],['evening','সন্ধ্যা'],['night','রাত'],['flexible','Flexible']].map(([id,t]) => `<button class="ob-chip ${data.preferredTime === id ? 'on' : ''}" data-time="${id}" type="button">${t}<span class="ob-tick">✓</span></button>`).join('')}</div>
      </div>
      <div class="ob-dock"><button class="ob-btn" type="button" id="obNext">এগিয়ে যান</button></div>`);

    if (step === 8) return paint(`${progressHtml()}
      <div class="ob-center">
        ${world()}
        <h1 class="ob-h">আর একটু…</h1>
        <p class="ob-p">তোমার জন্য সেরা প্রস্তুতির পথ তৈরি করা হচ্ছে।</p>
      </div>
      <div class="ob-dock"><button class="ob-btn" type="button" id="obNext">প্ল্যান তৈরি করুন →</button></div>`);

    if (step === 9) return paint(`${progressHtml()}
      <h1 class="ob-h">তোমার জন্য পার্সোনাল প্ল্যান তৈরি হচ্ছে…</h1>
      <ul class="ob-steps" id="obStages">
        <li data-st="0"><i class="ob-dot"></i> লক্ষ্য বিশ্লেষণ</li>
        <li data-st="1"><i class="ob-dot"></i> Target University বিশ্লেষণ</li>
        <li data-st="2"><i class="ob-dot"></i> Unit syllabus mapping</li>
        <li data-st="3"><i class="ob-dot"></i> Current level analysis</li>
        <li data-st="4"><i class="ob-dot"></i> Weak subject analysis</li>
        <li data-st="5"><i class="ob-dot"></i> Study capacity analysis</li>
        <li data-st="6"><i class="ob-dot"></i> Personalized preparation plan</li>
      </ul>`);

    const plan = data.plan || {};
    const uni = (data.targetUniversities || [])[0] || 'লক্ষ্য নির্ধারিত';
    const unit = (data.targetUnits || []).map(x => x + ' ইউনিট').join(', ');
    const uRec = selectedUni();
    const hour = new Date().getHours();
    const greet = hour < 12 ? 'সুপ্রভাত' : hour < 17 ? 'শুভ অপরাহ্ন' : hour < 20 ? 'শুভ সন্ধ্যা' : 'শুভ রাত্রি';
    return paint(`<div class="ob-center">
      <div class="ob-burst"><div class="ring"></div><div class="core">🎓</div></div>
      <p class="ob-kicker">ADMISSION HUB</p>
      <h1 class="ob-h">${greet}, ${esc(userName().split(' ')[0])} 👋</h1>
      <p class="ob-p">তোমার পার্সোনাল প্রিপারেশন প্ল্যান তৈরি!</p>
      <div class="ob-ready ob-target">${uRec ? uniLogo(uRec) : '<div class="ob-burst" style="width:44px;height:44px;margin:0"><div class="core" style="width:44px;height:44px;font-size:18px">🎯</div></div>'}<div><h3>তোমার লক্ষ্য</h3><p>${esc(uni)}${unit ? ' — ' + esc(unit) : ''}</p></div></div>
      <div class="ob-ready"><h3>🎯 আজকের ফোকাস</h3><p>${esc((plan.focus || data.weakSubjects || []).slice(0, 3).join(' · ') || 'মূল বিষয়সমূহ')}</p>
        <p><small>প্রতিদিন ${esc(plan.dailyQuestions || 30)}টি প্রশ্ন · ${esc(plan.dailyMinutes || (data.dailyHours * 60) || 120)} মিনিট</small></p></div>
      <div class="ob-ready"><h3>🔥 প্রস্তুতি অবস্থা</h3><div class="ob-meter"><i style="width:${Math.max(8, Number(data.currentLevel || 0))}%"></i></div><p><small>${esc(levelLabel(Number(data.currentLevel || 0)))} · ${esc(plan.weeklyDays || data.weeklyDays || 5)} দিন/সপ্তাহ</small></p></div>
      <div class="ob-dock"><button class="ob-btn" type="button" id="obGo">আমার প্রস্তুতি শুরু করি →</button></div>
    </div>`);
  }

  function err(m) { const e = document.getElementById('obErr'); if (e) e.textContent = m || ''; }

  function nextStep() {
    if (step === 2 && !data.goal) return err('একটি লক্ষ্য বেছে নিন');
    if (step === 3 && needsUni() && !data.targetUniversityIds.length) return err('একটি বিশ্ববিদ্যালয় বেছে নিন');
    if (step === 4 && needsUni() && !data.targetUnits.length) return err('কমপক্ষে একটি ইউনিট বেছে নিন');
    if (step === 5 && !data.studyGoal) return err('একটি মূল লক্ষ্য বেছে নিন');
    if (step === 3 && !needsUni()) { step = 5; saveRemote(); return render(); }
    if (step === 2 && !needsUni()) { step = 5; saveRemote(); return render(); }
    if (step === 8) { step = 9; saveRemote(); render(); return runPlan(); }
    if (step < 10) { step += 1; saveRemote(); render(); }
  }
  function prev() {
    if (step === 5 && !needsUni()) step = 2;
    else if (step > 1) step -= 1;
    saveRemote(); render();
  }

  async function runPlan() {
    const rows = [...document.querySelectorAll('#obStages li')];
    const tick = 120;
    for (let i = 0; i < rows.length; i++) {
      rows.forEach(el => el.classList.remove('now'));
      rows[i].classList.add('now');
      if (i) rows[i - 1].classList.add('ok');
      await new Promise(r => setTimeout(r, i === rows.length - 1 ? tick * 2 : tick));
    }
    rows.forEach(el => el.classList.add('ok'));
    data.completed = true;
    data.step = 10;
    await saveRemote({ completed: true, step: 10 });
    step = 10;
    render();
  }

  function finish() {
    showGate(false);
    try { localStorage.removeItem(storeKey()); } catch (_) {}
    if (typeof navigate === 'function') navigate('dashboard');
    else if (typeof render === 'function') render();
  }

  function bind() {
    const n = document.getElementById('obNext'); if (n) n.onclick = nextStep;
    const b = document.getElementById('obBack'); if (b) b.onclick = prev;
    const g = document.getElementById('obGo'); if (g) g.onclick = finish;
    gate()?.querySelectorAll('[data-goal]').forEach(el => el.onclick = () => { data.goal = el.getAttribute('data-goal'); render(); });
    gate()?.querySelectorAll('[data-uni]').forEach(el => el.onclick = () => {
      const id = el.getAttribute('data-uni');
      const u = catalog.find(x => x.id === id) || FALLBACK_UNI.find(x => x.id === id);
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
    gate()?.querySelectorAll('[data-hr]').forEach(el => el.onclick = () => { data.dailyHours = Number(el.getAttribute('data-hr')); render(); });
    gate()?.querySelectorAll('[data-day]').forEach(el => el.onclick = () => { data.weeklyDays = Number(el.getAttribute('data-day')); render(); });
    gate()?.querySelectorAll('[data-time]').forEach(el => el.onclick = () => { data.preferredTime = el.getAttribute('data-time'); render(); });
    const rng = document.getElementById('obLvl');
    if (rng) rng.oninput = () => {
      data.currentLevel = Number(rng.value);
      const v = document.querySelector('.ob-gval'); if (v) v.textContent = rng.value + '%';
      const l = document.querySelector('.ob-glab'); if (l) l.textContent = levelLabel(Number(rng.value));
      const arc = document.getElementById('obGaugeVal'); if (arc) arc.setAttribute('stroke-dasharray', Math.max(1, Number(rng.value) * 2.5) + ' 260');
    };
    const sq = document.getElementById('obQ');
    if (sq) sq.oninput = () => { q = sq.value; render(); const again = document.getElementById('obQ'); if (again) { again.focus(); again.value = q; again.setSelectionRange(q.length, q.length); } };
  }

  async function loadCatalog() {
    try {
      const r = await api('/onboarding/catalog', { headers: authH() });
      if (Array.isArray(r.universities) && r.universities.length) catalog = r.universities;
    } catch (_) {
      const extra = [];
      if (typeof CACHE !== 'undefined') {
        (CACHE.exams || []).forEach(ex => {
          const n = String(ex.university || ex.uni || '').trim();
          if (n && !FALLBACK_UNI.some(u => u.name === n) && !extra.some(u => u.name === n)) {
            extra.push({ id: 'ex-' + extra.length, name: n, short: n.slice(0, 3).toUpperCase(), units: ['A', 'B', 'C', 'D'] });
          }
        });
      }
      catalog = FALLBACK_UNI.concat(extra);
    }
  }

  async function maybeStart() {
    if (!token()) return false;
    loadLocal();
    try {
      const r = await api('/onboarding', { headers: authH() });
      if (r.onboarding) data = Object.assign(blank(), data, r.onboarding);
    } catch (_) {}
    if (data.completed) return false;
    await loadCatalog();
    step = Math.max(1, Number(data.step) || 1);
    if (step > 9 && !data.completed) step = 9;
    showGate(true);
    render();
    if (step === 9) runPlan();
    return true;
  }

  window.AHOnboard = { maybeStart, start: maybeStart };
})();
