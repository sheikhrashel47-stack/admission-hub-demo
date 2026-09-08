# Admission Hub Multi-Provider Email Gateway — Phase 2B Blueprint

**Status:** implementation verified and owner-approved on 2026-09-09; provider activation remains disabled

**Start gate:** Phase 2A and Phase 2B implementation approvals satisfied; concrete Supabase/Auth work still requires an explicit start instruction

**Auth authority:** concrete Supabase/Auth binding remains gated until the approved next phase

**Scope override (2026-09-09):** active provider pool replaced by the owner-selected eight-provider catalog below; dormant legacy adapters are preserved but not routed

## Mission and non-negotiable rules

Build a provider-agnostic, fault-tolerant, quota-aware, observable, automatically recoverable email infrastructure for verification OTP, signup verification, password reset, new-device/security challenges, MFA/2FA, welcome/security alerts and future transactional email.

- Auth Core must never branch on a provider name or depend on provider implementation.
- Frontend must never call providers or contain provider credentials.
- Credentials live only in approved server-side secret storage.
- Unconfigured providers remain disabled.
- A provider failure or email failure must not destroy account/session/Auth state.
- No infinite retry/failover; no blind duplicate OTP send.
- Production completion requires real end-to-end evidence for every activated provider and mocked evidence for failure/load cases.

## Target boundary

```text
Admission Hub service
        ↓ signed internal request
Email Gateway boundary (Cloudflare Worker)
        ↓
Provider Registry + Router
        ├── health/circuit state
        ├── quota/cost/capability policy
        ├── idempotency/request state
        └── privacy-safe events
               ↓
        isolated ProviderAdapter
               ↓
        configured email provider
```

A future Supabase Auth adapter may invoke this infrastructure, but Supabase identity/session state and email-delivery state remain separate.

## Normalized contracts

### Gateway request

```text
{
  type,
  recipient,
  subject,
  template,
  variables,
  requestId,
  idempotencyKey,
  priority
}
```

### Provider adapter

```text
sendEmail()
checkHealth()
getStatus()
getCapabilities()

Compatibility-only orchestration aliases may remain internal during migration, but the four methods above are the required common surface.
```

### Provider registry metadata

```text
id, name, enabled, priority, weight, capabilities,
dailyLimit, monthlyLimit, remainingQuota,
healthStatus, successRate, failureRate, timeoutRate, latency,
quotaState, circuit, currentLoad, maxConcurrent,
lastSuccess, lastFailure, cooldownUntil, failoverRole
```

Priority, weight, limits, thresholds and timeouts are configuration—not scattered source constants.

## Provider adapter pool

Owner-selected active catalog:

1. Resend
2. Brevo
3. Mailjet
4. Mailtrap
5. MailerSend
6. SendPulse
7. EmailOctopus
8. Courier

Seven adapters map documented direct transactional APIs. EmailOctopus is retained for truthful catalog/status reporting but is always OTP-ineligible because its official API exposes list/contact/campaign/automation operations rather than direct one-to-one transactional send. No campaign workaround may be represented as OTP acceptance.

Conceptual default priority follows the order above, but it is not a claim of availability or free quota and remains configurable. A transactional provider is enabled only after isolated secrets, provider-specific sender evidence, conservative quota/load policy and bounded remote health verification.

## Router modes and selection

Support:

- priority
- weighted
- failover
- quota
- hybrid

Selection considers enablement, capability, health, circuit state, cooldown, daily/monthly quota, rate limits, recent failure rate, latency, cost policy and deliverability policy. Known unhealthy providers receive zero unnecessary attempts.

Controlled fallback example:

```text
Primary fails with retryable class
  → Secondary
  → Tertiary
  → stricter emergency pool
  → one controlled terminal failure
```

Permanent provider errors never waste retries.

## Failure classification

- `TIMEOUT`
- `NETWORK_ERROR`
- `DNS_ERROR`
- `5XX_SERVER_ERROR`
- `RATE_LIMIT`
- `QUOTA_EXCEEDED`
- `AUTHENTICATION_ERROR`
- `INVALID_REQUEST`
- `DOMAIN_ERROR`
- `RECIPIENT_REJECTED`
- `PROVIDER_SUSPENDED`
- `UNKNOWN`

Timeout, temporary network/DNS failures, temporary 5xx and transient unavailability may be retried/fail over within strict bounds. Invalid credentials/request/sender/recipient and permanent limits do not retry blindly.

## Circuit breaker and health

Each provider has independent `CLOSED → OPEN → HALF_OPEN → CLOSED` behavior. Threshold, cooldown and probe rules are configurable.

Health states:

- `HEALTHY`
- `DEGRADED`
- `RATE_LIMITED`
- `QUOTA_LOW`
- `QUOTA_EXHAUSTED`
- `UNHEALTHY`
- `OFFLINE`
- `DISABLED`

Track success/failure rate, latency, timeout/rate events, quota, last success/failure and consecutive failures.

## Quota policy

Configurable conceptual thresholds:

- full/normal availability → normal routing
- ~30% remaining → warning
- ~10% → reduce traffic
- ~5% → prefer backup
- 0% → disable until reset

Maintain conservative daily/monthly accounting and reset timestamps. Use provider quota APIs where available; never claim local estimates are exact provider truth.

## Idempotency and duplicate prevention

Every logical request has a unique stable `requestId` such as an Auth OTP request ID. Persist the minimal request state:

- request ID
- email type
- protected/minimized recipient reference
- created time/status
- provider attempts
- final/uncertain provider outcome

If Provider A may have accepted a request but its response timed out, do not blindly resend through Provider B. Use provider idempotency where supported and a controlled uncertain-delivery policy. Never store OTP plaintext unnecessarily.

## OTP security requirements

- six-digit configurable OTP policy
- short expiry
- single use
- maximum attempts
- resend cooldown
- per-email/per-IP/per-account/device-aware throttling
- temporary block after abuse
- no OTP in URL, browser storage, analytics, console/logs or public tables

Exact limits are configurable and must align with the future concrete Auth authority.

## Email types and templates

Types include:

- `EMAIL_VERIFICATION`
- `SIGNUP_VERIFICATION`
- `PASSWORD_RESET`
- `NEW_DEVICE_VERIFICATION`
- `LOGIN_SECURITY_CHALLENGE`
- `MFA_CODE`
- `ACCOUNT_RECOVERY`
- `WELCOME_EMAIL`
- `SECURITY_ALERT`

One provider-independent template engine creates normalized HTML/text payloads. Adapters never own duplicate business templates.

## Worker gateway and internal security

A future internal endpoint conceptually performs:

```text
Authenticate trusted service caller
  → validate and normalize payload
  → rate/abuse checks
  → acquire idempotency request
  → route through eligible provider
  → persist privacy-safe result
```

CORS is not authentication. Require service authentication/request signing, replay protection, origin/context validation where applicable and layered per-email/IP/account/global rate limits. Never expose an unrestricted public send endpoint.

## Emergency mode

`EMERGENCY_PROVIDER_MODE` activates only when normal configured pools are unavailable and uses stricter rate limits. It is observable and alertable, never an infinite fallback loop.

## Provider capabilities

Registry declarations include API/SMTP, transactional, HTML/text, custom-domain, webhook/delivery events and idempotency support. The router selects only compatible providers.

## Delivery truth

Where supported capture `queued`, `sent`, `delivered`, `bounced`, `rejected`, and `complained`. API acceptance must never be presented as confirmed inbox delivery.

## Observability and alerts

Privacy-minimized events answer what/when/provider/outcome/fallback reason/latency without OTP, password, token, API key, raw session or full sensitive payload. Recipient data should be hashed/minimized.

Internal monitoring eventually shows provider health, success/failure, latency, daily/monthly use, quota warning, open circuits, fallback count and emergency mode. Alert on sustained primary/multi-provider outage, critical quota, failure/delivery spike or emergency activation—without noisy one-off alerts.

## Configuration and hot swap

Authorized server configuration can enable/disable a provider and change priority, weight, quota threshold, timeout and circuit threshold without frontend update, Auth rewrite, account migration, database migration or user logout.

## Minimal persistence

Potential entities:

- `email_provider_config` (non-secret policy only)
- `email_provider_health`
- `email_delivery_events`
- `email_request_idempotency`

Secrets must not be placed in ordinary application tables unless an explicitly approved encrypted design requires it.

## Cost and deliverability

Optimize reliability + quota + cost + latency + deliverability—not only free allowance. Production requires an actual verified Admission Hub transactional domain/subdomain and SPF, DKIM, DMARC, bounce/complaint handling and reputation operations. Do not invent the domain and do not use an arbitrary Gmail address as long-term sender identity.

## Required documents for Phase 2B

- `EMAIL_ARCHITECTURE.md`
- `PROVIDER_SETUP.md`
- `FAILOVER_POLICY.md`
- `SECURITY.md`
- `OPERATIONS.md`
- `TESTING.md`

They must document provider addition/disablement, failover, secure secret setup, tests and incident recovery.

## Adding a provider

```text
Implement adapter interface
  → registry entry disabled
  → secure credentials
  → adapter/contract/failure tests
  → health/config verification
  → explicit enablement
```

No Auth Core rewrite.

## Mandatory tests

### Provider/failover

- success, timeout, 4xx, 5xx, rate limit, quota exhausted
- invalid credential/sender/recipient
- P1→P2, P1/P2→P3, all primary→emergency, all→controlled failure
- circuit opens, cooldown, half-open recovery, return to pool
- uncertain response and duplicate-request protection

### Security

- secret/API key exposure scans
- OTP leakage, replay, brute force, spam and rate-bypass attempts
- unauthorized internal caller and request-signature failure
- logs/events contain no prohibited data

### Chaos

Simulate providers unavailable, DNS/network timeout, 5xx storm, rate/quota exhaustion, Worker restart, persistence outage, slow/malformed provider response. Every case must terminate safely.

### Mocked load (no real email)

Validate 1,000/day, 5,000/day, 10,000/day and 25,000/day shapes with MockProvider modes: always success/fail, random failure, slow, timeout, rate limit and quota exhausted. Measure throughput, latency, failure/fallback rate, CPU/memory/Worker execution and persistence load.

### Regression

Auth foundation, signup/login/OTP/password recovery/session/provider failover/security regressions must pass before deployment. Checks for Signup/Login/Session working become actionable only after those later-phase concrete flows exist; until then they are explicitly `not applicable`, never falsely marked pass.

## Acceptance and protected status

Phase 2B is not complete until applicable architecture, adapter, registry, router, circuit, health, quota, idempotency, security, failover/recovery, chaos/load and documentation checks have direct evidence. Activated providers and unconfigured providers must be reported separately.

After acceptance, Provider Interface, Router, Circuit Breaker, Quota Engine, Failover, Security Boundary, Secret Management and Idempotency become protected infrastructure. Any future change requires impact analysis, full regression/security/failover tests and human approval.
