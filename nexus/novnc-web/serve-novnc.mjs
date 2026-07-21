#!/usr/bin/env node
// serve-novnc.mjs — puente robusto navegador <-> pantalla del mini.
//  - sirve los archivos estáticos de noVNC (vnc.html / vnc_lite.html)
//  - en el upgrade WebSocket abre TCP a la pantalla (127.0.0.1:5900) y hace de puente
// Sustituye a websockify (el de Node se caía). Sin dependencias raras: solo 'ws'.
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.NOVNC_PORT || 6080);
const BIND = process.env.NOVNC_BIND || '127.0.0.1'; // solo esta interfaz (IP de Tailscale = solo tailnet)
const VNC_HOST = process.env.VNC_HOST || '127.0.0.1';
const VNC_PORT = Number(process.env.VNC_PORT || 5900);
// HTTPS (necesario: la auth Apple/ARD usa WebCrypto, que solo existe en contexto seguro)
const CERT = process.env.NOVNC_CERT, KEY = process.env.NOVNC_KEY;

const MIME = { '.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript',
  '.css':'text/css', '.png':'image/png', '.svg':'image/svg+xml', '.ico':'image/x-icon',
  '.json':'application/json', '.woff2':'font/woff2', '.woff':'font/woff', '.map':'application/json' };

const useTls = CERT && KEY && fs.existsSync(CERT) && fs.existsSync(KEY);
const handler = (req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
  if (p === '/' || p === '') p = '/vnc.html';
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

const wss = new WebSocketServer({ server });
wss.on('connection', (ws) => {
  const tcp = net.connect(VNC_PORT, VNC_HOST);
  tcp.on('connect', () => log(`cliente conectado → puente a ${VNC_HOST}:${VNC_PORT}`));
  ws.on('message', (data) => { try { tcp.write(data); } catch {} });
  tcp.on('data', (data) => { try { ws.send(data); } catch {} });
  const bye = () => { try { ws.close(); } catch {}; try { tcp.destroy(); } catch {}; };
  ws.on('close', bye); ws.on('error', bye);
  tcp.on('close', bye); tcp.on('error', (e) => { log('err VNC: ' + e.message); bye(); });
});

function log(m){ process.stdout.write(`[${new Date().toISOString()}] ${m}\n`); }
function start(){
  server.listen(PORT, BIND, () => log(`noVNC en ${useTls?'https':'http'}://${BIND}:${PORT}  (VNC ${VNC_HOST}:${VNC_PORT})`));
}
// si Tailscale aún no asignó la IP al arrancar, reintenta hasta que la interfaz exista
server.on('error', (e) => {
  if (e.code === 'EADDRNOTAVAIL' || e.code === 'EADDRINUSE') {
    log(`bind ${BIND}:${PORT} no listo (${e.code}); reintento en 5s`);
    setTimeout(start, 5000);
  } else { log('error server: ' + e.message); process.exit(1); }
});
start();
