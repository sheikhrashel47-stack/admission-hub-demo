# 2026-09-01 — 10-Screen Onboarding Flow + 3D Logo Splash → Dashboard

**এজেন্ট:** জুজু · **Repo:** admission-hub-demo (Public)

## ✅ যা করা হলো (user-এর নির্দেশ)
1. **অ্যাকাউন্ট খোলা/verify শেষে সরাসরি dashboard নয়** — প্রথমে **১০ স্ক্রিন onboarding** (user-এর দেওয়া Screen 01–10 স্পেসিফিকেশন অনুযায়ী):
   - 1 Welcome ("তোমার স্বপ্নের অ্যাডমিশনের যাত্রা শুরু হোক আজই" + 3D সিন + particles)
   - 2 Goal Selection (৫ অপশন, টিক-পপ)
   - 3 University Selection (search + SVG লোগো)
   - 4 Unit Selection
   - 5 Study Goal (৪ অপশন)
   - 6 Current Level (gauge + weak subjects)
   - 7 Study Habit (ঘণ্টা/দিন/সময়)
   - 8 Almost Done (cinematic "আর একটু…")
   - 9 Building Plan (progress stages + 3D loader)
   - 10 Ready Dashboard (greeting + target + sections)
2. **প্রগ্রেস ডট ১০টা** (TOTAL 9→10) — ১০ স্ক্রিনের সূচক
3. **3D লোগো লোডিং স্প্ল্যাশ** (finish-এ): onboarding শেষ → `#ahSplash` fullscreen 3D loader ("ADMISSION HUB · তোমার ড্যাশবোর্ড তৈরি হচ্ছে…", ১.৬s) → **dashboard**
4. Returning user: login → onboarding completed? dashboard : **যে step থেকে resume**

## 📂 বদলানো ফাইল
| ফাইল | বদল |
|---|---|
| `onboarding.js` | TOTAL=10, finish→splash→dashboard, showSplash/hideSplash |
| `3d-loader.css` | `.ah-splash` fullscreen splash + `.ah3d-lg` |

## 📌 বর্তমান অবস্থা
- Flow: auth → ১০ স্ক্রিন onboarding → 3D splash → dashboard ✅
- Design: Glass Daylight (light) + 3D + ইউনিভার্সিটি লোগো + গেম সিলেকশন

## ⏭️ পরবর্তী কাজ
- মোবাইল QA, `PHASE 3 APPROVED` পেলে Phase 4

## 🚨 STOP / সতর্কতা
- `PHASE 3 APPROVED` ছাড়া Phase 4 না
- টোকেন/সিক্রেট resume-তে নয়
