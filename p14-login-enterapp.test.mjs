// P14-রিগ্রেশন — লগইন-প্রবেশ দৃশ্যমানতা (মালিক: "Google-লগইন হচ্ছে কিন্তু অ্যাপে কিছু বদলায় না")
// কারণ-সেট: (১) প্রবেশ-পথের ত্রুটি নীরবে মরে (ahErr কেবল গেট-স্ক্রিনে, প্রম্পট-কনটেক্সটে অদৃশ্য);
// (২) enterApp নেটওয়ার্ক-সিঙ্ক (pullState/pushState) শেষ হওয়ার আগে UI-বদল হয় না;
// (৩) গুগল-পপআপ সাড়া না দিলে কোনো বার্তা নেই। ফিক্স: syncAuthUI (সিঙ্ক্রোনাস-প্রবেশ),
// showAuthErr (সব ত্রুটি টোস্টে), ৬০সে-ওয়াচডগ + __ahGoogleDone, success-টোস্ট, দৃশ্যমানতা-লক।
import { readFileSync } from 'fs';
import { JSDOM } from 'jsdom';
let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; console.log('  ✓', n); } else { fail++; console.log('  ✗', n); } };
const PA = readFileSync('premium-auth.js', 'utf8');

/* ── ১. স্ট্যাটিক-গার্ড ── */
t('১. syncAuthUI বিদ্যমান (গেট-বন্ধ+প্রম্পট-সরানো+ব্যাজ-থামানো+নেভিগেট)', PA.includes('const syncAuthUI =') && PA.includes("document.getElementById('ahAuthPrompt'); if (w) w.remove();") && PA.includes('stopGuestBadger'));
t('২. enterApp-এ syncAuthUI প্রথম (আগে কোনো await নয়) — UI-প্রবেশ নেটওয়ার্ক-নিরপেক্ষ', /function enterApp\(\) \{\s*syncAuthUI\(\);/.test(PA));
t('৩. showAuthErr: ahErr + টোস্ট দুটোই (নীরব-ত্রুটি নিষিদ্ধ)', PA.includes('const showAuthErr =') && PA.includes('try { showErr(\'ahErr\', msg); }') && PA.includes('try { toast(msg); }'));
t('৪. গুগল-ওয়াচডগ ৬০সে + __ahGoogleDone-চেক', PA.includes('armGoogleWatchdog') && PA.includes('}, 60000);') && PA.includes('if (window.__ahGoogleDone) return;'));
t('৫. Google-ক্যালব্যাক: clearGoogleWatchdog + দৃশ্যমান-ত্রুটি (cancelled-অথবা-API-ভুল)', /callback: async \(resp\) => \{\s*clearGoogleWatchdog\(\);/.test(PA) && PA.includes("'গুগল লগইন বাতিল হয়েছে — আবার চেষ্টা করো'"));
t('৬. afterAuth-এ enterApp-ব্যতিক্রম-গার্ড (syncAuthUI-জোর-প্রবেশ + টোস্ট)', /catch \(e\) \{\s*console\.warn\('\[auth\] enterApp/.test(PA) && PA.includes('syncAuthUI(); } catch (_) {}'));
t('৭. goGoogle-এ pendingRoute (লগইন-পর একই পৃষ্ঠায় ফেরা)', PA.includes('setPendingAuth(pendingRoute() || (window.Router && Router.path) || \'dashboard\'); /* লগইন-পর একই পৃষ্ঠায় ফেরা */'));
t('৮. সফল-প্রবেশে টোস্ট (✅ লগইন হয়েছে)', PA.includes("toast(lang === 'bn' ? '✅ লগইন হয়েছে'"));
t('৯. দুটি enterApp-দ্বৈত-বিলুপ্ত (একটিই)', (PA.match(/async function enterApp\(\)/g) || []).length === 1);
t('১০. boot-সফল-পথে ব্যাজ-থামানো (অটো-লগইনে গেস্ট-ব্যাজ আর নয়)', /setGate\(false\);[\s\S]{0,120}try \{ stopGuestBadger\(\); \} catch \(_\) \{\}[\s\S]{0,60}window\.__ahGuestMode = false;/.test(PA));

/* ── ২. রানটাইম (jsdom): প্রম্পট → Google → প্রবেশ — পুরো-পথ ── */
function launch(googleResp) {
  const dom = new JSDOM('<!DOCTYPE html><html><head></head><body><div id="ahAuthGate" style="display:none"></div><div id="app"><div class="app-loading">x</div></div><div id="navRoot"></div></body></html>', { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://admissionhub.pages.dev/' });
  const w = dom.window;
  w.__navCalls = []; w.__toasts = []; w.__gcalls = 0; w.__googleResp = googleResp;
  w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
  w.toast = (m) => { w.__toasts.push(String(m)); };
  w.Router = { path: 'dashboard' };
  w.navigate = (r) => { w.__navCalls.push(String(r)); w.Router.path = String(r); try { if (typeof w.render === 'function') w.render(); } catch (_) {} };
  w.renderShell = (html) => { w.__shell = html; };
  w.renderDashboard = function () { const app = w.document.getElementById('app'); if (app) app.innerHTML = '<div class="page dashboard-existing"><h1>DASH</h1></div>'; };
  w.render = function () { try { if ((w.Router && w.Router.path) === 'dashboard' && typeof w.renderDashboard === 'function') w.renderDashboard(); } catch (_) {} };
  let tokenClientCb = null;
  w.google = { accounts: { oauth2: { initTokenClient: (cfg) => { w.__gcfg = cfg; return { requestAccessToken: () => { w.__gcalls++; tokenClientCb = cfg.callback; } }; } } } };
  w.fetch = (url, opts = {}) => {
    const u = String(url || '');
    const method = String(opts.method || 'GET').toUpperCase();
    const json = (data, ok = true, status = 200) => Promise.resolve({ ok, status, json: async () => data, text: async () => JSON.stringify(data) });
    if (u.includes('/auth/config')) return json({ google: true, googleClientId: 'x.apps.googleusercontent.com', email: true, sms: false });
    if (u.includes('/auth/google')) return json({ token: 'T_GOOGLE_1', user: { uid: 'u_rashel_01', name: 'রাশেল', email: 'rashel@example.com', status: 'active', providers: ['google'], onboardingCompleted: true } });
    if (u.includes('/state')) return method === 'GET' ? json({ v: 1, examResults: [], mistakes: [], dailyStats: [] }) : json({ saved: true, at: Date.now() });
    if (u.includes('/auth/me')) return json({ user: { uid: 'u_rashel_01', name: 'রাশেল', status: 'active' } });
    if (u.includes('/onboarding')) return json({ onboarding: { completed: true } });
    return json({ error: 'nf' }, false, 404);
  };
  const load = (code) => { const s = w.document.createElement('script'); s.textContent = code; w.document.body.appendChild(s); };
  load(PA);
  return { w, fireToken: () => { if (tokenClientCb) tokenClientCb(w.__googleResp); } };
}

t('১১. রানটাইম: প্রম্পট → Google-সফল → টোকেন+গেট-বন্ধ+প্রম্পট-গায়েব+ড্যাশবোর্ড+✅টোস্ট', (async () => {
  const { w, fireToken } = launch({ access_token: 'FAKE_OK' });
  await new Promise(r => setTimeout(r, 1700)); /* গেস্ট-ব্যাজ (১২০০ms) → প্রম্পট */
  const gBadge = w.document.querySelector('[data-ah-guest-action]');
  if (!gBadge) return false;
  gBadge.click();
  await new Promise(r => setTimeout(r, 150));
  const pBtn = w.document.querySelector('[data-ah-prompt-google]');
  if (!pBtn) return false;
  pBtn.click();   /* প্রম্পট-বন্ধ → doGoogle → requestAccessToken */
  await new Promise(r => setTimeout(r, 250));
  fireToken();    /* Google-পপআপ সফল-প্রতিনিধিত্ব */
  await new Promise(r => setTimeout(r, 900));
  const ok =
    w.localStorage.getItem('ahPubToken') === 'T_GOOGLE_1' &&
    w.document.documentElement.dataset.ah === 'in' &&
    !w.document.getElementById('ahAuthPrompt') &&
    !w.document.body.classList.contains('ah-prompt-open') &&
    w.__ahGuestMode === false &&
    w.__navCalls.includes('dashboard') &&
    w.__toasts.some(m => /লগইন হয়েছে/.test(m)) &&
    w.__toasts.every(m => !/ব্যর্থ|সাড়া পাওয়া|সংযোগ পাওয়া/.test(m));
  return ok;
})());

t('১২. রানটাইম: Google বাতিল → দৃশ্যমান-টোস্ট (নীরব-মৃত্যু নয়)', (async () => {
  const { w, fireToken } = launch({ error: 'access_denied' });
  await new Promise(r => setTimeout(r, 1700));
  const gBadge = w.document.querySelector('[data-ah-guest-action]');
  if (!gBadge) return false;
  gBadge.click();
  await new Promise(r => setTimeout(r, 150));
  const pBtn = w.document.querySelector('[data-ah-prompt-google]');
  if (!pBtn) return false;
  pBtn.click();
  await new Promise(r => setTimeout(r, 250));
  fireToken();
  await new Promise(r => setTimeout(r, 400));
  return w.__toasts.some(m => /বাতিল/.test(m));
})());

console.log(`\nP14-LOGIN-ENTERAPP: ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
