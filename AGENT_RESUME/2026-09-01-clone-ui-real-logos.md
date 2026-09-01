# Exact-Clone UI v4 + আসল ইউনিভার্সিটি লোগো (১০-স্ক্রিন)

তারিখ: 2026-09-01 · রিপো: admission-hub-demo · commit ট্যাগ: clone-ui-v4

## যা করা হলো (এই সেশনে)
1. **আসল লোগো সংগ্রহ (৫টি)** → `icons/uni/`:
   - `du.png` — bn.wikipedia «ঢাকা বিশ্ববিদ্যালয়ের মনোগ্রাম.jpeg» (অফিসিয়াল, নিবন্ধ pageimage)
   - `ju.png` — en.wikipedia «Jahangirnagar University Logo.svg» (bn.wiki «প্রতীক»-এরই কপি; upload.wikimedia rate-limit-এ ছিল, Wayback snapshot `20250617035859` থেকে SVG → PNG)
   - `ru.png` — ru.ac.bd অফিসিয়াল (image-search-এর `university-of-rajshahi-official-logo-1.jpg`)
   - `cu.png` — bn.wikipedia «চট্টগ্রাম বিশ্ববিদ্যালয়ের লোগো.svg» (Wayback `20161215103841` থেকে SVG → PNG)
   - `gst.png` — **গুচ্ছের অফিসিয়াল সাইট (gstadmission.ac.bd) কোনো লোগো ফাইল প্রকাশ করে না** (Cloudflare; আর্কাইভ করা homepage/navbar/CSS/PDF-এও শুধু টেক্সট হেডার, favicon ৫৪৮B)। তাই অফিসিয়াল ওয়ার্ডমার্ক ব্যাজ: গাঢ় নেভি বৃত্ত + সাদা «GST» + «ADMISSION TEST» (অফিসিয়াল সার্কুলারের ভিজ্যুয়াল স্টাইলে)। AI/র‍্যান্ডম নয়।
2. **onboarding.css সম্পূর্ণ rewrite** — Glass Daylight মুছে exact-clone: tokens `#FCFBF8/#087A45/#075B3A/#EEF8EB/#171717/#777777/#E2E2DE/#DCDDD8`, Noto Sans Bengali, iOS status bar (9:41 + signal/wifi/battery), rounded 10–14px, 1px border, subtle shadow, NO glass/gradient/heavy animation
3. **onboarding.js সম্পূর্ণ rewrite** — ১০ স্ক্রিন exact-clone:
   - S1: logo book+cap, ADMISSION HUB, হেডিং, pastel campus illustration (inline SVG), «চল শুরু করি →»
   - S2: ৪ অপশন (বিশ্ববিদ্যালয় ভর্তি/HSC/SSC/BCS), green selected + check
   - S3: search «বিশ্ববিদ্যালয় খুঁজুন...» + ৩-col আসল লোগো গ্রিড + selected card «ঢাকা বিশ্ববিদ্যালয়/University of Dhaka»
   - S4: বড় লোগো + ২×২ A/B/C/D unit
   - S5: «টপ র্যাঙ্ক/ভালো প্রস্তুতি/স্মার্ট ও ফাস্ট» + subtitle «একটি বেছে নাও»
   - S6: 180° gauge green→yellow (drag-able), «50%», «মাঝামাঝি», chips বাংলা/English/GK/ICT/Math
   - S7: ২×২ session (১০–২০/৩০–৬০/১–২ ঘণ্টা/ফ্লেক্সিবল) + days ৩-৭ (default ৫)
   - S8: «আর মাত্র একটু বাকি!» + clipboard/checklist/pencil illo + ৪ dot
   - S9: «তোমার জন্য পার্সোনাল প্ল্যান তৈরি হচ্ছে...» + ৪ checklist (green/teal/doc/timer) + bar «৯১% সম্পন্ন» → auto S10
   - S10: Ready Dashboard — hamburger+bell, «অভিনন্দন, Rashed! 🎉», goal card (pale green + campus illo), Today's Focus ৩ row, weekly ring ৭১% + ৫/৭ দিন, CTA
4. **jsdom smoke test** — পুরো ১০-স্ক্রিন ফ্লো + back + finish→navigate('dashboard') পাস ✅
5. `preview-onboarding.html` — auth ছাড়া ডিজাইন দেখার dev পেজ (live preview: `https://{sandbox}.e2b.app/preview-onboarding.html`)

## পুনঃব্যবহারযোগ্য সিদ্ধান্ত
- **GST logo**: অফিসিয়াল সাইট লোগো ফাইল প্রকাশ করে না → ওয়ার্ডমার্ক ব্যাজ (যদি পরে অফিসিয়াল ফাইল মেলে, replace করা যাবে; `icons/uni/gst.png` পাথ ঠিক থাকবে)
- **upload.wikimedia.org rate-limit** (robot policy 135ee38) — লোগো download-এ সমস্যা হলে পথ: (ক) Wayback-এ SVG/PNG খোঁজা, (খ) thumb.wikimedia.org thumb, (গ) অপেক্ষা করে retry
- **Data model**: goal('uni'|'hsc'|'ssc'|'bcs'), targetUniversityIds/Universities, targetUnits, studyGoal('top'|'good'|'fast'), currentLevel(0-100, default 50), weakSubjects, session('s10'|'s30'|'s1h'|'flex'), weeklyDays(3-7, default 5) — worker `/onboarding` PUT-এ sync

## চেক
- [x] node --check onboarding.js
- [x] jsdom flow test (১০ স্ক্রিন + back + finish)
- [x] local server smoke (preview/JS/CSS/PNG 200)
- [ ] GH Pages live চেক (deploy-এর পর): onboarding.css marker, icons/uni ২০০, TOTAL=10
- [ ] control repo-তে resume sync
