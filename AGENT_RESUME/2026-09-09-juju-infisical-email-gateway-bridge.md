# Admission Hub — Infisical provider-source and no-send audit handoff

**Updated:** 2026-09-09 (Asia/Dhaka) · Agent: **Juju**

## STATUS

- **IMPLEMENTED:** Protected OIDC source read/stage bridge, create-only credential-independent bootstrap, names-only Cloudflare inventory, and bounded provider account audits that use only GET requests.
- **TESTED:** Email **105/105**, Worker integration **4/4**, provider-audit subset **4/4**; YAML, syntax, static secret scan and diff checks pass.
- **VERIFIED:** Eight required provider credential names were owner-imported directly into Infisical without chat transfer. Required source state is **26/33**; exactly seven sender addresses remain.
- **BLOCKED:** Brevo rejects the owner-updated standard-prefix REST credential with `401`. Full production sender alignment across the pool cannot use `admissionhub.pages.dev`, because the parent email/DNS domain is not owner-controlled.

## SOURCE HISTORY

1. Run `34324147787` atomically created exactly 18 credential-independent entries under `Production` / `prod` / `/email-gateway`: independent signing/pepper values, disabled activation/config, seven sender names and seven false evidence flags.
2. Run `34324194702` verified the initial **18/33** state and reported 15 provider-owned names missing. No Cloudflare write ran.
3. The owner restored the OIDC Machine Identity project role from temporary `Member` to normal `Viewer`.
4. The owner used Infisical `Paste Secrets` to add all eight required credential names and retained one additional EmailOctopus credential. Values stayed masked and were not transferred through chat.
5. Run `34333113150` verified that only these seven required names remain absent: `BREVO_FROM_ADDRESS`, `COURIER_FROM_ADDRESS`, `MAILERSEND_FROM_ADDRESS`, `MAILJET_FROM_ADDRESS`, `MAILTRAP_FROM_ADDRESS`, `RESEND_FROM_ADDRESS`, `SENDPULSE_FROM_ADDRESS`. Cloudflare staging and live checks were skipped.

The extra EmailOctopus source is intentionally excluded from the exact 33-binding Worker payload. EmailOctopus remains ineligible for direct transactional OTP.

## CLOUDFLARE INVENTORY

Protected names-only run `34327554785` found:

- Worker `admission-gk`: legacy `BREVO_FROM`, `BREVO_KEY`, `MAIL_FROM`, `RESEND_KEY`, `RESEND_KEY_2`.
- Worker `ah-public`: legacy `MAIL_FROM`, `RESEND_KEY`, `RESEND_KEY_2`.
- Pages: no provider-related names.

No Mailjet, Mailtrap, MailerSend, SendPulse, EmailOctopus or Courier credential binding was found. Existing Worker secret values remain unreadable/export-ineligible by design. No binding was changed.

## PROTECTED PROVIDER AUDIT

PRs `#16`–`#19` added and hardened `.github/workflows/email-gateway-provider-account-audit.yml` and `email-gateway/operations/audit-provider-accounts.mjs`:

- manual, main-only, protected production environment;
- GitHub OIDC reads credentials from exact Infisical path;
- GET-only provider endpoints with 15-second request bounds;
- fixed authentication/readiness enums and numeric counts only;
- no response body, account/sender address, credential value, length, suffix or hash output;
- no provider send/mutation, Cloudflare call, activation or deployment.

Final normalized run `34334948971` verified:

- Resend: credential valid; zero verified owner domains; account-email testing only.
- Brevo: credential invalid; standard REST prefix present; read-only `/v3/account` returns `401`.
- Mailjet: credential pair valid; zero active senders.
- Mailtrap: credential valid; sandbox/demo only; zero compliant verified domains.
- MailerSend: credential valid; one verified-or-trial domain. This is not evidence of owner-domain production eligibility.
- SendPulse: credential valid; zero active SMTP senders.
- Courier: credential valid; downstream email provider setup not verified.

The Brevo credential remains an isolated adapter blocker. Do not retry blindly, revoke, rotate or delete any credential without owner action. Six valid providers can continue through their non-destructive setup paths.

## MERGED COMMITS

- PR `#13`: corrected core-only bootstrap → `9a4b2f464829cdd84ffafb5ff4e151aa508032cb`.
- PR `#14`: Cloudflare names-only inventory → `ffbedfb57b8796318aae4296d25559a8fafcaf89`.
- PR `#15`: corrected bootstrap/audit handoff → `835c752013cbce33c1ab2f2f6cea1c62ce686807`.
- PR `#16`: provider no-send audit → `d322924215e4d2f173014b176246745f3c874c20`.
- PR `#17`: normalized credentials and trial-domain truthfulness → `1cbbff0549dd9f40de55bc4806c84c7e55a84848`.
- PR `#18`: Brevo account-vs-sender-scope distinction → `69b8887f92757bdd48e109388cec7eed8f3c3f63`.
- PR `#19`: Brevo standard-prefix classification → `5c3867888c72ae2a95334db960f946d823403d35`.

## CURRENT SAFETY STATE

- Infisical required source: **26/33** plus one ignored EmailOctopus source.
- OIDC identity: `Viewer`; organization: `No Access`.
- Global activation and all provider policies: disabled.
- All sender verification evidence: false.
- No Cloudflare binding staged from Infisical yet.
- No provider mutation or email send occurred.

## NEXT

1. Continue six valid providers without waiting on Brevo.
2. Obtain only genuine provider-approved sender addresses. Domainless sandbox/trial/account identities may be used only within their official restrictions; unsupported providers remain disabled.
3. For full production, obtain one owner-controlled domain, verify it provider-by-provider, and publish required DNS records.
4. When all seven sender names exist, run exact 33-name validation and additive Cloudflare staging with activation disabled.
5. Validate account/sender/quota, enable providers individually, then perform one controlled Gmail OTP with no blind fallback or duplicate send.

Do not start concrete Supabase/Auth authority work without explicit owner instruction.
