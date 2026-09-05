# PHASE 19 — কাস্টম-ডোমেইন সেটআপ (প্ল্যান-ডক) · চলমান
> বৈধ: ২০২৬-০৯-০৫ · অংশ: P19 Production/SEO-র প্রথম কাজ — ডোমেইন
> ✅ **সম্পন্ন (২০২৬-০৯-০৫):** ফ্রি-পথ বাছাই — **https://admissionhub.pages.dev** (Cloudflare Pages direct-upload, ০ টাকা) — লাইভ + স্থিতিশীল (HTTP 200, PWA-অ্যাসেট ✓); পুরনো GitHub-Pages ঠিকানা backup-রূপে অক্ষত।

## 🎯 লক্ষ্য-আর্কিটেকচার
```
শিক্ষার্থী → https://<ডোমেইন>              (ফ্রন্টএন্ড — GitHub Pages, CF-DNS-এর পেছনে)
              https://api.<ডোমেইন>          (API — admission-gk worker-এর কাস্টম-ডোমেইন)
```
- ফ্রন্টএন্ড এখনো GitHub Pages-এই থাকবে (কাজ নেই, ইতিমধ্যে CI-built); Cloudflare DNS `CNAME → sheikhrashel47-stack.github.io` (apex-এ CNAME-flattening)
- `api.<ডোমেইন>` → Cloudflare Workers **কাস্টম-ডোমেইন** → `admission-gk` (same worker, নতুন রুট/রিডাইরেক্ট লাগবে না — hostname-বাইন্ডিং)
- SSL: Cloudflare Universal SSL অটো (ফ্রি, অন্তর্ভুক্ত); HTTP→HTTPS রিডাইরেক্ট অটো

## ✅ প্রাপ্যতা-যাচাই (রেজিস্ট্রি-RDAP, ২০২৬-০৯-০৫)
| ডোমেইন | অবস্থা | CF-Registrar দাম (at-cost)* |
|---|---|---|
| admissionhub.com | ❌ নেওয়া | — |
| admission-hub.com | ❌ নেওয়া | — |
| admihub.com | ❌ নেওয়া | — |
| admissionhub.net | ❌ নেওয়া | — |
| myadmissionhub.com | ❌ নেওয়া | — |
| **admissionhub.org** | ✅ **খালি** | ~$8.50 ১ম বছর / $11.20 রিনিউ |
| **study-admission.com** | ✅ **খালি** | $10.46 (একই রেট রিনিউ) |
| **admihub.xyz** | ✅ **খালি** | ~$12.30 |
| **admissionhub.live** | ✅ **খালি** | ~$23.20 |
| admissionhub.co | ✅ খালি | CF-এ $30 (অন্য-রেজিস্ট্রারে ১ম বছর সস্তা) |
| admissionhub.site | ✅ খালি | CF-এ $27.70 (ব্যয়বহুল) |
| admissionhub.top | ✅ খালি | CF-সাপোর্ট-নিশ্চিত নয় (Porkbun-এ সস্তা) |

\* Cloudflare Registrar = **at-cost** (কোনো মার্কআপ নেই, WHOIS-প্রাইভেসি+DNSSEC ফ্রি, একই জায়গায় DNS+সবকিছু)। দাম রেজিস্ট্রি-হোলসেল-ভিত্তিক — চেকআউটে নিশ্চিত হবেন।

## 💡 ফ্রি-ডোমেইনের বাস্তবতা (গুরুত্বপূর্ণ)
- **Freenom (.tk/.ml/.ga/.cf/.gq) — মৃত:** ২০২৩ থেকে নতুন নিবন্ধন বন্ধ; Freenom ২০২৪-এ ব্যবসা ছেড়েছে (Meta-মামলা; .tk/.cf/.gq অন্য হাতে গেছে; .ml/.ga জাতীয়-কর্তৃপক্ষ নিয়েছে)। ফিরে আসার সম্ভাবনা নেই — Google-এই TLD-গুলো স্প্যাম-ব্ল্যাকলিস্টে, SEO-ক্ষতি। [1](https://www.namesilo.com/blog/en/domain-name-search/the-risks-of-using-free-domains-tk-ml-ga-cf) [2](https://www.getfreedomain.name/domain/tk/)
- **eu.org** — ফ্রি `.eu.org`; তবে আবেদন-অনুমোদন সপ্তাহ-মাস লাগে, সবাই-পায় না।
- **is-a.dev** — ফ্রি `.is-a.dev`; GitHub-PR-ভিত্তিক অনুমোদন, মূলত developers-দের জন্য।
- **উপসংহার:** নির্ভরযোগ্য-পথ = সস্তা-paid ডোমেইন (`admissionhub.org` ~$8.50/বছর — বছরে ~৳১,০০০-১,১০০)। ওয়েবসাইটের পরিচয়+SEO-র জন্য এটাই সঠিক বিনিয়োগ।

## 🪜 যা যা হলো (ফ্রি-পথ)
1. ✅ নাম-বাছাই: `admissionhub` (Pages-সাবডোমেইন) — DNS NXDOMAIN-যাচাইয়ে খালি
2. ✅ `wrangler pages project create admissionhub --production-branch main` — CF-অ্যাকাউন্ট `abb783e4…`-তে
3. ✅ ডিপ্লয়: ২২৭ ফাইল / ১৭MB direct-upload → deployment `29d0837e` (production) — https://admissionhub.pages.dev
4. ✅ যাচাই: পৃষ্ঠা 200 (৪৮৭KB) · sw v185-aigw-fix ✓ · manifest/icon-512/3d-loader ✓ · API workers.dev অপরিবর্তিত (CORS `*`) · পুরনো GitHub-Pages 200 (backup)
5. ⏭️ (ভবিষ্যৎ-ঐচ্ছিক) নিজের `.com`-ডোমেইন কিনলে: CF-Zone+DNS CNAME + Pages custom-domain এক-ক্লিক — কোড-বদল লাগবে না (সব রেফারেন্স relative)

## 🪜 ধাপ-ক্রম (ভবিষ্যৎ-কাস্টম-ডোমেইন, মালিক + আমি)
1. **মালিক:** নাম-বাছাই → Cloudflare অ্যাকাউন্টে ডোমেইন কেনা (CF Registrar-এ at-cost) OR অন্য-রেজিস্ট্রারে (Porkbun/Namecheap) কিনে CF-তে NS-বদল
2. **মালিক/আমি:** CF API-টোকেন (`Zone:Edit` + `Workers:Edit`; অথবা মালিক নিজে ড্যাশবোর্ডে) — জোন-যোগ → DNS-রেকর্ড:
   - `@` → CNAME `sheikhrashel47-stack.github.io` (proxied)
   - `www` → CNAME `sheikhrashel47-stack.github.io` (অথবা রিডাইরেক্ট)
   - `api` → Workers-ডোমেইন → `admission-gk`
3. **আমি (রিপো-কাজ):**
   - রিপো-রুটে `CNAME` ফাইল (নাম-উঠানোর পরে) → GitHub Pages কাস্টম-ডোমেইন-সেটিং
   - ফ্রন্টএন্ড WORKER-কনস্ট্যান্ট `api.<ডোমেইন>`-এ বদল (৭ ফাইল, এক-লাইন-প্রতি: ah-ai-client/study-ai-tool/ai-explain-tool/cloud-content-sync/gk-agent-tool/onboarding + notification-hub-ঐচ্ছিক) — টোকেন/কুকি origin-নির্ভর নয়, localStorage — তাই মাইগ্রেশন-ঝুঁকি নেই
   - `docs/PHASE-19-SEO.md`-র অংশ (robots/sitemap) ডোমেইন-পরে
4. **যাচাই:** https://<ডোমেইন> → অ্যাপ লোড · login/AI/সিঙ্ক · https://api.<ডোমেইন>/api/health ✓ · api-এ পুরনো `admission-gk.admissionhub.workers.dev` চলতেই থাকবে (backward-compat)

## 🚨 STOP-শর্ত
- ডোমেইন কিনতে **আমি পারব না** (পেমেন্ট মালিকের) — কেনা/CF-অ্যাক্সেস মালিকের হাতে; তারপর তত্ত্বাবধান+কোড-কাজ আমার।
- পুরনো URL ভাঙা যাবে না — মাইগ্রেশন additive (শেষ-ধাপে backup-verify)।
