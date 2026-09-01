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
- Demo git: latest `p3-auth-ui-v9` / SW `v143-auth3d-ref-20260901`

## Phase 3 — locked visual contract
User attached reference collage is the **only** design source of truth (5 phones: welcome, login, signup, OTP, success). Screen 6 dashboard is forbidden.

**Current implementation (this turn):**
- Recreate screens 1–5 with **CSS 3D + SVG + procedural shapes** (`auth-svg.js` + `premium-auth.css` + `premium-auth.js`)
- **No** stock/Unsplash/Pexels images, **no** cropped mockup JPG as the UI, **no** generated hero JPEG
- Real Google / email OTP still wired to `/pub`
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
