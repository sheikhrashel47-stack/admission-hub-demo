# LATEST — v199 (P15: same-origin API প্রক্সি) — ডিপ্লয়-ভেরিফাই-বাকি
- মালিক: "Failed to fetch" + Google-লগইন-অসফল — ফোন-নেট pages.dev-লোড করে কিন্তু workers.dev-এ পৌঁছায় না (লাইভ-প্রমাণ: worker+CORS সুস্থ; নেটওয়ার্কই ব্লক)।
- সমাধান: Pages Advanced-Mode `_worker.js` (/api/* → মূল worker; ASSETS-ফলব্যাক; নো-সিক্রেট) + ক্লায়েন্ট-বেস same-origin: premium-auth PUB='/api' (canonical-ফলব্যাক অক্ষত), cloud-content-sync apiFetch, onboarding PUB_CANON, AI-ক্লায়েন্ট-৪ (+gk override-অক্ষত)।
- টেস্ট: p15 ১৫/১৫ + স্যুট ২০/২০ সবুজ। ভার্সন v199-gfix-20260907, premium-auth ?v=p3-auth-guest-v199।
- বাকি: commit→push→CI→**live `pages.dev/api/auth/config`-প্রুব**→মালিক-ফোন-ভেরিফাই।
