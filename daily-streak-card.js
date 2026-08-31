/*
 * Daily Streak Card (Duolingo-style, 3D) — Admission Hub
 * সব সংখ্যা আসল ডেটা থেকে: CACHE.activityLogs + CACHE.examResults (computeStreak-এর মতোই)।
 * কোনো fake/demo ডেটা নেই।
 */
(() => {
  'use strict';

  const STYLE_ID = 'daily-streak-card-style';
  const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  const toBn = (n) => String(n).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);
  const dayKey = (d) => { const v = d instanceof Date ? d : new Date(d); return v.getFullYear() + '-' + String(v.getMonth() + 1).padStart(2, '0') + '-' + String(v.getDate()).padStart(2, '0'); };

  let styled = false;
  function ensureStyle() {
    if (styled || document.getElementById(STYLE_ID)) return;
    styled = true;
    const st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = `
    .dsc-wrap{margin:2px 0 18px;perspective:900px}
    .dsc-tilt{transform-style:preserve-3d;transition:transform .25s ease;will-change:transform}
    .dsc-card{position:relative;overflow:hidden;border-radius:24px;padding:18px 18px 16px;color:#fff;transform-style:preserve-3d;box-shadow:0 18px 40px rgba(0,0,0,.28),0 4px 14px rgba(0,0,0,.18);animation:dscFloat 5.2s ease-in-out infinite}
    .dsc-done{background:linear-gradient(135deg,#12a05f 0%,#0a5c38 62%,#08432a 100%)}
    .dsc-risk{background:linear-gradient(135deg,#e05252 0%,#b13a55 55%,#7e2745 100%)}
    .dsc-zero{background:linear-gradient(135deg,#155e4b 0%,#0c3f33 60%,#082b23 100%)}
    .dsc-card::after{content:"";position:absolute;inset:-40% -20%;background:radial-gradient(circle at 22% 18%,rgba(255,255,255,.28),transparent 42%),radial-gradient(circle at 88% 90%,rgba(255,255,255,.10),transparent 40%);pointer-events:none}
    .dsc-shine{position:absolute;top:0;left:-70%;width:55%;height:100%;background:linear-gradient(105deg,transparent,rgba(255,255,255,.30),transparent);transform:skewX(-18deg);animation:dscShine 6.5s ease-in-out infinite;pointer-events:none}
    .dsc-flame{position:absolute;right:16px;top:12px;font-size:46px;transform:translateZ(46px);filter:drop-shadow(0 6px 16px rgba(255,170,60,.65));animation:dscFlame 2.1s ease-in-out infinite}
    .dsc-big{font-size:34px;font-weight:900;letter-spacing:-.5px;transform:translateZ(34px);text-shadow:0 3px 10px rgba(0,0,0,.30)}
    .dsc-big small{font-size:19px;font-weight:800}
    .dsc-sub{margin-top:3px;font-size:12.5px;opacity:.94;transform:translateZ(26px)}
    .dsc-week{display:flex;gap:7px;margin-top:13px;transform:translateZ(20px)}
    .dsc-day{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px}
    .dsc-day span{font-size:9.5px;font-weight:800;opacity:.92}
    .dsc-dot{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font-size:12px;font-weight:900;background:rgba(255,255,255,.16);color:rgba(255,255,255,.85);border:1px solid rgba(255,255,255,.25)}
    .dsc-dot.hit{background:rgba(255,255,255,.92);color:#1b6b47;border-color:transparent;box-shadow:0 3px 8px rgba(0,0,0,.22)}
    .dsc-dot.miss{opacity:.42}
    .dsc-dot.today{border:2px solid #ffd76a;color:#ffe9a8;animation:dscPulse 1.6s ease-in-out infinite}
    .dsc-dot.today.hit{background:#ffd76a;color:#6b4c00;border-color:transparent;animation:none}
    .dsc-cta{margin-top:13px;width:100%;border:0;border-radius:14px;padding:11px 12px;font-weight:900;font-size:13px;background:#fff;color:#8e2c46;box-shadow:0 5px 14px rgba(0,0,0,.25);cursor:pointer;transform:translateZ(28px)}
    .dsc-cta:active{transform:translateZ(28px) scale(.97)}
    .dsc-zero .dsc-cta{color:#0b3b30}
    .dsc-foot{margin-top:9px;font-size:9.5px;opacity:.75;transform:translateZ(12px)}
    @keyframes dscFloat{0%,100%{transform:translateZ(0) rotateX(0)}50%{transform:translateZ(8px) rotateX(1.2deg)}}
    @keyframes dscShine{0%,55%{left:-70%}85%,100%{left:130%}}
    @keyframes dscFlame{0%,100%{transform:translateZ(46px) scale(1) rotate(-2deg)}50%{transform:translateZ(52px) scale(1.09) rotate(3deg)}}
    @keyframes dscPulse{0%,100%{box-shadow:0 0 0 0 rgba(255,215,106,.55)}50%{box-shadow:0 0 0 6px rgba(255,215,106,0)}}
    @media (prefers-reduced-motion:reduce){.dsc-card,.dsc-shine,.dsc-flame,.dsc-dot.today{animation:none}}`;
    document.head.appendChild(st);
    if (!window.__dscTiltBound) {
      window.__dscTiltBound = true;
      document.addEventListener('pointermove', (event) => {
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        const wrap = event.target && event.target.closest ? event.target.closest('.dsc-wrap') : null;
        document.querySelectorAll('.dsc-wrap').forEach((node) => { if (node !== wrap) node.querySelector('.dsc-tilt').style.transform = ''; });
        if (!wrap) return;
        const rect = wrap.getBoundingClientRect();
        const px = (event.clientX - rect.left) / rect.width - 0.5;
        const py = (event.clientY - rect.top) / rect.height - 0.5;
        const tilt = wrap.querySelector('.dsc-tilt');
        if (tilt) tilt.style.transform = `rotateY(${(px * 12).toFixed(2)}deg) rotateX(${(-py * 9).toFixed(2)}deg)`;
      });
      document.addEventListener('pointerleave', () => { document.querySelectorAll('.dsc-tilt').forEach((node) => node.style.transform = ''); }, true);
    }
  }

  function streakStats() {
    const days = new Set(((typeof CACHE !== 'undefined' && CACHE.activityLogs) || []).map((a) => a.day));
    for (const r of ((typeof CACHE !== 'undefined' && CACHE.examResults) || [])) { try { days.add(dayKey(new Date(r.date))); } catch (_) {} }
    const now = new Date();
    const doneToday = days.has(dayKey(now));
    const countBack = (start) => { let n = 0; const d = new Date(start); while (days.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); } return n; };
    const streak = doneToday ? countBack(now) : countBack(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
    const week = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      week.push({ label: new Intl.DateTimeFormat('bn', { weekday: 'short' }).format(d), hit: days.has(dayKey(d)), today: i === 0 });
    }
    return { streak, doneToday, week };
  }

  function html() {
    try {
      ensureStyle();
      const { streak, doneToday, week } = streakStats();
      const days = toBn(streak);
      const dots = week.map((d) => `<div class="dsc-day"><div class="dsc-dot ${d.hit ? 'hit' : ''} ${d.today ? 'today' : ''} ${!d.hit && !d.today ? 'miss' : ''}">${d.hit ? '✓' : d.today ? '•' : ''}</div><span>${d.label}</span></div>`).join('');
      const state = doneToday ? 'done' : (streak > 0 ? 'risk' : 'zero');
      const head = state === 'done'
        ? { big: `${days} দিন`, sub: 'আজকের লক্ষ্য পূরণ — অসাধারণ! কালও থামো না 😎' }
        : state === 'risk'
          ? { big: `${days} দিন`, sub: 'শেষ সুযোগ! আজ পরীক্ষা দাও, streak বাঁচাও!' }
          : { big: '০ দিন', sub: 'আজকের প্রথম পরীক্ষা দিয়ে streak শুরু করো!' };
      const cta = doneToday ? '' : `<button class="dsc-cta" type="button" onclick="navigate('exam')">${state === 'risk' ? '⚡ এখনই পরীক্ষা দাও' : '🚀 আজকের পরীক্ষা দাও'}</button>`;
      return `<div class="dsc-wrap" id="dailyStreakCard"><div class="dsc-tilt"><div class="dsc-card dsc-${state}"><div class="dsc-shine"></div><div class="dsc-flame">🔥</div><div class="dsc-big">${head.big}<small> 🔥</small></div><div class="dsc-sub">${head.sub}</div><div class="dsc-week">${dots}</div>${cta}<div class="dsc-foot">তোমার আসল পরীক্ষার হিসাব থেকে — প্রতিদিন অন্তত ১টি পরীক্ষা = streak</div></div></div></div>`;
    } catch (_) { return ''; }
  }

  window.DailyStreakCard = { html };

  /* Auto-injector: phase3-সহ যে কোনো dashboard renderer-এর পরেও কার্ড উপরে থাকবে। */
  let rafPending = false;
  function scheduleEnsure() { if (rafPending) return; rafPending = true; requestAnimationFrame(() => { rafPending = false; try { ensureInjected(); } catch (_) {} }); }
  function isDashboardRoute() {
    try { if (window.Router && typeof window.Router.path === 'string') return window.Router.path === '' || window.Router.path === 'dashboard'; } catch (_) {}
    const h = String(location.hash || '').replace(/^#\/?/, '').split('?')[0];
    return h === '' || h === 'dashboard';
  }
  function ensureInjected() {
    if (!isDashboardRoute()) {
      const stray = document.getElementById('dailyStreakCard');
      if (stray && !stray.closest('.fade-in')) stray.remove();
      return;
    }
    const p3 = document.querySelector('#app [data-p3-command]');
    if (!p3) return; /* phase3 নেই → মূল টেমপ্লেটের কার্ডই দৃশ্যমান */
    const greet = document.getElementById('ahGreet3d');
    const anchor = (greet && greet.parentElement === p3) ? greet : p3;
    const pos = anchor === p3 ? 'afterbegin' : 'afterend';
    const existing = document.getElementById('dailyStreakCard');
    if (existing && existing.parentElement === p3 && existing.previousElementSibling === (anchor === p3 ? null : anchor)) return;
    if (existing) existing.remove();
    anchor.insertAdjacentHTML(pos, html());
  }
  function startObserver() {
    if (window.__dscObserver) return;
    const app = document.getElementById('app');
    if (!app) { setTimeout(startObserver, 500); return; }
    window.__dscObserver = new MutationObserver(scheduleEnsure);
    window.__dscObserver.observe(app, { childList: true, subtree: true });
    window.addEventListener('hashchange', scheduleEnsure);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) scheduleEnsure(); });
    scheduleEnsure();
  }
  setTimeout(startObserver, 1200);
})();
