#!/usr/bin/env node
// Conector de Correo de Nexus — porta las funciones de Néstor (repo agentesia)
// contra la plataforma "ailnest" (proyecto Supabase otuzwaxanenbmpvnfsik), vía REST
// con service_role (salta el RLS). Solo lectura. Salida JSON para el agente.
//
// Uso (el agente lo llama por shell):
//   node correo.mjs resumen   [--dias 7] [--importantes] [--empresa X] [--limite 10]
//   node correo.mjs buscar    [--texto T] [--remitente R] [--empresa E] [--dias 30]
//   node correo.mjs leer      --id <id8|uuid>
//   node correo.mjs reuniones [--dias 14]
//   node correo.mjs estado
//
// Requiere en ~/nexus/.env: EMAILS_SUPABASE_URL, EMAILS_SUPABASE_SERVICE_KEY, NESTOR_OWNER_EMAIL
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';

process.loadEnvFile(path.join(os.homedir(), 'nexus', '.env'));
const BASE = (process.env.EMAILS_SUPABASE_URL || '').trim().replace(/\/+$/, '') + '/rest/v1';
const KEY = (process.env.EMAILS_SUPABASE_SERVICE_KEY || '').trim();
const OWNERS_RAW = (process.env.NESTOR_OWNER_EMAIL || '').trim();

function salir(obj) { console.log(JSON.stringify(obj, null, 2)); process.exit(0); }
function error(msg) { console.log(JSON.stringify({ error: msg }, null, 2)); process.exit(1); }
if (!BASE.startsWith('http') || !KEY) error('Falta EMAILS_SUPABASE_URL / EMAILS_SUPABASE_SERVICE_KEY en ~/nexus/.env.');
if (!OWNERS_RAW) error('Falta NESTOR_OWNER_EMAIL en ~/nexus/.env.');

const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };
async function get(query) {
  const r = await fetch(`${BASE}/${query}`, { headers: H });
  if (!r.ok) throw new Error(`REST ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

// flags
const cmd = process.argv[2];
const flags = {};
for (let i = 3; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a.startsWith('--')) { const k = a.slice(2); const v = process.argv[i + 1]; if (!v || v.startsWith('--')) flags[k] = true; else { flags[k] = v; i++; } }
}

const shortDate = (d) => String(d ?? '').slice(0, 16).replace('T', ' ');
function cleanBody(b, max = 1500) {
  if (!b) return '(sin contenido)';
  const t = b.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}
const mapEmails = (rows) => rows.map((e) => ({
  id: String(e.id).slice(0, 8), de: e.sender, asunto: e.subject || '(sin asunto)',
  empresa: e.companies?.name ?? null, fecha: shortDate(e.received_at),
  importante: e.is_important === true, adjuntos: e.has_attachment === true,
}));
const isoHaceDias = (dias) => new Date(Date.now() - dias * 86400000).toISOString();
const enc = (s) => encodeURIComponent(s);

async function ownerUserIds() {
  const emails = OWNERS_RAW.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  const orU = emails.map((e) => `email.ilike.${e}`).join(',');
  const orC = emails.map((e) => `google_email.ilike.${e}`).join(',');
  const [us, cs] = await Promise.all([
    get(`users?select=id&or=(${enc(orU)})`).catch(() => []),
    get(`companies?select=user_id&or=(${enc(orC)})`).catch(() => []),
  ]);
  const ids = new Set([...us.map((r) => r.id), ...cs.map((r) => r.user_id).filter(Boolean)]);
  if (!ids.size) throw new Error(`Ninguna cuenta (${emails.join(', ')}) está vinculada en ailnest.`);
  return [...ids];
}
const inList = (ids) => `(${ids.join(',')})`;

// leer: prefijo de 8 hex -> rango uuid; uuid completo -> eq
function filtroId(ref) {
  const r = ref.trim().toLowerCase().replace(/^#/, '');
  if (r.length >= 36) return `id=eq.${r}`;
  const p = r.slice(0, 8);
  return `id=gte.${p}-0000-0000-0000-000000000000&id=lte.${p}-ffff-ffff-ffff-ffffffffffff`;
}

try {
  if (cmd === 'resumen') {
    const owners = await ownerUserIds();
    const dias = Math.min(Number(flags.dias) || 7, 90);
    const limite = Math.min(Number(flags.limite) || 10, 25);
    const join = flags.empresa ? 'companies!inner(name)' : 'companies(name)';
    let qs = `emails?select=id,sender,subject,is_important,has_attachment,received_at,${join}` +
      `&user_id=in.${inList(owners)}&received_at=gte.${isoHaceDias(dias)}` +
      `&order=is_important.desc.nullslast,received_at.desc&limit=${limite}`;
    if (flags.importantes) qs += `&is_important=eq.true`;
    if (flags.empresa) qs += `&companies.name=ilike.*${enc(flags.empresa)}*`;
    const rows = await get(qs);
    salir(rows.length ? { total: rows.length, correos: mapEmails(rows) } : { correos: [], nota: `Sin correos en los últimos ${dias} días con esos filtros.` });
  }

  if (cmd === 'buscar') {
    const owners = await ownerUserIds();
    const dias = Math.min(Number(flags.dias) || 30, 365);
    const join = flags.empresa ? 'companies!inner(name)' : 'companies(name)';
    let qs = `emails?select=id,sender,subject,is_important,has_attachment,received_at,${join}` +
      `&user_id=in.${inList(owners)}&received_at=gte.${isoHaceDias(dias)}&order=received_at.desc&limit=15`;
    let algun = false;
    if (flags.texto) { qs += `&or=(subject.ilike.*${enc(flags.texto)}*,body.ilike.*${enc(flags.texto)}*)`; algun = true; }
    if (flags.remitente) { qs += `&sender=ilike.*${enc(flags.remitente)}*`; algun = true; }
    if (flags.empresa) { qs += `&companies.name=ilike.*${enc(flags.empresa)}*`; algun = true; }
    if (!algun) error('Indica al menos un criterio: --texto, --remitente o --empresa.');
    const rows = await get(qs);
    salir(rows.length ? { total: rows.length, correos: mapEmails(rows) } : { correos: [], nota: 'Sin resultados para esa búsqueda.' });
  }

  if (cmd === 'leer') {
    if (!flags.id) error('Falta --id <id8|uuid>.');
    const owners = await ownerUserIds();
    const qs = `emails?select=id,sender,recipients,cc_recipients,subject,body,html_body,is_important,has_attachment,received_at,companies(name)` +
      `&${filtroId(String(flags.id))}&user_id=in.${inList(owners)}&order=received_at.desc&limit=2`;
    const rows = await get(qs);
    if (!rows.length) error(`No encontré el correo ${flags.id}.`);
    if (rows.length > 1) error(`Hay varios correos que empiezan con ${flags.id}; usa más caracteres.`);
    const e = rows[0];
    salir({ de: e.sender, para: e.recipients, cc: e.cc_recipients || null, asunto: e.subject || '(sin asunto)',
      empresa: e.companies?.name ?? null, fecha: shortDate(e.received_at), importante: e.is_important === true,
      adjuntos: e.has_attachment === true, contenido: cleanBody(e.body || e.html_body) });
  }

  if (cmd === 'reuniones') {
    const owners = await ownerUserIds();
    const dias = Math.min(Number(flags.dias) || 14, 90);
    const ahora = new Date().toISOString();
    const hasta = isoHaceDias(-dias);
    const qs = `calendar_events?select=title,description,start_time,end_time,attendees,is_meeting,companies(name)` +
      `&user_id=in.${inList(owners)}&start_time=gte.${ahora}&start_time=lte.${hasta}&order=start_time.asc&limit=15`;
    const rows = await get(qs);
    salir(rows.length ? { eventos: rows.map((ev) => ({ titulo: ev.title, empresa: ev.companies?.name ?? null,
      inicio: shortDate(ev.start_time), fin: ev.end_time ? shortDate(ev.end_time) : null,
      es_reunion: ev.is_meeting === true, invitados: Array.isArray(ev.attendees) ? ev.attendees.slice(0, 6) : ev.attendees }))
    } : { eventos: [], nota: `Sin eventos en los próximos ${dias} días.` });
  }

  if (cmd === 'estado') {
    const owners = await ownerUserIds();
    const companies = await get(`companies?select=name,google_email,is_connected,last_sync&user_id=in.${inList(owners)}&order=name.asc`);
    const log = await get(`gmail_sync_log?select=sync_type,sync_status,message,last_synced_at&user_id=in.${inList(owners)}&order=created_at.desc&limit=5`).catch(() => []);
    salir({
      cuentas: companies.map((co) => ({ empresa: co.name, gmail: co.google_email, conectada: co.is_connected === true, ultima_sincronizacion: co.last_sync ? shortDate(co.last_sync) : 'nunca' })),
      ultimas_sincronizaciones: log.map((l) => ({ tipo: l.sync_type, estado: l.sync_status, detalle: l.message, fecha: l.last_synced_at ? shortDate(l.last_synced_at) : null })),
      nota: 'La sincronización la hace la plataforma ailnest; si una cuenta aparece desconectada, reconéctala desde la web.',
    });
  }

  error(`Comando desconocido: "${cmd || ''}". Usa: resumen | buscar | leer | reuniones | estado`);
} catch (e) {
  error(e.message);
}
