# Premium Profile System A–Z — সম্পূর্ণ + লাইভ (STOP → approval pending)

**তারিখ:** 2026-09-01 · **স্ট্যাটাস:** ✅ সম্পন্ন, লাইভ — ভাইয়ের approval-এর অপেক্ষায় (blueprint নিয়ম: phase শেষে STOP)

## যা যা বানানো হয়েছে

### Worker (`public-worker.js` → live `admission-gk`, version `be83674c`)
- **Session registry:** `sess:<uid>` KV — device/browser/mobile/firstSeen/lastSeen; `authUser` প্রতিটা request-এ lastSeen + trackSession আপডেট করে
- **Endpoints (নতুন):**
  - `GET /api/sessions` — সব সেশন + current/live marker + প্রথম ৮ অক্ষরের session ID
  - `POST /api/sessions/revoke` — নির্দিষ্ট সেশন বন্ধ (current-এ ৪০০ সুরক্ষা)
  - `POST /api/sessions/revoke-others` — অন্য সব সেশন বন্ধ, current অক্ষত
  - `GET /api/security/activity` — সর্বশেষ ৪০টি ইভেন্ট (login/password/contact/passkey/google/logout)
  - `POST /api/re-auth` — sensitive action-এর আগে পাসওয়ার্ড নিশ্চিতকরণ
  - `GET /api/export` — কাঠামোবদ্ধ এক্সপোর্ট (schema `admission-hub/account-export/v1`: account/profile/activity/sessions/personalData)
  - `POST /api/auth/passkey/add/begin|finish` — existing অ্যাকাউন্টে WebAuthn passkey যোগ (challenge/origin/type যাচাই, `pkid:<rawId>`)
  - `POST /api/auth/passkey/remove` — passkey সরানো
  - `POST /api/auth/google/link|unlink` — গুগল সংযোগ/বিচ্ছিন্ন (idToken/accessToken যাচাই, duplicate gid 409)
- **profilePut:** email/mobile পরিবর্তনে password re-auth বাধ্যতামূলক; format + duplicate (`em:`/`ph:`) চেক, verify flag রিসেট, logAct
- **logAct** ইভেন্ট: login, password, contact, passkey, google, logout
- **authLogout/authDelete:** সব session token revoke + sess/act/onb/ach/ustate/pkid পরিষ্কার
- **Bug fix (live ধরা):** passkey-add/google-link route আগে ছিল authUser-এর `uid` declaration-এর আগে → TDZ error; route গুলো authUser-এর পরে সরানো হয়েছে, redeploy + re-verified

### Frontend (`premium-auth.js` + `premium-auth.css`, version `p3-auth-prof-v27`, demo `aa58e29`)
- **Hero header** — emerald gradient + subtle 3D (orbital ring = একমাত্র signature 3D element), photo/monogram avatar (elevated), name + verified badge, tagline, goal chip, member since + Account ID
- **Nav avatar** — bottom nav Profile tab-এ initial monogram/photo (tap→Profile); structure/design অপরিবর্তিত
- **একাডেমিক প্রোফাইল** — onboarding ডেটা (goal/uni/unit/prep level/weak subjects) বা empty state + "Start Preparing →"
- **Snapshot** — আসল stats: exams/questions/accuracy/streak (computeLifetimeStats + computeStreak)
- **প্রস্তুতি circular indicator** — আসল ডেটা থেকে: একাডেমিক ৪০% + প্রশ্ন ৩০% + পরীক্ষা ৩০%
- **Achievements (real)** — ৭টি: First Exam, ১০০/১০০০ প্রশ্ন, ১০ পরীক্ষা, ৭/৩০ দিন streak, Personal Best (৯০%+ নির্ভুলতা) — locked হলে progress bar
- **Security Center** — password/passkey/google status, email/mobile verified, Security Score ring, Secure My Account, password change screen, passkeys add/remove screen, google link/unlink screen
- **Devices & Sessions** — সেশন লিস্ট, current marker, session ID, logout this/others
- **Security Activity timeline** — আইকন + সময়
- **Preferences** — Notifications (security always-on note), Appearance (existing setTheme/setAccent/density/cardStyle integrate), Language (existing `ahLang` i18n)
- **Data & Privacy** — export download, delete account (warning→consequences→re-auth→confirm), data info card
- **Re-auth sheet** — sensitive action-এর আগে পাসওয়ার্ড মোডাল
- **Photo** — take/gallery, square crop preview + compress (256px jpeg 0.72, ≤220KB), remove/replace
- **Logout** — confirm → session invalidate → login gate
- CSS: `.ah-pf-*` সিস্টেম — hero/cards/snapshot/prep ring/achievements/rows/empty states/danger zone, micro-interactions, no horizontal overflow, iPhone-safe padding

### টেস্ট
- **jsdom:** ৫৩/৫৩ পাস (profile/edit/security/password/passkeys/devices/activity/academic/appearance/language/data/delete রেন্ডার, achievements real-status, nav monogram, AHProf API surface)
- **লাইভ (worker deploy পরে):** sessions list/current/live, revoke current→400, revoke unknown→false, revoke-others→current অক্ষত, re-auth wrong→401/correct→200, email change without password→401/with→200, export schema, User A/B isolation (sessions/activity/export আলাদা), passkey remove→add→providers আপডেট→add again→400, wrong token→401, logout→session invalid, delete→data gone + token invalid। টেস্ট অ্যাকাউন্ট সব মুছে ফেলা হয়েছে

## গিট
- **Demo** `sheikhrashel47-stack/admission-hub-demo`: `aa58e29` (pushed, GH Pages build success `639569a` verified; `aa58e29` = worker fix only)
- **Control** `sheikhrashel47-stack/admission-hub`: `d1738be` (pushed)
- **Worker live:** `admission-gk.rashelzayan213.workers.dev` version `be83674c`

## GitHub/Cloudflare token
- Cloudflare cfat token স্যান্ডবক্সে ছিল না → ভাই দিয়েছেন; ADMISSION_HUB_MEMORY.md-তে সেইভ। resume-এ টোকেন নেই।

## পরের ধাপ (approval-এর পরে)
1. ভাইয়ের ফিডব্যাক/পরিবর্তন
2. দরকার হলে আরও refinement (যেমন duplicate-email 409-এর passkey-account coverage, Google link-এর live end-to-end টেস্ট browser-এ)
