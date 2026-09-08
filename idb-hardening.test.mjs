// D-V186 — IDB-ক্র্যাশ + লোডিং-হার্ডেনিং কোর-টেস্ট
import { readFileSync, existsSync } from 'fs';
let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; console.log('  ✓', n); } else { fail++; console.log('  ✗', n); } };
const H = readFileSync('index.html', 'utf8');
const SW = readFileSync('sw.js', 'utf8');
const CCS = readFileSync('cloud-content-sync.js', 'utf8');
const DP = readFileSync('data-protection.js', 'utf8');

/* ১ — ক্র্যাশ (connection-is-closing) ফিক্স */
t('reopenDb ফাংশন + window.__ahReopenDb এক্সপোজ', H.includes('function reopenDb()') && H.includes('window.__ahReopenDb = reopenDb'));
const vchIdx = H.split('\n').findIndex(l => l.includes('DB.onversionchange='));
const vchBlock = H.split('\n').slice(vchIdx, vchIdx + 3).join(' ');
t('onversionchange: showStorageRecovery নেই (ব্লক-স্ক্রিন বাদ)', !vchBlock.includes('showStorageRecovery'));
t('onversionchange: reopenDb() কল', vchBlock.includes('reopenDb()'));
t('runDbRequest: __ahDbStale-এ রি-ওপেন-পথ', H.includes('if(!DB||window.__ahDbStale){') && H.includes('reopenDb().then(()=>{ if(DB) attempt();'));
t('boot-catch: useMemoryStorage (লোডার-আটক বাতিল)', /Data load failed — memory fallback/.test(H) && H.includes('useMemoryStorage(err)'));
t('boot-catch: আর bare `return;` নেই', !/Could not load data — check storage permission and reload\.'\);\s*\n\s*return;/.test(H));
/* ২ — putManyFast ক্লোজিং-রিট্রাই */
t('putManyFast: closing-retry (window.__ahReopenDb)', CCS.includes('window.__ahReopenDb') && /closing\|InvalidState\|not active\|connection/i.test(CCS));
t('putManyFast: doTx-এ তাজা DB (DB-রিফ্রেশ)', CCS.includes('const liveDb = () =>'));
/* ৩ — লোডিং: defer পার্স-অপটিমাইজেশন */
const deferCount = (H.match(/<script defer src=/g) || []).length;
t('৪৭+ অভ্যন্তরীণ-স্ক্রিপ্ট defer (কমপক্ষে ৪৫)', deferCount >= 45);
t('বুট-ক্রিটিকাল ৩-স্ক্রিপ্ট অ-ডিফার', /src="\.\/session-persist\.js/.test(H) && /premium-auth\.js/.test(H) && /data-protection\.js/.test(H));
t('হেভি app-seed/result-analysis defer', /src="[^"]*app-seed\.js[^>]*defer|<script defer src="[^"]*app-seed\.js/.test(H) && /src="[^"]*result-analysis-500\.js[^>]*defer|defer src="[^"]*result-analysis-500\.js/.test(H));
/* ৪ — ভার্সন */
t('sw BUILD_ID v207-aiagent-20260908', SW.includes("const BUILD_ID = 'v207-aiagent-20260908'"));
t('index sw-marker v207-aiagent-20260908', H.includes('sw.js?v=v207-aiagent-20260908'));
/* ৫ — data-protection count-ভিত্তিক (ধীর-নয়) */
t('summarizeDatabase: count()-ভিত্তিক (পূর্ণ-কোরে নয়)', DP.includes('tx.objectStore(name).count()'));

/* ৬ — D-V187: ব্রাউজার-ফার্স্ট Gemini + Google-হেল্প + অটো-ডিপ্লয় */
const PA = readFileSync('premium-auth.js', 'utf8');
const WF = readFileSync('.github/workflows/cf-pages.yml', 'utf8');
t('AI-ক্লায়েন্ট-ফাইল বিলুপ্ত (মালিক-নির্দেশ ২০২৬-০৯-০৮)', !existsSync('ah-ai-client.js') && !existsSync('study-ai-tool.js') && !existsSync('gk-agent-tool.js') && !existsSync('ai-explain-tool.js') && !existsSync('web-chat-rebuild.js'));
t('index.html-এ AI-স্ক্রিপ্ট-লোড নেই', !H.includes('ah-ai-client') && !H.includes('study-ai-tool') && !H.includes('gk-agent-tool') && !H.includes('ai-explain-tool'));
/* D-v191: Google-হেল্প আর পাবলিক-নয় + Google-অ্যাকাউন্ট সাইনআপ-ডেডএন্ড-ফিক্স */
const PW = readFileSync('public-worker.js', 'utf8');
const WB = readFileSync('worker-bundle.mjs', 'utf8');
t('public-UI-তে Google-হেল্প বাটন নেই (লগইন/সাইনআপ টেমপ্লেট)', !/id="ahGoogleHelp" style=/.test(PA));
t('গাইড+ওভারলে এখনো আছে, শুধু owner-কনসোল/ডক-এ (__ahShowGoogleHelp)', PA.includes('Authorized JavaScript origins') && PA.includes('admissionhub.pages.dev') && PA.includes('window.__ahShowGoogleHelp = showGoogleHelp'));
t('worker: google-only অ্যাকাউন্ট → 409-না, OTP-মার্জ (hasPassOnly + providers-merge)', PW.includes('hasPassOnly') && !PW.includes("code: 'provider_google'") && WB.includes('hasPassOnly'));
t('worker: পাসকি-অ্যাকাউন্টও OTP-মার্জ-পথ (register-email-এ provider_passkey-কোড নেই)', !/code: 'provider_passkey'/.test(WB));
t('client: provider_google/provider_passkey শাখা (সঠিক বার্তাসহ লগইন)', PA.includes("code === 'provider_google'") && PA.includes("code === 'provider_passkey'"));
t('client: api() error-এ code সংযুক্ত', PA.includes('if (data.code) last.code = data.code;') && PA.includes('if (data2.code) last.code = data2.code;'));
t('client: পুরনো পাসওয়ার্ড-আছে-শাখা অক্ষত', PA.includes('ইতিমধ্যে|already exists'));

t('cf-pages.yml: push-অন-মেইন অটো-ডিপ্লয়', WF.includes('branches: [main]') && WF.includes('pages deploy dist --project-name admissionhub'));
t('index study-ai/AI-মার্কার-নেই (মালিক-নির্দেশ ২০২৬-০৯-০৮)', !H.includes('studyai-v136-browser') && !H.includes('gk-agent-tool') && !H.includes('ah-ai-client') && !H.includes('ai-explain-tool'));

console.log(`\nIDB-HARDENING: ${pass} pass / ${fail} fail`);
if (fail) process.exit(1);
