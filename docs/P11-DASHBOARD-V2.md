# P11 — DASHBOARD v2 (ছবি-অনুযায়ী ১৪ মডিউল) — v195-gfix-20260906

**তারিখ:** ২০২৬-০৯-০৬ · মালিক-চাহিদা: ড্যাশবোর্ড হুবহু ছবির মতো; আগে-পরিকল্পনা → সিদ্ধান্ত-নেওয়া → বিল্ড।

## মালিক-সিদ্ধান্ত (ask_user)
১. Admission Goal = ডিফল্ট-স্যাম্পল (Rajshahi University — A Unit; ⚙-এ বদলযোগ্য) → Days-Left/প্রস্তুতি% বাস্তব-হিসাবে।
২. নতুন-ইউজার = সৎ শূন্য-অবস্থা (কোনো ফেক সংখ্যা নয়)।
৩. পুরনো ড্যাশবোর্ড-ডেটা/ইঞ্জিন ১০০% অক্ষত — শুধু দৃশ্য-পরিবর্তন (additive override)।
৪. বটম-নেভ = ছবির ৬-ট্যাব (Home/Bank/Exam/Admission AI/History/Profile; ai-chat রুট, baseTab-হাইলাইট)।

## যা-বানানো হলো
- **`dashboard-v2.js`** (defer, `?v=dash2`): ১৪ মডিউল-বিল্ডার + override of renderDashboard (path-গার্ড,
  previous-ডেলিগেট) — Data: সব CACHE (dailyStats/examResults/questions/ADMISSION_PLANS/settings);
  helper: weekSeries/todayStats/streakDays/topicWeak/subjectProgress/goal/roadmapMini/insightText/graphSvg(SVG-লাইন);
  শূন্য-অবস্থা-বার্তা; dv2AllTools (১২-টুল no-loss), dv2EditGoal/dv2SaveGoal, dv2Task;
  phase5-“Daily Admission Intelligence” সেকশন **সংরক্ষিত** (data-dv2-phase5)।
- **`dashboard-v2.css`** (`?v=dash2`): emerald/white/mint কার্ড-শৈলী, mission-gradient, Mastery-ring (conic),
  streak-dots, রঙিন-বার, tools-grid, bottomnav-৬-ট্যাব রিস্টাইল; মোবাইল-ফার্স্ট; কোনো এক্সটার্নাল-অ্যাসেট নেই।
- **index.html**: css-link + last-ডিফার-স্ক্রিপ্ট + NAV_TABS-এ ai-chat + baseTab-ম্যাপিং।
- **sw.js**: APP_SHELL-এ ২ asset + BUILD_ID v195।

## টেস্ট
- নতুন `p11-dashboard-v2.test.mjs` — **৩৫ অ্যাসার্ট, সবুজ** (লোড/ক্যাশ-কি · ১৪ মডিউল · ডেটা-সততা ·
  additive-ইঞ্জিন · auth-lock-régression · CSS)।
- **১৬/১৬ স্যুট সবুজ** (সব আগের লক অক্ষত) · jsdom inline-পার্স OK · node --check dv2 ✓।
- অফলাইন-নিয়ম: dashboard-v2.js-এ কোনো fetch/XHR/https-কল নেই।

## ডিপ্লয়
- push → auto pages.deploy (v195; নতুন ক্যাশ-নেমস্পেস) → লাইভ-ভেরিফাই → মালিক-ফোন-ব্যবহার → APPROVE।
