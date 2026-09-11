// P21 — AI Assistant paused: no reachable public UI until a later page-by-page phase.
import { readFileSync } from 'node:fs';

const H = readFileSync('index.html', 'utf8');
const SW = readFileSync('sw.js', 'utf8');
const DASH = readFileSync('dashboard-v2.js', 'utf8');
const ACCOUNT = readFileSync('account-access.js', 'utf8');
const ACCOUNT_CSS = readFileSync('account-access.css', 'utf8');
const AI = readFileSync('ai-agent-chat.js', 'utf8');
const WORKER = readFileSync('public-worker.js', 'utf8');

let pass = 0;
let fail = 0;
const t = (name, condition) => {
  if (condition) { pass += 1; console.log('  ✓', name); }
  else { fail += 1; console.error('  ✗', name); }
};

t('১. public HTML AI client load করে না', !H.includes('ai-agent-chat.js'));
t('২. service-worker AI client cache করে না', !SW.includes('ai-agent-chat.js'));
t('৩. primary navigation-এ AI tab নেই', !H.includes("{key:'ai'"));
t('৪. direct #ai route Dashboard-এ নিরাপদে ফেরে', H.includes("if(p==='ai'){ navigate('dashboard'); return; }"));
t('৫. Dashboard Command Center/All Tools-এ AI entry নেই', !/navigate\((?:\\?'|\")ai/.test(DASH) && !/<span>AI<\/span>/.test(DASH));
t('৬. onboarding Assistant feature flag বন্ধ', ACCOUNT.includes('const ASSISTANT_ENABLED = false'));
t('৭. onboarding Assistant controls hidden ও disabled', /data-assistant-enabled="false" hidden aria-hidden="true"/.test(ACCOUNT) && /data-role="guide-open"[^>]+hidden disabled/.test(ACCOUNT));
t('৮. CSS Assistant-কে সব account page-এ force-hide করে', /\.ah-guide,\n\.ah-account-shell[^\n]+ \.ah-guide-orb\{display:none!important\}/.test(ACCOUNT_CSS));
t('৯. Welcome-এ শুধু চারটি নির্ধারিত entry action আছে', ['welcome-signup', 'welcome-login', 'welcome-google-button', 'continue-guest'].every(role => ACCOUNT.includes(`data-role="${role}"`)));
t('১০. dormant client source ভবিষ্যৎ কাজের জন্য আছে কিন্তু public reachability নেই', AI.includes('window.renderAiAgentPage') && !H.includes('renderAiAgentPage'));
t('১১. server-side AI route retained but cannot become visible without a separately reviewed client release', WORKER.includes("path === '/api/ai/chat'") && !H.includes('ai-agent-chat.js') && !H.includes('renderAiAgentPage'));
t('১২. public client files contain no obvious provider secret assignment', !/(?:api[_-]?key|secret|token)\s*[:=]\s*['"][A-Za-z0-9_-]{20,}/i.test(H + DASH + ACCOUNT + AI));

console.log(`\nP21-AI-PAUSED: ${pass} pass / ${fail} fail`);
if (fail) process.exit(1);
