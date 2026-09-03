const CACHE_PREFIX = 'admission-hub-shell-';
const BUILD_ID = 'v171-authapi-fix-20260903';
const CACHE_NAME = `${CACHE_PREFIX}${BUILD_ID}`;
const VERSION_HEADER = 'X-Admission-Hub-Build';
const isCurrentBuild = response => response && response.headers && response.headers.get(VERSION_HEADER) === BUILD_ID;
function markBuild(response) {
  if (!response || !response.ok) return response;
  const headers = new Headers(response.headers);
  headers.set(VERSION_HEADER, BUILD_ID);
  return response.clone().blob().then(blob => new Response(blob, {status: response.status, statusText: response.statusText, headers}));
}
const APP_SHELL = [
  './data-protection.js?v=dp-v1',
  './qbank-redesign.js?v=practice15',
  './urgent-fix.js?v=practice13',
  './phase12-ui.js?v=nav-resume-router-v7',
  './phase23-ui.js?v=swipe-fix-0f10a28-safe-capture',
  './upgrade-features.js?v=4',
  './phase3-intelligence.js?v=command-tools-v15-greet3d',
  './phase1-upgrade.js?v=3-dynamic-command-pages-safe-capture',
  './web-search-fix.js?v=1',
  './study-tools-restore.js?v=3',
  './urgent-topic-fix.js?v=practice10',
  './phase2-dictionary-parser.js?v=5',
  './phase3-question-bank-route.js?v=practice10',
  './routine90.js?v=design-mint-card-v2',
  './routine90-parser.js?v=1',
  './admission-hub-feature-suite.js?v=clear-topic-questions-v12',
  './ai-mentor-integration.js?v=gemini-v2-0816',
  './mistake-analysis.js?v=gemini-v4-0816',
  './question-bank-performance.js?v=11-aiex',
  './hierarchy-and-exam-fix.js?v=19-clear-topic-questions',
  './global-app-fix.js?v=3',
  './exam-dropdowns.js?v=1',
  './mobile-ux-fix.js?v=1',
  './notes-tool.js?v=dashboard-notes-v9-compact-pages',
  './manual-gemini-helper.js?v=gemini-v11-4-manual-note-0816',
  './nav-resume-fix.js?v=1',
  './mistake-note-icon.js?v=16-aiex',
  './experience-studio-store.js?v=2',
  './experience-studio-themes.js?v=2',
  './experience-studio-animations.js?v=2',
  './experience-studio-cards.js?v=2',
  './experience-studio-hooks.js?v=1',
  './experience-studio-shell.js?v=6',
  './performance-hardening.js?v=1',
  './one-time-mock-seed.js?v=20260824-native',
  './one-time-mock-tool.js?v=20260824-native',
  './vocabulary-master-tool.js?v=vm-autoimg-v106',
  './notification-hub.js?v=notify-v110',
  './gk-agent-tool.js?v=gk-v115',
  './study-ai-tool.js?v=studyai-v132',
  './ai-explain-tool.js?v=aiex-v3',
  './bug-agent-tool.js?v=bugagent-v112',
  './vocabulary-pronunciation.js?v=voice-el-v104',
  './vocabulary-elevenlabs.js?v=el-voice-v105',
  './memorizing-match-tool.js?v=memorizing-match-v8-stable-cards',
  './question-card-game-visual.js?v=question-card-game-v2-persistent',
  './result-analysis-500.js?v=result-analysis-500-deep-matched-v2',
  './mock-result-experience.js?v=result-insights-200-single-card-v5',
  './result-ai-analysis.js?v=result-ai-live-tool-v10-real-request',
  './mistake-notebook-tool.js?v=nb-v1',
  './weekly-report-tool.js?v=wr-v2-real-payload',
  './dashboard-greeting-3d.js?v=greet3d-v110',
  './daily-streak-card.js?v=streak-under-greet-v110',
  './result-interaction-polish.js?v=result-interaction-polish-v1',
  './today-command-center-live.js?v=today-command-center-live-v5-card',
  './settings-command-cleanup.js?v=settings-command-cleanup-v2',
  './navigation-tools-pronunciation.js?v=navigation-tools-pronunciation-v5-home-escape',
  './progress-tool.js?v=progress-v6-live-score-ledger-reconcile',
  './mistakes-bank-tool.js?v=mistakes-bank-v1',
  './smart-revision-tool.js?v=smart-revision-v2-safe-session',
  './source-course-tool.js?v=bangla-only-courses-v23-freshfetch',
  './cloud-content-sync.js?v=p2-cloud-v2',
  './auth-svg.js?v=p3-auth-prof-v171',
  './premium-auth.js?v=p3-auth-prof-v171',
  './android-runtime-fix.js?v=and-scroll-v1',
  '',
  './premium-auth.css?v=p3-auth-prof-v171',
  './auth-svg.js?v=p3-auth-prof-v171',
  './premium-auth.js?v=p3-auth-prof-v171',
  './onboarding.js?v=p6-onboard-v1',
  './onboarding.css?v=p6-onboard-v1',
  './app-seed.js?v=p1',
  './',
  './index.html',
  './manifest.json',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

const isDocumentRequest = request => request.mode === 'navigate' || request.destination === 'document';

async function cacheNetworkResponse(request, response) {
  if (!response || !response.ok) return response;
  try {
    const cache = await caches.open(CACHE_NAME);
    const versioned = await markBuild(response);
    await cache.put(request, versioned.clone());
  } catch (_) {
    // Cache failures must never block the fresh network response.
  }
  return response;
}

async function offlineFallback(request) {
  const cached = await caches.match(request);
  if (cached && isCurrentBuild(cached)) return cached;

  if (isDocumentRequest(request)) {
    const shell = await caches.match('./index.html');
    if (shell && isCurrentBuild(shell)) return shell;
    const shellUrl = new URL('./index.html', self.location.href).href;
    const fallback = await caches.match(shellUrl);
    return fallback || Response.error();
  }

  return Response.error();
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(APP_SHELL.map(async asset => {
      try {
        const url = new URL(asset, self.location.href).href;
        const request = new Request(url, {cache: 'reload'});
        const response = await fetch(request, {cache: 'no-store'});
        if (response.ok) await cacheNetworkResponse(request, response);
      } catch (_) {
        // The worker can still activate if an optional shell asset is unavailable.
      }
    }));

    // Activate this worker immediately; do not wait for old tabs to close.
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(key => key !== CACHE_NAME)
        .map(key => caches.delete(key))
    );

    // Take control of existing PWA clients without requiring another launch.
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    event.waitUntil(self.skipWaiting());
    return;
  }
  if (event.data && event.data.type === 'VERSION_CHECK') {
    event.ports?.[0]?.postMessage({type:'VERSION_CHECK_RESULT', buildId:BUILD_ID, cacheName:CACHE_NAME});
  }
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const requestUrl = new URL(request.url);
  if (requestUrl.origin !== self.location.origin) return;

  event.respondWith((async () => {
    const staticAsset = request.destination === 'script' || request.destination === 'style' || request.destination === 'image' || request.destination === 'font' || /\.(?:js|css|json|png|jpg|jpeg|webp|svg|ico|woff2?)(?:$|\?)/i.test(requestUrl.pathname + requestUrl.search);
    if (staticAsset) {
      const cached = await caches.match(request);
      if (cached && isCurrentBuild(cached)) return cached;
      try {
        return await cacheNetworkResponse(request, await fetch(request));
      } catch (_) {
        return offlineFallback(request);
      }
    }
    try {
      // Documents remain network-first so an online launch can pick up a new shell.
      const response = await fetch(request, {cache: 'no-store'});
      const contentType = response.headers.get('content-type') || '';
      if (isDocumentRequest(request) && !contentType.includes('text/html')) return offlineFallback(request);
      return cacheNetworkResponse(request, response);
    } catch (_) {
      return offlineFallback(request);
    }
  })());
});

// v107 — Web Push display + notification click routing
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data.json(); } catch (_) {}
  event.waitUntil(self.registration.showNotification(String(data.title || 'Admission Hub 🔔'), {
    body: String(data.body || ''), tag: String(data.tag || 'admission-hub'), renotify: true, data: { url: data.url || './' }
  }));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || './';
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const client of list) { if ('focus' in client) { try { client.navigate(url); } catch (_) {} return client.focus(); } }
    return self.clients.openWindow(url);
  }));
});
