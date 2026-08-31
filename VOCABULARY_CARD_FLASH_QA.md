# Admission Hub — Vocabulary Flash and Card UI Final QA

## Release summary

The Vocabulary Card Flash generator now treats the primary Bengali meaning as a single foundation question. It does not repeatedly ask the same Bengali meaning in different direct templates. The remaining questions are selected dynamically from the card's available synonym, antonym, acronym/abbreviation, reverse word–meaning, stored pair and usable explanation data. No new synonym, antonym or meaning is invented outside the vocabulary record and available distractor bank.

## Question-generation rules

| Rule | Final behavior |
|---|---|
| Primary Bengali meaning | Exactly one direct question for the card's main Bengali meaning. |
| Reverse meaning | Separate skill: Bengali clue to English word, with rotated wording allowed because the direction is different. |
| Synonym data | Synonym identification, near-meaning recognition, source-word relation, Bengali synonym meaning and Bengali-gloss reverse questions are available when the card contains those fields. |
| Antonym data | Antonym identification, opposite-word relation, source-word relation and Bengali antonym meaning are available when those fields exist. |
| Acronym data | Acronym/short-form identification, abbreviation relation and Bengali expansion questions are available only for cards containing acronym data. |
| Context data | Explanation/tips can produce context identification questions only when the text is meaningful and not a placeholder. |
| Distribution | Anchor questions are selected first, then relation families receive weighted rotation based on available source data. Remaining valid candidates are used only as a fallback. |
| Duplicate protection | Prompt-plus-answer fingerprints, family/answer caps and case-insensitive option uniqueness prevent exact or repetitive questions. |
| Integrity | Every final question must have four distinct options and the correct answer must be present in those options. If 20 valid questions cannot be prepared, the app refuses to fabricate filler and shows a Bengali notice. |

The generator keeps metadata for question type, difficulty, source word and source data so future revision features can use the structure without changing the current no-save Flash boundary.

## Other completed updates

The course renderer no longer applies arbitrary mid-word wrapping to course content. The Parts of Speech table slide now keeps labels such as `Noun`, `Pronoun`, `Adjective` and `Conjunction` intact, presents the three-column material as a readable table and uses horizontal scrolling on narrow screens when required. Vocabulary cards use a premium 16:9 memory-image area, keep pronunciation as the primary visible action, and place Flash, image upload, image replacement/removal and AI prompt copy inside the `•••` menu. Uploaded images are resized and compressed into an offline data URL, so the card can display them without a remote image request.

## Runtime QA

On the isolated local origin, the seeded `qa-abandon` card completed a full temporary session with exactly 20 questions, 20 unique prompt texts, one direct Bengali-meaning question, 10 synonym questions, 5 antonym questions, 3 reverse-meaning questions and 2 pair questions. The acronym-bearing `qa-ability` card completed another 20-question session with one direct Bengali-meaning question and 3 acronym/abbreviation questions. Both sessions reached the temporary result page without errors.

The Flash result remains memory-only. It does not write answers, score, progress, history, Question Bank or exam results to storage. The only intentional persistent action in this release is a user's explicit memory-image upload or removal.

## Automated validation

| Check | Result |
|---|---|
| `node --check course-tool.js` | PASS |
| `node --check vocabulary-master-tool.js` | PASS |
| `node --check vocabulary-pronunciation.js` | PASS |
| `node test_vocabulary_card_flash.js` | PASS |
| `node test_all_course_integrity.js` | PASS |
| `git diff --check` | PASS |
| Course totals | 17 unique courses, 186 lessons, 2,130 MCQs |
| GitHub Pages workflow | SUCCESS for commit `9dca7d5` |

Live inspection confirmed that the deployed page loads `vm-native-v19-card-image-menu` and `pronunciation-native-v3-natural-voice`. The sandbox browser's production-origin Vocabulary Bank is empty, so no user vocabulary was added or changed during live QA.
