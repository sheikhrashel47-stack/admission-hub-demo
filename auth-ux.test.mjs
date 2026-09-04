// v177 — GUEST-FIRST AUTH UX টেস্ট (static + jsdom runtime)
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; console.log('  ✓', n); } else { fail++; console.log('  ✗', n); } };

/* ─────────── অংশ ১: index.html static (guest-first) ─────────── */
const html = readFileSync('/home/user/demo/index.html', 'utf8');
const domStatic = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true });
const doc = domStatic.window.document;

const gate = doc.getElementById('ahAuthGate');
t('১. #ahAuthGate exists', !!gate);
t('২. gate static-first HIDDEN — প্রথম পেইন্টে কোনো login wall নেই', !!gate && /display:\s*none/i.test(gate.getAttribute('style') || '') && gate.getAttribute('aria-hidden') === 'true');
t('৩. ইন্ট্রো বাদ — প্রথম পেইন্টে সরল লোডার (.ah-boot), কোনো 3D scene নেই', !!doc.querySelector('#ahSplash .ah-boot') && !doc.querySelector('#ahSplash .ahfs-scene'));
t('৪. premium-auth.js/css v177 query-তে লোড হয়', /premium-auth\.js\?v=p3-auth-guest-v177/.test(html) && /premium-auth\.css\?v=p3-auth-guest-v177/.test(html));
t('৫. sw build v182-kvfix-20260904 (index + sw.js)',
  /v182-kvfix-20260904/.test(html) && /v182-kvfix-20260904/.test(readFileSync('/home/user/demo/sw.js', 'utf8')));
t('৬. app-এ প্রাথমিকভাবে কোনো mandatory gate মোড নেই (data-ah not preset)',
  !html.includes('data-ah="out"'));

/* ─────────── অংশ ২: premium-auth.js static invariants ─────────── */
const auth = readFileSync('/home/user/demo/premium-auth.js', 'utf8');
t('৭. 🚨 সেশন key অপরিবর্তিত (ahPubToken) — পুরনো সেশন কখনো হারাবে না', auth.includes("const LS_TOKEN = 'ahPubToken'"));
const tokenClears = (auth.match(/setSession\('', null\)/g) || []).length;
t('৮. setSession(clear) শুধু বৈধ স্থানে (logout/401/disabled)', tokenClears >= 2 && tokenClears <= 4);
t('৯. boot() no-token branch → enterGuest() (wall নয়)', /\} else \{\s*enterGuest\(\);/.test(auth));
t('১০. logout() → enterGuest() + gate নয়', /async function logout\(\) \{[\s\S]*?enterGuest\(\);[\s\S]*?\n  \}/.test(auth) && !/function logout[\s\S]{0,400}setGate\(true\); go\('welcome'\)/.test(auth));
t('১১. renderProfileRoute → guest-এ renderGuestProfile', /if \(!authed\(\)\) return renderGuestProfile\(p\);/.test(auth));
t('১২. prompt sheet: "Keep Your Preparation Safe" + Google/Email/Not now', auth.includes('Keep Your Preparation Safe') && auth.includes('data-ah-prompt-google') && auth.includes('data-ah-prompt-email') && auth.includes('data-ah-prompt-later'));
t('১৩. "Not now" → sessionStorage dismiss (একই action-এ আবার prompt নয়)', auth.includes("const GUEST_SKIP_PREFIX = 'ahGuestPromptSkip:'") && auth.includes('markPromptSkipped(action)'));
t('১৪. গেস্ট ব্যাজ: history/mistakes/result/dashboard render wrap', auth.includes("['renderHistory', 'renderMistakes', 'renderExamResult', 'renderDashboard']"));
t('১৫. গেস্ট প্রোফাইল CTA (স্পেক ১১: Google + Email + Not now)', auth.includes('renderGuestProfile') && auth.includes('Continue with Google') && auth.includes('Continue with Email'));
t('১৬. AHAuth API-তে prompt/isGuest/enterGuest আছে', /isGuest: \(\) => !authed\(\)/.test(auth) && auth.includes('prompt: openAuthPrompt') && auth.includes('enterGuest,'));
t('১৭. guest merge: pullState+pushState আগের মতোই (id-based, duplicate নয়)', auth.includes('applyPersonal') && auth.includes('pushState()'));

/* ─────────── অংশ ৩: jsdom runtime — আসল premium-auth.js চালিয়ে ─────────── */
const runs = [];
const dom = new JSDOM('<!DOCTYPE html><html><head></head><body><div id="ahAuthGate" style="display:none" aria-hidden="true"></div><div id="app"><main class="app-loading" id="ahSplash">x</main></div><div id="navRoot"></div></body></html>', { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.com/' });
const w = dom.window;
w.fetch = () => Promise.reject(new Error('offline'));
w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
w.toast = (m) => { w.__toasts = w.__toasts || []; w.__toasts.push(m); };
w.renderShell = (html2, _o) => { w.__lastShell = html2; };
w.navigate = (r) => { w.__navPath = r; };
const load = (code) => { const s = w.document.createElement('script'); s.textContent = code; w.document.body.appendChild(s); };
load(readFileSync('/home/user/demo/premium-auth.js', 'utf8'));

const sleep = ms => new Promise(r => setTimeout(r, ms));
await sleep(2000); // boot() + config retry fallback + restore attempt finish

const AHAuth = w.AHAuth || {};
t('১৮. 🚨 boot-এ gate বন্ধ (data-ah="in") — user প্রথম পেইন্টেই অ্যাপে', w.document.documentElement.dataset.ah === 'in');
t('১৯. gate element এখন display:none (গেট ওপেন নয়)', (w.document.getElementById('ahAuthGate') || {}).style?.display === 'none');
t('২০. __ahGuestMode true — গেস্ট মোডে অ্যাপ', w.__ahGuestMode === true);
t('২১. navigate(dashboard) কল হয়েছে — গেস্ট ড্যাশবোর্ড', w.__navPath === 'dashboard');
t('২২. AHAuth.isGuest() === true', typeof AHAuth.isGuest === 'function' && AHAuth.isGuest() === true);

// prompt sheet — খোলে
AHAuth.prompt('history');
const sh = w.document.getElementById('ahAuthPrompt');
t('২৩. prompt(' + "'history'" + ') → premium sheet খোলে', !!sh && !!sh.querySelector('.ah-prompt-sheet'));
t('২৪. sheet-এ title "Keep Your Preparation Safe"', !!sh && sh.textContent.includes('Keep Your Preparation Safe'));
t('২৫. sheet-এ ৩ বাটন: Google + Email + Not now', !!sh && !!sh.querySelector('[data-ah-prompt-google]') && !!sh.querySelector('[data-ah-prompt-email]') && !!sh.querySelector('[data-ah-prompt-later]'));
t('২৬. sheet-এ বাংলা সাবটেক্সট (গেস্ট ডেটা নিরাপদ)', !!sh && /তোমার পরীক্ষা|ডিভাইসে/.test(sh.textContent));

// Not now → dismiss + session-জুড়ে আর নয়
sh.querySelector('[data-ah-prompt-later]').onclick();
t('২৭. Not now → sheet বন্ধ', !w.document.getElementById('ahAuthPrompt'));
t('২৮. Not now → sessionStorage skip record', w.sessionStorage.getItem('ahGuestPromptSkip:history') === '1');
t('২৯. একই action-এ আবার prompt() → sheet খোলে না (আর বিরক্তিকর নয়)', (AHAuth.prompt('history'), !w.document.getElementById('ahAuthPrompt')));
t('৩০. অন্য action-এ prompt() → আবার খোলে (contextual)', (AHAuth.prompt('sync'), !!w.document.getElementById('ahAuthPrompt')));
w.document.getElementById('ahAuthPrompt').querySelector('[data-ah-prompt-close]').onclick();
t('৩১. backdrop × → sheet বন্ধ', !w.document.getElementById('ahAuthPrompt'));

// গেস্ট প্রোফাইল রেন্ডার
AHAuth.promptSkipped && (w.sessionStorage.removeItem('ahGuestPromptSkip:profile'));
AHAuth.renderProfileRoute();
t('৩২. guest profile route → গেস্ট প্রোফাইল (account CTA), login wall নয়', !!w.__lastShell && /গেস্ট শিক্ষার্থী/.test(w.__lastShell) && /Continue with Google/.test(w.__lastShell) && /Continue with Email/.test(w.__lastShell));
t('৩৩. guest profile-এ ৩টা বাটন CTA আছে', /Continue with Google/.test(w.__lastShell) && /Continue with Email/.test(w.__lastShell) && /data-ah-guest-profile-later/.test(w.__lastShell));

console.log(fail === 0 ? '✅ AUTH-UX v177 TEST PASS (' + pass + ')' : '❌ FAIL ' + fail + ' / ' + pass);
process.exit(fail ? 1 : 0);
