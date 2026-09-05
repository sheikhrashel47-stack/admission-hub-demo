# 2026-09-05 — D-V186: IDB-ক্র্যাশ + লোডিং-হার্ডেনিং (sw v186-idbkeep) ✅

## লক্ষণ (মালিক-স্ক্রিনশট, admissionhub.pages.dev)
"Crash: Failed to execute 'transaction' on 'IDBDatabase': The database connection is closing." + "বেশি লোডিং / blank-screen হবে না" অনুরোধ + লগইন-যাচাই + GitHub-প্রশ্ন।

## কারণ ও ফিক্স (সংক্ষিপ্ত)
- `onversionchange`→`DB.close()`+ব্লক-স্ক্রিন; বন্ধ-সংযোগে নতুন transaction → InvalidStateError → Crash-পিল। ফিক্স: `reopenDb()` (singleton) + `window.__ahReopenDb`; onversionchange → চুপচাপ রি-ওপেন; `runDbRequest` স্টেল-রিট্রাই; `putManyFast` ক্লোজিং-রিট্রাই।
- `boot()`-এর loadCache-catch-এ `return` → লোডার-আটক (ব্ল্যাংক)। ফিক্স: memory-fallback + টোস্ট — অ্যাপ সর্বদা চালু।
- ৪৭টি সিরিয়াল `<script>` → `defer` (বুট-ক্রিটিকাল ৩টি রয়ে গেছে; typeof-গার্ডেড) — প্রথম-পেইন্ট দ্রুত।
- ভার্সন v186-idbkeep-20260905; +idb-hardening.test.mjs (১৪/১৪)।

## যাচাই
সব-স্যুট সবুজ (auth-ux 33 · GUARD ✓ · nosplash 16 · session 12 · ai-phase4 35 · phase23 13 · phase4 16 · phase5 37 · idb-hardening 14)।

## লগইন-নোট
- ইমেইল-OTP/পাসওয়ার্ড/পাসকি: সার্ভার-পাশ (origin-নিরপেক্ষ) → pages.dev-এ ঠিক।
- Google (GIS): origins allowlist-নির্ভর; pages.dev-অরিজিন অননুমোদিত হলে GIS-পপআপ ব্যর্থ — GCP-কনসোলে `https://admissionhub.pages.dev` Authorized JavaScript origins-এ যোগ করতে হবে (মালিক-pаша)। অস্থায়ী-পথ: ইমেইল-OTP।

## GitHub-উত্তর (মালিককে দেওয়া)
প্রজেক্ট **এখনো GitHub-এই** (`sheikhrashel47-stack/admission-hub-demo`, main; সর্বশেষ commit → push)। CF-Pages = শুধু ফাইল-আপলোড-হোস্টিং (direct-upload; রিপো-সংযোগ নেই)। github.io ও pages.dev দুটোই লাইভ; সোর্স-অফ-ট্রুথ = রিপো।
