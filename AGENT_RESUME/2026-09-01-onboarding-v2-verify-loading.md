# 2026-09-01 — Onboarding v2 (Premium Game Style) + Same-Browser Verify + Fast Loading

**এজেন্ট:** জুজু · **Repo:** admission-hub-demo (Public)

---

## 🎯 কী করা হলো (user-এর নির্দেশে)

### ১. Onboarding সম্পূর্ণ নতুন প্রিমিয়াম গেম-স্টাইল ডিজাইন (Phase 6 v2)
- **`onboarding.css`** — সম্পূর্ণ rewrite: emerald 3D থিম, glassmorphism, গেম-স্টাইল সিলেকশন কার্ড
  - নির্বাচিত হলে **পপ-টিক ইফেক্ট** (`✓` pop), গ্লো, লিফট
  - প্রোগ্রেস ডট অ্যানিমেটেড, screen-এ entrance transition (fade+slide)
  - **৩D সিন**: CSS 3D গ্র্যাজুয়েশন ক্যাপ, ভাসমান বই, কয়েন, রিং, পার্টিকেল রেইন — কোনো stock image নেই, pure CSS/SVG
  - Level gauge: অ্যানিমেটেড gradient arc (mint→gold) + live update
  - Plan stepper: দ্রুত অ্যানিমেটেড চেকমার্ক (total ~১.২s)
  - `prefers-reduced-motion` সম্মানিত
- **`onboarding.js`** — আপগ্রেড:
  - **ইউনিভার্সিটি লোগো বেজ**: ৬টা বিশ্ববিদ্যালয়ের (DU/CU/RU/JU/KU/CoU/Other) ব্র্যান্ড-কালার SVG এমব্লেম (original design, কপি নয়)
  - সব সিলেকশন কার্ডে টিক + সিলেক্টেড ইউনিভার্সিটি ব্যাজ (step 4/10-এ)
  - Ready dashboard: সাকসেস বুর্স্ট 🎓 + টার্গেট কার্ড (লোগো সহ) + ফোকাস/অগ্রগতি/প্রস্তুতি অবস্থা কার্ড
  - Plan অ্যানিমেশন দ্রুত করা (২৮০→১২০ms)
- **ডিজাইন রুল** (user-এর Phase 6 scope অনুযায়ী): interactive + game system + animation + selection, ৩D, ইউনিভার্সিটি লোগো, premium emerald — সব মেনে

### ২. Gmail Verification — Same-Browser স্মার্ট ফ্লো
- **`public-worker.js`** (demo + control + **worker-এ deployed**):
  - `completeVerify` এখন `waitId` রিটার্ন করে
  - `authConfirm` সফল হলে static "return to device" পেজের বদলে **302 redirect** → `https://sheikhrashel47-stack.github.io/admission-hub-demo/?verified=1&w=<waitId>`
  - অ্যাপ নিজেই ঠিক করে: একই ব্রাউজার নাকি ভিন্ন
- **`premium-auth.js`**:
  - সাইনআপে `ahWaitId` localStorage-এ সেভ (same-browser মার্কার, tab-এর ভেতরে থাকে)
  - `handleVerifyReturn()`: `?verified=1&w=` দেখলে —
    - **একই browser** → কোনো বার্তা নয়, সরাসরি অটো-প্রবেশ ("যাচাই সম্পন্ন — প্রবেশ করা হচ্ছে…")
    - **ভিন্ন browser** → শুধু তখনই বার্তা: "যে ডিভাইসে খুলেছিলে সেখানে ফিরে যাও" + লগইন বাটন (`crossbrowser` view)
- **Worker deploy:** wrangler দিয়ে `admission-gk` আপডেট (Version `679b071b`) — **সব ১৩টা সিক্রেট intact** ✅

### ৩. Loading অপ্টিমাইজেশন (dashboard দ্রুত)
- **`index.html`**: ১৫টা ভারী/route-specific script-এ `defer` যোগ (app-seed 1.4MB, result-analysis-500 650KB, vocabulary-master, study-ai, course-sandhi-data, one-time-mock, gk-agent, bug-agent, ai-explain, result-ai, memorizing-match, question-card-game, vocabulary-voice ইত্যাদি)
- Parse-ব্লকিং JS ~৩MB কমে — auth/onboarding gate instant দেখায়, dashboard দ্রুত আসে

## 📂 বদলানো ফাইল (demo)
| ফাইল | কী বদলালো |
|---|---|
| `onboarding.css` | সম্পূর্ণ নতুন প্রিমিয়াম ৩D গেম-স্টাইল ডিজাইন |
| `onboarding.js` | ইউনিভার্সিটি লোগো, টিক-সিলেকশন, ৩D সিন, দ্রুত প্ল্যান, ready বুর্স্ট |
| `premium-auth.js` | same-browser verify (ahWaitId + handleVerifyReturn + crossbrowser view) |
| `public-worker.js` | completeVerify→waitId, authConfirm→redirect |
| `index.html` | ১৫টা script-এ defer |

## ☁️ Worker (deployed)
- `admission-gk` — Version `679b071b` · modules: gk-agent-worker.js + public-worker.js · KV GK_KV/PUB_KV · ১৩ সিক্রেট intact
- `/pub/health` ✅ `/pub/auth/config` ✅ (google+passkey+email)

## 📌 বর্তমান অবস্থা
- HEAD (পর push-এ): demo + onboarding v2 + verify fix
- Phase 3 auth live · Phase 6 onboarding live (নতুন ডিজাইনে) · Phase 4 STOP-এ
- Pending: `auth-options/` ছবির সিদ্ধান্ত (আনট্র্যাকড), manifest-এ icon-1024/apple-touch-icon বসানো, কন্ট্রোল repo-র পেন্ডিং icons commit

## ⏭️ পরবর্তী কাজ
1. কন্ট্রোল repo commit+push (public-worker.js সিঙ্ক + resume)
2. Live QA: নতুন onboarding ফ্লো + same-browser verify টেস্ট
3. `auth-options/` ছবি ঠিক করা
4. `PHASE 3 APPROVED` পেলে Phase 4

## 🚨 STOP / সতর্কতা
- `PHASE 3 APPROVED` ছাড়া Phase 4 শুরু করবে না
- Worker redeploy: **সিক্রেট ভ্যালু জানা লাগে** (CF API PUT-এ secret text দরকার); wrangler দিয়ে deploy করলে সিক্রেট অটো থাকে
- টোকেন/সিক্রেট resume-তে কখনো নয়
