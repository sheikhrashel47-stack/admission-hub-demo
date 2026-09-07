// P18-রিগ্রেশন — পুরোনো ড্যাশবোর্ড চিরকাল-বন্ধ (মালিক 😡: "ঐ পুরোনো dashboard এখনো লোড করতেছে এবং render করতেছে — আজীবনের জন্য বন্ধ করো")
// কারণ: phase3-intelligence.js-এর injectDashboard()-হুক প্রতিটি dashboard-রেন্ডারের পরে পুরনো p3-ড্যাশ
//   ঢুকিয়ে নতুন dashboard-কে display:none করত (মালিক যেটা দেখছিল); daily-streak-card + dashboard-greeting-3d
//   সেই পুরনো-ড্যাশের উপরে streak/গ্রিটিং জুড়ত। P16 শুধু renderV2-এর previous() চেইন কেটেছিল — phase3-হুক অটুট।
// ফিক্স: injectDashboard → স্থায়ী no-op; hookRender-এর dashboard-শাখা কাটা; দুটি পার্শ্ব-ফাইল index/sw থেকে
//   চিরকাল-সরানো + ভেতরে থাকা-অবস্থায়ও মৃত-গার্ড; v202।
import { readFileSync, existsSync } from 'fs';
import { JSDOM } from 'jsdom';
let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; console.log('  ✓', n); } else { fail++; console.log('  ✗', n); } };
const H = readFileSync('index.html', 'utf8');
const SW = readFileSync('sw.js', 'utf8');
const P3 = readFileSync('phase3-intelligence.js', 'utf8');
const PA = readFileSync('premium-auth.js', 'utf8');
const DV2 = readFileSync('dashboard-v2.js', 'utf8');

/* ── ১. পুরোনো-ড্যাশবোর্ড-হুক মৃত ── */
t('১. phase3 injectDashboard → স্থায়ী no-op (P18-গার্ড)', P3.includes('function injectDashboard(){') && P3.includes('return; /* P18-LEGACY-DASH-KILL'));
t('২. hookRender-এ dashboard-শাখা-কাটা (injectDashboard-কল-আর-নেই)', P3.includes("if(p==='dashboard')setTimeout(injectDashboard,0)") === false && P3.includes("P18: dashboard-শাখা-কাটা"));
t('৩. phase3-স্টিল-loaded (analytics/notifications/routine90-ইঞ্জিন অটুট) কিন্তু ড্যাশ-নয়', H.includes('phase3-intelligence.js?v=command-tools-v16-dv2-only') && SW.includes('./phase3-intelligence.js?v=command-tools-v16-dv2-only'));
t('৪. daily-streak-card চিরকাল-বিলুপ্ত: index+sw-শূন্য + ফাইল-নেই (404-লোড-অসম্ভব)', !H.includes('daily-streak-card') && !SW.includes('daily-streak-card') && !existsSync('daily-streak-card.js'));
t('৫. dashboard-greeting-3d চিরকাল-বিলুপ্ত: index+sw-শূন্য + ফাইল-নেই (404)', !H.includes('dashboard-greeting-3d') && !SW.includes('dashboard-greeting-3d') && !existsSync('dashboard-greeting-3d.js'));

/* ── ২. ভার্সন-অখণ্ডতা v202 ── */
t('৬. sw BUILD_ID/expectedSwVersion/cur = v202-gfix-20260907', SW.includes("const BUILD_ID = 'v202-gfix-20260907'") && H.includes('sw.js?v=v202-gfix-20260907') && H.includes("const expectedSwVersion = 'v202-gfix-20260907'") && H.includes("const cur = 'admission-hub-shell-v202-gfix-20260907'"));
t('৭. dv2-অক্ষত: dashboard-v2.js?v=dash2f3 (index+sw)', H.includes('dashboard-v2.js?v=dash2f3') && SW.includes('./dashboard-v2.js?v=dash2f3'));

/* ── ৩. রানটাইম: পুরনো-স্ট্যাক-লোড-করলেও পুরনো-ড্যাশ কখনো রেন্ডার হয় না ── */
t('৮. রানটাইম: phase3-loaded অবস্থায় dashboard-রুটে p3-ড্যাশ/streak/greeting-শূন্য, শুধু dv2', (async () => {
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
  load(PA); load(DV2); load(P3); load(DSC); load(GREET); /* পুরনো-স্ট্যাক-সহ-পূর্ণ-লোড */
  await new Promise(r => setTimeout(r, 2500)); /* inject-টাইমার (0/100/500/1200ms + observers + ১২০০ms) পেরোনো */
  /* dashboard-রুট সিমুলেট: renderDashboard (dv2) → পুরনো হুক-রান */
  try { if (typeof w.renderDashboard === 'function') w.renderDashboard(); } catch (_) {}
  await new Promise(r => setTimeout(r, 800));
  const doc = w.document;
  const p3 = doc.querySelector('[data-p3-command]');
  const dsc = doc.querySelector('#dailyStreakCard, .dsc-card');
  const greet = doc.querySelector('#ahGreet3d, .p3-header-v3');
  const dv2root = doc.querySelector('#app .dv2-root');
  return !p3 && !dsc && !greet && !!dv2root;
})());

console.log(`\nP18-LEGACY-DASH-KILL: ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
