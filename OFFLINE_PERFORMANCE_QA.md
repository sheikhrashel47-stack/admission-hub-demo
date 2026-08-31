# Offline performance QA

## Audit findings

The app was loading 58 external scripts synchronously before this change. The measured external JavaScript footprint was approximately 2.37 MB, and `index.html` was approximately 469 KB. The largest startup assets were the course packs: mass grammar about 883 KB, PDF grammar about 428 KB, four grammar courses about 202 KB, plus the course renderer about 222 KB. These course assets are not needed for Dashboard, Question Bank, Progress, or Exam startup.

The service worker was previously network-first for every same-origin JavaScript, CSS, JSON, and image request. The app also precached `mcq_final.json` (about 966 KB), although the runtime import code is the only consumer and the normal app does not need that file for every offline launch.

## Implemented changes

The six course data packs and course renderer were removed from the blocking script list. A small `course-loader.js` now loads them only when the user opens `courses` or a nested course route; all 22 courses still render after the lazy modules finish loading.

The service worker is now build `v49-offline-first-20260826`. Static same-origin scripts, styles, JSON, images, and fonts use current-build cache first, with network fill and offline fallback. Documents remain network-first so online launches can receive an updated shell. The unused `mcq_final.json` precache entry was removed.

## Local verification

The updated Dashboard loaded without the six course packs; only the 2.75 KB loader was present for course functionality. The browser reported the boot status as ready and the final render as ready. Opening `#courses` loaded all six packs plus the renderer on demand and rendered 22 course cards. The local PWA controller reported `sw.js?v=v49-offline-first-20260826` and cache `admission-hub-shell-v49-offline-first-20260826`.

Automated checks passed: JavaScript syntax checks for `course-loader.js`, `course-tool.js`, and `sw.js`; PDF course validation; all-course integrity; grammar-course validation; mass-pack validation; Vocabulary Card Flash validation; and `git diff --check`.

The nested Determiners course route also passed: the browser reported 22 registered course items, `__courseToolReady === true`, the table was present, and the table overflow was `hidden` for the page-level non-swipe layout. The route loaded the loader, all six data packs, and the course renderer on demand.
