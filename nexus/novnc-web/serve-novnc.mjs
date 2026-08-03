#!/usr/bin/env node
// serve-novnc.mjs — puente robusto navegador <-> pantalla del mini.
//  - sirve los archivos estáticos de noVNC (vnc.html / vnc_lite.html)
//  - en el upgrade WebSocket abre TCP a la pantalla (127.0.0.1:5900) y hace de puente
//  - (opcional) PIN de acceso si NOVNC_PIN está seteado → para exponer por Funnel público
//    SIN romper el uso por tailnet (si NOVNC_PIN vacío, se comporta igual que siempre).
//    El PIN se valida en la página Y en el upgrade WebSocket (si no, se colaban por el WS).
// Sustituye a websockify (el de Node se caía). Sin dependencias raras: solo 'ws'.
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';

// La VNC-auth usa DES, que Node (OpenSSL 3) trae APAGADO salvo con --openssl-legacy-provider.
// Para no depender del plist, si NO arrancamos con la bandera nos RE-LANZAMOS a nosotros mismos
// CON la bandera. El padre queda de wrapper y reenvía la señal de apagado al hijo (no huérfanos).
if (!process.execArgv.includes('--openssl-legacy-provider') && !process.env.__NOVNC_LEGACY) {
  const { spawn } = await import('node:child_process');
  const child = spawn(process.execPath, ['--openssl-legacy-provider', ...process.argv.slice(1)],
    { stdio: 'inherit', env: { ...process.env, __NOVNC_LEGACY: '1' } });
  const killChild = () => { try { child.kill('SIGTERM'); } catch { /* */ } };
  process.on('SIGTERM', killChild); process.on('SIGINT', killChild); process.on('exit', killChild);
  child.on('exit', (code) => process.exit(code == null ? 0 : code));
  await new Promise(() => {});   // el padre espera para siempre; el server corre en el hijo (con DES)
}

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.NOVNC_PORT || 6080);
const BIND = process.env.NOVNC_BIND || '127.0.0.1'; // solo esta interfaz (IP de Tailscale = solo tailnet)
const VNC_HOST = process.env.VNC_HOST || '127.0.0.1';
const VNC_PORT = Number(process.env.VNC_PORT || 5900);
// HTTPS (necesario: la auth Apple/ARD usa WebCrypto, que solo existe en contexto seguro)
const CERT = process.env.NOVNC_CERT, KEY = process.env.NOVNC_KEY;

// ── PIN de un solo uso (Funnel público). El PIN vigente vive en NOVNC_PIN_FILE y lo
//    reescribe el disparador on-demand en CADA sesión de ingreso (PIN nuevo cada vez).
//    Se lee POR REQUEST → rotar el PIN invalida al toque las cookies viejas. Si el archivo
//    está vacío/no existe = NO hay sesión activa → se deniega todo (la URL pública queda
//    inútil salvo durante una ventana de login con PIN vigente). Sin archivo ni NOVNC_PIN
//    = modo abierto (tailnet, como siempre). Cookie firmada; se verifica en HTTP y en el WS.
const PIN_FILE = process.env.NOVNC_PIN_FILE || '';
const PIN_STATIC = process.env.NOVNC_PIN || '';
const REQUIRE_PIN = !!(PIN_FILE || PIN_STATIC);
// Montado bajo un subpath del Funnel (ej. /vnc): Tailscale NO quita el prefijo, así que lo
// recibimos y lo sacamos nosotros; y TODAS las URLs que emitimos (form, redirect, WS) tienen
// que llevar el prefijo, si no el POST/redirect se escapa a la raíz (= el hub, nicojuri.ai).
const PREFIX = (process.env.NOVNC_PREFIX || '').replace(/\/+$/, '');
const WSPATH = (PREFIX ? PREFIX.replace(/^\//, '') + '/' : '') + 'websockify';   // ej. "vnc/websockify"
// Clave VNC dedicada (para auto-autenticar la pantalla detrás del PIN, sin que el usuario la
// teclee). Se lee POR-REQUEST del archivo (creado con kickstart) → si no existe, no se inyecta
// y noVNC pedirá la clave (comportamiento viejo). Va SIEMPRE detrás del PIN de un solo uso.
const VNCPASS_FILE = process.env.NOVNC_VNCPASS_FILE || (PIN_FILE ? path.join(path.dirname(PIN_FILE), '.vnc-pass') : '');
function vncPass() { try { return VNCPASS_FILE ? fs.readFileSync(VNCPASS_FILE, 'utf8').trim() : ''; } catch { return ''; } }
function vncView() {
  let u = `${PREFIX}/vnc_lite.html?path=${encodeURIComponent(WSPATH)}&autoconnect=true&resize=scale&reconnect=true`;
  const pw = vncPass(); if (pw) u += `&password=${encodeURIComponent(pw)}`;
  return u;
}
function currentPin() {
  if (PIN_FILE) { try { const v = fs.readFileSync(PIN_FILE, 'utf8').trim(); return v || null; } catch { return null; } }
  return PIN_STATIC || null;
}
function tokenFor(pin) { return crypto.createHash('sha256').update('ok|novnc-salt|' + pin).digest('hex').slice(0, 40); }
function cookies(req) {
  const out = {}; const h = req.headers.cookie || '';
  for (const part of h.split(';')) { const i = part.indexOf('='); if (i < 0) continue; out[part.slice(0, i).trim()] = part.slice(i + 1).trim(); }
  return out;
}
function authed(req) {
  if (!REQUIRE_PIN) return true;
  const pin = currentPin(); if (!pin) return false;   // sin sesión activa → nadie entra
  return cookies(req).nvauth === tokenFor(pin);
}
const PINPAGE = `<!doctype html><html lang=es><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>Acceso</title></head><body style="font-family:system-ui,-apple-system,sans-serif;background:#0f1115;color:#e8e8ea;display:grid;place-items:center;min-height:100vh;margin:0"><form method=POST action="${PREFIX}/__pin" style="text-align:center;max-width:280px"><div style="font-size:34px">🔐</div><h3 style="font-weight:600">PIN de acceso</h3><input name=pin type=password inputmode=numeric autocomplete=off autofocus placeholder="••••••" style="font-size:22px;letter-spacing:4px;padding:12px;border-radius:10px;border:1px solid #333;background:#1a1d24;color:#fff;text-align:center;width:180px"><br><br><button style="font-size:16px;padding:11px 30px;border-radius:10px;border:0;background:#e0322f;color:#fff;font-weight:600;cursor:pointer">Entrar</button></form></body></html>`;
const NOSESSION = `<!doctype html><html lang=es><head><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>Sin sesión</title></head><body style="font-family:system-ui,-apple-system,sans-serif;background:#0f1115;color:#9aa0aa;display:grid;place-items:center;min-height:100vh;margin:0;text-align:center"><div><div style="font-size:34px">🔒</div><h3 style="color:#e8e8ea;font-weight:600">No hay una sesión de ingreso activa</h3><p>Pedí una operación que necesite el banco y te llega un PIN nuevo por WhatsApp.</p></div></body></html>`;

const MIME = { '.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript',
  '.css':'text/css', '.png':'image/png', '.svg':'image/svg+xml', '.ico':'image/x-icon',
  '.json':'application/json', '.woff2':'font/woff2', '.woff':'font/woff', '.map':'application/json' };

const useTls = CERT && KEY && fs.existsSync(CERT) && fs.existsSync(KEY);
const handler = (req, res) => {
  let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if (PREFIX && (urlPath === PREFIX || urlPath.startsWith(PREFIX + '/'))) urlPath = urlPath.slice(PREFIX.length) || '/';
  // POST del PIN
  if (REQUIRE_PIN && req.method === 'POST' && urlPath === '/__pin') {
    let b = ''; req.on('data', (d) => { b += d; if (b.length > 2000) req.destroy(); });
    req.on('end', () => {
      const pin = currentPin();
      const m = /(?:^|&)pin=([^&]*)/.exec(b); const got = decodeURIComponent((m ? m[1] : '').replace(/\+/g, ' '));
      if (pin && got && got === pin) {
        res.writeHead(302, { 'set-cookie': `nvauth=${tokenFor(pin)}; Path=${PREFIX || '/'}; HttpOnly; Secure; SameSite=Lax; Max-Age=3600`, location: vncView() });
        res.end();
      } else { res.writeHead(401, { 'content-type': 'text/html; charset=utf-8' }); res.end(pin ? PINPAGE : NOSESSION); }
    });
    return;
  }
  // Muro: sin sesión activa (PIN vigente) muestra "sin sesión"; con sesión pide el PIN.
  if (!authed(req)) {
    const body = (REQUIRE_PIN && !currentPin()) ? NOSESSION : PINPAGE;
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(body);
  }
  // Estáticos (ya autenticado). La raíz → la vista noVNC con autoconnect (bajo el prefijo).
  if (urlPath === '/' || urlPath === '') { res.writeHead(302, { location: vncView() }); return res.end(); }
  let p = urlPath;
  const file = path.normalize(path.join(ROOT, p));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(buf);
  });
};

const server = useTls
  ? https.createServer({ cert: fs.readFileSync(CERT), key: fs.readFileSync(KEY) }, handler)
  : http.createServer(handler);

// VNC auth (RFB security type 2): respuesta DES al challenge de 16 bytes. La clave VNC va con
// los BITS de cada byte INVERTIDOS (particularidad de VNC), null-padded a 8, como key DES-ECB.
function vncDesResponse(challenge, password) {
  const key = Buffer.alloc(8, 0);
  const pw = Buffer.from(String(password || '').slice(0, 8), 'latin1');
  for (let i = 0; i < pw.length; i++) { let b = pw[i], r = 0; for (let j = 0; j < 8; j++) { r = (r << 1) | (b & 1); b >>= 1; } key[i] = r & 0xff; }
  const cipher = crypto.createCipheriv('des-ecb', key, null);
  cipher.setAutoPadding(false);
  return Buffer.concat([cipher.update(challenge), cipher.final()]);
}

// PUENTE con AUTH DEL LADO DEL SERVIDOR: el bridge se autentica contra macOS (RFB type 2) con la
// clave VNC, y le presenta a noVNC "sin auth" (type 1) → el navegador NUNCA pide clave. Resuelve
// el choque noVNC↔macOS (macOS negocia su auth de cuenta y rebota la clave VNC pasada por URL).
async function authProxy(ws, tcp, password, log) {
  const mk = (emitter, evt, wrap) => {
    const st = { buf: Buffer.alloc(0), q: [] };
    st.on = (d) => { st.buf = Buffer.concat([st.buf, wrap ? (Buffer.isBuffer(d) ? d : Buffer.from(d)) : d]); pump(st); };
    emitter.on(evt, st.on); return st;
  };
  const pump = (st) => { while (st.q.length && st.buf.length >= st.q[0].n) { const w = st.q.shift(); const out = st.buf.subarray(0, w.n); st.buf = st.buf.subarray(w.n); w.res(out); } };
  const read = (st, n) => new Promise((res) => { st.q.push({ n, res }); pump(st); });

  await new Promise((res, rej) => { if (!tcp.connecting) return res(); tcp.once('connect', res); tcp.once('error', rej); });
  const M = mk(tcp, 'data', false);   // macOS (server)
  const N = mk(ws, 'message', true);  // noVNC (client)

  // ── handshake con macOS (nosotros = cliente VNC) ──
  await read(M, 12);                                              // ProtocolVersion del server
  tcp.write(Buffer.from('RFB 003.008\n'));
  const nSec = (await read(M, 1))[0];
  if (nSec === 0) { const rl = (await read(M, 4)).readUInt32BE(0); throw new Error('macOS rechazó: ' + (await read(M, rl)).toString()); }
  const types = [...(await read(M, nSec))];
  if (!types.includes(2)) throw new Error('macOS no ofrece VNC-auth (type 2). Tipos: ' + types.join(','));
  tcp.write(Buffer.from([2]));
  const challenge = await read(M, 16);
  tcp.write(vncDesResponse(challenge, password));
  if ((await read(M, 4)).readUInt32BE(0) !== 0) throw new Error('clave VNC incorrecta (macOS rechazó la auth)');

  // ── handshake con noVNC (nosotros = server, SIN auth) ──
  ws.send(Buffer.from('RFB 003.008\n'));
  await read(N, 12);                                              // versión de noVNC
  ws.send(Buffer.from([1, 1]));                                   // 1 tipo de seguridad: None(1)
  await read(N, 1);                                               // elección de noVNC
  ws.send(Buffer.from([0, 0, 0, 0]));                             // SecurityResult = OK

  // ── detach lectores, flush de lo buffereado, y puente crudo de acá en más ──
  tcp.removeListener('data', M.on);
  ws.removeListener('message', N.on);
  if (M.buf.length) ws.send(M.buf);
  if (N.buf.length) tcp.write(N.buf);
  ws.on('message', (d) => { try { tcp.write(Buffer.isBuffer(d) ? d : Buffer.from(d)); } catch {} });
  tcp.on('data', (d) => { try { ws.send(d); } catch {} });
  log('auth-proxy OK → pantalla autenticada sola, puente activo');
}

// verifyClient: sin PIN válido NO se abre el puente WS (si no, se saltaban el muro por el WS)
const wss = new WebSocketServer({ server, verifyClient: (info, cb) => {
  if (authed(info.req)) return cb(true);
  cb(false, 401, 'PIN requerido');
} });
wss.on('connection', (ws) => {
  const tcp = net.connect(VNC_PORT, VNC_HOST);
  const bye = () => { try { ws.close(); } catch {}; try { tcp.destroy(); } catch {}; };
  ws.on('close', bye); ws.on('error', bye);
  tcp.on('close', bye); tcp.on('error', (e) => { log('err VNC: ' + e.message); bye(); });
  const pass = vncPass();
  if (pass) {
    // Con clave VNC → el puente autentica solo contra macOS (navegador no pide nada).
    authProxy(ws, tcp, pass, log).catch((e) => { log('auth-proxy: ' + e.message); bye(); });
  } else {
    // Sin clave (tailnet / no seteada) → puente crudo: noVNC hace su propia auth.
    tcp.on('connect', () => log(`cliente conectado → puente crudo a ${VNC_HOST}:${VNC_PORT}`));
    ws.on('message', (d) => { try { tcp.write(Buffer.isBuffer(d) ? d : Buffer.from(d)); } catch {} });
    tcp.on('data', (d) => { try { ws.send(d); } catch {} });
  }
});

function log(m){ process.stdout.write(`[${new Date().toISOString()}] ${m}\n`); }
function start(){
  server.listen(PORT, BIND, () => log(`noVNC en ${useTls?'https':'http'}://${BIND}:${PORT}  (VNC ${VNC_HOST}:${VNC_PORT})${REQUIRE_PIN ? (PIN_FILE ? ' · PIN one-shot (archivo)' : ' · PIN ON') : ''}`));
}
// si Tailscale aún no asignó la IP al arrancar, reintenta hasta que la interfaz exista
server.on('error', (e) => {
  if (e.code === 'EADDRNOTAVAIL' || e.code === 'EADDRINUSE') {
    log(`bind ${BIND}:${PORT} no listo (${e.code}); reintento en 5s`);
    setTimeout(start, 5000);
  } else { log('error server: ' + e.message); process.exit(1); }
});
start();
