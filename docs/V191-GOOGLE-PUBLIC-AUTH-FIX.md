# v191-gfix-20260906 — Google-হেল্প পাবলিক-নয় + Google-অ্যাকাউন্ট সাইনআপ-ডেডএন্ড-ফিক্স

**তারিখ:** ২০২৬-০৯-০৬ · **মালিক-রিপোর্ট:** (১) লগইন/সাইনআপ স্ক্রিনে "Google লগইন — ৪ ধাপ" ডিবাগ-ওভারলে
সবার সামনে দেখা যাচ্ছে (Client-ID-সহ) — এটা পাবলিক-এ দেখানো ঠিক নয়। (২) নতুন Gmail দিয়ে সাইন-আপে
"এই ইমেইল দিয়ে আগেই অ্যাকাউন্ট খোলা হয়েছে — পাসওয়ার্ড দিয়ে লগইন করো" — কিন্তু Google-অ্যাকাউন্টে
পাসওয়ার্ডই নেই → ডেড-এন্ড।

## মূল কারণ (কোড-প্রমাণ)
- Google-লগইন (`authGoogle`) `status:'active'`, `providers:['google']` **পাসওয়ার্ড-ছাড়া** অ্যাকাউন্ট তৈরি করে।
- একই ইমেইলে `register-email` → `existing.status==='active'` → 409 "আগেই আছে" → ক্লায়েন্ট পাসওয়ার্ড-লগইনে পাঠায় → পাসওয়ার্ড নেই → আটকে যায়।

## ফিক্স
1. **পাবলিক-বাটন সরানো:** `#ahGoogleHelp` বাটন লগইন+সাইনআপ টেমপ্লেট থেকে বাদ (public UI-এ আর নেই)।
   গাইড-ওভারলে `showGoogleHelp()` আছে, `window.__ahShowGoogleHelp` দিয়ে কেবল owner-কনসোল/ডক-গাইড
   (docs/GOOGLE-LOGIN-MANUAL-GUIDE.md) থেকে খোলা যায়। Client-ID গোপন নয়, তবে ডিবাগ-কনটেন্ট পাবলিক-এ নয়।
2. **server (`register-email`) ৩-শাখা 409:**
   - `passHash` আছে → "আগেই আছে — পাসওয়ার্ড দিয়ে লগইন করো" (আগের-মতো)
   - `providers`-এ `google` + পাসওয়ার্ড-নেই → `code: 'provider_google'` → "Continue with Google" বাটন চাপো
   - না হলে → `code: 'provider_passkey'` → পাসকি দিয়ে লগইন
3. **client:** `api()`-এর error-এ `code` গেঁথে দেয় (data.code); `doSignup`-এর catch-এ
   `provider_google`/`provider_passkey` শাখা → লগইন স্ক্রিন + সঠিক বাংলা/ইংরেজি নোটিশ (পাসওয়ার্ড-চাওয়া বন্ধ)।
4. **ফাইল:** `worker-bundle.mjs` (ডিপ্লয়-এন্ট্রি, wrangler.toml main) + `public-worker.js` (demo) + `hub/public-worker.js` — তিন-কপি সমতুল্য।

## টেস্ট (১১/১১ সবুজ)
- idb-hardening **২৮** (নতুন ৬-অ্যাসার্ট: public-বাটন-নেই, __ahShowGoogleHelp, worker ৩-কোড, client-শাখা, api-code) ·
  GUARD ✓ (v191 tag gfix) · ai4 · auth-ux · intro · nosplash · p08-ac3 ২৩ · phase23 ১৩ · phase4 ১৬ · phase5 ৩৭ · session
- node --check: premium-auth.js ✓ · worker-bundle.mjs ✓ · public-worker.js ✓
- jsdom-full inline-পার্স ✓ (auth-ux runtime)

## ডিপ্লয়
- push → cf-pages.yml অটো (pages.dev+github.io → v191)
- **Deploy Worker** (main.yml, workflow_dispatch) ট্রিগার → admission-gk নতুন বান্ডল

## v192 — ক্যাশ-বাস্ট (আসল-কারণ-ফিক্স)
- **মালিক-রিপোর্ট:** deploy-এর পরও ফোনে হেল্প-ওভারলে। কারণ: `premium-auth.js?v=p3-auth-guest-v177` —
  asset-query v177-থেকে কখনো বদলায়নি → SW-ক্যাশ থেকে পুরনো ফাইল (বাটন-সহ) সেবা।
- **ফিক্স (commit 6b98301):** সব `p3-auth-*` query → v192 (premium-auth.js/css + auth-svg.js),
  sw.js APP_SHELL-এ একই, BUILD_ID → `v192-gfix-20260906` → নতুন ক্যাশ-নেমস্পেস, activate-এ পুরনো ক্যাশ পার্জ।
- **লাইভ:** pages.dev+github.io v192; premium-auth.js?v=v192 → বাটন ০; CI ৩/৩; ১১/১১ স্যুট।
