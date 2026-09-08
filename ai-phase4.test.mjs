// 🤖 PHASE 4 — AI REMOVAL GUARD টেস্ট (মালিক-নির্দেশ ২০২৬-০৯-০৮: সব AI সিস্টেম বাদ)
// নিশ্চিত করে: AI-স্ক্রিপ্ট/রুট/এন্ট্রি আর কোথাও নেই, কিন্তু ডেটা/লগইন/ভয়েস-পথ অটুট।
import { readFileSync } from 'fs';
let pass = 0, fail = 0;
const t = (n, c) => { if (c) { pass++; console.log('  ✓', n); } else { fail++; console.log('  ✗', n); } };
const H = readFileSync('/home/user/demo/index.html', 'utf8');
const SW = readFileSync('/home/user/demo/sw.js', 'utf8');
const V2 = readFileSync('/home/user/demo/dashboard-v2.js', 'utf8');

/* ── ক্লায়েন্ট-স্ক্রিপ্ট বাদ ── */
t('১. index.html-এ কোনো AI-স্ক্রিপ্ট-ট্যাগ নেই', !H.includes('ah-ai-client') && !H.includes('gk-agent-tool') && !H.includes('study-ai-tool') && !H.includes('ai-explain-tool') && !H.includes('ai-mentor-integration') && !H.includes('result-ai-analysis') && !H.includes('bug-agent-tool') && !H.includes('web-chat-rebuild') && !H.includes('web-search-fix'));
t('২. sw.js APP_SHELL-এও AI-ফাইল-এন্ট্রি নেই', !SW.includes('ah-ai-client') && !SW.includes('gk-agent-tool') && !SW.includes('study-ai-tool') && !SW.includes('ai-explain-tool') && !SW.includes('ai-mentor-integration') && !SW.includes('result-ai-analysis') && !SW.includes('web-chat-rebuild') && !SW.includes('web-search-fix') && !SW.includes('bug-agent-tool'));

/* ── AI-রুট বিলুপ্ত ── */
t('৩. AI-রুট dispatch-এ নেই (renderAIChat/renderWebChatV2/renderWebChatRebuild/StudyAiTool/GkAgentTool)', !H.includes('renderAIChat(') && !H.includes('renderWebChatV2(') && !H.includes('renderWebChatRebuild') && !H.includes('window.StudyAiTool') && !H.includes('window.GkAgentTool'));
t('৪. removedRoute-এ AI-রুট-রিডাইরেক্ট (ai-chat/study-ai/gk-agent/web-chat/ai-mentor, মালিক-নির্দেশ ২০২৬-০৯-০৮)', H.includes("p === 'ai-chat'") && H.includes("p === 'study-ai'") && H.includes("p === 'gk-agent'") && H.includes("p === 'web-chat'") && H.includes("p === 'ai-mentor'"));
t('৫. dashboard-v2-এ Admission AI/Problem Solver টুল-এন্ট্রি নেই', !V2.includes("'Admission AI'") && !V2.includes("navigate('ai-chat')") && !V2.includes("navigate('web-chat')") && !V2.includes('Problem Solver'));
t('৬. phase23-ui/phase12-ui-তে AI-পথ বাদ', !H.includes("navigate('daily-gk')") && !H.includes("navigate('web-chat')"));

/* ── নতুন: Phase-1 Central Agent (মালিক-স্পেক ২০২৬-০৯-০৮, দ্বিতীয় ধাপ) ── */
const UI = readFileSync('/home/user/demo/ai-agent-chat.js', 'utf8');
const AG = readFileSync('/home/user/demo/ai-agent.js', 'utf8');
t('১১. নতুন Central Agent-রুট: ai + renderAiAgentPage + নেভ-ট্যাব', H.includes("if(p==='ai'){ if(window.renderAiAgentPage)") && H.includes("{key:'ai', icon:'🤖', label:'AI'}"));
t('১২. নতুন Agent-প্রিমিয়াম-UI + streaming + টোকেন-ভিত্তিক কল (কোনো সিক্রেট-নেই)', H.includes('./ai-agent-chat.js?v=agent-f1-ui-chatv4') && UI.includes('/api/ai/chat') && UI.includes('ahPubToken') && !UI.includes('x-goog-api-key') && !UI.includes('generativelanguage'));
t('১৩. Server-সাইড Agent Core: ai-agent.js আছে + gateway-রুট (public-worker)', AG.includes('AGENT_VERSION') && readFileSync('/home/user/demo/public-worker.js','utf8').includes("p === '/api/ai/chat'"));
t('১৪. Agent Core-এ mock-ইন্টিগ্রিটি-Safety: mock-running → refuse', AG.includes('mock_refused') && AG.includes('EXAM INTEGRITY'));

/* ── অটুট: ডেটা/লগইন/ভয়েস/কোর ── */
t('৭. ডেটা-ব্যাংক API-পথ অটুট (_worker.js /api/* + voice)', readFileSync('/home/user/demo/_worker.js','utf8').includes('/api/voice') && readFileSync('/home/user/demo/_worker.js','utf8').includes("/api/"));
t('৮. ভয়েস-ভোকাবুলারি অটুট (vocabulary-elevenlabs + sw-এ)', SW.includes('vocabulary-elevenlabs') && H.includes('vocabulary-elevenlabs'));
t('৯. ৬-ট্যাব-নেভি অটুট (🤖AI-সহ)', /NAV_TABS=.*key:'dashboard'.*key:'question-bank'.*key:'exam'.*key:'history'.*key:'profile'/s.test(H));
t('১০. dashboard-v2 সংস্করণ dash2f6 + sw BUILD_ID v206 (ক্যাশ-বাস্ট)', H.includes('dashboard-v2.js?v=dash2f6') && SW.includes("const BUILD_ID = 'v211-aiagent-20260908'") && H.includes('sw.js?v=v211-aiagent-20260908'));

console.log(fail === 0 ? '✅ AI-REMOVAL GUARD TEST PASS (' + pass + ')' : '❌ FAIL ' + fail + ' / ' + pass);
process.exit(fail ? 1 : 0);
