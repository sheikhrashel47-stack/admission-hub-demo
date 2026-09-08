# Admission Hub — Phase 2 Execution Plan

**Decision date:** 2026-09-09 (Asia/Dhaka)
**Owner-approved execution:** Phase 2A + Phase 2B split
**Auth authority decision:** concrete Supabase binding deferred until Phase 3
**Phase 2A status (2026-09-09):** implemented and verified in `e8b2d56510c25bd339f6af03abee11bc70c8ed94`; awaiting owner approval
**Phase 2B status:** not started

## 1. Audit result

The current v221 product intentionally has no Login/Signup UI, Auth API, account session runtime, Profile integration, or Personalization gate. The only Supabase-named production artifact is `supabase_sync_schema.sql`, an independent encrypted sync-vault schema; it is not Supabase Auth and is not connected to the current app. No Supabase SDK, Auth URL/config, repository variable, or repository secret is present.

Therefore phrases in the owner blueprint such as “existing Supabase Auth”, “existing Login/Signup UI”, and acceptance checks requiring live Signup/Login/Password Reset cannot be treated as current facts. Building those now would pre-start roadmap Phases 3–5.

## 2. Approved boundary

### Phase 2A — Authentication Foundation (execute now)

Build and verify:

- isolated `/auth/**` domain
- stable public Auth contract
- explicit state machine and single authoritative state store
- Auth, Session, Verification, Recovery, Passkey, OAuth, Security, Device Session, and Identity service boundaries
- provider/authority ports with safe unbound defaults
- controlled timeout, cancellation, retry/backoff, single-flight and stale-operation protection
- safe error taxonomy and redaction
- secure client configuration validator
- failure isolation from Profile/Leaderboard/Progress/AI
- repository Auth protection contract and CI guard
- mock-driven regression, failure, chaos, concurrency and foundation load tests

Phase 2A must not:

- mount Login/Signup UI
- create real users or permanent user IDs
- expose live Auth APIs
- restore the retired v1 account system
- bind Supabase or another Auth authority
- activate a real email provider
- store passwords/tokens in localStorage/sessionStorage
- alter Profile, Personalization, navigation, questions, results, progress, settings, or dormant records

### Phase 2B — Multi-provider Email Infrastructure (requires a new explicit owner approval)

After Phase 2A evidence and approval, build:

- provider interface/adapters and registry
- mock provider, router, health monitor, quota engine, circuit breakers
- idempotency, controlled failover/recovery and provider capability selection
- internal Cloudflare email gateway security boundary
- secure events/observability and operational documentation
- mocked chaos/load/failover tests
- real provider activation only for securely configured providers

A provider credential’s historical existence is not permission to activate or expose it. Provider readiness must be verified without printing secrets.

### Phase 3 and later (not Phase 2A)

- Phase 3: concrete Auth authority selection/binding, permanent Admission Hub identity, account lifecycle and duplicate-account rules
- Phase 4: real Login/Signup/Logout UI and user-facing methods
- Phase 5: production session persistence, refresh, browser/PWA reopen and multi-tab consistency
- Phase 6: full security/data-isolation enforcement
- Phase 7: Profile
- Phase 8: Personalization/navigation integration

## 3. Stable dependency direction

```text
App features
    ↓ consume only
Public Auth Contract
    ↓
Auth Core / authoritative store
    ↓
Isolated services
    ↓
Provider ports
    ↓
Phase 3+ concrete adapters
```

No app feature may import Auth Core internals or mutate Auth state directly.

## 4. Phase 2A completion gate

Phase 2A may be reported complete only when:

- all listed foundation modules exist and are isolated
- public contract is frozen and tested
- state transitions reject invalid paths
- restore/sign-in/sign-out orchestration passes using mocks
- timeout/retry/cancel/single-flight/stale-result behavior is verified
- feature failures cannot log out or mutate Auth
- Passkey unsupported state degrades safely
- source contains no provider secrets, token persistence, provider URL, or live account endpoint
- CI Auth guard and all existing app regressions pass
- core app live behavior remains unchanged
- dated handoff is pushed and deployment evidence is recorded

Then STOP. Phase 2B must not start without explicit owner approval.
