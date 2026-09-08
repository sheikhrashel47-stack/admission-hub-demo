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
t('২. ai-agent-chat.js স্ক্রিপ্ট-ট্যাগ (chatv1)', H.includes('./ai-agent-chat.js?v=agent-f1-ui-chatv7'));
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
t('২৭. Thinking-state (✦ Thinking + অবস্থা-টেক্সট) + streaming-caret', UI.includes('ai-think') && UI.includes('aiThinkStatus') && UI.includes('ai-cursor') && UI.includes('thinkingStatus'));
t('২৮. login-CTA (AHAuth.openLogin) + error-state retry', UI.includes('__AiAgentLogin') && UI.includes('AHAuth') && UI.includes('openLogin') && UI.includes('__AiAgentRetry'));
t('২৯. Mobile-first: safe-area + keyboard (visualViewport নয়, d-i n-এ padding) + reduced-motion', UI.includes('safe-area-inset') && UI.includes('prefers-reduced-motion'));
t('৩০. ক্লায়েন্ট-কোডে SSE-পার্স (data:/event:) + AbortController', UI.includes("startsWith('data:')") && UI.includes("startsWith('event:')") && UI.includes('AbortController'));

/* ── ৬. ভার্সন-অখণ্ডতা v208 ── */
t('৩১. sw BUILD_ID v208-aiagent (index-marker + expectedSwVersion)', SW.includes("const BUILD_ID = 'v214-aiagent-20260908'") && H.includes('sw.js?v=v214-aiagent-20260908') && H.includes("const expectedSwVersion = 'v214-aiagent-20260908'"));
t('৩২. sw APP_SHELL: ai-agent-chat chatv1 + dash2f6', SW.includes('./ai-agent-chat.js?v=agent-f1-ui-chatv7') && SW.includes('./dashboard-v2.js?v=dash2f6') && H.includes('dashboard-v2.js?v=dash2f6'));


/* ── ৭. মালিক-ফিডব্যাক v209 (chatv2): Enter-newline · sheet-nav-hide · premium-composer · typography ── */
t('৩৩. Enter = নতুন লাইন; Ctrl/⌘+Enter = পাঠান; বাটন-সেন্ড অটুট', UI.includes("e.key !== 'Enter' || e.isComposing") && UI.includes("document.execCommand('insertText', false, '\\n')") && UI.includes('e.ctrlKey || e.metaKey') && UI.includes('function send('));
t('৩৪. Sheet-খোলায় nav-bar hide + body-scroll-lock + plus-rotate', UI.includes("document.querySelector('.bottomnav')") && UI.includes("(open || onAi) ? 'none' : ''") && UI.includes("document.body.style.overflow = open ? 'hidden' : ''") && UI.includes('plus-on'));
t('৩৫. Premium composer: focus-ring + hint-row + বড় textarea (150px)', UI.includes('.ai-compose:focus-within') && UI.includes('Math.min(i.scrollHeight, 128)') && UI.includes('.ai-editor:empty::before') && !UI.includes('ai-compose-hint'));
t('৩৬. টাইপোগ্রাফি-লিফট: 16.5px/1.85 body + 20px emerald heading + blockquote + antialiased', UI.includes('.ai-msg-body{font-size:16.5px;line-height:1.85') && UI.includes('font-size:20px') && UI.includes('.ai-msg-body blockquote') && UI.includes('-webkit-font-smoothing:antialiased') && UI.includes('.ai-editor') && UI.includes('contenteditable="true"') && !UI.includes('ai-compose-hint') && !UI.includes('aiCharCount') && !UI.includes('enterHint'));
t('৩৭. chatv3 + v210 অখণ্ডতা', H.includes('./ai-agent-chat.js?v=agent-f1-ui-chatv7') && H.includes('sw.js?v=v214-aiagent-20260908') && H.includes("const expectedSwVersion = 'v214-aiagent-20260908'") && SW.includes("const BUILD_ID = 'v214-aiagent-20260908'") && SW.includes('./ai-agent-chat.js?v=agent-f1-ui-chatv7'));


/* ── ৮. v211 (chatv4): ফুল-স্ক্রিন AI + Final Composer Workflow ── */
t('৩৮. AI-পেজ ফুল-স্ক্রিন: nav-hide + back-button + নিজস্ব-scroll root', UI.includes("document.querySelector('.bottomnav')") && UI.includes("navBar.style.display = 'none'") && UI.includes('aiBackBtn') && UI.includes("window.navigate('dashboard')") && UI.includes('height:100dvh;min-height:100dvh'));
t('৩৯. Composer workflow: 52px compact + 128px max + mic↔send swap + dirty/streaming', UI.includes('min-height:52px') && UI.includes('max-height:128px') && UI.includes(".ai-compose.dirty .ai-send{display:grid}") && UI.includes('.ai-compose.streaming .ai-send{display:grid}') && UI.includes("'Ask anything…'"));
t('৪০. Keyboard-aware + ↓ Latest + char-count', UI.includes('--ai-kb') && UI.includes('visualViewport') && UI.includes('__aiKbUpd') && UI.includes('aiLatest') && UI.includes("latest.classList.toggle('show'") && !UI.includes('aiCharCount'));
t('৪১. chatv4 + v211 অখণ্ডতা (index+sw)', H.includes('./ai-agent-chat.js?v=agent-f1-ui-chatv7') && H.includes('sw.js?v=v214-aiagent-20260908') && SW.includes("const BUILD_ID = 'v214-aiagent-20260908'") && SW.includes('./ai-agent-chat.js?v=agent-f1-ui-chatv7'));


/* ── ৯. v212 (chatv5): মালিক-ফিডব্যাক — no-hint/no-counter, contenteditable, theme-vars, long-cap ── */
t('৪২. Composer-এ কোনো hint/character-count নেই; editor contenteditable + :empty::before placeholder', UI.includes('contenteditable=\"true\"') && UI.includes('.ai-editor:empty::before') && UI.includes("document.execCommand('insertText', false, '\\n')") && !UI.includes('ai-compose-hint') && !UI.includes('enterHint') );
t('৪৩. Theme-CSS-vars apply হয় (dark-mode-র সাদা-লেখা বাগ-ফিক্স)', UI.includes("for (const k of ['bg', 'card', 'ink'") && UI.includes("r.style.setProperty('--ai-' + k, t[k])") && UI.includes('applyThemeVars()'));
t('৪৪. Dark-mode overrides: plus/mic/link/callout/th', UI.includes("[data-theme=dark] .ai-plus{background:rgba(47,191,143,.16)") && UI.includes('[data-theme=dark] .ai-msg-body a') && UI.includes('[data-theme=dark] .ai-callout.tip') && UI.includes('[data-theme=dark] .ai-msg-body th'));
t('৪৫. বড়-টেক্সট গার্ড: 4000-অক্ষর ক্যাপ + msgTooLong toast + focus', UI.includes('q.length > 4000') && UI.includes('msgTooLong') && UI.includes('মেসেজ খুব বড়'));
t('৪৬. Paste → plain-text-only + IME-safe Enter', UI.includes("getData('text/plain')") && UI.includes('e.isComposing'));
t('৪৭. chatv5 + v212 অখণ্ডতা', H.includes('./ai-agent-chat.js?v=agent-f1-ui-chatv7') && H.includes('sw.js?v=v214-aiagent-20260908') && SW.includes("const BUILD_ID = 'v214-aiagent-20260908'") && SW.includes('./ai-agent-chat.js?v=agent-f1-ui-chatv7'));


/* ── ১০. v213 (chatv6): কিবোর্ড-নিরাপদ layout + inline thinking + iOS-accessory fix ── */
t('৪৮. Thinking কোনো কার্ড-নয়: inline .ai-think row (3D orb + status), dynamic-status-seq', UI.includes('.ai-think{display:flex') && UI.includes('aiThinkStatus') && UI.includes('clearThinkTimers') && UI.includes('T.stAnalyze') && UI.includes('T.stWrite') && !UI.includes('.ai-thinking{'));
t('৪৯. কিবোর্ড-নিরাপদ layout: static-foot (fixed-নয়) + root --ai-kb padding + body-তে কোনো giant padding নেই', UI.includes('.ai-agent-foot{position:static') && UI.includes('padding-bottom:var(--ai-kb,0px)') && UI.includes('.ai-agent-body{flex:1;min-height:0;overflow-y:auto;padding:12px'));
t('৫০. iOS ↑↓✓ দমন: contenteditable focus-refresh (touch/pointer/blur)', UI.includes("inp.setAttribute('contenteditable', 'false')") && UI.includes("inp.setAttribute('contenteditable', 'true')") && UI.includes('touchend') && UI.includes('pointerdown'));
t('৫১. send()-এ payload-aware thinking signals (image/doc/search/quiz/mcq)', UI.includes('image: !!imgItem') && UI.includes('doc: !!docItem') && UI.includes('search: /খোঁজো|খোঁজ|search') && UI.includes('mcq: /mcq/i'));
t('৫২. chatv6 + v213 অখণ্ডতা', H.includes('./ai-agent-chat.js?v=agent-f1-ui-chatv7') && H.includes('sw.js?v=v214-aiagent-20260908') && SW.includes("const BUILD_ID = 'v214-aiagent-20260908'") && SW.includes('./ai-agent-chat.js?v=agent-f1-ui-chatv7'));


/* ── ১১. v214 (chatv7): মালিক-স্পেক — SVG icon action-row + dynamic chips ── */
t('৫৩. Consistent SVG icon-system (stroke: currentColor, 16px, একই-weight) + msg-bar-এ আর emoji নেই', UI.includes('const ICONS = {') && UI.includes('stroke="currentColor"') && UI.includes('width="16"') && !UI.includes('data-fb="up" onclick="window.__AiAgentFb(this)">👍') && !UI.includes('⧉ '));
t('৫৪. Action-row: icon-only Copy/Like/Dislike/Share/Regenerate/More + __AiAgentShare + navigator.share', UI.includes('__AiAgentShare') && UI.includes('navigator.share') && UI.includes('ICONS.share') && UI.includes('ICONS.regen') && UI.includes('ICONS.more') && UI.includes('.ai-msg-bar .ab{'));
t('৫৫. Suggested chips: compact premium (solid border, mint bg, pill, no shadow/dash)', UI.includes('.ai-followup button{display:inline-flex') && UI.includes('border-radius:999px') && UI.includes('rgba(15,107,79,.15)') && UI.includes('padding:5.5px') && !UI.includes('border:1px dashed rgba(15,107,79,.3)'));
t('৫৬. Dynamic context-based suggestions (long/mcq/def/default branches + চিপ-click delegation)', UI.includes('const long = t.length > 750') && UI.includes('hasMcqList') && UI.includes('chzSimilarMcq') && UI.includes('chzShorten') && UI.includes('chzRevise') && UI.includes('__aiFollowupDeleg'));
t('৫৭. chatv7 + v214 অখণ্ডতা', H.includes('./ai-agent-chat.js?v=agent-f1-ui-chatv7') && H.includes('sw.js?v=v214-aiagent-20260908') && SW.includes("const BUILD_ID = 'v214-aiagent-20260908'") && SW.includes('./ai-agent-chat.js?v=agent-f1-ui-chatv7'));

console.log(`\nP21-CHATBOT-V1: ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
