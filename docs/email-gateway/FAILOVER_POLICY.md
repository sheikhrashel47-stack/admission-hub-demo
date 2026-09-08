# Email Failover Policy

## Bounded routing

- normal provider attempts: maximum 3 by default
- emergency attempts: maximum 1 by default
- one adapter mutation per provider per logical routing operation
- per-provider timeout and `maxConcurrent` load cap
- stale load reservation lease: bounded to twice the provider timeout (minimum one second)
- whole routing deadline: 12 seconds by default
- no recursive retry, blind round-robin or infinite fallback

Every request requires stable `requestId` and `idempotencyKey` values. Every actual provider mutation receives a deterministic `deliveryAttemptId`. The central renderer runs once, so failover reuses the exact same HTML, text and OTP.

## Dynamic decision inputs

Eligible providers are ranked using all applicable safe state:

- non-mutating remote health/sender evidence
- aggregate success, failure and timeout rates
- latency EWMA
- local conservative quota and quota state
- circuit state and cooldown
- current/max concurrent load
- required transactional/HTML/text capability
- configured priority, weight and cost policy

An OPEN, exhausted, ineligible, unverified or capacity-full provider is skipped. EmailOctopus is always ineligible for OTP because it has no direct transactional send endpoint.

## Failure decisions

| Class | Same provider retry | Next provider | Circuit effect | Notes |
|---|---:|---:|---:|---|
| invalid request | no | no | no | shared payload defect |
| recipient rejected | no | no | no | do not spam another provider |
| explicit 5xx response | no | yes | yes | response confirms a safe failed attempt |
| rate limit | no | yes | yes | provider is de-prioritized/skipped |
| quota exhausted | no | yes | no | skip without extra network call when known locally |
| provider authentication | no | yes | yes | backup has independent credentials |
| sender/domain failure | no | yes | yes | alert and repair only that provider |
| provider suspended | no | yes | yes | provider-specific outage |
| pre-dispatch network/DNS failure | no | yes | yes | no acceptance ambiguity |
| timeout/connection loss after dispatch | no | **no** | yes | outcome is uncertain; duplicate risk |
| malformed/missing success body or acceptance ID | no | **no** | yes | conservatively uncertain |

## Uncertain-delivery rule

When a provider may have accepted the message but valid acceptance evidence is unavailable:

1. mark the request `UNCERTAIN`;
2. stop normal and emergency fallback immediately;
3. retain the same request/idempotency pair and attempt record;
4. never resend it automatically;
5. reconcile through private provider status or verified events;
6. only an approved Auth/resend policy may create a new logical OTP after expiry/cooldown.

This deliberately prefers a delayed OTP over duplicate valid OTP emails.

## Circuit breaker

Each provider has isolated `CLOSED → OPEN → HALF_OPEN → CLOSED` state in a Durable Object.

- repeated provider failures open only that provider’s circuit;
- known-open providers receive no unnecessary send calls;
- after cooldown exactly one half-open probe is reserved;
- probe success closes/resets the circuit;
- probe failure reopens it;
- recipient/request validation errors do not poison provider health;
- recovery is automatic and bounded.

## Quota model

Quota reserves conservatively before a provider call and is not refunded after ambiguous/failing calls. Daily/monthly limits use UTC periods. Safe labels are `NORMAL`, `LOW`, `CRITICAL`, `EXHAUSTED` and `UNKNOWN`. Local numbers are explicitly estimates, never exact provider billing truth.

## Load and queue policy

Strongly consistent admission limits current provider mutations. A capacity-full provider is skipped in favor of another eligible provider. The Worker does not keep an unsafe in-memory mail queue: when no provider is eligible it returns a recoverable temporary failure. Any future persistent queue requires a separate approved design with expiry, idempotency, OTP-validity and cancellation semantics.

## All-provider outage

If every provider is down, exhausted, capacity-full or ineligible, routing terminates within the attempt/deadline bounds and returns `NO_ELIGIBLE_PROVIDER` or the last safe temporary provider failure. It never returns fake success.

## Emergency mode

An emergency provider must be explicitly configured with `emergency: true`. It is considered only after the normal pool, has a separate attempt cap, records an alert and can never loop back to a normal provider.
