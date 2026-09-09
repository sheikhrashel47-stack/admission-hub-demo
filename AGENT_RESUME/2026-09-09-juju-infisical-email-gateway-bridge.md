# Admission Hub — Infisical Email Gateway bridge

**আপডেট:** 2026-09-09 (Asia/Dhaka) · Agent: **জুজু**

## Current truth

- Owner created the Infisical project, selected only `Production`, and created the dedicated `/email-gateway` folder. No source value has been added.
- Local authorized environment inspection found no connected Infisical CLI/session/API configuration.
- Existing protected GitHub Actions Cloudflare access remains usable; it already deployed and inventoried Worker `admission-gk`.
- Bridge PR `#8` merged as `9cf0600290edab37e39ced24f84aa8c9ed15fa2b`; path simplification PR `#9` merged as `0b6ddaf60d04c65fe3d7b975b3401693fb5f9f18`.
- Provider activation and real Gmail OTP remain off; no secret sync was dispatched.

## IMPLEMENTED

- Added protected manual workflow `.github/workflows/email-gateway-infisical-sync.yml`.
- Uses GitHub OIDC and a path-scoped Infisical Machine Identity; no Infisical client secret is required in GitHub.
- All third-party actions in the new secret-bearing workflow are pinned to immutable commit SHAs.
- Reads only `production` path `/email-gateway` with imports and recursion disabled.
- Added allowlisted, bounded staging helper `email-gateway/operations/prepare-infisical-worker-secrets.mjs`.
- Initial staging refuses to proceed unless `EMAIL_PROVIDER_ACTIVATION=disabled`.
- Writes only the exact allowlist to a mode-`0600` ephemeral runner file and removes it with `always()` cleanup.
- Existing Cloudflare GitHub secrets are used only as the destination transport; provider values originate in Infisical.
- Post-stage inventory reports names only and fails when any required name remains absent.
- Added one-time setup guide `docs/email-gateway/INFISICAL_SETUP.md`.
- Preserved the owner’s Infisical-first autonomous access policy in `AGENT_RESUME/README.md`.

## Corrected activation prerequisites

`EMAIL_RECIPIENT_HASH_PEPPER` is required by the runtime before any send. It is included in the binding inventory and Infisical allowlist. The complete Worker-bound prerequisite is therefore **33 names**.

The repository was created after GitHub’s 2026-07-15 immutable-subject cutoff. GitHub’s OIDC settings API confirms prefix `repo:sheikhrashel47-stack@312915857/admission-hub-demo@1352051890`; the Infisical identity must use that prefix with `:environment:email-gateway-production`. The earlier mutable-name-only subject would fail OIDC authentication and has been corrected in the guide.

## TESTED / VERIFIED

- Email suite: **96/96 pass**
- Worker integration: **4/4 pass**
- Auth: **62/62 pass**
- Account retirement: **28/28 pass**
- Voice/same-origin regression: **7/7 pass**
- path simplification targeted Email security suite: **27/27 pass**
- exact Worker bundle: pass
- all touched workflow YAML: parse pass
- static/diff checks: pass
- all five post-merge workflows for PR `#9`: pass
- live Worker `/pub/health` and `/api/ai/status`: `200`; unsigned internal Email route: `404`
- protected Pages source/internal paths: `404`

## STOP / next

Only unavoidable account-owner UI bootstrap remains before autonomous connection validation:

1. Create the dedicated Infisical Machine Identity.
2. Add exact immutable GitHub OIDC authentication and remove Universal Auth.
3. Add the identity to Admission Hub with the smallest read-only project/path scope.
4. Obtain the public project slug and Machine Identity ID; the agent will configure them in the protected GitHub environment.
5. Add the required provider/sender/runtime source values in Infisical without exposing them in chat.

After that, dispatch the protected staging workflow, require 33/33 binding names, validate provider accounts/senders/quotas one at a time, then activate and perform one controlled Gmail OTP send. Do not start concrete Supabase/Auth authority work without explicit owner instruction.
