# Signup OTP — লিংকের বদলে ৬-ডিজিট কোড (ইউজার নির্দেশ)

তারিখ: 2026-09-01 · commit ট্যাগ: otp-signup

## যা হলো
- ভাই বলেছেন: email verification-এ লিংকের বদলে OTP পাঠানো হোক।
- **Worker** (`public-worker.js`):
  - `/api/auth/register-email` + `/api/auth/register` → `issueVerifyLink` বাদ → `issueOtp(env, id, 'signup', ip)`; response `channel:'otp', expiresIn:120, wait:120`
  - `sendOtpMessage(env, destId, code, kind)` — kind অনুযায়ী subject (reset→Password Recovery, অন্যথা→Email Verification); OTP-র মেয়াদ টেক্সট ২ মিনিট (en+bn), লিংক হলে ১৫ মিনিট
  - OTP: ৬ ডিজিট, ২ মিনিট মেয়াদ, ১২s resend cooldown, ৫ বার ভুল → লক, rate-limit (otp/otp-id)
- **Frontend** (`premium-auth.js`):
  - `doSignup()` → `go('checkmail')` বাদ → `go('otp')`; `draft.purpose='signup'`, `draft.wait=120`, `draft.linkSec=120`
  - `resendVerifyLink()`-ও OTP-মোড
  - `persistWait()`-এর resume সময়সীমা ২ মিনিট (OTP মেয়াদ)
  - OTP স্ক্রিন আগে থেকেই ছিল (৬ বক্স, autofill, resend timer, countdown) — এখন signup-ও সেটা ব্যবহার করে
  - verify সফল → `setSession` → `go('ok')` → `enterApp` → onboarding
- Worker deploy: `admission-gk` version `555600bf` (wrangler /tmp/ah-deploy)
- লাইভ টেস্ট: register-email → `{sent:true, channel:'otp', expiresIn:120}`; ভুল কোড → 'কোড ভুল' (401); দ্রুত resend → cooldown (429 wait 6)

## ফাইল
- public-worker.js (worker), premium-auth.js (frontend), index.html (`premium-auth.js?v=p3-auth-otp-v26`), AGENT_RESUME/2026-09-01-otp-signup.md
