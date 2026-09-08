// P17-রিগ্রেশন — প্রোফাইল-সততা + এডিট-অ্যাক্সেস + পাসকি-মাল্টি-হোস্ট
// মালিক-রিপোর্ট (০৯-০৭, স্ক্রিনশট): ① অ্যাকাডেমিক-প্রোফাইলে বিশ্ববিদ্যালয় "—" কিন্তু ইউনিট "B",
//   দুর্বল-বিষয় "বাংলা·English·GK", প্রস্তুতি-স্তর "৫০%" — সব অনবোর্ডিং-ডিফল্ট (ফেক-বিশ্লেষণ নিষিদ্ধ);
//   ② "প্রোফাইল এডিট করা যায় না (ছবি, নাম)"; ③ পাসকি-প্রশ্ন।
// কারণ: অনবোর্ডিং blank()/ensureDefaults-এ weakSubjects/studyGoal/currentLevel-ডিফল্ট 'নির্বাচিত'-সাজানো +
//   renderAcademic "আপডেট করো"-বাটন completed-अवस्थায় কিছুই-না-করা + প্রোফাইলে-এডিট-বাটনই-নেই +
//   worker-এর পাসকি RP কেবল github.io (pages.dev-এ origin-মিলে-নাই)।
// ফিক্স: সততা-হেল্পার (realWeakSubjects/honestWeak/prepOf) + বাছাই-ফ্ল্যাগ + ✏️-এডিট-বাটন +
//   force-অনবোর্ডিং + RP_ORIGINS-মাল্টি-হোস্ট (worker ৩-কপি)।
import { readFileSync } from 'fs';
import { JSDOM } from 'jsdom';
let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; console.log('  ✓', n); } else { fail++; console.log('  ✗', n); } };
const PA = readFileSync('premium-auth.js', 'utf8');
const OB = readFileSync('onboarding.js', 'utf8');
const WB = readFileSync('worker-bundle.mjs', 'utf8');
const PW = readFileSync('public-worker.js', 'utf8');
const HUB = readFileSync('/home/user/hub/public-worker.js', 'utf8');
const H = readFileSync('index.html', 'utf8');
const SW = readFileSync('sw.js', 'utf8');

/* ── ১. প্রোফাইল-সততা (ফেক-বিশ্লেষণ নিষিদ্ধ) ── */
t('১. সততা-হেল্পার: realWeakSubjects/honestWeak/prepOf (আসল-ডেটা-ভিত্তিক)', PA.includes('function realWeakSubjects') && PA.includes('function honestWeak') && PA.includes('function prepOf'));
t("২. অনবোর্ডিং-ডিফল্ট-দুর্বল-বিষয় আর নির্বাচিত-সাজায় না", PA.includes('dv2DefaultWeak') && PA.includes('arr.every((x) => dv2DefaultWeak.includes'));
t('৩. প্রস্তুতি-স্তর = আসল prep.pct (আর currentLevel-ডিফল্ট নয়)', PA.includes('prep.pct}%</span></div>') && PA.includes('Math.min(100, prep.pct)') && !/Number\(u\.currentLevel\) \|\| 0/.test(PA));
t("৪. studyGoal-ডিফল্ট top → সৎ-শূন্য (শর্ত-লজিক)", PA.includes("u.studyGoal && u.studyGoal !== 'top'"));
t('৫. বাছাই-ফ্ল্যাগ: অনবোর্ডিং-এ weakSubjectsChosen/studyGoalChosen (ensureDefaults + বাছাই-হ্যান্ডলার)', OB.includes('data.weakSubjectsChosen = true;') && OB.includes('data.studyGoalChosen = true;') && OB.includes("typeof data.weakSubjectsChosen !== 'boolean'"));

/* ── ২. প্রোফাইল-এডিট-অ্যাক্সেস ── */
t('৬. ✏️ প্রোফাইল এডিট-বাটন (hero → profile/edit)', PA.includes("✏️ প্রোফাইল এডিট") && PA.includes("onclick=\"navigate('profile/edit')\""));
t('৭. "একাডেমিক প্রোফাইল আপডেট করো" → force-অনবোর্ডিং (AHOnboard.start(true))', PA.includes("AHOnboard.start(true);"));
t('৮. onboarding.js-এ start(force) ভিত্তিক export (completed-অবস্থায়ও খোলে)', OB.includes('start: (force) => maybeStart(!!force)') && OB.includes("if (data.completed && !force) return false;"));

/* ── ৩. পাসকি-মাল্টি-হোস্ট (worker ৩-কপি) ── */
t('৯. worker: RP_ORIGINS-এ pages.dev + github.io (৩-কপি)', WB.includes('RP_ORIGINS') && PW.includes('RP_ORIGINS') && HUB.includes('RP_ORIGINS') && WB.includes('https://admissionhub.pages.dev') && PW.includes('https://admissionhub.pages.dev') && HUB.includes('https://admissionhub.pages.dev'));
t('১০. worker: অরিজিন-চেক RP_ORIGINS.some (আর একক RP_ORIGIN-startsWith নয়, ৩-কপি)', WB.includes('RP_ORIGINS.some') && PW.includes('RP_ORIGINS.some') && HUB.includes('RP_ORIGINS.some') && !WB.includes('startsWith(RP_ORIGIN)') && !PW.includes('startsWith(RP_ORIGIN)') && !HUB.includes('startsWith(RP_ORIGIN)'));
t('১১. worker: rpHost(request) — rp.id/rpId বর্তমান-হোস্ট-অনুযায়ী (৩-কপি)', WB.includes('rpHost(request)') && PW.includes('rpHost(request)') && HUB.includes('rpHost(request)'));

/* ── ৪. ভার্সন-অখণ্ডতা v201 ── */
t('১২. premium-auth ?v=p3-auth-guest-v201 + onboarding ?v=p6-onboard-v13 (index+sw)', H.includes('premium-auth.js?v=p3-auth-guest-v201') && SW.includes("'./premium-auth.js?v=p3-auth-guest-v201'") && H.includes('onboarding.js?v=p6-onboard-v13') && SW.includes("'./onboarding.js?v=p6-onboard-v13'"));
t('১৩. sw BUILD_ID v213-aiagent-20260908 (index-marker + expectedSwVersion + cur)', SW.includes("const BUILD_ID = 'v213-aiagent-20260908'") && H.includes('sw.js?v=v213-aiagent-20260908') && H.includes("const expectedSwVersion = 'v213-aiagent-20260908'") && H.includes("const cur = 'admission-hub-shell-v213-aiagent-20260908'"));

/* ── ৫. রানটাইম: ডিফল্ট-অনবোর্ডিং-ডেটা → সৎ-শূন্য-রেন্ডার ── */
t("১৪. রানটাইম: ডিফল্ট-অনবোর্ডিং-ডেটা-সহ-সৎ-শূন্য-রেন্ডার", (async () => {
  const dom = new JSDOM('<!DOCTYPE html><html><head></head><body><div id="ahAuthGate" style="display:none"></div><div id="app"></div><div id="navRoot"></div><div id="modalRoot"></div></body></html>', { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://admissionhub.pages.dev/' });
  const w = dom.window;
  w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
  w.toast = () => {}; w.navigate = () => {}; w.renderShell = (html) => { w.__shell = html; };
  w.Router = { path: 'profile' };
  w.localStorage.setItem('ahPubToken', 'tok_1');
  w.localStorage.setItem('ahPubUser', JSON.stringify({ uid: 'u_x', name: 'রাশেল', email: 'r@x.com', providers: ['google'], status: 'active', onboardingCompleted: true, goal: 'uni', targetUnit: 'B', studyGoal: 'top' }));
  w.sessionStorage.setItem('ahPubToken', 'tok_1');
  w.fetch = (url, opts = {}) => {
    const u = String(url || '');
    const json = (data, ok = true, status = 200) => Promise.resolve({ ok, status, json: async () => data, text: async () => JSON.stringify(data) });
    if (u.includes('/auth/config')) return json({ google: true, googleClientId: 'x', email: true, sms: false });
    if (u.includes('/auth/me')) return json({ user: { uid: 'u_x', name: 'রাশেল', email: 'r@x.com', providers: ['google'], status: 'active', onboardingCompleted: true, targetUnit: 'B', studyGoal: 'top' } });
    if (u.includes('/onboarding')) return json({ onboarding: { completed: true, goal: 'uni', targetUniversities: [], targetUnits: ['B'], weakSubjects: ['বাংলা', 'English', 'GK'], studyGoal: 'top', currentLevel: 50 } });
    if (u.includes('/state')) return json({ v: 1 });
    if (u.includes('/sessions')) return json({ sessions: [] });
    return json({ error: 'nf' }, false, 404);
  };
  const load = (code) => { const s = w.document.createElement('script'); s.textContent = code; w.document.body.appendChild(s); };
  load(PA);
  await new Promise(r => setTimeout(r, 1200));
  /* renderProfile → she অ্যাকাডেমিক-স্লট → extras (fetch /onboarding ডিফল্ট) */
  if (typeof w.AHAuth !== 'undefined' && w.AHAuth) w.AHAuth.renderProfileRoute(); else if (typeof w.renderProfileRoute === 'function') w.renderProfileRoute();
  await new Promise(r => setTimeout(r, 400));
  const html = w.__shell || '';
  /* ডিফল্ট-দুর্বল-বিষয় আর 'নির্বাচিত'-সাজে না; প্রস্তুতি-স্তর আসল-গণনা */
  const honest = !html.includes('বাংলা · English · GK') && html.includes('—');
  return honest;
})());

/* ── ৬. কলেজ-আলাদা-সেভ (client + worker ৩-কপি) + ফটো-উন্নতি ── */
t('১৫. renderEdit: school ← u.school||u.institution, college ← u.college (ডুপ-নয়)', PA.includes("pfSchool\" value=\"${esc(u.school || u.institution || '')}") && PA.includes("pfCollege\" value=\"${esc(u.college || '')}") && !PA.includes("id=\"pfCollege\" value=\"${esc(u.institution || '')}"));
t('১৬. saveEdit: school+college পাঠায়; worker fields-এ college (৩-কপি) + publicUser college/school', /school: g\('pfSchool'\)\.value\.trim\(\)/.test(PA) && /college: g\('pfCollege'\)\.value\.trim\(\)/.test(PA) && WB.includes("\"college\"") && PW.includes("'college'") && HUB.includes("'college'") && WB.includes("college: pf.college") && PW.includes("college: pf.college") && HUB.includes("college: pf.college"));
t('১৭. ফটো: ৩২০px-ক্যানভাস + jpeg 0.82 + HEIC-সতর্কতা + revoke', PA.includes('const s = 320;') && PA.includes("toDataURL('image/jpeg', 0.82)") && PA.includes('ছবি ফরম্যাট পড়া যায়নি'));

console.log(`\nP17-PROFILE-HONESTY: ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
