# Email Gateway Protection Contract

The Phase 2B provider interface, active catalog, registry, dynamic router, circuit breaker, quota/load engine, failover policy, internal security boundary, secret boundary and idempotency coordinator are protected infrastructure.

## Dependency rules

- Frontend, Pages assets and Auth Core must never import provider adapters, storage or router internals.
- A trusted server composes the gateway; future Supabase/Auth code may consume only the stable Email Gateway port after its approved phase.
- Provider adapters contain transport and non-mutating health mapping only. Business templates, routing and Auth state do not belong in adapters.
- Provider names must never appear in Auth Core branching.
- Providers are delivery-only and cannot mutate identity, OTP authority, account or session state.

## Active catalog rules

- The owner-selected catalog is Resend, Brevo, Mailjet, Mailtrap, MailerSend, SendPulse, EmailOctopus and Courier.
- Each adapter exposes `sendEmail`, `checkHealth`, `getStatus` and `getCapabilities`.
- EmailOctopus is catalog-visible but OTP-ineligible until an official direct transactional endpoint exists and a new review approves it.
- Dormant legacy adapters may remain for preservation/reconciliation but cannot enter active policy or routing accidentally.

## Security rules

- No provider key, signing secret, password, token or credential value in source, frontend, public config, D1, KV, GitHub, logs, reports, events, localStorage, sessionStorage, IndexedDB, URL or ordinary tables.
- Every provider uses isolated Cloudflare encrypted Worker Secret binding name(s).
- `/internal/email/*` requires timestamped HMAC signature, body digest, nonce and replay storage. CORS is never authentication.
- Cloudflare Pages returns 404 for `/internal/*` and excludes `/email-gateway` from its static artifact.
- Production sends require strong Durable Object consistency. Eventual KV is not accepted for idempotency, nonce, rate, load, circuit or quota authority.
- Persist only opaque IDs, hashed recipient/context references, provider/outcome metadata and bounded events.
- Never persist or log OTP plaintext. Never include OTP in a URL.
- Uncertain delivery stops failover and is never blindly resent.
- Unconfigured, unverified, exhausted, OPEN or ineligible providers remain skipped.

## Reliability rules

- Every logical send has stable opaque `requestId` and `idempotencyKey` values.
- The idempotency key is atomically acquired before limits/rendered transport; concurrent duplicates produce at most one mutation.
- Every actual provider mutation has a deterministic `deliveryAttemptId`.
- Render once and reuse the exact HTML/text/OTP across safe fallback.
- Provider attempts, health probes, load leases and global deadline are bounded.
- One provider is mutated at most once per logical routing operation.
- Permanent recipient/request errors stop; provider-scoped safe failures may use the next eligible provider.
- Timeout/unknown acceptance never triggers blind fallback.
- Router decisions account for health, rates, latency, quota, circuit, current load, capability and configured policy; blind round-robin is forbidden.
- Circuit lifecycle is `CLOSED → OPEN → HALF_OPEN → CLOSED` with bounded automatic recovery.
- Quota labels are `NORMAL`, `LOW`, `CRITICAL`, `EXHAUSTED`, `UNKNOWN`.
- All-provider outage returns a recoverable temporary failure, never fake success.
- Email failure must not mutate identity, account, session or Auth authority.

## Change gate

Any future change to this protected boundary requires:

1. impact analysis;
2. provider-contract and remote-health tests;
3. failover/circuit/quota/load/idempotency tests;
4. security/replay/OTP-leakage tests;
5. mocked no-send load tests;
6. Auth foundation and existing application regression;
7. exact Worker bundle verification;
8. human approval before activation or before weakening a limit.
