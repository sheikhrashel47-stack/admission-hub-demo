# Admission Hub Email Gateway — one-time Infisical setup

এই setup একবারই করতে হবে। Raw value chat, Git বা report-এ যাবে না। GitHub OIDC protected workflow Infisical থেকে values নিয়ে ephemeral runner file-এর মাধ্যমে Cloudflare Worker-এ stage করবে; প্রথম sync সবসময় activation বন্ধ রাখবে।

## 1. Project ও path

- Project name: `Admission Hub`
- Environment slug: `production`
- Secret path: `/email-gateway`

অন্য project secret এই path-এ রাখা যাবে না। বিশেষ করে AI, Telegram, Supabase, Gmail verification এবং Cloudflare management credential আলাদা path-এ থাকবে।

## 2. GitHub OIDC Machine Identity

Machine Identity name: `admission-hub-email-gateway-production`

OIDC settings:

- Discovery URL: `https://token.actions.githubusercontent.com`
- Issuer: `https://token.actions.githubusercontent.com`
- Subject: `repo:sheikhrashel47-stack/admission-hub-demo:environment:email-gateway-production`
- Audience: `https://github.com/sheikhrashel47-stack`

Identity-কে শুধু Admission Hub project-এর `production` environment এবং `/email-gateway` path পড়ার least-privilege permission দিতে হবে।

GitHub environment `email-gateway-production`-এ non-secret variables:

- `INFISICAL_IDENTITY_ID`
- `INFISICAL_PROJECT_SLUG`
- `INFISICAL_ENV_SLUG=production`
- `INFISICAL_SECRET_PATH=/email-gateway`
- `INFISICAL_DOMAIN=https://app.infisical.com`

## 3. Required Worker-bound names

### Provider credentials

- `RESEND_API_KEY`
- `BREVO_API_KEY`
- `MAILJET_API_KEY`
- `MAILJET_SECRET_KEY`
- `MAILTRAP_API_KEY`
- `MAILERSEND_API_KEY`
- `SENDPULSE_API_KEY`
- `COURIER_API_KEY`

### Provider-specific sender bindings

প্রতিটি prefix-এর জন্য `_FROM_ADDRESS`, `_FROM_NAME`, `_SENDER_VERIFIED` রাখতে হবে:

- `RESEND`
- `BREVO`
- `MAILJET`
- `MAILTRAP`
- `MAILERSEND`
- `SENDPULSE`
- `COURIER`

প্রথম stage-এ `_SENDER_VERIFIED=false` রাখাই default। Remote provider evidence ছাড়া `true` করা যাবে না।

### Runtime bindings

- `EMAIL_GATEWAY_SIGNING_SECRET` — Infisical-generated strong random value, minimum 32 characters
- `EMAIL_RECIPIENT_HASH_PEPPER` — independent Infisical-generated random value, minimum 32 characters
- `EMAIL_PROVIDER_ACTIVATION=disabled`
- `EMAIL_GATEWAY_CONFIG` — valid production JSON; initial provider policies disabled

Required Worker-bound names মোট **33**। EmailOctopus direct transactional OTP support না করায় এই activation set-এ নেই।

Safe initial `EMAIL_GATEWAY_CONFIG` value:

```json
{
  "environment": "production",
  "providerPolicies": {
    "resend": { "enabled": false, "priority": 10, "dailyLimit": 1, "monthlyLimit": 1 },
    "brevo": { "enabled": false, "priority": 20, "dailyLimit": 1, "monthlyLimit": 1 },
    "mailjet": { "enabled": false, "priority": 30, "dailyLimit": 1, "monthlyLimit": 1 },
    "mailtrap": { "enabled": false, "priority": 40, "dailyLimit": 1, "monthlyLimit": 1 },
    "mailersend": { "enabled": false, "priority": 50, "dailyLimit": 1, "monthlyLimit": 1 },
    "sendpulse": { "enabled": false, "priority": 60, "dailyLimit": 1, "monthlyLimit": 1 },
    "courier": { "enabled": false, "priority": 80, "dailyLimit": 1, "monthlyLimit": 1 },
    "emailoctopus": { "enabled": false, "priority": 70, "dailyLimit": 0, "monthlyLimit": 0 }
  }
}
```

The placeholder limits above do not authorize real traffic; provider-specific verified quotas must replace them before activation.

## 4. Protected staging

Workflow: `.github/workflows/email-gateway-infisical-sync.yml`

Manual confirmation: `STAGE_INFISICAL_SECRETS`

The workflow:

1. authenticates to Infisical with GitHub OIDC;
2. reads only the dedicated production path;
3. requires all 33 names and validates non-sensitive structure;
4. refuses initial sync unless `EMAIL_PROVIDER_ACTIVATION=disabled`;
5. writes a mode-`0600` ephemeral JSON payload on the hosted runner;
6. bulk-stages only the allowlisted names in Worker `admission-gk` using the existing protected Cloudflare access;
7. deletes the ephemeral file even when staging fails;
8. inventories binding names only and fails if any required name is absent;
9. verifies public health and unsigned internal protection.

Staging does not activate providers or send email. Activation remains a separate provider-by-provider verified operation.
