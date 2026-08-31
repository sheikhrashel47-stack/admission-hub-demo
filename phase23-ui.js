/* Phase 2+3 final UI/UX layer. Keeps legacy data, router, exam, and question logic intact. */
(function(){
  'use strict';

  const style=document.createElement('style');
  style.id='phase23-style';
  style.textContent=`
    :root{--glass:rgba(255,255,255,.78);--glass-strong:rgba(255,255,255,.92);--glass-border:rgba(15,107,79,.12);--glass-shadow:0 14px 34px rgba(23,58,43,.075)}
    .phase23-page{max-width:600px;margin:0 auto}
    .phase23-head{padding:4px 2px 20px}.phase23-back{display:inline-flex;align-items:center;gap:6px;border:0;background:none;color:var(--emerald-d);font:700 13px inherit;padding:5px 0;cursor:pointer}.phase23-title{font-size:27px;line-height:1.2;letter-spacing:-.035em;margin:12px 0 7px;color:var(--text)}.phase23-subtitle{font-size:14px;line-height:1.65;color:var(--sub);margin:0;max-width:540px}
    .web-search-card{background:linear-gradient(145deg,rgba(236,248,241,.92),rgba(255,255,255,.84));border:1px solid rgba(15,107,79,.15);border-radius:26px;padding:12px;box-shadow:var(--glass-shadow);backdrop-filter:blur(18px);margin:8px 0 18px}.web-search-card textarea{display:block;border:0;background:rgba(255,255,255,.7);min-height:112px;border-radius:18px;padding:16px;font-size:17px;line-height:1.55;box-shadow:inset 0 0 0 1px rgba(15,107,79,.08);resize:none}.web-search-card textarea:focus{outline:3px solid rgba(15,107,79,.18);outline-offset:0}.web-search-card .btn{margin-top:10px;min-height:52px;border-radius:17px;font-size:16px;background:#168258;box-shadow:0 8px 18px rgba(15,107,79,.18)}.web-search-card .btn:disabled{opacity:.65;cursor:wait}
    .web-chat-log{display:flex;flex-direction:column;gap:14px}.web-welcome{padding:20px 4px 10px;text-align:center;color:var(--sub)}.web-welcome-icon{font-size:38px;margin-bottom:8px}.web-welcome h2{font-size:18px;color:var(--text);margin:0 0 7px}.web-welcome p{font-size:13px;line-height:1.6;margin:0}.web-suggestion-row{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 2px}.web-suggestion{border:1px solid rgba(15,107,79,.16);background:var(--glass);color:var(--emerald-d);border-radius:999px;padding:9px 12px;font:600 12px inherit;cursor:pointer;transition:transform .16s ease,background .16s ease}.web-suggestion:active{transform:scale(.97)}.web-suggestion:hover{background:#fff}.web-message{max-width:94%;border-radius:20px;padding:14px 16px;line-height:1.65;font-size:14px}.web-message.user{margin-left:auto;background:var(--emerald);color:#fff;border-bottom-right-radius:7px}.web-message.assistant{background:var(--glass-strong);border:1px solid var(--glass-border);box-shadow:var(--glass-shadow);color:var(--text);border-bottom-left-radius:7px}.web-answer{font-size:16px;line-height:1.85;color:#24332b}.web-answer strong{font-weight:800;color:#123e2f}.web-answer p{margin:0 0 10px}.web-answer p:last-child{margin-bottom:0}  .web-more-info{margin:12px 0;border-top:1px solid rgba(15,107,79,.1);padding-top:8px}.web-more-info summary{cursor:pointer;color:var(--emerald-d);font-weight:800;font-size:13px}.web-more-info p{font-size:13px;line-height:1.6;margin:8px 0}.web-answer-heading{font-size:21px;line-height:1.4;margin:0 0 10px;color:#0b4f3b}.web-supporting-points{margin:8px 0 13px;padding-left:20px}.web-supporting-points li{margin:5px 0}.web-meta{font-size:11px;color:var(--sub);margin-bottom:7px;font-weight:700}.web-status{display:flex;align-items:center;gap:8px;color:var(--sub);font-size:13px}.web-dot{width:8px;height:8px;border-radius:50%;background:var(--emerald);box-shadow:0 0 0 5px rgba(15,107,79,.1);animation:webPulse 1s infinite}@keyframes webPulse{50%{opacity:.35;transform:scale(.8)}}.web-sources{border-top:1px solid rgba(15,107,79,.1);margin-top:13px;padding-top:10px}.web-sources-title{font-size:11px;font-weight:800;color:var(--sub);margin-bottom:5px}.web-source{display:block;color:var(--emerald-d);font-size:12px;text-decoration:none;padding:3px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.web-source:hover{text-decoration:underline}.web-error{background:#fff8f5!important;border-color:rgba(192,57,43,.16)!important;color:#7b382f!important}
    .dictionary-v2 .tool-stat-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:16px 0}.dictionary-v2 .tool-stat{background:var(--glass);border:1px solid var(--glass-border);border-radius:19px;padding:16px;box-shadow:var(--glass-shadow)}.dictionary-v2 .tool-stat strong{display:block;font-size:16px}.dictionary-v2 .tool-stat span{display:block;color:var(--sub);font-size:12px;margin-top:3px}.dictionary-v2 .dict-search-card{display:flex;gap:8px;align-items:center;background:var(--glass);border:1px solid var(--glass-border);border-radius:20px;padding:9px;box-shadow:var(--glass-shadow)}.dictionary-v2 .dict-search-card input{border:0;background:transparent;min-width:0;padding:12px;font-size:16px}.dictionary-v2 .dict-search-card input:focus{outline:0}.dictionary-v2 .dict-search-card .btn{width:auto;white-space:nowrap;padding:12px 18px}.dictionary-v2 .dict-result{background:var(--glass-strong);border:1px solid var(--glass-border);border-radius:22px;padding:18px;box-shadow:var(--glass-shadow);margin-top:16px}.dictionary-v2 .dict-result h2{font-size:25px;margin:8px 0 2px}.dictionary-v2 .dict-result p{line-height:1.65}.dictionary-v2 .dict-result-grid{display:grid;grid-template-columns:1fr 1fr;gap:11px;margin-top:14px}.dictionary-v2 .dict-result-grid>div{background:rgba(232,244,238,.62);border-radius:13px;padding:11px}.dictionary-v2 .dict-result-grid b{font-size:11px;color:var(--sub)}.dictionary-v2 .dict-result-grid p{font-size:13px;margin:4px 0 0}.dictionary-v2 .dict-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}.dictionary-v2 .dict-actions .btn{flex:1;min-width:145px}
    .exam-center .card,.exam-setup .card,.question-bank-page .card,.explorer-card{box-shadow:var(--glass-shadow);border-color:var(--glass-border)}
    .phase-nav{display:none!important}.page>.phase-nav{display:none!important}
    @media(max-width:430px){.phase23-title{font-size:24px}.web-answer{font-size:15px}.dictionary-v2 .dict-result-grid{grid-template-columns:1fr}.dictionary-v2 .dict-search-card .btn{padding:12px 14px}}
  `;
  document.head.appendChild(style);

  const esc23=s=>{const d=document.createElement('div');d.textContent=String(s??'');return d.innerHTML};
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const WebState={messages:[],loading:false};
  window.WebSearchState=WebState;

  function sourceLink(name,url){return `<a class="web-source" href="${esc23(url)}" target="_blank" rel="noopener noreferrer">${esc23(name)} ↗</a>`}
  function statusHtml(text){return `<div class="web-message assistant"><div class="web-status"><span class="web-dot"></span>${esc23(text)}</div></div>`}
  function makeAnswer(query,items){
    const usable=items.filter(x=>x&&x.text).sort((a,b)=>(b.score||0)-(a.score||0));
    if(!usable.length){const q=encodeURIComponent(query);return {html:`<div class="web-meta">ওয়েব সার্চ প্রস্তুত</div><div class="web-answer"><p><strong>“${esc23(query)}”</strong>-এর জন্য সরাসরি নির্ভরযোগ্য উত্তর পাওয়া যায়নি। নিচের live search links থেকে ফলাফল দেখুন:</p><p><a class="web-source" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${q}">Google Search ↗</a><a class="web-source" target="_blank" rel="noopener noreferrer" href="https://duckduckgo.com/?q=${q}">DuckDuckGo Search ↗</a></p><p>প্রশ্নটি আরও নির্দিষ্ট করে লিখলে ভালো ফল পাওয়া যেতে পারে।</p></div>`,count:0}}
    const primary=usable[0];
    const sourceCount=usable.length;
    const clean=String(primary.text).replace(/\s+/g,' ').trim();
    const clipped=clean.length>900?clean.slice(0,897)+'…':clean;
    const points=usable.slice(0,4).map(x=>`<li>${esc23(String(x.text).replace(/\s+/g,' ').trim().slice(0,360))}</li>`).join('');
    const copyText=[`প্রশ্ন: ${query}`,`উত্তর: ${clipped}`,`তথ্যসূত্র: ${usable.map(x=>x.name).join(', ')}`].join('\\n');
    const intro=sourceCount>1?`আপনার প্রশ্নের জন্য ${sourceCount}টি প্রকাশ্য উৎসের তথ্য programmatically মিলিয়ে দেখানো হলো।`:'প্রকাশ্য নির্ভরযোগ্য web source থেকে পাওয়া তথ্য:';
    return {html:`<div class="web-meta">REAL WEB RESULT · AI নয়</div><div class="web-answer"><h2 class="web-answer-heading">${esc23(query)}</h2><p><strong>সরাসরি উত্তর</strong></p><p>${esc23(clipped)}</p><p>${intro}</p><ul class="web-supporting-points">${points}</ul><details class="web-more-info"><summary>আরও তথ্য</summary><div>${usable.slice(1,6).map(x=>`<p><b>${esc23(x.name)}:</b> ${esc23(String(x.text).slice(0,420))}</p>`).join('')}</div></details><button class="btn ghost sm" type="button" onclick="copyWebAnswer(${JSON.stringify(copyText).replace(/</g,'\\u003c')})">Copy answer</button></div><div class="web-sources"><div class="web-sources-title">Real source / Reference</div>${usable.map(x=>sourceLink(x.name,x.url)).join('')}</div>`,count:sourceCount};
  }
  async function fetchSources(q){
    const searchQ=q.replace(/[?؟!！]/g,' ').replace(/\b(what is|who is|where is|when is|how many|define|what are)\b/gi,' ').replace(/\b(কী|কি|কে|কোথায়|কোথায়|কবে|কত|এর|সম্পর্কে|বলুন)\b/g,' ').replace(/\s+/g,' ').trim()||q;
    const cacheKey='webchat-cache-v3:'+q.trim().toLowerCase();
    try{const cached=JSON.parse(localStorage.getItem(cacheKey)||'null');if(cached&&Date.now()-cached.at<86400000)return cached.rows||[]}catch(_){ }
    const fetchFast=async(url)=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),4500);try{const r=await fetch(url,{headers:{Accept:'application/json'},signal:controller.signal});if(!r.ok)throw Error('HTTP '+r.status);return await r.json()}finally{clearTimeout(timer)}};
    const rows=[];const add=(x)=>{if(x?.text)rows.push({...x,score:x.score||1})};
    const fetchDDG=async()=>{const url='https://api.duckduckgo.com/?q='+encodeURIComponent(searchQ)+'&format=json&no_html=1&skip_disambig=1',d=await fetchFast(url).catch(()=>null);if(!d)return;if(d.AbstractText)add({name:'DuckDuckGo Instant Answer',text:d.AbstractText,url:d.AbstractURL||('https://duckduckgo.com/?q='+encodeURIComponent(q)),score:4});(d.RelatedTopics||[]).flatMap(x=>x.Topics||[x]).slice(0,4).forEach(t=>{if(t.Text&&t.FirstURL)add({name:'DuckDuckGo related result',text:t.Text,url:t.FirstURL,score:2})})};
    const fetchWiki=async lang=>{const search='https://'+lang+'.wikipedia.org/w/api.php?action=opensearch&search='+encodeURIComponent(searchQ)+'&limit=3&namespace=0&format=json&origin=*',r=await fetchFast(search).catch(()=>null);const titles=r?.[1]||[];await Promise.all(titles.slice(0,2).map(async title=>{const url='https://'+lang+'.wikipedia.org/api/rest_v1/page/summary/'+encodeURIComponent(title.replace(/\s+/g,'_')),x=await fetchFast(url).catch(()=>null);if(x?.extract)add({name:lang==='bn'?'বাংলা Wikipedia':'Wikipedia',text:x.extract,url:x.content_urls?.desktop?.page||url,score:lang==='bn'?6:5})}))};
    const fetchWikidata=async()=>{const url='https://www.wikidata.org/w/api.php?action=wbsearchentities&search='+encodeURIComponent(searchQ)+'&language=en&uselang=en&format=json&origin=*',r=await fetchFast(url).catch(()=>null);const hits=r?.search||[];hits.slice(0,3).forEach(x=>{const label=x.label||searchQ,description=x.description;if(description)add({name:'Wikidata structured fact',text:`${label}: ${description}`,url:x.concepturi||'https://www.wikidata.org/',score:4})})};
    const fetchKG=async()=>{const key=window.EMERALD_KG_API_KEY||localStorage.getItem('emeraldKgApiKey');if(!key)return;const url='https://kgsearch.googleapis.com/v1/entities:search?query='+encodeURIComponent(searchQ)+'&key='+encodeURIComponent(key)+'&limit=5&indent=True',r=await fetchFast(url).catch(()=>null);(r?.itemListElement||[]).slice(0,3).forEach(x=>{const e=x.result;if(e?.name||e?.description)add({name:'Google Knowledge Graph',text:[e.name,e.description].filter(Boolean).join(': '),url:e.detailedDescription?.url||'https://www.google.com/search?q='+encodeURIComponent(q),score:4})})};
    await Promise.allSettled([fetchDDG(),fetchWiki('bn'),fetchWiki('en'),fetchWikidata(),fetchKG()]);
    const seen=new Set(),deduped=rows.sort((a,b)=>b.score-a.score).filter(x=>{const sig=(x.text||'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim().slice(0,180);if(!sig||seen.has(sig))return false;seen.add(sig);return true}).slice(0,10);
    try{localStorage.setItem(cacheKey,JSON.stringify({at:Date.now(),rows:deduped}))}catch(_){ }
    return deduped;
  }

  function renderWebChatV2(){
    const log=WebState.messages.length?WebState.messages.map(m=>m.role==='user'?`<div class="web-message user">${esc23(m.text)}</div>`:`<div class="web-message assistant ${m.error?'web-error':''}">${m.html}</div>`).join(''):`<div class="web-welcome"><div class="web-welcome-icon">🌐</div><h2>Web AI / Google Information Chat</h2><p>ভর্তি, সাধারণ জ্ঞান বা যেকোনো বিষয় সম্পর্কে প্রশ্ন করুন। প্রকাশ্য ওয়েব উৎস মিলিয়ে সহজ বাংলায় উত্তর পাওয়ার চেষ্টা করবে।</p><div class="web-suggestion-row"><button class="web-suggestion" onclick="webQuickAsk('বাংলাদেশের সংবিধানের রাষ্ট্রভাষা কী?')">বাংলাদেশের রাষ্ট্রভাষা কী?</button><button class="web-suggestion" onclick="webQuickAsk('What is the admission process for public universities in Bangladesh?')">Admission process</button></div></div>`;
    const loading=WebState.loading?statusHtml(WebState.loading):'';
    const html=`<div class="phase23-page web-chat-v2"><div class="phase23-head"><button class="phase23-back" onclick="navigate('dashboard')">← <span>Web AI / Google Information Chat</span></button><h1 class="phase23-title">Web AI / Google Information Chat</h1><p class="phase23-subtitle">প্রশ্ন করুন। ওয়েব থেকে তথ্য খুঁজে দ্রুত, পরিষ্কার ও বাংলায় উত্তর পান।</p></div><div id="webChatLog" class="web-chat-log">${log}${loading}</div><form class="web-search-card" onsubmit="askWebChat(event)"><textarea id="webChatInput" placeholder="বাংলা বা English-এ প্রশ্ন লিখুন…" required></textarea><button id="webSearchButton" class="btn" type="submit" ${WebState.loading?'disabled':''}>${WebState.loading?'Searching…':'Search'}</button></form></div>`;
    renderShell(html,{topbar:false});
  }
  window.renderWebChatV2=renderWebChatV2;
  window.renderWebChat=renderWebChatV2;
  window.webQuickAsk=function(q){const i=document.getElementById('webChatInput');if(i){i.value=q;i.focus()}else{WebState.messages.push({role:'user',text:q});window.askWebChat({preventDefault(){}})}};
  window.copyWebAnswer=async function(text){try{await navigator.clipboard.writeText(text);toast('Answer copied')}catch(_){toast('Copy unavailable; select the answer text manually')}};
  window.askWebChat=async function(e){if(e&&e.preventDefault)e.preventDefault();const input=document.getElementById('webChatInput'),q=(input?.value||'').trim();if(!q||WebState.loading)return;WebState.messages.push({role:'user',text:q});WebState.loading='খুঁজছি…';renderWebChatV2();try{const rows=await fetchSources(q);WebState.loading='তথ্য সংগ্রহ করছি…';renderWebChatV2();await wait(120);const answer=makeAnswer(q,rows);WebState.messages.push({role:'assistant',html:answer.html});}catch(err){WebState.messages.push({role:'assistant',error:true,html:'<div class="web-answer"><strong>সার্চ সম্পন্ন করা যায়নি।</strong><p>Live search link ব্যবহার করে ফলাফল দেখুন, অথবা প্রশ্নটি আরও নির্দিষ্ট করে আবার চেষ্টা করুন।</p><p><a class="web-source" target="_blank" rel="noopener noreferrer" href="https://www.google.com/search?q=${encodeURIComponent(q)}">Google Search ↗</a></p></div>'});}finally{WebState.loading=false;renderWebChatV2();setTimeout(()=>document.getElementById('webChatInput')?.focus(),0)}};

  const DictState={q:'',loading:false,result:null,error:''};
  async function lookupDictionaryWord(word){
    const q=word.trim();if(!q)return null;
    const cacheKey='dictionary-api-v2:'+q.toLowerCase();
    try{const cached=JSON.parse(localStorage.getItem(cacheKey)||'null');if(cached&&Date.now()-cached.at<604800000)return cached.value}catch(_){ }
    const isBn=/[\u0980-\u09FF]/.test(q);
    const fetchFast=async(url)=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),7000);try{const r=await fetch(url,{headers:{Accept:'application/json'},signal:controller.signal});if(!r.ok)throw Error('HTTP '+r.status);return await r.json()}finally{clearTimeout(timer)}};
    let value=null;
    if(!isBn){
      const data=await fetchFast('https://api.dictionaryapi.dev/api/v2/entries/en/'+encodeURIComponent(q.toLowerCase())).catch(()=>null);
      const entry=data?.[0];
      if(entry){const meanings=entry.meanings||[],defs=meanings.flatMap(m=>(m.definitions||[]).map(d=>({pos:m.partOfSpeech||'word',definition:d.definition,example:d.example||'',synonyms:[...(d.synonyms||[]),...(m.synonyms||[])]})));value={word:entry.word||q,phonetic:entry.phonetic||entry.phonetics?.find(x=>x.text)?.text||'—',pos:meanings.map(m=>m.partOfSpeech).filter(Boolean).join(', ')||'Word',definition:defs[0]?.definition||'',definitions:defs.slice(0,4),synonyms:[...new Set(defs.flatMap(x=>x.synonyms))].slice(0,10),source:'Free Dictionary API',sourceUrl:'https://api.dictionaryapi.dev/'};}
    }
    if(!value){
      const lang=isBn?'bn':'en',url='https://'+lang+'.wikipedia.org/api/rest_v1/page/summary/'+encodeURIComponent(q.replace(/\s+/g,'_')),data=await fetchFast(url).catch(()=>null);
      if(data?.extract)value={word:q,phonetic:'—',pos:isBn?'বাংলা শব্দ':'Word',definition:data.extract,definitions:[{pos:'Reference',definition:data.extract,example:'',synonyms:[]}],synonyms:[],source:(isBn?'বাংলা':'English')+' Wikipedia',sourceUrl:data.content_urls?.desktop?.page||url};
    }
    if(!value&&typeof dictLookup==='function'){const local=dictLookup(q);if(local)value={word:local.word||q,phonetic:local.pron||'—',pos:local.pos||'Word',definition:local.bn||local.en||'',definitions:[{pos:local.pos||'Word',definition:local.bn||local.en||'',example:local.ex||'',synonyms:[]}],synonyms:(local.syn||'').split(',').map(x=>x.trim()).filter(Boolean),source:'Local fallback',sourceUrl:''}}
    try{localStorage.setItem(cacheKey,JSON.stringify({at:Date.now(),value}))}catch(_){ }
    return value;
  }
  function renderDictionaryV2(){
    const q=DictState.q||Router.params?.q||'';DictState.q=q;
    let phaseData={};try{phaseData=JSON.parse(localStorage.getItem('admission_phase345_v1')||'{}')}catch(_){phaseData={}} const saved=phaseData.savedWords||[]; const vocab=phaseData.vocab||[];
    const r=DictState.result, result=DictState.loading?`<div class="card empty">শব্দের definition, phonetic ও example খোঁজা হচ্ছে…</div>`:DictState.error?`<div class="card empty">${esc23(DictState.error)}</div>`:r?`<article class="dict-result"><span class="pill">${esc23(r.pos||'Word')}</span><h2>${esc23(r.word)}</h2><div class="muted">/${esc23(r.phonetic||'—')}/ · ${esc23(r.source||'Dictionary API')}</div><div class="dict-result-grid"><div><b>বাংলা-friendly definition / অর্থ</b><p>${esc23(r.definition||'—')}</p></div><div><b>Part of speech</b><p>${esc23(r.pos||'—')}</p></div><div><b>Synonyms / সমার্থক</b><p>${esc23(r.synonyms?.join(', ')||'—')}</p></div><div><b>Examples / উদাহরণ</b><p>${esc23(r.definitions?.find(x=>x.example)?.example||'Example পাওয়া যায়নি।')}</p></div>${(r.definitions||[]).slice(0,2).map((d,i)=>`<div><b>Definition ${i+1}</b><p>${esc23(d.definition)}</p></div>`).join('')}</div><div class="dict-actions"><button class="btn secondary" onclick="addPhaseWord('savedWords','${esc23(r.word)}')">⭐ Save word</button><button class="btn ghost" onclick="addPhaseWord('vocab','${esc23(r.word)}')">📚 Add vocabulary</button>${r.sourceUrl?`<a class="btn ghost" target="_blank" rel="noopener noreferrer" href="${esc23(r.sourceUrl)}">Source ↗</a>`:''}</div></article>`:(q?`<div class="card empty">“${esc23(q)}” শব্দটির জন্য Free Dictionary ও বাংলা fallback-এ ফল পাওয়া যায়নি। বানান যাচাই করে আবার Search করুন।</div>`:'');
    const html=`<div class="phase23-page dictionary-v2"><div class="phase23-head"><button class="phase23-back" onclick="navigate('dashboard')">← <span>Dictionary</span></button><h1 class="phase23-title">Ultimate Dictionary</h1><p class="phase23-subtitle">Free Dictionary API থেকে definition, phonetic, part of speech, example ও synonyms পান। বাংলা শব্দের জন্য Wikipedia fallback আছে।</p></div><form class="dict-search-card" onsubmit="searchDict(event)"><input id="dictQ" value="${esc23(q)}" placeholder="যেমন: resilient / অমর" required><button class="btn" type="submit" ${DictState.loading?'disabled':''}>${DictState.loading?'Searching…':'Search'}</button></form><div class="tool-stat-grid"><div class="tool-stat"><strong>⭐ Saved</strong><span>${saved.length} words</span></div><div class="tool-stat"><strong>📚 Vocabulary</strong><span>${vocab.length} words</span></div></div>${result}</div>`;renderShell(html,{topbar:false});
  }
  window.renderDictionaryV2=renderDictionaryV2;window.renderDictionary=renderDictionaryV2;
  window.searchDict=async e=>{e.preventDefault();const q=document.getElementById('dictQ')?.value.trim()||'';if(!q||DictState.loading)return;Router.params={q};DictState.q=q;DictState.loading=true;DictState.error='';DictState.result=null;renderDictionaryV2();try{DictState.result=await lookupDictionaryWord(q);if(!DictState.result)DictState.error='এই শব্দটি Free Dictionary API বা বাংলা fallback-এ পাওয়া যায়নি। বানান যাচাই করে আবার Search করুন।'}catch(_){DictState.error='Dictionary API এখন সাময়িকভাবে unavailable। কিছুক্ষণ পর আবার চেষ্টা করুন।'}finally{DictState.loading=false;renderDictionaryV2()}};

  // Keep special tools isolated to their own routes and remove any legacy secondary toolbar if a patch adds one.
  const oldRender=window.render;
  window.render=function phase23RouteAudit(){
    if(Router.path==='web-chat') return renderWebChatV2();
    if(Router.path==='dictionary') return renderDictionaryV2();
    if(['daily-gk','memorizing','navigator'].some(x=>Router.path===x||Router.path.startsWith(x+'/'))) document.querySelectorAll('.phase-nav').forEach(n=>n.remove());
    return oldRender();
  };
  const oldShell=window.renderShell;
  window.renderShell=function phase23Shell(inner,opts){oldShell(inner,opts);document.querySelectorAll('.phase-nav').forEach(n=>n.remove())};
  const oldNavigate=window.navigate;
  window.navigate=function phase23Navigate(path){
    if(path==='web-chat'||path==='dictionary'){
      return oldNavigate(path);
    }
    return oldNavigate(path);
  };
})();

(function(){
  let commandPage=0;
  function updateCommandPage(index){
    const currentPath=String(window.Router?.path||location.hash.replace(/^#\/?/,'').split('?')[0]||'dashboard');
    if(currentPath!=='dashboard'&&currentPath!=='home'&&currentPath!=='')return;
    const track=document.getElementById('commandTrack');if(!track||!track.isConnected)return;
    const slideCount=Math.max(1,track.querySelectorAll('.command-slide').length);
    commandPage=Math.max(0,Math.min(slideCount-1,Number(index)||0));requestAnimationFrame(()=>{
      const activePath=String(window.Router?.path||location.hash.replace(/^#\/?/,'').split('?')[0]||'dashboard');
      if(activePath!=='dashboard'&&activePath!=='home'&&activePath!=='')return;
      if(!track.isConnected)return;
      // Translate by one slide; percentage is relative to the full track width.
      track.style.transform=`translate3d(${-commandPage*(100/slideCount)}%,0,0)`;
      document.querySelectorAll('.command-dot').forEach((dot,i)=>{dot.classList.toggle('active',i===commandPage);dot.setAttribute('aria-selected',i===commandPage?'true':'false')});
    });
  }
  window.goCommandPage=function(index){updateCommandPage(index)};
  function installCommandCarousel(){
    const currentPath=String(window.Router?.path||location.hash.replace(/^#\/?/,'').split('?')[0]||'dashboard');
    if(currentPath!=='dashboard'&&currentPath!=='home'&&currentPath!=='')return;
    const carousel=document.querySelector('.command-carousel'),track=document.getElementById('commandTrack');
    if(!carousel||!track||track.dataset.bound==='1')return;
    track.dataset.bound='1';let startX=0,startY=0,dragging=false,ignorePointerUntil=0;
    const beginSwipe=(x,y)=>{startX=x;startY=y;dragging=true};
    const finishSwipe=(x,y)=>{if(!dragging)return;dragging=false;const dx=x-startX,dy=y-startY;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)){requestAnimationFrame(()=>updateCommandPage(commandPage+(dx<0?1:-1)))}};
    carousel.addEventListener('pointerdown',e=>{if(Date.now()<ignorePointerUntil||(e.pointerType==='mouse'&&e.button!==0))return;beginSwipe(e.clientX,e.clientY);try{if(e.pointerId!=null&&carousel.setPointerCapture)carousel.setPointerCapture(e.pointerId)}catch(_){ }},{passive:true});
    carousel.addEventListener('pointerup',e=>{if(Date.now()<ignorePointerUntil)return;finishSwipe(e.clientX,e.clientY)},{passive:true});
    carousel.addEventListener('pointercancel',()=>{dragging=false});
    carousel.addEventListener('lostpointercapture',()=>{dragging=false});
    carousel.addEventListener('touchstart',e=>{const touch=e.changedTouches[0];if(!touch)return;ignorePointerUntil=Date.now()+650;beginSwipe(touch.clientX,touch.clientY)},{passive:true});
    carousel.addEventListener('touchend',e=>{const touch=e.changedTouches[0];if(!touch)return;ignorePointerUntil=Date.now()+650;finishSwipe(touch.clientX,touch.clientY)},{passive:true});
    carousel.addEventListener('touchcancel',()=>{ignorePointerUntil=Date.now()+650;dragging=false},{passive:true});
    updateCommandPage(commandPage);
  }
  const app=document.getElementById('app');
  if(app){let installFrame=0;const scheduleInstall=()=>{if(installFrame)return;installFrame=requestAnimationFrame(()=>{installFrame=0;installCommandCarousel()})};new MutationObserver(scheduleInstall).observe(app,{childList:true,subtree:true});setTimeout(installCommandCarousel,0)}
})();

(function(){
  const app=document.getElementById('app');
  if(!app)return;
  let auditFrame=0;
  let lastAuditKey='';
  const audit=()=>{
    auditFrame=0;
    if(!(Router.path==='question-bank'&&ExplorerState.subjectId&&!ExplorerState.topicId&&window.renderQuestionBankV2))return;
    const key=[Router.path,ExplorerState.subjectId,ExplorerState.topicId,Boolean(document.querySelector('.q-selected'))].join('|');
    if(key===lastAuditKey)return;
    lastAuditKey=key;
    // Render at most once per route/content state. The render itself mutates
    // #app, so a MutationObserver without this key guard becomes an infinite
    // render loop and makes the whole PWA look like it is shaking.
    window.renderQuestionBankV2();
  };
  const scheduleAudit=()=>{
    if(auditFrame)return;
    auditFrame=requestAnimationFrame(audit);
  };
  window.addEventListener('hashchange',()=>{lastAuditKey='';scheduleAudit()},{passive:true});
  new MutationObserver(scheduleAudit).observe(app,{childList:true,subtree:true});
})();
