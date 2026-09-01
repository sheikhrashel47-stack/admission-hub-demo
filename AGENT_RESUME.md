# AGENT_RESUME — Admission Hub (public)

Read this first. Continue existing work; do not redesign Phase 1.

**Agent:** জুজু  
**Date:** 2026-09-01

## Status
- Phase 1 Exact Clone — frozen
- Phase 2 Central cloud content — live
- Phase 3 auth **in progress, waiting PHASE 3 APPROVED**
- Do **not** start Phase 4 until the user says `PHASE 3 APPROVED`

## Live
- Control: https://sheikhrashel47-stack.github.io/admission-hub/
- Public: https://sheikhrashel47-stack.github.io/admission-hub-demo/
- Workers PUT 2026-09-01: `admission-gk` + `ah-public` (passkey + register-email **live**)
- Demo git: SW `v152-welcome-lang-20260901` / `p3-auth-ui-v18`
- Welcome: same Glass Daylight. Middle English/বাংলা → buttons hide → clean letter typing (no cat, no photo BG)
- Hub git: `d353285`
- PUB: `https://admission-gk.rashelzayan213.workers.dev/pub`
- Config now: `google` + `passkey` + `email` (sms false)

## Phase 3 — locked visual / workflow
- Screens 2–5 SVG OK. Welcome = 4 Glass Daylight. No CSS 3D. No crop. No Screen 6 dashboard.
- Signup: (1) Full Name + DOB + School/College optional → Continue; Google separate on same screen
- (2) Verify: Email Verification **or** Passkey only (native Face ID/Touch ID/PIN after Passkey tap)
- Google = verified, no extra email/passkey
- Email: POST `/pub/auth/register-email` → verification link → active
- Passkey: WebAuthn `/pub/auth/passkey/*`
- Bottom nav: Home · Bank · Exam · History · Profile (no floating M)
- OTP dropped as product path (legacy `/otp/*` routes still on worker)

## Auth backend (now live on workers)
- PUT used `keep_bindings: ["secret_text"]` + KV ids (do not send empty secret_text)
- Recreate `/tmp/gk-meta.json` + `/tmp/ah-meta.json` before every CF PUT
- `admission-gk` modules: `gk-agent-worker.js` (main) + `public-worker.js`
- `ah-public` module: `public-worker.js`
- Account: `abb783e456e51a5d338419de93d5e576`
- KV: GK `b9353515b098427687afcfb8654ed359` · PUB `942828aa82e546d4af11796ef92ab134`
- Secrets live: RESEND_KEY/_2, GOOGLE_CLIENT_ID, MAIL_FROM, MAIL_HOOK, MAIL_HOOK_SECRET, ADMIN_TOKEN, GEMINI_KEYS, …
- MAIL_HOOK = Gmail Apps Script web app (new `/exec` 2026-09-01, secret `AdmissionHubMail1`). Any inbox.
- Spam fix: verify mail is plain Gmail (`createDraft().send()`, subject `Admission Hub`, no HTML button). User must New version the Apps Script.
- **Not live:** BREVO_KEY, GREENWEB_TOKEN, BULKSMS_API_KEY
- Passwords never plaintext. No fake OTP. Account active only after backend.

## Do not
- Crop mockup phones as live UI
- Restore floating M / ahTerms without checkbox / CSS 3D amateur look
- Start Phase 4 until `PHASE 3 APPROVED`
- Write tokens into `.git/config`

## STOP
Wait for user approval of auth screens/workflow. No Phase 4.
