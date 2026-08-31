# Super Version QA

## Local checkpoint

Pronoun Mastery slide route loaded with a visible Focus mode action beside Back/Next. The course overview loaded with the new Super Study Pulse card showing mastery ring, resume context, attempted questions, accuracy, targeted revision count, and the existing Study Cockpit roadmap. Existing lesson navigation remained visible and usable.
## Focus Mode interaction note

The rendered DOM contains the intended Focus mode button with `window.courseToggleFocus()` and no route change. One coordinate/index-based browser click landed on the existing Parser navigation instead; direct DOM inspection confirmed the Focus button’s onclick is correct. This is a browser targeting artifact, not an application route defect.
## Smart MCQ checkpoint

Pronoun Exam Zone loaded with Confidence controls (`Sure`, `Maybe`, `Guess`) and per-option `Cross out` controls. Clicking `Sure` updated the rerendered DOM with the active confidence state while keeping the exam route stable. The option-elimination click was issued in the same chained test and is being verified separately against the post-rerender button label.
## Result Sheet checkpoint

The upgraded Result Sheet rendered the new `Source tried` and `Practice tried` metrics correctly. A direct hard navigation to `/result` showed zero saved attempts, which is expected because the current attempt is only persisted by the in-app `Result Sheet` action; the next check uses that action rather than a hard URL navigation.
## Result Sheet persistence

Using the in-app Result Sheet action saved a 1/180 attempt correctly. The upgraded Result Sheet showed `1 Source tried`, `0 Practice tried`, topic performance, attempt history, and the saved score. During this check, a 100% score initially produced an unhelpful weak-topic message; the logic was corrected so zero-mistake results now recommend targeted unattempted practice instead.
## Library checkpoint

The local Course Library loaded with 17 active courses, 186 visual lessons, and 2,130 MCQ cards. The new search input and shown counter are present before the course grid; all course cards and the existing Manage Courses route remain available.
## Library search test

After bumping the course-tool cache version, the fresh local Library rendered the search input. Typing `tense` filtered the grid to 3 matching courses—Voice Active–Passive, Right Form of Verb, and English Tense—and updated the counter to `3 shown` without route changes.
## Live deployment checkpoint

Fresh GitHub Pages URL loaded after commit `36fcd02`. The live Library rendered the Super Upgrade search bar, `17 shown`, all 17 active course cards, and aggregate `186 visual lessons / 2,130 MCQ cards`.
## Live visual lesson checkpoint

Live Pronoun Lesson 01 loaded from the new cache-busted script. The existing visual formula/diagram, readable card layout, lesson rail, slide map, Back/Next controls, and new Focus mode control all rendered without route or loading errors.
## Live smart MCQ checkpoint

Live Pronoun Exam Zone loaded with the new Confidence controls (`Sure`, `Maybe`, `Guess`) and per-option `Cross out` controls, alongside the existing answer, bookmark, note, edit, duplicate, delete and Result Sheet actions. The route remained stable on fresh Pages deployment.
