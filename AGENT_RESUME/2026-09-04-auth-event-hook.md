# 2026-09-04 — Auth-event counter hook (`adm-events:*`) [AC-4]

## কী হলো
Public Worker-এ **additive, non-breaking** ইভেন্ট-কাউন্টার যোগ হলো — Admin Center-এর auth-dashboard (AC-4) এই কাউন্টার পড়ে। মূল auth-লজিক **এক ফোঁটা বদলায়নি**।

## হুক-বিন্দু (৬ পথ, ১১ call-site)
- `authLogin`: login-ratelimit · login-fail (না-পাওয়া + ভুল-পাসওয়ার্ড) · login-blocked
- `otpVerify`: otp-ratelimit · otp-fail
- `authRegisterEmail` + `authRegister`: reg-ratelimit
- `pkLoginFinish`: pk-fail (চ্যালেঞ্জ-শেষ + যাচাই-ব্যর্থ + catch)

## কীভাবে লেখে
`adm-events:<ev>:<YYYY-MM-DD>` → `Number(get)+1` → put (expirationTtl 172800 = ২ দিন)। সম্পূর্ণ try/catch-নিরাপদ — কখনো মূল-রুট আটকায় না।

## গুরুত্বপূর্ণ নোট (ভবিষ্যৎ-এজেন্টদের)
- **লাইভ আর্টিফ্যাক্ট = `worker-bundle.mjs`** — এই repo-র `public-worker.js` সোর্সের সাথে পাঠ্য-স্তরে মেলে **না** (unicode-escape, ভিন্ন মেসেজ; আগের সেশন থেকে drift)। তাই হুক **উভয় জায়গায়** বসানো হয়েছে; `worker-bundle.mjs`-এ **সার্জিকাল-প্যাচ** (রিবিল্ড নয় — রিবিল্ড ১২KB-ডিভার্জেন্স আনত)।
- esbuild-রিবিল্ড করার আগে **আগের বান্ডেলের সেটিংস/সোর্স-মিল যাচাই করো**।
- CI: `auth-guard.yml` (push) + `main.yml` (workflow_dispatch deploy) — 2026-09-04 dispatch-ডিপ্লয় success।

## ম্যাট্রিক্স (২০২৬-০৯-০৪)
- `AUTH_ENDPOINTS_GUARD` ✓ · `auth-ux` ✓ (৩৪) · `nosplash` ✓ · `session-survive` ✓ · `ai-phase4` ✓ (৩৬)
- `intro.test` ✗ — **প্রাক-বিদ্যমান** (stash-এও ব্যর্থ; FULL-3D prefill absent) — `B-INTRO3D` (Admin bug-সিডে রেকর্ডড)

## লাইভ-প্রমাণ
ভুল-লগইন প্রোব → `{"error":"ইমেইল/মোবাইল বা পাসওয়ার্ড ভুল"} [401]` → KV `adm-events:login-fail:2026-09-04` = **1** ✓
