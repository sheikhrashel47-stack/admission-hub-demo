# Startup Loading QA

The cache-busted local app was reloaded at `#dashboard` after the single-loading patch. The final DOM contained **0** `.app-loading` elements after boot, the Dashboard command center was visible, `body.app-booting` was false, the Course tile count was 0, and the captured runtime error count was 0. The rendered command center showed 12 remaining tools.

The static launch shell and boot-time loading path now share the same `Preparing your study space…` markup. The former alternate `Preparing your saved study space…` render path was removed, preventing duplicate loading text. The `app-booting` background rule keeps the viewport on the mint app background during boot instead of exposing a black blank screen.
