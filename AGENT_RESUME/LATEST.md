# LATEST — 2026-09-01 · Premium Profile ✅ LIVE + Google login UX fix

- **Demo:** `admission-hub-demo` @ `b4024bf` (GH Pages success) · **Control:** `admission-hub` @ `eb59284`
- **Worker live:** `admission-gk` version `be83674c` (sessions/devices, security activity, re-auth, export, passkey add/remove, google link/unlink, contact-change re-auth)
- **Frontend v28:** premium profile (hero/academic/snapshot/achievements/prep ring/security/devices/activity/preferences/data/delete) + **offline/preview notice** + গুগল origin-error স্পষ্ট বার্তা (লাইভ সাইট লিংকসহ)
- **ভাইয়ের রিপোর্ট (এই টার্ন):** "আগে লগইন করতেছে + গুগল লগইন হচ্ছে না" → কারণ: প্রিভিউ iframe-এ নেটওয়ার্ক ব্লক + Google শুধু github.io origin-এ অনুমোদিত (verified: origin authorized ✓, worker ✓, GIS CDN ✓)। সমাধান: লাইভ লিংক https://sheikhrashel47-stack.github.io/admission-hub-demo/ Safari-এ খুলতে হবে
- **টেস্ট:** jsdom 53/53 · offline-note show/hide verified
- Resume: `AGENT_RESUME/2026-09-01-premium-profile.md`
