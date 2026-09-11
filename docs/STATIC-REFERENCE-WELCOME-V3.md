# Static Reference Welcome v3

Status: implemented locally for visual review; publish only through the protected release workflow after approval.

## Source of truth

The supplied first-page screenshot `IMG_4095.jpeg` is the visual source of truth. This iteration implements **only its Welcome page**. It does not claim that the remaining onboarding pages have been redesigned.

Contracts and versions:

- Welcome: `static-reference-welcome-v3`
- Account page shell: `static-page-system-v3`
- UI assets: `20260911-static-reference-welcome-v3`
- Service worker: `v236-static-welcome-20260911`
- Dashboard assets: `dash2f9` (custom Guest Dashboard removed)

## Required composition

The Welcome page contains, in order:

1. Admission Hub academic-cap brand and subtitle
2. Working বাংলা / English language selector
3. The reference student, books, checklist, campus, target, cap, and paper-plane artwork
4. Bengali headline and supporting copy
5. Learn, Practice, Improve, and Achieve benefit cards
6. Exactly four entry actions:
   - Sign Up
   - Log In
   - Continue with Google
   - Continue as Guest
7. Lightweight mint campus landscape at the bottom

The hero WebP is a bounded crop derived from the supplied screenshot. It has no external URL, video, canvas, WebGL, or runtime image-generation dependency.

## Page—not popup—contract

- Account access is appended as normal document content under `#ah-account-page`.
- The semantic shell is `<main>`, not a dialog.
- There is no `role="dialog"`, `aria-modal`, overlay backdrop, focus trap, background-click dismissal, fixed page host, modal radius, or modal shadow.
- While the account page is active, the ordinary app is hidden and inert. Closing a later account screen restores it.
- First-time Welcome has no fifth close/dismiss action.
- On `390×844`, Welcome is exactly one viewport with no horizontal or vertical overflow.
- On desktop it remains a narrow `430px` portrait document column, full-height and square-edged, without popup framing.

## Behavior

- Language selection updates only hard-coded local Welcome copy; it sends no request.
- Sign Up and Log In continue into the existing canonical Auth flow.
- Google remains capability-gated and uses the genuine Google Identity button when the live Auth config confirms readiness.
- Guest remembers only the existing entry cookie, closes the account page, and opens the ordinary Dashboard. The rejected custom Guest Dashboard and custom Guest navigation do not exist.
- Returning account/Guest entry does not repeatedly reopen Welcome.

## Paused Assistant

AI Assistant is not shipped in public HTML or the service-worker shell. It has no nav tab, Dashboard entry, visible onboarding control, or reachable `#ai` screen. Dormant source may remain for a separately reviewed future phase, but the onboarding feature flag is false and its controls are force-hidden and disabled.

## Auth truthfulness retained

- Email verification is a real link and is never described as Email OTP.
- Telegram is the only six-digit OTP presentation and does not claim Email ownership.
- WhatsApp stays unavailable without verified backend capability.
- Passkey remains optional and appears only after canonical verification.
- No frontend success state bypasses server-confirmed Firebase identity.

## Regression evidence

- `static-welcome-page-v3.test.mjs` locks the page semantics, composition, actions, paused Assistant, removed custom Guest Dashboard, Auth truthfulness, and synchronized release markers.
- `premium-onboarding-ui.test.mjs` covers first-entry runtime behavior, language switching, Guest persistence, progressive Signup, Email verification, and fail-closed states.
- `auth-native/operations/premium-onboarding-browser-audit.mjs` covers Chromium on iPhone `390×844` and desktop `1440×900`, native virtual Passkey, offline returning Guest, touch targets, page semantics, ordinary Guest routing, and zero page errors.
- `.github/workflows/telegram-auth-canary-activate.yml` remains the only protected publication path and validates the live asset markers after deployment.
