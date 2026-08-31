/* Phase 2/3 — global content cloud bridge.
   Fast batched IDB (Android-safe). Never clear-before-write.
   control → POST /api/cloud/publish ; public ← GET /pub/content */
(() => {
  'use strict';
  const WORKER = 'https://admission-gk.rashelzayan213.workers.dev';
  const ROLE = String(window.AH_CLOUD_ROLE || '').trim() || 'public';
  const GLOBAL_STORES = ['subjects', 'topics', 'questions', 'vocabulary', 'vocabularyMaster'];
  const META_KEY = 'ahCloudApplied';
  const APP_HEADER = { 'X-AH-App': 'admission-hub', 'Content-Type': 'application/json' };

  const bootReady = async () => {
    if (window.__admissionBootPromise) {
      try { await window.__admissionBootPromise; } catch (_) {}
    }
    return typeof dbGetAll === 'function' && typeof dbPut === 'function';
  };

  const stripHeavy = rec => {
    if (!rec || typeof rec !== 'object') return rec;
    const o = Object.assign({}, rec);
    ['imageDataUrl', 'image', 'thumbnail'].forEach(k => {
      if (typeof o[k] === 'string' && o[k].startsWith('data:') && o[k].length > 900000) delete o[k];
    });
    return o;
  };

  const nativeQuestion = q => q && q.id && (q.question || q.q) && (Array.isArray(q.options) || Array.isArray(q.o));

  const putManyFast = async (store, items) => {
    const rows = Array.isArray(items) ? items.filter(x => x && x.id) : [];
    if (!rows.length) return true;
    const db = (typeof DB !== 'undefined' && DB) ? DB : null;
    const chunkSize = 400;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      if (db && db.objectStoreNames.contains(store)) {
        await new Promise((resolve, reject) => {
          let settled = false;
          try {
            const tx = db.transaction(store, 'readwrite');
            const os = tx.objectStore(store);
            for (let n = 0; n < chunk.length; n++) os.put(chunk[n]);
            tx.oncomplete = () => { settled = true; resolve(true); };
            tx.onabort = () => { if (!settled) { settled = true; reject(tx.error || new Error('abort')); } };
            tx.onerror = () => { if (!settled) { settled = true; reject(tx.error); } };
          } catch (err) { reject(err); }
        });
      } else {
        for (let n = 0; n < chunk.length; n++) await dbPut(store, chunk[n]);
      }
      await new Promise(r => setTimeout(r, 0));
    }
    return true;
  };

  if (typeof window.dbPutMany === 'function' && !window.__ahFastPutMany) {
    window.__ahFastPutMany = true;
    const orig = window.dbPutMany;
    window.dbPutMany = async function (store, arr) {
      try { return await putManyFast(store, arr); } catch (_) { return orig.apply(this, arguments); }
    };
  }

  const collect = async () => {
    const out = {};
    for (const st of GLOBAL_STORES) {
      const rows = await dbGetAll(st).catch(() => []);
      out[st] = (Array.isArray(rows) ? rows : []).filter(x => x && x.id).map(stripHeavy);
    }
    return out;
  };

  const fingerprint = data => {
    const q = data.questions || [];
    const vm = data.vocabularyMaster || [];
    const imgs = vm.filter(x => x && (x.imageDataUrl || x.image)).length;
    return [
      (data.subjects || []).length,
      (data.topics || []).length,
      q.length,
      (data.vocabulary || []).length,
      vm.length,
      imgs,
      q.reduce((n, x) => n + String(x.question || x.q || '').length, 0)
    ].join(':');
  };

  let publishTimer = 0;
  let publishing = false;
  const publish = async () => {
    if (ROLE !== 'control' || publishing) return;
    if (!(await bootReady())) return;
    const full = await collect();
    if (!(full.questions || []).length && !(full.vocabularyMaster || []).length && !(full.vocabulary || []).length) return;
    const fp = fingerprint(full);
    try { if (sessionStorage.getItem('ahCloudFp') === fp) return; } catch (_) {}
    publishing = true;
    try {
      const res = await fetch(WORKER + '/api/cloud/publish', { method: 'POST', headers: APP_HEADER, body: JSON.stringify(full) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || ('http-' + res.status));
      try { sessionStorage.setItem('ahCloudFp', fp); localStorage.setItem('ahCloudLastPublishAt', String(Date.now())); } catch (_) {}
      window.__ahCloudLastPublish = data;
    } catch (e) {
      window.__ahCloudPublishErr = String(e && e.message || e).slice(0, 120);
    } finally {
      publishing = false;
    }
  };

  const schedulePublish = () => {
    if (ROLE !== 'control') return;
    clearTimeout(publishTimer);
    publishTimer = setTimeout(() => { publish().catch(() => {}); }, 4000);
  };

  const hookWrites = () => {
    if (ROLE !== 'control' || window.__ahCloudWriteHook) return;
    window.__ahCloudWriteHook = true;
    const stores = new Set(GLOBAL_STORES);
    ['dbPut', 'dbPutMany', 'dbDel', 'dbDelRaw', 'dbClear'].forEach(name => {
      const orig = window[name];
      if (typeof orig !== 'function') return;
      window[name] = function ahCloudWrapped() {
        const store = arguments[0];
        const ret = orig.apply(this, arguments);
        if (stores.has(store)) schedulePublish();
        return ret;
      };
    });
  };

  const appliedMeta = () => {
    try { return JSON.parse(localStorage.getItem(META_KEY) || 'null') || { v: 0 }; } catch (_) { return { v: 0 }; }
  };
  const saveApplied = meta => {
    try { localStorage.setItem(META_KEY, JSON.stringify(meta)); } catch (_) {}
  };

  const applyDoc = async doc => {
    if (!doc) return false;
    const subjects = Array.isArray(doc.subjects) ? doc.subjects : [];
    const topics = Array.isArray(doc.topics) ? doc.topics : [];
    const questions = Array.isArray(doc.questions) ? doc.questions : [];
    const vocabulary = Array.isArray(doc.vocabulary) ? doc.vocabulary : [];
    const vocabularyMaster = Array.isArray(doc.vocabularyMaster) ? doc.vocabularyMaster : [];
    if (!questions.length || !nativeQuestion(questions[0])) return false;
    if (!subjects.length || !topics.length) return false;
    await putManyFast('subjects', subjects);
    await putManyFast('topics', topics);
    await putManyFast('questions', questions);
    if (vocabulary.length) await putManyFast('vocabulary', vocabulary.filter(x => x && x.id));
    if (vocabularyMaster.length) await putManyFast('vocabularyMaster', vocabularyMaster.filter(x => x && x.id));
    if (typeof loadCache === 'function') await loadCache();
    if (typeof render === 'function') render();
    return true;
  };

  const applySeedIfEmpty = async () => {
    if (!window.AH_SEED || typeof dbGetAll !== 'function') return false;
    const qs = await dbGetAll('questions').catch(() => []);
    if ((qs || []).length) return false;
    const seed = window.AH_SEED;
    const ok = await applyDoc({
      subjects: seed.subjects || [],
      topics: seed.topics || [],
      questions: seed.questions || [],
      vocabulary: seed.vocabulary || [],
      vocabularyMaster: seed.vocabularyMaster || []
    });
    return ok;
  };

  const authHeaders = () => {
    const h = {};
    try { const t = localStorage.getItem('ahPubToken'); if (t) h.Authorization = 'Bearer ' + t; } catch (_) {}
    return h;
  };
  const pull = async () => {
    if (ROLE !== 'public') return;
    if (window.AHAuth && typeof window.AHAuth.isAuthed === 'function' && !window.AHAuth.isAuthed()) return;
    if (!(await bootReady())) return;
    const localQs = await dbGetAll('questions').catch(() => []);
    if (!(localQs || []).length) await applySeedIfEmpty();
    let meta = null;
    try { meta = await fetch(WORKER + '/pub/content/meta', { headers: authHeaders() }).then(r => r.ok ? r.json() : null); } catch (_) { meta = null; }
    const local = appliedMeta();
    if (meta && Number(meta.v || 0) > 0 && Number(meta.v) === Number(local.v) && meta.sig && meta.sig === local.sig) return;
    let doc = null;
    try { doc = await fetch(WORKER + '/pub/content', { headers: authHeaders() }).then(r => r.ok ? r.json() : null); } catch (_) { doc = null; }
    if (!doc || Number(doc.v || 0) <= 0) return;
    if (Number(doc.v) === Number(local.v) && doc.sig && doc.sig === local.sig) return;
    const ok = await applyDoc(doc);
    if (ok) saveApplied({ v: doc.v, at: doc.at, sig: doc.sig || (meta && meta.sig) || '', pulledAt: Date.now() });
    else if (!(await dbGetAll('questions').catch(() => []) || []).length) await applySeedIfEmpty();
    window.__ahCloudLastPull = { ok, v: doc && doc.v, at: doc && doc.at };
  };

  const start = async () => {
    if (!(await bootReady())) return;
    if (ROLE === 'control') {
      hookWrites();
      await publish();
      setInterval(() => { publish().catch(() => {}); }, 45000);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') schedulePublish();
      });
      return;
    }
    await pull();
    setInterval(() => { pull().catch(() => {}); }, 60000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') pull().catch(() => {});
    });
  };

  window.AdmissionCloudContent = { publish, pull, role: ROLE, putManyFast };
  const kick = () => { start().catch(() => {}); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(kick, 50));
  else setTimeout(kick, 50);
})();
