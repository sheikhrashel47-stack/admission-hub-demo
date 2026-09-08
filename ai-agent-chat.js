/* ✦ ADMISSION HUB AI — Chatbot V1: Premium AI Assistant (agent-f1-ui-chatv1)
 * মালিক-স্পেক ২০২৬-০৯-০৮ (Chatbot V1 Master Spec):
 *   compact header (orb avatar + Online), 3D welcome hero card, dismissible notice,
 *   "Try asking" chips, editorial AI messages (rich renderer: formula/tip/example/
 *   warning/table), interactive Quick-Challenge MCQ card, minimal user bubble (✓✓),
 *   floating capsule composer (+ / mic / send / stop), bottom-sheet attachments +
 *   AI Tools, Copy|Regenerate|👍|👎|⋯ actions, themes (Light/Dark/OLED), menu
 *   (new/rename/search/delete/clear/export), Web-Speech voice-in, same-origin TTS.
 * নিয়ম: কোনো API-key নেই; /api/ai/chat (SSE) কন্ট্রাক্ট অটুট; XSS-safe escape-first।
 */
(function () {
  'use strict';
  if (window.renderAiAgentPage) return;

  const VER = 'chatv1';
  const STORE = 'aiAgentChat:v1';
  const NOTICE_KEY = 'ai_notice_dismissed';
  const THEME_KEY = 'aiChatTheme';
  const NAME_KEY = 'aiChatName';
  const FEED_KEY = 'aiFeedbackLog';
  const MAX_MSGS = 40;
  const MAX_HISTORY = 12;

  const lang = (() => { try { return localStorage.getItem('ahLang') === 'en' ? 'en' : 'bn'; } catch (_) { return 'bn'; } })();
  const T = lang === 'en' ? {
    title: 'Admission Hub AI', sub: 'AI Study Assistant', online: 'Online',
    heroTitle: 'Hey! I am Admission Hub AI',
    heroBody: 'Your admission preparation questions, MCQs, explanations and study support — I am here for all of it.',
    heroCta: 'What shall we work on today?',
    notice: 'AI responses can occasionally contain mistakes. Verify important admission information from official sources.',
    tryAsking: 'Try asking', dont: "Don't show again",
    chips: [
      ['🧠', 'Explain it simply', 'একটা প্রশ্ন বা কনসেপ্ট সহজভাবে বুঝাও'],
      ['📝', 'Make 10 MCQs', 'আমাকে ১০টা MCQ বানাও'],
      ['🎯', 'Quiz me', 'আমাকে quiz নাও — ৫টা প্রশ্ন'],
      ['📊', 'Analyze my performance', 'আমার পারফরম্যান্স analyze করো'],
      ['📚', 'Teach me this topic', 'এই topicটা সহজ করে শেখাও']
    ],
    ph: 'Ask Admission Hub AI...', enterHint: 'Enter = new line · Ctrl+Enter = send', thinking: 'Thinking', understanding: 'Understanding your question...', creating: 'Creating questions...',
    copy: 'Copy', copied: 'Copied', regen: 'Regenerate', speak: 'Speak', save: 'Save', share: 'Share', more: 'More',
    correct: 'Correct', notQuite: 'Not quite', correctAnswer: 'Correct answer', why: 'Why?',
    quizComplete: 'Quiz Complete', accuracy: 'Accuracy', viewAnalysis: 'View Analysis', tryAgain: 'Try Again',
    quickChallenge: 'Quick Challenge', question: 'Question',
    next: 'Next', you: 'You',
    menuNew: 'New chat', menuRename: 'Rename', menuSearch: 'Search conversation', menuExport: 'Export', menuClear: 'Clear messages', menuDelete: 'Delete conversation',
    themeOpt: 'Theme', themeLight: 'Premium Light', themeDark: 'Premium Dark', themeOled: 'OLED Focus',
    addToConv: 'Add to conversation', aiTools: 'AI Tools',
    cam: 'Camera', img: 'Image', doc: 'Document', vid: 'Video', voice: 'Voice', file: 'File',
    tSearch: 'Search', tMcq: 'Create MCQ', tQuiz: 'Quiz Me', tExplain: 'Explain', tAnalyze: 'Analyze', tSummarize: 'Summarize',
    listening: 'Listening', transcribing: 'Transcribing', voiceNope: 'Voice input not supported on this device',
    login: 'Please sign in to use AI chat', loginBtn: 'Sign in', retry: 'Try again',
    err: 'Something went wrong.', offline: 'You are offline', imgTooBig: 'Image must be 3.5MB or smaller',
    docSoon: 'Document understanding is coming soon — I answered based on your text.', liked: 'Thanks for feedback!',
    feedbackQ: 'What went wrong?', fb1: 'Incorrect', fb2: 'Not helpful', fb3: 'Too complicated', fb4: 'Missing information', fb5: 'Other',
    confirmDel: 'Delete this conversation?', cancel: 'Cancel', del: 'Delete', delDone: 'Conversation deleted',
    searchPh: 'Search conversations...', noResults: 'No matches found', emptySearch: 'Clear search', connected: 'Student data connected', publicMode: 'Public mode',
    stop: 'Stop', send: 'Send', attach: 'Add to conversation', savedTip: 'Saved', welcomeSub: 'Ask me anything about your admission preparation.', studying: 'What are we studying today?'
  } : {
    title: 'Admission Hub AI', sub: 'AI Study Assistant', online: 'Online',
    heroTitle: 'Hey! আমি Admission Hub AI',
    heroBody: 'তোমার admission preparation-এর প্রশ্ন, MCQ, explanation আর study support—সবকিছুতেই আমি আছি।',
    heroCta: 'আজ কী নিয়ে কাজ করবো?',
    notice: 'AI উত্তর মাঝে মাঝে ভুল হতে পারে। ভর্তি-সংক্রান্ত গুরুত্বপূর্ণ তথ্য অফিসিয়াল সোর্স থেকে যাচাই করো।',
    tryAsking: 'Try asking', dont: 'আর দেখাবো না',
    chips: [
      ['🧠', 'প্রশ্নটা সহজ করে বুঝাও', 'নিউটনের দ্বিতীয় সূত্রটা সহজ করে বুঝাও'],
      ['📝', '১০টা MCQ বানাও', 'জীববিজ্ঞান থেকে আমাকে ১০টা MCQ বানাও'],
      ['🎯', 'আমাকে Quiz নাও', 'আমাকে quiz নাও — ৫টা প্রশ্ন'],
      ['📊', 'আমার performance analyze করো', 'আমার পারফরম্যান্স analyze করো'],
      ['📚', 'এই topicটা শেখাও', 'সালোকসংশ্লেষণ topicটা সহজ করে শেখাও']
    ],
    ph: 'Ask Admission Hub AI...', enterHint: 'Enter = নতুন লাইন · Ctrl+Enter = পাঠান', thinking: 'Thinking', understanding: 'তোমার প্রশ্নটা বুঝছি…', creating: 'প্রশ্ন বানাচ্ছি…',
    copy: 'Copy', copied: 'কপি হয়েছে', regen: 'Regenerate', speak: 'Speak', save: 'Save', share: 'Share', more: 'More',
    correct: 'Correct', notQuite: 'Not quite', correctAnswer: 'সঠিক উত্তর', why: 'Why?',
    quizComplete: 'Quiz Complete', accuracy: 'Accuracy', viewAnalysis: 'View Analysis', tryAgain: 'Try Again',
    quickChallenge: 'Quick Challenge', question: 'Question',
    next: 'Next', you: 'তুমি',
    menuNew: 'নতুন চ্যাট', menuRename: 'রিনেম করুন', menuSearch: 'কথোপকথন খোঁজো', menuExport: 'Export', menuClear: 'বার্তা মুছো', menuDelete: 'কথোপকথন ডিলিট করুন',
    themeOpt: 'থিম', themeLight: 'Premium Light', themeDark: 'Premium Dark', themeOled: 'OLED Focus',
    addToConv: 'Add to conversation', aiTools: 'AI Tools',
    cam: 'Camera', img: 'Image', doc: 'Document', vid: 'Video', voice: 'Voice', file: 'File',
    tSearch: 'Search', tMcq: 'Create MCQ', tQuiz: 'Quiz Me', tExplain: 'Explain', tAnalyze: 'Analyze', tSummarize: 'Summarize',
    listening: 'Listening', transcribing: 'Transcribing…', voiceNope: 'এই ডিভাইসে ভয়েস-ইনপুট নেই',
    login: 'AI চ্যাট ব্যবহার করতে লগইন করুন', loginBtn: 'লগইন করুন', retry: 'আবার চেষ্টা করো',
    err: 'একটু সমস্যা হয়েছে।', offline: 'ইন্টারনেট সংযোগ নেই', imgTooBig: 'ছবি ৩.৫MB-এর বেশি হবে না',
    docSoon: 'ডকুমেন্ট-বিশ্লেষণ শীঘ্রই আসছে — আপাতত তোমার লেখা থেকে উত্তর দিয়েছি।', liked: 'ফিডব্যাকের জন্য ধন্যবাদ!',
    feedbackQ: 'কী ভুল ছিল?', fb1: 'ভুল', fb2: 'কাজের না', fb3: 'খুব জটিল', fb4: 'তথ্য অনুপস্থিত', fb5: 'অন্যান্য',
    confirmDel: 'এই কথোপকথনটা ডিলিট করবে?', cancel: 'Cancel', del: 'Delete', delDone: 'কথোপকথন ডিলিট হয়েছে',
    searchPh: 'কথোপকথনে খোঁজো…', noResults: 'কিছু পাওয়া যায়নি', emptySearch: 'খোঁজা বন্ধ করো', connected: 'Student data connected', publicMode: 'Public mode',
    stop: 'Stop', send: 'Send', attach: 'Add to conversation', savedTip: 'সেভ হয়েছে', welcomeSub: 'তোমার admission প্রস্তুতি নিয়ে যেকোনো প্রশ্ন করো।', studying: 'আজ কী পড়বো?'
  };

  /* ── themes ── */
  const THEMES = {
    light: { bg: '#F7F9F8', card: '#ffffff', ink: '#16302A', sub: '#5F7A72', primary: '#0E6B4F', mint: '#E4F3EC', line: 'rgba(15,107,79,.14)' },
    dark: { bg: '#0F1714', card: '#182420', ink: '#E8F4EF', sub: '#8FA8A0', primary: '#2FBF8F', mint: '#14332A', line: 'rgba(47,191,143,.18)' },
    oled: { bg: '#000000', card: '#0B0F0D', ink: '#EAF5F0', sub: '#7E968D', primary: '#35D6A2', mint: '#0E1F19', line: 'rgba(53,214,162,.16)' }
  };

  const style = document.createElement('style');
  style.id = 'ai-agent-style';
  style.textContent = `
    .ai-agent-root{--r-s:10px;--r-m:14px;--r-card:18px;--r-l:22px;--r-float:28px;--r-pill:999px;
      min-height:100dvh;display:flex;flex-direction:column;max-width:760px;margin:0 auto;
      background:linear-gradient(180deg,#E9F6EF 0%,var(--ai-bg,#F7F9F8) 240px);color:var(--ai-ink,#16302A);
      font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans Bengali","Hind Siliguri",sans-serif;
      -webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;font-feature-settings:'kern' 1,'liga' 1;
      transition:background .35s ease,color .35s ease;position:relative}
    .ai-agent-root[data-theme=dark]{background:#0F1714;color:#E8F4EF}
    .ai-agent-root[data-theme=oled]{background:#000;color:#EAF5F0}
    .ai-agent-root *{box-sizing:border-box}
    /* ── header ── */
    .ai-agent-head{position:sticky;top:0;z-index:9;display:flex;align-items:center;gap:12px;padding:12px 16px 10px;background:var(--ai-bg,#F7F9F8);border-bottom:1px solid var(--ai-line,rgba(15,107,79,.1));box-shadow:0 6px 18px rgba(23,58,43,.05);transition:background .35s ease}
    .ai-orb{width:44px;height:44px;border-radius:50%;position:relative;flex:0 0 auto;
      background:radial-gradient(circle at 31% 27%,#c9ffe9 0%,#5fd9ae 20%,#1fa87c 47%,#0d5c44 78%,#073827 100%);
      box-shadow:0 8px 20px rgba(13,92,68,.35),inset 0 -7px 13px rgba(0,40,28,.4),inset 0 4px 9px rgba(255,255,255,.5);
      animation:aiOrbFloat 6.5s ease-in-out infinite}
    .ai-orb:after{content:'';position:absolute;left:22%;top:15%;width:13px;height:9px;border-radius:50%;background:rgba(255,255,255,.8);filter:blur(2px);transform:rotate(-20deg)}
    @keyframes aiOrbFloat{50%{transform:translateY(-4px) scale(1.02)}}
    .ai-agent-t{min-width:0;flex:1}
    .ai-agent-t b{display:block;font-size:16px;font-weight:800;letter-spacing:-.01em}
    .ai-agent-t span{display:flex;align-items:center;gap:5px;font-size:11.5px;color:var(--ai-sub,#5F7A72);margin-top:1px}
    .ai-online-dot{width:6px;height:6px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,.16)}
    .ai-icobtn{width:38px;height:38px;border-radius:12px;border:1px solid var(--ai-line,rgba(15,107,79,.14));background:var(--ai-card,#fff);color:var(--ai-ink,#16302A);font-size:16px;cursor:pointer;display:grid;place-items:center;flex:0 0 auto}
    .ai-icobtn:active{transform:scale(.93)}
    /* ── body ── */
    .ai-agent-body{flex:1;overflow-y:auto;padding:14px 14px 6px;scroll-behavior:smooth}
    .ai-hero{position:relative;display:flex;gap:10px;align-items:center;border-radius:var(--r-l);padding:18px 16px;overflow:hidden;
      background:linear-gradient(140deg,#E9F7F0 0%,#DFF3EA 55%,#EAF9F3 100%);border:1px solid rgba(15,107,79,.12);animation:aiIn .4s ease both}
    .ai-agent-root[data-theme=dark] .ai-hero{background:linear-gradient(140deg,#12332A,#0F2A22 55%,#144033);border-color:rgba(47,191,143,.15)}
    .ai-hero-txt{flex:1;min-width:0}
    .ai-hero-txt b{display:block;font-size:16.5px;font-weight:800;color:#0B5C42;letter-spacing:-.01em}
    .ai-agent-root[data-theme=dark] .ai-hero-txt b{color:#5FE6BD}
    .ai-hero-txt p{font-size:13.5px;line-height:1.68;color:#2E5C4C;margin:7px 0 12px}
    .ai-agent-root[data-theme=dark] .ai-hero-txt p{color:#9CC9B8}
    .ai-hero-cta{display:inline-flex;align-items:center;gap:7px;border:1px solid rgba(15,107,79,.25);background:rgba(255,255,255,.75);color:#0B5C42;font:700 12.5px inherit;padding:9px 14px;border-radius:var(--r-pill);cursor:pointer}
    .ai-agent-root[data-theme=dark] .ai-hero-cta{background:rgba(20,60,48,.8);color:#5FE6BD;border-color:rgba(47,191,143,.3)}
    .ai-hero-cta:active{transform:scale(.97)}
    .ai-hero-orb{width:104px;height:104px;flex:0 0 auto;position:relative;display:grid;place-items:center}
    .ai-hero-orb .ring{position:absolute;inset:2px;border-radius:50%;border:1px dashed rgba(15,107,79,.28);animation:aiRing 16s linear infinite}
    .ai-hero-orb .ring2{position:absolute;inset:12px;border-radius:50%;border:1px solid rgba(15,107,79,.16);animation:aiRing 22s linear infinite reverse}
    @keyframes aiRing{to{transform:rotate(360deg)}}
    .ai-hero-orb .big{width:78px;height:78px;border-radius:50%;position:relative;
      background:radial-gradient(circle at 30% 26%,#d3ffec 0%,#63dcb1 18%,#22ab7f 45%,#0e5e46 76%,#093f30 100%);
      box-shadow:0 16px 36px rgba(13,92,68,.4),inset 0 -10px 20px rgba(0,40,28,.45),inset 0 6px 12px rgba(255,255,255,.55);animation:aiOrbFloat 5.5s ease-in-out infinite}
    .ai-hero-orb .big:after{content:'';position:absolute;left:20%;top:13%;width:20px;height:14px;border-radius:50%;background:rgba(255,255,255,.85);filter:blur(3px);transform:rotate(-22deg)}
    .ai-hero-orb .p1,.ai-hero-orb .p2,.ai-hero-orb .p3{position:absolute;width:7px;height:7px;border-radius:50%;background:#2EE6A8;box-shadow:0 0 12px rgba(46,230,168,.8);animation:aiSpark 4s ease-in-out infinite}
    .ai-hero-orb .p1{top:6px;right:14px}.ai-hero-orb .p2{bottom:10px;left:8px;animation-delay:1.2s}.ai-hero-orb .p3{top:38%;right:-2px;width:5px;height:5px;animation-delay:2.1s}
    @keyframes aiSpark{50%{opacity:.25;transform:scale(.6) translateY(-4px)}}
    .ai-notice{display:flex;align-items:flex-start;gap:9px;background:var(--ai-card,#fff);border:1px solid var(--ai-line,rgba(15,107,79,.12));border-radius:var(--r-m);padding:11px 12px;margin:12px 0 4px;font-size:12px;line-height:1.6;color:var(--ai-sub,#5F7A72);animation:aiIn .4s ease both}
    .ai-notice b{color:var(--ai-ink,#16302A)}
    .ai-notice .x{margin-left:auto;border:0;background:none;color:var(--ai-sub,#8AA39A);font-size:16px;cursor:pointer;line-height:1;padding:2px}
    .ai-try{display:flex;align-items:center;gap:8px;margin:14px 2px 9px;font-size:14px;font-weight:800}
    .ai-chips{display:flex;gap:9px;overflow-x:auto;padding-bottom:8px;scrollbar-width:none}
    .ai-chips::-webkit-scrollbar{display:none}
    .ai-chip{flex:0 0 auto;min-width:148px;border:1px solid var(--ai-line,rgba(15,107,79,.14));background:var(--ai-card,#fff);border-radius:var(--r-card);padding:12px 13px;cursor:pointer;text-align:left;color:var(--ai-ink,#16302A);transition:transform .15s,box-shadow .15s;box-shadow:0 4px 14px rgba(23,58,43,.05)}
    .ai-chip:active{transform:scale(.97)}
    .ai-chip .ic{font-size:17px;display:block;margin-bottom:5px}
    .ai-chip b{font-size:12.5px;font-weight:800;display:block;letter-spacing:-.01em}
    .ai-chip span{font-size:10.5px;color:var(--ai-sub,#5F7A72);display:block;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    /* ── messages ── */
    .ai-msgs{display:flex;flex-direction:column;gap:14px;padding:6px 0 14px}
    .ai-msg{animation:aiIn .24s ease both}
    @keyframes aiIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
    .ai-msg.user{display:flex;justify-content:flex-end}
    .ai-msg.user .bubble{max-width:82%;background:var(--ai-user,#0E5F45);color:#fff;border-radius:18px 18px 6px 18px;padding:12px 16px;font-size:15.5px;line-height:1.65;white-space:pre-wrap;word-break:break-word;box-shadow:0 6px 16px rgba(14,95,69,.18)}
    .ai-agent-root[data-theme=dark] .ai-msg.user .bubble{background:#134F3E}
    .ai-msg.user .meta{display:flex;justify-content:flex-end;align-items:center;gap:4px;font-size:10.5px;color:var(--ai-sub,#8AA39A);margin-top:4px}
    .ai-tick{color:#7BE3C0;font-size:10px}
    .ai-msg.user img.thumb{display:block;max-width:190px;border-radius:11px;margin-top:8px}
    .ai-msg.ai{background:var(--ai-card,#fff);border:1px solid var(--ai-line,rgba(15,107,79,.12));border-radius:20px;padding:16px 17px 11px;box-shadow:0 10px 26px rgba(23,58,43,.07)}
    .ai-msg-head{display:flex;align-items:center;gap:7px;font-size:12.5px;font-weight:800;color:#0E6B4F;margin-bottom:10px}
    .ai-agent-root[data-theme=dark] .ai-msg-head{color:#5FE6BD}
    .ai-msg-head .mini{width:16px;height:16px;border-radius:50%;background:radial-gradient(circle at 32% 28%,#c9ffe9,#1fa87c 60%,#0d5c44);box-shadow:0 2px 6px rgba(13,92,68,.35)}
    .ai-msg-body{font-size:16.5px;line-height:1.85;text-wrap:pretty}
    .ai-msg-body h1,.ai-msg-body h2,.ai-msg-body h3{font-size:20px;font-weight:800;color:#0E6B4F;margin:13px 0 9px;letter-spacing:-.01em;line-height:1.42}
    .ai-agent-root[data-theme=dark] .ai-msg-body h1,.ai-agent-root[data-theme=dark] .ai-msg-body h2,.ai-agent-root[data-theme=dark] .ai-msg-body h3{color:#5FE6BD}
    .ai-msg-body p{margin:12px 0}
    .ai-msg-body ul,.ai-msg-body ol{margin:12px 0;padding-left:25px}
    .ai-msg-body li{margin:7px 0}
    .ai-msg-body code{background:var(--ai-mint,#EFF7F2);border-radius:6px;padding:2px 7px;font-size:13.5px;font-family:ui-monospace,Menlo,monospace}
    .ai-msg-body pre{background:#0E2A20;color:#D8F3E6;border-radius:13px;padding:13px 15px;overflow-x:auto;font-size:13px;margin:12px 0}
    .ai-msg-body pre code{background:none;color:inherit;padding:0}
    .ai-msg-body blockquote{border-left:3px solid rgba(14,107,79,.35);background:var(--ai-mint,#F3FAF6);border-radius:0 var(--r-m) var(--r-m) 0;margin:12px 0;padding:12px 15px;font-size:16px;line-height:1.8}
    .ai-msg-body a{color:#0E6B4F;font-weight:700;text-decoration:underline}
    .ai-formula{background:var(--ai-mint,#EFF7F2);border:1px solid rgba(15,107,79,.14);border-radius:var(--r-m);padding:14px;margin:11px 0;text-align:center;font-family:Georgia,"Times New Roman",serif;font-style:italic;font-size:20px;color:var(--ai-ink,#16302A)}
    .ai-callout{border-radius:var(--r-m);padding:13px 15px;margin:12px 0;font-size:15px;line-height:1.75;border:1px solid}
    .ai-callout.tip{background:rgba(255,241,196,.4);border-color:rgba(212,160,26,.25);color:var(--ai-ink,#16302A)}
    .ai-callout.tip b{color:#8a6d1c}
    .ai-callout.example{background:var(--ai-mint,#EFF7F2);border-color:rgba(15,107,79,.14)}
    .ai-callout.example b{color:#0E6B4F}
    .ai-callout.warn{background:rgba(253,235,235,.5);border-color:rgba(192,57,43,.2)}
    .ai-callout.warn b{color:#a93226}
    .ai-msg-body table{width:100%;border-collapse:collapse;margin:12px 0;font-size:14.5px}
    .ai-msg-body th,.ai-msg-body td{border:1px solid var(--ai-line,rgba(15,107,79,.16));padding:9px 11px;text-align:left}
    .ai-msg-body th{background:var(--ai-mint,#E9F5EF);font-weight:800}
    .ai-math{font-family:Georgia,serif;font-style:italic}
    .ai-math-inline{font-family:Georgia,serif;font-style:italic}
    .ai-cursor{display:inline-block;width:2px;height:1em;background:#2EE6A8;vertical-align:-.15em;margin-left:1px;animation:aiBlink .8s steps(1) infinite}
    @keyframes aiBlink{50%{opacity:0}}
    .ai-thinking{display:flex;align-items:center;gap:10px;background:var(--ai-card,#fff);border:1px solid var(--ai-line,rgba(15,107,79,.1));border-radius:var(--r-card);padding:13px 15px;animation:aiIn .2s ease both}
    .ai-thinking .orb-mini{width:30px;height:30px;border-radius:50%;flex:0 0 auto;background:radial-gradient(circle at 32% 28%,#c9ffe9,#1fa87c 60%,#0d5c44);animation:aiOrbFloat 2.2s ease-in-out infinite;box-shadow:0 4px 10px rgba(13,92,68,.3)}
    .ai-thinking b{font-size:13px;display:block}
    .ai-thinking span{font-size:11.5px;color:var(--ai-sub,#5F7A72);display:block;margin-top:1px}
    .ai-msg-bar{display:flex;align-items:center;gap:14px;margin-top:11px;padding-top:9px;border-top:1px solid var(--ai-line,rgba(15,107,79,.08))}
    .ai-msg-bar button{border:0;background:none;color:var(--ai-sub,#5F7A72);font:600 12px inherit;cursor:pointer;display:inline-flex;align-items:center;gap:4px;padding:2px}
    .ai-msg-bar button:active{transform:scale(.94)}
    .ai-msg-bar .sp{margin-left:auto}
    /* ── quiz card ── */
    .ai-quiz{border:1px solid rgba(15,107,79,.16);border-radius:var(--r-l);overflow:hidden;background:var(--ai-card,#fff);margin:9px 0 2px}
    .ai-quiz-head{display:flex;align-items:center;gap:8px;padding:11px 14px;font-size:12.5px;font-weight:800;color:#0E6B4F;border-bottom:1px solid rgba(15,107,79,.1)}
    .ai-agent-root[data-theme=dark] .ai-quiz-head{color:#5FE6BD}
    .ai-quiz-head .qcount{margin-left:auto;color:var(--ai-sub,#8AA39A);font-weight:700;font-size:11.5px}
    .ai-quiz-body{padding:14px}
    .ai-quiz-q{font-size:15px;font-weight:700;line-height:1.6;margin-bottom:12px}
    .ai-quiz-opts{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    @media(max-width:359px){.ai-quiz-opts{grid-template-columns:1fr}}
    .ai-opt{display:flex;align-items:center;gap:8px;border:1.2px solid var(--ai-line,rgba(15,107,79,.22));border-radius:var(--r-m);padding:10px 11px;font-size:13.5px;cursor:pointer;background:var(--ai-card,#fff);color:var(--ai-ink,#16302A);text-align:left;transition:border-color .15s,background .15s}
    .ai-opt .dot{width:15px;height:15px;border-radius:50%;border:1.6px solid #A9C4BA;flex:0 0 auto;display:grid;place-items:center}
    .ai-opt.sel{border-color:#0E6B4F;background:rgba(14,107,79,.05)}
    .ai-opt.sel .dot{border-color:#0E6B4F}
    .ai-opt.sel .dot:after{content:'';width:8px;height:8px;border-radius:50%;background:#0E6B4F}
    .ai-opt.correct{border-color:#16a34a;background:rgba(34,197,94,.09)}
    .ai-opt.wrong{border-color:#dc2626;background:rgba(220,38,38,.07)}
    .ai-quiz-fb{border-radius:var(--r-m);padding:11px 13px;margin-top:11px;font-size:13.5px;line-height:1.6}
    .ai-quiz-fb.good{background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.25);color:#15803d}
    .ai-quiz-fb.bad{background:rgba(220,38,38,.08);border:1px solid rgba(220,38,38,.22);color:#b91c1c}
    .ai-quiz-fb b{display:block;margin-bottom:3px}
    .ai-quiz-next{display:block;width:100%;margin-top:12px;border:0;border-radius:var(--r-m);background:var(--ai-user,#0E5F45);color:#fff;font:700 14px inherit;padding:12px;cursor:pointer}
    .ai-agent-root[data-theme=dark] .ai-quiz-next{background:#134F3E}
    .ai-quiz-done{text-align:center;padding:16px 10px}
    .ai-quiz-done .big{font-size:25px;font-weight:800;color:#0E6B4F}
    .ai-agent-root[data-theme=dark] .ai-quiz-done .big{color:#5FE6BD}
    .ai-quiz-done p{font-size:13px;color:var(--ai-sub,#5F7A72);margin:7px 0 12px}
    .ai-quiz-done .acts{display:flex;gap:8px;justify-content:center;flex-wrap:wrap}
    .ai-quiz-done .acts button{border-radius:var(--r-pill);padding:9px 15px;font:700 12.5px inherit;cursor:pointer}
    .ai-quiz-done .ghost{border:1px solid var(--ai-line,rgba(15,107,79,.24));background:none;color:#0E6B4F}
    .ai-quiz-done .solid{border:0;background:#0E6B4F;color:#fff}
    .ai-quiz-analysis{margin-top:12px;font-size:12.5px;color:var(--ai-sub,#5F7A72)}
    .ai-quiz-analysis div{padding:6px 0;border-bottom:1px dashed var(--ai-line,rgba(15,107,79,.1))}
    .ai-quiz-analysis b{color:var(--ai-ink,#16302A)}
    .ai-quiz-analysis .ok{color:#15803d}.ai-quiz-analysis .no{color:#b91c1c}
    /* ── follow-up ── */
    .ai-followup{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}
    .ai-followup button{border:1px dashed rgba(15,107,79,.3);background:none;color:#0E6B4F;border-radius:var(--r-pill);padding:7px 12px;font:700 11.5px inherit;cursor:pointer}
    .ai-agent-root[data-theme=dark] .ai-followup button{color:#5FE6BD;border-color:rgba(47,191,143,.35)}
    /* ── composer ── */
    .ai-agent-foot{position:sticky;bottom:0;z-index:9;padding:9px 12px calc(10px + env(safe-area-inset-bottom));background:linear-gradient(transparent,var(--ai-bg,#F7F9F8) 32%);transition:background .35s ease}
    .ai-compose{display:flex;align-items:flex-end;gap:8px;background:var(--ai-card,#fff);border:1.5px solid var(--ai-line,rgba(15,107,79,.22));border-radius:28px;padding:9px 10px;box-shadow:0 18px 42px rgba(23,58,43,.16),0 3px 10px rgba(23,58,43,.06),inset 0 1px 0 rgba(255,255,255,.65);transition:border-color .22s ease,box-shadow .22s ease}
    .ai-compose:focus-within{border-color:rgba(18,128,90,.55);box-shadow:0 0 0 4px rgba(18,128,90,.12),0 22px 48px rgba(23,58,43,.2),inset 0 1px 0 rgba(255,255,255,.65)}
    .ai-agent-root[data-theme=dark] .ai-compose{box-shadow:0 12px 30px rgba(0,0,0,.5)}
    .ai-compose-mid{flex:1;min-width:0;display:flex;flex-direction:column}
    .ai-compose-hint{font-size:10.5px;font-weight:600;color:var(--ai-sub,#8AA39A);padding:0 4px 1px;opacity:.9;transition:opacity .18s ease;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .ai-compose:focus-within .ai-compose-hint{opacity:1;color:#5F8A78}
    .ai-plus{width:42px;height:42px;flex:0 0 auto;border-radius:50%;border:0;background:linear-gradient(140deg,#DDF3E8,#E7F6EF);color:#0E6B4F;font-size:21px;cursor:pointer;display:grid;place-items:center;box-shadow:0 4px 10px rgba(14,107,79,.12),inset 0 1px 0 rgba(255,255,255,.8);transition:transform .22s ease,background .22s ease,color .22s ease}
    .ai-plus.plus-on{transform:rotate(45deg);background:linear-gradient(140deg,#12805A,#0E5F45);color:#fff}
    .ai-plus:active{transform:scale(.9)}
    .ai-compose textarea{width:100%;min-width:0;border:0;background:none;resize:none;font:inherit;font-size:16px;line-height:1.55;max-height:150px;padding:10px 4px 3px;outline:0;color:var(--ai-ink,#16302A)}
    .ai-compose textarea::placeholder{color:#93A8A0}
    .ai-mic{width:42px;height:42px;flex:0 0 auto;border-radius:50%;border:1px solid var(--ai-line,rgba(15,107,79,.22));background:linear-gradient(140deg,#F2FAF6,#E9F6EF);color:#0E6B4F;font-size:17px;cursor:pointer;display:grid;place-items:center;box-shadow:inset 0 1px 0 rgba(255,255,255,.7);transition:border-color .2s,box-shadow .2s}
    .ai-mic:active{border-color:rgba(14,107,79,.5);box-shadow:0 0 0 4px rgba(18,128,90,.1)}
    .ai-agent-root[data-theme=dark] .ai-mic{color:#5FE6BD}
    .ai-mic.rec{border-color:#dc2626;background:rgba(220,38,38,.1);animation:aiRec 1.1s ease-in-out infinite}
    @keyframes aiRec{50%{box-shadow:0 0 0 5px rgba(220,38,38,.14)}}
    .ai-send{width:46px;height:46px;flex:0 0 auto;border-radius:50%;border:0;background:linear-gradient(140deg,#149468,#0E5F45);color:#fff;font-size:16px;cursor:pointer;display:grid;place-items:center;box-shadow:0 10px 22px rgba(14,95,69,.4),inset 0 1px 0 rgba(255,255,255,.28);transition:transform .18s ease,box-shadow .18s ease,opacity .18s}
    .ai-send:hover{transform:translateY(-1.5px);box-shadow:0 13px 26px rgba(14,95,69,.45),inset 0 1px 0 rgba(255,255,255,.28)}
    .ai-send:active{transform:scale(.9)}
    .ai-send.stop{background:linear-gradient(140deg,#C0392B,#A93226)}
    .ai-send:disabled{opacity:.5}
    .ai-attach-chip{display:flex;align-items:center;gap:9px;background:var(--ai-card,#fff);border:1px solid var(--ai-line,rgba(15,107,79,.18));border-radius:14px;padding:8px 12px;margin:0 2px 9px;font-size:12.5px;box-shadow:0 4px 12px rgba(23,58,43,.06);animation:aiIn .2s ease both}
    .ai-attach-chip img{width:42px;height:42px;border-radius:8px;object-fit:cover}
    .ai-attach-chip .nm{flex:1;min-width:0}.ai-attach-chip b{display:block;font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .ai-attach-chip span{font-size:11px;color:var(--ai-sub,#5F7A72)}
    .ai-attach-chip .x{border:0;background:none;color:var(--ai-sub,#8AA39A);font-size:15px;cursor:pointer}
    .ai-voicebar{display:flex;align-items:center;gap:10px;background:var(--ai-card,#fff);border:1px solid rgba(220,38,38,.25);border-radius:var(--r-m);padding:10px 13px;margin:0 2px 8px;font-size:13px;animation:aiIn .2s ease both}
    .ai-voicebar .rec{width:11px;height:11px;border-radius:50%;background:#dc2626;animation:aiRec 1.1s infinite}
    .ai-voicebar b{font-weight:800}
    /* ── bottom sheet ── */
    .ai-sheetback{position:fixed;inset:0;background:rgba(8,24,18,.5);backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px);z-index:80;display:flex;align-items:flex-end;justify-content:center;animation:aiFade .2s ease}
    @keyframes aiFade{from{opacity:0}}
    .ai-sheet{width:100%;max-width:760px;max-height:88dvh;overflow-y:auto;background:var(--ai-card,#fff);border-radius:24px 24px 0 0;padding:6px 16px calc(18px + env(safe-area-inset-bottom));animation:aiSheet .26s ease;color:var(--ai-ink,#16302A);box-shadow:0 -18px 50px rgba(8,24,18,.25)}
    .ai-sheet-grab{width:42px;height:5px;border-radius:99px;background:var(--ai-line,rgba(15,107,79,.22));margin:6px auto 10px;flex:0 0 auto}
    @keyframes aiSheet{from{transform:translateY(24%);opacity:.6}to{transform:none;opacity:1}}
    .ai-sheet-h{font-size:12px;font-weight:800;letter-spacing:.05em;color:var(--ai-sub,#5F7A72);margin:4px 2px 10px;text-transform:uppercase}
    .ai-sheet-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;margin-bottom:16px}
    @media(min-width:560px){.ai-sheet-grid{grid-template-columns:repeat(6,1fr)}}
    .ai-sheet-it{border:1px solid var(--ai-line,rgba(15,107,79,.14));border-radius:var(--r-m);padding:12px 6px;display:flex;flex-direction:column;align-items:center;gap:6px;font-size:11px;font-weight:700;cursor:pointer;background:var(--ai-card,#fff);color:var(--ai-ink,#16302A)}
    .ai-sheet-it:active{transform:scale(.95)}
    .ai-sheet-it .ic{font-size:19px;width:38px;height:38px;border-radius:12px;display:grid;place-items:center;background:var(--ai-mint,#E4F3EC)}
    /* ── menu / search / feedback ── */
    .ai-menu{position:absolute;top:52px;right:12px;z-index:70;min-width:210px;padding:7px;background:var(--ai-card,#fff);border:1px solid var(--ai-line,rgba(15,107,79,.16));border-radius:var(--r-card);box-shadow:0 18px 44px rgba(23,58,43,.2);animation:aiIn .16s ease both;color:var(--ai-ink,#16302A)}
    .ai-menu .lbl{font-size:10.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--ai-sub,#5F7A72);padding:8px 10px 4px}
    .ai-menu button{display:flex;align-items:center;gap:9px;width:100%;text-align:left;padding:9px 10px;border-radius:10px;background:none;border:0;color:var(--ai-ink,#16302A);font:600 13px inherit;cursor:pointer}
    .ai-menu button:hover{background:var(--ai-mint,#EFF7F2)}
    .ai-menu button.danger{color:#B23B48}
    .ai-searchbar{position:absolute;top:0;left:0;right:0;z-index:65;background:var(--ai-bg,#F7F9F8);padding:10px 14px;display:flex;gap:9px;align-items:center;border-bottom:1px solid var(--ai-line,rgba(15,107,79,.12));animation:aiIn .18s ease;color:var(--ai-ink,#16302A)}
    .ai-searchbar input{flex:1;border:1px solid var(--ai-line,rgba(15,107,79,.2));border-radius:var(--r-pill);background:var(--ai-card,#fff);padding:10px 14px;font:inherit;font-size:14px;outline:0;color:var(--ai-ink,#16302A)}
    .ai-searchbar button{border:0;background:none;font-size:13px;font-weight:700;color:#0E6B4F;cursor:pointer}
    .ai-fb-sheet{padding:8px 4px}
    .ai-fb-opt{display:flex;align-items:center;gap:10px;width:100%;border:1px solid var(--ai-line,rgba(15,107,79,.14));background:var(--ai-card,#fff);color:var(--ai-ink,#16302A);border-radius:var(--r-m);padding:12px 13px;font:600 13.5px inherit;cursor:pointer;margin-bottom:8px}
    .ai-toast{position:fixed;left:50%;bottom:96px;transform:translateX(-50%);z-index:80;background:#0E2A20;color:#D8F3E6;padding:10px 16px;border-radius:var(--r-pill);font-size:12.5px;font-weight:700;box-shadow:0 10px 30px rgba(0,0,0,.25);animation:aiIn .2s ease}
    @media(max-width:430px){.ai-msg-body{font-size:16px;line-height:1.8}}
    @media(prefers-reduced-motion:reduce){.ai-orb,.ai-hero-orb .big,.ai-hero-orb .ring,.ai-hero-orb .ring2,.ai-hero-orb .p1,.ai-hero-orb .p2,.ai-hero-orb .p3,.ai-thinking .orb-mini,.ai-mic.rec{animation:none!important}.ai-msg,.ai-hero,.ai-notice,.ai-sheet{animation:none!important}}`;
  document.head.appendChild(style);

  /* ── state ── */
  let msgs = [];
  let activeReq = null;
  let streamingEl = null;
  let stoppedEarly = false;
  let speakBusy = false;
  let attachOpen = false;
  let menuOpen = false;
  let searchOpen = false;
  let feedbackTarget = -1;
  let attachments = [];
  let voiceState = null; /* {rec, timer, chunks, start} */
  try { const s = JSON.parse(localStorage.getItem(STORE) || '[]'); if (Array.isArray(s)) msgs = s.slice(-MAX_MSGS); } catch (_) { msgs = []; }
  let theme = (() => { try { const t = localStorage.getItem(THEME_KEY); return THEMES[t] ? t : 'light'; } catch (_) { return 'light'; } })();

  const esc = (s) => { const d = document.createElement('div'); d.textContent = String(s ?? ''); return d.innerHTML; };
  const token = () => { try { return localStorage.getItem('ahPubToken') || sessionStorage.getItem('ahPubToken') || ''; } catch (_) { return ''; } };
  const save = () => { try { localStorage.setItem(STORE, JSON.stringify(msgs.slice(-MAX_MSGS))); } catch (_) {} };
  const fmtTime = (ts) => { try { return new Date(ts).toLocaleTimeString(lang === 'bn' ? 'bn-BD' : 'en-US', { hour: '2-digit', minute: '2-digit' }); } catch (_) { return ''; } };
  const toast = (m) => { const old = document.querySelector('.ai-toast'); if (old) old.remove(); const el = document.createElement('div'); el.className = 'ai-toast'; el.textContent = m; document.body.appendChild(el); setTimeout(() => el.remove(), 2300); };
  const isAuthed = () => !!token();

  /* ── markdown-lite v3 (escape-first; heading/para/bullets/num/code/formula/tip/example/warn/table/links) ── */
  function md(html) {
    const codeBlocks = [];
    html = html.replace(/```([\s\S]*?)```/g, (m, c) => { codeBlocks.push(c); return '\u0000CB' + (codeBlocks.length - 1) + '\u0000'; });
    html = html.replace(/((?:^\|.*\|\s*$\n?)+)/gm, (block) => {
      const rows = block.trim().split('\n').map((r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
      if (rows.length < 2) return block;
      const head = rows[0]; let out = '<table><thead><tr>' + head.map((c) => '<th>' + c + '</th>').join('') + '</tr></thead><tbody>';
      for (const r of rows.slice(1)) { if (r.length === 1 && /^:?-{2,}:?$/.test(r[0])) continue; out += '<tr>' + r.map((c) => '<td>' + c + '</td>').join('') + '</tr>'; }
      return out + '</tbody></table>';
    });
    let s = html
      .replace(/^### (.*)$/gm, '<h3>$1</h3>').replace(/^## (.*)$/gm, '<h2>$1</h2>').replace(/^# (.*)$/gm, '<h1>$1</h1>')
      .replace(/^⚠️?\s*(.*)$/gm, '<div class="ai-callout warn"><b>⚠️</b> $1</div>')
      .replace(/^&gt; (.*)$/gm, '<blockquote>$1</blockquote>')
      .replace(/^\s*[-*] (.*)$/gm, '<li>$1</li>').replace(/^\s*\d+\. (.*)$/gm, '<li>$1</li>')
      .replace(/(?:<li>[\s\S]*?<\/li>)(?=(?:<li>|$))/g, (m) => '<ul>' + m + '</ul>')
      .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
      .replace(/`([^`\n]+)`/g, '<code>$1</code>')
      .replace(/\$\$([\s\S]+?)\$\$/g, '<div class="ai-formula">$1</div>')
      .replace(/\$([^$\n]+)\$/g, '<span class="ai-math-inline">$1</span>')
      .replace(/(^|[\s(])((?:https?:\/\/)[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>')
      .replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>');
    s = '<div class="ai-msg-body">' + (s.includes('<p>') ? s : '<p>' + s + '</p>') + '</div>';
    return s.replace(/\u0000CB(\d+)\u0000/g, (m, i) => '<pre><code>' + esc(codeBlocks[+i]).replace(/\n$/, '') + '</code></pre>');
  }

  /* ── shell ── */
  function shell() {
    return `<div class="ai-agent-root" data-theme="${theme}"><div class="ai-agent-head">
      <div class="ai-orb" aria-hidden="true"></div>
      <div class="ai-agent-t"><b>${esc(T.title)}</b><span><span class="ai-online-dot"></span>${esc(T.sub)} · ${esc(T.online)}</span></div>
      <button class="ai-icobtn" id="aiSearchBtn" aria-label="${esc(T.menuSearch)}">🔍</button>
      <button class="ai-icobtn" id="aiMenuBtn" aria-label="Menu">⋯</button></div>
      <div class="ai-agent-body" id="aiAgentBody"></div>
      <div class="ai-agent-foot" id="aiAgentFoot">
        <div id="aiAttachWrap"></div>
        <div class="ai-compose">
          <button class="ai-plus" id="aiPlusBtn" type="button" aria-label="${esc(T.attach)}">＋</button>
          <div class="ai-compose-mid"><textarea id="aiInput" rows="1" placeholder="${esc(T.ph)}" aria-label="Message AI"></textarea><div class="ai-compose-hint">${esc(T.enterHint)}</div></div>
          <button class="ai-mic" id="aiMicBtn" type="button" aria-label="Voice">🎙</button>
          <button class="ai-send" id="aiSendBtn" type="button" aria-label="${esc(T.send)}">➤</button>
        </div></div></div>`;
  }
  function menuPanel() {
    const p = document.createElement('div');
    p.className = 'ai-menu';
    p.innerHTML = `<div class="lbl">${esc(T.menuSearch)}</div>
      <button data-act="new">🆕 ${esc(T.menuNew)}</button>
      <button data-act="rename">✏️ ${esc(T.menuRename)}</button>
      <button data-act="search">🔍 ${esc(T.menuSearch)}</button>
      <button data-act="export">📤 ${esc(T.menuExport)}</button>
      <div class="lbl">${esc(T.themeOpt)}</div>
      <button data-theme="light">☀️ ${esc(T.themeLight)}</button>
      <button data-theme="dark">🌙 ${esc(T.themeDark)}</button>
      <button data-theme="oled">⬛ ${esc(T.themeOled)}</button>
      <div class="lbl">${esc(T.title)}</div>
      <button data-act="clear">🧹 ${esc(T.menuClear)}</button>
      <button data-act="del" class="danger">🗑 ${esc(T.menuDelete)}</button>`;
    p.querySelector('[data-act="new"]').addEventListener('click', () => { closeMenu(); newChat(); });
    p.querySelector('[data-act="rename"]').addEventListener('click', () => { closeMenu(); renameChat(); });
    p.querySelector('[data-act="search"]').addEventListener('click', () => { closeMenu(); openSearch(); });
    p.querySelector('[data-act="export"]').addEventListener('click', () => { closeMenu(); exportChat(); });
    p.querySelector('[data-act="clear"]').addEventListener('click', () => { closeMenu(); clearMsgs(); });
    p.querySelector('[data-act="del"]').addEventListener('click', () => { closeMenu(); delChat(); });
    p.querySelectorAll('[data-theme]').forEach((b) => b.addEventListener('click', () => { setTheme(b.getAttribute('data-theme')); closeMenu(); }));
    return p;
  }
  function setTheme(t) { theme = THEMES[t] ? t : 'light'; try { localStorage.setItem(THEME_KEY, theme); } catch (_) {} const r = document.querySelector('.ai-agent-root'); if (r) r.setAttribute('data-theme', theme); const head = document.querySelector('.ai-agent-head'); if (head) head.style.background = ''; renderChrome(); }
  function closeMenu() { menuOpen = false; const m = document.querySelector('.ai-menu'); if (m) m.remove(); }
  function setSheetUI(open) { attachOpen = open;
    const plus = document.getElementById('aiPlusBtn'); if (plus) plus.classList.toggle('plus-on', open);
    const nav = document.querySelector('.bottomnav'); if (nav) nav.style.display = open ? 'none' : '';
    document.body.style.overflow = open ? 'hidden' : '';
    if (!open) { const sb = document.getElementById('aiSheetView'); if (sb) sb.remove(); }
  }
  function closeAttach() { setSheetUI(false); }

  /* ── attachments sheet ── */
  function sheet() {
    const back = document.createElement('div');
    back.className = 'ai-sheetback'; back.id = 'aiSheetView';
    back.innerHTML = `<div class="ai-sheet"><div class="ai-sheet-grab"></div><div class="ai-sheet-h">${esc(T.addToConv)}</div>
      <div class="ai-sheet-grid">
        <button class="ai-sheet-it" data-file="cam"><span class="ic">📷</span>${esc(T.cam)}</button>
        <button class="ai-sheet-it" data-file="img"><span class="ic">🖼</span>${esc(T.img)}</button>
        <button class="ai-sheet-it" data-file="doc"><span class="ic">📄</span>${esc(T.doc)}</button>
        <button class="ai-sheet-it" data-file="vid"><span class="ic">🎥</span>${esc(T.vid)}</button>
        <button class="ai-sheet-it" data-file="rec"><span class="ic">🎙</span>${esc(T.voice)}</button>
        <button class="ai-sheet-it" data-file="any"><span class="ic">📎</span>${esc(T.file)}</button>
      </div><div class="ai-sheet-h">${esc(T.aiTools)}</div>
      <div class="ai-sheet-grid">
        <button class="ai-sheet-it" data-tool="search"><span class="ic">🔎</span>${esc(T.tSearch)}</button>
        <button class="ai-sheet-it" data-tool="mcq"><span class="ic">✏️</span>${esc(T.tMcq)}</button>
        <button class="ai-sheet-it" data-tool="quiz"><span class="ic">🎯</span>${esc(T.tQuiz)}</button>
        <button class="ai-sheet-it" data-tool="explain"><span class="ic">🧠</span>${esc(T.tExplain)}</button>
        <button class="ai-sheet-it" data-tool="analyze"><span class="ic">📊</span>${esc(T.tAnalyze)}</button>
        <button class="ai-sheet-it" data-tool="summ"><span class="ic">🧾</span>${esc(T.tSummarize)}</button>
      </div></div>`;
    back.addEventListener('click', (e) => { if (e.target === back) closeAttach(); });
    back.querySelector('[data-file="cam"]').addEventListener('click', () => pick('image/*', true));
    back.querySelector('[data-file="img"]').addEventListener('click', () => pick('image/*', false));
    back.querySelector('[data-file="doc"]').addEventListener('click', () => pick('.pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.ppt,.pptx', false));
    back.querySelector('[data-file="vid"]').addEventListener('click', () => pick('video/*', false));
    back.querySelector('[data-file="rec"]').addEventListener('click', () => { closeAttach(); startVoice(); });
    back.querySelector('[data-file="any"]').addEventListener('click', () => pick('', false));
    back.querySelector('[data-tool="search"]').addEventListener('click', () => tool('search'));
    back.querySelector('[data-tool="mcq"]').addEventListener('click', () => tool('mcq'));
    back.querySelector('[data-tool="quiz"]').addEventListener('click', () => tool('quiz'));
    back.querySelector('[data-tool="explain"]').addEventListener('click', () => tool('explain'));
    back.querySelector('[data-tool="analyze"]').addEventListener('click', () => tool('analyze'));
    back.querySelector('[data-tool="summ"]').addEventListener('click', () => tool('summ'));
    return back;
  }
  function pick(accept, capture) {
    const inp = document.createElement('input');
    inp.type = 'file';
    if (accept) inp.accept = accept;
    if (capture) inp.setAttribute('capture', 'environment');
    inp.addEventListener('change', () => {
      const f = inp.files && inp.files[0];
      if (!f) { closeAttach(); return; }
      const kind = f.type.startsWith('image/') ? 'image' : (f.type.startsWith('video/') ? 'video' : (f.type.startsWith('audio/') ? 'audio' : 'doc'));
      const item = { kind, name: f.name, size: f.size, dataUrl: '', file: f };
      if (kind === 'image') {
        const fr = new FileReader();
        fr.onload = () => {
          const s = String(fr.result || '');
          if (s.length > 4700000) { toast(T.imgTooBig); closeAttach(); return; }
          item.dataUrl = s;
          attachments.push(item); renderAttach(); closeAttach();
        };
        fr.readAsDataURL(f);
      } else { attachments.push(item); renderAttach(); closeAttach(); }
    });
    inp.click();
  }
  function renderAttach() {
    const w = document.getElementById('aiAttachWrap'); if (!w) return;
    w.innerHTML = attachments.map((a, i) => `<div class="ai-attach-chip">${a.kind === 'image' && a.dataUrl ? `<img src="${a.dataUrl}" alt="">` : `<span class="ic">${a.kind === 'video' ? '🎥' : a.kind === 'audio' ? '🎙' : '📄'}</span>`}<div class="nm"><b>${esc(a.name)}</b><span>${fmtSize(a.size)}</span></div><button class="x" data-i="${i}">×</button></div>`).join('');
    w.querySelectorAll('.x').forEach((b) => b.addEventListener('click', () => { attachments.splice(+b.getAttribute('data-i'), 1); renderAttach(); }));
  }
  const fmtSize = (n) => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : n > 1024 ? Math.round(n / 1024) + ' KB' : n + ' B';
  function tool(kind) {
    closeAttach();
    const q = {
      search: 'সর্বশেষ ভর্তি-নিউজ খোঁজো — অফিসিয়াল সোর্স প্রাধান্য দিয়ে',
      mcq: lang === 'en' ? 'Make 10 MCQs on my current topic' : 'আমাকে ১০টা MCQ বানাও',
      quiz: lang === 'en' ? 'Quiz me — 5 questions' : 'আমাকে quiz নাও — ৫টা প্রশ্ন',
      explain: lang === 'en' ? 'Explain simply: ' : 'সহজ করে বুঝাও: ',
      analyze: lang === 'en' ? 'Analyze my performance' : 'আমার পারফরম্যান্স analyze করো',
      summ: lang === 'en' ? 'Summarize: ' : 'সংক্ষেপে বলো: '
    }[kind];
    const base = (kind === 'explain' || kind === 'summ') && input.value.trim() ? input.value.trim() : '';
    const text = q + (base ? ' ' + '' : '') ;
    send(text.trim());
  }
  function fmtSizeTxt() {}

  /* ── search overlay ── */
  function openSearch() {
    searchOpen = true;
    const r = document.querySelector('.ai-agent-root'); if (!r) return;
    const bar = document.createElement('div');
    bar.className = 'ai-searchbar';
    bar.innerHTML = `<input id="aiSearchInput" placeholder="${esc(T.searchPh)}" autocomplete="off"><button id="aiSearchClose">✕</button>`;
    bar.querySelector('#aiSearchClose').addEventListener('click', () => closeSearch());
    bar.querySelector('#aiSearchInput').addEventListener('input', (e) => applySearch(e.target.value));
    r.parentElement.insertBefore(bar, r);
    setTimeout(() => bar.querySelector('#aiSearchInput').focus(), 30);
  }
  function closeSearch() {
    searchOpen = false;
    const bar = document.querySelector('.ai-searchbar'); if (bar) bar.remove();
    applySearch('');
  }
  function applySearch(q) {
    const b = body(); if (!b) return;
    q = String(q || '').toLowerCase().trim();
    if (!q) { renderMsgs(); return; }
    let count = 0;
    b.innerHTML = msgs.map((m, i) => {
      const hit = String(m.text || '').toLowerCase().includes(q);
      if (hit) count++;
      return hit ? msgHtml(m, i) : '';
    }).join('') || `<div class="ai-msg ai" style="text-align:center;color:var(--ai-sub,#5F7A72);font-size:13px;padding:26px">${esc(T.noResults)}</div>`;
    void count;
  }

  /* ── renew / delete / export ── */
  function newChat() { msgs = []; try { localStorage.removeItem(STORE); } catch (_) {} render(); }
  function clearMsgs() { msgs = []; try { localStorage.removeItem(STORE); } catch (_) {} render(); }
  function delChat() {
    if (!confirm(T.confirmDel)) return;
    newChat(); toast(T.delDone);
  }
  function renameChat() {
    const cur = (() => { try { return localStorage.getItem(NAME_KEY) || ''; } catch (_) { return ''; } })();
    const name = prompt(T.menuRename + ':', cur || T.title);
    if (name === null) return;
    try { localStorage.setItem(NAME_KEY, name.trim() || ''); } catch (_) {}
    const b = document.querySelector('.ai-agent-t b'); if (b) b.textContent = (name.trim() || T.title);
  }
  function exportChat() {
    const txt = msgs.map((m) => (m.role === 'user' ? T.you + ': ' : T.title + ': ') + (m.text || '')).join('\n\n') || '(empty)';
    try {
      const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'admission-hub-ai-chat.txt';
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    } catch (_) { toast('Export failed'); }
  }

  /* ── voice in (Web Speech) + voice out ── */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  function startVoice() {
    if (voiceState) { stopVoice(); return; }
    if (!SR) { toast(T.voiceNope); return; }
    const rec = new SR();
    rec.lang = 'bn-BD';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    let t0 = Date.now();
    voiceState = { rec, timer: setInterval(() => { const v = document.getElementById('aiVoiceTime'); if (v) v.textContent = '0' + Math.floor((Date.now() - t0) / 60000) + ':' + String(Math.floor((Date.now() - t0) / 1000) % 60).padStart(2, '0'); }, 500) };
    renderVoicebar(true);
    rec.onresult = (e) => {
      const t = e.results && e.results[0] && e.results[0][0] && e.results[0][0].transcript;
      if (t) { input.value = (input.value ? input.value + ' ' : '') + t; autoGrow(); }
    };
    rec.onerror = (e) => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') toast(T.voiceNope); stopVoice(true); };
    rec.onend = () => stopVoice(true);
    try { rec.start(); } catch (_) { stopVoice(true); }
  }
  function stopVoice(silent) {
    if (!voiceState) return;
    clearInterval(voiceState.timer);
    try { voiceState.rec.stop(); } catch (_) {}
    voiceState = null;
    if (!silent) toast(undefined);
    renderVoicebar(false);
  }
  function renderVoicebar(on) {
    const w = document.getElementById('aiAttachWrap'); if (!w) return;
    const mic = document.getElementById('aiMicBtn');
    if (mic) mic.classList.toggle('rec', on);
    if (!on) { const el = document.getElementById('aiVoiceBar'); if (el && !attachments.length) w.innerHTML = ''; renderAttach(); return; }
    w.innerHTML = `<div class="ai-voicebar" id="aiVoiceBar"><span class="rec"></span><b>${esc(T.listening)}…</b><span id="aiVoiceTime">00:00</span><button class="x" style="border:0;background:none;margin-left:auto;color:var(--ai-sub);font-size:15px;cursor:pointer" onclick="window.__AiAgentStopVoice&&__AiAgentStopVoice()">■</button></div>`;
  }
  async function speak(el) {
    const text = String(el.getAttribute('data-speak') || '').trim();
    if (!text || speakBusy) return;
    const old = el.innerHTML; el.disabled = true; el.innerHTML = '◌';
    speakBusy = true;
    try {
      const r = await fetch('/api/voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-AH-App': 'admission-hub' },
        body: JSON.stringify({ word: text.slice(0, 500), voiceId: 'EXAVITQu4vr4xnSDxMaL', modelId: 'eleven_flash_v2_5', output_format: 'mp3_22050_32', lang: 'bn', voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0, use_speaker_boost: true, speed: 1.0 } })
      });
      if (!r.ok) throw new Error('voice-' + r.status);
      const blob = await r.blob();
      if (!blob || !blob.size) throw new Error('empty');
      const url = URL.createObjectURL(blob);
      const a = new Audio(url);
      a.onended = () => { try { URL.revokeObjectURL(url); } catch (_) {} };
      await a.play();
    } catch (_) { toast(T.speakErr || 'Voice unavailable'); }
    speakBusy = false;
    if (el) { el.disabled = false; el.innerHTML = old; }
  }

  /* ── messages render ── */
  function body() { return document.getElementById('aiAgentBody'); }
  function emptyState() {
    return `<div class="ai-hero"><div class="ai-hero-txt"><b>✦ ${esc(T.heroTitle)}</b><p>${esc(T.heroBody)}</p><button class="ai-hero-cta" id="aiHeroCta">${esc(T.heroCta)} →</button></div>
      <div class="ai-hero-orb" aria-hidden="true"><i class="ring"></i><i class="ring2"></i><i class="p1"></i><i class="p2"></i><i class="p3"></i><span class="big"></span></div></div>
      ${localStorage.getItem(NOTICE_KEY) ? '' : `<div class="ai-notice" id="aiNotice">🛡 <div><b>AI responses</b> can occasionally contain mistakes. Verify important admission information from official sources.</div><button class="x" id="aiNoticeX" aria-label="Dismiss">×</button></div>`}
      <div class="ai-try">${esc(T.tryAsking)}</div>
      <div class="ai-chips">${T.chips.map((c) => `<button class="ai-chip" data-q="${esc(c[2])}"><span class="ic">${c[0]}</span><b>${esc(c[1])}</b><span>${esc(c[0] + ' ' + (c[1]))}</span></button>`).join('')}</div>`;
  }
  function msgHtml(m, idx) {
    if (m.role === 'user') {
      return `<div class="ai-msg user"><div><div class="bubble">${esc(m.text)}${m.image ? `<img class="thumb" src="${m.image}" alt="">` : ''}</div><div class="meta">${esc(fmtTime(m.ts))} <span class="ai-tick">✓✓</span></div></div></div>`;
    }
    if (m.error) {
      return `<div class="ai-msg ai"><div class="ai-msg-head"><span class="mini"></span>${esc(T.title)}</div><div class="ai-msg-body"><p style="color:#B23B48;font-weight:700">⚠️ ${esc(T.err)}</p><p style="font-size:12.5px;color:var(--ai-sub,#5F7A72)">${esc(m.text || '')}</p></div>
        <div class="ai-msg-bar"><button onclick="window.__AiAgentRetry&&__AiAgentRetry()">⟳ ${esc(T.retry)}</button>${m.login ? `<button class="sp" onclick="window.__AiAgentLogin&&__AiAgentLogin()">→ ${esc(T.loginBtn)}</button>` : ''}</div></div>`;
    }
    const metaLine = m.liked ? '' : '';
    const quizHtml = m.quiz ? quizCardHtml(m, idx) : '';
    const bodyHtml = quizHtml || md(esc(m.text));
    const follow = m.quiz ? '' : `<div class="ai-followup">${followups(m).map((f) => `<button data-q="${esc(f[1])}">${f[0]}</button>`).join('')}</div>`;
    return `<div class="ai-msg ai"><div class="ai-msg-head"><span class="mini"></span>${esc(T.title)}</div>${bodyHtml}
      <div class="ai-msg-bar">
        <button onclick="window.__AiAgentCopy(this)" data-t="${esc(m.text)}">⧉ ${esc(T.copy)}</button>
        ${m.regen ? `<button onclick="window.__AiAgentRegen&&__AiAgentRegen()">↻ ${esc(T.regen)}</button>` : ''}
        <button class="${m.fb === 'up' ? 'on' : ''}" data-fb="up" data-i="${idx}" onclick="window.__AiAgentFb(this)">👍</button>
        <button class="${m.fb === 'down' ? 'on' : ''}" data-fb="down" data-i="${idx}" onclick="window.__AiAgentFb(this)">👎</button>
        <span class="sp"></span>
        <button data-more="${idx}" onclick="window.__AiAgentMore(this)">⋯</button>
      </div>${follow}</div>`;
  }
  function followups(m) {
    return [
      ['🪄 আরও সহজ করুন', 'আরও সহজভাবে ব্যাখ্যা করো: ' + lastTopic(m)],
      ['🎯 এটা থেকে Quiz', 'এই বিষয়ে আমাকে ৫টা প্রশ্ন দিয়ে quiz নাও: ' + lastTopic(m)],
      ['📝 MCQ বানাও', 'এই topic থেকে আমাকে ৫টা MCQ বানাও: ' + lastTopic(m)]
    ];
  }
  function lastTopic(m) {
    const t = String(m.text || '').split('\n')[0].replace(/[#*`]/g, '').trim();
    return t.length > 100 ? t.slice(0, 100) : t;
  }
  function quizCardHtml(m, idx) {
    const qz = m.quiz; const q = qz.data.questions[qz.idx];
    const fb = qz.feedback;
    const opts = q.options.map((o, i) => {
      let cls = 'ai-opt';
      if (fb) { if (i === q.answer) cls += ' correct'; else if (i === qz.sel) cls += ' wrong'; }
      else if (qz.sel === i) cls += ' sel';
      return `<button class="${cls}" data-i="${i}" onclick="window.__AiQuizTap(${idx},${i})"><span class="dot"></span>${esc(o)}</button>`;
    }).join('');
    let fbHtml = '';
    if (fb) {
      const good = qz.sel === q.answer;
      fbHtml = `<div class="ai-quiz-fb ${good ? 'good' : 'bad'}"><b>${good ? '✓ ' + esc(T.correct) : '✕ ' + esc(T.notQuite)}</b>${good ? '' : esc(T.correctAnswer) + ': ' + esc(q.options[q.answer]) + '<br>'}${esc(q.explanation || '')}</div>`;
    }
    return `<div class="ai-quiz"><div class="ai-quiz-head"><span>🎯</span>${esc(T.quickChallenge)}<span class="qcount">${esc(T.question)} ${qz.idx + 1} / ${qz.data.questions.length}</span></div>
      <div class="ai-quiz-body"><div class="ai-quiz-q">${esc(q.q)}</div><div class="ai-quiz-opts">${opts}</div>${fbHtml}
      ${fb ? `<button class="ai-quiz-next" onclick="window.__AiQuizNext(${idx})">${qz.idx + 1 < qz.data.questions.length ? esc(T.next) + ' →' : '🎯 ' + esc(T.quizComplete)}</button>` : ''}</div></div>`;
  }
  function quizDoneHtml(m, idx) {
    const qz = m.quiz; const total = qz.data.questions.length; const score = qz.correct;
    const pct = Math.round((score / total) * 100);
    const rows = qz.data.questions.map((q, i) => {
      const ok = qz.userAnswers[i] === q.answer;
      return `<div><b class="${ok ? 'ok' : 'no'}">${ok ? '✓' : '✕'}</b> Q${i + 1}. ${esc(q.q.slice(0, 70))}… <b>${esc(q.options[q.answer])}</b></div>`;
    }).join('');
    return `<div class="ai-quiz"><div class="ai-quiz-head"><span>🎯</span>${esc(T.quizComplete)}</div><div class="ai-quiz-done">
      <div class="big">${score} / ${total}</div><p>${esc(T.accuracy)}: ${pct}%</p>
      <div class="acts"><button class="ghost" onclick="window.__AiQuizAnalysis(${idx})">${esc(T.viewAnalysis)}</button><button class="solid" onclick="window.__AiQuizRetry(${idx})">${esc(T.tryAgain)}</button></div>
      ${qz.showAnalysis ? `<div class="ai-quiz-analysis">${rows}</div>` : ''}</div></div>`;
  }
  function renderMsgs() {
    const b = body(); if (!b) return;
    if (!msgs.length) { b.innerHTML = emptyState(); wireEmpty(); scrollBottom(); return; }
    if (searchOpen) { applySearch(document.getElementById('aiSearchInput').value || ''); return; }
    b.innerHTML = msgs.map((m, i) => m.quiz && m.quiz.done ? quizDoneHtml(m, i) : msgHtml(m, i)).join('');
    scrollBottom();
  }
  function wireEmpty() {
    const cta = document.getElementById('aiHeroCta');
    if (cta) cta.addEventListener('click', () => { input.focus(); });
    const nx = document.getElementById('aiNoticeX');
    if (nx) nx.addEventListener('click', () => { try { localStorage.setItem(NOTICE_KEY, 'true'); } catch (_) {} const n = document.getElementById('aiNotice'); if (n) n.remove(); });
    document.querySelectorAll('.ai-chip').forEach((c) => c.addEventListener('click', () => send(c.getAttribute('data-q'))));
  }
  function scrollBottom(force) {
    const b = body(); if (!b) return;
    const near = b.scrollHeight - b.scrollTop - b.clientHeight < 150;
    if (force || near) b.scrollTop = b.scrollHeight;
  }

  /* ── streaming ── */
  function thinkingCard() {
    return `<div class="ai-thinking"><div class="orb-mini"></div><div><b>✦ ${esc(T.thinking)}</b><span id="aiThinkStatus">${esc(T.understanding)}</span></div></div>`;
  }
  function appendThinking(quizMode) {
    const b = body(); if (!b) return;
    const t = document.createElement('template');
    t.innerHTML = thinkingCard();
    b.insertAdjacentHTML('beforeend', thinkingCard());
    if (quizMode) { const s = document.getElementById('aiThinkStatus'); if (s) s.textContent = T.creating; }
    scrollBottom(true);
  }
  function removeThinking() { const el = document.querySelector('.ai-thinking'); if (el) el.remove(); }
  function appendStream(chunk) {
    if (!streamingEl) {
      const b = body(); if (!b) return;
      streamingEl = document.createElement('div');
      streamingEl.className = 'ai-msg ai';
      streamingEl.innerHTML = `<div class="ai-msg-head"><span class="mini"></span>${esc(T.title)}</div><div class="ai-msg-body"><p><span class="ai-cursor"></span></p></div>`;
      b.appendChild(streamingEl);
      scrollBottom(true);
    }
    const p = streamingEl.querySelector('.ai-msg-body p');
    if (p) { const cur = p.querySelector('.ai-cursor'); if (cur) cur.remove(); p.textContent += chunk; const sp = document.createElement('span'); sp.className = 'ai-cursor'; p.appendChild(sp); }
    scrollBottom();
  }

  /* ── api ── */
  function history() {
    const hist = [];
    for (const m of msgs) if (m.role === 'user' || (m.role === 'ai' && !m.error)) hist.push({ role: m.role === 'ai' ? 'assistant' : 'user', content: String(m.text || '').slice(0, 4000) });
    return hist.slice(-MAX_HISTORY);
  }
  async function callStream(userText, image) {
    const t = token();
    if (!t) return { code: 'auth' };
    const hist = history().concat([{ role: 'user', content: userText, ...(image ? { image } : {}) }]);
    const payload = { messages: hist, context: { stats: (typeof window.__ahAgentStats === 'function') ? window.__ahAgentStats() : null, examMode: null } };
    const ctrl = new AbortController();
    activeReq = ctrl;
    const r = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t },
      body: JSON.stringify(payload),
      signal: ctrl.signal
    });
    if (r.status === 401 || r.status === 403) { await r.text().catch(() => ''); return { code: 'auth' }; }
    if (!r.ok || !r.body) { await r.text().catch(() => ''); return { code: 'http', status: r.status }; }
    const reader = r.body.getReader();
    const dec = new TextDecoder();
    let buf = ''; let full = ''; let meta = null;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const parts = buf.split('\n\n');
      buf = parts.pop() || '';
      for (const part of parts) {
        for (const line of part.split('\n')) {
          const s = line.trim();
          if (!s.startsWith('data:')) { if (s.startsWith('event:') && s.includes('error')) meta = meta || { event: 'error' }; continue; }
          let j = null; try { j = JSON.parse(s.slice(5).trim()); } catch (_) { continue; }
          if (j.text) { full += j.text; appendStream(j.text); }
          else if (j.error) meta = { event: 'error', message: j.message, retryable: j.retryable };
          else if (j.model || j.provider || j.intent) meta = { event: 'done', model: j.model, provider: j.provider, intent: j.intent };
        }
      }
    }
    if (buf) {
      for (const line of buf.split('\n')) {
        const s = line.trim();
        if (!s.startsWith('data:')) continue;
        try { const j = JSON.parse(s.slice(5).trim()); if (j.text) full += j.text; if (j.error) meta = meta || { event: 'error', message: j.message, retryable: j.retryable }; } catch (_) {}
      }
    }
    if (stoppedEarly && !full) return { code: 'stopped' };
    return { code: 'ok', text: full, meta };
  }
  function parseQuiz(text) {
    if (!text) return null;
    let m = String(text).match(/```(?:json)?\s*([\s\S]*?)```/);
    let s = m ? m[1] : String(text);
    const first = s.indexOf('{'); const last = s.lastIndexOf('}');
    if (first < 0 || last <= first) return null;
    s = s.slice(first, last + 1);
    try {
      const d = JSON.parse(s);
      const qs = Array.isArray(d.questions) ? d.questions : null;
      if (!qs || qs.length < 1 || qs.length > 10) return null;
      for (const q of qs) {
        if (!q || typeof q.q !== 'string' || !Array.isArray(q.options) || q.options.length < 2 || typeof q.answer !== 'number' || q.answer < 0 || q.answer >= q.options.length) return null;
      }
      return { title: String(d.title || ''), questions: qs };
    } catch (_) { return null; }
  }

  /* ── send / stop ── */
  function setSendBtn(streaming) {
    const b = document.getElementById('aiSendBtn'); if (!b) return;
    b.classList.toggle('stop', !!streaming);
    b.innerHTML = streaming ? '■' : '➤';
    b.setAttribute('aria-label', streaming ? T.stop : T.send);
  }
  async function send(prefill) {
    const q = String(prefill ?? input.value).trim();
    if (!q && !attachments.length) return;
    if (activeReq) return;
    const imgItem = attachments.find((a) => a.kind === 'image' && a.dataUrl);
    const docItem = attachments.find((a) => a.kind !== 'image');
    const text = q || (imgItem ? (lang === 'en' ? 'Explain this image' : 'এই ছবিটা বুঝিয়ে দাও') : '');
    const note = docItem ? `\n\n[📄 ${docItem.name} — ${T.docSoon}]` : '';
    const fullText = text + note;
    if (docItem) toast(T.docSoon);
    input.value = ''; autoGrow();
    attachments = []; renderAttach();
    const m = { role: 'user', text: fullText, ts: Date.now(), image: imgItem ? imgItem.dataUrl : '' };
    msgs.push(m); save(); renderMsgs();
    stopVoice(true);
    stoppedEarly = false;
    streamingEl = null;
    appendThinking(/mcq|quiz|প্রশ্ন দিয়ে/i.test(fullText));
    setSendBtn(true);
    const res = await callStream(fullText, imgItem ? imgItem.dataUrl : '').catch(() => ({ code: 'net' }));
    removeThinking();
    streamingEl = null;
    setSendBtn(false);
    activeReq = null;
    if (res.code === 'ok' && res.text && res.text.trim()) {
      const intent = res.meta && res.meta.intent;
      const qz = intent === 'QUIZ_REQUEST' ? parseQuiz(res.text) : null;
      const msg = { role: 'ai', text: res.text.trim(), ts: Date.now(), regen: true, model: res.meta && res.meta.model };
      if (qz) { const userAnswers = qz.questions.map(() => -1); msg.quiz = { data: qz, idx: 0, sel: -1, feedback: false, correct: 0, userAnswers, done: false }; msg.text = qz.title ? qz.title + ' — ' + res.text.trim() : res.text.trim(); }
      msgs.push(msg); save(); renderMsgs();
    } else if (res.code === 'auth') {
      msgs.push({ role: 'ai', error: true, login: true, text: T.login, ts: Date.now() });
      save(); renderMsgs();
    } else if (res.code === 'stopped') { save(); renderMsgs(); }
    else {
      const detail = res.code === 'net' ? T.offline : (res.code === 'http' ? `HTTP ${res.status}` : String((res.meta && res.meta.message) || ''));
      msgs.push({ role: 'ai', error: true, text: detail, ts: Date.now() });
      save(); renderMsgs();
    }
  }
  function retry() {
    msgs = msgs.filter((m) => !(m.error));
    const last = [...msgs].reverse().find((m) => m.role === 'user');
    if (last) send(last.text); else renderMsgs();
  }
  function regen() {
    const last = [...msgs].reverse().find((m) => m.role === 'user');
    if (last) send(last.text);
  }
  function stop() {
    stoppedEarly = true;
    try { activeReq && activeReq.abort(); } catch (_) {}
    removeThinking();
    if (streamingEl) {
      const txt = (streamingEl.querySelector('.ai-msg-body') || streamingEl).textContent.trim();
      if (txt) msgs.push({ role: 'ai', text: txt, ts: Date.now(), regen: true });
    }
    streamingEl = null; activeReq = null;
    setSendBtn(false);
    save(); renderMsgs();
  }

  /* ── quiz interactions ── */
  window.__AiQuizTap = function (idx, oi) {
    const m = msgs[idx]; if (!m || !m.quiz || m.quiz.done) return;
    if (m.quiz.feedback) return;
    m.quiz.sel = oi;
    m.quiz.feedback = true;
    if (oi === m.quiz.data.questions[m.quiz.idx].answer) m.quiz.correct++;
    m.quiz.userAnswers[m.quiz.idx] = oi;
    save(); renderMsgs();
  };
  window.__AiQuizNext = function (idx) {
    const m = msgs[idx]; if (!m || !m.quiz) return;
    if (m.quiz.idx + 1 < m.quiz.data.questions.length) {
      m.quiz.idx++; m.quiz.sel = -1; m.quiz.feedback = false;
    } else m.quiz.done = true;
    save(); renderMsgs();
  };
  window.__AiQuizRetry = function (idx) {
    const m = msgs[idx]; if (!m) return;
    const q = m.quiz.data; const lastUser = [...msgs].reverse().find((x) => x.role === 'user');
    send(lastUser ? lastUser.text : 'আমাকে quiz নাও');
  };
  window.__AiQuizAnalysis = function (idx) {
    const m = msgs[idx]; if (!m) return;
    m.quiz.showAnalysis = !m.quiz.showAnalysis;
    save(); renderMsgs();
  };

  /* ── actions ── */
  function copyBtn(el) {
    const t = el.getAttribute('data-t') || '';
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => { const o = el.innerHTML; el.innerHTML = '✓ ' + T.copied; setTimeout(() => { el.innerHTML = o; }, 1400); }).catch(() => toast('Copy unavailable'));
  }
  function fbBtn(el) {
    const i = +el.getAttribute('data-i'); const m = msgs[i];
    if (m && el.getAttribute('data-fb') === 'up') { m.fb = 'up'; save(); renderMsgs(); toast(T.liked); return; }
    if (m) { m.fb = 'down'; save(); renderMsgs(); openFeedback(i); }
  }
  function openFeedback(i) {
    feedbackTarget = i;
    const back = document.createElement('div');
    back.className = 'ai-sheetback';
    back.innerHTML = `<div class="ai-sheet ai-fb-sheet"><div class="ai-sheet-h">${esc(T.feedbackQ)}</div>
      ${['fb1', 'fb2', 'fb3', 'fb4', 'fb5'].map((k, j) => `<button class="ai-fb-opt" data-r="${j}">${['❌', '😕', '📚', '📄', '✏️'][j]} ${esc(T[k])}</button>`).join('')}
      <div style="text-align:right"><button style="border:0;background:none;color:var(--ai-sub);font:600 13px inherit;cursor:pointer" onclick="document.querySelector('.ai-sheetback')?.remove()">${esc(T.cancel)}</button></div></div>`;
    back.addEventListener('click', (e) => { if (e.target === back) back.remove(); });
    back.querySelectorAll('.ai-fb-opt').forEach((b) => b.addEventListener('click', () => {
      const reason = b.textContent.trim();
      try {
        const log = JSON.parse(localStorage.getItem(FEED_KEY) || '[]');
        log.push({ at: Date.now(), reason, snippet: String((msgs[feedbackTarget] || {}).text || '').slice(0, 200) });
        localStorage.setItem(FEED_KEY, JSON.stringify(log.slice(-50)));
      } catch (_) {}
      back.remove(); toast(T.liked);
    }));
    document.body.appendChild(back);
  }
  function moreMenu(el) {
    const i = +el.getAttribute('data-more'); const m = msgs[i]; if (!m) return;
    const old = document.querySelector('.ai-more-panel'); if (old) old.remove();
    const p = document.createElement('div');
    p.className = 'ai-menu ai-more-panel';
    p.style.top = el.getBoundingClientRect().bottom + 'px';
    p.innerHTML = `<button data-a="speak">🔊 ${esc(T.speak)}</button><button data-a="save">⭐ ${esc(T.save)}</button><button data-a="share">📤 ${esc(T.share)}</button>`;
    p.querySelector('[data-a="speak"]').addEventListener('click', () => { p.remove(); speak({ getAttribute: () => String(m.text).slice(0, 300), innerHTML: '', disabled: false }); });
    p.querySelector('[data-a="save"]').addEventListener('click', () => { p.remove(); toast(T.savedTip); });
    p.querySelector('[data-a="share"]').addEventListener('click', () => {
      p.remove();
      if (navigator.share) navigator.share({ text: m.text }).catch(() => {});
      else (navigator.clipboard ? navigator.clipboard.writeText(m.text) : Promise.reject()).then(() => toast(T.copied)).catch(() => toast('Copy unavailable'));
    });
    document.body.appendChild(p);
    setTimeout(() => document.addEventListener('click', function h() { p.remove(); document.removeEventListener('click', h); }, { once: true }), 10);
  }
  function loginCta() { if (window.AHAuth && typeof window.AHAuth.openLogin === 'function') window.AHAuth.openLogin(); else toast(T.login); }

  window.__AiAgentCopy = copyBtn;
  window.__AiAgentRetry = retry;
  window.__AiAgentRegen = regen;
  window.__AiAgentLogin = loginCta;
  window.__AiAgentFb = fbBtn;
  window.__AiAgentMore = moreMenu;
  window.__AiAgentStopVoice = () => stopVoice(true);

  /* ── composer helpers ── */
  const input = {
    get value() { const i = document.getElementById('aiInput'); return i ? i.value : ''; },
    set value(v) { const i = document.getElementById('aiInput'); if (i) i.value = v; },
    focus() { const i = document.getElementById('aiInput'); if (i) i.focus(); }
  };
  function autoGrow() { const i = document.getElementById('aiInput'); if (i) { i.style.height = 'auto'; i.style.height = Math.min(i.scrollHeight, 150) + 'px'; } }
  function renderChrome() {}

  /* ── page render ── */
  function render() {
    const root = document.querySelector('#app') || document.body;
    root.innerHTML = shell();
    const inp = document.getElementById('aiInput');
    const sendBtn = document.getElementById('aiSendBtn');
    const plusBtn = document.getElementById('aiPlusBtn');
    const micBtn = document.getElementById('aiMicBtn');
    const menuBtn = document.getElementById('aiMenuBtn');
    const searchBtn = document.getElementById('aiSearchBtn');
    const head = document.querySelector('.ai-agent-head');
    if (inp) {
      inp.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        if (e.ctrlKey || e.metaKey) { e.preventDefault(); send(); return; }
        e.preventDefault();
        const st = inp.selectionStart ?? inp.value.length, en = inp.selectionEnd ?? st;
        try { inp.setRangeText('\n', st, en, 'end'); } catch (_) { inp.value += '\n'; }
        autoGrow();
      });
      inp.addEventListener('input', autoGrow);
    }
    if (sendBtn) sendBtn.addEventListener('click', () => { activeReq ? stop() : send(); });
    if (plusBtn) plusBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (attachOpen) closeAttach(); else { closeMenu(); setSheetUI(true); document.body.appendChild(sheet()); }
    });
    if (micBtn) micBtn.addEventListener('click', (e) => { e.stopPropagation(); startVoice(); });
    if (menuBtn) menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (menuOpen) closeMenu(); else { menuOpen = true; closeAttach(); const run = menuPanel(); run.style.position = 'fixed'; head.appendChild(run); }
    });
    if (searchBtn) searchBtn.addEventListener('click', () => openSearch());
    setSendBtn(!!activeReq);
    renderMsgs();
    try { const nm = localStorage.getItem(NAME_KEY); if (nm) { const b = document.querySelector('.ai-agent-t b'); if (b) b.textContent = nm; } } catch (_) {}
  }

  window.renderAiAgentPage = render;
  window.__AiAgentTest = { get msgs() { return msgs.slice(); }, send, retry, regen, stop, newChat, T, parseQuiz };
  document.addEventListener('click', (e) => {
    if (menuOpen && !e.target.closest('.ai-menu') && !e.target.closest('#aiMenuBtn')) closeMenu();
    if (attachOpen && document.getElementById('aiSheetView') && !e.target.closest('.ai-sheet') && !e.target.closest('#aiPlusBtn')) closeAttach();
  });
})();
