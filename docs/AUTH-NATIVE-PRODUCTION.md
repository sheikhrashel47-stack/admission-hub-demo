# Cloudflare-native Auth — production contract

Status: approved implementation, replacing no part of the previously retired legacy account code.

## Public boundary

The browser uses only the versioned same-origin API:

- `GET /api/auth/v1/config`
- `POST /api/auth/v1/otp/request`
- `POST /api/auth/v1/otp/verify`
- `GET /api/auth/v1/session`
- `POST /api/auth/v1/session/logout`

This boundary is transport-neutral from the browser's perspective. The Durable Object authority or email delivery adapter can be replaced without changing the UI contract.

## Authority and data minimization

`AdmissionAuthAuthority` is a singleton SQLite Durable Object. It owns challenge state, attempt counters, replay prevention, identities, fixed-window abuse counters, and sessions atomically.

It persists:

- deterministic HMAC references for normalized email, IP, and device;
- a masked email display value;
- challenge-bound HMAC for the OTP;
- HMAC references for random opaque sessions.

It does not persist plaintext email addresses, plaintext OTP values, or raw session tokens. A user row is created only after successful proof of email ownership.

## Browser session policy

Authentication is returned only as:

`__Host-ah_session; Path=/; HttpOnly; Secure; SameSite=Strict`

No session credential is returned in a JSON body or stored in `localStorage`, `sessionStorage`, or IndexedDB. The optional pending-form state contains only a masked email, public challenge ID, and expiry metadata—not the plaintext email, OTP, or session credential. After a page reload, the user re-enters the same email locally to use the existing challenge.

## OTP controls

- Web Crypto CSPRNG six-digit code with rejection sampling
- HMAC-SHA-256 challenge binding
- 10-minute expiration
- 60-second resend cooldown
- five guesses per challenge
- one-time atomic consumption and explicit replay rejection
- recipient, network, device, and global fixed-window limits
- previous active challenge superseded on resend

## Delivery policy

The existing strongly consistent Email Gateway is the only send path. Production activation privately queries Mailjet and selects an existing `Active` individual sender. It enables only Mailjet and keeps every other adapter disabled.

Hard production ceilings are:

- 200 accepted messages per day
- 6,000 accepted messages per month
- one provider attempt; no blind fallback sends

Cloudflare Auth processing has materially more headroom than this. The email-delivery ceiling remains the actual signup/login bottleneck and must never be presented as 1,000 delivered emails per day.

## Activation and verification

`.github/workflows/native-auth-activate.yml`:

1. verifies Auth, Email Gateway, exact bundle, and retired-account guards;
2. fetches provider credentials through the existing Infisical OIDC integration;
3. performs a bounded read-only Mailjet sender query and selects an Active sender without printing it;
4. creates persistent Auth HMAC/internal secrets only when absent;
5. deploys the Worker, SQLite Durable Object migration, and sanitized Pages bundle;
6. creates a temporary external mailbox, requests one real OTP, reads it privately, verifies the secure session, rejects OTP replay, logs out, confirms revocation, and deletes the mailbox.

The workflow prints neither credentials, sender address, recipient address, OTP, nor session value.
