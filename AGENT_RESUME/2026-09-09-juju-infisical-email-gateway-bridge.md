# Admission Hub — Infisical and Cloudflare Email Gateway handoff

**Updated:** 2026-09-09 (Asia/Dhaka) · Agent: **Juju**

## STATUS

- **IMPLEMENTED:** Protected GitHub OIDC → Infisical read/stage bridge, create-only credential-independent bootstrap, exact 33-name validation, additive Cloudflare staging, and names-only Cloudflare provider-location audit.
- **TESTED:** Full Email suite **101/101** plus integration **4/4** after the latest correction/audit change. Inventory-specific tests passed **2/2**. YAML, Node syntax and diff checks passed.
- **VERIFIED:** Infisical connection and exact path work; core source is **18/33**; owner confirmed the Machine Identity role was restored to normal `Viewer`.
- **BLOCKED:** Fifteen genuine provider-owned values are absent. Complete multi-provider production sender verification cannot use the Cloudflare-owned `pages.dev` hostname as an email domain.

## INFISICAL RESULTS

The corrected core-only bootstrap was merged in PR `#13` as `9a4b2f464829cdd84ffafb5ff4e151aa508032cb`.

Run `34324147787` used the protected GitHub environment and OIDC to atomically create exactly 18 credential-independent entries under `Production` / `prod` / `/email-gateway`:

- independent generated signing and recipient-hash values;
- `EMAIL_PROVIDER_ACTIVATION=disabled`;
- all-disabled provider/router policy;
- seven `Admission Hub` provider sender names;
- seven false sender-evidence flags.

It did not receive or call a provider credential, call Cloudflare, overwrite/delete a source entry, activate a provider or send email. Names-only post-write verification succeeded.

Run `34324194702` then fetched the source successfully and the local validator reported exactly 15 missing names. Cloudflare staging, destination inventory and live checks were skipped. The missing names are:

- `BREVO_API_KEY`, `BREVO_FROM_ADDRESS`
- `COURIER_API_KEY`, `COURIER_FROM_ADDRESS`
- `MAILERSEND_API_KEY`, `MAILERSEND_FROM_ADDRESS`
- `MAILJET_API_KEY`, `MAILJET_SECRET_KEY`, `MAILJET_FROM_ADDRESS`
- `MAILTRAP_API_KEY`, `MAILTRAP_FROM_ADDRESS`
- `RESEND_API_KEY`, `RESEND_FROM_ADDRESS`
- `SENDPULSE_API_KEY`, `SENDPULSE_FROM_ADDRESS`

The first superseded bootstrap attempt, run `34323712095`, checked the existing authorized GitHub `BREVO_KEY` without sending. Brevo returned HTTP `401` before OIDC/write, so it created zero entries. The invalid credential was not displayed, migrated, retried, replaced, revoked or rotated.

## MACHINE IDENTITY

The owner temporarily changed the dedicated Infisical Machine Identity project role from `Viewer` to `Member` for the one-time write. After the successful bootstrap, the owner confirmed on 2026-09-09 that it was restored to `Viewer`. Organization role remains `No Access`; OIDC is the only authentication method.

## CLOUDFLARE NAMES-ONLY AUDIT

PR `#14` added a protected, read-only audit and was squash-merged as `ffbedfb57b8796318aae4296d25559a8fafcaf89`. Audit run `34327554785` completed successfully.

The audit inspected provider-related binding names across all visible Cloudflare Workers and Pages without printing, copying, changing or deleting a value. It found:

- Worker `admission-gk`: legacy `BREVO_FROM`, `BREVO_KEY`, `MAIL_FROM`, `RESEND_KEY`, `RESEND_KEY_2`.
- Worker `ah-public`: legacy `MAIL_FROM`, `RESEND_KEY`, `RESEND_KEY_2`.
- Pages: no provider-related binding names.

No Cloudflare binding name was found for Mailjet, Mailtrap, MailerSend, SendPulse, EmailOctopus or Courier. The previous configuration therefore covered only legacy Resend/Brevo-era names, not the new seven-provider Phase 2B source contract. Cloudflare intentionally does not return existing Worker secret values, so those legacy values cannot be exported into Infisical. Legacy names are not consumed by the isolated Phase 2B catalog.

## DOMAINLESS BOUNDARY

`admissionhub.pages.dev` is a valid hosted website address, but DNS control for the parent `pages.dev` domain belongs to Cloudflare. It cannot be used to publish the provider-specific SPF/DKIM/DMARC records required for an owner-controlled transactional sender domain.

Without purchasing/controlling a domain, only provider-specific sandbox or individually verified sender testing may be possible where that provider officially permits it. Such testing must remain bounded; unsupported providers stay disabled. It is not evidence that the full seven-provider production sender pool is activated.

## NEXT

1. Do not rerun the create-only bootstrap; existing entries make overwrite refusal intentional.
2. Do not ask the owner to paste credentials in chat.
3. Get an explicit owner choice between limited domainless testing and a complete production pool using an owner-controlled domain.
4. Add genuine remaining values to Infisical through the smallest owner UI action, preferably one prepared bulk import.
5. At 33/33, use the protected additive staging workflow with global activation disabled and preserve unrelated Worker bindings.
6. Validate account, sender/domain and quota per provider; then enable individually and perform one controlled Gmail OTP only after all gates pass.

No Worker binding, provider activation, sender evidence or delivery changed during these audits. Concrete Supabase/Auth authority work remains out of scope until explicitly authorized.
