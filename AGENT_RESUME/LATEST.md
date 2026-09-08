# LATEST — v220 / chatv13 — iPhone fast-start + full AI responses

**আপডেট:** 2026-09-08 (Asia/Dhaka) · Agent: **জুজু**

## ✅ বর্তমান product state

- Product commit: `d5db968` (`fix(ios): guarantee fast startup and expand AI responses`)
- Build: `v220-aiagent-20260908`
- AI UI: `ai-agent-chat.js?v=agent-f1-ui-chatv13`
- Dashboard: `dashboard-v2.js?v=dash2f7`
- Primary repository: `admission-hub-demo/main`
- Live target: `https://admissionhub.pages.dev`
- Mirror: `https://sheikhrashel47-stack.github.io/admission-hub-demo/`

## ✅ সর্বশেষ পরিবর্তন

1. Boot/deferred-dashboard race ঠিক: boot আর module-ready আগেভাগে set করে না; dashboard-ready + boot-ready handshake first real render চালায়।
2. ৩.৮ সেকেন্ড hard usable-shell deadline; “একটু বেশি সময় লাগছে”/retry recovery screen production থেকে বাদ।
3. IndexedDB open bounded, readonly startup reads parallel, protection/settings work idle; failure non-destructive memory fallback।
4. Automatic removed-feature data purge বাদ—saved questions/progress/settings/vocabulary/dormant records startup-এ clear বা rewrite হয় না।
5. Guest-first app auth-config network-এর জন্য hidden থাকে না; installed PWA shell-first এবং offline launch দ্রুত।
6. SW lean essential precache; activation client reload/navigation ও pre-update unregister বাদ।
7. AI composer contenteditable inner focus frame বাদ; outer capsule একমাত্র frame।
8. AI plain/rich/code response সবসময় full; `সম্পূর্ণ দেখুন`/accordion/details response fold সম্পূর্ণ বাদ।

## 🔎 Verification

- Focused fast-start/data/AI regression: `22/22` pass
- AI suite: `80/80` pass
- Auth endpoint guard: pass (109 files)
- Modified JS + 11 inline scripts syntax: pass
- Local mobile Chromium/Playwright 390×844 touch:
  - cold dashboard `356 ms`
  - intentionally delayed dashboard module: usable shell `3965 ms`
  - 3000-question DB reload `307 ms`, 3000 retained
  - offline controlled-PWA reload `284 ms`, IndexedDB marker retained
- Live Cloudflare production, WebKit 26 + iPhone 13 profile:
  - cold dashboard `625 ms`
  - dashboard module 4.5 সেকেন্ড delay: usable normal shell `4168 ms`, warning নেই, final dashboard এসেছে
  - 3000-question DB reload `609 ms`, all 3000 + settings marker retained
  - v220 SW active/controlling; AI response `<details>` `0`; plain/rich/code tail সব visible
  - editor inner outline/border/shadow none; outer frame present; runtime page errors `0`
- Live controlled-PWA mobile Chromium offline reload `342 ms`; IndexedDB marker retained; runtime errors `0`।
- Cloudflare ও GitHub Pages live `sw.js`, `chatv13`, `dash2f7` local files-এর exact SHA-256 match; required HTTP endpoints 200।
- GitHub Actions (`143c9b8`): auth guard, Cloudflare deploy, GitHub Pages deploy—সব success।
- Legacy historical test debt: relative run 7 pass / 14 stale-fail (old v214/dash2f6/full-APP_SHELL expectations or missing `/home/user/hub` fixtures)।

## ✅ Current STOP point

- **v220/chatv13 task সম্পূর্ণ closed।** Product commit `d5db968`; initial handoff `143c9b8`; verified deploy-status commit `94254d5`।
- `94254d5`-এর auth guard, Cloudflare deploy ও GitHub Pages deploy—তিন workflow-ই success।
- Configured private Telegram chat-এ completion report সফলভাবে পাঠানো হয়েছে (HTTP 200; message id `7`)।
- কোনো remaining close-out action নেই; পরের কাজ user-এর নতুন নির্দেশ থেকে শুরু হবে।

## ⏭️ Known product backlog (unchanged)

1. Legacy test markers/fixture paths modernize করা।
2. Explain/Summarize helper typed text পাঠায় না।
3. Client `examMode:null`; real mock state safety gate-এ যুক্ত নয়।
4. Document/video/audio attachment placeholder; image vision বাস্তব।
5. Main Worker health-এ `GK_KV` missing; Daily-GK cron যাচাই দরকার।
6. D1 long-memory, RAG, AI task/action engine এবং inbound Telegram development command এখনো তৈরি হয়নি।

## 🚨 বাধ্যতামূলক handoff নিয়ম

- পুরোনো `admission-hub/main` নয়; `admission-hub-demo/main` ব্যবহার করতে হবে।
- প্রতিটি meaningful কাজের শেষে dated resume + `LATEST.md` update + commit/push বাধ্যতামূলক।
- কোনো credential/token repository/resume-তে লেখা যাবে না।
- কাজ শেষে Telegram completion notification পাঠাতে হবে; ব্যর্থ হলে user-কে স্পষ্ট জানাতে হবে।

**বিস্তারিত handoff:** `AGENT_RESUME/2026-09-08-juju-ios-faststart-ai-full.md`
