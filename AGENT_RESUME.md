# AGENT_RESUME — Admission Hub (public)

Read this first. Continue; do not redesign Phase 1.

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
- Worker: `admission-gk` + `ah-public` (`/pub`)
- Demo git: latest `p3-auth-ui-v11` / SW `v145-coded-mock-20260901`

## Phase 3 — locked visual contract
User chose **Option 1 — Emerald Academic 3D** (`auth-options/option-1.jpg`) as the look to reproduce হুবহু. Screens 1–5 only. Screen 6 dashboard forbidden.

**Current implementation:**
- Recreate Option 1 with **CSS 3D + SVG** (`auth-svg.js` + `premium-auth.css` + `premium-auth.js`)
- Green mortarboard, mint forms, backpack-on-plinth, gold lock shield, success pedestal
- User: কেঁটে বসাবে না — do not crop mockup phones onto the page.
- **No** stock images, **no** cropped mockup as the live UI
- Real Google / email OTP still wired to `/pub`
- SW `v145-coded-mock-20260901` / `p3-auth-ui-v11`
- Bottom nav public: Home · Bank · Exam · History · Profile (no floating M)
- Get Started is a real button

**Rejected earlier (do not revive):**
- CSS-3D that did not match (`1e3a437`)
- Generated `auth-art/*.jpg` heroes (`3c8eb3c` / `2a25b74`)
- Amateur coded SVG (`6a398c8`)
- Mockup-crop overlay (`a3339b9` / `auth-screens/*.jpg`) — user then ordered live 3D recreation of the same 5 screens, not a PNG collage

## Auth backend
- OTP hashed on worker, emailed via Resend (`RESEND_KEY` then `RESEND_KEY_2`, `MAIL_FROM`)
- Resend test-mode delivers only to owner Gmail until a domain is verified
- Passwords never plaintext; OTP never in frontend
- Session dual localStorage + sessionStorage

## STOP
Wait for user approval of these 5 screens. No Phase 4.
