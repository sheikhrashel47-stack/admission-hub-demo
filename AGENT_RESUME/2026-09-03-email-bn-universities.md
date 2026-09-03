# Resume — 2026-09-03 · ①প্রিমিয়াম বাংলা ইমেইল টেমপ্লেট ②University+Unit Personalization

## ① ইমেইল (public-worker.js officialLetter) — সম্পূর্ণ রিডিজাইন
- **old:** English+Bangla মিশ্র, "Dear Student / প্রিয় শিক্ষার্থী", bureaucratic (`এই পত্রের মাধ্যমে…`) — ইউজারের স্ক্রিনশট-এর মতো।
- **new:** ১০০% প্রাঞ্জল বাংলা; subject `Admission Hub অ্যাকাউন্ট যাচাই করুন` (reset: `…পাসওয়ার্ড পুনরুদ্ধার করুন`); preheader `আপনার ইমেইল যাচাই করার কোড প্রস্তুত রয়েছে।`; brand header ADMISSION HUB + `শিক্ষার্থী অ্যাকাউন্ট সেবা`; main title `আপনার ইমেইল ঠিকানা যাচাই করুন`; intro; **কোড বক্স = ৬টি আলাদা cell, ৩০px, emerald, letter-spacing** (Gmail-safe table); `এই কোডটি ২ মিনিট পর্যন্ত কার্যকর থাকবে।`; security notice (বাম-বর্ডার emerald card); footer `শুভেচ্ছান্তে, Admission Hub` + স্বয়ংক্রিয়-মেইল নোট। ৬০০px, table-based, responsive, Bengali font stack (Noto Sans Bengali/Hind Siliguri), **কোনো emoji/ইমেজ/ইংরেজি প্যারা নেই**। code/link দুই variant, auth-logic অপরিবর্তিত (সবসময় dynamic `code`, কোথাও hardcode নয়)।
- **Deploy:** esbuild bundle → `wrangler deploy --keep-vars` (API PUT সরাসরি secret-value দাবি করে — সোজাসুজি ভার্সন d715957f → পরে wrapper গেট-ফিক্সসহ **9fb39a82**)। secrets ১৭টি অক্ষত (binding list verified)। Live subject escaped-string-এ যাচাই ✓; register-email → `sent:true` (Brevo) ✓; ইউজারের পেস্ট করা Brevo key invalid (`Key not found`) — Worker-এর stored key-ই ব্যবহৃত।
- **wrapper ফিক্স (গুরুত্বপূর্ণ):** আগের deploy-এ `/api/*` app-gate-এর ভেতরে 403 হচ্ছিল → gk-agent-worker.js-এ `/api/*`-এ auth/onboarding/profile/state/content-type routes গেটের বাইরে (gatedApi = /api/ask,/api/bank,/api/gk/*,/api/cloud/publish মাত্র)। এখন `/api/auth/*` + `/pub/*` সব 200, gk gate intact। OLD_KV: env.OLD_KV||env.GK_KV।

## ② University+Unit Personalization — root cause + fix
**Root cause (প্রমাণসহ):**
1. `onboarding.js sDash()`: `selectedUni() || UNIVERSITIES[0]` (**ঢাবি fallback**) + `(data.targetUnits||[])[0] || 'A'` (**A fallback**) → নির্বাচন miss হলেই ভুল দেখাত।
2. সেটা ছাড়াও সব screen mount-এ **একবার** রেন্ডার হতো; ইউজার uni/unit select করার পর `dashUnitName` **কখনো update হতো না** (শুধু dashUniName update হতো `updateUniConfirm()`-এ) → A/B mismatch-এর আসল কারণ।
3. "আজকের ফোকাস" = global static `['বাংলা','English','GK']` + static `SUBJ_COUNT` — uni/unit-নিরপেক্ষ।
4. Unit grid `['A','B','C','D']` সব বিশ্ববিদ্যালয়ে hardcode (CoU-তে A/B/C, বাকৃবি একক)।
**Fix (কেন্দ্রীয় `curriculum-config.js`):** `window.ADM_CURRICULUM` — ৮ বিশ্ববিদ্যালয় (du/cu/ru/ju/ku/cou/bau/other) × unit → subjects[{name, bank, count, weight}] ওজন-সহ (১০০ MCQ-বণ্টন); helpers: `unitList / subjectsFor / focusFor(weight-sorted top3) / userTarget`। onboarding.js: unit grid = `unitOptions(uniCode)`; weak-chips = curriculum; sDash = curriculum focus + **fallback-শূন্য** + `refreshDash()` (uni/unit/weak click + showScreen(9)-এ dashUniName/dashUnitName/focus/ring live update)।
**E2E প্রমাণ (KV token-সহ টেস্ট-ইউজার):** DU+B save → user.targetUniversity='ঢাকা বিশ্ববিদ্যালয়', targetUnit='B', onboarding.targetUnits=['B'] ✓; GET restore (refresh/re-login) ✓; switch→A ✓; আলাদা ইউজার CU+B ভিন্ন ✓ (isolation) — পরে test keys clean।
**টেস্ট:** curriculum sim ১০/১০; static (কোনো `UNIVERSITIES[0]`/`|| 'A'` নেই); guard demo+hub PASS; sw v173 (`v173-uniunit-fix-20260903`), onboarding/curriculum `p6-onboard-v12` (index+sw sync), guard-regex `(authapi|uniunit|email)-(fix|guard|design)`।

## স্থিতি
worker deployed+live; demo+hub commit/push → Pages v173 live verify এই টার্নেই।
