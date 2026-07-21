// server.mjs — Terminal web con Claude Code (acceso COMPLETO al Mac), con PIN.
//
// - Página de PIN (4 dígitos). PIN correcto → cookie firmada (HMAC) → terminal.
// - El terminal corre `claude` partiendo en ~ (acceso a todo el Mac). Si lo cierras,
//   caes a una shell. PTY real vía `script` (sin dependencias nativas).
// - Escucha SOLO en 127.0.0.1; se publica por `tailscale serve` (HTTPS privado).
// - Rate-limit del PIN: con 4 dígitos es débil, así que bloqueamos fuerza bruta.
//
// Config (env): CLAUDE_WEB_PORT (7682), CLAUDE_WEB_PIN (2005).

import http from 'node:http'
import crypto from 'node:crypto'
import { spawn, execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'

const BRIDGE = fileURLToPath(new URL('./pty-bridge.py', import.meta.url))
const DIR = fileURLToPath(new URL('./', import.meta.url))

// Auto-instala lo necesario: si falta `ws`, lo instala SOLO antes de arrancar.
let WebSocketServer
try {
  ({ WebSocketServer } = await import('ws'))
} catch {
  console.log('[claude-web] instalando dependencia ws…')
  try { execSync('npm install ws --silent --no-audit --no-fund', { cwd: DIR, stdio: 'inherit' }) } catch { /* */ }
  ({ WebSocketServer } = await import('ws'))
}

const PORT = Number(process.env.CLAUDE_WEB_PORT || 7682)
const PIN = String(process.env.CLAUDE_WEB_PIN || '2005')
const HOME = process.env.HOME || '/Users/AIagenteia'
const CLAUDE = `${HOME}/.local/bin/claude`
// Secreto de firma de cookie: nuevo en cada arranque (al reiniciar, re-login).
const SECRET = crypto.randomBytes(32)

function sign(v) { return v + '.' + crypto.createHmac('sha256', SECRET).update(v).digest('base64url') }
function verify(signed) {
  if (!signed) return false
  const i = signed.lastIndexOf('.')
  if (i < 0) return false
  const v = signed.slice(0, i)
  try { return crypto.timingSafeEqual(Buffer.from(sign(v)), Buffer.from(signed)) ? v : false } catch { return false }
}
function cookies(req) {
  const out = {}
  for (const p of (req.headers.cookie || '').split(';')) {
    const j = p.indexOf('='); if (j > 0) out[p.slice(0, j).trim()] = p.slice(j + 1).trim()
  }
  return out
}
function authed(req) { return verify(cookies(req).sid || '') === 'ok' }

// ── Rate-limit de intentos de PIN por IP (anti fuerza bruta) ──────────────────
const intentos = new Map() // ip -> { n, hasta }
function bloqueado(ip) { const e = intentos.get(ip); return e && e.hasta > Date.now() ? Math.ceil((e.hasta - Date.now()) / 1000) : 0 }
function fallo(ip) {
  const e = intentos.get(ip) || { n: 0, hasta: 0 }
  e.n++
  // Tras 5 fallos, backoff creciente: 30s, 2min, 10min, 1h…
  if (e.n >= 5) e.hasta = Date.now() + Math.min(60, 2 ** (e.n - 5)) * 30000
  intentos.set(ip, e)
}
function exito(ip) { intentos.delete(ip) }

const PAGINA = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Claude Code · Mac mini Nexus</title>
<link rel="stylesheet" href="/xterm.css">
<style>
 html,body{margin:0;height:100%;background:#0b0b0b;color:#e6e6e6;font-family:-apple-system,system-ui,sans-serif}
 body{display:flex;flex-direction:column;overflow:hidden}
 #login{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px}
 #login h1{font-weight:600;font-size:20px;margin:0}
 #login .sub{color:#888;font-size:13px;margin-top:-8px}
 #pin{font-size:34px;letter-spacing:18px;text-align:center;width:200px;padding:14px;border-radius:12px;border:1px solid #333;background:#161616;color:#fff;outline:none}
 #pin:focus{border-color:#2563eb}
 #err{color:#ef4444;font-size:13px;height:16px}
 #go{font-size:17px;font-weight:600;padding:14px 40px;border-radius:12px;border:0;background:#2563eb;color:#fff;cursor:pointer;-webkit-appearance:none;touch-action:manipulation}
 #go:active{background:#1d4ed8}
 #term{flex:1;min-height:0;width:100%;display:none;padding:2px 4px;box-sizing:border-box}
 #bar{display:none;background:#161616;color:#9ca3af;font-size:11px;padding:4px 10px;border-bottom:1px solid #222}
 #keys{display:none;gap:6px;padding:7px 8px;background:#161616;border-top:1px solid #222;overflow-x:auto;-webkit-overflow-scrolling:touch}
 #keys button{flex:0 0 auto;font-size:14px;padding:10px 13px;border-radius:9px;border:1px solid #333;background:#222;color:#e6e6e6;white-space:nowrap;touch-action:manipulation;-webkit-appearance:none}
 #keys button:active{background:#2563eb;border-color:#2563eb}
</style></head><body>
<div id="login">
  <h1>🔐 Claude Code — Mac mini</h1>
  <div class="sub">Ingresa tu PIN</div>
  <input id="pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" autofocus autocomplete="off" enterkeyhint="go">
  <button id="go" type="button">Entrar →</button>
  <div id="err"></div>
</div>
<div id="bar">Claude Code · ~ (acceso total) · toca el terminal para teclear</div>
<div id="term"></div>
<div id="keys">
  <button data-k="kb">⌨️ Teclado</button>
  <button data-k="mode">⚡ Modo (auto/plan)</button>
  <button data-k="enter">⏎ Enter</button>
  <button data-k="esc">Esc</button>
  <button data-k="up">↑</button>
  <button data-k="down">↓</button>
  <button data-k="tab">⇥ Tab</button>
  <button data-k="slash">/</button>
  <button data-k="ctrlc">⌃C Detener</button>
</div>
<script src="/xterm.js"></script>
<script src="/addon-fit.js"></script>
<script>
const $=s=>document.querySelector(s)
let enviando=false
async function enviar(){
  if(enviando)return
  const pin=$('#pin').value.trim()
  if(!pin){$('#pin').focus();return}
  enviando=true;$('#err').style.color='#888';$('#err').textContent='Entrando…'
  try{
    const r=await fetch('/auth',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({pin})})
    if(r.ok){arrancar()}else{const j=await r.json().catch(()=>({}));$('#err').style.color='#ef4444';$('#err').textContent=j.error||'PIN incorrecto';$('#pin').value='';$('#pin').focus()}
  }catch(e){$('#err').style.color='#ef4444';$('#err').textContent='Sin conexión, reintenta'}
  enviando=false
}
$('#go').addEventListener('click',enviar)
$('#pin').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();enviar()}})
let ws=null,term=null,fit=null
// Secuencias que mandan los botones del teléfono al terminal.
const KEYS={esc:'\\x1b',enter:'\\r',mode:'\\x1b[Z',up:'\\x1b[A',down:'\\x1b[B',tab:'\\t',slash:'/',ctrlc:'\\x03'}
function send(seq){if(seq&&ws&&ws.readyState===1)ws.send(JSON.stringify({t:'i',d:seq}))}
function refit(){if(!fit||!term)return;try{fit.fit();if(ws&&ws.readyState===1)ws.send(JSON.stringify({t:'r',cols:term.cols,rows:term.rows}))}catch(e){}}
function arrancar(){
  $('#login').style.display='none';$('#bar').style.display='block';$('#term').style.display='block';$('#keys').style.display='flex'
  term=new Terminal({fontSize:innerWidth<480?12:14,fontFamily:'Menlo,monospace',cursorBlink:true,theme:{background:'#0b0b0b',foreground:'#e6e6e6'}})
  fit=new FitAddon.FitAddon();term.loadAddon(fit);term.open($('#term'));setTimeout(refit,40)
  const proto=location.protocol==='https:'?'wss':'ws'
  ws=new WebSocket(proto+'://'+location.host+'/ws?cols='+term.cols+'&rows='+term.rows)
  ws.binaryType='arraybuffer'
  ws.onmessage=e=>term.write(new Uint8Array(e.data))
  ws.onopen=()=>{term.focus();refit()}
  ws.onclose=()=>term.write('\\r\\n\\x1b[31m[sesión cerrada — recarga para reconectar]\\x1b[0m\\r\\n')
  term.onData(d=>send(d))
  document.querySelectorAll('#keys button').forEach(b=>b.addEventListener('click',()=>{
    const k=b.getAttribute('data-k')
    if(k==='kb'){term.focus()}else{send(KEYS[k]);term.focus()}
  }))
  addEventListener('resize',refit)
  if(window.visualViewport)visualViewport.addEventListener('resize',refit)
}
</script></body></html>`

// xterm servido LOCAL (sin CDN) — clave para que la consola cargue en el celular,
// donde el CDN externo puede no cargar y dejaba la pantalla en blanco tras el PIN.
const ESTATICOS = {
  '/xterm.css': ['text/css', 'node_modules/@xterm/xterm/css/xterm.css'],
  '/xterm.js': ['application/javascript', 'node_modules/@xterm/xterm/lib/xterm.js'],
  '/addon-fit.js': ['application/javascript', 'node_modules/@xterm/addon-fit/lib/addon-fit.js'],
}

const server = http.createServer((req, res) => {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim()
  if (req.method === 'GET' && ESTATICOS[req.url]) {
    try {
      const [ct, rel] = ESTATICOS[req.url]
      const data = readFileSync(fileURLToPath(new URL('./' + rel, import.meta.url)))
      res.writeHead(200, { 'content-type': ct, 'cache-control': 'public, max-age=86400' }); return res.end(data)
    } catch { res.writeHead(404); return res.end('no') }
  }
  if (req.method === 'GET' && (req.url === '/' || req.url.startsWith('/?'))) {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(PAGINA)
  }
  if (req.method === 'POST' && req.url === '/auth') {
    const espera = bloqueado(ip)
    if (espera) { res.writeHead(429, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ error: `Demasiados intentos. Espera ${espera}s.` })) }
    let body = ''
    req.on('data', (c) => { body += c; if (body.length > 1000) req.destroy() })
    req.on('end', () => {
      let pin = ''
      try { pin = String(JSON.parse(body).pin || '') } catch { /* */ }
      if (pin && crypto.timingSafeEqual(Buffer.from(pin.padEnd(16).slice(0, 16)), Buffer.from(PIN.padEnd(16).slice(0, 16))) && pin === PIN) {
        exito(ip)
        res.writeHead(200, { 'content-type': 'application/json', 'set-cookie': `sid=${sign('ok')}; HttpOnly; SameSite=Lax; Path=/; Max-Age=43200` })
        return res.end('{"ok":true}')
      }
      fallo(ip)
      res.writeHead(401, { 'content-type': 'application/json' }); res.end('{"error":"PIN incorrecto"}')
    })
    return
  }
  res.writeHead(404); res.end('no')
})

const wss = new WebSocketServer({ noServer: true })
server.on('upgrade', (req, socket, head) => {
  if (!req.url.startsWith('/ws') || !authed(req)) { socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n'); return socket.destroy() }
  wss.handleUpgrade(req, socket, head, (ws) => sesion(ws, req))
})

function sesion(ws, req) {
  const u = new URL(req.url, 'http://x')
  const cols = Math.min(Math.max(Number(u.searchParams.get('cols')) || 120, 20), 400)
  const rows = Math.min(Math.max(Number(u.searchParams.get('rows')) || 32, 10), 200)
  // PTY real vía helper Python; arranca claude en ~ y, si sale, cae a una shell.
  const inner = `cd "$HOME" && "${CLAUDE}"; exec bash -l`
  const pty = spawn('python3', [BRIDGE, String(cols), String(rows), 'bash', '-lc', inner], {
    cwd: HOME, env: { ...process.env, TERM: 'xterm-256color' }, stdio: ['pipe', 'pipe', 'pipe'],
  })
  const send = (d) => { try { if (ws.readyState === 1) ws.send(d) } catch { /* */ } }
  pty.stdout.on('data', send)
  pty.stderr.on('data', send)
  pty.on('exit', () => { try { ws.close() } catch { /* */ } })
  ws.on('message', (m) => {
    let o; try { o = JSON.parse(m.toString()) } catch { return }
    if (o.t === 'i') { try { pty.stdin.write(o.d) } catch { /* */ } }
    // resize en vivo no se propaga con `script`; el tamaño se fija al conectar.
  })
  ws.on('close', () => { try { pty.kill('SIGKILL') } catch { /* */ } })
}

// Bind SOLO a la IP de Tailscale (100.x) → alcanzable únicamente por TUS
// dispositivos del tailnet. NO en la LAN, NO público, NO 0.0.0.0.
const HOST = process.env.CLAUDE_WEB_HOST || '100.91.97.70'
server.listen(PORT, HOST, () => {
  console.log(`[claude-web] escuchando en http://${HOST}:${PORT} | PIN ${PIN.length} dígitos (solo tailnet)`)
})
