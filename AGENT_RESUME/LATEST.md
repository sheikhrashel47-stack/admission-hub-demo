# LATEST — Infisical OIDC connected; Production slug correction in progress

**আপডেট:** 2026-09-09 (Asia/Dhaka) · Agent: **জুজু**

## Current state

- **IMPLEMENTED:** Phase 2B Email Gateway and a protected GitHub OIDC → Infisical → existing Cloudflare secret-staging path.
- **TESTED:** Email **96/96** + Worker integration **4/4**; Auth **62/62**; account retirement **28/28**; exact bundle and YAML checks pass. Targeted Email security suite is **27/27**.
- **DEPLOYED/VERIFIED:** Infisical bridge PR `#8`, path simplification PR `#9`, and immutable OIDC correction PR `#10` are merged. Their post-merge workflows and live Worker/Pages boundary checks passed.
- **CONNECTED:** The dedicated Machine Identity is OIDC-only, uses the exact immutable GitHub subject, and has read-only Viewer access to the dedicated Email Gateway Infisical project. Both public connection identifiers are configured in the protected GitHub environment.
- **NOT STAGED:** No Worker binding value changed; no provider was activated and no email was sent.
- **BLOCKED:** The required 33 source values are absent. Before reaching that expected validation, the workflow needs the Infisical Production environment’s actual slug `prod` rather than its display name `Production`.

The first bounded connection probe failed closed on an accidental trailing slash in the OIDC issuer and changed nothing. After the owner corrected it, the second probe authenticated successfully and reached Infisical; it then returned `SecretPathNotFound` because the workflow requested environment slug `production`. The source folder is under the default Production slug `prod`. A minimal workflow/docs correction is now in progress.

## Infisical integration

- Workflow: `.github/workflows/email-gateway-infisical-sync.yml`
- Guide: `docs/email-gateway/INFISICAL_SETUP.md`
- Source: display environment `Production`, slug `prod`, path `/email-gateway`
- Dedicated project boundary: Email Gateway source only; Machine Identity project role `Viewer` (read-only)
- Destination: Cloudflare Worker `admission-gk` through existing protected GitHub Cloudflare access
- Authentication: GitHub OIDC only; Universal Auth removed; no stored Infisical client secret
- Initial staging: activation must be `disabled`
- Payload: exact allowlist only, mode `0600`, ephemeral, unconditional cleanup
- Required names: **33**, including `EMAIL_RECIPIENT_HASH_PEPPER`
- EmailOctopus remains ineligible for direct transactional OTP

## Immediate next action

Merge and deploy the `prod` slug correction, update the protected GitHub environment metadata, and rerun the bounded connection probe. Expected safe result with the empty source is successful OIDC/path fetch followed by the local 33-name validator failing before Cloudflare staging. Then add required source values without exposing them in chat.

Concrete Supabase/Auth authority work remains unstarted and requires explicit owner instruction.

Detailed handoff: `AGENT_RESUME/2026-09-09-juju-infisical-email-gateway-bridge.md`
