# Admission Hub — Infisical Email Gateway bridge

**আপডেট:** 2026-09-09 (Asia/Dhaka) · Agent: **জুজু**

## Current truth

- Owner created the Infisical project with only the `Production` environment and dedicated `/email-gateway` folder. No source value has been added.
- Owner created Machine Identity `admission-hub-email-gateway-production`, configured GitHub OIDC, removed Universal Auth, and granted read-only Viewer access to this dedicated Email Gateway project.
- The exact public Machine Identity and project identifiers are configured and verified in GitHub environment `email-gateway-production`; values are intentionally not repeated here.
- Existing protected GitHub Actions Cloudflare access remains usable; it already deployed and inventoried Worker `admission-gk`.
- Bridge PR `#8` merged as `9cf0600290edab37e39ced24f84aa8c9ed15fa2b`; path simplification PR `#9` as `0b6ddaf60d04c65fe3d7b975b3401693fb5f9f18`; immutable OIDC guide PR `#10` as `0f511935346fe4007ec9cc739cb80f2a06500779`.
- Provider activation and real Gmail OTP remain off. Two bounded connection probes changed no Worker value.

## IMPLEMENTED

- Added protected manual workflow `.github/workflows/email-gateway-infisical-sync.yml`.
- Uses GitHub OIDC only; no Infisical client secret is required in GitHub.
- All third-party actions in the secret-bearing workflow are pinned to immutable commit SHAs.
- Reads only Production slug `prod`, path `/email-gateway`, with imports and recursion disabled.
- Added allowlisted, bounded staging helper `email-gateway/operations/prepare-infisical-worker-secrets.mjs`.
- Initial staging refuses to proceed unless `EMAIL_PROVIDER_ACTIVATION=disabled`.
- Writes only the exact allowlist to a mode-`0600` ephemeral runner file and removes it with `always()` cleanup.
- Existing Cloudflare GitHub secrets are used only as destination transport; provider values originate in Infisical.
- Post-stage inventory reports names only and fails when any required name remains absent.
- Added one-time setup guide `docs/email-gateway/INFISICAL_SETUP.md`.
- Preserved the owner’s Infisical-first autonomous access policy in `AGENT_RESUME/README.md`.

## Corrected connection prerequisites

`EMAIL_RECIPIENT_HASH_PEPPER` is required by runtime before any send. It is included in the binding inventory and Infisical allowlist. The complete Worker-bound prerequisite is **33 names**.

The repository was created after GitHub’s 2026-07-15 immutable-subject cutoff. GitHub’s OIDC settings API confirmed the immutable prefix used in the setup guide. The Machine Identity now uses that exact environment-bound subject.

Infisical distinguishes display environment name from environment slug. The selected display name is `Production`; its default slug is `prod`. The earlier `production` metadata reached Infisical after successful OIDC but could not resolve `/email-gateway`. The workflow/docs are being corrected to `prod`; runtime production semantics and GitHub environment name remain unchanged.

## TESTED / VERIFIED

- Email suite: **96/96 pass**
- Worker integration: **4/4 pass**
- Auth: **62/62 pass**
- Account retirement: **28/28 pass**
- Voice/same-origin regression: **7/7 pass**
- targeted Email security suite: **27/27 pass**
- exact Worker bundle and workflow YAML: pass
- all five post-merge workflows for PR `#9` and PR `#10`: pass
- live Worker `/pub/health` and `/api/ai/status`: `200`; unsigned internal Email route: `404`
- protected Pages source/internal paths: `404`
- first OIDC probe: failed closed before source access because of an issuer trailing-slash mismatch; no destination step ran
- second OIDC probe: OIDC authentication succeeded; failed at source lookup because `production` was not the selected environment’s slug; no validation or destination step ran

## STOP / next

1. Merge the minimal Infisical environment-slug correction and set protected metadata to `prod`.
2. Rerun the bounded connection probe. With an empty source, it must fetch the path successfully and then stop at the local 33-name validator before Cloudflare staging.
3. Add the 33 required provider/sender/runtime source values without exposing them in chat.
4. Stage all names with global activation forced disabled, then verify providers one at a time before any activation.
5. Perform one controlled Gmail OTP only after sender/account/quota and remote-health evidence succeeds.

Do not start concrete Supabase/Auth authority work without explicit owner instruction.
