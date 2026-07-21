#!/usr/bin/env node
// watch-descargas.mjs — Vigilante de correos "específicos".
// Cada corrida (una pasada): busca correos NUEVOS en Ailnest que cumplan alguna
// regla de `reglas-descarga.json` y guarda su contenido como nota en el Segundo
// Cerebro. Anti-duplicado en `estado-descargas.json`. Lo dispara launchd por
// intervalo (com.nexus.correo-watch). Cuando se conecte la API de Google, se
// agrega una fuente `fuente-gmail.mjs` con la misma idea (y push en tiempo real).
//
// FUENTE ACTUAL: Ailnest (Supabase otuzwaxanenbmpvnfsik), solo lectura.

import os from 'node:os';
import path from 'node:path';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';

const NEXUS = path.join(os.homedir(), 'nexus');
process.loadEnvFile(path.join(NEXUS, '.env'));

const BASE = (process.env.EMAILS_SUPABASE_URL || '').trim().replace(/\/+$/, '') + '/rest/v1';
const KEY = (process.env.EMAILS_SUPABASE_SERVICE_KEY || '').trim();
const OWNERS_RAW = (process.env.NESTOR_OWNER_EMAIL || '').trim();
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY };

const DIR = path.join(NEXUS, 'conector-correo');
const REGLAS_PATH = path.join(DIR, 'reglas-descarga.json');
const ESTADO_PATH = path.join(DIR, 'estado-descargas.json');
const CEREBRO_CORREOS = path.join(NEXUS, 'cerebro', '90-Agente', 'Correos');

const log = (m) => console.log(`[correo-watch ${new Date().toISOString()}] ${m}`);
const enc = (s) => encodeURIComponent(s);
async function get(query) {
  const r = await fetch(`${BASE}/${query}`, { headers: H });
  if (!r.ok) throw new Error(`REST ${r.status}: ${(await r.text()).slice(0, 150)}`);
  return r.json();
}
function leerJson(p, def) { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return def; } }
function guardarJson(p, o) { writeFileSync(p, JSON.stringify(o, null, 2)); }

async function ownerUserIds() {
  const emails = OWNERS_RAW.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  const orU = emails.map((e) => `email.ilike.${e}`).join(',');
  const orC = emails.map((e) => `google_email.ilike.${e}`).join(',');
  const [us, cs] = await Promise.all([
    get(`users?select=id&or=(${enc(orU)})`).catch(() => []),
    get(`companies?select=user_id&or=(${enc(orC)})`).catch(() => []),
  ]);
  const ids = new Set([...us.map((r) => r.id), ...cs.map((r) => r.user_id).filter(Boolean)]);
  if (!ids.size) throw new Error('Ninguna cuenta del dueño está vinculada en ailnest.');
  return [...ids];
}

// ¿El correo cumple la regla? Criterios opcionales, todos los presentes deben cumplirse.
function coincide(email, regla) {
  const sender = (email.sender || '').toLowerCase();
  const subject = (email.subject || '').toLowerCase();
  const empresa = (email.companies?.name || '').toLowerCase();
  if (regla.remitente && !sender.includes(String(regla.remitente).toLowerCase())) return false;
  if (regla.asunto_contiene && !subject.includes(String(regla.asunto_contiene).toLowerCase())) return false;
  if (regla.empresa && !empresa.includes(String(regla.empresa).toLowerCase())) return false;
  if (regla.solo_importantes && email.is_important !== true) return false;
  // Debe haber al menos un criterio real (evita reglas que matcheen todo).
  return Boolean(regla.remitente || regla.asunto_contiene || regla.empresa);
}

function limpiar(b, max = 20000) {
  if (!b) return '(sin contenido)';
  const t = b.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}
const slug = (s) => (s || 'sin-asunto').replace(/[\/\\:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim().slice(0, 80);

function guardarEnCerebro(email, regla) {
  if (!existsSync(CEREBRO_CORREOS)) mkdirSync(CEREBRO_CORREOS, { recursive: true });
  const fecha = String(email.received_at || '').slice(0, 10) || 'sin-fecha';
  const archivo = path.join(CEREBRO_CORREOS, `${fecha} — ${slug(email.subject)}.md`);
  const cuerpo = `---
tipo: correo
tags: [agente, correo, "${regla.nombre || 'regla'}"]
autor: 2cerebro
regla: ${regla.nombre || ''}
de: ${email.sender || ''}
asunto: ${(email.subject || '').replace(/\n/g, ' ')}
fecha: ${email.received_at || ''}
adjuntos: ${email.has_attachment === true}
---

# ${email.subject || '(sin asunto)'}

- **De:** ${email.sender || '-'}
- **Fecha:** ${email.received_at || '-'}
- **Empresa:** ${email.companies?.name || '-'}
- **Regla:** ${regla.nombre || '-'}

---

${limpiar(email.body || email.html_body)}
`;
  writeFileSync(archivo, cuerpo);
  return archivo;
}

(async () => {
  if (!BASE.startsWith('http') || !KEY || !OWNERS_RAW) { log('Falta config de correo en .env. Salgo.'); return; }
  const reglas = (leerJson(REGLAS_PATH, { reglas: [] }).reglas || []).filter((r) => r && r.activa !== false);
  if (!reglas.length) { log('No hay reglas activas. Nada que vigilar.'); return; }

  const estado = leerJson(ESTADO_PATH, {});
  // Primera corrida: arranca desde AHORA (no baja todo el histórico).
  const desde = estado.ultimo_check || new Date().toISOString();
  const vistos = new Set(estado.vistos || []);

  const owners = await ownerUserIds();
  const inList = `(${owners.join(',')})`;
  const rows = await get(
    `emails?select=id,sender,subject,body,html_body,is_important,has_attachment,received_at,companies(name)` +
    `&user_id=in.${inList}&received_at=gt.${enc(desde)}&order=received_at.asc&limit=100`
  );

  let bajados = 0, maxFecha = desde;
  for (const email of rows) {
    if (email.received_at > maxFecha) maxFecha = email.received_at;
    if (vistos.has(email.id)) continue;
    const regla = reglas.find((r) => coincide(email, r));
    if (!regla) continue;
    try {
      const archivo = guardarEnCerebro(email, regla);
      vistos.add(email.id);
      bajados++;
      log(`Descargado: "${(email.subject || '').slice(0, 50)}" (regla: ${regla.nombre}) → ${path.basename(archivo)}`);
    } catch (e) { log(`Error guardando ${email.id}: ${e.message}`); }
  }

  // Guarda estado (recorta la lista de vistos a los últimos 500 para no crecer infinito).
  guardarJson(ESTADO_PATH, { ultimo_check: maxFecha, vistos: [...vistos].slice(-500), ultima_corrida: new Date().toISOString(), revisados: rows.length, bajados });
  log(`Pasada lista. Revisados: ${rows.length}, descargados: ${bajados}.`);
})().catch((e) => { log('ERROR: ' + e.message); process.exit(1); });
