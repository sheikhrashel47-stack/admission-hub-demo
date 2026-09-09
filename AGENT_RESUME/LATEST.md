# LATEST — Infisical OIDC/path verified; safe source bootstrap prepared

**আপডেট:** 2026-09-09 (Asia/Dhaka) · Agent: **জুজু**

## Current state

- **IMPLEMENTED:** Phase 2B Email Gateway and protected GitHub OIDC → Infisical → existing Cloudflare staging infrastructure.
- **TESTED:** Email **100/100** + Worker integration **4/4**; Auth **62/62**; account retirement **28/28**. Latest targeted Email/Infisical security set is **31/31**.
- **DEPLOYED/VERIFIED:** Bridge PR `#8`, path PR `#9`, immutable OIDC PR `#10`, and Production-slug PR `#11` are merged. All post-merge guards/deployments and live Worker/Pages boundary checks passed.
- **CONNECTED/VERIFIED:** The OIDC-only Machine Identity authenticates from the protected GitHub environment and reads display environment `Production` (slug `prod`) at `/email-gateway`. Both public identifiers are configured.
- **NOT STAGED:** The source is empty; the verified probe stopped at the local exact-name validator with all **33** names missing. No Cloudflare binding changed, no provider activated, and no email was sent.

An existing authorized repository secret named `BREVO_KEY` remains available from the prior working integration. A new bounded bootstrap workflow is prepared to validate that key without sending, migrate it as `BREVO_API_KEY`, and atomically create only 18 additional safe disabled/generated entries in Infisical. It refuses overwrite/delete and has no Cloudflare step.

## Infisical integration

- Source: dedicated Email Gateway project, `Production` / `prod` / `/email-gateway`
- Machine Identity: exact immutable GitHub environment subject; Universal Auth removed
- Normal role: project `Viewer` (read-only), organization `No Access`
- Protected staging workflow: `.github/workflows/email-gateway-infisical-sync.yml`
- Safe bootstrap workflow: `.github/workflows/email-gateway-infisical-bootstrap.yml`
- Safe bootstrap output: **19 names** total; activation disabled; all provider policies disabled; all evidence flags false
- Required staging contract: **33 names**, including `EMAIL_RECIPIENT_HASH_PEPPER`
- Remaining after successful safe bootstrap: seven provider sender addresses and seven credential names for providers other than the migrated Brevo source
- EmailOctopus remains ineligible for direct transactional OTP

## Immediate next action

Merge the tested safe-bootstrap workflow. Owner temporarily changes the dedicated project role from `Viewer` to `Member`; agent immediately dispatches the one-time workflow, verifies names only, then owner returns it to `Viewer`. Next, validate Brevo account/sender/quota and collect only genuinely available remaining provider sources directly in Infisical—never in chat.

Concrete Supabase/Auth authority work remains unstarted and requires explicit owner instruction.

Detailed handoff: `AGENT_RESUME/2026-09-09-juju-infisical-email-gateway-bridge.md`
