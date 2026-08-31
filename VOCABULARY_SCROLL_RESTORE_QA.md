# Vocabulary Card Scroll Restore QA

## Fix

Vocabulary category cards now expose a stable `data-vm-record-id` anchor. The module tracks the card currently visible near the reading viewport, stores its ID plus scroll fallback in the existing session resume snapshot, and restores the anchored card after the category list is rendered. Search and category changes clear the anchor so a deliberate new view is not overridden.

## Runtime evidence

On the local sandbox origin, 40 D-category QA records were used without touching production data. The `Disperse`-position card (`qa-scroll-33`) was scrolled into view, the app navigated to `exam`, then returned to `vocabulary-master/category/D`. Before leaving, scrollY was 27,537; after return, scrollY was 27,521 and the same card's top was 15.64px from the viewport top. The stored snapshot contained `cardId: qa-scroll-33`, `category: D`, `visible: 36`, and the original top fallback.

## Validation

`node --check vocabulary-master-tool.js`, `test_vocabulary_card_flash.js`, and `git diff --check` passed. The fix does not write exam results or alter Vocabulary data; it only uses the existing session resume mechanism for temporary view state.
