# P10 — MISTAKES (v194-gfix-20260906) — ডেল্টা-সম্পন্ন

**তারিখ:** ২০২৬-০৯-০৬ · commit `…` · স্বাক্ষর sw **v194-gfix-20260906**

## অডিট-ফল: ৯৫% আগে-থেকেই ছিল (কোড-প্রমাণ)
- **Mistake Bank 2.0** (`renderMistakes`): priority-র্যাঙ্কিং (wrong≥5/acc<50→high · ≥2/<75→medium · else low),
  ফিল্টার all/today/frequent/recent/critical/weak, per-card Wrong×/Attempts/Correct/Accuracy%,
  অ্যাকশন Review/Flash Test/Bookmark/Remove, Practice-My-Mistakes মোডাল (10/20/50/100)।
- **রেকর্ডিং-পথ:** exam-submit snapshot-wrong → enrichMistakeRecord (wrongCount++, revisionCount++, UNRESOLVED) ·
  explorer-প্র্যাকটিস · flash-পথ · Settings-এ Delete Mistakes।
- **Smart Mistake Book** (mistake-analysis.js, লোডেড `?v=gemini-v4-0816`): Result→Analysis→ভুল-খাতা
  (localStorage notebook), `window.MA` publicApi, toAgentPayload; mistnote-icon ইন্টিগ্রেশন।
- Dashboard ❌ Mistakes-টাইল + Smart-recommendations (দুর্বল-টপিক) + exam-setup source 'wrong'।

## v194-ডেল্টা (অনুপস্থিত ৩টি)
1. **setMistakeMastered(qid,val)** — "✅ শিখে গেছি" / "↩️ আবার শিখি" টগল: m.mastered, revisionStatus
   (mastered/pending), masteredAt, dbPut+CACHE-refresh+toast+render — Remove-র বিকল্প (ইতিহাস-রক্ষা)।
2. **ফিল্টার + কাউন্ট:** চিপ Needs Review/Mastered + টার্নারি-লজিক + হেডারে "X mistakes · Y pending · Z mastered"।
3. **MASTERED ব্যাজ:** card-এ mint-pill (priority-pill-এর পাশে)।

## টেস্ট
- নতুন `p10-mistakes.test.mjs` — **২৮ অ্যাসার্ট, সবুজ** (v194-ডেল্টা ৮ + Bank-2.0-কোর ১১ + রেকর্ডিং ৪ + Smart-Book ৫ + ভার্সন ২)।
- **১৫/১৫ স্যুট সবুজ** (সব আগের লক-সহ: auth-lock ২৩, AC3 ২৩, state ২৪, otp-merge ১৬, idb ২৮, phase5 ৩৭…)।
- jsdom inline-পার্স OK ✓।

## ডিপ্লয়
- push → pages.dev+github.io auto (v194; নতুন ক্যাশ-নেমস্পেস → পুরনো পার্জ)।
- মালিক-ব্যবহার: Mistake Bank → কোনো card-এ "✅ শিখে গেছি" → Mastered-ফিল্টার/কাউন্ট → রিফ্রেশ-পর অক্ষত।
