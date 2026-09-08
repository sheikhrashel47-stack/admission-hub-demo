# Admission Hub Authentication Foundation Architecture

**Phase:** 2A  
**Version:** `phase2a-1`  
**Runtime activation:** none (foundation is intentionally not mounted)  
**Concrete authority:** unbound

## 1. Purpose

Phase 2A establishes a stable authentication domain before an account database, Login UI, concrete session transport, Supabase Auth binding, Profile, or Personalization exists. It prevents the previous architecture’s failure mode where unrelated application features could influence login state.

Core principle:

> Never make authentication depend on the rest of the application; make the rest of the application depend on a stable authentication contract.

## 2. Dependency architecture

```text
Admission Hub features
        │
        │ import only auth/index.mjs
        ▼
Frozen Public Auth Contract
        │
        ▼
Authentication Core ─────── Authoritative Auth State Store
        │                              │
        ├── Auth Service               └── validated state transitions only
        ├── Session Service
        ├── Verification Service
        ├── Recovery Service
        ├── Passkey Service
        ├── OAuth Service
        ├── Security Service
        ├── Device Session Service
        └── Identity Service
                 │
                 ▼
          Provider Ports
                 │
          unbound in Phase 2A
```

No feature is imported by Auth. No feature receives the core, store, service instances, internal session object, or provider object.

## 3. Module map

| Module | Responsibility |
|---|---|
| `auth/index.mjs` | only allowed public import boundary |
| `create-auth-foundation.mjs` | dependency composition and frozen facade |
| `core/auth-core.mjs` | authentication orchestration only |
| `core/state-machine.mjs` | legal state graph and invalid-transition rejection |
| `core/state-store.mjs` | immutable single source of truth and isolated subscribers |
| `core/operation-runner.mjs` | timeout, cancellation, bounded retry/backoff, single-flight, idempotency context |
| `core/errors.mjs` | error taxonomy, classification and safe public redaction |
| `core/config.mjs` | allowlisted, immutable, secret-rejecting public config |
| `core/contracts.mjs` | provider-independent port contracts and disabled defaults |
| `core/validation.mjs` | input/result validation before state mutation |
| `services/*` | isolated service boundaries around each port |
| `testing/mock-ports.mjs` | deterministic failure/chaos tests without live accounts/providers |

## 4. Authoritative state machine

```text
INITIALIZING
    ↓
CHECKING_SESSION
    ├── AUTHENTICATED
    ├── RECOVERING → AUTHENTICATED / UNAUTHENTICATED
    └── UNAUTHENTICATED
             ↓
       AUTHENTICATING
          ├── AUTHENTICATED
          ├── RECOVERING → UNAUTHENTICATED
          └── UNAUTHENTICATED

AUTHENTICATED
    ├── REFRESHING → AUTHENTICATED / RECOVERING / UNAUTHENTICATED
    ├── RECOVERING → AUTHENTICATED / UNAUTHENTICATED
    └── LOGGING_OUT → UNAUTHENTICATED
```

- Invalid direct jumps throw `INVALID_STATE`.
- Every snapshot is deeply frozen and revisioned.
- Auth context stays valid during controlled refresh/recovery when a valid internal session already exists.
- Terminal failure never leaves `AUTHENTICATING`, `CHECKING_SESSION`, or `RECOVERING` spinning forever.

## 5. Stable public contract

```text
initialize()
getCurrentUser()
getSession()
getState()
isAuthenticated()
subscribe()
signIn()
signOut()
signUp()
verify()
recover()
```

The facade is frozen. It exposes no core/store/services. Concrete adapters can change later without forcing Dashboard/Profile/Leaderboard code to change.

## 6. Identity boundary

Provider identity and Admission Hub identity are separate objects:

```text
Provider assertion
      ↓
Provider Identity
      ↓
Identity Service port
      ↓
Admission Hub Identity
```

Phase 2A validates this separation with mocks but does not generate a permanent user ID or create an account. That concrete authority belongs to Phase 3.

## 7. Session boundary

- Internal session objects may be opaque to the core.
- Public session snapshots expose only safe metadata: ID, status, issue/expiry time, device ID and remembered flag.
- Access/refresh tokens or provider handles are stripped from public state.
- The foundation never reads/writes localStorage, sessionStorage, cookies or IndexedDB.
- A future adapter must implement persistence with a secure server-managed strategy.

## 8. Operation and recovery rules

Every controlled operation receives:

- bounded timeout
- bounded retry count (maximum three at config validation)
- exponential backoff cap
- AbortSignal cancellation
- stable idempotency key across retries
- error classification
- terminal failure

Additional protections:

- repeated Login clicks use one single-flight operation
- Signup never automatically retries in Phase 2A, avoiding duplicate account mutation
- Logout cancels stale Login completion
- provider results arriving after a newer operation cannot authenticate the app
- permanent 4xx/security/user errors are not retried

## 9. Error taxonomy

- `USER_ERROR`
- `NETWORK_ERROR`
- `AUTH_ERROR`
- `SESSION_ERROR`
- `SERVER_ERROR`
- `SECURITY_ERROR`
- `UNKNOWN_ERROR`

Public errors contain safe category/code/message/retry metadata only. Password, OTP, token, credential, authorization and raw provider details are removed.

## 10. Failure isolation

A Profile, Leaderboard, Reward, Progress, AI, renderer, subscriber, or other feature exception has no mutation path into Auth state. Subscriber callbacks are individually guarded. A recovery-service failure while already authenticated returns to `AUTHENTICATED`; it does not force logout.

## 11. Provider status

All concrete providers are unbound. Safe defaults:

- app boot settles as `UNAUTHENTICATED`
- password/OAuth/OTP/account actions fail closed with `NOT_CONFIGURED`
- Passkey reports unavailable without blocking password architecture
- no network request is made
- no real user/session/email is created

Supabase-compatible and provider-agnostic ports exist, but no Supabase SDK or project configuration is added in Phase 2A.

## 12. Phase 2B seam

The port registry reserves an `emailGateway` contract (`send`, `healthCheck`, `getCapabilities`). It is disabled and unused in Phase 2A. Phase 2B will implement the provider registry/router/circuit/quota/idempotency/failover infrastructure only after explicit owner approval.

## 13. Repository protection

- `auth/AUTH_PROTECTION_CONTRACT.md` defines mandatory rules.
- `.github/workflows/auth-foundation-guard.yml` executes all Auth tests.
- `auth-protection.test.mjs` scans boundaries, public exports, imports, persistence, endpoints, provider coupling, secret-like values and CI wiring.

## 14. Intentional limitations

Phase 2A is not a usable Login system. It intentionally has:

- no Login/Signup UI
- no live `/api/auth/**`
- no concrete Supabase/Auth adapter
- no permanent identity/account rows
- no production session cookie/refresh logic
- no real OTP/email sender
- no Profile or navigation integration

Those are protected by later roadmap gates rather than silently pulled forward.
