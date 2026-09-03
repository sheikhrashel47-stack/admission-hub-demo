# LATEST — 2026-09-03 · ①প্রিমিয়াম বাংলা ইমেইল (worker live 9fb39a82) ②University+Unit Fix — v173
**ইমেইল:** ১০০% বাংলা premium টেমপ্লেট (কোড-box, preheader, security notice, footer) — worker-এ deploy, live verify, register-email Brevo sent:true।
**Uni/Unit:** root cause = sDash-এ `|| 'A'`/`UNIVERSITIES[0]` fallback + dashUnitName কখনো update না + static focus। Fix = কেন্দ্রীয় curriculum-config.js + refreshDash + per-uni unit grid। E2E (DU+B→restore→A→isolation) ✓, sim ১০/১০, guard PASS, v173 live।
**বিস্তারিত:** AGENT_RESUME/2026-09-03-email-bn-universities.md
