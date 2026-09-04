# PHASE 04 — PERSONAL CLOUD DATA ENGINE · সম্পন্ন-রিপোর্ট
> বৈধ: ২০২৬-০৯-০৪

## আর্কিটেকচার (লাইভ)
- **উৎস-অবস্থা:** প্রতিটি ইউজারের ব্যক্তিগত স্টোর (IndexedDB) → `collectPersonal()` → `POST /api/state` → `ustate:<uid>` (KV) · পুনরুদ্ধার: `GET /api/state` → `applyPersonal()`
- **আইসোলেশন:** `user:<uid>` / `tok:<token>` / `sess:<uid>` / `ustate:<uid>` — সব কী ইউজার-নির্দিষ্ট; User A↛B (B-GUESTISO রিজলভড + টোকেন-বাউন্ডারি)

## এ-ফেজে যা বন্ধ হলো (গ্যাপ-ক্লোজ)
1. **কভারেজ-পূর্ণতা:** ব্যক্তিগত-সিঙ্ক-তালিকা ৬ → **৯ স্টোর** — যোগ: `admissionPlans` (রুটিন-প্ল্যান), `planDays` (দৈনিক-স্লট), `deletedQuestions` (লুকানো-প্রশ্ন-পছন্দ) — সার্ভার `PERSONAL_KEYS`-এও (public-worker + bundle সামঞ্জস্য)
2. **Conflict-free merging (মাল্টি-ডিভাইস):** `applyPersonal`-এ `dbClear`+ওভাররাইট **বাতিল** → `mergeRows(local, remote)`: per-id **সর্বশেষ-সময় জেতে** (`updatedAt||at||ts||date`), স্বতন্ত্র-id ঐক্যবদ্ধ, খালি-পক্ষ কখনো মুছে না (data-loss শূন্য); `settings`-এ গভীর-মার্জ (theme-জাতীয় ক্লায়েন্ট-প্রেফারেন্স সংরক্ষিত)
   - টেস্ট-প্রমাণ: নতুন-সময় জেতে / স্থানীয়-নতুন অক্ষত / id-ঐক্যবদ্ধ / খালি-পক্ষ-নিরাপদ — ১৬-অ্যাসার্ট `phase4-core.test.mjs`
3. **Export (GDPR-ধাঁচ):** সার্ভার `/api/export` (ইতিমধ্যে) + **ক্লায়েন্ট "ডেটা ডাউনলোড"** বাটন → `admission-hub-my-data-<তারিখ>.json` (অ্যাকাউন্ট + ustate + সেশন + কার্যকলাপ)
4. **সিঙ্ক-স্ট্যাটাস UI:** অ্যাকাউন্ট-কার্ডে "☁️ শেষ সিঙ্ক: …" / "⚠️ সিঙ্ক-সমস্যা" — ইউজার জানবে ডেটা ক্লাউডে গেছে কি না
5. **ডেটা-শ্রেণিবিভাগ-স্পষ্টতা (D-P04-1/D-P04-2):**
   - `vocabulary`/`vocabularyMaster`/`subjects`/`topics`/`questions`/`exams` = **গ্লোবাল-কন্টেন্ট** (cloud-content-sync লেখে) — ক্লায়েন্ট-পুশ-তালিকায় নয়
   - সার্ভার-পাশে `vocabulary` পাস-থ্রু (ai-phase4-লক: AI-মেমোরির জন্য সমর্থিত); ডাবল-লেখা নেই কারণ ক্লায়েন্ট পাঠায় না

## উল্লেখ্য-পুরনো ক্ষমতা (যুক্ত-নয়, যাচাইকৃত)
- সেশন-তালিকা/listSessions + revoke · delete-এন্ডপয়েন্ট (অ্যাকাউন্ট+উপাত্ত মুছে) · admin মডারেশন · ৯০-সেকেন্ড অটো-পুশ + ৬০-সেকেন্ড pull

## যাচাই
GUARD ✓ · auth-ux 33 · nosplash 16 · session-survive 12 · ai-phase4 35 · phase23-core 13 · **phase4-core 16** — মোট ১২৫+ অ্যাসার্ট; sw `v183-kvfix-20260904`
