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
    ph: 'Ask anything…', latest: '↓ Latest', menu: 'Menu', recentChats: 'Recent conversations', untitled: 'New chat', noChats: 'No conversations yet', newIsEmpty: 'Start a new chat? Unsent draft will be cleared.', cancelBtn: 'Cancel', pinChat: 'Pin / Unpin', itemAct: 'Choose an action:', aiProfile: 'My AI profile', backHome: 'Back to Home', close: 'Close', loginNote: 'Login to unlock your saved profile & sync.', defLbl: 'Definition', confirmClear: 'Clear all messages in this chat?', chzSimple: 'Simplify', chzExample: 'Examples', chzQuiz: 'Quiz me', chzMcq: 'Make MCQ', chzSimilarMcq: 'Similar MCQ', chzShorten: 'Summarize', chzPoints: 'Key points', chzRevise: 'Revision note', chzExplain: 'Explain topic', stThink: 'Thinking...', stAnalyze: 'Analyzing your question...', stImage: 'Understanding image...', stDoc: 'Reading file...', stSearch: 'Searching trusted sources...', stQuiz: 'Creating quiz...', stMcq: 'Creating MCQs...', stWrite: 'Writing answer...',
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
    listening: 'Listening', transcribing: 'Transcribing', voiceNope: 'Voice input not supported on this device', msgTooLong: 'Message is too long — please keep it under 4,000 characters', shareBtn: 'Share', copyFail: 'Copy unavailable', more: 'More',
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
    ph: 'Ask anything…', latest: 'নতুন', menu: 'মেনু', recentChats: 'সম্প্রতি কথোপকথন', untitled: 'নতুন চ্যাট', noChats: 'এখনো কোনো কথোপকথন নেই', newIsEmpty: 'নতুন চ্যাট শুরু করবেন? অসমাপ্ত লেখা মুছে যাবে।', cancelBtn: 'বাতিল', pinChat: 'পিন / আনপিন', itemAct: 'একটি কাজ বাছুন:', aiProfile: 'আমার AI প্রোফাইল', backHome: 'হোমে ফিরুন', close: 'বন্ধ করুন', loginNote: 'লগইন করলে প্রোফাইল ও সেভ-সিঙ্ক পাবেন।', defLbl: 'সংজ্ঞা', confirmClear: 'এই চ্যাটের সব মেসেজ মুছবেন?', chzSimple: 'সহজ করে বলো', chzExample: 'আরও উদাহরণ', chzQuiz: 'Quiz নাও', chzMcq: 'MCQ বানাও', chzSimilarMcq: 'একই রকম MCQ', chzShorten: 'সংক্ষেপে বলো', chzPoints: 'মূল পয়েন্ট', chzRevise: 'রিভিশন নোট', chzExplain: 'টপিক বুঝাও', stThink: 'ভাবছি...', stAnalyze: 'প্রশ্ন বিশ্লেষণ করছি...', stImage: 'ছবি বিশ্লেষণ করছি...', stDoc: 'ফাইল বিশ্লেষণ করছি...', stSearch: 'তথ্য খুঁজছি...', stQuiz: 'Quiz তৈরি করছি...', stMcq: 'MCQ তৈরি করছি...', stWrite: 'উত্তর তৈরি করছি...',
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
    listening: 'Listening', transcribing: 'Transcribing…', voiceNope: 'এই ডিভাইসে ভয়েস-ইনপুট নেই', msgTooLong: 'মেসেজ খুব বড় — সর্বোচ্চ ৪,০০০ অক্ষর। ছোট করে আবার পাঠান।', shareBtn: 'শেয়ার', copyFail: 'কপি করা যায়নি', more: 'আরও',
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
    light: { bg: '#F7F9F8', card: '#ffffff', ink: '#16302A', sub: '#5F7A72', primary: '#0E6B4F', mint: '#E4F3EC', line: 'rgba(15,107,79,.14)', user: '#0E5F45' },
    dark: { bg: '#0F1714', card: '#182420', ink: '#E8F4EF', sub: '#8FA8A0', primary: '#2FBF8F', mint: '#14332A', line: 'rgba(47,191,143,.18)', user: '#134F3E' },
    oled: { bg: '#000000', card: '#0B0F0D', ink: '#EAF5F0', sub: '#7E968D', primary: '#35D6A2', mint: '#0E1F19', line: 'rgba(53,214,162,.16)', user: '#0E7A54' }
  };

  const IC = (p) => `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const ICONS = {
    copy: IC('<rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M5 15H4.5A2.5 2.5 0 0 1 2 12.5v-8A2.5 2.5 0 0 1 4.5 2h8A2.5 2.5 0 0 1 15 4.5V5"/>'),
    check: IC('<path d="M4 12.5l5 5L20 6.5"/>'),
    like: IC('<path d="M7 11v10"/><path d="M15 5.5 14.2 10H20a2 2 0 0 1 1.93 2.5l-2.1 7A2 2 0 0 1 17.8 21H7V11l3.3-6.7A2.3 2.3 0 0 1 15 5.5z"/>'),
    dislike: IC('<path d="M17 13V3"/><path d="M9 18.5 9.8 14H4a2 2 0 0 1-1.93-2.5l2.1-7A2 2 0 0 1 6.2 3H17v10l-3.3 6.7A2.3 2.3 0 0 1 9 18.5z"/>'),
    share: IC('<circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="m8.4 13.4 7.2 4.2M15.6 6.4l-7.2 4.2"/>'),
    regen: IC('<path d="M21 12a9 9 0 1 1-2.64-6.36"/><path d="M21 4v5h-5"/>'),
    more: IC('<circle cx="5" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.4" fill="currentColor" stroke="none"/>'),
    sparkle: IC('<path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6Z"/><path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8Z"/>'),
    pencil: IC('<path d="M17 3l4 4L8 20l-5.5 1.5L4 16Z"/><path d="m14 6 4 4"/>'),
    target: IC('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.2"/><circle cx="12" cy="12" r=".8" fill="currentColor" stroke="none"/>'),
    book: IC('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>'),
    zap: IC('<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z"/>'),
    list: IC('<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>')
  };
  const style = document.createElement('style');
  style.id = 'ai-agent-style';
  style.textContent = `
    .ai-agent-root{--r-s:10px;--r-m:14px;--r-card:18px;--r-l:22px;--r-float:28px;--r-pill:999px;
      height:100dvh;min-height:100dvh;display:flex;flex-direction:column;max-width:760px;margin:0 auto;overflow:hidden;
      padding-bottom:var(--ai-kb,0px);
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
    .ai-ham{width:38px;height:38px;font-size:17px}
    .ai-plushead{width:38px;height:38px;font-size:19px;background:linear-gradient(140deg,#DDF3E8,#E7F6EF);color:#0E6B4F;border-color:rgba(15,107,79,.18)}
    .ai-plushead:active{transform:scale(.92)}
    .ai-icobtn:active{transform:scale(.93)}
    /* ── body ── */
    .ai-agent-body{flex:1;min-height:0;overflow-y:auto;padding:12px 14px 12px;-webkit-overflow-scrolling:touch}
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
    .ai-msg-body h1,.ai-msg-body h2,.ai-msg-body h3{font-size:19px;font-weight:700;color:#0E6B4F;margin:10px 0 7px;letter-spacing:-.01em;line-height:1.45}
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
    .ai-think{display:flex;align-items:center;gap:10px;padding:5px 4px;margin:1px 0;animation:aiIn .2s ease both;background:none;border:0;box-shadow:none;border-radius:0}
    .ai-think .ob{width:27px;height:27px;border-radius:50%;flex:0 0 auto;position:relative;
      background:radial-gradient(circle at 32% 28%,#c9ffe9 0%,#5fd9ae 24%,#1fa87c 56%,#0d5c44 84%,#073827 100%);
      box-shadow:0 5px 14px rgba(13,92,68,.42),inset 0 -4px 8px rgba(0,40,28,.45),inset 0 3px 6px rgba(255,255,255,.55),0 0 14px rgba(46,230,168,.28);
      animation:aiOrbFloat 2.4s ease-in-out infinite}
    .ai-think .ob:after{content:'';position:absolute;left:22%;top:14%;width:7px;height:5px;border-radius:50%;background:rgba(255,255,255,.85);filter:blur(1.5px);transform:rotate(-20deg)}
    .ai-think .tx{display:flex;align-items:baseline;gap:6px;min-width:0}
    .ai-think .tx b{font-size:12.5px;font-weight:800;color:var(--ai-ink,#16302A);white-space:nowrap}
    .ai-think .tx span{font-size:12px;font-weight:600;color:var(--ai-sub,#5F7A72);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .ai-think.tq-search .ob{background:radial-gradient(circle at 32% 28%,#d9f3ff 0%,#7fd0f2 24%,#2f9bd8 56%,#135a86 84%,#08324c 100%);box-shadow:0 5px 14px rgba(19,90,134,.45),inset 0 -4px 8px rgba(0,32,50,.45),inset 0 3px 6px rgba(255,255,255,.6),0 0 14px rgba(80,180,255,.32)}
    .ai-think.tq-analyze .ob{background:radial-gradient(circle at 32% 28%,#f0e6ff 0%,#bb9bf5 24%,#7d52d6 56%,#4a2b86 84%,#2b1750 100%);box-shadow:0 5px 14px rgba(74,43,134,.45),inset 0 -4px 8px rgba(20,10,46,.45),inset 0 3px 6px rgba(255,255,255,.6),0 0 14px rgba(160,110,255,.32)}
    .ai-think.tq-create .ob{background:radial-gradient(circle at 32% 28%,#fff3da 0%,#f4cd85 24%,#dc9e2f 56%,#8f5d12 84%,#4d3206 100%);box-shadow:0 5px 14px rgba(143,93,18,.45),inset 0 -4px 8px rgba(45,28,4,.45),inset 0 3px 6px rgba(255,255,255,.6),0 0 14px rgba(255,195,85,.32)}
    /* ── dynamic rich-blocks ── */
    .ai-stats{margin:12px 0;border:1px solid var(--ai-line,rgba(15,107,79,.16));border-radius:var(--r-m);padding:12px 14px;background:var(--ai-mint,#F2FAF6)}
    .ai-stat{margin:9px 0}
    .ai-stat .lbl{display:flex;justify-content:space-between;gap:8px;font-size:12.5px;font-weight:700;color:var(--ai-ink,#16302A)}
    .ai-stat .lbl .v{font-weight:800;color:#0E6B4F;font-variant-numeric:tabular-nums}
    .ai-stat .tr{height:7px;border-radius:99px;background:rgba(15,107,79,.1);margin-top:5px;overflow:hidden}
    .ai-stat .fl{height:100%;border-radius:99px;background:linear-gradient(90deg,#2FB98A,#0E6B4F);transform-origin:left;animation:aiBarGrow .9s cubic-bezier(.2,.8,.3,1) both}
    .ai-stat:nth-child(2) .fl{animation-delay:.12s}
    .ai-stat:nth-child(3) .fl{animation-delay:.24s}
    .ai-stat:nth-child(4) .fl{animation-delay:.36s}
    .ai-stat:nth-child(5) .fl{animation-delay:.48s}
    @keyframes aiBarGrow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
    .ai-timeline{margin:12px 0;padding:4px 0 6px 22px;border-left:2px solid var(--ai-line,rgba(15,107,79,.35));position:relative}
    .ai-tl{position:relative;padding:0 0 14px 8px;animation:aiIn .35s ease both}
    .ai-tl:last-child{padding-bottom:2px}
    .ai-tl:before{content:'';position:absolute;left:-27px;top:4px;width:10px;height:10px;border-radius:50%;background:#0E6B4F;box-shadow:0 0 0 3px var(--ai-mint,#E4F3EC)}
    .ai-tl .yr{font-weight:800;color:#0E6B4F;font-size:13.5px;font-variant-numeric:tabular-nums}
    .ai-tl .ds{font-size:14.5px;color:var(--ai-ink,#16302A);line-height:1.65;margin-top:1px}
    .ai-checklist{margin:10px 0;padding:0;list-style:none}
    .ai-checklist li{display:flex;gap:10px;align-items:flex-start;margin:8px 0}
    .ai-checklist .bx{width:19px;height:19px;flex:0 0 auto;border-radius:6px;border:1.6px solid var(--ai-line,rgba(15,107,79,.4));margin-top:1px;display:grid;place-items:center;font-size:11px;color:#fff;background:var(--ai-mint,#EFF7F2);font-weight:800}
    .ai-checklist li.done .bx{background:#0E6B4F;border-color:#0E6B4F}
    .ai-checklist li.done{opacity:.78}
    .ai-callout.define{background:var(--ai-mint,#EFF7F2);border-color:rgba(15,107,79,.2)}
    .ai-callout.define b{color:#0E6B4F}
    .ai-callout.success{background:rgba(34,197,94,.08);border-color:rgba(34,197,94,.28)}
    .ai-callout.success b{color:#15803d}
    .ai-callout.keypoint{background:rgba(255,241,196,.32);border-color:rgba(212,160,26,.22)}
    .ai-callout.keypoint b{color:#8a6d1c}
    .ai-callout.concept{background:rgba(99,102,241,.07);border-color:rgba(99,102,241,.2)}
    .ai-callout.concept b{color:#4f46e5}
    .ai-callout.revision{background:rgba(14,107,79,.06);border-color:rgba(14,107,79,.18)}
    .ai-callout.revision b{color:#0E6B4F}
    .ai-twrap{overflow-x:auto;-webkit-overflow-scrolling:touch;margin:12px 0}
    .ai-twrap table{margin:0}
    .ai-msg-bar{display:flex;align-items:center;gap:3px;margin-top:10px;padding-top:8px;border-top:1px solid var(--ai-line,rgba(15,107,79,.08))}
    .ai-msg-bar .ab{width:31px;height:31px;border:0;background:none;color:var(--ai-sub,#7A948B);cursor:pointer;display:grid;place-items:center;border-radius:9px;transition:background .15s,color .15s,transform .12s}
    .ai-msg-bar .ab:hover{background:var(--ai-mint,#EFF7F2);color:#0E6B4F}
    .ai-msg-bar .ab:active{transform:scale(.88)}
    .ai-msg-bar .ab svg{display:block}
    .ai-msg-bar .ab[data-fb=up].on{color:#0E6B4F;background:rgba(14,107,79,.1)}
    .ai-msg-bar .ab[data-fb=down].on{color:#B45309;background:rgba(180,83,9,.1)}
    .ai-agent-root[data-theme=dark] .ai-msg-bar .ab:hover{background:rgba(47,191,143,.12);color:#5FE6BD}
    .ai-msg-bar .sp{margin-left:auto}
    .ai-msg-bar .abtxt{display:inline-flex;align-items:center;gap:5px;border:0;background:none;color:#0E6B4F;font:700 12px inherit;cursor:pointer;padding:5px 10px;border-radius:999px}
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
    .ai-followup{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}
    .ai-followup button{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--ai-line,rgba(15,107,79,.15));background:var(--ai-mint,#F1F8F4);color:#0E6B4F;border-radius:999px;padding:5.5px 11px 5.5px 9px;font:600 12px inherit;cursor:pointer;transition:background .15s,transform .12s;box-shadow:none}
    .ai-followup button:hover{background:#E4F3EC}
    .ai-followup button:active{transform:scale(.96)}
    .ai-followup button svg{flex:0 0 auto;opacity:.8}
    .ai-agent-root[data-theme=dark] .ai-followup button{color:#5FE6BD;background:rgba(47,191,143,.1);border-color:rgba(47,191,143,.22)}
    .ai-agent-root[data-theme=dark] .ai-followup button:hover{background:rgba(47,191,143,.16)}
    /* ── composer ── */
    .ai-agent-foot{position:static;flex:0 0 auto;width:100%;z-index:12;padding:7px 12px calc(8px + env(safe-area-inset-bottom));background:linear-gradient(transparent,var(--ai-bg,#F7F9F8) 36%);transition:background .35s ease}
    .ai-compose{display:flex;align-items:center;gap:7px;min-height:52px;background:var(--ai-card,#fff);border:1.5px solid var(--ai-line,rgba(15,107,79,.22));border-radius:26px;padding:6px 7px;box-shadow:0 18px 42px rgba(23,58,43,.16),0 3px 10px rgba(23,58,43,.06),inset 0 1px 0 rgba(255,255,255,.65);transition:border-color .22s ease,box-shadow .22s ease}
    .ai-compose:focus-within{border-color:rgba(18,128,90,.55);box-shadow:0 0 0 4px rgba(18,128,90,.12),0 22px 48px rgba(23,58,43,.2),inset 0 1px 0 rgba(255,255,255,.65)}
    .ai-agent-root[data-theme=dark] .ai-compose{box-shadow:0 12px 30px rgba(0,0,0,.5)}
    .ai-compose-mid{flex:1;min-width:0;display:flex;flex-direction:column}
    .ai-editor{min-height:0!important;height:auto;border:0;background:none;resize:none;outline:0;font:inherit;font-size:16px;line-height:1.5;max-height:128px;overflow-y:auto;padding:9px 4px 5px;color:var(--ai-ink,#16302A);white-space:pre-wrap;word-break:break-word;scrollbar-width:thin;cursor:text}
    .ai-editor::-webkit-scrollbar{width:4px}
    .ai-editor::-webkit-scrollbar-thumb{background:var(--ai-line,rgba(15,107,79,.25));border-radius:99px}
    .ai-editor:empty::before{content:attr(data-ph);color:#93A8A0;pointer-events:none}
    .ai-editor:focus{outline:0}
    .ai-plus{width:40px;height:40px;flex:0 0 auto;border-radius:50%;border:0;background:linear-gradient(140deg,#DDF3E8,#E7F6EF);color:#0E6B4F;font-size:20px;cursor:pointer;display:grid;place-items:center;box-shadow:0 4px 10px rgba(14,107,79,.12),inset 0 1px 0 rgba(255,255,255,.8);transition:transform .22s ease,background .22s ease,color .22s ease}
    .ai-plus.plus-on{transform:rotate(45deg);background:linear-gradient(140deg,#12805A,#0E5F45);color:#fff}
    .ai-plus:active{transform:scale(.9)}
    .ai-compose textarea{width:100%;min-width:0;min-height:0!important;height:auto;border:0;background:none;resize:none;font:inherit;font-size:16px;line-height:1.5;max-height:128px;overflow-y:auto;padding:9px 4px 5px;outline:0;color:var(--ai-ink,#16302A);scrollbar-width:thin}
    .ai-compose textarea::-webkit-scrollbar{width:4px}
    .ai-compose textarea::-webkit-scrollbar-thumb{background:var(--ai-line,rgba(15,107,79,.25));border-radius:99px}
    .ai-compose textarea::placeholder{color:#93A8A0}
    .ai-mic{width:40px;height:40px;flex:0 0 auto;border-radius:50%;border:1px solid var(--ai-line,rgba(15,107,79,.22));background:linear-gradient(140deg,#F2FAF6,#E9F6EF);color:#0E6B4F;font-size:16px;cursor:pointer;display:grid;place-items:center;box-shadow:inset 0 1px 0 rgba(255,255,255,.7);transition:border-color .2s,box-shadow .2s}
    .ai-mic:active{border-color:rgba(14,107,79,.5);box-shadow:0 0 0 4px rgba(18,128,90,.1)}
    .ai-agent-root[data-theme=dark] .ai-mic{color:#5FE6BD;background:rgba(47,191,143,.12);border-color:rgba(47,191,143,.3)}
    .ai-agent-root[data-theme=dark] .ai-plus{background:rgba(47,191,143,.16);color:#5FE6BD;box-shadow:none}
    .ai-agent-root[data-theme=dark] .ai-msg-body a{color:#5FE6BD}
    .ai-agent-root[data-theme=dark] .ai-callout.tip{background:rgba(212,160,26,.13);border-color:rgba(212,160,26,.3);color:#F0E3BC}
    .ai-agent-root[data-theme=dark] .ai-callout.tip b{color:#FFD97A}
    .ai-agent-root[data-theme=dark] .ai-callout.example{background:rgba(47,191,143,.1);border-color:rgba(47,191,143,.25)}
    .ai-agent-root[data-theme=dark] .ai-callout.warn{background:rgba(220,38,38,.13);border-color:rgba(220,38,38,.3)}
    .ai-agent-root[data-theme=dark] .ai-msg-body th{background:rgba(47,191,143,.16)}
    .ai-agent-root[data-theme=dark] .ai-sheet-it .ic{background:rgba(47,191,143,.15)}
    .ai-agent-root[data-theme=dark] .ai-compose textarea::placeholder,.ai-agent-root[data-theme=dark] .ai-editor:empty::before{color:#5E7A70}
    .ai-mic.rec{border-color:#dc2626;background:rgba(220,38,38,.1);animation:aiRec 1.1s ease-in-out infinite}
    @keyframes aiRec{50%{box-shadow:0 0 0 5px rgba(220,38,38,.14)}}
    .ai-send{width:40px;height:40px;flex:0 0 auto;border-radius:50%;border:0;background:linear-gradient(140deg,#149468,#0E5F45);color:#fff;font-size:15px;cursor:pointer;display:none;place-items:center;box-shadow:0 8px 18px rgba(14,95,69,.38),inset 0 1px 0 rgba(255,255,255,.25);transition:transform .18s ease,box-shadow .18s ease,opacity .18s;animation:aiIn .18s ease both}
    .ai-send:hover{transform:translateY(-1px);box-shadow:0 11px 22px rgba(14,95,69,.42),inset 0 1px 0 rgba(255,255,255,.25)}
    .ai-compose.dirty .ai-send{display:grid}
    .ai-compose.dirty .ai-mic{display:none}
    .ai-compose.streaming .ai-send{display:grid}
    .ai-compose.streaming .ai-mic{display:none}
    .ai-compose .ai-mic.show{display:grid}
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
    /* ── ↓ Latest ফ্লোটিং ── */
    .ai-latest{position:fixed;right:14px;bottom:calc(env(safe-area-inset-bottom) + var(--ai-comp-h,76px) + 14px + var(--ai-kb,0px));z-index:11;width:42px;height:42px;border-radius:50%;border:0;background:#0E2A20;color:#D8F3E6;font-size:16px;font-weight:800;display:none;place-items:center;box-shadow:0 10px 26px rgba(0,0,0,.3);cursor:pointer;animation:aiIn .2s ease both}
    .ai-latest.show{display:grid}
    .ai-latest i.cnt{position:absolute;top:-5px;right:-5px;min-width:19px;height:19px;padding:0 5px;border-radius:99px;background:#2EE6A8;color:#06281C;font:800 10.5px/19px inherit;font-style:normal;display:none;text-align:center;box-shadow:0 3px 8px rgba(0,0,0,.25)}
    .ai-latest.new i.cnt{display:block}
    /* ── sidebar drawer ── */
    .ai-drawerback{position:fixed;inset:0;z-index:90;background:rgba(8,24,18,.45);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);animation:aiFade .2s ease}
    .ai-drawer{position:absolute;top:0;bottom:0;left:0;width:min(320px,86vw);background:var(--ai-card,#fff);color:var(--ai-ink,#16302A);padding:14px 14px calc(16px + env(safe-area-inset-bottom));overflow-y:auto;box-shadow:24px 0 60px rgba(8,24,18,.25);animation:aiDrawer .28s cubic-bezier(.2,.8,.3,1) both;border-radius:0 20px 20px 0}
    @keyframes aiDrawer{from{transform:translateX(-16%);opacity:.4}to{transform:none;opacity:1}}
    .ai-dr-head{display:flex;align-items:center;gap:10px;padding-bottom:11px;border-bottom:1px solid var(--ai-line,rgba(15,107,79,.1))}
    .ai-dr-head .ai-orb.small{width:34px;height:34px;animation:none}
    .ai-dr-head .x{margin-left:auto;border:0;background:none;color:var(--ai-sub);font-size:19px;cursor:pointer;width:32px;height:32px;border-radius:9px}
    .ai-dr-head .x:active{transform:scale(.92)}
    .ai-dr-t{min-width:0}
    .ai-dr-t b{display:block;font-size:14.5px}
    .ai-dr-t span{font-size:11px;color:var(--ai-sub)}
    .ai-dr-acts{display:flex;flex-direction:column;gap:2px;margin-top:10px}
    .ai-dr-acts button{display:flex;align-items:center;gap:9px;width:100%;text-align:left;border:0;background:none;color:var(--ai-ink,#16302A);padding:10px 10px;border-radius:12px;font:600 13.5px inherit;cursor:pointer}
    .ai-dr-acts button b{font-weight:700}
    .ai-dr-acts button .hint{font-size:10.5px;color:var(--ai-sub);margin-left:auto;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:46%}
    .ai-dr-acts button:hover{background:var(--ai-mint,#EFF7F2)}
    .ai-dr-note{font-size:10.5px;color:var(--ai-sub);padding:0 10px 8px}
    .ai-dr-lbl{font-size:10.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--ai-sub);padding:12px 10px 5px}
    .ai-dr-list{display:flex;flex-direction:column;gap:1px;max-height:38vh;overflow-y:auto}
    .ai-recent{display:flex;align-items:center;gap:8px;padding:9px 10px;border-radius:11px;cursor:pointer;font-size:13px}
    .ai-recent:hover{background:var(--ai-mint,#EFF7F2)}
    .ai-recent.on{background:var(--ai-mint,#E4F3EC);font-weight:700}
    .ai-recent .ic{font-size:12px}
    .ai-recent .nm{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .ai-recent .ts{font-size:10.5px;color:var(--ai-sub);flex:0 0 auto}
    .ai-recent .rs{border:0;background:none;color:var(--ai-sub);font-size:14px;cursor:pointer;padding:2px 5px;border-radius:7px}
    .ai-recent .rs:hover{background:rgba(15,107,79,.1)}
    .ai-dr-empty{font-size:12.5px;color:var(--ai-sub);padding:8px 10px}
    .ai-dr-themes{display:flex;gap:6px;padding:2px 10px}
    .ai-dr-themes button{flex:1;border:1px solid var(--ai-line,rgba(15,107,79,.16));background:none;color:var(--ai-ink,#16302A);border-radius:10px;padding:8px 4px;font:600 11.5px inherit;cursor:pointer}
    .ai-dr-themes button:hover{background:var(--ai-mint,#EFF7F2)}
    .ai-dr-foot{margin-top:10px;border-top:1px solid var(--ai-line,rgba(15,107,79,.1));padding-top:6px}
    .ai-dr-foot button{display:flex;align-items:center;gap:9px;width:100%;text-align:left;border:0;background:none;color:var(--ai-ink,#16302A);padding:8px 10px;border-radius:10px;font:600 12.5px inherit;cursor:pointer}
    .ai-dr-foot button:hover{background:var(--ai-mint,#EFF7F2)}
    .ai-dr-foot .danger{color:#B23B48}
    .ai-agent-root[data-theme=dark] .ai-dr-themes button{border-color:rgba(47,191,143,.22)}
    /* ── legacy menu (অটুট নয়, নিরাপত্তা) ── */
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
    @media(prefers-reduced-motion:reduce){.ai-orb,.ai-hero-orb .big,.ai-hero-orb .ring,.ai-hero-orb .ring2,.ai-hero-orb .p1,.ai-hero-orb .p2,.ai-hero-orb .p3,.ai-think .ob,.ai-mic.rec{animation:none!important}.ai-msg,.ai-hero,.ai-notice,.ai-sheet,.ai-think{animation:none!important}}`;
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
  const mkSession = (nm, arr) => ({ id: Date.now() + Math.random().toString(36).slice(2, 6), name: nm || '', msgs: (arr || []).slice(-MAX_MSGS), pin: 0, ts: Date.now() });
  let sessions = [];
  let cur = 0;
  let aiUnread = 0;
  let aiPinned = true;
  try {
    const raw = JSON.parse(localStorage.getItem(STORE) || '[]');
    if (Array.isArray(raw)) sessions = [mkSession((() => { try { return localStorage.getItem(NAME_KEY) || ''; } catch (_) { return ''; } })(), raw)];
    else if (raw && raw.v === 2 && Array.isArray(raw.list) && raw.list.length) { sessions = raw.list; cur = Math.min(+raw.cur || 0, sessions.length - 1); }
    else sessions = [mkSession('', [])];
  } catch (_) { sessions = [mkSession('', [])]; }
  msgs = sessions[cur].msgs;
  let theme = (() => { try { const t = localStorage.getItem(THEME_KEY); return THEMES[t] ? t : 'light'; } catch (_) { return 'light'; } })();

  const esc = (s) => { const d = document.createElement('div'); d.textContent = String(s ?? ''); return d.innerHTML; };
  const token = () => { try { return localStorage.getItem('ahPubToken') || sessionStorage.getItem('ahPubToken') || ''; } catch (_) { return ''; } };
  const save = () => { try { sessions[cur].msgs = msgs.slice(-MAX_MSGS); sessions[cur].ts = Date.now(); localStorage.setItem(STORE, JSON.stringify({ v: 2, list: sessions, cur: cur })); } catch (_) {} };
  const curTitle = () => (sessions[cur] && sessions[cur].name ? sessions[cur].name : T.title);
  const fmtDay = (ts) => { try { const d = new Date(ts), n = new Date(); return d.toDateString() === n.toDateString() ? fmtTime(ts) : d.toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', { day: 'numeric', month: 'short' }); } catch (_) { return ''; } };
  const fmtTime = (ts) => { try { return new Date(ts).toLocaleTimeString(lang === 'bn' ? 'bn-BD' : 'en-US', { hour: '2-digit', minute: '2-digit' }); } catch (_) { return ''; } };
  const toast = (m) => { const old = document.querySelector('.ai-toast'); if (old) old.remove(); const el = document.createElement('div'); el.className = 'ai-toast'; el.textContent = m; document.body.appendChild(el); setTimeout(() => el.remove(), 2300); };
  const isAuthed = () => !!token();

  /* ── markdown-lite v3 (escape-first; heading/para/bullets/num/code/formula/tip/example/warn/table/links) ── */
  function md(html) {
    const codeBlocks = [];
    const extra = [];
    const put = (h) => { extra.push(h); return '\u0000DX' + (extra.length - 1) + '\u0000'; };
    html = html.replace(/```([\s\S]*?)```/g, (m, c) => { codeBlocks.push(c); return '\u0000CB' + (codeBlocks.length - 1) + '\u0000'; });
    html = html.replace(/((?:^\|.*\|\s*$\n?)+)/gm, (block) => {
      const rows = block.trim().split('\n').map((r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
      if (rows.length < 2) return block;
      const head = rows[0]; let out = '<table><thead><tr>' + head.map((c) => '<th>' + c + '</th>').join('') + '</tr></thead><tbody>';
      for (const r of rows.slice(1)) { if (r.length === 1 && /^:?-{2,}:?$/.test(r[0])) continue; out += '<tr>' + r.map((c) => '<td>' + c + '</td>').join('') + '</tr>'; }
      return out + '</tbody></table>';
    });
    let defLine = '';
    if (html.length < 520) {
      const dm = html.match(/^(?:[^\n]{0,44}?)(?:হলো|হল|মানে|বলে|কে বোঝায়|definition|means|is the)[^\n]{0,210}/i);
      if (dm && dm[0] && dm[0].length <= 240) { defLine = dm[0]; html = html.slice(dm[0].length).replace(/^\n+/, ''); }
    }
    /* ── ডেটা: ৩+ লাইন 'নাম: NN%' → বার-চার্ট ── */
    html = html.replace(/((?:^[^\n]{1,30}?[:：]\s*[\d০-৯]{1,3}(?:[.,][\d০-৯]+)?\s*%\s*\n){3,})/gm, (block) => {
      const bnD = { '০':'0','১':'1','২':'2','৩':'3','৪':'4','৫':'5','৬':'6','৭':'7','৮':'8','৯':'9' };
      const toEn = (x) => String(x).replace(/[০-৯]/g, (d) => bnD[d]).replace(/,/g, '.');
      const rows = block.trim().split('\n').map((r) => { const mm = r.match(/^\s*(.{1,28}?)\s*[:：]\s*([\d০-৯]{1,3}(?:[.,][\d০-৯]+)?)\s*%\s*$/); return mm ? [mm[1], Math.max(0, Math.min(100, parseFloat(toEn(mm[2]))))] : null; }).filter(Boolean);
      if (rows.length < 3) return block;
      return put('<div class="ai-stats">' + rows.map((r) => '<div class="ai-stat"><div class="lbl"><span>' + r[0] + '</span><span class="v">' + r[1] + '%</span></div><div class="tr"><div class="fl" style="width:' + r[1] + '%"></div></div></div>').join('') + '</div>') + '\n';
    });
    /* ── টাইমলাইন: ৩+ লাইন 'YYYY — বিবরণ' ── */
    html = html.replace(/((?:^[^\n]*[\d০-৯]{3,4}\s*[–—-]\s*[^\n]*\n|^[ \t]*\n){3,})/gm, (block) => {
      const items = block.trim().split('\n').map((r) => { const mm = r.match(/^\s*([\d০-৯]{3,4})\s*[–—-]\s*(.+)$/); return mm ? [mm[1], mm[2].trim()] : null; }).filter(Boolean);
      if (items.length < 3) return block;
      return put('<div class="ai-timeline">' + items.map((it) => '<div class="ai-tl"><div class="yr">' + it[0] + '</div><div class="ds">' + it[1] + '</div></div>').join('') + '</div>') + '\n';
    });
    /* ── চেকলিস্ট ── */
    html = html.replace(/((?:^[*+-]\s*\[[ xX]\]\s*[^\n]*\n?)+)/gm, (block) => {
      const items = block.trim().split('\n').map((r) => { const mm = r.match(/^\s*[*+-]\s*\[([ xX])\]\s*(.+)$/); return mm ? [mm[1].toLowerCase() === 'x' ? 1 : 0, mm[2]] : null; }).filter(Boolean);
      if (!items.length) return block;
      return put('<ul class="ai-checklist">' + items.map((it) => '<li class="' + (it[0] ? 'done' : '') + '"><span class="bx">' + (it[0] ? '✓' : '') + '</span><span>' + it[1] + '</span></li>').join('') + '</ul>') + '\n';
    });
    let s = html
      .replace(/^### (.*)$/gm, '<h3>$1</h3>').replace(/^## (.*)$/gm, '<h2>$1</h2>').replace(/^# (.*)$/gm, '<h1>$1</h1>')
      .replace(/^([✅📌🧠📚💡⚠️])?\s*(.*)$/gm, (m, ic, txt) => {
        if (!ic || !txt.trim()) return m;
        const map = { '✅': ['success', '✅'], '📌': ['keypoint', '📌'], '🧠': ['concept', '🧠'], '📚': ['revision', '📚'], '💡': ['tip', '💡'], '⚠️': ['warn', '⚠️'] };
        const k = map[ic]; if (!k) return m;
        return '<div class="ai-callout ' + k[0] + '"><b>' + k[1] + '</b> ' + txt + '</div>';
      })
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
    if (defLine) s = s.replace('<div class="ai-msg-body">', '<div class="ai-msg-body"><div class="ai-callout define"><b>🧠 ' + esc(T.defLbl) + '</b> ' + defLine.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>') + '</div>');
    s = s.replace(/<table>/g, '<div class="ai-twrap"><table>').replace(/<\/table>/g, '</table></div>');
    return s.replace(/\u0000CB(\d+)\u0000/g, (m, i) => '<pre><code>' + esc(codeBlocks[+i]).replace(/\n$/, '') + '</code></pre>').replace(/\u0000DX(\d+)\u0000/g, (m, i) => extra[+i]);
  }

  /* ── shell ── */
  function shell() {
    return `<div class="ai-agent-root" data-theme="${theme}"><div class="ai-agent-head">
      <button class="ai-icobtn ai-ham" id="aiMenuBtn" aria-label="${esc(T.menu)}" title="${esc(T.menu)}">☰</button>
      <div class="ai-orb" aria-hidden="true"></div>
      <div class="ai-agent-t"><b id="aiTitleTxt">${esc(curTitle())}</b><span><span class="ai-online-dot"></span>${esc(T.sub)} · ${esc(T.online)}</span></div>
      <button class="ai-icobtn ai-plushead" id="aiNewBtn" aria-label="${esc(T.menuNew)}" title="${esc(T.menuNew)}">＋</button></div>
      <div class="ai-agent-body" id="aiAgentBody"></div>
      <div class="ai-agent-foot" id="aiAgentFoot">
        <div id="aiAttachWrap"></div>
        <div class="ai-compose">
          <button class="ai-plus" id="aiPlusBtn" type="button" aria-label="${esc(T.attach)}">＋</button>
          <div class="ai-compose-mid"><div class="ai-editor" id="aiInput" contenteditable="true" role="textbox" aria-multiline="true" data-ph="${esc(T.ph)}" aria-label="Message AI"></div></div>
          <button class="ai-mic" id="aiMicBtn" type="button" aria-label="Voice">🎙</button>
          <button class="ai-send" id="aiSendBtn" type="button" aria-label="${esc(T.send)}">➤</button>
        </div></div><button class="ai-latest" id="aiLatest" aria-label="${esc(T.latest)}" title="${esc(T.latest)}">↓<i class="cnt" id="aiLatestCnt">0</i></button></div>`;
  }
  function drawerPanel() {
    const p = document.createElement('div');
    p.className = 'ai-drawerback';
    const list = sessions.slice().sort((a, b) => (b.pin - a.pin) || (b.ts - a.ts));
    p.innerHTML = `<div class="ai-drawer" role="dialog" aria-label="${esc(T.menu)}">
      <div class="ai-dr-head"><div class="ai-orb small"></div><div class="ai-dr-t"><b>${esc(T.title)}</b><span>${esc(T.sub)} · ${esc(T.online)}</span></div><button class="x" id="aiDrawerX" aria-label="${esc(T.close)}">×</button></div>
      <div class="ai-dr-acts">
        <button data-act="new">＋ <b>${esc(T.menuNew)}</b>${msgs.length ? `<span class="hint">${esc(T.newIsEmpty)}</span>` : ''}</button>
        <button data-act="search">🔍 <b>${esc(T.menuSearch)}</b></button>
      </div>
      <div class="ai-dr-lbl">${esc(T.recentChats)}</div>
      <div class="ai-dr-list">${list.map((s2) => {
        const i = sessions.indexOf(s2);
        return `<div class="ai-recent ${i === cur ? 'on' : ''}" data-i="${i}"><span class="ic">${s2.pin ? '📌' : '💬'}</span><span class="nm">${esc(s2.name || T.untitled)}</span><span class="ts">${esc(fmtDay(s2.ts))}</span><button class="rs" data-rm="${i}" aria-label="${esc(T.menu)}">⋯</button></div>`;
      }).join('') || `<div class="ai-dr-empty">${esc(T.noChats)}</div>`}</div>
      <div class="ai-dr-lbl">${esc(T.themeOpt)}</div>
      <div class="ai-dr-themes">
        <button data-theme="light">☀️ ${esc(T.themeLight)}</button>
        <button data-theme="dark">🌙 ${esc(T.themeDark)}</button>
        <button data-theme="oled">⬛ ${esc(T.themeOled)}</button>
      </div>
      <div class="ai-dr-acts">
        ${isAuthed() ? `<button data-act="profile">👤 <b>${esc(T.aiProfile)}</b></button>` : `<button data-act="login">👤 <b>${esc(T.loginBtn)}</b></button>`}
        <button data-act="home">‹ <b>${esc(T.backHome)}</b></button>${isAuthed() ? '' : `<span class="ai-dr-note">${esc(T.loginNote)}</span>`}
      </div>
      <div class="ai-dr-foot">
        <button data-act="rename">✏️ ${esc(T.menuRename)}</button>
        <button data-act="export">📤 ${esc(T.menuExport)}</button>
        <button data-act="clear">🧹 ${esc(T.menuClear)}</button>
        <button data-act="del" class="danger">🗑 ${esc(T.menuDelete)}</button>
      </div></div>`;
    p.addEventListener('click', (e) => { if (e.target === p) closeMenu(); });
    p.querySelectorAll('[data-act]').forEach((b) => {
      const act = b.getAttribute('data-act');
      b.addEventListener('click', () => {
        if (act === 'new') { closeMenu(); newChat(); }
        else if (act === 'rename') { closeMenu(); renameChat(); }
        else if (act === 'search') { closeMenu(); openSearch(); }
        else if (act === 'export') { closeMenu(); exportChat(); }
        else if (act === 'clear') { closeMenu(); clearMsgs(); }
        else if (act === 'del') { closeMenu(); delChat(); }
        else if (act === 'login') { closeMenu(); if (window.__AiAgentLogin) window.__AiAgentLogin(); }
        else if (act === 'profile') { closeMenu(); toast(T.aiProfile); }
        else if (act === 'home') { closeMenu(); backHome(); }
      });
    });
    p.querySelectorAll('[data-theme]').forEach((b) => b.addEventListener('click', () => { setTheme(b.getAttribute('data-theme')); }));
    p.querySelectorAll('[data-i]').forEach((row) => row.addEventListener('click', (e) => { if (e.target.closest('.rs')) return; const i = +row.getAttribute('data-i'); if (i !== cur) switchChat(i); closeMenu(); }));
    p.querySelectorAll('[data-rm]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); itemMenu(+b.getAttribute('data-rm'), b); }));
    const x = p.querySelector('#aiDrawerX'); if (x) x.addEventListener('click', closeMenu);
    return p;
  }
  function itemMenu(i, anchor) {
    const s2 = sessions[i]; if (!s2) return;
    const act = prompt(T.itemAct + '\n1. ' + T.pinChat + '\n2. ' + T.menuRename + '\n3. ' + T.menuDelete + '\n4. ' + T.cancelBtn, '1');
    if (act === '1') { s2.pin = s2.pin ? 0 : 1; save(); }
    else if (act === '2') { const nm = prompt(T.menuRename + ':', s2.name || ''); if (nm !== null) { s2.name = nm.trim(); if (i === cur) { try { localStorage.setItem(NAME_KEY, s2.name); } catch (_) {} } } save(); }
    else if (act === '3') { if (!confirm(T.confirmDel)) return; const wasCur = i === cur; sessions.splice(i, 1); if (!sessions.length) sessions = [mkSession('', [])]; if (wasCur || cur >= sessions.length) { cur = Math.min(i, sessions.length - 1); msgs = sessions[cur].msgs; render(); return; } save(); }
    if (menuOpen) { closeMenu(); menuOpen = true; document.body.appendChild(drawerPanel()); }
  }
  function backHome() { const nb = document.querySelector('.bottomnav'); if (nb) nb.style.display = ''; if (window.navigate) window.navigate('dashboard'); else history.back(); }
  function applyThemeVars() {
    const r = document.querySelector('.ai-agent-root'); if (!r) return;
    const t = THEMES[theme] || THEMES.light;
    for (const k of ['bg', 'card', 'ink', 'sub', 'primary', 'mint', 'line', 'user']) r.style.setProperty('--ai-' + k, t[k]);
  }
  function setTheme(t) { theme = THEMES[t] ? t : 'light'; try { localStorage.setItem(THEME_KEY, theme); } catch (_) {} const r = document.querySelector('.ai-agent-root'); if (r) r.setAttribute('data-theme', theme); applyThemeVars(); renderChrome(); }
  function closeMenu() { menuOpen = false; const m = document.querySelector('.ai-drawerback') || document.querySelector('.ai-menu'); if (m) m.remove(); }
  function setSheetUI(open) { attachOpen = open;
    const plus = document.getElementById('aiPlusBtn'); if (plus) plus.classList.toggle('plus-on', open);
    const nav = document.querySelector('.bottomnav');
    const onAi = !!document.querySelector('.ai-agent-root');
    if (nav) nav.style.display = (open || onAi) ? 'none' : '';
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
    const base = (kind === 'explain' || kind === 'summ') && inputVal() ? inputVal() : '';
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
  function newChat() { if (msgs.length === 0) { render(); return; } sessions.push(mkSession('', [])); cur = sessions.length - 1; msgs = sessions[cur].msgs; aiPinned = true; save(); render(); }
  function switchChat(i) { if (i === cur || !sessions[i]) return; save(); cur = i; msgs = sessions[cur].msgs; aiPinned = true; render(); }
  function clearMsgs() { if (!confirm(T.confirmClear)) return; msgs = []; aiPinned = true; save(); render(); }
  function delChat() {
    if (!confirm(T.confirmDel)) return;
    sessions.splice(cur, 1);
    if (!sessions.length) sessions = [mkSession('', [])];
    cur = Math.min(cur, sessions.length - 1);
    msgs = sessions[cur].msgs;
    save(); render(); toast(T.delDone);
  }
  function renameChat() {
    const prev = (sessions[cur] && sessions[cur].name) || (() => { try { return localStorage.getItem(NAME_KEY) || ''; } catch (_) { return ''; } })();
    const name = prompt(T.menuRename + ':', prev || T.title);
    if (name === null) return;
    sessions[cur].name = name.trim(); sessions[cur].ts = Date.now();
    try { localStorage.setItem(NAME_KEY, sessions[cur].name); } catch (_) {}
    save();
    const b = document.getElementById('aiTitleTxt') || document.querySelector('.ai-agent-t b');
    if (b) b.textContent = sessions[cur].name || T.title;
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
      if (t) { const el = inputEl(); if (el) { const cur = inputVal(el); setInput(el, cur ? cur + ' ' + t : t); } }
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
        <div class="ai-msg-bar"><button class="ab" onclick="window.__AiAgentRetry&&__AiAgentRetry()" title="${esc(T.retry)}" aria-label="${esc(T.retry)}">${ICONS.regen}</button>${m.login ? `<button class="abtxt" onclick="window.__AiAgentLogin&&__AiAgentLogin()">→ ${esc(T.loginBtn)}</button>` : ''}</div></div>`;
    }
    const quizHtml = m.quiz ? quizCardHtml(m, idx) : '';
    const bodyHtml = quizHtml || md(esc(m.text));
    const follow = m.quiz ? '' : `<div class="ai-followup">${followups(m).map((f) => `<button data-q="${esc(f[2])}">${ICONS[f[0]] || ''}${esc(f[1])}</button>`).join('')}</div>`;
    return `<div class="ai-msg ai"><div class="ai-msg-head"><span class="mini"></span>${esc(T.title)}</div>${bodyHtml}
      <div class="ai-msg-bar">
        <button class="ab" data-t="${esc(m.text)}" onclick="window.__AiAgentCopy(this)" title="${esc(T.copy)}" aria-label="${esc(T.copy)}">${ICONS.copy}</button>
        <button class="ab ${m.fb === 'up' ? 'on' : ''}" data-fb="up" data-i="${idx}" onclick="window.__AiAgentFb(this)" title="${esc(T.liked)}" aria-label="${esc(T.liked)}">${ICONS.like}</button>
        <button class="ab ${m.fb === 'down' ? 'on' : ''}" data-fb="down" data-i="${idx}" onclick="window.__AiAgentFb(this)" title="${esc(T.feedbackQ)}" aria-label="${esc(T.feedbackQ)}">${ICONS.dislike}</button>
        <button class="ab" data-i="${idx}" onclick="window.__AiAgentShare(this)" title="${esc(T.shareBtn)}" aria-label="${esc(T.shareBtn)}">${ICONS.share}</button>
        ${m.regen ? `<button class="ab" onclick="window.__AiAgentRegen&&__AiAgentRegen()" title="${esc(T.regen)}" aria-label="${esc(T.regen)}">${ICONS.regen}</button>` : ''}
        <span class="sp"></span>
        <button class="ab" data-more="${idx}" onclick="window.__AiAgentMore(this)" title="${esc(T.more)}" aria-label="${esc(T.more)}">${ICONS.more}</button>
      </div>${follow}</div>`;
  }
  function followups(m) {
    const t = String(m.text || '');
    const topic = lastTopic(m);
    const P = lang === 'en' ? {
      shorten: (x) => 'Briefly summarize: ' + x, simple: (x) => 'Explain in simpler words: ' + x, points: (x) => 'List the key points: ' + x,
      similar: (x) => 'Create 3 more similar MCQs from: ' + x, quiz: (x) => 'Quiz me with 5 questions on: ' + x, explain: (x) => 'Explain this topic: ' + x,
      example: (x) => 'Give more examples of: ' + x, mcq: (x) => 'Create 5 MCQs from: ' + x, revise: (x) => 'Make a revision note on: ' + x
    } : {
      shorten: (x) => 'সংক্ষেপে বলো: ' + x, simple: (x) => 'আরও সহজ করে বলো: ' + x, points: (x) => 'মূল পয়েন্টগুলো দাও: ' + x,
      similar: (x) => 'এ রকম আরও ৩টা MCQ বানাও: ' + x, quiz: (x) => 'এই টপিক নিয়ে ৫টা প্রশ্নে quiz নাও: ' + x, explain: (x) => 'এই টপিকটা বুঝিয়ে দাও: ' + x,
      example: (x) => 'আরও উদাহরণ দাও: ' + x, mcq: (x) => 'এই টপিক থেকে ৫টা MCQ বানাও: ' + x, revise: (x) => 'এই টপিকের revision note বানাও: ' + x
    };
    const long = t.length > 750 || (t.match(/\n{1,}/g) || []).length > 10 || (t.match(/[.!?।]/g) || []).length > 16;
    const hasMcqList = /(mcq|প্রশ্ন দিয়ে|কুইজ|quiz)/i.test(t) && (/[0-9]+[.)]/.test(t) || /[কখগঘঙ]/i.test(t.slice(0, 400)));
    const isTest = /quiz|কুইজ|পরীক্ষা|test/i.test(t);
    const def = /(কী |কাকে |বলে|মানে |সংজ্ঞা|definition|means|explain|হল:|হচ্ছে)/i.test(t);
    if (long) return [['zap', T.chzShorten, P.shorten(topic)], ['sparkle', T.chzSimple, P.simple(topic)], ['list', T.chzPoints, P.points(topic)]];
    if (hasMcqList || isTest) return [['pencil', T.chzSimilarMcq, P.similar(topic)], ['target', T.chzQuiz, P.quiz(topic)], ['sparkle', T.chzExplain, P.explain(topic)]];
    if (def) return [['sparkle', T.chzSimple, P.simple(topic)], ['book', T.chzExample, P.example(topic)], ['target', T.chzQuiz, P.quiz(topic)]];
    return [['pencil', T.chzMcq, P.mcq(topic)], ['target', T.chzQuiz, P.quiz(topic)], ['book', T.chzRevise, P.revise(topic)]];
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
    const lastM = msgs[msgs.length - 1];
    if (lastM && lastM.role === 'ai' && typeof window.__aiMarkNew === 'function' && window.__aiMarkLast !== lastM) { window.__aiMarkLast = lastM; window.__aiMarkNew(); }
    requestAnimationFrame(() => {
      b.querySelectorAll('.ai-stat .v').forEach((el) => {
        if (el.dataset.cd) return; el.dataset.cd = '1';
        const t = el.textContent; const v = parseFloat(t); if (!isFinite(v)) return;
        const units = t.replace(/[\d.]+/, ''); const t0 = performance.now(); const dur = 750;
        const step = (now) => { const k = Math.min(1, (now - t0) / dur); el.textContent = Math.round(v * (k < 1 ? 1 - Math.pow(1 - k, 3) : 1)) + units; if (k < 1) requestAnimationFrame(step); };
        requestAnimationFrame(step);
      });
    });
  }
  function wireEmpty() {
    const cta = document.getElementById('aiHeroCta');
    if (cta) cta.addEventListener('click', () => { input.focus(); });
    const nx = document.getElementById('aiNoticeX');
    if (nx) nx.addEventListener('click', () => { try { localStorage.setItem(NOTICE_KEY, 'true'); } catch (_) {} const n = document.getElementById('aiNotice'); if (n) n.remove(); });
    document.querySelectorAll('.ai-chip').forEach((c) => c.addEventListener('click', () => send(c.getAttribute('data-q'))));
    if (!window.__aiFollowupDeleg) { window.__aiFollowupDeleg = true; document.addEventListener('click', (e) => { const b = e.target.closest('.ai-followup button'); if (b) send(b.getAttribute('data-q') || ''); }); }
  }
  function scrollBottom(force) {
    const b = body(); if (!b) return;
    const near = b.scrollHeight - b.scrollTop - b.clientHeight < 150;
    if (force || aiPinned || near) b.scrollTop = b.scrollHeight;
  }
  /* ব্যবহারকারী উপরে থাকলে টেনে নামাই না */
  function scrollPinStart() { const b = body(); if (!b) return; if (b.scrollHeight - b.scrollTop - b.clientHeight < 320) b.scrollTop = b.scrollHeight; }

  /* ── streaming ── */
  function thinkingCard(cls) {
    return `<div class="ai-think ${cls || ''}"><div class="ob"></div><div class="tx"><b>✦</b><span id="aiThinkStatus">${esc(T.stThink)}</span></div></div>`;
  }
  function thinkingStatus(label) { const el = document.getElementById('aiThinkStatus'); if (el) el.textContent = label; }
  const thinkTimers = [];
  function clearThinkTimers() { while (thinkTimers.length) { clearTimeout(thinkTimers.pop()); } }
  function appendThinking(sig) {
    const b = body(); if (!b) return;
    b.insertAdjacentHTML('beforeend', thinkingCard(sig.search ? 'tq-search' : (sig.image || sig.doc) ? 'tq-analyze' : (sig.quiz || sig.mcq) ? 'tq-create' : ''));
    scrollBottom(true);
    clearThinkTimers();
    const seq = [];
    seq.push([0, T.stThink]);
    seq.push([1000, T.stAnalyze]);
    if (sig.image) seq.push([2200, T.stImage]);
    else if (sig.doc) seq.push([2200, T.stDoc]);
    else if (sig.search) seq.push([2200, T.stSearch]);
    else if (sig.quiz && sig.mcq) seq.push([2200, T.stMcq]);
    else if (sig.quiz) seq.push([2200, T.stQuiz]);
    seq.push([Math.min(5600, 2200 + seq.length * 800), T.stWrite]);
    for (const [ms, label] of seq) thinkTimers.push(setTimeout(() => thinkingStatus(label), ms));
    thinkTimers.push(setTimeout(scrollPinStart, 450));
  }
  function removeThinking() { clearThinkTimers(); const el = document.querySelector('.ai-think'); if (el) el.remove(); }
  function appendStream(chunk) {
    if (!streamingEl) {
      const b = body(); if (!b) return;
      streamingEl = document.createElement('div');
      streamingEl.className = 'ai-msg ai';
      streamingEl.innerHTML = `<div class="ai-msg-head"><span class="mini"></span>${esc(T.title)}</div><div class="ai-msg-body"><p><span class="ai-cursor"></span></p></div>`;
      b.appendChild(streamingEl);
      scrollPinStart();
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
    const c = document.querySelector('.ai-compose');
    if (c) c.classList.toggle('streaming', !!streaming);
  }
  async function send(prefill) {
    const q = String(prefill ?? inputVal()).trim();
    if (!q && !attachments.length) return;
    if (activeReq) return;
    if (q.length > 4000) { toast(T.msgTooLong); inputEl() && inputEl().focus(); return; }
    const imgItem = attachments.find((a) => a.kind === 'image' && a.dataUrl);
    const docItem = attachments.find((a) => a.kind !== 'image');
    const text = q || (imgItem ? (lang === 'en' ? 'Explain this image' : 'এই ছবিটা বুঝিয়ে দাও') : '');
    const note = docItem ? `\n\n[📄 ${docItem.name} — ${T.docSoon}]` : '';
    const fullText = text + note;
    if (docItem) toast(T.docSoon);
    setInput(null, '');
    attachments = []; renderAttach();
    const m = { role: 'user', text: fullText, ts: Date.now(), image: imgItem ? imgItem.dataUrl : '' };
    msgs.push(m); save(); renderMsgs();
    stopVoice(true);
    stoppedEarly = false;
    streamingEl = null;
    appendThinking({
      image: !!imgItem,
      doc: !!docItem,
      quiz: /quiz|প্রশ্ন দিয়ে|mcq/i.test(fullText),
      mcq: /mcq/i.test(fullText),
      search: /খোঁজো|খোঁজ|search|নিউজ|news|সর্বশেষ ভর্তি|ভর্তি নিউজ|আপডেট খোঁজ/i.test(fullText)
    });
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
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => { const o = el.innerHTML; el.innerHTML = ICONS.check; setTimeout(() => { el.innerHTML = o; }, 1300); }).catch(() => toast(T.copyFail));
  }
  function shareBtn(el) {
    const i = +el.getAttribute('data-i'); const m = msgs[i]; if (!m || !m.text) return;
    const url = location.href.split('#')[0];
    if (navigator.share) { navigator.share({ title: T.title, text: String(m.text).slice(0, 900), url }).catch(() => {}); }
    else if (navigator.clipboard) { navigator.clipboard.writeText(String(m.text)).then(() => toast(T.copied)).catch(() => {}); }
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
  window.__AiAgentShare = shareBtn;
  window.__AiAgentRetry = retry;
  window.__AiAgentRegen = regen;
  window.__AiAgentLogin = loginCta;
  window.__AiAgentFb = fbBtn;
  window.__AiAgentMore = moreMenu;
  window.__AiAgentStopVoice = () => stopVoice(true);

  /* ── composer helpers ── */
  function inputEl() { return document.getElementById('aiInput'); }
  function inputVal(el) { const e = el || inputEl(); return e ? (e.textContent || '').replace(/\u00a0/g, ' ').trim() : ''; }
  function setInput(el, txt) { const e = el || inputEl(); if (!e) return; e.textContent = txt; autoGrow(); }
  const input = {
    get value() { const i = inputEl(); return i ? (i.textContent || '').replace(/\u00a0/g, ' ') : ''; },
    set value(v) { const i = inputEl(); if (i) { i.textContent = v; autoGrow(); } },
    focus() { const i = inputEl(); if (i) i.focus(); }
  };
  function insertAtCursor(txt) {
    const el = inputEl(); if (!el) return;
    let node = el, off = (el.textContent || '').length;
    const sel = window.getSelection();
    if (sel && sel.rangeCount && el.contains(sel.anchorNode)) { const r = sel.getRangeAt(0); node = r.endContainer; off = r.endOffset; }
    try {
      const r = document.createRange();
      if (node === el) { r.setStart(el.firstChild || el, Math.min(off, (el.textContent || '').length)); r.collapse(true); r.insertNode(document.createTextNode(txt)); }
      else { r.setStart(node, off); r.collapse(true); r.insertNode(document.createTextNode(txt)); }
      const tn = el.lastChild;
      if (tn) { r.setStartAfter(tn); r.setEndAfter(tn); } 
      if (sel) { try { sel.removeAllRanges(); sel.addRange(r); } catch (_) {} }
    } catch (_) { el.appendChild(document.createTextNode(txt)); }
    autoGrow();
  }
  function autoGrow() { const i = document.getElementById('aiInput'); if (i) { i.style.height = 'auto'; i.style.height = Math.min(i.scrollHeight, 128) + 'px'; } updateComposeState(); }
  function updateComposeState() {
    const i = inputEl(); if (!i) return;
    const c = document.querySelector('.ai-compose');
    if (c) c.classList.toggle('dirty', (i.textContent || '').length > 0);
  }
  function renderChrome() {}

  /* ── page render ── */
  function render() {
    const root = document.querySelector('#app') || document.body;
    root.innerHTML = shell();
    applyThemeVars();
    const inp = document.getElementById('aiInput');
    const sendBtn = document.getElementById('aiSendBtn');
    const plusBtn = document.getElementById('aiPlusBtn');
    const micBtn = document.getElementById('aiMicBtn');
    const menuBtn = document.getElementById('aiMenuBtn');
    const newBtn = document.getElementById('aiNewBtn');
    if (inp) {
      /* iOS form-accessory (↑↓✓) দমন */
      inp.addEventListener('touchstart', () => { if (inp.getAttribute('contenteditable') === 'true') { inp.setAttribute('contenteditable', 'false'); } }, { passive: true });
      inp.addEventListener('pointerdown', () => { if (inp.getAttribute('contenteditable') === 'true') { inp.setAttribute('contenteditable', 'false'); } }, { passive: true });
      inp.addEventListener('touchend', () => { if (inp.getAttribute('contenteditable') === 'false') { setTimeout(() => inp.setAttribute('contenteditable', 'true'), 260); } }, { passive: true });
      inp.addEventListener('blur', () => { if (inp.getAttribute('contenteditable') === 'false') { inp.setAttribute('contenteditable', 'true'); } });
      inp.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' || e.isComposing) return;
        if (e.ctrlKey || e.metaKey) { e.preventDefault(); send(); return; }
        e.preventDefault();
        try { document.execCommand('insertText', false, '\n'); } catch (_) {}
        if (!inputVal(inp).includes('\n') || !(inp.textContent || '').includes('\n')) insertAtCursor('\n');
        autoGrow();
      });
      inp.addEventListener('input', autoGrow);
      inp.addEventListener('paste', (e) => { e.preventDefault(); const t = (e.clipboardData || window.clipboardData).getData('text/plain'); if (t) { try { document.execCommand('insertText', false, t); } catch (_) {} if (t.length > 4 && !(inp.textContent || '').includes(t.slice(0, 4))) insertAtCursor(t); autoGrow(); } });
    }
    /* ফুল-স্ক্রিন: AI-পেজে navigation-bar hide */
    const navBar = document.querySelector('.bottomnav');
    if (navBar) navBar.style.display = 'none';
    /* back → nav ফেরত + dashboard */
    const backBtn = document.getElementById('aiBackBtn');
    if (backBtn) backBtn.addEventListener('click', () => { const nb = document.querySelector('.bottomnav'); if (nb) nb.style.display = ''; if (window.navigate) window.navigate('dashboard'); else history.back(); });
    /* keyboard-aware: composer keyboard-এর ঠিক উপরে */
    const kbd = (() => {
      const vv = window.visualViewport;
      const upd = () => {
        const r = document.querySelector('.ai-agent-root');
        let kb = 0;
        if (vv && window.innerHeight - vv.height > 60) kb = Math.max(0, window.innerHeight - vv.height - (vv.offsetTop || 0));
        if (r) r.style.setProperty('--ai-kb', kb + 'px');
      };
      if (window.__aiKbUpd) { try { vv && vv.removeEventListener('resize', window.__aiKbUpd); vv && vv.removeEventListener('scroll', window.__aiKbUpd); } catch (_) {} window.removeEventListener('resize', window.__aiKbUpd); }
      window.__aiKbUpd = upd;
      if (vv) { try { vv.addEventListener('resize', upd); vv.addEventListener('scroll', upd, { passive: true }); } catch (_) {} }
      window.addEventListener('resize', upd, { passive: true });
      if (inp) inp.addEventListener('focus', () => setTimeout(upd, 180));
      upd();
    })();
    /* ↓ Latest: উপরে scroll করলে ফ্লোটিং */
    const body = document.getElementById('aiAgentBody');
    const latest = document.getElementById('aiLatest');
    let raf = null;
    const updCnt = () => { const c = document.getElementById('aiLatestCnt'); if (c) c.textContent = aiUnread > 9 ? '9+' : String(aiUnread); if (latest) latest.classList.toggle('new', aiUnread > 0); };
    const scrollUpd = () => {
      if (!body || !latest) return;
      const off = body.scrollHeight - body.scrollTop - body.clientHeight;
      aiPinned = off < 150;
      latest.classList.toggle('show', off > 300);
      if (off <= 300 && aiUnread) { aiUnread = 0; updCnt(); }
    };
    window.__aiMarkNew = () => { if (!body || !latest) return; const off = body.scrollHeight - body.scrollTop - body.clientHeight; if (off > 300) { aiUnread++; updCnt(); } };
    if (body) body.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(() => { raf = null; scrollUpd(); }); }, { passive: true });
    if (latest) latest.addEventListener('click', () => { aiUnread = 0; updCnt(); if (body) body.scrollTo({ top: body.scrollHeight, behavior: 'smooth' }); });
    scrollUpd();
    updateComposeState();
    if (sendBtn) sendBtn.addEventListener('click', () => { activeReq ? stop() : send(); });
    if (plusBtn) plusBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (attachOpen) closeAttach(); else { closeMenu(); setSheetUI(true); document.body.appendChild(sheet()); }
    });
    if (micBtn) micBtn.addEventListener('click', (e) => { e.stopPropagation(); startVoice(); });
    if (menuBtn) menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (menuOpen) closeMenu(); else { menuOpen = true; closeAttach(); document.body.appendChild(drawerPanel()); }
    });
    if (newBtn) newBtn.addEventListener('click', () => {
      if (inputVal() && !window.confirm(T.newIsEmpty)) return;
      newChat();
    });
    /* composer actual-height reserve (fixed-layout safety) */
    const compRO = () => { const c = document.querySelector('.ai-compose'); const r = document.querySelector('.ai-agent-root'); if (c && r) r.style.setProperty('--ai-comp-h', Math.round(c.getBoundingClientRect().height) + 'px'); };
    compRO(); if (window.__aiCompRO) { try { window.__aiCompRO.disconnect(); } catch (_) {} }
    if (window.ResizeObserver) { try { window.__aiCompRO = new ResizeObserver(compRO); const c = document.querySelector('.ai-compose'); if (c) window.__aiCompRO.observe(c); } catch (_) {} }
    setSendBtn(!!activeReq);
    renderMsgs();
    const tbx = document.getElementById('aiTitleTxt') || document.querySelector('.ai-agent-t b');
    if (tbx) tbx.textContent = sessions[cur] && sessions[cur].name ? sessions[cur].name : T.title;
  }

  window.renderAiAgentPage = render;
  window.__AiAgentTest = { get msgs() { return msgs.slice(); }, send, retry, regen, stop, newChat, T, parseQuiz };
  document.addEventListener('click', (e) => {
    if (menuOpen && !e.target.closest('.ai-drawer') && !e.target.closest('#aiMenuBtn')) closeMenu();
    if (attachOpen && document.getElementById('aiSheetView') && !e.target.closest('.ai-sheet') && !e.target.closest('#aiPlusBtn')) closeAttach();
  });
})();
