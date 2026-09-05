// 🤖 PHASE 4 — AI ENGINE টেস্ট (secure server-side, isolation, user context)
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; console.log('  ✓', n); } else { fail++; console.log('  ✗', n); } };
const w = readFileSync('/home/user/demo/worker-bundle.mjs', 'utf8');
const gate = readFileSync('/home/user/demo/ah-ai-client.js', 'utf8');
const sai = readFileSync('/home/user/demo/study-ai-tool.js', 'utf8');
const aie = readFileSync('/home/user/demo/ai-explain-tool.js', 'utf8');
const idx = readFileSync('/home/user/demo/index.html', 'utf8');
const pa = readFileSync('/home/user/demo/premium-auth.js', 'utf8');

/* ── SERVER (worker-bundle.mjs) ── */
t('১. 🚫 কোনো ক্লায়েন্ট-এক্সপোজড key নেই (AIza নয়; assets-এও) — heroku grep', !/AIza[0-9A-Za-z_-]{20,}/.test(w + gate + sai + aie + idx));
t('২. /api/ai authenticated uid + guest-allow (টোকেন ছাড়াও চলে, user-data null)', /if \(p === "\/api\/ai"[^}]*authUser\(request, env\)[^}]*\} catch[^}]*\{\}/.test(w));
t('৩. Context Engine ৪ লেয়ার: SYSTEM→GLOBAL→USER→REQUEST (aiBuildBrain + SYS)', w.includes('aiBuildBrain') && w.includes('var SYS = (ai)'));
t('৪. 🧠 SYS-এ ভাইয়ের নির্দেশ: মাখন ভাষা + ১০০% সত্য + Rashel Zayan Sir + আপডেট তথ্য',
  w.includes('মাখনের মতো') && w.includes('Rashel Zayan Sir') && w.includes('এখনো যথেষ্ট ডেটা নেই') && w.includes('অফিসিয়াল নোটিশ'));
t('৫. User context = আসল stores (examResults/mistakes/dailyStats/activityLogs/vocabulary)',
  w.includes('st.examResults') && w.includes('st.activityLogs') && w.includes('st.vocabulary') && w.includes('st.dailyStats'));
t('৬. দুর্বল-টপিক হিসাব (mistake pattern) + trend', w.includes('aiWorstTopics') && w.includes('aiTrend'));
t('৭. Question-aware exact lookup + Vocab-aware exact lookup', w.includes('aiFindQ') && w.includes('aiFindVocab'));
t('৮. না-পাওয়া ডেটা → SYS-এ সততা নিয়ম (hallucination বন্ধ)', w.includes('বানাবে না'));
t('৯. Isolation: uid শুধু server-টোকেন থেকে, KV key-র scope `ustate:`+uid', /ustate:" \+ uid/.test(w) && /"achat:" \+ uid/.test(w));
t('১০. চ্যাট-হিস্ট্রি per-user (achat:<uid>, cap 40, উত্তর-সহ সংরক্ষণ)', w.includes('hist.slice(-40)') && w.includes("achat:" + '" + uid'));
t('১১. স্পিড/কোস্ট: মডেল-চেইন ৩-flash-preview প্রথম (২-মডেল) + cache ৬০০s + টাইমআউট ৪৫s + রেট-লিমিট ১২/মিনিট',
  w.includes('gemini-3-flash-preview", "gemini-3.1-flash-lite"]') && w.includes('expirationTtl: 600') && w.includes('45000') && w.includes('lim >= 12') && !/gemini-2\.5-flash/.test(w));
t('১১ক. ক্যাশ read+write একই key (একই প্রশ্নে নতুন API কল নয়)', w.includes('const cacheKey = "aicache:"') && w.includes('cached: true') && w.includes('env.PUB_KV.get(cacheKey)'));
t('১১ক২. CORS preflight: authorization + x-ah-guest + x-ah-app allow (ব্রাউজার-ব্লকের মূল ফিক্স)',
  /authorization,\s*content-type,\s*x-ah-guest/.test(w) && w.includes('x-ah-device'));
t('১১ক২খ. KV-লেখা-থ্রটল: tok/sess ১০ মিনিটে একবার, touchUser ৩০ মিনিটে (দৈনিক সীমা-রক্ষা)',
  w.includes('nowTs - tr.lastSeen >= 600000') && w.includes('nowTs - prev.lastSeen < 600000') && w.includes('nowTs - u.lastSeen < 1800000'));
t('১১ক৩. KV-র write-ব্যর্থতায় AI-ও পড়ে না (সব put try/catch, duplicate বাদ)',
  w.includes('try { await env.PUB_KV.put(limKey') && (w.match(/put\(limKey/g) || []).length === 1 && w.includes('var touchUser = async (env, id) => {\n  try {'));
t('১১বি০. ভিশন: শেষ user-মেসেজে attachments → inline_data (server-সূত্রে ছবি পড়া)',
  w.includes('inline_data: { mime_type: String(a.mime') && sai.includes('lastMsg.attachments = atts2'));
t('১১বি. Google পেলোড-রূপ: contents[].parts[{text}] + raw-বডি থেকে lastTxt (400/crash-ফিক্স স্থায়ী)',
  w.includes('parts = [{ text: String(m.content') && w.includes('lastTxt.slice(0, 120)') && w.includes('lastTxt, C, st)'));
t('১২. Failure: 429 বাংলা + retryAfter; 502 বাংলা; খালি-কী 503; model-chain failover', w.includes('retryAfter') && w.includes('একটু পরে চেষ্টা করো') && w.includes('AI-key কনফিগার নেই'));
t('১৩. vocabulary এখন cloud-সিঙ্কে (PERSONAL_KEYS) — AI-র কাছে শেখা-শব্দ', w.includes('"vocabulary"') && pa.includes("'vocabulary'"));
t('১৪. image-ও একই secure পথ (কোনো ক্লায়েন্ট key নয়)', w.includes('kind === "image"') && w.includes('gemini-3.1-flash-image'));

/* ── CLIENT ── */
t('১৫. ah-ai-client.js: সার্ভার-পথ ডিফল্ট + ব্রাউজার-ফার্স্ট শুধু ইউজারের নিজস্ব key (D-V187, হার্ডকোড-key নেই)', gate.includes("WORKER + '/ai'") && gate.includes('askLocal') && gate.includes("localStorage.getItem('gemini_api_key')") && !/AIza[0-9A-Za-z_\-]{10,}/.test(gate));
t('১৬. ah-ai-client.js: token-হলেই Bearer + গেস্ট-ও চলে', gate.includes('Authorization: \'Bearer \'') && gate.includes('tok()'));
t('১৬খ. গেস্ট-ডিভাইস id → X-AH-Guest header → server-এ uid=g:<id> (per-device isolation)', gate.includes('X-AH-Guest') && gate.includes('guestId') && /"g:" \+ gid/.test(w) && w.includes('X-AH-Guest'));
t('১৬গ. মেনু-সরলীকরণ: মেনুতে শুধু ফেরি/পরীক্ষা/নতুন-চ্যাট/সব-চ্যাট/মুছি — সোর্স-ইঞ্জিন-সেটিংস-নাম-বদলানো নেই',
  (() => { const a = sai.indexOf("state.sheet === 'menu'"); const b = sai.indexOf("state.sheet === 'source'"); const m = sai.slice(a, b);
    return m.includes('নতুন চ্যাট') && m.includes('সব চ্যাট') && m.includes('এই কথোপকথন মুছি') && !m.includes('openSheet(\'engine\')') && !m.includes("openSheet('settings')") && !m.includes("openSheet('source')") && !m.includes('চ্যাটের নাম বদলাও'); })());
t('১৬ঘ. অভিবাদন-নাম: লগইন-নাম → LS_NAME → fallback "শিক্ষার্থী" (কোনো হার্ডকোড নাম নয়)',
  /isAuthed\(\)/.test(sai) && sai.includes("'শিক্ষার্থী'") && !/\| 'রাশেল'/.test(sai));
t('১৬ঙ. ল্যান্ডিং সাদামাটা: শেয়ার-কার্ড/মেমোরি-চিপ/এজেন্ট-নোট বাদ',
  (() => { const a = sai.indexOf('const landing = ()'); const b = sai.indexOf('const sheet = ()'); const L = sai.slice(a, b);
    return !L.includes('sai-ghostbtn') && !L.includes('সত্যিই ওয়েব ঘেঁটে') && !L.includes('মেমোরি:') && !L.includes('সব ডেটা পাঠাও'); })());
t('১৬চ. SYS-নাম-নিয়ম: নাম থাকলে ডাকো, না থাকলে "শিক্ষার্থী" — গেস্টে নাম বানাবে না; ব্রেইনে [ইউজার-নাম]',
  w.includes('শিক্ষার্থী\" বলে ডাকো') && w.includes('[ইউজার-নাম]'));
t('১৭. Study AI → server-first (AH_AI.ask) + chat owner-স্কোপ (স্পেক ১৩)', sai.includes('window.AH_AI') && sai.includes('ownerOf()') && sai.includes("(c.owner || '') === ownerOf()"));
t('১৮. Study AI ছবি → server-first; client-পথ শুধু fallback', sai.includes('window.AH_AI.askImage') && sai.includes('const gk = keyList'));
t('১৯. AI Explain → server-first + question-aware (refs.questionId)', aie.includes('window.AH_AI') && aie.includes("refs: { questionId: qid }"));
t('২০. index.html-এ gateway লোড + v179 markers + AI টুল নতুন ভার্সন',
  idx.includes('ah-ai-client.js?v=ahai-v3') && idx.includes('v179-aiengine-20260903') && idx.includes('studyai-v136-browser') && idx.includes('aiex-v4-ph4'));

/* ── RUNTIME: gateway-র আচরণ (jsdom) ── */
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.com/' });
const wdw = dom.window;
const calls = [];
wdw.fetch = (url, opts = {}) => {
  calls.push({ url, opts });
  const json = (data) => Promise.resolve({ ok: true, status: 200, json: async () => data });
  if (String(url).includes('/ai')) return json({ text: 'হ্যালো বন্ধু ✨', model: 'gemini-3-flash-preview' });
  return json({ error: 'nf' });
};
const load = (code) => { const s = wdw.document.createElement('script'); s.textContent = code; wdw.document.body.appendChild(s); };
load(readFileSync('/home/user/demo/ah-ai-client.js', 'utf8'));
const A = wdw.AH_AI;
t('২১. AH_AI.ask() → /ai + পাঠানো messages/kind', (await A.ask({ messages: [{ role: 'user', content: 'আমার দুর্বল টপিক?' }], kind: 'chat' })).text.includes('হ্যালো') && calls[0].opts.body.includes('দুর্বল টপিক') && calls[0].opts.body.includes('"kind":"chat"'));
t('২২. গেস্ট-এ (টোকেন ছাড়া) Authorization header নেই', !calls[0].opts.headers.Authorization);

wdw.localStorage.setItem('ahPubToken', 'tok_e2e_123');
await A.ask({ messages: [{ role: 'user', content: 'আজ কী পড়ব?' }], kind: 'chat' });
t('২৩. টোকেন থাকলে Bearer header যায়', calls[1] && calls[1].opts.headers.Authorization === 'Bearer tok_e2e_123');
await A.ask({ kind: 'image', refs: { text: 'একটা বই আঁকো' }, messages: [] });
t('২৪. image → একই /ai (kind=image)', calls[2] && calls[2].opts.body.includes('"kind":"image"'));

console.log(fail === 0 ? '✅ AI-PHASE4 TEST PASS (' + pass + ')' : '❌ FAIL ' + fail + ' / ' + pass);
process.exit(fail ? 1 : 0);
