# P08 · Google/পাসকি-মাত্র অ্যাকাউন্টে সাইনআপ-ডেডএন্ড-ফিক্স (OTP-মার্জ) — ২০২৬-০৯-০৬

**মালিক-রিপোর্ট:** "একদম নতুন ইমেইলেও 'এই ইমেইল দিয়ে আগে Google-লগইন হয়েছে' + OTP যাচ্ছে না।"

## প্রমাণ (লাইভ-প্রোব, ডিপ্লয়-পূর্ব)
- `probe.<ts>@example.com` (একদম নতুন) → `{"pending":true,"sent":true,"channel":"otp",...}` — **নতুন-ইমেইলে OTP-পথ ১০০% কাজ করে।**
- অর্থাৎ মালিকের ওই ইমেইলে KV-তে **সত্যিই google-only রেকর্ড** আছে (আগের Google-বাটন-পরীক্ষায় তৈরি;
  password-নেই, providers:['google']) → পুরনো লজিক 409 "আগে Google-লগইন" দিত → OTP-র আগেই ব্লক → "OTP যাচ্ছে না"।

## আসল-বাগ
`register-email`: `existing.status==='active'` + password-নেই + providers-এ google → **409 (ডেড-এন্ড)** —
ওই অবস্থায় ইউজারের পাসওয়ার্ড/OTP-তে ঢোকার কোনো পথ ছিল না।

## ফিক্স (৩-কপি: worker-bundle.mjs ডিপ্লয় + public-worker.js demo+hub)
- google/passkey-মাত্র অ্যাকাউন্ট → **409 নয়**; পূর্ণ সাইনআপ-ফ্লো চলবে (OTP পাঠানো হবে)।
- OTP-প্রমাণে verify → rec-এ `providers: pending.providers` (email+password+পুরনো google) merge, status active → লগইন-টোকেন।
- পাসওয়ার্ড-আছে-অ্যাকাউন্টে আগের-মতো 409 (অপরিবর্তিত)।
- ক্লায়েন্ট-শাখা (provider_google/provider_passkey) নিরাপদ-ফলব্যাক হিসেবে রয়ে গেছে।

## টেস্ট
- নতুন `p08-auth-otp-merge.test.mjs` — **১৬ অ্যাসার্ট, সবুজ।**
- idb-hardening ২-অ্যাসারশন নতুন-আচরণে হালনাগাদ; **১৩/১৩ স্যুট সবুজ।**
- node --check: bundle + public-worker(demo+hub) ✓

## ডিপ্লয়
- push → **Deploy Worker** (main.yml dispatch) → admission-gk নতুন বান্ডল। Pages-অপরিবর্তিত (ক্লায়েন্ট-বদল নেই)।
