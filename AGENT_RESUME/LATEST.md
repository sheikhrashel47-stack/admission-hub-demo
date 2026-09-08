# LATEST — v221 — Legacy account/profile/onboarding retired

**আপডেট:** 2026-09-09 (Asia/Dhaka) · Agent: **জুজু**

## ✅ বর্তমান product state

- Final product-code commit: `c45a4e3ec427475b8a9dcd525b84f117589251e0`
- Main retirement commit: `07cdc102ac78569fac778d9938383a09918cdc8c`
- Build: `v221-account-retired-20260908`
- AI UI: `ai-agent-chat.js?v=agent-f1-ui-chatv14-guest`
- Dashboard: `dashboard-v2.js?v=dash2f7`
- Repository: `admission-hub-demo/main`
- Production: `https://admissionhub.pages.dev`
- Mirror: `https://sheikhrashel47-stack.github.io/admission-hub-demo/`

## ✅ Account retirement result

1. পুরোনো Login/Auth frontend ও deployed Worker implementation সম্পূর্ণ সরানো হয়েছে; এটি কোনো patch নয়।
2. শুধু Profile primary navigation, Profile routes/CTA/tools এবং Profile-only Studio items সরানো হয়েছে।
3. Home, Question Bank, Exam, AI ও History—পাঁচ tab অক্ষত ও usable।
4. Personalization Onboarding UI/gate/flow/API/source/assets সরানো হয়েছে।
5. residual auth media, screenshots, OTP preview/helper এবং deleted-file URLs-ও retired।
6. Cloudflare-এ retired static URL `410 Retired`; GitHub mirror-এ `404`।
7. existing KV account/profile/onboarding records এবং local questions/results/progress/settings/study data delete বা migrate করা হয়নি।
8. AI এখন `ahAiGuestV1` → `X-AH-Guest` anonymous-device contract-এ login/token/profile ছাড়া কাজ করে।
9. public content hydration account-independent; admin publishing authorization অক্ষত।
10. নতুন login/profile/onboarding system ইচ্ছাকৃতভাবে বানানো হয়নি।

## 🔎 Verification

- Final complete regression: **15 suites, 329 passed / 0 failed**
- Retirement guard: **28/28**
- Worker bundle exact reproducibility + source/route scan: pass
- Local mobile QA: `364 ms`, 5 tabs, 62 resources, guest AI, 2057-character response fully expanded, 0 browser errors
- Live mobile QA (`390×844 @2x`):
  - usable `621 ms`
  - 5 correct tabs; Profile absent
  - 64 resources; retired assets loaded `0`
  - v221 SW active; only current v221 cache
  - one AI composer frame
  - stable guest identity/header + live AI response
  - page/console/request errors `0/0/0`
- Live Worker:
  - account health 200: `accountSystem:"retired"`, `identity:"anonymous-device"`
  - AI status/chat without login: 200
  - public content meta: 5 subjects, 14 topics, 3000 questions, 81 vocabulary
  - retired account/profile/onboarding/state/session endpoints: 404
- Cloudflare + GitHub live core files byte-for-byte exact with local final files।
- Final product Actions:
  - Worker `34261569649` — success
  - Retirement Guard `34262377093` — success
  - Cloudflare Pages `34262377154` — success
  - GitHub Pages `34262375700` — success

## ✅ Current STOP point

**v221 legacy account retirement সম্পূর্ণ closed।** পুরোনো Login/Auth, Profile navigation/tools ও Personalization Onboarding আর production source, loaded assets, PWA cache, Worker route বা deploy bundle থেকে load/reachable নয়। Core app ও guest AI live।

## ⏭️ Next

নতুন account/login/profile/onboarding system কেবল মালিকের পরবর্তী স্পষ্ট নির্দেশে শূন্য থেকে এক ধাপ করে build করতে হবে। পুরোনো system restore/patch নয়। Dormant records explicit schema-review/migration plan ছাড়া touch করা যাবে না।

**বিস্তারিত handoff:** `AGENT_RESUME/2026-09-09-juju-account-system-retirement.md`
