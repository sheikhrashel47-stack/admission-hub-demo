// P21 — AI AGENT FOUNDATION (Phase 1) ক্লায়েন্ট-ইন্টিগ্রেশন টেস্ট
// নিশ্চিত করে: AI-রুট/নেভ/টুল-এন্ট্রি আছে; ক্লায়েন্টে কোনো সিক্রেট নেই;
// পুরনো fragmented AI-প্রোডাক্ট এখনো বিলুপ্ত; versন-অখণ্ডতা v206।
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
t('১. index.html-এ ai-রুট dispatch (renderAiAgentPage)', H.includes("if(p==='ai'){ if(window.renderAiAgentPage)") );
t('২. ai-agent-chat.js স্ক্রিপ্ট-ট্যাগ (agent-f2-ui-v2)', H.includes('./ai-agent-chat.js?v=agent-f2-ui-v2'));
t('৩. ai-agent-chat.js ফাইল-বিদ্যমান + renderAiAgentPage-এক্সপোজ', existsSync('ai-agent-chat.js') && UI.includes('window.renderAiAgentPage = render'));
t('৪. NAV_TABS-এ 🤖 AI ট্যাব', H.includes("{key:'ai', icon:'🤖', label:'AI'}"));
t('৫. dashboard-v2: Command Center + All-Tools এ AI-এন্ট্রি', V2.includes("navigate(\\'ai\\')") && V2.includes("'AI', \"navigate('ai')\""));

/* ── ২. সিক্রেট-নিরাপত্তা (ক্লায়েন্ট-শূন্য) ── */
const secretHits = ['x-goog-api-key', 'generativelanguage', 'GEMINI_KEYS', 'Bearer  ', 'api_key='];
t('৬. ক্লায়েন্ট-ফাইল/HTML-তে কোনো API-key-প্যাটার্ন নেই', !secretHits.some((x) => UI.includes(x) || H.includes(x) || V2.includes(x)) && !/AIza[0-9A-Za-z_-]{30,}/.test(H + UI + V2));
t('৭. server-মডিউল ai-agent.js আছে + import-প্রতিচিহ্ন public-worker-এ', existsSync('ai-agent.js') && PW.includes("from './ai-agent.js'"));

/* ── ৩. Gateway-রুট (public-worker) ── */
t('৮. public-worker: /api/ai/chat + /api/ai/status + লিগ্যাসি /api/ai → agent', PW.includes("p === '/api/ai/chat'") && PW.includes("p === '/api/ai/status'") && PW.includes('agentChat(request, env, uid, { stream: false })'));
t('৯. gk-agent-worker: agent-env পাস-থ্রু (GROQ/AGENT_*)', readFileSync('gk-agent-worker.js','utf8').includes('GROQ_API_KEY: env.GROQ_API_KEY') && readFileSync('gk-agent-worker.js','utf8').includes('agent: \'agent-f1\''));

/* ── ৪. পুরনো AI-প্রোডাক্ট বিলুপ্ত-অটুট ── */
t('১০. পুরনো AI-ফাইল এখনো নেই (১০টা)', !existsSync('ah-ai-client.js') && !existsSync('study-ai-tool.js') && !existsSync('gk-agent-tool.js') && !existsSync('ai-explain-tool.js') && !existsSync('web-chat-rebuild.js') && !existsSync('web-search-fix.js') && !existsSync('ai-mentor-integration.js') && !existsSync('bug-agent-tool.js') && !existsSync('result-ai-analysis.js') && !existsSync('manual-gemini-helper.js'));
t('১১. পুরনো AI-রুট dispatch এখনো নেই (renderAIChat/web-chat…)', !H.includes('renderAIChat(') && !H.includes('renderWebChatV2(') && !H.includes('renderWebChatRebuild'));
t('১২. removedRoute-এ পুরনো AI-রুট-ব্লক অটুট', H.includes("p === 'ai-chat'") && H.includes("p === 'study-ai'") && H.includes("p === 'web-chat'") && H.includes("p === 'gk-agent'"));
t('১৩. ai-রুট removedRoute-এ ব্লক নয়', !H.includes("p === 'ai' ||") && !H.includes("|| p === 'ai'"));

/* ── ৫. Phase-2 — Premium AI UI (মালিক-স্পেক §22-24) ── */
t('১৭. Stop-button: সেন্ড ↔ স্টপ morph (activeReq-abort + partial-কিপ)', UI.includes("activeReq ? stop() : send()") && UI.includes("abort()") && UI.includes("stoppedEarly"));
t('১৮. Message-actions: ♡ like + Copy + Regenerate + 🔊 Speak', UI.includes("__AiAgentLike") && UI.includes("__AiAgentCopy") && UI.includes("__AiAgentRegen") && UI.includes("__AiAgentSpeak"));
t('১৯. TTS: same-origin /api/voice + X-AH-App (কোনো elevenlabs.io-ডিরেক্ট-কল নেই)', UI.includes("'/api/voice'") && UI.includes("'X-AH-App': 'admission-hub'") && !UI.includes('elevenlabs.io') && !UI.includes('ELEVENLABS_API_KEY'));
t('২০. Follow-up chips + header-মেনু (নতুন চ্যাট/মুছো)', UI.includes("ai-followup") && UI.includes("aiMenuBtn") && UI.includes("aiAgentMenupan") || (UI.includes("ai-followup") && UI.includes("ai-agent-menupan")));
t('২১. login-CTA (401-পথে AHAuth.openLogin)', UI.includes("__AiAgentLogin") && UI.includes("AHAuth") && UI.includes("openLogin"));
t('২২. Markdown v2: table + math-foundation ($$/$)', UI.includes("<table>") && UI.includes("ai-math") && UI.includes("ai-math-inline"));
t('২৩. Streaming-caret + scroll-near-bottom + timestamp', UI.includes("ai-cursor") && UI.includes("scrollBottom") && UI.includes("fmtTime"));
t('২৪. কোনো client-key/স্ট্রিং-সিক্রেট নেই (Phase-2-ও)', !/AIza[0-9A-Za-z_-]{30,}/.test(UI) && !UI.includes("x-goog-api-key") && !UI.includes("generativelanguage"));

/* ── ৬. ভার্সন-অখণ্ডতা v207 ── */
t('১৪. sw BUILD_ID v207-aiagent (index-marker + expectedSwVersion + cur)', SW.includes("const BUILD_ID = 'v207-aiagent-20260908'") && H.includes('sw.js?v=v207-aiagent-20260908') && H.includes("const expectedSwVersion = 'v207-aiagent-20260908'"));
t('১৫. sw APP_SHELL-এ ai-agent-chat + dash2f6', SW.includes('./ai-agent-chat.js?v=agent-f2-ui-v2') && SW.includes('./dashboard-v2.js?v=dash2f6') && H.includes('dashboard-v2.js?v=dash2f6'));
t('১৬. UI-ফাইলে স্ট্রিমিং-ক্লায়েন্ট (fetch /api/ai/chat + SSE-পার্স + abort)', UI.includes("/api/ai/chat") && UI.includes("startsWith('data:')") && UI.includes("startsWith('event:')") && UI.includes("AbortController"));

console.log(`\nP21-AI-AGENT-FOUNDATION-V2: ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
