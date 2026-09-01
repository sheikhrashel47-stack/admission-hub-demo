# LATEST — Admission Hub Demo (2026-09-01)

## চলমান কাজ: v1 ডিজাইন ফেরত (ইউজার নির্দেশ, commit ট্যাগ v1-restore)
- exact-clone UI (v4) **বাতিল** — ভাই চেয়েছেন **একদম প্রথম ডিজাইন (v1, d977a11)**; onboarding.css/js restore + `?v=p6-onboard-v1r`
- jsdom টেস্ট পাস (S1→S10 + dashboard); preview-onboarding.html-এ দেখা যাবে
- icons/uni আসল লোগো রয়ে গেছে (v1 ব্যবহার করে না)
## পরের ধাপ
1. GH Pages deploy → live চেক (onboarding.css marker v4, icons/uni ২০০, TOTAL=10)
2. control repo-তে resume sync
3. ইউজার ফিডব্যাকে প্রয়োজনে pixel-level টিউন (spacing/color/typography)

## Credentials
সিক্রেট resume-তে রাখা হয় না — আগের resume ফাইল ও environment-এ (detail: `2026-09-01-emailfix-glassdesign-3dloader.md`)।