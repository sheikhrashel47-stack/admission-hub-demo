# Admission Hub — Infisical Email Gateway bridge

**আপডেট:** 2026-09-09 (Asia/Dhaka) · Agent: **জুজু**

## Current truth

- Owner confirmed an Infisical account exists, but the Admission Hub Infisical project has not yet been created.
- Local authorized environment inspection found no Infisical CLI, session, environment variable or project configuration.
- Existing protected GitHub Actions Cloudflare access remains usable; it already deployed and inventoried Worker `admission-gk`.
- Provider activation and real Gmail OTP remain off; no secret sync was dispatched.

## IMPLEMENTED

- Added protected manual workflow `.github/workflows/email-gateway-infisical-sync.yml`.
- Uses GitHub OIDC and a path-scoped Infisical Machine Identity; no Infisical client secret is required in GitHub.
- All third-party actions in the new secret-bearing workflow are pinned to immutable commit SHAs.
- Reads only `production` path `/email-gateway/worker` with imports and recursion disabled.
- Added allowlisted, bounded staging helper `email-gateway/operations/prepare-infisical-worker-secrets.mjs`.
- Initial staging refuses to proceed unless `EMAIL_PROVIDER_ACTIVATION=disabled`.
- Writes only the exact allowlist to a mode-`0600` ephemeral runner file and removes it with `always()` cleanup.
- Existing Cloudflare GitHub secrets are used only as the destination transport; provider values originate in Infisical.
- Post-stage inventory reports names only and fails when any required name remains absent.
- Added one-time setup guide `docs/email-gateway/INFISICAL_SETUP.md`.
- Preserved the owner’s Infisical-first autonomous access policy in `AGENT_RESUME/README.md`.

## Corrected activation prerequisite

`EMAIL_RECIPIENT_HASH_PEPPER` is required by the runtime before any send. It is now included in the binding inventory and Infisical allowlist. The complete Worker-bound prerequisite is therefore **33 names**, not 32.

## TESTED

- Email suite: **96/96 pass**
- Worker integration: **4/4 pass**
- Auth: **62/62 pass**
- Account retirement: **28/28 pass**
- Voice/same-origin regression: **7/7 pass**
- exact Worker bundle: pass
- all touched workflow YAML: parse pass
- static/diff checks: pass

## STOP / next

Only the account-owner UI bootstrap remains before autonomous sync can run:

1. Create Infisical project `Admission Hub`.
2. Create environment slug `production` and path `/email-gateway/worker`.
3. Configure the documented OIDC Machine Identity and add provider/sender/runtime values in Infisical.
4. Configure the two non-secret GitHub environment identifiers; the agent can configure all known path/domain variables itself.

After that, dispatch the protected staging workflow, require 33/33 binding names, validate provider accounts/senders/quotas one at a time, then activate and perform one controlled Gmail OTP send. Do not start concrete Supabase/Auth authority work without explicit owner instruction.
