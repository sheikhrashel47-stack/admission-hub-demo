/* v111 — Daily GK Agent tool.
   Browser Use cloud এজেন্টের সংগ্রহ করা প্রতিদিনের GK MCQ: কার্ড ভিউ, আর্কাইভ, ফ্ল্যাশ টেস্ট,
   মক টেস্ট আর verified admission news। দিনে মাত্র ১ রান (worker date-guard), সব ডেটা
   IndexedDB gkBank-এ — অফলাইনেও দেখা/টেস্ট চলবে। */
(() => {
  'use strict';

  const WORKER = (() => { try { return String(localStorage.getItem('ahGkUrl') || '').trim() || 'https://admission-gk.admissionhub.workers.dev'; } catch (_) { return 'https://admission-gk.admissionhub.workers.dev'; } })();
  const ROUTE = 'gk-agent';
  const route = () => (window.location.hash || '').replace(/^#\/?/, '').split('?')[0];
  const gkStyleOnce = () => { if (document.getElementById('gkAgentStyle')) return; const st = document.createElement('style'); st.id = 'gkAgentStyle'; st.textContent = `
.gk-card{padding:14px 14px 12px;border:1px solid var(--line,#e5e7eb);border-radius:16px;background:var(--card,#fff);box-shadow:0 1px 3px rgba(16,24,40,.05)}
.gk-card-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}
.gk-chip{display:inline-block;padding:3px 10px;border-radius:999px;background:var(--emerald,#0f6b4f);color:#fff;font-size:11px;font-weight:800;letter-spacing:.04em}
.gk-chip-plain{background:var(--bg,#f3f4f6);color:var(--sub,#6b7280)}
.gk-chip-ok{background:#e7f6ee;color:#0f6b4f}
.gk-chip-bad{background:#fdecec;color:#c02626}
.gk-crumb{font-size:11px;color:var(--sub,#6b7280);margin-bottom:6px}
.gk-card .gk-q{font-weight:700;font-size:15px;line-height:1.45;margin-bottom:10px}
.gk-opt-btn{display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:12px 13px;margin:9px 0;border:1.5px solid var(--line,#e5e7eb);border-radius:14px;background:#fff;font-size:14px;line-height:1.45;cursor:pointer;transition:transform .12s ease,box-shadow .15s ease}
.gk-opt-btn:active{transform:scale(.985)}
.gk-opt-btn .gk-letter{flex:0 0 34px;height:34px;display:flex;align-items:center;justify-content:center;border-radius:10px;background:var(--bg,#f3f4f6);border:1px solid var(--line,#e5e7eb);font-weight:800;font-size:13px}
.gk-opt-btn .gk-opttext{flex:1}
.gk-foot{display:flex;align-items:center;gap:12px;margin-top:12px;padding-top:10px;border-top:1px solid var(--line,#e5e7eb);font-size:12.5px;color:var(--sub,#6b7280)}
.gk-footbtn{padding:7px 12px;border-radius:10px;border:1px solid var(--line,#e5e7eb);background:#fff;font-size:12px;font-weight:700;color:var(--ink,#111827)}
.gk-opt-btn .gk-mark{margin-left:auto}
.gk-opt-btn.correct{border-color:#0f6b4f;background:#e7f6ee;color:#0f6b4f;font-weight:700}
.gk-opt-btn.correct span{background:#0f6b4f;color:#fff}
.gk-opt-btn.wrong{border-color:#c02626;background:#fdecec;color:#c02626}
.gk-opt-btn.wrong span{background:#c02626;color:#fff}
.gk-opt-btn:disabled{cursor:default;opacity:1}
.gk-explain{margin-top:10px;padding:10px 12px;border-radius:10px;background:#f0faf5;border-left:4px solid #0f6b4f;font-size:13px;line-height:1.55}
.gk-explain-bad{background:#fdf2f2;border-left-color:#c02626}
.gk-scorebar{margin:10px 0 2px;padding:9px 13px;border-radius:12px;background:var(--bg,#f3f4f6);font-size:13px}
.gk-src{display:inline-block;margin-top:8px;font-size:11.5px;color:#0f6b4f;text-decoration:none}
`; document.head.appendChild(st); }
  const qRightIdx = (q, optIndex) => q && q.options.findIndex(opt => opt.trim() === q.answer.trim()) === optIndex;

  const STORE = 'gkBank';

  const esc = v => String(v ?? '').replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
  const bn = v => new Intl.NumberFormat('bn-BD', { maximumFractionDigits: 0 }).format(Number(v) || 0);
  const dhakaToday = () => new Date(Date.now() + 6 * 3600000).toISOString().slice(0, 10);
  const dateBn = iso => { try { return new Intl.DateTimeFormat('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso + 'T12:00:00')); } catch (_) { return iso; } };
  const LETTERS = ['ক', 'খ', 'গ', 'ঘ'];

  let state = { tab: 'today', pollTimer: null, flash: null, mock: null, loading: false, answered: {} };

  // ── ডেটা ────────────────────────────────────────────────────────────────────
  const allQuestions = async () => { try { return (await dbGetAll(STORE)).filter(r => r.tool === 'gk-daily'); } catch (_) { return []; } };
  const allNews = async () => { try { return (await dbGetAll(STORE)).filter(r => r.tool === 'gk-news'); } catch (_) { return []; } };
  const byDate = async date => (await allQuestions()).filter(r => r.date === date);
  const savePayload = async payload => {
    const date = payload.date || dhakaToday();
    const existing = await byDate(date);
    for (const row of existing) await dbDelPermanent(STORE, row.id);
    const newsOld = (await allNews()).filter(r => r.date === date);
    for (const row of newsOld) await dbDelPermanent(STORE, row.id);
    const rows = [];
    (payload.questions || []).forEach((q, i) => rows.push({ id: `gk-${date}-${i}`, tool: 'gk-daily', date, q: String(q.q || ''), options: (q.options || []).slice(0, 4).map(String), answer: String(q.answer || ''), explain: String(q.explain || ''), source: String(q.source || ''), createdAt: Date.now() }));
    (payload.news || []).forEach((n, i) => rows.push({ id: `gknews-${date}-${i}`, tool: 'gk-news', date, title: String(n.title || ''), summary: String(n.summary || ''), source: String(n.source || ''), url: String(n.url || ''), createdAt: Date.now() }));
    for (const row of rows) await dbPut(STORE, row);
    return rows.filter(r => r.tool === 'gk-daily').length;
  };

  // ── দৈনিক রান (দিনে ১ বার — worker গার্ড করে) ─────────────────────────────────
  const stopPoll = () => { if (state.pollTimer) { clearTimeout(state.pollTimer); state.pollTimer = null; } };
  const fetchToday = async ({ silent = false } = {}) => {
    stopPoll();
    if (state.loading) return;
    state.loading = true;
    const startedAt = Date.now();
    try {
      await fetch(WORKER + '/api/gk/run', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-AH-App': 'admission-hub' } }).catch(() => {});
      const poll = async () => {
        let payload = null;
        try {
          const resp = await fetch(WORKER + '/api/gk/today', { headers: { 'X-AH-App': 'admission-hub' } });
          const data = await resp.json();
          if (data.ready && data.payload && (data.payload.count || data.payload.newsCount)) payload = data.payload;
        } catch (_) {}
        if (payload) {
          state.loading = false;
          const count = await savePayload(payload);
          window.toast?.(`🤖 আজকের ${bn(count)}টি GK ${payload.newsCount ? `+ ${bn(payload.newsCount)}টি নিউজ ` : ''}সেভ হয়েছে ✓`);
          if (route() === ROUTE) GkAgentTool.render();
          return;
        }
        if (Date.now() - startedAt > 6.5 * 60000) {
          state.loading = false;
          window.toast?.('⏳ এজেন্ট এখনো শেষ করেনি — একটু পরে আবার খুললে পেয়ে যাবে');
          if (route() === ROUTE) GkAgentTool.render();
          return;
        }
        const el = document.getElementById('gkAgentProgress');
        if (el) el.textContent = `🤖 এজেন্ট ওয়েব ঘেঁটে প্রশ্ন বানাচ্ছে… ${bn(Math.round((Date.now() - startedAt) / 1000))} সেকেন্ড`;
        state.pollTimer = setTimeout(poll, 15000);
      };
      await poll();
    } catch (_) { state.loading = false; }
    if (!silent) GkAgentTool.render();
  };

  // ── UI helpers ──────────────────────────────────────────────────────────────
  const shell = inner => { try { window.renderShell(`<div class="gkagent-page">${inner}</div>`, { title: 'GK Agent' }); } catch (_) { document.getElementById('app').innerHTML = `<div class="page">${inner}</div>`; } };
  const tabs = () => [['today', '📚 আজকের GK'], ['archive', '🗄 আর্কাইভ'], ['flash', '⚡ ফ্ল্যাশ'], ['mock', '📝 মক টেস্ট'], ['news', '📰 নিউজ']];
  const tabBar = () => `<div class="gk-tabs">${tabs().map(([key, label]) => `<button class="chip ${state.tab === key ? 'active' : ''}" onclick="GkAgentTool.setTab('${key}')">${label}</button>`).join('')}</div>`;

  // Question Bank-কার্ডের হুবহু লুক: Q-চিপ + স্ট্যাটাস, অক্ষর-বক্স full-width অপশন, ফুটার Bookmark/Show Answer
  const qStatus = idx => { const a = state.answered[idx]; return a === undefined ? null : a; };
  const statusChip = idx => { const s = qStatus(idx); return s === null ? '<span class="gk-chip gk-chip-plain">Unattempted</span>' : s ? '<span class="gk-chip gk-chip-ok">Correct</span>' : '<span class="gk-chip gk-chip-bad">Wrong</span>'; };
  const bookmarked = q => { try { return (JSON.parse(localStorage.getItem('gkBookmarks') || '[]')).includes(q.id); } catch (_) { return false; } };
  const questionCard = (q, index, reveal) => {
    const answerIndex = q.options.findIndex(opt => opt.trim() === q.answer.trim());
    const picked = qStatus(index);
    const done = reveal || picked !== null;
    const opts = q.options.map((opt, i) => {
      let cls = '';
      if (done) { if (i === answerIndex) cls = 'correct'; else if (picked === i) cls = 'wrong'; }
      return `<button class="gk-opt-btn ${cls}" ${done ? 'disabled' : ''} onclick="GkAgentTool.answerQuestion(${index}, ${i})"><span class="gk-letter">${LETTERS[i] || i + 1}</span><span class="gk-opttext">${esc(opt)}</span>${done && i === answerIndex ? '<b class="gk-mark">✓</b>' : ''}${picked === i && i !== answerIndex ? '<b class="gk-mark">✗</b>' : ''}</button>`;
    }).join('');
    const fb = done ? `<div class="gk-explain ${picked !== null && picked !== answerIndex ? 'gk-explain-bad' : ''}"><b>${picked === answerIndex ? '✓ সঠিক!' : picked !== null ? `✗ ভুল — সঠিক উত্তর: ${LETTERS[answerIndex] || q.answer}` : `💡 সঠিক উত্তর: ${LETTERS[answerIndex] || q.answer}`}</b>${q.explain ? `<br>💡 ${esc(q.explain)}` : ''}</div>${q.source ? `<a class="gk-src" href="https://${String(q.source).replace(/^https?:\/\//, '')}" target="_blank" rel="noopener">🔗 ${esc(q.source.slice(0, 40))}</a>` : ''}` : '';
    const vals = Object.entries(state.answered).filter(([k, v]) => v >= 0);
    const right = vals.filter(([k, v]) => qRightIdx(state.dayRows[Number(k)], v)).length;
    const acc = vals.length ? Math.round(right / vals.length * 100) : 0;
    const bm = bookmarked(q);
    const footer = `<div class="gk-foot"><span>Accuracy <b>${bn(acc)}%</b></span><span>Mistakes <b>${bn(vals.length - right)}</b></span><button class="gk-footbtn" onclick="GkAgentTool.toggleBookmark('${esc(q.id || '')}', this)">${bm ? '★ Saved' : '☆ Bookmark'}</button>${done ? '' : '<button class="gk-footbtn" onclick="GkAgentTool.reveal(this)">Show Answer</button>'}</div>`;
    return `<div class="gk-card" data-idx="${index}"><div class="gk-card-head"><span class="gk-chip">Q ${bn(index + 1)}</span>${statusChip(index)}</div><div class="gk-crumb">GK • ডেইলি এজেন্ট${q.date ? ' • ' + dateBn(q.date) : ''}</div><div class="gk-q">${esc(q.q)}</div><div class="gk-opts">${opts}</div>${fb}${footer}</div>`;
  };
  const toggleBookmark = (qid, btn) => {
    try {
      const list = JSON.parse(localStorage.getItem('gkBookmarks') || '[]');
      const i = list.indexOf(qid);
      if (i >= 0) list.splice(i, 1); else if (qid) list.push(qid);
      localStorage.setItem('gkBookmarks', JSON.stringify(list.slice(0, 500)));
      if (btn) btn.textContent = i < 0 ? '★ Saved' : '☆ Bookmark';
      window.toast?.(i < 0 ? 'বুকমার্ক সরানো হলো' : 'বুকমার্ক সেভ হয়েছে ⭐');
    } catch (_) {}
  };
  const updateScorebar = () => {
    const rows = state.dayRows || [];
    const vals = Object.entries(state.answered).filter(([k, v]) => v >= 0 && rows[Number(k)]);
    if (!vals.length) return;
    const right = vals.filter(([k, v]) => qRightIdx(rows[Number(k)], v)).length, wrong = vals.length - right;
    let bar = document.querySelector('#gkBody .gk-scorebar');
    const html = `<div class="gk-scorebar">🎯 Accuracy <b>${bn(vals.length ? Math.round(right / vals.length * 100) : 0)}%</b> · ✓ <b>${bn(right)}</b> · ✗ <b>${bn(wrong)}</b></div>`;
    if (bar) bar.outerHTML = html;
    else { const head = document.querySelector('#gkBody .card'); head && head.insertAdjacentHTML('afterend', html); }
  };
  const answerQuestion = (index, optIndex) => {
    if (state.answered[index] !== undefined) return;
    state.answered[index] = optIndex;
    const card = document.querySelector(`#gkBody .gk-card[data-idx="${index}"]`);
    if (card) card.outerHTML = questionCard(state.dayRows[index], index, false);
    updateScorebar();
  };
  const reveal = btn => { const card = btn.closest('.gk-card'); card.classList.add('revealed'); const idx = Number(card.dataset.idx || -1); if (state.answered[idx] === undefined) state.answered[idx] = -1; card.outerHTML = questionCard(state.dayRows[idx], idx, true); };
  const dataAttrs = rows => rows.map((r, i) => `data-i="${i}"`).join(' ');

  // ── Tabs ────────────────────────────────────────────────────────────────────
  const renderToday = async () => {
    const today = dhakaToday();
    const rows = (await byDate(today)).sort((a, b) => a.id.localeCompare(b.id));
    state.dayRows = rows;
    const news = (await allNews()).filter(r => r.date === today);
    if (!rows.length) {
      return `<div class="gk-empty card"><div style="font-size:34px">🤖</div><b>আজকের GK এখনো সংগ্রহ হয়নি</b><p class="muted" style="margin-top:6px">এজেন্ট প্রতিদিন রাত ১২টার পর একবার নতুন প্রশ্ন জোগাড় করে — দিনে মাত্র ১ রান (খরচ বাঁচে)।</p>${state.loading ? `<p id="gkAgentProgress" style="margin-top:10px;font-weight:700">🤖 এজেন্ট কাজ করছে…</p>` : `<button class="btn" style="margin-top:12px" onclick="GkAgentTool.fetchToday()">🤖 এখনই সংগ্রহ করো</button>`}<p class="muted" style="margin-top:10px;font-size:11px">গত দিনগুলোর প্রশ্ন আর্কাইভ ট্যাবে থাকে।</p></div>`;
    }
    const vals = Object.entries(state.answered).filter(([k, v]) => v >= 0 && rows[Number(k)]);
    const right = vals.filter(([k, v]) => qRightIdx(rows[Number(k)], v)).length, wrong = vals.length - right;
    return `<div class="card" style="display:flex;align-items:center;gap:10px;justify-content:space-between"><div><b>${dateBn(today)}</b><div class="muted" style="font-size:12px">${bn(rows.length)}টি প্রশ্ন${news.length ? ` · 📰 ${bn(news.length)}টি নিউজ` : ''}</div></div><div style="display:flex;gap:7px"><button class="btn sm" onclick="GkAgentTool.setTab('flash')">⚡ ফ্ল্যাশ</button><button class="btn secondary sm" onclick="GkAgentTool.setTab('mock')">📝 মক</button></div></div>${vals.length ? `<div class="gk-scorebar">🎯 Accuracy <b>${bn(vals.length ? Math.round(right / vals.length * 100) : 0)}%</b> · ✓ <b>${bn(right)}</b> · ✗ <b>${bn(wrong)}</b></div>` : ''}<div class="gk-list">${rows.map((q, i) => questionCard(q, i, false)).join('')}</div>`;
  };

  const renderArchive = async () => {
    const rows = await allQuestions();
    const dates = [...new Set(rows.map(r => r.date))].sort().reverse();
    if (!dates.length) return `<div class="gk-empty card"><div style="font-size:32px">🗄</div><b>আর্কাইভ এখনো খালি</b><p class="muted" style="margin-top:6px">প্রতিদিনের GK এখানে জমা হবে — যেকোনো দিনের প্রশ্নে ফ্ল্যাশ/মক দিতে পারবে।</p></div>`;
    return `<div class="gk-list">${dates.map(date => { const count = rows.filter(r => r.date === date).length; return `<button class="card gk-archive-row" style="display:flex;align-items:center;gap:10px;width:100%;text-align:left" onclick="GkAgentTool.openArchive('${date}')"><span style="font-size:22px">📅</span><span style="flex:1"><b>${dateBn(date)}</b><small style="display:block;color:var(--sub);font-size:11px">${bn(count)}টি প্রশ্ন</small></span><span style="color:var(--sub)">›</span></button>`; }).join('')}</div>`;
  };

  const openArchive = async date => {
    const rows = (await byDate(date)).sort((a, b) => a.id.localeCompare(b.id));
    state.dayRows = rows;
    state.tab = 'date';
    GkAgentTool.render();
  };

  const renderDateView = async () => `<div class="card" style="display:flex;align-items:center;gap:10px;justify-content:space-between"><button class="btn ghost sm" onclick="GkAgentTool.setTab('archive')">← আর্কাইভ</button><div style="text-align:right"><b>${dateBn(state.dayRows[0]?.date || '')}</b><div class="muted" style="font-size:12px">${bn(state.dayRows.length)}টি প্রশ্ন</div></div></div><div class="gk-list">${state.dayRows.map((q, i) => questionCard(q, i, false)).join('')}</div>`;

  // ── Flash ───────────────────────────────────────────────────────────────────
  // GK প্রশ্ন → অ্যাপের question-শেপ; পরীক্ষা চলে অ্যাপের আসল ইঞ্জিনেই (flash/mock + ইতিহাস)
  const toAppQ = (r, i) => {
    const opts = (r.options || []).slice(0, 4).map(x => String(x));
    const found = opts.findIndex(o => o.trim() === String(r.answer || '').trim());
    return { id: r.id || 'gkx-' + i, subjectId: 'gkagent', topicId: null, question: r.q, options: opts, answerIndex: Math.max(0, found), explanation: r.explain || '' };
  };
  const startAppExam = async (pool, mode) => {
    if (!pool.length) { window.toast?.('এই সেটে কোনো প্রশ্ন নেই'); return; }
    if (typeof window.beginExamFromPool === 'function') { await window.beginExamFromPool(pool.map(toAppQ), mode); return true; }
    return false;
  };
  const startFlash = async date => {
    const rows = date ? await byDate(date) : state.dayRows.length ? state.dayRows : await allQuestions();
    if (!rows.length) { window.toast?.('এই সেটে কোনো প্রশ্ন নেই'); return; }
    if (await startAppExam(rows, 'flash')) return; // অ্যাপ-ইঞ্জিন (হুবহু অ্যাপের মতো)
    state.flash = { rows, index: 0, revealed: false, date: date || rows[0].date }; // ফলব্যাক
    state.tab = 'flash-run';
    GkAgentTool.render();
  };
  const renderFlash = () => {
    const f = state.flash;
    const q = f.rows[f.index];
    return `<div class="card gk-flash"><div class="muted" style="font-size:12px">${dateBn(f.date)} · ${bn(f.index + 1)}/${bn(f.rows.length)}</div><div class="gk-flash-q">${esc(q.q)}</div>${f.revealed ? `<div class="gk-flash-ans">${q.options.map((opt, i) => `<div class="gk-opt ${opt.trim() === q.answer.trim() ? 'correct' : ''}"><span>${LETTERS[i]}</span> ${esc(opt)}</div>`).join('')}${q.explain ? `<p class="gk-explain">💡 ${esc(q.explain)}</p>` : ''}</div>` : `<button class="btn" style="margin-top:14px" onclick="GkAgentTool.flashReveal()">উত্তর দেখাও 👀</button>`}<div style="display:flex;gap:8px;margin-top:16px"><button class="btn ghost" style="flex:1" onclick="GkAgentTool.flashMove(-1)" ${f.index === 0 ? 'disabled' : ''}>← আগের</button><button class="btn ${f.revealed ? 'primary' : 'ghost'}" style="flex:1" onclick="GkAgentTool.flashMove(1)" ${f.index === f.rows.length - 1 ? 'disabled' : ''}>পরের →</button></div><div class="gk-progress"><div style="width:${Math.round((f.index + 1) / f.rows.length * 100)}%"></div></div></div>`;
  };
  const flashReveal = () => { state.flash.revealed = true; GkAgentTool.render(); };
  const flashMove = dir => { state.flash.index = Math.max(0, Math.min(state.flash.rows.length - 1, state.flash.index + dir)); state.flash.revealed = false; GkAgentTool.render(); };

  // ── Mock ────────────────────────────────────────────────────────────────────
  const shuffle = arr => [...arr].sort(() => Math.random() - .5);
  const startMock = async () => {
    const count = state.mockCount || 10;
    let pool = state.mockScope === 'all' ? await allQuestions() : (state.dayRows.length ? state.dayRows : await allQuestions());
    pool = shuffle(pool).slice(0, count);
    if (pool.length < 5) { window.toast?.('মক টেস্টের জন্য অন্তত ৫টি প্রশ্ন দরকার'); return; }
    if (await startAppExam(pool, 'mock')) return;
    state.mock = { rows: pool.map((q, i) => ({ ...q, shuffled: shuffle(q.options.map((opt, oi) => ({ opt, correct: opt.trim() === q.answer.trim() })) ), index: i })), answers: {}, index: 0, done: false, startedAt: Date.now() };
    state.tab = 'mock-run';
    GkAgentTool.render();
  };
  const renderMockSetup = () => `<div class="card gk-empty"><div style="font-size:32px">📝</div><b>GK মক টেস্ট</b><p class="muted" style="margin-top:6px">সময়-সীমাহীন ছোট মক — প্রতিটি উত্তরের পরেই সঠিক উত্তর ও ব্যাখ্যা দেখা যায়।</p><label class="flabel" style="margin-top:12px">প্রশ্ন সংখ্যা</label><div class="gk-tabs">${[10, 20, 30].map(n => `<button class="chip ${(state.mockCount || 10) === n ? 'active' : ''}" onclick="GkAgentTool.setMockCount(${n})">${bn(n)}</button>`).join('')}</div><button class="btn" style="margin-top:14px" onclick="GkAgentTool.startMock()">▷ শুরু করো</button></div>`;
  const renderMockRun = () => {
    const m = state.mock;
    const q = m.rows[m.index];
    const picked = m.answers[m.index];
    return `<div class="card gk-flash"><div style="display:flex;justify-content:space-between;align-items:center"><span class="muted" style="font-size:12px">প্রশ্ন ${bn(m.index + 1)}/${bn(m.rows.length)}</span><span class="muted" style="font-size:12px">✓ ${bn(Object.keys(m.answers).filter(k => m.rows[k].shuffled.find(o => o.correct)?.opt === m.answers[k]).length)}</span></div><div class="gk-flash-q">${esc(q.q)}</div><div class="gk-opts">${q.shuffled.map((o, oi) => `<button class="gk-opt-btn ${picked ? (o.correct ? 'correct' : (picked === o.opt ? 'wrong' : '')) : ''}" ${picked ? 'disabled' : ''} onclick="GkAgentTool.mockAnswer(${m.index}, ${oi})"><span>${LETTERS[oi]}</span> ${esc(o.opt)}</button>`).join('')}</div>${picked ? `${q.explain ? `<p class="gk-explain">💡 ${esc(q.explain)}</p>` : ''}<button class="btn" style="margin-top:12px" onclick="GkAgentTool.mockNext()">${m.index === m.rows.length - 1 ? 'ফলাফল দেখো' : 'পরের প্রশ্ন →'}</button>` : ''}<div class="gk-progress"><div style="width:${Math.round((m.index + 1) / m.rows.length * 100)}%"></div></div></div>`;
  };
  const renderMockResult = () => {
    const m = state.mock;
    const score = m.rows.reduce((sum, q, i) => sum + (m.answers[i] && m.answers[i] === q.shuffled.find(o => o.correct)?.opt ? 1 : 0), 0);
    const pct = Math.round(score / m.rows.length * 100);
    return `<div class="card gk-empty"><div style="font-size:36px">${pct >= 80 ? '🏆' : pct >= 50 ? '💪' : '📚'}</div><h2 style="margin:6px 0">${bn(score)} / ${bn(m.rows.length)} (${bn(pct)}%)</h2><p class="muted">${pct >= 80 ? 'দুর্দান্ত! এই গতিতেই এগোও 🚀' : pct >= 50 ? 'ভালো চলছে — ভুলগুলো একবার ঘেঁটে নাও' : 'চিন্তা নেই — কার্ডগুলো আবার ফ্ল্যাশ করে আসো 😊'}</p><div style="display:flex;gap:8px;margin-top:14px"><button class="btn" style="flex:1" onclick="GkAgentTool.startMock()">🔄 আবার</button><button class="btn ghost" style="flex:1" onclick="GkAgentTool.setTab('mock')">সেটআপে ফেরো</button></div></div><div class="gk-list">${m.rows.map((q, i) => `<div class="gk-card"><div class="gk-q"><b>${bn(i + 1)}.</b> ${esc(q.q)}</div><div class="gk-opts">${q.shuffled.map((o, oi) => `<div class="gk-opt ${o.correct ? 'correct' : (m.answers[i] === o.opt ? 'wrong' : '')}"><span>${LETTERS[oi]}</span> ${esc(o.opt)}</div>`).join('')}</div>${q.explain ? `<div class="gk-explain">💡 ${esc(q.explain)}</div>` : ''}</div>`).join('')}</div>`;
  };
  const mockNext = () => { const m = state.mock; if (m.index >= m.rows.length - 1) m.done = true; else m.index += 1; GkAgentTool.render(); };

  const renderNews = async () => {
    const news = (await allNews()).sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
    if (!news.length) return `<div class="gk-empty card"><div style="font-size:32px">📰</div><b>এখনো কোনো verified নিউজ নেই</b><p class="muted" style="margin-top:6px">এজেন্ট প্রতিদিন ভেরিফাইড সোর্স থেকে admission-নিউজ আনে — না পেলে কিছুই পাঠায় না (গুজব নয়)।</p></div>`;
    const dates = [...new Set(news.map(n => n.date))];
    return dates.map(date => `<div class="h2" style="margin:14px 0 8px">${dateBn(date)}</div>${news.filter(n => n.date === date).map(n => `<div class="card" style="margin-bottom:9px"><b style="font-size:13.5px">📰 ${esc(n.title)}</b><p style="margin:6px 0 0;font-size:12.5px;line-height:1.55;color:#4a6258">${esc(n.summary)}</p>${n.url ? `<a href="${esc(n.url)}" target="_blank" rel="noopener" style="font-size:11px;color:var(--emerald-d)">🔗 ${esc(n.source || 'সূত্র')}</a>` : (n.source ? `<span style="font-size:11px;color:var(--sub)">🔗 ${esc(n.source)}</span>` : '')}</div>`).join('')}`).join('');
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  const render = async () => {
    gkStyleOnce();
    stopPoll();
    let body = '';
    try {
      if (state.tab === 'today') body = await renderToday();
      else if (state.tab === 'archive') body = await renderArchive();
      else if (state.tab === 'date') body = await renderDateView();
      else if (state.tab === 'flash') body = `<div class="card gk-empty"><b>⚡ ফ্ল্যাশ টেস্ট</b><p class="muted" style="margin:6px 0 12px">কোন সেট দিয়ে শুরু করবে?</p><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" onclick="GkAgentTool.startFlash()">📚 আজকের GK</button><button class="btn ghost" onclick="GkAgentTool.startFlash('all')">🗄 পুরো আর্কাইভ</button></div></div>`;
      else if (state.tab === 'flash-run') body = renderFlash();
      else if (state.tab === 'mock') body = renderMockSetup();
      else if (state.tab === 'mock-run') body = state.mock.done ? renderMockResult() : renderMockRun();
      else if (state.tab === 'news') body = await renderNews();
    } catch (error) { body = `<div class="gk-empty card">কিছু দেখানো যায়নি — আবার চেষ্টা করো।</div>`; }
    shell(`<header class="gk-head"><div><div class="explorer-kicker">AI AGENT · BROWSER USE</div><h1 style="font-size:22px;margin:2px 0">🤖 ডেইলি GK এজেন্ট</h1><p class="muted" style="margin:0;font-size:12px">প্রতিদিন ২০–৩০টি নতুন MCQ + verified admission news — একই সময়ে ফ্ল্যাশ আর মক প্র্যাকটিস।</p></div></header>${tabBar()}<div id="gkBody">${body}</div>`);
    if (state.tab === 'today') {
      const rows = await byDate(dhakaToday());
      if (!rows.length && !state.loading) { const last = window.__gkLastAuto !== dhakaToday(); if (last) { window.__gkLastAuto = dhakaToday(); stopPoll(); fetchToday({ silent: true }); } }
      if (state.loading) { const el = document.getElementById('gkAgentProgress'); if (el && !state.pollTimer) fetchToday({ silent: true }); }
    }
  };

  window.GkAgentTool = {
    render,
    setTab(tab) { state.tab = tab; GkAgentTool.render(); },
    fetchToday: () => { state.loading = false; fetchToday(); },
    reveal, answerQuestion, toggleBookmark, startFlash, flashReveal, flashMove, startMock, mockNext,
    setMockCount(n) { state.mockCount = n; GkAgentTool.render(); },
    mockAnswer(qi, oi) {
      const m = state.mock;
      if (m.answers[qi] !== undefined) return;
      m.answers[qi] = m.rows[qi].shuffled[oi].opt;
      GkAgentTool.render();
    },
    openArchive
  };

  // ── ড্যাশবোর্ডের নিচে বাটন (unified study tools list-এ, app-প্যাটার্ন) ──────────
  const MOUNT_ID = 'gkAgentDashboardEntry';
  const mountDashboard = () => {
    try {
      const page = document.querySelector('#app .page');
      if (!page || String(location.hash.replace(/^#\/?/, '').split('?')[0] || '') !== 'dashboard') return;
      if (document.getElementById(MOUNT_ID)) return;
      const host = page.querySelector('[data-unified-study-tools-list]');
      if (!host) return;
      const entry = document.createElement('button');
      entry.type = 'button';
      entry.id = MOUNT_ID;
      entry.className = 'standalone-mock-dashboard-entry p3-unified-tool-row-v3';
      entry.setAttribute('aria-label', 'ডেইলি GK এজেন্ট খুলুন');
      entry.onclick = () => navigate(ROUTE);
      entry.innerHTML = `<span class="standalone-mock-dashboard-mark" aria-hidden="true">🤖</span><span class="standalone-mock-dashboard-copy"><b>ডেইলি GK এজেন্ট</b><small>AI এজেন্টের জোগাড় করা রোজকার GK + মক প্র্যাকটিস</small></span><span class="standalone-mock-dashboard-arrow" aria-hidden="true">›</span>`;
      host.appendChild(entry);
    } catch (_) {}
  };
  const bootMount = () => {
    const app = document.getElementById('app');
    if (!app || window.__gkAgentObserver) return;
    window.__gkAgentObserver = new MutationObserver(() => setTimeout(mountDashboard, 60));
    window.__gkAgentObserver.observe(app, { childList: true, subtree: true });
    window.addEventListener?.('hashchange', () => setTimeout(mountDashboard, 250));
    [1200, 2500, 4500].forEach(delay => setTimeout(mountDashboard, delay));
  };
  if (typeof document !== 'undefined') bootMount();
})();
