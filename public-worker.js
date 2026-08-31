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

const stripHeavyRow = x => {
  if (!x || typeof x !== 'object') return x;
  const o = Object.assign({}, x);
  ['imageDataUrl', 'image', 'thumbnail'].forEach(k => {
    if (typeof o[k] === 'string' && o[k].startsWith('data:') && o[k].length > 900000) delete o[k];
  });
  return o;
};
const onlyRows = arr => (Array.isArray(arr) ? arr : []).filter(x => x && x.id).map(stripHeavyRow);
const fingerprintGlobal = doc => {
  const q = doc.questions || [];
  return [
    (doc.subjects || []).length,
    (doc.topics || []).length,
    q.length,
    (doc.vocabulary || []).length,
    (doc.vocabularyMaster || []).length,
    q.reduce((n, x) => n + String(x.question || x.q || '').length, 0)
  ].join(':');
};
const countsOf = doc => ({
  subjects: (doc.subjects || []).length,
  topics: (doc.topics || []).length,
  questions: (doc.questions || []).length,
  vocabulary: (doc.vocabulary || []).length,
  vocabularyMaster: (doc.vocabularyMaster || []).length
});


const PERSONAL_KEYS = ['examResults', 'mistakes', 'settings', 'dailyStats', 'activityLogs', 'notes', 'v', 'at'];
function sanitizeState(b) {
  const out = { v: 1, at: Date.now() };
  if (!b || typeof b !== 'object') return out;
  for (const k of PERSONAL_KEYS) {
    if (k === 'v' || k === 'at') continue;
    if (Array.isArray(b[k])) out[k] = b[k];
    else if (k === 'settings' && b[k] && typeof b[k] === 'object') out[k] = Array.isArray(b[k]) ? b[k] : [b[k]];
  }
  out.v = Number(b.v) || 1;
  out.at = Number(b.at) || Date.now();
  return out;
};
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function hashPassword(password, saltB64) {
  const enc = new TextEncoder();
  const salt = saltB64 ? unb64(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(String(password)), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 }, key, 256);
  return { hash: b64(bits), salt: b64(salt) };
};
function publicUser(u) { return u ? ({
  id: u.id, uid: u.uid || u.id, name: u.name, contact: u.contact,
  verified: !!u.verified, status: u.status || (u.blocked ? 'disabled' : 'active'),
  created: u.created, lastSeen: u.lastSeen
}) : null; }
async function issueToken(env, rec) {
  const token = crypto.randomUUID().replace(/-/g, '');
  await env.PUB_KV.put('tok:' + token, JSON.stringify({ id: rec.id, at: Date.now() }), { expirationTtl: 31536000 });
  rec.lastSeen = Date.now();
  await env.PUB_KV.put('user:' + rec.id, JSON.stringify(rec));
  return { token, user: publicUser(rec) };
};
async function rateLimit(env, key, max, ttl) {
  const k = 'rl:' + key;
  const n = Number((await env.PUB_KV.get(k)) || 0) + 1;
  await env.PUB_KV.put(k, String(n), { expirationTtl: ttl });
  return n <= max;
};

export const publishGlobal = async (env, full) => {
  if (!env || !env.PUB_KV) return { error: 'no-pub-kv' };
  const src = full && typeof full === 'object' ? full : {};
  const subjects = onlyRows(src.subjects);
  const topics = onlyRows(src.topics);
  const questions = onlyRows(src.questions);
  const vocabulary = onlyRows(src.vocabulary);
  const vocabularyMaster = onlyRows(src.vocabularyMaster);
  if (!questions.length && !vocabularyMaster.length) return { error: 'empty' };
  const sig = fingerprintGlobal({ subjects, topics, questions, vocabulary, vocabularyMaster });
  let prevMeta = { v: 0 };
  try { prevMeta = JSON.parse((await env.PUB_KV.get('pubContentMeta')) || '{"v":0}'); } catch (_) {}
  if (prevMeta.sig === sig && prevMeta.v) {
    return { published: false, unchanged: true, v: prevMeta.v, counts: prevMeta.counts || countsOf({ subjects, topics, questions, vocabulary, vocabularyMaster }) };
  }
  let exams = [{ id: 'mock1', title: 'মক পরীক্ষা ১', mins: 15, n: Math.min(15, questions.length || 1), published: true, desc: 'সব বিষয় মিশিয়ে' }];
  try {
    const prev = JSON.parse((await env.PUB_KV.get('pubContent')) || '{}');
    if (Array.isArray(prev.exams) && prev.exams.length) exams = prev.exams;
  } catch (_) {}
  const doc = { v: (Number(prevMeta.v) || 0) + 1, at: Date.now(), sig, subjects, topics, questions, vocabulary, vocabularyMaster, exams };
  let raw = JSON.stringify(doc);
  if (raw.length > 24 * 1024 * 1024) {
    doc.vocabularyMaster = (doc.vocabularyMaster || []).map(x => { const o = Object.assign({}, x); delete o.imageDataUrl; delete o.image; return o; });
    raw = JSON.stringify(doc);
  }
  await env.PUB_KV.put('pubContent', raw.slice(0, 24 * 1024 * 1024));
  const meta = { v: doc.v, at: doc.at, sig: doc.sig, counts: countsOf(doc) };
  await env.PUB_KV.put('pubContentMeta', JSON.stringify(meta));
  return { published: true, v: doc.v, counts: meta.counts };
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: JSONH });
    const url = new URL(request.url), p = url.pathname;
    try {
      if (p === '/api/health') return json({ ok: true, at: Date.now() });
      if (p === '/api/content/meta' && request.method === 'GET') {
        const raw = await env.PUB_KV.get('pubContentMeta');
        if (raw) return json(JSON.parse(raw));
        const full = await env.PUB_KV.get('pubContent');
        const d = full ? JSON.parse(full) : { v: 0, at: 0, questions: [] };
        return json({ v: d.v || 0, at: d.at || 0, sig: d.sig || '', counts: countsOf(d) });
      }
      if (p === '/api/content' && request.method === 'GET') {
        const raw = await env.PUB_KV.get('pubContent');
        return json(raw ? JSON.parse(raw) : { v: 0, at: 0, questions: [], vocabulary: [], exams: [] });
      }
      if (p === '/api/auth/config' && request.method === 'GET') return json({ google: !!env.GOOGLE_CLIENT_ID, googleClientId: env.GOOGLE_CLIENT_ID || '' });
      if (p === '/api/auth/request' && request.method === 'POST') return await authReq(request, env);
      if (p === '/api/auth/verify' && request.method === 'POST') return await authVerify(request, env);
      if (p === '/api/auth/register' && request.method === 'POST') return await authRegister(request, env);
      if (p === '/api/auth/login' && request.method === 'POST') return await authLogin(request, env);
      if (p === '/api/auth/google' && request.method === 'POST') return await authGoogle(request, env);
      if (p === '/api/auth/logout' && request.method === 'POST') return await authLogout(request, env);
      if (p === '/api/auth/me' && request.method === 'GET') {
        const uid = await authUser(request, env);
        const u = JSON.parse((await env.PUB_KV.get('user:' + uid)) || 'null');
        return json({ user: publicUser(u) });
      }
      if (p.startsWith('/api/admin/')) return await admin(request, env, p);
      const uid = await authUser(request, env);
      if (p === '/api/state' && request.method === 'GET') return json(JSON.parse((await env.PUB_KV.get('ustate:' + uid)) || 'null'));
      if (p === '/api/state' && request.method === 'POST') {
        const b = await request.json();
        await env.PUB_KV.put('ustate:' + uid, JSON.stringify(sanitizeState(b)).slice(0, 1800000));
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
  const ip = request.headers.get('CF-Connecting-IP') || 'ip';
  if (!(await rateLimit(env, 'otp:' + ip, 8, 3600))) return json({ error: 'একটু পরে আবার চেষ্টা করো' }, 429);
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
  if (u.status === 'disabled' || u.status === 'suspended' || u.blocked) return json({ error: 'অ্যাকাউন্ট বন্ধ' }, 403);
  const rec = { id, uid: u.uid || crypto.randomUUID(), name: String(b.name || u.name || 'শিক্ষার্থী').slice(0, 30), contact: id.startsWith('ph:') ? '+৮৮' + id.slice(3) : id.slice(3), created: u.created || Date.now(), lastSeen: Date.now(), blocked: false, verified: true, status: 'active', providers: Array.from(new Set([...(u.providers || []), 'otp'])) };
  const issued = await issueToken(env, rec);
  return json(issued);
};

const authRegister = async (request, env) => {
  const ip = request.headers.get('CF-Connecting-IP') || 'ip';
  if (!(await rateLimit(env, 'reg:' + ip, 10, 3600))) return json({ error: 'একটু পরে আবার চেষ্টা করো' }, 429);
  const b = await request.json().catch(() => ({}));
  const id = normId(b.id);
  const password = String(b.password || '');
  if (id.length < 4) return json({ error: 'সঠিক ইমেইল বা মোবাইল লেখো' }, 400);
  if (password.length < 6) return json({ error: 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষর' }, 400);
  const existing = JSON.parse((await env.PUB_KV.get('user:' + id)) || 'null');
  if (existing && existing.passHash) return json({ error: 'এই অ্যাকাউন্ট আগেই আছে — লগইন করো' }, 409);
  const hp = await hashPassword(password);
  const rec = {
    id, uid: (existing && existing.uid) || crypto.randomUUID(),
    name: String(b.name || (existing && existing.name) || 'শিক্ষার্থী').slice(0, 30),
    contact: id.startsWith('ph:') ? '+৮৮' + id.slice(3) : id.slice(3),
    created: (existing && existing.created) || Date.now(), lastSeen: Date.now(),
    blocked: false, verified: !!existing?.verified, status: 'active',
    passHash: hp.hash, passSalt: hp.salt, providers: Array.from(new Set([...(existing && existing.providers || []), 'password']))
  };
  const issued = await issueToken(env, rec);
  return json(issued);
};
const authLogin = async (request, env) => {
  const ip = request.headers.get('CF-Connecting-IP') || 'ip';
  if (!(await rateLimit(env, 'login:' + ip, 20, 3600))) return json({ error: 'একটু পরে আবার চেষ্টা করো' }, 429);
  const b = await request.json().catch(() => ({}));
  const id = normId(b.id);
  const u = JSON.parse((await env.PUB_KV.get('user:' + id)) || 'null');
  if (!u || !u.passHash) return json({ error: 'ইমেইল/মোবাইল বা পাসওয়ার্ড ভুল' }, 401);
  if (u.blocked || u.status === 'disabled' || u.status === 'suspended') return json({ error: 'অ্যাকাউন্ট বন্ধ' }, 403);
  const hp = await hashPassword(String(b.password || ''), u.passSalt);
  if (hp.hash !== u.passHash) return json({ error: 'ইমেইল/মোবাইল বা পাসওয়ার্ড ভুল' }, 401);
  return json(await issueToken(env, u));
};
const authLogout = async (request, env) => {
  const t = String(request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  if (t) await env.PUB_KV.delete('tok:' + t);
  return json({ ok: true });
};
const authGoogle = async (request, env) => {
  const b = await request.json().catch(() => ({}));
  const idToken = String(b.idToken || '');
  if (!idToken) return json({ error: 'Google টোকেন নেই' }, 400);
  const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken));
  const g = await r.json().catch(() => ({}));
  if (!r.ok || !g.email) return json({ error: 'Google লগইন ব্যর্থ' }, 401);
  if (env.GOOGLE_CLIENT_ID && g.aud !== env.GOOGLE_CLIENT_ID) return json({ error: 'Google ক্লায়েন্ট মিলছে না' }, 401);
  const id = normId(g.email);
  const existing = JSON.parse((await env.PUB_KV.get('user:' + id)) || '{}');
  if (existing.blocked || existing.status === 'disabled' || existing.status === 'suspended') return json({ error: 'অ্যাকাউন্ট বন্ধ' }, 403);
  const rec = {
    id, uid: existing.uid || crypto.randomUUID(),
    name: String(b.name || g.name || existing.name || 'শিক্ষার্থী').slice(0, 30),
    contact: g.email, created: existing.created || Date.now(), lastSeen: Date.now(),
    blocked: false, verified: true, status: 'active',
    passHash: existing.passHash, passSalt: existing.passSalt,
    providers: Array.from(new Set([...(existing.providers || []), 'google']))
  };
  return json(await issueToken(env, rec));
};

const authUser = async (request, env) => {
  const t = String(request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  const tr = JSON.parse((await env.PUB_KV.get('tok:' + t)) || 'null');
  if (!tr) throw Object.assign(new Error('আগে লগইন করো'), { status: 401 });
  const u = JSON.parse((await env.PUB_KV.get('user:' + tr.id)) || '{}');
  if (u.blocked || u.status === 'disabled' || u.status === 'suspended') throw Object.assign(new Error('অ্যাকাউন্ট বন্ধ করা হয়েছে'), { status: 403 });
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
    for (const k of lst.keys) { const u = JSON.parse((await env.PUB_KV.get(k.name)) || '{}'); const st = JSON.parse((await env.PUB_KV.get('ustate:' + u.id)) || '{}'); out.push({ id: u.id, uid: u.uid || u.id, name: u.name, contact: u.contact, created: u.created, lastSeen: u.lastSeen, blocked: !!u.blocked, verified: !!u.verified, status: u.status || (u.blocked ? 'disabled' : 'active'), exams: (st.examResults || st.attempts || []).length, mistakes: (st.mistakes || []).length }); }
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
  if (p === '/api/admin/status' && request.method === 'POST') {
    const b = await request.json().catch(() => ({}));
    const id = String(b.id || '');
    const u = JSON.parse((await env.PUB_KV.get('user:' + id)) || 'null');
    if (!u) return json({ error: 'user-not-found' }, 404);
    const status = String(b.status || 'active');
    if (!['active', 'disabled', 'suspended'].includes(status)) return json({ error: 'bad-status' }, 400);
    u.status = status; u.blocked = status !== 'active';
    await env.PUB_KV.put('user:' + id, JSON.stringify(u));
    return json({ ok: true, status: u.status });
  }
  if (p === '/api/admin/publish' && request.method === 'POST') {
    const b = await request.json().catch(() => ({}));
    let full = (b.full && typeof b.full === 'object') ? b.full : null;
    if (b.pull) {
      const raw = env.OLD_KV ? await env.OLD_KV.get('userBank') : null;
      const bank = raw ? JSON.parse(raw) : {};
      if (bank.full && typeof bank.full === 'object') full = bank.full;
    }
    if (!full && Array.isArray(b.subjects) && Array.isArray(b.questions)) {
      full = { subjects: b.subjects, topics: b.topics, questions: b.questions, vocabulary: b.vocabulary, vocabularyMaster: b.vocabularyMaster };
    }
    if (full && Array.isArray(full.questions) && full.questions.some(q => q && q.id)) {
      const result = await publishGlobal(env, full);
      if (result.error === 'empty') return json({ error: 'প্রশ্ন খালি' }, 400);
      return json(result);
    }
    return json({ error: 'প্রশ্ন খালি' }, 400);
  }
  return json({ error: 'not-found' }, 404);
};
