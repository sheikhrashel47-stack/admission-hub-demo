# PHASE 05 — AI CORE / AI BRAIN (একক গেটওয়ে + মডেল-রাউটার) · সম্পন্ন-রিপোর্ট
> বৈধ: ২০২৬-০৯-০৪ · sw `v184-aigw-20260904` · commit `4c7ea8f`

## আর্কিটেকচার (লাইভ-পথ: worker-bundle.mjs-এর ধনী aiCall)
- **একক এন্ট্রি:** ক্লায়েন্ট → `POST /api/ai` (শুধু Bearer-টোকেন; কোনো ইউজার-কী নেই) → `aiCall` → Google Gemini `:generateContent`
- **Model-Router:** `GEM_CHAIN = ["gemini-3-flash-preview", "gemini-3.1-flash-lite"]` (২-মডেল; ai-phase4-লক: `gemini-2.5-flash` নিষিদ্ধ) × `GEMINI_KEYS` (multi-key env, কমা-বিভক্ত) → **failover-chain** `aiChain(keys, chain, badSet)` — ক্রম সংরক্ষিত, আজ-মার্ক-করা combo বাদ
- **টোকেন-বাজেট:** `AI_BUDGET = { msgs: 24000, brain: 6000, perMsg: 4000 }`; `clipMessages` (শেষ-থেকে perMsg-cap + মোট-চর-সীমা), `fitText` (ব্রেইন ৬০০০-চর ক্যাপ)
- **Context Engine (৪-স্তর):** `aiBuildBrain(env, uid, kind, refs, lastTxt, C, st)` — SYSTEM→GLOBAL(pubContent)→USER(ustate: নাম/ফল/ভুল)→REQUEST (প্রশ্ন/শব্দ/পরীক্ষা-রেফ)

## এ-ফেজে যা বন্ধ হলো (গ্যাপ-ক্লোজ)
1. **Formal Gateway + Model-Router (①):** একক `/api/ai`-এ মডেল-অবস্ট্যাক-চেইন; ৪০১/৪০২/৪২৯/৫০০+ → `aibadMark` (কী+মডেল combo, TTL ২৪ঘ) → পরের রিকোয়েস্টে `aiChain` বাদ দেয় → অটো-failover
2. **Context Engine (②):** `aiBuildBrain` চার-স্তর (SYSTEM/গ্লোবাল/ইউজার/রিকোয়েস্ট) + `/ai`-এ মেমোরি-সমন্বয়; সাফল্য-পথে `achat:<uid>` ইতিহাস (ক্যাপ ৪০, প্রতিধ্বনি ২০) + `history` রেসপন্স
3. **Prompt-ভার্সন-ম্যানেজমেন্ট (③):** `PROMPT_V='p05-1'` — প্রতিটি AI-উত্তরে `pv:` ফিল্ড → ক্লায়েন্ট/ডিবাগ থেকে কোন প্রম্পট-সংস্করণ উত্তর দিল তা জানা যায়
4. **Token-অপটিমাইজেশন (④):** per-message ৪০০০-চর ক্যাপ · `aicache:<uid>:<kind>:<ref>:<lastTxt120>` TTL **৬০০s** (একই প্রশ্ন ১০ মিনিটে রি-কল নয় — কোস্ট-কন্ট্রোল) · ব্রেইন ৬০০০-চর · বার্তা-স্লাইস ৮
5. **Fallback + error-recovery (⑤):** timeout ৪৫s (ছবি ৬০s) · ৪২৯ → ৬৫০ms ব্যাকঅফ + `retryable: true` · ৫০২ → বাংলা-বার্তা + `retryable: true` · খালি-কী → ৫০৩ · রেট-লিমিট ১২/মিনিট (`ailim:<uid>:<minute>` TTL ১৫০)
6. **মেট্রিক (নতুন):** `aim:<model>:<date>` / `aim:total:<date>` / `aim:fail:<date>` (KV, TTL ২দিন) — কোন মডেল কতবার, মোট, ব্যর্থতা — admin-ড্যাশবোর্ড-ভবিষ্যৎ-ভিত্তি

## যাচাই
ai-phase4 **35/35** (ধনী-লক: achat/aicache 600s/rate 12/vision inline_data/aiBuildBrain/GEM_CHAIN-২-মডেল, 2.5-নিষেধ) · **phase5-core 30/30** (নতুন P05-স্যুট: aiChain-রাউটার, metKey/badKeyName, clipMessages/fitText, pv, ইন্টিগ্রেশন) · phase4-core 16 · phase23-core 13 · auth-ux 33 · nosplash 16 · session-survive 12 · GUARD ✓ · admin AC-3 **50/50** — মোট ২০০+ অ্যাসার্ট।

## ভবিষ্যৎ-রয়ে-যাওয়া (P06+ হাতে)
- সিক্রেট-রোটেশন-অটোমেশন (env-রিফ্রেশ; multi-key ইতিমধ্যে সমর্থিত — ক্লাউডফ্লেয়ার-সিক্রেট বদলালেই রোল হয়)
- টোকেন-কোষ্ট কাউন্টার-সূক্ষ্মায়ন (usage-মেটাডেটা-সংগ্রহ), P06-তে পার্সোনাল-টিউটর-স্তর (টিউটর-কনভারসেশন-মেমোরি)
