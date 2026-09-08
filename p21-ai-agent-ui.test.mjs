// P21 — CHATBOT V1 (Premium AI Assistant) ইন্টিগ্রেশন-টেস্ট
// মালিক-স্পেক ২০২৬-০৯-০৮: hero-card/notice/chips/quiz-card/sheet/themes/menu …
import { readFileSync, existsSync } from 'fs';
let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; console.log('  ✓', n); } else { fail++; console.log('  ✗', n); } };
const H = readFileSync('index.html', 'utf8');
const SW = readFileSync('sw.js', 'utf8');
const V2 = readFileSync('dashboard-v2.js', 'utf8');
const PW = readFileSync('public-worker.js', 'utf8');
const UI = existsSync('ai-agent-chat.js') ? readFileSync('ai-agent-chat.js', 'utf8') : '';
const AG = existsSync('ai-agent.js') ? readFileSync('ai-agent.js', 'utf8') : '';

/* ── ১. রুট + স্ক্রিপ্ট ── */
t('১. index.html-এ ai-রুট dispatch (renderAiAgentPage)', H.includes("if(p==='ai'){ if(window.renderAiAgentPage)"));
t('২. ai-agent-chat.js স্ক্রিপ্ট-ট্যাগ (chatv1)', H.includes('./ai-agent-chat.js?v=agent-f1-ui-chatv2'));
t('৩. ai-agent-chat.js ফাইল-বিদ্যমান + renderAiAgentPage-এক্সপোজ', existsSync('ai-agent-chat.js') && UI.includes('window.renderAiAgentPage = render'));
t('৪. NAV_TABS-এ 🤖 AI ট্যাব', H.includes("{key:'ai', icon:'🤖', label:'AI'}"));
t('৫. dashboard-v2: Command Center + All-Tools এ AI-এন্ট্রি', V2.includes("navigate(\\'ai\\')") && V2.includes("'AI', \"navigate('ai')\""));

/* ── ২. সিক্রেট-নিরাপত্তা ── */
const secretHits = ['x-goog-api-key', 'GEMINI_KEYS', 'Bearer  ', 'api_key='];
t('৬. ক্লায়েন্ট-ফাইল/HTML-তে কোনো API-key-প্যাটার্ন নেই', !secretHits.some((x) => UI.includes(x) || H.includes(x) || V2.includes(x)) && !/AIza[0-9A-Za-z_-]{30,}/.test(H + UI + V2) && !UI.includes('generativelanguage') && !UI.includes('elevenlabs.io'));
t('৭. server-মডিউল ai-agent.js আছে + import-প্রতিচিহ্ন public-worker-এ', existsSync('ai-agent.js') && PW.includes("from './ai-agent.js'"));

/* ── ৩. Gateway-রুট ── */
t('৮. public-worker: /api/ai/chat + /api/ai/status + লিগ্যাসি /api/ai → agent', PW.includes("p === '/api/ai/chat'") && PW.includes("p === '/api/ai/status'") && PW.includes('agentChat(request, env, uid, { stream: false })'));
t('৯. gk-agent-worker: agent-env পাস-থ্রু', readFileSync('gk-agent-worker.js','utf8').includes('GROQ_API_KEY: env.GROQ_API_KEY'));

/* ── ৪. পুরনো AI-প্রোডাক্ট বিলুপ্ত-অটুট ── */
t('১০. ১০-টা পুরনো AI-ফাইল এখনো নেই', !existsSync('ah-ai-client.js') && !existsSync('study-ai-tool.js') && !existsSync('gk-agent-tool.js') && !existsSync('ai-explain-tool.js') && !existsSync('web-chat-rebuild.js') && !existsSync('web-search-fix.js') && !existsSync('ai-mentor-integration.js') && !existsSync('bug-agent-tool.js') && !existsSync('result-ai-analysis.js') && !existsSync('manual-gemini-helper.js'));
t('১১. পুরনো AI-রুট dispatch এখনো নেই', !H.includes('renderAIChat(') && !H.includes('renderWebChatV2(') && !H.includes('renderWebChatRebuild'));
t('১২. removedRoute-এ পুরনো AI-রুট-ব্লক অটুট + ai-রুট আনব্লক', H.includes("p === 'ai-chat'") && H.includes("p === 'study-ai'") && !H.includes("p === 'ai' ||"));

/* ── ৫. Chatbot-V1 UI (মালিক-স্পেক) ── */
t('১৩. Hero-card: 3D-orb + CTA (Hey! আমি Admission Hub AI)', UI.includes('ai-hero') && UI.includes('aiHeroCta') && UI.includes('ai-hero-orb'));
t('১৪. Dismissible notice (ai_notice_dismissed + এন-ভাষা-বার্তা)', UI.includes('ai_notice_dismissed') && UI.includes('ai-notice') && UI.includes('Verify important admission information'));
t('১৫. Try-asking chips (৫টা, প্রম্পট-কী-সহ)', UI.includes('ai-chips') && UI.includes('Try asking') && ['🧠','📝','🎯','📊','📚'].every(e => UI.includes("'" + e + "'")));
t('১৬. Composer: capsule + plus + mic + send/stop-morph', UI.includes('ai-compose') && UI.includes('aiMicBtn') && UI.includes('activeReq ? stop() : send()') && UI.includes('ai-send'));
t('১৭. Bottom-sheet: Add to conversation (৬) + AI Tools (৬)', UI.includes('ai-sheet') && UI.includes('Add to conversation') && UI.includes('AI Tools') && UI.includes('data-file="cam"') && UI.includes('data-tool="summ"'));
t('১৮. Voice-in: Web-Speech (উপলব্ধ-চেক + fallback)', (UI.includes('webkitSpeechRecognition') || UI.includes('SpeechRecognition')) && UI.includes('voiceNope'));
t('১৯. TTS-out: same-origin /api/voice + X-AH-App', UI.includes("'/api/voice'") && UI.includes("'X-AH-App': 'admission-hub'"));
t('২০. Editorial AI-msg: formula + tip/example/warn + table + msg-bar (Copy/Regen/👍/👎/⋯)', UI.includes('ai-formula') && UI.includes('ai-callout') && UI.includes('<table>') && UI.includes('ai-msg-bar') && UI.includes('__AiAgentFb') && UI.includes('__AiAgentMore'));
t('২১. Interactive Quick-Challenge: quiz-card + tap/next/score/analysis/retry', UI.includes('ai-quiz') && UI.includes('__AiQuizTap') && UI.includes('__AiQuizNext') && UI.includes('Quiz Complete') && UI.includes('__AiQuizAnalysis') && UI.includes('__AiQuizRetry'));
t('২২. Quiz-JSON parser (```json-সহ tolerant) + intent-গেটেড', UI.includes('parseQuiz') && UI.includes('QUIZ_REQUEST') && UI.includes('questions'));
t('২৩. Themes (Light/Dark/OLED) + css-var + localStorage', UI.includes('data-theme') && UI.includes('aiChatTheme') && UI.includes('oled') && UI.includes('themeDark'));
t('২৪. Menu: new/rename/search/export/clear/delete + confirm', UI.includes('aiMenuBtn') && UI.includes('menuRename') && UI.includes('menuExport') && UI.includes('confirmDel') && UI.includes('menuDelete'));
t('২৫. Search-কথোপকথন overlay + feedback-sheet (৫ কারণ) + feedback-log', UI.includes('ai-searchbar') && UI.includes('aiFeedbackLog') && UI.includes('fb4') && UI.includes('ai-fb-opt'));
t('২৬. Follow-up chips + লেখক-রিজেন + marker (⭐-save/share)', UI.includes('ai-followup') && UI.includes('__AiAgentRegen') && UI.includes('navigator.share'));
t('২৭. Thinking-state (✦ Thinking + অবস্থা-টেক্সট) + streaming-caret', UI.includes('ai-thinking') && UI.includes('aiThinkStatus') && UI.includes('ai-cursor'));
t('২৮. login-CTA (AHAuth.openLogin) + error-state retry', UI.includes('__AiAgentLogin') && UI.includes('AHAuth') && UI.includes('openLogin') && UI.includes('__AiAgentRetry'));
t('২৯. Mobile-first: safe-area + keyboard (visualViewport নয়, d-i n-এ padding) + reduced-motion', UI.includes('safe-area-inset') && UI.includes('prefers-reduced-motion'));
t('৩০. ক্লায়েন্ট-কোডে SSE-পার্স (data:/event:) + AbortController', UI.includes("startsWith('data:')") && UI.includes("startsWith('event:')") && UI.includes('AbortController'));

/* ── ৬. ভার্সন-অখণ্ডতা v208 ── */
t('৩১. sw BUILD_ID v208-aiagent (index-marker + expectedSwVersion)', SW.includes("const BUILD_ID = 'v209-aiagent-20260908'") && H.includes('sw.js?v=v209-aiagent-20260908') && H.includes("const expectedSwVersion = 'v209-aiagent-20260908'"));
t('৩২. sw APP_SHELL: ai-agent-chat chatv1 + dash2f6', SW.includes('./ai-agent-chat.js?v=agent-f1-ui-chatv2') && SW.includes('./dashboard-v2.js?v=dash2f6') && H.includes('dashboard-v2.js?v=dash2f6'));


/* ── ৭. মালিক-ফিডব্যাক v209 (chatv2): Enter-newline · sheet-nav-hide · premium-composer · typography ── */
t('৩৩. Enter = নতুন লাইন; Ctrl/⌘+Enter = পাঠান; বাটন-সেন্ড অটুট', UI.includes("e.key !== 'Enter'") && UI.includes("setRangeText('\\n'") && UI.includes('e.ctrlKey || e.metaKey') && UI.includes('function send('));
t('৩৪. Sheet-খোলায় nav-bar hide + body-scroll-lock + plus-rotate', UI.includes("document.querySelector('.bottomnav')") && UI.includes("nav.style.display = open ? 'none' : ''") && UI.includes("document.body.style.overflow = open ? 'hidden' : ''") && UI.includes('plus-on'));
t('৩৫. Premium composer: focus-ring + hint-row + বড় textarea (150px)', UI.includes('.ai-compose:focus-within') && UI.includes('ai-compose-hint') && UI.includes('enterHint') && UI.includes('Math.min(i.scrollHeight, 150)'));
t('৩৬. টাইপোগ্রাফি-লিফট: 16px/1.8 body + 19px heading + blockquote + antialiased', UI.includes('.ai-msg-body{font-size:16px;line-height:1.8') && UI.includes('font-size:19px') && UI.includes('.ai-msg-body blockquote') && UI.includes('-webkit-font-smoothing:antialiased'));
t('৩৭. chatv2 + v209 অখণ্ডতা', H.includes('./ai-agent-chat.js?v=agent-f1-ui-chatv2') && H.includes('sw.js?v=v209-aiagent-20260908') && H.includes("const expectedSwVersion = 'v209-aiagent-20260908'") && SW.includes("const BUILD_ID = 'v209-aiagent-20260908'") && SW.includes('./ai-agent-chat.js?v=agent-f1-ui-chatv2'));

console.log(`\nP21-CHATBOT-V1: ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
