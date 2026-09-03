# Resume — 2026-09-03 · 🛑 MAIN APP REVERTED — POLICY CHANGE (গুরুত্বপূর্ণ)

## ঘটনা
- ভাইয়ের মূল অ্যাপ `https://sheikhrashel47-stack.github.io/admission-hub/` (repo: **admission-hub**) হঠাৎ ভেঙে গিয়েছিল — "Something went wrong / Unexpected EOF / ReferenceError: Can't find variable: CACHE"।
- কারণ: আমি demo-র নতুন ফিচার (auth fix/guard, curriculum, বাংলা ইমেইল, 3D splash) **hub-এইও mirror** করেছিলাম। hub-এর index.html-এর script-লোডিং-CACHE অর্ডার ভিন্ন হওয়ায় hub-এ ভুল ম্যাচ-আপ → CACHE ReferenceError।

## সমাধান
- hub-এ আমার করা **৪টি sync কমিট revert** (ee579c9, 4bada9e, deb1bb4, daf8fbf) → hub = exact `995df98` (v137, আগের সুস্থ অবস্থা)।
- hub কমিট: `43482ac` "revert: restore admission-hub…" — push verified; live main-সাইট verify:
  - index: `v135-sync-button-fix-20260831` ✓, কোনো splash-3d/curriculum ref নেই ✓
  - `/splash-3d.js` → **404** ✓ · `/sw.js` → **v137-android-p3-20260831** ✓
- demo সম্পূর্ণ অক্ষত: `98322a6` + v174 live ✓ (আগের সব নতুন ফিচার এখানেই)

## ⚠️ নতুন নিয়ম (ভবিষ্যতের জন্য)
1. **সব নতুন ফিচার/আপডেট শুধু `admission-hub-demo`-তে** — এই repo-ই source of truth।
2. **`admission-hub` (main) কখনো স্পর্শ করা যাবে না** — সেখানে কোনো sync/আপডেট নয়। প্রয়োজনে শুধু revert।
3. Worker/Cloudflare deploy ডেমো-র সাথেই (admission-gk shared worker — একই, okay)।
