# P13 — dv2 "Something went wrong" (C().settings) ক্র্যাশ-ফিক্স (v197)

তারিখ: ২০২৬-০৯-০৭ · sw BUILD_ID: `v197-gfix-20260907`

## মালিক-স্ক্রিনশট
`Something went wrong — Your saved questions, vocabulary, progress, and settings were not deleted.`
তলায়: `TypeError: undefined is not an object (evaluating 'C().settings.dailyTarget')` — নেভ-বার দৃশ্যমান (পাঁচ-ট্যাব)।

## মূল-কারণ (১০০% নিশ্চিত, প্রমাণ-সহ)
- index.html-এ `const CACHE = {...}` — ক্লাসিক-স্ক্রিপ্টের **টপ-লেভেল `const`** গ্লোবাল-লেক্সিকাল বাইন্ডিং; **`window.CACHE`-এর প্রপার্টি হয় না**।
- dashboard-v2.js-এর `const C = () => (window.CACHE || {})` — তাই `window.CACHE` সবসময় `undefined` → `C()` চিরকাল `{}` ফেরাত → `C().settings` = `undefined` → `.dailyTarget` — TypeError।
- অর্থাৎ P11-এর ড্যাশবোর্ড প্রথম ফোন-রেন্ডারেই (লাইভ) পতিত; আগের যাচাই ছিল স্ট্যাটিক-টেস্ট-ভিত্তিক (এই ক্লাসের বাগ ধরে না)।
- প্রমাণ: repo-তে সঠিক-প্যাটার্ন আগে থেকেই আছে — `bug-agent-tool.js:30`, `mistake-notebook-tool.js:28`, `notes-tool.js:14`: `(typeof CACHE !== 'undefined' && CACHE) || window.CACHE || {}`। কেউ `window.CACHE = ...` উৎপাদন করে না (grep-নিশ্চিত)।

## ফিক্স (dashboard-v2.js, ৪ স্তর)
1. **C() ৩-স্তর-রেজলভার**: `window.CACHE` → `typeof CACHE !== 'undefined'` (গ্লোবাল-লেক্সিকাল) → `{}` — কোনো অবস্থায় ক্র্যাশ নয়।
2. **null-safe সব settings-অ্যাক্সেস**: `(C().settings || {})` (goal/build/dv2SaveGoal/dv2EditGoal) — `C().settings.dailyTarget` সরাসরি অ্যাক্সেস শূন্য।
3. **goal()-এ DB-মোছা-নিষেধ**: settings-ফলব্যাক-অবজেক্টে `dbPut('settings', s)` → শুধু আসল settings-অবজেক্ট (`S`) থাকলেই লেখা — ফাঁকা-অবজেক্টে পুরো settings-স্টোর `{dv2Goal}`-এ বদলে যাওয়া নিষিদ্ধ।
4. **renderV2 try/catch → পুরনো-ড্যাশবোর্ড-ফলব্যাক**: dv2-এর যেকোনো ভবিষ্যৎ-ভুলে অ্যাপ কখনো "Something went wrong"-স্ক্রিনে পড়ে না — আগের renderDashboard রেন্ডার হয়।

## ভার্সন
- `dashboard-v2.js?v=dash2` → **`?v=dash2f1`** (index + sw APP_SHELL) — পরিবর্তিত-অ্যাসেট ক্যাশ-রিফ্রেশ বাধ্যতামূলক।
- BUILD_ID/sw-marker/expectedSwVersion/cur: v196-gfix-20260907 → **v197-gfix-20260907** (সব-ফাইল সিঙ্ক)।

## টেস্ট-প্রমাণ
- **নতুন `p13-dashboard-cache-guard.test.mjs` — ৮ অ্যাসার্ট (৪ স্ট্যাটিক + ৪ রানটাইম-jsdom)** — রানটাইম-কেস:
  ① CACHE-সম্পূর্ণ-অনুপস্থিত → রেন্ডার-নো-থ্রো; ② `const CACHE={settings:{}}` (মালিক-সিনারিও) → নো-থ্রো + ডিফল্ট-টার্গেট; ③ `dailyTarget:50` → `/ 50 MCQ` দেখায়।
- p11 ৩৫/৩৫ (C()-অ্যাসার্ট নতুন-রেজলভার-প্যাটার্নে হালনাগাদ); **স্যুট ১৮/১৮ সবুজ** (AUTH_ENDPOINTS_GUARD-সহ); inline ১৪-ব্লক সিনট্যাক্স-OK।

## লাইভ-ভেরিফাই
- push-পর: pages.dev + github.io → `sw.js?v=v197-gfix-20260907`, লাইভ index-এ `dashboard-v2.js?v=dash2f1`।
