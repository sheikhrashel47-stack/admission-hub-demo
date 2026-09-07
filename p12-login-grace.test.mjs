// P12-রিগ্রেশন — লগইন-গ্রেস (KV-রিপ্লিকেশন-বিলম্বে সেশন-ড্রপ-ফিক্স)
// মালিক-রিপোর্ট (২০২৬-০৯-০৭): "Google/OTP verification ঠিক আছে সব কিন্তু অ্যাপ লগইন হচ্ছে না"
// মূল-কারণ: সেশন-টোকেন Cloudflare KV-তে (tok:); লগইন-পর পরের boot-এর /auth/me অন্য PoP-এ
// ৪০১ দিলে পুরনো কোড সেশন মুছে গেস্টে ফেলত (KV eventual consistency ~৬০সে পর্যন্ত)।
// ফিক্স: (১) setSession-এ লগইন-মার্কার; (২) boot-এ ৩-মিনিট গ্রেস: ৪০১-এ সেশন রাখা + ৩০সে-পর পুনঃযাচাই।
import { readFileSync } from 'fs';
let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; console.log('  ✓', n); } else { fail++; console.log('  ✗', n); } };
const PA = readFileSync('premium-auth.js', 'utf8');
const H = readFileSync('index.html', 'utf8');
const SW = readFileSync('sw.js', 'utf8');
const V2 = readFileSync('dashboard-v2.js', 'utf8');

/* ১ — লগইন-মার্কার: প্রতি সফল setSession(tok) এ বসে */
t('১. setSession-এ লগইন-মার্কার (sessionStorage ahJustAuthed)', PA.includes("sessionStorage.setItem('ahJustAuthed'") && PA.includes('window.__ahJustAuthed = Date.now();'));
t('২. মার্কার শুধু টোকেন-লিখলে (লগআউটে নয়)', /if \(tok\) \{\s*\/\* লগইন-এইমাত্র-মার্কার/.test(PA));

/* ২ — boot-গ্রেস: fresh-মার্কারে ৪০১ সহনীয় */
t('৩. boot: ৩-মিনিট গ্রেস-উইন্ডো (180000ms)', PA.includes('180000') && PA.includes("sessionStorage.getItem('ahJustAuthed')"));
t('৪. fresh-এ/me রিট্রাই বেড়ে ৯টি (৪০১-সহন বেশি)', /for \(let att = 0; att < \(fresh \? 9 : 4\); att\+\+\)/.test(PA));
t('৫. fresh+৪০১ → সেশন রাখা (setGate(false), মুছা নয়)', PA.includes('KV-রিপ্লিকেশন সর্বোচ্চ ~৬০সে') && /setGate\(false\);[\s\S]{0,120}window\.__ahMeRetry = setTimeout/.test(PA));
t('৬. ৩০সে-পর ব্যাকগ্রাউন্ড পুনঃযাচাই + ইউজার-রিফ্রেশ', PA.includes('30000') && /const m2 = await api\('\/auth\/me'/.test(PA));
t('৭. যাচাই-সফলে গ্রেস-মার্কার শেষ (removeItem + __ahJustAuthed=0)', PA.includes("sessionStorage.removeItem('ahJustAuthed')") && PA.includes('window.__ahJustAuthed = 0;'));

/* ৩ — নিরাপত্তা-প্রপার্টি অক্ষত: পুরনো/প্রকৃত-মৃত সেশন এখনো লগআউট; disabled-লক */
t('৮. পুরনো-সেশন ৪০১ → এখনো লগআউট (কোনো গ্রেস-ফাঁক নেই)', /if \(!me && !fresh\) throw/.test(PA) && PA.includes("setSession('', null);\n          enterGuest();"));
t('৯. disabled/suspended → লক (লগইন-স্ক্রিন)', /setSession\('', null\); setGate\(true\); go\('login'\); return;/.test(PA));
t('১০. logout() অক্ষত (setSession("",null) → enterGuest → টোস্ট)', /async function logout\(\)[\s\S]{0,200}setSession\('', null\);[\s\S]{0,80}enterGuest\(\)/.test(PA));

/* ৪ — নেভ-রিভার্স (মালিক-নির্দেশ ২০২৬-০৯-০৭): Admission AI ট্যাব বাদ, ফিচার-রুট অক্ষত */
t('১১. NAV_TABS ৫-ট্যাব (ai-chat ট্যাব-এন্ট্রি নেই)', /NAV_TABS=.*key:'dashboard'.*key:'question-bank'.*key:'exam'.*key:'history'.*key:'profile'/s.test(H) && !H.includes("key:'ai-chat'") && !H.includes("label:'Admission AI'"));
t("১২. baseTab: ai-chat → খালি (কোনো ট্যাব-হাইলাইট নয়)", H.includes("if(path.startsWith('ai-chat')) return '';"));
t('১৩. Admission AI পেজ-রুট অক্ষত (renderAIChat + web-chat + More→ai-chat)', H.includes('renderAIChat') && H.includes('renderWebChatRebuild') && H.includes("'More','ai-chat'"));
t('১৪. dashboard-v2 টুল-গ্রিডে Admission AI অক্ষত (ফিচার হারায়নি)', V2.includes("'Admission AI'") && V2.includes("navigate('ai-chat')"));

/* ৫ — ভার্সন-অখণ্ডতা: premium-auth v196 + sw v196 (স্টেল-ক্যাশ নিষিদ্ধ) */
t('১৫. premium-auth js/css ?v=p3-auth-guest-v196 (index+sw APP_SHELL)', H.includes("premium-auth.js?v=p3-auth-guest-v196") && H.includes("premium-auth.css?v=p3-auth-guest-v196") && SW.includes("'./premium-auth.js?v=p3-auth-guest-v196'") && SW.includes("'./premium-auth.css?v=p3-auth-guest-v196'"));
t('১৬. sw BUILD_ID v197-gfix-20260907 (index-marker + sw.js)', SW.includes("const BUILD_ID = 'v197-gfix-20260907'") && H.includes('sw.js?v=v197-gfix-20260907'));
t('১৭. SW-ব্লক expectedSwVersion/cur = v196 (মৃত v179-হার্ডকোড বাদ)', H.includes("const expectedSwVersion = 'v197-gfix-20260907'") && H.includes("const cur = 'admission-hub-shell-v197-gfix-20260907'") && !H.includes('v179-aiengine-20260903'));

console.log(`\nP12-LOGIN-GRACE: ${pass} pass / ${fail} fail`);
if (fail) process.exit(1);
