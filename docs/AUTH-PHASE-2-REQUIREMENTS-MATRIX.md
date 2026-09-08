# Phase 2 Requirements Traceability Matrix

**Decision:** Phase 2A foundation now; Phase 2B Email Gateway only after a separate approval; concrete Auth authority binding in Phase 3.
**Phase 2A closeout evidence (2026-09-09):** commit `e8b2d56510c25bd339f6af03abee11bc70c8ed94`; 62/62 Auth tests; 329/329 existing checks; four successful Actions; Chromium/WebKit mobile and desktop compatibility verified. Phase 2B remains not started.

## Authentication Foundation sections

| Owner section | Phase 2A disposition | Evidence / later gate |
|---|---|---|
| 2.1 Core Architecture | Implemented | isolated `auth/`, composition root, no feature imports |
| 2.2 Service Boundary | Implemented | nine explicit service boundaries + email port |
| 2.3 Authentication Methods | Contract only | password/Google/Passkey/OTP dispatch tested; UI belongs Phase 4 |
| 2.4 Smart Authentication Flow | Orchestration foundation | validate → authenticate → security → identity → session; concrete identity Phase 3 |
| 2.5 Signup Foundation | Validation/orchestration only | no account creation or UI; Phase 3/4 |
| 2.6 One-click Google Signup | OAuth port only | concrete Google/Supabase flow Phase 3/4 |
| 2.7 Identity Boundary | Implemented | provider identity separated from Admission Hub identity port |
| 2.8 Auth State Machine | Implemented | eight explicit states and guarded transitions |
| 2.9 Persistent Session | Strategy/port only | no browser token persistence; concrete secure restore Phase 5 |
| 2.10 Multiple Devices | Service contract only | list/revoke/revoke-all/trusted-device port; runtime Phase 5/6 |
| 2.11 Security Challenge | Hook and state foundation | risk/challenge outcome isolated; real policy Phase 6 |
| 2.12 Passkey Architecture | Isolated service/port | unsupported fallback tested; WebAuthn adapter Phase 3/4 |
| 2.13 Forgot Password | Recovery service/port | begin/complete orchestration; real flow Phase 4/5 |
| 2.14 Failure Isolation | Implemented/tested | feature/subscriber/recovery failures cannot force logout |
| 2.15 Network Recovery | Implemented/tested | timeout, retry/backoff, cancellation, no infinite loop |
| 2.16 Recovery Architecture | Implemented/tested | classified errors and terminal state |
| 2.17 Future-proof API | Implemented | frozen public facade with stable named methods |
| 2.18 Automated Regression | Implemented | foundation + chaos + protection suites and CI |
| 2.19 Chaos Testing | Implemented for 2A | timeout/offline/invalid session/races/repetition/database failure/load |
| 2.20 Auth Protection Contract | Implemented | protected docs, scan and GitHub Actions guard |

## Email orchestration blueprint

The owner’s email blueprint is preserved as binding Phase 2B scope. Phase 2A creates only the disabled provider-independent seam needed by Verification/Recovery; it does not activate or fake production email delivery.

| Email blueprint sections | Status after Phase 2A | Phase 2B requirement |
|---|---|---|
| 0–3 mandate/objective/provider-agnostic principle | Boundary recorded | implement without Auth Core provider branching |
| 4–7 adapters/registry/router/failover | Not started | isolated adapters, central registry, bounded routing |
| 8–14 error/circuit/health/quota/load/fast failover | Not started | implement and simulate every state |
| 15–17 idempotency/OTP/duplicate protection | Foundation has stable operation idempotency context only | persistent email request idempotency and uncertain-delivery policy in 2B |
| 18–20 email types/templates/payload | Not started | normalized contracts/templates in 2B |
| 21–24 secrets/gateway/internal auth/rate limit | Foundation secret scan implemented | server-only Worker gateway and multi-level abuse controls in 2B |
| 25–27 emergency/capabilities/delivery status | Not started | registry capabilities and truthful delivery lifecycle in 2B |
| 28–30 observability/dashboard/alerts | Not started | privacy-minimized events and internal monitoring in 2B |
| 31–34 priority/GAS/Supabase/failure isolation | Priority is not activated; GAS remains retired | configurable ordering; Supabase binding waits Phase 3; email failure cannot destroy Auth |
| 35–39 tests/chaos/load/mock/regression | 2A Auth chaos/mock tests implemented | Email-specific mock providers, failover and 1k–25k no-send load tests in 2B |
| 40–47 hot-swap/database/cost/deliverability/security/logging | Not started | server-side configuration and operations layer in 2B |
| 48–49 docs/new-provider process | Execution plan created | full EMAIL_ARCHITECTURE/SETUP/FAILOVER/SECURITY/OPERATIONS/TESTING docs in 2B |
| 50 acceptance | Not claimed | every applicable checkbox needs evidence before Phase 2B completion |
| 51–54 process/behavior/protection/final mission | Locked | exact inspect→build→test→report→STOP protocol applies to 2B |

## Phase status rule

- Phase 2A can be complete while overall **Phase 2 remains open**.
- Phase 2B cannot start from this document or from successful 2A tests.
- Owner must explicitly approve Phase 2B.
- Phase 3 cannot start until all of Phase 2 is completed, reported, and explicitly approved.
