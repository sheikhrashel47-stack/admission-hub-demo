# 🔴 CRITICAL FIX — সবাই লগআউট ছিল: KV namespace মিসম্যাচ + মাইগ্রেশন (2026-09-02)

**স্ট্যাটাস:** ✅ ফিক্স + deploy live (`48fc321d`) — পুরনো accounts আবার কাজ করছে (verified)

## মূল কারণ (লাইভ ডায়াগনস্টিক থেকে ধরা)
- ভাই রিপোর্ট: "আগের সব account লগআউট + main browser-এও লগইন গেট/নোটিশ"
- **CF API-তে KV census:**
  - **OLD_KV** (`942828aa82e546d4af11796ef92ab134`): user **২৩**, tok **৩৮**, profile ৬, pkid ৫ ← **আসল সব accounts!**
  - **PUB_KV** (`b9353515b098427687afcfb8654ed359`): user ১, tok ০ ← **worker পড়ছিল এটা!**
- **ফল:** worker নতুন namespace-এ দেখছিল → সব পুরনো token "অদৃশ্য" → সবাই লগআউট/লগইন গেট
- (কোনো এক deploy-এ KV namespace সুইচ হয়েছে; worker কোড সবসময় `env.PUB_KV` ব্যবহার করত)

## সমাধান
1. **ডেটা মাইগ্রেশন:** OLD_KV → PUB_KV — ৭৪টা key (user/tok/profile/pkid/sess/act/pubContent) CF API দিয়ে কপি (tok: ১yr TTL) — **৭৪/৭৪ সফল**
2. **কোডে dual-KV fallback (`kvGet`):** `PUB_KV → OLD_KV` fallback — getUserById/loadProfile/authUser/sessions/activity/export/delete সব জায়গায়; delete-ও দুটো KV-তেই
3. **wrangler.toml master কপি এখন `/home/user/ah-deploy/`** (persistent!) — /tmp-এ ফাইল হারাচ্ছিল; প্রতি deploy আগে এখান থেকে কপি
4. Deploy: **`48fc321d`** (bindings verified: PUB_KV + OLD_KV)

## লাইভ verify (সব পাস)
- পুরনো migrated token → `/auth/me` → **Sheikh Mohammad Rashel** (ভাইয়ের account!) status active
- Fresh signup → me/profile/sessions/export/delete full cycle ✅
- টেস্ট account cleanup ✅

## এখনও বাকি
- **GitHub token লাগবে** (v29 auth-hardening + এই worker fallback push হয়নি) — ভাই দিতে রাজি, `ghp_...`/`github_pat_...`
- push-এর পর demo + control sync
- Frontend v29 (auth-hardening) GH Pages-এ এখনো নেই (push pending)

## টোকেন (memory-তে আছে, resume-এ নয়)
- Cloudflare cfat: ADMISSION_HUB_MEMORY.md-তে
- GitHub: ভাইয়ের কাছে (এবার টোকেন চাইলে দেওয়ার কথা)
