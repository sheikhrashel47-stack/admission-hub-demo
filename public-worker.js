// Admission Hub — Public Product Worker (account system retired, v221)
// Active routes: public content · anonymous-device AI · content admin.
// The former login/profile/onboarding/session/state APIs are intentionally absent.
import { agentChat, agentStatus } from './ai-agent.js';

const JSONH = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization,content-type,x-ah-app,x-ah-guest',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
};
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: JSONH });
const onlyRows = rows => (Array.isArray(rows) ? rows : []).filter(row => row && row.id).map(row => {
  const clean = { ...row };
  for (const key of ['imageDataUrl', 'image', 'thumbnail']) {
    if (typeof clean[key] === 'string' && clean[key].startsWith('data:') && clean[key].length > 900000) delete clean[key];
  }
  return clean;
});
const fingerprintGlobal = doc => {
  const questions = doc.questions || [];
  return [
    (doc.subjects || []).length,
    (doc.topics || []).length,
    questions.length,
    (doc.vocabulary || []).length,
    (doc.vocabularyMaster || []).length,
    questions.reduce((total, row) => total + String(row.question || row.q || '').length, 0)
  ].join(':');
};
const countsOf = doc => ({
  subjects: (doc.subjects || []).length,
  topics: (doc.topics || []).length,
  questions: (doc.questions || []).length,
  vocabulary: (doc.vocabulary || []).length,
  vocabularyMaster: (doc.vocabularyMaster || []).length
});
const paginateContent = (doc, limit, offset) => {
  if (!doc || typeof doc !== 'object') return doc;
  const rawLimit = Number(limit);
  const pageLimit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(500, rawLimit) : 0;
  const pageOffset = Math.max(0, Number(offset) || 0);
  if (!pageLimit) return doc;
  const out = { ...doc };
  for (const key of ['questions', 'vocabulary', 'vocabularyMaster', 'subjects', 'topics', 'exams']) {
    if (Array.isArray(doc[key])) out[key] = doc[key].slice(pageOffset, pageOffset + pageLimit);
  }
  out.total = Array.isArray(doc.questions) ? doc.questions.length : 0;
  out.page = { limit: pageLimit, offset: pageOffset };
  return out;
};
const sha256 = async value => {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(value || '')));
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('');
};
const dayKey = () => new Date().toISOString().slice(0, 10);
const readGuestHeader = request => {
  const value = String(request.headers.get('X-AH-Guest') || '').trim();
  return /^[A-Za-z0-9_-]{16,96}$/.test(value) ? value : '';
};
async function anonymousAiIdentity(request, env, countUsage = true) {
  const supplied = readGuestHeader(request);
  const userAgent = String(request.headers.get('User-Agent') || '').slice(0, 180);
  const network = String(request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown').split(',')[0].trim();
  const deviceHash = await sha256(supplied || `${network}|${userAgent}`);
  const networkHash = await sha256(network === 'unknown' ? `${network}|${userAgent}` : network);

  // Public AI remains usable without recreating a login system. A network-level
  // ceiling complements the per-anonymous-device cap inside agentChat.
  if (countUsage && env.PUB_KV) {
    const key = `aipub:${networkHash.slice(0, 24)}:${dayKey()}`;
    let count = 0;
    try { count = Number((await env.PUB_KV.get(key)) || 0); } catch (_) {}
    const cap = Math.max(40, Math.min(800, Number(env.AGENT_PUBLIC_DAILY_CAP || 240)));
    if (count >= cap) throw Object.assign(new Error('আজকের public AI সীমা শেষ — কাল আবার চেষ্টা করো।'), { status: 429 });
    try { await env.PUB_KV.put(key, String(count + 1), { expirationTtl: 172800 }); } catch (_) {}
  }
  return `anon-${deviceHash.slice(0, 40)}`;
}

export const publishGlobal = async (env, full) => {
  if (!env || !env.PUB_KV) return { error: 'no-pub-kv' };
  const source = full && typeof full === 'object' ? full : {};
  const subjects = onlyRows(source.subjects);
  const topics = onlyRows(source.topics);
  const questions = onlyRows(source.questions);
  const vocabulary = onlyRows(source.vocabulary);
  const vocabularyMaster = onlyRows(source.vocabularyMaster);
  if (!questions.length && !vocabularyMaster.length) return { error: 'empty' };

  const sig = fingerprintGlobal({ subjects, topics, questions, vocabulary, vocabularyMaster });
  let previousMeta = { v: 0 };
  try { previousMeta = JSON.parse((await env.PUB_KV.get('pubContentMeta')) || '{"v":0}'); } catch (_) {}
  if (previousMeta.sig === sig && previousMeta.v) {
    return { published: false, unchanged: true, v: previousMeta.v, counts: previousMeta.counts || countsOf({ subjects, topics, questions, vocabulary, vocabularyMaster }) };
  }

  let exams = [{ id: 'mock1', title: 'মক পরীক্ষা ১', mins: 15, n: Math.min(15, questions.length || 1), published: true, desc: 'সব বিষয় মিশিয়ে' }];
  try {
    const previous = JSON.parse((await env.PUB_KV.get('pubContent')) || '{}');
    if (Array.isArray(previous.exams) && previous.exams.length) exams = previous.exams;
  } catch (_) {}

  const doc = { v: (Number(previousMeta.v) || 0) + 1, at: Date.now(), sig, subjects, topics, questions, vocabulary, vocabularyMaster, exams };
  let raw = JSON.stringify(doc);
  if (raw.length > 24 * 1024 * 1024) {
    doc.vocabularyMaster = (doc.vocabularyMaster || []).map(row => {
      const clean = { ...row };
      delete clean.imageDataUrl;
      delete clean.image;
      return clean;
    });
    raw = JSON.stringify(doc);
  }
  await env.PUB_KV.put('pubContent', raw.slice(0, 24 * 1024 * 1024));
  const meta = { v: doc.v, at: doc.at, sig: doc.sig, counts: countsOf(doc) };
  await env.PUB_KV.put('pubContentMeta', JSON.stringify(meta));
  return { published: true, v: doc.v, counts: meta.counts };
};

const admin = async (request, env, path) => {
  const token = String(request.headers.get('Authorization') || '').replace('Bearer ', '').trim();
  if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) return json({ error: 'forbidden' }, 403);
  if (path === '/api/admin/content' && request.method === 'GET') {
    const raw = await env.PUB_KV.get('pubContent');
    return json(raw ? JSON.parse(raw) : { v: 0, questions: [], vocabulary: [], exams: [] });
  }
  if (path === '/api/admin/publish' && request.method === 'POST') {
    const body = await request.json().catch(() => ({}));
    let full = body.full && typeof body.full === 'object' ? body.full : null;
    if (body.pull) {
      const raw = env.OLD_KV ? await env.OLD_KV.get('userBank') : null;
      const bank = raw ? JSON.parse(raw) : {};
      if (bank.full && typeof bank.full === 'object') full = bank.full;
    }
    if (!full && Array.isArray(body.subjects) && Array.isArray(body.questions)) {
      full = { subjects: body.subjects, topics: body.topics, questions: body.questions, vocabulary: body.vocabulary, vocabularyMaster: body.vocabularyMaster };
    }
    if (full && Array.isArray(full.questions) && full.questions.some(row => row && row.id)) {
      const result = await publishGlobal(env, full);
      return result.error === 'empty' ? json({ error: 'প্রশ্ন খালি' }, 400) : json(result);
    }
    return json({ error: 'প্রশ্ন খালি' }, 400);
  }
  return json({ error: 'not-found' }, 404);
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: JSONH });
    const url = new URL(request.url);
    const path = url.pathname;
    try {
      if (path === '/api/health') return json({ ok: true, accountSystem: 'retired', identity: 'anonymous-device', at: Date.now() });
      if (path === '/api/content/meta' && request.method === 'GET') {
        const raw = await env.PUB_KV.get('pubContentMeta');
        if (raw) return json(JSON.parse(raw));
        const full = await env.PUB_KV.get('pubContent');
        const doc = full ? JSON.parse(full) : { v: 0, at: 0, questions: [] };
        return json({ v: doc.v || 0, at: doc.at || 0, sig: doc.sig || '', counts: countsOf(doc) });
      }
      if (path === '/api/content' && request.method === 'GET') {
        const raw = await env.PUB_KV.get('pubContent');
        return json(paginateContent(raw ? JSON.parse(raw) : { v: 0, at: 0, questions: [], vocabulary: [], exams: [] }, url.searchParams.get('limit'), url.searchParams.get('offset')));
      }
      if (path.startsWith('/api/admin/')) return admin(request, env, path);
      if (path === '/api/ai/status' && request.method === 'GET') {
        const uid = await anonymousAiIdentity(request, env, false);
        return agentStatus(request, env, uid);
      }
      if (path === '/api/ai/chat' && request.method === 'POST') {
        const uid = await anonymousAiIdentity(request, env);
        return await agentChat(request, env, uid);
      }
      if (path === '/api/ai' && request.method === 'POST') {
        const uid = await anonymousAiIdentity(request, env);
        return await agentChat(request, env, uid, { stream: false });
      }
      return json({ error: 'not-found' }, 404);
    } catch (error) {
      return json({ error: String(error?.message || error).slice(0, 180) }, error?.status || 500);
    }
  }
};
