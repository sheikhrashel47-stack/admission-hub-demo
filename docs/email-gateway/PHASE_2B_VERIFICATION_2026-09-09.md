# Admission Hub Email Gateway — Phase 2B Verification Report

**Date:** 2026-09-09 (Asia/Dhaka)

**Version:** `phase2b-2`

**Base commit:** `7bada5cf90616ac87e456ecc6a6dae9ac5283b54`

**Approved product commit:** `391bdf2ce8f6ca4db68fab481174270296e3fc92`

**Review state:** owner approval received on 2026-09-09; implementation closeout approved

**Source state:** committed locally; current session has no configured Git remote/GitHub authentication, so no push occurred

**Worker deployment/activation state:** not performed; every provider remains disabled

## Outcome

The active catalog now matches the owner-selected pool: Resend, Brevo, Mailjet, Mailtrap, MailerSend, SendPulse, EmailOctopus and Courier. Seven adapters implement documented direct transactional transports. EmailOctopus remains visible but cannot enter OTP routing because its official API has no direct one-to-one transactional send operation.

The Cloudflare Worker remains the private secret/delivery boundary. No frontend or Auth module imports provider routing. Concrete Supabase/Auth binding was not started because the Phase 2B approval gate remains open.

No replacement provider secret was available through the current authorized runtime. No provider was configured, activated or called. No real email was sent.

## Common adapter contract

Every selected adapter exposes:

- `sendEmail()`
- `checkHealth()`
- `getStatus()`
- `getCapabilities()`

Compatibility aliases remain only to preserve existing orchestration while the modern surface is protected by tests.

## Endpoint and acceptance mapping

| Provider | Transactional endpoint | Non-mutating health evidence | Required acceptance evidence |
|---|---|---|---|
| Resend | `POST https://api.resend.com/emails` | `GET /domains` + exact verified sender domain | response `id` |
| Brevo | `POST https://api.brevo.com/v3/smtp/email` | `GET /v3/senders` + exact active From address | response `messageId` |
| Mailjet | `POST .../v3.1/send` | `GET .../v3/REST/sender` + exact active sender | recipient `MessageUUID` |
| Mailtrap | `POST https://send.api.mailtrap.io/api/send` | `GET https://mailtrap.io/api/stats/domains` | first `message_ids` value |
| MailerSend | `POST https://api.mailersend.com/v1/email` | `GET /v1/domains` + verified From domain | `x-message-id`; paused/all-suppressed 202 is rejected |
| SendPulse | `POST https://api.sendpulse.com/smtp/emails` | `GET /smtp/senders` + exact approved sender | `result:true` and `id` |
| EmailOctopus | none | authenticated `GET /lists` reports `INELIGIBLE` | none; `sendEmail()` fails safely |
| Courier | `POST https://api.courier.com/send` | authenticated `GET /messages?limit=1` | response `requestId` |

All probes are authenticated GET requests with bounded time, bounded response size and short in-memory caching. Provider payloads are discarded; only safe status booleans/codes remain.

## Reliability changes

- Required stable `requestId` and `idempotencyKey` on every logical request.
- Durable Object acquisition now uses the idempotency key as the atomic boundary.
- Every actual provider mutation receives/persists a deterministic `deliveryAttemptId`.
- Same rendered HTML/text/OTP bytes are reused across safe failover.
- Timeout, malformed success or unknown acceptance stops fallback as `UNCERTAIN`.
- Router evaluates remote health, success/failure/timeout rates, latency, local quota, circuit, current load, capability, priority, weight and cost policy.
- Atomic `maxConcurrent` admission and expiring load leases prevent unbounded provider pressure.
- Circuit lifecycle remains `CLOSED → OPEN → HALF_OPEN → CLOSED` with one bounded probe.
- Quota labels are `NORMAL`, `LOW`, `CRITICAL`, `EXHAUSTED`, `UNKNOWN`.
- All-provider outage remains a recoverable temporary failure, never fake success.
- No unsafe in-memory queue was introduced; a future persistent queue requires separate OTP-expiry/idempotency review.

## Secret and activation boundary

Each provider has isolated documented Worker Secret binding name(s). Values are absent from source, D1, KV, frontend, logs, reports and this document. Activation additionally requires:

1. explicit provider policy;
2. global activation gate;
3. provider-specific sender evidence flag;
4. valid sender address/name;
5. conservative daily/monthly quota;
6. provider `maxConcurrent` bound;
7. bounded remote health/sender evidence;
8. strong Durable Object storage;
9. signed internal caller.

EmailOctopus cannot become transactionally eligible through configuration alone.

## Verification results

### Email infrastructure

- Email/failover/security/load suite: **84 pass / 0 fail / 0 skipped**
- Worker integration suite: **4 pass / 0 fail / 0 skipped**
- Combined Email coverage: **92.88% lines / 81.39% branches / 91.22% functions**
- All active provider adapter files: **100% line coverage** in the reported run
- Dormant preserved legacy adapters are included in aggregate coverage but are not active catalog entries

### Existing architecture regressions

- Auth foundation/chaos/protection: **62 pass / 0 fail / 0 skipped**
- Auth coverage: **98.39% lines / 86.06% branches / 88.45% functions**
- Account retirement guard: **28 pass / 0 fail**
- Broader app regression: **14/14 top-level suites pass**

### No-send load evidence

| Shape | Throughput | p95 | Result |
|---:|---:|---:|---|
| 1,000 | 4,935/s | 50.09 ms | 1,000 accepted |
| 5,000 | 6,708/s | 39.65 ms | 5,000 accepted |
| 10,000 | 6,687/s | 37.65 ms | 10,000 accepted |
| 25,000 | 6,588/s | 44.72 ms | 25,000 accepted; 21.28 MB heap delta |

Additional scenarios:

- random-failure 5,000: **5,003/s**, 5,000 accepted, 1,666 safe fallbacks;
- all-provider outage 1,000: **5,114/s**, all failed truthfully and bounded;
- slow 500: **4,787/s**, p95 **32.19 ms**;
- timeout 100: **865/s**, p95 **113.09 ms**, all uncertain/failed safely with no blind fallback.

All load providers were deterministic mocks. No external provider request was made.

### Bundle/security

- pinned Worker build: pass
- `npm run check:worker-bundle`: exact comparison pass
- Worker syntax/import/integration: pass
- `git diff --check`: pass
- browser persistence/log/dynamic-code scan for Email Gateway: clean
- credential-shaped literal scan for gateway/docs: clean
- generated bundle SHA-256: `fe68de7f188b823a0e20514e022c2333785baa9b8524ad9255f468f735f4b600`

The existing root `.js` ESM module-type warning remains informational and was not changed as unrelated scope.

## Required provider status table

`Configured` means replacement encrypted secret presence was safely observed by this runtime. It was not; therefore no provider is reported configured or healthy.

| Provider | Configured | Healthy | Quota State | Circuit | Priority | Failover |
|---|---|---|---|---|---:|---|
| Resend | No | Not verified | UNKNOWN | CLOSED | 10 | Skipped |
| Brevo | No | Not verified | UNKNOWN | CLOSED | 20 | Skipped |
| Mailjet | No | Not verified | UNKNOWN | CLOSED | 30 | Skipped |
| Mailtrap | No | Not verified | UNKNOWN | CLOSED | 40 | Skipped |
| MailerSend | No | Not verified | UNKNOWN | CLOSED | 50 | Skipped |
| SendPulse | No | Not verified | UNKNOWN | CLOSED | 60 | Skipped |
| EmailOctopus | No | Ineligible for OTP | UNKNOWN | CLOSED | 70 | Ineligible |
| Courier | No | Not verified | UNKNOWN | CLOSED | 80 | Skipped |

## Remaining operational activation gates

Phase 2B implementation approval is complete. This approval does not activate or prove any provider.

1. replacement credentials are installed through a secret-safe Cloudflare interface without exposing values;
2. sender/domain, SPF, DKIM, DMARC, bounce/complaint and actual account quota evidence is collected per provider;
3. policies are enabled one provider at a time with conservative limits;
4. signed non-mutating remote health succeeds;
5. one separately owner-approved real send is verified by acceptance ID and inbox/official delivery event;
6. production Worker deployment and rollback verification are performed through the existing workflow;
7. concrete Supabase/Auth authority work begins only after an explicit start instruction.
