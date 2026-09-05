/* ════════════════════════════════════════════════════════════
   ADMISSION HUB — AI CLIENT GATEWAY (Phase 4 · v179)
   একমাত্র AI পথ: secure backend (/api/ai) — কোনো API key ক্লায়েন্টে নেই।
   - chat / explain / mistake / exam / progress / vocab → server context engine
   - image (ঐচ্ছিক) → server এ মডেল-কল, base64 ফেরত
   - গেস্ট-এও চলে: শুধু গ্লোবাল context; ইউজার-ডেটা-সম্পর্কিত প্রশ্নে সততার ঘোষণা
   ════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (window.AH_AI) return;
  const WORKER = 'https://admission-gk.admissionhub.workers.dev/api';
  const tok = () => {
    try { return localStorage.getItem('ahPubToken') || sessionStorage.getItem('ahPubToken') || ''; } catch (_) { return ''; }
  };
  const isAuthed = () => !!tok();
  const userId = () => {
    try { const u = JSON.parse(localStorage.getItem('ahPubUser') || 'null'); return (u && (u.uid || u.id)) || ''; } catch (_) { return ''; }
  };
  /* গেস্ট-ডিভাইস আইডি — ক্যাশ/হিস্টরি/লিমিট per-ডিভাইস (ভাগাভাগি নয়) */
  const guestId = () => {
    try {
      let g = localStorage.getItem('ahGuestId');
      if (!g || !/^[a-zA-Z0-9\-_]{8,48}$/.test(g)) {
        g = (window.crypto && crypto.randomUUID) ? crypto.randomUUID().replace(/-/g, '') : 'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
        localStorage.setItem('ahGuestId', g);
      }
      return g;
    } catch (_) { return ''; }
  };
  async function ask(opts) {
    const o = opts || {};
    const res = await fetch(WORKER + '/ai', {
      method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, tok() ? { Authorization: 'Bearer ' + tok() } : { 'X-AH-Guest': guestId() }),
      body: JSON.stringify({
        messages: Array.isArray(o.messages) ? o.messages.slice(-8) : [],
        kind: String(o.kind || 'chat').slice(0, 20),
        refs: o.refs || {}
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || 'http-' + res.status);
      err.status = res.status; err.retryAfter = data.retryAfter || 0;
      throw err;
    }
    return data; // { text, model, at, history?, cached? }
  }
  async function askImage(text, attachments) {
    const data = await ask({ kind: 'image', refs: { text: String(text || '').slice(0, 1200), attachments: (attachments || []).slice(0, 4) }, messages: [] });
    return { b64: data.b64 || '', mime: data.mime || 'image/png' };
  }
  /* ⚡ D-V187: ব্রাউজার-ফার্স্ট Gemini — ইউজারের নিজের key-এ সরাসরি কল (ক্লাউড-হপ ছাড়া, কয়েক সেকেন্ড) */
  const LOCAL_MODELS = ['gemini-3.1-flash-lite', 'gemini-3-flash-preview'];
  const localKey = () => {
    try {
      let k = String(localStorage.getItem('gemini_api_key') || '').trim();
      if (!k) { try { const c = JSON.parse(localStorage.getItem('studyAiCfg') || '{}'); const g = c && c.keys && c.keys.gemini; k = String((Array.isArray(g) ? g[0] : g) || '').trim(); } catch (_) {} }
      return k;
    } catch (_) { return ''; }
  };
  async function askLocal(opts) {
    const o = opts || {};
    const key = String(o.key || localKey() || '').trim();
    if (!key) return null;
    const sys = String(o.system || '').slice(0, 4000);
    const msgs = (Array.isArray(o.messages) ? o.messages : []).slice(-8).map(m => ({ role: (String(m.role || 'user') === 'ai' || String(m.role || 'user') === 'assistant') ? 'model' : 'user', content: String(m.content || '').slice(0, 4000) }));
    for (const model of LOCAL_MODELS) {
      const ctrl = new AbortController();
      const to = setTimeout(() => { try { ctrl.abort(); } catch (_) {} }, 14000);
      try {
        const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, signal: ctrl.signal, body: JSON.stringify({ system_instruction: { parts: [{ text: sys }] }, contents: msgs.length ? msgs : [{ role: 'user', parts: [{ text: 'হ্যালো' }] }], generationConfig: { temperature: 0.5, maxOutputTokens: 900 } }) });
        const d = await r.json().catch(() => ({}));
        const t = String((d && d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts || []).map(x => x.text || '').join('') || '').trim();
        if (r.ok && t) return { text: t, model, at: Date.now(), local: true };
      } catch (_) {} finally { clearTimeout(to); }
    }
    return null;
  }
  window.AH_AI = { ask, askImage, askLocal, tok, isAuthed, userId, guestId };
})();
