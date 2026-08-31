# Course Tool Removal QA

The existing Course tool and built-in Course data were removed from the runtime. The loader, renderer, all nine Course data packs, Course-specific test files, source folders, and Course-only QA/hand-off files are no longer present.

The index no longer loads `course-loader.js`; the dashboard command center no longer contains the Course tile. A cache-busted local Dashboard reload rendered the remaining command center with **12 tools**, while Bank, Mock, Quick, Progress, Mistakes, Goals, Revision, History, Search, Settings, Inbox and More remained available. The Dashboard rendered without the deleted Course runtime references.

The index service worker registration now uses `v50-course-clean-slate-20260826`, and `sw.js` uses the same build ID so old Course asset caches are invalidated on update.

All remaining JavaScript files passed `node --check`, `git diff --check` passed, and a repository search found no runtime references to `course-tool`, `course-loader`, `ensureCourseModules`, `__admissionExtraCourses`, or `courses/`.
