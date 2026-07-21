#!/usr/bin/env node
// Registrador de consumo de API.
// Lee el uso real de OpenClaw (trazas de sesión: type="model.completed" con data.usage,
// que YA trae el costo por llamada) y reconstruye la tabla `consumo_api` que el Hub lee.
// Idempotente: cada corrida recalcula TODO desde las trazas y reemplaza las filas.
//
// Uso CLI:  node registrar.mjs
// Como módulo:  import { registrar } from './registrar.mjs';  await registrar();
//
// Fuente:  ~/.openclaw/agents/*/sessions/*.trajectory.jsonl
// Destino: consumo_api en el Supabase del .env (SUPABASE_URL + SERVICE_ROLE_KEY).

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const NEXUS = path.join(os.homedir(), 'nexus');

// Precios por millón de tokens (fallback si una traza no trae cost ya calculado).
const PRECIOS = {
  'claude-haiku-4-5':  { in: 1,  out: 5,  cr: 0.10, cw: 1.25 },
  'claude-sonnet-4-6': { in: 3,  out: 15, cr: 0.30, cw: 3.75 },
  'claude-opus-4-8':   { in: 15, out: 75, cr: 1.50, cw: 18.75 },
};
function costoFallback(modelo, u) {
  const p = PRECIOS[modelo]; if (!p) return 0;
  return ((u.input || 0) * p.in + (u.output || 0) * p.out + (u.cacheRead || 0) * p.cr + (u.cacheWrite || 0) * p.cw) / 1e6;
}

export async function registrar() {
  process.loadEnvFile(path.join(NEXUS, '.env'));
  const SURL = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const SKEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!SURL || !SKEY) throw new Error('Faltan SUPABASE_URL / SERVICE_ROLE_KEY en .env');
  const H = { apikey: SKEY, Authorization: 'Bearer ' + SKEY, 'Content-Type': 'application/json' };

  // --- Recolectar trazas ---
  const agentesDir = path.join(os.homedir(), '.openclaw', 'agents');
  const archivos = [];
  for (const ag of fs.readdirSync(agentesDir)) {
    const sdir = path.join(agentesDir, ag, 'sessions');
    if (!fs.existsSync(sdir)) continue;
    for (const f of fs.readdirSync(sdir)) if (f.endsWith('.trajectory.jsonl')) archivos.push(path.join(sdir, f));
  }

  const agg = new Map(); // clave `dia|agente|modelo`
  let llamadas = 0;
  for (const file of archivos) {
    let lineas;
    try { lineas = fs.readFileSync(file, 'utf8').split('\n'); } catch { continue; }
    for (const linea of lineas) {
      if (!linea || !linea.includes('"model.completed"')) continue;
      let j; try { j = JSON.parse(linea); } catch { continue; }
      if (j.type !== 'model.completed') continue;
      const u = j.data?.usage; if (!u) continue;
      const ts = j.ts || j.data?.ts; if (!ts) continue;
      const dia = String(ts).slice(0, 10);
      const modelo = j.modelId || j.data?.modelId || 'desconocido';
      const partes = String(j.sessionKey || '').split(':');
      const agente = partes[2] || partes[1] || 'openclaw';
      const inp = u.input || 0, out = u.output || 0, cr = u.cacheRead || 0, cw = u.cacheWrite || 0;
      const costo = (u.cost && typeof u.cost.total === 'number') ? u.cost.total : costoFallback(modelo, u);
      const k = `${dia}|${agente}|${modelo}`;
      const a = agg.get(k) || { dia, agente, modelo, tokens_in: 0, tokens_out: 0, costo_usd: 0, cacheado: false };
      a.tokens_in += inp + cr + cw;
      a.tokens_out += out;
      a.costo_usd += costo;
      if (cr > 0 || cw > 0) a.cacheado = true;
      agg.set(k, a);
      llamadas++;
    }
  }

  const filas = [...agg.values()].map(r => ({ ...r, costo_usd: Number(r.costo_usd.toFixed(8)), batch: false }));

  async function rest(method, pathq, body) {
    const r = await fetch(`${SURL}/rest/v1/${pathq}`, { method, headers: H, body: body ? JSON.stringify(body) : undefined });
    if (!r.ok && r.status !== 404) throw new Error(`${method} ${pathq} -> HTTP ${r.status}: ${(await r.text()).slice(0, 200)}`);
    return r;
  }
  await rest('DELETE', 'consumo_api?id=gt.0');
  for (let i = 0; i < filas.length; i += 500) await rest('POST', 'consumo_api', filas.slice(i, i + 500));

  const totalUSD = filas.reduce((s, f) => s + f.costo_usd, 0);
  const totalTok = filas.reduce((s, f) => s + f.tokens_in + f.tokens_out, 0);
  return { archivos: archivos.length, llamadas, filas: filas.length, totalTokens: totalTok, totalUSD };
}

// CLI
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  registrar()
    .then(r => console.log(`OK consumo_api: ${r.filas} filas · ${r.llamadas} llamadas · ${r.totalTokens.toLocaleString()} tokens · $${r.totalUSD.toFixed(4)}`))
    .catch(e => { console.error('Error:', e.message); process.exit(1); });
}
