# Gemini integration findings

Gemini app URL: https://gemini.google.com/app

The live response headers include `x-frame-options: DENY`. Therefore Gemini cannot be loaded inside an iframe on the Admission Hub GitHub Pages origin. The safe browser-compatible implementation is same-tab navigation to Gemini so the browser Back button returns to Admission Hub. The app will copy the concise prompt first, then navigate to Gemini; the user pastes and sends it there manually.

Prompt redesign target: no related questions; no greeting, roleplay, repetition, or long context; Bengali response in 5–10 short lines, ideally 80–120 words; six compact sections: কেন ভুল, সঠিক নিয়ম, Exam Trap, মনে রাখার কৌশল, ১টি ছোট উদাহরণ, Final takeaway. The model must preserve the supplied correct answer, use only supplied source/explanation, and briefly flag ambiguity or conflict instead of inventing facts.


Local v6 QA checkpoint (2026-08-16): Question Bank topic loaded successfully; Gemini-only modal route is active, Related questions/Telegram UI are absent, and the app-style #gemini wrapper renders with Back, Copy, and Gemini buttons. Gemini website itself remains external because its response header is X-Frame-Options: DENY.
