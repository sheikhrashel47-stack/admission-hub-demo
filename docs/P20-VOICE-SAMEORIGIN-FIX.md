# P20 — Vocabulary voice: same-origin path + generate-একবার → অফলাইন-ক্যাশ (v204)

**মালিক (২০২৬-০৯-০৭, স্ক্রিনশট):** "vocabulary card এ voice শুনা যাচ্ছে না… eleven labs এর api দেওয়া আছে… এক ক্লিকে generate হয়ে গেলে ২য় বার আর generate করতে হবে না, অফলাইনেও চলবে" (টোস্ট: "Voice generate হয়নি — বিল্ট-ইন voice চলছে")।

## আসল-কারণ (৩টি, প্রমাণ-সহ)
| # | কারণ | প্রমাণ |
|---|------|--------|
| ① | **voice-worker-এর CORS-allowlist-এ `pages.dev` ছিল না** — শুধু `*.github.io` + localhost | voice-worker.js `corsHeaders()` — pages.dev-পেজ-থেকে-সরাসরি-ডাকা → ব্রাউজার "Failed to fetch" → টোস্ট |
| ② | **মালিক-নেটে `*.workers.dev` ব্লক** (P15-এ-ই-প্রমাণিত) | P15-সেশন-নোট |
| ③ | **hub-অ্যাপের (admission-hub) এন্ডপয়েন্ট `admission-voice.<পুরনো-সাবডোমেইন>.workers.dev` — মৃত** | সরাসরি-টেস্ট: HTTP 000 (DNS-নেই); একই-সময়ে-লাইভ-worker-`admission-voice.admissionhub.workers.dev`-থেকে-সত্যিকারের-MP3 (HTTP 200 · audio/mpeg · 3.6 KB) |

নোট: ক্লায়েন্ট-পাইপলাইন (IndexedDB-ব্লব-ক্যাশ → এক-ক্লিক-জেনারেট → দ্বিতীয়-ক্লিক-ক্যাশ → অফলাইন-প্লেব্যাক) **আগে-থেকেই-নকশায়-ছিল** — শুধু generate-ই-হত-না, তাই-ক্যাশে-কিছু-জমা-হতো-না।

## ফিক্স (v204)
| ফাইল | কী-করা |
|---|---|
| `_worker.js` (Pages Advanced) | `/api/voice*` → `admission-voice.admissionhub.workers.dev` (same-origin-পথ); বাকি `/api/*` → মূল-worker (অটুট) |
| `vocabulary-elevenlabs.js` (demo) | ডিফল্ট-এন্ডপয়েন্ট → **same-origin** (`''` → `fetch('/api/voice')`); পুরনো `*.workers.dev` সেভ-ভ্যালু → স্বয়ংক্রিয়-মাইগ্রেশন (`localStorage`-থেকে-সরানো); `voiceOff` ('off') আলাদা-অর্থ (বিল্ট-ইন-only); স্পষ্ট-এরর-টোস্ট (`__lastVoiceError`-সহ কারণ) |
| `voice-worker.js` (source) | CORS-allowlist-এ `*.pages.dev` যোগ (মূল-ফিক্স; same-origin-পথের-পরেও-সঠিক) — **ডিপ্লয়-নোট:** CF-worker-এ-এই-ফাইল-আবার-deploy-করলে-সরাসরি-পথ-ও-সুস্থ-হবে (পরবর্তী-সুবিধার্থে) |
| hub (`admission-hub`) | এন্ডপয়েন্ট → লাইভ `admission-voice.admissionhub.workers.dev` + `.workers.dev`-মাইগ্রেশন + ভুঁই-একই-এরর-টোস্ট |

## লাইভ-ভেরিফিকেশন (২০২৬-০৯-০৭, v204 লাইভ)
- `POST https://admissionhub.pages.dev/api/voice` + `X-AH-App: admission-hub` → **HTTP 200 · audio/mpeg · 3675 B · আসল MPEG-layer-III অডিও** (ফোনের-ঠিক-একই-পথ: পেজ → CF-Pages `_worker.js` → voice-worker → ElevenLabs; কোনো-CORS/workers.dev-নির্ভরতা-নেই)।
- মার্কার-লাইভ: `sw?v=v204-gfix-20260907` · `vocabulary-elevenlabs.js?v=el-voice-v106`-এ `DEFAULT_ENDPOINT=''` (same-origin) + `.workers.dev`-মাইগ্রেশন-উপস্থিত।
- (নোট: `X-AH-App`-হেডার-ছাড়া-403 `{"error":"forbidden"}` — voice-worker-এর-অ্যান্টি-অ্যাবিউজ; ক্লায়েন্ট-হেডার-পাঠায়, প্রক্সি-পাস-থ্রু — ঠিক-আছে।)
- hub-রিপো: রিমোটে-আগেই-ফিক্স-ছিল (`15c4096` — ডেড-এন্ডপয়েন্ট-সরানো+প্লে-পার্সিস্টেন্স); তার-উপরে `c82c9c9` — যাচাই-করা-লাইভ-এন্ডপয়েন্ট-ডিফল্ট + মাইগ্রেশন + স্পষ্ট-এরর (`?v=el-voice-v107`)।

## যাচাই
- p20-voice-sameorigin.test.mjs **৭/৭** (স্থির-যাচাই: _worker-রুট · same-origin-ডিফল্ট · মাইগ্রেশন · allowlist-pages.dev · hub-লাইভ-এন্ডপয়েন্ট · v204-অখণ্ডতা · **রানটাইম-jsdom**: ১ম-ক্লিক `generated` → ২য়-ক্লিক `cache` (fetch-সংখ্যা ১-ই) → `navigator.onLine=false`-এ-ও `cache`-থেকে-বাজে)।
- পূর্ণ-স্যুট **২৪-ফাইল ০-ব্যর্থ** (AUTH-GUARD-সহ — কোনো-মৃত-host-লিটারেল-নেই)।
- ভার্সন: `el-voice-v106` (index+sw, demo+hub) · `sw v204-gfix-20260907`।

## মালিক-কে-বুঝিয়ে-বলা
- ভয়েস-ফ্লো: 🔊 ক্লিক → (অ্যাপ-প্রক্সির-পথে-পেজ-থেকে) ElevenLabs-অডিও → **একবারই**-নামে → IndexedDB-তে-ব্লব-সেভ → পরের-ক্লিকে-নেট-দরকার-নেই → **অফলাইনেও-বাজে** (টোস্ট: "✓ Voice saved — এখন অফলাইনেও বাজবে")।
- আগে-কেন-হত-না: দুটি-পথ-বন্ধ-ছিল (CORS + পুরনো-মৃত-এন্ডপয়েন্ট) — দুটোই-এখন-বন্ধ-না-করে-সোজা-খোলা।
- ফোনে-২-বার-রিফ্রেশের-পরে-ভোকাব-কার্ড-থেকে-পরীক্ষা।
