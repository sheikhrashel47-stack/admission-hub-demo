# Firebase verification email deliverability audit

Audit date: 2026-09-10 (Asia/Dhaka)

## Production path

`Admission Hub Worker → Firebase Identity Toolkit accounts:sendOobCode (VERIFY_EMAIL) → Google/Firebase-managed verification email`

Firebase remains the canonical identity authority. Protected access still requires the provider-confirmed `emailVerified=true` state; no frontend or database override exists.

## Controlled baseline evidence

GitHub run: <https://github.com/sheikhrashel47-stack/admission-hub-demo/actions/runs/34387211137>

Both temporary Firebase accounts were automatically deleted. The audit printed no recipient address, password, Firebase credential, action code, verification URL, raw message source, mailbox identifier, or private report URL.

### Sender and DNS

| Check | Observed result |
|---|---|
| From domain | `admission-hub-auth.firebaseapp.com` |
| Return-Path domain | `admission-hub-auth.firebaseapp.com` |
| DKIM signing domain | `firebaseapp.com` |
| SPF DNS | Present; one record, no duplicate-SPF conflict |
| DKIM DNS | Present |
| DMARC DNS | No DMARC policy found at the exact Google-managed sender domain or its checked parent |
| SPF alignment | Aligned |
| DKIM relaxed alignment | Aligned |
| Independent technical check | SPF pass, DKIM pass, DMARC warning |
| Spam-filter check | Pass; SpamAssassin `-2.7`, threshold `5` |
| Deliverability score | `92/100` |

The Firebase sender domain is Google-managed. Admission Hub does not own or control its DNS, so the project cannot legitimately publish DMARC there. No DNS value should be guessed.

`admissionhub.pages.dev` is the application host, not the message's From domain. It is a Cloudflare-owned `pages.dev` subdomain and has no project-controlled mail DNS. Adding SPF, DKIM, DMARC, or MX records there is neither available nor relevant to this sender path.

### Baseline message structure before Console branding

| Check | Observed result |
|---|---|
| HTML part | Yes |
| Admission Hub sender name | No |
| Admission Hub in subject | No |
| Admission Hub in body | No |
| Styled verification CTA | No |
| Visible raw verification URL | Yes |
| Secondary fallback-link explanation | No |
| Security notice | Yes |
| Received size | About 4.5 KB |

This evidence explains the main correctable trust/branding gap. It does not prove that authentication is failing: the independent check reported SPF and DKIM pass.

## Firebase template constraint

Firebase's current Help Center states that each account email can customize sender name, sender address, reply-to address, and subject, but only password-reset emails can customize the message body. Therefore Firebase's built-in address-verification sender cannot carry the requested custom Bengali HTML card, emerald/mint layout, custom CTA, and raw-link fallback.

A fully custom body would require a privileged Admin/OAuth-generated Firebase action link and a separate authenticated email provider. With no owned domain, no paid service, and the required Firebase 1,000-address-verification-emails/day architecture, switching to such a sender would reduce or weaken the current evidence-backed setup. It has not been done.

Official references:

- <https://support.google.com/firebase/answer/7000714?hl=en>
- <https://firebase.google.com/docs/auth/admin/email-action-links>
- <https://firebase.google.com/docs/auth/email-custom-domain>
- <https://support.google.com/a/answer/81126?hl=en-419>

## Changes that are safe in the current architecture

- Keep Firebase's standard dynamic verification link and canonical `emailVerified` state.
- Keep the Google-hosted action handler so the action code is not sent to Admission Hub's Pages logs.
- Brand the Firebase public-facing app name, sender display name, and subject in Firebase Console.
- Keep the existing backend limits: 60-second per-address cooldown, 8 sends/address/day, bounded IP/device use, and 1,000 verification sends/day.
- Publish the same 60-second cooldown to the frontend, show a live countdown, honor `Retry-After`, block repeated submissions, clear passwords, and handle already-verified state clearly.

## Applied owner-only branding and final re-test

The project owner applied these values in the existing signed-in Firebase Console session:

- **Public-facing name:** `Admission Hub`
- **Email address verification sender name:** `Admission Hub`
- **Sender address, Reply-to, and Action URL:** unchanged
- **Subject field:** not directly editable in the project's Console view; the public-facing app name was used instead

Final controlled run: <https://github.com/sheikhrashel47-stack/admission-hub-demo/actions/runs/34392018902>

| Final check | Result |
|---|---|
| Sender display name contains Admission Hub | Pass |
| Subject contains Admission Hub | Pass |
| Body contains Admission Hub | Pass |
| SPF | Pass |
| DKIM | Pass |
| DMARC | Warning; Google-managed sender DNS has no project-editable policy |
| Spam-filter check | Pass; SpamAssassin `-2.7`, threshold `5` |
| Deliverability score | `92/100` |
| Live verification, verified-only gate, session, and cleanup | Pass |
| Credentials, mailbox, action code, or URL printed | No |

The production resend UI and API now expose the same 60-second cooldown, show a live Bengali countdown, honor `Retry-After`, block duplicate submissions, clear password inputs, and handle already-verified state. Production activation run: <https://github.com/sheikhrashel47-stack/admission-hub-demo/actions/runs/34388304872>.

No owner action remains. Gmail placement can still vary by recipient history, reputation, and user feedback, so no configuration can guarantee 100% Primary-inbox delivery.
