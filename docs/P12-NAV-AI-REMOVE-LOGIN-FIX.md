# P12 — বটম-নেভ AI-ট্যাব রিমুভ + লগইন-গ্রেস-ফিক্স (v196)

তারিখ: ২০২৬-০৯-০৭ · commit: (নিচে) · sw BUILD_ID: `v196-gfix-20260907`

## মালিক-সমস্যা (২০২৬-০৯-০৭, ফোন-স্ক্রিনশটসহ)
1. **"নেভিগেশনে AI-টা বসাতে বলেছে — এটা নিয়ে ফেলো"** → বটম-নেভ-এ "Admission AI" ট্যাব দেখা যাচ্ছে; মালিক তা বাদ চান।
2. **"Google/verification ঠিক আছে সব কিন্তু অ্যাপ লগইন হচ্ছে না"** → OTP/Google-এ যাচাই সফল, তবু অ্যাপ গেস্ট-অবস্থায়; প্রোফাইল লগইন-অবস্থা দেখায় না।

## সমস্যা-১: সমাধান (নেভ-রিভার্স — মালিক-নির্দেশ)
- `NAV_TABS` → **৫-ট্যাব** (Home/Bank/Exam/History/Profile); `{key:'ai-chat'…}` এন্ট্রি বাদ।
- `baseTab`: `ai-chat` → `''` (কোনো ট্যাব হাইলাইট হয় না)।
- **ফিচার ১০০% অক্ষত**: `renderAIChat`/`renderWebChatRebuild` রুট, Command Center → More → ai-chat, dashboard-v2 Study Tools-এর "Admission AI" কার্ড — সবই যেমন ছিল (পেজ-অ্যাক্সেস আছে, শুধু নেভ-ট্যাব নেই)।

## সমস্যা-২: মূল-কারণ (প্রমাণ-সহ)
- সেশন-টোকেন Cloudflare **KV**-তে থাকে (`tok:` + `user:`, worker `issueToken`-পরে `PUB_KV.put`) — KV **eventually consistent** (সর্বোচ্চ ~৬০সে)।
- লগইন (OTP/Google/verify-link) সফল → টোকেন PoP-A-তে লেখা → ইউজার অ্যাপ বন্ধ/রিফ্রেশ করে → পরের boot-এর `/auth/me` অন্য PoP-B-তে পড়ে → `tok:` তখনো পৌঁছায়নি → **৪০১** → পুরনো কোড `setSession('',null)` দিয়ে সেশন মুছে গেস্টে ফেলত = "লগইন হচ্ছে না"।
- পুরনো `kvGetRetry` (৪×২০০ms ≈ ১.২সে) ও client ৪×৭০০ms — দুটোই KV-বিলম্বের তুলনায় নগণ্য।

## সমাধান-২ (premium-auth.js)
1. **লগইন-মার্কার**: `setSession(tok,…)`-এ `ahJustAuthed` (sessionStorage + `window.__ahJustAuthed`) লেখা হয় — টোকেন-লিখলেই, লগআউটে নয়।
2. **boot-গ্রেস (৩ মিনিট)**: মার্কার-থাকলে fresh → `/auth/me` রিট্রাই ৯× (৪০১-প্রবণ KV-উইন্ডো-সহন); fresh-অবস্থায় ৪০১-এ **সেশন রাখা হয়** (`setGate(false)`; `setSession('',null)` কখনো নয়) + **৩০সে-পর ব্যাকগ্রাউন্ড পুনঃযাচাই** (`window.__ahMeRetry`) — সফলে ইউজার-রিফ্রেশ, disabled/suspended-এ লক।
3. **নিরাপত্তা অপরিবর্তিত**: পুরনো/প্রকৃত-মৃত সেশন (মার্কার-না-থাকা) ৪০১ → এখনো লগআউট + গেস্ট; disabled/suspended → লগইন-স্ক্রিন; logout() আগের মতোই।
4. **স্টেল-ক্যাশ-মিসম্যাচ-ফিক্স**: index.html-এর PWA-ব্লকে `expectedSwVersion`/`cur` মৃত `v179-aiengine-20260903`-এ আটকে ছিল → এখন `v196-gfix-20260907` (আসল build-এর সাথে মিল; আগের কোড বর্তমান shell-ক্যাশ মুছে v179-ক্যাশ রেখে দিত)।
5. **ভার্সন-বাম্প (অপরিহার্য)**: premium-auth.js/css `?v=p3-auth-guest-v193`→`v196`, auth-svg `p3-auth-prof-v193`→`v196` (index + sw APP_SHELL), sw register `?v=v196-gfix-20260907`.

## টেস্ট-প্রমাণ
- **নতুন `p12-login-grace.test.mjs` — ১৭ অ্যাসার্ট** (মার্কার · ৩-মিনিট-গ্রেস · ৯-রিট্রাই · fresh-৪০১-সেশন-রাখা · ৩০সে-রিট্রাই · পুরনো-সেশন-লগআউট-অক্ষত · disabled-লক · ৫-ট্যাব-নেভ · ai-chat-রুট-অক্ষত · v196-অখণ্ডতা)।
- p11 ৩৫/৩৫ (nav-অ্যাসার্ট হালনাগাদ: ৫-ট্যাব + রুট-অক্ষত)।
- **পূর্ণ-স্যুট ১৭/১৭ সবুজ** (AUTH_ENDPOINTS_GUARD-সহ; BUILD_ID-প্যাটার্ন `vNNN-<tag>-fix-YYYYMMDD`)।
- index.html ১৪ inline-ব্লক node --check OK।

## লাইভ-ভেরিফাই (push-পর)
- পৃষ্ঠা ভেরিফাই: `sw.js?v=v196-gfix-20260907` (pages.dev + github.io)।
- লাইভ index: NAV_TABS-এ ai-chat-নেই; premium-auth `?v=p3-auth-guest-v196`।
