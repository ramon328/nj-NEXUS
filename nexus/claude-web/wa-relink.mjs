// wa-relink.mjs — Re-vincula WhatsApp mostrando el QR EN VIVO en una URL de tu
// tailnet. Corre `openclaw channels login`, captura el QR (que se refresca solo)
// y lo dibuja en una página que se auto-actualiza. Abre la URL en un COMPUTADOR
// (con Tailscale) y escanéalo con el celular (WhatsApp → Dispositivos vinculados).
//
// Uso:  node wa-relink.mjs    → http://100.91.97.70:7690
import http from 'node:http'
import { spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'

const PORT = 7690
const HOST = process.env.WA_RELINK_HOST || '100.91.97.70'
const HOME = process.env.HOME || '/Users/AIagenteia'
const CLI = `${HOME}/.npm-global/lib/node_modules/openclaw/openclaw.mjs`
let TOKEN = ''
try { TOKEN = JSON.parse(readFileSync(`${HOME}/.openclaw/openclaw.json`, 'utf8'))?.gateway?.auth?.token || '' } catch { /* */ }

let estado = 'esperando'   // esperando | qr | listo | error
let grid = null            // matriz booleana del QR (true = módulo negro)
let mensaje = 'Arrancando el enlace de WhatsApp…'

const stripAnsi = (s) => s.replace(/\x1b\[[0-9;]*m/g, '')
const ESBLOQUE = (l) => l.length > 25 && /^[ ▀▄█]+$/.test(l)

// Convierte un bloque de líneas de medios-bloques en una matriz booleana (2 filas
// de módulos por línea de texto). negro = módulo oscuro del QR.
function bloqueAGrid(lineas) {
  const out = []
  const w = Math.max(...lineas.map((l) => l.length))
  for (const l of lineas) {
    const top = [], bot = []
    for (let i = 0; i < w; i++) {
      const c = l[i] || ' '
      top.push(c === '▀' || c === '█')
      bot.push(c === '▄' || c === '█')
    }
    out.push(top, bot)
  }
  return out
}

// Acumula stdout, detecta el ÚLTIMO bloque QR completo.
let buf = ''
function procesar(txt) {
  buf += stripAnsi(txt)
  if (/logged in|connected|linked|vinculad|conectado/i.test(buf)) { estado = 'listo'; mensaje = '✅ WhatsApp re-vinculado. Ya puedes cerrar esto.'; buf = '' ; return }
  const lineas = buf.split('\n')
  // junta corridas de líneas-bloque
  let mejor = null, actual = []
  for (const raw of lineas) {
    const l = raw.replace(/\s+$/,'')
    if (ESBLOQUE(l)) actual.push(l)
    else { if (actual.length > 8) mejor = actual.slice(); actual = [] }
  }
  if (actual.length > 8) mejor = actual.slice()
  if (mejor) { grid = bloqueAGrid(mejor); estado = 'qr'; mensaje = 'Escanea este QR con tu WhatsApp (Dispositivos vinculados → Vincular dispositivo).' }
  if (buf.length > 20000) buf = buf.slice(-8000)
}

const login = spawn('node', [CLI, 'channels', 'login', '--channel', 'whatsapp', '--verbose'],
  { env: { ...process.env, OPENCLAW_GATEWAY_TOKEN: TOKEN } })
login.stdout.on('data', (d) => procesar(d.toString()))
login.stderr.on('data', (d) => procesar(d.toString()))
login.on('exit', () => { if (estado !== 'listo') { estado = estado === 'qr' ? estado : 'error'; if (estado === 'error') mensaje = 'El proceso de enlace terminó. Recarga para reintentar.' } })

const PAGINA = `<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1">
<title>Re-vincular WhatsApp — Nexus</title>
<style>body{font-family:-apple-system,system-ui,sans-serif;background:#111;color:#eee;text-align:center;margin:0;padding:24px}
h1{font-size:18px} #msg{color:#9ca3af;font-size:14px;margin:10px 0 18px} canvas{background:#fff;border-radius:8px;image-rendering:pixelated}
.ok{color:#22c55e;font-size:20px}</style>
<h1>📲 Re-vincular WhatsApp de Nexus</h1><div id=msg>Cargando…</div><canvas id=c width=360 height=360></canvas>
<script>
async function tick(){
 const r=await fetch('/qr').then(r=>r.json()).catch(()=>null); if(!r)return
 document.getElementById('msg').textContent=r.mensaje
 const c=document.getElementById('c'),x=c.getContext('2d')
 if(r.estado==='listo'){c.style.display='none';document.getElementById('msg').className='ok';return}
 if(r.grid){const g=r.grid,n=g.length,m=g[0].length,s=Math.floor(Math.min(360/m,360/n)),pad=Math.floor((360-s*m)/2),pad2=Math.floor((360-s*n)/2)
  x.fillStyle='#fff';x.fillRect(0,0,360,360);x.fillStyle='#000'
  for(let i=0;i<n;i++)for(let j=0;j<m;j++)if(g[i][j])x.fillRect(pad+j*s,pad2+i*s,s,s)}
}
tick();setInterval(tick,4000)
</script>`

http.createServer((req, res) => {
  if (req.url === '/qr') { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ estado, mensaje, grid })) }
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(PAGINA)
}).listen(PORT, HOST, () => console.log(`[wa-relink] http://${HOST}:${PORT}  (abre en un computador con Tailscale y escanea con el cel)`))
