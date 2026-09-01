# 2026-09-01 — Email Verify Fix + Glass Daylight Design + 3D Loading System

**এজেন্ট:** জুজু · **Repo:** admission-hub-demo (Public)

---

## 🎯 user-এর ৩টা অভিযোগের ফিক্স

### ১. ইমেইল ভেরিফিকেশন — ইউজারের কাছে পৌঁছাচ্ছে না
**root-cause বিশ্লেষণ:**
- MAIL_HOOK (Gmail Apps Script) worker-এ `ok` রিটার্ন করলেও Apps Script-এর **ভেতরে fail** হতে পারে — আগের কোড response body দেখত না, তাই `sent:true` ভুলভাবে দেখাত
- verify লিংকের মেয়াদ ছিল মাত্র **২ মিনিট** — user মেইল খুলতে দেরি করলেই expired

**ফিক্স (deployed):**
- `sendEmail()`: MAIL_HOOK-এর **response body parse** — `error/fail/invalid/denied` থাকলে fail ধরা পড়ে + বাংলা error message
- verify লিংক মেয়াদ **২ → ১৫ মিনিট** (worker `expiresIn:900`, KV `expirationTtl:900`, expiry check `900000ms`, মেইল text "fifteen minutes")
- frontend countdown **০২:০০ → ১৫:০০** (premium-auth.js)
- **Apps Script side-chack (user-কে করতে হবে):** "New version" deploy করা আছে কিনা, Gmail draft→send ঠিক আছে কিনা — resume-এ guide

### ২. ডিজাইন — ছবির মতো Light Glass (ছবি scan করে)
- ছবি analyze: dominant colors `(254,251,248)` — **light/সাদা glass ডিজাইন** (আমার আগের dark emerald ভুল ছিল)
- `onboarding.css` **সম্পূর্ণ rewrite → Glass Daylight**: সাদা-ক্রিম ব্যাকগ্রাউন্ড, semi-transparent white glass কার্ড (blur + soft emerald shadow), emerald accent, light 3D scene
- ৩D/অ্যানিমেশন/সিলেকশন (টিক-পপ) **থেকেই গেছে** — শুধু light premium
- Welcome = light glass (resume-এর "4 Glass Daylight" ধারা), emerald CTA

### ৩. 3D Loading System
- নতুন **`3d-loader.css`**: pure-CSS 3D emerald লোডার — ঘূর্ণায়মান রিং + 3D কিউব (tumble) + ভাসমান ডট + shimmer bar (কোনো image/lib নেই)
- **index.html**: অ্যাপ boot loading (`Preparing your study space…`) এ এখন 3D লোডার (`app-loading-mark`-এ `ah3d`)
- **premium-auth.js**: verify-এর "যাচাই সম্পন্ন — প্রবেশ করা হচ্ছে…" view-এ 3D লোডার
- **onboarding.js**: step 9 (প্ল্যান বিল্ডিং) -এ 3D লোডার
- `prefers-reduced-motion` সম্মানিত

## 📂 বদলানো ফাইল (demo)
| ফাইল | বদল |
|---|---|
| `public-worker.js` | sendEmail body-check + error, verify মেয়াদ ১৫ মিনিট (এবং কন্ট্রোল repo-তে sync) |
| `premium-auth.js` | countdown 15:00, verifying view-এ 3D loader |
| `onboarding.css` | **Glass Daylight** rewrite (light glass, emerald) |
| `onboarding.js` | step 9-এ 3D loader |
| `index.html` | 3d-loader.css link + boot loading-এ 3D loader |
| `3d-loader.css` | **নতুন** — 3D loading system |

## ☁️ Worker (deployed)
- `admission-gk` Version `4186759c` (wrangler) · ১৩ সিক্রেট intact · `/pub/health` ✅
- register-email টেস্ট: `sent:true` + `expiresIn:900` ✅

## 📌 বর্তমান অবস্থা
- Onboarding: Glass Daylight (light) + 3D scene + game selection
- 3D loading: boot + verify + plan building
- ইমেইল verify: ১৫ মিনিট, better error
- **Pending (user-এর কাজ):** Apps Script-এ New version + test mail; Gmail Send-as নাম

## ⏭️ পরবর্তী কাজ
1. Apps Script verify (user): `https://script.google.com` → project → Deploy → Manage deployments → **New version** → web app URL worker-এ MAIL_HOOK-এ আছে কিনা চেক
2. Live QA মোবাইলে
3. `PHASE 3 APPROVED` পেলে Phase 4

## 🚨 STOP / সতর্কতা
- `PHASE 3 APPROVED` ছাড়া Phase 4 না
- Worker redeploy: wrangler (সিক্রেট অটো থাকে)
- টোকেন/সিক্রেট resume-তে নয়
