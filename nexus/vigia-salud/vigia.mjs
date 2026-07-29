#!/usr/bin/env node
// Vigía de Salud del Mac mini — Nexus
// Filosofía: observa, mide, registra y AVISA. La ÚNICA acción destructiva es matar Chrome
//            HUÉRFANO del banco (login-humano muerto, PPID=1, no-daemon) — nada más. Nunca toca
//            los 3 daemons persistentes, ni el Chrome personal, ni servicios de Nexus/estudio.
// Corre una vez y sale (lo agenda launchd cada 3 min). Bajo consumo.

import { execSync } from 'node:child_process';
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.join(os.homedir(), 'nexus', 'vigia-salud');
const ESTADO = path.join(DIR, 'estado.json');
const HIST = path.join(DIR, 'historial.jsonl');
const FLAG_WA = path.join(DIR, 'ALERTAR_WHATSAPP'); // si existe -> además avisa por WhatsApp (opt-in)
const CFG = path.join(DIR, 'config.json');

const NUCLEOS = os.cpus().length || 6;

// ---- Umbrales (ajustables en config.json) ----
const def = {
  loadWarnPorNucleo: 0.85,   // load1/nucleos
  loadRojoPorNucleo: 1.30,
  swapWarnMB: 1024,
  swapRojoMB: 1800,
  freeWarnMB: 1500,
  freeRojoMB: 700,
  claudeSesionesWarn: 5,     // sesiones claude CLI simultáneas
  claudeSesionesRojo: 8,
  claudeIdleHoras: 6,        // sesión de chat "vieja" candidata a reciclar (solo se REPORTA)
  discoWarnPct: 85,
  discoRojoPct: 92,
  reNotificarMin: 30,        // re-avisar cada N min si sigue en ROJO
  histMaxLineas: 5000,
  numeroWhatsApp: '',        // llénalo si activas WhatsApp
};
let cfg = def;
try { if (fs.existsSync(CFG)) cfg = { ...def, ...JSON.parse(fs.readFileSync(CFG, 'utf8')) }; } catch {}

const sh = (c) => { try { return execSync(c, { encoding: 'utf8', timeout: 8000 }).trim(); } catch { return ''; } };
const num = (x) => { const n = parseFloat(x); return Number.isFinite(n) ? n : 0; };

// ---- Métricas ----
const [l1] = os.loadavg();
const freeMB = Math.round(os.freemem() / 1048576);
const totalMB = Math.round(os.totalmem() / 1048576);

// swap
let swapUsedMB = 0;
const sw = sh('/usr/sbin/sysctl -n vm.swapusage');
const m = sw.match(/used\s*=\s*([\d.]+)M/);
if (m) swapUsedMB = Math.round(num(m[1]));

// compressor (vm_stat, páginas de 16384 bytes en Apple Silicon / 4096 Intel)
let compMB = 0;
const vmstat = sh('/usr/bin/vm_stat');
const pgSize = num((vmstat.match(/page size of (\d+)/) || [])[1]) || 4096;
const comp = num((vmstat.match(/occupied by compressor:\s*([\d.]+)/) || [])[1]);
compMB = Math.round(comp * pgSize / 1048576);

// disco (volumen de datos)
let discoPct = 0;
const dfo = sh("df -k /System/Volumes/Data");
const dm = dfo.match(/(\d+)%/);
if (dm) discoPct = num(dm[1]);

// procesos
const totalProc = num(sh('ps -A | wc -l'));

// sesiones claude CLI + edades. macOS usa etime con formato [[dd-]hh:]mm:ss
const etimeASeg = (e) => {
  let dias = 0, resto = e;
  if (e.includes('-')) { const p = e.split('-'); dias = num(p[0]); resto = p[1]; }
  const partes = resto.split(':').map(num);
  let seg = 0;
  if (partes.length === 3) seg = partes[0] * 3600 + partes[1] * 60 + partes[2];
  else if (partes.length === 2) seg = partes[0] * 60 + partes[1];
  else seg = partes[0] || 0;
  return dias * 86400 + seg;
};
let claudeSesiones = [];
const psClaude = sh("ps -Ao pid,etime,rss,command | grep '[.]local/bin/claude' | grep -v grep");
if (psClaude) {
  for (const ln of psClaude.split('\n')) {
    const t = ln.trim().split(/\s+/);
    const pid = num(t[0]), edadSeg = etimeASeg(t[1] || ''), rss = num(t[2]);
    if (pid) claudeSesiones.push({ pid, edadSeg, rssMB: Math.round(rss / 1024) });
  }
}
const nClaude = claudeSesiones.length;
const claudeViejas = claudeSesiones.filter(s => s.edadSeg > cfg.claudeIdleHoras * 3600);

// ---- Evaluación ----
const razones = [];
let nivel = 0; // 0 verde, 1 amarillo, 2 rojo
const sube = (n, txt) => { if (n > nivel) nivel = n; razones.push(txt); };

const loadPorN = l1 / NUCLEOS;
if (loadPorN >= cfg.loadRojoPorNucleo) sube(2, `Carga muy alta (${l1.toFixed(1)} en ${NUCLEOS} núcleos)`);
else if (loadPorN >= cfg.loadWarnPorNucleo) sube(1, `Carga elevada (${l1.toFixed(1)})`);

if (swapUsedMB >= cfg.swapRojoMB) sube(2, `Swap crítico (${swapUsedMB} MB)`);
else if (swapUsedMB >= cfg.swapWarnMB) sube(1, `Swap subiendo (${swapUsedMB} MB)`);

if (freeMB <= cfg.freeRojoMB) sube(2, `RAM libre muy baja (${freeMB} MB)`);
else if (freeMB <= cfg.freeWarnMB) sube(1, `RAM libre baja (${freeMB} MB)`);

if (nClaude >= cfg.claudeSesionesRojo) sube(2, `${nClaude} sesiones de chat abiertas`);
else if (nClaude >= cfg.claudeSesionesWarn) sube(1, `${nClaude} sesiones de chat abiertas`);

if (discoPct >= cfg.discoRojoPct) sube(2, `Disco casi lleno (${discoPct}%)`);
else if (discoPct >= cfg.discoWarnPct) sube(1, `Disco alto (${discoPct}%)`);

if (claudeViejas.length) {
  const gb = (claudeViejas.reduce((a, s) => a + s.rssMB, 0) / 1024).toFixed(1);
  razones.push(`Sugerencia: ${claudeViejas.length} sesión(es) de chat llevan +${cfg.claudeIdleHoras}h vivas (~${gb} GB); se pueden reciclar con reciclar-sesiones.sh`);
}

const estadoTxt = ['VERDE', 'AMARILLO', 'ROJO'][nivel];
const ahora = Date.now();
const snap = {
  ts: new Date(ahora).toISOString(),
  estado: estadoTxt,
  nivel,
  razones,
  metricas: {
    load1: +l1.toFixed(2), nucleos: NUCLEOS, loadPorNucleo: +loadPorN.toFixed(2),
    ramLibreMB: freeMB, ramTotalMB: totalMB, swapUsedMB, compresorMB: compMB,
    discoPct, procesos: totalProc, sesionesClaude: nClaude,
    sesionesClaudeViejas: claudeViejas.length,
  },
};

// ---- Persistencia (estado + historial acotado) ----
let prev = {};
try { if (fs.existsSync(ESTADO)) prev = JSON.parse(fs.readFileSync(ESTADO, 'utf8')); } catch {}

fs.writeFileSync(ESTADO, JSON.stringify({ ...snap, ultimaAlerta: prev.ultimaAlerta || null }, null, 2));

// historial: append + recorte
try {
  fs.appendFileSync(HIST, JSON.stringify(snap) + '\n');
  const lineas = fs.readFileSync(HIST, 'utf8').split('\n').filter(Boolean);
  if (lineas.length > cfg.histMaxLineas) {
    fs.writeFileSync(HIST, lineas.slice(-cfg.histMaxLineas).join('\n') + '\n');
  }
} catch {}

// ---- Housekeeping seguro ----
try {
  // PNGs de gráficos en /tmp de más de 2 días
  sh("find /tmp -maxdepth 1 -name '*.png' -mtime +2 -delete 2>/dev/null");
} catch {}

// ---- AUTO-SANACIÓN quirúrgica (pedido de Ramón: que se arregle solo, no dependa de él).
//      ÚNICA acción destructiva y ACOTADA: matar Chrome HUÉRFANO del banco = Chrome de un
//      perfil chrome-profile-tek cuyo login-humano YA MURIÓ (PPID=1) y que NO es uno de los 3
//      daemons persistentes (esos tienen --remote-debugging-port). Eso fue lo que ahogó la RAM
//      y colgó el hub el 28-jul. NO toca: los 3 daemons, el Chrome personal, ni servicios Nexus.
//      Se puede apagar creando el archivo vigia-salud/NO_AUTOHEAL.
let saneados = [];
try {
  if (!fs.existsSync(path.join(DIR, 'NO_AUTOHEAL'))) {
    const psCh = sh("ps -Ao pid,ppid,command | grep -i 'conector-tek/chrome-profile' | grep -v grep");
    for (const ln of (psCh ? psCh.split('\n') : [])) {
      if (/--type=/.test(ln)) continue;                    // es un helper, no el proceso principal
      if (/--remote-debugging-port=/.test(ln)) continue;   // es un DAEMON persistente → NO tocar
      const t = ln.trim().split(/\s+/); const pid = num(t[0]); const ppid = num(t[1]);
      if (pid && ppid === 1) { sh(`kill -9 ${pid} 2>/dev/null`); saneados.push(pid); }
    }
  }
} catch {}
if (saneados.length) {
  const msg = `Auto-saneé ${saneados.length} Chrome huérfano(s) del banco (pids ${saneados.join(',')})`;
  razones.push('🔧 ' + msg);
  try { sh(`osascript -e 'display notification "${msg}" with title "🔧 Vigía auto-sanó"'`); } catch {}
}

// ---- Alerta (local siempre; WhatsApp solo si opt-in) ----
function debeAvisar() {
  if (nivel === 0) return false;
  const empeora = nivel > (prev.nivel || 0);
  const laUlt = prev.ultimaAlerta ? Date.parse(prev.ultimaAlerta) : 0;
  const pasoTiempo = (ahora - laUlt) >= cfg.reNotificarMin * 60000;
  return empeora || (nivel === 2 && pasoTiempo);
}

if (debeAvisar()) {
  const titulo = nivel === 2 ? '🔴 Mac saturado' : '🟡 Mac cargado';
  const cuerpo = razones.slice(0, 3).join(' · ').replace(/"/g, "'");
  sh(`osascript -e 'display notification "${cuerpo}" with title "${titulo}" sound name "Ping"'`);

  if (fs.existsSync(FLAG_WA) && cfg.numeroWhatsApp) {
    const msg = `${titulo}\n${razones.slice(0, 4).join('\n')}`.replace(/"/g, "'");
    sh(`openclaw send --to "${cfg.numeroWhatsApp}" --text "${msg}" 2>/dev/null`);
  }

  const est = JSON.parse(fs.readFileSync(ESTADO, 'utf8'));
  est.ultimaAlerta = new Date(ahora).toISOString();
  fs.writeFileSync(ESTADO, JSON.stringify(est, null, 2));
}

console.log(`[${snap.ts}] ${estadoTxt} load=${l1.toFixed(2)} ramLibre=${freeMB}MB swap=${swapUsedMB}MB claude=${nClaude} disco=${discoPct}%`);
