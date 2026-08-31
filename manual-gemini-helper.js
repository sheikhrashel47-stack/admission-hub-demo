/*
  ADMISSION HUB · GEMINI MISTAKE HELPER
  Builds a short, source-grounded Bengali prompt for Gemini.
*/
(function installManualGeminiHelper(){
  'use strict';
  if (window.__manualGeminiHelperInstalled) return;
  window.__manualGeminiHelperInstalled = true;

  function getCache(){
    try { if (typeof CACHE !== 'undefined' && CACHE) return CACHE; } catch (_) {}
    return window.CACHE || { questions: [], mistakes: [], subjects: [], topics: [] };
  }
  function clean(value, max=1800){
    return String(value ?? '')
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      .trim().slice(0, max);
  }
  function esc(value){
    if (typeof window.esc === 'function') return window.esc(String(value ?? ''));
    return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function getActiveExam(){
    try { return typeof ActiveExam !== 'undefined' ? ActiveExam : window.ActiveExam; }
    catch (_) { return window.ActiveExam; }
  }
  function getCorrectIndex(q){
    const n = Number(q?.answerIndex ?? q?.answer ?? q?.correctAnswerIndex ?? 0);
    return Number.isFinite(n) ? n : 0;
  }
  function findName(items, id){
    return clean((items || []).find(x => x.id === id)?.name || '', 120);
  }
  function currentSource(){
    const path = String(window.Router?.path || location.hash.slice(1) || '').split('?')[0];
    if (path.startsWith('question-bank/topic/')) return 'Question Bank';
    const exam = getActiveExam();
    return path === 'exam/running' && exam?.mode === 'flash' ? 'Flash Test' : 'Admission Hub';
  }
  function buildPrompt({q, selectedIndex, source}){
    const cache = getCache();
    const options = Array.isArray(q?.options)
      ? q.options.map((x,i) => `${String.fromCharCode(65+i)}. ${clean(x,400)}`).join('\n')
      : '';
    const correctIndex = getCorrectIndex(q);
    const subject = findName(cache.subjects, q?.subjectId);
    const topic = findName(cache.topics, q?.topicId);
    const selected = Array.isArray(q?.options) ? q.options[selectedIndex] || '' : '';
    const correct = Array.isArray(q?.options) ? q.options[correctIndex] || '' : '';

    return `তুমি একজন ভালো admission teacher। এই ভুল MCQ-টি বাংলায় এমনভাবে বোঝাও, যাতে ছাত্র বুঝতে পারে “আমি ঠিক কোথায় ভুল করেছি” এবং একই ধরনের প্রশ্নে আবার না ভুলে। লক্ষ্য: short নয়—short, memorable ও understandable।

প্রথমেই ভুল option-টি কেন tempting এবং সঠিক উত্তরের সঙ্গে তার মূল পার্থক্য একদম সহজ ভাষায় ধরিয়ে দাও। তারপর প্রশ্নের ধরন অনুযায়ী ৩–৫টি ছোট paragraph বা bullet দাও; fixed label/template নয়। Vocabulary হলে word association/mnemonic, preposition হলে phrase pattern, grammar হলে rule ও trap, synonym/antonym হলে contrast—যেটি সবচেয়ে কাজে লাগে সেটিই বেছে নাও। একটি পরীক্ষার হলের mental shortcut দাও। Example কেবল concept পরিষ্কার করলে, এক লাইনে দাও।

সাধারণ প্রশ্নে ৫০–৯০ শব্দ যথেষ্ট; tricky হলে প্রয়োজনমতো সামান্য বেশি, কিন্তু repetition, greeting, ভূমিকা ও filler বাদ। প্রশ্ন, option ও source explanation-এর ভিত্তি ছাড়া নির্দিষ্ট factual claim বানাবে না; source অসম্পূর্ণ, ambiguous বা conflicting হলে এক লাইনে জানাবে।

উত্তরের শেষে অবশ্যই “নোটে সেভ করার মতো:” শিরোনামে ৫–১০টি ছোট line দাও। এটি আলাদা, সহজ ও memorable revision note হবে—মূল ভুল, সঠিক ধারণা ও পরীক্ষার shortcut থাকবে; greeting বা repetition নয়।

প্রশ্ন: ${clean(q?.question,1000)}
অপশন:\n${options}
আমার উত্তর: ${clean(selected,400)} | সঠিক উত্তর: ${clean(correct,400)}
উৎসের ব্যাখ্যা: ${clean(q?.explanation,1200) || 'নেই'}

ভাষা conversational, পরিষ্কার ও সামান্য engaging হবে—childish বা অতিরিক্ত funny নয়। একই কথা একাধিকভাবে বলবে না।`;
  }
  function copyText(value, after){
    const done = () => {
      const el = document.getElementById('manualGeminiCopyStatus');
      if (el) el.textContent = 'Prompt copied ✓ এখন Gemini-তে paste করে Send চাপো';
      if (typeof after === 'function') after();
    };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(value).then(done).catch(() => fallbackCopy(value, done));
    else fallbackCopy(value, done);
  }
  function fallbackCopy(value, done){
    const area = document.createElement('textarea');
    area.value = value;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    try { document.execCommand('copy'); } catch (_) {}
    area.remove();
    done();
  }
  const GEMINI_PAGE_STATE='admission_gemini_mistake_v2';
  const GEMINI_PENDING_NOTE='admission_gemini_pending_note_v2';
  function savePageState(){
    try {
      const practice=window.QuestionBankPracticeSession;
      const practiceState=practice && String(currentPath()).startsWith('question-bank/topic/') ? {
        topicId:practice.topicId||'', answers:practice.answers||{}, revealed:practice.revealed||{}, recent:practice.recent||[], query:practice.query||'', visibleCount:practice.visibleCount||100
      } : null;
      sessionStorage.setItem(GEMINI_PAGE_STATE, JSON.stringify({prompt:window.__manualGeminiLastPrompt||'',context:window.__manualGeminiLastContext||{},source:window.__manualGeminiSource||'',returnPath:window.__manualGeminiReturnPath||currentPath(),question:window.__manualGeminiQuestion||null,selectedIndex:window.__manualGeminiSelectedIndex,practiceState}));
    } catch (_) {}
  }
  function restorePracticeState(){
    try {
      const saved=readPageState(), p=saved.practiceState, practice=window.QuestionBankPracticeSession;
      if(!p || !practice || !String(currentPath()).startsWith('question-bank/topic/')) return;
      Object.assign(practice,{topicId:p.topicId||practice.topicId,answers:p.answers||{},revealed:p.revealed||{},recent:p.recent||[],query:p.query||'',visibleCount:p.visibleCount||100});
      window.BankAnswers=practice.answers||{};
    } catch (_) {}
  }
  function readPageState(){
    try { return JSON.parse(sessionStorage.getItem(GEMINI_PAGE_STATE)||'{}'); } catch (_) { return {}; }
  }
  function savePendingNote(){
    try { sessionStorage.setItem(GEMINI_PENDING_NOTE, JSON.stringify({returnPath:currentPath(),source:window.__manualGeminiSource||'Admission Hub',question:window.__manualGeminiQuestion||null,selectedIndex:Number(window.__manualGeminiSelectedIndex),savedAt:Date.now()})); } catch (_) {}
  }
  function readPendingNote(){
    try { return JSON.parse(sessionStorage.getItem(GEMINI_PENDING_NOTE)||'null'); } catch (_) { return null; }
  }
  function clearPendingNote(){ try { sessionStorage.removeItem(GEMINI_PENDING_NOTE); sessionStorage.removeItem(GEMINI_PAGE_STATE); } catch (_) {} }
  window.isManualGeminiNoteReady = function(qid){
    const pending = readPendingNote();
    return !!(pending?.question && String(pending.question.id) === String(qid));
  };
  function currentPath(){ const hash=location.hash.replace(/^#\/?/,'').split('?')[0]; return String(hash || window.Router?.path || 'dashboard'); }
  function addInlineNoteButton({q}){
    const cards = [...document.querySelectorAll('.q-card-v2,[data-qnav-card],.p3-qb-question-card,.question-card,.flash-q-card')];
    const host = cards.find(card => (card.textContent || '').includes(String(q?.question || '').slice(0,80)));
    if (!host || host.querySelector('[data-manual-note-button]')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.manualNoteButton = '1';
    button.className = 'mg-inline-note';
    button.textContent = '📝 ছোট নোট করুন';
    button.onclick = () => window.openManualGeminiNote();
    const actionHost = host.querySelector('.q-card-actions,.q-actions,.flash-feedback,.flash-nav') || host;
    actionHost.appendChild(button);
  }
  function showPrompt({q, selectedIndex, source}){
    const prompt = buildPrompt({q, selectedIndex, source});
    const context = {
      question: clean(q?.question,600),
      options: Array.isArray(q?.options) ? q.options.map((x,i) => `${String.fromCharCode(65+i)}. ${clean(x,260)}`).join(' | ') : '',
      'your-answer': clean(q?.options?.[selectedIndex],260),
      'correct-answer': clean(q?.options?.[getCorrectIndex(q)],260),
      explanation: clean(q?.explanation,500)
    };
    window.__manualGeminiLastPrompt = prompt;
    window.__manualGeminiLastContext = context;

    let root = document.getElementById('manualGeminiRoot');
    if (!root) { root = document.createElement('div'); root.id = 'manualGeminiRoot'; document.body.appendChild(root); }
    root.style.cssText = 'position:fixed;inset:0;z-index:10060;display:flex;align-items:center;justify-content:center;padding:12px;box-sizing:border-box;background:rgba(8,28,22,.62);overflow:auto;';
    root.innerHTML = `<div class="mg-backdrop" role="dialog" aria-modal="true" aria-label="Gemini mistake helper"><div class="mg-modal"><button class="mg-close" type="button" aria-label="Close" onclick="window.closeManualGemini()">×</button><div class="mg-kicker">GEMINI · ${esc(source)}</div><h2>ভুল প্রশ্নটি বুঝে নাও</h2><p class="mg-help">Prompt কপি করে Gemini বা ChatGPT-এর যেকোনো একটি খুলে paste করে Send চাপো। ফিরে এসে প্রশ্নের নিচের ছোট “📝 নোট করুন” button-এ click করলে explanation save করতে পারবে।</p><div class="mg-question"><b>প্রশ্ন</b><p>${esc(q?.question)}</p><span>তোমার উত্তর: <strong>${esc(q?.options?.[selectedIndex] || '')}</strong></span><span>সঠিক উত্তর: <strong>${esc(q?.options?.[getCorrectIndex(q)] || '')}</strong></span></div><textarea class="mg-prompt" id="manualGeminiPrompt" readonly aria-label="Gemini prompt">${esc(prompt)}</textarea><div id="manualGeminiCopyStatus" class="mg-status">Prompt প্রস্তুত আছে। Copy চাপো।</div><div class="mg-actions"><button class="mg-copy" type="button" onclick="window.copyManualGeminiPrompt()">📋 Prompt কপি করুন</button><button class="mg-gemini" type="button" onclick="window.openManualGemini()">✨ Gemini খুলুন</button><button class="mg-chatgpt" type="button" onclick="window.openManualChatGPT()">◉ ChatGPT খুলুন</button></div></div></div>`;

    const compact = window.innerWidth <= 480;
    const backdrop = root.querySelector('.mg-backdrop');
    const modal = root.querySelector('.mg-modal');
    const close = root.querySelector('.mg-close');
    const promptArea = root.querySelector('.mg-prompt');
    const questionBox = root.querySelector('.mg-question');
    const actions = root.querySelector('.mg-actions');
    if (backdrop) Object.assign(backdrop.style,{position:'fixed',inset:'0',zIndex:'10061',display:'flex',alignItems:compact?'flex-end':'center',justifyContent:'center',padding:compact?'7px':'12px',boxSizing:'border-box',background:'rgba(8,28,22,.62)',overflow:'auto'});
    if (modal) Object.assign(modal.style,{position:'relative',zIndex:'10062',width:'min(640px,100%)',maxHeight:compact?'88vh':'90vh',overflow:'auto',boxSizing:'border-box',background:'#fff',borderRadius:compact?'22px 22px 0 0':'23px',padding:compact?'19px 13px 13px':'21px 16px 16px',boxShadow:'0 24px 80px rgba(0,0,0,.3)',color:'#153c2d',fontFamily:'inherit',lineHeight:'1.45',overflowWrap:'anywhere'});
    if (close) Object.assign(close.style,{position:'absolute',right:'12px',top:'10px',width:'33px',height:'33px',border:'0',borderRadius:'50%',fontSize:'23px',background:'#edf7f1',color:'#24664e'});
    if (questionBox) Object.assign(questionBox.style,{padding:'11px',borderRadius:'13px',background:'#f0f8f3',fontSize:'12px',lineHeight:'1.5',overflowWrap:'anywhere'});
    if (promptArea) Object.assign(promptArea.style,{display:'block',width:'100%',height:compact?'145px':'145px',marginTop:'10px',boxSizing:'border-box',border:'1px solid #cfe5d8',borderRadius:'12px',padding:'10px',resize:'vertical',font:'12px/1.55 inherit',color:'#254d3e',background:'#fbfefc'});
    if (actions) Object.assign(actions.style,{display:'flex',flexWrap:'wrap',gap:'8px',marginTop:'12px'});
    root.querySelectorAll('.mg-copy,.mg-gemini,.mg-chatgpt').forEach(button => Object.assign(button.style,{flex:'1 1 180px',minHeight:'42px',border:'0',borderRadius:'12px',padding:'11px',fontWeight:'900',fontSize:'12px',lineHeight:'1.3',whiteSpace:'normal'}));
    const copyButton = root.querySelector('.mg-copy'); if (copyButton) Object.assign(copyButton.style,{background:'#0f6b4f',color:'#fff'});
    const geminiButton = root.querySelector('.mg-gemini'); if (geminiButton) Object.assign(geminiButton.style,{background:'#e8f1ff',color:'#174a8b'});
    const chatgptButton = root.querySelector('.mg-chatgpt'); if (chatgptButton) Object.assign(chatgptButton.style,{background:'#f1f1f1',color:'#202123'});
    window.__manualGeminiQuestion = q;
    window.__manualGeminiSelectedIndex = selectedIndex;
    window.__manualGeminiSource = source;
    document.body.classList.add('mg-open');
  }
  function renderGeminiPage(){
    const saved=readPageState();
    const prompt=window.__manualGeminiLastPrompt || saved.prompt || '';
    const source=window.__manualGeminiSource || saved.source || 'Admission Hub';
    if(!prompt){
      renderShell('<div class="mg-page"><button class="mg-page-back" onclick="window.backFromGeminiPage()">← ফিরে যাও</button><h1>Gemini AI</h1><p>কোনো ভুল প্রশ্নের prompt পাওয়া যায়নি।</p></div>',{topbar:false});
      return;
    }
    window.__manualGeminiLastPrompt=prompt;
    window.__manualGeminiSource=source;
    renderShell(`<div class="mg-page"><div class="mg-page-head"><button class="mg-page-back" onclick="window.backFromGeminiPage()">← ফিরে যাও</button><div><span>GEMINI · ${esc(source)}</span><h1>Gemini-তে ব্যাখ্যা নাও</h1><p>এই app page থেকে prompt কপি করো, তারপর Gemini খুলে paste করে Send চাপো।</p></div></div><div class="mg-page-note"><b>নোট</b><span>Gemini-কে অ্যাপের ভিতরে iframe হিসেবে লোড করা যায় না, তাই এই page-টি prompt ধরে রাখে এবং Back button-এ Admission Hub-এ ফিরিয়ে দেয়।</span></div><textarea class="mg-page-prompt" id="manualGeminiPagePrompt" readonly>${esc(prompt)}</textarea><div class="mg-page-actions"><button class="mg-copy" type="button" onclick="window.copyManualGeminiPrompt()">📋 Prompt কপি করুন</button><button class="mg-gemini" type="button" onclick="window.openGeminiWebsite()">✨ Gemini খুলুন</button></div><div id="manualGeminiCopyStatus" class="mg-status">Prompt প্রস্তুত আছে।</div></div>`,{topbar:false});
  }
  window.copyManualGeminiPrompt = function(){ if (window.__manualGeminiLastPrompt) copyText(window.__manualGeminiLastPrompt); };
  function openExternalProvider(url){
    window.__manualGeminiReturnPath = currentPath();
    savePageState();
    savePendingNote();
    const root = document.getElementById('manualGeminiRoot');
    if (root) { root.innerHTML = ''; root.style.cssText = 'display:none'; }
    document.body.classList.remove('mg-open');
    const go = () => {
      // Use window.open instead of location.assign for iOS standalone PWA.
      // location.assign navigates the PWA itself which causes viewport bugs
      // on return. window.open opens in Safari, keeping the PWA intact.
      const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
      if (isStandalone) {
        window.open(url, '_blank');
      } else {
        window.location.assign(url);
      }
    };
    if (window.__manualGeminiLastPrompt) copyText(window.__manualGeminiLastPrompt, go);
    else go();
  }
  window.openManualGemini = function(){ openExternalProvider('https://gemini.google.com/app'); };
  window.openManualChatGPT = function(){ openExternalProvider('https://chatgpt.com/'); };
  window.openGeminiWebsite = window.openManualGemini;
  window.backFromGeminiPage = function(){
    const saved=readPageState();
    const target=window.__manualGeminiReturnPath || saved.returnPath || 'dashboard';
    if (typeof window.navigate === 'function') window.navigate(target);
    else location.hash = '#' + target;
  };
  let _geminiRestoreRan = false;
  function restoreReturnedQuestionContext(){
    if(_geminiRestoreRan) return;
    const pending=readPendingNote();
    if(!pending?.question) return;
    _geminiRestoreRan = true;
    const target=String(pending.returnPath||'');
    const hashPath=decodeURIComponent(String(location.hash||'').replace(/^#/,'')).split('?')[0];
    const here=hashPath || currentPath();
    if(target && here !== target){
      try { if(typeof window.navigate==='function') window.navigate(target); } catch (_) {}
      // Don't clear pending yet - wait until we actually arrive at target
      setTimeout(()=>{ _geminiRestoreRan = false; }, 300);
      return;
    }
    // We are at the target - restore context and CLEAR pending note
    window.__manualGeminiQuestion=pending.question;
    window.__manualGeminiSelectedIndex=Number(pending.selectedIndex);
    window.__manualGeminiSource=pending.source||'Admission Hub';
    restorePracticeState();
    clearPendingNote();
    try {
      if(pending.source==='Question Bank' && typeof window.renderQuestionBankV2==='function') window.renderQuestionBankV2();
    } catch (_) {}
  }
  // Return from Gemini/ChatGPT never opens an editor automatically.
  // The wrong-answer card owns the explicit “📝 নোট করুন” action.
  window.addEventListener('pageshow',()=>setTimeout(restoreReturnedQuestionContext,180));
  window.addEventListener('popstate',()=>setTimeout(restoreReturnedQuestionContext,180));
  document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible') setTimeout(restoreReturnedQuestionContext,180); });
  const previousRender=window.render;
  function wrappedGeminiRender(){ if(currentPath()==='gemini') return renderGeminiPage(); return previousRender.apply(this,arguments); }
  if(typeof previousRender==='function'){ window.render=wrappedGeminiRender; try { render=wrappedGeminiRender; } catch (_) {} }
  window.addEventListener('hashchange',()=>{ if(currentPath()==='gemini') setTimeout(renderGeminiPage,0); });

  window.closeManualGemini = function(){
    const root = document.getElementById('manualGeminiRoot');
    if (root) { root.innerHTML = ''; root.style.cssText = 'display:none'; }
    document.body.classList.remove('mg-open');
  };
  window.openManualGeminiNoteForQuestion = function(qid){
    const q = getCache().questions?.find(item => String(item.id) === String(qid));
    const practice = window.QuestionBankPracticeSession;
    const state = practice?.answers?.[qid] || window.BankAnswers?.[qid] || null;
    const pending = readPendingNote();
    const selectedIndex = pending?.question && String(pending.question.id) === String(qid)
      ? Number(pending.selectedIndex)
      : Number(state?.selected);
    if(!q || !Number.isFinite(selectedIndex) || selectedIndex === getCorrectIndex(q)) return;
    window.__manualGeminiQuestion=q;
    window.__manualGeminiSelectedIndex=selectedIndex;
    window.__manualGeminiSource='Question Bank';
    clearPendingNote();
    window.closeManualGemini();
    setTimeout(() => window.openQuestionNoteEditor?.({q,selectedIndex,source:'Question Bank'}), 0);
  };
  window.openManualGeminiNote = function(){
    const q = window.__manualGeminiQuestion;
    if(q?.id) window.openManualGeminiNoteForQuestion(q.id);
  };
  function wrapTopic(){
    if (typeof window.selectTopicAnswer !== 'function' || window.selectTopicAnswer.__manualGeminiWrapped) return;
    const original = window.selectTopicAnswer;
    const wrapped = async function(qid, idx){
      const q = getCache().questions?.find(x => x.id === qid);
      const result = await original.apply(this, arguments);
      if (q && Number(idx) !== getCorrectIndex(q)) showPrompt({q, selectedIndex:Number(idx), source:'Question Bank'});
      return result;
    };
    wrapped.__manualGeminiWrapped = true;
    window.selectTopicAnswer = wrapped;
    try { selectTopicAnswer = wrapped; } catch (_) {}
  }
  function wrapFlash(){
    if (typeof window.selectFlashAnswer !== 'function' || window.selectFlashAnswer.__manualGeminiWrapped) return;
    const original = window.selectFlashAnswer;
    const wrapped = async function(qid, idx){
      const exam = getActiveExam();
      const q = exam?.questions?.find(x => x.id === qid);
      const result = await original.apply(this, arguments);
      if (q && exam?.mode === 'flash' && Number(idx) !== getCorrectIndex(q)) showPrompt({q, selectedIndex:Number(idx), source:'Flash Test'});
      return result;
    };
    wrapped.__manualGeminiWrapped = true;
    window.selectFlashAnswer = wrapped;
    try { selectFlashAnswer = wrapped; } catch (_) {}
  }
  function installHooks(){ wrapTopic(); wrapFlash(); }
  installHooks();
  setTimeout(installHooks, 800);
  setTimeout(installHooks, 1800);

  const style = document.createElement('style');
  style.id = 'manual-gemini-helper-styles';
  style.textContent = `.mg-open{overflow:hidden}.mg-backdrop{position:fixed;inset:0;z-index:10060;background:rgba(8,28,22,.62);display:flex;align-items:center;justify-content:center;padding:12px}.mg-modal{position:relative;width:min(640px,100%);max-height:90vh;overflow:auto;background:#fff;border-radius:23px;padding:21px 16px 16px;box-shadow:0 24px 80px rgba(0,0,0,.3);color:#153c2d}.mg-close{position:absolute;right:12px;top:10px;width:33px;height:33px;border:0;border-radius:50%;font-size:23px;background:#edf7f1;color:#24664e}.mg-kicker{font-size:10px;letter-spacing:.12em;font-weight:900;color:#0f6b4f}.mg-modal h2{margin:4px 0 7px;font-size:23px}.mg-help{font-size:13px;line-height:1.55;color:#567267}.mg-question{padding:11px;border-radius:13px;background:#f0f8f3;font-size:12px;line-height:1.5}.mg-question p{font-size:14px;font-weight:800;margin:5px 0 8px}.mg-question span{display:block}.mg-prompt{width:100%;height:145px;margin-top:10px;border:1px solid #cfe5d8;border-radius:12px;padding:10px;resize:vertical;font:12px/1.55 inherit;color:#254d3e;background:#fbfefc}.mg-inline-note{display:block;width:100%;margin-top:9px;border:1px solid #b9ddc8;background:#f1fbf4;color:#0f6b4f;border-radius:10px;padding:9px 10px;font-size:11px;font-weight:900;cursor:pointer}.mg-status{font-size:11px;color:#6f847a;margin-top:6px}.mg-actions{display:flex;gap:8px;margin-top:12px}.mg-copy,.mg-gemini,.mg-note{flex:1 1 180px;border:0;border-radius:12px;padding:11px;font-weight:900;cursor:pointer;line-height:1.3}.mg-copy{background:#0f6b4f;color:#fff}.mg-gemini{background:#e8f1ff;color:#174a8b}.mg-note{background:#edf7f1;color:#0f6b4f}@media(max-width:480px){.mg-backdrop{align-items:flex-end;padding:7px}.mg-modal{border-radius:22px 22px 0 0;max-height:91vh;padding:19px 13px 13px}.mg-prompt{height:145px}}`;
  style.textContent += `.mg-page{max-width:760px;margin:0 auto;padding:20px 16px 110px;color:#153c2d}.mg-page-head{display:flex;gap:12px;align-items:flex-start}.mg-page-head>div{flex:1}.mg-page-head span{font-size:10px;letter-spacing:.12em;font-weight:900;color:#0f6b4f}.mg-page h1{margin:5px 0 7px;font-size:26px}.mg-page p{margin:0;color:#567267;font-size:13px;line-height:1.55}.mg-page-back{border:0;border-radius:11px;padding:9px 11px;background:#edf7f1;color:#0f6b4f;font-weight:900;cursor:pointer;white-space:nowrap}.mg-page-note{display:flex;gap:9px;margin:16px 0;padding:12px;border:1px solid #cfe5d8;border-radius:14px;background:#f0f8f3;color:#567267;font-size:12px;line-height:1.5}.mg-page-note b{color:#0f6b4f}.mg-page-prompt{display:block;width:100%;min-height:250px;box-sizing:border-box;border:1px solid #cfe5d8;border-radius:14px;padding:12px;resize:vertical;background:#fbfefc;color:#254d3e;font:13px/1.6 inherit}.mg-page-actions{display:flex;flex-wrap:wrap;gap:9px;margin-top:12px}.mg-page-actions button{flex:1 1 220px;min-height:44px;border:0;border-radius:12px;padding:11px;font-weight:900;cursor:pointer}.mg-page-actions .mg-copy{background:#0f6b4f;color:#fff}.mg-page-actions .mg-gemini{background:#e8f1ff;color:#174a8b}@media(max-width:480px){.mg-page{padding:15px 12px 100px}.mg-page-head{gap:8px}.mg-page h1{font-size:22px}.mg-page-head p{font-size:12px}.mg-page-back{padding:8px 9px;font-size:12px}.mg-page-prompt{min-height:220px;font-size:12px}.mg-page-note{font-size:11px}}`;
  document.head.appendChild(style);
})();
