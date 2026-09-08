// P08-রিগ্রেশন — Google/পাসকি-মাত্র অ্যাকাউন্টে সাইনআপ-ডেডএন্ড-ফিক্স (OTP-মার্জ)
// মালিক-রিপোর্ট: "একদম নতুন ইমেইলেও 'আগে Google-লগইন হয়েছে' + OTP যাচ্ছে না"
// লাইভ-প্রুবে নতুন-ইমেইল pending:true/sent:true — অর্থাৎ ওই ইমেইলে google-মাত্র রেকর্ড আছে
// (আগের Google-পরীক্ষায় তৈরি)। ফিক্স: google/passkey-মাত্র → 409-নয়, OTP-প্রমাণে পাসওয়ার্ড-মার্জ।
import { readFileSync } from 'fs';
let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; console.log('  ✓', n); } else { fail++; console.log('  ✗', n); } };
const WB = readFileSync('worker-bundle.mjs', 'utf8');
const PW = readFileSync('public-worker.js', 'utf8');
const HUB = readFileSync('/home/user/hub/public-worker.js', 'utf8');
const PA = readFileSync('premium-auth.js', 'utf8');

// register-email ফাংশন-বডি স্লাইস
const sliceReg = (s) => {
  const i = s.indexOf('authRegisterEmail');
  const j = s.indexOf('const password', i);
  return j > i ? s.slice(i, j) : '';
};
const regWB = sliceReg(WB), regPW = sliceReg(PW), regHUB = sliceReg(HUB);

/* ১ — পাসওয়ার্ড-নেই (google/passkey-মাত্র) অ্যাকাউন্ট → 409-ব্লক নয় */
t('WB: register-email-এ hasPassOnly-শাখা', regWB.includes('hasPassOnly') && regWB.includes('পাসওয়ার্ড দিয়ে লগইন করো'));
t('PW: register-email-এ hasPassOnly-শাখা', regPW.includes('hasPassOnly'));
t('HUB: register-email-এ hasPassOnly-শাখা', regHUB.includes('hasPassOnly'));
t('WB: register-email-এ provider_google/provider_passkey-কোড নেই (মৃত-ডেডএন্ড বাদ)', !regWB.includes('provider_google') && !regWB.includes('provider_passkey'));
t('PW: same (providers-কোড নেই)', !regPW.includes('provider_google') && !regPW.includes('provider_passkey'));
t('HUB: same', !regHUB.includes('provider_google') && !regHUB.includes('provider_passkey'));

/* ২ — OTP-মার্জ: নতুন pending-এ পুরনো providers-সংযোজন */
t('WB: pending.providers-মার্জ (Array.from(new Set([...existing.providers]))', /Array\.from\([^)]*new Set\(\[['"]email['"], ['"]password['"], \.\.\.(?:\(\(existing && existing\.providers\) \|\| \[\]|existing && existing\.providers \|\| \[\])\]\)\)/.test(WB));
t('PW: pending.providers-মার্জ', /Array\.from\(new Set\(\['email', ?'password', ?\.\.\.\(\(existing && existing\.providers\) \|\| \[\]\)\]\)\)/.test(PW));
t('HUB: pending.providers-মার্জ', /Array\.from\(new Set\(\['email', ?'password', ?\.\.\.\(\(existing && existing\.providers\) \|\| \[\]\)\]\)\)/.test(HUB));

/* ৩ — verify-পথে merge-টোকেন (providers অক্ষত, status active) */
const vStart = WB.indexOf('const rec = {\n      id: pending.id');
let recBlock = vStart > 0 ? WB.slice(vStart, vStart + 700) : '';
t('verify signup: rec প্রোভাইডার pending.providers-থেকে', recBlock.includes('providers: pending.providers || ["password"]') || recBlock.includes('providers: pending.providers'));
t('verify signup: status active + verified', recBlock.includes('status: "active"') && recBlock.includes('verified: true'));

/* ৪ — ক্লায়েন্ট: OTP-ফ্লো অক্ষত (doSignup → register-email → OTP-স্ক্রিন) */
t('client: doSignup register-email-কল অক্ষত', PA.includes("api('/auth/register-email'"));
t('client: OTP-স্ক্রিন go(\'otp\') ফ্লো অক্ষত', /go\('otp'\)/.test(PA) && PA.includes('draft.waitId'));
t('client: provider-কোড শাখা এখনো ফলব্যাক (নিরাপদ)', PA.includes("code === 'provider_google'") && PA.includes("code === 'provider_passkey'"));

/* ৫ — OTP-পাঠানো ফাংশন অক্ষত (issueOtp) */
t('worker: issueOtp অক্ষত (OTP-পাঠানোর পথ আছে)', WB.includes('issueOtp') && /const sent = await issueOtp/.test(WB));
t('worker: register-email সফল-পথ pending:true/sent:true', /return json\(\{ pending: true, sent: true, channel: "otp"/.test(WB));

console.log(`\nP08-AUTH-OTP-MERGE: ${pass} pass / ${fail} fail`);
if (fail) process.exit(1);
