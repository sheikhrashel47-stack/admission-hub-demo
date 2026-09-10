# Admission Hub Premium Identity & Onboarding Blueprint

Status: active implementation contract, 2026-09-11.

## Product goal

A new student sees one fast, memorable, mobile-first academic welcome journey instead of being dropped directly into the Dashboard. The journey is one unified product surface: Welcome → Sign Up / Login / Google / Guest → guided profile → real verification → optional Passkey → success → app. It must remain usable without AI and must never trade security or startup reliability for animation.

## Non-negotiable behavior

- The welcome experience is a full-screen first-entry page, never a floating popup. It opens only on first entry and never auto-opens again after Guest or verified account completion. A non-sensitive completion marker may remember that choice; passwords, OTPs, tokens, and verification secrets are never persisted.
- Existing authenticated students go to the appropriate app state. Existing unverified accounts can resume Email-or-Telegram selection after password reauthentication.
- Exactly four entry paths appear on Welcome: Sign Up, Log In, Continue with Google, Continue as Guest.
- Guest goes directly to the Dashboard and no guest conversation or personal study content is durably persisted.
- Signup is a short guided journey: Personal, Education, Security. It includes name, DOB, school, college/university, email, password, and confirmation. Password values stay only in native password inputs and are cleared after submission.
- Institution search is debounced/indexed, shows at most four results, and always permits manual entry. The assistant cannot invent an institution.
- Signup creates the existing canonical Firebase identity only. No external method may create a second UID or identity database.
- Public account verification is currently real Firebase Email link or real Telegram START → six-digit app-submitted OTP. Signup sends nothing before the student explicitly chooses one.
- Telegram proves Telegram-account control, never Gmail ownership.
- Passkey is optional after account verification. Native WebAuthn is mandatory; no fake biometric UI or fake success.
- WhatsApp, Email OTP, and public Passkey login must stay hidden until an official backend path, no-cost feasibility, protected deployment, and physical end-to-end evidence exist. Architecture may reserve capability slots, but unavailable methods are not fake buttons.
- Core authentication never depends on AI. AI outages cannot block signup, login, verification, or Guest.
- Student-facing copy does not expose Firebase, SMTP, provider, quota, webhook, token, backend, database, or internal fallback language.
- All success states come from authoritative backend/session state.

## AI safety contract

The onboarding assistant receives only a structured, redacted context: current view, step, focused non-secret field, completion booleans, safe validation code, auth/verification status, loading state, and an allow-list of actions. It never receives password values, password confirmation, OTP, ID/refresh/session tokens, API keys, provider secrets, or private credentials.

Allowed actions are predefined and frontend-validated (for example focus a field, open DOB, go next/back, open Login/Signup, open a real verification method, check status). Arbitrary JavaScript, DOM mutation, eval, silent account submission, biometric approval, and success claims are forbidden. High-impact actions always require the student’s click/confirmation.

## Reliability contract

- PWA documents are bounded network-first with a fast offline fallback.
- Auth UI and API carry an explicit minimum-version contract; stale signup clients are rejected before Firebase account creation or delivery.
- Old shell caches are versioned and deleted on activation.
- Auth APIs are network-only and never cached.
- Delivery, OTP, replay, lockout, rate-limit, identity-conflict, Mobile Safari recovery, and rollback guards remain mandatory.
- Protected deployment must test exact bundle integrity, public method contract, real Email lifecycle, Google origin, Telegram bot/webhook readiness, static UI version, and rollback.

## Delivery phases

1. Architecture audit and persistent contract — complete.
2. Unified first-entry Welcome + first-entry state — active.
3. Guided profile/signup, DOB, institution search, password UX — active.
4. Premium real Email/Telegram verification and optional Passkey success — active.
5. Safe context/action assistant — active.
6. Forgot-password backend and polished Login/Google/Guest — pending implementation.
7. Full accessibility, responsive, reduced-motion, cache, security and regression suite — pending.
8. Protected production deployment and physical Email/Telegram/Passkey evidence — pending.
9. Later data phase: cross-device study/profile synchronization under the same Firebase UID/Cloudflare authority, without a duplicate identity system.

A feature is never marked done solely because its UI exists. It requires real backend behavior, automated guards, protected deployment, live contract checks, and physical validation where the browser/device or external channel is part of the proof.
