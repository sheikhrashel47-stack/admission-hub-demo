# Experience Studio runtime findings

Local file route loaded the new shared store, theme engine, and animation engine successfully. The runtime catalog counts were 61 themes and 100 animations, with no active item initially.

Theme engine verification passed: applying `theme-001` set the root `--bg` token to `#07111f` and set the active theme dataset marker; removing the theme restored the original inline state and removed the marker.

Fresh reload after adding cards passed: 61 themes, 100 animations, and 50 cards were present; all three engines were exposed and no recorded Studio runtime errors were present.

Asset-enabled shell rendering passed: All experiences showed 211 configured assets, Visual experience showed 111 (61 themes + 50 cards), Interactive experience showed 100, and Dashboard Themes showed 61 assets with named preview cards.

Local purchase-state test passed. A real-priced theme correctly returned `insufficient-funds` with no ownership. A zero-price test mutation could be purchased, applied, marked active, removed, and reset to unowned; removal restored the null active state.

Card engine verification passed: `MCQ Orbit Card` applied its CSS token, click interaction marked a real `.card` node as `selected`, and remove cleared the active marker. Card Styles category rendered all 50 named card variants with preview surfaces and purchase prices.

Complete-suite console review showed only pre-existing local-file-origin warnings: service-worker registration is unsupported on `file://`, and the existing MCQ import fetch cannot run from the local file origin. No Studio script error appeared.

Actual hook test passed: `navigate` and `dbPut` were wrapped non-destructively, an active `Command Press` animation fired on a real Studio asset target through the action bridge, and the UI Preview modal Purchase button successfully created ownership before test state reset.

Dashboard regression passed: Experience Studio entry exists as the last Dashboard child (index 9 of 10), the navigation bar remains exactly six tabs with no Studio tab, and no reward-card/rail/control selectors were present on Dashboard.

Reward Shop regression passed: runtime showed all 200 reward numbers, collection state `2/200`, preview-first shopping text, first controls as `Preview · Need ...`, no Studio elements in the Reward route, and no Studio tab in the six-item navigation.

Studio route isolation passed: route `#experience-studio` rendered 211 asset cards with 61 themes, 100 animations, and 50 cards; Dashboard command-center text and Reward Atelier text were absent; no Dashboard entry card or navigation bar was rendered on the Studio route.

HTTP-origin regression passed without Studio errors. Console showed normal AI Mentor load and the existing MCQ importer successfully added verified questions; no file-origin service-worker warning appeared on HTTP.

A live-like timing issue was found: the Dashboard renderer could inject its Study Hub card before the Studio hash renderer ran. The shell now removes `[data-study-hub-dashboard-card]` and `[data-experience-studio-entry]` after rendering Studio. Local HTTP retest passed with 211 asset cards, one Studio root, zero Study Hub cards, and zero Dashboard Studio entries.

Final live verification after commits `b359372` and `49565ff` passed: GitHub Pages rendered Studio with 211 asset cards, 61 themes, 100 animations, 50 cards, zero Study Hub/Dashboard cards, zero Studio entries inside the Studio page, and zero navigation-bar Studio tabs.

Final live Dashboard verification passed: Studio entry was the last Dashboard child (index 9 of 10), the navigation bar remained exactly six tabs without Studio, and reward control selectors remained at zero.

Final live Reward Shop verification passed: 200 reward numbers, `0/200` collection, Preview-first shopping text, My Rewards & Tutorials button, first reward control `Preview · Need 150 XP`, six navigation tabs without Studio, and zero Studio elements on the Reward route.

Category-only update local HTTP verification passed: initial Studio view rendered exactly 3 configured category buttons and 0 asset cards with the `Choose a category` prompt. Clicking Animations rendered 100 cards, Card Styles rendered 50, Dashboard Themes rendered 61, and returning to no category restored 0 cards.

After the category-only change, local Dashboard regression still passed: the Studio entry remains the last child at index 9, navigation remains six tabs with no Studio tab, and reward control selectors remain zero.

Pages build for commit `ab7aa3f` completed at 03:21:37Z. The CDN briefly served the prior shell, then propagated. Final live reload now shows only 3 configured category buttons—Animations (100), Card Styles (50), Dashboard Themes (61)—with 0 asset cards and the `Choose a category` prompt.

Final live category-click verification passed: initial category-only view had no All button and 0 asset cards; clicking Dashboard Themes showed exactly 61 asset cards while the 3 category buttons remained available.

Vocabulary leakage source was `vocabulary-master.js`, which appends a `[data-vocabulary-tool]` card asynchronously from its Dashboard hook. Studio cleanup now removes that marker via its MutationObserver only while the Studio route is active. Local delayed-injection test passed: zero Vocabulary cards/text, one Studio root, zero asset cards by default, and 3 category buttons.

Dashboard preservation test passed after the cleanup: `[data-vocabulary-tool]` remains present with the original Vocabulary Master text, the Studio entry remains the last Dashboard child, and navigation remains six tabs.

Final live verification after commit `886ab22` passed: Studio contains zero `[data-vocabulary-tool]` cards and zero `Vocabulary Master` text, while the category-only state remains intact with 3 buttons, 0 asset cards, and the `Choose a category` prompt.

Local category-page navigation passed: clicking Dashboard Themes changed the hash to `#experience-studio/dashboard-themes`, changed the header to Dashboard Themes, showed a Back to categories button, hid the category panel, and rendered exactly 61 theme cards on the separate screen.

The first live click was still on the prior inline build because the Pages build for `ea1e92b` was still building. The build then completed at 03:29:42Z, and the deployed shell source now contains the `experience-studio/` subroute and `experienceStudioOpenCategory` navigation code.

After changing the Studio script URL from `?v=2` to `?v=3`, the final live verification passed: clicking Dashboard Themes changed the hash to `#experience-studio/dashboard-themes`, showed `Back to categories`, hid the category panel, and displayed 61 theme cards on the separate page. The earlier inline behavior was caused by the browser's cached old shell script, not the new route logic.

Live Back flow passed: from `#experience-studio/dashboard-themes`, Back returned to `#experience-studio`; the category panel and 3 buttons returned, asset cards reset to 0, and both Vocabulary and Dashboard-entry leakage remained 0.

Live Dashboard regression after separate category-page publish passed: Vocabulary Master remains present, Studio entry remains the last Dashboard child, navigation remains six tabs without Studio, Studio nodes are zero on Dashboard, and reward control selectors remain zero.

Live Reward Shop regression after separate category-page publish passed: page shows 200-reward collection, My Rewards & Tutorials, Preview-first text, no Studio nodes, and no Studio asset text.

Storage/visual improvement local verification: HTTP-origin Studio loaded without the previous full-page storage screen. The theme gallery visibly uses multiple archetypes (angled, dashed, grid, diagonal, rounded, split, prism, organic). A simulated IndexedDB block passed: `useMemoryStorage` enabled the fallback, `dbPut` and `dbGet` worked in memory, and the original DB handle was restored.

Card/animation local verification: Card Styles renders 50 items with multiple visible variant treatments (crest, spine, archive, vault, prism, selected, capsule, notification, etc.). Animations renders 100 items with distinct glyphs and motion labels (orbit, shimmer, rise, slide, ring, pulse, recoil, glow, settle, lift) rather than one identical preview.

Actual engine verification passed: theme #3 applied with `data-experience-theme-mode="mode-3"`, a prism card applied with `data-experience-card-variant="prism"`, and animation #8 applied and fired on submit with a distinct `data-es-animation-mode="2"`; all engines were then removed cleanly.

Live verification after commit e471aac passed: Dashboard Themes page showed 61 assets; the page used script versions themes v2, animations v2, cards v2, shell v4; all 8 theme preview modes appeared; no `Storage not available` text was present.

Live Dashboard regression after e471aac passed: Vocabulary Master remains, Studio entry is still the last Dashboard child, navigation is six tabs with no Studio tab, Studio nodes are zero on Dashboard, reward controls are zero, and the storage error screen is absent.

Live Reward Shop regression after e471aac passed: 200-reward collection, My Rewards & Tutorials, Preview-first shopping are present; storage screen is absent; Studio nodes and Studio text are absent from Reward Shop.

Media preview verification: The modal now opens a live 3D-style stage with pointer tilt, Replay live, Screenshot and 6s video controls. A missing stage marker was found during testing and fixed; Screenshot then produced a generated PNG image plus Download screenshot link. The 6-second video button produced a playable video element and Download 6s video link in the local HTTP runtime.

Animation modal verification passed: live stage and target existed, actual `es-animation-099` keyframe with 343ms duration was running on the target, the real trigger label was REWARD, and Replay live, Screenshot and 6s video controls were present.

Card modal verification passed: the live card stage rendered the crest variant with its mark and three ornaments, had Replay live/Screenshot/6s video controls, and kept the purchase gate visible for unowned assets.

Live media preview verification after b0c2d92 passed: live Theme modal had a 3D scene, Replay live/Screenshot/6s video controls, purchase gate, 61 asset cards, shell version v5, no Storage not available screen. The generated video was verified in local runtime; live final check focused on the new controls and shell deployment.

Level-unlock verification: At profile Level 1, Dashboard Themes showed no prices; early assets were UNLOCKED with Apply and later assets showed LOCKED · LV N. Aether Crown preview showed Required level Level 6, Status Locked · Current Level 1, and a disabled Unlocks at Level 6 control while live media preview remained available. In a local simulated profile Level 6, Aether Crown became unlockable; modal Apply activated it and XP/Gold/Diamond remained unchanged at zero. The catalog item price field was ignored by the new store.

Live level-unlock verification after 4392478 passed: current profile Level 1 showed no asset prices; Level 1-eligible items displayed UNLOCKED with Apply, while Aether Crown displayed LOCKED · LV 6. Its live modal showed Required level Level 6, Status Locked · Current Level 1, and Unlocks at Level 6, while Replay/Screenshot/6s video remained available.

Post-deploy regression after 4392478 passed: live Dashboard retained Vocabulary Master, the Experience Studio entry at the bottom, and exactly six navigation tabs (Home, Bank, Parser, Exam, History, Progress); no reward rail/control or Studio asset controls appeared on Dashboard. Live Reward Shop retained 200-item catalog, My Rewards & Tutorials, and purchase-gated Preview · Need ... states; no Studio controls appeared there.
