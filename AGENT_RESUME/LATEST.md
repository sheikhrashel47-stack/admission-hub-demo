# LATEST — 2026-09-06 · v195 — P11 DASHBOARD v2 (ছবি-অনুযায়ী ১৪ মডিউল) — Google-হেল্প পাবলিক-নয় + Google-অ্যাকাউন্ট ডেডএন্ড-ফিক্স (v190-ac3-এর ওপরে)
- **অবস্থা:** v190 লাইভ — P08-AC3 টাইমার-শেষ-অটো-সাবমিট হার্ডেনিং। স্বাক্ষর `v190-ac3-fix-20260906`।
- **মার্জ-ইতিহাস:** remote-এ v189-cloud-sync (`ae3d0b8`→`b5e9bc1`→`d054f8f`) পাওয়া যায়; আমার AC3-commit
  সেটির ওপরে **rebase** (সংঘর্ষ: শুধু BUILD_ID+sw-marker)। ভার্সন v189-সংঘর্ষ এড়াতে **v190**।
- **AC3-সম্পন্ন:** exact-endTime ব্যাকআপ-টাইমার + visibilitychange/pageshow/focus wake (থ্রটল-ট্যাব-প্রুফ);
  submitExam fail-safe (try/catch + ব্যাকঅফ-রিট্রাই ১.৫s×2^n ≤৩০s, ৬-বার, examId-গার্ড, toast-নোটিশ, isSubmitting-আনলক);
  timeExpired উত্তর-লক; boot-এ expired-সাবমিট try/catch; discard-এ retry-clear। বিস্তার: `docs/P08-AC3-AUTOSUBMIT.md`।
- **টেস্ট:** ১১/১১ স্যুট সবুজ: GUARD · ai4 · auth-ux · idb22 · intro-বুটশেল(হালনাগাদ) · nosplash ·
  p08-ac3 **২৩** · phase23-13 · phase4-16 · phase5-37 · session — মার্জ-পরবর্তী ট্রিতেও।
- **CI:** `7ad06e9`-তে ৫/৫ check (build · guard · deploy · deploy-pages · report) success।
- **লাইভ:** https://admissionhub.pages.dev = **v190-ac3-fix-20260906** ✓ · github.io backup = same ✓ ·
  Worker admission-gk fad9693b (v189-cloud-sync, অপরিবর্তিত)।
- **মালিক-পক্ষে বাকি:** (১) GCP Authorized JS origins → https://admissionhub.pages.dev (একবার;
  docs/GOOGLE-LOGIN-MANUAL-GUIDE.md) (২) AC3-ব্যবহার-পরীক্ষা (টাইমার-শেষ অটো-সাবমিট) → APPROVE।
- **পরে (মালিক-সিদ্ধান্তে):** P08-AC1/AC2-ভেরিফাই → P10 Mistakes → P12 Vocabulary → P19-SEO → P14 Security।
- **নোট:** GitHub-টোকেন সেশন-ভিত্তিক (যা মালিক দেন); .git/config স্ন্যাপশট-বহির্ভূত — প্রতি-সেশনে
  remote+auth পুনঃসেট করতে হয়। রিপো-তে কোনো সিক্রেট নেই।
- **v191 (মালিক-রিপোর্ট-ফিক্স, ২০২৬-০৯-০৬):** পাবলিক-তে Google-ডিবাগ-ওভারলে বাদ (বাটন সরানো;
  শুধু `window.__ahShowGoogleHelp` = owner-কনসোল/ডক-গাইড)। Google-অ্যাকাউন্ট (পাসওয়ার্ড-নেই) দিয়ে
  সাইন-আপ করলে "আগেই আছে-পাসওয়ার্ড" ডেড-এন্ড নয় — server `provider_google`/`provider_passkey` কোড →
  ক্লায়েন্ট সঠিক নোটিশ (Continue with Google / পাসকি)। ফাইল: worker-bundle.mjs (ডিপ্লয়-এন্ট্রি) +
  public-worker.js (demo+hub) + premium-auth.js। বিস্তার: `docs/V191-GOOGLE-PUBLIC-AUTH-FIX.md`।
- **স্বর:** sw v191-gfix-20260906 · ১১/১১ স্যুট সবুজ (idb ২৮-সহ) · worker redeployed ✅ (c1ac8fd, dispatch success)।
- **v192 (মালিক-রিপোর্ট: ফোনে এখনো হেল্প-ওভারলে):** আসল-কারণ — `premium-auth.js?v=p3-auth-guest-v177` ক্যাশ-কী
  v177-থেকে অপরিবর্তিত → পুরনো (বাটন-সহ) ফাইল SW-ক্যাশ থেকে সেবা হচ্ছিল। ফিক্স: সব `p3-auth-*` query v192 +
  sw APP_SHELL + BUILD_ID `v192-gfix-20260906` (নতুন ক্যাশ-নেমস্পেস → activate-এ পুরনো-ক্যাশ পার্জ; clients.claim)।
  লাইভ: pages.dev+github.io v192 ✓ · premium-auth.js?v=v192 → বাটন ০ ✓ · CI ৩/৩ ✓ · ১১/১১ স্যুট ✓।
  **মালিক-পক্ষে:** ২-৩ বার রিফ্রেশ/অ্যাপ-রিওপেন (SW আপডেট-চক্র) — এরপর ওভারলে আর আসবে না।
- **v193 (P08-সমাপ্তি):** state-preservation — `applyExamBackup()` (emergency sessionStorage-snapshot →
  resume-merge, id-মিল; boot + resumeActiveExam) · `pagehide`/hidden → `flushExamPersist()`-চেষ্টা + backup ·
  `performance-hardening.js?v=1→?v=2` (ক্যাশ-কী) · sw `v193-gfix-20260906`। নতুন `p08-state-preserve` ২৪-অ্যাসার্ট;
  **১২/১২ স্যুট সবুজ**। বিস্তার: `docs/P08-AC125-STATE-PRESERVE.md`।
- **P08 এখন পূর্ণ:** AC1 রিফ্রেশ-রিকভারি ✓ · AC2 প্রতি-উত্তর অটো-সেভ ✓ · AC3 টাইমার-অটো-সাবমিট ✓ ·
  AC4 নেটওয়ার্ক-ফেল (local-first+retry) ✓ · AC5 state-tests ✓ — মালিক-ব্যবহার-ভেরিফাই বাকি।

- **P08-auth-merge (মালিক-রিপোর্ট):** একদম-নতুন-ইমেইলে OTP-পথ লাইভ-প্রুবে কাজ-করা সত্ত্বেও "আগে Google-লগইন" দেখানো —
  কারণ ওই ইমেইলে আগের Google-পরীক্ষায় google-only রেকর্ড (password-নেই)। ফিক্স: register-email-এ google/passkey-মাত্র
  → 409-না, OTP-মার্জ (verify-তে providers merge: email+password+google), password-আছে-এ 409-অক্ষত; ৩-কপি
  (worker-bundle.mjs ডিপ্লয় + public-worker.js demo+hub)। নতুন `p08-auth-otp-merge` ১৬-অ্যাসার্ট; **১৩/১৩ স্যুট সবুজ।**
  বিস্তার: `docs/P08-GOOGLE-OTP-MERGE-FIX.md`। **ডিপ্লয়: f35aa67 → Deploy Worker success ✅ (লাইভ-প্রোব pending:true/sent:true; Pages v193 অপরিবর্তিত; ১৩/১৩ স্যুট সবুজ)।**

- **🔒 AUTH-LOCK (মালিক-নির্দেশে):** লগইন-সিস্টেম আজীবন-লকড — নতুন `auth-lock.test.mjs` ২৩-অ্যাসার্টে
  A-G নিয়ম (হেল্প-পাবলিক-নয় · OTP-মার্জ-শাখা · ক্লায়েন্ট-ফলব্যাক · ক্যাশ-কী-মিল · সিক্রেট-নীতি ·
  auto-deploy · ক্লায়েন্ট-ID-config) আজীবন-বাঁধা; ভাঙলে টেস্ট-লাল। **১৪/১৪ স্যুট সবুজ, ১৯২+ অ্যাসার্ট।**
  লাইভ: worker sehat (config 200) + নতুন-ইমেইল-probe OTP-চালু + pages.dev/github.io v193 (হেল্প-বাটন 0)।
  বিস্তার: `docs/AUTH-LOCK-2026-09-06.md`।
- **মালিক-পক্ষে বাকি (শুধু ব্যবহার):** Google-লগইন/brand-নতুন-ইমেইল-OTP চেক; GCP-origin একবারই (দরকার-হলে)।
- **পরবর্তী (মালিক-সিদ্ধান্তে):** P10 Mistakes → P12 Vocabulary → P19-SEO-বাকি → P14 Security।

- **P10 MISTAKES (v194):** অডিটে ৯৫% আগে-থেকেই ছিল (Bank 2.0 + Smart Book + রেকর্ডিং); ডেল্টা ৩টি —
  setMistakeMastered টগল (✅ শিখে গেছি/↩️ আবার শিখি; mastered+revisionStatus+masteredAt),
  Needs-Review/Mastered ফিল্টার+কাউন্ট, MASTERED ব্যাজ। নতুন `p10-mistakes` ২৮-অ্যাসার্ট;
  **১৫/১৫ স্যুট সবুজ**। sw `v194-gfix-20260906`। বিস্তার: `docs/P10-MISTAKES.md`।

- **P11 DASHBOARD v2 (v195):** additive override — dashboard-v2.js/css (?v=dash2): ১৪ মডিউল (Header/Mission-63-100/Focus-Mode-★/Streak-৭দিন/Performance-Mastery-ring/Smart-Insight/Continuous-Learning/Command-Center/Performance-Graph-SVG/Weakness-Radar/Admission-Goal-Days-Left/90-Day-Roadmap/Study-Tools/Bottom-Nav-৬-ট্যাব-আই-চ্যাট); ডেটা সব CACHE-সত্য (শূন্য-অবস্থা সৎ), phase5-Intelligence সংরক্ষিত, পুরনো-ইঞ্জিন অক্ষত, dv2AllTools ১২-টুল no-loss।
  নতুন `p11-dashboard-v2` ৩৫-অ্যাসার্ট; **১৬/১৬ স্যুট সবুজ**। বিস্তার: `docs/P11-DASHBOARD-V2.md`।
