# Email Gateway Operations

## Current state

Phase 2B defines the protected boundary and Durable Object coordinator with every provider disabled. Deployment is a separate verified operational state and must not be inferred from implementation. Active catalog: Resend, Brevo, Mailjet, Mailtrap, MailerSend, SendPulse, EmailOctopus and Courier. EmailOctopus is visible but transactionally ineligible. No provider sends until every activation gate in `PROVIDER_SETUP.md` is satisfied.

## Internal health

A trusted service may HMAC-sign:

- `GET /internal/email/health`
- `GET /internal/email/health?events=1`

The response reports only non-secret provider state:

- configured/enabled counts and activation reason codes
- local and bounded remote health evidence
- success/failure/timeout count and rate
- latency EWMA
- quota estimate and `NORMAL|LOW|CRITICAL|EXHAUSTED|UNKNOWN` label
- `CLOSED|OPEN|HALF_OPEN` circuit state and cooldown
- current/max load and load ratio
- last success/failure, priority and failover role
- recent allowlisted privacy-safe events when explicitly requested

Operational table fields are:

```text
Provider | Configured | Healthy | Quota State | Circuit | Priority | Failover
```

`CONFIGURED`, remote-health success or API acceptance is not proof of inbox delivery.

## Routine review

- primary/backup success, failure and timeout rates
- latency trend and p95 from external monitoring
- provider load/capacity distribution
- rate-limit and quota-low/critical events
- OPEN/HALF_OPEN circuits and bounded recovery
- fallback and emergency activation
- accepted-to-delivered conversion
- bounce/complaint spikes
- sender-domain SPF/DKIM/DMARC health per provider
- provider billing/quota truth versus explicitly local estimates

## Disable or hot-swap

1. set the affected provider policy `enabled: false`;
2. deploy server policy only;
3. confirm signed health shows disabled/skipped;
4. monitor independent backup quota, load and deliverability;
5. rotate/revoke compromised provider credentials if applicable;
6. do not change Auth Core, user IDs, sessions or frontend.

## Incident playbooks

### Primary provider outage

- confirm remote health/circuit/failure evidence;
- let bounded dynamic routing use healthy backups;
- disable the provider if outage is sustained;
- inspect provider status/auth/domain/quota privately;
- re-enable only after sender health and a controlled non-mutating probe.

### Multi-provider outage

- do not add retry loops or fake acceptance;
- keep uncertain requests blocked from resend;
- return a recoverable temporary failure;
- future Auth initiation should present retry guidance while preserving existing sessions;
- alert the owner using request references only.

### Uncertain delivery

- inspect provider status using private provider tooling;
- wait for a verified delivery/bounce event where supported;
- never send the same OTP through another provider;
- create a new logical request only after expiry/cooldown and approved reconciliation.

### Quota exhaustion

- verify provider-side truth;
- lower/disable affected traffic before zero where possible;
- ensure backup policy has independent conservative capacity;
- never claim local counters are exact billing truth.

### Capacity saturation

- inspect current/max load, latency and timeout rates;
- allow healthy-provider distribution rather than increasing unbounded concurrency;
- do not introduce an in-memory queue;
- any persistent queue requires separate approval and must expire before the OTP becomes invalid.

### Suspected key compromise

- disable affected provider/signing key;
- rotate only through server secret storage;
- use current/previous overlap only for controlled signing-key rotation;
- review minimized events; never paste values into issues/chat/docs/logs.

### Durable Object/storage outage

- fail closed before send when idempotency cannot be acquired;
- do not fall back to eventual KV;
- existing Auth/session state remains untouched;
- restore coordinator health before resuming sends.

## Telegram completion notification

The credential-independent notifier is `email-gateway/operations/telegram-notifier.mjs`; the operator command is `npm run notify:telegram`. It accepts only bounded plain-text status, summary and detail fields, sends one HTTPS request, uses a timeout, requires Telegram `message_id` acceptance evidence and reports only a redacted error code. It never logs the bot credential or response diagnostics.

Required protected bindings are `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`. The GitHub deployment job sends a completion notification only when repository variable `TELEGRAM_NOTIFICATIONS_ENABLED=true` and both protected secrets exist. If they are unavailable, the standalone notifier returns the explicit isolated state `BLOCKED — REQUIRED_SECRET_NOT_CONFIGURED`; this does not change the truth of implementation or deployment status.

## Infisical staging

Infisical is the centralized source for Phase 2B provider credentials and sender/runtime bindings. The protected, manual `.github/workflows/email-gateway-infisical-sync.yml` workflow uses an environment-scoped GitHub OIDC Machine Identity, stages only the allowlisted Worker bindings, requires activation to remain disabled, removes its ephemeral payload on every outcome and reports names only. One-time setup and the exact 33-name schema are in `docs/email-gateway/INFISICAL_SETUP.md`.

Staging secrets is not provider activation. Account, sender, domain, quota and non-mutating remote-health evidence remain mandatory before any provider policy or global activation gate is opened.

## Deployment and rollback

- build `worker-bundle.mjs` with pinned `npm run build:worker`;
- require `npm run check:worker-bundle` exact match;
- run Email, Auth, account-retirement and broader app guards;
- deploy only through `.github/workflows/email-gateway-deploy.yml`, with manual `DEPLOY` confirmation and the protected `email-gateway-production` environment; the former unguarded generic Worker workflow is retired;
- preserve the existing `GK_KV`/`PUB_KV` bindings and `30 18 * * *` GK cron declared in `wrangler.toml` while adding the Durable Object;
- bind provider credentials directly as isolated Cloudflare Worker Secrets; the workflow deliberately does not map provider credentials from GitHub and reports only binding names plus missing-name prerequisites, never values;
- verify the unsigned internal route stays non-public (`404` while the signing secret is absent, `403` once protected signing is configured) and public app/AI/content remain healthy;
- activate providers separately, one at a time, only with owner-approved evidence;
- run the configured Telegram completion notification only after truthful completion;
- rollback code/config without deleting Durable Object data or dormant account records.
