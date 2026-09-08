/* ✦ Admission Hub AI — Agent Chat UI v2 (Phase 2: Premium AI UI)
 * মালিক-স্পেক: smooth animations, typing indicator, streaming, stop-generation,
 * message actions (♡ like / Copy / Regenerate / 🔊 Speak), follow-up chips,
 * markdown (+table), math-foundation, error/empty/loading state, header menu,
 * login-CTA, mobile responsive.
 * নিরাপত্তা: কোনো API-key এখানে নেই; voice শুধু same-origin /api/voice (X-AH-App)।
 */
(function () {
  'use strict';
  if (window.renderAiAgentPage) return;

  const V = 'agent-f2-ui-v2';
  const STORE = 'aiAgentChat:v1';
  const MAX_MSGS = 30;
  const MAX_HISTORY = 12;

  const lang = (() => { try { return localStorage.getItem('ahLang') === 'en' ? 'en' : 'bn'; } catch (_) { return 'bn'; } })();
  const T = lang === 'en' ? {
    title: 'Admission Hub AI', sub: 'Your AI study companion', ask: 'What do you want to do today?',
    explain: 'Explain', quiz: 'Make MCQ', study: 'Study', askq: 'Ask Question',
    ph: 'Ask anything…', send: 'Send', stop: 'Stop', copy: 'Copy', copied: 'Copied', regen: 'Regenerate',
    err: 'Something went wrong. Trying again…', retry: 'Try again', login: 'Please sign in to use AI chat', loginBtn: 'Sign in',
    soon: 'coming soon', offline: 'You are offline', attach: 'Attach', img: 'Image', analyze: 'Analyze performance', search: 'Search web',
    newChat: 'New chat', clearAll: 'Clear conversation', model: 'Model', menu: 'Menu', speak: 'Listen', speakErr: 'Voice not available right now',
    follow: ['Make it simpler', 'Give an example', 'Ask 3 more questions'], liked: 'Saved'
  } : {
    title: 'Admission Hub AI', sub: 'তোমার পড়াশোনার AI সঙ্গী', ask: 'আজ কী নিয়ে সাহায্য চাই?',
    explain: 'বুঝিয়ে বলো', quiz: 'MCQ বানাও', study: 'শেখো', askq: 'প্রশ্ন করো',
    ph: 'কিছু লিখুন…', send: 'পাঠান', stop: 'থামাও', copy: 'কপি', copied: 'কপি হয়েছে', regen: 'আবার তৈরি করো',
    err: 'একটু সমস্যা হয়েছে। আবার চেষ্টা করছি…', retry: 'আবার চেষ্টা করো', login: 'AI চ্যাট ব্যবহার করতে লগইন করুন', loginBtn: 'লগইন করুন',
    soon: 'শীঘ্রই আসছে', offline: 'ইন্টারনেট সংযোগ নেই', attach: 'সংযুক্তি', img: 'ছবি', analyze: 'পারফরম্যান্স বিশ্লেষণ', search: 'ওয়েব খোঁজো',
    newChat: 'নতুন চ্যাট', clearAll: 'কথোপকথন মুছে ফেলো', model: 'মডেল', menu: 'মেনু', speak: 'শুনুন', speakErr: 'ভয়েস এখন পাওয়া যাচ্ছে না',
    follow: ['আরও সহজ করে বলো', 'একটা উদাহরণ দাও', 'আরও ৩টা প্রশ্ন বানাও'], liked: 'সংরক্ষিত'
  };

  const style = document.createElement('style');
  style.id = 'ai-agent-style';
  style.textContent = `
    .ai-agent-root{min-height:100dvh;display:flex;flex-direction:column;background:linear-gradient(160deg,#f0faf6 0%,#e9f4ef 44%,#f6fbf8 100%);color:#152822;max-width:720px;margin:0 auto}
    .ai-agent-head{position:sticky;top:0;z-index:8;display:flex;align-items:center;gap:11px;padding:13px 16px 11px;background:rgba(250,255,252,.86);backdrop-filter:blur(18px);border-bottom:1px solid rgba(15,107,79,.1)}
    .ai-agent-logo{width:40px;height:40px;border-radius:14px;background:linear-gradient(140deg,#0f6b4f,#1d9a6f);display:grid;place-items:center;color:#fff;font-size:20px;box-shadow:0 9px 22px rgba(15,107,79,.24);flex:0 0 auto}
    .ai-agent-t{min-width:0}.ai-agent-t b{display:block;font-size:16.5px;letter-spacing:-.02em}.ai-agent-t span{display:block;font-size:11.5px;color:#5c7267;margin-top:1px}
    .ai-agent-live{margin-left:auto;display:flex;align-items:center;gap:6px;font-size:10.5px;font-weight:800;color:#0f6b4f;background:#e4f5ec;border:1px solid rgba(15,107,79,.14);padding:6px 10px;border-radius:999px}
    .ai-agent-live i{width:7px;height:7px;border-radius:50%;background:#1d9a6f;animation:aiAgentPulse 1.2s infinite}
    @keyframes aiAgentPulse{50%{opacity:.35;transform:scale(.75)}}
    .ai-agent-menu{width:36px;height:36px;border-radius:12px;border:1px solid rgba(15,107,79,.14);background:rgba(255,255,255,.8);color:#0f6b4f;font-size:17px;cursor:pointer;display:grid;place-items:center;flex:0 0 auto}
    .ai-agent-menupan{position:absolute;top:46px;right:12px;z-index:30;min-width:196px;padding:7px;background:#fff;border:1px solid #d6e9e0;border-radius:15px;box-shadow:0 18px 44px rgba(23,58,43,.18);animation:aiAgentUp .16s ease both}
    .ai-agent-menupan button{display:block;width:100%;text-align:left;padding:10px;border-radius:9px;background:transparent;border:0;color:#25453a;font:700 13px inherit;cursor:pointer}
    .ai-agent-menupan button:hover{background:#f0f8f4}
    .ai-agent-menupan .danger{color:#b23b48}
    .ai-agent-body{flex:1;overflow-y:auto;padding:18px 14px 8px;scroll-behavior:smooth}
    .ai-agent-welcome{text-align:center;padding:26px 6px 10px;animation:aiAgentUp .5s ease both}
    .ai-agent-welcome .wic{font-size:44px;margin-bottom:10px}
    .ai-agent-welcome h2{font-size:23px;margin:0 0 7px;letter-spacing:-.03em;color:#0e3d2e}
    .ai-agent-welcome p{font-size:13.5px;color:#5c7267;margin:0 0 18px;line-height:1.7}
    .ai-agent-cards{display:grid;grid-template-columns:1fr 1fr;gap:10px;max-width:420px;margin:0 auto}
    .ai-agent-card{border:1px solid rgba(15,107,79,.14);background:rgba(255,255,255,.85);border-radius:19px;padding:14px 12px;box-shadow:0 10px 26px rgba(23,58,43,.07);cursor:pointer;transition:transform .16s ease,box-shadow .16s ease;text-align:left}
    .ai-agent-card:active{transform:scale(.97)}
    .ai-agent-card .ic{font-size:21px;display:block;margin-bottom:6px}
    .ai-agent-card b{font-size:13.5px;display:block;color:#123e2f}
    .ai-agent-card span{font-size:11px;color:#6a8177;display:block;margin-top:2px}
    .ai-agent-msgs{display:flex;flex-direction:column;gap:12px;padding-bottom:14px}
    .ai-msg{max-width:92%;border-radius:20px;padding:12px 15px;line-height:1.72;font-size:14.5px;animation:aiAgentUp .28s ease both;position:relative}
    .ai-msg.user{align-self:flex-end;background:linear-gradient(140deg,#12805a,#0f6b4f);color:#fff;border-bottom-right-radius:7px;white-space:pre-wrap;word-break:break-word}
    .ai-msg.ai{align-self:flex-start;background:rgba(255,255,255,.92);border:1px solid rgba(15,107,79,.12);box-shadow:0 10px 24px rgba(23,58,43,.06);border-bottom-left-radius:7px;color:#1d2b24;width:100%}
    .ai-msg.error{background:#fff6f2;border-color:rgba(192,57,43,.18);color:#8a3d31}
    .ai-msg-meta{font-size:10px;font-weight:800;letter-spacing:.04em;color:#8fa9a0;margin-bottom:6px}
    .ai-msg .md h1,.ai-msg .md h2,.ai-msg .md h3{font-size:16.5px;margin:10px 0 6px;color:#0e3d2e;line-height:1.35}
    .ai-msg .md p{margin:7px 0}
    .ai-msg .md ul,.ai-msg .md ol{margin:7px 0;padding-left:20px}
    .ai-msg .md li{margin:3px 0}
    .ai-msg .md code{background:#eef5f1;border:1px solid rgba(15,107,79,.14);border-radius:6px;padding:1px 6px;font-size:12.5px;font-family:ui-monospace,Menlo,monospace}
    .ai-msg .md pre{background:#10281f;color:#d8f3e6;border-radius:13px;padding:12px 13px;overflow-x:auto;font-size:12.5px;margin:9px 0}
    .ai-msg .md pre code{background:none;border:0;color:inherit;padding:0}
    .ai-msg .md a{color:#0f6b4f;font-weight:700;text-decoration:underline}
    .ai-msg .md blockquote{border-left:3px solid rgba(15,107,79,.3);margin:8px 0;padding:3px 11px;color:#4c6259;background:#f2f9f5;border-radius:0 9px 9px 0}
    .ai-msg .md strong{color:#0e3d2e}
    .ai-msg .md table{width:100%;border-collapse:collapse;margin:9px 0;font-size:13px}
    .ai-msg .md th,.ai-msg .md td{border:1px solid rgba(15,107,79,.16);padding:7px 9px;text-align:left}
    .ai-msg .md th{background:#e9f5ef;color:#0e3d2e;font-weight:800}
    .ai-msg .md tr:nth-child(even) td{background:#f7fbf9}
    .ai-math{background:#f2f9f5;border:1px solid rgba(15,107,79,.14);border-radius:11px;padding:9px 12px;margin:9px 0;font-family:ui-monospace,Menlo,monospace;font-size:13.5px;color:#123e2f;white-space:pre-wrap}
    .ai-math-inline{font-family:ui-monospace,Menlo,monospace;font-size:13px;color:#0e3d2e;background:#eef5f1;border-radius:5px;padding:0 5px}
    .ai-cursor{display:inline-block;width:2px;height:1.05em;background:#1d9a6f;vertical-align:-.15em;margin-left:1px;animation:aiAgentBlink .8s steps(1) infinite}
    @keyframes aiAgentBlink{50%{opacity:0}}
    .ai-msg .typing{display:inline-flex;gap:4px;padding:5px 2px}
    .ai-msg .typing i{width:7px;height:7px;border-radius:50%;background:#1d9a6f;animation:aiAgentBounce 1s infinite}
    .ai-msg .typing i:nth-child(2){animation-delay:.16s}.ai-msg .typing i:nth-child(3){animation-delay:.32s}
    @keyframes aiAgentBounce{30%{transform:translateY(-5px)}60%{transform:translateY(0)}}
    @keyframes aiAgentUp{from{opacity:0;transform:translateY(9px)}to{opacity:1;transform:none}}
    .ai-msg-actions{display:flex;gap:5px;margin-top:8px;flex-wrap:wrap}
    .ai-msg-actions button{border:1px solid rgba(15,107,79,.14);background:#fff;color:#0f6b4f;border-radius:999px;padding:5px 10px;font:700 11px inherit;cursor:pointer;display:inline-flex;align-items:center;gap:4px}
    .ai-msg-actions button:active{transform:scale(.95)}
    .ai-msg-actions button.liked{background:#e4f5ec;color:#0b5c42}
    .ai-msg-actions button.speaking{background:#e4f5ec;color:#0b5c42}
    .ai-followup{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}
    .ai-followup button{border:1px dashed rgba(15,107,79,.28);background:#f6fbf8;color:#0f6b4f;border-radius:999px;padding:6px 11px;font:700 11px inherit;cursor:pointer}
    .ai-followup button:active{transform:scale(.96)}
    .ai-agent-foot{position:sticky;bottom:0;padding:10px 12px calc(12px + env(safe-area-inset-bottom));background:linear-gradient(transparent,rgba(244,251,247,.9) 34%);z-index:8}
    .ai-composer{display:flex;align-items:flex-end;gap:8px;background:rgba(255,255,255,.95);border:1px solid rgba(15,107,79,.16);border-radius:24px;padding:8px 9px;box-shadow:0 14px 34px rgba(23,58,43,.12)}
    .ai-plus{width:40px;height:40px;flex:0 0 auto;border-radius:14px;border:1px solid rgba(15,107,79,.16);background:#f2faf6;color:#0f6b4f;font-size:21px;cursor:pointer;display:grid;place-items:center;transition:transform .16s}
    .ai-plus:active{transform:scale(.92)}
    .ai-composer textarea{flex:1;min-width:0;border:0;background:transparent;resize:none;font:inherit;font-size:15.5px;line-height:1.5;max-height:128px;padding:9px 4px;outline:0;color:#152822}
    .ai-send{width:42px;height:42px;flex:0 0 auto;border-radius:15px;border:0;background:linear-gradient(140deg,#12805a,#0f6b4f);color:#fff;font-size:17px;cursor:pointer;display:grid;place-items:center;box-shadow:0 8px 18px rgba(15,107,79,.25);transition:transform .15s,background .2s}
    .ai-send:active{transform:scale(.93)}.ai-send:disabled{opacity:.45;cursor:not-allowed}
    .ai-send.stop{background:linear-gradient(140deg,#c0392b,#a93226);box-shadow:0 8px 18px rgba(192,57,43,.3)}
    .ai-attach-panel{position:absolute;bottom:calc(100% + 8px);left:0;right:0;background:#fff;border:1px solid rgba(15,107,79,.14);border-radius:17px;box-shadow:0 18px 44px rgba(23,58,43,.16);padding:8px;display:flex;flex-direction:column;gap:2px;z-index:20;animation:aiAgentUp .18s ease both}
    .ai-attach-panel button{display:flex;align-items:center;gap:10px;width:100%;border:0;background:transparent;border-radius:11px;padding:10px 11px;font:700 13px inherit;color:#25453a;cursor:pointer;text-align:left}
    .ai-attach-panel button:hover{background:#f0f8f4}
    .ai-attach-panel .soon{margin-left:auto;font-size:9.5px;font-weight:800;color:#94a8a0;background:#f1f6f3;border-radius:999px;padding:3px 8px}
    @media(max-width:430px){.ai-agent-welcome .wic{font-size:38px}.ai-agent-cards{gap:8px}.ai-msg{font-size:14px}}
    @media(prefers-reduced-motion:reduce){.ai-msg,.ai-agent-welcome,.ai-attach-panel,.ai-agent-menupan{animation:none}.ai-agent-live i,.ai-msg .typing i,.ai-cursor{animation:none}}`;
  document.head.appendChild(style);

  /* ── state ── */
  let msgs = [];
  let activeReq = null;
  let streamingEl = null;
  let stoppedEarly = false;
  let speakBusy = false;
  let menuOpen = false;
  try { const s = JSON.parse(localStorage.getItem(STORE) || '[]'); if (Array.isArray(s)) msgs = s.slice(-MAX_MSGS); } catch (_) { msgs = []; }

  const esc = (s) => { const d = document.createElement('div'); d.textContent = String(s ?? ''); return d.innerHTML; };
  const token = () => { try { return localStorage.getItem('ahPubToken') || sessionStorage.getItem('ahPubToken') || ''; } catch (_) { return ''; } };
  const save = () => { try { localStorage.setItem(STORE, JSON.stringify(msgs.slice(-MAX_MSGS))); } catch (_) {} };
  const fmtTime = (ts) => { try { return new Date(ts).toLocaleTimeString(lang === 'bn' ? 'bn-BD' : 'en-US', { hour: '2-digit', minute: '2-digit' }); } catch (_) { return ''; } };

  /* ── markdown-lite v2 (XSS-safe: escape-পরে টোকেন-রেন্ডার) + table + math-foundation ── */
  function md(html) {
    const codeBlocks = [];
    html = html.replace(/```([\s\S]*?)```/g, (m, c) => { codeBlocks.push(c); return '\u0000CB' + (codeBlocks.length - 1) + '\u0000'; });
    /* table: পরপর | ... | লাইন */
    html = html.replace(/((?:^\|.*\|\s*$\n?)+)/gm, (block) => {
      const rows = block.trim().split('\n').map((r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim()));
      if (rows.length < 2) return block;
      const head = rows[0]; let out = '<table><thead><tr>' + head.map((c) => '<th>' + c + '</th>').join('') + '</tr></thead><tbody>';
      for (const r of rows.slice(1)) {
        if (r.length === 1 && /^:?-{2,}:?$/.test(r[0])) continue; /* separator */
        out += '<tr>' + r.map((c) => '<td>' + c + '</td>').join('') + '</tr>';
      }
      return out + '</tbody></table>';
    });
    let s = html
      .replace(/^### (.*)$/gm, '<h3>$1</h3>').replace(/^## (.*)$/gm, '<h2>$1</h2>').replace(/^# (.*)$/gm, '<h1>$1</h1>')
      .replace(/^&gt; (.*)$/gm, '<blockquote>$1</blockquote>')
      .replace(/^\s*[-*] (.*)$/gm, '<li>$1</li>').replace(/^\s*\d+\. (.*)$/gm, '<li>$1</li>')
      .replace(/(?:<li>[\s\S]*?<\/li>)(?=(?:<li>|$))/g, (m) => '<ul>' + m + '</ul>')
      .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*\n]+)\*/g, '<em>$1</em>')
      .replace(/`([^`\n]+)`/g, '<code>$1</code>')
      /* math foundation: $$block$$ → .ai-math, $inline$ → .ai-math-inline */
      .replace(/\$\$([\s\S]+?)\$\$/g, '<div class="ai-math">$1</div>')
      .replace(/\$([^$\n]+)\$/g, '<span class="ai-math-inline">$1</span>')
      .replace(/(^|[\s(])((?:https?:\/\/)[^\s<)]+)/g, '$1<a href="$2" target="_blank" rel="noopener noreferrer">$2</a>')
      .replace(/\n{2,}/g, '</p><p>').replace(/\n/g, '<br>');
    s = '<div class="md">' + (s.includes('<p>') ? s : '<p>' + s + '</p>') + '</div>';
    return s.replace(/\u0000CB(\d+)\u0000/g, (m, i) => '<pre><code>' + esc(codeBlocks[+i]).replace(/\n$/, '') + '</code></pre>');
  }

  /* ── shell ── */
  function shell() {
    return `<div class="ai-agent-root"><div class="ai-agent-head">
      <div class="ai-agent-logo">✦</div>
      <div class="ai-agent-t"><b>${esc(T.title)}</b><span>${esc(T.sub)}</span></div>
      <div class="ai-agent-live"><i></i>AI Agent</div>
      <button class="ai-agent-menu" id="aiMenuBtn" type="button" aria-label="${esc(T.menu)}">⋯</button></div>
      <div class="ai-agent-body" id="aiAgentBody"></div>
      <div class="ai-agent-foot"><div style="position:relative" id="aiAttachWrap"></div>
        <div class="ai-composer">
          <button class="ai-plus" id="aiPlusBtn" type="button" aria-label="${esc(T.attach)}">＋</button>
          <textarea id="aiInput" rows="1" placeholder="${esc(T.ph)}" aria-label="Message AI"></textarea>
          <button class="ai-send" id="aiSendBtn" type="button" aria-label="${esc(T.send)}">↑</button>
        </div></div></div>`;
  }
  function menuPanel() {
    const p = document.createElement('div');
    p.className = 'ai-agent-menupan';
    p.innerHTML = `<button data-act="new">🆕 ${esc(T.newChat)}</button><button data-act="clear" class="danger">🗑 ${esc(T.clearAll)}</button>`;
    p.querySelector('[data-act="new"]').addEventListener('click', () => { closeMenu(); newChat(false); });
    p.querySelector('[data-act="clear"]').addEventListener('click', () => { closeMenu(); newChat(true); });
    return p;
  }
  function attachPanel() {
    const p = document.createElement('div');
    p.className = 'ai-attach-panel';
    p.innerHTML = `
      <button class="aiap-img">📷 ${esc(T.img)} <span class="soon">${esc(T.soon)}</span></button>
      <button data-q="${lang === 'en' ? 'Make 10 MCQs on my current topic' : 'আমার বর্তমান টপিক থেকে ১০টা MCQ বানাও'}">📝 ${esc(T.quiz)}</button>
      <button data-q="${lang === 'en' ? 'Analyze my performance' : 'আমার পারফরম্যান্স বিশ্লেষণ করো'}">📊 ${esc(T.analyze)}</button>
      <button data-q="${lang === 'en' ? 'Search for latest admission news' : 'সর্বশেষ ভর্তি-নিউজ খোঁজো'}">🔎 ${esc(T.search)}</button>`;
    p.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      if (b.classList.contains('aiap-img')) { window.toast ? window.toast(T.soon) : 0; return; }
      const q = b.getAttribute('data-q') || '';
      p.remove(); closeAttach();
      if (q) { input.value = q; input.focus(); send(); }
    }));
    return p;
  }
  let attachOpen = false;
  function closeAttach() { attachOpen = false; const w = document.getElementById('aiAttachWrap'); if (w) w.innerHTML = ''; }
  function closeMenu() { menuOpen = false; const hm = document.querySelector('.ai-agent-menupan'); if (hm) hm.remove(); }
  function body() { return document.getElementById('aiAgentBody'); }
  const input = { set value(v) { const i = document.getElementById('aiInput'); if (i) i.value = v; }, get value() { const i = document.getElementById('aiInput'); return i ? i.value : ''; }, focus() { const i = document.getElementById('aiInput'); if (i) i.focus(); } };

  function scrollBottom(force) {
    const b = body(); if (!b) return;
    const near = b.scrollHeight - b.scrollTop - b.clientHeight < 140;
    if (force || near) b.scrollTop = b.scrollHeight;
  }

  /* ── msgs render ── */
  function renderMsgs() {
    const b = body(); if (!b) return;
    b.innerHTML = msgs.map(msgHtml).join('');
    scrollBottom();
  }
  function msgHtml(m) {
    const meta = m.ts ? `<div class="ai-msg-meta">${esc(fmtTime(m.ts))}${m.model ? ' · ' + esc(m.model) : ''}</div>` : '';
    if (m.role === 'user') return `<div class="ai-msg user">${esc(m.text)}<div class="ai-msg-meta" style="color:rgba(255,255,255,.75)">${meta ? '' : esc(fmtTime(m.ts))}</div></div>`;
    if (m.error) {
      const loginCta = m.login ? `<div class="ai-msg-actions"><button onclick="window.__AiAgentLogin&&__AiAgentLogin()">→ ${esc(T.loginBtn)}</button></div>` : '';
      return `<div class="ai-msg ai error">${meta}<div style="font-weight:800;margin-bottom:4px">⚠️ ${esc(T.err)}</div><div class="muted" style="font-size:12px">${esc(m.text || '')}</div><div class="ai-msg-actions"><button onclick="window.__AiAgentRetry&&__AiAgentRetry()">⟳ ${esc(T.retry)}</button>${loginCta}</div></div>`;
    }
    const follow = m.follow === false ? '' : `<div class="ai-followup">${T.follow.map((f) => `<button data-q="${esc(f)}">${esc(f)}</button>`).join('')}</div>`;
    return `<div class="ai-msg ai">${meta}${md(esc(m.text))}<div class="ai-msg-actions">
      <button data-like="${esc(m.text.slice(0, 220))}" class="${m.liked ? 'liked' : ''}" onclick="window.__AiAgentLike(this)">${m.liked ? '♥ ' + esc(T.liked) : '♡'}</button>
      <button onclick="window.__AiAgentCopy(this)" data-t="${esc(m.text)}">⧉ ${esc(T.copy)}</button>
      ${m.regen ? `<button onclick="window.__AiAgentRegen&&__AiAgentRegen()">⟳ ${esc(T.regen)}</button>` : ''}
      <button data-speak="${esc(m.text.slice(0, 300))}" onclick="window.__AiAgentSpeak(this)">🔊 ${esc(T.speak)}</button>
    </div>${follow}</div>`;
  }
  function typingHtml() { return `<div class="ai-msg ai" id="aiTyping"><span class="typing"><i></i><i></i><i></i></span></div>`; }

  /* ── API ── */
  function history() {
    const hist = [];
    for (const m of msgs) if (m.role === 'user' || (m.role === 'ai' && !m.error)) hist.push({ role: m.role === 'ai' ? 'assistant' : 'user', content: String(m.text || '').slice(0, 4000) });
    return hist.slice(-MAX_HISTORY);
  }
  async function callStream(userText) {
    const t = token();
    if (!t) return { code: 'auth' };
    const payload = {
      messages: history().concat([{ role: 'user', content: userText }]),
      context: { stats: (typeof window.__ahAgentStats === 'function') ? window.__ahAgentStats() : null, examMode: null }
    };
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
    let buf = '';
    let full = '';
    let meta = null;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const parts = buf.split('\n\n');
      buf = parts.pop() || '';
      for (const part of parts) {
        for (const line of part.split('\n')) {
          const s = line.trim();
          if (!s.startsWith('data:')) { if (s.startsWith('event:') && s.includes('error')) meta = { event: 'error' }; continue; }
          let j = null; try { j = JSON.parse(s.slice(5).trim()); } catch (_) { continue; }
          if (j.text) { full += j.text; appendStream(j.text); }
          else if (j.error) meta = { event: 'error', message: j.message, retryable: j.retryable };
          else if (j.model || j.provider) meta = { event: 'done', model: j.model, provider: j.provider, intent: j.intent };
        }
      }
    }
    if (buf) {
      for (const line of buf.split('\n')) {
        const s = line.trim();
        if (!s.startsWith('data:')) continue;
        try { const j = JSON.parse(s.slice(5).trim()); if (j.text) { full += j.text; } if (j.error) meta = { event: 'error', message: j.message, retryable: j.retryable }; } catch (_) {}
      }
    }
    if (stoppedEarly && !full) return { code: 'stopped' };
    return { code: 'ok', text: full, meta };
  }
  function appendStream(chunk) {
    if (!streamingEl) {
      const b = body(); if (!b) return;
      streamingEl = document.createElement('div');
      streamingEl.className = 'ai-msg ai';
      streamingEl.innerHTML = '<div class="md"><p><span class="ai-cursor"></span></p></div>';
      b.appendChild(streamingEl);
      scrollBottom(true);
    }
    const p = streamingEl.querySelector('.md p');
    if (p) { const cur = p.querySelector('.ai-cursor'); if (cur) cur.remove(); p.textContent += chunk; p.appendChild(document.createElement('span')).className = 'ai-cursor'; }
    scrollBottom();
  }

  /* ── actions ── */
  function setSendBtn(streaming) {
    const b = document.getElementById('aiSendBtn'); if (!b) return;
    b.classList.toggle('stop', !!streaming);
    b.innerHTML = streaming ? '■' : '↑';
    b.setAttribute('aria-label', streaming ? T.stop : T.send);
  }
  async function send(prefill) {
    const q = String(prefill ?? input.value).trim();
    if (!q || activeReq) return;
    input.value = ''; autoGrow();
    msgs.push({ role: 'user', text: q, ts: Date.now() });
    renderMsgs();
    stoppedEarly = false;
    streamingEl = null;
    appendToBodyTyping();
    setSendBtn(true);
    const res = await callStream(q).catch(() => ({ code: 'net' }));
    removeTyping();
    streamingEl = null;
    setSendBtn(false);
    activeReq = null;
    if (res.code === 'ok' && res.text && res.text.trim()) {
      msgs.push({ role: 'ai', text: res.text.trim(), ts: Date.now(), regen: true, model: res.meta && res.meta.model, provider: res.meta && res.meta.provider });
      save(); renderMsgs();
    } else if (res.code === 'auth') {
      msgs.push({ role: 'ai', error: true, login: true, text: T.login, ts: Date.now() });
      save(); renderMsgs();
    } else if (res.code === 'stopped') {
      save(); renderMsgs();
    } else {
      const detail = res.code === 'net' ? T.offline : (res.code === 'http' ? `HTTP ${res.status}` : String((res.meta && res.meta.message) || ''));
      msgs.push({ role: 'ai', error: true, text: detail, ts: Date.now() });
      save(); renderMsgs();
    }
  }
  function appendToBodyTyping() { const b = body(); if (b) { const t = document.createElement('template'); t.innerHTML = typingHtml(); b.appendChild(t.content.firstChild); scrollBottom(true); } }
  function removeTyping() { const t = document.getElementById('aiTyping'); if (t) t.remove(); }
  function retry() {
    msgs = msgs.filter((m) => !(m.error));
    const last = [...msgs].reverse().find((m) => m.role === 'user');
    if (last) send(last.text); else renderMsgs();
  }
  function regen() {
    msgs = msgs.filter((m) => !(m.error));
    const last = [...msgs].reverse().find((m) => m.role === 'user');
    if (last) send(last.text);
  }
  function stop() {
    stoppedEarly = true;
    try { activeReq && activeReq.abort(); } catch (_) {}
    removeTyping();
    if (streamingEl) { const txt = streamingEl.textContent.trim(); if (txt) msgs.push({ role: 'ai', text: txt, ts: Date.now(), regen: true }); }
    streamingEl = null;
    activeReq = null;
    setSendBtn(false);
    save(); renderMsgs();
  }
  function newChat(confirmIt) {
    const doIt = () => { msgs = []; try { localStorage.removeItem(STORE); } catch (_) {} render(); };
    if (confirmIt && msgs.length) { if (window.confirm) { if (!confirm(T.clearAll + '?')) return; } doIt(); } else doIt();
  }
  function autoGrow() { const i = document.getElementById('aiInput'); if (i) { i.style.height = 'auto'; i.style.height = Math.min(i.scrollHeight, 128) + 'px'; } }
  function copyBtn(el) {
    const t = el.getAttribute('data-t') || '';
    (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => { const o = el.textContent; el.textContent = '✓ ' + T.copied; setTimeout(() => { el.textContent = o; }, 1400); }).catch(() => { window.toast ? window.toast('Copy unavailable') : 0; });
  }
  function likeBtn(el) {
    const key = String(el.getAttribute('data-like') || '');
    const idx = msgs.findIndex((m) => m.role === 'ai' && !m.error && String(m.text || '').slice(0, 220) === key);
    if (idx >= 0) { msgs[idx].liked = !msgs[idx].liked; save(); renderMsgs(); }
  }
  function loginCta() { if (window.AHAuth && typeof window.AHAuth.openLogin === 'function') window.AHAuth.openLogin(); else window.toast ? window.toast(T.login) : 0; }
  async function speakBtn(el) {
    const text = String(el.getAttribute('data-speak') || '').trim();
    if (!text || speakBusy) return;
    if (el) { el.classList.add('speaking'); el.textContent = '◌'; }
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
    } catch (_) { window.toast ? window.toast(T.speakErr) : 0; }
    speakBusy = false;
    if (el) { el.classList.remove('speaking'); el.textContent = '🔊 ' + T.speak; }
  }

  window.__AiAgentCopy = copyBtn;
  window.__AiAgentLike = likeBtn;
  window.__AiAgentSpeak = speakBtn;
  window.__AiAgentRetry = retry;
  window.__AiAgentRegen = regen;
  window.__AiAgentStop = stop;
  window.__AiAgentLogin = loginCta;

  /* ── page render ── */
  function render() {
    const root = document.querySelector('#app') || document.body;
    root.innerHTML = shell();
    const inp = document.getElementById('aiInput');
    const sendBtn = document.getElementById('aiSendBtn');
    const plusBtn = document.getElementById('aiPlusBtn');
    const menuBtn = document.getElementById('aiMenuBtn');
    const wrap = document.getElementById('aiAttachWrap');
    if (inp) {
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
      inp.addEventListener('input', () => { autoGrow(); if (activeReq) { setSendBtn(true); } });
      setTimeout(() => inp.focus(), 60);
    }
    if (sendBtn) sendBtn.addEventListener('click', () => { activeReq ? stop() : send(); });
    if (plusBtn) plusBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (attachOpen) closeAttach(); else { attachOpen = true; wrap.innerHTML = ''; wrap.appendChild(attachPanel()); }
    });
    if (menuBtn) menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (menuOpen) closeMenu(); else { menuOpen = true; closeAttach(); menuBtn.parentElement.style.position = 'relative'; menuBtn.parentElement.appendChild(menuPanel()); }
    });
    setSendBtn(!!activeReq);
    if (!msgs.length) {
      const b = body();
      if (b) {
        b.innerHTML = `<div class="ai-agent-welcome"><div class="wic">✦</div><h2>${esc(T.ask)}</h2><p>${lang === 'en' ? 'Explain a concept, practice MCQs, analyze your prep — just ask.' : 'যেকোনো কনসেপ্ট বুঝুন, MCQ প্র্যাকটিস করুন, প্রস্তুতি বিশ্লেষণ করুন — শুধু জিজ্ঞেস করুন।'}</p><div class="ai-agent-cards">
          <button class="ai-agent-card" data-q="${lang === 'en' ? 'Explain Newton’s first law simply' : 'নিউটনের প্রথম সূত্রটা সহজ করে বুঝাও'}"><span class="ic">🧠</span><b>${esc(T.explain)}</b><span>${lang === 'en' ? 'Concept made easy' : 'কনসেপ্ট সহজে'}</span></button>
          <button class="ai-agent-card" data-q="${lang === 'en' ? 'Make 10 MCQs on Biology cell' : 'জীববিজ্ঞান-কোষ থেকে ১০টা MCQ বানাও'}"><span class="ic">📝</span><b>${esc(T.quiz)}</b><span>${lang === 'en' ? 'Practice questions' : 'অনুশীলন প্রশ্ন'}</span></button>
          <button class="ai-agent-card" data-q="${lang === 'en' ? 'Help me study for admission today' : 'আজকের জন্য আমার পড়া সাজিয়ে দাও'}"><span class="ic">📚</span><b>${esc(T.study)}</b><span>${lang === 'en' ? 'Plan & focus' : 'পরিকল্পনা ও ফোকাস'}</span></button>
          <button class="ai-agent-card" data-q="${lang === 'en' ? 'What is the admission process for Dhaka University?' : 'ঢাকা বিশ্ববিদ্যালয়ে ভর্তি প্রক্রিয়া কী?'}"><span class="ic">💬</span><b>${esc(T.askq)}</b><span>${lang === 'en' ? 'Any question' : 'যেকোনো প্রশ্ন'}</span></button>
        </div></div>`;
        b.querySelectorAll('.ai-agent-card').forEach((c) => c.addEventListener('click', () => send(c.getAttribute('data-q'))));
      }
    } else renderMsgs();
  }

  window.renderAiAgentPage = render;
  window.__AiAgentTest = { get msgs() { return msgs.slice(); }, send, retry, regen, stop, newChat, T };
  document.addEventListener('click', (e) => {
    if (attachOpen && !e.target.closest('.ai-attach-panel') && !e.target.closest('.ai-plus')) closeAttach();
    if (menuOpen && !e.target.closest('.ai-agent-menupan') && !e.target.closest('.ai-agent-menu')) closeMenu();
  });
})();
