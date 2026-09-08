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
t('২. ai-agent-chat.js স্ক্রিপ্ট-ট্যাগ (agent-f1-ui-v1)', H.includes('./ai-agent-chat.js?v=agent-f1-ui-v1'));
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

/* ── ৫. ভার্সন-অখণ্ডতা v206 ── */
t('১৪. sw BUILD_ID v206-aiagent (index-marker + expectedSwVersion + cur)', SW.includes("const BUILD_ID = 'v206-aiagent-20260908'") && H.includes('sw.js?v=v206-aiagent-20260908') && H.includes("const expectedSwVersion = 'v206-aiagent-20260908'"));
t('১৫. sw APP_SHELL-এ ai-agent-chat + dash2f6', SW.includes('./ai-agent-chat.js?v=agent-f1-ui-v1') && SW.includes('./dashboard-v2.js?v=dash2f6') && H.includes('dashboard-v2.js?v=dash2f6'));
t('১৬. UI-ফাইলে স্ট্রিমিং-ক্লায়েন্ট (fetch /api/ai/chat + SSE-পার্স + abort)', UI.includes("/api/ai/chat") && UI.includes("startsWith('data:')") && UI.includes("startsWith('event:')") && UI.includes("AbortController"));

console.log(`\nP21-AI-AGENT-FOUNDATION: ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
