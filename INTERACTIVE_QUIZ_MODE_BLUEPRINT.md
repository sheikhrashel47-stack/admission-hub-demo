# Admission Hub — Source-Locked Interactive Quiz Mode Blueprint

## 1. Product Definition

Admission Hub-এর নতুন Course system হবে **Interactive Quiz Mode**। এটি e-book reader বা সাধারণ PDF viewer হবে না। শিক্ষার্থী কোনো topic নির্বাচন করলে সেই topic-এর source PDF অনুযায়ী একটি guided quiz learning path খুলবে। প্রতিটি ধাপে ছোট concept, example, visual cue, question, instant feedback এবং revision থাকবে।

সিস্টেমের মূল নীতি হলো: **একটি common quiz engine, কিন্তু প্রতিটি course-এর জন্য আলাদা learning format**। তাই সব Course একই রকম card, lesson order বা question pattern-এ বাধ্য হবে না। Biology, Grammar, Mathematics, ICT বা Bangla—প্রতিটি বিষয় তার নিজের source structure অনুযায়ী interactive হবে।

> Original source হলো authority। Interactive layer source content বুঝতে সাহায্য করবে, কিন্তু source-এর verified content replace করবে না।

## 2. Non-Negotiable Rules

প্রথম নিয়ম হলো source isolation। প্রতিটি Course-এর নিজস্ব `courseId`, data pack, question namespace, lesson map এবং progress key থাকবে। একটি Course-এর question, explanation, diagram বা answer অন্য Course-এ merge হবে না। Main Question Bank-এ কোনো Course question automatically ঢুকবে না।

দ্বিতীয় নিয়ম হলো source traceability। প্রতিটি quiz item-এর সঙ্গে `sourcePage`, `sourceSection`, `sourceBlockId` এবং প্রয়োজনে bounding box বা crop reference থাকবে। কোনো reconstructed visual বা explanation verify করা না গেলে সেটি authoritative content হিসেবে দেখানো যাবে না; সেখানে **View Original Source** action থাকবে।

তৃতীয় নিয়ম হলো no silent omission। PDF-এর কোনো section quiz-এ ব্যবহার করা না হলে coverage report-এ তা স্পষ্ট থাকবে। কোনো page, table, diagram, example, rule, list বা MCQ silently বাদ দেওয়া যাবে না। Quiz-এর বাইরের source material-এর জন্য Course Map-এ `Covered`, `Reference Only` বা `Pending Verification` status থাকবে।

চতুর্থ নিয়ম হলো course-specific design। Common UI primitives থাকতে পারে, কিন্তু Course profile নির্ধারণ করবে lesson sequence, interaction type, feedback style, difficulty progression, diagram behavior এবং result analysis। ফলে সব Course দেখতে ও পড়তে একরকম হবে না।

## 3. Student Experience Flow

শিক্ষার্থী Dashboard থেকে **Interactive Courses** খুলবে। প্রথমে category দেখা যাবে—যেমন বাংলা, English, Science, Mathematics বা অন্য subject। Category-এর ভিতরে source-locked Course card থাকবে। Card-এ Course title, source status, lesson count, quiz count, progress এবং last visited lesson দেখা যাবে।

Course খুললে e-book page নয়, একটি **Interactive Course Map** দেখা যাবে। সেখানে source topic অনুযায়ী lesson path থাকবে। প্রতিটি lesson-এর progress তিন ভাগে দেখানো হবে: `Learn`, `Practice`, এবং `Mastery`। শিক্ষার্থী চাইলে আগের completed lesson আবার করতে পারবে এবং যেকোনো lesson-এর source reference দেখতে পারবে।

একটি lesson-এর সাধারণ flow হবে:

| ধাপ | উদ্দেশ্য | সম্ভাব্য interaction |
|---|---|---|
| Concept Card | মূল ধারণা বোঝানো | tap-to-reveal definition, key rule |
| Visual Explain | structure বা relation বোঝানো | diagram step, highlight, matching |
| Guided Question | শেখার সঙ্গে সঙ্গে পরীক্ষা | one-answer MCQ, true/false, ordering |
| Instant Feedback | ভুল বা সঠিক বোঝানো | green/red state, correction, explanation |
| Mini Challenge | concept প্রয়োগ | scenario, classification, pair matching |
| Lesson Result | lesson mastery মাপা | accuracy, weak area, retry |

এটি e-book-এর মতো page scroll করবে না। বরং ছোট, focused quiz steps থাকবে, যাতে শিক্ষার্থী পড়ার বদলে actively answer করে শেখে।

## 4. Course-Specific Format System

প্রতিটি Course চালু করার সময় একটি `courseProfile` থাকবে। এই profile engine-কে বলে দেবে কোন Course কীভাবে উপস্থাপিত হবে। Common engine শুধু অনুমোদিত interaction render করবে; নিজে থেকে কোনো generic lesson বা fabricated content বানাবে না।

উদাহরণস্বরূপ:

| Course type | উপযুক্ত lesson pattern |
|---|---|
| Bangla Grammar | Rule → Example → বিভক্তি/বিগ্রহ selection → MCQ → trap correction |
| English Grammar | Definition → sentence highlight → error detection → rewrite choice → quiz |
| Mathematics | Formula → worked step → missing-step question → calculation → timed challenge |
| Biology | Labelled diagram → part identification → function match → concept MCQ |
| History/GK | Timeline → event ordering → statement verification → source-linked quiz |
| ICT | Process flow → sequence ordering → terminology match → application question |

একই interaction primitive একাধিক Course ব্যবহার করতে পারবে, কিন্তু content, order, labels, feedback এবং visual context Course-specific থাকবে।

## 5. Supported Interactive Question Types

প্রথম release-এ সবচেয়ে নির্ভরযোগ্য types আগে আসবে। পরে source অনুযায়ী optional types চালু হবে।

| Type | কীভাবে কাজ করবে | কখন ব্যবহার হবে |
|---|---|---|
| Four-option MCQ | Question Bank-এর মতো চারটি option, instant feedback | Exam facts, rules, definitions |
| True/False | statement যাচাই | concept checking |
| Select-all | একাধিক সঠিক option নির্বাচন | feature/list/classification |
| Pair Matching | দুই column-এর item match | term-definition, পদ-বিগ্রহ, part-function |
| Order/Sequence | item সঠিক ক্রমে সাজানো | process, timeline, grammatical steps |
| Identify from Visual | diagram-এর marked area নির্বাচন | Biology, Geography, diagrams |
| Fill the Missing Step | formula বা explanation-এর missing অংশ নির্বাচন | Mathematics, grammar, logic |
| Scenario Choice | context দেখে best answer নির্বাচন | applied learning |
| Confidence Check | answer-এর পর confidence নির্বাচন | metacognition ও revision priority |

প্রতিটি type-এ keyboard accessibility, mobile touch target, disabled-after-submit state, retry policy এবং source reference থাকবে। কোনো PDF-তে diagram না থাকলে diagram interaction জোর করে তৈরি করা হবে না।

## 6. MCQ Experience

Four-option MCQ card-এর visual এবং interaction contract existing Question Bank-এর সঙ্গে সামঞ্জস্যপূর্ণ হবে। প্রশ্নের header-এ question number, course family, source status এবং progress থাকবে। চারটি option card-এর প্রতিটিতে A/B/C/D label থাকবে।

উত্তর দেওয়ার সঙ্গে সঙ্গে selected option red বা green হবে, correct option প্রকাশ হবে, explanation দেখা যাবে এবং source page reference থাকবে। উত্তর দেওয়ার পর option পরিবর্তন করা যাবে না; প্রয়োজনে `Retry Question` বা `Practice Again` action থাকবে। Bookmark এবং personal note Course namespace-এ থাকবে।

Course MCQ-এর data কখনো `CACHE.questions`, main Question Bank history বা global exam result-এ automatically লেখা হবে না। ভবিষ্যতে user চাইলে আলাদা explicit import action থাকতে পারে, কিন্তু default behavior হবে সম্পূর্ণ isolated।

## 7. Feedback, Hint, Retry এবং Mastery

ভুল হলে শুধু “Wrong” দেখানো হবে না। Feedback তিন স্তরের হবে:

1. **Immediate correction:** সঠিক উত্তর এবং সংক্ষিপ্ত কারণ।
2. **Source explanation:** সংশ্লিষ্ট source section বা page reference।
3. **Retry reinforcement:** একই skill-এর নতুন verified question বা পুনরায় চেষ্টা।

Hint answer-এর আগে ব্যবহার করা যাবে। Hint কখনো correct answer সরাসরি বলে দেবে না; source-এর relevant clue, rule বা visual highlight দেখাবে। Hint ব্যবহারের কারণে answer correct হলেও mastery score আলাদাভাবে গণনা হবে।

প্রতিটি lesson-এর mastery status হবে `Not Started`, `Learning`, `Practiced`, `Mastered`। Mastered হওয়ার জন্য minimum accuracy, completed interaction এবং ভুল প্রশ্নের পুনরাবৃত্তি—এই তিনটি শর্ত Course profile অনুযায়ী নির্ধারিত হবে।

## 8. Source Reference Design

Interactive quiz-এর প্রতিটি card-এ ছোট **Source** button থাকবে। এটি চাপলে পুরো e-book খুলবে না; বরং সেই প্রশ্নের source page, section বা verified crop একটি modal বা bottom sheet-এ দেখাবে। সেখানে original PDF/page image authority হিসেবে থাকবে এবং `Open Full Source` action থাকবে।

যদি কোনো visual crop তৈরি করা হয়, crop metadata-তে থাকবে:

| Field | উদ্দেশ্য |
|---|---|
| `sourceId` | কোন PDF বা source pack |
| `sourcePage` | মূল page number |
| `sourceBlockId` | নির্দিষ্ট table/diagram/text block |
| `bbox` | page-এর নির্দিষ্ট অঞ্চল |
| `contentHash` | source content বদলেছে কি না |
| `verification` | reviewed/approved/pending |

`verification !== approved` হলে crop-এর পাশে স্পষ্টভাবে `Original Source` দেখাতে হবে। অনুমানভিত্তিক reconstructed block কখনো verified block-এর মতো দেখানো যাবে না।

## 9. Data Schema

প্রতিটি Course আলাদা pack হিসেবে থাকবে:

```js
{
  id: "somas-interactive-v1",
  category: "bangla",
  language: "bn",
  title: "সমাস",
  source: {
    fileName: "source.pdf",
    sha256: "…",
    pages: 102,
    pageAssetPattern: "…",
    authority: "original-pdf"
  },
  profile: {
    lessonStyle: "rule-example-practice",
    enabledInteractions: ["mcq", "matching", "true-false"],
    masteryThreshold: 80
  },
  lessons: [
    {
      id: "lesson-01",
      title: "…",
      sourcePages: [8, 9, 10],
      steps: ["step-01", "step-02"],
      coverageStatus: "verified"
    }
  ],
  steps: [
    {
      id: "step-01",
      type: "concept",
      sourcePage: 8,
      sourceBlockId: "source-p008-block-01",
      verification: "approved"
    }
  ],
  questions: [
    {
      id: "somas-interactive-v1-q-001",
      type: "mcq",
      sourcePage: 73,
      sourceBlockId: "source-p073-q-001",
      options: ["…", "…", "…", "…"],
      answer: 1,
      explanationSource: "source-p073-explain-001"
    }
  ]
}
```

Progress keys হবে `admissionInteractiveCourseV1:<courseId>:progress`, notes হবে একই Course namespace-এ এবং কোনো global Question Bank store ব্যবহার করা হবে না।

## 10. Validation and No-Omission System

কোনো Course publish করার আগে automated validator এবং human visual review—দুইটি বাধ্যতামূলক হবে। Validator শুধু question count দেখবে না; source coverage map-ও পরীক্ষা করবে।

| Validation | Pass condition |
|---|---|
| Source integrity | PDF hash ও declared page count মিলে |
| Page coverage | প্রতিটি source page mapped বা explicitly reference-only |
| Lesson coverage | সব lesson-এর source range valid |
| Block integrity | প্রতিটি interactive block-এর source reference আছে |
| Question integrity | unique ID, valid type, valid answer |
| MCQ integrity | চারটি option, duplicate option নয়, answer valid |
| Explanation integrity | explanation source-linked বা clearly labelled enhancement |
| Course isolation | অন্য Course ID/key/data পাওয়া যাবে না |
| UI fallback | unverified content Original Source দেখায় |
| Visual QA | mobile screenshot-এ text clipping, overflow বা broken Bengali নেই |

Coverage report-এ `Verified`, `Reference Only`, `Needs Review` এবং `Missing` আলাদা status থাকবে। `Missing > 0` থাকলে Course publish করা যাবে না।

## 11. Generated Enhancement Policy

Course engine প্রয়োজন হলে extra practice question তৈরি করতে পারবে, কিন্তু সেটি source question হিসেবে দেখানো যাবে না। প্রতিটি enhanced item-এ `contentOrigin: "enhancement"` এবং সংশ্লিষ্ট source skill reference থাকবে। User interface-এ `Source Practice` এবং `Extra Practice` আলাদা label হবে।

একটি Course-এর source content প্রথমে সম্পূর্ণ map ও verify না করে extra animation, extra MCQ বা decorative diagram যোগ করা যাবে না। Accuracy-এর আগে enhancement নয়।

## 12. Offline এবং Performance Strategy

Dashboard startup-এ কোনো Course pack, PDF, page image বা quiz question fetch হবে না। Course library খুললে শুধু lightweight manifest load হবে। নির্দিষ্ট Course খুললে তার data pack load হবে। Lesson শুরু করলে প্রয়োজনীয় step এবং source reference lazy-load হবে।

Offline cache-এ শুধু user যে Course/lesson খুলেছে তার assets রাখা হবে। সব Course একসঙ্গে precache করা যাবে না। Cache key-তে Course ID ও source version থাকবে, যাতে নতুন PDF version পুরনো content-এর সঙ্গে mix না হয়। Cache quota কম হলে least-recently-used Course asset আগে remove করা যাবে।

## 13. Safety, Recovery এবং Data Preservation

Course update বা removal কখনো main Question Bank, vocabulary, settings, progress বা user profile clear করবে না। Course-specific data migration versioned হবে। কোনো pack corrupt হলে Course শুধু `Source pack unavailable` দেখাবে এবং Dashboard-এ ফেরার action দেবে; পুরো app error screen-এ যাবে না।

Render loop প্রতিরোধের জন্য Course renderer core router-কে আবার trigger করবে না। একটি route-এর একটি render lock থাকবে, এবং lazy load সফল হলে একই route-এর controlled re-render হবে। `renderShell` event থেকে recursive self-render নিষিদ্ধ থাকবে।

## 14. Future PDF Addition Workflow

নতুন PDF যোগ করার workflow হবে:

1. Original PDF fingerprint, page count এবং metadata সংগ্রহ।
2. Page preview ও source index তৈরি।
3. Section, lesson এবং source block map করা।
4. Course-specific profile নির্ধারণ।
5. Verified interaction steps তৈরি।
6. Source question থাকলে আলাদা source question pack তৈরি।
7. Automated coverage validator চালানো।
8. Mobile visual QA এবং interaction QA করা।
9. Staging route-এ test করা।
10. সব `Missing` status শূন্য হলে library-তে publish করা।

এই workflow-এর কারণে একটি Course-এর design অন্য Course-এর উপর copy হয়ে যাবে না। Common engine শুধু নিরাপদ rendering ও storage সুবিধা দেবে; content structure ও learning strategy থাকবে source-specific।

## 15. Recommended First Release Scope

প্রথম production release-এ অতিরিক্ত ৩০০ feature নয়; বরং নির্ভরযোগ্য core রাখা উচিত। Recommended scope হলো Course library, custom course profile, guided lesson path, four-option MCQ, true/false, one visual interaction যেখানে source-এ সত্যিই visual আছে, instant explanation, Source Reference, bookmark/note, retry, lesson result, Course-only progress এবং offline lazy cache।

প্রথম Course সম্পূর্ণভাবে validate হওয়ার পর matching, sequence, diagram hotspot, adaptive revision এবং advanced analytics যোগ করা যাবে। এতে শুরুতেই app ভারী হবে না এবং একটি Course-এর ভুল structure অন্য Course-এ ছড়িয়ে পড়বে না।

## Final Recommendation

Admission Hub-এর জন্য সবচেয়ে ভালো architecture হলো **Source-Locked Course-Specific Interactive Quiz Mode**। এটি e-book নয়, সাধারণ Question Bank-ও নয়। এটি source PDF-এর verified content-কে ছোট interactive learning steps-এ রূপান্তর করবে, কিন্তু original source reference সবসময় available রাখবে।

সিস্টেমের মূল guarantee হবে: **common engine, different course experience; verified content, no silent omission; isolated data, no cross-course mixing।** ১০০% automated reconstruction-এর অবাস্তব প্রতিশ্রুতি না দিয়ে source authority, validator এবং Original Source fallback ব্যবহার করলেই toolটি দীর্ঘমেয়াদে নিরাপদ, scalable এবং সত্যিকারের premium হবে।
