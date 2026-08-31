/* v120 AI Explain — ভুল-প্রশ্নের শিক্ষক: এক ট্যাপে ব্যাখ্যা, popup নয়, প্রশ্ন-কার্ডের নিচেই expand; একবার জেনারেট → সব-জায়গায় reuse (ah-explanation-cache)।
   Provider chain: Gemini (studyAiCfg key, ঐচ্ছিক) → 🌐 Browser-এজেন্ট (worker) — key ছাড়াও চলে। প্রম্পট user-কে কখনো দেখানো হয় না। */
(function installAiExplain() {
  if (window.AiExplain) return;
  window.__aiExplainInstalled = true;

  const WORKER = 'https://admission-gk.rashelzayan213.workers.dev';
  const APP_HEADER = { 'X-AH-App': 'admission-hub' };
  const EXPL_KEY = 'ah-explanation-cache'; // বিদ্যমান স্টোর (mistake-notebook একই জিনিস পড়ে)
  const PV = 1; // promptVersion
  const inflight = {};

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cid = s => String(s ?? '').replace(/[^a-zA-Z0-9_-]/g, '');
  const store = () => { try { return JSON.parse(localStorage.getItem(EXPL_KEY) || '{}') || {}; } catch (_) { return {}; } };
  const saveStore = st => { try { const ks = Object.keys(st); if (ks.length > 900) ks.sort((a, b) => (st[a].generatedAt || 0) - (st[b].generatedAt || 0)).slice(0, ks.length - 900).forEach(k => delete st[k]); localStorage.setItem(EXPL_KEY, JSON.stringify(st)); } catch (_) {} };
  const savedExp = qid => { const e = store()[String(qid)]; if (!e) return ''; if (typeof e.explanation === 'string' && e.explanation.trim()) return e.explanation.trim(); return [e.whyCorrect, e.whyWrong, e.easy, e.memory, e.trap, e.practice].filter(x => typeof x === 'string' && x.trim()).join(' '); };
  const gemCfg = () => { try { const c = JSON.parse(localStorage.getItem('studyAiCfg') || '{}'); const k = c.keys && c.keys.gemini; return { keys: (Array.isArray(k) ? k : (k ? [k] : [])).map(x => String(x || '').trim()).filter(Boolean), model: c.model || 'gemini-3.6-flash' }; } catch (_) { return { keys: [], model: 'gemini-3.6-flash' }; } };
  const md = t => (window.StudyAiTool && typeof window.StudyAiTool.renderMd === 'function') ? window.StudyAiTool.renderMd(t) : esc(t).replace(/\n/g, '<br>');

  function buildPrompt(q, c) {
    const qt = typeof q === 'string' ? q : (q && (q.question ?? q.text)) || '';
    const letter = i => ['ক', 'খ', 'গ', 'ঘ', 'ঙ'][i] || String(i + 1);
    const opts = (c.options || []).map((o, i) => `${letter(i)}) ${o}`).join('\n');
    const stud = c.student != null && c.options ? `${letter(c.student)}) ${c.options[c.student] ?? ''}${c.wrong ? ' (ভুল)' : ' (সঠিক)'}` : 'নির্বাচন করেনি';
    return `You are an expert university admission teacher for Bangladeshi students. Analyze this MCQ.

Question: ${qt}
${opts ? `Options:\n${opts}\n` : ''}
Correct Answer: ${c.correctText || ''}
Student's Answer: ${stud}
${c.subject ? `Subject: ${c.subject}\n` : ''}${c.topic ? `Topic: ${c.topic}\n` : ''}
Explain to the student in clear simple Bengali (তুমি-ফর্ম). Requirements:
- 5-10 short lines total, no giant essay.
- If the student's answer is wrong: FIRST explain gently why that choice is wrong (the trap/misconception).
- Then explain the core rule/concept, and why the correct answer is correct.
- End with one memorable trick (📌 মনে রাখবে) when natural.
- Use at most one or two light emojis. No English headings. No repetition of the full question.
- Markdown lightly: bold for key terms only.`;
  }

  async function callGemini(prompt) {
    const { keys, model } = gemCfg();
    if (!keys.length) throw new Error('no-key');
    const models = [...new Set([model, 'gemini-3.1-flash-lite', 'gemini-3-flash-preview'])];
    let last = 'gem-http';
    for (const k of keys) {
      for (const m of models) {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': k }, body: JSON.stringify({ system_instruction: { parts: [{ text: 'তুমি বাংলাদেশি ভর্তি-পরীক্ষার অভিজ্ঞ শিক্ষক — সংক্ষিপ্ত, স্পষ্ট, বাংলায় শেখাও।' }] }, contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.4, maxOutputTokens: 900 } }) });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) { last = 'gem-' + res.status; continue; }
        const text = String((d.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('')).trim();
        if (!text) { last = 'gem-empty'; continue; }
        return text;
      }
    }
    throw new Error(last);
  }

  async function callAgent(prompt) {
    const res = await fetch(WORKER + '/api/ask', { method: 'POST', headers: { ...APP_HEADER, 'Content-Type': 'application/json' }, body: JSON.stringify({ question: prompt, context: '', source: 'auto' }) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok || !d.id) throw new Error('agent-busy');
    const started = Date.now();
    let first = true;
    while (Date.now() - started < 240000) {
      await new Promise(r => setTimeout(r, first ? 1200 : 6000)); first = false; // প্রথম প্রোব দ্রুত, পরে ৬s
      const st = await fetch(WORKER + '/api/ask/' + d.id, { headers: APP_HEADER }).then(r => r.json()).catch(() => ({}));
      if (st.status === 'finished') return String(st.answer || '').trim();
      if (st.status === 'failed') throw new Error('agent-fail');
    }
    throw new Error('agent-slow');
  }

  async function generate(qid, q, c) {
    if (inflight[qid]) return inflight[qid];
    const prompt = buildPrompt(q, c);
    const p = (async () => {
      let text = '', via = 'gemini', model = gemCfg().model;
      try {
        if (gemCfg().keys.length) text = await callGemini(prompt);
        else { text = await callAgent(prompt); via = 'agent'; model = 'browser-agent'; }
      } catch (e) {
        const m = String(e && e.message || e);
        if (/^gem-/.test(m)) { // Gemini ব্যর্থ → এজেন্ট ফলব্যাক (কখনো raw error নয়)
          text = await callAgent(prompt); via = 'agent'; model = 'browser-agent';
        } else throw e;
      }
      const st = store();
      st[String(qid)] = Object.assign({}, st[String(qid)], { explanation: text, generatedAt: Date.now(), provider: via, model, promptVersion: PV });
      saveStore(st);
      return text;
    })();
    inflight[qid] = p;
    p.catch(() => { try { delete inflight[qid]; } catch (_) {} }); // ব্যর্থ হলে Retry আবার চলতে পারে
    return p;
  }

  function panelHTML(qid, state, text) {
    const inner = state === 'loading'
      ? `<div class="aiex-loading"><span>✨</span> AI ব্যাখ্যা তৈরি হচ্ছে…<div class="aiex-sub">তোমার উত্তরের ভুলের কারণ বিশ্লেষণ করা হচ্ছে…</div></div>`
      : state === 'error'
        ? `<div class="aiex-error">AI ব্যাখ্যা তৈরি করা যায়নি 🙈<button class="aiex-retry" onclick="AiExplain.retry('${cid(qid)}')">↻ আবার চেষ্টা করুন</button></div>`
        : `<div class="aiex-body">${md(text || '')}</div>
           <div class="aiex-foot"><button class="aiex-mini" onclick="AiExplain.toNote('${cid(qid)}')">📝 নোট করুন</button><button class="aiex-mini" onclick="AiExplain.collapse('${cid(qid)}')">⌃ ব্যাখ্যা বন্ধ করুন</button></div>`;
    const savedTag = state === 'done' && savedExp(qid) ? '' : '';
    return `<div class="aiex-panel" id="aiex-p-${cid(qid)}"><div class="aiex-head"><span>✨ AI Explanation</span>${state === 'done' ? '<small class="aiex-saved">✓ সেভ হয়েছে — পরেরবার সাথে সাথে</small>' : ''}</div>${inner}</div>`;
  }

  const ctxStore = {};
  function ensureCtx(qid, q, c) { ctxStore[qid] = Object.assign({ q }, c || {}); return ctxStore[qid]; }

  function mount(qid, html) {
    const wrap = document.getElementById('aiex-w-' + cid(qid));
    if (!wrap) return null;
    wrap.innerHTML = html;
    return wrap;
  }

  function toggle(qid, btnEl) {
    qid = String(qid);
    const existing = document.getElementById('aiex-p-' + cid(qid));
    if (existing) { existing.remove(); return; } // collapse (ব্যাখ্যা বন্ধ)
    const ctx = ctxStore[qid] || ensureCtx(qid, btnEl && btnEl.dataset ? {} : {});
    const saved = savedExp(qid);
    mount(qid, panelHTML(qid, saved ? 'done' : 'loading', saved));
    if (saved) return; // দ্বিতীয়বার API নয় — সাথে সাথে
    generate(qid, ctx.q, ctx).then(text => mount(qid, panelHTML(qid, 'done', text))).catch(() => mount(qid, panelHTML(qid, 'error', '')));
  }
  function open(qid, q, c) { ensureCtx(qid, q, c); toggle(qid, null); }
  // 🤖 অটো-নোট: রেজাল্টের ভুল-প্রশ্নগুলোর ব্যাখ্যা নিজে থেকেই তৈরি+সেভ (এক-প্রশ্ন=এক-রিকোয়েস্ট, ক্যাশ-রিইউজ)
  async function autoExplain(list) {
    const items = (Array.isArray(list) ? list : []).slice(0, 12);
    for (const it of items) {
      try {
        const qid = String(it.qid || '');
        if (!qid || savedExp(qid) || _inflight[qid]) continue;
        await generate(qid, it.ctx && it.ctx.q, it.ctx || {});
        await new Promise(r => setTimeout(r, 700));
      } catch (_) {}
    }
  }

  function retry(qid) { const ctx = ctxStore[qid] || {}; mount(qid, panelHTML(qid, 'loading', '')); generate(qid, ctx.q, ctx).then(text => mount(qid, panelHTML(qid, 'done', text))).catch(() => mount(qid, panelHTML(qid, 'error', ''))); }
  function collapse(qid) { const el = document.getElementById('aiex-p-' + cid(qid)); if (el) el.remove(); }
  function toNote(qid) {
    const text = savedExp(qid);
    const mem = prompt('এই ব্যাখ্যা থেকে তোমার মনে-রাখার নোট (ছোট করে লেখো):', '');
    if (mem && mem.trim()) {
      const st = store();
      st[String(qid)] = Object.assign({}, st[String(qid)], { memory: mem.trim().slice(0, 300) });
      saveStore(st);
      if (window.toast) window.toast('📝 নোট সেভ হয়েছে — Mistake Notebook-এও দেখা যাবে');
    }
  }

  // কমপ্যাক্ট বাটন — প্রতিটি সারফেস নিজের কার্ডে বসায়
  function btn(qid, c) {
    ensureCtx(qid, c && c.q, c);
    const urge = c && c.wrong ? ' urge' : '';
    return `<span class="aiex-wrap" id="aiex-w-${cid(qid)}"><button type="button" class="aiex-btn${urge}" onclick="AiExplain.toggle('${esc(String(qid))}', this)"><span>✨</span> AI Explain দেখুন</button></span>`;
  }

  function styleOnce() {
    if (document.getElementById('aiexStyle')) return;
    const el = document.createElement('style');
    el.id = 'aiexStyle';
    el.textContent = `
.aiex-wrap{display:block;margin-top:10px}
.aiex-btn{display:inline-flex;align-items:center;gap:6px;background:#fff;border:1.5px solid var(--emerald,#0f6b4f);color:var(--emerald-d,#0b5a42);border-radius:999px;padding:7px 14px;font-size:12.5px;font-weight:800;cursor:pointer;box-shadow:0 2px 8px rgba(15,107,79,.10)}
.aiex-btn.urge{background:var(--emerald,#0f6b4f);color:#fff}
.aiex-btn:active{transform:scale(.97)}
.aiex-panel{margin:6px -6px 2px;background:#fbfefc;border:1px solid #d9e8df;border-left:4px solid var(--emerald,#0f6b4f);border-radius:14px;padding:12px 12px;height:auto;animation:aiexIn .25s ease}
@keyframes aiexIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.aiex-head{display:flex;justify-content:space-between;align-items:center;font-weight:800;font-size:13.5px;color:var(--emerald-d,#0b5a42);margin-bottom:6px}
.aiex-saved{font-size:10px;color:#5f7a6d;font-weight:600}
.aiex-body{font-size:15.5px;line-height:1.65;color:#22332b;word-break:break-word;overflow-wrap:anywhere}
.aiex-body .sai-p{margin:0 0 7px}
.aiex-loading{font-size:14.5px;font-weight:700;color:var(--emerald-d,#0b5a42)}
.aiex-sub{font-size:12px;color:#7d8f86;font-weight:500;margin-top:4px;animation:aiexPulse 1.4s ease infinite}
@keyframes aiexPulse{50%{opacity:.45}}
.aiex-error{font-size:13.5px;color:#8f2f26}
.aiex-retry{margin-left:8px;background:none;border:1.5px solid #b45309;color:#b45309;border-radius:999px;padding:4px 12px;font-weight:800;font-size:12px;cursor:pointer}
.aiex-foot{display:flex;gap:10px;margin-top:10px;border-top:1px dashed #dbe7e0;padding-top:8px}
.aiex-mini{background:none;border:none;color:var(--emerald-d,#0b5a42);font-size:12px;font-weight:700;cursor:pointer;padding:2px 4px}
`;
    document.head.appendChild(el);
  }

  const origToggle = toggle;
  toggle = function (qid, btnEl) { styleOnce(); return origToggle(qid, btnEl); };
  open && (window.__aiexOpenRaw = open);
  const openStyled = function (qid, q, c) { styleOnce(); ensureCtx(qid, q, c); const saved = savedExp(qid); mount(qid, panelHTML(qid, saved ? 'done' : 'loading', saved)); if (!saved) generate(qid, q, c).then(t => mount(qid, panelHTML(qid, 'done', t))).catch(() => mount(qid, panelHTML(qid, 'error', ''))); };

  window.AiExplain = { btn: (qid, c) => { styleOnce(); return btn(qid, c); }, toggle: (qid, el) => { styleOnce(); return origToggle(qid, el); }, open: openStyled, retry, collapse, toNote, savedExp, autoExplain, _inflight: inflight };
})();
