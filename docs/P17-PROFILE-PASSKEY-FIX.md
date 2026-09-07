# P17 — প্রোফাইল-সততা + এডিট-অ্যাক্সেস + পাসকি-মাল্টি-হোস্ট (v201)

**মালিক-রিপোর্ট (২০২৬-০৯-০৭, স্ক্রিনশট 😡):** "ভাই দেখো কি বাগ এটি ফিক্স করো আর পাসকি দিয়ে এটা কি আসছে… প্রোফাইল এডিট করা যায় না কেনো ছবি, নাম ইত্যাদি"
স্ক্রিনশটে-দেখা-অসঙ্গতি: বিশ্ববিদ্যালয় "—" কিন্তু ইউনিট "B" · দুর্বল-বিষয় "বাংলা · English · GK" · প্রস্তুতি-স্তর "৫০%" · "একাডেমিক প্রোফাইল আপডেট করো" (ডেড)।

## মূল-কারণ (৬টি)

| # | কারণ | ফাইল | প্রভাব |
|---|------|------|--------|
| ① | `loadProfileExtras()`-এ `/onboarding`-থেকে `pfAcademicSlot` **আবার-পেইন্ট** → `u.targetUniversity`/`u.targetUnit`-এর-সাথে ভিন্ন-উৎস | premium-auth.js | বিশ্ববিদ্যালয় "—" + ইউনিট "B" |
| ② | `blank()`/`ensureDefaults()`-এ ডিফল্ট `weakSubjects:['বাংলা','English','GK']`, `studyGoal:'top'`, `currentLevel:50` — সত্য-নির্বাচন-ছাড়াই "নির্বাচিত"-সাজানো | onboarding.js:84-94 | ফেক-বিশ্লেষণ-দেখানো |
| ③ | "আপডেট করো"→`AHOnboard.start()`=`maybeStart()` — `data.completed`-হলে **সাথে-সাথে `return false`** | premium-auth.js:1728→onboarding.js:679-700 | ডেড-বাটন |
| ④ | passkey `RP_ID`/`RP_ORIGIN` **শুধু github.io**; pages.dev-অরিজিনে register/verify/login-চেক-401 ("Origin মিলছে না") | worker-bundle.mjs:659-660, 800/874/971 | pages.dev-এ passkey অচল |
| ⑤ | `renderEdit()`-এ `pfSchool`+`pfCollege` **দুটোই `u.institution`** | premium-auth.js:1377-78 | কলেজ-আলাদা-সেভ-হয়-না |
| ⑥ | প্রোফাইল-পেজে **এডিট-বাটনই নেই** (রুট/ইউআই-গ্যাপ) | premium-auth.js renderProfile | "এডিট করা যায় না" |

## ফিক্স (v201 — `p3-auth-guest-v201`, `sw v201-gfix-20260907`)

### ১. প্রোফাইল-সততা — ফেক-বিশ্লেষণ নিষিদ্ধ
- **নতুন-হেল্পার (premium-auth.js):**
  - `realWeakSubjects()` — `CACHE.examResults` (আসল-পরীক্ষা-স্ন্যাপশট) থেকে subject-ভিত্তিক accuracy-গণনা → সর্বনিম্ন-৪ টি;
  - `honestWeak(onbWeak)` — আসল-ডেটা-থাকলে-সেটাই; নইলে **ডিফল্ট-তালিকা (`dv2DefaultWeak`) সম্পূর্ণ-ফিল্টার** → সৎ-শূন্য; বাকি-মানগুলোই `—`-নয়;
  - `prepOf(u)` — `computeLifetimeStats()`-ভিত্তিক **আসল-প্রস্তুতি-স্তর** (পরীক্ষা+প্রশ্ন+একাডেমিক) — `currentLevel:50`-ডিফল্ট আর দেখানো-হয়-না।
- **বাছাই-ফ্ল্যাগ (onboarding.js):** `weakSubjectsChosen` / `studyGoalChosen` — `ensureDefaults`-এ `false`; ব্যবহারকারী-সত্যিই-বাছাই-করলে-কেবল `true`।
- **রেন্ডার-লজিক:** `renderProfile` + `loadProfileExtras`-অ্যাকাডেমিক-স্লট + `renderAcademic` — সব-জায়গায় `honestWeak`/`prepOf`; লক্ষ্য `studyGoal==='top'`-হলে `—` (ডিফল্ট-না-বাছাই-বোঝায়)।
- প্রোফাইল-হিরো-তে-প্রস্তুতি-স্তর-এর-নিচে ছোট-নোট: "আসল-অগ্রগতি (পরীক্ষা+প্রশ্ন+একাডেমিক) থেকে"।

### ২. প্রোফাইল-এডিট-অ্যাক্সেস
- প্রোফাইল-হিরো-তে **✏️ প্রোফাইল এডিট**-বাটন → `navigate('profile/edit')` (নাম/ছবি/স্কুল/কলেজ-পথ)।
- "একাডেমিক প্রোফাইল আপডেট করো" → **`AHOnboard.start(true)`** — force-পুনরায়-অনবোর্ডিং (`onboarding.js`-এ `start: (force) => maybeStart(!!force)`; `completed && !force`-হলে-কেবল-ব্লক)। `completed:false` **override করা-হয়-না** (KV-রিপ্লিকেশন-ফাঁদ-এড়ানো; শুধু লোকাল-রান-মোড)।

### ৩. পাসকি-মাল্টি-হোস্ট (worker — ৩-কপি: worker-bundle.mjs / public-worker.js / hub/public-worker.js)
- `RP_ORIGINS = ['https://sheikhrashel47-stack.github.io', 'https://admissionhub.pages.dev']` — অরিজিন-ভ্যালিডেশন **দুর্বল-করা-হয়নি**: এখনও তালিকা-ভিত্তিক `startsWith`-সঠিক-হোস্ট।
- `rpHost(request)` — `Origin`/`Referer` থেকে বর্তমান-হোস্ট → `rp.id` (create) ও `rpId` (get/verify) **হোস্ট-অনুযায়ী** — ব্রাউজার-দ্বৈত-অরিজিন-নিষেধ-মানে।
- register/verify/login-চেক: `RP_ORIGINS.some(...)` — উভয়-পাবলিক-হোস্ট-অনুমোদিত; **অন্যান্য-অরিজিন → এখনও 401**।

### ৪. স্কুল/কলেজ-আলাদা-সেভ (এই-ভার্সনে-সম্পন্ন)
- **client (premium-auth.js):** `renderEdit`-এ `pfSchool` ← `u.school || u.institution`, `pfCollege` ← `u.college` (ডুপ্লিকেট-নয়); `saveEdit`-এ `school` + `college` আলাদা-পাঠানো + পুরনো `institution`-ব্যাকওয়ার্ড-কম্প্যাট।
- **worker (৩-কপি: worker-bundle / public-worker / hub-public-worker):** `profilePut`-fields-এ `"college"` যোগ; `publicUser`-এ `college`/`school` রিটার্ন → ক্লায়েন্ট-আবার-পড়ে। পুরনো-প্রোফাইলে-`institution`-থাকলে-`school`-হিসেবে-দেখা (fallback)।

### ৫. ফটো-আপলোড (উন্নত)
- ক্রপ-ক্যানভাস ২৫৬→**৩২০px**, jpeg 0.72→**0.82** — ঝাপসা-কম, সাইজ-সীমা-অক্ষত (320px-jpeg ~40-90KB, অনেক-নিচে)।
- HEIC/অসমর্থিত-ফরম্যাটে `img.onerror` → স্পষ্ট-বাংলা-সতর্কতা (iPhone-HEIC-নির্দেশসহ) — আগে-নীরব-"-পড়া-যায়নি"।
- `URL.createObjectURL` revoke (মেমোরি-লিক-নয়)।

## যাচাই
- **p17-profile-honesty.test.mjs — ১৭/১৭** (সততা-হেল্পার · ডিফল্ট-ফিল্টার · prep.pct · top→— · ফ্ল্যাগ · ✏️-বাটন · force-অনবোর্ডিং · RP_ORIGINS ৩-কপি · rpHost · v201-অখণ্ডতা · রানটাইম-jsdom: ডিফল্ট-অনবোর্ডিং-ডেটায়-সৎ-শূন্য-রেন্ডার)।
- **পূর্ণ-স্যুট ২২-ফাইল ০-ব্যর্থ** (p11 ৩৫ · p12 ১৭ · p13 ৮ · p14 ১২ · p15 ১৫ · p16 ৭ · **p17 ১৭** · auth-ux ৩৩ · auth-lock ২৩ · বাকি-সব)।
- ভার্সন: `premium-auth.js?v=p3-auth-guest-v201` · `onboarding.js?v=p6-onboard-v13` · `sw v201-gfix-20260907` (expectedSwVersion/cur)।

## মালিক-কে-বুঝিয়ে-বলা
- পাসকি **github.io-তে-আগে-থেকেই-চাইলে; pages.dev-এ-চাইলে-নতুন-ফিক্সে** (উভয়-হোস্ট-অনুমোদিত) — তবে পাসকি ঐ-অরিজিনে-তৈরি-হলে অন্য-অরিজিনে-ব্রাউজার-নিজেই-ব্লক-করতে-পারে (ডিভাইস-নির্ভর)।
- স্ক্রিনশটের-ডেটা (বাংলা·English·GK / ৫০%) **অনবোর্ডিং-ডিফল্ট** ছিল — এখন-শুধু-আসল-পরীক্ষা-থেকে-দুর্বল-বিষয়; না-থাকলে "—"।
- "একাডেমিক প্রোফাইল আপডেট করো" এখন-সত্যিই-অনবোর্ডিং-খোলে; ✏️-বাটন-থেকে-নাম/ছবি/স্কুল-এডিট।
