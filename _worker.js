/* ============================================================
   P15 — Pages Advanced-Mode Worker (same-origin API proxy)
   কেন: মালিক-ফোন-রিপোর্ট "Failed to fetch" + Google-লগইন-অসফল —
   ফোনের নেটওয়ার্ক pages.dev-লোড করলেও *.workers.dev-এ পৌঁছায় না
   (আলাদা-হোস্ট; CORS-ও তখন প্রযোজ্য)। সমাধান: /api/* → এই Pages Worker
   → অভ্যন্তরীণভাবে মূল worker-এ। অ্যাপ এখন same-origin-কল করে:
   • কোনো CORS নেই  • workers.dev-রিচেবিলিটি দরকার নেই  • ফেলব্যাক canonical-রাখা।
   নিরাপত্তা: কোনো টোকেন/সিক্রেট নেই; শুধু প্রক্সি + static-পরিসেবা।
   ============================================================ */
const ORIGIN = 'https://admission-gk.admissionhub.workers.dev';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    /* ── API প্রক্সি: same-origin /api/* → মূল worker ── */
    if (url.pathname.startsWith('/api/')) {
      try {
        const target = new URL(ORIGIN + url.pathname + url.search);
        const headers = new Headers(request.headers);
        headers.delete('host');
        headers.set('x-ah-pages-proxy', '1');
        const init = {
          method: request.method,
          headers,
          redirect: 'manual'
        };
        if (request.method !== 'GET' && request.method !== 'HEAD' && request.body) {
          init.body = request.body;
        }
        const res = await fetch(target, init);
        /* মূল worker-এর CORS-হেডার (ACAO:*) অক্ষত রাখা — ভিন্ন-অরিজিন-ফলব্যাকেও কাজ করবে */
        return new Response(res.body, res);
      } catch (e) {
        return new Response(JSON.stringify({ error: 'api-unavailable', at: Date.now() }), {
          status: 502,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    /* ── বাকি সব: static asset (Pages-এর ASSETS) ── */
    try {
      const asset = await env.ASSETS.fetch(request);
      return asset;
    } catch (e) {
      return new Response('Not found', { status: 404 });
    }
  }
};
