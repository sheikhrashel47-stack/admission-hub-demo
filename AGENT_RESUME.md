# AGENT_RESUME — Admission Hub

Read this first. Continue; do not redesign Phase 1.

**Agent:** জুজু  
**Date:** 2026-09-01

## Status
- Phase 1 Exact Clone — APPROVED (do not change dashboard/bank/exam/history/progress/vocab UI)
- Phase 2 Central cloud content — live
- Phase 3 **rebuilt** as real auth gate + profile (previous modal login was rejected)
- STOP until user says **PHASE 3 APPROVED**
- Phase 4+ not started

## Live
- Control: https://sheikhrashel47-stack.github.io/admission-hub/
- Public: https://sheikhrashel47-stack.github.io/admission-hub-demo/
- Worker: `admission-gk` + `ah-public` (`public-worker.js`)
- KV PUB_KV `942828aa82e546d4af11796ef92ab134`

## Phase 3 (this update)
Public app **cannot** show dashboard/bank/exam until a real session token exists.

- Dedicated full-screen auth (welcome / login / signup / OTP / success) matching the emerald 3D mockup (`premium-auth.js` + `premium-auth.css` + `auth-art/*.jpg`)
- OTP: generated + hashed on worker, sent via Resend (email) or Twilio/SMS_API (mobile). **Never** returned to the client.
- Register stays `pending:` until OTP verify.
- Google: GIS + `/pub/auth/google` if `GOOGLE_CLIENT_ID` worker secret is set
- Forgot/reset password, change password, delete account
- Profile route `#profile` + header avatar on dashboard (Phase 1 dashboard layout unchanged)
- Personal cloud still `ustate:{userId}` isolated
- `/pub/content` now requires Bearer token

## Worker secrets still needed for full production
Set on `admission-gk` and `ah-public` (secret_text):
- `RESEND_KEY` + `MAIL_FROM` — real email OTP
- `TWILIO_SID` + `TWILIO_TOKEN` + `TWILIO_FROM` **or** `SMS_API_URL` + `SMS_API_KEY` — real SMS OTP
- `GOOGLE_CLIENT_ID` — real Google login (authorized JS origin = GitHub Pages URL)
- `ADMIN_TOKEN` — control user list

Without those, signup/OTP/Google return a service-not-configured error. No fake codes.

## Files
Public: `premium-auth.js`, `premium-auth.css`, `auth-art/`, `public-worker.js`, `cloud-content-sync.js`, `index.html`, `sw.js` (`v135-p3-realauth-20260901`)
Control: `public-worker.js`, `public-users-admin.js`, `AGENT_RESUME.md`

## Do not
AI backend, domain, SEO, monetization, launch, Phase 1 redesign, demo OTP.
