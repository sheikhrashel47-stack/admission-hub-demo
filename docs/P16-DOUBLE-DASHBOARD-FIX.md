# P16 — দ্বৈত-ড্যাশবোর্ড-ফিক্স (একক-ড্যাশবোর্ড) (v200)

তারিখ: ২০২৬-০৯-০৭ · sw BUILD_ID: `v200-gfix-20260907` · dashboard-v2.js `?v=dash2f3`

## মালিক-রিপোর্ট 😡
"একসাথে ২টি ড্যাশবোর্ড কেনো শো হচ্ছে! প্রথমে পুরোনোটা, scroll করে নিচে গেলে আবার নতুনটা। এক কাজ করো — পুরোনোটা ডিলিট করো সম্পূর্ণ।"

## মূল-কারণ (কোড-প্রমাণ-সহ)
- `dashboard-v2.js`-র `renderV2()` আগে **`previous()` (= পুরনো renderDashboard-র্যাপার-চেইন) চালাত** phase5-"Daily Admission Intelligence"-intel নেওয়ার জন্য।
- সেই পুরনো-চেইন (index-এ phase5-র্যাপার `renderDashboard=function(){if(dashboard)return oldDashboard()...}` + `phase345.patch.js` (setTimeout-ইনজেক্ট) + `study-hub.js` + `vocabulary-master-tool.js` + `dashboard-greeting-fix.js` — প্রায়-সবাই লোড-সময়ে `window.renderDashboard`-কে-ধরে-নিজে-র্যাপার-বানিয়েছিল) — প্রতিটি রেন্ডারে **পুরনো-ড্যাশবোর্ড DOM-এ রেন্ডার + বাড়তি-সেকশন-ইনজেক্ট** করত।
- ফল: রেন্ডার-চেইনে পুরনো-ড্যাশবোর্ড **আগে**, তারপর dv2-র new — **স্ক্রল-করলে দুটোই** (পুরনো-উপরে, নতুন-নিচে)।

## সমাধান (dashboard-v2.js)
1. **`renderV2()` থেকে `previous()`/intel-ক্যাপচার সম্পূর্ণ-বাদ** — পুরনো renderDashboard-চেইন ড্যাশবোর্ড-পথে **কখনোই চালানো হয় না** (মালিক-নির্দেশ: "পুরোনোটা ডিলিট করো সম্পূর্ণ"; phase5-ইন্টেল-ও পুরনো-ড্যাশের-অংশ-হিসাবে-বাদ)।
2. **`dv2Cleanup()`** — রেন্ডার-শেষে (ও-ফলব্যাক-পথে): `#app`-এ **একাধিক `.page`** থাকলে **শুধু dv2-থাকা-পেজ** রাখা, বাকি-সব-remove; পুরনো-মার্কার-সব-শূন্য: `[data-phase5-dashboard]`, `[data-phase34-dashboard]`, `[data-dashboard-comparison]`, `[data-phase5-quicklinks]`, `.daily-gk-teaser`, `.p3-dashboard-v3`, `.dashboard-v2`, `.p3-dashboard`।
3. অন্যান্য-রুট (bank/exam/history/…) → `previous()`-ডেলিগেশন **অক্ষত** (শুধু dashboard-পথ-পরিবর্তিত)।

## ভার্সন
- `dashboard-v2.js?v=dash2f1` → `?v=dash2f3` (index + sw APP_SHELL); BUILD_ID/sw-marker/expectedSwVersion/cur `v199` → `v200-gfix-20260907` (সব-টেস্ট-সিঙ্ক)।

## টেস্ট-প্রমাণ
- **নতুন `p16-dashboard-single.test.mjs` — ৭ অ্যাসার্ট** (স্ট্যাটিক ৫: previous/intel-বিলুপ্ত · dv2Cleanup · পুরনো-মার্কার-তালিকা · ভের্সন) +
  **রানটাইম-jsdom ২** (সবচেয়ে-খারাপ-কেস: পুরনো-র্যাপার ২-বার-পুরনো-ড্যাশ-জমায় + append-mode-renderShell → dv2-র-পর **ঠিক-১টি `.page`**, শূন্য-পুরনো-মার্কার; পরপর-৩-রেন্ডারেও-এক-পেজ-অটুট)।
- p11 ৩৫/৩৫ (অ্যাসার্ট-৩২ নতুন-নির্দেশে-হালনাগাদ); **স্যুট ২১/২১ সবুজ**; inline ১৪-ব্লক OK।

## লাইভ-ভেরিফাই
- pages.dev + github.io: `sw.js?v=v200-gfix-20260907` + `dashboard-v2.js?v=dash2f3`।
