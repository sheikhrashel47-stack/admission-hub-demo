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
    providers: u.providers || []
  };
}
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
      if (p === '/api/auth/login' && request.method === 'POST') return await authLogin(request, env);
      if (p === '/api/auth/google' && request.method === 'POST') return await authGoogle(request, env);
      if (p === '/api/auth/passkey/register/begin' && request.method === 'POST') return await pkRegBegin(request, env);
      if (p === '/api/auth/passkey/register/finish' && request.method === 'POST') return await pkRegFinish(request, env);
      if (p === '/api/auth/passkey/login/begin' && request.method === 'POST') return await pkLoginBegin(request, env);
      if (p === '/api/auth/passkey/login/finish' && request.method === 'POST') return await pkLoginFinish(request, env);
      if (p === '/api/auth/verify-link' && request.method === 'POST') return await authVerifyLink(request, env);
      if (p === '/api/auth/otp/send' && request.method === 'POST') return await otpSend(request, env);
      if (p === '/api/auth/otp/verify' && request.method === 'POST') return await otpVerify(request, env);
      if (p === '/api/auth/request' && request.method === 'POST') return await otpSend(request, env);
      if (p === '/api/auth/verify' && request.method === 'POST') return await otpVerify(request, env);
      if (p === '/api/auth/forgot' && request.method === 'POST') return await authForgot(request, env);
      if (p === '/api/auth/reset' && request.method === 'POST') return await authReset(request, env);
      if (p === '/api/auth/logout' && request.method === 'POST') return await authLogout(request, env);
      if (p.startsWith('/api/admin/')) return await admin(request, env, p);
      const uid = await authUser(request, env);
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
async function sendOtpMessage(env, destId, code) {
  const text = 'Admission Hub verification code: ' + code + ' (valid 5 minutes). Do not share.';
  const html = '<div style="font-family:sans-serif;padding:16px"><p>Admission Hub</p><p style="font-size:28px;letter-spacing:6px;font-weight:800">' + code + '</p><p>Valid 5 minutes. Do not share this code.</p></div>';
  const subject = 'Your Admission Hub code: ' + code;
  if (destId.startsWith('em:')) {
    const to = destId.slice(3);
    if (env.MAIL_HOOK) {
      const r = await fetch(env.MAIL_HOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: env.MAIL_HOOK_SECRET || '', to, subject, text, html })
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
  if (!(await rateLimit(env, 'otp:' + ip, 8, 3600))) return { error: 'একটু পরে আবার চেষ্টা করো', status: 429 };
  if (!(await rateLimit(env, 'otp-id:' + destId, 6, 3600))) return { error: 'একটু পরে আবার চেষ্টা করো', status: 429 };
  const key = 'otp:' + purpose + ':' + destId;
  const prev = JSON.parse((await env.PUB_KV.get(key)) || 'null');
  if (prev && prev.sentAt && Date.now() - prev.sentAt < 45000) return { error: 'কোড আবার পাঠাতে একটু অপেক্ষা করো', status: 429, wait: 45 - Math.floor((Date.now() - prev.sentAt) / 1000) };
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const sent = await sendOtpMessage(env, destId, code);
  if (!sent.ok) return { error: sent.error, status: 503 };
  await env.PUB_KV.put(key, JSON.stringify({ hash: await shaHex(code), exp: Date.now() + 5 * 60000, tries: 0, sentAt: Date.now(), purpose }), { expirationTtl: 600 });
  return { sent: true, channel: sent.channel, masked: maskDest(destId), wait: 45 };
}
async function checkOtp(env, destId, purpose, code) {
  const key = 'otp:' + purpose + ':' + destId;
  const o = JSON.parse((await env.PUB_KV.get(key)) || 'null');
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
  return JSON.parse((await env.PUB_KV.get('user:' + id)) || 'null');
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
    const r = await fetch(env.MAIL_HOOK, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ secret: env.MAIL_HOOK_SECRET || '', to, subject, text, html }) });
    if (r.ok) return { ok: true };
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
  if (!(await rateLimit(env, 'vlink:' + ip, 8, 3600))) return { error: 'একটু পরে আবার চেষ্টা করো', status: 429 };
  const raw = b64url(crypto.getRandomValues(new Uint8Array(32)));
  const hash = await shaHex(raw);
  await env.PUB_KV.put('vlink:' + hash, JSON.stringify({ id: destId, purpose, at: Date.now() }), { expirationTtl: 1800 });
  const link = APP_URL + '?verify=' + raw;
  const to = destId.slice(3);
  const sent = await sendEmail(env, to, 'Verify your Admission Hub email', 'Open this link to verify: ' + link, '<div style="font-family:sans-serif;padding:20px"><p>Admission Hub</p><p><a href="' + link + '" style="display:inline-block;padding:12px 20px;background:#1e7a4c;color:#fff;border-radius:12px;text-decoration:none">Verify your email</a></p><p>Link expires in 30 minutes.</p></div>');
  if (!sent.ok) return { error: sent.error, status: 503 };
  return { sent: true, masked: maskDest(destId) };
}
const authVerifyLink = async (request, env) => {
  const b = await request.json().catch(() => ({}));
  const raw = String(b.token || '');
  if (!raw) return json({ error: 'লিংক অবৈধ' }, 400);
  const hash = await shaHex(raw);
  const row = JSON.parse((await env.PUB_KV.get('vlink:' + hash)) || 'null');
  if (!row || !row.id) return json({ error: 'লিংক অবৈধ বা মেয়াদ শেষ' }, 401);
  const pending = JSON.parse((await env.PUB_KV.get('pending:' + row.id)) || 'null');
  if (!pending) return json({ error: 'আবার সাইন আপ করো' }, 400);
  pending.verified = true; pending.emailVerified = true; pending.status = 'active'; pending.lastSeen = Date.now();
  await env.PUB_KV.put('user:' + pending.id, JSON.stringify(pending));
  await env.PUB_KV.delete('pending:' + row.id);
  await env.PUB_KV.delete('vlink:' + hash);
  const issued = await issueToken(env, pending);
  issued.user = await fullUser(env, pending);
  return json(issued);
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
  const rec = {
    id, uid: ch.uid, name: String(b.name || 'Scholar').slice(0, 40), email: '', mobile: '', contact: '',
    dob: String(b.dob || '').slice(0, 12), school: String(b.school || '').slice(0, 80), college: String(b.college || '').slice(0, 80),
    created: Date.now(), lastSeen: Date.now(), blocked: false, verified: true, emailVerified: false,
    status: 'active', providers: ['passkey'], credId: b.rawId, pubKey: b.publicKey, pubAlg: b.publicKeyAlgorithm || -7
  };
  await env.PUB_KV.put('pkid:' + b.rawId, JSON.stringify({ id, pubKey: rec.pubKey, alg: rec.pubAlg }));
  await env.PUB_KV.delete('pkch:' + b.chalId);
  const issued = await issueToken(env, rec);
  issued.user = await fullUser(env, rec);
  return json(issued);
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
  if (!ch || ch.t !== 'login') return json({ error: 'Passkey চ্যালেঞ্জ শেষ' }, 401);
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
    if (!ok) return json({ error: 'Passkey যাচাই ব্যর্থ' }, 401);
  } catch (e) {
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
  if (!(await rateLimit(env, 'reg:' + ip, 10, 3600))) return json({ error: 'একটু পরে আবার চেষ্টা করো' }, 429);
  const b = await request.json().catch(() => ({}));
  const id = normId(b.id || b.email);
  const name = String(b.name || '').trim().slice(0, 40);
  if (!name || name.length < 2) return json({ error: 'পূর্ণ নাম লেখো' }, 400);
  if (!id.startsWith('em:')) return json({ error: 'সঠিক ইমেইল লেখো' }, 400);
  const existing = await getUserById(env, id);
  if (existing && existing.status === 'active') return json({ error: 'এই ইমেইল আগেই আছে — লগইন করো' }, 409);
  const pending = {
    id, uid: (existing && existing.uid) || crypto.randomUUID(),
    name, email: id.slice(3), mobile: '', contact: id.slice(3),
    dob: String(b.dob || '').slice(0, 12),
    school: String(b.school || '').slice(0, 80),
    college: String(b.college || '').slice(0, 80),
    created: Date.now(), providers: ['email'], verified: false, emailVerified: false, status: 'pending'
  };
  await env.PUB_KV.put('pending:' + id, JSON.stringify(pending), { expirationTtl: 1800 });
  const sent = await issueVerifyLink(env, id, 'signup', ip);
  if (sent.error) return json({ error: sent.error }, sent.status || 503);
  return json({ pending: true, sent: true, channel: 'link', masked: sent.masked, purpose: 'signup' });
};
const authRegister = async (request, env) => {
  const ip = request.headers.get('CF-Connecting-IP') || 'ip';
  if (!(await rateLimit(env, 'reg:' + ip, 10, 3600))) return json({ error: 'একটু পরে আবার চেষ্টা করো' }, 429);
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
  const sent = await issueVerifyLink(env, id, 'signup', ip);
  if (sent.error) return json({ error: sent.error }, sent.status || 503);
  return json({ pending: true, sent: true, channel: 'link', masked: sent.masked, purpose: 'signup' });
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
  if (!(await rateLimit(env, 'otptry:' + ip, 30, 3600))) return json({ error: 'একটু পরে আবার চেষ্টা করো' }, 429);
  const b = await request.json().catch(() => ({}));
  const id = normId(b.id);
  const purpose = String(b.purpose || 'login');
  const chk = await checkOtp(env, id, purpose, b.code);
  if (!chk.ok) return json({ error: chk.error }, chk.status || 401);
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
  if (!(await rateLimit(env, 'login:' + ip, 20, 3600))) return json({ error: 'একটু পরে আবার চেষ্টা করো' }, 429);
  const b = await request.json().catch(() => ({}));
  const id = normId(b.id);
  const u = await getUserById(env, id);
  if (!u || !u.passHash) return json({ error: 'ইমেইল/মোবাইল বা পাসওয়ার্ড ভুল' }, 401);
  if (u.blocked || u.status === 'disabled' || u.status === 'suspended') return json({ error: 'অ্যাকাউন্ট বন্ধ' }, 403);
  const hp = await hashPassword(String(b.password || ''), u.passSalt);
  if (hp.hash !== u.passHash) return json({ error: 'ইমেইল/মোবাইল বা পাসওয়ার্ড ভুল' }, 401);
  const issued = await issueToken(env, u);
  issued.user = await fullUser(env, u);
  return json(issued);
};
const authLogout = async (request, env) => {
  const tok = String(request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  if (tok) await env.PUB_KV.delete('tok:' + tok);
  return json({ ok: true });
};
const authGoogle = async (request, env) => {
  const b = await request.json().catch(() => ({}));
  const idToken = String(b.idToken || '');
  if (!idToken) return json({ error: 'Google টোকেন নেই' }, 400);
  if (!env.GOOGLE_CLIENT_ID) return json({ error: 'Google লগইন এখন সেটআপ নেই' }, 503);
  const r = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken));
  const g = await r.json().catch(() => ({}));
  if (!r.ok || !g.email) return json({ error: 'Google লগইন ব্যর্থ' }, 401);
  if (g.aud !== env.GOOGLE_CLIENT_ID) return json({ error: 'Google ক্লায়েন্ট মিলছে না' }, 401);
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
  const b = await request.json().catch(() => ({}));
  b.purpose = 'reset';
  return otpSend(new Request(request.url, { method: 'POST', headers: request.headers, body: JSON.stringify(b) }), env);
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
  const tok = String(request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  if (tok) await env.PUB_KV.delete('tok:' + tok);
  return json({ ok: true, deleted: true });
};
const profilePut = async (request, env, uid) => {
  const u = await getUserById(env, uid);
  if (!u) return json({ error: 'অ্যাকাউন্ট পাওয়া যায়নি' }, 404);
  const b = await request.json().catch(() => ({}));
  const pf = await loadProfile(env, u.uid || u.id);
  const fields = ['displayName', 'institution', 'targetUniversity', 'targetUnit', 'admissionYear', 'bio', 'dob', 'gender', 'studyGroup'];
  for (const f of fields) if (b[f] !== undefined) pf[f] = String(b[f] || '').slice(0, f === 'bio' ? 200 : 80);
  if (b.name) { u.name = String(b.name).slice(0, 40); await env.PUB_KV.put('user:' + u.id, JSON.stringify(u)); }
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
