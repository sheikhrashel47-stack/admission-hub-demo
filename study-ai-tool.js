/*
 * ADMISSION HUB · v114 · Admihub AI — Chorcha-স্টাইল ফুলস্ক্রিন 3D চ্যাট
 * ── ফুলস্ক্রিন (অ্যাপের নেভিগেশন-বার লুকানো) + ড্যাশবোর্ডে ফেরার back + topbar ⚙/＋
 * ── মাল্টি-চ্যাট branch (ChatGPT/Gemini-স্টাইল new chat)
 * ── সোর্স-পিকার: অ্যাপের প্রশ্নব্যাংকের আসল subject-তালিকা → সিলেক্ট = সোর্স নির্ধারণ (মেসেজ যায় না)
 * ── সাজেশন-চিপ: প্রথম টেক্সট পাঠানোর আগে পর্যন্তই
 * ── সম্পূর্ণ ডেটা-মেমোরি: সব প্রশ্ন+ইতিহাস worker-এ সেভ → এজেন্ট তোমার ব্যাংক থেকেই উত্তর দেয়
 * ── Settings: Gemini/Grok/Groq key add/remove/switch (অপশনাল ফাস্ট-ইঞ্জিন), থিম, ডেটা-টগল
 */
(function installStudyAi() {
  'use strict';
  if (window.StudyAiTool) return;
  const ROUTE = 'study-ai';
  const route = () => (window.location.hash || '').replace(/^#\/?/, '').split('?')[0];
  const WORKER = 'https://admission-gk.admissionhub.workers.dev';
  const APP_HEADER = { 'X-AH-App': 'admission-hub' };
  const LS_LIST = 'studyAiChats', LS_CUR = 'studyAiCur', LS_SHARED = 'studyAiShared', LS_NAME = 'studyAiName', LS_BANK = 'studyAiBankAt', LS_CFG = 'studyAiCfg';

  const bn = n => String(n).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const nameOf = () => localStorage.getItem(LS_NAME) || 'রাশেল';
  const cfg = () => { try { return Object.assign({ engine: 'agent', provider: 'gemini', keys: {}, model: '', sendData: true, theme: 'aurora' }, JSON.parse(localStorage.getItem(LS_CFG) || '{}')); } catch (_) { return { engine: 'agent', provider: 'gemini', keys: {}, model: '', sendData: true, theme: 'aurora' }; } };
  const setCfg = c => localStorage.setItem(LS_CFG, JSON.stringify(c));

  let state = { busy: false, sheet: null, view: {}, page: null, attach: [], keyTest: null, bankInfo: undefined, autoSyncTried: false };

  // ── চ্যাট-লিস্ট (branches) ────────────────────────────────────────────────────
  const listChats = () => { try { const l = JSON.parse(localStorage.getItem(LS_LIST) || '[]'); return Array.isArray(l) ? l : []; } catch (_) { return []; } };
  const saveList = l => localStorage.setItem(LS_LIST, JSON.stringify(l.slice(0, 30)));
  const curId = () => localStorage.getItem(LS_CUR) || '';
  const msgsOf = id => { try { return JSON.parse(localStorage.getItem('studyAiChat:' + id) || '[]'); } catch (_) { return []; } };
  const saveMsgs = (id, m) => localStorage.setItem('studyAiChat:' + id, JSON.stringify(m.slice(-60)));
  const ensureChat = () => {
    if (curId() && listChats().some(c => c.id === curId())) return curId();
    const c = { id: uid(), title: 'নতুন চ্যাট', at: Date.now() };
    saveList([c, ...listChats()]); localStorage.setItem(LS_CUR, c.id);
    return c.id;
  };
  const touchChat = (id, firstText) => {
    const l = listChats(); const c = l.find(x => x.id === id);
    if (c) { if (firstText && c.title === 'নতুন চ্যাট') c.title = String(firstText).slice(0, 28); c.at = Date.now(); saveList(l.sort((a, b) => b.at - a.at)); }
  };
  const newChat = () => { const c = { id: uid(), title: 'নতুন চ্যাট', at: Date.now() }; saveList([c, ...listChats()]); localStorage.setItem(LS_CUR, c.id); state.sheet = null; state.msgsFull = false; state.jumpBottom = true; paint(); };
  const openChat = id => { localStorage.setItem(LS_CUR, id); state.sheet = null; state.msgsFull = false; state.jumpBottom = true; fixIds(id); paint(); };
  const delChat = id => { let l = listChats().filter(c => c.id !== id); localStorage.removeItem('studyAiChat:' + id); if (!l.length) { const c = { id: uid(), title: 'নতুন চ্যাট', at: Date.now() }; l = [c]; } saveList(l); if (curId() === id) localStorage.setItem(LS_CUR, l[0].id); paint(); };
  const chatTitle = () => (listChats().find(c => c.id === curId()) || {}).title || 'নতুন চ্যাট';

  const cache = () => (typeof CACHE !== 'undefined' && CACHE) || window.CACHE || {};

  // ── ডেটা-সারসংক্ষেপ + সম্পূর্ণ ব্যাংক-আপলোড (defensive) ─────────────────────────
  const dateStr = v => { try { if (v instanceof Date && !isNaN(v)) return v.toISOString().slice(0, 10); if (typeof v === 'number' && isFinite(v)) return new Date(v).toISOString().slice(0, 10); return String(v ?? '').slice(0, 10); } catch (_) { return ''; } };
  const subName = id => { try { return String((cache().subjects || []).find(x => x && x.id === id)?.name || id || ''); } catch (_) { return String(id || ''); } };
  const topName = id => { try { return String((cache().topics || []).find(x => x && x.id === id)?.name || id || ''); } catch (_) { return String(id || ''); } };
  const buildContext = () => {
    try {
      const c = cache();
      const qs = Array.isArray(c.questions) ? c.questions : [], ex = Array.isArray(c.examResults) ? c.examResults : [], voc = Array.isArray(c.vocabulary) ? c.vocabulary : [], mis = Array.isArray(c.mistakes) ? c.mistakes : [];
      const bySub = {}; qs.forEach(q => { const s = String((q && q.subjectId) || 'অন্য'); bySub[s] = (bySub[s] || 0) + 1; });
      const topSubs = Object.entries(bySub).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([s, n]) => `${subName(s) || s} ${bn(n)}টি`);
      const accs = ex.map(e => { try { const t = Number(e && (e.totalQuestions ?? (Array.isArray(e.questions) ? e.questions.length : 0))) || 0; return t ? (Number(e && (e.correctCount ?? e.correct)) || 0) / t * 100 : null; } catch (_) { return null; } }).filter(x => x !== null);
      const avg = accs.length ? Math.round(accs.reduce((a, b) => a + b, 0) / accs.length) : null;
      const recents = ex.slice(0, 8).map(e => { try { const t = Number(e && (e.totalQuestions ?? (Array.isArray(e.questions) ? e.questions.length : 0))) || 0; return `${dateStr(e && (e.completedAt ?? e.date))}: ${bn(Number(e && (e.correctCount ?? e.correct)) || 0)}/${bn(t)}`; } catch (_) { return ''; } }).filter(Boolean);
      const wrong = {}; mis.forEach(m => { try { const t = String((m && m.q && m.q.topicId) || (m && m.topic) || '?'); wrong[t] = (wrong[t] || 0) + 1; } catch (_) {} });
      const weak = Object.entries(wrong).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t, n]) => `${topName(t) || t}(${bn(n)}বার)`);
      return `প্রশ্নব্যাংক: ${bn(qs.length)}টি প্রশ্ন। মূল বিষয়: ${topSubs.join(', ') || '—'}। পরীক্ষা: ${bn(ex.length)}টি${avg !== null ? `, গড় নির্ভুলতা ${bn(avg)}%` : ''}। সাম্প্রতিক: ${recents.slice(0, 5).join(' | ') || '—'}। ভোকাবুলারি: ${bn(voc.length)}টি। দুর্বল টপিক: ${weak.join(', ') || 'এখনো যথেষ্ট ভুল নেই'}।`;
    } catch (_) { return 'ডেটা-সারসংক্ষেপ এবার পড়া গেল না।'; }
  };
  const bankStats = () => {
    try {
      const c = cache();
      const ex = Array.isArray(c.examResults) ? c.examResults : [], mis = Array.isArray(c.mistakes) ? c.mistakes : [];
      const accs = ex.map(e => { try { const t = Number(e && (e.totalQuestions ?? (Array.isArray(e.questions) ? e.questions.length : 0))) || 0; return t ? (Number(e && (e.correctCount ?? e.correct)) || 0) / t * 100 : null; } catch (_) { return null; } }).filter(x => x !== null);
      const wrong = {}; mis.forEach(m => { try { const t = topName((m && m.q && m.q.topicId)) || (m && m.topic) || '?'; wrong[t] = (wrong[t] || 0) + 1; } catch (_) {} });
      return { exams: ex.length, avgAcc: accs.length ? Math.round(accs.reduce((a, b) => a + b, 0) / accs.length) : null, weak: Object.entries(wrong).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t]) => t) };
    } catch (_) { return { exams: 0, avgAcc: null, weak: [] }; }
  };
  const buildBankUpload = () => {
    const c = cache();
    const qs = (Array.isArray(c.questions) ? c.questions : []).map(q => {
      const opts = Array.isArray(q && q.options) ? q.options : [];
      const ai = Number(q && (q.answerIndex ?? q.answer ?? q.correctAnswerIndex));
      const answer = typeof q?.answer === 'string' && q.answer ? q.answer : (Number.isFinite(ai) && opts[ai] != null ? String(opts[ai]) : '');
      return { q: String((q && (q.question ?? q.q)) || '').slice(0, 400), o: opts.map(x => String(x).slice(0, 120)).slice(0, 6), a: answer.slice(0, 120), e: String((q && q.explain) || '').slice(0, 300), s: subName(q && q.subjectId).slice(0, 70), t: topName(q && q.topicId).slice(0, 70) };
    }).filter(x => x.q && x.o.length >= 2);
    const ex = exSorted().slice(0, 500).map(e => { try { const t = Number(e && (e.totalQuestions ?? (Array.isArray(e.questions) ? e.questions.length : 0))) || 0; const cc = Number(e && (e.correctCount ?? e.correct)) || 0; return { d: dateStr(e && ((e.completedAt ?? e.at) || Date.now())), s: cc + '/' + t, m: e && e.mode ? String(e.mode).slice(0, 10) : '' }; } catch (_) { return null; } }).filter(Boolean);
    const misAll = Array.isArray(c.mistakes) ? c.mistakes : [], vocAll = vocPick();
    const mis = misAll.slice(0, 400).map(mm => { try { const raw = mm && (mm.q && typeof mm.q === 'object' ? mm.q : (c.questions || []).find(x => x && x.id === (mm.questionId || (mm.q || {}).id))); if (!raw) return null; const opts = Array.isArray(raw.options) ? raw.options : []; const ai = Number(raw.answerIndex ?? raw.answer ?? raw.correctAnswerIndex); const ans = typeof raw.answer === 'string' && raw.answer ? raw.answer : (Number.isFinite(ai) && opts[ai] != null ? String(opts[ai]) : ''); return { q: String((raw.question ?? raw.q) || '').slice(0, 220), a: ans.slice(0, 90), s: subName(raw.subjectId).slice(0, 60), t: topName(raw.topicId).slice(0, 60) }; } catch (_) { return null; } }).filter(Boolean).filter(x => x.q);
    const voc = vocAll.slice(0, 1500).map(v => ({ w: String((v && (v.word ?? v.w)) || '').slice(0, 60), m: String((v && (v.meaning ?? v.m)) || '').slice(0, 110) })).filter(x => x.w);
    const lastAt = (() => { const r = exSorted()[0]; return r ? (r.completedAt || r.at) || null : null; })();
    const days = new Set((c.examResults || []).map(e => { try { return dateStr(e && ((e.completedAt ?? e.at) || Date.now())); } catch (_) { return ''; } }).filter(Boolean));
    const answered = (c.examResults || []).reduce((a, e) => { try { return a + (Number(e && (e.totalQuestions ?? (Array.isArray(e.questions) ? e.questions.length : 0))) || 0); } catch (_) { return a; } }, 0);
    const correct = (c.examResults || []).reduce((a, e) => { try { return a + (Number(e && (e.correctCount ?? e.correct)) || 0); } catch (_) { return a; } }, 0);
    const lifetime = { exams: (c.examResults || []).length, answered, correct, acc: answered ? Math.round(correct * 100 / answered) : null, daysActive: days.size, mistakes: misAll.length, vocab: vocAll.length, opens: Number(localStorage.getItem('saiOpens') || 0) };
    const coach = (() => { try { return JSON.parse(localStorage.getItem('saiCoachNote') || 'null'); } catch (_) { return null; } })();
    return { questions: qs, stats: { count: qs.length, ...bankStats() }, history: ex, mistakes: mis, vocabulary: voc, activity: { exams: lifetime.exams, mistakes: misAll.length, vocab: vocAll.length, lastExamAt: lastAt, lifetime, coach, syncedAt: Date.now() } };
  };
  // ডেটা-সিগনেচার: প্রশ্ন/পরীক্ষা বদলালেই নতুন-মান → অটো-রি-সিঙ্কের ভিত্তি
  const dataSig = () => { const ex = exSorted(); const last = ex.length ? (Number((ex[0] && ((ex[0].completedAt ?? ex[0].at) || 0)) || 0)) : 0; return 'v131:' + (cache().questions || []).length + ':' + ex.length + ':' + (cache().mistakes || []).length + ':' + vocPick().length + ':' + last; };
  const syncBank = async () => {
    // অ্যাপ খুলে IndexedDB-তে প্রশ্ন আসা পর্যন্ত অপেক্ষা (সর্বোচ্চ ~১২ সেকেন্ড)
    for (let i = 0; i < 30 && !(cache().questions || []).length; i++) await new Promise(r => setTimeout(r, 400));
    try { await boostData(); } catch (_) {}
    const payload = buildBankUpload();
    if (!payload.questions.length) throw new Error('ব্যাংক খালি (অ্যাপে প্রশ্ন লোড হয়নি?)');
    try {
      const res = await fetch(WORKER + '/api/bank', { method: 'POST', headers: { ...APP_HEADER, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.saved) throw new Error('সেভ করা গেল না (' + res.status + ')');
    } catch (err) {
      // ফলব্যাক: sendBeacon (কোনো preflight/হেডার ছাড়াই যায়) → পরে GET দিয়ে নিশ্চিত
      const okBeacon = typeof navigator !== 'undefined' && navigator.sendBeacon && navigator.sendBeacon(WORKER + '/api/bank', new Blob([JSON.stringify(payload)], { type: 'application/json' }));
      if (!okBeacon) throw err;
      await new Promise(r => setTimeout(r, 1800));
      const chk = await fetch(WORKER + '/api/bank', { headers: APP_HEADER }).then(r => r.json()).catch(() => ({}));
      if (!chk.saved) throw new Error('beacon-ও কাজ করেনি — ' + String(err?.message || err).slice(0, 60));
    }
    localStorage.setItem(LS_BANK, String(Date.now()));
    localStorage.removeItem('studyAiSyncErr');
    localStorage.setItem('studyAiCtx', buildContext());
    return (payload.stats || {}).count || 0;
  };
  // অটো-সিঙ্ক: worker-এ ব্যাংক না থাকলে চ্যাট খোলামাত্র নিজে থেকেই পাঠিয়ে দাও — ট্যাপ লাগে না
  const ensureSync = async manual => {
    try {
      const info = await fetch(WORKER + '/api/bank', { headers: APP_HEADER }).then(r => r.json()).catch(() => ({}));
      state.bankInfo = info;
      // worker-এ ডেটা থাকলেও তুলনা করি: লোকাল ডেটা বদলেছে কি না — বদলেছে তবেই টাটকা আপলোড
      if (info && info.saved && !manual && localStorage.getItem('ahBankSig') === dataSig()) { if (!localStorage.getItem(LS_BANK)) localStorage.setItem(LS_BANK, String(info.savedAt || Date.now())); return; }
      const n = await syncBank();
      state.bankInfo = { saved: true, count: n, savedAt: Date.now() };
      localStorage.setItem(LS_SHARED, '1');
      localStorage.setItem('ahBankSig', dataSig());
      if (window.toast && manual) window.toast('📤 সব ডেটা AI-দের কাছে টাটকা হয়ে গেছে ✓');
    } catch (e) {
      localStorage.setItem('studyAiSyncErr', String(e?.message || e).slice(0, 90));
      if (manual && window.toast) window.toast('⚠️ ডেটা যায়নি: ' + String(e?.message || e).slice(0, 60));
    }
    paint(); // landing/সেটিংস — যে-ভিউতেই থাকি, নতুন স্ট্যাটাস দেখাও
  };

  const todayBd = () => { try { return new Date(Date.now() + 6 * 3600000).toISOString().slice(0, 10); } catch (_) { return ''; } };
  const sysPrompt = () => `তুমি "স্টাডি বন্ধু" — বাংলাদেশি বিশ্ববিদ্যালয় ভর্তি-প্রস্তুতির বন্ধুসুলভ AI সহকারী (অ্যাপ: Admission Hub / Admihub AI)।
আজকের তারিখ: ${todayBd()} (বাংলাদেশ, Asia/Dhaka)। FRESHNESS নিয়ম: তারিখ/সংখ্যা/নাম/কারেন্ট-অ্যাফেয়ার্স/ভর্তি-তথ্য জাতীয় যেকোনো প্রশ্নে নিজের পুরনো জ্ঞানে (training memory) উত্তর দেওয়া নিষিদ্ধ — সর্বশেষ যাচাইকৃত তথ্য দাও; যাচাই করতে না পারলে স্পষ্ট করে বলো কোনটা যাচাই করা যায়নি।
নিয়ম: সহজ-উষ্ণ বাংলায় তুমি-ফর্মে কথা বলো; উত্তর ছোট ও সোজা (সাধারণত ২-৬ লাইন); হালকা emoji ঠিক আছে কিন্তু অতিরিক্ত নয়; ভুল তথ্য কখনো বানাবে না — নিশ্চিত না হলে স্বচ্ছভাবে বলবে বা ওয়েব ঘেঁটে যাচাই করবে।
কোচ-ভূমিকা (গুরুত্বপূর্ণ): তুমি শুধু উত্তর-মেশিন নও — ব্যক্তিগত প্রশিক্ষক। শিক্ষার্থীর ইতিহাস/ভুল-প্রশ্ন/দুর্বল-টপিক/শব্দভাণ্ডার দেখে সক্রিয়ভাবে ট্রেনিং দাও: ছোট লক্ষ্য ঠিক করে দাও, রিভিশন-প্ল্যান বানাও, মনে-রাখার টিপস দাও, আগের কথা মনে রেখে প্রগ্রেস তুলনা করো।
${cfg().sendData && localStorage.getItem('studyAiCtx') ? `শিক্ষার্থীর ডেটা (প্রসঙ্গ কাজে লাগাও, কাঁচা ডেটা ফেরত লিখো না):\n${localStorage.getItem('studyAiCtx')}` : ''}`;

  // ── 🌐 Browser Use এজেন্ট ────────────────────────────────────────────────────
  const askAgent = async (question, source, onStep, abortRef) => {
    const res = await fetch(WORKER + '/api/ask', { method: 'POST', headers: { ...APP_HEADER, 'Content-Type': 'application/json' }, body: JSON.stringify({ question, context: cfg().sendData ? (localStorage.getItem('studyAiCtx') || '').slice(0, 1100) : '', source }) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(d.error === 'all-keys-exhausted' ? 'এজেন্ট এখন ব্যস্ত — ১-২ মিনিট পরে আবার' : d.error === 'ask-key-not-configured' ? 'চ্যাট-এজেন্ট এখন কনফিগার হয়নি — একটু পরে আবার' : 'সংযোগ করা গেল না — নেট দেখে আবার চেষ্টা করো');
    if (!d.id) throw new Error('এজেন্ট শুরু করা যায়নি — আবার চেষ্টা করো');
    const stepsSeen = [];
    const started = Date.now();
    while (Date.now() - started < 4.5 * 60000) {
      if (abortRef && abortRef.aborted) { fetch(WORKER + '/api/ask/' + d.id + '/cancel', { method: 'POST', headers: APP_HEADER }).catch(() => {}); throw Object.assign(new Error('__aborted__'), { aborted: true }); }
      await new Promise(r => setTimeout(r, stepsSeen.length ? 6000 : 1100)); // প্রথম প্রোব দ্রুত, পরেরগুলো ৬ সেকেন্ডে
      const st = await Promise.race([
        fetch(WORKER + '/api/ask/' + d.id, { headers: APP_HEADER }).then(r => r.json()).then(j => { if (j && j.error && !j.status) throw new Error('poll-error'); return j; }).catch(e => { if (e && e.message === 'poll-error') return { __pollErr: true }; return {}; }),
        new Promise(r => setTimeout(() => r({ __slowPoll: true }), 8000))
      ]);
      if (abortRef && abortRef.aborted) { fetch(WORKER + '/api/ask/' + d.id + '/cancel', { method: 'POST', headers: APP_HEADER }).catch(() => {}); throw Object.assign(new Error('__aborted__'), { aborted: true }); }
      if (st && st.__pollErr) throw new Error('এজেন্ট এবার উত্তর দিতে পারেনি — Retry চাপো বা আবার পাঠাও');
      const steps = Array.isArray(st.steps) ? st.steps : [];
      if (steps.length > stepsSeen.length) { stepsSeen.push(...steps.slice(stepsSeen.length)); if (onStep) onStep(stepsSeen.length, stepsSeen); }
      if (st.status === 'finished') return { text: st.answer, sources: st.sources || [], steps: stepsSeen };
      if (st.status === 'failed') throw new Error('এজেন্ট এবার কাজটা শেষ করতে পারেনি — Retry চাপো বা আবার পাঠাও');
    }
    throw new Error('সময় শেষ — প্রশ্নটা বেশ ভারী ছিল; আবার পাঠাও');
  };

  // ── ⚡ অপশনাল ফাস্ট-ইঞ্জিন (Settings থেকে key) ─────────────────────────────────
  const keyList = pv => { const k = cfg().keys[pv]; return (Array.isArray(k) ? k : (k ? [k] : [])).map(x => String(x || '').trim()).filter(Boolean); };
  const VL_DEFAULT = { openrouter: 'google/gemma-4-31b-it:free', hf: 'meta-llama/Llama-3.2-11B-Vision-Instruct' };
  // 🧠 লাইভ-ব্রেইন: ব্যাংক-সারাংশ + পুরনো চ্যাটের স্মৃতি — প্রতি মেসেজে তাজা (Gemini + OpenRouter; HF নয়)
  // ব্যাংক-অটোলুকআপ: ইউজারের প্রশ্নের টোকেন মিলিয়ে নিজের ব্যাংক থেকে কাছাকাছি প্রশ্ন-উত্তর
  const boostData = async () => { try { if (typeof dbGetAll === 'function') { if (!(cache().vocabulary || []).length) cache().vocabulary = await dbGetAll('vocabulary'); if (!(cache().vocabularyMaster || []).length) cache().vocabularyMaster = await dbGetAll('vocabularyMaster'); if (!(cache().mistakes || []).length) cache().mistakes = await dbGetAll('mistakes'); } } catch (_) {} };
  // v131: সর্বশেষ-প্রথম ক্রম (IDB পুরনো-প্রথম দেয় — তাই সর্বদা সাজাও) + আসল-শব্দভাণ্ডার (vocabularyMaster হলে সেটাই)
  const exSorted = () => [...(cache().examResults || [])].sort((a, b) => (Number((b && ((b.completedAt ?? b.at) || 0)) || 0) - Number((a && ((a.completedAt ?? a.at) || 0)) || 0)));
  const vocPick = () => { const v1 = cache().vocabulary || [], v2 = cache().vocabularyMaster || []; return v2.length >= v1.length ? v2 : v1; };
  const bankMatch = text => {
    try {
      const toks = String(text || '').toLowerCase().split(/[^\p{L}\p{M}\p{N}]+/u).filter(t => t.length > 2).slice(0, 24);
      if (toks.length < 2) return [];
      const hits = [];
      for (const q of (cache().questions || [])) {
        const hay = String((q && (q.question ?? q.q)) || '').toLowerCase();
        if (hay.length < 8) continue;
        let sc = 0; for (const t of toks) if (hay.includes(t)) sc++;
        if (sc >= Math.max(2, Math.ceil(toks.length * 0.4))) hits.push({ q, sc });
      }
      return hits.sort((a, b) => b.sc - a.sc).slice(0, 6);
    } catch (_) { return []; }
  };
  const buildBrain = userText => {
    try {
      const c = cache();
      const qs = c.questions || [];
      const subs = [...new Set((c.subjects || []).map(x => String(x.name || '').trim()).filter(Boolean))];
      let out = '[লাইভ-মেমোরি — অ্যাপের এখনকার অবস্থা]\nপ্রশ্নব্যাংক: ' + bn(qs.length) + 'টি প্রশ্ন' + (subs.length ? ' · বিষয়: ' + subs.join(', ') : '');
      const hist = exSorted().slice(0, 10).map(e2 => { try { const t = Number(e2 && (e2.totalQuestions ?? 0)) || 0; const mo = e2 && e2.mode ? ' (' + String(e2.mode).slice(0, 10) + ')' : ''; return dateStr(e2 && ((e2.completedAt ?? e2.at) || Date.now())) + mo + ': ' + bn(e2 && (e2.correctCount ?? 0)) + '/' + bn(t); } catch (_) { return ''; } }).filter(Boolean);
      if (hist.length) out += '\nপরীক্ষার ইতিহাস (নতুন→পুরনো):\n' + hist.join('\n');
      const lastEx = exSorted()[0];
      if (lastEx) { try { const lt2 = Number(lastEx && (lastEx.totalQuestions ?? 0)) || 0; out += '\nশেষ পরীক্ষা (সর্বশেষ-নিশ্চিত, অন্য তারিখ বলা নিষিদ্ধ): ' + dateStr(lastEx && ((lastEx.completedAt ?? lastEx.at) || Date.now())) + ' — ' + bn(lastEx && (lastEx.correctCount ?? 0)) + '/' + bn(lt2) + (lastEx && lastEx.mode ? ' (' + String(lastEx.mode).slice(0, 10) + ')' : ''); } catch (_) {} }
      out += '\nঅ্যাক্টিভিটি: মোট পরীক্ষা ' + bn((c.examResults || []).length) + ' · ভুল-নোট ' + bn((c.mistakes || []).length) + ' · শব্দ ' + bn((c.vocabulary || []).length);
      const hits = bankMatch(userText);
      if (hits.length) out += '\nতোমার ব্যাংক থেকে মিলে-যাওয়া প্রশ্ন (উত্তরসহ — উত্তরের প্রধান ভিত্তি এগুলো):\n' + hits.map(h => { const opts = Array.isArray(h.q.options) ? h.q.options : []; const ai = Number(h.q.answerIndex ?? h.q.answer ?? h.q.correctAnswerIndex); const ans = typeof h.q.answer === 'string' && h.q.answer ? h.q.answer : (Number.isFinite(ai) && opts[ai] != null ? String(opts[ai]) : ''); return '— ' + String(h.q.question ?? h.q.q).slice(0, 120) + (ans ? ' ⇒ উত্তর: ' + ans.slice(0, 40) : ''); }).join('\n').slice(0, 900);
      const weakTop = bankStats().weak || [];
      if (weakTop.length) out += '\nদুর্বল-টপিক (ভুলের হিসাব): ' + weakTop.slice(0, 6).join(', ');
      const misRec = (c.mistakes || []).slice(-5).map(m => { try { const raw = m && (m.q && typeof m.q === 'object' ? m.q : qs.find(x => x && x.id === (m.questionId || (m.q || {}).id))); if (!raw) return ''; const opts = Array.isArray(raw.options) ? raw.options : []; const ai2 = Number(raw.answerIndex ?? raw.answer ?? raw.correctAnswerIndex); const ans = typeof raw.answer === 'string' && raw.answer ? raw.answer : (Number.isFinite(ai2) && opts[ai2] != null ? String(opts[ai2]) : ''); return String((raw.question ?? raw.q) || '').slice(0, 70) + ' ⇒ সঠিক: ' + ans.slice(0, 30); } catch (_) { return ''; } }).filter(Boolean);
      if (misRec.length) out += '\nসাম্প্রতিক ভুল (সঠিক-উত্তরসহ):\n' + misRec.join('\n');
      const vocRec = vocPick().slice(-6).map(v => { try { return String((v && (v.word ?? v.w)) || '').slice(0, 30) + (v && v.meaning ? '=' + String(v.meaning).slice(0, 40) : ''); } catch (_) { return ''; } }).filter(Boolean);
      if (vocRec.length) out += '\nশব্দ-সংগ্রহ: ' + bn(vocPick().length) + 'টি — সাম্প্রতিক: ' + vocRec.join(', ');
      const coachN = (() => { try { return JSON.parse(localStorage.getItem('saiCoachNote') || 'null'); } catch (_) { return null; } })();
      if (coachN && coachN.total) out += '\nশেষ চ্যাট-পরীক্ষা (কোচ-নোট): ' + dateStr(coachN.at || Date.now()) + ' — ' + bn(coachN.score) + '/' + bn(coachN.total) + (Array.isArray(coachN.weak) && coachN.weak.length ? ' — দুর্বল: ' + coachN.weak.slice(0, 4).join(', ') : '');
      const lines = [];
      listChats().filter(ch => ch.id !== curId()).slice(0, 5).forEach(ch => {
        const ms = msgsOf(ch.id).filter(m => m.text).slice(-4);
        if (ms.length) lines.push('— ' + String(ch.title || 'চ্যাট').slice(0, 30) + ': ' + ms.map(m => (m.who === 'me' ? 'ইউজার' : 'AI') + ': ' + String(m.text).slice(0, 110)).join(' § '));
      });
      if (lines.length) out += '\nআগের চ্যাটের স্মৃতি:\n' + lines.join('\n').slice(0, 1200);
      return out.slice(0, 4800);
    } catch (_) { return ''; }
  };
  const fastAvailable = () => keyList(cfg().provider).length > 0;
  const gemSources = d => { try { const ch = (d.candidates?.[0]?.groundingMetadata?.groundingChunks || []).map(c => { try { return String(new URL(c.web.uri).hostname).replace(/^www\./, ''); } catch (_) { return ''; } }).filter(Boolean); return [...new Set(ch)].slice(0, 4); } catch (_) { return []; } };
  const shrinkB64 = b64 => new Promise(res => {
    try {
      const cv = document.createElement('canvas');
      if (!cv.getContext || !cv.getContext('2d')) { res(b64); return; }
      const im = new Image();
      const to = setTimeout(() => res(b64), 3000);
      im.onload = () => { clearTimeout(to); try { const k = Math.min(1, 720 / Math.max(im.width || 1, im.height || 1)); const cv2 = document.createElement('canvas'); cv2.width = Math.max(1, Math.round((im.width || 1) * k)); cv2.height = Math.max(1, Math.round((im.height || 1) * k)); cv2.getContext('2d').drawImage(im, 0, 0, cv2.width, cv2.height); res(cv2.toDataURL('image/jpeg', 0.82).split(',')[1] || b64); } catch (_) { res(b64); } };
      im.onerror = () => { clearTimeout(to); res(b64); };
      im.src = 'data:image/png;base64,' + b64;
    } catch (_) { res(b64); }
  });
  const askFast = async (question, atts, abortRef) => {
    const ctl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    if (abortRef && ctl) { const iv = setInterval(() => { if (abortRef.aborted) { try { ctl.abort(); } catch (_) {} clearInterval(iv); } }, 400); setTimeout(() => clearInterval(iv), 240000); }
    const c = cfg(); const key = keyList(c.provider)[0] || '';
    if (!key) throw new Error('Settings-এ key নেই — 🌐 এজেন্ট মোড়ে পাঠাও বা key বসাও');
    const list = Array.isArray(atts) ? atts : [];
    const brain = buildBrain(question); // v129: ইউজার-নির্দেশ — যেকোনো মডেল (Gemini/OpenRouter/HF/Groq) সব-ডেটা পাবে
    // 🎨 ছবি-আঁকা — যেকোনো ইঞ্জিন থেকে Gemini-ইমেজ-মডেলে
    if (/(ছবি|চিত্র)[^\n.]{0,26}(বানাও|আঁকো|আঁকা|তৈরি|জেনারেট)|(বানাও|আঁকো)[^\n.]{0,20}ছবি|(generate|create|draw)[^\n.]{0,16}(image|picture)|^\/img/i.test(question)) {
      // v130: ছবি-চেইন — ① Gemini ② Hugging Face FLUX.1-schnell ③ OpenRouter Images (OR/HF = সেরা-ছবি-বিশেষজ্ঞ)
      const gk = keyList('gemini')[0];
      if (gk) {
        const gd = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent', Object.assign({ method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': gk }, body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'Generate an image: ' + question }] }] }) }, ctl ? { signal: ctl.signal } : {})).then(r => r.json()).catch(() => ({}));
        const gparts = (gd?.candidates?.[0]?.content?.parts || []);
        const gimg = gparts.find(pp => pp.inline_data && pp.inline_data.data);
        const gcap = gparts.filter(pp => pp.text).map(pp => pp.text).join(' ').slice(0, 180);
        if (gimg) return { text: gcap || 'ছবি তৈরি হয়েছে ✨', img: (await shrinkB64(String(gimg.inline_data.data))) || undefined };
      }
      const hk = keyList('hf')[0];
      if (hk) {
        const hres = await fetch('https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell', Object.assign({ method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + hk }, body: JSON.stringify({ inputs: String(question).slice(0, 400) }) }, ctl ? { signal: ctl.signal } : {}));
        if (hres.ok) {
          const buf = await hres.arrayBuffer(); let bin = ''; const u8 = new Uint8Array(buf);
          for (let i = 0; i < u8.length; i += 8192) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 8192));
          return { text: 'ছবি তৈরি হয়েছে ✨ (HF FLUX)', img: (await shrinkB64(btoa(bin))) || undefined };
        }
      }
      const orK = keyList('openrouter')[0];
      if (orK) {
        const od = await fetch('https://openrouter.ai/api/v1/images', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + orK, 'HTTP-Referer': 'https://sheikhrashel47-stack.github.io/admission-hub/', 'X-Title': 'Admihub' }, body: JSON.stringify({ model: 'google/gemini-2.5-flash-image', prompt: String(question).slice(0, 400) }) }).then(r => r.json()).catch(() => ({}));
        const ob64 = od && od.data && od.data[0] && od.data[0].b64Json;
        if (ob64) return { text: 'ছবি তৈরি হয়েছে ✨ (OpenRouter)', img: (await shrinkB64(String(ob64))) || undefined };
      }
      throw new Error('ছবি আঁকতে অন্তত একটা key দরকার 🎨 — ⚙️ সেটিংসে Gemini/Hugging Face key বসাও');
    }
    const imgs = list.filter(a => a.kind === 'image'), txts = list.filter(a => a.kind === 'text');
    const qText = question + txts.map(a => `\n\n📎 "${a.name}" ফাইলের বিষয়বস্তু:\n${(a.text || '').slice(0, 9000)}`).join('');
    if (c.provider === 'gemini') {
      const gKeys = keyList('gemini');
      const gModels = [...new Set([c.model || 'gemini-3.6-flash', 'gemini-3.1-flash-lite', 'gemini-3-flash-preview'])];
      const histParts = msgsOf(curId()).filter(m => m.text).slice(-8).map(m => ({ role: m.who === 'ai' ? 'model' : 'user', parts: [{ text: m.text }] }));
      if (histParts.length) histParts[histParts.length - 1] = { role: 'user', parts: [{ text: qText }, ...imgs.filter(i => i.data).map(i => ({ inline_data: { mime_type: i.mime || 'image/jpeg', data: i.data } }))] };
      else histParts.push({ role: 'user', parts: [{ text: qText }, ...imgs.filter(i => i.data).map(i => ({ inline_data: { mime_type: i.mime || 'image/jpeg', data: i.data } }))] });
      const gCall = (model, useTools, k) => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, Object.assign({ method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': k }, body: JSON.stringify(Object.assign({ system_instruction: { parts: [{ text: sysPrompt() + (brain ? '\n\n' + brain : '') }] }, contents: histParts, generationConfig: { temperature: 0.5, maxOutputTokens: 2048 } }, useTools ? { tools: [{ google_search: {} }] } : {})) }, ctl ? { signal: ctl.signal } : {}));
      let lastMsg = '', lastStatus = 0;
      for (const k of gKeys) {
        for (const model of gModels) {
          let res = await gCall(model, true, k);
          let d = await res.json().catch(() => ({}));
          // গ্রাউন্ডিং (google_search) কোটা/প্ল্যানে না চললে টুল-ছাড়া পুনঃপ্রচেষ্টা — উত্তর তো আসবেই
          if (!res.ok) { res = await gCall(model, false, k); d = await res.json().catch(() => ({})); }
          if (!res.ok) {
            lastMsg = String(d?.error?.message || ('HTTP ' + res.status)); lastStatus = res.status;
            if (ctl && ctl.signal && ctl.signal.aborted) throw new Error('aborted');
            continue; // এই key/মডেল ভিড়াল/কোটা-শেষ → পরের কম্বিনেশন
          }
          const text = String((d.candidates?.[0]?.content?.parts || []).map(pp => pp.text || '').join('')).trim();
          return { text: text || 'উত্তর পাইনি — আবার লেখো?', sources: gemSources(d) };
        }
      }
      // সব Gemini-পথ শুকনো → OpenRouter আছে? তাহলে স্পষ্ট-ঘোষণাসহ ফলব্যাক (চুপচাপ নয়)
      const orKey = keyList('openrouter')[0];
      if (orKey) {
        const orChain = ['openrouter/auto', 'deepseek/deepseek-chat', 'meta-llama/llama-3.3-70b-instruct:free'];
        const omsgs = [{ role: 'system', content: sysPrompt() + (brain ? '\n\n' + brain : '') }, ...msgsOf(curId()).filter(m => m.text).slice(-8).map(m => ({ role: m.who === 'ai' ? 'assistant' : 'user', content: m.text }))].slice(0, 9);
        let orLast = '';
        for (const om of orChain) {
          const ores = await fetch('https://openrouter.ai/api/v1/chat/completions', Object.assign({ method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json', Authorization: 'Bearer ' + orKey, 'HTTP-Referer': 'https://sheikhrashel47-stack.github.io/admission-hub/', 'X-Title': 'Admihub' }, {}), body: JSON.stringify({ model: om, models: orChain, messages: omsgs, temperature: 0.5, max_tokens: 1024 }) }, ctl ? { signal: ctl.signal } : {}));
          const od = await ores.json().catch(() => ({}));
          if (!ores.ok) { orLast = od?.error?.message || 'HTTP ' + ores.status; if (ctl && ctl.signal && ctl.signal.aborted) throw new Error('aborted'); continue; }
          const otext = String(od.choices?.[0]?.message?.content || '').trim();
          if (otext) { if (window.toast) window.toast('⚡ Gemini ব্যস্ত ছিল — OpenRouter দিয়ে উত্তর দিলাম'); return { text: otext, sources: ['⚡ Gemini-ভিড় → OpenRouter ফলব্যাক'] }; }
        }
      }
      throw new Error(/high demand/i.test(lastMsg) ? 'Gemini-র সার্ভার এখন ভিড়াল 😵 — একটু পরে আবার পাঠাও, বা ইঞ্জিন বদলাও' : (lastStatus === 429 ? 'Gemini-র ফ্রি-কোটা শেষ — ১ মিনিট পরে আবার' : (lastMsg || 'Gemini এখন উত্তর দিচ্ছে না — একটু পরে আবার')));
    }
    const pv = c.provider;
    const base = pv === 'groq' ? 'https://api.groq.com/openai/v1/chat/completions' : pv === 'openrouter' ? 'https://openrouter.ai/api/v1/chat/completions' : 'https://router.huggingface.co/v1/chat/completions';
    const model = c.model || ({ groq: 'llama-3.3-70b-versatile', openrouter: 'openrouter/auto', hf: 'meta-llama/Llama-3.1-8B-Instruct' }[pv] || 'llama-3.3-70b-versatile');
    const modelChain = pv === 'openrouter' ? [...new Set([model, 'deepseek/deepseek-chat', 'meta-llama/llama-3.3-70b-instruct:free'])] : [...new Set([model, { groq: 'llama-3.1-8b-instant', hf: 'meta-llama/Llama-3.3-70B-Instruct' }[pv]].filter(Boolean))];
    const extraH = pv === 'openrouter' ? { 'HTTP-Referer': 'https://sheikhrashel47-stack.github.io/admission-hub/', 'X-Title': 'Admihub' } : {};
    if (imgs.length) {
      const vmodel = c.model || VL_DEFAULT[pv];
      if (!vmodel) throw new Error('এই ইঞ্জিনে ছবি পড়া যায় না — Gemini বা OpenRouter নির্বাচন করো');
      const content = [{ type: 'text', text: qText }, ...imgs.filter(i => i.data).map(i => ({ type: 'image_url', image_url: { url: 'data:' + (i.mime || 'image/jpeg') + ';base64,' + i.data } }))];
      const vmsgs = [{ role: 'system', content: sysPrompt() }, ...msgsOf(curId()).filter(m => m.text).slice(-6).map(m => ({ role: m.who === 'ai' ? 'assistant' : 'user', content: m.text })), { role: 'user', content }];
      const vbody = { model: vmodel, messages: vmsgs, temperature: 0.5, max_tokens: 1024 };
      if (pv === 'openrouter' && !c.model) vbody.models = [vmodel, 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free'];
      const vres = await fetch(base, Object.assign({ method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json', Authorization: 'Bearer ' + key }, extraH), body: JSON.stringify(vbody) }, ctl ? { signal: ctl.signal } : {}));
      const vd = await vres.json().catch(() => ({}));
      if (!vres.ok) throw new Error(vres.status === 429 ? 'এই ভিশন-মডেলের কোটা এখন শেষ — একটু পরে আবার' : (vd?.error?.message || 'ছবি-বিশ্লেষণে সমস্যা (HTTP ' + vres.status + ')'));
      return { text: String(vd.choices?.[0]?.message?.content || '').trim() || 'ছবি দেখতে পারলাম না — আবার পাঠাও?', sources: [] };
    }
    const msgs = [{ role: 'system', content: sysPrompt() + (brain ? '\n\n' + brain : '') }, ...msgsOf(curId()).filter(m => m.text).slice(-8).map((m, i, arr) => ({ role: m.who === 'ai' ? 'assistant' : 'user', content: i === arr.length - 1 ? qText : m.text }))].slice(0, 9);
    let lastD = {}, lastStatus = 0;
    for (const model of modelChain) {
      const res = await fetch(base, Object.assign({ method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json', Authorization: 'Bearer ' + key }, extraH), body: JSON.stringify(pv === 'openrouter' ? { model, models: modelChain, messages: msgs, temperature: 0.5, max_tokens: 1024 } : { model, messages: msgs, temperature: 0.5, max_tokens: 1024 }) }, ctl ? { signal: ctl.signal } : {}));
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { lastD = d; lastStatus = res.status; if (ctl && ctl.signal && ctl.signal.aborted) throw new Error('aborted'); continue; }
      return { text: String(d.choices?.[0]?.message?.content || '').trim() || 'উত্তর পাইনি — আবার লেখো?', sources: [] };
    }
    throw new Error(lastStatus === 429 ? 'এই provider-এর ফ্রি-কোটা এখন শেষ — ১ মিনিট পরে আবার' : (lastD?.error?.message || 'HTTP ' + lastStatus));
  };
  // 🔑 key-টেস্ট: আসলে কাজ করে কি না, কোন মডেল, লিমিট-হিন্ট — সেটিংস-পেজে দেখায়
  const testKey = async () => {
    const c = cfg(); const list = keyList(c.provider);
    if (!list.length) { state.keyTest = { ok: false, msg: 'আগে key বসাও, তারপর টেস্ট' }; paint(); return; }
    state.keyTest = { ok: null, msg: 'টেস্ট হচ্ছে…' }; paint();
    let good = 0, lastErr = '';
    const one = async k => {
      if (c.provider === 'gemini') {
        const model = c.model || 'gemini-3.6-flash';
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': k }, body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'ok?' }] }], generationConfig: { maxOutputTokens: 8 } }) });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(d?.error?.message || 'HTTP ' + res.status);
      } else {
        const base = c.provider === 'groq' ? 'https://api.groq.com/openai/v1/models' : c.provider === 'openrouter' ? 'https://openrouter.ai/api/v1/models' : 'https://router.huggingface.co/v1/models';
        const res = await fetch(base, { headers: { Authorization: 'Bearer ' + k } });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(d?.error?.message || 'HTTP ' + res.status);
      }
    };
    for (const k of list) { try { await one(k); good++; } catch (e) { lastErr = String(e?.message || e); } }
    if (!good) { state.keyTest = { ok: false, msg: '✗ ' + (lastErr || 'কোনো key-ই কাজ করছে না').slice(0, 110) }; paint(); return; }
    const hint = c.provider === 'gemini' ? ' · ফ্রি-লিমিট হিন্ট: Flash ~১৫/মিনিট, ~১০০০+/দিন' : '';
    state.keyTest = { ok: true, msg: `✓ কাজ করছে · ${bn(good)}/${bn(list.length)}টি key ঠিক${list.length > 1 ? ' — একটা আটকালে পরেরটা নিজে থেকেই চলবে' : ''}${hint}` };
    paint();
  };

  // ── UI ───────────────────────────────────────────────────────────────────────
  const sourceLabel = () => { const s = state.source; if (!s || s === 'auto') return '🌐 ওয়েব + আমার ব্যাংক'; if (s === 'bank') return '📚 শুধু আমার ব্যাংক'; return '📚 ' + decodeURIComponent(String(s).slice(5)); };
  // ── 🖋 OUTPUT RENDERER — নিরাপদ মিনি-markdown (escape-আগে, তারপর সীমিত ট্রান্সফর্ম) ──
  const mdInline = t => t
    .replace(/`([^`\n]{1,160})`/g, '<code class="sai-code-i">$1</code>')
    .replace(/\[([^\]\n]{1,80})\]\((https?:\/\/[^)\s]{1,200})\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\*\*([^*\n]{1,300})\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])\*([^*\n]{1,200})\*(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>');
  const md = raw => {
    try {
      let t = String(raw || '').slice(0, 24000).replace(/\r/g, '');
      const codes = [];
      t = t.replace(/```([a-z]*)\n?([\s\S]{0,8000}?)```/g, (_, lang, code) => { codes.push({ lang, code: code.replace(/\n$/, '') }); return '\u0000C' + (codes.length - 1) + '\u0000'; });
      const esc0 = t.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
      const lines = esc0.split('\n'); const out = []; let list = null, table = null;
      const closeList = () => { if (list) { out.push(`<${list.t}>` + list.items.map(x => `<li>${mdInline(x)}</li>`).join('') + `</${list.t}>`); list = null; } };
      const closeTable = () => { if (table) { const head = table[0]; const body = table.slice(1).filter(r => !/^[\s|:-]+$/.test(r.join('|'))); out.push('<div class="sai-tblwrap"><table class="sai-tbl">' + head.map(h => `<th>${mdInline(h)}</th>`).join('') + body.slice(0, 40).map(r => '<tr>' + head.map((_, i2) => `<td>${mdInline((r[i2] || '').slice(0, 400))}</td>`).join('') + '</tr>').join('') + '</table></div>'); table = null; } };
      for (const ln of lines) {
        const tl = ln.trim();
        if (/^\|(.+)\|$/.test(tl)) { closeList(); table = table || []; table.push(tl.slice(1, -1).split('|').map(c2 => c2.trim())); continue; }
        closeTable();
        if (!tl) { closeList(); continue; }
        if (/^(-{3,}|_{3,})$/.test(tl)) { closeList(); out.push('<hr class="sai-hr">'); continue; }
        const hm = tl.match(/^(#{1,4})\s+(.{1,300})$/);
        if (hm) { closeList(); out.push(`<div class="sai-h sai-h${Math.min(4, hm[1].length) + 1}">${mdInline(hm[2])}</div>`); continue; }
        const bm = tl.match(/^[-*•]\s+(.{1,600})$/);
        if (bm) { if (!list || list.t !== 'ul') { closeList(); list = { t: 'ul', items: [] }; } list.items.push(bm[1]); continue; }
        const nm = tl.match(/^\d{1,2}[.)]\s+(.{1,600})$/);
        if (nm) { if (!list || list.t !== 'ol') { closeList(); list = { t: 'ol', items: [] }; } list.items.push(nm[1]); continue; }
        if (/^>\s?/.test(tl)) { closeList(); out.push(`<blockquote class="sai-quote">${mdInline(tl.replace(/^>\s?/, ''))}</blockquote>`); continue; }
        closeList();
        out.push(`<p class="sai-p">${mdInline(tl)}</p>`);
      }
      closeList(); closeTable();
      let html = out.join('');
      html = html.replace(/\u0000C(\d+)\u0000/g, (_, i2) => { const c3 = codes[Number(i2)] || { code: '' }; return `<div class="sai-codeblk"><small>${esc(c3.lang || 'code')}</small><pre>${c3.code.replace(/[&<>]/g, cc => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[cc])).slice(0, 4000)}</pre></div>`; });
      // MCQ-কার্ড: কমপক্ষে ৩টি অপশন-লাইন এক ব্লকে → সুন্দর কার্ড; সঠিক-উত্তর+ব্যাখ্যা হাইলাইট
      html = html.replace(/(?:<p class="sai-p">\s*[([]?(?:ক|খ|গ|ঘ|a|b|c|d|A|B|C|D)[).][^<]{1,240}<\/p>\s*){3,}/g, blk => `<div class="sai-mcq">${blk.replace(/sai-p/g, 'sai-opt')}</div>`);
      html = html.replace(/<p class="sai-p">\s*((?:✓|✔|সঠিক উত্তর|সঠিকঃ|সঠিক)\s*[:：]?\s*[^<]{0,160})<\/p>/g, '<div class="sai-ansline">✓ $1</div>');
      html = html.replace(/<p class="sai-p">\s*(ব্যাখ্যা\s*[:：]\s*[^<]{0,900})<\/p>/g, '<div class="sai-explain">$1</div>');
      html = html.replace(/<p class="sai-p">\s*((?:💡|⚠️|সারসংক্ষেপ|সারমর্ম)\s*[:：]?\s*[^<]{0,600})<\/p>/g, '<div class="sai-callout">$1</div>');
      return html;
    } catch (_) { return `<p class="sai-p">${esc(String(raw || '').slice(0, 2000)).replace(/\n/g, '<br>')}</p>`; }
  };
  const msgHash = m => [m.text || '', m.status || '', (m.sources || []).length, (m.steps || []).length, (m.atts || []).length, m.fb || '', m.errText || '', m.phase || ''].join('§').length + '·' + (m.text || '').length + '·' + m.status;
  const timeBn = ts => { try { const d2 = new Date(ts); let h = d2.getHours(); const mm = String(d2.getMinutes()).padStart(2, '0'); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return `${h}:${mm} ${ap}`; } catch (_) { return ''; } };
  const actRow = (m, prev) => {
    const acts = [];
    if (m.who === 'me') { acts.push(`<button class="sai-act" onclick="StudyAiTool.copyMsg('${m.id}')">📋 Copy</button>`, `<button class="sai-act" onclick="StudyAiTool.editMsg('${m.id}')">✏️ Edit</button>`); }
    else if (m.status === 'completed' && m.text) { acts.push(`<button class="sai-act" onclick="StudyAiTool.copyMsg('${m.id}')">📋 Copy</button>`, `<button class="sai-act" onclick="StudyAiTool.regenerate('${m.id}')">🔄 Regenerate</button>`, `<button class="sai-act ${m.fb === 'good' ? 'on' : ''}" onclick="StudyAiTool.rate('${m.id}','good')">👍</button>`, `<button class="sai-act ${m.fb === 'bad' ? 'on' : ''}" onclick="StudyAiTool.rate('${m.id}','bad')">👎</button>`); }
    else if (m.status === 'error') { acts.push(`<button class="sai-act retry" onclick="StudyAiTool.retryMsg('${m.id}')">⚠️ Retry</button>`); }
    if (prev && prev.who === 'me') return `<div class="sai-actions">${acts.join('')}</div>`;
    return acts.length ? `<div class="sai-actions">${acts.join('')}</div>` : '';
  };
  const bubbleHTML = m => {
    const atts = (m.atts || []).map(a => a.kind === 'image' && (a.view || a.thumb) ? `<img class="sai-att" src="${a.view || a.thumb}" alt="${esc(a.name)}" onclick="StudyAiTool.viewer('${m.id}');event.stopPropagation()" role="button" aria-label="ছবি বড় করে দেখো">` : `<span class="sai-attfile">📄 ${esc(a.name)}</span>`).join('');
    let inner = '';
    if (m.who === 'ai' && !m.text && (m.status === 'pending' || m.status === 'streaming')) {
      inner = `<div class="sai-typing"><span class="sai-orb"><b></b><b></b></span><div class="sai-wait">${m.phase === 'run' ? '🤖 ' : '🌐 '}<span class="sai-shimmer">${m.phase === 'run' ? 'এজেন্ট কাজ করছে…' : 'চিন্তা করছি…'}</span><br><small>${m.steps && m.steps.length ? 'ধাপ ' + bn(m.steps.length) + ' সম্পন্ন' : 'সাধারণত ১০ সেকেন্ড–২ মিনিট'}</small></div></div>`;
      if (m.steps && m.steps.length) inner += `<details class="sai-activity"><summary>▸ Agent activity <span class="muted">${bn(m.steps.length)} ধাপ</span></summary>${m.steps.map(st => `<div class="sai-step">✓ ${esc(st)}</div>`).join('')}</details>`;
    } else if (m.status === 'error') {
      inner = `<div class="sai-errbubble">⚠️ ${esc(m.errText || 'কিছু একটা সমস্যা হয়েছে')}</div>`;
    } else if (m.status === 'cancelled') {
      inner = `<div class="sai-cancelbubble">⏹ Generation stopped</div>`;
    } else {
      inner = `${m.img ? `<img class="sai-att" style="width:100%;max-width:340px;border-radius:14px;display:block;margin-bottom:8px" src="data:image/jpeg;base64,${m.img}" alt="তৈরি করা ছবি">` : ''}<div class="sai-md">${md(m.text)}</div>${m.sources && m.sources.length ? `<div class="sai-src">🔗 ${m.sources.map(esc).join(' · ')}</div>` : ''}`;
      if (m.steps && m.steps.length && m.status === 'completed') inner += `<details class="sai-activity"><summary>▸ Agent activity <span class="muted">${bn(m.steps.length)} ধাপ</span></summary>${m.steps.map(st => `<div class="sai-step">✓ ${esc(st)}</div>`).join('')}</details>`;
      if (m.exam) inner += m.exam;
      if (m.fb === 'good') inner += `<div class="sai-fbnote">দারুণ — ধন্যবাদ! 🌱</div>`;
      if (m.fb === 'bad') inner += `<div class="sai-fbnote">জানালোর জন্য ধন্যবাদ — পরেরবার আরও ভালো করবো 🙏</div>`;
    }
    return `${atts}<div class="sai-bubble">${inner}<span class="sai-meta">${timeBn(m.ts)}${m.who === 'me' && m.status === 'completed' ? ' ✓✓' : ''}</span></div>`;
  };
  const bubbleOuter = (m, prev) => `<div class="sai-row ${m.who}" data-mid="${m.id}" data-h="${esc(msgHash(m))}">${bubbleHTML(m)}${actRow(m, prev)}</div>`;
  const shareCard = () => localStorage.getItem(LS_SHARED) === '1' ? '' : `<div class="card sai-share"><b>📊 এজেন্টকে তোমার সব ডেটা দাও?</b><p class="muted" style="margin:6px 0 10px">অ্যাপ পাঠাবে <b>সম্পূর্ণ প্রশ্নব্যাংক + পরীক্ষার ইতিহাস + প্রগ্রেস</b> — এজেন্টের নিজের ডাটাবেসে সেভ থাকবে। এরপর সে তোমার ব্যাংক থেকেই প্রশ্নের উত্তর দেবে। (এই কার্ড আর আসবে না; Settings-থেকে যখন খুশি আপডেট করা যাবে)</p><button class="btn" onclick="StudyAiTool.shareData()">✅ সব ডেটা পাঠাও</button><button class="btn ghost sm" style="margin-left:8px" onclick="StudyAiTool.skipShare()">পরে</button></div>`;
  const CHIPS = ['আজ কী পড়বো?', 'দুর্বল টপিক বলো', '৭ দিনের রিভিশন প্ল্যান', 'GK কুইজ দাও'];

  const landing = () => {
    const synced = localStorage.getItem(LS_BANK);
    const ghost = localStorage.getItem(LS_SHARED) === '1' && !synced;
    return `<div class="sai-landing">${ghost ? '<button class="sai-ghostbtn" onclick="StudyAiTool.shareData()">⚠️ ডেটা এখনো এজেন্টের কাছে পৌঁছায়নি — 📚 এখনই পাঠাও</button>' : ''}<div class="sai-logo"><span>🤖</span><i>✨</i></div><div class="sai-hello">হ্যালো, <b class="sai-name" onclick="StudyAiTool.editName()">${esc(nameOf())}</b>!</div><div class="sai-sub">আজ তোমাকে কীভাবে সাহায্য করবো?</div>${shareCard()}${synced ? `<div class="sai-memok">📚 মেমোরি: ${bn(new Date(Number(synced)).getDate())} তারিখে ${bn('…') || ''}ব্যাংক সেভ আছে · Settings-এ আপডেট করো</div>` : ''}<div class="sai-note">🌐 ব্রাউজার-এজেন্ট সত্যিই ওয়েব ঘেঁটে যাচাই করে উত্তর দেয় — সাধারণত ১০ সেকেন্ড–৩ মিনিট, কাজ বড় হলে বেশি</div></div>`;
  };


  const sheet = () => {
    if (state.viewer) { const v = state.viewer; return `<div class="sai-viewer" role="dialog" aria-label="ছবি ভিউয়ার"><button class="sai-vclose" onclick="StudyAiTool.viewerClose()" aria-label="বন্ধ">✕</button>${v.list.length > 1 ? `<button class="sai-vnav prev" onclick="StudyAiTool.viewerNav(-1)" aria-label="আগের ছবি">‹</button>` : ''}<img class="sai-vimg" src="${v.list[v.i]}" alt="সংযুক্ত ছবি" onclick="this.classList.toggle('zoom')">${v.list.length > 1 ? `<button class="sai-vnav next" onclick="StudyAiTool.viewerNav(1)" aria-label="পরের ছবি">›</button><div class="sai-vcount">${bn(v.i + 1)}/${bn(v.list.length)}</div>` : ''}</div>`; }
    if (state.sheet === 'engine') {
      const c = cfg();
      const item = (on, lbl, sub, fn, gold) => `<button class="sai-sheet-item ${on ? 'on' : ''}" onclick="${fn}"><span>${gold ? '⚡' : '🌐'}</span> ${lbl}<small>${sub}</small></button>`;
      return `<div class="sai-sheet-bg" onclick="StudyAiTool.closeSheet()"><div class="sai-sheet" onclick="event.stopPropagation()"><div class="sai-sheet-grip"></div><h3>কে উত্তর দেবে?</h3><div class="sai-sheet-list">
        ${item(c.engine === 'agent', '🌐 ব্রাউজার এজেন্ট', 'ওয়েব ঘেঁটে যাচাই করা উত্তর', "StudyAiTool.setEngine('agent')")}
        ${item(c.engine === 'fast' && c.provider === 'gemini', '⚡ Gemini', keyList('gemini').length ? 'তোমার key-তে চলছে' : 'key নেই — সেটিংসে বসাও', "StudyAiTool.pickEngine('gemini')", true)}
        ${item(c.engine === 'fast' && c.provider === 'groq', '⚡ Groq', keyList('groq').length ? 'তোমার key-তে চলছে' : 'key নেই', "StudyAiTool.pickEngine('groq')", true)}
        ${item(c.engine === 'fast' && c.provider === 'openrouter', '⚡ OpenRouter', keyList('openrouter').length ? 'তোমার key-তে চলছে' : 'key নেই', "StudyAiTool.pickEngine('openrouter')", true)}
        ${item(c.engine === 'fast' && c.provider === 'hf', '⚡ Hugging Face', keyList('hf').length ? 'তোমার key-তে চলছে' : 'key নেই', "StudyAiTool.pickEngine('hf')", true)}
      </div></div></div>`;
    }
    if (state.sheet === 'menu') {
      const c = cfg();
      const drow = (ico, lbl, sub, fn) => `<button class="sai-drow" onclick="${fn}"><span class="sai-dico">${ico}</span><span class="sai-dtx"><b>${lbl}</b>${sub ? `<small>${sub}</small>` : ''}</span></button>`;
      const chats = listChats();
      return `<div class="sai-drawer-bg" onclick="StudyAiTool.closeSheet()"><aside class="sai-drawer" onclick="event.stopPropagation()" role="dialog" aria-label="মেনু">
        <div class="sai-dhead"><b>${engTitle()}</b><button class="sai-dclose" onclick="StudyAiTool.closeSheet()" aria-label="বন্ধ">✕</button></div>
        <div class="sai-dscroll">
          ${drow('🏠', 'ড্যাশবোর্ডে ফেরি', 'মূল অ্যাপে ফিরে যাও', "StudyAiTool.closeSheet();navigate('dashboard')")}
          ${drow('📝', 'চ্যাটে পরীক্ষা', '৫-প্রশ্নের ফ্ল্যাশ-টেস্ট — স্কোর ইতিহাসে সেভ হবে', "StudyAiTool.closeSheet();StudyAiTool.startChatExam()")}
          ${drow('✏️', 'নতুন চ্যাট', 'একদম শূন্য থেকে', "StudyAiTool.newChat()")}
          ${drow('⊕', 'সোর্স', 'AI কোথা থেকে উত্তর দেবে', "StudyAiTool.openSheet('source')")}
          ${drow('⚡', 'ইঞ্জিন', 'এখন উত্তর দিচ্ছে: ' + (ENG_LABEL[c.provider] || 'Admihub AI'), "StudyAiTool.openSheet('engine')")}
          ${drow('💬', 'সব চ্যাট', bn(chats.length) + 'টি ব্রাঞ্চ', "StudyAiTool.openSheet('chats')")}
          ${drow('✏️', 'চ্যাটের নাম বদলাও', esc(chatTitle()), "StudyAiTool.renameChat()")}
          ${drow('🧹', 'এই কথোপকথন মুছি', 'শুরু থেকে ফাঁকা', "StudyAiTool.clearCurrent()")}
          <div class="sai-dsec">সাম্প্রতিক</div>
          ${chats.slice(0, 8).map(ch => `<div class="sai-drow ${ch.id === curId() ? 'on' : ''}" onclick="StudyAiTool.openChat('${ch.id}')"><span class="sai-dico">🗨️</span><span class="sai-dtx"><b>${esc(ch.title)}</b><small>${dateStr(ch.at)}</small></span><b class="sai-del" onclick="event.stopPropagation();StudyAiTool.delChat('${ch.id}')">🗑</b></div>`).join('')}
        </div>
        <div class="sai-dfoot">${drow('⚙️', 'সেটিংস', 'key • ইঞ্জিন • থিম', "StudyAiTool.openSheet('settings')")}</div>
      </aside></div>`;
    }
    if (state.sheet === 'source') {
      const subs = (cache().subjects || []).map(s => ({ name: String(s.name || ''), n: (cache().questions || []).filter(q => q && q.subjectId === s.id).length })).sort((a, b) => b.n - a.n).filter(s => s.n > 0);
      return `<div class="sai-sheet-bg" onclick="StudyAiTool.closeSheet()"><div class="sai-sheet" onclick="event.stopPropagation()"><div class="sai-sheet-grip"></div><h3>AI কোন সোর্স থেকে উত্তর দেবে?</h3><div class="sai-sheet-list">
        <button class="sai-sheet-item ${!state.source || state.source === 'auto' ? 'on' : ''}" onclick="StudyAiTool.setSource('auto')"><span>🌐</span> ওয়েব + আমার ব্যাংক<small>${listChats().length ? '' : ''}সব ঘেঁটে সেরা উত্তর</small></button>
        <button class="sai-sheet-item ${state.source === 'bank' ? 'on' : ''}" onclick="StudyAiTool.setSource('bank')"><span>📚</span> শুধু আমার প্রশ্নব্যাংক<small>সেভ করা মেমোরি থেকে</small></button>
        ${subs.map(s => `<button class="sai-sheet-item ${state.source === 'bank:' + encodeURIComponent(s.name) ? 'on' : ''}" onclick="StudyAiTool.setSource('bank:${encodeURIComponent(s.name)}')"><span>📖</span> ${esc(s.name)}<small>${bn(s.n)}টি প্রশ্ন</small></button>`).join('')}
      </div></div></div>`;
    }
    if (state.sheet === 'chats') {
      return `<div class="sai-sheet-bg" onclick="StudyAiTool.closeSheet()"><div class="sai-sheet" onclick="event.stopPropagation()"><div class="sai-sheet-grip"></div><h3>চ্যাটসমূহ</h3><div class="sai-sheet-list">
        <button class="sai-sheet-item" onclick="StudyAiTool.newChat()"><span>＋</span> নতুন চ্যাট<small>আলাদা ব্রাঞ্চ</small></button>
        ${listChats().map(c => `<div class="sai-sheet-item ${c.id === curId() ? 'on' : ''}" onclick="StudyAiTool.openChat('${c.id}')"><span>💬</span> ${esc(c.title)}<small>${dateStr(c.at)}</small><b class="sai-del" onclick="event.stopPropagation();StudyAiTool.delChat('${c.id}')">🗑</b></div>`).join('')}
      </div></div></div>`;
    }
    return '';
  };

  const settingsPage = () => {
    const c = cfg();
    const bi = state.bankInfo;
    const syncErr = localStorage.getItem('studyAiSyncErr');
    const memLine = bi === null ? '<div class="muted" style="font-size:12.5px">📚 মেমোরি: দেখা হচ্ছে…</div>'
      : bi && bi.saved ? `<div class="sai-memok" style="display:inline-block">📚 এজেন্ট-মেমোরি: ${bn(bi.count)}টি প্রশ্ন সেভ ✓${bi.savedAt ? ' · ' + dateStr(bi.savedAt) : ''}</div>`
      : '<div class="sai-ghostbtn" style="display:inline-block;margin-top:6px">⚠️ এখনো কোনো ডেটা সেভ হয়নি — চ্যাট খুললে নিজে নিজে পাঠানোর চেষ্টা হবে, বা নিচের বাটনে চাপো</div>';
    const prov = (key, label) => { const kl = keyList(key); return `<div class="sai-setrow"><b>${label}</b>${kl.length > 1 ? `<span class="muted" style="font-size:11px">✓ ${bn(kl.length)}টি key — একটা আটকালে পরেরটা নিজে চলবে</span>` : ''}<textarea class="sai-keyta" rows="${Math.min(4, Math.max(1, kl.length))}" placeholder="key বসাও… (একাধিক হলে প্রতি লাইনে একটি)" onchange="StudyAiTool.setKey('${key}',this.value)">${esc(kl.join('\n'))}</textarea><div class="row" style="gap:6px"><button class="btn sm ${c.provider === key ? '' : 'ghost'}" onclick="StudyAiTool.setProvider('${key}')">${c.provider === key ? '✓ নির্বাচিত' : 'নাও'}</button>${kl.length ? `<button class="btn ghost sm" onclick="StudyAiTool.setKey('${key}','')">মুছি</button>` : ''}</div></div>`; };
    return `<div class="sai-settings-page">
      <div class="sai-sethead"><button class="sai-back2" onclick="StudyAiTool.closePage()" aria-label="ফিরে">←</button><b>⚙️ সেটিংস</b></div>
      <div class="sai-setwrap">
        <label class="flabel">উত্তর-ইঞ্জিন</label>
        <div class="filter-row" style="margin:6px 0 4px"><button class="chip ${c.engine === 'agent' ? 'active' : ''}" onclick="StudyAiTool.setEngine('agent')">🌐 ব্রাউজার এজেন্ট</button><button class="chip ${c.engine === 'fast' ? 'active' : ''}" onclick="StudyAiTool.setEngine('fast')">⚡ ফাস্ট (API key)</button></div>
        <div class="muted" style="font-size:11px;margin-bottom:12px">${c.engine === 'agent' ? 'সত্যিই ওয়েব ঘেঁটে যাচাই করে উত্তর দেয় — ১০ সেকেন্ড–৩ মিনিট (সবচেয়ে নির্ভরযোগ্য)' : 'সরাসরি API — দ্রুত; চালু হলে Gemini Google-সার্চ করে টাটকা তথ্য দেয় (কোটা না চললে সাধারণ উত্তর)'}</div>
        <label class="flabel">API Provider — যেকোনো সময় বসাও/মুছো/বদলাও</label>
        ${prov('gemini', 'Gemini (ফ্রি key: aistudio.google.com)')}
        ${prov('groq', 'Groq (console.groq.com)')}
        ${prov('openrouter', 'OpenRouter (openrouter.ai/keys)')}
        ${prov('hf', 'Hugging Face (hf.co/settings/tokens)')}
        <label class="flabel">মডেল (ঐচ্ছিক)</label><input type="text" placeholder="${c.provider === 'groq' ? 'llama-3.3-70b-versatile' : c.provider === 'openrouter' ? 'openrouter/auto' : c.provider === 'hf' ? 'meta-llama/Llama-3.1-8B-Instruct' : 'gemini-3.6-flash'}" value="${esc(c.model || '')}" onchange="StudyAiTool.setModel(this.value)">
        <div class="row" style="gap:8px;margin:10px 0 4px"><button class="btn secondary sm" onclick="StudyAiTool.testKey()">🔑 key-টেস্ট করো</button></div>
        ${state.keyTest ? `<div class="${state.keyTest.ok === true ? 'sai-memok' : state.keyTest.ok === false ? 'sai-ghostbtn' : 'muted'}" style="display:block;font-size:12px;margin-top:6px">${esc(state.keyTest.msg)}</div>` : ''}
        <label class="flabel" style="margin-top:18px">📤 আমার ডেটা → AI</label>
        <div class="sai-setrow"><b>সব ডেটা টাটকা রাখো</b><span class="muted" style="font-size:11.5px">প্রশ্নব্যাংক · পরীক্ষার ইতিহাস · প্রগ্রেস · অ্যাক্টিভিটি — ব্রাউজার-এজেন্টের ডাটাবেসে যায়, আর Gemini/OpenRouter প্রতি মেসেজে তাজা মেমোরি পায়। নতুন প্রশ্ন/পরীক্ষা হলে <b>নিজে নিজেই</b> আপডেট যাবে (~৯০ সেকেন্ডে)।</span>${state.bankInfo && state.bankInfo.saved ? `<span class="muted" style="font-size:11px">শেষ সিঙ্ক: ${dateStr(state.bankInfo.savedAt || Date.now())} · ${bn(state.bankInfo.count || 0)}টি প্রশ্ন</span>` : ''}<div class="sai-brow"><span>🗃️ প্রশ্নব্যাংক · ${bn((cache().questions || []).length)}টি</span><button class="btn ghost sm" onclick="StudyAiTool.syncType('bank')">🧠 টাটকা করো</button></div>
        <div class="sai-brow"><span>📊 পরীক্ষার ইতিহাস · ${bn(exSorted().length)}টি</span><button class="btn ghost sm" onclick="StudyAiTool.syncType('history')">🧠 টাটকা করো</button></div>
        <div class="sai-brow"><span>❌ ভুল-প্রশ্ন · ${bn((cache().mistakes || []).length)}টি</span><button class="btn ghost sm" onclick="StudyAiTool.syncType('mistakes')">🧠 টাটকা করো</button></div>
        <div class="sai-brow"><span>📚 শব্দভাণ্ডার · ${bn(vocPick().length)}টি</span><button class="btn ghost sm" onclick="StudyAiTool.syncType('vocab')">🧠 টাটকা করো</button></div>
        <div class="row"><button class="btn sm" onclick="StudyAiTool.forceSync()">${state.syncing ? 'পাঠানো হচ্ছে…' : '📤 সব একসাথে আপডেট করো'}</button></div>
        <details class="sai-brainview"><summary>🧠 AI-এর ব্রেইনে এখন যা আছে (প্রিভিউ)</summary><pre>${esc(buildBrain('').slice(0, 1500))}${buildBrain('').length > 1500 ? '…' : ''}</pre></details></div>
        <label class="flabel">🧬 ডুপ্লিকেট-যাচাই (Hugging Face)</label>
        <div class="sai-setrow"><b>কাছাকাছি প্রশ্ন খুঁজো</b><span class="muted" style="font-size:11.5px">নতুন-যোগ ২৫টি প্রশ্নকে পুরো ব্যাংকের সাথে অর্থ-সাদৃশ্যে (embedding) মেলায় — কুইজ-কাটার ডুপ্লিকেট ধরা পড়বে।</span><div class="row"><button class="btn secondary sm" onclick="StudyAiTool.dupCheck()">${state.dupReport && state.dupReport.busy ? 'যাচাই হচ্ছে…' : '🧬 যাচাই করো'}</button></div>${state.dupReport && !state.dupReport.busy ? `<span class="muted" style="display:block;font-size:12px;margin-top:8px">${esc(state.dupReport.msg)}</span>${(state.dupReport.pairs || []).slice(0, 6).map(pp => `<span class="muted" style="display:block;font-size:11.5px;margin-top:6px;background:#f6fbf8;border-radius:9px;padding:7px 9px">🔁 ${bn(Math.round(pp.sc * 100))}% — ${esc(String(pp.a).slice(0, 60))} <small>↔</small> ${esc(String(pp.b).slice(0, 60))}</span>`).join('')}` : ''}</div>
        <label class="flabel" style="margin-top:16px">থিম</label>
        <div class="filter-row" style="margin:6px 0 12px">${[['aurora', '🌿 Emerald'], ['violet', '💜 Violet'], ['dark', '🌙 Dark']].map(([v, l]) => `<button class="chip ${c.theme === v ? 'active' : ''}" onclick="StudyAiTool.setTheme('${v}')">${l}</button>`).join('')}</div>
        <div class="sai-setrow"><b>এজেন্টকে আমার ডেটা পাঠাবে</b><div class="toggle ${c.sendData ? 'on' : ''}" onclick="StudyAiTool.toggleData()"><div class="dot"></div></div></div>
        <div style="margin-top:14px">${memLine}</div>
        ${syncErr ? `<div class="sai-ghostbtn" style="display:block;font-size:11.5px;margin-top:8px">শেষ সিঙ্ক-ত্রুটি: ${esc(syncErr)}</div>` : ''}
        <div class="row" style="gap:8px;margin-top:10px"><button class="btn secondary sm" onclick="StudyAiTool.shareData()">📚 ডেটা ${localStorage.getItem(LS_BANK) ? 'আপডেট' : 'পাঠাও'}</button><button class="btn ghost sm" onclick="StudyAiTool.clearChats()">সব চ্যাট মুছি</button></div>
        <div class="muted" style="font-size:10.5px;margin-top:12px">Keys শুধু তোমার ডিভাইসেই থাকে (localStorage) — কোথাও আপলোড হয় না। এজেন্ট zero-access: অ্যাপ/কোড/কোনো সার্ভারে প্রবেশাধিকার নেই।</div>
      </div>
    </div>`;
  };

  const EMPTY_TASKS = ['প্রশ্ন বিশ্লেষণ করো', 'MCQ বানাও', 'ছবি থেকে প্রশ্ন বের করো', 'টপিক বুঝিয়ে দাও'];
  const draftText = () => localStorage.getItem(draftKey()) || '';
  const saveDraft = v => { try { localStorage.setItem(draftKey(), String(v || '')); } catch (_) {} };
  const nearBottom = el => !el ? true : (el.scrollHeight - el.scrollTop - el.clientHeight < 90);
  const renderCap = () => 80;
  const chatBodyHTML = () => {
    const msgsAll = msgsOf(curId());
    const msgs = state.msgsFull ? msgsAll : msgsAll.slice(-renderCap());
    const older = !state.msgsFull && msgsAll.length > renderCap();
    if (!msgsAll.length) return `<div class="sai-bg" aria-hidden="true"><i></i><i></i><i></i></div><div class="sai-scroll" id="saiScroll"><div id="saiMsgs">${landing()}<div class="sai-chips">${EMPTY_TASKS.map(t => `<button class="chip" onclick="StudyAiTool.quick('${t}')">${t}</button>`).join('')}</div></div></div>`;
    const rows = msgs.map((m, i) => bubbleOuter(m, msgs[i - 1])).join('');
    return `<div class="sai-bg" aria-hidden="true"><i></i><i></i><i></i></div><div class="sai-scroll" id="saiScroll"><div id="saiMsgs">${older ? `<button class="sai-older" onclick="StudyAiTool.expandMsgs()">↑ আগের মেসেজগুলো (${bn(msgsAll.length - renderCap())}টি)</button>` : ''}${rows}</div></div>`;
  };
  const composeSig = () => [state.busy, state.attach.map(a => a.id + a.status).join(','), draftText().length ? 1 : 0].join('|');
  const composerHTML = () => {
    const tray = state.attach.length ? `<div class="sai-tray">${state.attach.map(a => `<div class="sai-trayitem ${a.status || 'ready'}">${a.kind === 'image' && (a.thumb || a.view) ? `<img src="${a.thumb || a.view}" alt="${esc(a.name)}" onclick="StudyAiTool.viewerTray('${a.id}')">` : `<span class="sai-trayfile">📄</span>`}<button class="sai-trayx" onclick="StudyAiTool.removeAttach('${a.id}')" aria-label="ছবিটা বাদ দাও">✕</button>${a.status === 'processing' ? '<span class="sai-traystat">প্রসেস হচ্ছে…</span>' : a.status === 'error' ? `<span class="sai-traystat err">ব্যর্থ <b onclick="StudyAiTool.retryAttach('${a.id}')">আবার</b></span>` : ''}</div>`).join('')}${state.attach.length < 8 ? `<button class="sai-trayadd" onclick="StudyAiTool.pickAttach()">＋<small>আরও</small></button>` : ''}</div>` : '';
    return `<div class="sai-compose">${tray}<div class="sai-inputbar"><button class="sai-clip" onclick="StudyAiTool.pickAttach()" aria-label="ফাইল জোড়া">📎</button><input id="saiFile" type="file" multiple accept="image/*,.txt,.md,.json,.csv" style="display:none" onchange="StudyAiTool.handleFiles(this.files);this.value=''"><textarea id="saiInput" rows="1" placeholder="Ask anything…" aria-label="তোমার প্রশ্ন">${esc(draftText())}</textarea><button class="sai-send ${state.busy ? 'stop' : ''}" onclick="${state.busy ? 'StudyAiTool.stopGen()' : 'StudyAiTool.send()'}" aria-label="${state.busy ? 'থামাও' : 'পাঠাও'}">${state.busy ? '■' : '↑'}</button></div></div>`;
  };
  const renderChat = () => chatBodyHTML() + composerHTML();
  const bindTapActions = () => {
    const list = document.getElementById('saiMsgs');
    if (list && !list.dataset.acts) {
      list.dataset.acts = '1';
      list.addEventListener('click', e => {
        if (e.target.closest('.sai-act') || e.target.closest('.sai-att')) return;
        const row = e.target.closest('.sai-row');
        if (row && row.querySelector('.sai-actions')) row.classList.toggle('show-acts');
      });
    }
  };
  const bindComposer = () => {
    const ta = document.getElementById('saiInput');
    if (ta && !ta.dataset.bound) {
      ta.dataset.bound = '1';
      ta.addEventListener('input', () => { saveDraft(ta.value); autoGrow(ta); updateComposeIfChanged(); });
      ta.addEventListener('paste', ev => { try { const items = ((ev.clipboardData || {}).items || []); const fs = []; for (const it of items) if (it.kind === 'file') { const f2 = it.getAsFile(); if (f2 && /^image\//.test(f2.type || '')) fs.push(f2); } if (fs.length) { ev.preventDefault(); handleFiles(fs); } } catch (_) {} });
    }
    autoGrow(ta);
  };
  const autoGrow = ta => { if (!ta) return; ta.style.height = 'auto'; ta.style.height = Math.min(132, Math.max(44, ta.scrollHeight)) + 'px'; ta.style.overflowY = ta.scrollHeight > 132 ? 'auto' : 'hidden'; };
  const lastSig = { compose: '', chat: '' };
  const updateComposeIfChanged = () => { const b = document.getElementById('saiBody'); if (!b || state.page === 'settings') return; const sig = composeSig(); const bar = b.querySelector('.sai-compose'); if (!bar) return; if (sig !== lastSig.compose) { const focused = document.activeElement === document.getElementById('saiInput'); const val = draftText(); bar.outerHTML = composerHTML(); const ta = document.getElementById('saiInput'); if (ta) { if (focused || !val) { ta.value = val; ta.focus(); ta.setSelectionRange(val.length, val.length); } bindComposer(); } lastSig.compose = sig; } };
  const paint = () => {
    const b = document.getElementById('saiBody');
    if (b) {
      if (state.page === 'settings') {
        b.innerHTML = settingsPage();
        lastSig.compose = '';
      } else {
        // স্থিতিশীল-রিকনসিল: বদলানো মেসেজের নোডই শুধু বদলায় — পুরো লিস্ট কখনো রিমাউন্ট নয়
        const container = b.querySelector('#saiMsgs');
        const needsFull = state.jumpBottom || !container || container.dataset.chat !== curId() || !container.querySelector('[data-mid]');
        if (needsFull) { b.innerHTML = renderChat(); lastSig.compose = composeSig(); bindComposer(); bindTapActions(); if (state.jumpBottom) { const jsc = document.getElementById('saiScroll'); if (jsc) { jsc.style.scrollBehavior = 'auto'; jsc.scrollTop = jsc.scrollHeight; jsc.style.scrollBehavior = ''; } } state.jumpBottom = false; const sc = document.getElementById('saiScroll'); if (sc) sc.scrollTop = sc.scrollHeight; }
        else {
          const nb = nearBottom(document.getElementById('saiScroll'));
          const msgs = (state.msgsFull ? msgsOf(curId()) : msgsOf(curId()).slice(-renderCap()));
          const rows = [...container.querySelectorAll('[data-mid]')];
          const byId = {}; rows.forEach(r => byId[r.dataset.mid] = r);
          const wanted = msgs.map(m => m.id);
          rows.forEach(r => { if (!wanted.includes(r.dataset.mid)) r.remove(); });
          let prev = null;
          msgs.forEach(m => {
            const h = msgHash(m);
            const ex = byId[m.id];
            if (ex && ex.dataset.h === String(h.length) + '·' + (m.text || '').length + '·' + m.status) { prev = m; return; }
            const tmp = document.createElement('div'); tmp.innerHTML = bubbleOuter(m, prev);
            const nu = tmp.firstElementChild;
            if (ex) ex.replaceWith(nu); else container.appendChild(nu);
            prev = m;
          });
          const olderBtn = container.querySelector('.sai-older');
          const wantOlder = !state.msgsFull && msgsOf(curId()).length > renderCap();
          if (wantOlder && !olderBtn) container.insertAdjacentHTML('afterbegin', `<button class="sai-older" onclick="StudyAiTool.expandMsgs()">↑ আগের মেসেজগুলো</button>`);
          if (!wantOlder && olderBtn) olderBtn.remove();
          const sc = document.getElementById('saiScroll');
          if (sc && (nb || state.forceScroll)) { sc.scrollTop = sc.scrollHeight; state.forceScroll = false; }
          updateComposeIfChanged();
        }
      }
    }
    const sh = document.getElementById('saiSheetRoot'); if (sh) sh.innerHTML = sheet();
  };

  const ENG_LABEL = { gemini: 'Gemini', groq: 'Groq', openrouter: 'OpenRouter', hf: 'Hugging Face' };
  const engTitle = () => { const c = cfg(); return c.engine === 'fast' ? '⚡ ' + (ENG_LABEL[c.provider] || 'Fast') : '🌐 Admihub AI'; };
  const render = () => {
    ensureChat(); fixIds(curId());
    state.page = null; state.viewer = null; state.msgsFull = false; state.jumpBottom = true;
    if (!state.autoSyncTried) { state.autoSyncTried = true; try { localStorage.setItem('saiOpens', String((Number(localStorage.getItem('saiOpens')) || 0) + 1)); } catch (_) {} setTimeout(() => ensureSync(false), 900); startWatch(); }
    renderShell(`<div id="saiBody"></div><div id="saiSheetRoot"></div>`, {
      title: engTitle(),
      hideNav: true,
      menu: "StudyAiTool.openSheet('menu')",
      actions: []
    });
    if (!document.getElementById('saiAgentStyle')) {
      const s = document.createElement('style'); s.id = 'saiAgentStyle'; s.textContent = `
body{overflow-x:hidden}
.sai-page{min-height:calc(100vh - 92px);display:flex;flex-direction:column;background:var(--sai-bg,linear-gradient(168deg,#edfaf2 0%,#e8f5f3 42%,#eef4fa 100%))}
.sai-landing{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:16px 8px;animation:saiFade .5s ease}
.sai-logo{position:relative;width:92px;height:92px;border-radius:28px;background:linear-gradient(135deg,#5b5bf0,#a34ef0);display:flex;align-items:center;justify-content:center;box-shadow:0 14px 34px rgba(107,79,240,.38),inset 0 1px 2px rgba(255,255,255,.5);animation:saiFloat 3.6s ease-in-out infinite;transform-style:preserve-3d}
.sai-logo span{font-size:48px;filter:drop-shadow(0 3px 5px rgba(0,0,0,.22))}
.sai-logo i{position:absolute;top:-8px;right:-8px;font-style:normal;font-size:22px;animation:saiSpin 6s linear infinite}
@keyframes saiFloat{0%,100%{transform:translateY(0) rotateX(0)}50%{transform:translateY(-8px) rotateX(4deg)}}
@keyframes saiSpin{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}
@keyframes saiFade{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.sai-hello{font-size:28px;font-weight:800;margin-top:18px}
.sai-name{background:linear-gradient(90deg,#e0447c,#7a5cf0);-webkit-background-clip:text;background-clip:text;color:transparent;cursor:pointer}
.sai-sub{font-size:15px;color:var(--sub,#6b7280);margin-top:5px}
.sai-memok{font-size:11px;color:var(--emerald,#0f6b4f);background:#e7f6ee;border-radius:999px;padding:5px 12px;margin-top:12px}
.sai-ghostbtn{margin-top:14px;padding:10px 14px;border-radius:12px;border:1.5px solid #f0b428;background:#fdf6e3;color:#8a6100;font-size:12.5px;font-weight:700}
.sai-settings-page{flex:1;display:flex;flex-direction:column;animation:saiFade .3s ease}
.sai-sethead{display:flex;align-items:center;gap:10px;padding:14px 6px 8px;font-size:18px}
.sai-back2{background:var(--emerald-soft,#e8f3ec);border:none;width:40px;height:40px;border-radius:13px;font-size:20px;color:var(--emerald-d,#0f6b4f);cursor:pointer}
.sai-setwrap{background:#fff;border:1px solid var(--line,#e5e7eb);border-radius:18px;padding:16px 14px;box-shadow:0 6px 22px rgba(16,24,40,.05)}
.sai-clip{background:none;border:none;font-size:20px;cursor:pointer;padding:2px;color:#5b6b63}
.sai-keyta{width:100%;min-height:38px;border:1px solid var(--line,#e5e7eb);border-radius:10px;padding:8px 10px;font:12.5px/1.5 inherit;background:#fff;resize:vertical;color:#1f2937}
.sai-drawer-bg{position:fixed;inset:0;z-index:10070;background:rgba(8,28,22,.45);animation:saiFade .25s ease}
.sai-drawer{position:absolute;top:0;left:0;bottom:0;width:min(86%,364px);background:#fff;border-radius:0 22px 22px 0;box-shadow:18px 0 44px rgba(16,24,40,.22);display:flex;flex-direction:column;animation:saiDrawerIn .28s cubic-bezier(.2,.9,.3,1);padding:14px 10px calc(10px + env(safe-area-inset-bottom));box-sizing:border-box}
@keyframes saiDrawerIn{from{transform:translateX(-40px);opacity:0}to{transform:none;opacity:1}}
.sai-dhead{display:flex;align-items:center;justify-content:space-between;padding:4px 8px 12px}
.sai-dhead b{font-size:19px;font-weight:900;color:#12261d}
.sai-dclose{width:34px;height:34px;border:0;border-radius:50%;background:#eef5f0;font-size:16px;cursor:pointer}
.sai-dscroll{flex:1;overflow-y:auto;overscroll-behavior:contain;display:flex;flex-direction:column;gap:2px;padding:2px}
.sai-drow{display:flex;align-items:center;gap:13px;width:100%;border:0;background:none;text-align:left;padding:11px 10px;border-radius:14px;cursor:pointer}
.sai-drow:hover,.sai-drow.on{background:#f0f8f3}
.sai-dico{flex:0 0 24px;font-size:18px;text-align:center}
.sai-dtx{flex:1;min-width:0;display:flex;flex-direction:column;gap:1px}
.sai-dtx b{font-size:14.5px;font-weight:700;color:#1c2b24}
.sai-dtx small{font-size:11px;color:#8ba398;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sai-dsec{font-size:11px;font-weight:800;letter-spacing:.06em;color:#93a89d;padding:14px 10px 6px}
.sai-dfoot{border-top:1px solid #edf2ee;padding-top:8px;margin-top:6px}
.topbar h1{max-width:52vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.topbar.sai-chromeless{background:transparent;border-bottom:none;box-shadow:none;-webkit-backdrop-filter:none!important;backdrop-filter:none!important}
.sai-menuicon{background:none;border:0;font-size:22px;line-height:1;cursor:pointer;padding:2px 10px 2px 2px;color:#23392f}
.sai-engchip{margin-left:auto;background:#fff;border:1.5px solid var(--line,#e5e7eb);border-radius:999px;padding:5px 12px;font-size:11.5px;font-weight:700;color:var(--sub,#6b7280);cursor:pointer}
.sai-engchip.fast{background:linear-gradient(135deg,#fef3c7,#fde68a);border-color:#f59e0b;color:#92400e}
.sai-attachbar{display:flex;flex-wrap:wrap;gap:6px;padding:6px 2px}
.sai-atchip{display:inline-flex;align-items:center;gap:6px;background:#fff;border:1.5px solid var(--line,#e5e7eb);border-radius:12px;padding:4px 8px;font-size:11.5px;max-width:46vw}
.sai-atchip img{width:26px;height:26px;object-fit:cover;border-radius:7px}
.sai-atchip b{cursor:pointer;color:#b3261e;font-weight:700;padding:0 2px}
.sai-att{display:block;max-width:130px;max-height:110px;border-radius:12px;margin-bottom:6px;box-shadow:0 2px 8px rgba(0,0,0,.12)}
.sai-attfile{display:inline-block;background:rgba(255,255,255,.22);border-radius:9px;padding:3px 8px;font-size:11.5px;margin-bottom:5px}
.sai-note{font-size:10.5px;color:var(--sub,#9ca3af);margin-top:12px;max-width:300px;line-height:1.5}
.sai-share{margin-top:16px;text-align:left;border-left:4px solid var(--emerald,#0f6b4f);font-size:12.5px;max-width:340px;animation:saiPop .45s cubic-bezier(.2,.9,.3,1.2)}
@keyframes saiPop{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:scale(1)}}
.sai-msgs{padding:6px 2px 8px}
.sai-row{display:flex;margin:9px 0;animation:saiIn .38s cubic-bezier(.2,.9,.3,1.1)}
.sai-row.me{justify-content:flex-end}
@keyframes saiIn{from{opacity:0;transform:translateY(14px) scale(.96)}to{opacity:1;transform:none}}
.sai-bubble{max-width:92%;padding:13px 16px;border-radius:16px;font-size:15px;line-height:1.68;white-space:pre-wrap;box-shadow:0 2px 10px rgba(16,24,40,.06)}
.me .sai-bubble{background:#0e7a58;color:#fff;font-weight:600;border-bottom-right-radius:5px;box-shadow:0 4px 14px rgba(15,107,79,.3)}
.ai .sai-bubble{background:#fff;border:1px solid var(--line,#e7ece9);border-bottom-left-radius:5px;box-shadow:0 3px 14px rgba(16,24,40,.06)}
.sai-src{margin-top:8px;font-size:11px;color:var(--sub,#6b7280)}
.sai-wait{margin-top:8px;font-size:11px;color:var(--sub,#6b7280);line-height:1.5}
.sai-typing{display:flex;align-items:center;gap:13px}
.sai-orb{position:relative;flex:0 0 40px;height:40px;display:grid;place-items:center}
.sai-orb::before{content:'';width:27px;height:27px;border-radius:50%;background:radial-gradient(circle at 32% 26%,#c9ffe9,#12b57a 52%,#085540);box-shadow:0 9px 20px rgba(15,107,79,.42),inset 0 -4px 8px rgba(0,0,0,.22);animation:orbPulse 1.5s ease-in-out infinite}
.sai-orb::after{content:'';position:absolute;inset:1px;border-radius:50%;border:3px solid transparent;border-top-color:#2fd08f;border-right-color:rgba(47,208,143,.5);animation:orbSpin 1.05s linear infinite}
.sai-orb b{position:absolute;width:7px;height:7px;border-radius:50%;background:#10a56d;box-shadow:0 0 12px #2fd08f;animation:orbDot 1.5s ease-in-out infinite}
.sai-orb b:first-child{transform:rotate(52deg) translateX(20px)}
.sai-orb b:last-child{transform:rotate(232deg) translateX(20px);animation-delay:.5s}
@keyframes orbPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.16)}}
@keyframes orbSpin{to{transform:rotate(360deg)}}
@keyframes orbDot{0%,100%{opacity:.3;transform-origin:center}50%{opacity:1}}
.sai-shimmer{font-weight:800;background:linear-gradient(90deg,#0f6b4f 25%,#2fd08f 45%,#0f6b4f 65%);background-size:220% auto;-webkit-background-clip:text;background-clip:text;color:transparent;animation:saiShine 1.7s linear infinite}
@keyframes saiShine{to{background-position:-220% center}}
.sai-srcbar{padding:8px 0 0}
.sai-srchip{display:inline-block;padding:5px 12px;border-radius:999px;border:1px solid var(--line,#e5e7eb);background:#fff;font-size:11.5px;font-weight:700;color:var(--emerald,#0f6b4f)}
.sai-topchip{background:var(--mint,#e8f3ec);border:none;border-radius:999px;padding:7px 11px;font-size:11.5px;font-weight:800;color:var(--emerald-d,#0f6b4f);cursor:pointer;white-space:nowrap}
.sai-topchip.gold{background:linear-gradient(135deg,#fef3c7,#fde68a);color:#92400e}
.sai-compose{position:fixed;bottom:0;left:0;right:0;z-index:60;padding:4px 10px calc(6px + env(safe-area-inset-bottom,0px));background:linear-gradient(180deg,rgba(247,250,248,0),#f7faf8 18%,#f7faf8 70%)}
.sai-inputbar{transition:border-color .2s ease,box-shadow .25s ease}.sai-inputbar:focus-within{border-color:#8fd4b8!important;box-shadow:0 4px 18px rgba(15,107,79,.14)!important}
.sai-inputbar{display:flex;gap:8px;align-items:flex-end;background:#fff;border:1.5px solid var(--line,#e5e7eb);border-radius:22px;padding:6px 8px;box-shadow:0 4px 18px rgba(16,24,40,.07);transition:box-shadow .2s,border-color .2s}
.sai-inputbar:focus-within{border-color:var(--emerald,#0f6b4f);box-shadow:0 6px 22px rgba(15,107,79,.14)}
.sai-inputbar textarea{flex:1;border:none;outline:none;resize:none;font:inherit;font-size:14.5px;line-height:1.55;background:transparent;min-height:44px;max-height:132px;padding:10px 2px;overflow-y:hidden;word-break:break-word;white-space:pre-wrap}
.sai-scroll{flex:1;overflow-y:auto;overflow-x:hidden;padding:14px 12px 30px;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;scroll-behavior:smooth;position:relative;z-index:1;-webkit-mask-image:linear-gradient(to bottom,transparent 0,#000 44px);mask-image:linear-gradient(to bottom,transparent 0,#000 44px)}
.sai-bg{position:fixed;inset:0;z-index:0;overflow:hidden;pointer-events:none}
.sai-bg i{position:absolute;border-radius:50%;filter:blur(52px);opacity:.32;will-change:transform}
.sai-bg i:nth-child(1){width:64vw;height:64vw;left:-18vw;top:-14vh;background:radial-gradient(circle,#34d399,transparent 65%);animation:saiDrift1 26s ease-in-out infinite alternate}
.sai-bg i:nth-child(2){width:56vw;height:56vw;right:-20vw;top:22vh;background:radial-gradient(circle,#a7f3d0,transparent 65%);animation:saiDrift2 33s ease-in-out infinite alternate}
.sai-bg i:nth-child(3){width:48vw;height:48vw;left:6vw;bottom:-22vh;background:radial-gradient(circle,#fde68a,transparent 62%);opacity:.26;animation:saiDrift3 39s ease-in-out infinite alternate}
@keyframes saiDrift1{from{transform:translate(0,0) scale(1)}to{transform:translate(9vw,7vh) scale(1.14)}}
@keyframes saiDrift2{from{transform:translate(0,0) scale(1.08)}to{transform:translate(-8vw,9vh) scale(.94)}}
@keyframes saiDrift3{from{transform:translate(0,0) scale(1)}to{transform:translate(7vw,-8vh) scale(1.12)}}
@media (prefers-reduced-motion:reduce){.sai-bg i{animation:none}}
.sai-tray{display:flex;gap:8px;overflow-x:auto;padding:4px 2px 8px}
.sai-trayitem{position:relative;flex:0 0 auto;width:74px;height:74px;border-radius:14px;border:1.5px solid var(--line,#e5e7eb);background:#fff;overflow:visible;display:grid;place-items:center}
.sai-trayitem img{width:100%;height:100%;object-fit:cover;border-radius:13px;cursor:pointer}
.sai-trayx{position:absolute;top:-7px;right:-7px;width:22px;height:22px;border-radius:50%;border:none;background:#1f2937;color:#fff;font-size:12px;cursor:pointer;display:grid;place-items:center;box-shadow:0 2px 6px rgba(0,0,0,.25)}
.sai-traystat{position:absolute;bottom:-16px;left:2px;font-size:9.5px;color:var(--sub,#6b7280);white-space:nowrap}
.sai-traystat.err{color:#b3261e;font-weight:700}
.sai-trayitem.error{border-color:#f0b428;background:#fdf6e3}
.sai-trayadd{flex:0 0 auto;width:74px;height:74px;border-radius:14px;border:1.5px dashed var(--line,#cbd5d1);background:transparent;color:var(--sub,#6b7280);font-size:20px;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1}
.sai-trayadd small{font-size:9.5px;margin-top:3px}
.sai-send{width:40px;height:40px;border-radius:50%;border:none;background:var(--emerald,#0f6b4f);color:#fff;font-size:17px;cursor:pointer;flex:0 0 auto;display:grid;place-items:center;transition:transform .15s}
.sai-send:active{transform:scale(.92)}
.sai-send.stop{background:#1f2937}

.sai-actions{display:none;gap:2px;margin-top:4px;flex-wrap:wrap}
.sai-row.show-acts .sai-actions{display:flex}
.sai-row .sai-bubble{cursor:pointer;transition:transform .16s ease,box-shadow .2s ease}.sai-row .sai-bubble:active{transform:scale(.97)}
.sai-act{background:none;border:none;font-size:11px;color:var(--sub,#6b7280);cursor:pointer;padding:4px 7px;border-radius:8px}
.sai-act:hover{background:rgba(15,107,79,.07)}
.sai-act.on{color:var(--emerald,#0f6b4f);font-weight:700}
.sai-act.retry{color:#b45309;font-weight:700}
.sai-meta{display:block;font-size:9.5px;margin-top:5px;text-align:right;color:rgba(255,255,255,.85)}
.ai .sai-meta{color:#a2aca6}
.sai-md{font-size:15.5px;line-height:1.8;letter-spacing:.1px;word-break:break-word;overflow-wrap:anywhere;color:#20302a}
.sai-md .sai-p{margin:0 0 9px}
.sai-md .sai-p:last-child{margin-bottom:0}
.sai-md strong{color:#0b5c43;font-weight:800}
.sai-md em{color:#155e50}
.sai-h{font-weight:800;margin:12px 0 6px;color:#0f6b4f}
.sai-h2{font-size:17px}.sai-h3{font-size:15.5px}.sai-h4{font-size:14.5px}
.sai-md ul,.sai-md ol{margin:2px 0 10px;padding-left:22px;display:grid;gap:3px}
.sai-code-i{background:rgba(15,107,79,.08);border-radius:6px;padding:1px 6px;font-family:ui-monospace,Menlo,monospace;font-size:12.5px}
.sai-codeblk{background:#0f172a;color:#e2e8f0;border-radius:12px;padding:10px 12px;margin:8px 0;overflow-x:auto}
.sai-codeblk small{color:#94a3b8;font-size:9.5px;letter-spacing:.4px;text-transform:uppercase}
.sai-codeblk pre{margin:4px 0 0;font-family:ui-monospace,Menlo,monospace;font-size:12px;line-height:1.6;white-space:pre}
.sai-tblwrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
.sai-tbl th,.sai-tbl td{white-space:nowrap;word-break:normal;overflow-wrap:normal}
.sai-tblwrap{overflow-x:auto;margin:8px 0;border:1px solid var(--line,#e5e7eb);border-radius:12px;-webkit-overflow-scrolling:touch}
.sai-exq{background:#fff;border:1px solid var(--line,#e5e7eb);border-radius:14px;padding:12px;margin:6px 0;box-shadow:0 1px 6px rgba(16,24,40,.06)}
.sai-exq b{display:block;margin-bottom:7px;font-size:13.5px;color:#0f6b4f}
.sai-exopt{display:block;width:100%;text-align:left;background:#f6faf8;border:1px solid var(--line,#e5e7eb);border-radius:10px;padding:9px 11px;margin:6px 0;font-size:13.5px;cursor:pointer;color:#20302a}
.sai-exopt:active{transform:scale(.985)}
.sai-exopt.sel{background:#e7f5ee;border-color:#0e7a58;font-weight:700}
.sai-exnav{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:8px}
.sai-exnb{background:#fff;border:1px solid var(--line,#e5e7eb);border-radius:9px;padding:7px 12px;font-size:12.5px;cursor:pointer;color:#0f6b4f;font-weight:700}
.sai-exnb:disabled{opacity:.4}
.sai-exdots{display:flex;gap:3px}
.sai-exdot{font-size:9px;color:#c9d6cf}
.sai-exdot.done{color:#0e7a58}
.sai-exdot.cur{color:#0f6b4f;font-size:12px}
.sai-exfin{display:block;width:100%;background:#0e7a58;color:#fff;border:0;border-radius:11px;padding:11px;font-size:14px;font-weight:800;cursor:pointer;margin-top:8px}
.sai-exrev{background:#fdf3f2;border:1px solid #f3d9d5;border-radius:10px;padding:8px 10px;margin:7px 0;font-size:12.5px}
.sai-exrev small{color:#6b5a57}
.sai-brow{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 0;border-top:1px dashed var(--line,#e5e7eb);font-size:12.5px;color:#20302a}
.sai-brow .btn{white-space:nowrap}
.sai-brainview{margin-top:10px}
.sai-brainview summary{cursor:pointer;font-size:12px;color:#0f6b4f;font-weight:700}
.sai-brainview pre{white-space:pre-wrap;font-size:11px;line-height:1.5;background:#f6faf8;border:1px solid var(--line,#e5e7eb);border-radius:10px;padding:10px;max-height:230px;overflow:auto;margin-top:8px}
.sai-tbl{border-collapse:collapse;width:100%;font-size:12.8px;min-width:340px}
.sai-tbl th{background:#f0f5f2;text-align:left;padding:8px 10px;font-size:11.5px;letter-spacing:.2px}
.sai-tbl td{padding:7px 10px;border-top:1px solid var(--line,#eef1ef);vertical-align:top}
.sai-quote{border-left:3px solid var(--emerald,#0f6b4f);background:rgba(15,107,79,.05);margin:8px 0;padding:7px 12px;border-radius:0 10px 10px 0}
.sai-hr{border:none;border-top:1px dashed var(--line,#d5dcd8);margin:10px 0}
.sai-mcq{background:#fff;border:1.5px solid var(--line,#e5e7eb);border-radius:14px;padding:10px 12px;margin:8px 0;display:grid;gap:4px}
.sai-mcq .sai-opt{margin:0;padding:5px 8px;border-radius:9px;background:#f7faf8}
.sai-ansline{font-weight:800;color:var(--emerald-d,#0b5a42);background:#e7f6ee;border-radius:10px;padding:7px 11px;margin:8px 0 4px}
.sai-explain{background:#f4f6fb;border-radius:10px;padding:7px 11px;margin:4px 0 8px;font-size:13px}
.sai-callout{background:#fdf6e3;border:1px solid #f0e2b6;border-radius:10px;padding:7px 11px;margin:6px 0}
.sai-errbubble{background:#fdeceb;border:1px solid #f5c6c0;color:#8f2f26;border-radius:12px;padding:9px 12px}
.sai-cancelbubble{color:var(--sub,#6b7280);font-style:italic}
.sai-activity{margin-top:8px;border:1px solid #d9e8df;background:#f4faf6;border-radius:12px;padding:7px 10px}
.sai-activity summary{cursor:pointer;font-size:12px;font-weight:700;color:var(--emerald-d,#0b5a42)}
.sai-step{font-size:11.8px;color:#3c5348;padding:3px 0 3px 4px}
.sai-fbnote{font-size:11px;color:var(--sub,#6b7280);margin-top:6px}
.sai-older{margin:0 auto 10px;display:block;background:#fff;border:1px solid var(--line,#e5e7eb);border-radius:999px;padding:6px 14px;font-size:11.5px;color:var(--sub,#6b7280);cursor:pointer}
.sai-viewer{position:fixed;inset:0;background:rgba(10,14,12,.92);z-index:200;display:flex;align-items:center;justify-content:center}
.sai-vimg{max-width:94vw;max-height:82vh;border-radius:10px;transition:transform .2s;cursor:zoom-in}
.sai-vimg.zoom{transform:scale(1.6);cursor:zoom-out}
.sai-vclose{position:absolute;top:14px;right:14px;width:40px;height:40px;border-radius:50%;border:none;background:rgba(255,255,255,.14);color:#fff;font-size:17px;cursor:pointer}
.sai-vnav{position:absolute;top:50%;transform:translateY(-50%);width:44px;height:44px;border-radius:50%;border:none;background:rgba(255,255,255,.14);color:#fff;font-size:24px;cursor:pointer}
.sai-vnav.prev{left:10px}.sai-vnav.next{right:10px}
.sai-vcount{position:absolute;bottom:16px;left:0;right:0;text-align:center;color:#cbd5d1;font-size:12px}
.sai-page{padding-bottom:84px}
.sai-plus,.sai-send{flex:0 0 46px;height:46px;border-radius:50%;font-size:21px;transition:transform .15s ease}
.sai-plus{background:#fff;border:1.5px solid var(--line,#e5e7eb);color:var(--sub,#4b5563)}
.sai-plus:active,.sai-send:active{transform:scale(.88)}
.sai-inputbar input{flex:1;padding:13px 17px;border-radius:24px;border:1.5px solid var(--line,#e5e7eb);background:#fff;font-size:14px;box-shadow:0 3px 10px rgba(16,24,40,.06);transition:box-shadow .2s}
.sai-inputbar input:focus{outline:none;box-shadow:0 4px 16px rgba(15,107,79,.18);border-color:var(--emerald,#0f6b4f)}
.sai-send{background:linear-gradient(135deg,#0f6b4f,#12805f);color:#fff;box-shadow:0 6px 16px rgba(15,107,79,.35)}
.sai-send:disabled{opacity:.5}
.sai-chips{display:flex;gap:6px;flex-wrap:wrap;padding:2px 0 12px;animation:saiFade .5s ease}
.sai-sheet-bg{position:fixed;inset:0;background:rgba(15,23,42,.45);z-index:120;display:flex;align-items:flex-end;animation:saiF .25s ease;backdrop-filter:blur(2px)}
@keyframes saiF{from{opacity:0}to{opacity:1}}
.sai-sheet{width:100%;background:var(--card,#fff);border-radius:24px 24px 0 0;padding:10px 14px 26px;max-height:74vh;overflow-y:auto;animation:saiUp .32s cubic-bezier(.2,.9,.3,1)}
@keyframes saiUp{from{transform:translateY(40%)}to{transform:none}}
.sai-sheet-grip{width:44px;height:4px;border-radius:4px;background:var(--line,#d1d5db);margin:2px auto 10px}
.sai-sheet h3{text-align:center;font-size:17px;margin:2px 0 12px}
.sai-sheet-item{display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:13px 14px;margin:7px 0;border:1.5px solid var(--line,#e5e7eb);border-radius:15px;background:var(--card,#fff);font-size:14.5px;font-weight:700}
.sai-sheet-item span{font-size:19px}
.sai-sheet-item small{display:block;font-weight:500;font-size:11px;color:var(--sub,#6b7280)}
.sai-sheet-item.on{border-color:var(--emerald,#0f6b4f);background:#f0faf5}
.sai-del{margin-left:auto;font-weight:400}
.sai-setrow{display:block;background:#fff;border:1px solid var(--line,#e5e7eb);border-radius:14px;padding:12px 12px 11px;margin:10px 0;box-shadow:0 1px 5px rgba(16,24,40,.05)}
.sai-setrow b{display:block;font-size:13px;font-weight:800;color:#20302a;margin-bottom:7px}
.sai-setrow > .muted{display:block;margin:0 0 7px}
.sai-setrow .row{margin-top:8px;flex-wrap:wrap}
.sai-setrow .btn{white-space:nowrap;min-width:80px}
.sai-setrow input[type=password],.sai-setwrap input[type=text]{width:100%;margin-top:4px}
.sai-setwrap .flabel{margin-top:12px}
`; document.head.appendChild(s);
    }
    paint();
    if (!window.__saiVvBound && window.visualViewport) {
      window.__saiVvBound = true;
      const vv = window.visualViewport;
      const onVV = () => { const bar = document.querySelector('.sai-compose'); if (!bar) return; const kb = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)); bar.style.bottom = kb + 'px'; const ms = document.getElementById('saiScroll'); if (ms) ms.scrollTop = ms.scrollHeight; };
      vv.addEventListener('resize', onVV); vv.addEventListener('scroll', onVV);
    }
    setTimeout(() => { const i = document.getElementById('saiInput'); i && i.focus(); }, 150);
  };

  const push = m => { const id = ensureChat(); const msgs = msgsOf(id); const rec = Object.assign({ id: 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), ts: Date.now(), status: m.who === 'ai' && !m.text ? 'pending' : 'completed' }, m); msgs.push(rec); saveMsgs(id, msgs); touchChat(id, m.who === 'me' ? m.text : null); paint(); return rec; };

  // টাইপরাইটার-রিভিল: উত্তর টুকরো টুকরো করে দেখায় (giant-dump নিষিদ্ধ); শুধু ওই-নোড বদলায়
  const typewrite = (mid, full, extras) => new Promise(res => {
    let i = 0;
    const iv = setInterval(() => {
      if (state.abortRef && state.abortRef.aborted) { clearInterval(iv); patchMsg(mid, { status: 'cancelled', text: '' }); res(); return; }
      i = Math.min(full.length, i + 12);
      const node = document.querySelector(`[data-mid="${mid}"] .sai-bubble`);
      if (node) { node.innerHTML = `<div class="sai-md">${md(full.slice(0, i))}</div>`; const sc = document.getElementById('saiScroll'); if (sc && nearBottom(sc)) sc.scrollTop = sc.scrollHeight; }
      if (i >= full.length) { clearInterval(iv); patchMsg(mid, Object.assign({ text: full, status: 'completed' }, extras || {})); res(); }
    }, 16);
  });
  const fixIds = id => { const ms = msgsOf(id); let ch = false; ms.forEach(m => { if (!m.id) { m.id = 'm' + Math.random().toString(36).slice(2, 9); m.ts = m.ts || Date.now(); m.status = m.status || 'completed'; ch = true; } }); if (ch) saveMsgs(id, ms); };
  // মেসেজ-আপডেট হেল্পার: শুধু ওই-মেসেজটাই বদলায় (পুরো লিস্ট রিমাউন্ট নিষিদ্ধ)
  const patchMsg = (mid, fields) => {
    const id = curId(); const msgs = msgsOf(id); const i = msgs.findIndex(m => m.id === mid);
    if (i < 0) return;
    msgs[i] = Object.assign({}, msgs[i], fields);
    saveMsgs(id, msgs); paint();
  };
  const draftKey = () => 'studyAiDraft:' + curId();
  const friendlyErr = e => {
    const m = String(e?.message || e);
    if (e && e.aborted) return '';
    if (/quota|429/i.test(m)) return 'AI-এর ফ্রি-কোটা এখন শেষ — ১ মিনিট পরে আবার চেষ্টা করো 🙏';
    if (/failed to fetch|network|offline/i.test(m)) return 'ইন্টারনেট সংযোগে সমস্যা হচ্ছে — নেট দেখে Retry চাপো';
    return 'AI সার্ভিসে সাময়িক সমস্যা হয়েছে — একটু পরে আবার চেষ্টা করো 🙏';
  };
  const send = async (textArg, retryOf) => {
    if (state.busy) return;
    if (!retryOf && String(textArg || '').trim() === '/exam') { startChatExam(); return; }
    try { await boostData(); } catch (_) {}
    if (!retryOf && typeof navigator !== 'undefined' && navigator.onLine === false) {
      push({ who: 'me', text: String(textArg || draftText()).trim() || '…' });
      push({ who: 'ai', text: '📡 এখন ইন্টারনেট নেই — তোমার চ্যাট পড়া যাচ্ছে, কিন্তু নতুন উত্তর আনতে নেট লাগবে। নেট ফিরলে আবার পাঠাও 😊' });
      return;
    }
    const input = document.getElementById('saiInput');
    let text = String(textArg !== undefined ? textArg : draftText()).trim();
    const atts = state.attach.slice();
    if (!text && !atts.length) return;
    if (!text) text = retryOf ? 'আবার চেষ্টা করো' : 'সংযুক্ত ফাইলটা দেখে বলো';
    const imgs = atts.filter(a => a.kind === 'image');
    const visionOk = cfg().engine === 'fast' && keyList(cfg().provider).length > 0 && (cfg().provider === 'gemini' || !!VL_DEFAULT[cfg().provider]);
    // Gemini OPTIONAL: ছবি থাকলে ভিশন-ক্ষমতা দরকার — না থাকলে বন্ধুসুলভ capability-বার্তা (কখনো কঠিন error নয়)
    if (imgs.length && !visionOk) {
      push({ who: 'me', text, atts: atts.map(a => ({ kind: a.kind, name: a.name, thumb: a.thumb || '' })) });
      state.attach = []; saveDraft('');
      push({ who: 'ai', text: 'ছবি-বিশ্লেষণের জন্য এখন আমার কাছে কোনো ভিশন-প্রোভাইডার জোড়া নেই 👀\n⚙️ সেটিংসে কোনো vision-মডেলের key (যেমন Gemini) জুড়লে সরাসরি ছবি পড়ে দিতে পারব — আর না-ও জুড়লে চ্যাট, এজেন্ট, প্রশ্ন-ব্যাংক সবই আগের মতো চলবে।\nকাছাকাছি সমাধান: ছবির প্রশ্নটা লিখে পাঠাও — 🌐 এজেন্ট ওয়েব ঘেঁটে উত্তর দেবে ✨' });
      return;
    }
    // ইউজার যে-ইঞ্জিন নির্বাচন করেছে সেটাই উত্তর দেবে — চুপচাপ অন্য-ইঞ্জিনে ফেলো নয়
    if (cfg().engine === 'fast' && !fastAvailable()) {
      push({ who: 'me', text });
      push({ who: 'ai', text: '⚡ ফাস্ট-ইঞ্জিন নির্বাচিত, কিন্তু ওই provider-এর API key নেই 🙈\n⚙️ সেটিংসে key বসাও — অথবা কম্পোজারের ইঞ্জিন-ব্যাজে চেপে 🌐 ব্রাউজার-এজেন্টে বদলাও। তুমি যেটা বেছেছো সেটাই উত্তর দেবে, আমি নিজে থেকে অন্যটায় যাবো না।' });
      if (input) input.value = '';
      return;
    }
    state.busy = true; state.abortRef = { aborted: false }; state.forceScroll = true;
    if (!retryOf) {
      push({ who: 'me', text, atts: atts.map(a => ({ kind: a.kind, name: a.name, thumb: a.thumb || '' })) });
      state.attach = []; saveDraft('');
    }
    const aiMsg = push({ who: 'ai', text: '', status: 'pending' });
    paint();
    try {
      if (cfg().engine === 'fast' && fastAvailable()) {
        patchMsg(aiMsg.id, { status: 'streaming' });
        const r = await askFast(text, atts, state.abortRef);
        await typewrite(aiMsg.id, r.text, { sources: r.sources || [], img: r.img || '' });
      } else {
        const source = state.source || 'auto';
        patchMsg(aiMsg.id, { phase: 'run' });
        const onStep = (n, steps) => patchMsg(aiMsg.id, { phase: 'run', steps: steps.map(x => String(x && (x.description || x.title || x) || '').slice(0, 90)).filter(Boolean).slice(-8), status: 'pending' });
        const r = await askAgent(text, source, onStep, state.abortRef);
        await typewrite(aiMsg.id, r.text, { sources: r.sources, steps: r.steps });
      }
    } catch (e) {
      if (e && (e.aborted || e.name === 'AbortError')) patchMsg(aiMsg.id, { status: 'cancelled', text: '' });
      else patchMsg(aiMsg.id, { status: 'error', errText: friendlyErr(e) || String(e?.message || e).slice(0, 80), text: '' });
    }
    state.busy = false; state.abortRef = null; paint();
  };
  const stopGen = () => { if (state.abortRef) state.abortRef.aborted = true; if (window.toast) window.toast('⏹ থামানো হচ্ছে…'); };

  // ── মেসেজ-অ্যাকশন: copy / edit / retry / regenerate / rate ──
  const findMsg = mid => msgsOf(curId()).find(m => m.id === mid);
  const copyMsg = async mid => { const m = findMsg(mid); const t = m ? (m.text || '') : ''; try { if (navigator.clipboard) await navigator.clipboard.writeText(t); else { const ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); } if (window.toast) window.toast('কপি হয়েছে ✓'); } catch (_) { if (window.toast) window.toast('কপি করা গেল না'); } };
  const editMsg = mid => {
    const msgs = msgsOf(curId()); const i = msgs.findIndex(m => m.id === mid);
    if (i < 0) return;
    const text = msgs[i].text || '';
    msgs.splice(i, msgs[i + 1] && msgs[i + 1].who === 'ai' ? 2 : 1);
    saveMsgs(curId(), msgs); saveDraft(text); paint();
    const ta = document.getElementById('saiInput'); if (ta) { ta.focus(); autoGrow(ta); }
  };
  const retryMsg = mid => {
    const msgs = msgsOf(curId()); const i = msgs.findIndex(m => m.id === mid);
    if (i < 0) return;
    let u = null; for (let j = i - 1; j >= 0; j--) if (msgs[j].who === 'me') { u = msgs[j]; break; }
    if (!u) return;
    msgs.splice(i, 1); saveMsgs(curId(), msgs);
    send(u.text || 'আবার চেষ্টা করো', {});
  };
  const regenerate = mid => retryMsg(mid);
  const rate = (mid, fb) => { patchMsg(mid, { fb }); };
  const expandMsgs = () => { state.msgsFull = true; paint(); };
  // ── 🖼 ফুলস্ক্রিন ভিউয়ার ──
  const viewer = mid => { const m = findMsg(mid); const list = ((m && m.atts) || []).filter(a => a.view || a.thumb).map(a => a.view || a.thumb); if (!list.length) return; state.viewer = { list, i: 0 }; paint(); };
  const viewerTray = aid => { const a = state.attach.find(x => x.id === aid); if (!a || !(a.view || a.thumb)) return; state.viewer = { list: [a.view || a.thumb], i: 0 }; paint(); };
  const viewerNav = d => { if (!state.viewer) return; state.viewer.i = (state.viewer.i + d + state.viewer.list.length) % state.viewer.list.length; paint(); };
  const viewerClose = () => { state.viewer = null; paint(); };

  // 📤 জোর-সিঙ্ক: সেটিংস-বাটন — প্রশ্নব্যাংক+ইতিহাস+অ্যাক্টিভিটি এখনই টাটকা পাঠায়
  const forceSync = async () => {
    try { state.syncing = true; paint(); await syncBank(); localStorage.setItem('ahBankSig', dataSig()); state.bankInfo = { saved: true, count: (cache().questions || []).length, savedAt: Date.now() }; if (window.toast) window.toast('📤 সব ডেটা আপডেট হয়ে গেছে — এজেন্টের ডাটাবেসে টাটকা ✓'); }
    catch (e) { if (window.toast) window.toast('⚠️ সিঙ্ক হয়নি: ' + String(e?.message || e).slice(0, 70)); }
    state.syncing = false; paint();
  };
  // অটো-ওয়াচ: ডেটা বদলালেই (নতুন প্রশ্ন/পরীক্ষা) নিজে নিজে টাটকা যায় — বারবার বাটন লাগে না
  const startWatch = () => {
    if (state.watchTried) return; state.watchTried = true;
    setInterval(() => { try { if (document.hidden || !localStorage.getItem(LS_SHARED)) return; if (localStorage.getItem('ahBankSig') !== dataSig()) ensureSync(false); } catch (_) {} }, 90000);
  };
  // 🧬 HF-similarity ডুপ্লিকেট-যাচাই (নতুন-যোগ প্রশ্ন বনাম ব্যাংক)
  const EMB = 'https://router.huggingface.co/hf-inference/models/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2/pipeline/feature-extraction';
  const embedAll = async texts => {
    const out = [];
    for (let i = 0; i < texts.length; i += 24) {
      const res = await fetch(EMB, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (keyList('hf')[0] || '') }, body: JSON.stringify({ inputs: texts.slice(i, i + 24) }) });
      if (!res.ok) throw new Error('HF-' + res.status);
      let embs = await res.json();
      if (!Array.isArray(embs)) throw new Error('HF-শেপ');
      out.push(...embs);
    }
    return out.map(e2 => { let v = e2; if (v.length && Array.isArray(v[0])) { const n = v.length || 1; v = v[0].map((_, j) => v.reduce((a2, r) => a2 + (r[j] || 0), 0) / n); } const m = Math.sqrt(v.reduce((a2, x) => a2 + x * x, 0)) || 1; return v.map(x => x / m); });
  };
  const cos = (a, b) => { let d = 0; for (let i = 0; i < a.length; i++) d += a[i] * b[i]; return d; };
  const dupCheck = async () => {
    const qs = (cache().questions || []).filter(q2 => q2 && String(q2.question || '').length > 8);
    if (qs.length < 2) { state.dupReport = { busy: false, pairs: [], msg: 'ব্যাংকে যথেষ্ট প্রশ্ন নেই' }; paint(); return; }
    if (!keyList('hf').length) { state.dupReport = { busy: false, pairs: [], msg: '⚙️ আগে Hugging Face-এর key বসাও' }; paint(); return; }
    state.dupReport = { busy: true, pairs: [], msg: '🧬 এমবেডিং হিসাব হচ্ছে…' }; paint();
    try {
      const fresh = qs.slice(-25), old = qs.slice(0, Math.max(0, qs.length - 25)).slice(-275);
      const embs = await embedAll(fresh.concat(old).map(q2 => String(q2.question).slice(0, 160)));
      const fe = embs.slice(0, fresh.length), oe = embs.slice(fresh.length);
      const pairs = [];
      for (let i = 0; i < fresh.length; i++) for (let j = 0; j < i; j++) { const sc = cos(fe[i], fe[j]); if (sc >= 0.86) pairs.push({ a: fresh[i].question, b: fresh[j].question, sc }); }
      for (let i = 0; i < fresh.length; i++) for (let j = 0; j < oe.length; j++) { const sc = cos(fe[i], oe[j]); if (sc >= 0.86) pairs.push({ a: fresh[i].question, b: old[j].question, sc }); }
      pairs.sort((x, y) => y.sc - x.sc);
      state.dupReport = { busy: false, pairs: pairs.slice(0, 12), msg: pairs.length ? bn(pairs.length) + ' জোড়া কাছাকাছি প্রশ্ন পাওয়া গেছে 👀' : '✅ কোনো কাছাকাছি ডুপ্লিকেট নেই' };
    } catch (e) { state.dupReport = { busy: false, pairs: [], msg: '⚠️ ' + String(e?.message || e).slice(0, 80) }; }
    paint();
  };

  const shareData = async () => {
    push({ who: 'me', text: '📚 ডেটা পাঠাচ্ছি…' });
    push({ who: 'ai', text: '' });
    try {
      const count = await syncBank();
      state.bankInfo = { saved: true, count, savedAt: Date.now() };
      localStorage.setItem(LS_SHARED, '1');
      const id = curId(); const msgs = msgsOf(id); msgs[msgs.length - 1] = { who: 'ai', text: `রাখলাম! 📚\nতোমার সম্পূর্ণ প্রশ্নব্যাংক (${bn(count)}টি প্রশ্ন), পরীক্ষার ইতিহাস আর প্রগ্রেস আমার ডাটাবেসে সেভ হয়ে গেছে।\nএখন থেকে তোমার ব্যাংক থেকেই উত্তর দিতে পারব — ⊕ থেকে বিষয় বেছে নাও! 😊` }; saveMsgs(id, msgs);
    } catch (e) {
      localStorage.setItem('studyAiSyncErr', String(e?.message || e).slice(0, 90));
      const id = curId(); const msgs = msgsOf(id); msgs[msgs.length - 1] = { who: 'ai', text: `ডেটা এবার সেভ হয়নি (${String(e?.message || e)})।\nচিন্তা নেই — চ্যাট খোলা থাকলে আমি নিজে নিজেই আবার চেষ্টা করবো, আর Settings-এ 📚 বাটনেও চাপা যাবে।` }; saveMsgs(id, msgs);
    }
    state.page === 'settings' ? paint() : paint();
  };
  const skipShare = () => { localStorage.setItem(LS_SHARED, '1'); paint(); };
  const quick = t => send(t);
  const editName = () => { const n = prompt('তোমার নাম?', nameOf()); if (n && n.trim()) { localStorage.setItem(LS_NAME, n.trim().slice(0, 20)); paint(); } };
  const openSheet = w => {
    if (w === 'settings') { state.page = 'settings'; state.sheet = null; state.keyTest = null; paint(); } // ⚙️ = আলাদা পরিষ্কার পেজ (পপআপ নয়)
    else { state.sheet = w; paint(); }
    if (w === 'settings' && state.bankInfo === undefined && typeof fetch === 'function') {
      state.bankInfo = null;
      fetch(WORKER + '/api/bank', { headers: APP_HEADER }).then(r => r.json()).then(d => { state.bankInfo = d; if (state.page === 'settings') paint(); }).catch(() => { state.bankInfo = { saved: false }; if (state.page === 'settings') paint(); });
    }
  };
  const closePage = () => { state.page = null; state.keyTest = null; paint(); };
  const closeSheet = () => { state.sheet = null; state.viewer = null; paint(); };
  // ── 📎 AttachmentManager: multi-image + lifecycle (processing→ready/error→retry) + individual delete ──
  const MAXATT = 8;
  const processImage = (a, f) => new Promise(done => {
    const rd = new FileReader();
    rd.onload = () => {
      const raw = String(rd.result || '');
      const im = new Image();
      im.onload = () => {
        try {
          const mk = (max, q) => { const k = Math.min(1, max / Math.max(im.width || 1, im.height || 1)); const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round((im.width || 1) * k)); cv.height = Math.max(1, Math.round((im.height || 1) * k)); cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); return cv.toDataURL('image/jpeg', q).split(',')[1] || cv.toDataURL('image/jpeg', q); };
          a.data = mk(1280, 0.82);
          a.view = mk(560, 0.78);
          a.thumb = (() => { try { const k = Math.min(1, 112 / Math.max(im.width || 1, im.height || 1)); const tv = document.createElement('canvas'); tv.width = Math.max(1, Math.round((im.width || 1) * k)); tv.height = Math.max(1, Math.round((im.height || 1) * k)); tv.getContext('2d').drawImage(im, 0, 0, tv.width, tv.height); return tv.toDataURL('image/jpeg', 0.7); } catch (_) { return a.view; } })();
          a.mime = 'image/jpeg'; a.status = 'ready';
        } catch (_) { a.status = 'error'; }
        done(a);
      };
      im.onerror = () => { a.status = 'error'; done(a); };
      im.src = raw;
    };
    rd.onerror = () => { a.status = 'error'; done(a); };
    rd.readAsDataURL(f);
  });
  const processText = (a, f) => new Promise(done => {
    const rd = new FileReader();
    rd.onload = () => { a.text = String(rd.result || '').slice(0, 12000); a.status = 'ready'; done(a); };
    rd.onerror = () => { a.status = 'error'; done(a); };
    rd.readAsText(f);
  });
  const runAttach = a => { const pr = a.kind === 'image' ? processImage(a, a.file) : processText(a, a.file); pr.then(() => paint()); return pr; };
  const pickAttach = () => { const el = document.getElementById('saiFile'); if (el) el.click(); };
  const retryAttach = id => { const a = state.attach.find(x => x.id === id); if (a) { a.status = 'processing'; paint(); runAttach(a); } };
  const removeAttach = id => { state.attach = state.attach.filter(a => a.id !== id); paint(); };
  const handleFiles = files => {
    [...(files || [])].slice(0, MAXATT).forEach(f => {
      try {
        if (state.attach.length >= MAXATT) { if (window.toast) window.toast('একসাথে সর্বোচ্চ ' + MAXATT + 'টি ফাইল — কয়েকটা সরিয়ে আবার দাও 🙏'); return; }
        const base = { id: 'a' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name: f.name || 'ফাইল', size: f.size || 0, status: 'processing', file: f };
        if (/^image\//.test(f.type || '')) state.attach.push(Object.assign(base, { kind: 'image', mime: f.type }));
        else if (/^text\//.test(f.type || '') || /\.(txt|md|json|csv)$/i.test(f.name || '')) state.attach.push(Object.assign(base, { kind: 'text', mime: 'text/plain' }));
        else { if (window.toast) window.toast('এই ধরনের ফাইল এখনো না — ছবি বা টেক্সট ফাইল দাও (PDF আসছে)'); return; }
        paint();
        runAttach(state.attach[state.attach.length - 1]);
      } catch (_) {}
    });
  };
  const setSource = sv => { state.source = sv; state.sheet = null; render(); };
  const setEngine = e => { const c = cfg(); c.engine = e; setCfg(c); state.sheet = null; render(); };
  const pickEngine = pv => { const c = cfg(); c.provider = pv; c.engine = 'fast'; setCfg(c); state.sheet = null; if (!c.keys[pv]) { if (window.toast) window.toast('⚡ ' + pv + '-এর key নেই — সেটিংসে বসাও'); openSheet('settings'); return; } render(); };
  const setProvider = p => { const c = cfg(); c.provider = p; setCfg(c); paint(); };
  const setKey = (k, v) => {
    const c = cfg(); c.keys[k] = String(v || '').split(/\n+/).map(x => x.trim()).filter(Boolean);
    if (c.keys[k]) { // key বসালেই ওই ইঞ্জিনেই উত্তর আসবে — ইউজারের নির্বাচনই শেষ কথা
      c.provider = k;
      if (c.engine !== 'fast') { c.engine = 'fast'; if (window.toast) window.toast('⚡ ফাস্ট-ইঞ্জিন চালু হলো (' + (Array.isArray(c.keys[k]) ? c.keys[k].length : 1) + 'টি key) — এখন থেকে ওই-ই উত্তর দেবে'); }
    }
    setCfg(c);
    state.page === 'settings' ? paint() : render(); // টপবার-চিপ তাজা থাকুক
  };
  const setModel = m => { const c = cfg(); c.model = String(m || '').trim(); setCfg(c); paint(); };
  const setTheme = t => { const c = cfg(); c.theme = t; setCfg(c); applyTheme(); paint(); };
  const toggleData = () => { const c = cfg(); c.sendData = !c.sendData; setCfg(c); paint(); };
  const renameChat = () => { const t = prompt('চ্যাটের নতুন নাম?', chatTitle()); if (t && t.trim()) { const l = listChats(); const c = l.find(x => x.id === curId()); if (c) { c.title = t.trim().slice(0, 40); saveList(l); } state.sheet = null; paint(); } };
  const clearCurrent = () => { if (!confirm('এই কথোপকথনের সব মেসেজ মুছে যাবে — নিশ্চিত?')) return; saveMsgs(curId(), []); state.sheet = null; state.msgsFull = false; saveDraft(''); paint(); };
  const clearChats = () => { if (!confirm('সব চ্যাট মুছে ফেলবো?')) return; listChats().forEach(c => localStorage.removeItem('studyAiChat:' + c.id)); localStorage.removeItem(LS_LIST); localStorage.removeItem(LS_CUR); state.sheet = null; paint(); };
  const applyTheme = () => {
    const t = cfg().theme;
    const root = document.getElementById('saiThemeStyle') || (() => { const el = document.createElement('style'); el.id = 'saiThemeStyle'; document.head.appendChild(el); return el; })();
    root.textContent = t === 'violet' ? '.sai-page{--sai-bg:linear-gradient(160deg,#faf7ff,#f3eefc 60%,#fdeef6);--sai-mebg:#7a5cf0;--sai-metx:#fff}.me .sai-bubble{background:var(--sai-mebg,#7a5cf0)!important;color:#fff!important;box-shadow:0 4px 12px rgba(122,92,240,.3)!important}.sai-send{background:linear-gradient(135deg,#7a5cf0,#a34ef0)!important;box-shadow:0 6px 16px rgba(122,92,240,.35)!important}.sai-srchip,.sai-sheet-item.on{color:#7a5cf0!important;border-color:#a88ff5!important}'
      : t === 'dark' ? '.sai-page{--sai-bg:linear-gradient(160deg,#0f172a,#111c30 60%,#171f35);--sai-mebg:linear-gradient(135deg,#0ea371,#0d5f46);--sai-metx:#fff}.sai-page .ai .sai-bubble{background:transparent!important;border:none!important;box-shadow:none!important}.sai-page .sai-sub,.sai-page .sai-note{color:#94a3b8!important}.sai-page .sai-hello{color:#f1f5f9}.sai-page .sai-inputbar input{background:#1c2740;color:#e5e7eb;border-color:#2a3757}.sai-page .sai-plus{background:#1c2740;color:#e5e7eb;border-color:#2a3757}.sai-send{background:linear-gradient(135deg,#0ea371,#0f6b4f)!important}.sai-page .sai-share{background:#1c2740;color:#e5e7eb}.sai-page .sai-share .muted{color:#94a3b8}.sai-page .sai-srchip{background:#1c2740;color:#34d399;border-color:#2a3757}.sai-page .sai-md{color:#d7e2db!important}.sai-page .sai-md strong,.sai-page .sai-md em,.sai-page .sai-h{color:#6ee7b7!important}.sai-page .sai-shimmer{background:linear-gradient(90deg,#6ee7b7 25%,#ecfdf5 45%,#6ee7b7 65%);background-size:220% auto;-webkit-background-clip:text;background-clip:text}.sai-page .me .sai-meta{color:rgba(226,240,232,.55)}'
      : '';
  };

  // ── ড্যাশবোর্ড এন্ট্রি ─────────────────────────────────────────────────────────
  const MOUNT_ID = 'studyAiDashboardEntry';
  const mountDashboard = () => {
    try {
      const page = document.getElementById('app');
      if (!page || document.getElementById(MOUNT_ID)) return;
      if (route() !== 'dashboard' && !page.querySelector('[data-unified-study-tools-list]')) return;
      const host = page.querySelector('[data-unified-study-tools-list]');
      if (!host) return;
      const entry = document.createElement('button');
      entry.type = 'button';
      entry.id = MOUNT_ID;
      entry.className = 'standalone-mock-dashboard-entry p3-unified-tool-row-v3';
      entry.setAttribute('aria-label', 'Admihub AI খুলুন');
      entry.onclick = () => navigate(ROUTE);
      entry.innerHTML = `<span class="standalone-mock-dashboard-mark" aria-hidden="true">🎓</span><span class="standalone-mock-dashboard-copy"><b>Admihub AI</b><small>তোমার প্রশ্নব্যাংক বুঝে বন্ধুর মতো সাহায্য — ফুলস্ক্রিন চ্যাটে</small></span><span class="standalone-mock-dashboard-arrow" aria-hidden="true">›</span>`;
      host.appendChild(entry);
    } catch (_) {}
  };
  const bootMount = () => {
    const app = document.getElementById('app');
    if (!app || window.__studyAiObserver) return;
    window.__studyAiObserver = new MutationObserver(() => setTimeout(mountDashboard, 60));
    window.__studyAiObserver.observe(app, { childList: true, subtree: true });
    window.addEventListener?.('hashchange', () => setTimeout(mountDashboard, 250));
    [1200, 2500, 4500].forEach(d => setTimeout(mountDashboard, d));
  };

  // 🧠 ম্যানুয়াল ব্রেইন-আপডেট (প্রতি-ধরন) — সেটিংস থেকে
  const syncType = async kind => {
    try {
      state.syncing = true; paint();
      await boostData(); await syncBank();
      try { localStorage.setItem('ahBankSig', dataSig()); } catch (_) {}
      const c = cache();
      const label = { history: '📊 পরীক্ষার ইতিহাস — ' + bn(exSorted().length) + 'টি', vocab: '📚 শব্দভাণ্ডার — ' + bn(vocPick().length) + 'টি', mistakes: '❌ ভুল-প্রশ্ন — ' + bn((c.mistakes || []).length) + 'টি', bank: '🗃️ প্রশ্নব্যাংক — ' + bn((c.questions || []).length) + 'টি' }[kind] || 'ডেটা';
      if (window.toast) window.toast('🧠 ' + label + ' — ব্রেইনে টাটকা হলো ✓');
    } catch (e) { if (window.toast) window.toast('⚠️ হয়নি: ' + String(e?.message || e).slice(0, 60)); }
    state.syncing = false; paint();
  };

  // 📝 চ্যাট-পরীক্ষা v2 — এক বড় কার্ড, সব-প্রশ্ন, next/previous, শেষে রেজাল্ট + অটো স্পেশাল-রিভিশন
  const chatExam = { on: false, qs: [], i: 0, picks: {}, mid: null, rev: false };
  const exShuffle = arr => arr.map(x => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  const exAnsOf = q => { const opts = Array.isArray(q.options) ? q.options : []; const ai = Number(q.answerIndex ?? q.answer ?? q.correctAnswerIndex); return { ai, ans: typeof q.answer === 'string' && q.answer ? q.answer : (Number.isFinite(ai) && opts[ai] != null ? String(opts[ai]) : '') }; };
  const exWeakIds = () => [...new Set((cache().mistakes || []).map(m => { try { return (m && m.q && m.q.topicId) || (m && m.topicId) || ''; } catch (_) { return ''; } }).filter(Boolean))];
  const exQBlock = () => {
    const e = chatExam, q = e.qs[e.i]; if (!q) return '';
    const opts = Array.isArray(q.options) ? q.options : [];
    const picked = e.picks[e.i];
    const answered = Object.keys(e.picks).length;
    const last = e.i >= e.qs.length - 1;
    return `<div class="sai-exq"><b>📝 ${e.rev ? '🔄 স্পেশাল রিভিশন' : 'চ্যাট-পরীক্ষা'} · প্রশ্ন ${bn(e.i + 1)}/${bn(e.qs.length)} · উত্তর ${bn(answered)}/${bn(e.qs.length)}</b>${esc(String((q.question ?? q.q) || '').slice(0, 300))}<div style="margin-top:6px">${opts.map((o, oi) => `<button class="sai-exopt${picked === oi ? ' sel' : ''}" onclick="StudyAiTool.examPick(${e.i},${oi})">${'কখগঘঙ'[oi] || oi + 1}) ${esc(String(o).slice(0, 90))}</button>`).join('')}</div><div class="sai-exnav"><button class="sai-exnb" ${e.i === 0 ? 'disabled' : ''} onclick="StudyAiTool.examNav(-1)">← আগের</button><span class="sai-exdots">${e.qs.map((_, di) => `<span class="sai-exdot${di === e.i ? ' cur' : (e.picks[di] != null ? ' done' : '')}">●</span>`).join('')}</span><button class="sai-exnb" ${last ? 'disabled' : ''} onclick="StudyAiTool.examNav(1)">পরের →</button></div>${last || answered >= e.qs.length ? `<button class="sai-exfin" onclick="StudyAiTool.examSubmit()">✅ জমা দিয়ে রেজাল্ট দেখাও${answered < e.qs.length ? ' (বাকি ' + bn(e.qs.length - answered) + ')' : ''}</button>` : ''}</div>`;
  };
  const exPatch = () => { try { if (chatExam.mid) patchMsg(chatExam.mid, { exam: exQBlock() }); } catch (_) {} paint(); };
  const startChatExam = revQs => {
    state.sheet = null;
    let qs;
    if (Array.isArray(revQs)) { qs = revQs; }
    else {
      const pool = (cache().questions || []).filter(q => q && Array.isArray(q.options) && q.options.length >= 2);
      if (!pool.length) { if (window.toast) window.toast('আগে প্রশ্নব্যাংক লোড হোক — তারপর পরীক্ষা! 📚'); return; }
      const weak = exWeakIds();
      const wq = pool.filter(q => weak.includes(String(q.topicId || ''))), rq = pool.filter(q => !weak.includes(String(q.topicId || '')));
      const target = Math.min(8, pool.length);
      qs = exShuffle(wq).slice(0, Math.ceil(target * 0.6)).concat(exShuffle(rq)).slice(0, target);
    }
    chatExam.on = true; chatExam.rev = Array.isArray(revQs); chatExam.qs = qs; chatExam.i = 0; chatExam.picks = {};
    push({ who: 'me', text: chatExam.rev ? '🎯 স্পেশাল রিভিশন শুরু!' : '📝 চ্যাট-পরীক্ষা শুরু!' });
    const m = push({ who: 'ai', text: 'বড় কার্ডে ' + bn(qs.length) + 'টি প্রশ্ন — অপশনে চাপ দাও, ⬅️ আগের/পরের ➡️ দিয়ে ঘুরো, শেষে জমা দিলে রেজাল্ট + রিভিশন! 😄', exam: exQBlock(), status: 'completed' });
    chatExam.mid = m.id;
    paint();
  };
  const examPick = (qi, oi) => { if (!chatExam.on) return; chatExam.picks[qi] = oi; exPatch(); };
  const examNav = d => { if (!chatExam.on) return; chatExam.i = Math.max(0, Math.min(chatExam.qs.length - 1, chatExam.i + d)); exPatch(); };
  const examSubmit = () => {
    if (!chatExam.on) return;
    const e = chatExam;
    let score = 0; const wrongs = [];
    e.qs.forEach((q, qi) => { const { ai, ans } = exAnsOf(q); if (e.picks[qi] === ai) score++; else wrongs.push({ q, ans, picked: e.picks[qi] }); });
    const pct = e.qs.length ? Math.round(score * 100 / e.qs.length) : 0;
    const weakTopics = [...new Set(wrongs.map(w => { try { return topName(w.q.topicId) || String(w.q.topicId || ''); } catch (_) { return ''; } }).filter(Boolean))];
    const review = wrongs.slice(0, 8).map(w => `<div class="sai-exrev">✗ ${esc(String((w.q.question ?? w.q.q) || '').slice(0, 90))}<br><small>সঠিক: ${esc(w.ans.slice(0, 60))}${w.picked != null ? ' · তোমার: ' + esc(String((w.q.options || [])[w.picked] ?? '').slice(0, 40)) : ' · উত্তর দাওনি'}</small></div>`).join('');
    const card = `<div class="sai-exq"><b>🏁 রেজাল্ট: ${bn(score)}/${bn(e.qs.length)} (${bn(pct)}%)</b>${pct >= 80 ? 'দুর্দান্ত! 🎉' : pct >= 60 ? 'ভালো — আরও একটু! 💪' : 'চিন্তা নেই — নিচের রিভিশন শেষ করলেই ঠিক হয়ে যাবে! 🌱'}${review || '<div class="sai-exrev">সব ঠিক — পারফেক্ট! ✨</div>'}</div>`;
    if (chatExam.mid) patchMsg(chatExam.mid, { exam: card, status: 'completed' });
    try { const c2 = cache(); c2.examResults = Array.isArray(c2.examResults) ? c2.examResults : []; c2.examResults.unshift({ completedAt: Date.now(), at: Date.now(), totalQuestions: e.qs.length, correctCount: score, mode: 'chat' }); } catch (_) {}
    try { localStorage.setItem('saiCoachNote', JSON.stringify({ at: Date.now(), score, total: e.qs.length, weak: weakTopics })); } catch (_) {}
    chatExam.on = false; chatExam.mid = null;
    push({ who: 'ai', text: pct >= 80 ? 'শাবাশ! পরেরবার আরও কঠিন নেবো 😎' : 'এবার ভুলগুলোর জন্য 🎯 স্পেশাল রিভিশন নিচ্ছি — ঠিক ওই টপিকগুলো থেকে!', status: 'completed' });
    paint();
    try { ensureSync(false); } catch (_) {}
    if (wrongs.length) setTimeout(() => { try { startChatExam(exShuffle(wrongs.map(w => w.q)).slice(0, 5)); } catch (_) {} }, 900);
  };

  window.StudyAiTool = { render, renderMd: md, send, quick, shareData, skipShare, editName, openSheet, closeSheet, closePage, setSource, newChat, openChat, delChat, clearChats, clearCurrent, renameChat, setEngine, pickEngine, setProvider, setKey, setModel, setTheme, toggleData, pickAttach, handleFiles, removeAttach, retryAttach, testKey, ensureSync, forceSync, dupCheck, syncType, startChatExam, examPick, examNav, examSubmit, stopGen, copyMsg, editMsg, retryMsg, regenerate, rate, expandMsgs, viewer, viewerTray, viewerNav, viewerClose, _state: () => state };
  if (typeof document !== 'undefined') bootMount();
})();
