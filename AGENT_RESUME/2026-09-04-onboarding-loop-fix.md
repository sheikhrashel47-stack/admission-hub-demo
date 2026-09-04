# ২০২৬-০৯-০৪ — অনবোর্ডিং-উইজার্ড প্রতি রিফ্রেশে ফিরে আসা (B-ONBOARDLOOP)

## লক্ষণ
লগইনের পর পার্সোনালাইজেশন উইজার্ড (১০ পৃষ্ঠা: ভার্সিটি/ইউনিট/গোল/রুটিন) প্রতি রিফ্রেশ ও প্রতি লগইনে আবার আসে — সম্পন্ন-চিহ্ন সংরক্ষণ হয় না।

## মূল কারণ
- `maybeStart()`: server GET `/onboarding`-এর ফল (`{completed:false, step:1}` — যখন `profile:<uid>` KV-রেকর্ড স্টেইল/অনুপস্থিত) **localStorage-এর `completed:true`-কে ওভাররাইট** করত
- KV cross-PoP propagation-বিলম্ব (পূর্ব-নথিভুক্ত B-AUTHKV-র একই পরিবার): PUT-এর মিনিট-খানেকের মধ্যে GET পুরনো profile-রেকর্ড পায় → `completed:false` → উইজার্ড আবার
- `loadProfile`-রিডে retry-নেই; `saveRemote`-এ `{step}` (গ্লোবাল ৯) `data.step=10`-কে ওভাররাইট করত (কসমেটিক)

## ফিক্স (v181-kvfix-20260904)
- client: মার্জে **local-জয় + either-source-completed** (`done = local.completed || server.completed`) — স্টেইল সার্ভারে উইজার্ড আর ফিরবে না; নতুন ডিভাইসে সার্ভার-ডেটাই কাজ করবে
- `saveRemote`: `{ step: data.step }`
- server: `loadProfile` → kvGetRetry (৪×backoff) — স্টেইল-profile উইন্ডো কমানো
- টেস্ট: GUARD ✓ · auth-ux ৩৩ · nosplash ১৬ · session-survive ১২ সব পাস
