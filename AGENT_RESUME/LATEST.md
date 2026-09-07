# LATEST — v204 (P20: vocabulary voice same-origin+অফলাইন-ক্যাশ) PUSHED ⏳
- commit `0533d48`+docs; **CI ৩/৩**; লাইভ-প্রমাণ: `POST pages.dev/api/voice` (X-AH-App-সহ) → **200/audio-mpeg/আসল-MP3**; মার্কার v204+el-voice-v106; স্যুট ২৪-ফাইল ০-ব্যর্থ; p20 ৭/৭ (রানটাইম: generate-একবার → ২য়-ক্লিক নেট-০ → অফলাইন-ও-বাজে); `sw v204-gfix-20260907`; `el-voice-v106` (demo+hub)।
- P20 (মালিক স্ক্রিনশট: 'vocab-কার্ডে voice শুনা যাচ্ছে না — এক-ক্লিকে-জেনারেট-হয়ে-২য়-বার-না, অফলাইনে-চলে'): ① voice-worker-CORS-allowlist-এ pages.dev-নই (শুধু-github.io/localhost) → pages.dev-থেকে-"Failed to fetch"; ② মালিক-নেট-workers.dev-ব্লক (P15); ③ hub-এন্ডপয়েন্ট-মৃত (HTTP-000; লাইভ-worker-থেকে-MP3-প্রমাণ-পেয়েছি-200/audio-mpeg)। ফিক্স: _worker.js `/api/voice`→voice-worker(সেম-অরিজিন) + ক্লায়েন্ট-ডিফল্ট-same-origin+মাইগ্রেশন+স্পষ্ট-এরর; voice-worker-allowlist+=pages.dev(ডিপ্লয়-নোট); hub→লাইভ-এন্ডপয়েন্ট।
- **মালিক-ফোনে-করণীয়:** ২-বার-রিফ্রেশ → Vocab-কার্ড 🔊 → '✓ Voice saved — অফলাইনেও বাজবে'।
- GitHub-Activity: hub-repo-(admission-hub)-ফিক্স-কমিট-করা-হয়েছে-(ক্লোনে); রিমোট-পুশ-স্ট্যাটাস-নিচে।

- **মালিক-রিপোর্ট-২ "হচ্ছে না" — উপসংহার:** সার্ভার-দুই-হোস্টেই-নতুন+লাইভ-প্রমাণিত; ফোন-স্টেল-SW-চালাচ্ছে (Parser-ট্যাব-প্রমাণ)। করণীয়: ২-বার-বন্ধ-খোলা / site-data-clear / private-ট্যাব-ডায়াগনস্টিক। যাচাই-চিহ্ন: নেভ-Profile (Parser-নয়)।
