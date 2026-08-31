# Admission Hub Super Version Blueprint

## Product direction

Admission Hub will evolve from a course viewer into a calm, visual, adaptive grammar-learning cockpit. The redesign keeps the existing hash routing and built-in course data contract stable while adding shared presentation primitives and course-level analytics.

## Upgrade layers

| Layer | Objective | Safe implementation |
|---|---|---|
| Course cockpit | Show completion, resume point, attempts, accuracy, bookmarks, weak topics, trend and roadmap | Extend `renderCourseCockpit`; read existing progress/results only |
| Visual lesson system | Make every lesson follow Hook → Rule → Visual → Example → Trap → Recall | Extend the current `visual()` dispatch and slide schema; preserve old branches |
| Motion system | Calm, meaningful feedback without jumping layouts | Animate only `transform`/`opacity`; disable non-essential motion under reduced-motion |
| Smart MCQ | Confidence, option elimination, targeted review and topic-aware feedback | Store additive fields under course progress; never mutate Question Bank data |
| Result intelligence | Separate source/practice score, topic accuracy, weak-topic recommendations and attempt trend | Derive metrics from existing answers and question `family`/`topic` tags |
| Performance | Avoid expensive rerenders and prepare for module loading | Cache derived metrics per render; keep data files static and versioned |

## Visual rules

Cards will use a restrained premium palette, high-contrast text, consistent 8px spacing, 16–28px radii, and shallow layered shadows. Diagrams must explain a grammar relationship rather than decorate it. Animation must be short, interruptible, and stable; no perpetual layout movement is allowed for core reading surfaces.

## Acceptance criteria

The upgrade is complete only when existing course routes continue to work, every course keeps its data, mobile layouts remain readable, browser refresh does not trap the user on a loading state, exam answers still save correctly, and reduced-motion users receive a static equivalent.
