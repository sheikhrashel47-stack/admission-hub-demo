// 🔒 AUTH-LOCK — লগইন-সিস্টেম আজীবন-ইনভ্যারিয়েন্ট (২০২৬-০৯-০৬, মালিক-নির্দেশে লক)
// ভাঙা-ইতিহাস (এই-সেশন): v188 Google-হেল্প-পাবলিক → v191 provider_google-ডেডএন্ড →
// v192 ক্যাশ-কী-পুরনো (p3-auth-v177) → v193 state-মার্জ → f35aa67 OTP-মার্জ।
// এই-সুটে প্রতিটি সমাধান আজীবন-লকড — ভবিষ্যৎ-পরিবর্তনে কিছু ভাঙলে টেস্ট ব্লক করবে।
import { readFileSync } from 'fs';
let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; console.log('  ✓', n); } else { fail++; console.log('  ✗', n); } };
const H = readFileSync('index.html', 'utf8');
const SW = readFileSync('sw.js', 'utf8');
const WB = readFileSync('worker-bundle.mjs', 'utf8');   // wrangler.toml main = ডিপ্লয়-এন্ট্রি
const PW = readFileSync('public-worker.js', 'utf8');    // demo সোর্স-কপি
const HUB = readFileSync('/home/user/hub/public-worker.js', 'utf8');
const PA = readFileSync('premium-auth.js', 'utf8');
const PH = readFileSync('performance-hardening.js', 'utf8');
const WFC = readFileSync('.github/workflows/cf-pages.yml', 'utf8');

/* ── A. Google-অরিজিন-গাইড: পাবলিক-নয়, owner-অনলি (v191) ── */
t('A1. public-UI-তে #ahGoogleHelp বাটন নেই', !/id="ahGoogleHelp" style=/.test(PA));
t('A2. showGoogleHelp শুধু __ahShowGoogleHelp (owner-কনসোল/ডক)-এ', PA.includes('window.__ahShowGoogleHelp = showGoogleHelp'));
t('A3. গাইড-উভয় ভাষা + origin-নির্দেশনা অক্ষত (docs-রেফারেন্স)', PA.includes('Authorized JavaScript origins') && PA.includes('admissionhub.pages.dev'));

/* ── B. register-email: পাসওয়ার্ড-নেই-অ্যাকাউন্টে ডেডএন্ড-নেই (f35aa67) ── */
const regOf = (s) => { const i = s.indexOf('authRegisterEmail'); const j = s.indexOf('const password', i); return j > i ? s.slice(i, j) : s.slice(i, i + 2500); };
for (const [name, file] of [['WB', WB], ['PW', PW], ['HUB', HUB]]) {
  const r = regOf(file);
  t(`B.${name}. register-email: hasPassOnly-৩-শাখা (password-আছে→409)`, r.includes('hasPassOnly') && r.includes('পাসওয়ার্ড দিয়ে লগইন করো'));
  t(`B.${name}. register-email: provider_google/provider_passkey-409 নেই (OTP-মার্জ)`, !r.includes('provider_google') && !r.includes('provider_passkey'));
}
t('B.WB. pending.providers-মার্জ (email+password+পুরনো)', /Array\.from\([^)]*new Set\(\[['"]email['"], ['"]password['"], \.\.\.(?:\(\(existing && existing\.providers\) \|\| \[\]|existing && existing\.providers \|\| \[\])\]\)\)/.test(WB));
t('B.PW/HUB. same-মার্জ', /Array\.from\(new Set\(\['email', ?'password', ?\.\.\.\(\(existing && existing\.providers\) \|\| \[\]\)\]\)\)/.test(PW) && /Array\.from\(new Set\(\['email', ?'password', ?\.\.\.\(\(existing && existing\.providers\) \|\| \[\]\)\]\)\)/.test(HUB));
t('B. issueOtp-পাঠানো অক্ষত (pending:true/sent:true)', /const sent = await issueOtp/.test(WB) && /pending: true, sent: true, channel: "otp"/.test(WB));
t('B. verify-পথ: rec.providers=pending.providers + status active', /providers: pending\.providers/.test(WB) && /status: "active"/.test(WB));

/* ── C. ক্লায়েন্ট-ফলব্যাক শাখা অক্ষত (ভবিষ্যৎ-নিরাপদ) ── */
t('C1. doSignup: provider_google/provider_passkey ফলব্যাক', PA.includes("code === 'provider_google'") && PA.includes("code === 'provider_passkey'"));
t('C2. api(): error-এ code-গঠন (data.code)', PA.includes('if (data.code) last.code = data.code;') && PA.includes('if (data2.code) last.code = data2.code;'));
t('C3. OTP-ফ্লো: go(\'otp\') + waitId-পোল অক্ষত', /go\('otp'\)/.test(PA) && PA.includes("api('/auth/wait'"));

/* ── D. ক্যাশ-কী-সামঞ্জস্য (v192-শিক্ষা): asset-query index↔sw-মিল ── */
const q = (s, re) => [...new Set((s.match(re) || []))].sort().join('|');
const authQ_H = q(H, /p3-auth-[a-z]*-v[0-9]+/g), authQ_SW = q(SW, /p3-auth-[a-z]*-v[0-9]+/g);
t('D1. p3-auth-* query: index.html ↔ sw.js APP_SHELL হুবহু-মিল', !!authQ_H && authQ_H === authQ_SW);
const phRe = /performance-hardening\.js\?v=[0-9]+/g;
t('D2. performance-hardening.js?v= — index ↔ sw মিল (নন-স্টেল)', q(H, phRe) === q(SW, phRe) && q(H, phRe).includes('performance-hardening.js?v=2'));
const vIdx = (H.match(/sw\.js\?v=v[0-9a-z-]+/) || [''])[0];
const vSw = (SW.match(/BUILD_ID = '([^']+)'/) || [,''])[1];
t('D3. sw.js BUILD_ID ↔ index sw-marker মিল', vIdx.includes(vSw) && /^v\d+-[a-z0-9]+-\d{8}$/.test(vSw));

/* ── E. সিক্রেট-নীতি: repo-তে কোনো টোকেন/API-কী হার্ডকোড নয় ── */
const secrets = (s) => /ghp_[A-Za-z0-9]{20,}|AIza[A-Za-z0-9_-]{30,}|sk-[A-Za-z0-9]{20,}/.test(s);
t('E1. প্রোডাকশন-ফাইলে GitHub-টোকেন/Google-API-কী নেই', !secrets(PA) && !secrets(WB) && !secrets(H) && !secrets(SW) && !secrets(PW));

/* ── F. পাইপলাইন: অটো-ডিপ্লয় + গার্ড (AUTH_ENDPOINTS_GUARD-ভিত্তি) ── */
t('F1. cf-pages.yml: push→auto-deploy pages.dev', WFC.includes('branches: [main]') && WFC.includes('pages deploy dist --project-name admissionhub'));
t('F2. worker-bundle.mjs = wrangler main (ডিপ্লয়-এন্ট্রি)', readFileSync('wrangler.toml', 'utf8').includes('main = "worker-bundle.mjs"'));

/* ── G. লাইভ-স্তর (লাইভ-verify রিপোর্টে, এখানে স্ট্যাটিক-প্রুফ; লাইভ-curl রিপোর্ট-এ) ── */
t('G1. premium-auth.js: Google-ক্লায়েন্ট fallback কনফিগার (গোপন-নয়, ওয়েব-ক্লায়েন্ট-ID)', PA.includes('673030739375-'));
console.log(`\nAUTH-LOCK: ${pass} pass / ${fail} fail`);
if (fail) process.exit(1);
