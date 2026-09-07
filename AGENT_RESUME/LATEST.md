# LATEST — v197 (P13) PUSHED+VERIFIED
- commit `f64728f`; CI ৩/৩ success (Guard + Deploy-CF + pages-build); লাইভ দুই-হোস্ট: sw v197-gfix-20260907 + dashboard-v2.js?v=dash2f1 (ফাইল-ভেতরে রেজলভার-ফিক্স সার্ভ হচ্ছে)।
- P13 সমাধান: dv2 C() ৩-স্তর-রেজলভার + null-safe settings + goal()-dbPut-গার্ড + renderV2-ফলব্যাক; p13 ৮/৮ (রানটাইম-jsdom); স্যুট ১৮/১৮।
- বাকি: মালিক-ফোনে ভেরিফাই (অ্যাপ বন্ধ→খোলা → ভুল ড্যাশবোর্ড-ক্র্যাশ নেই) → APPROVE।
- খোলা-মনে রাখা: experience-studio-র `window.CACHE?.settings`-প্যাটার্ন (ক্র্যাশ-না-করা, তবে ডেটা-সূক্ষ্মতা) — মালিক-রিপোর্ট হলে দেখব।
