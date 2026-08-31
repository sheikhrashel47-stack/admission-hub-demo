# Inspection notes

- Repository is a vanilla static GitHub Pages app: `index.html` plus many ordered JavaScript patches; no `package.json` or build system.
- Active scripts in `index.html` include `qbank-redesign.js`, `phase3-intelligence.js`, `phase3-question-bank-route.js`, `reward-quest-upgrade.js`, `mcq-qbank-import.js`, and others.
- Deployed app dashboard has bottom navigation: Home, Bank, Parser, Exam, History, Progress.
- Current deployed Question Parser route is `#smart-formatter`, titled “Smart Formatter 2.0”. It currently presents one textarea (`#p5Raw`) with a placeholder MCQ and one “Detect & format” button. Copy says it auto-detects JSON, plain text, or HTML-like input, but there is no visible format selector or file input in the inspected view.
- Current parser is implemented in `phase3-systems.js` (runtime UI) and `mcq-qbank-import.js` (automatic seed import of `mcq_final.json` into IndexedDB). Existing question records use `options: string[4]` and numeric `answer` index, with `subjectId` and `topicId`.
- Requirements additionally include Reward Shop/inventory/effects/XP integration and full Subject → Topic → Question management from the second attachment.

Live verification after commit `b8a1cee`: GitHub Pages loaded the dashboard, but the `#smart-formatter` route still rendered the previous Smart Formatter UI (textarea `#p5Raw`, no new format selector/file input). This indicates either GitHub Pages deployment has not propagated yet, the page is serving an older cached `index.html`, or the new script failed to load/execute. Further console/network diagnosis is required before declaring feature verification complete.

After Pages propagation, live verification succeeded. The deployed `#smart-formatter` route now renders the new Question Parser with a four-option format selector (HTML/TXT/Plain Text/JSON), file input, paste textarea, Detect & Preview, and Open Question Bank controls. Commit `b8a1cee` is live on GitHub Pages.

Parser interaction QA on live Pages: pasted two MCQs, clicked Detect & Preview, and verified `Total Questions: 2`, `Valid: 2 · Needs Review: 0`, both sample questions with mapped answers/subject/topic, plus `Confirm Import (2)` and `Discard Preview` controls.

Live QA: Question Bank route displays stable Subject hierarchy with Add Subject, search, Import Parser, Add Question, Rename/Delete controls. Exam Center displays separate Mock Test and Flash Test modes; the existing configuration flow remains available for option randomization and is supplemented by session-lock metadata in the new patch.
