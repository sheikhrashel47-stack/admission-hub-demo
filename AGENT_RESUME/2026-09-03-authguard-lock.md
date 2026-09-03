# Resume — 2026-09-03 · 🏰 AUTH PERMANENT LOCK (ভাইয়ের অনুরোধ: আর কখনো লগইন/সাইনআপ না ভাঙা)

## ৩-স্তরের লক
1. **Runtime self-heal (premium-auth.js api())** — `CANONICAL_WORKER` ধ্রুবক; public auth endpoint-এ (register-email/otp/google/passkey/wait/config) network fail বা ভুল পথে 401 "আগে লগইন" এলে → canonical ঠিকানায় নির্বিঘ্নে ১ বার retry। ভবিষ্যতে কেউ WORKER বদলালেও auth ভাঙবে না।
2. **AUTH_ENDPOINTS_GUARD.test.mjs (static guard)** — সব .js/.html স্ক্যান: (ক) পুরনো `rashelzayan213.workers.dev` নিষিদ্ধ; (খ) শুধু allowlist-এর ৪টি `*.admissionhub.workers.dev` host বৈধ; (গ) `WORKER + '/pub'`/`'/pub/auth`-জাতীয় ভুল prefix নিষিদ্ধ (worker-side `/pub→/api` bridge বৈধ); (ঘ) premium-auth-এ canonical + `/api` বাধ্যতামূলক; (ঙ) sw.js BUILD_ID ও index.html cache-version মিলতে হবে। FAIL হলে exit 1।
3. **CI gate (.github/workflows/auth-guard.yml)** — push main/PR-এ `node AUTH_ENDPOINTS_GUARD.test.mjs` চলে; ভুল URL ঢুকলে GitHub Action red — merge/অপডেট আটকাবে।
+ sw v172 (`v172-authapi-guard-20260903`, APP_SHELL `p3-auth-prof-v172`) — পুরনো cache purge।
- hub-এও মিরর (sw BUILD_ID hub `v137…` → `v172-authapi-guard-20260903` + index sw?v sync)।

## টেস্ট
- guard demo ৮৬ ফাইল ✅ / hub ৮৯ ফাইল ✅
- node --check premium-auth.js ✅
- ওই ৪টি false-positive ঠিক করে guard-নিয়ম নিখুঁত করা হয়েছে (নিজের ফাইল self-scan বাদ, worker bridge exception, build-id regex fix|guard-দুজয়)।

## ডাটা কোথায় যায় (ভাইয়ের প্রশ্নের উত্তর)
সব Cloudflare Workers KV (namespace `admission-gk-kv`, id b9353515…) — account `Rashelzayan213@icloud.com's Account` (abb783e4…):
- `pending:em:…` (signup draft, ১৫ মিনিট TTL) → OTP verify-র পর `user:em:…` (active user: uid,name,dob,school,college,passHash(PBKDF2+salt),providers…), `tok:` (session টোকেন, ১ বছর), `sess:` (ডিভাইস-সেশন), `profile:`, `ustate:` (শেখা-অগ্রগতি), `act:` (activity log)
- OTP: `otp:signup:em:…` — কোডের SHA-256 hash (কোড কখনো plaintext নয়), ১২০ সেকেন্ড মেয়াদ, ৫ ভুল = lock, ১২ সেকেন্ড resend-gap
- Passkey: `pkid:` (public key) + `pkch:` (চ্যালেঞ্জ, ৩০০ সেকেন্ড TTL); Google: user record-এ providers
- মেইল পাঠানোর কাজ একটাই বাইরের সেবা: Brevo API (+ Apps Script/Google Sheets hook ব্যাকআপ
- কোনো আলাদা database নেই; ডাটা জোরালোভাবে ক্লাউডে (workers.dev) — ভবিষ্যতে D1/Supabase চাইলে মাইগ্রেশন সম্ভব
