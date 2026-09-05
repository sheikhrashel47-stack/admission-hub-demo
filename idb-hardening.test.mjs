// D-V186 — IDB-ক্র্যাশ + লোডিং-হার্ডেনিং কোর-টেস্ট
import { readFileSync } from 'fs';
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
t('বুট-ক্রিটিকাল ৩-স্ক্রিপ্ট অ-ডিফার', /<script src="\.\/session-persist\.js/.test(H) && /<script src="\.\/ah-ai-client\.js/.test(H) && /<script src="data-protection\.js/.test(H));
t('হেভি app-seed/result-analysis defer', /src="[^"]*app-seed\.js[^>]*defer|<script defer src="[^"]*app-seed\.js/.test(H) && /src="[^"]*result-analysis-500\.js[^>]*defer|defer src="[^"]*result-analysis-500\.js/.test(H));
/* ৪ — ভার্সন */
t('sw BUILD_ID v186-idbkeep-20260905', SW.includes("const BUILD_ID = 'v186-idbkeep-20260905'"));
t('index sw-marker v186-idbkeep-20260905', H.includes('sw.js?v=v186-idbkeep-20260905'));
/* ৫ — data-protection count-ভিত্তিক (ধীর-নয়) */
t('summarizeDatabase: count()-ভিত্তিক (পূর্ণ-কোরে নয়)', DP.includes('tx.objectStore(name).count()'));

console.log(`\nIDB-HARDENING: ${pass} pass / ${fail} fail`);
if (fail) process.exit(1);
