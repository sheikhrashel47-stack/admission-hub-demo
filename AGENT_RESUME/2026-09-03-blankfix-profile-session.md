# Resume — 2026-09-03 · ①blank-proof splash (১০s watchdog) ②background state persist ③Profile nav fix

## ভাইয়ের রিপোর্ট (স্ক্রিনশটসহ)
1. demo-তে intro ঝামেলা করে **blank** আসে — splash যেনো সর্বোচ্চ ১০ সেকেন্ড, blank কখনো না।
2. শিক্ষার্থীরা অ্যাপ background-এ রাখলে/বের হলে **যেখানে ছিল সেখানেই** থাকুক (দীর্ঘক্ষণ)।
3. **nav bar-এর Profile আইকনে ক্লিক করলে profile interface আসে না।**

## ① Blank-proof (`splash-3d.js` + index.html)
- **Root cause:** dismiss() scene-কে root থেকে সরিয়ে দিত → render() দেরি/ভুল হলে `#ahSplash` **খালি** থাকত → blank।
- **Fix:**
  - dismiss(): scene সরানোর **আগেই** root-এ brand prefill (`PREFILL_HTML`) — root কখনো খালি নয়; resolve-এর আগে double-ensure।
  - **min-display 1500ms** — দ্রুত boot-এও পুরো টাইমলাইন দেখা যায় (jump নয়)।
  - `forceHide()` API + **১০-সেকেন্ড watchdog** (index.html): `__admissionBootStatus` ১০s-এ ready না হলে splash সরিয়ে **বাংলা recovery UI** ("একটু বেশি সময় লাগছে" + আবার চেষ্টা/ড্যাশবোর্ড) — blank কখনো না। boot() ready হলে watchdog clear।
  - `__admissionSplashDone` গার্ড — dismiss-এর পর autoMount আর scene re-mount করবে না (blank-loop বন্ধ)।
  - mount() fail-safe: sceneHTML ব্যর্থ হলে prefill থাকে।
- **টেস্ট:** jsdom `splash.test.mjs` — ৮/৮ (scene, dismiss→never-blank, overlay cleanup, forceHide prefill, mount fresh, session)।

## ② Background state persist (`session-persist.js` নতুন)
- route + scroll snapshot (sessionStorage+localStorage); `visibilitychange` hidden→save, visible→restore; `pagehide`/`beforeunload`/`pageshow(persisted)` handled; প্রতি ১২ সেকেন্ডে fresh save।
- **controllerchange-এ auto-reload সম্পূর্ণ বাদ** (আগে 90s-guard-এ reload হতো → সেশন/স্ক্রোল হারাত) — নতুন worker পরের launch-এ apply, বর্তমান সেশন অক্ষত।
- SW update-check শুধু visible-এ ping (ইতিমধ্যে ছিল)।

## ③ Profile nav fix (`index.html`)
- **Root cause:** `removedRoute()`-এ `p === 'profile' || p.startsWith('profile/')` ছিল → profile route-এ গেলেই `redirectRemoved()` dashboard-এ ফেরত — আইকনে ক্লিক "কিছু আসে না"।
- **Fix:** removedRoute-এর তালিকা থেকে profile বাদ। premium-auth.js-এর `wrapRender`→`renderProfileRoute()` (আগে থেকেই আছে) এখন কাজ করে — প্রোফাইল UI + নিরাপত্তা সেন্টার + edit সব সচল। logged-out-এ আগের মতোই auth gate।
- baseTab ইতিমধ্যে profile সাপোর্ট করে (nav highlight ঠিক)।

## সংস্করণ
- sw `v175-blankfix-20260903` (index+sw sync, guard PASS), splash-3d `?v=splash3d-v2`, session-persist `?v=session-v1` (index+APP_SHELL), guard regex-এ `blankfix` tag।
- **শুধু demo-তে** — main app (admission-hub) অক্ষত (আগের revert-পর নীতি)।

## টেস্ট
- node --check splash-3d/session-persist OK; splash.test ৮/৮; AUTH guard PASS; live verify এই টার্নে।
