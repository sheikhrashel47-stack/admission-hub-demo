# LATEST — 2026-09-02 · v33 (auth flow fix) live

**স্থিতি:** v33 `11af33f` + SW `v163-auth-fix-20260902` লাইভ। Signup verify স্ক্রিন সরল: শুধু "ইমেইলে কোড পাঠান" (৬-অঙ্ক), passkey বাটন সরানো → "আগে লগইন করো" error নাই। Passkey শুধু login-এ; না থাকলে স্পষ্ট বাংলা। গুগল signup-এ নাম/জন্মতারিখ যায়। টেস্ট ১১/১১ ✅। ভাইয়ের কনফার্মেশন বাকি; worker DNS sandbox-এ transient fail (retry দরকার)।
