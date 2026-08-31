// Admission Hub — Public Product Worker (Workers + KV, ফ্রি টিয়ার)
// রুট: /api/content · /api/auth/* · /api/state · /api/ai · /api/admin/*
const JSONH = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization,content-type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: JSONH });
const GEM_CHAIN = ['gemini-3.1-flash-lite', 'gemini-3-flash-preview', 'gemini-2.5-flash'];
const OLD_WORKER = 'https://admission-gk.rashelzayan213.workers.dev';
const SYS = ai => `তুমি "স্টাডি বন্ধু" — বাংলাদেশি ভর্তি-প্রস্তুতির বন্ধুসুলভ AI টিউটর (অ্যাপ: Admission Hub)। আজ: ${new Date().toLocaleDateString('bn-BD', { timeZone: 'Asia/Dhaka' })}।
কোচ-ভূমিকা: শুধু উত্তর নয় — শিক্ষার্থীর ইতিহাস/ভুল/শব্দ দেখে লক্ষ্য ঠিক করো, রিভিশন-প্ল্যান দাও, মনে-রাখার টিপস দাও।
নিয়ম: সহজ-উষ্ণ বাংলায় তুমি-ফর্ম, ২-৬ লাইন, হালকা emoji। ${ai ? 'নিচের [লাইভ-মেমোরি] সাইলেন্টলি ব্যবহার করো, raw ডাম্প নয়।' : ''}`;
const bn = n => String(n).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: JSONH });
    const url = new URL(request.url), p = url.pathname;
    try {
      if (p === '/api/health') return json({ ok: true, at: Date.now() });
      if (p === '/api/content' && request.method === 'GET') {
        const raw = await env.PUB_KV.get('pubContent');
        return json(raw ? JSON.parse(raw) : { v: 0, at: 0, questions: [], vocabulary: [], exams: [] });
      }
      if (p === '/api/auth/request' && request.method === 'POST') return await authReq(request, env);
      if (p === '/api/auth/verify' && request.method === 'POST') return await authVerify(request, env);
      if (p.startsWith('/api/admin/')) return await admin(request, env, p);
      const uid = await authUser(request, env);
      if (p === '/api/state' && request.method === 'GET') return json(JSON.parse((await env.PUB_KV.get('ustate:' + uid)) || 'null'));
      if (p === '/api/state' && request.method === 'POST') {
        const b = await request.json();
        await env.PUB_KV.put('ustate:' + uid, JSON.stringify(b).slice(0, 480000));
        await touchUser(env, uid);
        return json({ saved: true, at: Date.now() });
      }
      if (p === '/api/ai' && request.method === 'POST') return await aiCall(request, env, uid);
      return json({ error: 'not-found' }, 404);
    } catch (e) { return json({ error: String(e?.message || e).slice(0, 140) }, 500); }
  }
};

/* ── লগইন: ইউজারনেম / মোবাইল / জিমেইল + OTP ── */
const normId = s => { s = String(s || '').trim(); if (/^\+?\d[\d\s-]{8,14}$/.test(s)) return 'ph:' + s.replace(/\D/g, ''); if (s.includes('@')) return 'em:' + s.toLowerCase(); return 'un:' + s.toLowerCase().slice(0, 40); };
const authReq = async (request, env) => {
  const b = await request.json().catch(() => ({}));
  const id = normId(b.id); if (id.length < 4) return json({ error: 'সঠিক নাম/মোবাইল/জিমেইল লেখো' }, 400);
  const code = String(Math.floor(100000 + Math.random() * 900000));
  await env.PUB_KV.put('otp:' + id, JSON.stringify({ code, exp: Date.now() + 5 * 60000 }), { expirationTtl: 600 });
  const blocked = JSON.parse((await env.PUB_KV.get('user:' + id)) || '{}').blocked;
  if (blocked) return json({ error: 'এই অ্যাকাউন্ট সাময়িক বন্ধ — সাপোর্টে যোগাযোগ করো' }, 403);
  let demo = true;
  if (env.RESEND_KEY && env.MAIL_FROM && id.startsWith('em:')) {
    try {
      const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + env.RESEND_KEY }, body: JSON.stringify({ from: env.MAIL_FROM, to: [id.slice(3)], subject: 'Admission Hub লগইন কোড', text: 'তোমার লগইন কোড: ' + code + ' (৫ মিনিট)' }) });
      demo = !r.ok;
    } catch (_) {}
  }
  return json({ sent: true, demo, code: demo ? code : undefined, note: demo ? 'ডেমো-মোড: কোডটি সরাসরি দেখানো হচ্ছে (ইমেইল-সার্ভিস যুক্ত হলে শুধু ইমেইলে যাবে)' : 'ইমেইলে কোড পাঠানো হয়েছে' });
};
const authVerify = async (request, env) => {
  const b = await request.json().catch(() => ({}));
  const id = normId(b.id);
  const o = JSON.parse((await env.PUB_KV.get('otp:' + id)) || '{}');
  if (!o.code || o.exp < Date.now() || String(b.code) !== o.code) return json({ error: 'কোড ভুল বা সময় শেষ' }, 401);
  await env.PUB_KV.delete('otp:' + id);
  const u = JSON.parse((await env.PUB_KV.get('user:' + id)) || '{}');
  if (u.blocked) return json({ error: 'অ্যাকাউন্ট বন্ধ' }, 403);
  const token = crypto.randomUUID().replace(/-/g, '');
  const rec = { id, name: String(b.name || u.name || 'শিক্ষার্থী').slice(0, 30), contact: id.startsWith('ph:') ? '+৮৮' + id.slice(3) : id.slice(3), created: u.created || Date.now(), lastSeen: Date.now(), blocked: false };
  await env.PUB_KV.put('user:' + id, JSON.stringify(rec));
  await env.PUB_KV.put('tok:' + token, JSON.stringify({ id, at: Date.now() }), { expirationTtl: 31536000 });
  return json({ token, user: { name: rec.name, contact: rec.contact, created: rec.created } });
};
const authUser = async (request, env) => {
  const t = String(request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  const tr = JSON.parse((await env.PUB_KV.get('tok:' + t)) || 'null');
  if (!tr) throw Object.assign(new Error('আগে লগইন করো'), { status: 401 });
  const u = JSON.parse((await env.PUB_KV.get('user:' + tr.id)) || '{}');
  if (u.blocked) throw Object.assign(new Error('অ্যাকাউন্ট বন্ধ করা হয়েছে'), { status: 403 });
  return tr.id;
};
const touchUser = async (env, id) => { const u = JSON.parse((await env.PUB_KV.get('user:' + id)) || '{}'); if (u.id) { u.lastSeen = Date.now(); await env.PUB_KV.put('user:' + id, JSON.stringify(u)); } };

/* ── AI (admin-এর key-তে; ব্রেইন = অ্যাপ-ডেটা + ইউজার-ডেটা অটো) ── */
const tok = s => String(s || '').toLowerCase().split(/[^\p{L}\p{M}\p{N}]+/u).filter(t => t.length > 2).slice(0, 24);
const bankMatch = (qs, text) => {
  const tk = tok(text); if (tk.length < 2) return [];
  return qs.map(q => { const hay = String(q.q || '').toLowerCase(); let sc = 0; for (const t of tk) if (hay.includes(t)) sc++; return { q, sc }; }).filter(x => x.sc >= Math.max(2, Math.ceil(tk.length * 0.4))).sort((a, b) => b.sc - a.sc).slice(0, 6);
};
const aiCall = async (request, env, uid) => {
  const b = await request.json().catch(() => ({}));
  const msgs = (Array.isArray(b.messages) ? b.messages : []).slice(-8).map(m => ({ role: m.role === 'ai' ? 'assistant' : (m.role || 'user'), content: String(m.content || '').slice(0, 4000) }));
  const lastU = [...msgs].reverse().find(m => m.role === 'user');
  const [contentRaw, stRaw] = await Promise.all([env.PUB_KV.get('pubContent'), env.PUB_KV.get('ustate:' + uid)]);
  const C = contentRaw ? JSON.parse(contentRaw) : { questions: [], vocabulary: [] };
  const st = stRaw ? JSON.parse(stRaw) : {};
  const subs = [...new Set((C.questions || []).map(q => q.s).filter(Boolean))];
  let brain = `[লাইভ-মেমোরি — অ্যাপ + শিক্ষার্থী]\nঅ্যাপ-ব্যাংক: ${bn((C.questions || []).length)} প্রশ্ন · বিষয়: ${subs.slice(0, 8).join(', ')} · শব্দ: ${bn((C.vocabulary || []).length)}\n`;
  const exs = (st.attempts || []).slice(0, 5).map(a => `${a.mode === 'exam' ? 'পরীক্ষা' : 'প্র্যাকটিস'}(${a.sub || ''}): ${bn(a.right)}/${bn(a.total)}`);
  if (exs.length) brain += 'সাম্প্রতিক ফল: ' + exs.join(', ') + '\n';
  const mis = (st.mistakes || []).slice(0, 6).map(m => `— ${String(m.q || '').slice(0, 70)} ⇒ সঠিক: ${String(m.a || '').slice(0, 40)}`);
  if (mis.length) brain += 'সাম্প্রতিক ভুল (সঠিক-উত্তরসহ):\n' + mis.join('\n') + '\n';
  if ((st.vocab || []).length) brain += `শেখা শব্দ: ${bn(st.vocab.length)}টি — সাম্প্রতিক: ${(st.vocab || []).slice(-6).map(v => v.w).join(', ')}\n`;
  const hits = bankMatch(C.questions || [], lastU ? lastU.content : '');
  if (hits.length) brain += 'ব্যাংক থেকে মিলে-যাওয়া প্রশ্ন (উত্তরের ভিত্তি):\n' + hits.map(h => `— ${String(h.q.q).slice(0, 110)}${h.q.a != null && (h.q.o || [])[h.q.a] ? ' ⇒ উত্তর: ' + String(h.q.o[h.q.a]).slice(0, 50) : ''}`).join('\n');
  const keys = String(env.GEMINI_KEYS || '').split(',').map(s => s.trim()).filter(Boolean);
  if (!keys.length) return json({ error: 'AI-key কনফিগার নেই (admin)' }, 503);
  let last = '';
  for (const k of keys) for (const m of GEM_CHAIN) {
    try {
      const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + m + ':generateContent', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': k }, body: JSON.stringify({ system_instruction: { parts: [{ text: SYS(true) + '\n\n' + brain }] }, contents: msgs.length ? msgs : [{ role: 'user', parts: [{ text: 'হ্যালো' }] }] }) });
      const d = await r.json().catch(() => ({}));
      const t = String(d?.candidates?.[0]?.content?.parts?.map(x => x.text || '').join('') || '').trim();
      if (r.ok && t) { await touchUser(env, uid); return json({ text: t, model: m }); }
      last = 'HTTP ' + r.status + ' ' + m;
    } catch (e) { last = String(e.message || e); }
  }
  return json({ error: 'AI এখন ব্যস্ত — একটু পরে (' + last + ')' }, 502);
};

/* ── Admin (Bearer ADMIN_TOKEN) ── */
const admin = async (request, env, p) => {
  const t = String(request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  if (!env.ADMIN_TOKEN || t !== env.ADMIN_TOKEN) return json({ error: 'forbidden' }, 403);
  if (p === '/api/admin/content' && request.method === 'GET') { const raw = await env.PUB_KV.get('pubContent'); return json(raw ? JSON.parse(raw) : { v: 0, questions: [], vocabulary: [], exams: [] }); }
  if (p === '/api/admin/users' && request.method === 'GET') {
    const out = [];
    const lst = await env.PUB_KV.list({ prefix: 'user:' });
    for (const k of lst.keys) { const u = JSON.parse((await env.PUB_KV.get(k.name)) || '{}'); const st = JSON.parse((await env.PUB_KV.get('ustate:' + u.id)) || '{}'); out.push({ id: u.id, name: u.name, contact: u.contact, created: u.created, lastSeen: u.lastSeen, blocked: !!u.blocked, exams: (st.attempts || []).filter(a => a.mode === 'exam').length, practices: (st.attempts || []).filter(a => a.mode !== 'exam').length, vocab: (st.vocab || []).length, mistakes: (st.mistakes || []).length }); }
    out.sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));
    return json({ users: out });
  }
  if (p === '/api/admin/user' && request.method === 'GET') { const id = new URL(request.url).searchParams.get('id') || ''; return json(JSON.parse((await env.PUB_KV.get('ustate:' + id)) || 'null')); }
  if (p === '/api/admin/block' && request.method === 'POST') {
    const b = await request.json().catch(() => ({}));
    const id = String(b.id || ''); const u = JSON.parse((await env.PUB_KV.get('user:' + id)) || 'null');
    if (!u) return json({ error: 'user-not-found' }, 404);
    u.blocked = !!b.blocked; await env.PUB_KV.put('user:' + id, JSON.stringify(u));
    return json({ ok: true, blocked: u.blocked });
  }
  if (p === '/api/admin/publish' && request.method === 'POST') {
    const b = await request.json().catch(() => ({}));
    let qs = Array.isArray(b.questions) ? b.questions : null, voc = Array.isArray(b.vocabulary) ? b.vocabulary : null, exs = Array.isArray(b.exams) ? b.exams : null;
    if (b.pull) {
      // একই অ্যাকাউন্টের KV-binding — worker→worker HTTP লুপ (CF 1042) বাইপাস
      const raw = env.OLD_KV ? await env.OLD_KV.get('userBank') : null;
      const bank = raw ? JSON.parse(raw) : {};
      qs = (bank.qs || []).map(q => ({ s: q.s || '', t: q.t || '', q: q.q || '', o: q.o || [], a: Number(q.a) || 0, e: q.e || '' }));
      voc = (bank.vocabulary || []).map(v => ({ w: v.w || v.word || '', m: v.m || v.meaning || '' })).filter(v => v.w);
    }
    if (!qs || !qs.length) return json({ error: 'প্রশ্ন খালি' }, 400);
    const prev = JSON.parse((await env.PUB_KV.get('pubContent')) || '{"v":0}');
    const doc = { v: (prev.v || 0) + 1, at: Date.now(), questions: qs.slice(0, 12000), vocabulary: (voc || prev.vocabulary || []).slice(0, 8000), exams: exs || prev.exams || [{ id: 'mock1', title: 'মক পরীক্ষা ১', mins: 15, n: Math.min(15, qs.length), published: true, desc: 'সব বিষয় মিশিয়ে' }] };
    await env.PUB_KV.put('pubContent', JSON.stringify(doc).slice(0, 24 * 1024 * 1024));
    return json({ published: true, v: doc.v, questions: doc.questions.length, vocabulary: doc.vocabulary.length, exams: doc.exams.length });
  }
  return json({ error: 'not-found' }, 404);
};
