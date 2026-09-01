# LATEST — 2026-09-02 · ✅ নোটিশ ঠিক + সব লাইভ (v30)

- **ভাইয়ের রিপোর্ট (IMG_3364):** "নোটিশ — আমার কে সংযোগ আছে? এসব বন্ধ করো" — স্ক্রিনশট OCR করে দেখা গেল: **ভাই Arena chat-এর Agent Mode প্রিভিউতে অ্যাপ দেখছেন** (welcome screen + লগইন গেট), যেখানে ইন্টারনেট বন্ধ → সার্ভার/গুগল লোড হয় না। পুরনো নোটিশের "নেটওয়ার্ক সংযোগ" কথাটা ভাইকে ভয় দেখাচ্ছিল
- **ফিক্স (v30 `d996caa`, live):** নোটিশ নতুন — bottom card, পরিষ্কার বাংলা: "এই প্রিভিউতে লগইন করা যায় না… তোমার অ্যাকাউন্টে কোনো ঝুঁকি নেই" + **"আসল অ্যাপ খুলো →" বাটন** (github.io লিংক) + ✕ বন্ধ বাটন (pref সেভ)। ইন্টারনেট ফিরলে অটো-হাইড
- **সব আগের ফিক্স এখনও live:** KV মাইগ্রেশন + dual-KV fallback (`48fc321d`), auth-hardening v29 (retry, no auto-logout, storage resilience), ভাইয়ের account "Sheikh Mohammad Rashel" active ✅
- **লাইভ:** demo `d996caa` (v30) · control `5347760` · worker `48fc321d`
- Resume: `AGENT_RESUME/2026-09-02-kv-migration-critical.md`
