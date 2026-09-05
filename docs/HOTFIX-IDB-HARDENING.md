# HOTFIX D-V186 — IDB-ক্র্যাশ + লোডিং-হার্ডেনিং (sw v186-idbkeep) · ২০২৬-০৯-০৫
> উদ্বোধন: মালিক-স্ক্রিনশট (admissionhub.pages.dev) — লাল "Crash: Failed to execute 'transaction' on 'IDBDatabase': The database connection is closing." পিল + ভারী-লোডিং-উদ্বেগ।

## মূল-কারণ
1. **ক্র্যাশ:** `DB.onversionchange` → `DB.close()` + `showStorageRecovery` (পূর্ণ-ব্লক স্ক্রিন); বন্ধ-সংযোগে পুনরায় `transaction()` চালালে `InvalidStateError: connection is closing` → `unhandledrejection` → লাল Crash-পিল। ক্লায়েন্ট-পথে `putManyFast` (cloud-content-sync) ও `runDbRequest` queueDb-র বাইরে/ভেতরে বন্ধ-সংযোগ হ্যান্ডেল করত না।
2. **ভারী-লোডিং/ব্ল্যাংক-ঝুঁকি:** `boot()`-এর `loadCache`-`catch`-এ `return` → `app-booting` ক্লাস সরানো হতো না → লোডার আটক (ব্ল্যাংক-দৃশ্য); ৮৪টি সিরিয়াল (parser-blocking) `<script src>` — হেভি app-seed (১.৩৭MB)+result-analysis (৬৫০KB) মূল-পাথে।

## ফিক্স
- `reopenDb()` হেল্পার (singleton) + `window.__ahReopenDb`; `onversionchange` → **চুপচাপ রি-ওপেন** (ব্লক-স্ক্রিন বাদ; ডেটা কখনো মুছে না)
- `runDbRequest`: `__ahDbStale`-এ রি-ওপেন-পরে রিট্রাই (দিন-ব্যাপী queueDb-সিরিয়াল বজায়)
- `putManyFast`: প্রতি-চাঙ্কে তাজা DB + "connection closing"-এ এক-বার রি-ওপেন-রিট্রাই
- `boot()`-catch → `useMemoryStorage` + টোস্ট → **লোডার কখনো আটকে না** (অ্যাপ চলতেই থাকে; ৫-সে watchdog-ও আছে)
- **পারফ:** ৪৭টি অভ্যন্তরীণ-স্ক্রিপ্ট `defer` (বুট-ক্রিটিকাল ৩টি — session-persist/ah-ai-client/data-protection — অপরিবর্তিত); সব টুল runtime-typedef-গার্ডেড (৩২টি `typeof window.` গার্ড) — ইন্টারঅ্যাকশন-নিরাপদ

## যাচাই
idb-hardening **14/14** (নতুন) · auth-ux 33 · nosplash 16 · GUARD ✓ · session 12 · ai-phase4 35 · phase23 13 · phase4 16 · phase5 37 — মোট ২০০+।
