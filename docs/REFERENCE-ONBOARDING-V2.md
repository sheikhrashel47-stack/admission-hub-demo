# Reference Onboarding Visual v2

## Authority

The supplied 18-screen Admission Hub montage is the visual source of truth. The implementation is one accessible interactive state machine in `account-access.js`; it is not a second onboarding flow and does not embed the montage as a fake interface.

Visual contract: `reference-onboarding-v2`

Guest dashboard contract: `reference-guest-v2`

Shell build: `v235-reference-onboarding-20260911`

## Screen mapping

| Reference | Interactive implementation |
|---|---|
| 1 Welcome | Full-screen first-entry Welcome with original academic hero and exactly four entry paths |
| 2 Personal | Personal profile substep |
| 3 Date of Birth | Standalone DOB selector substep |
| 4 School | Standalone integrated school autocomplete substep |
| 5 College/University | Standalone integrated higher-institution autocomplete substep |
| 6 Password | Security substep with truthful live strength, match, and rule feedback |
| 7 Account Created | Shown only after the signup authority confirms account creation |
| 8 Verification Methods | Email, post-verification Passkey information, unavailable WhatsApp information, and capability-gated Telegram |
| 9 Email Onboarding | Deliberate pre-delivery screen; no email is sent until its CTA is pressed |
| 10 OTP visual | Used only for the genuine Telegram six-digit OTP; Email remains link verification |
| 11 Waiting | Email-link pending screen with explicit status check |
| 12 Verified | Dynamically says Email, Telegram, or Account and never conflates Telegram with email ownership |
| 13 Passkey | Optional only after canonical verification, with Skip |
| 14 WhatsApp | Transparent unavailable-information state; CTA is disabled and sends nothing |
| 15 Telegram | Truthful official-bot onboarding, followed by real OTP entry |
| 16 AI Assistant | User-opened full-page, allowlisted, secret-safe assistant; default hidden |
| 17 Login | Mobile login with genuine Google/Passkey capability gating |
| 18 Guest Dashboard | Four real quick-access routes, academic future card, and four-tab mobile navigation |

## Non-negotiable truth boundaries

- Firebase remains the canonical identity authority.
- Email verification is a real link flow, never represented as Email OTP.
- Telegram OTP proves control of the Telegram account, not email ownership.
- WhatsApp cannot send or report success while unavailable.
- Passkey is optional and is not offered as pre-verification identity proof.
- Guest conversations are not durably persisted.
- No Password, OTP, token, or secret is sent to the onboarding assistant.

## Regression gates

- `reference-onboarding-visual-v2.test.mjs` locks the screen inventory, method truthfulness, narrow composition, Guest dashboard, assets, and cache versions.
- `premium-onboarding-ui.test.mjs` locks runtime state transitions and no-delivery-before-selection behavior.
- `telegram-otp-ui.test.mjs` locks the genuine six-digit Telegram OTP lifecycle.
- `auth-native/operations/premium-onboarding-browser-audit.mjs` runs an iPhone flow, virtual-device Passkey flow, keyboard/accessibility checks, Guest persistence/offline checks, and the narrow desktop composition.
- `.github/workflows/cf-pages.yml` is bundle-validation only and cannot publish on a merge.
- This visual-v2 release must use `.github/workflows/telegram-auth-canary-activate.yml`; it verifies the deployed visual and shell contracts before the protected release can complete.
