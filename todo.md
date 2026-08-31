# Vocabulary Master integration

- [x] Existing Admission Hub routing, storage, Mock এবং Flash handoff contract পর্যালোচনা করা।
- [x] Native Vocabulary Master entry ও minimal landing navigation যোগ করা।
- [x] Offline vocabulary schema, A–Z Bank, incremental large-list rendering ও details বাস্তবায়ন করা।
- [x] Parser preview, edit, validation, duplicate-safe import ও A–Z classification যোগ করা।
- [x] Lightweight vocabulary practice বাস্তবায়ন করা এবং existing Mock/Flash engine handoff করা।
- [x] Mobile/performance/data-safety regression যাচাই, GitHub Pages deploy ও live check করা।

## Vocabulary Master mobile crash hotfix

- [x] Legacy/incomplete vocabulary records-এর জন্য relation fallback যোগ করা।
- [x] Parser, Bank, detail, practice ও test paths-এ safe record normalization যাচাই করা।
- [x] Mobile crash-recovery QA, GitHub Pages hotfix deploy ও live check করা।

## A–Z grid and Bengali parser hotfix

- [x] Vocabulary empty হলেও A–Z category grid দৃশ্যমান রাখা।
- [x] বাংলা serial, parser labels ও inline Tips format সমর্থন করা।
- [x] User-provided parser sample ও empty mobile Bank QA করে GitHub Pages deploy করা।

## Bulk parser section-assignment hotfix

- [x] Multi-record input-এ word boundary ও section boundary robust করা।
- [x] Synonyms, Antonyms ও Tips প্রতিটি bulk record-এ ঠিকমতো attach করা।
- [x] Large preview, no-auto-save safety ও live deployment যাচাই করা।

## Bilingual Vocabulary relation-card redesign

- [x] Reference অনুযায়ী বড় word header ও Bengali meaning hierarchy করা।
- [x] Synonyms ও Antonyms-কে Bengali meaning-সহ পৃথক numbered relation boxes করা।
- [x] Tips card, mobile type scale, live QA ও GitHub Pages deployment সম্পন্ন করা।

## Vocabulary Practice Selection & Setup Engine

- [x] Existing practice modes, session model ও valid vocabulary requirements পর্যালোচনা করা।
- [x] Dynamic source/category, bounded custom selector ও real available count বাস্তবায়ন করা।
- [x] Practice type, question count, time, randomization ও validation setup screen তৈরি করা।
- [x] Timed practice handoff, no-repeat policy, summary ও existing Mock/Flash separation নিশ্চিত করা।
- [x] Mobile/data-safety QA, regression check, GitHub Pages deploy ও live verification করা。

## Exam History result filter hotfix

- [x] Saved exam result-এ correct, wrong ও unanswered filter state/handler চিহ্নিত করা।
- [x] History result review filter hotfix ও new/old result regression QA করা।
- [x] GitHub Pages deploy ও live verification করা।

## Notes question review redesign

- [x] Notes data model, source/category filters ও existing card flow পর্যালোচনা করা।
- [x] Subject/topic filter এবং four-option question review card পুনর্গঠন করা।
- [x] User answer/correct answer state ও collapsible AI Explain action যোগ করা।
- [x] Mobile QA, data-safety check, GitHub Pages deploy ও live verification করা।

## Notes subject-to-topic drill-down navigation

- [x] Notes route, subject grouping ও topic grouping flow পর্যালোচনা করা।
- [x] Subject grid → Topic page → topic-specific question review route তৈরি করা।
- [x] Mobile navigation, AI Explain এবং data-safety QA করে GitHub Pages deploy করা।

## Notes answer-state card refinement

- [x] Saved selected answer fallback ও correct/wrong option state পর্যালোচনা করা।
- [x] Wrong option red, correct option green, larger type এবং compact card layout করা।
- [x] Mobile QA, GitHub Pages deploy ও live verification করা।

## Notes compact subject/topic page hotfix

- [x] Subject ও Topic page-এর redundant summary header চিহ্নিত করা।
- [x] Subject/Topic route থেকে বড় summary header সরিয়ে compact list navigation করা।
- [x] Mobile QA, GitHub Pages deploy ও live verification করা।

## Admission tools blueprint PDF

- [x] বর্তমান Admission Hub toolset ও admission workflow gap পর্যালোচনা করা।
- [x] সবচেয়ে প্রয়োজনীয় পাঁচটি নতুন tool নির্বাচন ও priority নির্ধারণ করা।
- [x] প্রতিটি tool-এর implementation blueprint লিখে বাংলা PDF তৈরি করা।

## Memorizing matching exam engine

- [x] Reference video interaction ও existing Vocabulary/বিরচন data schema পর্যালোচনা করা।
- [x] Vocabulary ও বিরচন category/topic selection এবং matching session design করা।
- [x] Mobile-first pair-matching engine, answer feedback ও result flow তৈরি করা।
- [x] Data-safety/regression QA, GitHub Pages deploy ও live verification করা।

## Memorizing Match strict batch hotfix

- [x] New video behaviour ও existing Question Bank subject/topic metadata পর্যালোচনা করা।
- [x] Subject/topic/count/time setup এবং category-specific pair detection rules তৈরি করা।
- [x] Strict 5×5 two-column batch matching ও all-matched-next-batch flow করা।
- [x] Real-data QA, data cleanup, GitHub Pages deploy ও live verification করা।

## Memorizing Match game-card and detection hotfix

- [x] Mobile board-এর card size, hierarchy ও game-feel visual system পর্যালোচনা করা।
- [x] Real Question Bank-এর বাগধারা ও বিরচন question-answer format scan করে robust pair extraction rules করা।
- [x] বড় responsive game cards, selection feedback ও category-specific detection update বাস্তবায়ন করা।
- [x] Mobile real-data QA, user-data safety check, GitHub Pages deploy ও live verification করা।

## Global question-card game visual refresh

- [x] Mock, Flash, Notes, Bank ও review surface-এ question-card location ও existing state map করা।
- [x] Memorizing Match-inspired shared layered card visual rules design করা।
- [x] সব question-card-এ বড় card, number badge, layered depth ও preserved correct/wrong/selected states প্রয়োগ করা।
- [x] Mobile regression QA, user-data safety check, GitHub Pages deploy ও live verification করা।

## Question option spacing and safe performance hardening

- [x] Flash, Mock, Bank ও review option box spacing/typography এবং current render/load path audit করা।
- [x] No-data-loss performance safeguards ও stale-render prevention design করা।
- [x] সামান্য option spacing/text refinement এবং low-risk performance safeguards বাস্তবায়ন করা।
- [x] Mobile/high-question-count regression QA, GitHub Pages deploy ও live verification করা।

## Question Bank persistent game-card style fix

- [x] Video ও Question Bank delayed render lifecycle দেখে style reset-এর root cause নির্ণয় করা।
- [x] Existing game-card appearance ধরে রাখার minimal persistent attachment fix তৈরি করা।
- [x] Question Bank delayed render, paging ও interaction QA করে GitHub Pages-এ live verification করা।

## Mock lock and real-data result insight dashboard

- [x] Mock answer selection, clear-control এবং submit-to-result scroll flow ভিডিওসহ audit করা।
- [x] Mock answer lock ও result top-position behaviour minimal change-এ design করা।
- [x] Real subject/topic/live-progress/four-exam comparison data model এবং 200+ deterministic insight templates design করা।
- [x] Premium result summary cards, diagrams, animation, mock lock এবং top-of-result flow বাস্তবায়ন করা; Question Review অপরিবর্তিত রাখা।
- [x] Mock/result/empty-history regression QA, user-data safety check, GitHub Pages deploy ও live verification করা।

## Skipped answer visibility in result and history review

- [x] Skipped review renderer ও saved History result path audit করা।
- [x] Skipped correct option-এর persistent green visibility fix বাস্তবায়ন করা।
- [x] Fresh result ও History review regression QA, GitHub Pages deploy ও live verification করা।

## PWA launch no-flash and live-dashboard handoff

- [x] Video ও initial boot/cache-load/render lifecycle audit করা।
- [x] Black/stale/zero-data flash ছাড়া Preparing screen থেকে live dashboard handoff design করা।
- [x] Launch shell, data-ready gate ও current-data first render বাস্তবায়ন করা।
- [x] Cold launch/cache reload QA, user-data safety check, GitHub Pages deploy ও live verification করা।

## PWA and live website data continuity investigation

- [x] Add to Home Screen ও live website origin/service worker/IndexedDB isolation audit করা।
- [x] Data-loss ছাড়া viable shared sync বা migration architecture নির্ধারণ করা।
- [x] Safe sync/migration implementation, conflict handling ও bi-directional update QA করা।
- [x] GitHub Pages deploy ও live verification করা।

## Approved private online sync and recovery

- [x] Private account identity, data-version ও conflict-resolution rules চূড়ান্ত করা।
- [x] Protected online data service provision ও static Admission Hub integration design করা।
- [x] One-time PWA migration, automatic background sync ও recovery control বাস্তবায়ন করা।
- [x] Two-context/offline/conflict QA, GitHub Pages deploy ও migration verification করা।

## Vocabulary search stability and input sizing

- [x] Vocabulary search typing-এর সময় rerender/scroll/layout jump-এর root cause চিহ্নিত করা।
- [x] Search input বড় করা এবং focused typing position stable রাখা।
- [ ] Real Vocabulary search QA, GitHub Pages deploy ও live verification করা।

## Settings cleanup, feedback controls and Command Center entries

- [x] Settings থেকে AI Assistant-related UI/settings data এবং Exam Defaults UI সরানো।
- [x] Visual Feedback, Success Effects ও Error Effects toggle state এবং working effect path fix করা।
- [x] Vocabulary search jump/keyboard behaviour video অনুযায়ী stable করা ও search input বড় করা।
- [x] Your Command Center থেকে Progress, Mistakes Bank ও Smart Revision entries সরিয়ে future empty slots রাখা।
- [ ] Existing tools/data regression QA, GitHub Pages deploy ও live verification করা।

## Tools layout, navigation polish and Vocabulary pronunciation

- [x] Video audit করে Recently Deleted Questions, Notes ও Vocabulary Master card spacing/position fix করা।
- [x] Global back/home navigation route, viewport reset ও transition jump root cause fix করা।
- [x] Vocabulary word, synonym ও antonym-এর subtle card-integrated pronunciation controls যোগ করা।
- [ ] Mobile keyboard/navigation/pronunciation/data-safety regression QA, GitHub Pages deploy ও live verification করা।

## Legacy Open Study Tools card regression

- [x] Dashboard-এ ফিরে আসা legacy Open Study Tools injection/source permanentভাবে সরানো।
- [x] New Study Tools cards intact রেখে GitHub Pages live verification করা।

## New Command Center tools blueprint

- [x] New Progress, Mistakes Bank ও Smart Revision tool-এর real-data scope ও user journey blueprint তৈরি করা।
- [x] Visual design, interaction flow, empty state, safety rule ও implementation order নির্দিষ্ট করা।
- [ ] User approval-এর পরেই selected blueprint অনুযায়ী code implementation শুরু করা।

## Vocabulary pronunciation polish

- [x] Word, synonym ও antonym card-এর pronunciation icon inline compact position-এ নেওয়া。
- [x] Device-supported natural English voice preference ও speech quality fallback improve করা。
- [ ] Mobile Vocabulary card size, tap target ও pronunciation regression QA করা。
- [x] Vocabulary card click-এর legacy detail page ও Practice/Mock/Flash extra flow বন্ধ করা。

## Vocabulary sound system replacement

- [x] Video-reported Vocabulary interaction issue ও current sound failure root cause audit করা।
- [x] Current pronunciation implementation পুরো remove করে reliable all-word sound system বসানো।
- [ ] Mobile sound coverage, card interaction ও error-free regression QA করা।

## Result page interaction polish

- [x] Topic Focus card tap-এ abrupt jump-এর বদলে smooth anchored scroll করা।
- [x] Expanded Question Review card tap করলে collapse/expand toggle কাজ করানো।
- [ ] Result filters, skipped-answer labels ও question review data অপরিবর্তিত রেখে mobile regression QA করা।

## Today Command Center live progress

- [x] Current MCQ goal, daily progress ও study-time storage/render paths audit করা।
- [x] Settings-based MCQ goal configuration এবং premium Today Command Center card implement করা।
- [x] Question Bank, Vocabulary ও Exam active-time থেকে real live study-time/progress tracking implement করা।
- [x] Daily reset, inactive-tab pause, dashboard isolation, data-safety QA ও GitHub Pages live verification করা।
- [x] Settings goal injection ও live tracker global-state binding correction deploy/verify করা।

## Cross-tool navigation resume workflow

- [x] Vocabulary এবং অন্য tool থেকে navigation/Home ব্যবহার করলে prior study context ও scroll position safely restore করা।
- [x] Dashboard-only Home semantics এবং active tool resume behavior আলাদা করে regression QA করা।

## Today Command Center visual refinement

- [x] Dashboard-এর অন্য layout/data না বদলে Today Command Center card-এর premium visual hierarchy, spacing ও mobile readability redesign করা।

## Cross-tool resume regression

- [x] Video-matched Vocabulary deep route → other bottom tabs → Home flow-এ resume কেন dashboard-এ reset হচ্ছে root-cause নির্ণয় ও fix করা।
- [x] All bottom navigation tabs-এর resume route ও scroll restore mechanism actual live interaction-এ verify করা।

## Exact resume state and smoothness

- [x] Vocabulary ও other tool-এর exact category/search/visible-list/scroll state snapshot করে resume করা।
- [x] Navigation observers ও repeated render work audit করে unnecessary loading/hang কমানো এবং smoothness regression QA করা।

## App-wide reward engine proposal

- [x] Real Question Bank, Vocabulary, Mock, Flash, streak ও study-time data থেকে reward engine rules এবং dedicated Rewards tool blueprint তৈরি করা।
- [x] User-provided 50-reward implementation prompt দিয়ে reward engine build approval দেওয়া হয়েছে।

## Offline-first 50-reward achievement engine

- [x] Existing reward remnants retire করে one-currency XP state এবং 50 static reward definitions/data migration design করা।
- [x] Real Question Bank, Mock, Flash, Vocabulary, Mistake, daily goal ও streak activity থেকে idempotent reward events integrate করা।
- [x] Reward Center, dashboard summary, next-three-rewards এবং subtle accessible unlock state build করা।
- [x] Offline persistence, cloud-sync compatibility, anti-farming, performance and regression QA করা।
