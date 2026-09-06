# P08 · AC3 — টাইমার-শেষ অটো-সাবমিট হার্ডেনিং (v190-ac3-fix-20260906)

**তারিখ:** ২০২৬-০৯-০৬ · **commit:** `7ad06e9` (pushed+live) · **পূর্ববর্তী:** `d054f8f` v189-cloud-sync (মার্জ-রিবেস) · **স্বাক্ষর:** sw `v190-ac3-fix-20260906`

## সম্পন্ন (৫ গ্যাপ-ফিক্স, সব additive)

1. **থ্রটল-ট্যাব-প্রুফ টাইমার:** ব্যাকগ্রাউন্ড-ট্যাবে `setInterval` সাসপেন্ড হলেও এখন
   `scheduleExamExpiry()` exact-`endTime`-এ ব্যাকআপ-`setTimeout` রাখে + `visibilitychange`/
   `pageshow`/`focus`-এ সঙ্গে সঙ্গে `examTimerTick()` — টাইমার-শেষে জমা দেরি হবে না।
2. **submitExam fail-safe:** পুরো মূল-পথ `try`-তে; ব্যর্থ হলে `isSubmitting` আনলক +
   ব্যাকঅফ-রিট্রাই (১.৫সে × ২^n, সর্বোচ্চ ৩০সে, ৬-বার) + `examId`-গার্ড (নতুন পরীক্ষায়
   পুরনো-রিট্রাই জমা পড়বে না) + toast-নোটিশ "ফলাফল সেভ হয়নি — X সেকেন্ডে আবার চেষ্টা…"।
3. **timeExpired উত্তর-লক:** টাইমার-শূন্য হওয়া মাত্র ফ্ল্যাগ `timeExpired=true` →
   `selectMockAnswer`/`skipMock` আর উত্তর নেয় না (ম্যানুয়াল-সাবমিট বাদে)।
4. **boot-এ expired-সাবমিট try/catch:** রিফ্রেশ-পরে মেয়াদ-উত্তীর্ণ পরীক্ষা অটো-সাবমিট হয়;
   ভুল হলেও বুট-শেষ হবে না (পরবর্তী বুটে আবার চেষ্টা)।
5. **discardActiveExam-এ retry-টাইমার clear** — বাতিল-করা পরীক্ষার রিট্রাই আর চলবে না।

## ইতিমধ্যে-অক্ষত (অডিট-প্রমাণিত, কোড-অপরিবর্তিত)

- `submitExam(true)` কল টাইমার-লুপে `remaining<=0`-এ ও boot-এ `computeRemaining<=0`-এ।
- রিফ্রেশ/বন্ধ-রিকভারি: `checkResumableExam()` + Resume-মোডাল (বুট-পথ)।
- প্রতি-উত্তর অটো-সেভ: `selectMockAnswer`/`skipMock`/bookmark/flag-এ `queueExamPersist`/`dbPut('exams')`।

## টেস্ট

- `p08-exam-ac3.test.mjs` — নতুন, **২৩ অ্যাসার্ট, সবুজ**।
- পুরো-স্যুট: **১১/১১ সবুজ** (GUARD + ai4 + auth-ux + idb22 + intro-বুটশেল + nosplash + AC3-23 + phase23-13 + phase4-16 + phase5-37 + session)।
- `intro.test.mjs` হালনাগাদ: v176-ইনলাইন-3D-splash v178-nosplash-এ ইচ্ছাকৃত বাদ → এখন বুট-শেল-কন্ট্রাক্ট যাচাই (১২ অ্যাসার্ট)।
- GUARD-এ tag-তালিকায় `ac3` যোগ (additive)।
- inline-script jsdom-পার্স: SYNTAX-OK ✓

## মুলতুবি

- push (GitHub-অথ এই-সেশনে নেই) → auto-deploy → live-verify → মালিক-ব্যবহার → APPROVE।

## মার্জ-নোট (গুরুত্বপূর্ণ)
- push-এর সময় আবিষ্কার: remote-এ অন্য-সেশন **v189-ক্লাউড-সিঙ্ক** (`ae3d0b8`→`b5e9bc1`→`d054f8f`)
  ইতিমধ্যে ছিল (app-seed খালি, `/api/content`-সিঙ্ক, KV-ডেটা, Sync Now)। merge-base `73e4368`।
- সমাধান: আমার v189-ac3-commit-টি `d054f8f`-এর ওপরে **rebase** + ভার্সন **v190-ac3-fix-20260906**
  (ভার্সন-সংঘর্ষ এড়াতে; তাদের v189-gfix অক্ষত)। সংঘর্ষ শুধু sw.js BUILD_ID + index.html sw-marker।
- ১১/১১ স্যুট **মার্জ-পরবর্তী ট্রিতেও সবুজ** (ক্লাউড-সিঙ্কের খালি seed-সহ)।
