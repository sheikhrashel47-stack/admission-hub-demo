# Resume — 2026-09-03 · 🚪 GUEST-FIRST AUTH UX (v177)

## ভাইয়ের স্পেক (মূল ১৭ পয়েন্ট): login wall না — guest-first; action-trigger premium prompt;
   guest data → account merge (নো duplicate/নো data loss); user isolation; persistent session;
   শেষে STOP (অন্য কোনো phase শুরু না)।

## কী বদলাল (শুধু admission-hub-demo)
- **premium-auth.js**: boot()-এ no-token → **enterGuest()** (আগে setGate(true) + welcome — ম্যান্ডেটরি wall)।
  401/403 catch → সেশন clear + enterGuest (গেটে আটকায় না)। logout() → enterGuest।
  enterApp শেষে pendingRoute() honor। **🚨 সেশন: ahPubToken/ahPubUser key অপরিবর্তিত —
  পুরনো লগইন-করা user নতুন ভার্সনে exact same restore path, কখনো auto-logout নয়।**
- **Premium login prompt (bottom sheet)**: openAuthPrompt(action) → ".ah-prompt-wrap" —
  "Keep Your Preparation Safe" + বাংলা সাব + [Continue with Google] [Continue with Email] [Not now];
  Not now → sessionStorage `ahGuestPromptSkip:<action>` — একই action-এ session-জুড়ে আর prompt নয়।
- **গেস্ট ব্যাজ** (render-wrap: renderHistory/renderMistakes/renderExamResult/renderDashboard):
  history/mistakes/result/dashboard-এ গেস্ট-নোট কার্ড → ক্লিকে prompt।
- **গেস্ট প্রোফাইল**: renderProfileRoute → guest-এ renderGuestProfile (৪-স্ট্যাট + CTA কার্ড:
  Google/Email/Not now); profile icon-এ guest "👤"।
- **index.html**: #ahAuthGate static hidden (প্রথম পেইন্টে কখনো wall না); v177 bump
  (premium-auth.js?v=p3-auth-guest-v177, css same, auth-svg p3-auth-prof-v177);
  sw v177-guest-20260903। welcome-এ "আপাতত গেস্ট হিসেবে চালিয়ে যাও" লিংক।
- **premium-auth.css**: sheet/guest-profile/guest-note/badge + ah-guestlink + reduce-motion।
- **sw.js**: BUILD_ID v177-guest-20260903 + shell list sync।
- lang default → 'bn' (localStorage ahLang='en' honored)।
- **AUTH_ENDPOINTS_GUARD.test.mjs**: ট্যাগ-তালিকায় `guest` + shell regex prof|guest।

## Test (সব পাস)
- auth-ux.test.mjs **33/33** (static + real jsdom runtime: boot guest, sheet, Not-now skip, contextual,
  guest profile, no wall)
- session-survive.test.mjs **১২/১২** (🚨 পুরনো ahPubToken+user রেখে boot → data-ah='in',
  isAuthed true, user intact, কোনো logout না)
- intro ১৮/১৮ · splash ৮/৮ · AUTH_ENDPOINTS_GUARD PASS

## Cloud merge (ইতিমধ্যে existing, কিছুই লাগেনি)
collectPersonal → dbGetAll(PERSONAL=[examResults,mistakes,settings,dailyStats,activityLogs,notes]) →
/state POST (worker: `ustate:<uid>` KV — user-isolated)। login-পর enterApp: pullState (id-upsert
applyPersonal) → pushState — guest local data cloud-এ যায়, id-ভিত্তিক so no duplicate।
worker /api/state GET/POST auth-required (Bearer) — isolation server-side।

## স্থিতি ও পরবর্তী
commit+push → Pages live verify v177 → STOP।
