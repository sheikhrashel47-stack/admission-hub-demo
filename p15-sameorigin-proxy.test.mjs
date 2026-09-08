// P15-রিগ্রেশন — same-origin API প্রক্সি (মালিক: "Failed to fetch" + Google-লগইন-অসফল)
// কারণ: ফোন-নেটওয়ার্ক pages.dev-লোড করলেও *.workers.dev-এ পৌঁছায় না (আলাদা-হোস্ট) —
//   সব API-কল POST/GET নেটওয়ার্ক-লেভেলে ব্যর্থ → "Failed to fetch" (ক্যানোনিকাল ফলব্যাকও ব্যর্থ)।
// সমাধান: Pages Advanced-Mode `_worker.js` → same-origin /api/* → মূল worker; ক্লায়েন্ট base='/api'।
//   • কোনো CORS নেই  • workers.dev-রিচেবিলিটি দরকার নেই  • auth/sync-এ canonical ফলব্যাক অক্ষত।
import { readFileSync, existsSync } from 'fs';
let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; console.log('  ✓', n); } else { fail++; console.log('  ✗', n); } };
const W = (f) => readFileSync(f, 'utf8');
const PA = W('premium-auth.js');
const CCS = W('cloud-content-sync.js');
const OB = W('onboarding.js');
const H = W('index.html');
const SW = W('sw.js');

/* ── ১. _worker.js (Pages Advanced-Mode প্রক্সি) ── */
t('১. _worker.js exists + /api-প্রক্সি + ASSETS-ফলব্যাক', existsSync('_worker.js') && W('_worker.js').includes("url.pathname.startsWith('/api/')") && W('_worker.js').includes('env.ASSETS.fetch'));
t('২. প্রক্সি ORIGIN = মূল worker + টার্গেট-কম্পোজিশন (প্যাথ+কোয়েরি অক্ষত; P20: /api/voice → voice-worker)', W('_worker.js').includes("const ORIGIN = 'https://admission-gk.admissionhub.workers.dev'") && W('_worker.js').includes('new URL(base + url.pathname + url.search)') && W('_worker.js').includes("const base = url.pathname.startsWith('/api/voice') ? VOICE_ORIGIN : ORIGIN;"));
t('৩. _worker.js-এ কোনো সিক্রেট নেই (Bearer/টোকেন/কী-প্যাটার্ন)', !/Bearer |ghp_|api[_-]?key|sk-|secret/i.test(W('_worker.js')));
t('৪. প্রক্সি-অনুপস্থিত-কেসে 502 JSON (কখনো Hang নয়)', W('_worker.js').includes("status: 502"));

/* ── ২. অথ-ক্লায়েন্ট: same-origin-প্রথম + canonical-ফলব্যাক অক্ষত ── */
t('৫. premium-auth: PUB = /api (same-origin-প্রক্সি)', PA.includes("const PUB = '/api';"));
t('৬. premium-auth: canonical-ফলব্যাক প্রতিচিহ্ন অক্ষত (CANONICAL_WORKER + \'/api\' + PUB!==canonical শাখা)', PA.includes("const canonicalBase = CANONICAL_WORKER + '/api';") && PA.includes("if (PUB !== canonicalBase) res = await fetch(canonicalBase + path, opts);") && PA.includes("PUB !== canonicalBase && PUBLIC_AUTH.includes(path)"));
t('৭. premium-auth: WORKER-const + CANONICAL_WORKER আজীবন-লক অক্ষত (GUARD উপাদান)', PA.includes("const CANONICAL_WORKER = 'https://admission-gk.admissionhub.workers.dev';"));

/* ── ৩. ডেটা-সিঙ্ক/অনবোর্ডিং/AI-ক্লায়েন্টসমূহ same-origin ── */
t('৮. cloud-content-sync: apiFetch same-origin-প্রথম + CANON ফলব্যাক', CCS.includes("const WORKER = '';") && CCS.includes('const apiFetch =') && CCS.includes("const CANON = 'https://admission-gk.admissionhub.workers.dev';") && CCS.includes("apiFetch('/api/cloud/publish'"));
t('৯. onboarding: PUB=/api + PUB_CANON ফলব্যাক', OB.includes("const PUB = '/api';") && OB.includes("const PUB_CANON = 'https://admission-gk.admissionhub.workers.dev/api';") && OB.includes("fetch(PUB_CANON + path"));
t('১০. AI-ক্লায়েন্ট-ফাইল-নেই (মালিক-নির্দেশ ২০২৬-০৯-০৮ — সব AI বাদ)', !existsSync('ah-ai-client.js') && !existsSync('ai-explain-tool.js') && !existsSync('study-ai-tool.js') && !existsSync('gk-agent-tool.js'));
t('১১. index.html-এ AI-স্ক্রিপ্ট-ট্যাগ নেই', !H.includes('ah-ai-client') && !H.includes('ai-explain-tool') && !H.includes('study-ai-tool') && !H.includes('gk-agent-tool'));

/* ── ৪. ভার্সন-অখণ্ডতা v199 ── */
t('১৩. premium-auth.js ?v=p3-auth-guest-v201 (index + sw APP_SHELL)', H.includes('premium-auth.js?v=p3-auth-guest-v201') && SW.includes("'./premium-auth.js?v=p3-auth-guest-v201'"));
t('১৪. sw BUILD_ID v210-aiagent-20260908 (index-marker + sw.js + expectedSwVersion + cur)', SW.includes("const BUILD_ID = 'v210-aiagent-20260908'") && H.includes('sw.js?v=v210-aiagent-20260908') && H.includes("const expectedSwVersion = 'v210-aiagent-20260908'") && H.includes("const cur = 'admission-hub-shell-v210-aiagent-20260908'"));
t('১৫. _worker.js ডিপ্লয়-পথে বাদ-যাচ্ছে না (cf-pages.yml rsync-excludes-তে _worker.js নেই)', !/rsync[^\n]*--exclude='_worker\.js'/.test(W('.github/workflows/cf-pages.yml')));

console.log(`\nP15-SAMEORIGIN-PROXY: ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
