// Genera una entrada de changelog en la tabla `updates` (type='changelog') a partir
// de los commits que entraron en el último push a `production`. Lo corre el GitHub
// Action `.github/workflows/changelog.yml`. Agrupa feat/fix/perf en español; ignora
// chore/ci/refactor/docs/test/merge/revert. Si no hay nada cara-al-usuario, no inserta.
//
// Requiere en el entorno:
//   SUPABASE_SERVICE_ROLE_KEY  (secret de GitHub — bypassa RLS para insertar)
//   BEFORE_SHA, AFTER_SHA      (rango del push; del contexto de github)
// SUPABASE_URL está hardcodeada abajo (la URL del proyecto NO es secreta).

import { execSync } from 'node:child_process';

const SUPABASE_URL = 'https://miuiujntdjrjhhcysiba.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BEFORE = process.env.BEFORE_SHA || '';
const AFTER = process.env.AFTER_SHA || 'HEAD';

if (!SERVICE_KEY) {
  // Secret aún no configurado → no fallar el workflow, solo avisar y salir.
  console.log('SUPABASE_SERVICE_ROLE_KEY no configurado — se omite el changelog (agregá el secret para activarlo).');
  process.exit(0);
}

// 1) Subjects de los commits del push (sin merges).
const zero = /^0+$/.test(BEFORE);
const range = !BEFORE || zero ? `${AFTER}~20..${AFTER}` : `${BEFORE}..${AFTER}`;
let subjects = [];
try {
  const out = execSync(`git log --no-merges --pretty=format:%s ${range}`, {
    encoding: 'utf8',
  });
  subjects = out.split('\n').map((s) => s.trim()).filter(Boolean);
} catch (e) {
  console.error('No se pudieron leer los commits:', e.message);
  process.exit(1);
}

// 2) Parseo conventional commits → items {type, text}. Solo lo cara-al-usuario.
const TYPE_MAP = { feat: 'feat', fix: 'fix', perf: 'perf' };
const seen = new Set();
const items = [];
for (const subject of subjects) {
  const m = subject.match(/^(feat|fix|perf|chore|ci|refactor|docs|test|style|build|revert)(\([^)]*\))?(!)?:\s*(.+)$/i);
  if (!m) continue;
  const type = TYPE_MAP[m[1].toLowerCase()];
  if (!type) continue; // descarta chore/ci/refactor/docs/test/style/build/revert
  let text = m[4].trim().replace(/\s+/g, ' ').replace(/[.\s]+$/, '');
  if (!text) continue;
  text = text.charAt(0).toUpperCase() + text.slice(1);
  const key = `${type}:${text.toLowerCase()}`;
  if (seen.has(key)) continue;
  seen.add(key);
  items.push({ type, text });
}

if (items.length === 0) {
  console.log('Sin cambios cara-al-usuario en este push — no se genera changelog.');
  process.exit(0);
}

// 3) Siguiente versión: continúa desde la última entrada (vX.Y → vX.(Y+1)).
const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
};
let version = 'v3.3'; // base si no hay ninguna entrada aún (el histórico estático llega a v3.2)
try {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/updates?type=eq.changelog&status=eq.published&order=published_at.desc&limit=1&select=version`,
    { headers }
  );
  const rows = await res.json();
  const last = Array.isArray(rows) && rows[0]?.version;
  const mm = typeof last === 'string' && last.match(/^v(\d+)\.(\d+)/);
  if (mm) version = `v${mm[1]}.${Number(mm[2]) + 1}`;
} catch (e) {
  console.error('No se pudo leer la última versión, uso base:', e.message);
}

// 4) Armar y postear la entrada.
const counts = items.reduce((a, it) => ((a[it.type] = (a[it.type] || 0) + 1), a), {});
const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`;
const parts = [];
if (counts.feat) parts.push(plural(counts.feat, 'nueva función', 'nuevas funciones'));
if (counts.fix) parts.push(plural(counts.fix, 'corrección', 'correcciones'));
if (counts.perf) parts.push(plural(counts.perf, 'mejora de rendimiento', 'mejoras de rendimiento'));
const excerpt = parts.join(' y ') || 'Cambios varios';

const sectionFor = (type, title) => {
  const list = items.filter((i) => i.type === type);
  if (!list.length) return '';
  return `## ${title}\n` + list.map((i) => `- ${i.text}`).join('\n') + '\n';
};
const content_markdown = [
  sectionFor('feat', 'Nuevas funciones'),
  sectionFor('fix', 'Correcciones'),
  sectionFor('perf', 'Mejoras de rendimiento'),
].filter(Boolean).join('\n');

const sha7 = (AFTER || '').slice(0, 7);
const nowIso = new Date().toISOString();
const entry = {
  type: 'changelog',
  status: 'published',
  title: `Actualización ${version}`,
  slug: `changelog-${version.replace(/\./g, '-')}-${sha7}`,
  excerpt,
  content: { items },
  content_markdown,
  version,
  featured: false,
  is_major: false,
  tags: ['changelog'],
  client_id: null,
  published_at: nowIso,
};

const res = await fetch(`${SUPABASE_URL}/rest/v1/updates`, {
  method: 'POST',
  headers: { ...headers, Prefer: 'return=representation' },
  body: JSON.stringify(entry),
});
if (!res.ok) {
  console.error(`Error insertando changelog (${res.status}):`, await res.text());
  process.exit(1);
}
console.log(`Changelog ${version} publicado con ${items.length} items.`);
