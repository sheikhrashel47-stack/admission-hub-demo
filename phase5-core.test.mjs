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
/* ১ — fitText (টোকেন-অপটিমাইজেশন) */
const fit = grab(S, 'fitText'); const fitB = grab(B, 'fitText');
t('fitText সংজ্ঞা (উভয়)', !!fit && !!fitB);
if (fit) {
  const f = new Function('return ' + fit.replace(/^const fitText = /, '') + ';')();
  t('ছোট-টেক্সট অপরিবর্তিত', f('হ্যালো', 100) === 'হ্যালো');
  t('বড়-টেক্সট → ট্রিম + …', f('আ'.repeat(200), 50).length === 50 && f('আ'.repeat(200), 50).endsWith('…'));
}
/* ২ — clipMessages (কনভারসেশন-বাজেট) */
const cm = grab(S, 'clipMessages'); const cmB = grab(B, 'clipMessages');
t('clipMessages সংজ্ঞা (উভয়)', !!cm && !!cmB);
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
const ac = grab(S, 'aiChain'); const acB = grab(B, 'aiChain');
t('aiChain সংজ্ঞা (উভয়)', !!ac && !!acB);
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
/* ৪ — মেট্রিক/ব্যাজ-কী ফরম্যাট */
t('metKey (aim:...:date)', S.includes("'aim:' + name + ':' + dayKey()") && B.includes("'aim:' + name + ':' + dayKey()"));
t('badKeyName (aibad:key:model:date)', S.includes("'aibad:' + String(key).slice(0, 12)") && B.includes("'aibad:' + String(key).slice(0, 12)"));
t('PROMPT_V p05-1', S.includes("const PROMPT_V = 'p05-1'") && B.includes("const PROMPT_V = 'p05-1'"));
/* ৫ — aiCall-গঠন (চূড়ান্ত নকশা) */
/* public-worker: পাতলা dev-পথ — chatmem মেমোরি-সিড */
t('public-worker: chatmem স্মৃতি-পাঠ', S.includes("chatmem:' + uid") || S.includes('"chatmem:" + uid'));
t('public-worker: মেমোরি-সিড (<৩ বার্তা)', S.includes('msgs.length < 3'));
/* bundle: ধনী গেটওয়ে — ai-phase4-লক-ফিচার */
t('bundle: achat ইতিহাস (per-user)', B.includes('"achat:" + uid'));
t('bundle: aicache 600s + রেট ১২/মিনিট', B.includes('expirationTtl: 600') && B.includes('lim >= 12'));
t('bundle: aiBuildBrain + fitText(6000)', B.includes('fitText(await aiBuildBrain'));
/* উভয়: P05-রাউটার/মেট্রিক/pv/retryable + মডেল-চেইন-লক */
for (const [n, text] of [['public-worker', S], ['bundle', B]]) {
  t(n + ': badSet-রাউটার', text.includes('badSet.add('));
  t(n + ': মেট্রিক total/fail', text.includes("metKey('total')") && text.includes("metKey('fail')"));
  t(n + ': pv ফিল্ড', text.includes('pv: PROMPT_V'));
  t(n + ': retryable-ফলাফল', text.includes('retryable: true'));
  const locked = text.includes('gemini-3-flash-preview", "gemini-3.1-flash-lite"]') || text.includes("gemini-3-flash-preview', 'gemini-3.1-flash-lite']");
  t(n + ': মডেল-চেইন-লক (২-মডেল, 2.5-নিষেধ)', locked && !text.includes('gemini-2.5-flash'));
}
/* ৬ — D-P05-1: ক্যাশ-কী রিগ্রেশন (ডাবল-reverse মিউটেশন-বাগ) */
const lut = grab(B, 'lastUserText');
t('bundle: lastUserText হেল্পার', !!lut);
if (lut) {
  const f = new Function('return ' + lut.replace(/^const lastUserText = /, '') + ';')();
  const ms = [{ role: 'user', content: 'প্রথম' }, { role: 'ai', content: 'উত্তর' }, { role: 'user', content: 'শেষ' }];
  t('শেষ user-বার্তা ফেরত (ডাবল-reverse নয়)', f(ms) === 'শেষ');
  t('শুধু-ai → খালি', f([{ role: 'ai', content: 'x' }]) === '');
  t('role-ছাড়া → user-ধরা', f([{ content: 'হাই' }]) === 'হাই');
  t('খালি-তালিকা → খালি', f([]) === '');
}
t('bundle: lastTxt = lastUserText(b.messages)', B.includes('const lastTxt = lastUserText(b.messages)'));
t('bundle: ডাবল-reverse বাগি-প্যাটার্ন নেই', !B.includes('? String((Array.isArray(b.messages) ? b.messages : []).reverse()'));
console.log(`\nPHASE5-CORE: ${pass} pass / ${fail} fail`);
if (fail) process.exit(1);
