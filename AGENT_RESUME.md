# AGENT_RESUME — Admission Hub

Read this file first. Continue; do not redesign.

**Agent name in chat:** জুজু  
**Date:** 2026-08-31

## Status
- Phase 1 Exact Clone — APPROVED
- Phase 2 Central cloud content — implemented (awaiting user “PHASE 2 APPROVED” after Android QA)
- Phase 3 User accounts + personal cloud — implemented in this update (STOP until “PHASE 3 APPROVED”)
- Phase 4+ — NOT started (AI / domain / SEO / monetization / launch)

## Repos & live
- Control PWA: https://github.com/sheikhrashel47-stack/admission-hub  
  Live: https://sheikhrashel47-stack.github.io/admission-hub/
- Public product: https://github.com/sheikhrashel47-stack/admission-hub-demo  
  Live: https://sheikhrashel47-stack.github.io/admission-hub-demo/
- Cloudflare account: `abb783e456e51a5d338419de93d5e576` (workers.dev subdomain `rashelzayan213`)
- Workers: `admission-gk` (main API, imports `public-worker.js` at `/pub/*`), `ah-public`, `admission-hub-ai-proxy`, `admission-notify`, `admission-voice`
- KV: `admihub-public` (`PUB_KV` = `942828aa82e546d4af11796ef92ab134`), `admission-gk-kv` (`GK_KV`)
- R2: **not enabled** — do not assume S3. Global content is KV `pubContent` / `pubContentMeta`

## Architecture
```
Control PWA (admission-hub)
  → POST /api/cloud/publish  (header X-AH-App: admission-hub)
  → PUB_KV pubContent (subjects, topics, questions, vocabulary, vocabularyMaster)
Public product
  → GET /pub/content + /pub/content/meta
  → IndexedDB admissionHubPublicDB (global stores only)
Logged-in public user
  → /pub/api/auth/*  and  GET/POST /pub/api/state  (personal stores only)
```

Global ≠ user data. Never mix exam history into pubContent.

## This update (Android + Phase 3)
1. **Android empty Question Bank:** `dbClear` then 3000 sequential `dbPut` hung Chrome. Now batched IDB (`putManyFast`, 400/tx), **no clear-before-write**, seed fallback if cloud apply fails (`cloud-content-sync.js`).
2. **Android 2-finger / hang scroll:** `html,body{height:100%!important}` + `touch-action:manipulation` on body. Fixed in `android-runtime-fix.js` (`touch-action: pan-y`, height auto).
3. **Vocabulary pictures:** client/worker strip limit raised 60KB → 900KB so `imageDataUrl` can publish. Control PWA must be opened once to push `vocabularyMaster` with images. Seed has words without pictures.
4. **Phase 3:** `user-account.js` (public) — email/mobile+password, OTP, optional Google (`/api/auth/google` if `GOOGLE_CLIENT_ID` worker var). Personal sync: examResults, mistakes, settings, dailyStats, activityLogs, notes. Isolation: `ustate:{userId}` only after Bearer token. Admin: control Settings → Public students (`public-users-admin.js`), status active/disabled/suspended.
5. Design freeze honored — login is existing `.card` / `.modal` language.

## Files that matter
- `cloud-content-sync.js` — global sync (both repos)
- `android-runtime-fix.js` — scroll/perf CSS
- `public-worker.js` — `/api/content`, `/api/auth/*`, `/api/state`, `/api/admin/*`
- `gk-agent-worker.js` — `/api/cloud/publish` + `/pub/*` dispatch
- `user-account.js` — public UI + personal sync
- `public-users-admin.js` — control admin list
- `app-seed.js` — fallback bank if cloud empty (public)

## Do next only after approval
- User must say **PHASE 3 APPROVED** before Phase 4 (AI personalization).
- Google Sign-In needs Cloudflare var `GOOGLE_CLIENT_ID`.
- Email OTP needs `RESEND_KEY` + `MAIL_FROM` (otherwise demo code returned).
- Vocab images: open **control** PWA so master records with pictures publish.

## Rules
- No redesign of dashboard / bank / exam / history / progress / vocab UI
- No Phase 4 AI / domain / SEO / monetization
- After every future update, refresh **this file** in **both** repos
