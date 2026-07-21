// chat-server.mjs — Chat web BONITO para Claude Code desde el teléfono.
//
// En vez de transmitir el terminal crudo (xterm) — que se ve mal y se "bugea"
// en el celular — corre Claude Code en modo headless (stream-json) y manda al
// front eventos limpios: texto en markdown, tarjetas de herramientas, "pensando",
// costo. Un proceso `claude` persistente atiende todo el chat (multi-turno).
//
// - Misma seguridad que el terminal: PIN (4 dígitos) → cookie firmada (HMAC),
//   rate-limit anti fuerza bruta, bind SOLO a la IP de Tailscale.
// - Convive con server.mjs (terminal viejo). Puerto distinto.
//
// Config (env): CLAUDE_CHAT_PORT (7683), CLAUDE_WEB_PIN (2005),
//               CLAUDE_WEB_HOST (100.91.97.70), CLAUDE_CHAT_PERM (bypassPermissions),
//               CLAUDE_CHAT_MODEL (vacío = el por defecto de tu Claude Code).

import http from 'node:http'
import crypto from 'node:crypto'
import { spawn, execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import os from 'node:os'

const DIR = fileURLToPath(new URL('./', import.meta.url))

// Auto-instala `ws` si falta (igual que el terminal).
let WebSocketServer
try {
  ({ WebSocketServer } = await import('ws'))
} catch {
  console.log('[claude-chat] instalando dependencia ws…')
  try { execSync('npm install ws --silent --no-audit --no-fund', { cwd: DIR, stdio: 'inherit' }) } catch { /* */ }
  ({ WebSocketServer } = await import('ws'))
}

const PORT = Number(process.env.CLAUDE_CHAT_PORT || 7683)
const PIN = String(process.env.CLAUDE_WEB_PIN || '2005')
const HOME = process.env.HOME || '/Users/AIagenteia'
const CLAUDE = `${HOME}/.local/bin/claude`
// 'default' = pide permiso por el front (recomendado). 'bypassPermissions' = full auto.
const PERM = String(process.env.CLAUDE_CHAT_PERM || 'bypassPermissions')
const MODEL = String(process.env.CLAUDE_CHAT_MODEL || '').trim()
const SECRET = crypto.randomBytes(32)

// ── Subir archivos (protegido por la MISMA cookie de sesión que el chat) ──────
// Para mandar archivos que no se pueden pegar en el chat (certificados .pfx/.p12,
// PDFs grandes, etc.): quedan en ~/nexus/uploads/ y Claude los lee de ahí.
const UPLOADS_DIR = join(HOME, 'nexus', 'uploads')
mkdirSync(UPLOADS_DIR, { recursive: true })
const nombreSeguro = (n) => String(n || 'archivo').replace(/[\/\\:*?"<>|]/g, '_').replace(/\s+/g, '_').slice(-120)
const PAGINA_SUBIR = `<!doctype html><html lang=es><head><meta charset=utf-8>
<meta name=viewport content="width=device-width,initial-scale=1">
<title>Subir archivo — Nexus</title>
<style>
 body{margin:0;font-family:-apple-system,system-ui,Segoe UI,Roboto,sans-serif;background:#0b141a;color:#e9edef;
   min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box}
 .card{background:#111b21;border-radius:20px;padding:26px 22px;max-width:440px;width:100%;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,.5)}
 h1{font-size:20px;margin:0 0 6px} p{color:#8696a0;font-size:14px;margin:0 0 18px}
 input[type=file]{width:100%;padding:14px;background:#0b141a;border:1px dashed #2a3942;border-radius:12px;color:#e9edef;margin-bottom:14px}
 button{width:100%;padding:14px;border:0;border-radius:12px;background:#25d366;color:#04220f;font-weight:700;font-size:16px}
 button:disabled{opacity:.5} .ok{color:#25d366;margin-top:14px;font-weight:600} .err{color:#ff6b6b;margin-top:14px}
 .list{margin-top:18px;text-align:left;font-size:13px;color:#8696a0}
</style></head><body>
<div class=card>
 <h1>Subir archivo a Nexus</h1>
 <p>Cualquier archivo (certificado, PDF, imagen…). Queda guardado en el Mac y avísame en el chat cuando termine.</p>
 <input id=f type=file multiple>
 <button id=b onclick=subir()>Subir</button>
 <div id=msg></div>
 <div class=list id=list></div>
</div>
<script>
async function subir(){
 const f=document.getElementById('f').files; const msg=document.getElementById('msg')
 if(!f.length){msg.className='err';msg.textContent='Elige un archivo primero';return}
 document.getElementById('b').disabled=true; msg.className=''; msg.textContent='Subiendo…'
 let ok=0
 for(const file of f){
  try{
   const b64=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result.split(',')[1]);r.onerror=rej;r.readAsDataURL(file)})
   const r=await fetch('subir/up',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:file.name,data:b64})})
   if(r.ok)ok++
  }catch(e){}
 }
 msg.className=ok?'ok':'err'; msg.textContent=ok?('✅ '+ok+' archivo(s) subido(s). Ya se los puedes pedir a Nexus.'):'❌ No se pudo subir'
 document.getElementById('b').disabled=false
 cargar()
}
async function cargar(){try{const r=await fetch('subir/list');const j=await r.json();document.getElementById('list').innerHTML=(j.archivos||[]).map(a=>'• '+a).join('<br>')}catch(e){}}
cargar()
</script></body></html>`

// Instrucción que se inyecta a Claude en ESTE chat: cómo mostrar imágenes/gráficos.
// El chat renderiza cualquier imagen que devuelva una herramienta (ver handleLine):
// por eso, para MOSTRAR algo visual, Claude solo tiene que abrir el PNG con Read.
const PROMPT_GRAFICOS = [
  '📊 GRÁFICOS E IMÁGENES EN ESTE CHAT (móvil de Ramón):',
  'Para MOSTRARLE una imagen o un gráfico, ábrela con la herramienta Read: al leer un',
  'archivo de imagen (PNG/JPG), el chat lo renderiza solo en la conversación.',
  'Cuando una respuesta tenga datos comparables —un ranking, un desglose por categorías,',
  'o una tendencia en el tiempo (ventas, márgenes, deudas, stock, etc.)— genera un gráfico',
  'con matplotlib (guárdalo en /tmp como PNG) y muéstralo abriéndolo con Read: barra para',
  'comparar/rankear, torta para distribución/participación %, línea para tendencia. Para un',
  'solo número suelto NO hagas gráfico. Tras mostrarlo, en el texto deja solo el titular.',
].join(' ')

// ── Auth (idéntico al terminal: cookie HMAC + rate-limit) ─────────────────────
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

const intentos = new Map()
function bloqueado(ip) { const e = intentos.get(ip); return e && e.hasta > Date.now() ? Math.ceil((e.hasta - Date.now()) / 1000) : 0 }
function fallo(ip) {
  const e = intentos.get(ip) || { n: 0, hasta: 0 }
  e.n++
  if (e.n >= 5) e.hasta = Date.now() + Math.min(60, 2 ** (e.n - 5)) * 30000
  intentos.set(ip, e)
}
function exito(ip) { intentos.delete(ip) }

// Última sesión de Claude (1 usuario) → continuidad al reconectar / recargar.
// (el estado de sesión ahora vive por-terminal, ver más abajo)

// ── Página: chat mobile-first, markdown propio, sin CDN ───────────────────────
const PAGINA = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,maximum-scale=1">
<title>Claude · Mac mini Nexus</title>
<style>
 :root{--bg:#0b0c10;--panel:#141620;--line:#242736;--txt:#e8e9ee;--mut:#8b8fa3;--blue:#2563eb;--blue2:#1d4ed8;--ok:#22c55e;--warn:#f59e0b}
 *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
 html,body{margin:0;height:100%;background:var(--bg);color:var(--txt);font-family:-apple-system,system-ui,"SF Pro Text",sans-serif;font-size:16px;line-height:1.5}
 body{display:flex;flex-direction:column;overflow:hidden}
 /* Login */
 #login{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:20px}
 #login h1{font-weight:600;font-size:20px;margin:0;text-align:center}
 #login .sub{color:var(--mut);font-size:13px;margin-top:-8px}
 #pin{font-size:32px;letter-spacing:16px;text-align:center;width:210px;padding:14px;border-radius:14px;border:1px solid var(--line);background:var(--panel);color:#fff;outline:none}
 #pin:focus{border-color:var(--blue)}
 #go{font-size:17px;font-weight:600;padding:14px 44px;border-radius:14px;border:0;background:var(--blue);color:#fff;-webkit-appearance:none;touch-action:manipulation}
 #go:active{background:var(--blue2)}
 #err{color:#ef4444;font-size:13px;height:16px}
 /* Chat */
 #app{display:none;flex-direction:column;flex:1;min-height:0}
 header{display:flex;align-items:center;gap:10px;padding:max(10px,env(safe-area-inset-top)) 14px 10px;background:var(--panel);border-bottom:1px solid var(--line)}
 header .dot{width:8px;height:8px;border-radius:50%;background:var(--mut);flex:0 0 auto;transition:background .3s}
 header .dot.live{background:var(--ok)}
 header .dot.busy{background:var(--warn);animation:pulse 1s infinite}
 @keyframes pulse{50%{opacity:.35}}
 header .ti{font-weight:600;font-size:15px;flex:1;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
 header button{font-size:13px;color:var(--mut);background:transparent;border:1px solid var(--line);border-radius:9px;padding:7px 11px;-webkit-appearance:none;touch-action:manipulation}
 header button:active{background:#1c1f2b}
 #feed{flex:1;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:14px 12px 6px;display:flex;flex-direction:column;gap:12px}
 .msg{max-width:88%;padding:10px 13px;border-radius:16px;word-wrap:break-word;overflow-wrap:anywhere}
 .me{align-self:flex-end;background:var(--blue);color:#fff;border-bottom-right-radius:5px;white-space:pre-wrap}
 .ai{align-self:flex-start;background:var(--panel);border:1px solid var(--line);border-bottom-left-radius:5px}
 .ai p{margin:.45em 0}.ai p:first-child{margin-top:0}.ai p:last-child{margin-bottom:0}
 .ai h1,.ai h2,.ai h3{margin:.6em 0 .35em;line-height:1.25}.ai h1{font-size:1.25em}.ai h2{font-size:1.15em}.ai h3{font-size:1.05em}
 .ai ul,.ai ol{margin:.4em 0;padding-left:1.3em}.ai li{margin:.15em 0}
 .ai a{color:#7aa2ff}
 .ai code{background:#0c0e16;border:1px solid var(--line);border-radius:6px;padding:.08em .35em;font-family:"SF Mono",Menlo,monospace;font-size:.86em}
 .ai pre{background:#0c0e16;border:1px solid var(--line);border-radius:11px;padding:11px 12px;overflow-x:auto;margin:.5em 0}
 .ai pre code{background:transparent;border:0;padding:0;font-size:.82em;line-height:1.45;white-space:pre}
 .ai blockquote{margin:.4em 0;padding-left:.8em;border-left:3px solid var(--line);color:var(--mut)}
 .think{align-self:flex-start;max-width:88%;font-size:13px;color:var(--mut);font-style:italic;border-left:2px solid var(--line);padding:2px 0 2px 10px;white-space:pre-wrap}
 .tool{align-self:flex-start;max-width:88%;background:#10131d;border:1px solid var(--line);border-radius:12px;overflow:hidden;font-size:13px}
 .tool .h{display:flex;align-items:center;gap:7px;padding:8px 11px;cursor:pointer}
 .tool .h .ic{font-size:13px}.tool .h .nm{font-weight:600}.tool .h .st{margin-left:auto;font-size:11px;color:var(--mut)}
 .tool .h .st.ok{color:var(--ok)}.tool .h .st.err{color:#ef4444}
 .tool .body{display:none;border-top:1px solid var(--line);padding:9px 11px;background:#0a0c13}
 .tool.open .body{display:block}
 .tool pre{margin:0;white-space:pre-wrap;word-break:break-word;font-family:"SF Mono",Menlo,monospace;font-size:11.5px;color:#c8ccda;max-height:280px;overflow:auto}
 .tool .lbl{color:var(--mut);font-size:10.5px;text-transform:uppercase;letter-spacing:.04em;margin:2px 0 3px}
 .sys{align-self:center;color:var(--mut);font-size:12px;text-align:center;padding:2px 8px}
 .perm{align-self:stretch;max-width:100%;background:#1a160e;border:1px solid #4a3a16;border-radius:13px;overflow:hidden}
 .perm .ph{display:flex;align-items:center;gap:8px;padding:10px 12px;font-weight:600;font-size:14px;color:#f0c060}
 .perm pre{margin:0;padding:0 12px 8px;white-space:pre-wrap;word-break:break-word;font-family:"SF Mono",Menlo,monospace;font-size:12px;color:#d7cfa8;max-height:200px;overflow:auto}
 .perm .pb{display:flex;gap:8px;padding:10px 12px;border-top:1px solid #3a2f14}
 .perm .pb button{flex:1;font-size:15px;font-weight:600;padding:11px;border-radius:10px;border:0;-webkit-appearance:none;touch-action:manipulation}
 .perm .pb .ok{background:var(--ok);color:#06270f}.perm .pb .no{background:#3a2230;color:#ff9bb0}
 .perm .pb button:active{filter:brightness(1.15)}
 .perm.resuelta .pb{display:none}
 .perm .res{padding:9px 12px;border-top:1px solid #3a2f14;font-size:13px;font-weight:600}
 #auto{display:flex;align-items:center;gap:5px}
 #auto.on{color:var(--warn);border-color:#5a4410;background:#2a2008}
 .typing{align-self:flex-start;display:flex;gap:4px;padding:12px 14px;background:var(--panel);border:1px solid var(--line);border-radius:16px;border-bottom-left-radius:5px}
 .typing i{width:7px;height:7px;border-radius:50%;background:var(--mut);animation:bl 1.2s infinite}
 .typing i:nth-child(2){animation-delay:.2s}.typing i:nth-child(3){animation-delay:.4s}
 @keyframes bl{0%,60%,100%{opacity:.25}30%{opacity:1}}
 footer{padding:8px 10px max(8px,env(safe-area-inset-bottom));background:var(--panel);border-top:1px solid var(--line)}
 .row{display:flex;align-items:flex-end;gap:8px}
 #inp{flex:1;resize:none;max-height:140px;font-size:16px;line-height:1.4;color:var(--txt);background:var(--bg);border:1px solid var(--line);border-radius:18px;padding:10px 14px;outline:none;font-family:inherit}
 #inp:focus{border-color:var(--blue)}
 #snd{flex:0 0 auto;width:44px;height:44px;border-radius:50%;border:0;background:var(--blue);color:#fff;font-size:19px;-webkit-appearance:none;touch-action:manipulation;display:flex;align-items:center;justify-content:center}
 #snd:active{background:var(--blue2)}#snd:disabled{opacity:.4}
 #snd.stop{background:#ef4444}
 #voz.on{color:var(--ok);border-color:#1f5132;background:#0c2417}
 #mic{flex:0 0 auto;width:44px;height:44px;border-radius:50%;border:1px solid var(--line);background:var(--bg);color:var(--txt);font-size:18px;-webkit-appearance:none;touch-action:manipulation;display:flex;align-items:center;justify-content:center}
 #mic.on{background:#ef4444;color:#fff;border-color:#ef4444;animation:pulse 1s infinite}
 #att{flex:0 0 auto;width:44px;height:44px;border-radius:50%;border:1px solid var(--line);background:var(--bg);color:var(--txt);font-size:18px;-webkit-appearance:none;touch-action:manipulation;display:flex;align-items:center;justify-content:center}
 #att:active{background:#1c1f2b}
 #prevs{display:flex;flex-wrap:wrap;gap:6px;padding:0 2px 7px}
 #prevs:empty{display:none}
 .prev{position:relative;width:54px;height:54px;border-radius:10px;overflow:hidden;border:1px solid var(--line)}
 .prev img{width:100%;height:100%;object-fit:cover;display:block}
 .prev button{position:absolute;top:1px;right:1px;width:19px;height:19px;border-radius:50%;border:0;background:rgba(0,0,0,.65);color:#fff;font-size:13px;line-height:1;padding:0;display:flex;align-items:center;justify-content:center}
 .prev.file{width:auto;max-width:180px;height:auto;padding:6px 26px 6px 9px;display:flex;align-items:center;background:var(--card,#1a1a1a)}
 .prev.file span{font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
 .msg.me img{max-width:210px;max-height:260px;border-radius:11px;display:block;margin:0 0 6px}
 .msg.me img:last-child{margin-bottom:0}
 .msg.ai.aimg{padding:5px;max-width:92%}
 .msg.ai.aimg img{max-width:100%;width:auto;border-radius:11px;display:block}
 footer.drag{outline:2px dashed var(--blue);outline-offset:-4px}
 header{flex-wrap:wrap}
 #compartir.gen{color:var(--ok);border-color:#1f5132;background:#0c2417}
 /* Barra de terminales abiertas */
 #terms{display:none;gap:6px;overflow-x:auto;padding:7px 10px;background:var(--panel);border-bottom:1px solid var(--line);-webkit-overflow-scrolling:touch}
 .tterm{flex:0 0 auto;display:flex;align-items:center;gap:7px;font-size:13px;color:var(--mut);background:var(--bg);border:1px solid var(--line);border-radius:9px;padding:6px 11px;white-space:nowrap;-webkit-appearance:none}
 .tterm.cur{color:#fff;border-color:var(--blue);background:#16233f}
 .tterm .xterm{font-size:15px;line-height:1;color:var(--mut);margin:-2px -3px -2px 0;padding:0 3px}
 /* Hojas (compartir / modelo) */
 .sheetbg{display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:30;align-items:flex-end;justify-content:center}
 .sheetbg.show{display:flex}
 .sheet{width:100%;max-width:520px;background:var(--panel);border:1px solid var(--line);border-radius:16px 16px 0 0;padding:16px 16px max(16px,env(safe-area-inset-bottom));animation:up .18s ease}
 @keyframes up{from{transform:translateY(30px);opacity:.4}to{transform:none;opacity:1}}
 .sh-t{font-weight:600;font-size:16px;margin-bottom:4px}
 .sh-s{color:var(--mut);font-size:13px;margin-bottom:13px;line-height:1.4}
 #shareUrl{width:100%;font-size:13px;color:var(--txt);background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:11px 12px;outline:none;margin-bottom:12px}
 .sh-b{display:flex;gap:8px}
 .sh-b button{flex:1;font-size:15px;font-weight:600;padding:12px;border-radius:11px;border:1px solid var(--line);background:#1c2233;color:var(--txt);-webkit-appearance:none;touch-action:manipulation}
 .sh-b button.prim{background:var(--blue);color:#fff;border:0}
 .sh-b button.close{background:#2a2230;color:#ff9bb0;border:0;flex:0 0 auto;padding:12px 18px}
 .sh-b button:active{filter:brightness(1.15)}
 #modelList{display:flex;flex-direction:column;gap:8px;margin-bottom:13px}
 .mrow{display:flex;align-items:center;gap:10px;padding:12px 13px;border:1px solid var(--line);border-radius:12px;background:var(--bg);font-size:15px;-webkit-appearance:none;text-align:left;color:var(--txt);width:100%}
 .mrow .mn{font-weight:600}.mrow .md{color:var(--mut);font-size:12px}
 .mrow.cur{border-color:var(--blue);background:#16233f}
 .mrow .chk{margin-left:auto;color:var(--ok);font-weight:700;opacity:0}
 .mrow.cur .chk{opacity:1}
</style></head><body>
<div id="login">
  <h1>🤖 Claude Code — Mac mini</h1>
  <div class="sub">Ingresa tu PIN</div>
  <input id="pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" autofocus autocomplete="off" enterkeyhint="go">
  <button id="go" type="button">Entrar →</button>
  <div id="err"></div>
</div>
<div id="app">
  <header>
    <span class="dot" id="dot"></span>
    <span class="ti" id="ti">Claude Code</span>
    <button id="auto" type="button" title="Aprobar todo automáticamente">⚡ Auto</button>
    <button id="voz" type="button" class="on" title="Leer las respuestas en voz alta">🔊 Voz</button>
    <button id="modelo" type="button" title="Cambiar el modelo de la IA">🧠 Modelo</button>
    <button id="compartir" type="button" title="Compartir esta terminal en vivo">🔗 Compartir</button>
    <button id="nuevo" type="button" title="Abrir otra terminal">＋ Nuevo</button>
  </header>
  <div id="terms"></div>
  <div id="feed"></div>
  <footer>
    <div id="prevs"></div>
    <div class="row">
    <button id="att" type="button" title="Adjuntar archivo">📎</button>
    <button id="mic" type="button" title="Hablar">🎤</button>
    <textarea id="inp" rows="1" placeholder="Escribe o habla a Claude…" enterkeyhint="send"></textarea>
    <button id="snd" type="button">↑</button>
  </div></footer>
  <input id="file" type="file" multiple style="display:none">
  <div id="share" class="sheetbg">
    <div class="sheet">
      <div class="sh-t">🔗 Compartir terminal en vivo</div>
      <div class="sh-s">Cualquiera con este link ve esta terminal en tiempo real, escribe y le manda cosas a la IA. Es un único link para esta terminal.</div>
      <input id="shareUrl" readonly>
      <div class="sh-b">
        <button id="shareCopy" type="button" class="prim">Copiar link</button>
        <button id="shareNat" type="button">Compartir…</button>
        <button id="shareClose" type="button" class="close">Cerrar</button>
      </div>
    </div>
  </div>
  <div id="modal" class="sheetbg">
    <div class="sheet">
      <div class="sh-t">🧠 Modelo de la IA</div>
      <div class="sh-s">Elige con qué modelo responde esta terminal. La conversación se mantiene.</div>
      <div id="modelList"></div>
      <div class="sh-b"><button id="modelClose" type="button" class="close">Cerrar</button></div>
    </div>
  </div>
</div>
<script>
const $=s=>document.querySelector(s)
/* ---------- Login ---------- */
let enviando=false
async function login(){
  if(enviando)return
  const pin=$('#pin').value.trim(); if(!pin){$('#pin').focus();return}
  enviando=true;$('#err').style.color='#888';$('#err').textContent='Entrando…'
  try{
    const r=await fetch('/auth',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({pin})})
    if(r.ok){$('#login').style.display='none';$('#app').style.display='flex';connect();$('#inp').focus()}
    else{const j=await r.json().catch(()=>({}));$('#err').style.color='#ef4444';$('#err').textContent=j.error||'PIN incorrecto';$('#pin').value='';$('#pin').focus()}
  }catch(e){$('#err').style.color='#ef4444';$('#err').textContent='Sin conexión, reintenta'}
  enviando=false
}
$('#go').addEventListener('click',login)
$('#pin').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();login()}})

/* ---------- Markdown mínimo y seguro (escapa, luego formatea) ---------- */
function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function inline(s){
  return esc(s)
    .replace(/\`([^\`]+)\`/g,(m,c)=>'<code>'+c+'</code>')
    .replace(/\\*\\*([^*]+)\\*\\*/g,'<strong>$1</strong>')
    .replace(/(^|[^*])\\*([^*\\n]+)\\*/g,'$1<em>$2</em>')
    .replace(/\\[([^\\]]+)\\]\\((https?:[^)\\s]+)\\)/g,'<a href="$2" target="_blank" rel="noopener">$1</a>')
}
function renderMd(src){
  const lines=String(src).replace(/\\r/g,'').split('\\n')
  let out='',i=0,inList=null
  const closeList=()=>{if(inList){out+='</'+inList+'>';inList=null}}
  while(i<lines.length){
    let ln=lines[i]
    // bloque de código
    const f=ln.match(/^\\s*\`\`\`(\\w*)/)
    if(f){closeList();i++;let buf=[];while(i<lines.length&&!/^\\s*\`\`\`/.test(lines[i])){buf.push(lines[i]);i++} i++;out+='<pre><code>'+esc(buf.join('\\n'))+'</code></pre>';continue}
    if(/^\\s*#{1,3}\\s/.test(ln)){closeList();const h=ln.match(/^\\s*(#{1,3})\\s+(.*)/);out+='<h'+h[1].length+'>'+inline(h[2])+'</h'+h[1].length+'>';i++;continue}
    if(/^\\s*>\\s?/.test(ln)){closeList();out+='<blockquote>'+inline(ln.replace(/^\\s*>\\s?/,''))+'</blockquote>';i++;continue}
    const ul=ln.match(/^\\s*[-*]\\s+(.*)/), ol=ln.match(/^\\s*\\d+\\.\\s+(.*)/)
    if(ul){if(inList!=='ul'){closeList();out+='<ul>';inList='ul'}out+='<li>'+inline(ul[1])+'</li>';i++;continue}
    if(ol){if(inList!=='ol'){closeList();out+='<ol>';inList='ol'}out+='<li>'+inline(ol[1])+'</li>';i++;continue}
    if(/^\\s*$/.test(ln)){closeList();i++;continue}
    closeList();out+='<p>'+inline(ln)+'</p>';i++
  }
  closeList();return out
}

/* ---------- Chat ---------- */
let ws=null, typingEl=null, curAi=null, busy=false, reconnTO=null
let ROLE='owner', curTerm=null, termList=[], headerName='Claude Code', wantTerm=null, curModel=''
const MODELOS=[{id:'',nombre:'Por defecto',desc:'el que trae Claude Code'},{id:'opus',nombre:'Opus 4.8',desc:'el más capaz'},{id:'sonnet',nombre:'Sonnet',desc:'equilibrado y rápido'},{id:'haiku',nombre:'Haiku',desc:'el más veloz y económico'}]
const feed=$('#feed')
function atBottom(){return feed.scrollHeight-feed.scrollTop-feed.clientHeight<120}
function scroll(force){if(force||atBottom())requestAnimationFrame(()=>feed.scrollTop=feed.scrollHeight)}
function add(cls,html){const d=document.createElement('div');d.className=cls;if(html!=null)d.innerHTML=html;feed.appendChild(d);scroll();return d}
function showTyping(){if(!typingEl){typingEl=add('typing','<i></i><i></i><i></i>')}scroll()}
function hideTyping(){if(typingEl){typingEl.remove();typingEl=null}}
function setBusy(b){busy=b;$('#dot').className='dot '+(ws&&ws.readyState===1?(b?'busy':'live'):'');const s=$('#snd');s.classList.toggle('stop',b);s.textContent=b?'■':'↑';if(b)showTyping();else hideTyping()}

function pretty(v){try{return typeof v==='string'?v:JSON.stringify(v,null,2)}catch(e){return String(v)}}
function toolIcon(n){return ({Bash:'⌘',Read:'📄',Write:'✏️',Edit:'✏️',Glob:'🔎',Grep:'🔎',WebFetch:'🌐',WebSearch:'🌐',Task:'🤖',TodoWrite:'☑️'})[n]||'🛠️'}
const tools={} // id -> el
function addTool(id,name,input){
  const el=add('tool open',null)
  const sum = name==='Bash'?(input&&input.command||'') : (input&&(input.file_path||input.path||input.pattern||input.url||input.description)||'')
  el.innerHTML='<div class="h"><span class="ic">'+toolIcon(name)+'</span><span class="nm">'+esc(name)+'</span><span class="st">···</span></div>'+
    '<div class="body"><div class="lbl">entrada</div><pre>'+esc(pretty(input))+'</pre></div>'
  el.querySelector('.h').addEventListener('click',()=>el.classList.toggle('open'))
  if(sum){const nm=el.querySelector('.nm');nm.textContent=name+' · '+String(sum).slice(0,90)}
  tools[id]=el;scroll()
}
function finishTool(id,ok,result){
  const el=tools[id];if(!el)return
  const st=el.querySelector('.st');st.textContent=ok?'ok':'error';st.className='st '+(ok?'ok':'err')
  if(result&&String(result).trim()){el.querySelector('.body').insertAdjacentHTML('beforeend','<div class="lbl">resultado</div><pre>'+esc(String(result).slice(0,4000))+'</pre>')}
}

/* ---------- Permisos (aprobar en el front) ---------- */
const perms={} // id -> el
function permSummary(name,input){
  if(name==='Bash')return input.command||''
  return input.file_path||input.path||input.url||input.pattern||''
}
function addPerm(id,name,input){
  hideTyping()
  const el=add('perm',null)
  const sum=permSummary(name,input)
  el.innerHTML='<div class="ph">🔐 Claude quiere usar <span style="color:#fff">'+esc(name)+'</span></div>'+
    '<pre>'+esc(sum||pretty(input))+'</pre>'+
    '<div class="pb"><button class="ok" data-a="1">✓ Permitir</button><button class="no" data-a="0">✕ Rechazar</button></div>'
  el.querySelector('[data-a="1"]').addEventListener('click',()=>{ws&&ws.send(JSON.stringify({t:'perm_reply',id,allow:true}))})
  el.querySelector('[data-a="0"]').addEventListener('click',()=>{ws&&ws.send(JSON.stringify({t:'perm_reply',id,allow:false}))})
  perms[id]=el;scroll(true)
}
function resolvePerm(id,allow,name){
  const el=perms[id];if(!el)return
  el.classList.add('resuelta')
  el.insertAdjacentHTML('beforeend','<div class="res" style="color:'+(allow?'#22c55e':'#ff9bb0')+'">'+(allow?'✓ Permitido':'✕ Rechazado')+'</div>')
  delete perms[id];if(busy)showTyping()
}

function connect(){
  const proto=location.protocol==='https:'?'wss':'ws'
  ws=new WebSocket(proto+'://'+location.host+'/ws')
  ws.onopen=()=>{setBusy(false);if(wantTerm&&ROLE==='owner'){try{ws.send(JSON.stringify({t:'attach',term:wantTerm}))}catch(e){}}}
  ws.onclose=()=>{setBusy(false);$('#dot').className='dot';clearTimeout(reconnTO);reconnTO=setTimeout(connect,1500)}
  ws.onmessage=e=>{
    let m;try{m=JSON.parse(e.data)}catch(_){return}
    if(m.t==='session'){return}
    if(m.t==='terms'){ROLE=m.role||ROLE;termList=m.list||[];curTerm=m.current;applyRole();return}
    if(m.t==='attached'){curTerm=m.term;headerName=m.name||headerName;if(m.model!=null)curModel=m.model;if(ROLE==='owner')wantTerm=m.term;updateHeader();renderTerms();return}
    if(m.t==='reset'){feed.innerHTML='';for(const k in tools)delete tools[k];for(const k in perms)delete perms[k];hideTyping();setBusy(false);return}
    if(m.t==='share'){showShare(m.url);return}
    if(m.t==='model'){curModel=m.model||'';updateHeader();renderModelos();if(m.note)add('sys',esc(m.note));return}
    if(m.t==='user'){hideTyping();add('msg me',esc(m.text));setBusy(true);scroll();return}
    if(m.t==='text'){hideTyping();curAi=add('msg ai',renderMd(m.text));curAi=null;speak(m.text);return}
    if(m.t==='think'){hideTyping();add('think',esc(m.text));if(busy)showTyping();return}
    if(m.t==='tool'){hideTyping();addTool(m.id,m.name,m.input);if(busy)showTyping();return}
    if(m.t==='tool_result'){finishTool(m.id,m.ok,m.result);return}
    if(m.t==='img'){hideTyping();const d=add('msg ai aimg',null);const im=document.createElement('img');im.addEventListener('load',()=>scroll());im.src='data:'+(m.media_type||'image/png')+';base64,'+m.data;d.appendChild(im);if(busy)showTyping();return}
    if(m.t==='perm'){addPerm(m.id,m.name,m.input);return}
    if(m.t==='perm_done'){resolvePerm(m.id,m.allow,m.name);return}
    if(m.t==='auto'){autoOn=m.on;$('#auto').classList.toggle('on',autoOn);$('#auto').textContent=autoOn?'⚡ Auto ON':'⚡ Auto';return}
    if(m.t==='done'){setBusy(false);if(m.cost){add('sys','· '+(m.turns||1)+' turno'+((m.turns||1)>1?'s':'')+' · $'+Number(m.cost).toFixed(4)+' ·')}return}
    if(m.t==='error'){hideTyping();add('sys','⚠️ '+esc(m.msg||'error'));setBusy(false);return}
    if(m.t==='cleared'){feed.innerHTML='';add('sys','— nuevo chat —');return}
  }
}
function send(){
  const inp=$('#inp'),txt=inp.value.trim()
  if(busy){ws&&ws.send(JSON.stringify({t:'stop'}));return}
  if((!txt&&!pendImgs.length&&!pendFiles.length)||!ws||ws.readyState!==1)return
  const me=add('msg me',null)
  for(const p of pendImgs){const im=document.createElement('img');im.src=p.url;me.appendChild(im)}
  for(const p of pendFiles){const s=document.createElement('span');s.className='fchip';s.textContent='📄 '+p.name;me.appendChild(s)}
  if(txt){const t=document.createElement('span');t.textContent=txt;me.appendChild(t)}
  ws.send(JSON.stringify({t:'msg',text:txt,images:pendImgs.map(p=>({media_type:p.media_type,data:p.data})),files:pendFiles.map(p=>({name:p.name,archivo:p.archivo}))}))
  pendImgs=[];pendFiles=[];renderPrevs()
  inp.value='';inp.style.height='auto';setBusy(true);scroll(true);inp.focus()
}
$('#snd').addEventListener('click',send)
const inp=$('#inp')
inp.addEventListener('input',()=>{inp.style.height='auto';inp.style.height=Math.min(inp.scrollHeight,140)+'px'})
inp.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}})
$('#nuevo').addEventListener('click',()=>{ws&&ws.send(JSON.stringify({t:'new'}))})
/* ---------- Terminales, compartir y modelo ---------- */
function updateHeader(){
  const cur=(termList.find(t=>t.id===curTerm)||{}).name||headerName||'Claude Code'
  const mn=(MODELOS.find(x=>x.id===curModel)||{}).nombre
  $('#ti').textContent=cur+(ROLE==='guest'?' · compartido':(mn&&curModel?' · '+mn:''))
}
function renderTerms(){
  const bar=$('#terms')
  if(ROLE==='guest'||termList.length<2){bar.style.display='none';bar.innerHTML='';return}
  bar.style.display='flex';bar.innerHTML=''
  for(const t of termList){
    const b=document.createElement('button');b.type='button';b.className='tterm'+(t.id===curTerm?' cur':'')
    const s=document.createElement('span');s.textContent=t.name;b.appendChild(s)
    b.addEventListener('click',()=>{if(t.id!==curTerm&&ws)ws.send(JSON.stringify({t:'attach',term:t.id}))})
    if(termList.length>1){const x=document.createElement('span');x.className='xterm';x.textContent='×';x.addEventListener('click',ev=>{ev.stopPropagation();if(confirm('¿Cerrar '+t.name+'?'))ws&&ws.send(JSON.stringify({t:'close',term:t.id}))});b.appendChild(x)}
    bar.appendChild(b)
  }
}
function applyRole(){
  const g=ROLE==='guest'
  ;['#compartir','#nuevo','#auto','#modelo'].forEach(id=>{const el=$(id);if(el)el.style.display=g?'none':''})
  renderTerms();updateHeader()
}
/* Compartir */
$('#compartir').addEventListener('click',()=>{ws&&ws.send(JSON.stringify({t:'share'}))})
function showShare(url){
  if(!url){add('sys','⚠️ no pude generar el link (¿el túnel público está caído?)');return}
  $('#shareUrl').value=url;$('#share').classList.add('show');$('#compartir').classList.add('gen')
}
$('#shareClose').addEventListener('click',()=>$('#share').classList.remove('show'))
$('#share').addEventListener('click',e=>{if(e.target.id==='share')$('#share').classList.remove('show')})
$('#shareCopy').addEventListener('click',async()=>{
  const u=$('#shareUrl').value
  try{await navigator.clipboard.writeText(u);const b=$('#shareCopy');b.textContent='¡Copiado!';setTimeout(()=>b.textContent='Copiar link',1400)}
  catch(e){const i=$('#shareUrl');i.focus();i.select()}
})
$('#shareNat').addEventListener('click',async()=>{
  const u=$('#shareUrl').value
  try{if(navigator.share)await navigator.share({title:'Terminal en vivo',text:'Entra a mi terminal de programación',url:u});else await navigator.clipboard.writeText(u)}catch(e){}
})
/* Modelo */
function renderModelos(){
  const c=$('#modelList');c.innerHTML=''
  for(const m of MODELOS){
    const b=document.createElement('button');b.type='button';b.className='mrow'+(m.id===curModel?' cur':'')
    b.innerHTML='<span><span class="mn">'+m.nombre+'</span> <span class="md">· '+m.desc+'</span></span><span class="chk">✓</span>'
    b.addEventListener('click',()=>{ws&&ws.send(JSON.stringify({t:'model',model:m.id}));$('#modal').classList.remove('show')})
    c.appendChild(b)
  }
}
$('#modelo').addEventListener('click',()=>{renderModelos();$('#modal').classList.add('show')})
$('#modelClose').addEventListener('click',()=>$('#modal').classList.remove('show'))
$('#modal').addEventListener('click',e=>{if(e.target.id==='modal')$('#modal').classList.remove('show')})
let autoOn=false
$('#auto').addEventListener('click',()=>{ws&&ws.send(JSON.stringify({t:'auto',on:!autoOn}))})
/* ---------- Voz: leer respuestas en voz alta (TTS) ---------- */
let vozOn=true, voces=[]
const tieneTTS='speechSynthesis' in window
function cargarVoces(){try{voces=speechSynthesis.getVoices()||[]}catch(e){voces=[]}}
if(tieneTTS){cargarVoces();speechSynthesis.onvoiceschanged=cargarVoces}
function vozEs(){return voces.find(v=>/^es/i.test(v.lang))||null}
function limpiarMd(s){
  return String(s)
    .replace(/\\u0060\\u0060\\u0060[\\s\\S]*?\\u0060\\u0060\\u0060/g,'. ')
    .replace(/\\u0060([^\\u0060]+)\\u0060/g,'$1')
    .replace(/\\*\\*([^*]+)\\*\\*/g,'$1')
    .replace(/\\*([^*]+)\\*/g,'$1')
    .replace(/!?\\[([^\\]]*)\\]\\([^)]*\\)/g,'$1')
    .replace(/^\\s*#{1,6}\\s*/gm,'')
    .replace(/^\\s*>\\s?/gm,'')
    .replace(/^\\s*[-*]\\s+/gm,'')
    .replace(/\\s+/g,' ').trim()
}
function speak(raw){
  if(!vozOn||!tieneTTS)return
  const txt=limpiarMd(raw); if(!txt)return
  try{
    speechSynthesis.cancel()
    const v=vozEs()
    const partes=txt.match(/[^.!?\\n]+[.!?]*/g)||[txt]
    for(const p of partes){const s=p.trim();if(!s)continue
      const u=new SpeechSynthesisUtterance(s)
      if(v){u.voice=v;u.lang=v.lang}else u.lang='es-ES'
      u.rate=1.05;speechSynthesis.speak(u)}
  }catch(e){}
}
$('#voz').addEventListener('click',()=>{
  vozOn=!vozOn
  $('#voz').classList.toggle('on',vozOn)
  $('#voz').textContent=vozOn?'🔊 Voz':'🔇 Voz'
  if(!vozOn&&tieneTTS)try{speechSynthesis.cancel()}catch(e){}
})

/* ---------- Mic: hablarle a Claude (reconocimiento de voz, si el navegador lo permite) ---------- */
const SR=window.SpeechRecognition||window.webkitSpeechRecognition
let rec=null, grabando=false
if(SR){
  rec=new SR();rec.lang='es-ES';rec.interimResults=true;rec.continuous=false
  rec.onresult=e=>{let t='';for(let i=0;i<e.results.length;i++)t+=e.results[i][0].transcript
    const inp=$('#inp');inp.value=t;inp.style.height='auto';inp.style.height=Math.min(inp.scrollHeight,140)+'px'}
  rec.onend=()=>{grabando=false;$('#mic').classList.remove('on');const t=$('#inp').value.trim();if(t)send()}
  rec.onerror=ev=>{grabando=false;$('#mic').classList.remove('on');if(ev&&(ev.error==='not-allowed'||ev.error==='service-not-allowed'))add('sys','🎤 micrófono bloqueado por el navegador (requiere https o localhost)')}
  $('#mic').addEventListener('click',()=>{
    if(grabando){try{rec.stop()}catch(e){}return}
    try{if(tieneTTS)speechSynthesis.cancel();rec.start();grabando=true;$('#mic').classList.add('on')}catch(e){}
  })
}else{$('#mic').style.display='none'}

/* ---------- Imágenes: adjuntar / pegar / arrastrar (con reescalado) ---------- */
let pendImgs=[]
let pendFiles=[]
const MAXDIM=1568, MAXN=6
function renderPrevs(){
  const c=$('#prevs');c.innerHTML=''
  pendFiles.forEach((p,idx)=>{
    const d=document.createElement('div');d.className='prev file'
    const s=document.createElement('span');s.textContent='📄 '+p.name
    const b=document.createElement('button');b.type='button';b.textContent='×'
    b.addEventListener('click',()=>{pendFiles.splice(idx,1);renderPrevs()})
    d.appendChild(s);d.appendChild(b);c.appendChild(d)
  })
  pendImgs.forEach((p,idx)=>{
    const d=document.createElement('div');d.className='prev'
    const im=document.createElement('img');im.src=p.url
    const b=document.createElement('button');b.type='button';b.textContent='×'
    b.addEventListener('click',()=>{pendImgs.splice(idx,1);renderPrevs()})
    d.appendChild(im);d.appendChild(b);c.appendChild(d)
  })
}
function loadImg(file){
  return new Promise((res,rej)=>{
    const fr=new FileReader()
    fr.onload=()=>{const im=new Image();im.onload=()=>res(im);im.onerror=rej;im.src=fr.result}
    fr.onerror=rej;fr.readAsDataURL(file)
  })
}
function fileB64(f){
  return new Promise((res,rej)=>{
    const fr=new FileReader()
    fr.onload=()=>{const s=String(fr.result);res(s.slice(s.indexOf(',')+1))}
    fr.onerror=rej;fr.readAsDataURL(f)
  })
}
async function addFiles(files){
  for(const f of files){
    if(f.type&&f.type.indexOf('image/')===0){
      // Imágenes: van en línea (reescaladas) como bloques de imagen para Claude
      if(pendImgs.length>=MAXN){add('sys','máximo '+MAXN+' imágenes por mensaje');continue}
      try{
        const im=await loadImg(f)
        let w=im.naturalWidth||im.width, h=im.naturalHeight||im.height
        const sc=Math.min(1,MAXDIM/Math.max(w,h))
        w=Math.max(1,Math.round(w*sc));h=Math.max(1,Math.round(h*sc))
        const cv=document.createElement('canvas');cv.width=w;cv.height=h
        cv.getContext('2d').drawImage(im,0,0,w,h)
        const url=cv.toDataURL('image/jpeg',0.85)
        pendImgs.push({media_type:'image/jpeg',data:url.slice(url.indexOf(',')+1),url})
      }catch(e){add('sys','no pude leer una imagen')}
    }else{
      // Cualquier otro archivo (PDF, txt, xlsx, zip…): se sube a ~/nexus/uploads/
      // y se le pasa la ruta a Claude para que lo lea con Read.
      try{
        const b64=await fileB64(f)
        const r=await fetch('subir/up',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:f.name,data:b64})})
        const j=await r.json().catch(()=>null)
        if(j&&j.ok){pendFiles.push({name:f.name,archivo:j.archivo})}
        else add('sys','no pude subir '+f.name)
      }catch(e){add('sys','no pude subir '+f.name)}
    }
  }
  renderPrevs();$('#inp').focus()
}
$('#att').addEventListener('click',()=>$('#file').click())
$('#file').addEventListener('change',e=>{addFiles([...e.target.files]);e.target.value=''})
document.addEventListener('paste',e=>{
  const its=(e.clipboardData&&e.clipboardData.items)||[]
  const fs=[];for(const it of its){if(it.kind==='file'){const f=it.getAsFile();if(f)fs.push(f)}}
  if(fs.length){e.preventDefault();addFiles(fs)}
})
const ftr=document.querySelector('footer')
;['dragover','dragenter'].forEach(ev=>ftr.addEventListener(ev,e=>{e.preventDefault();ftr.classList.add('drag')}))
;['dragleave','drop'].forEach(ev=>ftr.addEventListener(ev,e=>{e.preventDefault();ftr.classList.remove('drag')}))
ftr.addEventListener('drop',e=>{const fs=(e.dataTransfer&&e.dataTransfer.files)||[];if(fs.length)addFiles([...fs])})

// Teclado iOS: re-scroll al cambiar viewport
if(window.visualViewport)visualViewport.addEventListener('resize',()=>scroll())

/* ---------- Modo invitado: si llegó por un link compartido (?t=token) ---------- */
;(async function(){
  const tok=new URLSearchParams(location.search).get('t')
  if(!tok)return
  try{
    const r=await fetch('share-auth',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token:tok})})
    if(r.ok){ROLE='guest';$('#login').style.display='none';$('#app').style.display='flex';applyRole();connect()}
    else{$('#err').textContent='Este link ya no está activo';$('#pin').focus()}
  }catch(e){$('#err').textContent='Sin conexión, reintenta'}
})()
</script></body></html>`

// ── Terminales: varias sesiones de Claude, cada una compartida y persistente ──
// Cada "terminal" es una sesión de Claude independiente y COLABORATIVA: todos los
// que están en ella ven lo mismo y pueden escribir. Se pueden tener varias abiertas
// (Terminal 1, Terminal 2, …), cambiarles el modelo, y compartir cualquiera con un
// link único. El proceso NO se mata al cerrarse un ws → sobrevive suspensión.
let seqTerm = 0
const TERMS = new Map()      // id -> terminal
const SHARES = new Map()     // token de compartir -> id de terminal
const ALL = new Set()        // todos los ws (para refrescar la lista de terminales)
// Tipos de evento que se guardan para "re-mostrar" a quien entra/cambia de terminal.
const REPLAY = new Set(['user', 'text', 'think', 'tool', 'tool_result', 'img', 'perm_done', 'done'])

function crearTerm() {
  const id = ++seqTerm
  const t = { id, nombre: 'Terminal ' + id, proc: null, buf: '', auto: (PERM === 'bypassPermissions'), model: MODEL, pend: new Map(), sessionId: null, clientes: new Set(), share: null, hist: [] }
  TERMS.set(id, t)
  return t
}
crearTerm() // Terminal 1 siempre existe

function send(ws, o) { try { if (ws.readyState === 1) ws.send(JSON.stringify(o)) } catch { /* */ } }
function pushHist(t, o) { if (REPLAY.has(o.t)) { t.hist.push(o); if (t.hist.length > 300) t.hist.shift() } }
function bcast(t, o) { pushHist(t, o); const s = JSON.stringify(o); for (const ws of t.clientes) { try { if (ws.readyState === 1) ws.send(s) } catch { /* */ } } }
function ctrlReply(t, request_id, response) { try { if (t.proc) t.proc.stdin.write(JSON.stringify({ type: 'control_response', response: { subtype: 'success', request_id, response } }) + '\n') } catch { /* */ } }

function spawnClaude(t) {
  const mode = t.auto ? 'bypassPermissions' : 'default'
  const args = ['-p', '--input-format', 'stream-json', '--output-format', 'stream-json', '--verbose', '--permission-mode', mode]
  args.push('--append-system-prompt', PROMPT_GRAFICOS)
  if (!t.auto) args.push('--permission-prompt-tool', 'stdio')
  if (t.model) args.push('--model', t.model)
  if (t.sessionId) args.push('--resume', t.sessionId)
  t.proc = spawn(CLAUDE, args, {
    cwd: HOME, env: { ...process.env, TERM: 'dumb', FORCE_COLOR: '0' }, stdio: ['pipe', 'pipe', 'pipe'],
  })
  t.buf = ''
  t.proc.stdout.on('data', (d) => { t.buf += d.toString(); let nl; while ((nl = t.buf.indexOf('\n')) >= 0) { const line = t.buf.slice(0, nl); t.buf = t.buf.slice(nl + 1); if (line.trim()) handleLine(t, line) } })
  t.proc.stderr.on('data', (d) => { const s = d.toString().trim(); if (s) console.error('[claude-chat:err]', s.slice(0, 300)) })
  t.proc.on('exit', (code) => { t.proc = null; if (code && code !== 0) bcast(t, { t: 'error', msg: 'el proceso de Claude terminó (código ' + code + ')' }); bcast(t, { t: 'done', cost: 0, turns: 0 }) })
}

function handleLine(t, line) {
  let m; try { m = JSON.parse(line) } catch { return }
  if (m.type === 'control_request' && m.request) {
    if (m.request.subtype === 'can_use_tool') {
      if (t.auto) { ctrlReply(t, m.request_id, { behavior: 'allow', updatedInput: m.request.input || {} }); return }
      t.pend.set(m.request_id, { name: m.request.tool_name, input: m.request.input || {} })
      bcast(t, { t: 'perm', id: m.request_id, name: m.request.tool_name, input: m.request.input || {} })
    } else {
      // Cualquier otro control_request (initialize, etc.): ack para no bloquear.
      ctrlReply(t, m.request_id, {})
    }
    return
  }
  if (m.type === 'system' && m.subtype === 'init') { if (m.session_id) { t.sessionId = m.session_id; bcast(t, { t: 'session', id: m.session_id }) } return }
  if (m.type === 'assistant' && m.message && Array.isArray(m.message.content)) {
    for (const b of m.message.content) {
      if (b.type === 'text' && b.text && b.text.trim()) bcast(t, { t: 'text', text: b.text })
      else if (b.type === 'thinking' && b.thinking && b.thinking.trim()) bcast(t, { t: 'think', text: b.thinking })
      else if (b.type === 'tool_use') bcast(t, { t: 'tool', id: b.id, name: b.name, input: b.input || {} })
    }
    return
  }
  if (m.type === 'user' && m.message && Array.isArray(m.message.content)) {
    for (const b of m.message.content) {
      if (b.type === 'tool_result') {
        let txt = ''
        const imgs = []
        if (typeof b.content === 'string') txt = b.content
        else if (Array.isArray(b.content)) {
          for (const c of b.content) {
            if (c && c.type === 'text') txt += (txt ? '\n' : '') + (c.text || '')
            // Cuando una herramienta (p. ej. Read sobre un PNG/JPG, una captura, o
            // un gráfico recién generado) devuelve una IMAGEN, la mandamos al front
            // para mostrarla en el chat. Antes se descartaba y solo quedaba el texto.
            else if (c && c.type === 'image' && c.source && c.source.type === 'base64' && c.source.data) {
              imgs.push({ media_type: c.source.media_type || 'image/png', data: c.source.data })
            }
          }
        }
        bcast(t, { t: 'tool_result', id: b.tool_use_id, ok: !b.is_error, result: txt })
        for (const im of imgs) bcast(t, { t: 'img', id: b.tool_use_id, media_type: im.media_type, data: im.data })
      }
    }
    return
  }
  if (m.type === 'result') {
    if (m.session_id) t.sessionId = m.session_id
    bcast(t, { t: 'done', cost: m.total_cost_usd || 0, turns: m.num_turns || 1, error: !!m.is_error })
    return
  }
}

// Link público para compartir: usa la URL del túnel Cloudflare (terminal-url.txt),
// accesible desde cualquier red. Si no está, el front arma el link con su propio origen.
function basePublica() {
  try { const u = readFileSync(DIR + 'terminal-url.txt', 'utf8').trim(); if (/^https?:\/\//.test(u)) return u.replace(/\/+$/, '') } catch { /* */ }
  return null
}

function listaTerms() { return [...TERMS.values()].map((t) => ({ id: t.id, name: t.nombre })) }
function sendTerms(ws) {
  const guest = ws._role === 'guest'
  const list = guest ? (TERMS.has(ws._term) ? [{ id: ws._term, name: TERMS.get(ws._term).nombre }] : []) : listaTerms()
  send(ws, { t: 'terms', list, current: ws._term, role: ws._role })
}
function broadcastTerms() { for (const ws of ALL) sendTerms(ws) }

// Engancha un ws a una terminal: resetea su feed y le re-muestra el historial.
function attach(ws, t) {
  if (ws._term != null) { const old = TERMS.get(ws._term); if (old) old.clientes.delete(ws) }
  ws._term = t.id
  t.clientes.add(ws)
  send(ws, { t: 'reset' })
  send(ws, { t: 'attached', term: t.id, name: t.nombre, model: t.model })
  send(ws, { t: 'auto', on: t.auto })
  if (t.sessionId) send(ws, { t: 'session', id: t.sessionId })
  for (const e of t.hist) send(ws, e)
  for (const [id, p] of t.pend) send(ws, { t: 'perm', id, name: p.name, input: p.input })
}

function cerrarTerm(id) {
  const t = TERMS.get(id); if (!t) return
  if (TERMS.size <= 1) return                       // nunca dejar el sistema sin terminales
  if (t.proc) { try { t.proc.kill('SIGKILL') } catch { /* */ } t.proc = null }
  if (t.share) SHARES.delete(t.share)
  const destino = [...TERMS.values()].find((x) => x.id !== id) || crearTerm()
  const huerfanos = [...t.clientes]
  TERMS.delete(id)
  for (const c of huerfanos) {
    if (c._role === 'guest') { send(c, { t: 'error', msg: 'la terminal compartida se cerró' }); try { c.close() } catch { /* */ } }
    else attach(c, destino)
  }
  broadcastTerms()
}

// ── HTTP ──────────────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim()
  const url = req.url || '/'
  if (req.method === 'GET' && (url === '/' || url.startsWith('/?'))) {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(PAGINA)
  }
  if (req.method === 'POST' && url === '/auth') {
    const espera = bloqueado(ip)
    if (espera) { res.writeHead(429, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ error: `Demasiados intentos. Espera ${espera}s.` })) }
    let body = ''
    req.on('data', (c) => { body += c; if (body.length > 1000) req.destroy() })
    req.on('end', () => {
      let pin = ''
      try { pin = String(JSON.parse(body).pin || '') } catch { /* */ }
      if (pin && pin === PIN) {
        exito(ip)
        res.writeHead(200, { 'content-type': 'application/json', 'set-cookie': `sid=${sign('ok')}; HttpOnly; SameSite=Lax; Path=/; Max-Age=43200` })
        return res.end('{"ok":true}')
      }
      fallo(ip)
      res.writeHead(401, { 'content-type': 'application/json' }); res.end('{"error":"PIN incorrecto"}')
    })
    return
  }
  // Subir archivos: SOLO con sesión ya autenticada (misma cookie que el chat) —
  // fail-closed, nunca público.
  if (url === '/subir' || url.startsWith('/subir?')) {
    if (!authed(req)) { res.writeHead(401, { 'content-type': 'text/plain' }); return res.end('no autenticado') }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(PAGINA_SUBIR)
  }
  if (req.method === 'POST' && url === '/subir/up') {
    if (!authed(req)) { res.writeHead(401, { 'content-type': 'application/json' }); return res.end('{"error":"no autenticado"}') }
    let body = ''
    req.on('data', (c) => { body += c; if (body.length > 60e6) req.destroy() })
    req.on('end', () => {
      try {
        const j = JSON.parse(body)
        const nombre = `${Date.now()}-${nombreSeguro(j.name)}`
        writeFileSync(join(UPLOADS_DIR, nombre), Buffer.from(j.data, 'base64'))
        console.log(`[claude-chat] archivo subido: ${nombre}`)
        res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ ok: true, archivo: nombre }))
      } catch (e) { res.writeHead(400, { 'content-type': 'application/json' }); res.end('{"error":"no se pudo guardar"}') }
    })
    return
  }
  if (url === '/subir/list') {
    if (!authed(req)) { res.writeHead(401, { 'content-type': 'application/json' }); return res.end('{"error":"no autenticado"}') }
    let a = []
    try { a = readdirSync(UPLOADS_DIR).slice(-20) } catch { /* aún no hay */ }
    res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ archivos: a }))
  }
  // Invitado con link de compartir: canjea el token por una cookie acotada a ESA terminal.
  if (req.method === 'POST' && url === '/share-auth') {
    let body = ''
    req.on('data', (c) => { body += c; if (body.length > 2000) req.destroy() })
    req.on('end', () => {
      let tok = ''
      try { tok = String(JSON.parse(body).token || '') } catch { /* */ }
      const id = SHARES.get(tok)
      if (tok && id != null && TERMS.has(id)) {
        res.writeHead(200, { 'content-type': 'application/json', 'set-cookie': `shr=${sign(tok)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400` })
        return res.end(JSON.stringify({ ok: true, name: TERMS.get(id).nombre }))
      }
      res.writeHead(401, { 'content-type': 'application/json' }); res.end('{"error":"link no válido"}')
    })
    return
  }
  res.writeHead(404); res.end('no')
})

// ── WebSocket ─────────────────────────────────────────────────────────────────
const wss = new WebSocketServer({ noServer: true, maxPayload: 30 * 1024 * 1024 })
function shareTerm(req) { const tok = verify(cookies(req).shr || ''); if (!tok) return null; const id = SHARES.get(tok); return (id != null && TERMS.has(id)) ? TERMS.get(id) : null }
server.on('upgrade', (req, socket, head) => {
  if (!req.url.startsWith('/ws')) { socket.write('HTTP/1.1 404 Not Found\r\n\r\n'); return socket.destroy() }
  const owner = authed(req)
  const gterm = owner ? null : shareTerm(req)
  if (!owner && !gterm) { socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n'); return socket.destroy() }
  wss.handleUpgrade(req, socket, head, (ws) => { ws._role = owner ? 'owner' : 'guest'; ws._gterm = gterm ? gterm.id : null; sesion(ws) })
})

function sesion(ws) {
  ALL.add(ws)
  ws._term = null
  if (ws._role === 'guest') {
    const gt = TERMS.get(ws._gterm)
    if (!gt) { send(ws, { t: 'error', msg: 'link no válido' }); try { ws.close() } catch { /* */ } return }
    attach(ws, gt)
  } else {
    attach(ws, [...TERMS.values()][0] || crearTerm())
  }
  sendTerms(ws)

  ws.on('message', (raw) => {
    let o; try { o = JSON.parse(raw.toString()) } catch { return }
    const cur = TERMS.get(ws._term)
    const owner = ws._role === 'owner'
    if (o.t === 'msg' && cur && (o.text || (Array.isArray(o.images) && o.images.length) || (Array.isArray(o.files) && o.files.length))) {
      if (!cur.proc) spawnClaude(cur)
      const content = []
      if (o.text) content.push({ type: 'text', text: String(o.text) })
      if (Array.isArray(o.images)) {
        for (const img of o.images.slice(0, 6)) {
          if (img && typeof img.data === 'string' && /^image\/(png|jpeg|webp|gif)$/.test(img.media_type || '')) {
            content.push({ type: 'image', source: { type: 'base64', media_type: img.media_type, data: img.data } })
          }
        }
      }
      let nFiles = 0
      if (Array.isArray(o.files) && o.files.length) {
        const lineas = []
        for (const fl of o.files.slice(0, 20)) {
          if (fl && typeof fl.archivo === 'string' && fl.archivo) {
            const safe = nombreSeguro(fl.archivo)              // evita salir de la carpeta
            const ruta = join(UPLOADS_DIR, safe)
            lineas.push(`- ${nombreSeguro(fl.name) || safe}: ${ruta}`)
          }
        }
        nFiles = lineas.length
        if (nFiles) content.push({ type: 'text', text: `El usuario adjuntó ${nFiles} archivo(s). Están guardados en el servidor; léelos con la herramienta Read cuando los necesites:\n${lineas.join('\n')}` })
      }
      if (!content.length) return
      // Eco a los DEMÁS viewers de esta terminal (colaborativo) + al historial.
      const echo = { t: 'user', text: o.text ? String(o.text) : (nFiles ? `📄 (${nFiles} archivo${nFiles > 1 ? 's' : ''})` : '📷 (imagen)') }
      pushHist(cur, echo)
      const es = JSON.stringify(echo)
      for (const c of cur.clientes) { if (c !== ws) { try { if (c.readyState === 1) c.send(es) } catch { /* */ } } }
      const turn = JSON.stringify({ type: 'user', message: { role: 'user', content } }) + '\n'
      try { cur.proc.stdin.write(turn) } catch { bcast(cur, { t: 'error', msg: 'no pude enviar el mensaje' }) }
    } else if (o.t === 'perm_reply' && cur) {
      if (cur.pend.has(o.id)) {
        const { name, input } = cur.pend.get(o.id); cur.pend.delete(o.id)
        if (o.allow) ctrlReply(cur, o.id, { behavior: 'allow', updatedInput: input })
        else ctrlReply(cur, o.id, { behavior: 'deny', message: 'Permiso rechazado' })
        bcast(cur, { t: 'perm_done', id: o.id, allow: !!o.allow, name })
      }
    } else if (o.t === 'auto' && cur && owner) {
      cur.auto = !!o.on
      if (cur.auto) { for (const [id, p] of cur.pend) { ctrlReply(cur, id, { behavior: 'allow', updatedInput: p.input }); bcast(cur, { t: 'perm_done', id, allow: true, name: p.name }) } cur.pend.clear() }
      bcast(cur, { t: 'auto', on: cur.auto })
    } else if (o.t === 'stop' && cur) {
      if (cur.proc) { const p = cur.proc; try { p.kill('SIGINT') } catch { /* */ } setTimeout(() => { try { if (p && !p.killed) p.kill('SIGKILL') } catch { /* */ } }, 400) }
      bcast(cur, { t: 'done', cost: 0, turns: 0 })  // limpia el spinner aunque el proceso ya estuviera muerto (terminal "colgada")
    } else if (o.t === 'model' && cur && owner) {
      // Cambiar el modelo: se aplica en el próximo turno (la conversación se mantiene
      // vía --resume). Si hay proceso ocioso lo reciclamos para que tome el modelo ya.
      const permitido = ['', 'opus', 'sonnet', 'haiku']
      const nm = permitido.includes(String(o.model)) ? String(o.model) : cur.model
      cur.model = nm
      if (cur.proc) { try { cur.proc.kill('SIGKILL') } catch { /* */ } cur.proc = null }
      bcast(cur, { t: 'model', model: nm, note: 'Modelo cambiado a ' + (nm || 'por defecto') + ' · sigue la misma conversación.' })
    } else if (o.t === 'attach' && owner) {
      const nt = TERMS.get(o.term); if (nt) { attach(ws, nt); sendTerms(ws) }
    } else if (o.t === 'new' && owner) {
      const nt = crearTerm(); attach(ws, nt); broadcastTerms()
    } else if (o.t === 'close' && owner) {
      cerrarTerm(o.term)
    } else if (o.t === 'share' && owner && cur) {
      if (!cur.share) { const tok = crypto.randomBytes(16).toString('base64url'); cur.share = tok; SHARES.set(tok, cur.id) }
      const base = basePublica()
      send(ws, { t: 'share', url: base ? base + '/?t=' + cur.share : null, token: cur.share })
    }
  })

  // PERSISTENCIA: al cerrarse este viewer NO matamos el proceso de su terminal; la
  // sesión sigue viva para los demás y para cuando este mismo reconecte.
  ws.on('close', () => { ALL.delete(ws); const tt = TERMS.get(ws._term); if (tt) tt.clientes.delete(ws) })
}

// 0.0.0.0 → escucha en localhost (para el túnel Cloudflare, sin depender de Tailscale)
// y en la IP de tailnet (acceso por Tailscale/Funnel). El PIN protege en ambos casos.
const HOST = process.env.CLAUDE_WEB_HOST || '0.0.0.0'
server.listen(PORT, HOST, () => {
  console.log(`[claude-chat] chat en http://${HOST}:${PORT} | PIN ${PIN.length} dígitos | perm=${PERM}${MODEL ? ' | model=' + MODEL : ''} | multi-terminal + compartir`)
})
