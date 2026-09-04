// Admission Hub — Public Product Worker (Workers + KV, ফ্রি টিয়ার)
// রুট: /api/content · /api/auth/* · /api/state · /api/ai · /api/admin/*
const JSONH = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization,content-type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: JSONH });
const GEM_CHAIN = ['gemini-3.1-flash-lite', 'gemini-3-flash-preview', 'gemini-2.5-flash'];
const OLD_WORKER = 'https://admission-gk.admissionhub.workers.dev';
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
const kvGetRetry = async (kv, key, opts = {}) => {
  const tries = opts.tries || 6, base = opts.base || 250;
  let v = null;
  for (let i = 0; i < tries; i++) {
    try { v = await kv.get(key); } catch (_) { v = null; }
    if (v !== null && v !== undefined) return v;
    await new Promise((r) => setTimeout(r, base * (i + 1)));
  }
  return v;
};

async function hashPassword(password, saltB64) {
  const enc = new TextEncoder();
  const salt = saltB64 ? unb64(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(String(password)), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 }, key, 256);
  return { hash: b64(bits), salt: b64(salt) };
};
function publicUser(u, profile) {
  if (!u) return null;
  const st = u.status || (u.blocked ? 'disabled' : 'active');
  const email = u.email || (String(u.id||'').startsWith('em:') ? String(u.id).slice(3) : '');
  const mobile = u.mobile || (String(u.id||'').startsWith('ph:') ? String(u.contact||u.id).replace(/^ph:/,'') : '');
  const pf = profile || u.profile || {};
  return {
    id: u.id, uid: u.uid || u.id, name: u.name, displayName: pf.displayName || u.name,
    email, mobile, contact: u.contact || email || mobile,
    verified: !!u.verified, emailVerified: !!u.emailVerified, mobileVerified: !!u.mobileVerified,
    status: st, created: u.created, lastSeen: u.lastSeen, photo: pf.photo || '',
    institution: pf.institution || '', targetUniversity: pf.targetUniversity || '',
    targetUnit: pf.targetUnit || '', admissionYear: pf.admissionYear || '',
    bio: pf.bio || '', dob: pf.dob || '', gender: pf.gender || '', studyGroup: pf.studyGroup || '',
    providers: u.providers || [],
    onboardingCompleted: !!(pf.onboarding && pf.onboarding.completed),
    onboardingStep: (pf.onboarding && pf.onboarding.step) || 0,
    goal: (pf.onboarding && pf.onboarding.goal) || '',
    studyGoal: (pf.onboarding && pf.onboarding.studyGoal) || '',
    currentLevel: (pf.onboarding && pf.onboarding.currentLevel) || 0
  };
}
async function issueToken(env, rec) {
  const token = crypto.randomUUID().replace(/-/g, '');
  await env.PUB_KV.put('tok:' + token, JSON.stringify({ id: rec.id, at: Date.now() }), { expirationTtl: 31536000 });
  rec.lastSeen = Date.now();
  await env.PUB_KV.put('user:' + rec.id, JSON.stringify(rec));
  return { token, user: publicUser(rec) };
}

/* ── Session / device tracking ─────────────────────────────── */
function uaInfo(ua) {
  ua = String(ua || '');
  let device = 'Browser';
  if (/iPhone/i.test(ua)) device = 'iPhone';
  else if (/iPad/i.test(ua)) device = 'iPad';
  else if (/Android/i.test(ua)) device = 'Android';
  else if (/Windows/i.test(ua)) device = 'Windows';
  else if (/Macintosh|Mac OS/i.test(ua)) device = 'Mac';
  else if (/Linux/i.test(ua)) device = 'Linux';
  let browser = 'Browser';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/OPR\//i.test(ua) || /Opera/i.test(ua)) browser = 'Opera';
  else if (/Chrome\//i.test(ua)) browser = 'Chrome';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/Safari\//i.test(ua)) browser = 'Safari';
  return { device, browser, mobile: /Mobi/i.test(ua) };
}
async function trackSession(env, uid, token, ua) {
  try {
    const info = uaInfo(ua);
    const key = 'sess:' + uid;
    let list = JSON.parse((await env.PUB_KV.get(key)) || '{}');
    if (!list || typeof list !== 'object') list = {};
    const prev = list[token] || {};
    list[token] = {
      at: prev.at || Date.now(),
      lastSeen: Date.now(),
      device: info.device, browser: info.browser, mobile: info.mobile,
      ua: String(ua).slice(0, 140)
    };
    await env.PUB_KV.put(key, JSON.stringify(list), { expirationTtl: 31536000 });
  } catch (_) {}
}
async function clearSession(env, uid, token) {
  const key = 'sess:' + uid;
  const list = JSON.parse((await env.PUB_KV.get(key)) || '{}');
  if (list && list[token]) { delete list[token]; await env.PUB_KV.put(key, JSON.stringify(list), { expirationTtl: 31536000 }); }
  await env.PUB_KV.delete('tok:' + token);
}
async function listSessions(env, uid, currentToken) {
  const list = JSON.parse((await env.PUB_KV.get('sess:' + uid)) || '{}');
  const out = [];
  for (const token of Object.keys(list || {})) {
    const s = list[token];
    const live = !!(await env.PUB_KV.get('tok:' + token));
    out.push({
      id: token.slice(0, 8),
      device: s.device || 'Browser', browser: s.browser || '',
      mobile: !!s.mobile,
      firstSeen: s.at || 0, lastSeen: s.lastSeen || 0,
      current: token === currentToken, live
    });
  }
  out.sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));
  return out;
}
async function logAct(env, uid, type, detail) {
  try {
    const key = 'act:' + uid;
    let arr = JSON.parse((await env.PUB_KV.get(key)) || '[]');
    if (!Array.isArray(arr)) arr = [];
    arr.unshift({ type: String(type || 'event'), detail: String(detail || '').slice(0, 160), at: Date.now() });
    if (arr.length > 40) arr = arr.slice(0, 40);
    await env.PUB_KV.put(key, JSON.stringify(arr), { expirationTtl: 31536000 });
  } catch (_) {}
};
async function rateLimit(env, key, max, ttl) {
  const k = 'rl:' + key;
  const now = Date.now();
  let row = null;
  try { row = JSON.parse(await env.PUB_KV.get(k)); } catch (_) {}
  if (!row || typeof row !== 'object' || !row.exp || row.exp < now) row = { n: 0, exp: now + ttl * 1000 };
  row.n = Number(row.n || 0) + 1;
  const remain = Math.max(10, Math.ceil((row.exp - now) / 1000));
  await env.PUB_KV.put(k, JSON.stringify(row), { expirationTtl: remain });
  return row.n <= max;
};

/* ── additive অথ-ইভেন্ট কাউন্টার (Admin AC-4-র read-only হুক; আচরণ বদলায় না) ── */
async function admEvent(env, ev) {
  try {
    if (!env || !env.PUB_KV) return;
    const day = new Date().toISOString().slice(0, 10);
    const k = 'adm-events:' + String(ev).slice(0, 30) + ':' + day;
    const n = Number((await env.PUB_KV.get(k)) || 0) + 1;
    await env.PUB_KV.put(k, String(n), { expirationTtl: 172800 }); /* ২ দিন */
  } catch (_) { /* কখনো মূল-পথ আটকাবে না */ }
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
        await authUser(request, env);
        const raw = await env.PUB_KV.get('pubContentMeta');
        if (raw) return json(JSON.parse(raw));
        const full = await env.PUB_KV.get('pubContent');
        const d = full ? JSON.parse(full) : { v: 0, at: 0, questions: [] };
        return json({ v: d.v || 0, at: d.at || 0, sig: d.sig || '', counts: countsOf(d) });
      }
      if (p === '/api/content' && request.method === 'GET') {
        await authUser(request, env);
        const raw = await env.PUB_KV.get('pubContent');
        return json(raw ? JSON.parse(raw) : { v: 0, at: 0, questions: [], vocabulary: [], exams: [] });
      }
      if (p === '/api/auth/config' && request.method === 'GET') {
        return json({
          google: !!env.GOOGLE_CLIENT_ID,
          googleClientId: env.GOOGLE_CLIENT_ID || '',
          passkey: true,
          email: !!((env.RESEND_KEY || env.RESEND_KEY_2 || env.MAIL_HOOK || env.BREVO_KEY) && (env.MAIL_FROM || env.MAIL_HOOK || env.BREVO_KEY)),
          sms: !!(env.TWILIO_SID && env.TWILIO_TOKEN && env.TWILIO_FROM) || !!(env.SMS_API_URL && env.SMS_API_KEY) || !!env.GREENWEB_TOKEN
        });
      }
      if (p === '/api/auth/register' && request.method === 'POST') return await authRegister(request, env);
      if (p === '/api/auth/register-email' && request.method === 'POST') return await authRegisterEmail(request, env);
      if (p === '/api/auth/wait' && request.method === 'POST') return await authWait(request, env);
      if (p === '/api/auth/login' && request.method === 'POST') return await authLogin(request, env);
      if (p === '/api/auth/google' && request.method === 'POST') return await authGoogle(request, env);
      if (p === '/api/auth/passkey/register/begin' && request.method === 'POST') return await pkRegBegin(request, env);
      if (p === '/api/auth/passkey/register/finish' && request.method === 'POST') return await pkRegFinish(request, env);
      if (p === '/api/auth/passkey/login/begin' && request.method === 'POST') return await pkLoginBegin(request, env);
      if (p === '/api/auth/passkey/login/finish' && request.method === 'POST') return await pkLoginFinish(request, env);
      if (p === '/api/auth/passkey/remove' && request.method === 'POST') return await authRemovePasskey(request, env);
      if (p === '/api/auth/verify-link' && request.method === 'POST') return await authVerifyLink(request, env);
      if (p === '/api/auth/confirm' && (request.method === 'GET' || request.method === 'POST')) return await authConfirm(request, env);
      if (p === '/api/auth/otp/send' && request.method === 'POST') return await otpSend(request, env);
      if (p === '/api/auth/otp/verify' && request.method === 'POST') return await otpVerify(request, env);
      if (p === '/api/auth/request' && request.method === 'POST') return await otpSend(request, env);
      if (p === '/api/auth/verify' && request.method === 'POST') return await otpVerify(request, env);
      if (p === '/api/auth/forgot' && request.method === 'POST') return await authForgot(request, env);
      if (p === '/api/auth/reset' && request.method === 'POST') return await authReset(request, env);
      if (p === '/api/auth/logout' && request.method === 'POST') return await authLogout(request, env);
      if (p.startsWith('/api/admin/')) return await admin(request, env, p);
      const uid = await authUser(request, env);
      if (p === '/api/auth/passkey/add/begin' && request.method === 'POST') return await pkAddBegin(request, env, uid);
      if (p === '/api/auth/passkey/add/finish' && request.method === 'POST') return await pkAddFinish(request, env, uid);
      if (p === '/api/auth/google/link' && request.method === 'POST') return await authGoogleLink(request, env, uid);
      if (p === '/api/auth/google/unlink' && request.method === 'POST') return await authGoogleUnlink(request, env, uid);
      if (p === '/api/auth/me' && request.method === 'GET') {
        const u = JSON.parse((await env.PUB_KV.get('user:' + uid)) || 'null');
        const pf = JSON.parse((await env.PUB_KV.get('profile:' + (u && (u.uid || u.id)))) || '{}');
        return json({ user: publicUser(u, pf) });
      }
      if (p === '/api/auth/password' && request.method === 'POST') return await authChangePassword(request, env, uid);
      if (p === '/api/auth/delete' && request.method === 'POST') return await authDelete(request, env, uid);
      if (p === '/api/profile' && request.method === 'GET') {
        const u = JSON.parse((await env.PUB_KV.get('user:' + uid)) || 'null');
        const pf = JSON.parse((await env.PUB_KV.get('profile:' + (u && (u.uid || u.id)))) || '{}');
        return json({ user: publicUser(u, pf) });
      }
      if (p === '/api/profile' && request.method === 'PUT') return await profilePut(request, env, uid);
      if (p === '/api/profile/photo' && request.method === 'POST') return await profilePhoto(request, env, uid);
      if (p === '/api/sessions' && request.method === 'GET') {
        const tok = String(request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
        return json({ sessions: await listSessions(env, uid, tok) });
      }
      if (p === '/api/sessions/revoke' && request.method === 'POST') {
        const tok = String(request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
        const b = await request.json().catch(() => ({}));
        const target = String(b.token || '');
        if (!target) return json({ error: 'সেশন চিহ্নিত করা যায়নি' }, 400);
        if (target === tok.slice(0, 8)) return json({ error: 'বর্তমান সেশন এভাবে বন্ধ করা যায় না — লগআউট ব্যবহার করো' }, 400);
        const list = JSON.parse((await env.PUB_KV.get('sess:' + uid)) || '{}');
        let found = false;
        for (const t of Object.keys(list || {})) {
          if (t.slice(0, 8) === target) { await env.PUB_KV.delete('tok:' + t); delete list[t]; found = true; }
        }
        if (found) { await env.PUB_KV.put('sess:' + uid, JSON.stringify(list), { expirationTtl: 31536000 }); await logAct(env, uid, 'logout', 'একটি ডিভাইস সেশন বন্ধ করা হয়েছে'); }
        return json({ ok: true, revoked: found });
      }
      if (p === '/api/sessions/revoke-others' && request.method === 'POST') {
        const tok = String(request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
        const list = JSON.parse((await env.PUB_KV.get('sess:' + uid)) || '{}');
        let n = 0;
        for (const t of Object.keys(list || {})) {
          if (t === tok) continue;
          await env.PUB_KV.delete('tok:' + t); delete list[t]; n++;
        }
        await env.PUB_KV.put('sess:' + uid, JSON.stringify(list), { expirationTtl: 31536000 });
        if (n > 0) await logAct(env, uid, 'logout', 'অন্য সব ডিভাইসের সেশন বন্ধ করা হয়েছে');
        return json({ ok: true, revoked: n });
      }
      if (p === '/api/security/activity' && request.method === 'GET') {
        const arr = JSON.parse((await env.PUB_KV.get('act:' + uid)) || '[]');
        return json({ activity: Array.isArray(arr) ? arr : [] });
      }
      if (p === '/api/export' && request.method === 'GET') {
        const u = await getUserById(env, uid);
        if (!u) return json({ error: 'অ্যাকাউন্ট পাওয়া যায়নি' }, 404);
        const pf = await loadProfile(env, u.uid || u.id);
        const ustate = JSON.parse((await env.PUB_KV.get('ustate:' + u.id)) || 'null');
        const sessions = await listSessions(env, uid, String(request.headers.get('Authorization') || '').replace('Bearer ', '').trim());
        const activity = JSON.parse((await env.PUB_KV.get('act:' + uid)) || '[]');
        const data = {
          exportedAt: new Date().toISOString(),
          schema: 'admission-hub/account-export/v1',
          account: {
            accountId: String(u.uid || u.id),
            name: u.name || '',
            email: u.email || '', emailVerified: !!u.emailVerified,
            mobile: u.mobile || '', mobileVerified: !!u.mobileVerified,
            providers: u.providers || [],
            passkeyEnabled: !!(u.credId),
            createdAt: u.created, lastSeen: u.lastSeen
          },
          profile: {
            displayName: pf.displayName || '', dob: pf.dob || '', bio: pf.bio || '',
            institution: pf.institution || '', targetUniversity: pf.targetUniversity || '',
            targetUnit: pf.targetUnit || '', admissionYear: pf.admissionYear || '',
            photo: pf.photo ? '(base64 image)' : '',
            onboarding: pf.onboarding || { completed: false }
          },
          activity: Array.isArray(activity) ? activity : [],
          sessions: (sessions || []).map(s => ({ id: s.id, device: s.device, browser: s.browser, mobile: s.mobile, firstSeen: s.firstSeen, lastSeen: s.lastSeen, current: !!s.current, live: !!s.live })),
          personalData: ustate || null
        };
        return json(data);
      }
      if (p === '/api/re-auth' && request.method === 'POST') {
        const u = JSON.parse((await env.PUB_KV.get('user:' + uid)) || 'null');
        if (!u || !u.passHash) return json({ error: 'পাসওয়ার্ড সেট করা নেই' }, 400);
        const b = await request.json().catch(() => ({}));
        const hp = await hashPassword(String(b.password || ''), u.passSalt);
        if (hp.hash !== u.passHash) return json({ error: 'পাসওয়ার্ড ভুল' }, 401);
        return json({ ok: true });
      }
      if (p === '/api/onboarding' && request.method === 'GET') return await onboardingGet(request, env, uid);
      if (p === '/api/onboarding' && request.method === 'PUT') return await onboardingPut(request, env, uid);
      if (p === '/api/onboarding/catalog' && request.method === 'GET') return await onboardingCatalog(env);

      if (p === '/api/state' && request.method === 'GET') return json(JSON.parse((await env.PUB_KV.get('ustate:' + uid)) || 'null'));
      if (p === '/api/state' && request.method === 'POST') {
        const b = await request.json();
        await env.PUB_KV.put('ustate:' + uid, JSON.stringify(sanitizeState(b)).slice(0, 1800000));
        await touchUser(env, uid);
        return json({ saved: true, at: Date.now() });
      }
      if (p === '/api/ai' && request.method === 'POST') return await aiCall(request, env, uid);
      return json({ error: 'not-found' }, 404);
    } catch (e) { return json({ error: String(e?.message || e).slice(0, 140) }, e.status || 500); }
  }
};


const normId = s => { s = String(s || '').trim(); if (/^\+?\d[\d\s-]{8,14}$/.test(s)) return 'ph:' + s.replace(/\D/g, ''); if (s.includes('@')) return 'em:' + s.toLowerCase(); return 'un:' + s.toLowerCase().slice(0, 40); };
const maskDest = id => {
  if (id.startsWith('em:')) { const e = id.slice(3); const i = e.indexOf('@'); return i > 2 ? e.slice(0, 2) + '••••' + e.slice(i) : '••••' + e.slice(-8); }
  if (id.startsWith('ph:')) { const n = id.slice(3); return '••••' + n.slice(-4); }
  return '••••';
};
async function shaHex(s) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(s)));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
function strongPass(p) {
  p = String(p || '');
  if (p.length < 8) return 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষর';
  if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) return 'পাসওয়ার্ডে অক্ষর ও সংখ্যা দুটোই লাগবে';
  return '';
}
async function loadProfile(env, uid) {
  return JSON.parse((await env.PUB_KV.get('profile:' + uid)) || '{}');
}
async function saveProfile(env, uid, pf) {
  await env.PUB_KV.put('profile:' + uid, JSON.stringify(pf).slice(0, 350000));
}
async function fullUser(env, rec) {
  if (!rec) return null;
  const pf = await loadProfile(env, rec.uid || rec.id);
  return publicUser(rec, pf);
}
function officialLetter(kind, extra) {
  const code = extra && extra.code ? String(extra.code) : '';
  const link = extra && extra.link ? String(extra.link) : '';
  const isReset = kind === 'reset';
  const subject = isReset ? 'Admission Hub পাসওয়ার্ড পুনরুদ্ধার করুন' : 'Admission Hub অ্যাকাউন্ট যাচাই করুন';
  const preheader = isReset ? 'পাসওয়ার্ড পুনরুদ্ধারের লিংক প্রস্তুত রয়েছে।' : 'আপনার ইমেইল যাচাই করার কোড প্রস্তুত রয়েছে।';
  const F = "'Noto Sans Bengali','Hind Siliguri','SolaimanLipi',Arial,sans-serif";
  const EMERALD = '#0b6b4b';
  const EMERALD_D = '#08452f';
  const INK = '#16241c';
  const SUB = '#5b6b62';

  const text = isReset
    ? ['ADMISSION HUB', 'শিক্ষার্থী অ্যাকাউন্ট সেবা', '', 'আপনার ইমেইল ঠিকানা যাচাই করা হয়েছে', '', 'Admission Hub-এ আপনার অ্যাকাউন্টের পাসওয়ার্ড পুনরুদ্ধার করতে নিচের লিংকটি খুলুন:', '', link, '', 'লিংকটি ১৫ মিনিট পর্যন্ত কার্যকর থাকবে।', '', 'আপনি যদি এই অনুরোধ না করে থাকেন, তাহলে এই ইমেইলটি উপেক্ষা করুন। কোনো পদক্ষেপের প্রয়োজন নেই।', '', 'শুভেচ্ছান্তে,', 'Admission Hub', 'শিক্ষার্থী অ্যাকাউন্ট সেবা'].join('\n')
    : ['ADMISSION HUB', 'শিক্ষার্থী অ্যাকাউন্ট সেবা', '', 'আপনার ইমেইল ঠিকানা যাচাই করুন', '', 'Admission Hub-এ আপনার অ্যাকাউন্ট তৈরির প্রক্রিয়া সম্পন্ন করতে নিচের যাচাইকরণ কোডটি ব্যবহার করুন।', '', 'আপনার যাচাইকরণ কোড: ' + code, '', 'কোডটি ২ মিনিট পর্যন্ত কার্যকর থাকবে।', '', 'আপনি যদি এই কোডের জন্য অনুরোধ না করে থাকেন, তাহলে এই ইমেইলটি উপেক্ষা করুন। কোনো পদক্ষেপের প্রয়োজন নেই।', '', 'শুভেচ্ছান্তে,', 'Admission Hub', 'শিক্ষার্থী অ্যাকাউন্ট সেবা'].join('\n');

  const codeHtml = code
    ? ('<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:22px auto 10px;"><tr>' +
       code.split('').map(d => '<td style="padding:14px 10px;background:#f1f8f4;border:1px solid #bcd9ca;border-radius:10px;font-family:' + F + ';font-size:30px;line-height:1;font-weight:800;color:' + EMERALD_D + ';letter-spacing:2px;">' + d + '</td>').join('<td style="width:6px;"></td>') +
       '</tr></table>' +
       '<p style="text-align:center;color:' + SUB + ';font-size:13px;line-height:1.7;margin:14px 0 0;">এই কোডটি <b style="color:' + EMERALD_D + ';">২ মিনিট</b> পর্যন্ত কার্যকর থাকবে।</p>')
    : ('<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:24px auto 8px;"><tr><td style="background:' + EMERALD + ';border-radius:12px;"><a href="' + link + '" style="display:block;padding:14px 30px;color:#ffffff;text-decoration:none;font-family:' + F + ';font-size:15px;font-weight:700;border-radius:12px;">পাসওয়ার্ড পুনরুদ্ধার করুন</a></td></tr></table>' +
       '<p style="text-align:center;color:' + SUB + ';font-size:13px;line-height:1.7;margin:14px 0 0;">লিংকটি <b style="color:' + EMERALD_D + ';">১৫ মিনিট</b> পর্যন্ত কার্যকর থাকবে।</p>' +
       '<p style="text-align:center;word-break:break-all;font-size:11px;color:#93a39a;margin:12px 0 0;font-family:' + F + ';">' + link + '</p>');

  const html =
'<!DOCTYPE html><html lang="bn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><title>' + subject + '</title></head>' +
'<body style="margin:0;padding:0;background:#eef4f1;">' +
'<div style="display:none;max-height:0;overflow:hidden;opacity:0;">' + preheader + '</div>' +
'<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef4f1;padding:28px 12px;">' +
'<tr><td align="center">' +
'<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #dbe8e0;">' +
  '<tr><td style="padding:30px 40px 6px;" align="center">' +
    '<p style="margin:0;font-family:' + F + ';font-size:14px;letter-spacing:.22em;color:' + EMERALD + ';font-weight:800;">ADMISSION HUB</p>' +
    '<p style="margin:6px 0 0;font-family:' + F + ';font-size:12px;color:' + SUB + ';">শিক্ষার্থী অ্যাকাউন্ট সেবা</p>' +
    '<div style="height:1px;background:#e3ede7;margin:22px 0 0;"></div>' +
  '</td></tr>' +
  '<tr><td style="padding:26px 40px 8px;">' +
    '<h1 style="margin:0 0 12px;font-family:' + F + ';font-size:23px;line-height:1.5;color:' + INK + ';font-weight:800;">' + (isReset ? 'আপনার পাসওয়ার্ড পুনরুদ্ধার করুন' : 'আপনার ইমেইল ঠিকানা যাচাই করুন') + '</h1>' +
    '<p style="margin:0;font-family:' + F + ';font-size:15px;line-height:1.9;color:#33463b;">' +
      (isReset
        ? 'Admission Hub-এ আপনার অ্যাকাউন্টের পাসওয়ার্ড পুনরুদ্ধার করতে নিচের বোতামটি ব্যবহার করুন।'
        : 'Admission Hub-এ আপনার অ্যাকাউন্ট তৈরির প্রক্রিয়া সম্পন্ন করতে নিচের যাচাইকরণ কোডটি ব্যবহার করে আপনার ইমেইল ঠিকানা নিশ্চিত করুন।') +
    '</p>' +
  '</td></tr>' +
  '<tr><td style="padding:10px 40px 0;" align="center">' + codeHtml + '</td></tr>' +
  '<tr><td style="padding:24px 40px 6px;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7fbf8;border-left:3px solid ' + EMERALD + ';border-radius:10px;"><tr><td style="padding:13px 16px;font-family:' + F + ';font-size:13px;line-height:1.8;color:' + SUB + ';">' +
      (isReset
        ? 'আপনি যদি পাসওয়ার্ড পুনরুদ্ধারের অনুরোধ না করে থাকেন, তাহলে এই ইমেইলটি উপেক্ষা করুন। আপনার কোনো অতিরিক্ত পদক্ষেপ নেওয়ার প্রয়োজন নেই।'
        : 'আপনি যদি এই যাচাইকরণ কোডের জন্য অনুরোধ না করে থাকেন, তাহলে এই ইমেইলটি উপেক্ষা করুন। আপনার কোনো অতিরিক্ত পদক্ষেপ নেওয়ার প্রয়োজন নেই।') +
    '</td></tr></table>' +
  '</td></tr>' +
  '<tr><td style="padding:26px 40px 30px;">' +
    '<div style="height:1px;background:#e3ede7;margin-bottom:20px;"></div>' +
    '<p style="margin:0;font-family:' + F + ';font-size:14px;color:' + INK + ';font-weight:700;">শুভেচ্ছান্তে,</p>' +
    '<p style="margin:6px 0 0;font-family:' + F + ';font-size:14px;color:' + EMERALD_D + ';font-weight:800;">Admission Hub</p>' +
    '<p style="margin:2px 0 18px;font-family:' + F + ';font-size:12px;color:' + SUB + ';">শিক্ষার্থী অ্যাকাউন্ট সেবা</p>' +
    '<p style="margin:0;font-family:' + F + ';font-size:11px;line-height:1.7;color:#93a39a;">এই ইমেইলটি স্বয়ংক্রিয়ভাবে পাঠানো হয়েছে — অনুগ্রহ করে এর উত্তর দেবেন না।</p>' +
  '</td></tr>' +
'</table>' +
'</td></tr></table></body></html>';

  return { subject, text, html };
}
async function sendOtpMessage(env, destId, code, kind) {
  const letter = officialLetter(kind === 'reset' ? 'reset' : 'verify', { code });
  const text = letter.text;
  const html = letter.html;
  const subject = letter.subject;
  if (destId.startsWith('em:')) {
    const to = destId.slice(3);
    if (env.MAIL_HOOK) {
      const r = await fetch(env.MAIL_HOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: env.MAIL_HOOK_SECRET || '', to, subject, text, html, name: 'Admission Hub', fromName: 'Admission Hub' })
      });
      if (r.ok) return { ok: true, channel: 'email' };
    }
    if (env.BREVO_KEY) {
      const r = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json', 'api-key': env.BREVO_KEY },
        body: JSON.stringify({
          sender: { name: 'Admission Hub', email: env.BREVO_FROM || env.MAIL_FROM || 'mahmudrashel1034@gmail.com' },
          to: [{ email: to }],
          subject,
          textContent: text,
          htmlContent: html
        })
      });
      if (r.ok) return { ok: true, channel: 'email' };
    }
    const from = env.MAIL_FROM || 'Admission Hub <onboarding@resend.dev>';
    const keys = [env.RESEND_KEY, env.RESEND_KEY_2].filter(Boolean);
    let last = 'ইমেইল পাঠানো যায়নি';
    for (const key of keys) {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key },
        body: JSON.stringify({ from, to: [to], subject, text, html })
      });
      if (r.ok) return { ok: true, channel: 'email' };
      const err = await r.json().catch(() => ({}));
      last = String(err.message || err.error || last).slice(0, 180);
    }
    if (/only send testing emails|own email/i.test(last)) {
      return { ok: false, error: 'এখন শুধু অ্যাকাউন্টের নিজের Gmail-এ OTP যায়। যেকেউ পেতে MAIL_HOOK বা BREVO_KEY লাগবে।' };
    }
    return { ok: false, error: last };
  }
  if (destId.startsWith('ph:')) {
    let num = destId.slice(3).replace(/\D/g, '');
    if (num.startsWith('88')) num = num.slice(2);
    if (num.startsWith('0')) num = num.slice(1);
    const local = '0' + num;
    const intl = '88' + num;
    if (env.GREENWEB_TOKEN) {
      const r = await fetch('https://api.greenweb.com.bd/api.php?token=' + encodeURIComponent(env.GREENWEB_TOKEN) + '&to=' + encodeURIComponent(local) + '&message=' + encodeURIComponent(text));
      const body = await r.text().catch(() => '');
      if (r.ok && /ok|success|sent/i.test(body)) return { ok: true, channel: 'sms' };
    }
    if (env.BULKSMS_API_KEY) {
      const r = await fetch('https://bulksmsbd.net/api/smsapi?api_key=' + encodeURIComponent(env.BULKSMS_API_KEY) + '&type=text&number=' + encodeURIComponent(intl) + '&senderid=' + encodeURIComponent(env.SMS_FROM || '8809601000000') + '&message=' + encodeURIComponent(text));
      if (r.ok) return { ok: true, channel: 'sms' };
    }
    const to = '+' + intl;
    if (env.TWILIO_SID && env.TWILIO_TOKEN && env.TWILIO_FROM) {
      const r = await fetch('https://api.twilio.com/2010-04-01/Accounts/' + env.TWILIO_SID + '/Messages.json', {
        method: 'POST',
        headers: { Authorization: 'Basic ' + btoa(env.TWILIO_SID + ':' + env.TWILIO_TOKEN), 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ To: to, From: env.TWILIO_FROM, Body: text })
      });
      if (r.ok) return { ok: true, channel: 'sms' };
    }
    if (env.SMS_API_URL && env.SMS_API_KEY) {
      const r = await fetch(env.SMS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + env.SMS_API_KEY },
        body: JSON.stringify({ to, text, from: env.SMS_FROM || 'AdmissionHub' })
      });
      if (r.ok) return { ok: true, channel: 'sms' };
    }
    return { ok: false, error: 'মোবাইল OTP-এর জন্য SMS API লাগবে — আপাতত Gmail দিয়ে সাইন আপ করো' };
  }
  return { ok: false, error: 'সঠিক ইমেইল বা মোবাইল লেখো' };
}
async function issueOtp(env, destId, purpose, ip) {
  if (!(await rateLimit(env, 'otp:' + ip, 400, 3600))) return { error: 'একটু পরে আবার চেষ্টা করো', status: 429 };
  if (!(await rateLimit(env, 'otp-id:' + destId, 20, 3600))) return { error: 'একটু পরে আবার চেষ্টা করো', status: 429 };
  const key = 'otp:' + purpose + ':' + destId;
  const prev = JSON.parse((await env.PUB_KV.get(key)) || 'null');
  if (prev && prev.sentAt && Date.now() - prev.sentAt < 12000) return { error: 'কয়েক সেকেন্ড পর আবার প্রেরণ করুন', status: 429, wait: Math.max(1, 12 - Math.floor((Date.now() - prev.sentAt) / 1000)) };
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const sent = await sendOtpMessage(env, destId, code, purpose);
  if (!sent.ok) return { error: sent.error, status: 503 };
  await env.PUB_KV.put(key, JSON.stringify({ hash: await shaHex(code), exp: Date.now() + 900000, tries: 0, sentAt: Date.now(), purpose }), { expirationTtl: 900 });
  return { sent: true, channel: sent.channel, masked: maskDest(destId), wait: 120 };
}
async function checkOtp(env, destId, purpose, code) {
  const key = 'otp:' + purpose + ':' + destId;
  const o = JSON.parse((await kvGetRetry(env.PUB_KV, key, { tries: 5, base: 250 })) || 'null');
  if (!o || !o.hash) return { error: 'আগে কোড পাঠাও', status: 400 };
  if (o.exp < Date.now()) return { error: 'কোডের সময় শেষ — আবার পাঠাও', status: 401 };
  if (o.tries >= 5) return { error: 'অনেকবার ভুল হয়েছে — একটু পরে চেষ্টা করো', status: 429 };
  const h = await shaHex(String(code || '').trim());
  if (h !== o.hash) {
    o.tries = (o.tries || 0) + 1;
    await env.PUB_KV.put(key, JSON.stringify(o), { expirationTtl: 600 });
    return { error: 'কোড ভুল', status: 401 };
  }
  await env.PUB_KV.delete(key);
  return { ok: true };
}
async function getUserById(env, id) {
  return JSON.parse((await kvGetRetry(env.PUB_KV, 'user:' + id, { tries: 5, base: 200 })) || 'null');
}


const RP_ID = 'sheikhrashel47-stack.github.io';
const RP_ORIGIN = 'https://sheikhrashel47-stack.github.io';
const APP_URL = 'https://sheikhrashel47-stack.github.io/admission-hub-demo/';
function b64url(buf) {
  const u = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function unb64url(s) {
  s = String(s || '').replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
}
function derToRaw(der) {
  const u = der instanceof Uint8Array ? der : new Uint8Array(der);
  let i = 0;
  if (u[i++] !== 0x30) throw new Error('sig');
  if (u[i] & 0x80) i += 1 + (u[i] & 0x7f); else i++;
  if (u[i++] !== 0x02) throw new Error('sig');
  let l1 = u[i++];
  let r = u.slice(i, i + l1); i += l1;
  if (u[i++] !== 0x02) throw new Error('sig');
  let l2 = u[i++];
  let s = u.slice(i, i + l2);
  const pad = x => {
    while (x.length > 32 && x[0] === 0) x = x.slice(1);
    const o = new Uint8Array(32);
    o.set(x, 32 - Math.min(32, x.length));
    return o;
  };
  const out = new Uint8Array(64);
  out.set(pad(r), 0); out.set(pad(s), 32);
  return out;
}
async function sendEmail(env, to, subject, text, html) {
  const destId = 'em:' + String(to).toLowerCase();
  if (env.MAIL_HOOK) {
    try {
      const r = await fetch(env.MAIL_HOOK, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ secret: env.MAIL_HOOK_SECRET || '', to, subject, text, html, name: 'Admission Hub', fromName: 'Admission Hub' }) });
      const body = await r.text().catch(() => '');
      const ok = r.ok && !/error|fail|invalid|denied/i.test(body);
      if (ok) return { ok: true, channel: 'hook' };
      if (r.ok && !ok) return { ok: false, error: 'মেইল গেটওয়ে বলছে: ' + String(body).slice(0, 160), channel: 'hook-fail' };
    } catch (_) { /* fallthrough */ }
  }
  if (env.BREVO_KEY) {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST', headers: { accept: 'application/json', 'content-type': 'application/json', 'api-key': env.BREVO_KEY },
      body: JSON.stringify({ sender: { name: 'Admission Hub', email: (env.BREVO_FROM || 'mahmudrashel1034@gmail.com') }, to: [{ email: to }], subject, textContent: text, htmlContent: html })
    });
    if (r.ok) return { ok: true };
  }
  const from = env.MAIL_FROM || 'Admission Hub <onboarding@resend.dev>';
  const keys = [env.RESEND_KEY, env.RESEND_KEY_2].filter(Boolean);
  let last = 'ইমেইল পাঠানো যায়নি';
  for (const key of keys) {
    const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key }, body: JSON.stringify({ from, to: [to], subject, text, html }) });
    if (r.ok) return { ok: true };
    const err = await r.json().catch(() => ({}));
    last = String(err.message || err.error || last).slice(0, 180);
  }
  if (/only send testing emails|own email/i.test(last)) return { ok: false, error: 'এখন শুধু অ্যাকাউন্টের নিজের Gmail-এ মেইল যায়। যেকেউ পেতে MAIL_HOOK/BREVO লাগবে।' };
  return { ok: false, error: last };
}
async function issueVerifyLink(env, destId, purpose, ip) {
  const cool = Number((await env.PUB_KV.get('vcool:' + destId)) || 0);
  if (cool && Date.now() - cool < 12000) {
    const w = Math.ceil((12000 - (Date.now() - cool)) / 1000);
    return { error: w + ' সেকেন্ড পরে আবার পাঠাও', status: 429 };
  }
  if (!(await rateLimit(env, 'vlink:' + ip, 400, 3600))) return { error: 'একটু পরে আবার চেষ্টা করো', status: 429 };
  if (!(await rateLimit(env, 'vlink-id:' + destId, 20, 3600))) return { error: 'এই ইমেইলে অনেকবার পাঠানো হয়েছে — একটু পরে চেষ্টা করো', status: 429 };
  const raw = b64url(crypto.getRandomValues(new Uint8Array(32)));
  const hash = await shaHex(raw);
  await env.PUB_KV.put('vlink:' + hash, JSON.stringify({ id: destId, purpose, at: Date.now() }), { expirationTtl: 900 });
  const link = 'https://admission-gk.admissionhub.workers.dev/api/auth/confirm?t=' + raw;
  const to = destId.slice(3);
  const letter = officialLetter('verify', { link });
  const sent = await sendEmail(env, to, letter.subject, letter.text, letter.html);
  if (!sent.ok) return { error: sent.error, status: 503 };
  await env.PUB_KV.put('vcool:' + destId, String(Date.now()), { expirationTtl: 60 });
  return { sent: true, masked: maskDest(destId) };
}
async function completeVerify(env, raw) {
  raw = String(raw || '');
  if (!raw) return { ok: false, error: 'লিংক অবৈধ', status: 400 };
  const hash = await shaHex(raw);
  const row = JSON.parse((await env.PUB_KV.get('vlink:' + hash)) || 'null');
  if (!row || !row.id) return { ok: false, error: 'লিংক অবৈধ অথবা মেয়াদ শেষ হয়েছে', status: 401 };
  if (row.at && Date.now() - row.at > 900000) {
    await env.PUB_KV.delete('vlink:' + hash);
    return { ok: false, error: 'লিংকের মেয়াদ শেষ হয়েছে। আবার নতুন লিংক পাঠাও।', status: 401 };
  }
  const pending = JSON.parse((await env.PUB_KV.get('pending:' + row.id)) || 'null');
  if (!pending) return { ok: false, error: 'আবার সাইন আপ করুন', status: 400 };
  pending.verified = true; pending.emailVerified = true; pending.status = 'active'; pending.lastSeen = Date.now();
  await env.PUB_KV.put('user:' + pending.id, JSON.stringify(pending));
  await env.PUB_KV.delete('pending:' + row.id);
  await env.PUB_KV.delete('vlink:' + hash);
  const issued = await issueToken(env, pending);
  issued.user = await fullUser(env, pending);
  const ready = JSON.stringify({ status: 'ready', token: issued.token, user: issued.user, id: pending.id });
  if (pending.waitId) await env.PUB_KV.put('wait:' + pending.waitId, ready, { expirationTtl: 900 });
  await env.PUB_KV.put('waitid:' + pending.id, ready, { expirationTtl: 900 });
  return { ok: true, issued, waitId: pending.waitId || '' };
}
const authVerifyLink = async (request, env) => {
  const b = await request.json().catch(() => ({}));
  const out = await completeVerify(env, b.token);
  if (!out.ok) return json({ error: out.error }, out.status);
  return json(out.issued);
};
const authConfirm = async (request, env) => {
  const url = new URL(request.url);
  let raw = url.searchParams.get('t') || url.searchParams.get('verify') || '';
  if (request.method === 'POST' && !raw) {
    const b = await request.json().catch(() => ({}));
    raw = String(b.token || b.t || '');
  }
  const out = await completeVerify(env, raw);
  const ok = out.ok;
  if (ok) {
    // Same-device smart redirect: app decides same vs other browser via localStorage ahWaitId.
    const w = String(out.waitId || '');
    const app = 'https://sheikhrashel47-stack.github.io/admission-hub-demo/?verified=1&w=' + encodeURIComponent(w);
    return Response.redirect(app, 302);
  }
  const msg = out.error || 'Verification failed';
  const bn = out.error || 'যাচাই ব্যর্থ';
  const html = `<!doctype html><html lang="bn"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Admission Hub</title>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f3f5f4;font-family:Georgia,Times,serif;color:#1a2420">
<div style="max-width:440px;margin:24px;background:#fff;border:1px solid #dce6e0;padding:36px 28px;text-align:center">
<p style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:11px;letter-spacing:.16em;color:#1e7a4c;font-weight:700">ADMISSION HUB</p>
<p style="margin:0 0 22px;font-family:Arial,sans-serif;font-size:12px;color:#66756e">Office of Student Accounts</p>
<h1 style="font-size:26px;margin:0 0 14px">Unable to verify</h1>
<p style="line-height:1.55">${msg}</p>
<p style="line-height:1.55;color:#44524c">${bn}</p>
</div></body></html>`;
  return new Response(html, { status: out.status || 400, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Access-Control-Allow-Origin': '*' } });
};
const authWait = async (request, env) => {
  const b = await request.json().catch(() => ({}));
  const waitId = String(b.waitId || '');
  const id = normId(b.id || '');
  let row = null;
  if (waitId.length >= 16) row = JSON.parse((await kvGetRetry(env.PUB_KV, 'wait:' + waitId, { tries: 4, base: 250 })) || 'null');
  if (!row && id.startsWith('em:')) row = JSON.parse((await kvGetRetry(env.PUB_KV, 'waitid:' + id, { tries: 4, base: 250 })) || 'null');
  if (!row) return json({ waiting: true });
  if (row.status === 'ready' && row.token) return json({ token: row.token, user: row.user, ready: true });
  return json({ waiting: true });
};
const pkRegBegin = async (request, env) => {
  const uid = crypto.randomUUID();
  const chal = crypto.getRandomValues(new Uint8Array(32));
  const chalId = b64url(crypto.getRandomValues(new Uint8Array(16)));
  await env.PUB_KV.put('pkch:' + chalId, JSON.stringify({ challenge: b64url(chal), uid, t: 'reg', at: Date.now() }), { expirationTtl: 300 });
  return json({
    chalId,
    userId: uid,
    options: {
      challenge: b64url(chal),
      rp: { id: RP_ID, name: 'Admission Hub' },
      user: { id: b64url(new TextEncoder().encode('pk:' + uid)), name: 'scholar-' + uid.slice(0, 8), displayName: 'Scholar' },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', residentKey: 'preferred', requireResidentKey: false, userVerification: 'required' },
      timeout: 120000,
      attestation: 'none'
    }
  });
};
const pkRegFinish = async (request, env) => {
  const b = await request.json().catch(() => ({}));
  const ch = JSON.parse((await env.PUB_KV.get('pkch:' + b.chalId)) || 'null');
  if (!ch || ch.t !== 'reg') return json({ error: 'Passkey চ্যালেঞ্জ শেষ' }, 401);
  let cdata;
  try { cdata = JSON.parse(new TextDecoder().decode(unb64url(b.clientDataJSON))); } catch (_) { return json({ error: 'Passkey ডেটা খারাপ' }, 400); }
  if (cdata.type !== 'webauthn.create') return json({ error: 'Passkey টাইপ ভুল' }, 400);
  if (String(cdata.challenge) !== ch.challenge) return json({ error: 'Passkey মিলছে না' }, 401);
  if (!String(cdata.origin || '').startsWith(RP_ORIGIN)) return json({ error: 'Origin মিলছে না' }, 401);
  if (!b.publicKey || !b.rawId) return json({ error: 'Passkey পাবলিক কী নেই' }, 400);
  const id = 'pk:' + ch.uid;
  let passHash, passSalt;
  if (b.password) {
    const weak = strongPass(String(b.password));
    if (weak) return json({ error: weak }, 400);
    if (String(b.confirm || '') !== String(b.password)) return json({ error: 'পাসওয়ার্ড দুটো মিলছে না' }, 400);
    const hp = await hashPassword(String(b.password));
    passHash = hp.hash; passSalt = hp.salt;
  }
  const rec = {
    id, uid: ch.uid, name: String(b.name || 'Scholar').slice(0, 40), email: '', mobile: '', contact: '',
    dob: String(b.dob || '').slice(0, 12), school: String(b.school || '').slice(0, 80), college: String(b.college || '').slice(0, 80),
    created: Date.now(), lastSeen: Date.now(), blocked: false, verified: true, emailVerified: false,
    status: 'active', providers: passHash ? ['passkey', 'password'] : ['passkey'], credId: b.rawId, pubKey: b.publicKey, pubAlg: b.publicKeyAlgorithm || -7,
    passHash, passSalt
  };
  await env.PUB_KV.put('pkid:' + b.rawId, JSON.stringify({ id, pubKey: rec.pubKey, alg: rec.pubAlg }));
  await env.PUB_KV.delete('pkch:' + b.chalId);
  const issued = await issueToken(env, rec);
  issued.user = await fullUser(env, rec);
  await logAct(env, rec.id, 'passkey', 'Passkey যোগ করা হয়েছে');
  return json(issued);
};
const pkAddBegin = async (request, env, uid) => {
  const u = await getUserById(env, uid);
  if (!u) return json({ error: 'অ্যাকাউন্ট পাওয়া যায়নি' }, 404);
  if (u.credId) return json({ error: 'আগে থেকেই পাসকি আছে — প্রথমে সেটি সরাও' }, 400);
  const chal = crypto.getRandomValues(new Uint8Array(32));
  const chalId = b64url(crypto.getRandomValues(new Uint8Array(16)));
  await env.PUB_KV.put('pkch:' + chalId, JSON.stringify({ challenge: b64url(chal), uid, t: 'reg', at: Date.now() }), { expirationTtl: 300 });
  return json({
    chalId,
    options: {
      challenge: b64url(chal),
      rp: { id: RP_ID, name: 'Admission Hub' },
      user: { id: b64url(new TextEncoder().encode(String(u.uid || u.id))), name: String(u.name || 'Scholar').slice(0, 32), displayName: String(u.name || 'Scholar').slice(0, 32) },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', residentKey: 'preferred', requireResidentKey: false, userVerification: 'required' },
      timeout: 120000,
      attestation: 'none'
    }
  });
};
const pkAddFinish = async (request, env, uid) => {
  const b = await request.json().catch(() => ({}));
  const ch = JSON.parse((await env.PUB_KV.get('pkch:' + b.chalId)) || 'null');
  if (!ch || ch.t !== 'reg' || ch.uid !== uid) return json({ error: 'Passkey চ্যালেঞ্জ শেষ' }, 401);
  let cdata;
  try { cdata = JSON.parse(new TextDecoder().decode(unb64url(b.clientDataJSON))); } catch (_) { return json({ error: 'Passkey ডেটা খারাপ' }, 400); }
  if (cdata.type !== 'webauthn.create') return json({ error: 'Passkey টাইপ ভুল' }, 400);
  if (String(cdata.challenge) !== ch.challenge) return json({ error: 'Passkey মিলছে না' }, 401);
  if (!String(cdata.origin || '').startsWith(RP_ORIGIN)) return json({ error: 'Origin মিলছে না' }, 401);
  if (!b.publicKey || !b.rawId) return json({ error: 'Passkey পাবলিক কী নেই' }, 400);
  const u = await getUserById(env, uid);
  if (!u) return json({ error: 'অ্যাকাউন্ট পাওয়া যায়নি' }, 404);
  await env.PUB_KV.put('pkid:' + b.rawId, JSON.stringify({ id: u.id, pubKey: b.publicKey, alg: b.publicKeyAlgorithm || -7 }));
  u.credId = b.rawId; u.pubKey = b.publicKey; u.pubAlg = b.publicKeyAlgorithm || -7;
  u.providers = Array.from(new Set([...(u.providers || []), 'passkey']));
  await env.PUB_KV.delete('pkch:' + b.chalId);
  await env.PUB_KV.put('user:' + u.id, JSON.stringify(u));
  await logAct(env, uid, 'passkey', 'এই ডিভাইসে পাসকি যোগ করা হয়েছে');
  return json({ ok: true, user: await fullUser(env, u) });
};
const authGoogleLink = async (request, env, uid) => {
  if (!env.GOOGLE_CLIENT_ID) return json({ error: 'Google সংযোগ এখন সেটআপ নেই' }, 503);
  const b = await request.json().catch(() => ({}));
  const idToken = String(b.idToken || '');
  const accessToken = String(b.accessToken || b.access_token || '');
  let g = {};
  if (idToken) {
    const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken));
    g = await r.json().catch(() => ({}));
    if (!r.ok || !g.email) return json({ error: 'Google যাচাই ব্যর্থ' }, 401);
    if (g.aud !== env.GOOGLE_CLIENT_ID) return json({ error: 'Google ক্লায়েন্ট মিলছে না' }, 401);
  } else if (accessToken) {
    const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: 'Bearer ' + accessToken } });
    g = await r.json().catch(() => ({}));
    if (!r.ok || !g.email) return json({ error: 'Google যাচাই ব্যর্থ' }, 401);
  } else {
    return json({ error: 'Google টোকেন নেই' }, 400);
  }
  const u = await getUserById(env, uid);
  if (!u) return json({ error: 'অ্যাকাউন্ট পাওয়া যায়নি' }, 404);
  const gid = normId(g.email);
  if (gid !== u.id) {
    const other = JSON.parse((await env.PUB_KV.get('user:' + gid)) || 'null');
    if (other && other.id && other.id !== u.id) return json({ error: 'এই গুগল অ্যাকাউন্ট অন্য অ্যাকাউন্টের সাথে যুক্ত' }, 409);
  }
  if (!u.email) u.email = g.email;
  u.emailVerified = true; u.verified = true;
  u.providers = Array.from(new Set([...(u.providers || []), 'google']));
  await env.PUB_KV.put('user:' + u.id, JSON.stringify(u));
  await logAct(env, uid, 'google', 'গুগল অ্যাকাউন্ট যুক্ত করা হয়েছে');
  return json({ ok: true, user: await fullUser(env, u) });
};
const authGoogleUnlink = async (request, env, uid) => {
  const u = await getUserById(env, uid);
  if (!u) return json({ error: 'অ্যাকাউন্ট পাওয়া যায়নি' }, 404);
  u.providers = (u.providers || []).filter(p => p !== 'google');
  await env.PUB_KV.put('user:' + u.id, JSON.stringify(u));
  await logAct(env, uid, 'google', 'গুগল লিংক সরানো হয়েছে');
  return json({ ok: true, user: await fullUser(env, u) });
};
const authRemovePasskey = async (request, env) => {
  const tok = String(request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  const tr = JSON.parse((await kvGetRetry(env.PUB_KV, 'tok:' + tok, { tries: 4, base: 200 })) || 'null');
  if (!tr) return json({ error: 'আগে লগইন করো' }, 401);
  const u = JSON.parse((await env.PUB_KV.get('user:' + tr.id)) || 'null');
  if (!u) return json({ error: 'অ্যাকাউন্ট পাওয়া যায়নি' }, 404);
  if (u.credId) await env.PUB_KV.delete('pkid:' + u.credId);
  delete u.credId; delete u.pubKey; delete u.pubAlg;
  if (u.providers) u.providers = u.providers.filter(p => p !== 'passkey');
  if (u.providers && !u.providers.length) u.providers = ['password'];
  await env.PUB_KV.put('user:' + u.id, JSON.stringify(u));
  await logAct(env, u.id, 'passkey', 'Passkey সরানো হয়েছে');
  return json({ ok: true });
};
const pkLoginBegin = async (request, env) => {
  const chal = crypto.getRandomValues(new Uint8Array(32));
  const chalId = b64url(crypto.getRandomValues(new Uint8Array(16)));
  await env.PUB_KV.put('pkch:' + chalId, JSON.stringify({ challenge: b64url(chal), t: 'login', at: Date.now() }), { expirationTtl: 300 });
  return json({
    chalId,
    options: {
      challenge: b64url(chal),
      rpId: RP_ID,
      timeout: 120000,
      userVerification: 'required'
    }
  });
};
const pkLoginFinish = async (request, env) => {
  const b = await request.json().catch(() => ({}));
  const ch = JSON.parse((await env.PUB_KV.get('pkch:' + b.chalId)) || 'null');
  if (!ch || ch.t !== 'login') { await admEvent(env, 'pk-fail'); return json({ error: 'Passkey চ্যালেঞ্জ শেষ' }, 401); }
  let cdata;
  try { cdata = JSON.parse(new TextDecoder().decode(unb64url(b.clientDataJSON))); } catch (_) { return json({ error: 'Passkey ডেটা খারাপ' }, 400); }
  if (cdata.type !== 'webauthn.get') return json({ error: 'Passkey টাইপ ভুল' }, 400);
  if (String(cdata.challenge) !== ch.challenge) return json({ error: 'Passkey মিলছে না' }, 401);
  if (!String(cdata.origin || '').startsWith(RP_ORIGIN)) return json({ error: 'Origin মিলছে না' }, 401);
  const row = JSON.parse((await env.PUB_KV.get('pkid:' + b.rawId)) || 'null');
  if (!row || !row.id) return json({ error: 'এই ডিভাইসে Passkey নেই — আগে তৈরি করো' }, 404);
  const rec = JSON.parse((await env.PUB_KV.get('user:' + row.id)) || 'null');
  if (!rec) return json({ error: 'অ্যাকাউন্ট নেই' }, 404);
  if (rec.blocked || rec.status === 'disabled') return json({ error: 'অ্যাকাউন্ট বন্ধ' }, 403);
  try {
    const pub = unb64url(row.pubKey);
    const alg = Number(row.alg || -7);
    const authData = unb64url(b.authenticatorData);
    const clientHash = new Uint8Array(await crypto.subtle.digest('SHA-256', unb64url(b.clientDataJSON)));
    const signed = new Uint8Array(authData.length + clientHash.length);
    signed.set(authData, 0); signed.set(clientHash, authData.length);
    let ok = false;
    if (alg === -7) {
      const key = await crypto.subtle.importKey('spki', pub, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
      ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, derToRaw(unb64url(b.signature)), signed);
    } else if (alg === -257) {
      const key = await crypto.subtle.importKey('spki', pub, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
      ok = await crypto.subtle.verify({ name: 'RSASSA-PKCS1-v1_5' }, key, unb64url(b.signature), signed);
    }
    if (!ok) { await admEvent(env, 'pk-fail'); return json({ error: 'Passkey যাচাই ব্যর্থ' }, 401); }
  } catch (e) {
    await admEvent(env, 'pk-fail');
    return json({ error: 'Passkey যাচাই ব্যর্থ' }, 401);
  }
  await env.PUB_KV.delete('pkch:' + b.chalId);
  rec.lastSeen = Date.now(); rec.verified = true;
  const issued = await issueToken(env, rec);
  issued.user = await fullUser(env, rec);
  return json(issued);
};


const authRegisterEmail = async (request, env) => {
  const ip = request.headers.get('CF-Connecting-IP') || 'ip';
  if (!(await rateLimit(env, 'reg:' + ip, 400, 3600))) { await admEvent(env, 'reg-ratelimit'); return json({ error: 'একটু পরে আবার চেষ্টা করো' }, 429); }
  const b = await request.json().catch(() => ({}));
  const id = normId(b.id || b.email);
  const name = String(b.name || '').trim().slice(0, 40);
  if (!name || name.length < 2) return json({ error: 'পূর্ণ নাম লেখো' }, 400);
  if (!id.startsWith('em:')) return json({ error: 'সঠিক ইমেইল লেখো' }, 400);
  const existing = await getUserById(env, id);
  if (existing && existing.status === 'active') return json({ error: 'এই ইমেইল আগেই আছে — লগইন করো' }, 409);
  const password = String(b.password || '');
  const confirm = String(b.confirm || b.password2 || '');
  const weak = strongPass(password);
  if (weak) return json({ error: weak }, 400);
  if (password !== confirm) return json({ error: 'পাসওয়ার্ড দুটো মিলছে না' }, 400);
  const hp = await hashPassword(password);
  const waitId = b64url(crypto.getRandomValues(new Uint8Array(24)));
  const pending = {
    id, uid: (existing && existing.uid) || crypto.randomUUID(),
    name, email: id.slice(3), mobile: '', contact: id.slice(3),
    dob: String(b.dob || '').slice(0, 12),
    school: String(b.school || '').slice(0, 80),
    college: String(b.college || '').slice(0, 80),
    passHash: hp.hash, passSalt: hp.salt, waitId,
    created: Date.now(), providers: ['email', 'password'], verified: false, emailVerified: false, status: 'pending'
  };
  await env.PUB_KV.put('pending:' + id, JSON.stringify(pending), { expirationTtl: 900 });
  await env.PUB_KV.put('wait:' + waitId, JSON.stringify({ id, status: 'pending' }), { expirationTtl: 150 });
  const sent = await issueOtp(env, id, 'signup', ip);
  if (sent.error) return json({ error: sent.error }, sent.status || 503);
  return json({ pending: true, sent: true, channel: 'otp', masked: sent.masked, purpose: 'signup', waitId, expiresIn: 120, wait: 120 });
};
const authRegister = async (request, env) => {
  const ip = request.headers.get('CF-Connecting-IP') || 'ip';
  if (!(await rateLimit(env, 'reg:' + ip, 400, 3600))) return json({ error: 'একটু পরে আবার চেষ্টা করো' }, 429);
  const b = await request.json().catch(() => ({}));
  const id = normId(b.id);
  const password = String(b.password || '');
  const confirm = String(b.confirm || b.password2 || '');
  const name = String(b.name || '').trim().slice(0, 40);
  if (!name || name.length < 2) return json({ error: 'পূর্ণ নাম লেখো' }, 400);
  if (!(id.startsWith('em:') || id.startsWith('ph:'))) return json({ error: 'সঠিক ইমেইল বা মোবাইল লেখো' }, 400);
  const weak = strongPass(password);
  if (weak) return json({ error: weak }, 400);
  if (confirm && confirm !== password) return json({ error: 'পাসওয়ার্ড দুটো মিলছে না' }, 400);
  const existing = await getUserById(env, id);
  if (existing && existing.passHash) return json({ error: 'এই অ্যাকাউন্ট আগেই আছে — লগইন করো' }, 409);
  const hp = await hashPassword(password);
  const pending = {
    id, uid: (existing && existing.uid) || crypto.randomUUID(),
    name, passHash: hp.hash, passSalt: hp.salt,
    email: id.startsWith('em:') ? id.slice(3) : '',
    mobile: id.startsWith('ph:') ? id.slice(3) : '',
    contact: id.startsWith('ph:') ? '+88' + id.slice(3).replace(/^88/, '') : id.slice(3),
    created: Date.now(), providers: ['password']
  };
  if (!id.startsWith('em:')) return json({ error: 'ইমেইল লিংক ভেরিফাই শুধু Gmail/ইমেইলে — মোবাইলে Google বা Passkey ব্যবহার করো' }, 400);
  await env.PUB_KV.put('pending:' + id, JSON.stringify(pending), { expirationTtl: 1800 });
  const sent = await issueOtp(env, id, 'signup', ip);
  if (sent.error) return json({ error: sent.error }, sent.status || 503);
  return json({ pending: true, sent: true, channel: 'otp', masked: sent.masked, purpose: 'signup', wait: 120, expiresIn: 120 });
};

const otpSend = async (request, env) => {
  const ip = request.headers.get('CF-Connecting-IP') || 'ip';
  const b = await request.json().catch(() => ({}));
  const id = normId(b.id);
  const purpose = String(b.purpose || 'login');
  if (!(id.startsWith('em:') || id.startsWith('ph:'))) return json({ error: 'সঠিক ইমেইল বা মোবাইল লেখো' }, 400);
  if (purpose === 'signup') {
    const pending = JSON.parse((await env.PUB_KV.get('pending:' + id)) || 'null');
    if (!pending) return json({ error: 'আগে সাইন আপ ফর্ম পূরণ করো' }, 400);
  } else if (purpose === 'login' || purpose === 'reset') {
    const u = await getUserById(env, id);
    const pending = JSON.parse((await env.PUB_KV.get('pending:' + id)) || 'null');
    if (!u && pending) {
      const otp = await issueOtp(env, id, 'signup', ip);
      if (otp.error) return json({ error: otp.error, wait: otp.wait }, otp.status || 503);
      return json({ sent: true, channel: otp.channel, masked: otp.masked, wait: otp.wait, purpose: 'signup' });
    }
    if (!u) return json({ error: 'এই অ্যাকাউন্ট পাওয়া যায়নি' }, 404);
    if (u.blocked || u.status === 'disabled' || u.status === 'suspended') return json({ error: 'অ্যাকাউন্ট বন্ধ' }, 403);
  }
  const otp = await issueOtp(env, id, purpose, ip);
  if (otp.error) return json({ error: otp.error, wait: otp.wait }, otp.status || 503);
  return json({ sent: true, channel: otp.channel, masked: otp.masked, wait: otp.wait, purpose });
};

const otpVerify = async (request, env) => {
  const ip = request.headers.get('CF-Connecting-IP') || 'ip';
  if (!(await rateLimit(env, 'otptry:' + ip, 400, 3600))) { await admEvent(env, 'otp-ratelimit'); return json({ error: 'একটু পরে আবার চেষ্টা করো' }, 429); }
  const b = await request.json().catch(() => ({}));
  const id = normId(b.id);
  const purpose = String(b.purpose || 'login');
  const chk = await checkOtp(env, id, purpose, b.code);
  if (!chk.ok) { await admEvent(env, 'otp-fail'); return json({ error: chk.error }, chk.status || 401); }
  if (purpose === 'signup') {
    const pending = JSON.parse((await env.PUB_KV.get('pending:' + id)) || 'null');
    if (!pending) return json({ error: 'সাইন আপ সময় শেষ — আবার চেষ্টা করো' }, 400);
    await env.PUB_KV.delete('pending:' + id);
    const rec = {
      id: pending.id, uid: pending.uid, name: pending.name,
      email: pending.email, mobile: pending.mobile, contact: pending.contact,
      passHash: pending.passHash, passSalt: pending.passSalt,
      created: pending.created, lastSeen: Date.now(), blocked: false,
      verified: true, emailVerified: id.startsWith('em:'), mobileVerified: id.startsWith('ph:'),
      status: 'active', providers: pending.providers || ['password']
    };
    const issued = await issueToken(env, rec);
    issued.user = await fullUser(env, rec);
    return json(issued);
  }
  if (purpose === 'reset') {
    await env.PUB_KV.put('resetok:' + id, JSON.stringify({ at: Date.now() }), { expirationTtl: 600 });
    return json({ reset: true });
  }
  const u = await getUserById(env, id);
  if (!u) return json({ error: 'অ্যাকাউন্ট পাওয়া যায়নি' }, 404);
  if (u.blocked || u.status === 'disabled' || u.status === 'suspended') return json({ error: 'অ্যাকাউন্ট বন্ধ' }, 403);
  if (id.startsWith('em:')) u.emailVerified = true;
  if (id.startsWith('ph:')) u.mobileVerified = true;
  u.verified = true;
  const issued = await issueToken(env, u);
  issued.user = await fullUser(env, u);
  return json(issued);
};

const authLogin = async (request, env) => {
  const ip = request.headers.get('CF-Connecting-IP') || 'ip';
  if (!(await rateLimit(env, 'login:' + ip, 2000, 3600))) { await admEvent(env, 'login-ratelimit'); return json({ error: 'একটু পরে আবার চেষ্টা করো' }, 429); }
  const b = await request.json().catch(() => ({}));
  const id = normId(b.id);
  const u = await getUserById(env, id);
  if (!u || !u.passHash) { await admEvent(env, 'login-fail'); return json({ error: 'ইমেইল/মোবাইল বা পাসওয়ার্ড ভুল' }, 401); }
  if (u.blocked || u.status === 'disabled' || u.status === 'suspended') { await admEvent(env, 'login-blocked'); return json({ error: 'অ্যাকাউন্ট বন্ধ' }, 403); }
  const hp = await hashPassword(String(b.password || ''), u.passSalt);
  if (hp.hash !== u.passHash) { await admEvent(env, 'login-fail'); return json({ error: 'ইমেইল/মোবাইল বা পাসওয়ার্ড ভুল' }, 401); }
  const issued = await issueToken(env, u);
  issued.user = await fullUser(env, u);
  await logAct(env, u.id, 'login', 'পাসওয়ার্ড দিয়ে লগইন সফল');
  return json(issued);
};
const authLogout = async (request, env) => {
  const tok = String(request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  if (tok) {
    const tr = JSON.parse((await env.PUB_KV.get('tok:' + tok)) || 'null');
    await env.PUB_KV.delete('tok:' + tok);
    if (tr && tr.id) await clearSession(env, tr.id, tok);
  }
  return json({ ok: true });
};
const authGoogle = async (request, env) => {
  const b = await request.json().catch(() => ({}));
  if (!env.GOOGLE_CLIENT_ID) return json({ error: 'Google লগইন এখন সেটআপ নেই' }, 503);
  const idToken = String(b.idToken || '');
  const accessToken = String(b.accessToken || b.access_token || '');
  let g = {};
  if (idToken) {
    const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken));
    g = await r.json().catch(() => ({}));
    if (!r.ok || !g.email) return json({ error: 'Google লগইন ব্যর্থ' }, 401);
    if (g.aud !== env.GOOGLE_CLIENT_ID) return json({ error: 'Google ক্লায়েন্ট মিলছে না' }, 401);
  } else if (accessToken) {
    const r = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: 'Bearer ' + accessToken } });
    g = await r.json().catch(() => ({}));
    if (!r.ok || !g.email) return json({ error: 'Google লগইন ব্যর্থ' }, 401);
    const t = await fetch('https://oauth2.googleapis.com/tokeninfo?access_token=' + encodeURIComponent(accessToken));
    const info = await t.json().catch(() => ({}));
    if (info.aud && info.aud !== env.GOOGLE_CLIENT_ID) return json({ error: 'Google ক্লায়েন্ট মিলছে না' }, 401);
  } else {
    return json({ error: 'Google টোকেন নেই' }, 400);
  }
  const id = normId(g.email);
  const existing = JSON.parse((await env.PUB_KV.get('user:' + id)) || '{}');
  if (existing.blocked || existing.status === 'disabled' || existing.status === 'suspended') return json({ error: 'অ্যাকাউন্ট বন্ধ' }, 403);
  const rec = {
    id, uid: existing.uid || crypto.randomUUID(),
    name: String(b.name || g.name || existing.name || 'Scholar').slice(0, 40),
    email: g.email, mobile: existing.mobile || '', contact: g.email,
    dob: String(b.dob || existing.dob || '').slice(0, 12),
    school: String(b.school || existing.school || '').slice(0, 80),
    college: String(b.college || existing.college || '').slice(0, 80),
    created: existing.created || Date.now(), lastSeen: Date.now(),
    blocked: false, verified: true, emailVerified: true, mobileVerified: !!existing.mobileVerified,
    status: 'active', passHash: existing.passHash, passSalt: existing.passSalt,
    providers: Array.from(new Set([...(existing.providers || []), 'google']))
  };
  const issued = await issueToken(env, rec);
  issued.user = await fullUser(env, rec);
  return json(issued);
};
const authForgot = async (request, env) => {
  const ip = request.headers.get('CF-Connecting-IP') || 'ip';
  const b = await request.json().catch(() => ({}));
  const id = normId(b.id);
  if (!id.startsWith('em:')) return json({ error: 'নিবন্ধিত ইমেইল ঠিকানা লিখুন' }, 400);
  const u = await getUserById(env, id);
  if (!u || (u.status && u.status !== 'active')) return json({ error: 'এই ইমেইলে কোনো অ্যাকাউন্ট পাওয়া যায়নি' }, 404);
  if (u.blocked || u.status === 'disabled' || u.status === 'suspended') return json({ error: 'অ্যাকাউন্ট বন্ধ' }, 403);
  const otp = await issueOtp(env, id, 'reset', ip);
  if (otp.error) return json({ error: otp.error, wait: otp.wait }, otp.status || 503);
  return json({ sent: true, channel: otp.channel, masked: otp.masked, wait: otp.wait, purpose: 'reset', expiresIn: 120 });
};
const authReset = async (request, env) => {
  const b = await request.json().catch(() => ({}));
  const id = normId(b.id);
  const password = String(b.password || '');
  const weak = strongPass(password);
  if (weak) return json({ error: weak }, 400);
  if (b.confirm && b.confirm !== password) return json({ error: 'পাসওয়ার্ড দুটো মিলছে না' }, 400);
  const ok = JSON.parse((await env.PUB_KV.get('resetok:' + id)) || 'null');
  if (!ok) {
    const chk = await checkOtp(env, id, 'reset', b.code);
    if (!chk.ok) return json({ error: chk.error || 'আগে কোড ভেরিফাই করো' }, chk.status || 401);
  }
  const u = await getUserById(env, id);
  if (!u) return json({ error: 'অ্যাকাউন্ট পাওয়া যায়নি' }, 404);
  const hp = await hashPassword(password);
  u.passHash = hp.hash; u.passSalt = hp.salt;
  await env.PUB_KV.delete('resetok:' + id);
  const issued = await issueToken(env, u);
  issued.user = await fullUser(env, u);
  return json(issued);
};
const authChangePassword = async (request, env, uid) => {
  const b = await request.json().catch(() => ({}));
  const u = await getUserById(env, uid);
  if (!u) return json({ error: 'অ্যাকাউন্ট পাওয়া যায়নি' }, 404);
  if (u.passHash) {
    const hp = await hashPassword(String(b.current || ''), u.passSalt);
    if (hp.hash !== u.passHash) return json({ error: 'বর্তমান পাসওয়ার্ড ভুল' }, 401);
  }
  const weak = strongPass(b.password);
  if (weak) return json({ error: weak }, 400);
  if (b.confirm && b.confirm !== b.password) return json({ error: 'পাসওয়ার্ড দুটো মিলছে না' }, 400);
  const np = await hashPassword(String(b.password));
  u.passHash = np.hash; u.passSalt = np.salt;
  await env.PUB_KV.put('user:' + u.id, JSON.stringify(u));
  await logAct(env, uid, 'password', 'পাসওয়ার্ড পরিবর্তন করা হয়েছে');
  return json({ ok: true });
};
const authDelete = async (request, env, uid) => {
  const b = await request.json().catch(() => ({}));
  const u = await getUserById(env, uid);
  if (!u) return json({ error: 'অ্যাকাউন্ট পাওয়া যায়নি' }, 404);
  if (u.passHash) {
    const hp = await hashPassword(String(b.password || ''), u.passSalt);
    if (hp.hash !== u.passHash) return json({ error: 'পাসওয়ার্ড ভুল' }, 401);
  }
  await env.PUB_KV.delete('user:' + u.id);
  await env.PUB_KV.delete('profile:' + (u.uid || u.id));
  await env.PUB_KV.delete('ustate:' + u.id);
  await env.PUB_KV.delete('onb:' + u.id);
  await env.PUB_KV.delete('ach:' + u.id);
  await env.PUB_KV.delete('act:' + u.id);
  if (u.credId) await env.PUB_KV.delete('pkid:' + u.credId);
  // revoke every live session token for this account
  const sessions = JSON.parse((await env.PUB_KV.get('sess:' + u.id)) || '{}');
  for (const t of Object.keys(sessions || {})) await env.PUB_KV.delete('tok:' + t);
  await env.PUB_KV.delete('sess:' + u.id);
  const tok = String(request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  if (tok) await env.PUB_KV.delete('tok:' + tok);
  return json({ ok: true, deleted: true });
};

const UNI_CATALOG = [
  { id: 'du', name: 'ঢাকা বিশ্ববিদ্যালয়', nameEn: 'University of Dhaka', short: 'DU', units: ['A', 'B', 'C', 'D'] },
  { id: 'cu', name: 'চট্টগ্রাম বিশ্ববিদ্যালয়', nameEn: 'University of Chittagong', short: 'CU', units: ['A', 'B', 'C', 'D'] },
  { id: 'ru', name: 'রাজশাহী বিশ্ববিদ্যালয়', nameEn: 'University of Rajshahi', short: 'RU', units: ['A', 'B', 'C', 'D'] },
  { id: 'ju', name: 'জাহাঙ্গীরনগর বিশ্ববিদ্যালয়', nameEn: 'Jahangirnagar University', short: 'JU', units: ['A', 'B', 'C', 'D'] },
  { id: 'ku', name: 'খুলনা বিশ্ববিদ্যালয়', nameEn: 'Khulna University', short: 'KU', units: ['A', 'B', 'C', 'D'] },
  { id: 'cou', name: 'কুমিল্লা বিশ্ববিদ্যালয়', nameEn: 'Comilla University', short: 'CoU', units: ['A', 'B', 'C'] },
  { id: 'other', name: 'অন্যান্য', nameEn: 'Other', short: 'OTH', units: ['A', 'B', 'C', 'D'] }
];
function buildOnboardPlan(o) {
  const hours = Math.max(1, Number(o.dailyHours) || 2);
  const days = Math.max(1, Number(o.weeklyDays) || 5);
  const lvl = Math.max(0, Math.min(100, Number(o.currentLevel) || 0));
  const weak = Array.isArray(o.weakSubjects) ? o.weakSubjects.slice(0, 6) : [];
  const dailyQuestions = lvl < 25 ? 20 : lvl < 60 ? 35 : 45;
  return {
    at: Date.now(),
    dailyMinutes: hours * 60,
    weeklyDays: days,
    dailyQuestions,
    focus: weak,
    university: (o.targetUniversities || [])[0] || '',
    units: o.targetUnits || [],
    goal: o.goal || '',
    studyGoal: o.studyGoal || ''
  };
}
function sanitizeOnboard(b) {
  const o = b && typeof b === 'object' ? b : {};
  const arr = (x, n) => (Array.isArray(x) ? x : []).map(s => String(s || '').trim().slice(0, 80)).filter(Boolean).slice(0, n);
  const out = {
    step: Math.max(1, Math.min(10, Number(o.step) || 1)),
    completed: !!o.completed,
    goal: String(o.goal || '').slice(0, 24),
    targetUniversities: arr(o.targetUniversities, 8),
    targetUniversityIds: arr(o.targetUniversityIds, 8),
    targetUnits: arr(o.targetUnits, 8),
    studyGoal: String(o.studyGoal || '').slice(0, 24),
    currentLevel: Math.max(0, Math.min(100, Number(o.currentLevel) || 0)),
    weakSubjects: arr(o.weakSubjects, 12),
    dailyHours: Math.max(1, Math.min(5, Number(o.dailyHours) || 2)),
    weeklyDays: Math.max(1, Math.min(7, Number(o.weeklyDays) || 5)),
    preferredTime: String(o.preferredTime || 'flexible').slice(0, 24)
  };
  if (out.completed) out.plan = buildOnboardPlan(out);
  else if (o.plan && typeof o.plan === 'object') out.plan = o.plan;
  return out;
}
const onboardingGet = async (request, env, uid) => {
  const u = await getUserById(env, uid);
  if (!u) return json({ error: 'অ্যাকাউন্ট পাওয়া যায়নি' }, 404);
  const pf = await loadProfile(env, u.uid || u.id);
  return json({ onboarding: pf.onboarding || { completed: false, step: 1 } });
};
const onboardingPut = async (request, env, uid) => {
  const u = await getUserById(env, uid);
  if (!u) return json({ error: 'অ্যাকাউন্ট পাওয়া যায়নি' }, 404);
  const pf = await loadProfile(env, u.uid || u.id);
  pf.onboarding = sanitizeOnboard(await request.json().catch(() => ({})));
  if (pf.onboarding.completed) {
    if (pf.onboarding.targetUniversities[0]) pf.targetUniversity = pf.onboarding.targetUniversities[0];
    if (pf.onboarding.targetUnits[0]) pf.targetUnit = pf.onboarding.targetUnits.join(',');
  }
  await saveProfile(env, u.uid || u.id, pf);
  return json({ onboarding: pf.onboarding, user: await fullUser(env, u) });
};
const onboardingCatalog = async (env) => {
  let extra = [];
  try { extra = JSON.parse((await env.PUB_KV.get('onboardCatalog')) || '[]'); } catch (_) {}
  const list = UNI_CATALOG.slice();
  (Array.isArray(extra) ? extra : []).forEach(u => {
    if (u && u.id && u.name && !list.some(x => x.id === u.id)) list.push({ id: String(u.id).slice(0, 24), name: String(u.name).slice(0, 80), short: String(u.short || u.id).slice(0, 8), units: Array.isArray(u.units) && u.units.length ? u.units.map(x => String(x).slice(0, 8)) : ['A', 'B', 'C', 'D'] });
  });
  return json({ universities: list });
};

const profilePut = async (request, env, uid) => {
  const u = await getUserById(env, uid);
  if (!u) return json({ error: 'অ্যাকাউন্ট পাওয়া যায়নি' }, 404);
  const b = await request.json().catch(() => ({}));
  const pf = await loadProfile(env, u.uid || u.id);
  const fields = ['displayName', 'institution', 'targetUniversity', 'targetUnit', 'admissionYear', 'bio', 'dob', 'gender', 'studyGroup'];
  for (const f of fields) if (b[f] !== undefined) pf[f] = String(b[f] || '').slice(0, f === 'bio' ? 200 : 80);
  if (b.name) { u.name = String(b.name).slice(0, 40); await env.PUB_KV.put('user:' + u.id, JSON.stringify(u)); }
  // sensitive contact changes require password re-authentication
  const wantEmail = (b.email !== undefined) ? String(b.email || '').trim().toLowerCase() : undefined;
  const wantMobile = (b.mobile !== undefined) ? String(b.mobile || '').trim() : undefined;
  const emailChange = wantEmail !== undefined && wantEmail !== String(u.email || '').toLowerCase();
  const mobileChange = wantMobile !== undefined && wantMobile !== String(u.mobile || '');
  if (emailChange || mobileChange) {
    if (!u.passHash) return json({ error: 'পাসওয়ার্ড সেট না থাকায় পরিচিতি বদলানো যাবে না' }, 400);
    const hp = await hashPassword(String(b.password || ''), u.passSalt);
    if (hp.hash !== u.passHash) return json({ error: 'নিশ্চিত করতে পাসওয়ার্ড দাও — ভুল হয়েছে' }, 401);
    if (emailChange) {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(wantEmail)) return json({ error: 'ইমেইল ঠিকানা ঠিক নয়' }, 400);
      const exists = await getUserById(env, 'em:' + wantEmail);
      if (exists && exists.id !== u.id) return json({ error: 'এই ইমেইলে আগে থেকেই অ্যাকাউন্ট আছে' }, 409);
      delete u.emailVerified; u.email = wantEmail;
    }
    if (mobileChange) {
      if (!/^[+\d][\d\s\-]{5,17}$/.test(wantMobile)) return json({ error: 'মোবাইল নম্বর ঠিক নয়' }, 400);
      const exists = await getUserById(env, 'ph:' + wantMobile);
      if (exists && exists.id !== u.id) return json({ error: 'এই নম্বরে আগে থেকেই অ্যাকাউন্ট আছে' }, 409);
      delete u.mobileVerified; u.mobile = wantMobile;
    }
    await env.PUB_KV.put('user:' + u.id, JSON.stringify(u));
    await logAct(env, uid, 'contact', 'ইমেইল/মোবাইল আপডেট (পাসওয়ার্ড দিয়ে নিশ্চিত)');
  }
  await saveProfile(env, u.uid || u.id, pf);
  return json({ user: await fullUser(env, u) });
};
const profilePhoto = async (request, env, uid) => {
  const u = await getUserById(env, uid);
  if (!u) return json({ error: 'অ্যাকাউন্ট পাওয়া যায়নি' }, 404);
  const b = await request.json().catch(() => ({}));
  const pf = await loadProfile(env, u.uid || u.id);
  if (b.remove) { delete pf.photo; await saveProfile(env, u.uid || u.id, pf); return json({ user: await fullUser(env, u) }); }
  const dataUrl = String(b.dataUrl || '');
  if (!dataUrl.startsWith('data:image/')) return json({ error: 'শুধু ছবি আপলোড করো' }, 400);
  if (dataUrl.length > 220000) return json({ error: 'ছবি Compact করে আবার দাও' }, 400);
  pf.photo = dataUrl;
  await saveProfile(env, u.uid || u.id, pf);
  return json({ user: await fullUser(env, u) });
};

const authUser = async (request, env) => {
  const tok = String(request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  const tr = JSON.parse((await env.PUB_KV.get('tok:' + tok)) || 'null');
  if (!tr) throw Object.assign(new Error('আগে লগইন করো'), { status: 401 });
  const u = JSON.parse((await kvGetRetry(env.PUB_KV, 'user:' + tr.id, { tries: 4, base: 200 })) || '{}');
  if (u.blocked || u.status === 'disabled' || u.status === 'suspended') throw Object.assign(new Error('অ্যাকাউন্ট বন্ধ করা হয়েছে'), { status: 403 });
  // session freshness tracking (best-effort, never blocks)
  try {
    await env.PUB_KV.put('tok:' + tok, JSON.stringify({ id: tr.id, at: tr.at || Date.now(), lastSeen: Date.now() }), { expirationTtl: 31536000 });
    await trackSession(env, tr.id, tok, request.headers.get('User-Agent') || '');
  } catch (_) {}
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
