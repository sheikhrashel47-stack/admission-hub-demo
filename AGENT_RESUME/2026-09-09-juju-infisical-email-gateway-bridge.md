# Admission Hub — Infisical Email Gateway bridge

**আপডেট:** 2026-09-09 (Asia/Dhaka) · Agent: **জুজু**

## Current truth

- Owner created the dedicated Infisical source with only display environment `Production` (slug `prod`) and `/email-gateway`.
- Machine Identity `admission-hub-email-gateway-production` is OIDC-only, uses the exact immutable GitHub environment subject, has organization role `No Access`, and normally has read-only project role `Viewer`.
- Public connection identifiers are configured in protected GitHub environment `email-gateway-production`; values are intentionally not repeated here.
- PRs `#8`–`#12` for the bridge, path, immutable subject, Production slug and initial safe bootstrap are merged.
- Provider activation and real Gmail OTP remain off. No probe changed a Worker binding.

## VERIFIED CONNECTION

Three bounded probes were used while the source was empty:

1. The first failed closed before source access because the OIDC Issuer had an accidental trailing slash.
2. After correction, OIDC authentication succeeded but source lookup showed that Infisical’s `Production` display environment uses slug `prod`, not `production`.
3. After PR `#11` and metadata correction, OIDC authentication and exact `/email-gateway` retrieval succeeded. The local allowlist validator then stopped as expected with all **33** source names absent. Cloudflare staging was skipped.

This verifies GitHub OIDC, Machine Identity, project identifier, Production slug, read role and exact source path. It is not provider or delivery evidence.

## IMPLEMENTED

- Protected staging workflow `.github/workflows/email-gateway-infisical-sync.yml`.
- Exact 33-name allowlist including `EMAIL_RECIPIENT_HASH_PEPPER`.
- Forced initial `EMAIL_PROVIDER_ACTIVATION=disabled`.
- Mode-`0600` ephemeral Cloudflare bulk payload and unconditional cleanup.
- No destructive destination sync; unrelated Worker bindings remain preserved.
- All secret-bearing actions pinned to immutable commit SHAs.
- Dedicated project boundary with normal read-only Machine Identity access.
- One-time guide `docs/email-gateway/INFISICAL_SETUP.md`.

## BREVO SOURCE RESULT

Names-only GitHub inspection confirmed the previously authorized repository secret `BREVO_KEY` still exists. Its value was not read or displayed. The initial PR `#12` bootstrap performed one bounded, non-mutating Brevo account check before any Infisical write. Brevo returned `401`; therefore:

- the old credential is truthfully unavailable;
- **0** Infisical entries were created by that run;
- it was not migrated, exposed, retried blindly, revoked or replaced;
- only Brevo-dependent work is blocked by that credential result.

## CREDENTIAL-INDEPENDENT BOOTSTRAP CORRECTION

The bootstrap is corrected to make no provider request and receive no provider credential. It will:

1. require explicit confirmation, `main`, protected environment and GitHub OIDC;
2. refuse if any target name already exists;
3. generate independent signing and recipient-hash values in memory;
4. atomically create exactly **18** entries: two generated runtime values, activation disabled, all-disabled config, seven sender display names and seven `false` evidence flags;
5. verify names only;
6. never call Cloudflare, enable a provider, set evidence true, send email, overwrite or delete.

The identity needs project `Member` only for this bounded batch and must return to `Viewer` immediately after verification. All eight provider credential names and seven sender addresses remain absent; no placeholder credential or invented sender is created.

## TESTED / VERIFIED

- Full Email suite: **99/99 pass**
- Worker integration: **4/4 pass**
- Auth: **62/62 pass**
- Account retirement: **28/28 pass**
- Voice/same-origin regression: **7/7 pass**
- exact Worker bundle, all workflow YAML and static/diff checks: pass
- post-merge guards/deployments through PR `#12`: pass
- live Worker public health and AI: `200`; unsigned internal Email route: `404`
- protected Pages source/internal paths: `404`

## STOP / next

1. Merge the core-only bootstrap correction while temporary project `Member` is active.
2. Dispatch once, verify the exact 18 names without values, and immediately return the identity to `Viewer`.
3. Source genuine provider credentials and sender addresses from each provider account directly into Infisical; no authorized automation currently holds valid values.
4. Stage 33/33 bindings with activation disabled, validate provider account/sender/domain/quota one by one, then activate providers individually.
5. Perform one controlled Gmail OTP after all gates pass; no blind fallback or duplicate send.

Do not start concrete Supabase/Auth authority work without explicit owner instruction.
