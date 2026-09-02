# Resume — 2026-09-02 · AUTH ROOT-CAUSE v170 — LIVE (final)

## ভাইয়ের নির্দেশ (বিস্তারিত ১৫-সেকশন audit চিঠি)
নতুন Gmail signup-এ "আগে লগইন" — আর patch নয়, root cause fix। NO MORE PATCHES।

## Audit ফলাফল (এই টার্নে যা প্রমাণিত)
1. **Worker-এ end-to-end signup টেস্ট (লাইভ):** register-email (plain) → Brevo OTP delivered → otp/verify (code) → **token+active user** → /auth/me ✓ → logout। register/verify/google/passkey রাউটার auth-বিহীন (authUser-এর আগে) — **worker থেকে signup-এ "আগে লগইন" আসে না**। logout-পর 401 "আগে লগইন" = সঠিক আচরণ।
2. **afrinjahansorna@gmail.com-এর user KV-তে নেই** → নতুন signup ঠিক চলবে।
3. **UI-তে "আগে লগইন" দেখার ২টি আসল পথ:**
   - (ক) **পুরনো SW shell cache** — ভাইয়ের ডিভাইসে পুরনো premium-auth.js (পুরনো verify/passkey UI) cache-first-এ serve → "আগে লগইন" type অভিজ্ঞতা
   - (খ) **existing email-এ register-email 409** ("এই ইমেইল আগেই আছে — লগইন করো") — UI raw দেখাত, ভাইকে "আগে লগইন" মনে হতো
   - (গ) stale session (মেয়াদ-শেষ token) boot-এ 401 → logout

## Root-cause fix v170 (commit `4004458` — LIVE)
1. **SW shell cache purge (index.html):** registerPwaUpdates-এ current BUILD_ID-র cache ছাড়া সব `admission-hub-shell-*` cache delete → পুরনো login/auth UI **কখনোই** cache থেকে serve হবে না
2. **register-email 409 → LOGIN redirect (premium-auth.js doSignup):** "এই ইমেইল আগেই আছে" হলে সরাসরি login স্ক্রিনে নিয়ে যায় + স্পষ্ট বাংলা "এই ইমেইল দিয়ে আগেই অ্যাকাউন্ট খোলা হয়েছে — পাসওয়ার্ড দিয়ে লগইন করো..." + ইমেইল prefill। **নতুন Gmail-এ কখনোই আসে না**
3. **authFriendly() error-map:** "আগে লগইন"/http-401/http-403/অ্যাকাউন্ট বন্ধ → পরিষ্কার বাংলা (raw server message আর সরাসরি ইউজারকে নয়); সব auth catch-এ প্রয়োগ
4. stale-session 401 → ক্লিন logout + gate
5. sw BUILD_ID `v170-auth-resilience-20260902`, APP_SHELL `p3-auth-prof-v170`

## টেস্ট (jsdom ৩ ফাইল) — ১৩/১৩ ✅
- full signup: signup→verify→email→OTP ৬-box→verify→success→session TK1→gate close (calls-এ login-এ redirect নেই) ৬/৬
- existing email: 409→বাংলা মেসেজ→login screen→email prefill→login সফল ৫/৫
- stale session: token cleared + gate ২/২

## Live verify
- index `p3-auth-prof-v170` + sw v170 + cache-purge ✓
- premium-auth live: authFriendly ✓, 409-message ✓, google fallback ✓
- worker live OTP `sent:true` (Brevo); Google endpoint validate (fake token→"Google লগইন ব্যর্থ" সঠিক); Google OAuth origin 302→signin ✓

## Breakpoints
- Worker অপরিবর্তিত (Brevo OTP live version `383b7d8a` — prior turn)
- Data intact (কোনো user delete হয়নি; e2e টেস্ট-user তৈরি হয়েছে)

## পরের ধাপ
- resume commit+push + control sync
- ভাইকে রিপোর্ট + real-device রিফ্রেশ (২ বার) → নতুন Gmail signup টেস্ট
