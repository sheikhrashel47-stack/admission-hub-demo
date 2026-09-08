# 2026-09-09 — Legacy Account, Profile ও Personalization Onboarding সম্পূর্ণ retirement

**Agent:** জুজু  
**সময় অঞ্চল:** Asia/Dhaka  
**চূড়ান্ত product-code commit:** `c45a4e3ec427475b8a9dcd525b84f117589251e0`  
**প্রধান retirement commit:** `07cdc102ac78569fac778d9938383a09918cdc8c`

## ✅ মালিকের নির্দেশ ও scope

এই কাজটি পুরোনো Login/Auth system patch নয়। পুরোনো account implementation frontend ও deployed Worker থেকে সম্পূর্ণ retire করা হয়েছে, যাতে ভবিষ্যতে মালিক শূন্য থেকে নতুন system বানাতে পারেন।

- শুধু **Profile navigation ও Profile tools** সরানো হয়েছে।
- Home, Question Bank, Exam, AI ও History—পাঁচটি primary tab অক্ষত রাখা হয়েছে।
- Personalization Onboarding UI, gate, flow, source, API ও loaded assets সরানো হয়েছে।
- নতুন login/profile/onboarding system এই কাজে বানানো হয়নি।
- existing KV account/profile/onboarding records এবং local questions/results/progress/settings/study data delete বা migrate করা হয়নি; dormant অবস্থায় রাখা হয়েছে।

## ✅ যা করা হয়েছে

### 1. Frontend account/profile/onboarding removal

- `premium-auth.js/css`, `auth-svg.js`, `user-account.js`, `onboarding.js/css`, `curriculum-config.js` এবং `preview-onboarding.html` delete।
- `ahAuthGate`, `ahOnboardGate`, Google Identity client, token boot dependency, login/profile CTA ও retired route renderer production HTML থেকে বাদ।
- Profile primary tab, Profile route/tool এবং Experience Studio-এর Profile Avatars ও Profile Identity Card সরানো হয়েছে; অন্য Studio feature অক্ষত।
- stale `profile`, `account`, `login`, `signup`, `register` ও `onboarding` hash Dashboard-এ safely normalize হয়।
- residual legacy auth media (`auth-art/`, `auth-screens/`), OTP email preview এবং obsolete Gmail OTP helper-ও repository/deployment থেকে delete।

### 2. Deployed static URL retirement

Cloudflare Pages-এর SPA fallback প্রথমে deleted file URL-এ নতুন `index.html` দিচ্ছিল। তাই `_worker.js`-এ retired exact paths এবং `auth-art`/`auth-screens` prefixes intercept করে `410 Retired`, `no-store`, `nosniff` করা হয়েছে। GitHub Pages mirror-এ deleted paths স্বাভাবিকভাবে `404`। পুরোনো JS/CSS/media/preview/OTP content আর কোনো live URL থেকে পাওয়া যায় না।

### 3. Backend account implementation retirement

- `public-worker.js` থেকে পুরোনো auth, profile, onboarding, state/export, re-auth/security, session এবং account-admin handlers সরানো হয়েছে।
- `gk-agent-worker.js` dispatcher এবং `worker-bundle.mjs` থেকে account provider secrets/config forwarding ও retired implementation বাদ।
- public content/meta, admin-token content publishing, health এবং unrelated GK behavior রাখা হয়েছে।
- retired account APIs default `404 {"error":"not-found"}`; generic protected admin namespace invalid token-এ `403`, কিন্তু account-user handler আর bundle-এ নেই।
- exact Worker bundle reproducibility `esbuild --charset=utf8` দিয়ে নিশ্চিত করা হয়েছে।

### 4. AI login ছাড়া usable রাখা

- browser-local stable identity: `ahAiGuestV1`।
- request contract: `X-AH-Guest`; raw ID store না করে Worker hashed device identity ব্যবহার করে।
- bearer token, profile state, login prompt ও account gate বাদ।
- safe per-device এবং per-network daily limits রাখা হয়েছে।
- local study stats/context অক্ষত, long AI response সবসময় fully expanded।

### 5. Public content account-independent

`cloud-content-sync.js` এখন public `/api/content/meta` ও `/api/content` ব্যবহার করে; account token/login ছাড়া 3000-question content hydrate হয়। Admin publishing authorization অপরিবর্তিত।

### 6. PWA/cache cleanup

- build: `v221-account-retired-20260908`।
- AI asset: `ai-agent-chat.js?v=agent-f1-ui-chatv14-guest`।
- Dashboard: `dashboard-v2.js?v=dash2f7`।
- retired source/assets APP_SHELL থেকে বাদ।
- activation পুরোনো `admission-hub-shell-*` cache মুছে শুধু current v221 cache রাখে; data stores touch করে না।

## 📂 প্রধান বদলানো/মুছে দেওয়া অংশ

- Frontend: `index.html`, `sw.js`, `ai-agent-chat.js`, `cloud-content-sync.js`
- Worker: `public-worker.js`, `gk-agent-worker.js`, `worker-bundle.mjs`, `_worker.js`
- Studio: `experience-studio-shell.js`, `experience-studio-cards.js`, `experience-studio-store.js`
- Guard: `account-retirement.test.mjs`, `.github/workflows/account-retirement-guard.yml`
- Deleted account implementation/media: উপরের source list, `auth-art/`, `auth-screens/`, `email-preview-otp.html`, `otp-gmail.gs`
- Obsolete auth/onboarding tests ও workflow সরিয়ে current retirement guard বসানো হয়েছে।

## 🔎 Local verification

- final complete active regression: **15 suites, 329 passed / 0 failed**।
- account retirement guard: **28/28**।
- Worker bundle exact reproduction: pass।
- active-source/route/secret-marker scan: pass।
- missing HTML/SW local asset scan: pass।
- local mobile Playwright:
  - usable UI `364 ms`
  - পাঁচটি primary tab
  - 62 resources
  - anonymous-device header present
  - 2057-character AI response fully visible
  - retired hashes redirected
  - page/console/request errors `0/0/0`

## 🔎 GitHub Actions ও deploy evidence

Final product deployment workflows:

- Worker deploy: run `34261569649` — **success**
- Final Account Retirement Guard: run `34262377093` — **success**
- Final Cloudflare Pages deploy: run `34262377154` — **success**
- Final GitHub Pages build/deploy: run `34262375700` — **success**

Relevant product commits:

1. `07cdc102` — full account/profile/onboarding implementation retirement
2. `41ea146f` — deleted static URLsকে SPA shell না দিয়ে explicit retirement response
3. `c45a4e3` — residual auth media, preview ও OTP helper removal

## 🔎 Live production verification

### Core assets ও navigation

- Cloudflare production: `https://admissionhub.pages.dev`
- GitHub mirror: `https://sheikhrashel47-stack.github.io/admission-hub-demo/`
- দুই target-এর live `index.html`, `sw.js`, `ai-agent-chat.js` local final files-এর সঙ্গে byte-for-byte exact।
- live mobile Chromium `390×844 @2x`:
  - usable `621 ms` (৫ সেকেন্ড সীমার মধ্যে)
  - tabs: Dashboard, Question Bank, Exam, AI, History
  - 64 resources; retired asset loaded `0`
  - active SW: `sw.js?v=v221-account-retired-20260908`
  - একমাত্র cache: `admission-hub-shell-v221-account-retired-20260908`
  - একটিমাত্র visible AI composer frame
  - stable guest header + guest local identity
  - live AI response received
  - page/console/request errors `0/0/0`

### Worker/API

- `/api/health`: HTTP 200, `accountSystem:"retired"`, `identity:"anonymous-device"`।
- `/health`: HTTP 200; agent/Gemini operational।
- `/api/content/meta`: HTTP 200; 5 subjects, 14 topics, 3000 questions, 81 vocabulary।
- `/api/ai/status` without login: HTTP 200।
- live `/api/ai/chat`: HTTP 200 SSE, Gemini response + `done` event, কোনো error event নেই।
- retired auth/profile/onboarding/state/session routes: live 404।
- Cloudflare retired source/media/preview URLs: `410 Retired`।
- GitHub Pages mirror retired URLs: `404`।

## 🛡️ Data preservation evidence

- কোনো KV delete/migration command চালানো হয়নি।
- runtime guard seeded dormant account/profile/onboarding/state records দিয়ে content publish চালিয়ে প্রমাণ করেছে records অপরিবর্তিত এবং delete count শূন্য।
- IndexedDB questions, exams/results, mistakes, progress, settings ও study data schemas/records untouched।
- future replacement/migration-এর জন্য dormant cloud records ইচ্ছাকৃতভাবে রাখা হয়েছে।

## 📌 Current STOP point

**v221 legacy account retirement task সম্পূর্ণ closed।** Source, bundle, cache shell, static URLs ও deployed Worker থেকে পুরোনো Login/Auth, Profile navigation/tools এবং Personalization Onboarding implementation সরানো হয়েছে। Core app ও guest AI live ও usable।

## ⏭️ পরবর্তী কাজ

- নতুন account/login/profile/onboarding system এখন বানানো যাবে, কিন্তু কেবল মালিকের পরবর্তী স্পষ্ট নির্দেশ অনুযায়ী এক ধাপ করে।
- পুরোনো implementation restore বা patch করা যাবে না।
- dormant records নতুন system-এ blind reuse নয়; schema review ও explicit migration plan ছাড়া touch করা যাবে না।
