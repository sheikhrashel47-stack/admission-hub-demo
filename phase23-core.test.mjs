// P02+P03 কোর-টেস্ট: paginateContent + smsReady + গেট-উপস্থিতি (public-worker ↔ bundle)
import { readFileSync } from 'fs';
let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; console.log('  ✓', n); } else { fail++; console.log('  ✗', n); } };
const src = readFileSync('public-worker.js', 'utf8');
const bundle = readFileSync('worker-bundle.mjs', 'utf8');
const grab = (text, fnName) => {
  const i = text.indexOf(`const ${fnName} =`);
  const j = text.indexOf(`var ${fnName} =`);
  const at = i >= 0 ? i : j;
  if (at < 0) return null;
  const e = text.indexOf('\n};', at);
  return text.slice(at, e + 3);
};
const pcSrc = grab(src, 'paginateContent'); const pcSrcB = grab(bundle, 'paginateContent');
t('পাবলিক-সোর্সে paginateContent সংজ্ঞা', !!pcSrc && !!pcSrcB);
if (pcSrc) {
  const paginateContent = new Function('return ' + pcSrc.replace(/^const paginateContent = /, '') + ';')();
  const doc = { v: 9, questions: [1, 2, 3, 4, 5], vocabulary: ['a', 'b', 'c'], subjects: [{}] };
  const p1 = paginateContent(doc, 2, 1);
  t('limit=2,offset=1 → ২টি + total ৫', p1.questions.length === 2 && p1.total === 5 && p1.page.limit === 2 && p1.page.offset === 1 && p1.v === 9);
  const p2 = paginateContent(doc, 0, 0);
  t('limit না → পূর্ণ ডক (backward-compat)', p2 === doc && p2.questions.length === 5);
  const p3 = paginateContent(doc, 10, 3);
  t('offset-সীমা-পরে → ২টি + total', p3.questions.length === 2 && p3.total === 5);
}
const smsSrc = grab(src, 'smsReady'); const smsSrcB = grab(bundle, 'smsReady');
t('smsReady সংজ্ঞা (উভয় ফাইল)', !!smsSrc && !!smsSrcB);
if (smsSrc) {
  const smsReady = new Function('return ' + smsSrc.replace(/^const smsReady = /, '') + ';')();
  t('TWILIO-ত্রয়ী → true', smsReady({ TWILIO_SID: 'a', TWILIO_TOKEN: 'b', TWILIO_FROM: 'c' }) === true);
  t('BULKSMS কী → true', smsReady({ BULKSMS_API_KEY: 'k' }) === true);
  t('কিছুই না → false', smsReady({}) === false && smsReady(null) === false);
}
t('config-এ sms: smsReady(env) + phone:true (উভয়)', src.includes('sms: smsReady(env)') && src.includes('phone: true') && bundle.includes('sms: smsReady(env)') && bundle.includes('phone: true'));
t('/api/content-এ paginateContent+searchParams', src.includes('paginateContent(raw ? JSON.parse(raw)') && bundle.includes('paginateContent(raw ? JSON.parse(raw)'));
t('otpSend-এ মোবাইল-গেট smsReady', src.includes("id.startsWith('ph:') && !smsReady(env)") && bundle.includes('id.startsWith("ph:") && !smsReady(env)'));
t('authRegister-এ smsReady-গেট', src.includes("!id.startsWith('em:') && !smsReady(env)") && bundle.includes('!id.startsWith("em:") && !smsReady(env)'));
t('cloud-content-sync অফলাইন-ফ্ল্যাগ', readFileSync('cloud-content-sync.js','utf8').includes('__ahCloudOffline'));
console.log(`\nPHASE23-CORE: ${pass} pass / ${fail} fail`);
if (fail) process.exit(1);
