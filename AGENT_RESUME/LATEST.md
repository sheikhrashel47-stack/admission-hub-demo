# LATEST — 2026-09-03 · 🏰 AUTH PERMANENT LOCK — v172 live
**কাজ:** লগইন/সাইনআপ আর কখনো না ভাঙার আজীবন-লক (ভাইয়ের অনুরোধ) + ডাটা-কোথায়-যায় প্রশ্নের উত্তর।
**লক:** (১) runtime self-heal (canonical retry in api()), (২) AUTH_ENDPOINTS_GUARD.test.mjs static guard (host allowlist + pub-prefix নিষিদ্ধ + version-sync), (৩) GitHub Actions guard CI + sw v172।
**টেস্ট:** guard demo ৮৬ / hub ৮৯ ফাইল ✅ | node --check ✅ | push → Pages live verify।
**ডাটা:** Cloudflare KV (admission-gk-kv) — pending→user→profile/state/activity; OTP hash-only; passkey public-key; মেইল Brevo। বিশদ: AGENT_RESUME/2026-09-03-authguard-lock.md
