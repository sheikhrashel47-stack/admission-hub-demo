# Static reference Signup 01 / Personal v1 — retired

> Retired on 2026-09-11 after the user correctly rejected the cropped raster hero as looking like a pasted screenshot. The crop asset and every runtime/cache reference remain absent in the active zero-raster code-native entry release.

## Source of truth

- User-supplied image: `/home/user/uploads/739B0A6A-990E-4B76-BDC4-7F253413DACB.png`
- Source dimensions: `853 × 1844`
- Source SHA-256: `87bf48c963232e8ee9c814f243bab5ed4edbb19666201a208d87060baa84a6a1`
- Local hero crop: `onboarding-personal-hero.webp` (`565 × 370`, 18,770 bytes)
- Hero SHA-256: `145c632746d54f6b82ae3a27be766811485eb173b3d123fd3c29063833334b0d`

## UI contract

- Marker: `static-reference-personal-v1`
- Personal combines full name and day/month/year DOB in one visible step.
- Signup stage order is `personal → school → college → security`; the top progress remains `01 Personal / 02 Education / 03 Security`.
- Email moved to Security so the Personal composition remains faithful without changing the real signup payload.
- Blank DOB selectors use an em dash rather than silently pre-filling false personal data.
- The page is a `390 × 844`-fit mobile document, with no horizontal overflow and no modal/dialog semantics.
- Signup has no AI component or AI request. The ordinary application AI remains shipped.

## Release contract

- UI assets: `20260911-static-reference-personal-v1-ai-scope`
- Service worker: `v238-personal-20260911`
- Personal hero is part of the lean offline app shell.
- Protected publication verifies the Personal markers, local hero, merged DOB structure, Signup AI isolation, and ordinary-app AI assets.

## Validation

- `static-personal-page-v1.test.mjs`
- `premium-onboarding-ui.test.mjs`
- `auth-native/operations/premium-onboarding-browser-audit.mjs`
- Local comparison capture: `personal-mobile-preview.png` (`390 × 844`, intentionally not a deployed asset)
