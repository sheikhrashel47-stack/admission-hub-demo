# 2026-09-08 — জুজু হ্যান্ডঅফ, পূর্ণ অডিট ও Telegram notification যাচাই

## ✅ যা করা হলো

- Agent-এর নাম **জুজু** এবং user communication সহজ/সংক্ষিপ্ত বাংলা হিসেবে স্থির করা হয়েছে।
- `admission-hub-demo` ও `admission-hub` repository clone ও বর্তমান অবস্থা audit করা হয়েছে।
- Cloudflare Pages, GitHub Pages, PWA assets, Workers, GitHub Actions, Drive workspace, recent commit history এবং AI implementation পরীক্ষা করা হয়েছে।
- বর্তমান live source-of-truth হিসেবে `admission-hub-demo/main` নিশ্চিত হয়েছে।
- Product build `v219-aiagent-20260908`, AI UI `chatv12`, server agent `agent-f1` নিশ্চিত হয়েছে।
- Cloudflare Pages ও GitHub Pages-এর মূল live assets local `3fca653` product commit-এর সঙ্গে byte-for-byte মিলেছে।
- Telegram-এ test notification সফলভাবে পাঠানো হয়েছে। Credential কোনো repository বা resume-তে লেখা হয়নি।
- এখন থেকে প্রতিটি meaningful কাজের শেষে dated resume + `LATEST.md` update + commit/push বাধ্যতামূলক করা হয়েছে।

## 📂 বদলানো ফাইল

- `AGENT_RESUME/2026-09-08-juju-audit-telegram-notify.md` — বর্তমান audit ও handoff।
- `AGENT_RESUME/LATEST.md` — live AI state, STOP point এবং পরবর্তী কাজ।
- `AGENT_RESUME/README.md` — জুজুর বাধ্যতামূলক resume discipline।

## 📌 বর্তমান অবস্থা

- Product commit: `3fca653d5c8ea61c9113a5ff8697a78001f0084c`
- Product version: `v219 / chatv12`
- সর্বশেষ AI কাজ: **MASTER SPEC Phase A — Quiz v3 core** সম্পন্ন, commit/push/deploy হয়েছে।
- Central AI, streaming, Gemini routing, KV memory, image vision, premium multi-chat, rich response renderer এবং Interactive Quiz v3 আছে।
- Drive workspace-এ tracked source modification ছিল না; শুধু ১৬টি প্রয়োগ-করা temporary patch script এবং `qz-unit.mjs` untracked ছিল। তাই কোনো hidden half-written source patch নেই।

## 🔎 যাচাই

- JavaScript syntax: `105/105` pass।
- `ai-agent-f1.test.mjs`: `30/30` pass।
- `p21-ai-agent-ui.test.mjs`: `80/80` pass।
- Quiz v3 unit: `17/17` pass।
- Full root suite: `10/26` suite pass; `16/26` fail। বেশিরভাগ failure পুরোনো hard-coded build marker (`v214`, `v200` ইত্যাদি), production runtime failure প্রমাণ নয়।
- তিনটি legacy Python QA script deleted/renamed file reference করায় stale।
- GitHub CI বর্তমানে full regression suite চালায় না; auth guard + deploy চালায়।

## ⏭️ পরবর্তী কাজ

User-এর পরবর্তী feature/fix নির্দেশ প্রথম priority। কাজের আগে current `main` inspect/pull করতে হবে। কাজের সঙ্গে সম্পর্কিত হলে নিচের audit gap-গুলোও ঠিক করতে হবে:

1. stale test/version marker update করে full suite green করা;
2. Explain/Summarize tool-এ typed text হারানোর bug ঠিক করা;
3. actual mock state-কে AI `examMode` safety gate-এর সঙ্গে যুক্ত করা;
4. non-image attachment-এর placeholder অবস্থা স্পষ্ট রাখা বা সত্যিকারের processing তৈরি করা;
5. live `GK_KV` missing থাকায় Daily-GK cron পরীক্ষা/মেরামত করা;
6. project resume documents সর্বশেষ build-এর সঙ্গে sync রাখা।

## 🚨 STOP / সতর্কতা

- Live পরিবর্তনের primary repository: **`admission-hub-demo/main`**। `admission-hub/main` পুরোনো secondary/base repository।
- AI Master Spec-এর Phase A-র পরের অংশ এখনো শুরু হয়নি।
- User-এর data/IndexedDB/PWA cache অক্ষত রেখে incremental change করতে হবে।
- Client/PWA change হলে `sw.js` BUILD_ID এবং `index.html`-এর সব matching marker একসঙ্গে bump করতে হবে।
- কোনো token, bot token, API key, Cloudflare/GitHub credential code, commit, log বা resume-তে লেখা যাবে না। Chat-এ প্রকাশিত credential rotate করা জরুরি।
- প্রতিটি কাজের শেষে Telegram completion notification পাঠাতে হবে; notification ব্যর্থ হলে final response-এ স্পষ্ট বলতে হবে।
