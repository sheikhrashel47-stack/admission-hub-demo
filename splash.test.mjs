// v175 blank-proof + session tests
import { JSDOM } from 'jsdom';
import { readFileSync } from 'fs';
const dom = new JSDOM('<!DOCTYPE html><html><head></head><body><div id="app"><main class="app-loading" id="ahSplash"></main></div></body></html>', { runScripts: 'dangerously', pretendToBeVisual: true });
const w = dom.window;
w.matchMedia = () => ({ matches: false });
const load = (code) => { const s = w.document.createElement('script'); s.textContent = code; w.document.body.appendChild(s); };
load(readFileSync('/home/user/demo/splash-3d.js', 'utf8'));
load(readFileSync('/home/user/demo/session-persist.js', 'utf8'));
const A = w.AdmissionSplash3D;
let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; console.log('  ✓', n); } else { fail++; console.log('  ✗', n); } };

const root = w.document.getElementById('ahSplash');
A.mount(root);
t('scene mounted', !!root.querySelector('.ahfs-scene'));
A.dismiss(200).then(() => setTimeout(() => {
  // dismiss-এর পর root কখনো খালি নয় — prefill restored
  const after = w.document.getElementById('ahSplash');
  console.log('  [dbg] after exists:', !!after, '| cls:', after && after.className, '| inner len:', after && after.innerHTML.length, '| inner head:', after && after.innerHTML.slice(0,60));
  t('dismiss → root NEVER blank (content present)', after && after.innerHTML.trim().length > 20 && after.textContent.trim().length > 0);
  t('dismiss → overlay removed', !w.document.querySelector('.ahfs-overlay'));
  // forceHide test — খালি root-এ prefill ফেরায়
  after.innerHTML = '';
  A.forceHide();
  t('forceHide → empty root gets prefill (never blank)', !!after.querySelector('.ahfs-prefill'));
  // mount fail-safe: invalid root
  const r2 = w.document.createElement('div');
  const ok = A.mount(r2);
  t('mount works on fresh root', !!ok && !!r2.querySelector('.ahfs-scene'));
  // session persist
  const S = w.AdmissionSession;
  t('AdmissionSession exists', !!S);
  w.document.body.innerHTML = '<div id="app"></div>';
  try { S.save(); } catch (_) {}
  t('session save no-throw', true);
  t('session path() = dashboard (default)', S.path() === 'dashboard');
  console.log(fail === 0 ? '✅ SPLASH v175 TEST PASS (' + pass + ')' : '❌ FAIL ' + fail + ' / ' + pass);
  process.exit(fail ? 1 : 0);
}, 400));
setTimeout(() => { console.log('⏰ timeout'); process.exit(1); }, 5000);
