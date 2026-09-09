# LATEST — Infisical connected; credential-independent bootstrap correction in progress

**আপডেট:** 2026-09-09 (Asia/Dhaka) · Agent: **জুজু**

## Current state

- **IMPLEMENTED:** Phase 2B Email Gateway and protected GitHub OIDC → Infisical → existing Cloudflare staging infrastructure.
- **TESTED:** Email **99/99** + Worker integration **4/4**; Auth **62/62**; account retirement **28/28**. (The corrected bootstrap removes one obsolete Brevo-specific test.)
- **DEPLOYED/VERIFIED:** Bridge PR `#8`, path PR `#9`, immutable OIDC PR `#10`, Production-slug PR `#11`, and initial safe-bootstrap PR `#12` are merged. Their guards passed.
- **CONNECTED/VERIFIED:** OIDC-only Machine Identity authentication and exact `Production` / `prod` / `/email-gateway` read path succeed from protected GitHub Actions.
- **NOT STAGED:** No Cloudflare binding changed, no provider activated, and no email was sent.

The empty-source probe reached the local exact-name validator with all **33** names missing. A subsequent one-time bootstrap attempted to validate the previously authorized GitHub `BREVO_KEY` before any write; Brevo returned `401`, so the workflow stopped with **0 Infisical entries created**. That credential is truthfully treated as unavailable and is not migrated, retried blindly, revoked or replaced.

The bootstrap is being corrected to create only **18 credential-independent** entries: two generated runtime values, activation disabled, all-disabled config, seven sender display names and seven false evidence flags. It refuses overwrite/delete, uses one atomic batch, and has no provider or Cloudflare call.

## Infisical integration

- Source: dedicated Email Gateway project, `Production` / `prod` / `/email-gateway`
- Machine Identity: exact immutable GitHub environment subject; Universal Auth removed
- Normal role: project `Viewer` (read-only), organization `No Access`
- Protected staging: `.github/workflows/email-gateway-infisical-sync.yml`
- Safe core bootstrap: `.github/workflows/email-gateway-infisical-bootstrap.yml`
- Required staging contract: **33 names**, including `EMAIL_RECIPIENT_HASH_PEPPER`
- Expected remaining after safe core: all 8 provider credential names plus all 7 provider sender addresses = **15 names**
- EmailOctopus remains ineligible for direct transactional OTP

## Immediate next action

Merge the core-only bootstrap correction while the owner-granted temporary project `Member` role is active, dispatch it once, verify the exact 18 names without values, then immediately return the identity to `Viewer`. Afterward, genuine provider credentials/sender evidence must be sourced from each provider account directly into Infisical; they do not exist in authorized automation today.

Concrete Supabase/Auth authority work remains unstarted and requires explicit owner instruction.

Detailed handoff: `AGENT_RESUME/2026-09-09-juju-infisical-email-gateway-bridge.md`
