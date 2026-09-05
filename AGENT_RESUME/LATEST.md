# LATEST — 2026-09-05 · 🌐 P19-ডোমেইন: https://admissionhub.pages.dev লাইভ (ফ্রি)
- **নতুন ঠিকানা:** https://admissionhub.pages.dev (Cloudflare Pages direct-upload, ০-টাকা; deployment 29d0837e; ২২৭ ফাইল/১৭MB) — পূর্ণ-অ্যাপ+PWA ✓; API workers.dev অপরিবর্তিত; পুরনো github.io ঠিকানা backup ✓।
- আগের: P05+ফিক্স সম্পূর্ণ লাইভ (sw v185-aigw-fix)
- **P05 AI CORE/BRAIN** (commit `b4fdcb0`, sw v184-aigw): একক `/api/ai`-গেটওয়ে + মডেল-রাউটার (aiChain failover, aibad ২৪ঘ) + টোকেন-বাজেট + pv: p05-1 + মেট্রিক aim:* + cost-cache ৬০০s + retryable — **ডিপ্লয়ড** (Guard 33892410165 ✓ · Pages 33892409364 ✓ · Deploy Worker 33892450926 ✓)।
- **D-P05-1** (committed, sw v185-aigw-fix): AI-একই-উত্তর-পুনরাবৃত্তি — `lastTxt`-এ ডাবল-`.reverse()` ইন-প্লেস-মিউটেশন → aicache-কী সব-প্রশ্নে **প্রথম**-বার্তা → ৬০০s-এ হুবহু-একই উত্তর (মালিক-স্ক্রিনশট-রিপ্রোডিউসড: `cached:true`)। ফিক্স: `lastUserText` হেল্পার (শেষ-বার্তা) + রিগ্রেশন §৬ (phase5-core **37/37**)।
- সব-স্যুট সবুজ (ai-phase4 35 · phase5-core 37 · phase4-core 16 · phase23-core 13 · auth-ux 33 · nosplash 16 · session 12 · GUARD · AC-3 50)।
