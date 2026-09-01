# 📍 LATEST — Admission Hub (Public) · সর্বশেষ অবস্থা

**আপডেট:** 2026-09-01 · **এজেন্ট:** জুজু
> নতুন এজেন্ট: প্রথমে এটা পড়ো, তারপর `AGENT_RESUME/`-এর সবচেয়ে নতুন ডেটেড resume।

---

## 🎯 প্রজেক্ট

**Admission Hub** — বাংলাদেশের ভর্তি পরীক্ষার প্রস্তুতির বাংলা PWA। এই repo = **পাবলিক প্রোডাক্ট** (auth + onboarding + content), কন্ট্রোল (ব্যাকএন্ড/মালিক অ্যাপ) = `admission-hub` repo।

| | পাবলিক (এটা) | কন্ট্রোল |
|---|---|---|
| Repo | `admission-hub-demo` | `admission-hub` |
| Live | https://sheikhrashel47-stack.github.io/admission-hub-demo/ | https://sheikhrashel47-stack.github.io/admission-hub/ |

---

## 📌 বর্তমান অবস্থা

- **HEAD:** `d977a11` (Phase 6 personalized onboarding after auth, persisted per user) — main, pushed
- **Phase 1** Exact Clone — frozen (রিডিজাইন করো না)
- **Phase 2** Central cloud content — live
- **Phase 3** auth — **live** (workers deployed): config `google + passkey + email` (sms false)
- **Phase 6** onboarding — **live** (auth-এর পরে `#ahOnboardGate`, per-user persisted, ৯ ধাপ)
- **🛑 STOP:** `PHASE 3 APPROVED` না বলা পর্যন্ত **Phase 4 শুরু করবে না**
- Demo SW: `v158-mail-reset-20260901` / auth UI `p3-auth-ui-v24`
- Onboarding catalog: ডেমোতে `onboarding.js`-এ `FALLBACK_UNI` + worker-এ catalog

## ⚠️ পেন্ডিং / জানা ঝুলন্ত কাজ (এই repo)

1. **`auth-options/` — ৩৮টা AI-জেনারেটেড ছবি (bg-*, welcome-*, option-*, pro-*, langcat-*, np-*, demo-*), আনট্র্যাকড, কোডে কোথাও reference নেই** — আগের এজেন্ট auth screen-এর ভিজ্যুয়াল অপশন হিসেবে বানাচ্ছিল; কী করতে হবে ঠিক হয়নি।
2. **`brand/` (লোগো) + নতুন আইকন** (icon-192/512 আপডেট, icon-1024, apple-touch-icon) — আনট্র্যাকড; manifest/index.html-এ ঠিকমতো বসানো হয়নি (manifest-এ এখনো শুধু icon-192 + icon-512)।
3. Gmail "Send-as" নাম এখনো `mahmudrashel1034`-এ সেট করতে হবে (user-এর কাজ)।

## 🔑 Auth ফ্লো (Phase 3, locked)

- Welcome: Glass Daylight, English/বাংলা toggle → clean letter typing
- Signup: Full Name + DOB + School/College (optional) → Continue; Google আলাদা button
- Verify: **Email verification link** অথবা **Passkey** (native Face ID/Touch ID/PIN); Google = verified
- OTP product path বাদ (legacy `/otp/*` worker route আছে)
- Bottom nav: Home · Bank · Exam · History · Profile (floating M নাই)
- Backend: `admission-gk` worker → `/pub/*` → `public-worker.js` (`/api/auth/*`, `/api/onboarding/*`, `/api/profile/*`, `/api/state`, `/api/ai`, `/api/admin/*`)

## ☁️ Backend

- Main worker: `admission-gk.rashelzayan213.workers.dev` (`/pub/health`, `/pub/auth/config` live)
- Worker modules: `gk-agent-worker.js` (main) + `public-worker.js`
- KV: GK `b9353515b098427687afcfb8654ed359` · PUB `942828aa82e546d4af11796ef92ab134`
- MAIL_HOOK = Gmail Apps Script (plain Gmail draft send, secret `AdmissionHubMail1`, spam-safe)
- Sealed secrets (worker-এ): RESEND_KEY/_2, GOOGLE_CLIENT_ID, MAIL_FROM, MAIL_HOOK, MAIL_HOOK_SECRET, ADMIN_TOKEN, GEMINI_KEYS...

## ⏭️ পরবর্তী কাজ (প্রস্তাবিত)

1. Pending stuff ঠিক করা: `auth-options/` ছবির সিদ্ধান্ত, `brand/`+icons manifest-এ বসানো
2. User `PHASE 3 APPROVED` বললে **Phase 4** (Connected Lexicon + Smart Memorizing Center — কন্ট্রোল repo-র `phase345.patch.js` blueprint)
