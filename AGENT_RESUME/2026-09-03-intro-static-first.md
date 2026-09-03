# Resume — 2026-09-03 · 🎬 INTRO STATIC-FIRST FIX (ভাইয়ের ফোনে simple splash আসছিল)

## সমস্যা
ভাইয়ের ফোনে admission-hub-demo-তে **সিম্পল splash** (সবুজ বক্স + "Admission Hub" + "তোমার স্টাডি স্পেস প্রস্তুত হচ্ছে…") দেখাচ্ছিল — 3D intro আসছিল না। কারণ: 3D scene **আলাদা splash-3d.js ফাইলের উপর নির্ভরশীল** — ডিভাইসে ওই স্ক্রিপ্ট mount হয়নি (পুরনো SW/cache/env-জনিত), তাই inline prefill fallback-ই থেকে যেত। **scene প্রথম-পেইন্টে static থাকা দরকার — JS-এর উপর জিরো নির্ভরতা।**

## ফিক্স — STATIC-FIRST 3D INTRO (index.html inline)
1. **সম্পূর্ণ 3D scene-এর markup এখন index.html body-র `#ahSplash`-এ inline** (`<div class="ahfs-scene ahfs-play ahfs-idle" data-played="1" role="status">` + hero tile, spark, ৬ floating objects, ২ orbit ring + nodes, ৩-স্তর platform, particles) — **কোনো JS ছাড়াই প্রথম পেইন্টেই পুরো 3D intro**, CSS-ই প্রবেশ-টাইমলাইন চালায়।
2. **সম্পূর্ণ splash CSS এখন `<style id="ah-splash3d-css">` হিসেবে head-এ inline** (keyframes, timeline, idle float, reduced-motion, extras) — external CSS/ফাইল-লোডের প্রয়োজন শূন্য।
3. `renderStartupLoading()` fallback-ও এখন full static scene দেয় (একই guarantee)।
4. splash-3d.js-এ `sceneMarkup`/`styleCSS` API expose (duplicate-না — মার্কআপ এক উৎস); mount() existing scene-এ duplicate করে না (`data-played` গার্ড)।
5. **boot()-এ render-check watchdog:** dismiss()-এর ৩ সেকেন্ড পরেও #app-এ `.page`/`.app-fallback` না থাকলে `__admissionRenderRoute`/`render()` আবার — prefill-এ আটকে থাকা অসম্ভব।
6. sw `v176-introfix-20260903` + `splash3d-v3` + APP_SHELL sync; guard regex + `introfix`।
7. Extra CSS: `#app>.app-loading{display:block;min-height:100dvh;padding:0}` (double-grid/overflow বন্ধ), ছোট ভিউপোর্ট (max-height:640px)-এ সংকুচিত stage — landscape/SE-তে layout ভাঙে না।

## টেস্ট
- **intro.test.mjs (আসল index.html দিয়ে) — ১৮/১৮ ✅** — বিশেষ করে: "FULL 3D scene inline (JS ছাড়াই)" — কোনো `<script>` না চললেও scene উপস্থিত; ৬ obj, tile, ring, platform, বাংলা copy, NO demo data, reduced-motion CSS, mount duplicate নয়, dismiss-পর never-blank।
- splash.test.mjs ৮/৮ ✅ · node --check ✅ · AUTH guard demo PASS (v176 index+sw sync) ✅

## স্থিতি
commit+push (demo only) → Pages live verify (index-এ inline scene + style + v176)। main app অক্ষত।
