// public-worker.js
var JSONH = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization,content-type,x-ah-guest,x-ah-app,x-ah-device", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Max-Age": "86400" };
var json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: JSONH });
var GEM_CHAIN = ["gemini-3-flash-preview", "gemini-3.1-flash-lite"];
var SYS = (ai) => `তুমি "স্টাডি বন্ধু" — Admission Hub-এর প্রাণ জুড়ানো AI সহপাঠী, বাংলাদেশি ভর্তি-প্রস্তুতির বন্ধু। আজকের তারিখ (ঢাকা): ${(new Date()).toLocaleDateString("bn-BD", { timeZone: "Asia/Dhaka" })}।
ভাষা ও সুর: সবসময় মাখনের মতো সহজ, মনমুগ্ধকর বাংলা; বন্ধুর মতো মানুষের ভাষা — রোবটিক ভাব কখনো নয়; ২-৬ লাইনে উত্তর; প্রয়োজনে হালকা emoji বা ছোট তালিকা।
সততা — সর্বোচ্চ নিয়ম: নিচের [লাইভ-মেমোরি] একমাত্র তথ্যের উৎস। ইউজারের কোনো স্কোর/প্রগ্রেস/ইতিহাস/ভুল সেখানে না থাকলে স্পষ্ট বলো "এখনো যথেষ্ট ডেটা নেই" — কখনোই (ভুলেও) কোনো সংখ্যা, ফলাফল বা তথ্য বানাবে না। প্রশ্ন/শব্দ সম্পর্কে শুধু [লাইভ-মেমোরি]-তে যা আছে তা-ই বলো; না থাকলে স্বীকার করো।
অভিজ্ঞতা: প্রতিবার উত্তর নতুনভাবে সাজাও — একই বাক্য/গঠন হুবহু পুনরাবৃত্তি নয়; [লাইভ-মেমোরি]-তে ইউজারের নাম থাকলে সেই নামে ডাকো, না থাকলে "শিক্ষার্থী" বলে ডাকো — কখনোই কোনো নাম অনুমান কোরো না; আগের কথাগুলো মনে রেখে এগিয়ে দাও।
অ্যাপ-জ্ঞান: Admission Hub-এর মালিক জনাব Rashel Zayan Sir; উদ্দেশ্য শিক্ষার্থীর ভর্তি প্রস্তুতি। অ্যাপ নিয়ে প্রশ্ন এলে বিষয়বস্তু (প্রশ্ন ব্যাংক, মক পরীক্ষা, ভুল-বিশ্লেষণ, শব্দভান্ডার, ৯০-দিনের রুটিন) সহজভাবে বলো।
আপডেট তথ্য: ভর্তি/পরীক্ষা-সংক্রান্ত সাম্প্রতিক তথ্য নিশ্চিত না জানলে সৎভাবে "অফিসিয়াল নোটিশ দেখো" বলো — ধারণা দিয়ে মিথ্যা বলবে না।${ai ? "\n[লাইভ-মেমোরি] ব্যবহার করো, raw ডাম্প নয়।" : ""}`;
var bn = (n) => String(n).replace(/\d/g, (d) => "\u09E6\u09E7\u09E8\u09E9\u09EA\u09EB\u09EC\u09ED\u09EE\u09EF"[d]);
var stripHeavyRow = (x) => {
  if (!x || typeof x !== "object") return x;
  const o = Object.assign({}, x);
  ["imageDataUrl", "image", "thumbnail"].forEach((k) => {
    if (typeof o[k] === "string" && o[k].startsWith("data:") && o[k].length > 9e5) delete o[k];
  });
  return o;
};
var onlyRows = (arr) => (Array.isArray(arr) ? arr : []).filter((x) => x && x.id).map(stripHeavyRow);
var fingerprintGlobal = (doc) => {
  const q = doc.questions || [];
  return [
    (doc.subjects || []).length,
    (doc.topics || []).length,
    q.length,
    (doc.vocabulary || []).length,
    (doc.vocabularyMaster || []).length,
    q.reduce((n, x) => n + String(x.question || x.q || "").length, 0)
  ].join(":");
};
var countsOf = (doc) => ({
  subjects: (doc.subjects || []).length,
  topics: (doc.topics || []).length,
  questions: (doc.questions || []).length,
  vocabulary: (doc.vocabulary || []).length,
  vocabularyMaster: (doc.vocabularyMaster || []).length
});
var PERSONAL_KEYS = ["examResults", "mistakes", "settings", "dailyStats", "activityLogs", "notes", "vocabulary", "v", "at"];
function sanitizeState(b) {
  const out = { v: 1, at: Date.now() };
  if (!b || typeof b !== "object") return out;
  for (const k of PERSONAL_KEYS) {
    if (k === "v" || k === "at") continue;
    if (Array.isArray(b[k])) out[k] = b[k];
    else if (k === "settings" && b[k] && typeof b[k] === "object") out[k] = Array.isArray(b[k]) ? b[k] : [b[k]];
  }
  out.v = Number(b.v) || 1;
  out.at = Number(b.at) || Date.now();
  return out;
}
var b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
var unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
async function hashPassword(password, saltB64) {
  const enc = new TextEncoder();
  const salt = saltB64 ? unb64(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", enc.encode(String(password)), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 1e5 }, key, 256);
  return { hash: b64(bits), salt: b64(salt) };
}
function publicUser(u, profile) {
  if (!u) return null;
  const st = u.status || (u.blocked ? "disabled" : "active");
  const email = u.email || (String(u.id || "").startsWith("em:") ? String(u.id).slice(3) : "");
  const mobile = u.mobile || (String(u.id || "").startsWith("ph:") ? String(u.contact || u.id).replace(/^ph:/, "") : "");
  const pf = profile || u.profile || {};
  return {
    id: u.id,
    uid: u.uid || u.id,
    name: u.name,
    displayName: pf.displayName || u.name,
    email,
    mobile,
    contact: u.contact || email || mobile,
    verified: !!u.verified,
    emailVerified: !!u.emailVerified,
    mobileVerified: !!u.mobileVerified,
    status: st,
    created: u.created,
    lastSeen: u.lastSeen,
    photo: pf.photo || "",
    institution: pf.institution || "",
    targetUniversity: pf.targetUniversity || "",
    targetUnit: pf.targetUnit || "",
    admissionYear: pf.admissionYear || "",
    bio: pf.bio || "",
    dob: pf.dob || "",
    gender: pf.gender || "",
    studyGroup: pf.studyGroup || "",
    providers: u.providers || [],
    onboardingCompleted: !!(pf.onboarding && pf.onboarding.completed),
    onboardingStep: pf.onboarding && pf.onboarding.step || 0,
    goal: pf.onboarding && pf.onboarding.goal || "",
    studyGoal: pf.onboarding && pf.onboarding.studyGoal || "",
    currentLevel: pf.onboarding && pf.onboarding.currentLevel || 0
  };
}
async function issueToken(env, rec) {
  const token = crypto.randomUUID().replace(/-/g, "");
  await env.PUB_KV.put("tok:" + token, JSON.stringify({ id: rec.id, at: Date.now() }), { expirationTtl: 31536e3 });
  rec.lastSeen = Date.now();
  await env.PUB_KV.put("user:" + rec.id, JSON.stringify(rec));
  return { token, user: publicUser(rec) };
}
function uaInfo(ua) {
  ua = String(ua || "");
  let device = "Browser";
  if (/iPhone/i.test(ua)) device = "iPhone";
  else if (/iPad/i.test(ua)) device = "iPad";
  else if (/Android/i.test(ua)) device = "Android";
  else if (/Windows/i.test(ua)) device = "Windows";
  else if (/Macintosh|Mac OS/i.test(ua)) device = "Mac";
  else if (/Linux/i.test(ua)) device = "Linux";
  let browser = "Browser";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/OPR\//i.test(ua) || /Opera/i.test(ua)) browser = "Opera";
  else if (/Chrome\//i.test(ua)) browser = "Chrome";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/Safari\//i.test(ua)) browser = "Safari";
  return { device, browser, mobile: /Mobi/i.test(ua) };
}
async function trackSession(env, uid, token, ua) {
  try {
    const info = uaInfo(ua);
    const key = "sess:" + uid;
    let list = JSON.parse(await env.PUB_KV.get(key) || "{}");
    if (!list || typeof list !== "object") list = {};
    const prev = list[token] || {};
    list[token] = {
      at: prev.at || Date.now(),
      lastSeen: Date.now(),
      device: info.device,
      browser: info.browser,
      mobile: info.mobile,
      ua: String(ua).slice(0, 140)
    };
    await env.PUB_KV.put(key, JSON.stringify(list), { expirationTtl: 31536e3 });
  } catch (_) {
  }
}
async function clearSession(env, uid, token) {
  const key = "sess:" + uid;
  const list = JSON.parse(await env.PUB_KV.get(key) || "{}");
  if (list && list[token]) {
    delete list[token];
    await env.PUB_KV.put(key, JSON.stringify(list), { expirationTtl: 31536e3 });
  }
  await env.PUB_KV.delete("tok:" + token);
}
async function listSessions(env, uid, currentToken) {
  const list = JSON.parse(await env.PUB_KV.get("sess:" + uid) || "{}");
  const out = [];
  for (const token of Object.keys(list || {})) {
    const s = list[token];
    const live = !!await env.PUB_KV.get("tok:" + token);
    out.push({
      id: token.slice(0, 8),
      device: s.device || "Browser",
      browser: s.browser || "",
      mobile: !!s.mobile,
      firstSeen: s.at || 0,
      lastSeen: s.lastSeen || 0,
      current: token === currentToken,
      live
    });
  }
  out.sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));
  return out;
}
async function logAct(env, uid, type, detail) {
  try {
    const key = "act:" + uid;
    let arr = JSON.parse(await env.PUB_KV.get(key) || "[]");
    if (!Array.isArray(arr)) arr = [];
    arr.unshift({ type: String(type || "event"), detail: String(detail || "").slice(0, 160), at: Date.now() });
    if (arr.length > 40) arr = arr.slice(0, 40);
    await env.PUB_KV.put(key, JSON.stringify(arr), { expirationTtl: 31536e3 });
  } catch (_) {
  }
}
async function rateLimit(env, key, max, ttl) {
  const k = "rl:" + key;
  const now = Date.now();
  let row = null;
  try {
    row = JSON.parse(await env.PUB_KV.get(k));
  } catch (_) {
  }
  if (!row || typeof row !== "object" || !row.exp || row.exp < now) row = { n: 0, exp: now + ttl * 1e3 };
  row.n = Number(row.n || 0) + 1;
  const remain = Math.max(10, Math.ceil((row.exp - now) / 1e3));
  await env.PUB_KV.put(k, JSON.stringify(row), { expirationTtl: remain });
  return row.n <= max;
}
var publishGlobal = async (env, full) => {
  if (!env || !env.PUB_KV) return { error: "no-pub-kv" };
  const src = full && typeof full === "object" ? full : {};
  const subjects = onlyRows(src.subjects);
  const topics = onlyRows(src.topics);
  const questions = onlyRows(src.questions);
  const vocabulary = onlyRows(src.vocabulary);
  const vocabularyMaster = onlyRows(src.vocabularyMaster);
  if (!questions.length && !vocabularyMaster.length) return { error: "empty" };
  const sig = fingerprintGlobal({ subjects, topics, questions, vocabulary, vocabularyMaster });
  let prevMeta = { v: 0 };
  try {
    prevMeta = JSON.parse(await env.PUB_KV.get("pubContentMeta") || '{"v":0}');
  } catch (_) {
  }
  if (prevMeta.sig === sig && prevMeta.v) {
    return { published: false, unchanged: true, v: prevMeta.v, counts: prevMeta.counts || countsOf({ subjects, topics, questions, vocabulary, vocabularyMaster }) };
  }
  let exams = [{ id: "mock1", title: "\u09AE\u0995 \u09AA\u09B0\u09C0\u0995\u09CD\u09B7\u09BE \u09E7", mins: 15, n: Math.min(15, questions.length || 1), published: true, desc: "\u09B8\u09AC \u09AC\u09BF\u09B7\u09AF\u09BC \u09AE\u09BF\u09B6\u09BF\u09AF\u09BC\u09C7" }];
  try {
    const prev = JSON.parse(await env.PUB_KV.get("pubContent") || "{}");
    if (Array.isArray(prev.exams) && prev.exams.length) exams = prev.exams;
  } catch (_) {
  }
  const doc = { v: (Number(prevMeta.v) || 0) + 1, at: Date.now(), sig, subjects, topics, questions, vocabulary, vocabularyMaster, exams };
  let raw = JSON.stringify(doc);
  if (raw.length > 24 * 1024 * 1024) {
    doc.vocabularyMaster = (doc.vocabularyMaster || []).map((x) => {
      const o = Object.assign({}, x);
      delete o.imageDataUrl;
      delete o.image;
      return o;
    });
    raw = JSON.stringify(doc);
  }
  await env.PUB_KV.put("pubContent", raw.slice(0, 24 * 1024 * 1024));
  const meta = { v: doc.v, at: doc.at, sig: doc.sig, counts: countsOf(doc) };
  await env.PUB_KV.put("pubContentMeta", JSON.stringify(meta));
  return { published: true, v: doc.v, counts: meta.counts };
};
var public_worker_default = {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: JSONH });
    const url = new URL(request.url), p = url.pathname;
    try {
      if (p === "/api/health") return json({ ok: true, at: Date.now() });
      if (p === "/api/content/meta" && request.method === "GET") {
        await authUser(request, env);
        const raw = await env.PUB_KV.get("pubContentMeta");
        if (raw) return json(JSON.parse(raw));
        const full = await env.PUB_KV.get("pubContent");
        const d = full ? JSON.parse(full) : { v: 0, at: 0, questions: [] };
        return json({ v: d.v || 0, at: d.at || 0, sig: d.sig || "", counts: countsOf(d) });
      }
      if (p === "/api/content" && request.method === "GET") {
        await authUser(request, env);
        const raw = await env.PUB_KV.get("pubContent");
        return json(raw ? JSON.parse(raw) : { v: 0, at: 0, questions: [], vocabulary: [], exams: [] });
      }
      if (p === "/api/auth/config" && request.method === "GET") {
        return json({
          google: !!env.GOOGLE_CLIENT_ID,
          googleClientId: env.GOOGLE_CLIENT_ID || "",
          passkey: true,
          email: !!((env.RESEND_KEY || env.RESEND_KEY_2 || env.MAIL_HOOK || env.BREVO_KEY) && (env.MAIL_FROM || env.MAIL_HOOK || env.BREVO_KEY)),
          sms: !!(env.TWILIO_SID && env.TWILIO_TOKEN && env.TWILIO_FROM) || !!(env.SMS_API_URL && env.SMS_API_KEY) || !!env.GREENWEB_TOKEN
        });
      }
      if (p === "/api/auth/register" && request.method === "POST") return await authRegister(request, env);
      if (p === "/api/auth/register-email" && request.method === "POST") return await authRegisterEmail(request, env);
      if (p === "/api/auth/wait" && request.method === "POST") return await authWait(request, env);
      if (p === "/api/auth/login" && request.method === "POST") return await authLogin(request, env);
      if (p === "/api/auth/google" && request.method === "POST") return await authGoogle(request, env);
      if (p === "/api/auth/passkey/register/begin" && request.method === "POST") return await pkRegBegin(request, env);
      if (p === "/api/auth/passkey/register/finish" && request.method === "POST") return await pkRegFinish(request, env);
      if (p === "/api/auth/passkey/login/begin" && request.method === "POST") return await pkLoginBegin(request, env);
      if (p === "/api/auth/passkey/login/finish" && request.method === "POST") return await pkLoginFinish(request, env);
      if (p === "/api/auth/passkey/remove" && request.method === "POST") return await authRemovePasskey(request, env);
      if (p === "/api/auth/verify-link" && request.method === "POST") return await authVerifyLink(request, env);
      if (p === "/api/auth/confirm" && (request.method === "GET" || request.method === "POST")) return await authConfirm(request, env);
      if (p === "/api/auth/otp/send" && request.method === "POST") return await otpSend(request, env);
      if (p === "/api/auth/otp/verify" && request.method === "POST") return await otpVerify(request, env);
      if (p === "/api/auth/request" && request.method === "POST") return await otpSend(request, env);
      if (p === "/api/auth/verify" && request.method === "POST") return await otpVerify(request, env);
      if (p === "/api/auth/forgot" && request.method === "POST") return await authForgot(request, env);
      if (p === "/api/auth/reset" && request.method === "POST") return await authReset(request, env);
      if (p === "/api/auth/logout" && request.method === "POST") return await authLogout(request, env);
      if (p.startsWith("/api/admin/")) return await admin(request, env, p);
      if (p === "/api/ai" && request.method === "POST") {
        let gu = ""; try { gu = await authUser(request, env); } catch (_) {}
        const gid = String(request.headers.get("X-AH-Guest") || "").trim().replace(/[^a-zA-Z0-9\-_]/g, "").slice(0, 48);
        return await aiCall(request, env, gu || (gid ? "g:" + gid : "gu"));
      }
      const uid = await authUser(request, env);
      if (p === "/api/auth/passkey/add/begin" && request.method === "POST") return await pkAddBegin(request, env, uid);
      if (p === "/api/auth/passkey/add/finish" && request.method === "POST") return await pkAddFinish(request, env, uid);
      if (p === "/api/auth/google/link" && request.method === "POST") return await authGoogleLink(request, env, uid);
      if (p === "/api/auth/google/unlink" && request.method === "POST") return await authGoogleUnlink(request, env, uid);
      if (p === "/api/auth/me" && request.method === "GET") {
        const u = JSON.parse(await env.PUB_KV.get("user:" + uid) || "null");
        const pf = JSON.parse(await env.PUB_KV.get("profile:" + (u && (u.uid || u.id))) || "{}");
        return json({ user: publicUser(u, pf) });
      }
      if (p === "/api/auth/password" && request.method === "POST") return await authChangePassword(request, env, uid);
      if (p === "/api/auth/delete" && request.method === "POST") return await authDelete(request, env, uid);
      if (p === "/api/profile" && request.method === "GET") {
        const u = JSON.parse(await env.PUB_KV.get("user:" + uid) || "null");
        const pf = JSON.parse(await env.PUB_KV.get("profile:" + (u && (u.uid || u.id))) || "{}");
        return json({ user: publicUser(u, pf) });
      }
      if (p === "/api/profile" && request.method === "PUT") return await profilePut(request, env, uid);
      if (p === "/api/profile/photo" && request.method === "POST") return await profilePhoto(request, env, uid);
      if (p === "/api/sessions" && request.method === "GET") {
        const tok2 = String(request.headers.get("Authorization") || "").replace("Bearer ", "").trim();
        return json({ sessions: await listSessions(env, uid, tok2) });
      }
      if (p === "/api/sessions/revoke" && request.method === "POST") {
        const tok2 = String(request.headers.get("Authorization") || "").replace("Bearer ", "").trim();
        const b = await request.json().catch(() => ({}));
        const target = String(b.token || "");
        if (!target) return json({ error: "\u09B8\u09C7\u09B6\u09A8 \u099A\u09BF\u09B9\u09CD\u09A8\u09BF\u09A4 \u0995\u09B0\u09BE \u09AF\u09BE\u09AF\u09BC\u09A8\u09BF" }, 400);
        if (target === tok2.slice(0, 8)) return json({ error: "\u09AC\u09B0\u09CD\u09A4\u09AE\u09BE\u09A8 \u09B8\u09C7\u09B6\u09A8 \u098F\u09AD\u09BE\u09AC\u09C7 \u09AC\u09A8\u09CD\u09A7 \u0995\u09B0\u09BE \u09AF\u09BE\u09AF\u09BC \u09A8\u09BE \u2014 \u09B2\u0997\u0986\u0989\u099F \u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0 \u0995\u09B0\u09CB" }, 400);
        const list = JSON.parse(await env.PUB_KV.get("sess:" + uid) || "{}");
        let found = false;
        for (const t of Object.keys(list || {})) {
          if (t.slice(0, 8) === target) {
            await env.PUB_KV.delete("tok:" + t);
            delete list[t];
            found = true;
          }
        }
        if (found) {
          await env.PUB_KV.put("sess:" + uid, JSON.stringify(list), { expirationTtl: 31536e3 });
          await logAct(env, uid, "logout", "\u098F\u0995\u099F\u09BF \u09A1\u09BF\u09AD\u09BE\u0987\u09B8 \u09B8\u09C7\u09B6\u09A8 \u09AC\u09A8\u09CD\u09A7 \u0995\u09B0\u09BE \u09B9\u09AF\u09BC\u09C7\u099B\u09C7");
        }
        return json({ ok: true, revoked: found });
      }
      if (p === "/api/sessions/revoke-others" && request.method === "POST") {
        const tok2 = String(request.headers.get("Authorization") || "").replace("Bearer ", "").trim();
        const list = JSON.parse(await env.PUB_KV.get("sess:" + uid) || "{}");
        let n = 0;
        for (const t of Object.keys(list || {})) {
          if (t === tok2) continue;
          await env.PUB_KV.delete("tok:" + t);
          delete list[t];
          n++;
        }
        await env.PUB_KV.put("sess:" + uid, JSON.stringify(list), { expirationTtl: 31536e3 });
        if (n > 0) await logAct(env, uid, "logout", "\u0985\u09A8\u09CD\u09AF \u09B8\u09AC \u09A1\u09BF\u09AD\u09BE\u0987\u09B8\u09C7\u09B0 \u09B8\u09C7\u09B6\u09A8 \u09AC\u09A8\u09CD\u09A7 \u0995\u09B0\u09BE \u09B9\u09AF\u09BC\u09C7\u099B\u09C7");
        return json({ ok: true, revoked: n });
      }
      if (p === "/api/security/activity" && request.method === "GET") {
        const arr = JSON.parse(await env.PUB_KV.get("act:" + uid) || "[]");
        return json({ activity: Array.isArray(arr) ? arr : [] });
      }
      if (p === "/api/export" && request.method === "GET") {
        const u = await getUserById(env, uid);
        if (!u) return json({ error: "\u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u09AA\u09BE\u0993\u09AF\u09BC\u09BE \u09AF\u09BE\u09AF\u09BC\u09A8\u09BF" }, 404);
        const pf = await loadProfile(env, u.uid || u.id);
        const ustate = JSON.parse(await env.PUB_KV.get("ustate:" + u.id) || "null");
        const sessions = await listSessions(env, uid, String(request.headers.get("Authorization") || "").replace("Bearer ", "").trim());
        const activity = JSON.parse(await env.PUB_KV.get("act:" + uid) || "[]");
        const data = {
          exportedAt: (/* @__PURE__ */ new Date()).toISOString(),
          schema: "admission-hub/account-export/v1",
          account: {
            accountId: String(u.uid || u.id),
            name: u.name || "",
            email: u.email || "",
            emailVerified: !!u.emailVerified,
            mobile: u.mobile || "",
            mobileVerified: !!u.mobileVerified,
            providers: u.providers || [],
            passkeyEnabled: !!u.credId,
            createdAt: u.created,
            lastSeen: u.lastSeen
          },
          profile: {
            displayName: pf.displayName || "",
            dob: pf.dob || "",
            bio: pf.bio || "",
            institution: pf.institution || "",
            targetUniversity: pf.targetUniversity || "",
            targetUnit: pf.targetUnit || "",
            admissionYear: pf.admissionYear || "",
            photo: pf.photo ? "(base64 image)" : "",
            onboarding: pf.onboarding || { completed: false }
          },
          activity: Array.isArray(activity) ? activity : [],
          sessions: (sessions || []).map((s) => ({ id: s.id, device: s.device, browser: s.browser, mobile: s.mobile, firstSeen: s.firstSeen, lastSeen: s.lastSeen, current: !!s.current, live: !!s.live })),
          personalData: ustate || null
        };
        return json(data);
      }
      if (p === "/api/re-auth" && request.method === "POST") {
        const u = JSON.parse(await env.PUB_KV.get("user:" + uid) || "null");
        if (!u || !u.passHash) return json({ error: "\u09AA\u09BE\u09B8\u0993\u09AF\u09BC\u09BE\u09B0\u09CD\u09A1 \u09B8\u09C7\u099F \u0995\u09B0\u09BE \u09A8\u09C7\u0987" }, 400);
        const b = await request.json().catch(() => ({}));
        const hp = await hashPassword(String(b.password || ""), u.passSalt);
        if (hp.hash !== u.passHash) return json({ error: "\u09AA\u09BE\u09B8\u0993\u09AF\u09BC\u09BE\u09B0\u09CD\u09A1 \u09AD\u09C1\u09B2" }, 401);
        return json({ ok: true });
      }
      if (p === "/api/onboarding" && request.method === "GET") return await onboardingGet(request, env, uid);
      if (p === "/api/onboarding" && request.method === "PUT") return await onboardingPut(request, env, uid);
      if (p === "/api/onboarding/catalog" && request.method === "GET") return await onboardingCatalog(env);
      if (p === "/api/state" && request.method === "GET") return json(JSON.parse(await env.PUB_KV.get("ustate:" + uid) || "null"));
      if (p === "/api/state" && request.method === "POST") {
        const b = await request.json();
        await env.PUB_KV.put("ustate:" + uid, JSON.stringify(sanitizeState(b)).slice(0, 18e5));
        await touchUser(env, uid);
        return json({ saved: true, at: Date.now() });
      }
      return json({ error: "not-found" }, 404);
    } catch (e) {
      return json({ error: String(e?.message || e).slice(0, 140) }, e.status || 500);
    }
  }
};
var normId = (s) => {
  s = String(s || "").trim();
  if (/^\+?\d[\d\s-]{8,14}$/.test(s)) return "ph:" + s.replace(/\D/g, "");
  if (s.includes("@")) return "em:" + s.toLowerCase();
  return "un:" + s.toLowerCase().slice(0, 40);
};
var maskDest = (id) => {
  if (id.startsWith("em:")) {
    const e = id.slice(3);
    const i = e.indexOf("@");
    return i > 2 ? e.slice(0, 2) + "\u2022\u2022\u2022\u2022" + e.slice(i) : "\u2022\u2022\u2022\u2022" + e.slice(-8);
  }
  if (id.startsWith("ph:")) {
    const n = id.slice(3);
    return "\u2022\u2022\u2022\u2022" + n.slice(-4);
  }
  return "\u2022\u2022\u2022\u2022";
};
async function shaHex(s) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(s)));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function strongPass(p) {
  p = String(p || "");
  if (p.length < 8) return "\u09AA\u09BE\u09B8\u0993\u09AF\u09BC\u09BE\u09B0\u09CD\u09A1 \u0995\u09AE\u09AA\u0995\u09CD\u09B7\u09C7 \u09EE \u0985\u0995\u09CD\u09B7\u09B0";
  if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) return "\u09AA\u09BE\u09B8\u0993\u09AF\u09BC\u09BE\u09B0\u09CD\u09A1\u09C7 \u0985\u0995\u09CD\u09B7\u09B0 \u0993 \u09B8\u0982\u0996\u09CD\u09AF\u09BE \u09A6\u09C1\u099F\u09CB\u0987 \u09B2\u09BE\u0997\u09AC\u09C7";
  return "";
}
async function loadProfile(env, uid) {
  return JSON.parse(await env.PUB_KV.get("profile:" + uid) || "{}");
}
async function saveProfile(env, uid, pf) {
  await env.PUB_KV.put("profile:" + uid, JSON.stringify(pf).slice(0, 35e4));
}
async function fullUser(env, rec) {
  if (!rec) return null;
  const pf = await loadProfile(env, rec.uid || rec.id);
  return publicUser(rec, pf);
}
function officialLetter(kind, extra) {
  const code = extra && extra.code ? String(extra.code) : "";
  const link = extra && extra.link ? String(extra.link) : "";
  const isReset = kind === "reset";
  const subject = isReset ? "Admission Hub \u09AA\u09BE\u09B8\u0993\u09AF\u09BC\u09BE\u09B0\u09CD\u09A1 \u09AA\u09C1\u09A8\u09B0\u09C1\u09A6\u09CD\u09A7\u09BE\u09B0 \u0995\u09B0\u09C1\u09A8" : "Admission Hub \u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u09AF\u09BE\u099A\u09BE\u0987 \u0995\u09B0\u09C1\u09A8";
  const preheader = isReset ? "\u09AA\u09BE\u09B8\u0993\u09AF\u09BC\u09BE\u09B0\u09CD\u09A1 \u09AA\u09C1\u09A8\u09B0\u09C1\u09A6\u09CD\u09A7\u09BE\u09B0\u09C7\u09B0 \u09B2\u09BF\u0982\u0995 \u09AA\u09CD\u09B0\u09B8\u09CD\u09A4\u09C1\u09A4 \u09B0\u09AF\u09BC\u09C7\u099B\u09C7\u0964" : "\u0986\u09AA\u09A8\u09BE\u09B0 \u0987\u09AE\u09C7\u0987\u09B2 \u09AF\u09BE\u099A\u09BE\u0987 \u0995\u09B0\u09BE\u09B0 \u0995\u09CB\u09A1 \u09AA\u09CD\u09B0\u09B8\u09CD\u09A4\u09C1\u09A4 \u09B0\u09AF\u09BC\u09C7\u099B\u09C7\u0964";
  const F = "'Noto Sans Bengali','Hind Siliguri','SolaimanLipi',Arial,sans-serif";
  const EMERALD = "#0b6b4b";
  const EMERALD_D = "#08452f";
  const INK = "#16241c";
  const SUB = "#5b6b62";
  const text = isReset ? ["ADMISSION HUB", "\u09B6\u09BF\u0995\u09CD\u09B7\u09BE\u09B0\u09CD\u09A5\u09C0 \u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u09B8\u09C7\u09AC\u09BE", "", "\u0986\u09AA\u09A8\u09BE\u09B0 \u0987\u09AE\u09C7\u0987\u09B2 \u09A0\u09BF\u0995\u09BE\u09A8\u09BE \u09AF\u09BE\u099A\u09BE\u0987 \u0995\u09B0\u09BE \u09B9\u09AF\u09BC\u09C7\u099B\u09C7", "", "Admission Hub-\u098F \u0986\u09AA\u09A8\u09BE\u09B0 \u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F\u09C7\u09B0 \u09AA\u09BE\u09B8\u0993\u09AF\u09BC\u09BE\u09B0\u09CD\u09A1 \u09AA\u09C1\u09A8\u09B0\u09C1\u09A6\u09CD\u09A7\u09BE\u09B0 \u0995\u09B0\u09A4\u09C7 \u09A8\u09BF\u099A\u09C7\u09B0 \u09B2\u09BF\u0982\u0995\u099F\u09BF \u0996\u09C1\u09B2\u09C1\u09A8:", "", link, "", "\u09B2\u09BF\u0982\u0995\u099F\u09BF \u09E7\u09EB \u09AE\u09BF\u09A8\u09BF\u099F \u09AA\u09B0\u09CD\u09AF\u09A8\u09CD\u09A4 \u0995\u09BE\u09B0\u09CD\u09AF\u0995\u09B0 \u09A5\u09BE\u0995\u09AC\u09C7\u0964", "", "\u0986\u09AA\u09A8\u09BF \u09AF\u09A6\u09BF \u098F\u0987 \u0985\u09A8\u09C1\u09B0\u09CB\u09A7 \u09A8\u09BE \u0995\u09B0\u09C7 \u09A5\u09BE\u0995\u09C7\u09A8, \u09A4\u09BE\u09B9\u09B2\u09C7 \u098F\u0987 \u0987\u09AE\u09C7\u0987\u09B2\u099F\u09BF \u0989\u09AA\u09C7\u0995\u09CD\u09B7\u09BE \u0995\u09B0\u09C1\u09A8\u0964 \u0995\u09CB\u09A8\u09CB \u09AA\u09A6\u0995\u09CD\u09B7\u09C7\u09AA\u09C7\u09B0 \u09AA\u09CD\u09B0\u09AF\u09BC\u09CB\u099C\u09A8 \u09A8\u09C7\u0987\u0964", "", "\u09B6\u09C1\u09AD\u09C7\u099A\u09CD\u099B\u09BE\u09A8\u09CD\u09A4\u09C7,", "Admission Hub", "\u09B6\u09BF\u0995\u09CD\u09B7\u09BE\u09B0\u09CD\u09A5\u09C0 \u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u09B8\u09C7\u09AC\u09BE"].join("\n") : ["ADMISSION HUB", "\u09B6\u09BF\u0995\u09CD\u09B7\u09BE\u09B0\u09CD\u09A5\u09C0 \u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u09B8\u09C7\u09AC\u09BE", "", "\u0986\u09AA\u09A8\u09BE\u09B0 \u0987\u09AE\u09C7\u0987\u09B2 \u09A0\u09BF\u0995\u09BE\u09A8\u09BE \u09AF\u09BE\u099A\u09BE\u0987 \u0995\u09B0\u09C1\u09A8", "", "Admission Hub-\u098F \u0986\u09AA\u09A8\u09BE\u09B0 \u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u09A4\u09C8\u09B0\u09BF\u09B0 \u09AA\u09CD\u09B0\u0995\u09CD\u09B0\u09BF\u09AF\u09BC\u09BE \u09B8\u09AE\u09CD\u09AA\u09A8\u09CD\u09A8 \u0995\u09B0\u09A4\u09C7 \u09A8\u09BF\u099A\u09C7\u09B0 \u09AF\u09BE\u099A\u09BE\u0987\u0995\u09B0\u09A3 \u0995\u09CB\u09A1\u099F\u09BF \u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0 \u0995\u09B0\u09C1\u09A8\u0964", "", "\u0986\u09AA\u09A8\u09BE\u09B0 \u09AF\u09BE\u099A\u09BE\u0987\u0995\u09B0\u09A3 \u0995\u09CB\u09A1: " + code, "", "\u0995\u09CB\u09A1\u099F\u09BF \u09E8 \u09AE\u09BF\u09A8\u09BF\u099F \u09AA\u09B0\u09CD\u09AF\u09A8\u09CD\u09A4 \u0995\u09BE\u09B0\u09CD\u09AF\u0995\u09B0 \u09A5\u09BE\u0995\u09AC\u09C7\u0964", "", "\u0986\u09AA\u09A8\u09BF \u09AF\u09A6\u09BF \u098F\u0987 \u0995\u09CB\u09A1\u09C7\u09B0 \u099C\u09A8\u09CD\u09AF \u0985\u09A8\u09C1\u09B0\u09CB\u09A7 \u09A8\u09BE \u0995\u09B0\u09C7 \u09A5\u09BE\u0995\u09C7\u09A8, \u09A4\u09BE\u09B9\u09B2\u09C7 \u098F\u0987 \u0987\u09AE\u09C7\u0987\u09B2\u099F\u09BF \u0989\u09AA\u09C7\u0995\u09CD\u09B7\u09BE \u0995\u09B0\u09C1\u09A8\u0964 \u0995\u09CB\u09A8\u09CB \u09AA\u09A6\u0995\u09CD\u09B7\u09C7\u09AA\u09C7\u09B0 \u09AA\u09CD\u09B0\u09AF\u09BC\u09CB\u099C\u09A8 \u09A8\u09C7\u0987\u0964", "", "\u09B6\u09C1\u09AD\u09C7\u099A\u09CD\u099B\u09BE\u09A8\u09CD\u09A4\u09C7,", "Admission Hub", "\u09B6\u09BF\u0995\u09CD\u09B7\u09BE\u09B0\u09CD\u09A5\u09C0 \u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u09B8\u09C7\u09AC\u09BE"].join("\n");
  const codeHtml = code ? '<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:22px auto 10px;"><tr>' + code.split("").map((d) => '<td style="padding:14px 10px;background:#f1f8f4;border:1px solid #bcd9ca;border-radius:10px;font-family:' + F + ";font-size:30px;line-height:1;font-weight:800;color:" + EMERALD_D + ';letter-spacing:2px;">' + d + "</td>").join('<td style="width:6px;"></td>') + '</tr></table><p style="text-align:center;color:' + SUB + ';font-size:13px;line-height:1.7;margin:14px 0 0;">\u098F\u0987 \u0995\u09CB\u09A1\u099F\u09BF <b style="color:' + EMERALD_D + ';">\u09E8 \u09AE\u09BF\u09A8\u09BF\u099F</b> \u09AA\u09B0\u09CD\u09AF\u09A8\u09CD\u09A4 \u0995\u09BE\u09B0\u09CD\u09AF\u0995\u09B0 \u09A5\u09BE\u0995\u09AC\u09C7\u0964</p>' : '<table role="presentation" cellpadding="0" cellspacing="0" align="center" style="margin:24px auto 8px;"><tr><td style="background:' + EMERALD + ';border-radius:12px;"><a href="' + link + '" style="display:block;padding:14px 30px;color:#ffffff;text-decoration:none;font-family:' + F + ';font-size:15px;font-weight:700;border-radius:12px;">\u09AA\u09BE\u09B8\u0993\u09AF\u09BC\u09BE\u09B0\u09CD\u09A1 \u09AA\u09C1\u09A8\u09B0\u09C1\u09A6\u09CD\u09A7\u09BE\u09B0 \u0995\u09B0\u09C1\u09A8</a></td></tr></table><p style="text-align:center;color:' + SUB + ';font-size:13px;line-height:1.7;margin:14px 0 0;">\u09B2\u09BF\u0982\u0995\u099F\u09BF <b style="color:' + EMERALD_D + ';">\u09E7\u09EB \u09AE\u09BF\u09A8\u09BF\u099F</b> \u09AA\u09B0\u09CD\u09AF\u09A8\u09CD\u09A4 \u0995\u09BE\u09B0\u09CD\u09AF\u0995\u09B0 \u09A5\u09BE\u0995\u09AC\u09C7\u0964</p><p style="text-align:center;word-break:break-all;font-size:11px;color:#93a39a;margin:12px 0 0;font-family:' + F + ';">' + link + "</p>";
  const html = '<!DOCTYPE html><html lang="bn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><title>' + subject + '</title></head><body style="margin:0;padding:0;background:#eef4f1;"><div style="display:none;max-height:0;overflow:hidden;opacity:0;">' + preheader + '</div><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef4f1;padding:28px 12px;"><tr><td align="center"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #dbe8e0;"><tr><td style="padding:30px 40px 6px;" align="center"><p style="margin:0;font-family:' + F + ";font-size:14px;letter-spacing:.22em;color:" + EMERALD + ';font-weight:800;">ADMISSION HUB</p><p style="margin:6px 0 0;font-family:' + F + ";font-size:12px;color:" + SUB + ';">\u09B6\u09BF\u0995\u09CD\u09B7\u09BE\u09B0\u09CD\u09A5\u09C0 \u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u09B8\u09C7\u09AC\u09BE</p><div style="height:1px;background:#e3ede7;margin:22px 0 0;"></div></td></tr><tr><td style="padding:26px 40px 8px;"><h1 style="margin:0 0 12px;font-family:' + F + ";font-size:23px;line-height:1.5;color:" + INK + ';font-weight:800;">' + (isReset ? "\u0986\u09AA\u09A8\u09BE\u09B0 \u09AA\u09BE\u09B8\u0993\u09AF\u09BC\u09BE\u09B0\u09CD\u09A1 \u09AA\u09C1\u09A8\u09B0\u09C1\u09A6\u09CD\u09A7\u09BE\u09B0 \u0995\u09B0\u09C1\u09A8" : "\u0986\u09AA\u09A8\u09BE\u09B0 \u0987\u09AE\u09C7\u0987\u09B2 \u09A0\u09BF\u0995\u09BE\u09A8\u09BE \u09AF\u09BE\u099A\u09BE\u0987 \u0995\u09B0\u09C1\u09A8") + '</h1><p style="margin:0;font-family:' + F + ';font-size:15px;line-height:1.9;color:#33463b;">' + (isReset ? "Admission Hub-\u098F \u0986\u09AA\u09A8\u09BE\u09B0 \u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F\u09C7\u09B0 \u09AA\u09BE\u09B8\u0993\u09AF\u09BC\u09BE\u09B0\u09CD\u09A1 \u09AA\u09C1\u09A8\u09B0\u09C1\u09A6\u09CD\u09A7\u09BE\u09B0 \u0995\u09B0\u09A4\u09C7 \u09A8\u09BF\u099A\u09C7\u09B0 \u09AC\u09CB\u09A4\u09BE\u09AE\u099F\u09BF \u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0 \u0995\u09B0\u09C1\u09A8\u0964" : "Admission Hub-\u098F \u0986\u09AA\u09A8\u09BE\u09B0 \u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u09A4\u09C8\u09B0\u09BF\u09B0 \u09AA\u09CD\u09B0\u0995\u09CD\u09B0\u09BF\u09AF\u09BC\u09BE \u09B8\u09AE\u09CD\u09AA\u09A8\u09CD\u09A8 \u0995\u09B0\u09A4\u09C7 \u09A8\u09BF\u099A\u09C7\u09B0 \u09AF\u09BE\u099A\u09BE\u0987\u0995\u09B0\u09A3 \u0995\u09CB\u09A1\u099F\u09BF \u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0 \u0995\u09B0\u09C7 \u0986\u09AA\u09A8\u09BE\u09B0 \u0987\u09AE\u09C7\u0987\u09B2 \u09A0\u09BF\u0995\u09BE\u09A8\u09BE \u09A8\u09BF\u09B6\u09CD\u099A\u09BF\u09A4 \u0995\u09B0\u09C1\u09A8\u0964") + '</p></td></tr><tr><td style="padding:10px 40px 0;" align="center">' + codeHtml + '</td></tr><tr><td style="padding:24px 40px 6px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7fbf8;border-left:3px solid ' + EMERALD + ';border-radius:10px;"><tr><td style="padding:13px 16px;font-family:' + F + ";font-size:13px;line-height:1.8;color:" + SUB + ';">' + (isReset ? "\u0986\u09AA\u09A8\u09BF \u09AF\u09A6\u09BF \u09AA\u09BE\u09B8\u0993\u09AF\u09BC\u09BE\u09B0\u09CD\u09A1 \u09AA\u09C1\u09A8\u09B0\u09C1\u09A6\u09CD\u09A7\u09BE\u09B0\u09C7\u09B0 \u0985\u09A8\u09C1\u09B0\u09CB\u09A7 \u09A8\u09BE \u0995\u09B0\u09C7 \u09A5\u09BE\u0995\u09C7\u09A8, \u09A4\u09BE\u09B9\u09B2\u09C7 \u098F\u0987 \u0987\u09AE\u09C7\u0987\u09B2\u099F\u09BF \u0989\u09AA\u09C7\u0995\u09CD\u09B7\u09BE \u0995\u09B0\u09C1\u09A8\u0964 \u0986\u09AA\u09A8\u09BE\u09B0 \u0995\u09CB\u09A8\u09CB \u0985\u09A4\u09BF\u09B0\u09BF\u0995\u09CD\u09A4 \u09AA\u09A6\u0995\u09CD\u09B7\u09C7\u09AA \u09A8\u09C7\u0993\u09AF\u09BC\u09BE\u09B0 \u09AA\u09CD\u09B0\u09AF\u09BC\u09CB\u099C\u09A8 \u09A8\u09C7\u0987\u0964" : "\u0986\u09AA\u09A8\u09BF \u09AF\u09A6\u09BF \u098F\u0987 \u09AF\u09BE\u099A\u09BE\u0987\u0995\u09B0\u09A3 \u0995\u09CB\u09A1\u09C7\u09B0 \u099C\u09A8\u09CD\u09AF \u0985\u09A8\u09C1\u09B0\u09CB\u09A7 \u09A8\u09BE \u0995\u09B0\u09C7 \u09A5\u09BE\u0995\u09C7\u09A8, \u09A4\u09BE\u09B9\u09B2\u09C7 \u098F\u0987 \u0987\u09AE\u09C7\u0987\u09B2\u099F\u09BF \u0989\u09AA\u09C7\u0995\u09CD\u09B7\u09BE \u0995\u09B0\u09C1\u09A8\u0964 \u0986\u09AA\u09A8\u09BE\u09B0 \u0995\u09CB\u09A8\u09CB \u0985\u09A4\u09BF\u09B0\u09BF\u0995\u09CD\u09A4 \u09AA\u09A6\u0995\u09CD\u09B7\u09C7\u09AA \u09A8\u09C7\u0993\u09AF\u09BC\u09BE\u09B0 \u09AA\u09CD\u09B0\u09AF\u09BC\u09CB\u099C\u09A8 \u09A8\u09C7\u0987\u0964") + '</td></tr></table></td></tr><tr><td style="padding:26px 40px 30px;"><div style="height:1px;background:#e3ede7;margin-bottom:20px;"></div><p style="margin:0;font-family:' + F + ";font-size:14px;color:" + INK + ';font-weight:700;">\u09B6\u09C1\u09AD\u09C7\u099A\u09CD\u099B\u09BE\u09A8\u09CD\u09A4\u09C7,</p><p style="margin:6px 0 0;font-family:' + F + ";font-size:14px;color:" + EMERALD_D + ';font-weight:800;">Admission Hub</p><p style="margin:2px 0 18px;font-family:' + F + ";font-size:12px;color:" + SUB + ';">\u09B6\u09BF\u0995\u09CD\u09B7\u09BE\u09B0\u09CD\u09A5\u09C0 \u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u09B8\u09C7\u09AC\u09BE</p><p style="margin:0;font-family:' + F + ';font-size:11px;line-height:1.7;color:#93a39a;">\u098F\u0987 \u0987\u09AE\u09C7\u0987\u09B2\u099F\u09BF \u09B8\u09CD\u09AC\u09AF\u09BC\u0982\u0995\u09CD\u09B0\u09BF\u09AF\u09BC\u09AD\u09BE\u09AC\u09C7 \u09AA\u09BE\u09A0\u09BE\u09A8\u09CB \u09B9\u09AF\u09BC\u09C7\u099B\u09C7 \u2014 \u0985\u09A8\u09C1\u0997\u09CD\u09B0\u09B9 \u0995\u09B0\u09C7 \u098F\u09B0 \u0989\u09A4\u09CD\u09A4\u09B0 \u09A6\u09C7\u09AC\u09C7\u09A8 \u09A8\u09BE\u0964</p></td></tr></table></td></tr></table></body></html>';
  return { subject, text, html };
}
async function sendOtpMessage(env, destId, code, kind) {
  const letter = officialLetter(kind === "reset" ? "reset" : "verify", { code });
  const text = letter.text;
  const html = letter.html;
  const subject = letter.subject;
  if (destId.startsWith("em:")) {
    const to = destId.slice(3);
    if (env.MAIL_HOOK) {
      const r = await fetch(env.MAIL_HOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: env.MAIL_HOOK_SECRET || "", to, subject, text, html, name: "Admission Hub", fromName: "Admission Hub" })
      });
      if (r.ok) return { ok: true, channel: "email" };
    }
    if (env.BREVO_KEY) {
      const r = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { accept: "application/json", "content-type": "application/json", "api-key": env.BREVO_KEY },
        body: JSON.stringify({
          sender: { name: "Admission Hub", email: env.BREVO_FROM || env.MAIL_FROM || "mahmudrashel1034@gmail.com" },
          to: [{ email: to }],
          subject,
          textContent: text,
          htmlContent: html
        })
      });
      if (r.ok) return { ok: true, channel: "email" };
    }
    const from = env.MAIL_FROM || "Admission Hub <onboarding@resend.dev>";
    const keys2 = [env.RESEND_KEY, env.RESEND_KEY_2].filter(Boolean);
    let last = "\u0987\u09AE\u09C7\u0987\u09B2 \u09AA\u09BE\u09A0\u09BE\u09A8\u09CB \u09AF\u09BE\u09AF\u09BC\u09A8\u09BF";
    for (const key of keys2) {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
        body: JSON.stringify({ from, to: [to], subject, text, html })
      });
      if (r.ok) return { ok: true, channel: "email" };
      const err = await r.json().catch(() => ({}));
      last = String(err.message || err.error || last).slice(0, 180);
    }
    if (/only send testing emails|own email/i.test(last)) {
      return { ok: false, error: "\u098F\u0996\u09A8 \u09B6\u09C1\u09A7\u09C1 \u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F\u09C7\u09B0 \u09A8\u09BF\u099C\u09C7\u09B0 Gmail-\u098F OTP \u09AF\u09BE\u09AF\u09BC\u0964 \u09AF\u09C7\u0995\u09C7\u0989 \u09AA\u09C7\u09A4\u09C7 MAIL_HOOK \u09AC\u09BE BREVO_KEY \u09B2\u09BE\u0997\u09AC\u09C7\u0964" };
    }
    return { ok: false, error: last };
  }
  if (destId.startsWith("ph:")) {
    let num = destId.slice(3).replace(/\D/g, "");
    if (num.startsWith("88")) num = num.slice(2);
    if (num.startsWith("0")) num = num.slice(1);
    const local = "0" + num;
    const intl = "88" + num;
    if (env.GREENWEB_TOKEN) {
      const r = await fetch("https://api.greenweb.com.bd/api.php?token=" + encodeURIComponent(env.GREENWEB_TOKEN) + "&to=" + encodeURIComponent(local) + "&message=" + encodeURIComponent(text));
      const body = await r.text().catch(() => "");
      if (r.ok && /ok|success|sent/i.test(body)) return { ok: true, channel: "sms" };
    }
    if (env.BULKSMS_API_KEY) {
      const r = await fetch("https://bulksmsbd.net/api/smsapi?api_key=" + encodeURIComponent(env.BULKSMS_API_KEY) + "&type=text&number=" + encodeURIComponent(intl) + "&senderid=" + encodeURIComponent(env.SMS_FROM || "8809601000000") + "&message=" + encodeURIComponent(text));
      if (r.ok) return { ok: true, channel: "sms" };
    }
    const to = "+" + intl;
    if (env.TWILIO_SID && env.TWILIO_TOKEN && env.TWILIO_FROM) {
      const r = await fetch("https://api.twilio.com/2010-04-01/Accounts/" + env.TWILIO_SID + "/Messages.json", {
        method: "POST",
        headers: { Authorization: "Basic " + btoa(env.TWILIO_SID + ":" + env.TWILIO_TOKEN), "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ To: to, From: env.TWILIO_FROM, Body: text })
      });
      if (r.ok) return { ok: true, channel: "sms" };
    }
    if (env.SMS_API_URL && env.SMS_API_KEY) {
      const r = await fetch(env.SMS_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + env.SMS_API_KEY },
        body: JSON.stringify({ to, text, from: env.SMS_FROM || "AdmissionHub" })
      });
      if (r.ok) return { ok: true, channel: "sms" };
    }
    return { ok: false, error: "\u09AE\u09CB\u09AC\u09BE\u0987\u09B2 OTP-\u098F\u09B0 \u099C\u09A8\u09CD\u09AF SMS API \u09B2\u09BE\u0997\u09AC\u09C7 \u2014 \u0986\u09AA\u09BE\u09A4\u09A4 Gmail \u09A6\u09BF\u09AF\u09BC\u09C7 \u09B8\u09BE\u0987\u09A8 \u0986\u09AA \u0995\u09B0\u09CB" };
  }
  return { ok: false, error: "\u09B8\u09A0\u09BF\u0995 \u0987\u09AE\u09C7\u0987\u09B2 \u09AC\u09BE \u09AE\u09CB\u09AC\u09BE\u0987\u09B2 \u09B2\u09C7\u0996\u09CB" };
}
async function issueOtp(env, destId, purpose, ip) {
  if (!await rateLimit(env, "otp:" + ip, 400, 3600)) return { error: "\u098F\u0995\u099F\u09C1 \u09AA\u09B0\u09C7 \u0986\u09AC\u09BE\u09B0 \u099A\u09C7\u09B7\u09CD\u099F\u09BE \u0995\u09B0\u09CB", status: 429 };
  if (!await rateLimit(env, "otp-id:" + destId, 20, 3600)) return { error: "\u098F\u0995\u099F\u09C1 \u09AA\u09B0\u09C7 \u0986\u09AC\u09BE\u09B0 \u099A\u09C7\u09B7\u09CD\u099F\u09BE \u0995\u09B0\u09CB", status: 429 };
  const key = "otp:" + purpose + ":" + destId;
  const prev = JSON.parse(await env.PUB_KV.get(key) || "null");
  if (prev && prev.sentAt && Date.now() - prev.sentAt < 12e3) return { error: "\u0995\u09AF\u09BC\u09C7\u0995 \u09B8\u09C7\u0995\u09C7\u09A8\u09CD\u09A1 \u09AA\u09B0 \u0986\u09AC\u09BE\u09B0 \u09AA\u09CD\u09B0\u09C7\u09B0\u09A3 \u0995\u09B0\u09C1\u09A8", status: 429, wait: Math.max(1, 12 - Math.floor((Date.now() - prev.sentAt) / 1e3)) };
  const code = String(Math.floor(1e5 + Math.random() * 9e5));
  const sent = await sendOtpMessage(env, destId, code, purpose);
  if (!sent.ok) return { error: sent.error, status: 503 };
  await env.PUB_KV.put(key, JSON.stringify({ hash: await shaHex(code), exp: Date.now() + 12e4, tries: 0, sentAt: Date.now(), purpose }), { expirationTtl: 150 });
  return { sent: true, channel: sent.channel, masked: maskDest(destId), wait: 120 };
}
async function checkOtp(env, destId, purpose, code) {
  const key = "otp:" + purpose + ":" + destId;
  const o = JSON.parse(await env.PUB_KV.get(key) || "null");
  if (!o || !o.hash) return { error: "\u0986\u0997\u09C7 \u0995\u09CB\u09A1 \u09AA\u09BE\u09A0\u09BE\u0993", status: 400 };
  if (o.exp < Date.now()) return { error: "\u0995\u09CB\u09A1\u09C7\u09B0 \u09B8\u09AE\u09AF\u09BC \u09B6\u09C7\u09B7 \u2014 \u0986\u09AC\u09BE\u09B0 \u09AA\u09BE\u09A0\u09BE\u0993", status: 401 };
  if (o.tries >= 5) return { error: "\u0985\u09A8\u09C7\u0995\u09AC\u09BE\u09B0 \u09AD\u09C1\u09B2 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7 \u2014 \u098F\u0995\u099F\u09C1 \u09AA\u09B0\u09C7 \u099A\u09C7\u09B7\u09CD\u099F\u09BE \u0995\u09B0\u09CB", status: 429 };
  const h = await shaHex(String(code || "").trim());
  if (h !== o.hash) {
    o.tries = (o.tries || 0) + 1;
    await env.PUB_KV.put(key, JSON.stringify(o), { expirationTtl: 600 });
    return { error: "\u0995\u09CB\u09A1 \u09AD\u09C1\u09B2", status: 401 };
  }
  await env.PUB_KV.delete(key);
  return { ok: true };
}
async function getUserById(env, id) {
  return JSON.parse(await env.PUB_KV.get("user:" + id) || "null");
}
var RP_ID = "sheikhrashel47-stack.github.io";
var RP_ORIGIN = "https://sheikhrashel47-stack.github.io";
function b64url(buf) {
  const u = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function unb64url(s) {
  s = String(s || "").replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
}
function derToRaw(der) {
  const u = der instanceof Uint8Array ? der : new Uint8Array(der);
  let i = 0;
  if (u[i++] !== 48) throw new Error("sig");
  if (u[i] & 128) i += 1 + (u[i] & 127);
  else i++;
  if (u[i++] !== 2) throw new Error("sig");
  let l1 = u[i++];
  let r = u.slice(i, i + l1);
  i += l1;
  if (u[i++] !== 2) throw new Error("sig");
  let l2 = u[i++];
  let s = u.slice(i, i + l2);
  const pad = (x) => {
    while (x.length > 32 && x[0] === 0) x = x.slice(1);
    const o = new Uint8Array(32);
    o.set(x, 32 - Math.min(32, x.length));
    return o;
  };
  const out = new Uint8Array(64);
  out.set(pad(r), 0);
  out.set(pad(s), 32);
  return out;
}
async function completeVerify(env, raw) {
  raw = String(raw || "");
  if (!raw) return { ok: false, error: "\u09B2\u09BF\u0982\u0995 \u0985\u09AC\u09C8\u09A7", status: 400 };
  const hash = await shaHex(raw);
  const row = JSON.parse(await env.PUB_KV.get("vlink:" + hash) || "null");
  if (!row || !row.id) return { ok: false, error: "\u09B2\u09BF\u0982\u0995 \u0985\u09AC\u09C8\u09A7 \u0985\u09A5\u09AC\u09BE \u09AE\u09C7\u09AF\u09BC\u09BE\u09A6 \u09B6\u09C7\u09B7 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7", status: 401 };
  if (row.at && Date.now() - row.at > 9e5) {
    await env.PUB_KV.delete("vlink:" + hash);
    return { ok: false, error: "\u09B2\u09BF\u0982\u0995\u09C7\u09B0 \u09AE\u09C7\u09AF\u09BC\u09BE\u09A6 \u09B6\u09C7\u09B7 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7\u0964 \u0986\u09AC\u09BE\u09B0 \u09A8\u09A4\u09C1\u09A8 \u09B2\u09BF\u0982\u0995 \u09AA\u09BE\u09A0\u09BE\u0993\u0964", status: 401 };
  }
  const pending = JSON.parse(await env.PUB_KV.get("pending:" + row.id) || "null");
  if (!pending) return { ok: false, error: "\u0986\u09AC\u09BE\u09B0 \u09B8\u09BE\u0987\u09A8 \u0986\u09AA \u0995\u09B0\u09C1\u09A8", status: 400 };
  pending.verified = true;
  pending.emailVerified = true;
  pending.status = "active";
  pending.lastSeen = Date.now();
  await env.PUB_KV.put("user:" + pending.id, JSON.stringify(pending));
  await env.PUB_KV.delete("pending:" + row.id);
  await env.PUB_KV.delete("vlink:" + hash);
  const issued = await issueToken(env, pending);
  issued.user = await fullUser(env, pending);
  const ready = JSON.stringify({ status: "ready", token: issued.token, user: issued.user, id: pending.id });
  if (pending.waitId) await env.PUB_KV.put("wait:" + pending.waitId, ready, { expirationTtl: 900 });
  await env.PUB_KV.put("waitid:" + pending.id, ready, { expirationTtl: 900 });
  return { ok: true, issued, waitId: pending.waitId || "" };
}
var authVerifyLink = async (request, env) => {
  const b = await request.json().catch(() => ({}));
  const out = await completeVerify(env, b.token);
  if (!out.ok) return json({ error: out.error }, out.status);
  return json(out.issued);
};
var authConfirm = async (request, env) => {
  const url = new URL(request.url);
  let raw = url.searchParams.get("t") || url.searchParams.get("verify") || "";
  if (request.method === "POST" && !raw) {
    const b = await request.json().catch(() => ({}));
    raw = String(b.token || b.t || "");
  }
  const out = await completeVerify(env, raw);
  const ok = out.ok;
  if (ok) {
    const w = String(out.waitId || "");
    const app = "https://sheikhrashel47-stack.github.io/admission-hub-demo/?verified=1&w=" + encodeURIComponent(w);
    return Response.redirect(app, 302);
  }
  const msg = out.error || "Verification failed";
  const bn2 = out.error || "\u09AF\u09BE\u099A\u09BE\u0987 \u09AC\u09CD\u09AF\u09B0\u09CD\u09A5";
  const html = `<!doctype html><html lang="bn"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Admission Hub</title>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f3f5f4;font-family:Georgia,Times,serif;color:#1a2420">
<div style="max-width:440px;margin:24px;background:#fff;border:1px solid #dce6e0;padding:36px 28px;text-align:center">
<p style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:11px;letter-spacing:.16em;color:#1e7a4c;font-weight:700">ADMISSION HUB</p>
<p style="margin:0 0 22px;font-family:Arial,sans-serif;font-size:12px;color:#66756e">Office of Student Accounts</p>
<h1 style="font-size:26px;margin:0 0 14px">Unable to verify</h1>
<p style="line-height:1.55">${msg}</p>
<p style="line-height:1.55;color:#44524c">${bn2}</p>
</div></body></html>`;
  return new Response(html, { status: out.status || 400, headers: { "Content-Type": "text/html; charset=utf-8", "Access-Control-Allow-Origin": "*" } });
};
var authWait = async (request, env) => {
  const b = await request.json().catch(() => ({}));
  const waitId = String(b.waitId || "");
  const id = normId(b.id || "");
  let row = null;
  if (waitId.length >= 16) row = JSON.parse(await env.PUB_KV.get("wait:" + waitId) || "null");
  if (!row && id.startsWith("em:")) row = JSON.parse(await env.PUB_KV.get("waitid:" + id) || "null");
  if (!row) return json({ waiting: true });
  if (row.status === "ready" && row.token) return json({ token: row.token, user: row.user, ready: true });
  return json({ waiting: true });
};
var pkRegBegin = async (request, env) => {
  const uid = crypto.randomUUID();
  const chal = crypto.getRandomValues(new Uint8Array(32));
  const chalId = b64url(crypto.getRandomValues(new Uint8Array(16)));
  await env.PUB_KV.put("pkch:" + chalId, JSON.stringify({ challenge: b64url(chal), uid, t: "reg", at: Date.now() }), { expirationTtl: 300 });
  return json({
    chalId,
    userId: uid,
    options: {
      challenge: b64url(chal),
      rp: { id: RP_ID, name: "Admission Hub" },
      user: { id: b64url(new TextEncoder().encode("pk:" + uid)), name: "scholar-" + uid.slice(0, 8), displayName: "Scholar" },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: "platform", residentKey: "preferred", requireResidentKey: false, userVerification: "required" },
      timeout: 12e4,
      attestation: "none"
    }
  });
};
var pkRegFinish = async (request, env) => {
  const b = await request.json().catch(() => ({}));
  const ch = JSON.parse(await env.PUB_KV.get("pkch:" + b.chalId) || "null");
  if (!ch || ch.t !== "reg") return json({ error: "Passkey \u099A\u09CD\u09AF\u09BE\u09B2\u09C7\u099E\u09CD\u099C \u09B6\u09C7\u09B7" }, 401);
  let cdata;
  try {
    cdata = JSON.parse(new TextDecoder().decode(unb64url(b.clientDataJSON)));
  } catch (_) {
    return json({ error: "Passkey \u09A1\u09C7\u099F\u09BE \u0996\u09BE\u09B0\u09BE\u09AA" }, 400);
  }
  if (cdata.type !== "webauthn.create") return json({ error: "Passkey \u099F\u09BE\u0987\u09AA \u09AD\u09C1\u09B2" }, 400);
  if (String(cdata.challenge) !== ch.challenge) return json({ error: "Passkey \u09AE\u09BF\u09B2\u099B\u09C7 \u09A8\u09BE" }, 401);
  if (!String(cdata.origin || "").startsWith(RP_ORIGIN)) return json({ error: "Origin \u09AE\u09BF\u09B2\u099B\u09C7 \u09A8\u09BE" }, 401);
  if (!b.publicKey || !b.rawId) return json({ error: "Passkey \u09AA\u09BE\u09AC\u09B2\u09BF\u0995 \u0995\u09C0 \u09A8\u09C7\u0987" }, 400);
  const id = "pk:" + ch.uid;
  let passHash, passSalt;
  if (b.password) {
    const weak = strongPass(String(b.password));
    if (weak) return json({ error: weak }, 400);
    if (String(b.confirm || "") !== String(b.password)) return json({ error: "\u09AA\u09BE\u09B8\u0993\u09AF\u09BC\u09BE\u09B0\u09CD\u09A1 \u09A6\u09C1\u099F\u09CB \u09AE\u09BF\u09B2\u099B\u09C7 \u09A8\u09BE" }, 400);
    const hp = await hashPassword(String(b.password));
    passHash = hp.hash;
    passSalt = hp.salt;
  }
  const rec = {
    id,
    uid: ch.uid,
    name: String(b.name || "Scholar").slice(0, 40),
    email: "",
    mobile: "",
    contact: "",
    dob: String(b.dob || "").slice(0, 12),
    school: String(b.school || "").slice(0, 80),
    college: String(b.college || "").slice(0, 80),
    created: Date.now(),
    lastSeen: Date.now(),
    blocked: false,
    verified: true,
    emailVerified: false,
    status: "active",
    providers: passHash ? ["passkey", "password"] : ["passkey"],
    credId: b.rawId,
    pubKey: b.publicKey,
    pubAlg: b.publicKeyAlgorithm || -7,
    passHash,
    passSalt
  };
  await env.PUB_KV.put("pkid:" + b.rawId, JSON.stringify({ id, pubKey: rec.pubKey, alg: rec.pubAlg }));
  await env.PUB_KV.delete("pkch:" + b.chalId);
  const issued = await issueToken(env, rec);
  issued.user = await fullUser(env, rec);
  await logAct(env, rec.id, "passkey", "Passkey \u09AF\u09CB\u0997 \u0995\u09B0\u09BE \u09B9\u09AF\u09BC\u09C7\u099B\u09C7");
  return json(issued);
};
var pkAddBegin = async (request, env, uid) => {
  const u = await getUserById(env, uid);
  if (!u) return json({ error: "\u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u09AA\u09BE\u0993\u09AF\u09BC\u09BE \u09AF\u09BE\u09AF\u09BC\u09A8\u09BF" }, 404);
  if (u.credId) return json({ error: "\u0986\u0997\u09C7 \u09A5\u09C7\u0995\u09C7\u0987 \u09AA\u09BE\u09B8\u0995\u09BF \u0986\u099B\u09C7 \u2014 \u09AA\u09CD\u09B0\u09A5\u09AE\u09C7 \u09B8\u09C7\u099F\u09BF \u09B8\u09B0\u09BE\u0993" }, 400);
  const chal = crypto.getRandomValues(new Uint8Array(32));
  const chalId = b64url(crypto.getRandomValues(new Uint8Array(16)));
  await env.PUB_KV.put("pkch:" + chalId, JSON.stringify({ challenge: b64url(chal), uid, t: "reg", at: Date.now() }), { expirationTtl: 300 });
  return json({
    chalId,
    options: {
      challenge: b64url(chal),
      rp: { id: RP_ID, name: "Admission Hub" },
      user: { id: b64url(new TextEncoder().encode(String(u.uid || u.id))), name: String(u.name || "Scholar").slice(0, 32), displayName: String(u.name || "Scholar").slice(0, 32) },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: "platform", residentKey: "preferred", requireResidentKey: false, userVerification: "required" },
      timeout: 12e4,
      attestation: "none"
    }
  });
};
var pkAddFinish = async (request, env, uid) => {
  const b = await request.json().catch(() => ({}));
  const ch = JSON.parse(await env.PUB_KV.get("pkch:" + b.chalId) || "null");
  if (!ch || ch.t !== "reg" || ch.uid !== uid) return json({ error: "Passkey \u099A\u09CD\u09AF\u09BE\u09B2\u09C7\u099E\u09CD\u099C \u09B6\u09C7\u09B7" }, 401);
  let cdata;
  try {
    cdata = JSON.parse(new TextDecoder().decode(unb64url(b.clientDataJSON)));
  } catch (_) {
    return json({ error: "Passkey \u09A1\u09C7\u099F\u09BE \u0996\u09BE\u09B0\u09BE\u09AA" }, 400);
  }
  if (cdata.type !== "webauthn.create") return json({ error: "Passkey \u099F\u09BE\u0987\u09AA \u09AD\u09C1\u09B2" }, 400);
  if (String(cdata.challenge) !== ch.challenge) return json({ error: "Passkey \u09AE\u09BF\u09B2\u099B\u09C7 \u09A8\u09BE" }, 401);
  if (!String(cdata.origin || "").startsWith(RP_ORIGIN)) return json({ error: "Origin \u09AE\u09BF\u09B2\u099B\u09C7 \u09A8\u09BE" }, 401);
  if (!b.publicKey || !b.rawId) return json({ error: "Passkey \u09AA\u09BE\u09AC\u09B2\u09BF\u0995 \u0995\u09C0 \u09A8\u09C7\u0987" }, 400);
  const u = await getUserById(env, uid);
  if (!u) return json({ error: "\u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u09AA\u09BE\u0993\u09AF\u09BC\u09BE \u09AF\u09BE\u09AF\u09BC\u09A8\u09BF" }, 404);
  await env.PUB_KV.put("pkid:" + b.rawId, JSON.stringify({ id: u.id, pubKey: b.publicKey, alg: b.publicKeyAlgorithm || -7 }));
  u.credId = b.rawId;
  u.pubKey = b.publicKey;
  u.pubAlg = b.publicKeyAlgorithm || -7;
  u.providers = Array.from(/* @__PURE__ */ new Set([...u.providers || [], "passkey"]));
  await env.PUB_KV.delete("pkch:" + b.chalId);
  await env.PUB_KV.put("user:" + u.id, JSON.stringify(u));
  await logAct(env, uid, "passkey", "\u098F\u0987 \u09A1\u09BF\u09AD\u09BE\u0987\u09B8\u09C7 \u09AA\u09BE\u09B8\u0995\u09BF \u09AF\u09CB\u0997 \u0995\u09B0\u09BE \u09B9\u09AF\u09BC\u09C7\u099B\u09C7");
  return json({ ok: true, user: await fullUser(env, u) });
};
var authGoogleLink = async (request, env, uid) => {
  if (!env.GOOGLE_CLIENT_ID) return json({ error: "Google \u09B8\u0982\u09AF\u09CB\u0997 \u098F\u0996\u09A8 \u09B8\u09C7\u099F\u0986\u09AA \u09A8\u09C7\u0987" }, 503);
  const b = await request.json().catch(() => ({}));
  const idToken = String(b.idToken || "");
  const accessToken = String(b.accessToken || b.access_token || "");
  let g = {};
  if (idToken) {
    const r = await fetch("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(idToken));
    g = await r.json().catch(() => ({}));
    if (!r.ok || !g.email) return json({ error: "Google \u09AF\u09BE\u099A\u09BE\u0987 \u09AC\u09CD\u09AF\u09B0\u09CD\u09A5" }, 401);
    if (g.aud !== env.GOOGLE_CLIENT_ID) return json({ error: "Google \u0995\u09CD\u09B2\u09BE\u09AF\u09BC\u09C7\u09A8\u09CD\u099F \u09AE\u09BF\u09B2\u099B\u09C7 \u09A8\u09BE" }, 401);
  } else if (accessToken) {
    const r = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: "Bearer " + accessToken } });
    g = await r.json().catch(() => ({}));
    if (!r.ok || !g.email) return json({ error: "Google \u09AF\u09BE\u099A\u09BE\u0987 \u09AC\u09CD\u09AF\u09B0\u09CD\u09A5" }, 401);
  } else {
    return json({ error: "Google \u099F\u09CB\u0995\u09C7\u09A8 \u09A8\u09C7\u0987" }, 400);
  }
  const u = await getUserById(env, uid);
  if (!u) return json({ error: "\u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u09AA\u09BE\u0993\u09AF\u09BC\u09BE \u09AF\u09BE\u09AF\u09BC\u09A8\u09BF" }, 404);
  const gid = normId(g.email);
  if (gid !== u.id) {
    const other = JSON.parse(await env.PUB_KV.get("user:" + gid) || "null");
    if (other && other.id && other.id !== u.id) return json({ error: "\u098F\u0987 \u0997\u09C1\u0997\u09B2 \u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u0985\u09A8\u09CD\u09AF \u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F\u09C7\u09B0 \u09B8\u09BE\u09A5\u09C7 \u09AF\u09C1\u0995\u09CD\u09A4" }, 409);
  }
  if (!u.email) u.email = g.email;
  u.emailVerified = true;
  u.verified = true;
  u.providers = Array.from(/* @__PURE__ */ new Set([...u.providers || [], "google"]));
  await env.PUB_KV.put("user:" + u.id, JSON.stringify(u));
  await logAct(env, uid, "google", "\u0997\u09C1\u0997\u09B2 \u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u09AF\u09C1\u0995\u09CD\u09A4 \u0995\u09B0\u09BE \u09B9\u09AF\u09BC\u09C7\u099B\u09C7");
  return json({ ok: true, user: await fullUser(env, u) });
};
var authGoogleUnlink = async (request, env, uid) => {
  const u = await getUserById(env, uid);
  if (!u) return json({ error: "\u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u09AA\u09BE\u0993\u09AF\u09BC\u09BE \u09AF\u09BE\u09AF\u09BC\u09A8\u09BF" }, 404);
  u.providers = (u.providers || []).filter((p) => p !== "google");
  await env.PUB_KV.put("user:" + u.id, JSON.stringify(u));
  await logAct(env, uid, "google", "\u0997\u09C1\u0997\u09B2 \u09B2\u09BF\u0982\u0995 \u09B8\u09B0\u09BE\u09A8\u09CB \u09B9\u09AF\u09BC\u09C7\u099B\u09C7");
  return json({ ok: true, user: await fullUser(env, u) });
};
var authRemovePasskey = async (request, env) => {
  const tok2 = String(request.headers.get("Authorization") || "").replace("Bearer ", "").trim();
  const tr = JSON.parse(await env.PUB_KV.get("tok:" + tok2) || "null");
  if (!tr) return json({ error: "\u0986\u0997\u09C7 \u09B2\u0997\u0987\u09A8 \u0995\u09B0\u09CB" }, 401);
  const u = JSON.parse(await env.PUB_KV.get("user:" + tr.id) || "null");
  if (!u) return json({ error: "\u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u09AA\u09BE\u0993\u09AF\u09BC\u09BE \u09AF\u09BE\u09AF\u09BC\u09A8\u09BF" }, 404);
  if (u.credId) await env.PUB_KV.delete("pkid:" + u.credId);
  delete u.credId;
  delete u.pubKey;
  delete u.pubAlg;
  if (u.providers) u.providers = u.providers.filter((p) => p !== "passkey");
  if (u.providers && !u.providers.length) u.providers = ["password"];
  await env.PUB_KV.put("user:" + u.id, JSON.stringify(u));
  await logAct(env, u.id, "passkey", "Passkey \u09B8\u09B0\u09BE\u09A8\u09CB \u09B9\u09AF\u09BC\u09C7\u099B\u09C7");
  return json({ ok: true });
};
var pkLoginBegin = async (request, env) => {
  const chal = crypto.getRandomValues(new Uint8Array(32));
  const chalId = b64url(crypto.getRandomValues(new Uint8Array(16)));
  await env.PUB_KV.put("pkch:" + chalId, JSON.stringify({ challenge: b64url(chal), t: "login", at: Date.now() }), { expirationTtl: 300 });
  return json({
    chalId,
    options: {
      challenge: b64url(chal),
      rpId: RP_ID,
      timeout: 12e4,
      userVerification: "required"
    }
  });
};
var pkLoginFinish = async (request, env) => {
  const b = await request.json().catch(() => ({}));
  const ch = JSON.parse(await env.PUB_KV.get("pkch:" + b.chalId) || "null");
  if (!ch || ch.t !== "login") return json({ error: "Passkey \u099A\u09CD\u09AF\u09BE\u09B2\u09C7\u099E\u09CD\u099C \u09B6\u09C7\u09B7" }, 401);
  let cdata;
  try {
    cdata = JSON.parse(new TextDecoder().decode(unb64url(b.clientDataJSON)));
  } catch (_) {
    return json({ error: "Passkey \u09A1\u09C7\u099F\u09BE \u0996\u09BE\u09B0\u09BE\u09AA" }, 400);
  }
  if (cdata.type !== "webauthn.get") return json({ error: "Passkey \u099F\u09BE\u0987\u09AA \u09AD\u09C1\u09B2" }, 400);
  if (String(cdata.challenge) !== ch.challenge) return json({ error: "Passkey \u09AE\u09BF\u09B2\u099B\u09C7 \u09A8\u09BE" }, 401);
  if (!String(cdata.origin || "").startsWith(RP_ORIGIN)) return json({ error: "Origin \u09AE\u09BF\u09B2\u099B\u09C7 \u09A8\u09BE" }, 401);
  const row = JSON.parse(await env.PUB_KV.get("pkid:" + b.rawId) || "null");
  if (!row || !row.id) return json({ error: "\u098F\u0987 \u09A1\u09BF\u09AD\u09BE\u0987\u09B8\u09C7 Passkey \u09A8\u09C7\u0987 \u2014 \u0986\u0997\u09C7 \u09A4\u09C8\u09B0\u09BF \u0995\u09B0\u09CB" }, 404);
  const rec = JSON.parse(await env.PUB_KV.get("user:" + row.id) || "null");
  if (!rec) return json({ error: "\u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u09A8\u09C7\u0987" }, 404);
  if (rec.blocked || rec.status === "disabled") return json({ error: "\u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u09AC\u09A8\u09CD\u09A7" }, 403);
  try {
    const pub = unb64url(row.pubKey);
    const alg = Number(row.alg || -7);
    const authData = unb64url(b.authenticatorData);
    const clientHash = new Uint8Array(await crypto.subtle.digest("SHA-256", unb64url(b.clientDataJSON)));
    const signed = new Uint8Array(authData.length + clientHash.length);
    signed.set(authData, 0);
    signed.set(clientHash, authData.length);
    let ok = false;
    if (alg === -7) {
      const key = await crypto.subtle.importKey("spki", pub, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
      ok = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, derToRaw(unb64url(b.signature)), signed);
    } else if (alg === -257) {
      const key = await crypto.subtle.importKey("spki", pub, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
      ok = await crypto.subtle.verify({ name: "RSASSA-PKCS1-v1_5" }, key, unb64url(b.signature), signed);
    }
    if (!ok) return json({ error: "Passkey \u09AF\u09BE\u099A\u09BE\u0987 \u09AC\u09CD\u09AF\u09B0\u09CD\u09A5" }, 401);
  } catch (e) {
    return json({ error: "Passkey \u09AF\u09BE\u099A\u09BE\u0987 \u09AC\u09CD\u09AF\u09B0\u09CD\u09A5" }, 401);
  }
  await env.PUB_KV.delete("pkch:" + b.chalId);
  rec.lastSeen = Date.now();
  rec.verified = true;
  const issued = await issueToken(env, rec);
  issued.user = await fullUser(env, rec);
  return json(issued);
};
var authRegisterEmail = async (request, env) => {
  const ip = request.headers.get("CF-Connecting-IP") || "ip";
  if (!await rateLimit(env, "reg:" + ip, 400, 3600)) return json({ error: "\u098F\u0995\u099F\u09C1 \u09AA\u09B0\u09C7 \u0986\u09AC\u09BE\u09B0 \u099A\u09C7\u09B7\u09CD\u099F\u09BE \u0995\u09B0\u09CB" }, 429);
  const b = await request.json().catch(() => ({}));
  const id = normId(b.id || b.email);
  const name = String(b.name || "").trim().slice(0, 40);
  if (!name || name.length < 2) return json({ error: "\u09AA\u09C2\u09B0\u09CD\u09A3 \u09A8\u09BE\u09AE \u09B2\u09C7\u0996\u09CB" }, 400);
  if (!id.startsWith("em:")) return json({ error: "\u09B8\u09A0\u09BF\u0995 \u0987\u09AE\u09C7\u0987\u09B2 \u09B2\u09C7\u0996\u09CB" }, 400);
  const existing = await getUserById(env, id);
  if (existing && existing.status === "active") return json({ error: "\u098F\u0987 \u0987\u09AE\u09C7\u0987\u09B2 \u0986\u0997\u09C7\u0987 \u0986\u099B\u09C7 \u2014 \u09B2\u0997\u0987\u09A8 \u0995\u09B0\u09CB" }, 409);
  const password = String(b.password || "");
  const confirm = String(b.confirm || b.password2 || "");
  const weak = strongPass(password);
  if (weak) return json({ error: weak }, 400);
  if (password !== confirm) return json({ error: "\u09AA\u09BE\u09B8\u0993\u09AF\u09BC\u09BE\u09B0\u09CD\u09A1 \u09A6\u09C1\u099F\u09CB \u09AE\u09BF\u09B2\u099B\u09C7 \u09A8\u09BE" }, 400);
  const hp = await hashPassword(password);
  const waitId = b64url(crypto.getRandomValues(new Uint8Array(24)));
  const pending = {
    id,
    uid: existing && existing.uid || crypto.randomUUID(),
    name,
    email: id.slice(3),
    mobile: "",
    contact: id.slice(3),
    dob: String(b.dob || "").slice(0, 12),
    school: String(b.school || "").slice(0, 80),
    college: String(b.college || "").slice(0, 80),
    passHash: hp.hash,
    passSalt: hp.salt,
    waitId,
    created: Date.now(),
    providers: ["email", "password"],
    verified: false,
    emailVerified: false,
    status: "pending"
  };
  await env.PUB_KV.put("pending:" + id, JSON.stringify(pending), { expirationTtl: 900 });
  await env.PUB_KV.put("wait:" + waitId, JSON.stringify({ id, status: "pending" }), { expirationTtl: 150 });
  const sent = await issueOtp(env, id, "signup", ip);
  if (sent.error) return json({ error: sent.error }, sent.status || 503);
  return json({ pending: true, sent: true, channel: "otp", masked: sent.masked, purpose: "signup", waitId, expiresIn: 120, wait: 120 });
};
var authRegister = async (request, env) => {
  const ip = request.headers.get("CF-Connecting-IP") || "ip";
  if (!await rateLimit(env, "reg:" + ip, 400, 3600)) return json({ error: "\u098F\u0995\u099F\u09C1 \u09AA\u09B0\u09C7 \u0986\u09AC\u09BE\u09B0 \u099A\u09C7\u09B7\u09CD\u099F\u09BE \u0995\u09B0\u09CB" }, 429);
  const b = await request.json().catch(() => ({}));
  const id = normId(b.id);
  const password = String(b.password || "");
  const confirm = String(b.confirm || b.password2 || "");
  const name = String(b.name || "").trim().slice(0, 40);
  if (!name || name.length < 2) return json({ error: "\u09AA\u09C2\u09B0\u09CD\u09A3 \u09A8\u09BE\u09AE \u09B2\u09C7\u0996\u09CB" }, 400);
  if (!(id.startsWith("em:") || id.startsWith("ph:"))) return json({ error: "\u09B8\u09A0\u09BF\u0995 \u0987\u09AE\u09C7\u0987\u09B2 \u09AC\u09BE \u09AE\u09CB\u09AC\u09BE\u0987\u09B2 \u09B2\u09C7\u0996\u09CB" }, 400);
  const weak = strongPass(password);
  if (weak) return json({ error: weak }, 400);
  if (confirm && confirm !== password) return json({ error: "\u09AA\u09BE\u09B8\u0993\u09AF\u09BC\u09BE\u09B0\u09CD\u09A1 \u09A6\u09C1\u099F\u09CB \u09AE\u09BF\u09B2\u099B\u09C7 \u09A8\u09BE" }, 400);
  const existing = await getUserById(env, id);
  if (existing && existing.passHash) return json({ error: "\u098F\u0987 \u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u0986\u0997\u09C7\u0987 \u0986\u099B\u09C7 \u2014 \u09B2\u0997\u0987\u09A8 \u0995\u09B0\u09CB" }, 409);
  const hp = await hashPassword(password);
  const pending = {
    id,
    uid: existing && existing.uid || crypto.randomUUID(),
    name,
    passHash: hp.hash,
    passSalt: hp.salt,
    email: id.startsWith("em:") ? id.slice(3) : "",
    mobile: id.startsWith("ph:") ? id.slice(3) : "",
    contact: id.startsWith("ph:") ? "+88" + id.slice(3).replace(/^88/, "") : id.slice(3),
    created: Date.now(),
    providers: ["password"]
  };
  if (!id.startsWith("em:")) return json({ error: "\u0987\u09AE\u09C7\u0987\u09B2 \u09B2\u09BF\u0982\u0995 \u09AD\u09C7\u09B0\u09BF\u09AB\u09BE\u0987 \u09B6\u09C1\u09A7\u09C1 Gmail/\u0987\u09AE\u09C7\u0987\u09B2\u09C7 \u2014 \u09AE\u09CB\u09AC\u09BE\u0987\u09B2\u09C7 Google \u09AC\u09BE Passkey \u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0 \u0995\u09B0\u09CB" }, 400);
  await env.PUB_KV.put("pending:" + id, JSON.stringify(pending), { expirationTtl: 1800 });
  const sent = await issueOtp(env, id, "signup", ip);
  if (sent.error) return json({ error: sent.error }, sent.status || 503);
  return json({ pending: true, sent: true, channel: "otp", masked: sent.masked, purpose: "signup", wait: 120, expiresIn: 120 });
};
var otpSend = async (request, env) => {
  const ip = request.headers.get("CF-Connecting-IP") || "ip";
  const b = await request.json().catch(() => ({}));
  const id = normId(b.id);
  const purpose = String(b.purpose || "login");
  if (!(id.startsWith("em:") || id.startsWith("ph:"))) return json({ error: "\u09B8\u09A0\u09BF\u0995 \u0987\u09AE\u09C7\u0987\u09B2 \u09AC\u09BE \u09AE\u09CB\u09AC\u09BE\u0987\u09B2 \u09B2\u09C7\u0996\u09CB" }, 400);
  if (purpose === "signup") {
    const pending = JSON.parse(await env.PUB_KV.get("pending:" + id) || "null");
    if (!pending) return json({ error: "\u0986\u0997\u09C7 \u09B8\u09BE\u0987\u09A8 \u0986\u09AA \u09AB\u09B0\u09CD\u09AE \u09AA\u09C2\u09B0\u09A3 \u0995\u09B0\u09CB" }, 400);
  } else if (purpose === "login" || purpose === "reset") {
    const u = await getUserById(env, id);
    const pending = JSON.parse(await env.PUB_KV.get("pending:" + id) || "null");
    if (!u && pending) {
      const otp2 = await issueOtp(env, id, "signup", ip);
      if (otp2.error) return json({ error: otp2.error, wait: otp2.wait }, otp2.status || 503);
      return json({ sent: true, channel: otp2.channel, masked: otp2.masked, wait: otp2.wait, purpose: "signup" });
    }
    if (!u) return json({ error: "\u098F\u0987 \u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u09AA\u09BE\u0993\u09AF\u09BC\u09BE \u09AF\u09BE\u09AF\u09BC\u09A8\u09BF" }, 404);
    if (u.blocked || u.status === "disabled" || u.status === "suspended") return json({ error: "\u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u09AC\u09A8\u09CD\u09A7" }, 403);
  }
  const otp = await issueOtp(env, id, purpose, ip);
  if (otp.error) return json({ error: otp.error, wait: otp.wait }, otp.status || 503);
  return json({ sent: true, channel: otp.channel, masked: otp.masked, wait: otp.wait, purpose });
};
var otpVerify = async (request, env) => {
  const ip = request.headers.get("CF-Connecting-IP") || "ip";
  if (!await rateLimit(env, "otptry:" + ip, 400, 3600)) return json({ error: "\u098F\u0995\u099F\u09C1 \u09AA\u09B0\u09C7 \u0986\u09AC\u09BE\u09B0 \u099A\u09C7\u09B7\u09CD\u099F\u09BE \u0995\u09B0\u09CB" }, 429);
  const b = await request.json().catch(() => ({}));
  const id = normId(b.id);
  const purpose = String(b.purpose || "login");
  const chk = await checkOtp(env, id, purpose, b.code);
  if (!chk.ok) return json({ error: chk.error }, chk.status || 401);
  if (purpose === "signup") {
    const pending = JSON.parse(await env.PUB_KV.get("pending:" + id) || "null");
    if (!pending) return json({ error: "\u09B8\u09BE\u0987\u09A8 \u0986\u09AA \u09B8\u09AE\u09AF\u09BC \u09B6\u09C7\u09B7 \u2014 \u0986\u09AC\u09BE\u09B0 \u099A\u09C7\u09B7\u09CD\u099F\u09BE \u0995\u09B0\u09CB" }, 400);
    await env.PUB_KV.delete("pending:" + id);
    const rec = {
      id: pending.id,
      uid: pending.uid,
      name: pending.name,
      email: pending.email,
      mobile: pending.mobile,
      contact: pending.contact,
      passHash: pending.passHash,
      passSalt: pending.passSalt,
      created: pending.created,
      lastSeen: Date.now(),
      blocked: false,
      verified: true,
      emailVerified: id.startsWith("em:"),
      mobileVerified: id.startsWith("ph:"),
      status: "active",
      providers: pending.providers || ["password"]
    };
    const issued2 = await issueToken(env, rec);
    issued2.user = await fullUser(env, rec);
    return json(issued2);
  }
  if (purpose === "reset") {
    await env.PUB_KV.put("resetok:" + id, JSON.stringify({ at: Date.now() }), { expirationTtl: 600 });
    return json({ reset: true });
  }
  const u = await getUserById(env, id);
  if (!u) return json({ error: "\u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u09AA\u09BE\u0993\u09AF\u09BC\u09BE \u09AF\u09BE\u09AF\u09BC\u09A8\u09BF" }, 404);
  if (u.blocked || u.status === "disabled" || u.status === "suspended") return json({ error: "\u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u09AC\u09A8\u09CD\u09A7" }, 403);
  if (id.startsWith("em:")) u.emailVerified = true;
  if (id.startsWith("ph:")) u.mobileVerified = true;
  u.verified = true;
  const issued = await issueToken(env, u);
  issued.user = await fullUser(env, u);
  return json(issued);
};
var authLogin = async (request, env) => {
  const ip = request.headers.get("CF-Connecting-IP") || "ip";
  if (!await rateLimit(env, "login:" + ip, 2e3, 3600)) return json({ error: "\u098F\u0995\u099F\u09C1 \u09AA\u09B0\u09C7 \u0986\u09AC\u09BE\u09B0 \u099A\u09C7\u09B7\u09CD\u099F\u09BE \u0995\u09B0\u09CB" }, 429);
  const b = await request.json().catch(() => ({}));
  const id = normId(b.id);
  const u = await getUserById(env, id);
  if (!u || !u.passHash) return json({ error: "\u0987\u09AE\u09C7\u0987\u09B2/\u09AE\u09CB\u09AC\u09BE\u0987\u09B2 \u09AC\u09BE \u09AA\u09BE\u09B8\u0993\u09AF\u09BC\u09BE\u09B0\u09CD\u09A1 \u09AD\u09C1\u09B2" }, 401);
  if (u.blocked || u.status === "disabled" || u.status === "suspended") return json({ error: "\u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u09AC\u09A8\u09CD\u09A7" }, 403);
  const hp = await hashPassword(String(b.password || ""), u.passSalt);
  if (hp.hash !== u.passHash) return json({ error: "\u0987\u09AE\u09C7\u0987\u09B2/\u09AE\u09CB\u09AC\u09BE\u0987\u09B2 \u09AC\u09BE \u09AA\u09BE\u09B8\u0993\u09AF\u09BC\u09BE\u09B0\u09CD\u09A1 \u09AD\u09C1\u09B2" }, 401);
  const issued = await issueToken(env, u);
  issued.user = await fullUser(env, u);
  await logAct(env, u.id, "login", "\u09AA\u09BE\u09B8\u0993\u09AF\u09BC\u09BE\u09B0\u09CD\u09A1 \u09A6\u09BF\u09AF\u09BC\u09C7 \u09B2\u0997\u0987\u09A8 \u09B8\u09AB\u09B2");
  return json(issued);
};
var authLogout = async (request, env) => {
  const tok2 = String(request.headers.get("Authorization") || "").replace("Bearer ", "").trim();
  if (tok2) {
    const tr = JSON.parse(await env.PUB_KV.get("tok:" + tok2) || "null");
    await env.PUB_KV.delete("tok:" + tok2);
    if (tr && tr.id) await clearSession(env, tr.id, tok2);
  }
  return json({ ok: true });
};
var authGoogle = async (request, env) => {
  const b = await request.json().catch(() => ({}));
  if (!env.GOOGLE_CLIENT_ID) return json({ error: "Google \u09B2\u0997\u0987\u09A8 \u098F\u0996\u09A8 \u09B8\u09C7\u099F\u0986\u09AA \u09A8\u09C7\u0987" }, 503);
  const idToken = String(b.idToken || "");
  const accessToken = String(b.accessToken || b.access_token || "");
  let g = {};
  if (idToken) {
    const r = await fetch("https://oauth2.googleapis.com/tokeninfo?id_token=" + encodeURIComponent(idToken));
    g = await r.json().catch(() => ({}));
    if (!r.ok || !g.email) return json({ error: "Google \u09B2\u0997\u0987\u09A8 \u09AC\u09CD\u09AF\u09B0\u09CD\u09A5" }, 401);
    if (g.aud !== env.GOOGLE_CLIENT_ID) return json({ error: "Google \u0995\u09CD\u09B2\u09BE\u09AF\u09BC\u09C7\u09A8\u09CD\u099F \u09AE\u09BF\u09B2\u099B\u09C7 \u09A8\u09BE" }, 401);
  } else if (accessToken) {
    const r = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", { headers: { Authorization: "Bearer " + accessToken } });
    g = await r.json().catch(() => ({}));
    if (!r.ok || !g.email) return json({ error: "Google \u09B2\u0997\u0987\u09A8 \u09AC\u09CD\u09AF\u09B0\u09CD\u09A5" }, 401);
    const t = await fetch("https://oauth2.googleapis.com/tokeninfo?access_token=" + encodeURIComponent(accessToken));
    const info = await t.json().catch(() => ({}));
    if (info.aud && info.aud !== env.GOOGLE_CLIENT_ID) return json({ error: "Google \u0995\u09CD\u09B2\u09BE\u09AF\u09BC\u09C7\u09A8\u09CD\u099F \u09AE\u09BF\u09B2\u099B\u09C7 \u09A8\u09BE" }, 401);
  } else {
    return json({ error: "Google \u099F\u09CB\u0995\u09C7\u09A8 \u09A8\u09C7\u0987" }, 400);
  }
  const id = normId(g.email);
  const existing = JSON.parse(await env.PUB_KV.get("user:" + id) || "{}");
  if (existing.blocked || existing.status === "disabled" || existing.status === "suspended") return json({ error: "\u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u09AC\u09A8\u09CD\u09A7" }, 403);
  const rec = {
    id,
    uid: existing.uid || crypto.randomUUID(),
    name: String(b.name || g.name || existing.name || "Scholar").slice(0, 40),
    email: g.email,
    mobile: existing.mobile || "",
    contact: g.email,
    dob: String(b.dob || existing.dob || "").slice(0, 12),
    school: String(b.school || existing.school || "").slice(0, 80),
    college: String(b.college || existing.college || "").slice(0, 80),
    created: existing.created || Date.now(),
    lastSeen: Date.now(),
    blocked: false,
    verified: true,
    emailVerified: true,
    mobileVerified: !!existing.mobileVerified,
    status: "active",
    passHash: existing.passHash,
    passSalt: existing.passSalt,
    providers: Array.from(/* @__PURE__ */ new Set([...existing.providers || [], "google"]))
  };
  const issued = await issueToken(env, rec);
  issued.user = await fullUser(env, rec);
  return json(issued);
};
var authForgot = async (request, env) => {
  const ip = request.headers.get("CF-Connecting-IP") || "ip";
  const b = await request.json().catch(() => ({}));
  const id = normId(b.id);
  if (!id.startsWith("em:")) return json({ error: "\u09A8\u09BF\u09AC\u09A8\u09CD\u09A7\u09BF\u09A4 \u0987\u09AE\u09C7\u0987\u09B2 \u09A0\u09BF\u0995\u09BE\u09A8\u09BE \u09B2\u09BF\u0996\u09C1\u09A8" }, 400);
  const u = await getUserById(env, id);
  if (!u || u.status && u.status !== "active") return json({ error: "\u098F\u0987 \u0987\u09AE\u09C7\u0987\u09B2\u09C7 \u0995\u09CB\u09A8\u09CB \u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u09AA\u09BE\u0993\u09AF\u09BC\u09BE \u09AF\u09BE\u09AF\u09BC\u09A8\u09BF" }, 404);
  if (u.blocked || u.status === "disabled" || u.status === "suspended") return json({ error: "\u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u09AC\u09A8\u09CD\u09A7" }, 403);
  const otp = await issueOtp(env, id, "reset", ip);
  if (otp.error) return json({ error: otp.error, wait: otp.wait }, otp.status || 503);
  return json({ sent: true, channel: otp.channel, masked: otp.masked, wait: otp.wait, purpose: "reset", expiresIn: 120 });
};
var authReset = async (request, env) => {
  const b = await request.json().catch(() => ({}));
  const id = normId(b.id);
  const password = String(b.password || "");
  const weak = strongPass(password);
  if (weak) return json({ error: weak }, 400);
  if (b.confirm && b.confirm !== password) return json({ error: "\u09AA\u09BE\u09B8\u0993\u09AF\u09BC\u09BE\u09B0\u09CD\u09A1 \u09A6\u09C1\u099F\u09CB \u09AE\u09BF\u09B2\u099B\u09C7 \u09A8\u09BE" }, 400);
  const ok = JSON.parse(await env.PUB_KV.get("resetok:" + id) || "null");
  if (!ok) {
    const chk = await checkOtp(env, id, "reset", b.code);
    if (!chk.ok) return json({ error: chk.error || "\u0986\u0997\u09C7 \u0995\u09CB\u09A1 \u09AD\u09C7\u09B0\u09BF\u09AB\u09BE\u0987 \u0995\u09B0\u09CB" }, chk.status || 401);
  }
  const u = await getUserById(env, id);
  if (!u) return json({ error: "\u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u09AA\u09BE\u0993\u09AF\u09BC\u09BE \u09AF\u09BE\u09AF\u09BC\u09A8\u09BF" }, 404);
  const hp = await hashPassword(password);
  u.passHash = hp.hash;
  u.passSalt = hp.salt;
  await env.PUB_KV.delete("resetok:" + id);
  const issued = await issueToken(env, u);
  issued.user = await fullUser(env, u);
  return json(issued);
};
var authChangePassword = async (request, env, uid) => {
  const b = await request.json().catch(() => ({}));
  const u = await getUserById(env, uid);
  if (!u) return json({ error: "\u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u09AA\u09BE\u0993\u09AF\u09BC\u09BE \u09AF\u09BE\u09AF\u09BC\u09A8\u09BF" }, 404);
  if (u.passHash) {
    const hp = await hashPassword(String(b.current || ""), u.passSalt);
    if (hp.hash !== u.passHash) return json({ error: "\u09AC\u09B0\u09CD\u09A4\u09AE\u09BE\u09A8 \u09AA\u09BE\u09B8\u0993\u09AF\u09BC\u09BE\u09B0\u09CD\u09A1 \u09AD\u09C1\u09B2" }, 401);
  }
  const weak = strongPass(b.password);
  if (weak) return json({ error: weak }, 400);
  if (b.confirm && b.confirm !== b.password) return json({ error: "\u09AA\u09BE\u09B8\u0993\u09AF\u09BC\u09BE\u09B0\u09CD\u09A1 \u09A6\u09C1\u099F\u09CB \u09AE\u09BF\u09B2\u099B\u09C7 \u09A8\u09BE" }, 400);
  const np = await hashPassword(String(b.password));
  u.passHash = np.hash;
  u.passSalt = np.salt;
  await env.PUB_KV.put("user:" + u.id, JSON.stringify(u));
  await logAct(env, uid, "password", "\u09AA\u09BE\u09B8\u0993\u09AF\u09BC\u09BE\u09B0\u09CD\u09A1 \u09AA\u09B0\u09BF\u09AC\u09B0\u09CD\u09A4\u09A8 \u0995\u09B0\u09BE \u09B9\u09AF\u09BC\u09C7\u099B\u09C7");
  return json({ ok: true });
};
var authDelete = async (request, env, uid) => {
  const b = await request.json().catch(() => ({}));
  const u = await getUserById(env, uid);
  if (!u) return json({ error: "\u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u09AA\u09BE\u0993\u09AF\u09BC\u09BE \u09AF\u09BE\u09AF\u09BC\u09A8\u09BF" }, 404);
  if (u.passHash) {
    const hp = await hashPassword(String(b.password || ""), u.passSalt);
    if (hp.hash !== u.passHash) return json({ error: "\u09AA\u09BE\u09B8\u0993\u09AF\u09BC\u09BE\u09B0\u09CD\u09A1 \u09AD\u09C1\u09B2" }, 401);
  }
  await env.PUB_KV.delete("user:" + u.id);
  await env.PUB_KV.delete("profile:" + (u.uid || u.id));
  await env.PUB_KV.delete("ustate:" + u.id);
  await env.PUB_KV.delete("onb:" + u.id);
  await env.PUB_KV.delete("ach:" + u.id);
  await env.PUB_KV.delete("act:" + u.id);
  if (u.credId) await env.PUB_KV.delete("pkid:" + u.credId);
  const sessions = JSON.parse(await env.PUB_KV.get("sess:" + u.id) || "{}");
  for (const t of Object.keys(sessions || {})) await env.PUB_KV.delete("tok:" + t);
  await env.PUB_KV.delete("sess:" + u.id);
  const tok2 = String(request.headers.get("Authorization") || "").replace("Bearer ", "").trim();
  if (tok2) await env.PUB_KV.delete("tok:" + tok2);
  return json({ ok: true, deleted: true });
};
var UNI_CATALOG = [
  { id: "du", name: "\u09A2\u09BE\u0995\u09BE \u09AC\u09BF\u09B6\u09CD\u09AC\u09AC\u09BF\u09A6\u09CD\u09AF\u09BE\u09B2\u09AF\u09BC", nameEn: "University of Dhaka", short: "DU", units: ["A", "B", "C", "D"] },
  { id: "cu", name: "\u099A\u099F\u09CD\u099F\u0997\u09CD\u09B0\u09BE\u09AE \u09AC\u09BF\u09B6\u09CD\u09AC\u09AC\u09BF\u09A6\u09CD\u09AF\u09BE\u09B2\u09AF\u09BC", nameEn: "University of Chittagong", short: "CU", units: ["A", "B", "C", "D"] },
  { id: "ru", name: "\u09B0\u09BE\u099C\u09B6\u09BE\u09B9\u09C0 \u09AC\u09BF\u09B6\u09CD\u09AC\u09AC\u09BF\u09A6\u09CD\u09AF\u09BE\u09B2\u09AF\u09BC", nameEn: "University of Rajshahi", short: "RU", units: ["A", "B", "C", "D"] },
  { id: "ju", name: "\u099C\u09BE\u09B9\u09BE\u0999\u09CD\u0997\u09C0\u09B0\u09A8\u0997\u09B0 \u09AC\u09BF\u09B6\u09CD\u09AC\u09AC\u09BF\u09A6\u09CD\u09AF\u09BE\u09B2\u09AF\u09BC", nameEn: "Jahangirnagar University", short: "JU", units: ["A", "B", "C", "D"] },
  { id: "ku", name: "\u0996\u09C1\u09B2\u09A8\u09BE \u09AC\u09BF\u09B6\u09CD\u09AC\u09AC\u09BF\u09A6\u09CD\u09AF\u09BE\u09B2\u09AF\u09BC", nameEn: "Khulna University", short: "KU", units: ["A", "B", "C", "D"] },
  { id: "cou", name: "\u0995\u09C1\u09AE\u09BF\u09B2\u09CD\u09B2\u09BE \u09AC\u09BF\u09B6\u09CD\u09AC\u09AC\u09BF\u09A6\u09CD\u09AF\u09BE\u09B2\u09AF\u09BC", nameEn: "Comilla University", short: "CoU", units: ["A", "B", "C"] },
  { id: "other", name: "\u0985\u09A8\u09CD\u09AF\u09BE\u09A8\u09CD\u09AF", nameEn: "Other", short: "OTH", units: ["A", "B", "C", "D"] }
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
    university: (o.targetUniversities || [])[0] || "",
    units: o.targetUnits || [],
    goal: o.goal || "",
    studyGoal: o.studyGoal || ""
  };
}
function sanitizeOnboard(b) {
  const o = b && typeof b === "object" ? b : {};
  const arr = (x, n) => (Array.isArray(x) ? x : []).map((s) => String(s || "").trim().slice(0, 80)).filter(Boolean).slice(0, n);
  const out = {
    step: Math.max(1, Math.min(10, Number(o.step) || 1)),
    completed: !!o.completed,
    goal: String(o.goal || "").slice(0, 24),
    targetUniversities: arr(o.targetUniversities, 8),
    targetUniversityIds: arr(o.targetUniversityIds, 8),
    targetUnits: arr(o.targetUnits, 8),
    studyGoal: String(o.studyGoal || "").slice(0, 24),
    currentLevel: Math.max(0, Math.min(100, Number(o.currentLevel) || 0)),
    weakSubjects: arr(o.weakSubjects, 12),
    dailyHours: Math.max(1, Math.min(5, Number(o.dailyHours) || 2)),
    weeklyDays: Math.max(1, Math.min(7, Number(o.weeklyDays) || 5)),
    preferredTime: String(o.preferredTime || "flexible").slice(0, 24)
  };
  if (out.completed) out.plan = buildOnboardPlan(out);
  else if (o.plan && typeof o.plan === "object") out.plan = o.plan;
  return out;
}
var onboardingGet = async (request, env, uid) => {
  const u = await getUserById(env, uid);
  if (!u) return json({ error: "\u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u09AA\u09BE\u0993\u09AF\u09BC\u09BE \u09AF\u09BE\u09AF\u09BC\u09A8\u09BF" }, 404);
  const pf = await loadProfile(env, u.uid || u.id);
  return json({ onboarding: pf.onboarding || { completed: false, step: 1 } });
};
var onboardingPut = async (request, env, uid) => {
  const u = await getUserById(env, uid);
  if (!u) return json({ error: "\u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u09AA\u09BE\u0993\u09AF\u09BC\u09BE \u09AF\u09BE\u09AF\u09BC\u09A8\u09BF" }, 404);
  const pf = await loadProfile(env, u.uid || u.id);
  pf.onboarding = sanitizeOnboard(await request.json().catch(() => ({})));
  if (pf.onboarding.completed) {
    if (pf.onboarding.targetUniversities[0]) pf.targetUniversity = pf.onboarding.targetUniversities[0];
    if (pf.onboarding.targetUnits[0]) pf.targetUnit = pf.onboarding.targetUnits.join(",");
  }
  await saveProfile(env, u.uid || u.id, pf);
  return json({ onboarding: pf.onboarding, user: await fullUser(env, u) });
};
var onboardingCatalog = async (env) => {
  let extra = [];
  try {
    extra = JSON.parse(await env.PUB_KV.get("onboardCatalog") || "[]");
  } catch (_) {
  }
  const list = UNI_CATALOG.slice();
  (Array.isArray(extra) ? extra : []).forEach((u) => {
    if (u && u.id && u.name && !list.some((x) => x.id === u.id)) list.push({ id: String(u.id).slice(0, 24), name: String(u.name).slice(0, 80), short: String(u.short || u.id).slice(0, 8), units: Array.isArray(u.units) && u.units.length ? u.units.map((x) => String(x).slice(0, 8)) : ["A", "B", "C", "D"] });
  });
  return json({ universities: list });
};
var profilePut = async (request, env, uid) => {
  const u = await getUserById(env, uid);
  if (!u) return json({ error: "\u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u09AA\u09BE\u0993\u09AF\u09BC\u09BE \u09AF\u09BE\u09AF\u09BC\u09A8\u09BF" }, 404);
  const b = await request.json().catch(() => ({}));
  const pf = await loadProfile(env, u.uid || u.id);
  const fields = ["displayName", "institution", "targetUniversity", "targetUnit", "admissionYear", "bio", "dob", "gender", "studyGroup"];
  for (const f of fields) if (b[f] !== void 0) pf[f] = String(b[f] || "").slice(0, f === "bio" ? 200 : 80);
  if (b.name) {
    u.name = String(b.name).slice(0, 40);
    await env.PUB_KV.put("user:" + u.id, JSON.stringify(u));
  }
  const wantEmail = b.email !== void 0 ? String(b.email || "").trim().toLowerCase() : void 0;
  const wantMobile = b.mobile !== void 0 ? String(b.mobile || "").trim() : void 0;
  const emailChange = wantEmail !== void 0 && wantEmail !== String(u.email || "").toLowerCase();
  const mobileChange = wantMobile !== void 0 && wantMobile !== String(u.mobile || "");
  if (emailChange || mobileChange) {
    if (!u.passHash) return json({ error: "\u09AA\u09BE\u09B8\u0993\u09AF\u09BC\u09BE\u09B0\u09CD\u09A1 \u09B8\u09C7\u099F \u09A8\u09BE \u09A5\u09BE\u0995\u09BE\u09AF\u09BC \u09AA\u09B0\u09BF\u099A\u09BF\u09A4\u09BF \u09AC\u09A6\u09B2\u09BE\u09A8\u09CB \u09AF\u09BE\u09AC\u09C7 \u09A8\u09BE" }, 400);
    const hp = await hashPassword(String(b.password || ""), u.passSalt);
    if (hp.hash !== u.passHash) return json({ error: "\u09A8\u09BF\u09B6\u09CD\u099A\u09BF\u09A4 \u0995\u09B0\u09A4\u09C7 \u09AA\u09BE\u09B8\u0993\u09AF\u09BC\u09BE\u09B0\u09CD\u09A1 \u09A6\u09BE\u0993 \u2014 \u09AD\u09C1\u09B2 \u09B9\u09AF\u09BC\u09C7\u099B\u09C7" }, 401);
    if (emailChange) {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(wantEmail)) return json({ error: "\u0987\u09AE\u09C7\u0987\u09B2 \u09A0\u09BF\u0995\u09BE\u09A8\u09BE \u09A0\u09BF\u0995 \u09A8\u09AF\u09BC" }, 400);
      const exists = await getUserById(env, "em:" + wantEmail);
      if (exists && exists.id !== u.id) return json({ error: "\u098F\u0987 \u0987\u09AE\u09C7\u0987\u09B2\u09C7 \u0986\u0997\u09C7 \u09A5\u09C7\u0995\u09C7\u0987 \u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u0986\u099B\u09C7" }, 409);
      delete u.emailVerified;
      u.email = wantEmail;
    }
    if (mobileChange) {
      if (!/^[+\d][\d\s\-]{5,17}$/.test(wantMobile)) return json({ error: "\u09AE\u09CB\u09AC\u09BE\u0987\u09B2 \u09A8\u09AE\u09CD\u09AC\u09B0 \u09A0\u09BF\u0995 \u09A8\u09AF\u09BC" }, 400);
      const exists = await getUserById(env, "ph:" + wantMobile);
      if (exists && exists.id !== u.id) return json({ error: "\u098F\u0987 \u09A8\u09AE\u09CD\u09AC\u09B0\u09C7 \u0986\u0997\u09C7 \u09A5\u09C7\u0995\u09C7\u0987 \u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u0986\u099B\u09C7" }, 409);
      delete u.mobileVerified;
      u.mobile = wantMobile;
    }
    await env.PUB_KV.put("user:" + u.id, JSON.stringify(u));
    await logAct(env, uid, "contact", "\u0987\u09AE\u09C7\u0987\u09B2/\u09AE\u09CB\u09AC\u09BE\u0987\u09B2 \u0986\u09AA\u09A1\u09C7\u099F (\u09AA\u09BE\u09B8\u0993\u09AF\u09BC\u09BE\u09B0\u09CD\u09A1 \u09A6\u09BF\u09AF\u09BC\u09C7 \u09A8\u09BF\u09B6\u09CD\u099A\u09BF\u09A4)");
  }
  await saveProfile(env, u.uid || u.id, pf);
  return json({ user: await fullUser(env, u) });
};
var profilePhoto = async (request, env, uid) => {
  const u = await getUserById(env, uid);
  if (!u) return json({ error: "\u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u09AA\u09BE\u0993\u09AF\u09BC\u09BE \u09AF\u09BE\u09AF\u09BC\u09A8\u09BF" }, 404);
  const b = await request.json().catch(() => ({}));
  const pf = await loadProfile(env, u.uid || u.id);
  if (b.remove) {
    delete pf.photo;
    await saveProfile(env, u.uid || u.id, pf);
    return json({ user: await fullUser(env, u) });
  }
  const dataUrl = String(b.dataUrl || "");
  if (!dataUrl.startsWith("data:image/")) return json({ error: "\u09B6\u09C1\u09A7\u09C1 \u099B\u09AC\u09BF \u0986\u09AA\u09B2\u09CB\u09A1 \u0995\u09B0\u09CB" }, 400);
  if (dataUrl.length > 22e4) return json({ error: "\u099B\u09AC\u09BF Compact \u0995\u09B0\u09C7 \u0986\u09AC\u09BE\u09B0 \u09A6\u09BE\u0993" }, 400);
  pf.photo = dataUrl;
  await saveProfile(env, u.uid || u.id, pf);
  return json({ user: await fullUser(env, u) });
};
var authUser = async (request, env) => {
  const tok2 = String(request.headers.get("Authorization") || "").replace("Bearer ", "").trim();
  const tr = JSON.parse(await env.PUB_KV.get("tok:" + tok2) || "null");
  if (!tr) throw Object.assign(new Error("\u0986\u0997\u09C7 \u09B2\u0997\u0987\u09A8 \u0995\u09B0\u09CB"), { status: 401 });
  const u = JSON.parse(await env.PUB_KV.get("user:" + tr.id) || "{}");
  if (u.blocked || u.status === "disabled" || u.status === "suspended") throw Object.assign(new Error("\u0985\u09CD\u09AF\u09BE\u0995\u09BE\u0989\u09A8\u09CD\u099F \u09AC\u09A8\u09CD\u09A7 \u0995\u09B0\u09BE \u09B9\u09AF\u09BC\u09C7\u099B\u09C7"), { status: 403 });
  try {
    await env.PUB_KV.put("tok:" + tok2, JSON.stringify({ id: tr.id, at: tr.at || Date.now(), lastSeen: Date.now() }), { expirationTtl: 31536e3 });
    await trackSession(env, tr.id, tok2, request.headers.get("User-Agent") || "");
  } catch (_) {
  }
  return tr.id;
};
var touchUser = async (env, id) => {
  const u = JSON.parse(await env.PUB_KV.get("user:" + id) || "{}");
  if (u.id) {
    u.lastSeen = Date.now();
    await env.PUB_KV.put("user:" + id, JSON.stringify(u));
  }
};
var tok = (s) => String(s || "").toLowerCase().split(/[^\p{L}\p{M}\p{N}]+/u).filter((t) => t.length > 2).slice(0, 24);
var bankMatch = (qs, text) => {
  const tk = tok(text);
  if (tk.length < 2) return [];
  return qs.map((q) => {
    const hay = String(q.q || "").toLowerCase();
    let sc = 0;
    for (const t of tk) if (hay.includes(t)) sc++;
    return { q, sc };
  }).filter((x) => x.sc >= Math.max(2, Math.ceil(tk.length * 0.4))).sort((a, b) => b.sc - a.sc).slice(0, 6);
};
/* ═══════════ PHASE 4 — AI CONTEXT ENGINE (v179) ═══════════
   Secure server-side AI — কোনো ক্লায়েন্ট key নেই, cross-user data বন্ধ।
   Layers: SYSTEM → GLOBAL(admin+app) → USER(uid-only, relevant) → REQUEST */
var AIN = (n) => String(n).replace(/\d/g, (d) => "০১২৩৪৫৬৭৮৯"[d]);
var AI_APP_TXT = "Admission Hub — বাংলাদেশের বিশ্ববিদ্যালয় ভর্তি প্রস্তুতির অ্যাপ (প্রশ্ন ব্যাংক, মক/ফ্ল্যাশ পরীক্ষা, ভুলের খাতা ও বিশ্লেষণ, ভোকাবুলারি, ৯০ দিনের রুটিন, প্রগ্রেস ট্র্যাকিং)। মালিক: জনাব Rashel Zayan Sir।";
function aiWorstTopics(C, st) {
  const counts = {};
  const exams = Array.isArray(st.examResults) ? st.examResults : [];
  exams.forEach(r => (Array.isArray(r.snapshot) ? r.snapshot : []).forEach(q => {
    const k = q.topicId || q.t || "অজানা";
    counts[k] = counts[k] || { total: 0, wrong: 0, missed: 0 };
    counts[k].total++;
    if (q.status === "wrong") counts[k].wrong++;
  }));
  (Array.isArray(st.mistakes) ? st.mistakes : []).forEach(m => {
    const k = m.topicId || m.t || "অজানা";
    counts[k] = counts[k] || { total: 0, wrong: 0, missed: 0 };
    counts[k].missed += Number(m.wrongCount || 1);
  });
  const nm = (k) => { const t = (C.topics || []).find(x => String(x.id) === String(k)); return t ? (t.name || t.n || k) : k; };
  return Object.keys(counts).map(k => Object.assign({ k, name: nm(k) }, counts[k]))
    .sort((a, b) => ((b.wrong + b.missed) - (a.wrong + a.missed))).slice(0, 6);
}
function aiTrend(exams) {
  const arr = [...(Array.isArray(exams) ? exams : [])]
    .sort((a, b) => Number(a.date || 0) - Number(b.date || 0)).slice(-8);
  return arr.map(r => {
    const total = Number(r.total || r.totalQuestions || 0);
    const right = Number(r.correct != null ? r.correct : r.right || 0);
    return {
      d: r.date ? new Date(r.date).toLocaleDateString("bn-BD", { timeZone: "Asia/Dhaka" }) : "?",
      mode: r.mode || "exam",
      total, right, wrong: Number(r.wrong || 0), skipped: Number(r.skipped || 0),
      acc: total ? Math.round((right / total) * 100) : 0
    };
  });
}
function aiFindQ(C, id) {
  const q = (C.questions || []).find(x => String(x.id) === String(id));
  if (!q) return null;
  const sub = (C.subjects || []).find(x => String(x.id) === String(q.subjectId || q.sb));
  const top = (C.topics || []).find(x => String(x.id) === String(q.topicId || q.t));
  return { q: q.q || q.text, o: q.o || q.options || [], a: q.a != null ? q.a : q.answerIndex,
    ex: q.e || q.ex || q.explanation || "", sub: sub ? (sub.name || sub.n) : (q.s || ""), top: top ? (top.name || top.n) : (q.t || "") };
}
function aiFindVocab(C, word) {
  const list = C.vocabulary || [];
  const w = String(word || "").trim().toLowerCase();
  const hit = list.find(v => String(v.w || v.word || "").toLowerCase() === w)
    || list.find(v => String(v.w || v.word || "").toLowerCase().includes(w))
    || list.find(v => String(v.m || v.meaning || "").toLowerCase().includes(w));
  if (!hit) return null;
  return { w: hit.w || hit.word, m: hit.m || hit.meaning || "", syn: hit.syn || hit.synonyms || "", ant: hit.ant || hit.antonyms || "", pos: hit.pos || hit.p || "" };
}
async function aiBuildBrain(env, uid, kind, refs, lastUser, C, st) {
  const P = [];
  const exams = Array.isArray(st.examResults) ? st.examResults : [];
  const mis = Array.isArray(st.mistakes) ? st.mistakes : [];
  const acts = Array.isArray(st.activityLogs) ? st.activityLogs : [];
  const daily = Array.isArray(st.dailyStats) ? st.dailyStats : [];
  const vocab = Array.isArray(st.vocabulary) ? st.vocabulary : [];
  P.push(`[অ্যাপ-জ্ঞান] ${AI_APP_TXT}`);
  try {
    const urec = JSON.parse(await env.PUB_KV.get("user:" + uid) || "null");
    if (urec && (urec.name || urec.displayName)) P.push(`[ইউজার-নাম] ${String(urec.name || urec.displayName).slice(0, 30)}`);
  } catch (_) {}
  const subs = [...new Set((C.questions || []).map(q => q.s).filter(Boolean))];
  P.push(`[গ্লোবাল] প্রশ্ন ব্যাংক: ${AIN((C.questions || []).length)}টি (${subs.slice(0, 8).join(", ") || "—"}) · শব্দভান্ডার: ${AIN((C.vocabulary || []).length)}টি · বিষয়: ${AIN((C.subjects || []).length)} · টপিক: ${AIN((C.topics || []).length)}`);
  const adminInstr = String(C.adminInstruction || C.adminNotes || "").slice(0, 900);
  if (adminInstr) P.push(`[অ্যাডমিন নির্দেশ] ${adminInstr}`);
  /* — USER (শুধু uid-এর নিজের ডেটা; relevant) — */
  if (exams.length) {
    const tr = aiTrend(exams);
    P.push(`[ইউজার-পরীক্ষা] মোট ${AIN(exams.length)}টি। সাম্প্রতিক: ` + tr.slice(-5).map(x => `${x.d} ${x.mode}: ${AIN(x.right)}/${AIN(x.total)} (${AIN(x.acc)}%)`)
      + (tr.length > 5 ? ` · গড় সঠিকতা: ${AIN(Math.round(tr.reduce((s, x) => s + x.acc, 0) / tr.length))}%` : ""));
  } else P.push("[ইউজার-পরীক্ষা] এখনো কোনো পরীক্ষা জমা হয়নি।");
  if (mis.length) {
    const bySub = {};
    mis.forEach(m => { const k = m.subjectId || m.s || "অন্যান্য"; bySub[k] = (bySub[k] || 0) + Number(m.wrongCount || 1); });
    P.push(`[ইউজার-ভুল] ${AIN(mis.length)}টি ভুল এন্ট্রি — বিষয়ভিত্তিক: ` + Object.keys(bySub).slice(0, 5).map(k => `${k}: ${AIN(bySub[k])}`).join(", "));
  }
  const worst = aiWorstTopics(C, st);
  if (worst.length) P.push("[ইউজার-দুর্বল-টপিক] " + worst.map(w => `${w.name} (${AIN(w.wrong)} ভুল + ${AIN(w.missed)} মিস)`).join(", "));
  if (vocab.length) P.push(`[ইউজার-শব্দ] শেখা: ${AIN(vocab.length)}টি — সাম্প্রতিক: ${vocab.slice(-6).map(v => v.w || v.word).join(", ")}`);
  if (daily.length) {
    const last7 = daily.filter(d => Date.now() - Number(d.id || d.date || 0) < 7 * 864e5);
    P.push(`[ইউজার-প্রগ্রেস] গত ৭ দিনে ${AIN(last7.length)} দিনের অ্যাক্টিভিটি` + (last7.length ? ` (মোট সময় ~${AIN(Math.round(last7.reduce((s, d) => s + Number(d.timeMs || 0), 0) / 6e4))} মিনিট)` : ""));
  }
  if (acts.length) P.push("[ইউজার-সাম্প্রতিক-অ্যাক্টিভিটি] " + acts.slice(-4).map(a => String(a.a || a.action || a.msg || "").slice(0, 60)).filter(Boolean).join(" · "));
  if (notes.length) P.push(`[ইউজার-নোট] ${AIN(notes.length)}টি নোট আছে।`);
  /* — kind-ভিত্তিক exact refs — */
  if (kind === "explain" && refs && refs.questionId) {
    const q = aiFindQ(C, refs.questionId);
    if (q) {
      P.push(`[প্রশ্ন-কনটেক্সট] "${q.q}"`);
      if (q.o && q.o.length) P.push(`অপশন: ` + q.o.map((o, i) => `${"ক খ গ ঘ"[i] || (i + 1)}) ${o}`).join(" | "));
      if (q.a != null && q.o && q.o[q.a]) P.push(`সঠিক উত্তর: ${q.o[q.a]}`);
      if (q.ex) P.push(`ব্যাখ্যা: ${q.ex}`);
      if (q.sub || q.top) P.push(`বিষয়: ${q.sub} · টপিক: ${q.top}`);
    }
  }
  if (kind === "vocab" && refs && refs.word) {
    const v = aiFindVocab(C, refs.word);
    if (v) P.push(`[শব্দ-কনটেক্সট] ${v.w} — ${v.m}` + (v.syn ? ` · সমার্থক: ${v.syn}` : "") + (v.ant ? ` · বিপরীত: ${v.ant}` : "") + (v.pos ? ` · ${v.pos}` : ""));
  }
  if (kind === "exam" && refs && refs.examId) {
    const r = (exams).find(x => String(x.id) === String(refs.examId));
    if (r) {
      const total = Number(r.total || r.totalQuestions || 0);
      P.push(`[পরীক্ষা-কনটেক্সট] ${r.mode || "exam"} · মোট ${AIN(total)} · সঠিক ${AIN(r.correct != null ? r.correct : r.right || 0)} · ভুল ${AIN(r.wrong || 0)} · বাদ ${AIN(r.skipped || 0)} · সময় ${AIN(Math.round(Number(r.timeUsed || r.timeMs || 0) / 6e4))} মিনিট`);
    }
  }
  return P.filter(Boolean).join("\n").slice(0, 6000);
}
var aiCall = async (request, env, uid) => {
  const b = await request.json().catch(() => ({}));
  const kind = String(b.kind || "chat").slice(0, 20);
  const refs = (b.refs && typeof b.refs === "object") ? b.refs : {};
  const msgs = (Array.isArray(b.messages) ? b.messages : []).slice(-8).map((m) => {
    const parts = [{ text: String(m.content || "").slice(0, 4e3) }];
    (Array.isArray(m.attachments) ? m.attachments.slice(0, 4) : []).forEach((a) => {
      if (a && a.data) parts.push({ inline_data: { mime_type: String(a.mime || "image/jpeg").slice(0, 60), data: String(a.data).slice(0, 4e6) } });
    });
    return { role: (String(m.role || "user") === "user" ? "user" : "model"), parts };
  });
  const lastU = [...msgs].reverse().find((m) => m.role === "user");
  const lastTxt = (Array.isArray(b.messages) ? b.messages : []).reverse().find((m) => String(m.role || "user") === "user") ? String((Array.isArray(b.messages) ? b.messages : []).reverse().find((m) => String(m.role || "user") === "user").content || "") : "";
  const cacheKey = "aicache:" + uid + ":" + kind + ":" + (refs.questionId || refs.word || refs.examId || "") + ":" + lastTxt.slice(0, 120);
  /* rate limit — প্রতি মিনিটে ১২ রিকোয়েস্ট */
  const minute = Math.floor(Date.now() / 6e4);
  const limKey = "ailim:" + uid + ":" + minute;
  let lim = 0;
  try { lim = Number(await env.PUB_KV.get(limKey) || 0); } catch (_) {}
  if (lim >= 12) return json({ error: "একটু ধীরে — প্রতি মিনিটে ১২টির বেশি AI উত্তর নয় 😊", retryAfter: 45 }, 429);
  await env.PUB_KV.put(limKey, String(lim + 1), { expirationTtl: 150 });
  /* user-chat history (per-user, isolated) */
  let hist = [];
  try { hist = JSON.parse(await env.PUB_KV.get("achat:" + uid) || "[]"); } catch (_) {}
  if (!Array.isArray(hist)) hist = [];
  const [contentRaw, stRaw] = await Promise.all([env.PUB_KV.get("pubContent"), env.PUB_KV.get("ustate:" + uid)]);
  const C = contentRaw ? JSON.parse(contentRaw) : { questions: [], vocabulary: [], subjects: [], topics: [] };
  const st = stRaw ? JSON.parse(stRaw) : {};
  await env.PUB_KV.put(limKey, String(lim + 1), { expirationTtl: 150 });
  const keys2 = String(env.GEMINI_KEYS || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!keys2.length) return json({ error: "AI-key কনফিগার নেই (admin)" }, 503);
  /* cache READ — একই uid+প্রশ্ন ১০ মিনিটে আবার কল হয় না (কোস্ট কন্ট্রোল) */
  try {
    const hit = JSON.parse(await env.PUB_KV.get(cacheKey) || "null");
    if (hit && hit.text) return json({ text: hit.text, model: hit.model, at: Date.now(), cached: true, history: hist.slice(-20) });
  } catch (_) {}
  /* — 🎨 চিত্র তৈরি (একই secure পথ, কোনো ক্লায়েন্ট key নেই) — */
  if (kind === "image") {
    const raw = String(refs.text || lastTxt || "তুমি যা চাইছ এঁকে দেখাও").slice(0, 1200);
    const parts = [{ text: raw }];
    (Array.isArray(refs.attachments) ? refs.attachments.slice(0, 4) : []).forEach(att => {
      if (att && att.data) parts.push({ inline_data: { mime_type: String(att.mime || "image/jpeg"), data: String(att.data).slice(0, 4e6) } });
    });
    let last2 = "";
    for (const k of keys2) {
      try {
        const ctrl = new AbortController(); const to = setTimeout(() => ctrl.abort(), 60000);
        const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image:generateContent", { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": k }, signal: ctrl.signal, body: JSON.stringify({ contents: [{ role: "user", parts }] }) });
        clearTimeout(to);
        const d = await r.json().catch(() => ({}));
        const b64 = (d?.candidates?.[0]?.content?.parts || []).map(p => p.inlineData && p.inlineData.data).filter(Boolean)[0];
        if (r.ok && b64) { await touchUser(env, uid); return json({ b64, mime: "image/png" }); }
        last2 = "HTTP " + r.status;
      } catch (e) { last2 = String(e.message || e); }
    }
    return json({ error: "ছবি আঁকতে সমস্যা — একটু পরে (" + String(last2).slice(0, 80) + ")" }, 502);
  }
  let brain = "";
  try { brain = await aiBuildBrain(env, uid, kind, refs, lastTxt, C, st); } catch (_) {}
  /* cache — একই uid+প্রশ্ন ১০ মিনিট */
  const sysTxt = SYS(true) + "\n\n[লাইভ-মেমোরি]\n" + brain;
  let last = "";
  for (const k of keys2) for (const m of GEM_CHAIN) {
    try {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 45000);
      const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + m + ":generateContent", { method: "POST", headers: { "Content-Type": "application/json", "x-goog-api-key": k }, signal: ctrl.signal, body: JSON.stringify({ system_instruction: { parts: [{ text: sysTxt }] }, contents: msgs.length ? msgs : [{ role: "user", parts: [{ text: "হ্যালো" }] }] }) });
      clearTimeout(to);
      const d = await r.json().catch(() => ({}));
      const t = String(d?.candidates?.[0]?.content?.parts?.map((x) => x.text || "").join("") || "").trim();
      if (r.ok && t) {
        try { await env.PUB_KV.put(cacheKey, JSON.stringify({ text: t, model: m, at: Date.now() }), { expirationTtl: 600 }); } catch (_) {}
        hist.push({ r: "u", t: lastTxt.slice(0, 600), at: Date.now() });
        hist.push({ r: "a", t: t.slice(0, 1200), at: Date.now() });
        try { await env.PUB_KV.put("achat:" + uid, JSON.stringify(hist.slice(-40)), { expirationTtl: 31536e3 }); } catch (_) {}
        await touchUser(env, uid);
        return json({ text: t, model: m, at: Date.now(), history: hist.slice(-20) });
      }
      last = (String(last).slice(0, 0) ? last + " ⏐ " : "") + "HTTP " + r.status + " " + m + " :: " + String((d && (d.error && d.error.message || d.promptFeedback && d.promptFeedback.blockReason)) || "" + (d && d.promptFeedback && d.promptFeedback.blockReason) || "").slice(0, 150);
      if (r.status === 429) await new Promise((res) => setTimeout(res, 650));
    } catch (e) { last = String(e.message || e); }
  }
  return json({ error: "AI এখন ব্যস্ত — একটু পরে চেষ্টা করো (" + last.slice(0, 90) + ")" }, 502);
};

var admin = async (request, env, p) => {
  const t = String(request.headers.get("Authorization") || "").replace("Bearer ", "").trim();
  if (!env.ADMIN_TOKEN || t !== env.ADMIN_TOKEN) return json({ error: "forbidden" }, 403);
  if (p === "/api/admin/content" && request.method === "GET") {
    const raw = await env.PUB_KV.get("pubContent");
    return json(raw ? JSON.parse(raw) : { v: 0, questions: [], vocabulary: [], exams: [] });
  }
  if (p === "/api/admin/users" && request.method === "GET") {
    const out = [];
    const lst = await env.PUB_KV.list({ prefix: "user:" });
    for (const k of lst.keys) {
      const u = JSON.parse(await env.PUB_KV.get(k.name) || "{}");
      const st = JSON.parse(await env.PUB_KV.get("ustate:" + u.id) || "{}");
      out.push({ id: u.id, uid: u.uid || u.id, name: u.name, contact: u.contact, created: u.created, lastSeen: u.lastSeen, blocked: !!u.blocked, verified: !!u.verified, status: u.status || (u.blocked ? "disabled" : "active"), exams: (st.examResults || st.attempts || []).length, mistakes: (st.mistakes || []).length });
    }
    out.sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));
    return json({ users: out });
  }
  if (p === "/api/admin/user" && request.method === "GET") {
    const id = new URL(request.url).searchParams.get("id") || "";
    return json(JSON.parse(await env.PUB_KV.get("ustate:" + id) || "null"));
  }
  if (p === "/api/admin/block" && request.method === "POST") {
    const b = await request.json().catch(() => ({}));
    const id = String(b.id || "");
    const u = JSON.parse(await env.PUB_KV.get("user:" + id) || "null");
    if (!u) return json({ error: "user-not-found" }, 404);
    u.blocked = !!b.blocked;
    await env.PUB_KV.put("user:" + id, JSON.stringify(u));
    return json({ ok: true, blocked: u.blocked });
  }
  if (p === "/api/admin/status" && request.method === "POST") {
    const b = await request.json().catch(() => ({}));
    const id = String(b.id || "");
    const u = JSON.parse(await env.PUB_KV.get("user:" + id) || "null");
    if (!u) return json({ error: "user-not-found" }, 404);
    const status = String(b.status || "active");
    if (!["active", "disabled", "suspended"].includes(status)) return json({ error: "bad-status" }, 400);
    u.status = status;
    u.blocked = status !== "active";
    await env.PUB_KV.put("user:" + id, JSON.stringify(u));
    return json({ ok: true, status: u.status });
  }
  if (p === "/api/admin/publish" && request.method === "POST") {
    const b = await request.json().catch(() => ({}));
    let full = b.full && typeof b.full === "object" ? b.full : null;
    if (b.pull) {
      const raw = env.OLD_KV ? await env.OLD_KV.get("userBank") : null;
      const bank = raw ? JSON.parse(raw) : {};
      if (bank.full && typeof bank.full === "object") full = bank.full;
    }
    if (!full && Array.isArray(b.subjects) && Array.isArray(b.questions)) {
      full = { subjects: b.subjects, topics: b.topics, questions: b.questions, vocabulary: b.vocabulary, vocabularyMaster: b.vocabularyMaster };
    }
    if (full && Array.isArray(full.questions) && full.questions.some((q) => q && q.id)) {
      const result = await publishGlobal(env, full);
      if (result.error === "empty") return json({ error: "\u09AA\u09CD\u09B0\u09B6\u09CD\u09A8 \u0996\u09BE\u09B2\u09BF" }, 400);
      return json(result);
    }
    return json({ error: "\u09AA\u09CD\u09B0\u09B6\u09CD\u09A8 \u0996\u09BE\u09B2\u09BF" }, 400);
  }
  return json({ error: "not-found" }, 404);
};

// gk-agent-worker.js
var APP_HEADER = "admission-hub";
var BU_BASE = "https://api.browser-use.com/api/v2";
var POLL_EVERY_MS = 3e4;
var POLL_MAX_MS = 15 * 6e4;
var GK_SCHEMA = {
  type: "object",
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          q: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          answer: { type: "string" },
          explain: { type: "string" },
          source: { type: "string" }
        },
        required: ["q", "options", "answer"]
      }
    }
  },
  required: ["questions"]
};
var NEWS_SCHEMA = {
  type: "object",
  properties: {
    news: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          date: { type: "string" },
          summary: { type: "string" },
          source: { type: "string" },
          url: { type: "string" }
        },
        required: ["title", "summary"]
      }
    }
  },
  required: ["news"]
};
var cors = (request) => {
  const origin = request.headers.get("Origin") || "";
  const ok = /^https:\/\/([a-z0-9-]+\.)?github\.io$/.test(origin) || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) || /^https:\/\/[a-z0-9-]+\.e2b\.app$/.test(origin);
  const headers = { "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type, X-AH-App", "Access-Control-Max-Age": "86400" };
  if (ok) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
};
var json2 = (request, obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...cors(request) } });
var dhakaToday = () => new Date(Date.now() + 6 * 36e5).toISOString().slice(0, 10);
var sleep = (ms) => new Promise((r) => setTimeout(r, ms));
var keys = (env) => String(env.BROWSER_USE_API_KEYS || "").split(",").map((k) => k.trim()).filter(Boolean);
var badKeysToday = async (env, date, ns = "gk") => {
  try {
    return JSON.parse(await env.GK_KV.get(`badKeys:${date}:${ns}`) || "[]");
  } catch (_) {
    return [];
  }
};
var markBad = async (env, date, index, ns = "gk") => {
  try {
    const bad = await badKeysToday(env, date);
    if (!bad.includes(index)) {
      bad.push(index);
      await env.GK_KV.put(`badKeys:${date}:${ns}`, JSON.stringify(bad));
    }
  } catch (_) {
  }
};
var tryCreate = async (key, body) => {
  try {
    const resp = await fetch(`${BU_BASE}/tasks`, {
      method: "POST",
      headers: { "X-Browser-Use-API-Key": key, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    if (resp.status === 401 || resp.status === 402) return { dead: true };
    if (resp.status === 429) return { busy: true };
    if (!resp.ok) return { error: "http-" + resp.status };
    const data = await resp.json();
    return data?.id ? { id: data.id } : { error: "no-id" };
  } catch (_) {
    return { error: "network" };
  }
};
var createWithFailover = async (env, date, body, shift = 0, forceKeys = null) => {
  const all = forceKeys || keys(env);
  if (!all.length) return null;
  const ns = forceKeys ? "ask" : "gk";
  const bad = await badKeysToday(env, date, ns);
  const dayIndex = Math.floor(Date.parse(date + "T00:00:00+06:00") / 864e5);
  const offset = ((dayIndex % all.length + all.length) % all.length + shift) % all.length;
  const busy = /* @__PURE__ */ new Set();
  for (let i = 0; i < all.length; i++) {
    const idx = (offset + i) % all.length;
    if (bad.includes(idx) || busy.has(idx)) continue;
    const result = await tryCreate(all[idx], body);
    if (result.id) return { id: result.id, keyIndex: idx };
    if (result.dead) {
      await markBad(env, date, idx, ns);
      continue;
    }
    busy.add(idx);
  }
  return null;
};
var GK_PROMPT = (date) => `Today's date is ${date} (Bangladesh, Asia/Dhaka). You are preparing daily current-affairs GK practice for Bangladeshi university admission candidates.
Browse credible Bangladeshi and international sources today \u2014 e.g. prothomalo.com, bangla.bdnews24.com, jagonews24.com, kalerkantho.com, ittefaq.com.bd, bbc.com/bengali, samakal.com, and any reliable reference pages needed for verification.
Collect 15-25 multiple-choice current-affairs/GK questions useful for university admission tests. CORRECTNESS IS THE #1 PRIORITY \u2014 a single wrong fact is a critical failure. Rules:
- Double-source rule: every question's fact MUST be verified during this session by actually OPENING at least 2 independent credible pages (e.g. a news site + a second outlet or an official/reference page). One search-result snippet is NOT enough.
- If you cannot confirm a fact from 2 sources, DROP that question. Skip anything uncertain, ambiguous or time-sensitive-until-confirmed.
- Prefer the last ~30 days: national BD news, international, sports, science-tech, awards, economy, and important anniversaries.
- Write the question in Bangla (short), options in Bangla (exactly 4, one clearly correct), "answer" must exactly match one option, "explain" is one short Bangla line, "source" is the site name or URL you verified from.
- No duplicates, no opinion-based questions, no placeholder text.
- STRICT FORBIDDEN: do NOT use your memory/training knowledge alone for any fact \u2014 everything must come from pages you opened today. Do not guess dates, numbers, names or award winners.`;
var NEWS_PROMPT = (date) => `Today's date is ${date} (Bangladesh, Asia/Dhaka). You are a news researcher for Bangladeshi university-admission candidates. Find the LATEST verified admission news (last 2-3 days, today first).
Categories: application circular openings & deadlines, exam dates, seat plans, admit cards, results, admission requirements/fees \u2014 for DU, BUET, CU, JU, RU, RUET, CUET, SUST, GST/GUST cluster, agricultural universities and major private universities.
You MUST actually OPEN and read at least 6-8 of these verified sources before concluding (visit several, not just one):
- National dailies & TV: prothomalo.com, bangla.bdnews24.com, kalerkantho.com, ittefaq.com.bd, samakal.com, jagonews24.com, banglatribune.com, bbc.com/bengali, somoynews.tv, channelsonline.com
- Discovery: also search Google News (news.google.com) for "admission circular", "admission test date" etc. and follow only credible/official links.
- University official sites when a circular is mentioned: du.ac.bd, buet.ac.bd, cu.ac.bd, ju.edu.bd? (verify via search), ru.ac.bd, gstadmission.ac.bd, rsu? \u2014 official .ac.bd / .edu domains only.
Rules: ONLY items you verified on a page you actually opened this session. For each: title in Bangla, date (YYYY-MM-DD), 1-2 line Bangla summary, source domain, full URL. If after checking multiple sources nothing verified exists, return an empty news array \u2014 do NOT invent or reuse old news.`;
var parseOutput = (task) => {
  if (!task) return null;
  if (task.status !== "finished") return null;
  const raw = task.output ?? task.result ?? task.data ?? task.finalResult;
  if (raw == null) return null;
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw.replace(/^```json\s*|```$/g, "").trim()) : raw;
    return parsed;
  } catch (_) {
    return null;
  }
};
var getTask = async (key, id) => {
  try {
    const resp = await fetch(`${BU_BASE}/tasks/${id}`, { headers: { "X-Browser-Use-API-Key": key } });
    if (!resp.ok) return null;
    return await resp.json();
  } catch (_) {
    return null;
  }
};
var newsTaskBody = (env, date) => ({ task: NEWS_PROMPT(date), llm: env.BU_LLM_NEWS || "browser-use-2.0", maxSteps: 30, structuredOutput: JSON.stringify(NEWS_SCHEMA), flashMode: false });
var runBackground = async (env, date, jobs) => {
  const all = keys(env);
  const deadline = Date.now() + POLL_MAX_MS;
  const results = { gk: null, news: null };
  while (Date.now() < deadline) {
    await sleep(POLL_EVERY_MS);
    for (const job of jobs) {
      if (results[job.kind]) continue;
      const task = await getTask(all[job.keyIndex] || all[0], job.id);
      if (!task) continue;
      if (task.status === "failed") results[job.kind] = { error: "agent-failed" };
      else results[job.kind] = parseOutput(task);
    }
    if (results.gk && results.news) break;
  }
  await finalizeResults(env, date, results);
};
var finalizeResults = async (env, date, results) => {
  let prev = null;
  try {
    const saved = await env.GK_KV.get(`gkData:${date}`);
    if (saved) prev = JSON.parse(saved);
  } catch (_) {
  }
  const sameDay = prev && prev.date === date;
  const gkRes = results.gk || (sameDay && Array.isArray(prev.questions) ? { questions: prev.questions, reused: true } : null);
  const newsRes = results.news || (sameDay && Array.isArray(prev.news) ? { news: prev.news, reused: true } : null);
  const questions = Array.isArray(gkRes?.questions) ? gkRes.questions.filter((q) => q?.q && Array.isArray(q.options) && q.options.length >= 2).slice(0, 40) : [];
  const news = Array.isArray(newsRes?.news) ? newsRes.news.filter((n) => n?.title && n?.summary).slice(0, 8) : [];
  const payload = { date, count: questions.length, newsCount: news.length, questions, news, finishedAt: Date.now(), partial: !results.gk || !results.news };
  try {
    await env.GK_KV.put(`gkData:${date}`, JSON.stringify(payload));
    await env.GK_KV.put("latest", JSON.stringify(payload));
  } catch (_) {
  }
  try {
    if (env.TG_BOT_TOKEN && env.TG_CHAT_ID) {
      const msg = results.gk ? questions.length ? `\u{1F916} \u0986\u099C\u0995\u09C7\u09B0 GK \u098F\u09B8\u09C7\u099B\u09C7!

\u{1F4DA} ${questions.length}\u099F\u09BF \u09A8\u09A4\u09C1\u09A8 MCQ${news.length ? `
\u{1F4F0} ${news.length}\u099F\u09BF verified admission news` : "\n\u{1F4F0} \u0986\u099C \u0995\u09CB\u09A8\u09CB verified news \u09A8\u09C7\u0987"}

\u0985\u09CD\u09AF\u09BE\u09AA\u09C7 Dashboard \u2192 \u{1F916} \u09A1\u09C7\u0987\u09B2\u09BF GK \u098F\u099C\u09C7\u09A8\u09CD\u099F \u0996\u09CB\u09B2\u09CB!` : "\u{1F916} \u0986\u099C GK \u098F\u099C\u09C7\u09A8\u09CD\u099F \u09AF\u09A5\u09C7\u09B7\u09CD\u099F verified \u09AA\u09CD\u09B0\u09B6\u09CD\u09A8 \u099C\u09CB\u0997\u09BE\u09A1\u09BC \u0995\u09B0\u09A4\u09C7 \u09AA\u09BE\u09B0\u09C7\u09A8\u09BF \u2014 \u0995\u09BE\u09B2 \u0986\u09AC\u09BE\u09B0 \u099A\u09C7\u09B7\u09CD\u099F\u09BE \u09B9\u09AC\u09C7\u0964" : news.length ? `\u{1F4F0} \u0986\u099C\u0995\u09C7\u09B0 admission \u09A8\u09BF\u0989\u099C \u098F\u09B8\u09C7\u099B\u09C7!

${news.length}\u099F\u09BF verified \u0996\u09AC\u09B0 \u2014 \u0985\u09CD\u09AF\u09BE\u09AA\u09C7 Dashboard \u2192 \u{1F916} \u09A1\u09C7\u0987\u09B2\u09BF GK \u098F\u099C\u09C7\u09A8\u09CD\u099F \u2192 \u09A8\u09BF\u0989\u099C \u099F\u09CD\u09AF\u09BE\u09AC` : null;
      if (!msg) return payload;
      await fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: env.TG_CHAT_ID, text: msg }) }).catch(() => {
      });
    }
  } catch (_) {
  }
  return payload;
};
var ASK_SCHEMA = {
  type: "object",
  properties: {
    answer: { type: "string" },
    sources: { type: "array", items: { type: "string" } }
  },
  required: ["answer"]
};
var ASK_PROMPT = (question, context, bankBlock, histBlock2) => `You are "\u09B8\u09CD\u099F\u09BE\u09A1\u09BF \u09AC\u09A8\u09CD\u09A7\u09C1" \u2014 a warm, friendly Bangla study-helper for a Bangladeshi university-admission candidate. Today: ${dhakaToday()} (Asia/Dhaka).
User's question: """${question}"""
${context ? `User's study context (use silently, never dump raw): ${context}` : ""}${bankBlock || ""}${histBlock2 || ""}
Rules: Reply in simple warm Bangla (\u09A4\u09C1\u09AE\u09BF-\u09AB\u09B0\u09CD\u09AE), 2-6 short lines, light emoji ok.${bankBlock ? " When the bank block is present, base your answer primarily on it (it is the student's own verified bank) and mention you answered from their question bank." : ""} FRESHNESS RULE (critical): for ANY factual, current-affairs, date/number/name, exam-deadline or "\u098F\u0996\u09A8/\u0986\u099C/\u09B8\u09B0\u09CD\u09AC\u09B6\u09C7\u09B7"-type question you MUST browse the live web RIGHT NOW and verify from at least one credible page you actually open before answering \u2014 Google-overview-level freshness is the minimum bar. NEVER answer such questions from memory/training data; a stale or outdated fact is a critical failure. If today's verified info cannot be found, say clearly what could not be verified instead of guessing. Always include source domains in sources. Never invent facts. End with a tiny nudge to keep studying.`;
var normalizeBank = (questions, stats) => {
  const qs = (Array.isArray(questions) ? questions : []).slice(0, 3e3).map((q) => {
    const o = (Array.isArray(q && (q.o ?? q.options)) ? q.o ?? q.options : []).slice(0, 6).map((x) => String(x).slice(0, 90));
    const ai = Number(q && (q.answerIndex ?? q.correctAnswerIndex));
    const a = String((q && (q.a ?? q.answer)) ?? (Number.isFinite(ai) && o[ai] != null ? o[ai] : "")).slice(0, 120);
    return {
      q: String((q && (q.q ?? q.question)) ?? "").slice(0, 260),
      o,
      a,
      e: String((q && (q.e ?? q.explain)) ?? "").slice(0, 260),
      s: String((q && (q.s ?? q.subject)) ?? "").slice(0, 70),
      t: String((q && (q.t ?? q.topic)) ?? "").slice(0, 70)
    };
  }).filter((x) => x.q && x.o.length >= 2);
  const st = stats && typeof stats === "object" ? stats : {};
  return { qs, stats: { count: Number(st.count) || qs.length, exams: Number(st.exams) || 0, avgAcc: st.avgAcc ?? null, weak: Array.isArray(st.weak) ? st.weak.slice(0, 8).map((x) => String(x).slice(0, 60)) : [] } };
};
var bankUpload = async (request, env) => {
  try {
    let body = {};
    try {
      body = await request.json();
    } catch (_) {
    }
    const bank = normalizeBank(body.questions, body.stats);
    if (!bank.qs.length) return json2(request, { error: "empty-bank" }, 400);
    await env.GK_KV.put("userBank", JSON.stringify({ ...bank, history: Array.isArray(body.history) ? body.history.slice(0, 500) : [], mistakes: Array.isArray(body.mistakes) ? body.mistakes.slice(0, 400) : [], vocabulary: Array.isArray(body.vocabulary) ? body.vocabulary.slice(0, 1500) : [], activity: body.activity && typeof body.activity === "object" ? body.activity : {}, ...body.full && typeof body.full === "object" ? { full: body.full } : {}, savedAt: Date.now() }));
    if (body.full && typeof body.full === "object" && env.PUB_KV) {
      try {
        await publishGlobal(env, body.full);
      } catch (_) {
      }
    }
    return json2(request, { saved: true, count: bank.qs.length });
  } catch (_) {
    return json2(request, { error: "bank-failed" }, 500);
  }
};
var bankInfo = async (request, env) => {
  try {
    const raw = await env.GK_KV.get("userBank");
    if (!raw) return json2(request, { saved: false });
    try {
      if (new URL(request.url).searchParams.get("full") === "1") return json2(request, { saved: true, bank: JSON.parse(raw) });
    } catch (_) {
    }
    const b = JSON.parse(raw);
    return json2(request, { saved: true, count: b.qs.length, stats: b.stats, savedAt: b.savedAt, history: Array.isArray(b.history) ? b.history.length : 0, mistakes: Array.isArray(b.mistakes) ? b.mistakes.length : 0, vocabulary: Array.isArray(b.vocabulary) ? b.vocabulary.length : 0, activity: b.activity || {} });
  } catch (_) {
    return json2(request, { saved: false });
  }
};
var histBlock = (b) => {
  try {
    const h = Array.isArray(b && b.history) ? b.history.slice(0, 10) : [];
    const a = b && b.activity || {};
    let out = "";
    if (h.length) out += "\n\u09AA\u09B0\u09C0\u0995\u09CD\u09B7\u09BE\u09B0 \u0987\u09A4\u09BF\u09B9\u09BE\u09B8 (\u09A8\u09A4\u09C1\u09A8\u2192\u09AA\u09C1\u09B0\u09A8\u09CB): " + h.map((x) => `${x && x.d || ""} \u2014 ${x && x.s || "?"}${x && x.m ? " (" + x.m + ")" : ""}`).join(" | ");
    if (a && (a.exams || a.mistakes || a.vocab)) out += `
\u0985\u09CD\u09AF\u09BE\u0995\u09CD\u099F\u09BF\u09AD\u09BF\u099F\u09BF: \u09AE\u09CB\u099F \u09AA\u09B0\u09C0\u0995\u09CD\u09B7\u09BE ${a.exams || 0} \xB7 \u09AD\u09C1\u09B2-\u09A8\u09CB\u099F ${a.mistakes || 0} \xB7 \u09B6\u09AC\u09CD\u09A6 ${a.vocab || 0}`;
    const lt = a && a.lifetime || {};
    if (lt && (lt.answered || lt.daysActive)) out += `
\u09B2\u09BE\u0987\u09AB\u099F\u09BE\u0987\u09AE: \u0989\u09A4\u09CD\u09A4\u09B0 ${lt.answered || 0}\u099F\u09BF \xB7 \u09B8\u09A0\u09BF\u0995 ${lt.correct || 0}${lt.acc != null ? " (" + lt.acc + "%)" : ""} \xB7 \u09B8\u0995\u09CD\u09B0\u09BF\u09AF\u09BC \u09A6\u09BF\u09A8 ${lt.daysActive || 0} \xB7 \u099A\u09CD\u09AF\u09BE\u099F-\u0993\u09AA\u09C7\u09A8 ${lt.opens || 0}`;
    if (a && a.coach && a.coach.total) out += `
\u09B6\u09C7\u09B7 \u099A\u09CD\u09AF\u09BE\u099F-\u09AA\u09B0\u09C0\u0995\u09CD\u09B7\u09BE (\u0995\u09CB\u099A-\u09A8\u09CB\u099F): ${a.coach.score || 0}/${a.coach.total}${Array.isArray(a.coach.weak) && a.coach.weak.length ? " \u2014 \u09A6\u09C1\u09B0\u09CD\u09AC\u09B2: " + a.coach.weak.slice(0, 4).join(", ") : ""}`;
    const ms2 = Array.isArray(b && b.mistakes) ? b.mistakes.slice(0, 8) : [];
    if (ms2.length) out += "\n\u09B8\u09BE\u09AE\u09CD\u09AA\u09CD\u09B0\u09A4\u09BF\u0995 \u09AD\u09C1\u09B2-\u09AA\u09CD\u09B0\u09B6\u09CD\u09A8 (\u09B8\u09A0\u09BF\u0995-\u0989\u09A4\u09CD\u09A4\u09B0\u09B8\u09B9):\n" + ms2.map((x) => `\u2014 ${String(x && x.q || "").slice(0, 90)}${x && x.a ? " \u21D2 \u09B8\u09A0\u09BF\u0995: " + String(x.a).slice(0, 40) : ""}`).join("\n");
    const vs2 = Array.isArray(b && b.vocabulary) ? b.vocabulary.slice(0, 12) : [];
    if (vs2.length) out += "\n\u09B6\u09AC\u09CD\u09A6-\u09B8\u0982\u0997\u09CD\u09B0\u09B9: " + vs2.map((x) => `${String(x && x.w || "").slice(0, 30)}${x && x.m ? "=" + String(x.m).slice(0, 30) : ""}`).join(", ");
    return out ? `
(\u09B6\u09BF\u0995\u09CD\u09B7\u09BE\u09B0\u09CD\u09A5\u09C0\u09B0 \u09AA\u09B0\u09C0\u0995\u09CD\u09B7\u09BE\u09B0 \u0987\u09A4\u09BF\u09B9\u09BE\u09B8 \u0993 \u0985\u09CD\u09AF\u09BE\u0995\u09CD\u099F\u09BF\u09AD\u09BF\u099F\u09BF \u2014 \u09B8\u09BE\u0987\u09B2\u09C7\u09A8\u09CD\u099F\u09B2\u09BF \u09AC\u09CD\u09AF\u09AC\u09B9\u09BE\u09B0 \u0995\u09B0\u09CB, raw \u09A1\u09BE\u09AE\u09CD\u09AA \u0995\u09B0\u09CB \u09A8\u09BE)${out}` : "";
  } catch (_) {
    return "";
  }
};
var bankPick = (bank, question, subject) => {
  const toks = String(question).toLowerCase().split(/[^\p{L}\p{M}\p{N}]+/u).filter((t) => t.length > 2).slice(0, 20);
  let pool = bank.qs || [];
  if (subject) {
    const f = pool.filter((q) => (q.s || "").includes(subject) || (q.t || "").includes(subject));
    if (f.length) pool = f;
  }
  return pool.map((q) => {
    const hay = (q.q + " " + (q.o || []).join(" ") + " " + (q.s || "") + " " + (q.t || "")).toLowerCase();
    let sc = 0;
    for (const t of toks) if (hay.includes(t)) sc++;
    return { q, sc };
  }).filter((x) => x.sc > 0).sort((a, b) => b.sc - a.sc).slice(0, 12).map((x) => x.q);
};
var newId = () => crypto.randomUUID ? crypto.randomUUID() : "ask-" + Date.now() + "-" + Math.floor(Math.random() * 1e6);
var createAsk = async (request, env, ctx) => {
  const date = dhakaToday();
  try {
    let body = {};
    try {
      body = await request.json();
    } catch (_) {
    }
    const question = String(body.question || "").trim().slice(0, 600);
    const context = String(body.context || "").trim().slice(0, 1200);
    if (!question) return json2(request, { error: "empty-question" }, 400);
    if (!keys(env).length) return json2(request, { error: "keys-not-configured" }, 503);
    const id = newId();
    const source = String(body.source || "auto").slice(0, 60);
    let bankBlock = "";
    let histB = "";
    {
      const raw = await env.GK_KV.get("userBank");
      if (raw) {
        const bank = JSON.parse(raw);
        histB = histBlock(bank);
        if (source.startsWith("bank")) {
          const subject = source.startsWith("bank:") ? decodeURIComponent(source.slice(5)) : "";
          const picks = bankPick(bank, question, subject);
          bankBlock = picks.length ? `
\u09B6\u09BF\u0995\u09CD\u09B7\u09BE\u09B0\u09CD\u09A5\u09C0\u09B0 \u09A8\u09BF\u099C\u09C7\u09B0 \u09AA\u09CD\u09B0\u09B6\u09CD\u09A8\u09AC\u09CD\u09AF\u09BE\u0982\u0995 \u09A5\u09C7\u0995\u09C7 \u09AE\u09BF\u09B2\u09C7-\u09AF\u09BE\u0993\u09AF\u09BC\u09BE \u09AA\u09CD\u09B0\u09B6\u09CD\u09A8-\u0989\u09A4\u09CD\u09A4\u09B0 (\u0989\u09A4\u09CD\u09A4\u09B0\u09C7\u09B0 \u09AA\u09CD\u09B0\u09A7\u09BE\u09A8 \u09AD\u09BF\u09A4\u09CD\u09A4\u09BF \u098F\u0997\u09C1\u09B2\u09CB):
${picks.map((q, i) => `${i + 1}) \u09AA\u09CD\u09B0: ${q.q}
${(q.o || []).map((o, oi) => `   ${"\u0995\u0996\u0997\u0998\u0999"[oi] || oi + 1}) ${o}`).join("\n")}
   \u0989\u09A4\u09CD\u09A4\u09B0: ${q.a}${q.e ? ` \u2014 ${q.e}` : ""}`).join("\n")}
` : `
(\u09B6\u09BF\u0995\u09CD\u09B7\u09BE\u09B0\u09CD\u09A5\u09C0\u09B0 \u09AA\u09CD\u09B0\u09B6\u09CD\u09A8\u09AC\u09CD\u09AF\u09BE\u0982\u0995\u09C7 \u098F\u0987 \u09AC\u09BF\u09B7\u09AF\u09BC\u09C7 \u09B8\u09B0\u09BE\u09B8\u09B0\u09BF \u09AE\u09BF\u09B2 \u09AA\u09BE\u0993\u09AF\u09BC\u09BE \u09AF\u09BE\u09AF\u09BC\u09A8\u09BF \u2014 \u09A4\u09BE\u09B0 \u0985\u09AC\u09B8\u09CD\u09A5\u09BE \u09AE\u09BE\u09A5\u09BE\u09AF\u09BC \u09B0\u09C7\u0996\u09C7 \u09B8\u09BE\u09AC\u09A7\u09BE\u09A8\u09C7 \u0989\u09A4\u09CD\u09A4\u09B0 \u09A6\u09BE\u0993\u0964)
`;
        }
      }
    }
    const askBody = { task: ASK_PROMPT(question, context, bankBlock, histB), llm: env.BU_LLM || "browser-use-2.0", maxSteps: 14, structuredOutput: JSON.stringify(ASK_SCHEMA), flashMode: false };
    const askKey = String(env.ASK_API_KEY || "").trim();
    if (!askKey) return json2(request, { error: "ask-key-not-configured" }, 503);
    let job = await createWithFailover(env, date, askBody, 0, [askKey]);
    let dedicated = !!job;
    if (!job) job = await createWithFailover(env, date, askBody, Math.floor(Date.now() / 6e4));
    if (!job) return json2(request, { error: "all-keys-exhausted" }, 429);
    await env.GK_KV.put(`ask:${id}`, JSON.stringify({ id, jobId: job.id, keyIndex: job.keyIndex, dedicated, date, status: "running", createdAt: Date.now() }), { expirationTtl: 86400 * 3 });
    return json2(request, { id, started: true });
  } catch (_) {
    return json2(request, { error: "ask-failed" }, 500);
  }
};
var askStatus = async (request, env, id) => {
  try {
    if (!/^[a-f0-9-]{8,40}$/i.test(id)) return json2(request, { error: "bad-id" }, 400);
    const rec = await env.GK_KV.get(`ask:${id}`);
    if (!rec) return json2(request, { error: "not-found" }, 404);
    const ask = JSON.parse(rec);
    if (ask.status !== "running") return json2(request, ask);
    const all = keys(env);
    const key = ask.dedicated ? String(env.ASK_API_KEY || "").trim() || all[0] : all[ask.keyIndex] || all[0];
    let task = await getTask(key, ask.jobId).catch(() => null);
    if (!task && String(env.ASK_API_KEY || "").trim() && key !== String(env.ASK_API_KEY).trim()) task = await getTask(String(env.ASK_API_KEY).trim(), ask.jobId).catch(() => null);
    if (!task) return json2(request, { status: "running" });
    if (task.status === "failed") {
      ask.status = "failed";
      await env.GK_KV.put(`ask:${id}`, JSON.stringify(ask));
      return json2(request, { status: "failed" });
    }
    const out = parseOutput(task);
    if (out && typeof out.answer === "string" && out.answer.trim()) {
      ask.status = "finished";
      ask.answer = String(out.answer).slice(0, 4e3);
      ask.sources = Array.isArray(out.sources) ? out.sources.map((x) => String(x).slice(0, 120)).slice(0, 6) : [];
      await env.GK_KV.put(`ask:${id}`, JSON.stringify(ask));
      return json2(request, { status: "finished", answer: ask.answer, sources: ask.sources });
    }
    return json2(request, { status: task.status === "finished" ? "failed" : "running" });
  } catch (_) {
    return json2(request, { error: "status-failed" }, 500);
  }
};
var healTasks = async (env, date) => {
  try {
    const rec = await env.GK_KV.get(`gkTasks:${date}`);
    if (!rec) return null;
    const { jobs = [] } = JSON.parse(rec);
    if (!jobs.length) return null;
    const all = keys(env);
    const results = { gk: null, news: null };
    let pending = false;
    for (const job of jobs) {
      const task = await getTask(all[job.keyIndex] || all[0], job.id).catch(() => null);
      if (!task || task.status !== "finished" && task.status !== "failed") {
        pending = true;
        continue;
      }
      results[job.kind] = task.status === "failed" ? { error: "agent-failed" } : parseOutput(task);
    }
    if (pending && !results.gk && !results.news) return null;
    return await finalizeResults(env, date, results);
  } catch (_) {
    return null;
  }
};
var startNewsOnly = async (request, env, ctx, date) => {
  try {
    if (!keys(env).length) return json2(request, { error: "keys-not-configured" }, 503);
    const newsJob = await createWithFailover(env, date, newsTaskBody(env, date), 1);
    if (!newsJob) return json2(request, { error: "all-keys-exhausted" }, 429);
    const job = { kind: "news", id: newsJob.id, keyIndex: newsJob.keyIndex };
    const rec = await env.GK_KV.get(`gkTasks:${date}`);
    const tasksRec = rec ? JSON.parse(rec) : { jobs: [], startedAt: Date.now() };
    tasksRec.jobs = tasksRec.jobs.filter((j) => j.kind !== "news").concat([job]);
    await env.GK_KV.put(`gkTasks:${date}`, JSON.stringify(tasksRec));
    if (ctx && ctx.waitUntil) ctx.waitUntil(runBackground(env, date, [job]));
    else runBackground(env, date, [job]);
    return json2(request, { started: true, kind: "news" });
  } catch (_) {
    return json2(request, { error: "run-failed" }, 500);
  }
};
var maybeStart = async (request, env, ctx) => {
  const date = dhakaToday();
  try {
    if (new URL(request.url).searchParams.get("kind") === "news") return await startNewsOnly(request, env, ctx, date);
    const lastDay = await env.GK_KV.get("gkDay");
    if (lastDay === date) {
      const stored = await env.GK_KV.get(`gkData:${date}`);
      return json2(request, stored ? { already: true, ready: true } : { already: true, ready: false });
    }
    if (!keys(env).length) return json2(request, { error: "keys-not-configured" }, 503);
    await env.GK_KV.put("gkDay", date);
    const gkJob = await createWithFailover(env, date, { task: GK_PROMPT(date), llm: env.BU_LLM || "browser-use-2.0", maxSteps: 45, structuredOutput: JSON.stringify(GK_SCHEMA), flashMode: false });
    const newsJob = await createWithFailover(env, date, newsTaskBody(env, date), 1);
    const jobs = [
      gkJob ? { kind: "gk", id: gkJob.id, keyIndex: gkJob.keyIndex } : null,
      newsJob ? { kind: "news", id: newsJob.id, keyIndex: newsJob.keyIndex } : null
    ].filter(Boolean);
    await env.GK_KV.put(`gkTasks:${date}`, JSON.stringify({ jobs, startedAt: Date.now() }));
    if (!jobs.length) return json2(request, { error: "all-keys-exhausted" }, 429);
    if (ctx && ctx.waitUntil) ctx.waitUntil(runBackground(env, date, jobs));
    else runBackground(env, date, jobs);
    return json2(request, { started: true, tasks: jobs.length });
  } catch (error) {
    return json2(request, { error: "run-failed" }, 500);
  }
};
var gk_agent_worker_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(request) });
    if (url.pathname.startsWith("/pub/") || url.pathname.startsWith("/api/")) {
      const gatedApi = url.pathname === "/api/ask" || url.pathname.startsWith("/api/ask/") || url.pathname === "/api/bank" || url.pathname.startsWith("/api/gk/") || url.pathname === "/api/cloud/publish";
      const u2p = new URL(request.url);
      u2p.pathname = url.pathname.replace(/^\/pub\//, "/api/");
      if (url.pathname.startsWith("/pub/") || !gatedApi) {
        const envPub = { PUB_KV: env.PUB_KV, OLD_KV: env.OLD_KV || env.GK_KV, ADMIN_TOKEN: env.ADMIN_TOKEN, GEMINI_KEYS: env.GEMINI_KEYS, RESEND_KEY: env.RESEND_KEY, RESEND_KEY_2: env.RESEND_KEY_2, MAIL_FROM: env.MAIL_FROM, MAIL_HOOK: env.MAIL_HOOK, MAIL_HOOK_SECRET: env.MAIL_HOOK_SECRET, BREVO_KEY: env.BREVO_KEY, BREVO_FROM: env.BREVO_FROM, GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET, TWILIO_SID: env.TWILIO_SID, TWILIO_TOKEN: env.TWILIO_TOKEN, TWILIO_FROM: env.TWILIO_FROM, SMS_API_URL: env.SMS_API_URL, SMS_API_KEY: env.SMS_API_KEY, SMS_FROM: env.SMS_FROM, GREENWEB_TOKEN: env.GREENWEB_TOKEN, BULKSMS_API_KEY: env.BULKSMS_API_KEY };
        return public_worker_default.fetch(new Request(u2p.href, request), envPub, ctx);
      }
    }
    if (url.pathname === "/health") {
      return json2(request, { ok: true, keys: keys(env).length, askKey: !!env.ASK_API_KEY, kv: !!env.GK_KV, tg: !!env.TG_BOT_TOKEN, lastDay: env.GK_KV ? await env.GK_KV.get("gkDay") : null });
    }
    const isApp = request.headers.get("X-AH-App") === APP_HEADER;
    const beaconOk = !isApp && request.method === "POST" && url.pathname === "/api/bank" && request.headers.get("Origin") === "https://sheikhrashel47-stack.github.io";
    if (!isApp && !beaconOk) return json2(request, { error: "forbidden" }, 403);
    if (request.method === "POST" && url.pathname === "/api/ask") return await createAsk(request, env, ctx);
    if (request.method === "POST" && url.pathname === "/api/bank") return await bankUpload(request, env);
    if (request.method === "GET" && url.pathname === "/api/bank") return await bankInfo(request, env);
    if (request.method === "POST" && url.pathname === "/api/cloud/publish") {
      let body = {};
      try {
        body = await request.json();
      } catch (_) {
      }
      const result = await publishGlobal(env, body);
      if (result.error === "empty") return json2(request, { error: "empty-global" }, 400);
      if (result.error) return json2(request, result, 500);
      return json2(request, result);
    }
    if (request.method === "GET" && url.pathname.startsWith("/api/ask/")) return await askStatus(request, env, url.pathname.split("/").pop() || "");
    if (request.method === "POST" && url.pathname === "/api/gk/run") return maybeStart(request, env, ctx);
    if (request.method === "GET" && url.pathname === "/api/gk/today") {
      const date = dhakaToday();
      try {
        const tasks = await env.GK_KV.get(`gkTasks:${date}`);
        if (tasks) {
          const healed = await healTasks(env, date);
          if (healed) return json2(request, { ready: true, date, payload: healed });
        }
        const stored = await env.GK_KV.get(`gkData:${date}`);
        if (stored) return json2(request, { ready: true, date, payload: JSON.parse(stored) });
        return json2(request, { ready: false, date, running: !!tasks });
      } catch (_) {
        return json2(request, { ready: false, date, running: false });
      }
    }
    return json2(request, { error: "not_found" }, 404);
  },
  async scheduled(event, env, ctx) {
    if (!env.GK_KV || !keys(env).length) return;
    const date = dhakaToday();
    try {
      if (await env.GK_KV.get("gkDay") === date) return;
    } catch (_) {
    }
    const fakeRequest = new Request("https://cron/api/gk/run", { method: "POST", headers: { "X-AH-App": APP_HEADER } });
    await maybeStart(fakeRequest, env, ctx);
  }
};
var __test = { tryCreate, createWithFailover, parseOutput, dhakaToday, keys, GK_PROMPT, GK_SCHEMA, NEWS_SCHEMA, finalizeResults, normalizeBank, bankPick, bankUpload, bankInfo, ASK_PROMPT, histBlock };
export {
  __test,
  gk_agent_worker_default as default
};
