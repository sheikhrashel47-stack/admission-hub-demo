# v1 ডিজাইন ফেরত — ইউজার নির্দেশ (exact-clone বাতিল)

তারিখ: 2026-09-01 · commit ট্যাগ: v1-restore

## যা হলো
- ভাই বলেছেন: exact-clone UI (v4) হবে না — **একদম প্রথম ডিজাইন (v1) হবে**।
- v1 = git commit `d977a11` (আগের এজেন্টের work/admission-hub-demo-এর হুবহু কপি; diff-চেক করা হয়েছে)।
- `onboarding.css` + `onboarding.js` → d977a11 থেকে সম্পূর্ণ restore। index.html-এ `?v=p6-onboard-v1r`।
- v1 ফ্লো: S1 welcome (CSS 3D scene) → S2 goal → S3 uni search+chips → S4 unit → S5 aim → S6 gauge+subjects → S7 hours/days/time → S8 almost → S9 plan build → S10 ready («সুপ্রভাত, Rashed») → dashboard (সরাসরি, 3D splash ছাড়া)
- jsdom টেস্ট (test-onboarding-v1.js) — S1→S10 + finish→dashboard পাস ✅

## অবস্থা
- demo HEAD `42e3d0f` → নতুন commit (v1-restore)
- `icons/uni/` (আসল লোগো ৫টা) repo-তে রয়ে গেছে — v1 ব্যবহার করে না, ভবিষ্যতে লাগতে পারে
- 3D splash (ahSplash) এখনো finish()-এ নেই — v1-এর নিয়ম (সরাসরি dashboard)
