# 🔐 Admission Hub — New Login System

## 10-Phase Development Roadmap

**Saved:** 2026-09-09 (Asia/Dhaka)
**Owner rule:** এই নথি এখন শুধু roadmap হিসেবে save করা হলো। কোনো নতুন Auth feature/code এখনো তৈরি বা শুরু করা হয়নি।

---

## Phase 1 — 🧹 Complete Auth Reset

পুরোনো authentication ecosystem সম্পূর্ণ শনাক্ত করে নিরাপদভাবে remove করা।

- পুরোনো Login/Signup
- Session
- Auth state
- Old profile hooks
- Old user navigation
- Old auth API
- Old storage keys
- Old auth database dependencies
- পুরোনো redirect/guard
- পুরোনো personalization connection

**Goal:** পুরোনো Login System-এর কোনো অবশিষ্ট dependency না থাকা।

---

## Phase 2 — 🏗️ Authentication Foundation

একদম zero থেকে নতুন Auth architecture তৈরি।

- Authentication Core
- Identity Core
- Auth State Machine
- Single Source of Truth
- Error architecture
- Loading architecture
- Recovery architecture
- Secure configuration structure

**Goal:** Login-এর ভিত্তি এমনভাবে তৈরি করা যাতে অন্য feature সরাসরি Auth Core নষ্ট করতে না পারে।

---

## Phase 3 — 👤 Identity & Account System

Permanent user identity তৈরি।

- Unique User ID
- Account creation
- Account status
- Identity resolution
- Account lifecycle
- Duplicate account protection
- Account recovery foundation

**Goal:** একজন user-এর identity দীর্ঘমেয়াদে stable রাখা।

---

## Phase 4 — 🔑 Login / Signup Experience

এবার মূল user-facing authentication।

- Signup
- Login
- Logout
- Password handling
- Account recovery
- Validation
- Error messages
- Loading states
- Success states
- Mobile-first premium UI

**Goal:** অত্যন্ত সহজ, দ্রুত ও নির্ভরযোগ্য login experience।

---

## Phase 5 — 🔄 Session & Recovery Engine

এটাই হবে system-এর সবচেয়ে গুরুত্বপূর্ণ stability layer-এর একটি।

- Session creation
- Session restoration
- Session validation
- Session expiration
- Refresh handling
- Logout cleanup
- Network failure recovery
- Timeout handling
- Retry/backoff
- Browser/PWA reopen recovery
- Multiple-tab consistency

**Goal:** App reload/close/reopen/network সমস্যা হলেও authentication state যেন ভেঙে না যায়।

---

## Phase 6 — 🛡️ Security & Data Isolation

Authentication-এর security hardening।

- Credential protection
- Token/session security
- Database-level access control
- User data isolation
- Unauthorized access protection
- Rate limiting strategy
- Sensitive-data protection
- Secret management
- Security logging
- Abuse protection

**Goal:** User A যেন কোনোভাবেই User B-এর personal data access করতে না পারে।

---

## Phase 7 — 👤 Profile System

Login stable হওয়ার পরেই Profile system শুরু হবে।

- Profile creation
- Profile loading
- Profile editing
- Avatar
- Academic information
- Preferences
- Profile state management
- Profile recovery
- Profile/Auth separation

**Goal:** Profile পরিবর্তন হলেও authentication system যেন unaffected থাকে।

---

## Phase 8 — 🧠 Personalization + Navigation

এবার user identity-এর সাথে app connect হবে।

```text
Authentication
      ↓
User ID
      ↓
Profile
      ↓
Personalization
      ↓
Navigation
      ↓
App
```

তৈরি হবে:

- Personalized dashboard foundation
- User-specific settings
- User-specific content state
- Navigation guards
- Protected routes
- Guest routes
- Login → App flow
- Logout → Guest flow
- Redirect protection

**Goal:** Auth, Profile, Personalization এবং Navigation আলাদা থেকেও সুন্দরভাবে কাজ করা।

---

## Phase 9 — 🧪 Extreme Testing & Failure Engineering

এখানে Agent ইচ্ছা করে system ভাঙার চেষ্টা করবে।

Test করবে:

- Signup failure
- Login failure
- Wrong credentials
- Duplicate account
- Network offline
- Weak network
- API timeout
- Database failure
- Session expiry
- Refresh
- Browser reopen
- PWA reopen
- Multiple tabs
- Logout/re-login
- Profile failure
- Navigation failure
- Invalid session
- Security attacks
- Large user load
- Repeated login/logout

তারপর:

```text
Bug → Root Cause → Fix → Regression Test
```

**Goal:** “একবার কাজ করছে” নয়—বারবার একই পরিস্থিতিতে কাজ করছে কিনা নিশ্চিত করা।

---

## Phase 10 — 🔒 Production Freeze & Long-Term Protection

শেষ Phase-এ পুরো ecosystem production-grade করা হবে।

- Final security audit
- Final UX audit
- Performance audit
- Auth regression suite
- Documentation
- Recovery documentation
- Monitoring
- Error tracking
- Migration strategy
- Version compatibility
- Protected Auth Core
- Future-agent modification rules

তারপর:

```text
🔐 AUTH CORE FREEZE
```

ভবিষ্যতে কোনো Agent Login System পরিবর্তন করতে চাইলে আগে:

```text
Impact Analysis → Tests → Security Review → Approval
```

করতে হবে।

---

## 🏁 Final Development Order

```text
Phase 1  → পুরোনো সব Auth delete
Phase 2  → নতুন Auth foundation
Phase 3  → Identity
Phase 4  → Login/Signup
Phase 5  → Session & Recovery
Phase 6  → Security
Phase 7  → Profile
Phase 8  → Personalization + Navigation
Phase 9  → Extreme Testing
Phase 10 → Production Freeze 🔒
```

## 🚨 বাধ্যতামূলক Phase Gate

> **এক Phase-এর কাজ 100% test + verify + মালিকের approval ছাড়া পরের Phase শুরু করা যাবে না।**

- একবারে শুধু একটি Phase execute হবে।
- বর্তমান Phase-এর acceptance criteria পূর্ণ না হলে পরবর্তী Phase নয়।
- Agent নিজের সিদ্ধান্তে কোনো Phase skip, merge বা আগাম শুরু করতে পারবে না।
- প্রতিটি Phase শেষে implementation, tests, live verification ও handoff evidence দেখিয়ে মালিকের স্পষ্ট approval নিতে হবে।

তারপর আলাদাভাবে:

1. **Leaderboard — 10 Phase**
2. **Reward — 20 Phase**

এই দুই roadmap New Login System-এর 10 Phase সম্পূর্ণ হওয়ার পর আলাদাভাবে শুরু হবে। ❤️

---

## 📌 Current Status — 2026-09-09

- Phase 1 legacy Auth retirement: **closed before this roadmap execution**
- Phase 2: **officially started by owner**
- Owner-selected execution: **Phase 2A + Phase 2B split**
- Phase 2A Authentication Foundation: **implemented, tested and live-verified; awaiting owner approval**
- Phase 2B Multi-provider Email Infrastructure: **not started; explicit approval required**
- Concrete Supabase/Auth authority binding: **deferred to Phase 3 by owner decision**
- New Login/Signup UI, permanent account identity and production session: **not started**
- Overall Phase 2: **open—not complete until Phase 2B is separately approved, built and verified**
- Next action: Phase 2A report review; only the owner can authorize Phase 2B.
