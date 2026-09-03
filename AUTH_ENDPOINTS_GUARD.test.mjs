// ⚔️ AUTH ENDPOINTS GUARD — আজীবন-লক
// নিয়ম: এই repo-তে auth ও API endpoints-এর host/path কখনো ভাঙা যাবে না।
// `node AUTH_ENDPOINTS_GUARD.test.mjs` চালান (CI-তেও একই কমান্ড) — কোনো লাইন FAIL মানে আগে ঠিক করো, তারপর commit।
// ব্যতিক্রম নিবন্ধন দরকার হলে: ALLOWED_ANY-তে যুক্ত করো (কমেন্টসহ)।
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));

// ✅ যেসব Worker host বৈধ (আজকের লাইভ)
const ALLOWED_HOSTS = [
  'https://admission-gk.admissionhub.workers.dev',
  'https://admission-voice.admissionhub.workers.dev',
  'https://admission-notify.admissionhub.workers.dev',
  'https://admission-hub-ai-proxy.admissionhub.workers.dev',
];
// ⚠️ অন্য কোনো third-party/প্রদর্শনী URL (যেমন placeholder input) — প্রয়োজনীয় হলে শুধু এখানে
const ALLOWED_ANY = [/^https:\/\/your-voice-worker\.workers\.dev$/];

const BAD_HOST = 'rashelzayan213.workers.dev';            // পুরনো ভুল subdomain — আর কখনো না
// ফ্রন্টএন্ড-বিপজ্জনক path-literal (worker-side /pub→/api bridge (gk-agent-worker.js) বৈধ ব্যতিক্রম)
const BAD_PREFIX = /WORKER \+ '\/pub'|workers\.dev\/pub|['"]\/pub\/auth/;
const GUARD_FILE = fileURLToPath(import.meta.url);          // নিজেকে স্ক্যান করো না
const SKIP_DIRS = new Set(['.git','node_modules','AGENT_RESUME','.github','course-assets','courses','auth-screens','auth-art','icons','ai-proxy','dist','build','.next']);

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    if (SKIP_DIRS.has(e)) continue;
    const p = join(dir, e);
    if (p === GUARD_FILE) continue;
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(js|html|mjs)$/.test(e)) out.push(p);
  }
  return out;
}

const problems = [];
const report = (f, line, msg) => problems.push(`${relative(ROOT, f)}:${line}  ❌ ${msg}`);
const info = (f, msg) => console.log(`  [guard] ${relative(ROOT, f)}  ✓ ${msg}`);

const files = walk(ROOT);
console.log(`Auth Endpoints Guard — ${files.length} ফাইল স্ক্যান:\n`);

for (const f of files) {
  const lines = readFileSync(f, 'utf8').split('\n');
  lines.forEach((ln, i) => {
    const n = i + 1;
    if (ln.includes(BAD_HOST)) report(f, n, `নিষিদ্ধ পুরনো host: ${BAD_HOST}`);
    if (BAD_PREFIX.test(ln)) report(f, n, `ভুল auth path prefix ('/pub/…') ব্যবহার হয়েছে`);
    const urls = ln.match(/https?:\/\/[a-zA-Z0-9.-]+\.workers\.dev[^'"\s]*/g) || [];
    for (const raw of urls) {
      const host = raw.match(/^https?:\/\/[^/]+/)[0];
      if (!ALLOWED_HOSTS.includes(host) && !ALLOWED_ANY.some(re => re.test(host))) {
        report(f, n, `অনুমোদিত নয় এমন Workers host: ${host} — সঠিক host ব্যবহার করো বা ALLOWED_ANY-তে নিবন্ধন করো`);
      }
    }
  });
}

// ✅ premium-auth.js অবশ্যই canonical ঠিকানা + /api prefix ধারণ করবে
const pa = join(ROOT, 'premium-auth.js');
if (files.includes(pa)) {
  const s = readFileSync(pa, 'utf8');
  if (!s.includes("const CANONICAL_WORKER = 'https://admission-gk.admissionhub.workers.dev'"))
    report(pa, 1, 'CANONICAL_WORKER ধ্রুবক নেই (self-heal fallback নষ্ট)');
  if (!s.includes("WORKER + '/api'")) report(pa, 1, "auth base = WORKER + '/api' নয় — pub prefix ফিরে এসেছে");
  else info(pa, 'canonical host + /api prefix ঠিক আছে');
}

// ✅ sw.js BUILD_ID ও index.html-এর cache markers মিলতে হবে
const read = p => { try { return readFileSync(p, 'utf8'); } catch { return ''; } };
const sw = read(join(ROOT, 'sw.js'));
const idx = read(join(ROOT, 'index.html'));
const swVer = (sw.match(/BUILD_ID = 'v([0-9]+)-(?:authapi|uniunit|email|splash3d|blankfix|introfix|guest)(?:-(?:fix|guard|design))?-?(\d{8})'/) || [])[1];
const idxVer = (idx.match(/sw\.js\?v=v([0-9]+)-(?:authapi|uniunit|email|splash3d|blankfix|introfix|guest)(?:-(?:fix|guard|design))?-?(\d{8})/) || [])[1];
const shell = (s) => (s.match(/p3-auth-(?:prof|guest)-(v\d+)/) || [])[1];
if (swVer && idxVer && swVer !== idxVer) report('sw.js', 2, `BUILD_ID v${swVer} ≠ index.html v${idxVer} — cache-version mismatch`);
if (shell(sw) && shell(idx) && shell(sw) !== shell(idx)) report('sw.js', 2, `APP_SHELL ${shell(sw)} ≠ index ${shell(idx)}`);
if (!swVer) report('sw.js', 1, 'BUILD_ID pattern পাওয়া যায়নি (vNNN-<tag>-fix-YYYYMMDD)');
else info(`sw.js`, `BUILD_ID v${swVer} — index-এর সাথে মিলেছে ${swVer === idxVer ? '✓' : '✗'}`);

console.log();
if (problems.length) {
  console.log(`🔴 GUARD FAILED — ${problems.length} সমস্যা:`);
  problems.forEach(p => console.log('  ' + p));
  process.exit(1);
}
console.log('🟢 GUARD PASSED — auth endpoints আজীবন-লকড ✅');
