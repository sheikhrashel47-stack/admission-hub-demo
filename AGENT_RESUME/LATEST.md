# LATEST — v197 (P13: dv2 CACHE-ক্র্যাশ-ফিক্স)
- মালিক-স্ক্রিনশট ২০২৬-০৯-০৭: "Something went wrong — C().settings.dailyTarget" TypeError।
- মূল-কারণ: `const CACHE` টপ-লেভেল-const → window.CACHE নেই → dv2-এর C()=window.CACHE||{} চিরকাল {} → ক্র্যাশ (P11 প্রথম ফোন-রেন্ডারে পতন; স্ট্যাটিক-টেস্ট ধরেনি)।
- ফিক্স (dashboard-v2.js): C() ৩-স্তর-রেজলভার + null-safe settings + goal()-এ ফাঁকা-dbPut-নিষেধ + renderV2 try/catch→পুরনো-ড্যাশবোর্ড; ?v=dash2f1; sw v197-gfix-20260907।
- টেস্ট: p13 ৮/৮ (রানটাইম-jsdom-সহ) + p11 ৩৫/৩৫ + স্যুট ১৮/১৮ সবুজ।
- বাকি: commit→push→CI→live-ভেরিফাই→মালিক-ফোনে-ভেরিফাই→APPROVE।
