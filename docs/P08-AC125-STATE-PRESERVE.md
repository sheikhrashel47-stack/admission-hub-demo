# P08 · AC1/AC2/AC4/AC5 — state-preservation সম্পন্ন (v193-gfix-20260906)

**তারিখ:** ২০২৬-০৯-০৬ · commit `…` (pushed) · স্বাক্ষর sw **v193-gfix-20260906**

## অডিট-ফল (কোডে-ইতিমধ্যে-আছে + গ্যাপ)
- AC2 অটো-সেভ (performance-hardening.js): প্রতি-উত্তর tap → `queueExamPersist()` (180ms debounce → IDB `dbPut('exams')`)
  + `backupExamState()` (sessionStorage emergency-snapshot: selectedAnswers/currentIndex/timing/bookmarks/flags)।
- AC3 টাইমার-অটো-সাবমিট: v190-এ (p08-exam-ac3)।
- AC4 নেটওয়ার্ক-ফেল: পুরো exam-engine **local-first** — submit-পথে কোনো fetch/`/api/` নেই (টেস্ট-প্রুভড);
  IDB-ভুলে v190-র ব্যাকঅফ-রিট্রাই।

## এই-ভার্সনে-যোগ (২ গ্যাপ-ফিক্স)
1. **গ্যাপ-১ (AC1):** `readExamBackup()` লেখা ছিল, কোথাও পড়া হতো না → `applyExamBackup(exam)` যোগ:
   resume-পথে (boot `ActiveExam=applyExamBackup(resumable)` + `resumeActiveExam()`) emergency-snapshot
   IDB-copy-র সাথে merge (id-মিল হলে selectedAnswers/currentIndex/timing/bookmarks/flags/flashResults) —
   ট্যাব-বন্ধ/eviction-এ শেষ উত্তর হারানোর পথ নেই।
2. **গ্যাপ-২ (AC2-কঠোরীকরণ):** `pagehide`/`visibilitychange`(hidden) → এখন `flushExamPersist()`-ও চেষ্টা
   (IDB-তে দ্রুত-লিখন) + backup (আগের মতোই)।

## ক্যাশ-কী (v192-শিক্ষা-প্রয়োগ)
- `performance-hardening.js?v=1` → **`?v=2`** (index.html + sw.js APP_SHELL) — অপরিবর্তনীয়-query-জনিত
  stale-client-ক্যাশ আর হবে না।
- BUILD_ID `v193-gfix-20260906` (নতুন ক্যাশ-নেমস্পেস → activate-পার্জ)।

## টেস্ট
- **নতুন `p08-state-preserve.test.mjs` — ২৪ অ্যাসার্ট, সবুজ।**
- পুরো-স্যুট: **১২/১২ সবুজ** (GUARD · ai4 · auth-ux · idb28 · intro · nosplash · ac3-23 · state-24 ·
  phase23-13 · phase4-16 · phase5-37 · session)।
- node --check performance-hardening.js ✓ · jsdom inline-পার্স ✓।

## মালিক-ব্যবহার (AC-ভেরিফাই)
1. মক-টেস্ট শুরু → কিছু উত্তর দাও → **অ্যাপ সম্পূর্ণ বন্ধ/রিফ্রেশ** → আবার খোলো → Resume-প্রম্পট →
   Resume → **উত্তর+টাইমার অক্ষত**। ২. উত্তর দেওয়ার পর সঙ্গে সঙ্গে বন্ধ → আবার খোলো → শেষ-উত্তরও আছে।
