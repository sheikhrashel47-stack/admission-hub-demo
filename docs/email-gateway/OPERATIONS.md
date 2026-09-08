# Email Gateway Operations

## Current state

Phase 2B deploys the protected boundary and Durable Object coordinator with every provider disabled. Active catalog: Resend, Brevo, Mailjet, Mailtrap, MailerSend, SendPulse, EmailOctopus and Courier. EmailOctopus is visible but transactionally ineligible. No provider sends until every activation gate in `PROVIDER_SETUP.md` is satisfied.

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

## Deployment and rollback

- build `worker-bundle.mjs` with pinned `npm run build:worker`;
- require `npm run check:worker-bundle` exact match;
- run Email, Auth, account-retirement and broader app guards;
- deploy through the existing authorized Worker workflow;
- verify unsigned routes stay 404 and public app/AI/content remain healthy;
- activate providers separately, one at a time, only with owner-approved evidence;
- rollback code/config without deleting Durable Object data or dormant account records.
