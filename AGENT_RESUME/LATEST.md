# LATEST — 2026-09-03 · 🚪 GUEST-FIRST AUTH UX — v177 (commit f395a21, push-পরে verify)
- App open → **guest dashboard** (কোনো login wall নেই); 3D intro static-first অক্ষত।
- Action-triggered premium prompt sheet ("Keep Your Preparation Safe"): Google/Email/Not now;
  Not now → session-জুড়ে সেই action-এ আর prompt নয়।
- গেস্ট প্রোফাইল (বাটনসহ), history/mistakes/result/dashboard-এ ক্লাউড ব্যাজ।
- 🚨 পুরনো সেশন (ahPubToken) আগের মতোই restore — কেউ লগআউট হবে না (session-survive ১২/১২)।
- Guest data → login → id-based merge (existing applyPersonal/pushState; worker ustate:<uid> isolated)।
- Test: auth-ux ৩৩/৩৩ · session-survive ১২/১২ · intro ১৮/১৮ · splash ৮/৮ · guard PASS।
- **শুধু demo; hub অক্ষত। স্পেক অনুযায়ী এই কাজ শেষ — STOP (নতুন phase না)।**
