# LATEST — Infisical project path ready; OIDC identity bootstrap remains

**আপডেট:** 2026-09-09 (Asia/Dhaka) · Agent: **জুজু**

## Current state

- **IMPLEMENTED:** Phase 2B Email Gateway and a protected GitHub OIDC → Infisical → existing Cloudflare secret-staging path.
- **TESTED:** Email **96/96** + Worker integration **4/4**; Auth **62/62**; account retirement **28/28**; exact bundle and YAML checks pass. The path simplification’s targeted Email security suite is **27/27**.
- **DEPLOYED/VERIFIED:** Infisical bridge PR `#8` and `/email-gateway` path simplification PR `#9` are merged. All five post-merge workflows pass; public Worker health and AI are `200`, unsigned internal Email Gateway is `404`, and protected Pages paths are `404`.
- **NOT STAGED:** The Infisical staging workflow has not been dispatched and no Worker secret value changed.
- **BLOCKED:** The Infisical OIDC identity/project identifiers and required source values are not configured yet.

Owner created the Infisical project, selected only `Production`, and created the dedicated `/email-gateway` folder. No secret has been added. The protected GitHub environment already has the non-secret Infisical domain, environment and path variables; project slug and OIDC Machine Identity ID remain unset. Provider activation, remote provider validation and real Gmail OTP remain unperformed.

## Infisical integration

- Workflow: `.github/workflows/email-gateway-infisical-sync.yml`
- Guide: `docs/email-gateway/INFISICAL_SETUP.md`
- Source: environment `production`, path `/email-gateway`
- Destination: Cloudflare Worker `admission-gk` through the already-working protected GitHub Cloudflare access
- Authentication: GitHub OIDC Machine Identity; no stored Infisical client secret in GitHub
- Exact GitHub OIDC subject: immutable owner/repository-ID prefix plus `environment:email-gateway-production`, verified through GitHub’s OIDC settings API
- Initial staging: activation must be `disabled`
- Payload: exact allowlist only, mode `0600`, ephemeral, unconditional cleanup
- Required names: **33**, including `EMAIL_RECIPIENT_HASH_PEPPER`
- EmailOctopus remains ineligible for direct transactional OTP

## Immediate next action

Create the dedicated Infisical Machine Identity, add exact GitHub OIDC authentication, and grant it read-only access to the Admission Hub production `/email-gateway` source. Then the agent can configure the two public identifiers in GitHub. Required source values still need to exist before a 33/33 activation-disabled stage can run.

Concrete Supabase/Auth authority work remains unstarted and requires explicit owner instruction.

Detailed handoff: `AGENT_RESUME/2026-09-09-juju-infisical-email-gateway-bridge.md`
