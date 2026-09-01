# 📍 LATEST — Admission Hub (Public) · সর্বশেষ অবস্থা

**আপডেট:** 2026-09-01 (Email fix + Glass design + 3D loader) · **এজেন্ট:** জুজু
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

- **Onboarding v3 (Glass Daylight)** — ছবির মতো light glass + 3D সিন + গেম সিলেকশন + ইউনিভার্সিটি লোগো
- **3D Loading System** — boot/verify/plan-এ pure-CSS 3D emerald loader (`3d-loader.css`)
- **Email verify fix** — MAIL_HOOK body-check, লিংক মেয়াদ ১৫ মিনিট, countdown 15:00
- **Same-Browser Verify** — live-ready: একই ব্রাউজারে verify = সরাসরি প্রবেশ (কোনো বার্তা নয়); ভিন্ন ব্রাউজার = শুধু তখনই বার্তা
- **Loading অপ্টিমাইজড** — ১৫টা ভারী script defer (parse-ব্লকিং ~৩MB কম)
- **Worker deployed:** `admission-gk` Version `4186759c` (wrangler, ১৩ সিক্রেট intact) — `/pub/health` ✅
- Phase 1 frozen · Phase 2 live · Phase 3 auth live (google+passkey+email) · Phase 6 onboarding live
- **🛑 STOP:** `PHASE 3 APPROVED` না বলা পর্যন্ত **Phase 4 শুরু করবে না**

## ⚠️ পেন্ডিং / জানা ঝুলন্ত কাজ (এই repo)

1. **`auth-options/` — ৩৮টা AI ছবি, আনট্র্যাকড, কোডে ব্যবহার হয়নি** — সিদ্ধান্ত নিতে হবে
2. **`brand/` + নতুন আইকন** (icon-1024, apple-touch-icon) — manifest/index.html-এ বসানো হয়নি
3. Gmail "Send-as" নাম `mahmudrashel1034`-এ সেট (user-এর কাজ)
4. নতুন ডিজাইন + verify ফ্লো লাইভ QA (মোবাইলে)

## 🔑 Auth ফ্লো (Phase 3, locked)

- Welcome: Glass Daylight, English/বাংলা toggle
- Signup: Full Name + DOB + School/College (optional) → Continue; Google আলাদা
- Verify: Email link অথবা Passkey; Google = verified
- **Same-browser verify:** সাইনআপে `ahWaitId` localStorage → লিংক ক্লিকে অ্যাপ `?verified=1&w=` → একই browser = অটো-প্রবেশ, ভিন্ন = বার্তা
- Bottom nav: Home · Bank · Exam · History · Profile
- Backend: `admission-gk` → `/pub/*` → `public-worker.js`

## ☁️ Backend

- Main worker: `admission-gk.rashelzayan213.workers.dev` (Version `679b071b`, wrangler-deployed)
- Modules: `gk-agent-worker.js` + `public-worker.js` · KV: GK `b9353515b098427687afcfb8654ed359` · PUB `942828aa82e546d4af11796ef92ab134`
- Secrets (১৩টা, intact): ADMIN_TOKEN, ASK_API_KEY, BROWSER_USE_API_KEYS, GEMINI_KEYS, GOOGLE_CLIENT_ID/_SECRET, MAIL_FROM, MAIL_HOOK, MAIL_HOOK_SECRET, RESEND_KEY/_2, TG_BOT_TOKEN, TG_CHAT_ID
- **⚠️ Worker redeploy:** CF API PUT-এ secret text value লাগে (ভ্যালু জানা নেই) — **wrangler দিয়ে deploy করলে সিক্রেট অটো থাকে** (গতবার এভাবেই হয়েছে)

## ⏭️ পরবর্তী কাজ (প্রস্তাবিত)

1. কন্ট্রোল repo commit+push (public-worker.js সিঙ্ক + resume) — GitHub-কে deployed state-এর সাথে মেলানো
2. Live QA: onboarding v2 + same-browser verify (মোবাইল)
3. `auth-options/` ছবি + icon manifest ঠিক করা
4. `PHASE 3 APPROVED` পেলে Phase 4 (Connected Lexicon + Smart Memorizing)
