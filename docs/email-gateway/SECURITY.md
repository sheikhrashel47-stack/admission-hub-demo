# Email Gateway Security

## Internal caller authentication

`/internal/email/*` is available only on the Worker origin and is blocked on Cloudflare Pages. Every accepted request requires:

- key ID
- Unix timestamp within the configured freshness window
- high-entropy nonce
- HMAC-SHA256 signature
- exact method and path/query
- SHA-256 digest of the exact request body
- atomic nonce acquisition in the Durable Object coordinator

Canonical input:

```text
METHOD
/path?query
TIMESTAMP
NONCE
SHA256_HEX(BODY)
```

CORS headers are absent. Browser preflight is hidden with 404. CORS is never caller authentication.

## Key rotation

The runtime accepts `current` and optional `previous` signing key IDs. Rotation procedure:

1. create a new server-side secret;
2. move old current to previous;
3. deploy trusted caller and Worker overlap;
4. confirm signed health/send tests;
5. remove previous after the maximum signature/queue window;
6. record rotation without recording a value.

The recipient-reference pepper is separate from the signing key. Rotate it only with an explicit idempotency/reference migration plan.

## OTP protection

- OTP exists only as an ephemeral template variable.
- Default template policy requires six digits and short expiry text.
- The central renderer runs once; all safe fallback attempts reuse exactly the same rendering and OTP.
- OTP never enters request records, provider health, quota, events, alerts or responses.
- OTP is never included in a URL.
- Password/token/secret/credential template variables are rejected.
- Resend abuse is bounded by atomic idempotency and recipient/IP/account/device/global limits.
- OTP generation, verification, lifetime, single-use consumption, resend cooldown and attempt/brute-force limits belong to the future approved Supabase/Auth authority; this gateway exposes no verify endpoint.

## Delivery identity and atomicity

Every request requires stable opaque `requestId` and `idempotencyKey` values. The Durable Object shards/acquires by idempotency key before rate or provider work. Every actual provider mutation gets a deterministic `deliveryAttemptId`. A concurrent duplicate produces at most one provider mutation; a pending or uncertain record is never sent again automatically.

## Data minimization

Recipient, IP, account and device values are HMAC-minimized before persistence. Events use an allowlist. Error bodies contain safe code/message only. Provider response bodies, API keys and raw transport errors are not returned or logged.

## Storage and consistency

Production sends require the `EMAIL_COORDINATOR` Durable Object. Cloudflare KV is eventually consistent and is deliberately not accepted for nonce, idempotency, rate, circuit, load or quota authority.

## Abuse and burst boundaries

Default layers include recipient short/day limits, IP, account, device and global windows. Limits cannot be disabled in production. Provider `maxConcurrent`, bounded load leases, dynamic distribution, quota and circuit gates contain bursts. Payload size, field count, string length, recipient syntax, CR/LF headers, unknown fields and sensitive variables are rejected before delivery. The Worker does not hold an unsafe unbounded in-memory queue.

## Provider secret boundary

Each selected provider uses its own named Cloudflare encrypted Worker Secret binding. Adapter private fields receive values only from server environment bindings. Values must never enter source, D1, KV, GitHub, frontend, logs, reports, URLs, docs or command output. Credential presence alone does not activate a provider: explicit policy, global activation, provider-specific sender evidence, conservative quota and a bounded non-mutating remote check are also required.

EmailOctopus remains disabled for OTP even if configured because its official API has no direct transactional send operation. Campaign/list automation must never be used to fake OTP acceptance.

## Remote health safety

Health probes are authenticated, GET-only, response-size-bounded, time-bounded and cached briefly in Worker memory. Status retains only safe booleans/state/code—not account payloads or credentials. A failed sender check can block delivery before a mutation.

## Delivery-event security

`/internal/email/delivery-event` accepts only HMAC-authenticated normalized events containing the matching `requestId`, `idempotencyKey`, provider and provider event ID. A real provider webhook must first pass that provider’s official signature verification before forwarding a normalized event. API acceptance is never presented as inbox delivery.

Dormant legacy provider IDs remain accepted only for reconciliation of historical records; legacy providers are not selectable by the active routing catalog.
