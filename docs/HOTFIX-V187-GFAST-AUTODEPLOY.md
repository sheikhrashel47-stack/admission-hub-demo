# HOTFIX D-V187 — Google-হেল্প-GUIDE + ব্রাউজার-ফার্স্ট Gemini + Pages-অটো-ডিপ্লয় (sw v187-fastai) · ২০২৬-০৯-০৫

## ১. 🔐 Google origin_mismatch (মালিক-স্ক্রিনশট: Access blocked / Error 400 origin_mismatch)
**কারণ:** `admissionhub.pages.dev` নতুন origin — Google OAuth Client-এর *Authorized JavaScript origins*-এ যোগ করা হয়নি (প্রথম-বার যে-কোনো নতুন ডোমেইনে ঘটে; `accounts.google.com/gsi/client`-এর জনy initTokenClient-পপআপে origin যাচাই হয়)।
**অ্যাপ-পাশে ফিক্স:** Google বোতামের নিচে "🤔 Google-তে সমস্যা? সমাধান দেখো" — ৪-ধাপ গাইড-ওভারলে (GCP → OAuth Client → Authorized JavaScript origins → https://admissionhub.pages.dev) + "ইমেইল দিয়ে ঢুকি" বাটন।
**মালিক-পাশে (একবারই):** console.cloud.google.com/apis/credentials → OAuth 2.0 Client IDs → Client `673030739375-...` → Edit → Authorized JavaScript origins-এ `https://admissionhub.pages.dev` যোগ → Save (২-৫ মিনিটে কার্যকর)। ততদিন ইমেইল-OTP/পাসকি কাজ করবেই।

## ২. ⚡ ব্রাউজার-ফার্স্ট Gemini (D-V187) — "কয়েক সেকেন্ডে উত্তর"
- `AH_AI.askLocal()`: ইউজারের নিজের Gemini key (`gemini_api_key` বা Study-AI-সেটিংসের key) → **সরাসরি ব্রাউজার থেকে** `gemini-3.1-flash-lite`/`gemini-3-flash-preview` (14s-abort, ৯০০ maxOutputTokens) — ক্লাউড-হপ ছাড়া
- `study-ai-tool` askFast: key থাকলে **আগে** askLocal (দ্রুত); ব্যর্থ/কী-না-থাকলে **সার্ভার-ফলব্যাক** (secure `/api/ai`)
- সিকিউরিটি অক্ষত: কোনো হার্ডকোড key নেই; key শুধু ইউজারের localStorage

## ৩. 🔁 GitHub→CF-Pages অটো-ডিপ্লয়
- `.github/workflows/cf-pages.yml`: `push main` (বা manual) → rsync-dist (docs/টেস্ট-বাদ) → `wrangler pages deploy dist --project-name admissionhub` — GitHub-সিক্রেট `CLOUDFLARE_API_TOKEN`+`CLOUDFLARE_ACCOUNT_ID` (main.yml-এরই)।
- এখন থেকে push দিলেই pages.dev নিজে আপডেট; ম্যানুয়াল-আপলোড আর দরকার নেই।

## যাচাই
idb-hardening **22/22** (D-V187-সেকশনসহ) · ai-phase4 35 · auth-ux 33 · nosplash 16 · GUARD ✓ · session 12 · phase23 13 · phase4 16 · phase5 37।
