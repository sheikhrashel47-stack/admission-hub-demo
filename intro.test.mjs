// ✅ অতি-গুরুত্বপূর্ণ: আসল index.html-এর inline static intro টেস্ট
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';

let html = readFileSync('/home/user/demo/index.html', 'utf8');
// external scripts সরিয়ে শুধু DOM + inline content নিই (static-first proof)
html = html.replace(/<script src="[^"]*"><\/script>/g, '');
html = html.replace(/<script>\s*function([\s\S]*?)<\/script>/g, '');

// static-only scene: কোনো JS ছাড়াই
const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true });
const doc = dom.window.document;
let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; console.log('  ✓', n); } else { fail++; console.log('  ✗', n); } };

const ah = doc.getElementById('ahSplash');
t('১. #ahSplash exists', !!ah);
const scene = ah && ah.querySelector('.ahfs-scene');
t('২. FULL 3D scene inline (JS ছাড়াই) — prefill নয়', !!scene);
t('৩. scene classes ahfs-play + ahfs-idle (অ্যানিমেশন চালু)', scene && scene.classList.contains('ahfs-play') && scene.classList.contains('ahfs-idle'));
t('৪. data-played (JS mount-এ duplicate নয়)', scene && scene.getAttribute('data-played') === '1');
t('৫. hero tile + spark', !!scene.querySelector('.ahfs-tile .ahfs-spark'));
t('৬. ৬টি floating objects', scene.querySelectorAll('.ahfs-obj').length === 6);
t('৭. ২ orbit rings + platform ৩ স্তর', scene.querySelectorAll('.ahfs-ring').length === 2 && scene.querySelectorAll('.ahfs-platform i').length === 4);
t('৮. title + বাংলা tagline', scene.querySelector('.ahfs-title').textContent.includes('Admission') && scene.querySelector('.ahfs-tag').textContent.includes('ভর্তি প্রস্তুতির'));
t('৯. NO demo data (DU/unit/subject নেই)', !/DU|বিশ্ববিদ্যালয়|A Unit|B Unit|Bangla|English|GK/.test(scene.textContent));
t('১০. loading copy বাংলা + প্রগ্রেস বার', scene.querySelector('.ahfs-stage-text').textContent.includes('স্টাডি স্পেস') && !!scene.querySelector('.ahfs-bar'));
t('১১. inline CSS style আছে (ah-splash3d-css)', !!doc.getElementById('ah-splash3d-css'));
const cssTxt = doc.getElementById('ah-splash3d-css') ? doc.getElementById('ah-splash3d-css').textContent : '';
t('১২. CSS-এ keyframes আছে', cssTxt.includes('@keyframes ahfsFloat') && cssTxt.includes('@keyframes ahfsSpin'));
t('১৩. reduced-motion CSS আছে', cssTxt.includes('prefers-reduced-motion'));
t("১৪. loading copy (প্রস্তুত হচ্ছে) এখনো scene-এ", /প্রস্তুত হচ্ছে/.test(scene.textContent));
// JS লোড করেও mount() duplicate করবে না
dom.window.eval(readFileSync('/home/user/demo/splash-3d.js', 'utf8'));
const A = dom.window.AdmissionSplash3D;
t('১৫. AdmissionSplash3D available', !!A);
A.mount(ah);
t('১৬. mount → scene duplicate হয়নি (একটাই)', ah.querySelectorAll('.ahfs-scene').length === 1);
A.dismiss(100).then(() => {
  t('১৭. dismiss-এর পরও root খালি নয়', ah.innerHTML.trim().length > 20 && ah.textContent.trim().length > 0);
  t('১৮. overlay removable done', !doc.querySelector('.ahfs-overlay'));
  console.log(fail === 0 ? `✅ INTRO STATIC TEST PASS (${pass})` : `❌ FAIL ${fail} / ${pass}`);
  process.exit(fail ? 1 : 0);
});
setTimeout(() => { console.log('⏰ timeout'); process.exit(1); }, 5000);
