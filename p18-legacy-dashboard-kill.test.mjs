// P18+P19-রিগ্রেশন — পুরোনো ড্যাশবোর্ড চিরকাল-বন্ধ (মালিক 😡: "এখনো তো পুরোনো টা থেকে গেছে!")
// P18: phase3-intelligence.js-এর injectDashboard-হুক মৃত-করা (v202) — কিন্তু ফাইলটাই লোড হচ্ছিল।
// P19 (v203): phase3-intelligence.js-কে রিপো-থেকেই মুছে-ফেলা (পুরনো-ইনডেক্স-থাকলেও
//   ফাইল-নেই → SPA-ফলব্যাক-HTML → MIME-মিসম্যাচ → কখনো-এক্সিকিউট-হয়-না) + _headers-ক্যাশ-লক।
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { JSDOM } from 'jsdom';
let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; console.log('  ✓', n); } else { fail++; console.log('  ✗', n); } };
const H = readFileSync('index.html', 'utf8');
const SW = readFileSync('sw.js', 'utf8');
const PA = readFileSync('premium-auth.js', 'utf8');
const DV2 = readFileSync('dashboard-v2.js', 'utf8');
const HEADERS = existsSync('_headers') ? readFileSync('_headers', 'utf8') : '';

/* ── ১. পুরোনো-ড্যাশবোর্ড-কোড-শরীর-বিলুপ্ত ── */
t('১. phase3-intelligence.js চিরকাল-বিলুপ্ত: ফাইল-নেই + index/sw-এ শূন্য', !existsSync('phase3-intelligence.js') && !H.includes('phase3-intelligence') && !SW.includes('phase3-intelligence'));
t('২. daily-streak-card / dashboard-greeting-3d-ও-বিলুপ্ত (P18-অটুট)', !existsSync('daily-streak-card.js') && !existsSync('dashboard-greeting-3d.js') && !H.includes('daily-streak-card') && !SW.includes('daily-streak-card') && !H.includes('dashboard-greeting-3d') && !SW.includes('dashboard-greeting-3d'));
t('৩. রিপো-জুড়ে পুরোনো-ড্যাশবোর্ড-মার্কার-শূন্য (TODAY COMMAND CENTER / Your Command Center / Swipe to explore)', (() => {
  const files = [];
  const walk = (d) => { for (const e of readdirSync(d)) { const p = join(d, e); const s = statSync(p); if (s.isDirectory()) { if (!['node_modules', '.git', 'docs', 'AGENT_RESUME', 'uploads', 'admin'].includes(e)) walk(p); } else if (e.endsWith('.js') || e.endsWith('.html')) files.push(p); } };
  walk('.');
  const bad = files.filter((f) => { const c = readFileSync(f, 'utf8'); return /TODAY COMMAND CENTER|Your Command Center|Swipe to explore/.test(c); });
  return bad.length === 0;
})());
t('৪. _headers-ক্যাশ-লক: sw.js/index.html no-cache (পরবর্তী-স্টিক-নিষেধ)', HEADERS.includes('/sw.js') && HEADERS.includes('Cache-Control: no-cache') && HEADERS.includes('/index.html'));

/* ── ২. ভার্সন-অখণ্ডতা v203 ── */
t('৫. sw BUILD_ID/expectedSwVersion/cur = v205-gfix-20260908 + dv2 dash2f5 অটুট', SW.includes("const BUILD_ID = 'v205-gfix-20260908'") && H.includes('sw.js?v=v205-gfix-20260908') && H.includes("const expectedSwVersion = 'v205-gfix-20260908'") && H.includes("const cur = 'admission-hub-shell-v205-gfix-20260908'") && H.includes('dashboard-v2.js?v=dash2f5'));

/* ── ৩. রানটাইম: এখন-থেকে-শুধু dv2 — পুরনো-মার্কার-অসম্ভব ── */
t('৬. রানটাইম: PA+DV2+আজ-লোড-থাকা-ইনজেক্টর-সহ dashboard-রুটে পুরনো-মার্কার-শূন্য, শুধু dv2-root', (async () => {
  const dom = new JSDOM('<!DOCTYPE html><html><head></head><body><div id="ahAuthGate" style="display:none"></div><div id="app"></div><div id="navRoot"></div><div id="modalRoot"></div></body></html>', { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://admissionhub.pages.dev/' });
  const w = dom.window;
  w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
  w.toast = () => {}; w.navigate = () => {}; w.renderShell = (html) => { w.__shell = html; };
  w.Router = { path: '' };
  w.CACHE = { examResults: [], mistakes: [], settings: { dailyTarget: 100 }, dailyStats: [], questions: [], activityLogs: [] };
  w.localStorage.setItem('ahPubToken', 'tok_1');
  w.sessionStorage.setItem('ahPubToken', 'tok_1');
  w.fetch = (url, opts = {}) => {
    const u = String(url || '');
    const json = (data, ok = true, status = 200) => Promise.resolve({ ok, status, json: async () => data, text: async () => JSON.stringify(data) });
    if (u.includes('/auth/config')) return json({ google: true, googleClientId: 'x' });
    if (u.includes('/auth/me')) return json({ user: { uid: 'u_x', name: 'রাশেল', email: 'r@x.com' } });
    if (u.includes('/onboarding')) return json({ onboarding: { completed: false, step: 0 } });
    if (u.includes('/state')) return json({ v: 1 });
    if (u.includes('/sessions')) return json({ sessions: [] });
    return json({ error: 'nf' }, false, 404);
  };
  const load = (code) => { const s = w.document.createElement('script'); s.textContent = code; w.document.body.appendChild(s); };
  load(PA); load(DV2);
  /* আজ-লোড-থাকা-দুই-ইনজেক্টর-ও-প্রয়োগ (যদি-ত্রুটি-ও-দেয়, wrap-করা) */
  try { load(readFileSync('today-command-center-live.js', 'utf8')); } catch (_) {}
  try { load(readFileSync('notes-tool.js', 'utf8')); } catch (_) {}
  await new Promise(r => setTimeout(r, 2200));
  try { if (typeof w.renderDashboard === 'function') w.renderDashboard(); } catch (_) {}
  await new Promise(r => setTimeout(r, 900));
  const html = (w.__shell || '') + (w.document.body.innerHTML || '');
  const noOld = !/TODAY COMMAND CENTER|Your Command Center|Swipe to explore|data-p3-command|dailyStreakCard|ahGreet3d/.test(html);
  const dv2 = !!w.document.querySelector('#app .dv2-root') || html.includes('dv2-root');
  return noOld && dv2;
})());

/* ── ৪. পূর্ণ-ইনলাইন-বান্ডেল: পুরোনো-ড্যাশবোর্ড-বডি-চিরদিন-মৃত ── */
t('৭. ইনলাইন renderDashboard-ডেলিগেশন: সম্পূর্ণ index.html (inline-ইঞ্জিন)-এও পুরোনো-মার্কার-শূন্য', (async () => {
  const html = readFileSync('index.html', 'utf8');
  const dom = new JSDOM(html.replace(/<script[^>]*src=[^>]*><\/script>/g, ''), { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://admissionhub.pages.dev/' });
  const w = dom.window;
  w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
  w.toast = () => {}; w.navigate = () => {};
  w.CACHE = { examResults: [], mistakes: [], settings: { dailyTarget: 100, dashboardCards: {} }, dailyStats: [], subjects: [], questions: [] };
  try { localStorage.setItem('ahPubToken', 'tok_1'); sessionStorage.setItem('ahPubToken', 'tok_1'); } catch (_) {}
  w.fetch = () => Promise.resolve({ ok: false, status: 404, json: async () => ({ error: 'x' }), text: async () => 'x' });
  await new Promise(r => setTimeout(r, 1500));
  let rendered = '';
  try { if (typeof w.renderDashboard === 'function') { const out = w.renderDashboard(); rendered = String(out || ''); } } catch (_) {}
  try { if (typeof w.render === 'function') w.render(); } catch (_) {}
  try { if (typeof w.navigate === 'function') w.navigate('dashboard'); } catch (_) {}
  await new Promise(r => setTimeout(r, 600));
  const body = rendered + (w.document.body ? w.document.body.innerHTML : '');
  return !/TODAY COMMAND CENTER|Your command center|Swipe to explore|EMERALD ACADEMIC|dailyStreakCard|data-p3-command/.test(body);
})());

console.log(`\nP18+P19 LEGACY-DASH-KILL: ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
