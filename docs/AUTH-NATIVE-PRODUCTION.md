# Firebase Email + Password Auth — production contract

Status: configuration-gated production implementation. The public Auth boundary remains versioned and provider-replaceable.

## Required user flow

1. A user signs up with email and password.
2. Firebase Authentication creates the account.
3. Admission Hub asks Firebase to send a standard `VERIFY_EMAIL` address-verification email.
4. The user clicks Firebase's verification link.
5. Login is denied until a fresh Firebase account lookup returns `emailVerified=true`.
6. A verified user logs in normally with the same email and password.

Email-link sign-in is not part of this implementation. The verification link verifies the address; it does not sign the user in.

## Public boundary

The browser uses only the same-origin API:

- `GET /api/auth/v1/config`
- `POST /api/auth/v1/signup`
- `POST /api/auth/v1/verification/resend`
- `POST /api/auth/v1/login`
- `GET /api/auth/v1/session`
- `POST /api/auth/v1/session/logout`

The browser never calls Google directly and never receives a Firebase ID token, refresh token, or Admission Hub session token in JSON. This keeps provider details behind the stable Admission Hub boundary.

## Firebase operations

The Worker uses Firebase's documented REST endpoints:

- `accounts:signUp`
- `accounts:sendOobCode` with `requestType=VERIFY_EMAIL`
- `accounts:signInWithPassword`
- `accounts:lookup`
- Secure Token refresh

`FIREBASE_WEB_API_KEY` is an encrypted Worker binding. `FIREBASE_CONTINUE_URL` is fixed to `https://admissionhub.pages.dev/?firebaseVerified=1`. Activation rejects a Firebase project whose authorized domains do not contain `admissionhub.pages.dev`.

Passwords exist only in the bounded request body while the Worker forwards a signup or login request to Firebase over HTTPS. They are not written to SQLite, browser storage, logs, analytics, or API responses.

## Verified-only authorization and session policy

No local identity or authenticated session is created during signup. After password login, the Worker performs a fresh `accounts:lookup` and requires all of the following:

- the lookup subject matches the signed-in Firebase subject;
- the Firebase user is not disabled;
- `emailVerified` is exactly `true`.

Only then does the SQLite authority create or reuse the local app identity and issue a session. Credentials are transported only in Secure, HttpOnly, SameSite=Strict cookies:

- `__Host-ah_session` — random opaque Admission Hub session;
- `__Host-ah_firebase` — Firebase refresh credential used server-side for fresh provider validation.

`GET /session` refreshes Firebase state, checks `emailVerified=true` again, and verifies that the Firebase subject/email still match the local HMAC-linked identity. Invalid, disabled, unverified, expired, or mismatched state revokes the local session and clears both cookies.

## Data minimization

`AdmissionAuthAuthority` is a singleton SQLite Durable Object. It atomically owns rate limits, HMAC-linked external identities, local users, and sessions. It stores:

- HMAC references for normalized email, Firebase subject, IP, device, and session;
- a masked email display value;
- local user status and timestamps.

It does not store plaintext email, password, Firebase token, or raw session token.

## No-cost limits and abuse controls

The Firebase Spark contract used by this implementation is:

- standard address-verification emails: **1,000 per day**;
- registered user accounts: **unlimited**.

The Durable Object enforces an atomic 1,000/day global verification-email admission limit, plus tighter recipient, network, device, resend, and login limits. There is no lifetime user cap in the application.

The implementation uses Firebase Authentication and its built-in verification email only. It does not deploy Cloud Functions or another billable mail service.

## Activation and live verification

`.github/workflows/native-auth-activate.yml`:

1. verifies all Auth, Email Gateway, retirement, and exact-bundle tests;
2. validates the Firebase project and authorized Pages domain without creating a user;
3. installs `FIREBASE_WEB_API_KEY` as an encrypted Worker binding;
4. deploys the Worker and SQLite schema;
5. creates a disposable external mailbox and Firebase test user;
6. proves that signup sends a verification email, unverified login is denied, the standard verification action changes Firebase state, verified password login succeeds, the session refreshes, and logout revokes it;
7. deletes the Firebase test user and disposable mailbox;
8. deploys the sanitized Pages UI and checks the live public contract.

The workflow prints no API key, password, mailbox address, verification code, Firebase token, or session credential. A failed activation triggers a bounded Worker rollback.
