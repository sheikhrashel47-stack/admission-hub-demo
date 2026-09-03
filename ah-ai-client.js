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
  window.AH_AI = { ask, askImage, tok, isAuthed, userId, guestId };
})();
