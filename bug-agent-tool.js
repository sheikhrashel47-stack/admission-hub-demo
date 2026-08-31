/*
 * ADMISSION HUB · v112 · 🐞 বাগ-ফিক্স এজেন্ট (Settings)
 * ── অ্যাপে বাগ/সমস্যা হলে ১ ক্লিকে রেডি-মেড AI-প্রম্পট তৈরি হয় (এরর-লগ + প্রসঙ্গ + নির্দেশনা)।
 * ── ইউজার প্রম্পট কপি করে যেকোনো AI-এজেন্টকে (Arena চ্যাট, Gemini, ChatGPT) দেবে → ফিক্স পাবে।
 * ── Zero-access নীতি: এজেন্ট নিজে কোথাও কিছু অ্যাক্সেস করে না; প্রম্পট-কপি-পেস্ট ফ্লো।
 */
(function installBugAgent() {
  'use strict';
  if (window.BugAgent) return;
  const LS = 'bugAgentLog';
  const MAX = 25;

  // ── গ্লোবাল এরর-কালেক্টর (রিং-বাফার) ─────────────────────────────────────────
  let log = [];
  try { log = JSON.parse(localStorage.getItem(LS) || '[]'); } catch (_) { log = []; }
  const save = () => { try { localStorage.setItem(LS, JSON.stringify(log.slice(-MAX))); } catch (_) {} };
  const pushErr = (kind, message, extra) => {
    const last = log[log.length - 1];
    if (last && last.m === message && Date.now() - last.t < 4000) { last.n = (last.n || 1) + 1; save(); return; }
    log.push({ t: Date.now(), k: kind, m: String(message || '').slice(0, 300), r: String((window.Router && window.Router.path) || location.hash.replace(/^#\//, '') || 'dashboard').slice(0, 60), n: 1, x: extra ? String(extra).slice(0, 160) : '' });
    save();
  };
  window.addEventListener('error', e => pushErr('error', e.message, (e.filename || '').split('/').pop() + ':' + (e.lineno || '')));
  window.addEventListener('unhandledrejection', e => pushErr('promise', (e.reason && (e.reason.message || e.reason)) || 'unhandled rejection'));
  const origErr = console.error.bind(console);
  console.error = (...a) => { try { pushErr('console', a.map(x => (typeof x === 'object' ? (() => { try { return JSON.stringify(x).slice(0, 160); } catch (_) { return '[obj]'; } })() : String(x))).join(' ')); } catch (_) {} origErr(...a); };

  // ── প্রম্পট-বিল্ডার ───────────────────────────────────────────────────────────
  const buildPrompt = userNote => {
    const c = (typeof CACHE !== 'undefined' && CACHE) || window.CACHE || {};
    const build = 'v112-gk-agent-20260830';
    const errs = (log.slice(-12) || []).map((e, i) => `${i + 1}. [${e.k}] ${e.m}${e.x ? ` (${e.x})` : ''} — রুট: ${e.r}${e.n > 1 ? ` ×${e.n}` : ''} — সময়: ${new Date(e.t).toLocaleString('en-GB')}`).join('\n') || '(কোনো ধরা-পড়া এরর নেই)';
    const note = String(userNote || '').trim().slice(0, 800);
    return `# Admission Hub — বাগ-ফিক্স রিপোর্ট (অ্যাপ নিজে তৈরি করেছে)

## কাজ
তুমি একজন senior web-app debugging agent। নিচের তথ্য দেখে **সমস্যার কারণ** বের করো এবং **নির্দিষ্ট ফিক্স** দাও।
নিয়ম: ① শুধু ভাঙা অংশের ন্যূনতম ফিক্স — অসম্পর্কিত কোড/ফাইল ধরবে না ② পুরো ফাইল নয়, শুধু বদলানো ফাংশন/ব্লক সম্পূর্ণ আকারে দাও, কোন ফাইলে বসাতে হবে তা স্পষ্ট করে ③ ব্যবহারকারীর ডেটা (IndexedDB/localStorage স্কিমা) অক্ষত রাখবে ④ ফিক্সের শেষে ২-৩ লাইনে কারণ ব্যাখ্যা করবে (সহজ বাংলায়) ⑤ কোনো secret/key চাইলে নয় — এমন সব কিছু worker env-এ থাকে।

## অ্যাপ-প্রসঙ্গ
- অ্যাপ: Admission Hub (GitHub Pages SPA: index.html + মডিউল JS, IndexedDB v10, sw v112)
- রুট: hash-based; প্রধান ফাইল: index.html (একটাই বড় ফাইল), gk-agent-tool.js, study-ai-tool.js, dashboard-greeting-3d.js, daily-streak-card.js, notification-hub.js, sw.js
- ডেটা: IndexedDB 'admissionHubPublicDB' (stores: questions, subjects, topics, exams, examResults, mistakes, vocabulary, notes, voiceCache, notifications, gkBank…); সেটিংস localStorage
${c.questions ? `- বর্তমান ডেটা: ${c.questions.length} প্রশ্ন, ${(c.examResults || []).length} পরীক্ষা, ${(c.vocabulary || []).length} ভোকাবুলারি` : ''}

## এনভায়রনমেন্ট
- Build: ${build} · UA: ${navigator.userAgent.slice(0, 120)}
- স্ক্রিন: ${screen.width}x${screen.height} · ভাষা: ${navigator.language} · অনলাইন: ${navigator.onLine}

## ধরা-পড়া এরর-লগ (সাম্প্রতিক আগে-পরে)
${errs}

## ব্যবহারকারীর বর্ণনা
${note || '(ব্যবহারকারী অতিরিক্ত কিছু লেখেনি — এরর-লগ থেকে সমস্যা অনুমান করো)।'}

এখন ফিক্স দাও: কারণ → ফাইল/ফাংশন → সম্পূর্ণ বদলানো কোড → যাচাই-পদ্ধতি।`;
  };

  // ── সেটিংস-কার্ড + মোডাল ─────────────────────────────────────────────────────
  const logCount = () => log.length;
  const clearLog = () => { log = []; save(); };
  const openModal = () => {
    const html = `<div style="padding:6px"><div class="explorer-title" style="font-size:18px">🐞 বাগ-ফিক্স এজেন্ট</div><div class="muted" style="font-size:12.5px;margin-top:4px">অ্যাপ নিজেই এরর-লগ + প্রসঙ্গ জড়ো করে <b>রেডি-মেড প্রম্পট</b> বানিয়ে দেবে — কপি করে যেকোনো AI-এজেন্টকে দাও (Arena চ্যাট, Gemini, ChatGPT), ও ফিক্স করে দেবে।</div>
      <label class="flabel" style="margin-top:10px">সমস্যাটা নিজের ভাষায় লেখো (ঐচ্ছিক)</label>
      <textarea id="bugAgentNote" rows="2" placeholder="যেমন: পরীক্ষা জমা দিলে ফলাফল সাদা হয়ে যায়" style="width:100%"></textarea>
      <div class="row" style="gap:8px;margin-top:10px"><button class="btn" onclick="BugAgent.generate()">🧾 প্রম্পট বানাও</button><button class="btn ghost sm" onclick="BugAgent.clearLog();BugAgent.openModal()">লগ মুছি (${logCount()})</button></div>
      <div id="bugAgentOut" style="margin-top:10px"></div></div>`;
    if (typeof window.openModal === 'function') window.openModal(html); else { const el = document.createElement('div'); el.innerHTML = html; document.getElementById('app').prepend(el); }
  };
  const generate = () => {
    const note = (document.getElementById('bugAgentNote') || {}).value || '';
    const prompt = buildPrompt(note);
    const out = document.getElementById('bugAgentOut');
    if (out) out.innerHTML = `<textarea id="bugAgentPrompt" rows="10" style="width:100%;font-size:11.5px;font-family:monospace">${prompt.replace(/</g, '&lt;')}</textarea><div class="row" style="gap:8px;margin-top:8px"><button class="btn" onclick="BugAgent.copy()">📋 কপি করো</button><span class="muted" style="font-size:11px">এরপর AI-এজেন্টকে পেস্ট করে দাও</span></div>`;
  };
  const copy = async () => {
    const ta = document.getElementById('bugAgentPrompt');
    if (!ta) return;
    ta.select();
    try { await navigator.clipboard.writeText(ta.value); toast?.('প্রম্পট কপি হয়েছে ✓'); } catch (_) { try { document.execCommand('copy'); toast?.('প্রম্পট কপি হয়েছে ✓'); } catch (_) { toast?.('ম্যানুয়ালি সিলেক্ট করে কপি করো'); } }
  };
  const settingsCard = () => `<div class="h2" style="margin-top:18px">🐞 বাগ-ফিক্স এজেন্ট</div><div class="card"><div class="muted" style="font-size:12.5px">অ্যাপে বাগ বা সমস্যা হলে ১ ক্লিকে AI-এজেন্টের জন্য রেডি প্রম্পট${logCount() ? ` — এখন <b>${logCount()}টি এরর</b> ধরা পড়েছে` : ''}।</div><button class="btn secondary" style="margin-top:10px" onclick="BugAgent.openModal()">🐞 বাগ-প্রম্পট বানাও</button></div>`;

  window.BugAgent = { openModal, generate, copy, buildPrompt, settingsCard, clearLog, _pushErr: pushErr, _log: () => log };
})();
