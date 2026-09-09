# Admission Hub — Infisical Email Gateway bridge

**আপডেট:** 2026-09-09 (Asia/Dhaka) · Agent: **জুজু**

## Current truth

- Owner created the dedicated Infisical source with only display environment `Production` (slug `prod`) and `/email-gateway`. It currently contains no values.
- Machine Identity `admission-hub-email-gateway-production` is OIDC-only, uses the exact immutable GitHub environment subject, has organization role `No Access`, and normally has read-only project role `Viewer`.
- The two public connection identifiers are configured in protected GitHub environment `email-gateway-production`; values are intentionally not repeated here.
- Bridge PR `#8`, path PR `#9`, immutable-subject PR `#10`, and Infisical Production-slug PR `#11` are merged.
- Provider activation and real Gmail OTP remain off. No probe changed a Worker binding.

## VERIFIED CONNECTION

Three bounded probes were used while the source was empty:

1. The first failed closed before source access because the OIDC Issuer had an accidental trailing slash.
2. After correction, OIDC authentication succeeded but source lookup showed that Infisical’s `Production` display environment uses slug `prod`, not `production`.
3. After PR `#11` and protected metadata correction, OIDC authentication and exact `/email-gateway` retrieval succeeded. The local allowlist validator then stopped as expected with all **33** source names absent. The Cloudflare staging, inventory and live-check steps were skipped.

This is direct evidence that GitHub OIDC, the Machine Identity, project identifier, Production slug, project role and exact folder path are connected. It is not evidence of any provider activation or delivery.

## IMPLEMENTED

- Protected staging workflow `.github/workflows/email-gateway-infisical-sync.yml`.
- Exact 33-name allowlist with `EMAIL_RECIPIENT_HASH_PEPPER`.
- Forced initial `EMAIL_PROVIDER_ACTIVATION=disabled`.
- Mode-`0600` ephemeral Cloudflare bulk payload and unconditional cleanup.
- No destructive destination synchronization; unrelated Worker bindings remain preserved.
- All secret-bearing actions pinned to immutable commit SHAs.
- Dedicated project boundary with read-only normal Machine Identity access.
- One-time setup guide `docs/email-gateway/INFISICAL_SETUP.md`.

## SAFE SOURCE BOOTSTRAP PREPARED

Names-only GitHub inspection confirmed the previously authorized repository secret `BREVO_KEY` still exists. Its value was not read or displayed.

A new protected workflow `.github/workflows/email-gateway-infisical-bootstrap.yml` and helper `email-gateway/operations/bootstrap-infisical-source.mjs` are prepared to:

1. require explicit manual confirmation, `main`, the protected production environment and GitHub OIDC;
2. receive the write-only authorized Brevo source only inside the hosted job;
3. run a bounded, non-mutating Brevo account authentication check;
4. refuse if any of its target names already exists;
5. generate independent signing and recipient-hash values in memory;
6. atomically create **19** Infisical entries: migrated Brevo key, two generated runtime values, activation disabled, all-disabled config, seven sender display names and seven `false` evidence flags;
7. verify names only;
8. never call Cloudflare, enable a provider, set an evidence flag true, send email, overwrite or delete.

The identity needs project `Member` only for this bounded write and must return to `Viewer` immediately afterward. Seven sender addresses and seven remaining provider credential names will still be absent; no placeholder credentials or invented senders will be created.

## TESTED / VERIFIED

- Full Email suite: **100/100 pass**
- Worker integration: **4/4 pass**
- Auth: **62/62 pass**
- Account retirement: **28/28 pass**
- Voice/same-origin regression: **7/7 pass**
- latest targeted Email/Infisical security set: **31/31 pass**
- exact Worker bundle, workflow YAML and static/diff checks: pass
- all five post-merge workflows for PRs `#9`, `#10`, and `#11`: pass
- live Worker public health and AI: `200`; unsigned internal Email route: `404`
- protected Pages source/internal paths: `404`

## STOP / next

1. Merge the tested safe-bootstrap workflow.
2. Owner temporarily changes the dedicated Infisical project role from `Viewer` to `Member`.
3. Agent dispatches bootstrap, verifies the Brevo account and exact 19 source names without values, then owner immediately returns the role to `Viewer`.
4. Add only genuinely available remaining provider sender/credential sources directly in Infisical.
5. Stage 33/33 bindings with activation disabled, validate provider account/sender/domain/quota one by one, and only then activate providers individually.
6. Perform one controlled Gmail OTP after all gates pass; no blind fallback or duplicate send.

Do not start concrete Supabase/Auth authority work without explicit owner instruction.
