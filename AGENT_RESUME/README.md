# 🤖 Agent Resume System — Admission Hub (Public)

> **এই ফোল্ডারই নতুন এজেন্টের প্রথম ঠিকানা।** প্রতি আপডেট শেষে এখানে বিস্তারিত resume লেখা হয়,
> যেন পরবর্তী যে কোনো এজেন্ট repository-র এক্সেস পেয়ে শেষ অবস্থা আর পরবর্তী কাজ এক নজরে বুঝতে পারে।

---

## 📖 নতুন এজেন্ট — এভাবে পড়ো

1. **প্রথমে `LATEST.md` পড়ো** — সর্বশেষ অবস্থা, চলমান কাজ, STOP পয়েন্ট, লাইভ লিংক।
2. **তারপর সবচেয়ে নতুন ডেটেড resume ফাইল** (`YYYY-MM-DD-*.md`) — সাম্প্রতিক আপডেটের বিস্তারিত।
3. **কাজ শেষে নিচের নিয়মে resume লিখে commit + push করো।**

> কন্ট্রোল (ব্যাকএন্ড/মালিক অ্যাপ) সোর্স `admission-hub` repo-তে — সেখানেও একই `AGENT_RESUME/` সিস্টেম আছে।

---

## 📁 ফোল্ডার ম্যাপ

| ফাইল | কাজ |
|---|---|
| `README.md` | এই গাইড |
| `LATEST.md` | **সর্বশেষ অবস্থা** — প্রতিটি resume লেখার সময় আপডেট করতে হবে |
| `YYYY-MM-DD-slug.md` | তারিখভিত্তিক resume — প্রতিটা আপডেট/কাজের বিস্তারিত রেকর্ড |

---

## ✍️ প্রতিটি আপডেট শেষে resume লেখার নিয়ম

প্রতি আপডেট (feature, fix, deploy, content, phase — যেকোনো meaningful কাজ) শেষে এটি **বাধ্যতামূলক**:

1. নতুন ফাইল: `AGENT_RESUME/YYYY-MM-DD-সংক্ষিপ্ত-নাম.md`
2. `LATEST.md` আপডেট করে নতুন অবস্থা ও exact STOP point দেখাও
3. বদলানো ফাইল, চালানো test-এর ফল, deploy/live verification এবং pending কাজ লিখো
4. commit message-এ resume ফাইল অন্তর্ভুক্ত করো
5. authorized remote/config থাকলে `git push origin main` — না থাকলে exact access blocker লিখো; remote বা deploy success invent করো না
6. configured secret-safe Telegram integration থাকলে completion notification পাঠাও; না থাকলে exact blocker লিখো, secret paste চাইবে না

> ২০২৬-০৯-০৮ থেকে এই ধারার দায়িত্বে Agent **জুজু**। অন্য Agent দায়িত্ব নিলে প্রথমে `LATEST.md` ও সর্বশেষ dated resume পড়ে existing state থেকেই কাজ চালাবে।

### Resume ফাইলের কাঠামো (টেমপ্লেট)

```markdown
# [তারিখ] — [কাজের শিরোনাম]

## ✅ যা করা হলো
- (কি কি আপডেট/ফিক্স/ফিচার হলো — বিস্তারিত)

## 📂 বদলানো ফাইল
- (প্রতিটা ফাইলের নাম + কী বদলালো)

## 📌 বর্তমান অবস্থা
- (কোন ফেজে আছি, কী লাইভ, কী পেন্ডিং)

## ⏭️ পরবর্তী কাজ
- (নতুন এজেন্টের জন্য পরিষ্কার টাস্ক লিস্ট)

## 🚨 STOP / সতর্কতা (যদি থাকে)
- (যেমন: 'PHASE 3 APPROVED' ছাড়া Phase 4 শুরু করবে না)
```

---

## 🔐 গুরুত্বপূর্ণ

- **Infisical Admission Hub-এর centralized secret source:** `Infisical → authorized environment → application/Worker/agent`; development, staging ও production আলাদা থাকবে এবং component-specific path/least privilege ব্যবহার হবে।
- Existing Infisical configuration, connected integration, environment এবং required secret availability আগে inspect করতে হবে; available authorized access নিজে consume করে implementation চালাতে হবে।
- **টোকেন/সিক্রেট কখনো resume-তে লেখা যাবে না** — repo public GitHub-এ থাকে।
- User-কে কখনো API key, bot token, OAuth secret, private key, `.env` বা password chat-এ paste করতে বলা যাবে না।
- Existing environment, secret manager, connected integration, authenticated CLI/session ও project configuration আগে inspect করতে হবে; securely configured credential থাকলে সেটিই ব্যবহার করতে হবে।
- Secret unavailable হলে invent/bypass না করে শুধু `BLOCKED — REQUIRED_SECRET_NOT_CONFIGURED` protocol-এ integration, binding name, expected location এবং completed implementation লিখতে হবে।
- একই security warning নতুন incident ছাড়া repeat করা যাবে না; security guardrail হবে, কাজ থামানোর অজুহাত নয়।
- সত্য status vocabulary: `IMPLEMENTED`, `TESTED`, `BLOCKED`, `DEPLOYED`, `VERIFIED`; যা হয়নি তা দাবি করা যাবে না।
- Default order: Existing Access → Inspect → Implement → Test → Verify → Deploy → Report।
- Resume-তে secret value নয়, কেবল binding/configuration name লেখা যায়।
- `AGENT_RESUME.md` (root) পুরোনো সিস্টেম — এখন থেকে শুধু এই ফোল্ডারই follow করো।

## 📜 ইতিহাস

| তারিখ | resume | কী হয়েছিল |
|---|---|---|
| 2026-09-01 | `2026-09-01-resume-system-setup.md` | Resume সিস্টেম স্থাপন (প্রথম রেকর্ড) |
