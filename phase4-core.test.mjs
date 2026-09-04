// P04 — Personal Cloud Data Engine · কোর-টেস্ট (মার্জ-লজিক + গঠন-অ্যাসার্ট)
import { readFileSync } from 'fs';
let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; console.log('  ✓', n); } else { fail++; console.log('  ✗', n); } };
const ua = readFileSync('user-account.js', 'utf8');
const src = readFileSync('public-worker.js', 'utf8');
const bundle = readFileSync('worker-bundle.mjs', 'utf8');
const grad = (text, name) => {
  const i = text.indexOf(`const ${name} =`);
  if (i < 0) return null;
  const j = text.indexOf('\n  };', i);   /* IIFE-ভেতরের ২-স্পেস ইন্ডেন্ট-ব্লক শেষ */
  const e = j < 0 ? text.indexOf('\n', i) : j;
  return text.slice(i, e + 5);
};
const rowTs = grad(ua, 'rowTs');
const mergeRowsSrc = grad(ua, 'mergeRows');
const mergeSettingsSrc = grad(ua, 'mergeSettings');
t('মার্জ-হেল্পার সংজ্ঞা (rowTs/mergeRows/mergeSettings)', !!rowTs && !!mergeRowsSrc && !!mergeSettingsSrc);
if (rowTs && mergeRowsSrc) {
  const makeMergeRows = new Function(rowTs + '\nreturn ' + mergeRowsSrc.replace(/^const mergeRows = /, '') + ';');
  const mergeRows = makeMergeRows();
  const local = [{ id: 'a', at: 100, v: 'old' }, { id: 'b', at: 200, v: 'b-keep' }];
  const remote = [{ id: 'a', at: 300, v: 'new' }, { id: 'c', at: 50, v: 'c-new' }];
  const m = mergeRows(local, remote);
  t('id-সংঘর্ষে সর্বশেষ-সময় জেতে (a→new)', m.find(x => x.id === 'a').v === 'new');
  t('স্থানীয়-নতুন সংস্করণ অক্ষত (b)', m.find(x => x.id === 'b').v === 'b-keep');
  t('নতুন id-ঐক্যবদ্ধ (c যুক্ত)', m.some(x => x.id === 'c'));
  t('সব ৩টি row', m.length === 3);
  t('সার্ভার-খালি → স্থানীয় অপরিবর্তিত', JSON.stringify(mergeRows(local, [])) === JSON.stringify(local));
  t('স্থানীয়-খালি → সার্ভার-সব', mergeRows([], remote).length === 2);
}
if (mergeSettingsSrc) {
  const mergeSettings = new Function('return ' + mergeSettingsSrc.replace(/^const mergeSettings = /, '') + ';')();
  const s = mergeSettings({ theme: 'dark', dailyTarget: 100 }, { dailyTarget: 150, sound: 'on' });
  t('settings মার্জ: theme-স্থানীয় + dailyTarget-নতুন + sound', s.theme === 'dark' && s.dailyTarget === 150 && s.sound === 'on');
}
/* গঠন-অ্যাসার্ট */
t('PERSONAL-এ new স্টোর (admissionPlans/planDays/deletedQuestions)', ua.includes("'admissionPlans'") && ua.includes("'planDays'") && ua.includes("'deletedQuestions'"));
t('সার্ভার PERSONAL_KEYS-এ same (public-worker)', src.includes("'admissionPlans', 'planDays', 'deletedQuestions'"));
t('সার্ভার PERSONAL_KEYS-এ same (bundle)', bundle.includes('"admissionPlans", "planDays", "deletedQuestions"'));
t("সার্ভার PERSONAL_KEYS-এ 'vocabulary' পাস-থ্রু (ai-phase4-লক; ক্লায়েন্ট-পুশ-তালিকায় নেই → দ্বিগুণ-লেখা নয়)", src.includes("'notes', 'vocabulary'") && bundle.includes('"notes", "vocabulary"') && !ua.includes("'vocabulary'"));
t('client-এ exportData + /api/export কল', ua.includes("const exportData =") && ua.includes("/export") && ua.includes("ahAccExport"));
t('সিঙ্ক-স্ট্যাটাস UI (ahSyncStatus/refreshSyncStatus)', ua.includes("ahSyncStatus") && ua.includes("refreshSyncStatus"));
t('সার্ভার /api/export রুট', src.includes("'/api/export'"));
t('clear-ওভাররাইট নেই (merge-ব্যবহার)', !ua.includes("dbClear(st)"));
console.log(`\nPHASE4-CORE: ${pass} pass / ${fail} fail`);
if (fail) process.exit(1);
