# LATEST — Admission Hub Demo (2026-09-01)

## চলমান কাজ: Exact-Clone UI v4 + আসল লোগো (clone-ui-v4, commit ট্যাগ)
- **১০-স্ক্রিন exact-clone সম্পন্ন** (onboarding.js/css rewrite, Glass Daylight মুছে)
- **আসল লোগো ৫টি** → `icons/uni/`: du.png (bn.wiki), ju.png (en.wiki via Wayback), ru.png (ru.ac.bd), cu.png (bn.wiki via Wayback), gst.png (অফিসিয়াল ওয়ার্ডমার্ক ব্যাজ — গুচ্ছ সাইট কোনো লোগো ফাইল প্রকাশ করে না)
- jsdom smoke test পাস; preview-onboarding.html dev পেজ
- আগের বেস: ১০-স্ক্রিন + 3D splash (ee06850), worker 15-min verify, 3D loading system — সব সক্রিয়

## পরের ধাপ
1. GH Pages deploy → live চেক (onboarding.css marker v4, icons/uni ২০০, TOTAL=10)
2. control repo-তে resume sync
3. ইউজার ফিডব্যাকে প্রয়োজনে pixel-level টিউন (spacing/color/typography)

## Credentials
সিক্রেট resume-তে রাখা হয় না — আগের resume ফাইল ও environment-এ (detail: `2026-09-01-emailfix-glassdesign-3dloader.md`)।