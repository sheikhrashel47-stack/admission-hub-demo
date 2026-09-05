// 🚫 v178 — NO-INTRO/NOSPLASH টেস্ট (ভাইয়ের নির্দেশ: ইন্ট্রো আজীবন বাদ; বুট সর্বোচ্চ ৫ সেকেন্ড)
import { JSDOM } from 'jsdom';
import { readFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; console.log('  ✓', n); } else { fail++; console.log('  ✗', n); } };

const html = readFileSync('/home/user/demo/index.html', 'utf8');
const sw = readFileSync('/home/user/demo/sw.js', 'utf8');
const phase1 = readFileSync('/home/user/demo/phase1-upgrade.js', 'utf8');
const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true });
const doc = dom.window.document;

/* — 3D intro / splash পুরোপুরি অনুপস্থিত — */
t('১. 🚫 কোনো 3D intro scene নেই (ahfs-scene শূন্য)', !html.includes('ahfs-scene'));
t('২. 🚫 inline splash CSS (ah-splash3d-css) নেই', !html.includes('ah-splash3d-css'));
t('৩. 🚫 splash-3d.js স্ক্রিপ্ট লোড হয় না', !html.includes('splash-3d.js'));
t('৪. 🚫 splash-3d.js ফাইল রিপো/ক্যাশ-তালিকায়ও নেই',
  !sw.includes('splash-3d') && !existsSync('/home/user/demo/splash-3d.js') &&
  !execSync('git -C /home/user/demo ls-files').toString().includes('splash-3d.js'));
t('৫. 🚫 index.html-এ কোনো AdmissionSplash3D রেফারেন্স নেই', !html.includes('AdmissionSplash3D'));
t('৬. 🚫 পুরনো phase1-splash বিল্ড-কোড নেই (ভাইয়ের স্ক্রিনের সবুজ বক্স splash)',
  !phase1.includes("splash.id='phase1-splash'") && !phase1.includes('ahfs-prefill'));

/* — প্রথম পেইন্ট: সরল লোডার (খালি নয়, 3D নয়) — */
const splash = doc.getElementById('ahSplash');
t('৭. #ahSplash static উপস্থিত (প্রথম পেইন্ট blank নয়)', !!splash && !!splash.querySelector('.ah-boot'));
t('৮. লোডার = ✦ + Admission Hub + "লোড হচ্ছে…"', !!splash && splash.textContent.includes('Admission Hub') && splash.textContent.includes('লোড হচ্ছে'));
t('৯. gate static-hidden intact (auth guest-first না-ভাঙা)', !!doc.getElementById('ahAuthGate') && /display:\s*none/i.test(doc.getElementById('ahAuthGate').getAttribute('style') || ''));
t('১০. renderStartupLoading fallback-ও minimal (nested ahfs আর নেই)', !html.includes('app.innerHTML=\'<main class="app-loading" id="ahSplash" role="status"><div class="ahfs-'))
t('১১. boot দেখানোর স্টেজ-কলগুলো (setStage/progress) নেই', !html.includes('AdmissionSplash3D.setStage') && !html.includes('AdmissionSplash3D.dismiss'));

/* — ৫ সেকেন্ড নিয়ম — */
t('১২. ⏱ watchdog = 5000ms (৫ সেকেন্ড, ১০s নয়)', /__admissionSplashWatchdog=setTimeout\(function\(\)\{[\s\S]{0,700}\},5000\);/.test(html) && !/,10000\);/.test(html));
t('১৩. recovery টেক্সট "একটু বেশি সময় লাগছে" + রিট্রাই/ড্যাশবোর্ড বাটন', html.includes('একটু বেশি সময় লাগছে') && html.includes('আবার চেষ্টা করো') && html.includes('ড্যাশবোর্ডে যাও'));

/* — ভার্সন সামঞ্জস্য — */
t('১৪. index ↔ sw BUILD_ID v186-idbkeep-20260905 মিলেছে', html.includes('v186-idbkeep-20260905') && sw.includes("const BUILD_ID = 'v186-idbkeep-20260905'"));
t('১৫. phase1-upgrade v=4-nosplash সব জায়গায় (index + sw)', html.includes('phase1-upgrade.js?v=4-nosplash') && sw.includes('phase1-upgrade.js?v=4-nosplash'));
t('১৬. session-persist + premium-auth guest-first অক্ষত', html.includes('session-persist.js?v=session-v1') && html.includes('premium-auth.js?v=p3-auth-guest-v177'));

console.log(fail === 0 ? '✅ NO-SPLASH v178 TEST PASS (' + pass + ')' : '❌ FAIL ' + fail + ' / ' + pass);
process.exit(fail ? 1 : 0);
