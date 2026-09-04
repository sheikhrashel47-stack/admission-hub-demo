# PHASE 01 — EXACT ADMISSION HUB CLONE · ফ্রিজ-ডক

> **অবস্থা: FREEZE সম্পন্ন** · বৈধ: ২০২৬-০৯-০৪ · Golden Rule: এই ডকের বাইরে কোনো রিডিজাইন/সিমপ্লিফিকেশন নয়; প্রতিটি বদল additive + টেস্টেড, অথবা Owner-অনুমোদিত।

## ১. উদ্দেশ্য
পাবলিক অ্যাপ = admission-hub clone। এই ডকটি পাবলিক-সারফেসের ফ্রোজেন ইনভেন্টরি + নিষিদ্ধ-সারফেস-তালিকা।

## ২. পাবলিক-পৃষ্ঠা ইনভেন্টরি (লাইভ index.html-অডিট)
মোট render-পথ: **37** · স্ক্রিপ্ট-মডিউল: **69**
- **ড্যাশবোর্ড/নেভ** (4): renderDashboard | renderShell | renderStartupLoading | renderLazyToolFallback
- **প্রশ্নব্যাংক** (7): renderQuestionBank | renderQuestionDetail | renderTopicDetail | renderSubjectDetail | renderQuestionExplorerResults | renderQuestionForm | renderOrphanExplorer
- **এক্সাম সেন্টার** (9): renderExamCenter | renderExamSetup | renderExamRunning | renderMockRunning | renderMockPagedRunning | renderFlashRunning | renderFlashSummary | renderExamResult | renderResultView
- **ইতিহাস/প্রগ্রেস** (6): renderHistory | renderHistoryDetail | renderProgress | renderAnalytics | renderCalendar | renderPlan
- **ভুল-ব্যাংক** (1): renderMistakes
- **সেটিংস/অন্যান্য** (1): renderSettings
- **AI-টুলস** (2): renderAIChat | renderFormatter
- **ইমপোর্ট** (7): renderImportHome | renderImportBulkText | renderImportFile | renderImportJSON | renderImportPreview | renderImportQuestions | renderImportSuccess
- **অন্যান্য render-পথ** (0): 

## ৩. PWA/শেল-অবস্থা
- manifest.webmanifest: name/short_name/start_url/display standalone/icons(192,512)/lang bn · sw.js BUILD_ID `v181-kvfix-20260904` (ক্যাশ-ভার্সনিং + update-check) · session-persist (রুট+স্ক্রল) · guest-first auth-ux

## ৪. নিষিদ্ধ-অ্যাডমিন-সারফেস — যাচাই-ফল
- purser / adminPanel / qbManage / apiConfig / ADMIN_TOKEN / wrangler / .admin. লাইভ index.html-এ **০ ঘটনা** (অডিট-স্ক্রিপ্ট, ১৮১১+ লাইন স্ক্যান)
- একমাত্র হিট `deleteQuestion(id)` (লাইন ১৮১১) — **স্টুডেন্ট-নিজস্ব পাসনাল ব্যাংক এডিটর** (নিজের ইমপোর্ট করা প্রশ্ন মুছা/সম্পাদনা), গ্লোবাল-কন্টেন্ট ম্যানেজমেন্ট নয়। **Decision D-P01-1:** এটা পাবলিক-ফিচার হিসেবে বহাল — রোডম্যাপের "Question Edit/Delete বাদ" শুধু অ্যাডমিন-পাশের গ্লোবাল-ব্যাংক-কন্ট্রোল বোঝায়।
- API-config: অ্যাপ-লেভেল API-কনফিগ **সার্ভার-সাইড-অনলি**; পাবলিক-এ শুধু ইউজার-নিজস্ব AI-key (BYOK, ঐচ্ছিক ফাস্ট-ইঞ্জিন; সার্ভার-ফ্রি-AI ডিফল্ট)। **Decision D-P01-2:** BYOK সেটিংস বহাল (ব্যক্তিগত, গোপনীয়), গ্লোবাল-কনফিগ-UI নেই।

## ৫. ফ্রোজেন-কন্ট্রাক্ট
| বিষয় | লক |
|---|---|
| হোস্ট | `admission-gk.admissionhub.workers.dev` (একমাত্র) |
| API-প্রিফিক্স | `/api` · auth-এন্ডপয়েন্ট-তালিকা `AUTH_ENDPOINTS_GUARD.test.mjs` |
| বিল্ড-আইডি | sw.js `vNNN-<tag>-YYYYMMDD` (index ↔ sw মিল-বাধ্যতামূলক) |
| রিডিজাইন | না — পলিশ-শুধু (P16-তে আলাদা) |
| টেস্ট-গেট | GUARD · auth-ux · nosplash · session-survive · intro · ai-phase4 |

## ৬. পরবর্তী-ফেজ-বাউন্ডারি
এই ফেজের পরের কাজ P02+; এই ফ্রিজ নতুন বৈশিষ্ট্য যোগে বাধা নয় — ফ্রিজ **গঠন**, বৈশিষ্ট্য-নয়।

