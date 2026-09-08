/* Cloudflare Pages advanced-mode worker.
   Same-origin /api/* requests are proxied to the production Workers; all other
   requests are served from Pages assets. No client or service credential is
   stored here. */
const ORIGIN = 'https://admission-gk.admissionhub.workers.dev';
const VOICE_ORIGIN = 'https://admission-voice.admissionhub.workers.dev';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      try {
        const base = url.pathname.startsWith('/api/voice') ? VOICE_ORIGIN : ORIGIN;
        const target = new URL(base + url.pathname + url.search);
        const headers = new Headers(request.headers);
        headers.delete('host');
        headers.set('x-ah-pages-proxy', '1');
        const init = { method: request.method, headers, redirect: 'manual' };
        if (request.method !== 'GET' && request.method !== 'HEAD' && request.body) init.body = request.body;
        const response = await fetch(target, init);
        return new Response(response.body, response);
      } catch (_) {
        return new Response(JSON.stringify({ error: 'api-unavailable', at: Date.now() }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    try {
      return await env.ASSETS.fetch(request);
    } catch (_) {
      return new Response('Not found', { status: 404 });
    }
  }
};
