# Juju handoff — iPhone fast startup + AI full response

**তারিখ:** 2026-09-08 (Asia/Dhaka)  
**Agent:** জুজু  
**Product commit:** `d5db968` — `fix(ios): guarantee fast startup and expand AI responses`  
**Build/UI:** `v220-aiagent-20260908` / `chatv13` / `dashboard-v2 dash2f7`

## ✅ ব্যবহারকারীর চাওয়া

1. iPhone Safari/PWA startup loader-এ আটকে থাকবে না।
2. সর্বোচ্চ ৫ সেকেন্ডে usable UI আসবে; “একটু বেশি সময় লাগছে” recovery screen থাকবে না।
3. Saved questions/progress/settings/data clear বা overwrite করা যাবে না।
4. AI composer-এ একটি clean frame থাকবে; contenteditable-এর inner focus box থাকবে না।
5. AI-এর বড় plain/rich/code response সরাসরি পুরো দেখা যাবে; “সম্পূর্ণ দেখুন”/accordion থাকবে না।

## 🔎 প্রমাণিত root causes

- Core `boot()` deferred dashboard আসার আগেই `__admissionFinalModulesReady=true` করত। তখন legacy dashboard renderer no-op হলে loader DOM-এ থেকেই যেত; পরে `window.load` coordinator flag দেখে return করত।
- `dashboard-v2.js` defer queue-এর প্রায় শেষে ছিল; first-interaction UI অপ্রয়োজনীয় বড় modules-এর execution-এর পেছনে অপেক্ষা করত। Early করার পর `phase12-ui.js` আবার legacy “Dashboard loading…” renderer দিয়ে সেটি overwrite করছিল।
- `data-protection.prepareOpen()` first paint-এর আগে IndexedDB-এর প্রতিটি store count করত; migration verify-ও open resolve-এর আগে দ্বিতীয় scan করত।
- Startup-এর ১৫টি readonly store `Promise.all`-এ থাকলেও global write queue-এর কারণে sequential চলত।
- Removed-route cleanup parse ও `load`—দুইবার data purge/full scans চালাত; vocabulary/settings/progress-related dormant records বদলাতে পারত।
- Service worker প্রায় পুরো app একসঙ্গে precache করত, activation-এ open client navigate করত এবং document network-first হওয়ায় flaky network PWA launch আটকে দিতে পারত।
- Generic `.ai-agent-root :focus-visible` selector contenteditable editor-এ দ্বিতীয় rectangular iOS focus ring দিত।
- Rich/plain/code AI renderer তিন জায়গায় `<details>` fold তৈরি করত।

## 🛠️ Implemented

### Startup/data safety

- Final render-কে `admission:boot-ready` + `dashboard-v2 ready` handshake-এ আনা হয়েছে; `window.load` আর first usable render-এর barrier নয়।
- Dashboard ও AI first-interaction scripts defer queue-এর সামনে; `phase12-ui` dashboard-v2 install হয়ে গেলে legacy renderer দিয়ে overwrite করে না।
- ৩.৮ সেকেন্ড hard usable-shell deadline; warning/retry recovery UI ও তার production text সম্পূর্ণ সরানো হয়েছে। Data boot শেষ হলে temporary shell full dashboard দিয়ে replace হয়।
- IndexedDB open ৩ সেকেন্ডে bounded; failure-এ non-destructive session memory fallback, existing DB clear/overwrite নয়। Pending first-paint writes boot storage ready হওয়া পর্যন্ত অপেক্ষা করে।
- Startup readonly transactions parallel; normalized-settings write এবং data-protection snapshot/migration audit idle work।
- Automatic removed-feature data purge সম্পূর্ণ বাদ; hidden routes শুধু UI-level redirect করে, dormant student records থাকে।
- Guest-first first paint auth config/network-এর জন্য `#app` hide করে না। Google font stylesheet non-blocking।

### PWA

- `v220-aiagent-20260908`; ১৩টি essential asset-এর lean app shell।
- Installed PWA document shell-first; offline/flaky network first paint আটকায় না।
- SW activation আর open client navigate/reload করে না। Existing registration in-place update হয়; আগে unregister করা হয় না।

### AI UI

- `chatv13`: `.ai-editor`-এ iOS/browser appearance, border, outline ও shadow suppression; outer capsule-এর `:focus-within`-ই একমাত্র frame।
- Rich block, long plain text এবং ১৮+ line code—সব direct full render। `ai-rb-fold`, `ai-code-fold`, `respFold`, “সম্পূর্ণ দেখুন”/“Expand full response” implementation সরানো হয়েছে। User-authored long prompt preview fold অপরিবর্তিত।

## ✅ Verification (local)

- `startup-ai-regression.test.mjs`: **22/22 pass**
- `p21-ai-agent-ui.test.mjs`: **80/80 pass**
- `AUTH_ENDPOINTS_GUARD.test.mjs`: **pass**, 109 files scanned
- Modified JS + 11 inline scripts syntax: **pass**
- Mobile Playwright (390×844, touch):
  - cold dashboard usable: **356 ms**
  - deliberately delayed dashboard module: usable normal shell **3965 ms**; recovery text absent
  - 3000-question IndexedDB reload: dashboard **307 ms**, all **3000** records retained
  - controlled-PWA offline reload: **284 ms**, injected IndexedDB preservation marker retained
  - AI assistant details count: **0**; long plain/rich tail markers visible
  - focused composer computed style: `outline:none`, `border:0px`, `box-shadow:none`
  - runtime page errors: **0**
- No credential/token pattern found in changed workspace files.

## ✅ Verification (live production)

- Product + initial handoff were pushed through `143c9b8ec9519800a3d27e0c9c1d55bc8b0f5fc1`।
- GitHub Actions for that exact SHA all completed successfully:
  - `Auth Endpoints Guard` — run `34251727635`
  - `Deploy Cloudflare Pages (Auto)` — run `34251727613`
  - `pages build and deployment` — run `34251726630`
- `https://admissionhub.pages.dev` এবং GitHub Pages mirror—দুই জায়গায় homepage, SW, `chatv13` ও `dash2f7` HTTP 200। Live `sw.js`, `ai-agent-chat.js` ও `dashboard-v2.js` local product files-এর সঙ্গে SHA-256 byte-for-byte মিলে গেছে।
- **Playwright WebKit 26 + iPhone 13 profile, সরাসরি Cloudflare production:**
  - cold usable dashboard **625 ms**; correct `dash2f7`, `chatv13`, `v220` SW requested
  - dashboard module 4.5 সেকেন্ড delay করেও normal usable shell **4168 ms**; recovery warning নেই; পরে full dashboard এসেছে
  - 3000-question IndexedDB reload **609 ms**; সব **3000** record ও settings marker retained
  - SW active + controlling; cache `admission-hub-shell-v220-aiagent-20260908`
  - long plain/rich/code—৩টি AI response, AI `<details>` **0**, তিনটি tail marker visible
  - focused editor `outline:none`, `border:0px`, `box-shadow:none`; outer composer border present
  - runtime page errors **0**
- **Live controlled-PWA offline, mobile Chromium:** usable shell **342 ms**; current v220 cache controlling; injected IndexedDB marker retained; runtime errors **0**।
- Live `/api/content/meta`: 5 subjects, 14 topics, **3000 questions**, 81 vocabulary। Homepage, manifest, content API এবং তিন Worker health endpoint HTTP 200।

## ℹ️ Legacy tests

Relative historical suite run: 7 suites pass / 14 fail. Failures are stale `v214`/`dash2f6`/old full-APP_SHELL assertions or missing `/home/user/hub` fixture paths; targeted v220, AI and auth guard suites are green. This stale-test debt existed before this fix and remains listed in `LATEST.md`.

## 🚀 Push/deploy status

- Product code: `d5db968`। Initial handoff: `143c9b8`। দুটিই `admission-hub-demo/main`-এ pushed।
- Auth guard, Cloudflare Pages এবং GitHub Pages—তিন workflow-ই success; Cloudflare ও GitHub Pages live verification সম্পূর্ণ।
- কোনো credential repository, resume, test artifact বা log-এ লেখা হয়নি।
- **এই status update commit/push-এর পর শুধু বাধ্যতামূলক Telegram completion report dispatch বাকি।**

## Exact STOP point

Product implementation, local regression, iPhone-profile WebKit verification, controlled-PWA offline verification এবং live deployment verification সম্পূর্ণ। Code আর বদলানোর প্রয়োজন নেই। এই handoff status commit/push করে configured Telegram chat-এ completion report পাঠাতে হবে; student IndexedDB/localStorage clear করা যাবে না।
