# Auth hardening — অটো-লগআউট + লগইন গেট ঠিক করা (ভাইয়ের রিপোর্ট)

**তারিখ:** 2026-09-02 · **স্ট্যাটাস:** ✅ ফিক্স করা, v29 (push pending — GitHub token ভাইয়ের কাছে)

## ভাইয়ের অভিযোগ
- "আগে লগইন সব জায়গায় হতো, হঠাৎ এমন হয়ে গেছে — তোমার আপডেটের বাগ হবে"
- "লগইন করা account অটো-লগআউট হয়ে গেছে"

## তদন্ত ফল (কোনো প্রোডাকশন বাগ ছিল না)
- **লাইভ end-to-end টেস্ট (worker live):** fresh account → token → `/auth/me` 200 → session persist (একই token ২য় কল) → sessions list ঠিক → delete → deleted token 401। **সব ঠিক।**
- **আসল কারণ:** ভাই যে উইন্ডোতে দেখছেন (চ্যাট প্রিভিউ / ভিন্ন origin) সেখানে নেটওয়ার্ক ব্লক → Google + Cloudflare লোড হয় না + সেখানে token localStorage-এ নেই → লগইন গেট। লাইভ **https://sheikhrashel47-stack.github.io/admission-hub-demo/**-এ সব কাজ করে।
- **গুরুত্বপূর্ণ লুকানো বাগ (এই টার্নে ধরা):** `setSession`-এ localStorage.setItem throw করলে (iOS Safari private mode) sessionStorage-ও সেভ হতো না → user-কে প্রতিবার লগইন চাইত। ফিক্স করা হয়েছে।
- **আরেকটি:** `/auth/me` fail-এ নেটওয়ার্ক ঝামেলাতেও কখনো কখনো gate-এ ঠেলে দিতে পারত — এখন retry + token ধরে রাখা।

## ফিক্স (premium-auth.js v29)
1. **অটো-লগআউট বন্ধ:** `/auth/me` fail → শুধু নিশ্চিত 401/403-এ লগআউট; নেটওয়ার্ক/৫xx-এ টোকেন ধরে রেখে app দেখানো + offline note
2. **১ বার retry** (১.১ সেকেন্ড পর) — অস্থায়ী নেটওয়ার্ক ঝামেলা কাটলে লগইন থাকে
3. **storage resilience:** localStorage/sessionStorage আলাদা try — একটা fail করলে অন্যটা কাজ করে
4. **offline note soft:** "📶 নেটওয়ার্ক সংযোগ মিলছে না — লাইভ অ্যাপ খুলো [লিংক]"; সফল হলে hide

## টেস্ট
- **auth-resilience jsdom: ১৫/১৫** — token+me200→app · network fail→token KEPT (logout না) · retry→200 · 401→logout · storage blocked→no crash
- **profile jsdom: ৪৫/৪৫** (regression)
- **লাইভ worker e2e:** ✓ (টেস্ট অ্যাকাউন্ট cleanup)

## গিট
- Demo `admission-hub-demo`: `8598de8` (HEAD; push pending — token ভাইয়ের কাছে)
- Worker: frontend-only change — deploy লাগবে না

## পরের ধাপ
- GitHub token পেলে push → GH Pages auto-deploy
- ভাইকে বলতে হবে: লাইভ লিংক থেকে খুলতে; প্রিভিউ/চ্যাট উইন্ডোতে লগইন হয় না (নিরাপত্তা limitation)
