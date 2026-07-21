// gmail-adjuntos.mjs — Descarga DOCUMENTOS (adjuntos) del Gmail conectado de Nexus
// vía la API de Google (usa el refresh_token de google/token.json). Solo lectura.
// Lo usa el asistente (tool gmail_documentos) y se puede correr como CLI para probar.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GDIR = join(__dirname, 'google');
const DEST = join(__dirname, 'descargas');

function _oauthClient() {
  const j = JSON.parse(readFileSync(join(GDIR, 'oauth-client.json'), 'utf8'));
  return j.installed || j.web || {};
}

async function accessToken() {
  const c = _oauthClient();
  const t = JSON.parse(readFileSync(join(GDIR, 'token.json'), 'utf8'));
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: c.client_id, client_secret: c.client_secret, refresh_token: t.refresh_token, grant_type: 'refresh_token' }),
    signal: AbortSignal.timeout(15000),
  });
  const tok = await r.json();
  if (!tok.access_token) throw new Error('no se pudo refrescar el token de Gmail: ' + JSON.stringify(tok).slice(0, 120));
  return { at: tok.access_token, email: t.email };
}

const api = (at, path) => fetch('https://gmail.googleapis.com/gmail/v1/users/me/' + path, { headers: { Authorization: 'Bearer ' + at }, signal: AbortSignal.timeout(30000) }).then((r) => r.json());

// Recorre el árbol de parts y junta los que tengan filename + attachmentId.
function adjuntosDe(payload, acc = []) {
  if (!payload) return acc;
  const fn = (payload.filename || '').trim();
  const attId = payload.body && payload.body.attachmentId;
  if (fn && attId) acc.push({ filename: fn, attachmentId: attId, mime: payload.mimeType || '' });
  for (const p of payload.parts || []) adjuntosDe(p, acc);
  return acc;
}
const header = (payload, name) => ((payload.headers || []).find((h) => h.name.toLowerCase() === name.toLowerCase()) || {}).value || '';
const b64urlToBuf = (s) => Buffer.from(String(s || '').replace(/-/g, '+').replace(/_/g, '/'), 'base64');
const safe = (s) => String(s || 'archivo').replace(/[^\w.\- áéíóúñ]/gi, '_').slice(0, 80);

// Descarga los adjuntos de los correos que calcen. Opts: { remitente, asunto, dias, limite, tipos:[ext], q }.
export async function descargarAdjuntos(opts = {}) {
  const { at, email } = await accessToken();
  const partes = ['has:attachment'];
  if (opts.remitente) partes.push(`from:${opts.remitente}`);
  if (opts.asunto) partes.push(`subject:(${opts.asunto})`);
  const dias = Number(opts.dias) > 0 ? Number(opts.dias) : 30;
  partes.push(`newer_than:${dias}d`);
  if (opts.q) partes.push(opts.q);
  const q = encodeURIComponent(partes.join(' '));
  const limite = Math.min(Math.max(Number(opts.limite) || 5, 1), 20);
  const tipos = Array.isArray(opts.tipos) ? opts.tipos.map((t) => String(t).toLowerCase().replace(/^\./, '')) : null;

  const lst = await api(at, `messages?q=${q}&maxResults=${limite}`);
  const ids = (lst.messages || []).map((m) => m.id);
  if (!existsSync(DEST)) mkdirSync(DEST, { recursive: true });

  const out = [];
  for (const id of ids) {
    const msg = await api(at, `messages/${id}?format=full`);
    const p = msg.payload || {};
    const de = header(p, 'From'); const asunto = header(p, 'Subject'); const fecha = header(p, 'Date');
    for (const adj of adjuntosDe(p)) {
      const ext = (adj.filename.split('.').pop() || '').toLowerCase();
      if (tipos && !tipos.includes(ext)) continue;
      let data;
      try {
        const a = await api(at, `messages/${id}/attachments/${adj.attachmentId}`);
        data = b64urlToBuf(a.data);
      } catch { continue; }
      if (!data || !data.length) continue;
      const archivo = join(DEST, `${Date.now()}-${safe(adj.filename)}`);
      writeFileSync(archivo, data);
      out.push({ archivo, nombre: adj.filename, mime: adj.mime, kb: Math.round(data.length / 1024), de, asunto, fecha });
    }
  }
  return { ok: true, cuenta: email, total: out.length, adjuntos: out };
}

// CLI: node gmail-adjuntos.mjs --remitente X --asunto Y --dias 60 --limite 5 --tipos pdf,jpg
if (import.meta.url === `file://${process.argv[1]}`) {
  const a = {}; const av = process.argv.slice(2);
  for (let i = 0; i < av.length; i++) if (av[i].startsWith('--')) { a[av[i].slice(2)] = (av[i + 1] && !av[i + 1].startsWith('--')) ? av[++i] : true; }
  const opts = { remitente: a.remitente, asunto: a.asunto, dias: a.dias, limite: a.limite, q: a.q, tipos: a.tipos ? String(a.tipos).split(',') : null };
  descargarAdjuntos(opts).then((r) => console.log(JSON.stringify(r, null, 1))).catch((e) => console.log(JSON.stringify({ ok: false, error: e.message })));
}
