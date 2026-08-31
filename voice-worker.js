/**
 * 🎙️ ADMISSION HUB — Secure ElevenLabs Voice Proxy (Cloudflare Worker)
 * v104 · generate-once → level-2 server cache → audio to browser
 *
 * ── Deploy (5 মিনিট) ─────────────────────────────────────────────
 * 1. Cloudflare Dashboard → Workers & Pages → Create Worker → নাম দাও (যেমন admission-voice) → Deploy
 * 2. Edit code → এই পুরো ফাইল পেস্ট → Deploy
 * 3. Worker → Settings → Variables & Secrets:
 *      • Add Secret:  ELEVENLABS_API_KEY = <তোমার ElevenLabs API key>
 *        (key শুধু এখানে থাকবে — অ্যাপ/frontend/localStorage/IndexedDB-তে কখনো নয়)
 * 4. (Optional, level-2 persistent cache) Storage & Databases → KV → Create namespace
 *      → Worker → Settings → Bindings → KV namespace: variable name  VOICE_KV
 * 5. অ্যাপে: Vocabulary → ⚙ Category settings → Vocabulary Voices →
 *      endpoint-এ এই worker-এর URL পেস্ট (যেমন https://admission-voice.<subdomain>.workers.dev)
 *
 * Security: এই worker ছাড়া কেউ ElevenLabs key দেখবে না। Origin allowlist +
 * app-header + per-IP rate limit — যেন অচেনা কেউ তোমার quota পোড়াতে না পারে।
 */

const DEFAULT_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'; // Sarah — clear American, free-plan API-allowed
const DEFAULT_MODEL_ID = 'eleven_flash_v2_5';    // low-latency + cost-efficient
const DEFAULT_FORMAT = 'mp3_22050_32';           // ছোট ফাইল — দ্রুত লোড

const RATE_LIMIT = 60;        // requests / minute / IP
const RATE_WINDOW_MS = 60000;

const rateBuckets = new Map(); // per-isolate best effort (KV ছাড়াই মোটামুটি শক্ত রশ্মি)

const corsHeaders = request => {
  const origin = request.headers.get('Origin') || '';
  const ok = /^https:\/\/([a-z0-9-]+\.)?github\.io$/.test(origin)
    || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  const headers = {
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-AH-App',
    'Access-Control-Max-Age': '86400'
  };
  if (ok) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
};

const json = (request, obj, status = 200) => new Response(JSON.stringify(obj), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...corsHeaders(request) }
});

const audio = (request, buffer, cacheState) => new Response(buffer, {
  status: 200,
  headers: {
    'Content-Type': 'audio/mpeg',
    'Cache-Control': 'public, max-age=604800',
    'X-Voice-Cache': cacheState,
    ...corsHeaders(request)
  }
});

const rateLimited = request => {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const now = Date.now();
  const hits = (rateBuckets.get(ip) || []).filter(ts => now - ts < RATE_WINDOW_MS);
  hits.push(now);
  rateBuckets.set(ip, hits);
  if (rateBuckets.size > 5000) rateBuckets.clear(); // memory guard
  return hits.length > RATE_LIMIT;
};

const clean = (value, re) => (typeof value === 'string' && re.test(value) ? value : null);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(request) });

    if (url.pathname === '/health') {
      return json(request, { ok: true, configured: !!env.ELEVENLABS_API_KEY, kv: !!env.VOICE_KV });
    }

    if (request.method !== 'POST' || url.pathname !== '/api/voice') {
      return json(request, { error: 'not_found' }, 404);
    }

    if (!env.ELEVENLABS_API_KEY) {
      return json(request, { error: 'worker not configured — set ELEVENLABS_API_KEY secret' }, 503);
    }
    if (request.headers.get('X-AH-App') !== 'admission-hub') {
      return json(request, { error: 'forbidden' }, 403);
    }
    if (rateLimited(request)) {
      return json(request, { error: 'rate_limited' }, 429);
    }

    let body;
    try { body = await request.json(); } catch (_) { return json(request, { error: 'bad_json' }, 400); }

    const word = String(body?.word || '').trim();
    if (!word || word.length > 60 || !/^[\p{L}][\p{L}'’.\- ]{0,59}$/u.test(word)) {
      return json(request, { error: 'invalid_word' }, 400);
    }

    // Central config থেকে এলেও worker নিজের whitelist-বিহীন কিছু গ্রহণ করে না
    const voiceId = clean(body.voiceId, /^[a-zA-Z0-9]{10,40}$/) || DEFAULT_VOICE_ID;
    const modelId = clean(body.modelId, /^[a-z0-9_]{3,40}$/) || DEFAULT_MODEL_ID;
    const format = clean(body.output_format, /^mp3_[0-9_]+$/) || DEFAULT_FORMAT;

    const norm = word.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const cacheKey = `v1:${voiceId}:${modelId}:${norm}`;

    // Level-2 cache: server-side — browser storage মুছে গেলেও ElevenLabs কল লাগবে না
    if (env.VOICE_KV) {
      try {
        const hit = await env.VOICE_KV.get(cacheKey, { type: 'arrayBuffer' });
        if (hit && hit.byteLength > 0) return audio(request, hit, 'hit');
      } catch (_) { /* KV না পাওয়া গেলে সরাসরি generate */ }
    }

    let resp;
    try {
      resp = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=${format}`, {
        method: 'POST',
        headers: {
          'xi-api-key': env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          'Accept': 'audio/mpeg'
        },
        body: JSON.stringify({
          text: word, // শুধু word — meaning/explanation কখনো audio-তে যায় না
          model_id: modelId,
          voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0, use_speaker_boost: true, speed: 1.0 }
        })
      });
    } catch (_) {
      return json(request, { error: 'upstream_unreachable' }, 502);
    }

    if (!resp.ok) {
      let msg = `elevenlabs_error_${resp.status}`;
      try {
        const detail = await resp.json();
        if (detail?.detail?.message) msg = String(detail.detail.message).slice(0, 160);
      } catch (_) { /* non-json error body */ }
      const status = resp.status === 401 || resp.status === 403 ? 503 : resp.status === 429 ? 429 : 502;
      return json(request, { error: msg }, status);
    }

    const buffer = await resp.arrayBuffer();
    if (!buffer.byteLength) return json(request, { error: 'empty_audio' }, 502);

    if (env.VOICE_KV) {
      try { await env.VOICE_KV.put(cacheKey, buffer, { expirationTtl: 60 * 60 * 24 * 30 }); } catch (_) {}
    }
    return audio(request, buffer, 'miss');
  }
};
