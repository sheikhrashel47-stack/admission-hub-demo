// 🚨 v177 — CRITICAL: আগে-থেকে লগইন করা ইউজার new আপডেটের পর লগআউট হবে না
// আসল premium-auth.js jsdom-এ; localStorage-এ পুরনো সেশন (ahPubToken/ahPubUser) দিয়ে boot
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; console.log('  ✓', n); } else { fail++; console.log('  ✗', n); } };

const auth = readFileSync('/home/user/demo/premium-auth.js', 'utf8');

/* ── static: token path অপরিবর্তিত ── */
t('১. boot() token path intact (session restore branch আসল)', /if \(token\(\)\) \{[\s\S]{0,1200}\/auth\/me/.test(auth) || /const me = await api\('\/auth\/me'/.test(auth));
t('২. LS keys অপরিবর্তিত — ahPubToken + ahPubUser', auth.includes("const LS_TOKEN = 'ahPubToken'") && /LS_USER = 'ahPubUser'/.test(auth));
t('৩. সেশন restore-এ কখনো setSession(clear) নয় (me.ok হলে)', !/if \(me\.user\) setSession\(token\(\), me\.user\)[\s\S]{0,80}setSession\('', null\)/.test(auth));

/* ── runtime: পুরনো সেশন দিয়ে boot ── */
const dom = new JSDOM('<!DOCTYPE html><html><head></head><body><div id="ahAuthGate" style="display:none" aria-hidden="true"></div><div id="app"><main class="app-loading" id="ahSplash">x</main></div><div id="navRoot"></div></body></html>', { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.com/' });
const w = dom.window;
w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
w.toast = (m) => { w.__toasts = w.__toasts || []; w.__toasts.push(m); };
w.renderShell = (html2, _o) => { w.__lastShell = html2; };
w.navigate = (r) => { w.__navPath = r; };
// পুরনো session (আগের ভার্সনে লগইন করা user)
w.localStorage.setItem('ahPubToken', 'tok_old_1234567890');
w.localStorage.setItem('ahPubUser', JSON.stringify({ uid: 'u_rashel_01', name: 'রাশেল', email: 'rashel@example.com', providers: ['google'], onboardingCompleted: true }));
w.sessionStorage.setItem('ahPubToken', 'tok_old_1234567890');
w.sessionStorage.setItem('ahPubUser', JSON.stringify({ uid: 'u_rashel_01', name: 'রাশেল', email: 'rashel@example.com', providers: ['google'], onboardingCompleted: true }));

// live worker-এর মতো ভালো উত্তর
w.fetch = (url, opts = {}) => {
  const u = String(url || '');
  const method = String(opts.method || 'GET').toUpperCase();
  const json = (data, ok = true, status = 200) => Promise.resolve({ ok, status, json: async () => data, text: async () => JSON.stringify(data) });
  if (u.includes('/auth/config')) return json({ google: true, googleClientId: 'x.apps.googleusercontent.com', email: true, sms: false });
  if (u.includes('/auth/me')) return json({ user: { uid: 'u_rashel_01', name: 'রাশেল', email: 'rashel@example.com', providers: ['google'], status: 'active', onboardingCompleted: true } });
  if (u.includes('/state')) return method === 'GET' ? json({ v: 1, examResults: [], mistakes: [] }) : json({ saved: true, at: Date.now() });
  if (u.includes('/onboarding')) return json({ onboarding: { completed: true } });
  return json({ error: 'not-found' }, false, 404);
};
const load = (code) => { const s = w.document.createElement('script'); s.textContent = code; w.document.body.appendChild(s); };
load(auth);

const sleep = ms => new Promise(r => setTimeout(r, ms));
await sleep(1600);

const AHAuth = w.AHAuth || {};
t('৪. 🚨 সেশন restore: token intact', (w.localStorage.getItem('ahPubToken') || '') === 'tok_old_1234567890');
t('৫. 🚨 সেশন restore: user intact (রাশেল)', /রাশেল/.test(w.localStorage.getItem('ahPubUser') || ''));
t('৬. data-ah="in" — gate বন্ধ, অ্যাপ খোলা', w.document.documentElement.dataset.ah === 'in');
t('৭. __ahGuestMode = false (guest নয় — personalized app)', w.__ahGuestMode !== true);
t('৮. AHAuth.isAuthed() === true', typeof AHAuth.isAuthed === 'function' && AHAuth.isAuthed() === true);
t('৯. AHAuth.user().uid = u_rashel_01', typeof AHAuth.user === 'function' && (AHAuth.user() || {}).uid === 'u_rashel_01');
t('১০. gate element display:none (একদমই আটকে নেই)', (w.document.getElementById('ahAuthGate') || {}).style?.display !== 'block');
t('১১. কোনো force-redirect/logout নয় — user নিজের জায়গায় থাকে', w.__navPath === undefined || w.__navPath === 'dashboard' || w.__navPath === 'profile');
t('১২. কোনো logout toast নেই / token-এর content-এ কোনো শূন্য নেই', !(w.__toasts || []).some(m => /লগআউট|গেস্ট মোডে চালিয়ে/.test(String(m))));

console.log(fail === 0 ? '✅ SESSION-SURVIVE v177 TEST PASS (' + pass + ')' : '❌ FAIL ' + fail + ' / ' + pass);
process.exit(fail ? 1 : 0);
