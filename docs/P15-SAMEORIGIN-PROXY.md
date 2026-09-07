# P15 — same-origin API প্রক্সি (Failed to fetch / Google-লগইন-স্থায়ী-সমাধান) (v199)

তারিখ: ২০২৬-০৯-০৭ · sw BUILD_ID: `v199-gfix-20260907`

## মালিক-রিপোর্ট
"লগইন এখনো সমস্যা করতেছে আর গুগল দিয়ে ও লগইন হচ্ছে না" — স্ক্রিনশট: ইমেইল-যাচাইকরণ-স্ক্রিনে **"Failed to fetch"** (কোড পাঠান-বাটনের নিচে)।

## মূল-কারণ (লাইভ-প্রমাণ-সহ)
- অ্যাপ-পেজ (`*.pages.dev`) ঠিকই লোড হচ্ছে — কিন্তু সমস্ত API-কল `https://admission-gk.admissionhub.workers.dev/*`-এ (আলাদা-হোস্ট) যায়।
- লাইভ-যাচাই: worker-নিজে সুস্থ (CORS `*`, `/api/auth/config`, error-পথ-সব ঠিক) → অর্থাৎ **ফোনের নেটওয়ার্ক-ই `workers.dev`-এ পৌঁছাতে পারছে না** (কিছু ISP/মোবাইল-নেটওয়ার্কে আলাদা-হোস্ট-ব্লক/স্লো-সাধারণ)।
- ফল: `fetch()` নেটওয়ার্ক-লেভেলে TypeError → "Failed to fetch" (ক্যানোনিকাল-ফলব্যাকও একই-নেটে ব্যর্থ) → ইমেইল-OTP + Google-লগইন (POST /auth/google) — **দুটোই** অচল; Google-পপআপ সফল হলেও টোকেন-বিনিময় ব্যর্থ → "কিছু বদলায় না"।

## সমাধান — same-origin প্রক্সি (একবারে CORS + হোস্ট-ব্লক দুটোই শেষ)
1. **`_worker.js`** (CF Pages Advanced Mode): `/* /api/* */` → মূল worker-এ প্রক্সি (প্যাথ+কোয়েরি+মেথড+বডি+হেডার অক্ষত); বাকি সব → `env.ASSETS.fetch` (static অক্ষত)। কোনো সিক্রেট নেই; প্রক্সি-ভাঙলে 502-JSON (হ্যাং নয়)।
2. **premium-auth.js**: `PUB = '/api'` (same-origin) — `api()`-এ **canonical ফলব্যাক অক্ষত** (নেটওয়ার্ক-ব্যর্থ/৪০১-৪০৪-public → `CANONICAL_WORKER + '/api'`; GUARD-লক অক্ষত)।
3. **cloud-content-sync.js**: `apiFetch()` same-origin-প্রথম + CANON ফলব্যাক (লগইন-পর ক্লাউড-সিঙ্ক এখন ফোন-নেটেও কাজ করবে)।
4. **onboarding.js**: `PUB='/api'` + `PUB_CANON` ফলব্যাক।
5. **ah-ai-client / ai-explain-tool / study-ai-tool / gk-agent-tool**: base same-origin (gk-agent-এর localStorage-override অক্ষত) — AI-টুলও ফোন-নেটে চলবে।
- ফল: **পেজ-যে-নেটে লোড হয় (=pages.dev), সেই-নেটে API-ও কাজ করবে** — আলাদা-হোস্ট-নির্ভরতা শূন্য; কোনো CORS-প্রিফ্লাইটও নেই।

## ভার্সন
- premium-auth.js `?v=p3-auth-guest-v199` (index + sw APP_SHELL); BUILD_ID/markers `v199-gfix-20260907`; সব-টেস্ট-সিঙ্ক।

## টেস্ট-প্রমাণ
- **নতুন `p15-sameorigin-proxy.test.mjs` — ১৫ অ্যাসার্ট** (_worker.js-অস্তিত্ব/প্রক্সি/ASSETS/নো-সিক্রেট · premium-auth same-origin+fallback+GUARD · sync/onboarding/AI-সব same-origin · v199-অখণ্ডতা · cf-pages.yml-এ _worker.js-বা-না)।
- **স্যুট ২০/২০ সবুজ**; inline ও সব-ফাইল node --check OK।

## লাইভ-ভেরিফাই (ডিপ্লয়-পর, সবচেয়ে-গুরুত্বপূর্ণ)
- `curl https://admissionhub.pages.dev/api/auth/config` → worker-JSON আসবে ⇔ `_worker.js` ডিপ্লয় হয়েছে (প্রক্সি-প্রমাণ)।
- `POST .../api/auth/otp/send`-ও same-origin-এ-দিয়ে কাজ করবে।
