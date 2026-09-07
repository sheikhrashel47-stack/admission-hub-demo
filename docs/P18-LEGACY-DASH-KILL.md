# P18 — পুরোনো ড্যাশবোর্ড আজীবন-বন্ধ (v202)

**মালিক (২০২৬-০৯-০৭, 😡):** "ভাই ঐ পুরোনো dashboard টি এখনো লোড করতেছে এবং render করতেছে — এটা আজীবনের জন্য বন্ধ করো"

## আসল-কারণ (P16-এর-পরে-ও-অটুট-থাকা-হুক)
P16 শুধু `dashboard-v2.js`-এর renderV2-এর-ভেতরের `previous()`-চেইন কেটেছিল। কিন্তু **আসল পুরোনো-ড্যাশবোর্ড-ইঞ্জিন `phase3-intelligence.js` নিজে-হুকড-ছিল**:

- `hookRender()` → `window.render`-কে-জড়িয়ে-রাখত: যেকোনো-রেন্ডারের-পরে `if(p==='dashboard') setTimeout(injectDashboard,0)`;
- `injectDashboard()` → পুরনো `<section class="p3-dashboard-v3" data-p3-command>` ঢুকিয়ে **নতুন dashboard-কে `display:none` করত** (`oldDash.style.display='none'`) — মালিক-যা-দেখছিলেন-তা-ই-পুরোনো-ড্যাশ;
- `init()`-এ ০/১০০/৫০০/১২০০ms + load + hashchange — ৪-বার-রিপি-ইনজেক্ট;
- তার-উপরে `daily-streak-card.js` (পুরোনো-streak-কার্ড) ও `dashboard-greeting-3d.js` (পুরনো-গ্রিটিং+ক্লক) `[data-p3-command]`-ধরে-আরও-পুরনো-টুকরো-জুড়ত।

## ফিক্স (v202) — চিরকালের-গার্ড
| ফাইল | কী-করা |
|---|---|
| `phase3-intelligence.js` | `injectDashboard()` → **স্থায়ী no-op** (`return; /* P18-LEGACY-DASH-KILL */`) — নিচের-মৃত-কোড-কখনো-চলে-না; `hookRender`-এর `if(p==='dashboard')setTimeout(injectDashboard,0)`-শাখা-কাটা। **analytics/notifications/routine90/notification-ইঞ্জিন অটুট** (নিজস্ব-রুট-হ্যান্ডলার-রয়েছে)। |
| `daily-streak-card.js` | index+sw-থেকে **চিরকাল-সরানো** (লোডই-হবে-না) + ফাইলের-ভেতরে মৃত-গার্ড (`if (true) return; /* P18-LEGACY-DASH-KILL */`)। |
| `dashboard-greeting-3d.js` | একইভাবে index+sw-সরানো + মৃত-গার্ড। |
| `sw.js` | APP_SHELL-থেকে-উভয়-ফাইল-বাদ; `BUILD_ID v202-gfix-20260907`। |
| `index.html` | দুটি-`<script>`-ট্যাগ-বাদ; phase3 `?v=command-tools-v16-dv2-only`; `sw.js?v=v202-…` + expectedSwVersion/cur। |

**গার্ড-স্তর:** ① লোড-স্তর (index/sw-এ-নেই) → ② রান-স্তর (phase3-inject no-op, পার্শ্ব-ফাইল-মৃত-গার্ড) → ③ টেস্ট-স্তর (p18 ৮-অ্যাসার্ট-চিরকাল)।

## যাচাই
- **p18-legacy-dashboard-kill.test.mjs — ৮/৮** (স্ট্যাটিক-গার্ড ৫টি + ভার্সন-অখণ্ডতা ২টি + **রানটাইম-jsdom**: পুরনো-স্ট্যাক-৩-ফাইল-লোড-করিয়ে dashboard-রুটে `[data-p3-command]`/`#dailyStreakCard`/`#ahGreet3d`/`.p3-header-v3` **শূন্য**, শুধু `.dv2-root` উপস্থিত)।
- পূর্ণ-স্যুট **২৩-ফাইল ০-ব্যর্থ** (p11 ৩৫ · p16 ৭ · p17 ১৭ · p18 ৮ · auth-lock ২৩ · বাকি-সব)।
- ভার্সন: `sw v202-gfix-20260907` · `phase3-intelligence?v=command-tools-v16-dv2-only` · `dashboard-v2?v=dash2f3` (অটুট)।

## মালিক-কে-বুঝিয়ে-বলা
- পুরোনো-ড্যাশবোর্ড এখন **কোড-স্তরে-মৃত**: লোড-হবে-না, রেন্ডার-করবে-না, কেউ-আবার-চালু-করলে-ও-টেস্ট-আটকে-দেবে।
- পেজ-রিফ্রেশ/অ্যাপ-বন্ধ-খোলা → **একটাই** নতুন-ড্যাশবোর্ড (dv2)।
