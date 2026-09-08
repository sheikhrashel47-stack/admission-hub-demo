# Email Gateway Architecture

**Version:** `phase2b-2`

**Boundary:** server-only Cloudflare Worker

**Concrete Supabase/Auth authority:** unbound until the approved Auth phase

## Dependency direction

```text
Future trusted Admission Hub service / Supabase Auth integration
        ↓ HMAC-signed request
/internal/email/* Worker boundary
        ↓
Validation → replay guard → atomic idempotency → layered abuse limits
        ↓
Central template engine (one ephemeral OTP rendering)
        ↓
Registry → remote health → dynamic router → circuit/load → quota reservation
        ↓
One isolated provider adapter per bounded attempt
        ↓
Configured provider transactional API

Durable Object coordinator
  ├─ request/idempotency acquisition
  ├─ nonce replay protection
  ├─ layered rate counters
  ├─ provider circuit, rates, latency and bounded load leases
  ├─ conservative quota counters
  └─ privacy-safe delivery events/alert dedupe
```

The future Supabase layer is identity/session/OTP authority; the Email Gateway is delivery-only. No provider response can create a user, authenticate a session, consume an OTP or modify account state.

## Active provider catalog

| Provider | Direct transactional OTP API | Catalog behavior |
|---|---:|---|
| Resend | yes | eligible only after all gates and remote sender check |
| Brevo | yes | eligible only after all gates and active-sender check |
| Mailjet | yes | eligible only after all gates and active-sender check |
| Mailtrap | yes | eligible only after all gates and authenticated account check |
| MailerSend | yes | eligible only after all gates and verified-domain check |
| SendPulse | yes | eligible only after all gates and active-sender check |
| EmailOctopus | **no** | retained in catalog, always ineligible for OTP send |
| Courier | yes | eligible only after all gates and authenticated workspace check |

Former adapter files remain dormant for preservation/reconciliation, but they are not in the active routing catalog or configuration policy.

## Main modules

- `email-gateway/index.mjs` — stable server contract
- `email-gateway/service-client.mjs` — bounded HMAC-signing trusted-service client
- `core/email-gateway.mjs` — orchestration and final request truth
- `core/provider-registry.mjs` — active catalog, remote-health cache, metrics and dynamic eligibility
- `core/router.mjs` — health/rate/latency/quota/load/circuit/capability-aware routing
- `core/provider-state.mjs` — `CLOSED → OPEN → HALF_OPEN → CLOSED`, metrics and load leases
- `core/quota-engine.mjs` — conservative atomic reservation
- `core/rate-limiter.mjs` — recipient/IP/account/device/global limits
- `core/internal-auth.mjs` — HMAC, freshness, body integrity and nonce replay
- `core/template-engine.mjs` — one provider-independent HTML/text renderer
- `core/observability.mjs` — allowlisted privacy-safe events and deduped alerts
- `providers/*` — transport-only provider adapters
- `worker/email-coordinator.mjs` — strongly consistent Durable Object
- `worker/handler.mjs` — private Worker HTTP boundary

## Request lifecycle

1. A trusted server creates stable opaque `requestId` and `idempotencyKey` values.
2. It signs method, exact path/query, timestamp, nonce and SHA-256 body digest.
3. The Worker rejects missing, stale, altered or replayed requests.
4. Schema validation requires the IDs and normalizes recipient/type/template/variables/context.
5. Recipient, request and abuse references are HMAC-minimized with a separate pepper.
6. The Durable Object atomically acquires the idempotency key before rate/provider work.
7. A duplicate final request returns the original result; a pending/uncertain request is never resent.
8. Layered rate limits run atomically.
9. The central template engine renders HTML/text once; failover reuses those exact bytes and OTP.
10. Registry filters configured, enabled, transactional, remotely ready and capability-compatible providers.
11. Dynamic scoring considers health, success/failure/timeout rates, latency, quota, circuit, load, priority, weight and cost policy. Blind round-robin is not used.
12. Circuit/load and quota are reserved before each provider mutation.
13. A deterministic `deliveryAttemptId` is attached to every actual provider attempt.
14. Safe provider failure may use the next provider. Any uncertain outcome stops immediately.
15. Final acceptance/failure/uncertainty and minimized attempts are stored.
16. A separately verified provider event may move accepted mail to queued/sent/delivered/bounced/rejected/complained.

## Persistence model

Stored records contain only:

- opaque `requestId`, `idempotencyKey` and request fingerprint
- email type and HMAC-minimized recipient reference
- status, timestamps, provider ID/message ID
- minimized attempt ID/outcome/code/latency
- circuit, aggregate rates, latency, bounded load and local quota counters
- allowlisted events

They do not contain recipient email, name, OTP, rendered HTML/text, password, session, Auth token or provider credential. Expiring request, nonce, event-dedup, rate, alert and load-lease data are bounded. Cloudflare KV is not used as atomic authority.

## Delivery truth

`ACCEPTED` means a provider API supplied valid acceptance evidence. It never means inbox delivery. `DELIVERED` is recorded only from a separately verified event path. Timeout, connection loss after dispatch or malformed success becomes `UNCERTAIN`, stops failover and requires reconciliation before a new logical OTP request.

## Status model

Safe provider status includes health, remote-health evidence state, success/failure/timeout rates, latency EWMA, quota state (`NORMAL`, `LOW`, `CRITICAL`, `EXHAUSTED`, `UNKNOWN`), circuit, last success/failure, current/max load, priority and failover role. It contains no credential, recipient, OTP or provider response body.

## Current activation state

The protected Worker boundary and Durable Object class are deployable, but all providers default disabled. No replacement provider secrets are available in this workspace, no remote provider has been called, no real email has been sent, and no current Auth/Login UI invokes this system.
