# LATEST — 2026-09-02 · AUTH ROOT-CAUSE v170 live

**স্থিতি:** v170 `4004458` — পুরনো SW-shell cache purge (পুরনো auth UI আর কখনো serve হবে না), existing-email 409→LOGIN redirect (নতুন Gmail-এ নয়), authFriendly error-map, stale-session cleanup। Worker end-to-end signup লাইভ প্রমাণিত (register→Brevo OTP→verify→token+active)। টেস্ট ১৩/১৩ ✅। ভাইয়ের real-device কনফার্মেশন বাকি (২× রিফ্রেশ → নতুন Gmail signup)।
