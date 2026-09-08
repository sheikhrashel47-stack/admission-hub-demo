// P05 — AI Core / AI Brain · কোর-টেস্ট (রাউটার + বাজেট + ফেইল-মার্ক pure-logic)
import { readFileSync } from 'fs';
let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; console.log('  ✓', n); } else { fail++; console.log('  ✗', n); } };
const S = readFileSync('public-worker.js', 'utf8');
const B = readFileSync('worker-bundle.mjs', 'utf8');
const grab = (text, name) => {
  const i = text.indexOf(`const ${name} =`);
  const j = text.indexOf(`var ${name} =`);
  const at = i >= 0 ? i : j;
  if (at < 0) return null;
  const e = text.indexOf('\n};', at);
  return text.slice(at, e + 5);
};
/* ১ — fitText (টোকেন-অপটিমাইজেশন; agent-f1-এ legacy-helper source-এ, bundle-এ Agent-Core) */
const fit = grab(S, 'fitText');
t('fitText সংজ্ঞা (source) + bundle-এ Agent-Core (agent-f1)', !!fit && B.includes('agent-f1') && B.includes('agentChat') && B.includes('/api/ai/chat'));
if (fit) {
  const f = new Function('return ' + fit.replace(/^const fitText = /, '') + ';')();
  t('ছোট-টেক্সট অপরিবর্তিত', f('হ্যালো', 100) === 'হ্যালো');
  t('বড়-টেক্সট → ট্রিম + …', f('আ'.repeat(200), 50).length === 50 && f('আ'.repeat(200), 50).endsWith('…'));
}
/* ২ — clipMessages (কনভারসেশন-বাজেট) */
const cm = grab(S, 'clipMessages');
t('clipMessages সংজ্ঞা (source; bundle-এ ai-agent মডিউল আছে)', !!cm && B.includes('buildSystemPrompt'));
if (cm) {
  const f = new Function("const AI_BUDGET = " + /AI_BUDGET = (\{[^}]*\})/.exec(S)[1] + "; return " + cm.replace(/^const clipMessages = /, '') + ';')();
  const msgs = [{ role: 'user', content: 'a'.repeat(4000) }, { role: 'ai', content: 'b'.repeat(4000) }, { role: 'user', content: 'c'.repeat(500) }];
  const out = f(msgs, 6000);
  t('বাজেট-পরে সাম্প্রতিক-কথা থাকে, পুরনো বাদ', out.map(m => m.content[0]).join('') === 'bc');
  t('perMsg-ক্যাপ ৪০০০', out.every(m => m.content.length <= 4000));
  t('ai-role → assistant ম্যাপিং', out[0].role === 'assistant');
  const back = f([{ role: 'ai', content: 'x' }], 100);
  t('সব-ফিট হলে ক্রম-অপরিবর্তিত', back[0].content === 'x' && back[0].role === 'assistant');
}
/* ৩ — aiChain (মডেল-রাউটার bad-skip) */
const ac = grab(S, 'aiChain');
t('aiChain সংজ্ঞা (source; Phase-1 router বান্ডল-এ)', !!ac && B.includes('routerChain'));
if (ac) {
  const f = new Function('return ' + ac.replace(/^const aiChain = /, '') + ';')();
  const keys = ['KEY-123456789012', 'KEY-999999999999'];
  const chain = ['m1', 'm2'];
  const bad = new Set(['KEY-12345678:m2']);
  const out = f(keys, chain, bad);
  t('একটি bad-combo বাদ → ৩টি বাকি', out.length === 3);
  t('ক্রম সংরক্ষিত (2য় কী-র m1 প্রথম-বাদ-পরে)', out[0].k === 'KEY-123456789012' && out[0].m === 'm1');
  t('bad-সংগ্রহ নেই → ৪টি', f(keys, chain, new Set()).length === 4);
}
/* ৪ — মেট্রিক/ব্যাজ-কী ফরম্যাট (source; agent-f1-এ নিজের কপি) */
t('metKey (aim:...:date) — source', S.includes("'aim:' + name + ':' + dayKey()"));
t('badKeyName (aibad:key:model:date) — source', S.includes("'aibad:' + String(key).slice(0, 12)"));
t('PROMPT_V p05-1 — source (লিগ্যাসি)', S.includes("const PROMPT_V = 'p05-1'"));
/* ৫ — agent-f1 Agent-Core গঠন (চূড়ান্ত নকশা: bundle-এ) */
t('bundle: Agent-Core markers (agent-f1 + sys-f1 + Gateway-রুট)', B.includes("AGENT_VERSION = \"agent-f1\"") && B.includes("SYSTEM_PROMPT_V = \"sys-f1-1\"") && /p === ['"]\/api\/ai\/chat['"]/.test(B));
t('bundle: per-user memory (chatmem + chatmemsum + airl-রেট)', /chatmem:["'\s]/.test(B) && B.includes("chatmemsum:") && B.includes("airl:") && B.includes('chatmem:'));
t('bundle: bad-key skip (aibad:) + mock-integrity (mock_refused)', B.includes("aibad:") && B.includes("mock_refused"));
t('bundle: provider-chain (Gemini→Groq fallback)', B.includes("\"groq\"") && B.includes("llama-3.3-70b-versatile"));
/* উভয়: নিরাপত্তা/ধারাবাহিকতা */
for (const [n, text] of [['public-worker', S], ['bundle', B]]) {
  t(n + ': retryable-ফলাফল', text.includes('retryable: true'));
}
t('bundle: মডেল-চেইন-লক (২-মডেল, 2.5-নিষেধ)', B.includes('gemini-3-flash-preview') && B.includes('gemini-3.1-flash-lite') && !B.includes('gemini-2.5-flash'));
t('bundle: pv ফিল্ড (agent-সংস্করণ)', B.includes('pv: SYSTEM_PROMPT_V'));
t('bundle: কোনো লিগ্যাসি aiCall-স্ট্রিং নেই (achat/aicache/etc.)', !B.includes('"achat:"') && !B.includes('aiBuildBrain') && !B.includes('lastUserText'));
console.log(`\nPHASE5-CORE: ${pass} pass / ${fail} fail`);
if (fail) process.exit(1);
