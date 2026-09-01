# 2026-09-01 — Resume সিস্টেম স্থাপন + প্রজেক্ট বেসলাইন

**এজেন্ট:** জুজু · **Repo:** admission-hub-demo (Public)

---

## ✅ যা করা হলো

1. **Agent Resume System স্থাপন** — এই ফোল্ডার (`AGENT_RESUME/`) + `README.md` (নিয়ম/টেমপ্লেট) + `LATEST.md` (সর্বশেষ অবস্থা)।
   - এখন থেকে **প্রতি আপডেট শেষে** `AGENT_RESUME/YYYY-MM-DD-slug.md` ফরম্যাটে resume লিখে commit+push করা হবে।
   - নতুন এজেন্ট যাতে শুধু এই ফোল্ডার দেখেই শেষ অবস্থা ও পরবর্তী কাজ বুঝতে পারে।
2. **পুরো প্রজেক্টের A–Z scan ও বেসলাইন রেকর্ড** — auth flow, onboarding, worker backend, pending কাজ সব LATEST.md-তে তালিকাভুক্ত।
3. কন্ট্রোল repo (`admission-hub`)-তেও একই সিস্টেম স্থাপিত — দুই repo-তে একই নিয়ম।

## 📌 বর্তমান অবস্থা

- HEAD `d977a11` (Phase 6 onboarding live) · Phase 3 auth live (google+passkey+email)
- Pending: `auth-options/` ছবি (৩৮টা, আনট্র্যাকড), `brand/`+নতুন icons (manifest-এ বসানো হয়নি)

## ⏭️ পরবর্তী কাজ

1. `auth-options/` ছবির সিদ্ধান্ত (ব্যবহার/বাতিল)
2. Manifest/index.html-এ icon-1024/apple-touch-icon বসানো
3. `PHASE 3 APPROVED` পেলে Phase 4 (Connected Lexicon, Smart Memorizing — `phase345.patch.js`)

## 🚨 STOP / সতর্কতা

- `PHASE 3 APPROVED` ছাড়া Phase 4 শুরু করবে না
- Phase 1 (Exact Clone) frozen — রিডিজাইন করো না
- টোকেন/সিক্রেট resume-তে কখনো লেখা যাবে না
- repo public — push করার আগে sensitive content চেক করো

---
*পরের resume: `AGENT_RESUME/2026-09-01-<কাজের নাম>.md`*
