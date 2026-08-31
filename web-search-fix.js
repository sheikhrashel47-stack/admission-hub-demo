(function(){
  'use strict';
  const state=window.WebSearchState||{messages:[],loading:false};
  state.messages=Array.isArray(state.messages)?state.messages:[];state.loading=false;state.lastQuery='';
  window.WebSearchState=state;
  const esc=s=>{const d=document.createElement('div');d.textContent=String(s??'');return d.innerHTML};
  const wait=ms=>new Promise(r=>setTimeout(r,ms));
  const timeoutMs=7500;
  const hostOf=url=>{try{return new URL(url).hostname.replace(/^www\./,'')}catch(_){return ''}};
  const favicon=url=>{const host=hostOf(url);return host?`https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`:''};
  const validUrl=url=>{try{const u=new URL(url);return /^https?:$/.test(u.protocol)}catch(_){return false}};
  const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
  const cacheKey=q=>'real-web-search-v2:'+q.trim().toLocaleLowerCase();
  async function fetchJson(url){const c=new AbortController(),t=setTimeout(()=>c.abort(),timeoutMs);try{const r=await fetch(url,{headers:{Accept:'application/json'},signal:c.signal,mode:'cors'});if(!r.ok)throw Error('HTTP '+r.status);return await r.json()}finally{clearTimeout(t)}}
  async function fetchText(url){const c=new AbortController(),t=setTimeout(()=>c.abort(),timeoutMs);try{const r=await fetch(url,{headers:{Accept:'text/plain,text/html,*/*'},signal:c.signal,mode:'cors'});if(!r.ok)throw Error('HTTP '+r.status);return await r.text()}finally{clearTimeout(t)}}
  function add(rows,x){if(!x)return;const url=validUrl(x.url)?x.url:'';const title=clean(x.title)||hostOf(url)||'Web result';const snippet=clean(x.snippet)||'Open the source page for the full result.';if(!url||!snippet)return;rows.push({source:clean(x.source)||hostOf(url)||'Web',title,snippet,url,date:clean(x.date)||'Date unavailable',icon:x.icon||favicon(url),score:Number(x.score||1)})}
  function parseDdgHtml(markdown,q){const rows=[];const re=/## \[([^\]]+)\]\((https?:\/\/[^)]+)\)([\s\S]*?)(?=\n## \[|$)/g;let m;while((m=re.exec(markdown))&&rows.length<8){const title=clean(m[1]),url=m[2],block=clean(m[3]).replace(/\[([^\]]+)\]\([^)]*\)/g,'$1').replace(/!\[[^\]]*\]\([^)]*\)/g,'');const host=hostOf(url);add(rows,{source:host||'DuckDuckGo',title,snippet:block.slice(0,420)||`Search result for ${q}`,url,date:'Date unavailable',score:3})}return rows}
  async function fetchDuckDuckGo(q,rows){const d=await fetchJson('https://api.duckduckgo.com/?q='+encodeURIComponent(q)+'&format=json&no_html=1&skip_disambig=1');if(d.AbstractText)add(rows,{source:d.AbstractSource||'DuckDuckGo',title:d.Heading||q,snippet:d.AbstractText,url:d.AbstractURL||'https://duckduckgo.com/?q='+encodeURIComponent(q),date:'Date unavailable',score:5});const topics=(d.RelatedTopics||[]).flatMap(x=>x.Topics||[x]);topics.slice(0,8).forEach(t=>{if(t.Text&&t.FirstURL)add(rows,{source:'DuckDuckGo',title:clean(t.Text).split(' - ')[0],snippet:t.Text,url:t.FirstURL,date:'Date unavailable',score:2})})}
  async function fetchDuckHtml(q,rows){const url='https://r.jina.ai/http://html.duckduckgo.com/html/?q='+encodeURIComponent(q);const text=await fetchText(url);parseDdgHtml(text,q).forEach(x=>rows.push(x))}
  async function fetchWiki(lang,q,rows){const api='https://'+lang+'.wikipedia.org/w/api.php?action=opensearch&search='+encodeURIComponent(q)+'&limit=5&namespace=0&format=json&origin=*';const d=await fetchJson(api);const titles=d?.[1]||[],urls=d?.[3]||[];await Promise.all(titles.slice(0,4).map(async(title,i)=>{try{const sum=await fetchJson('https://'+lang+'.wikipedia.org/api/rest_v1/page/summary/'+encodeURIComponent(title.replace(/\s+/g,'_')));if(sum?.extract)add(rows,{source:lang==='bn'?'বাংলা Wikipedia':'Wikipedia',title:sum.title||title,snippet:sum.extract,url:sum.content_urls?.desktop?.page||urls[i],date:sum.timestamp?new Date(sum.timestamp).toLocaleDateString():'Date unavailable',score:lang==='bn'?5:4})}catch(_){}}))}
  async function fetchSearx(instance,q,rows){const d=await fetchJson(instance+'/search?q='+encodeURIComponent(q)+'&format=json&language=all&safesearch=1');(d.results||[]).slice(0,8).forEach(x=>add(rows,{source:x.engine||'SearXNG',title:x.title,snippet:x.content,url:x.url,date:x.publishedDate||x.date,score:3}))}
  async function search(q){
    const cached=(()=>{try{const x=JSON.parse(localStorage.getItem(cacheKey(q))||'null');return x&&Date.now()-x.at<21600000?x.rows:[]}catch(_){return []}})();if(cached.length)return cached;
    const rows=[];
    try{await fetchDuckDuckGo(q,rows)}catch(_){ }
    if(rows.length<3)try{await fetchDuckHtml(q,rows)}catch(_){ }
    await Promise.allSettled([fetchWiki('bn',q,rows),fetchWiki('en',q,rows)]);
    if(rows.length<4){for(const inst of ['https://search.inetol.net','https://search.sapti.me']){try{await fetchSearx(inst,q,rows);if(rows.length>=6)break}catch(_){}}}
    const seen=new Set();const out=rows.sort((a,b)=>b.score-a.score).filter(x=>{const sig=(x.url+'|'+x.title).toLowerCase();if(seen.has(sig))return false;seen.add(sig);return true}).slice(0,12);try{localStorage.setItem(cacheKey(q),JSON.stringify({at:Date.now(),rows:out}))}catch(_){ }return out;
  }
  const suggestions=q=>[q+' official',q+' latest information',q+' Wikipedia'].filter((x,i)=>x.toLowerCase()!==q.toLowerCase()&&i<3);
  function resultCard(r){const host=hostOf(r.url);return `<article class="web-result-card"><div class="web-result-source"><img src="${esc(r.icon||favicon(r.url))}" alt="" width="18" height="18" loading="lazy" onerror="this.style.visibility='hidden'"><span>${esc(r.source||host)}</span><span>·</span><span>${esc(r.date||'Date unavailable')}</span></div><a class="web-result-title" href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${esc(r.title)}</a><div class="web-result-url">${esc(r.url)}</div><p class="web-result-snippet">${esc(r.snippet)}</p><div class="web-result-actions"><a class="btn sm" href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">Open Result ↗</a><a class="web-result-source-link" href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">${esc(host||'Source link')}</a></div></article>`}
  function fallbackCards(q){const e=encodeURIComponent(q);return [{source:'Google Search',title:`Search “${q}” on Google`,snippet:'Open the live Google result page to see the latest indexed web results.',url:'https://www.google.com/search?q='+e,date:'Live search',icon:favicon('https://www.google.com')},{source:'Bing Search',title:`Search “${q}” on Bing`,snippet:'Alternative live web search for the same query.',url:'https://www.bing.com/search?q='+e,date:'Live search',icon:favicon('https://www.bing.com')},{source:'DuckDuckGo',title:`Search “${q}” on DuckDuckGo`,snippet:'Privacy-friendly live search fallback.',url:'https://duckduckgo.com/?q='+e,date:'Live search',icon:favicon('https://duckduckgo.com')}];}
  function render(){const log=state.messages.length?state.messages.map(m=>m.role==='user'?`<div class="web-message user">${esc(m.text)}</div>`:`<div class="web-message assistant ${m.error?'web-error':''}">${m.html}</div>`).join(''):`<div class="web-welcome"><div class="web-welcome-icon">🌐</div><h2>Real Web Search</h2><p>বাংলা, English বা mixed query লিখুন। এটি AI chatbot নয়—public web sources থেকে result cards দেখায়।</p><div class="web-suggestion-row"><button class="web-suggestion" onclick="webQuickAsk('বাংলাদেশের রাজধানী')">বাংলাদেশের রাজধানী</button><button class="web-suggestion" onclick="webQuickAsk('admission test 2024')">admission test 2024</button><button class="web-suggestion" onclick="webQuickAsk('বাংলাদেশ admission test')">Mixed query</button></div></div>`;const loading=state.loading?`<div class="web-message assistant"><div class="web-status"><span class="web-dot"></span>${esc(state.loading)}</div></div>`:'';renderShell(`<div class="phase23-page web-chat-v2"><div class="phase23-head"><button class="phase23-back" onclick="navigate('dashboard')">← <span>Web Search</span></button><h1 class="phase23-title">Real Web Search</h1><p class="phase23-subtitle">DuckDuckGo, Wikipedia এবং public search fallbacks থেকে live result cards। কোনো AI API ব্যবহার করা হয় না।</p></div><div id="webChatLog" class="web-chat-log">${log}${loading}</div><form class="web-search-card" onsubmit="askWebChat(event)"><textarea id="webChatInput" placeholder="বাংলা বা English query লিখুন…" required></textarea><button id="webSearchButton" class="btn" type="submit" ${state.loading?'disabled':''}>${state.loading?'Searching…':'Search Web'}</button></form></div>`,{topbar:false})}
  async function synthesizeAnswer(q, rows){
    if(!rows.length) return null;
    const isBn = /[\u0980-\u09FF]/.test(q);
    const best = rows.find(r=>r.snippet && r.snippet.length > 40) || rows[0];
    let answer = best.snippet;
    if(isBn && !/[\u0980-\u09FF]/.test(answer)){
      try {
        const r = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=bn&dt=t&q=${encodeURIComponent(answer)}`);
        const d = await r.json();
        if(d?.[0]?.[0]?.[0]) answer = d[0][0][0];
      } catch(_) {}
    }
    return answer;
  }
  function resultHtml(q,rows,answer){const usable=rows.length?rows:fallbackCards(q);const note=rows.length?`<div class="web-result-summary"><strong>${rows.length}টি real result</strong> · Sources collected and filtered for “${esc(q)}”</div>`:`<div class="web-result-summary"><strong>Direct live-search options</strong><br>API responses were unavailable, so use one of these live result pages instead of an empty state.</div>`;const chips=suggestions(q).map(s=>`<button class="web-suggestion" onclick="webQuickAsk(${JSON.stringify(s).replace(/</g,'\\u003c')})">${esc(s)}</button>`).join('');const ansHtml=answer?`<article class="web-result-card" style="border-left:4px solid var(--orange);background:var(--mint)"><div class="web-result-source">✨ Smart Answer</div><p class="web-result-snippet" style="font-size:15px;font-weight:500">${esc(answer)}</p></article>`:'';return `${ansHtml}${note}<div class="web-results">${usable.map(resultCard).join('')}</div><div class="web-retry-row"><button class="btn secondary sm" onclick="retryWebSearch(${JSON.stringify(q).replace(/</g,'\\u003c')})">Retry search</button><span class="muted">Try a more specific query:</span>${chips}</div>`}
  window.renderWebChatV2=render;window.renderWebChat=render;
  window.webQuickAsk=function(q){const i=document.getElementById('webChatInput');if(i){i.value=q;i.focus();if(typeof window.askWebChat==='function')window.askWebChat({preventDefault(){}})}else{state.messages.push({role:'user',text:q});window.askWebChat({preventDefault(){}})}};
  window.retryWebSearch=function(q){state.messages=state.messages.filter(m=>!(m.role==='assistant'&&m.query===q));const i=document.getElementById('webChatInput');if(i)i.value=q;window.askWebChat({preventDefault(){}})};
  window.askWebChat=async function(e){
    e?.preventDefault?.();
    const input=document.getElementById('webChatInput'),q=(input?.value||'').trim();
    if(!q||state.loading)return;
    state.lastQuery=q;
    state.messages.push({role:'user',text:q});
    state.loading='Searching public web sources…';
    render();
    try{
      const rows=await search(q);
      state.loading='Synthesizing answer…';
      render();
      const answer = await synthesizeAnswer(q, rows);
      state.messages.push({role:'assistant',query:q,html:resultHtml(q,rows,answer),error:!rows.length});
    }catch(err){
      state.messages.push({role:'assistant',query:q,error:true,html:resultHtml(q,[],null)});
    }finally{
      state.loading=false;
      render();
      setTimeout(()=>document.getElementById('webChatInput')?.focus(),0);
    }
  };
  const st=document.createElement('style');st.id='web-search-fix-style';st.textContent=`.web-results{display:grid;gap:12px;margin-top:12px}.web-result-card{background:var(--glass-strong,var(--card));border:1px solid var(--glass-border,var(--line));border-radius:17px;padding:14px;box-shadow:var(--glass-shadow,var(--shadow));overflow:hidden}.web-result-source{display:flex;align-items:center;gap:6px;color:var(--sub);font-size:11px;margin-bottom:8px}.web-result-source img{border-radius:4px;flex:0 0 auto}.web-result-title{display:block;color:var(--emerald-d);font-size:17px;line-height:1.35;font-weight:800;text-decoration:none}.web-result-title:hover{text-decoration:underline}.web-result-url{color:var(--sub);font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:4px}.web-result-snippet{color:var(--text);font-size:13px;line-height:1.58;margin:8px 0 0}.web-result-actions{display:flex;align-items:center;gap:9px;margin-top:11px;flex-wrap:wrap}.web-result-actions .btn{width:auto;text-decoration:none}.web-result-source-link{font-size:12px;color:var(--emerald-d);text-decoration:none;overflow-wrap:anywhere}.web-result-summary{font-size:12px;color:var(--sub);line-height:1.5;margin:5px 0 8px}.web-retry-row{display:flex;align-items:center;gap:7px;flex-wrap:wrap;margin:14px 0 4px}.web-retry-row .web-suggestion{margin:0;padding:7px 10px}.web-error{border-color:rgba(192,57,43,.22)!important}.web-search-card{position:sticky;bottom:calc(4px + var(--safe-b,0px));z-index:4}.web-chat-log{padding-bottom:8px}@media(max-width:430px){.web-result-title{font-size:16px}.web-result-card{padding:12px}}`;document.head.appendChild(st);
  window.addEventListener('load',()=>{if(location.hash==='#web-chat')render()});
})();
