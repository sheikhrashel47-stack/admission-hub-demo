# Zero-raster code-native Welcome and Personal v1

## User correction

The prior Welcome and Personal compositions were rejected because they looked like placed images, had weak positioning, and left excessive side space. This release replaces both pages from scratch instead of restyling either rejected hero.

## Active contracts

- Page shell: `code-native-page-system-v1`
- Welcome: `code-native-welcome-v1`
- Welcome visual: `journey-console-v1`
- Personal: `interactive-native-personal-v1`
- Personal live preview: `input-bound-profile-v1`
- Media boundary: `zero-raster-entry-v1`
- UI assets: `20260911-code-native-entry-v1-ai-scope`
- Service worker: `v240-code-native-entry-20260911`

## Visible implementation

### Welcome

- Uses a modular study-path console made from independent DOM cards, route nodes, progress rails, text, CSS geometry, and inline icon paths.
- On pointer devices the console responds with a bounded perspective shift; touch remains stable and reduced-motion disables it.
- Uses fluid mobile gutters of 12–16 CSS pixels rather than a fixed narrow phone canvas.
- Keeps exactly Sign Up, Log In, Continue with Google, and Continue as Guest.
- Keeps the local বাংলা/English selector and full-screen document semantics.

### Personal

- Replaces the decorative illustration with a real live profile module.
- Typing a valid name updates the visible name, grapheme-safe initials, completion ring, progress bar, and name state.
- Selecting day, month, and year updates the visible Bengali date and moves completion to 100%.
- Real validated name and DOB controls remain on Personal; Email remains on Security.
- Mobile uses near-edge-to-edge cards; desktop uses a bounded responsive two-column composition.

## Zero-raster boundary

The account/onboarding source contains no `img`, `picture`, `source`, `canvas`, `video`, `object`, or `embed` element. Its CSS contains no URL-backed background. Both rejected WebP files are absent from source, sanitized Pages bundles, service-worker cache entries, and live publication fetches.

Inline SVG paths are markup, not downloaded images. They are limited to small interface icons and brand marks; the page visuals and live state are DOM/CSS.

## Safety and continuity

- Signup/Onboarding contains no Assistant component or AI request.
- The ordinary Dashboard and its existing optional AI route remain available to Guest and signed-in users.
- Firebase remains canonical identity authority.
- Email/Password, Google, Telegram, profile synchronization, verification selection, Passkey ordering, and account-retirement boundaries are unchanged.
- Motion is lightweight and disabled under `prefers-reduced-motion: reduce`.
- Protected publication fails closed if raster media, either retired hero filename, old contracts, or mismatched release markers return.

## Regression evidence

- `code-native-welcome-v1.test.mjs`
- `interactive-native-personal-v1.test.mjs`
- `premium-onboarding-ui.test.mjs`
- `auth-native/operations/premium-onboarding-browser-audit.mjs`
- `.github/workflows/cf-pages.yml`
- `.github/workflows/telegram-auth-canary-activate.yml`
