# Provider Setup

No provider is enabled by default. Credential presence alone never activates one.

## Global server configuration

Required before any production provider can be eligible:

- `EMAIL_GATEWAY_SIGNING_SECRET` — internal HMAC secret, at least 32 characters
- `EMAIL_RECIPIENT_HASH_PEPPER` — separate HMAC pepper, at least 32 characters
- `EMAIL_GATEWAY_CONFIG` — non-secret JSON policy
- `EMAIL_PROVIDER_ACTIVATION=enabled` — deliberate global activation gate
- `EMAIL_FROM_ADDRESS` — optional approved fallback sender; provider-specific bindings below take precedence
- `EMAIL_FROM_NAME` — optional fallback display name
- `EMAIL_COORDINATOR` — Durable Object binding from `wrangler.toml`

Secrets must be added through approved Cloudflare encrypted Worker Secret storage. Never put a value in `wrangler.toml`, D1, KV, GitHub variables, source, frontend, docs, command output, reports, request URLs or ordinary tables. Secret binding names are safe to document; values are not.

## Isolated provider bindings and evidence gates

| Provider | Encrypted Worker Secret binding(s) | Provider-specific sender address/name | Non-secret evidence flag | OTP eligible |
|---|---|---|---|---:|
| Resend | `RESEND_API_KEY` | `RESEND_FROM_ADDRESS`, `RESEND_FROM_NAME` | `RESEND_SENDER_VERIFIED=true` | yes |
| Brevo | `BREVO_API_KEY` | `BREVO_FROM_ADDRESS`, `BREVO_FROM_NAME` | `BREVO_SENDER_VERIFIED=true` | yes |
| Mailjet | `MAILJET_API_KEY`, `MAILJET_SECRET_KEY` | `MAILJET_FROM_ADDRESS`, `MAILJET_FROM_NAME` | `MAILJET_SENDER_VERIFIED=true` | yes |
| Mailtrap | `MAILTRAP_API_KEY` | `MAILTRAP_FROM_ADDRESS`, `MAILTRAP_FROM_NAME` | `MAILTRAP_SENDER_VERIFIED=true` | yes |
| MailerSend | `MAILERSEND_API_KEY` | `MAILERSEND_FROM_ADDRESS`, `MAILERSEND_FROM_NAME` | `MAILERSEND_SENDER_VERIFIED=true` | yes |
| SendPulse | `SENDPULSE_API_KEY` | `SENDPULSE_FROM_ADDRESS`, `SENDPULSE_FROM_NAME` | `SENDPULSE_SENDER_VERIFIED=true` | yes |
| EmailOctopus | `EMAILOCTOPUS_API_KEY` | `EMAILOCTOPUS_FROM_ADDRESS`, `EMAILOCTOPUS_FROM_NAME` | `EMAILOCTOPUS_SENDER_VERIFIED=true` | **no** |
| Courier | `COURIER_API_KEY` | `COURIER_FROM_ADDRESS`, `COURIER_FROM_NAME` | `COURIER_SENDER_VERIFIED=true` | yes |

Sender resolution is isolated per provider: the provider-specific address/name wins, then the optional global fallback is used. Validation and readiness are evaluated against the resolved sender for that provider, so one provider's verified identity cannot activate another provider. Each evidence flag may be set only after evidence for that exact provider/account/address; a global sender claim is not a substitute. EmailOctopus remains in the owner-selected catalog for truthful status visibility, but the official API lacks direct one-to-one transactional sending; its flag/credential can never make it eligible for OTP routing.

Historical provider bindings and dormant adapter files are not consumed by the active catalog. Do not rename or reuse an unrelated old secret as activation evidence.

## Non-secret policy example

```json
{
  "router": {
    "mode": "hybrid",
    "maxProviderAttempts": 3,
    "emergencyMaxAttempts": 1
  },
  "providerPolicies": {
    "resend": {
      "enabled": true,
      "priority": 10,
      "weight": 3,
      "dailyLimit": 250,
      "monthlyLimit": 7000,
      "timeoutMs": 4000,
      "maxConcurrent": 20,
      "emergency": false,
      "costWeight": 1
    },
    "brevo": {
      "enabled": true,
      "priority": 20,
      "weight": 2,
      "dailyLimit": 250,
      "monthlyLimit": 7000,
      "timeoutMs": 4000,
      "maxConcurrent": 20,
      "emergency": false,
      "costWeight": 1
    }
  }
}
```

Limits must be conservative and based on the actual account. Undocumented or unknown provider quota must not be turned into a capacity claim. A policy without a daily or monthly bound cannot activate. `maxConcurrent` is an atomic per-provider load admission cap; stale reservations expire through a bounded lease.

## Sender/domain evidence gate

Before setting a provider-specific `*_SENDER_VERIFIED=true` flag:

1. choose the owner-approved Admission Hub transactional domain/subdomain;
2. verify that exact address/domain inside that provider account;
3. publish and validate SPF;
4. publish and validate DKIM;
5. publish DMARC with an owner-approved policy/report destination;
6. configure bounce/complaint handling;
7. confirm From alignment;
8. pass the adapter's bounded, non-mutating remote sender/account probe;
9. run one owner-approved inbox/delivery test only after all earlier gates pass.

Do not invent a domain or use an arbitrary personal Gmail address as the long-term sender.

## Activation sequence

1. keep provider policy disabled;
2. create a replacement credential directly in the provider console;
3. add it only through the Cloudflare Secret interface (never shell history or pasted output);
4. verify adapter contract and endpoint mapping with no-send tests;
5. verify provider account, sender/domain and provider-side quota privately;
6. set conservative local quota/load policy;
7. set that provider's evidence flag;
8. explicitly enable its policy and global activation;
9. run a signed health request and require non-mutating remote evidence;
10. perform one owner-approved real send to an approved recipient;
11. verify acceptance ID and inbox/official delivery event;
12. monitor bounce, complaint, latency, quota and circuit behavior;
13. record dated evidence without secret values.

Changing provider priority, weight, limits or enablement uses server policy and requires no frontend/Auth/account migration or logout.
