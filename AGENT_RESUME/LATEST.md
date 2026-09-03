# LATEST — 2026-09-03 · ✅ AUTH API FIX — v171 live (email OTP / Passkey / Google signup ফের চালু)

**Root cause (নিখুঁত প্রমাণসহ):** (১) সমস্ত ফ্রন্টএন্ড ভুল host `admission-gk.rashelzayan213.workers.dev` (DNS NXDOMAIN) ব্যবহার করত — সঠিক `admission-gk.admissionhub.workers.dev`; (২) ভুল prefix `/pub/*` (Worker-এ নেই → 401 "আগে লগইন") — সঠিক `/api/*`। Worker সুস্থ, `/api/*` route-এ Brevo OTP `sent:true` + passkey challenge + Google route সব live verified।

**ফিক্স v171:** host fix ১২ ফাইল + `/pub`→`/api` prefix (premium-auth/user-account/onboarding/cloud-content-sync/public-users-admin) + sw BUILD_ID `v171-authapi-fix-20260903` + APP_SHELL `p3-auth-prof-v171`। committed+pushed (demo+hub), Pages redeploy → live verify এই টার্নেই।
