# LATEST — v196 (P12: nav-AI-রিমুভ + লগইন-গ্রেস)
- ২০২৬-০৯-০৭: মালিক-রিপোর্ট — ① বটম-নেভ-এর "Admission AI" ট্যাব বাদ; ② Google/OTP সফল কিন্তু অ্যাপ লগইন-অবস্থা দেখায় না।
- কারণ-②: সেশন Cloudflare KV-তে (eventually consistent ~৬০সে); লগইন-পর পরের boot-এর /auth/me অন্য PoP-এ ৪০১ → পুরনো কোড সেশন মুছে গেস্টে ফেলত।
- ফিক্স: setSession-এ লগইন-মার্কার (ahJustAuthed) + boot-এ ৩-মিনিট-গ্রেস (৯×রিট্রাই; fresh-৪০১-এ সেশন-রাখা + ৩০সে-পর পুনঃযাচাই) + index-এর v179-হার্ডকোড v196-সংশোধন + premium-auth/auth-svg ?v=v196 + sw v196-gfix-20260907।
- nav-①: NAV_TABS ৫-ট্যাব; baseTab ai-chat→''; ai-chat রুট/টুল অক্ষত।
- টেস্ট: p12 ১৭/১৭ + p11 ৩৫/৩৫ + **স্যুট ১৭/১৭ সবুজ**; inline ১৪/১৪ OK।
- পরবর্তী: commit→push→CI→live-ভেরিফাই→মালিক-APPROVE।
