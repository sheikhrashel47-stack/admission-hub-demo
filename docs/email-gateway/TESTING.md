# Email Gateway Testing

## Commands

```bash
npm run test:email
npm run test:auth
node account-retirement.test.mjs
npm run check:worker-bundle
```

## Suites

### `email-gateway.test.mjs`

- stable public contract and `phase2b-2` version
- strict config and global/provider-specific activation gates
- provider-specific From-address/name isolation with safe global fallback
- required `requestId` + `idempotencyKey`
- central templates and input validation
- atomic idempotency and minimized persistence
- delivery-event truth and event lease recovery
- all eight selected adapters with one normalized interface
- seven truthful transactional mappings plus EmailOctopus ineligibility
- bounded non-mutating remote health mappings
- remote sender evidence blocking before mutation
- complete quota labels and safe status metrics
- HTTP 4xx/5xx/rate/timeout/acceptance classification

### `email-gateway-failover.test.mjs`

- P1 success, P1→P2, P1/P2→P3
- normal pool→emergency and all-provider failure
- permanent-error stop and provider-scoped fallback
- quota-aware routing
- circuit open/cooldown/half-open/recovery
- uncertain response duplicate suppression
- enforced timeout and late-result protection
- same rendered OTP across failover
- atomic duplicate/concurrent idempotency
- per-provider load distribution and bounded load-lease release
- Durable Object restart persistence and concurrent event monotonicity
- storage/observability failure isolation

### `email-gateway-security.test.mjs`

- missing/wrong/stale/tampered signatures
- nonce replay
- bounded payload/response and no CORS
- Pages internal-route denial
- Worker disabled state
- OTP/recipient/error/secret leakage scans
- protected import direction and server-only static exclusion
- checked deploy-bundle integration

### `telegram-notifier.test.mjs`

- bounded completion-notification schema
- protected bot/destination binding validation
- one-request transport and Telegram `message_id` acceptance evidence
- provider-error redaction and explicit missing-binding blocker

### `email-gateway-load.test.mjs`

No real email is sent. Deterministic Mock Providers measure:

- 1,000, 5,000, 10,000 and 25,000 request shapes
- throughput and p95 operation latency
- CPU and heap delta
- persistence operation counts
- random failure/fallback rate
- sustained all-provider outage and fast circuit suppression
- rate/quota modes
- slow concurrency and bounded timeout

## Required Phase 2B closeout verification

1. run every Email suite unfiltered;
2. run the no-send load suite and record all shapes;
3. run security, integration and source import scans;
4. run existing Auth foundation, account-retirement and broader app regressions;
5. build `worker-bundle.mjs` using the pinned build command;
6. prove exact bundle comparison and syntax/import success;
7. inspect the final diff for credentials, destructive changes and unrelated files;
8. record the truthful provider status table and unresolved activation gates;
9. obtain owner approval before the next roadmap phase.

## Real-provider testing gate

No provider has yet been remotely configured or activated in a verified deployment, so no real delivery claim is made. Before enabling one provider, dated evidence must show:

1. encrypted secret presence without revealing its value;
2. provider-specific sender/domain/SPF/DKIM/DMARC readiness;
3. bounded non-mutating remote health evidence;
4. actual provider quota or a conservative explicitly local bound;
5. one owner-approved recipient/template;
6. API acceptance/message ID;
7. inbox or official delivery-event proof;
8. bounce/complaint path;
9. no secret/OTP/recipient log leakage;
10. rollback evidence.

EmailOctopus cannot pass the transactional-send gate unless its official API later adds a documented direct transactional endpoint and a separately reviewed adapter change is approved.

## Regression truth

Concrete Signup/Login/Password Reset/Session flows remain not applicable because this repository does not yet contain the approved new Supabase/Auth implementation. They must not be falsely marked passing. Phase 2B proves the delivery boundary while the Auth phase gate remains closed.
