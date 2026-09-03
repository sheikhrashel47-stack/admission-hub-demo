# Resume — 2026-09-03 · AUTH API FIX (root cause: ভুল host + ভুল path prefix) — সম্পূর্ণ প্রমাণসহ

## ভাইয়ের রিপোর্ট
- `https://sheikhrashel47-stack.github.io/admission-hub-demo/`-এ আগে Gmail verification / Passkey / Continue with Google দিয়ে signup হতো, এখন হচ্ছে না। কারণ বের করে permanent fix (no patch-work) + deploy + verify।

## Root cause (লাইভ প্রমাণসহ)
1. **ভুল Worker host:** সমস্ত ফ্রন্টএন্ড ফাইল `https://admission-gk.rashelzayan213.workers.dev` ব্যবহার করত — এই host-এর **DNS-ই নেই** (NXDOMAIN, `curl` -> 000)। আসল account subdomain = `admissionhub` (Cloudflare API `workers/subdomain` থেকে নিশ্চিত)। সঠিক: `admission-gk.admissionhub.workers.dev`।
2. **ভুল path prefix:** UI `WORKER + '/pub' + '/auth/...'` (= `/pub/auth/*`) কল করত, কিন্তু লাইভ Worker-এ **সব auth route `/api/auth/*`-এ** (কোনো `/pub` rewrite নেই — deployed bundle-এ `startsWith('/pub/')` নেই) → `/pub/*` catch-all-এ গিয়ে `401 {"error":"আগে লগইন করো"}` — ভাই যা দেখতেন ঠিক তাই। `/api/auth/*`-এ সব route public ও কাজ করছে (live verify):
   - `POST /api/auth/register-email` (নতুন ইমেইল) → `{"pending":true,"sent":true,"channel":"otp",...}` — **Brevo OTP সত্যিই পাঠিয়েছে** ✅
   - `POST /api/auth/otp/send` → validation error (route alive) ✅
   - `POST /api/auth/passkey/login/begin` → **সত্যিকারের WebAuthn challenge** (rpId `sheikhrashel47-stack.github.io`) ✅
   - `POST /api/auth/google` → `{"error":"Google টোকেন নেই"}` ✅
   - `GET /api/auth/config` → `{google:true, passkey:true, email:true, ...}` ✅
- **উপসংহার:** Worker (backend) সম্পূর্ণ সুস্থ + সব secret ঠিকঠাক। দোষ ১০০% ফ্রন্টএন্ডের hardcoded URL-এ। **Worker redeploy লাগেনি — risk নেওয়া হয়নি।**

## ফিক্স (ফাইলভিত্তিক)
host fix: `admission-gk/voice/notify/ai-proxy.rashelzayan213.workers.dev` → `*.admissionhub.workers.dev`:
- demo: premium-auth.js, user-account.js, onboarding.js, ai-explain-tool.js, study-ai-tool.js, gk-agent-tool.js, cloud-content-sync.js, notification-hub.js, vocabulary-elevenlabs.js, index.html (AI proxy), public-worker.js (OLD_WORKER + confirm link `/pub/auth/confirm`→`/api/auth/confirm`)
- prefix fix: `WORKER + '/pub'` → `WORKER + '/api'` (premium-auth.js, user-account.js, onboarding.js, public-users-admin.js [hub]); `'/pub/content'`→`'/api/content'`, `'/pub/content/meta'`→`'/api/content/meta'` (cloud-content-sync.js)
- cache-bump: sw.js BUILD_ID `v170-auth-resilience-20260902`→`v171-authapi-fix-20260903`; index.html/sw APP_SHELL `p3-auth-prof-v170`→`p3-auth-prof-v171` (পুরনো SW-shell cache আর খোদাই হবে না)
- hub (control repo): একই মিরর ফিক্স

## টেস্ট
- `node --check` — সব পরিবর্তিত JS (২০ ফাইল) ✅
- grep assertion: কোডে আর কোনো `rashelzayan213.workers.dev` / `WORKER + '/pub'` নেই ✅
- Live worker `/api/*` E2E (উপরে) ✅

## স্থিতি
committed + pushed (demo + hub) → GitHub Pages auto redeploy → live verify (এই টার্নেই)।
