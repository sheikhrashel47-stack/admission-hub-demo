# Native reference Signup 01 / Personal v2

## Correction

The user rejected Personal v1 because its hero used a crop from the supplied screenshot and therefore looked pasted. V2 removes that file and rebuilds the complete profile illustration from semantic HTML elements and CSS gradients/shapes.

## Visual and functional contract

- Visual source remains the user-supplied Personal reference.
- Marker: `native-reference-personal-v2`.
- Illustration marker: `native-dom-profile-v1`.
- The hero contains native DOM/CSS profile tile, pedestal, book, graduation cap, paper plane, leaf, orbit and sparkle layers.
- Personal contains no raster image, canvas, video, WebGL or remote visual dependency.
- Full name and real day/month/year selects remain interactive and validated on the same page.
- Email remains on Security so no verification delivery starts from Personal.
- The page retains the `390 × 844` composition, compact-phone scrolling, narrow desktop layout, accessibility labels and reduced-motion behavior.
- Signup remains AI-free; ordinary Dashboard AI remains available.

## Release contract

- UI assets: `20260911-native-personal-v2-ai-scope`
- Service worker: `v239-native-personal-20260911`
- The rejected `onboarding-personal-hero.webp` is absent from source, the sanitized bundle and the service-worker shell.
- Protected publication checks the native hero marker and fails if a Personal raster reference returns.

## Tests

- `native-personal-page-v2.test.mjs`
- `premium-onboarding-ui.test.mjs`
- `auth-native/operations/premium-onboarding-browser-audit.mjs`
