# LATEST — 2026-09-02 · v31 LIVE — ডিভাইস ক্যাশ সমস্যার চূড়ান্ত সমাধান

- **ভাইয়ের রিপোর্ট:** গুগল/জিমেইল/পাসকি কোনো পদ্ধতিতেই লগইন হচ্ছে না; স্ক্রিনে পুরনো "Send verification link" UI + welcome gate
- **OCR স্ক্রিনশট বিশ্লেষণ:** github.io-তেই আছেন, কিন্তু **পুরনো version দেখছেন** — কারণ **Service Worker পুরনো cache ধরে রেখেছে** (`premium-auth.js?v=p3-auth-ui-v25` APP_SHELL-এ ছিল, index.html এখন v31 চায়)
- **ফিক্স (v31 `33489fe`, live):**
  1. **SW cache-bust:** BUILD_ID `v160-onboard-20260901` → `v161-auth-fix-20260902` + APP_SHELL-এ premium-auth v31 → পুরনো SW auto-আপডেট, সব ডিভাইস নতুন কোড পাবে (আর ক্যাশ-ক্লিয়ার লাগবে না)
  2. **গুগল লগইন error স্পষ্ট:** popup_closed/access_denied/origin/consent আলাদা বাংলা বার্তা + first-use টিপ "Continue/Allow চাপতে হতে পারে" (Google unverified-app warning — first-time Continue প্রয়োজন)
  3. **verify স্ক্রিন:** "Send verification link" → "কোড পাঠান / ৬-অঙ্কের কোড পাঠানো হবে" (link-কনফিউশন শেষ)
- **আগের সব ফিক্স এখনো live:** KV মাইগ্রেশন + dual-KV fallback (worker `48fc321d`), auth-hardening v29, notice v2
- **লাইভ verify:** GH Pages success `33489fe` · premium-auth v31 · sw.js v161 ✓
- **বাকি:** control repo sync

## ভাইকে দিতে হবে নির্দেশনা
1. লাইভ লিংক খুলে **২-৩ সেকেন্ড পর রিফ্রেশ** (SW আপডেট নিতে) — Safari হলে একবার বন্ধ করে আবার খোলা
2. গুগল চাপলে **প্রথমবার Google-এর "Continue" চাপতে হবে** (unverified app warning) — Advanced → Continue
3. ইমেইল পদ্ধতিতে **৬-ডিজিট কোড** inbox-এ আসবে (link না)
4. কোনো কিছু fail হলে error বার্তা এখন স্পষ্ট বাংলায় — পড়ে বললেই হবে
