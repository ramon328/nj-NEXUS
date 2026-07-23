// conectar-web.mjs — WIDGET WEB seguro para CONECTAR el banco a tek/Nexus.
//
// Motivo (pedido de Ramón): los usuarios NO deben mandar la clave del banco por
// WhatsApp (queda en el chat, en respaldos, a la vista). En vez de eso abren esta
// pagina en el teléfono, escriben sus credenciales UNA vez, y quedan guardadas
// CIFRADAS por la bóveda (credenciales.mjs, AES-256-GCM).
//
// Seguridad (mismo espíritu que credenciales.mjs y chat-server.mjs):
//  1) Las credenciales viajan SOLO en el body del POST /guardar (JSON). Nunca van
//     por la URL, nunca se loguean, nunca se devuelven al front.
//  2) La clave NUNCA se escribe en texto plano acá: se la pasamos tal cual a
//     credenciales.guardar(), que la cifra al vuelo con la llave maestra 0600.
//  3) Los logs jamás imprimen rut ni clave (solo userId + empresa para auditar).
//  4) Gate con PIN → cookie firmada (HMAC), rate-limit anti fuerza bruta, y bind
//     SOLO a 127.0.0.1 (se expone al teléfono por Tailscale/Funnel, no al mundo).
//
// Config (env): TEK_CONECTAR_PORT (7694), TEK_CONECTAR_PIN (si falta, se genera
//               uno fuerte de 8 dígitos y se loguea al arrancar).

import http from 'node:http'
import crypto from 'node:crypto'
import { guardar, listar } from './credenciales.mjs'
import { listarEmpresas } from './vincular.mjs'

const PORT = Number(process.env.TEK_CONECTAR_PORT || 7694)
const HOST = process.env.TEK_CONECTAR_HOST || '0.0.0.0' // alcanzable por Tailscale (con PIN); el teléfono entra a http://100.91.97.70:7694
// PIN de acceso: del env, o uno fuerte generado al vuelo (se loguea una vez).
const PIN = String(process.env.TEK_CONECTAR_PIN || String(crypto.randomInt(10000000, 99999999)))
if (!process.env.TEK_CONECTAR_PIN) console.log('[tek-conectar] PIN generado (ponlo en el env para fijarlo):', PIN)
// Secreto de firma de cookie: efímero por arranque (al reiniciar, todos re-loguean).
const SECRET = crypto.randomBytes(32)

// ── Auth: cookie HMAC + rate-limit (copiado de chat-server.mjs) ───────────────
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

// Rate-limit: tras 5 fallos, espera exponencial por IP (igual que el chat).
const intentos = new Map()
function bloqueado(ip) { const e = intentos.get(ip); return e && e.hasta > Date.now() ? Math.ceil((e.hasta - Date.now()) / 1000) : 0 }
function fallo(ip) {
  const e = intentos.get(ip) || { n: 0, hasta: 0 }
  e.n++
  if (e.n >= 5) e.hasta = Date.now() + Math.min(60, 2 ** (e.n - 5)) * 30000
  intentos.set(ip, e)
}
function exito(ip) { intentos.delete(ip) }

// Lee el body de un POST con tope de tamaño (anti abuso). Devuelve string.
function leerBody(req, max = 8000) {
  return new Promise((res) => {
    let body = ''
    req.on('data', (c) => { body += c; if (body.length > max) req.destroy() })
    req.on('end', () => res(body))
    req.on('error', () => res(''))
  })
}

// ── Página: login con PIN + formulario de conexión (mobile-first) ─────────────
const PAGINA = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,maximum-scale=1">
<title>Conectar banco — Nexus</title>
<style>
 :root{--bg:#0b0c10;--panel:#141620;--line:#242736;--txt:#e8e9ee;--mut:#8b8fa3;--blue:#2563eb;--blue2:#1d4ed8;--ok:#22c55e}
 *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
 html,body{margin:0;min-height:100%;background:var(--bg);color:var(--txt);font-family:-apple-system,system-ui,"SF Pro Text",sans-serif;font-size:16px;line-height:1.5}
 body{display:flex;align-items:center;justify-content:center;padding:20px}
 .card{background:var(--panel);border:1px solid var(--line);border-radius:20px;padding:24px 20px;max-width:440px;width:100%;box-shadow:0 10px 40px rgba(0,0,0,.5)}
 h1{font-size:20px;margin:0 0 4px;text-align:center}
 .sub{color:var(--mut);font-size:13px;text-align:center;margin:0 0 18px}
 label{display:block;font-size:13px;color:var(--mut);margin:12px 0 5px}
 input,select{width:100%;font-size:16px;color:var(--txt);background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:12px 13px;outline:none;-webkit-appearance:none}
 input:focus,select:focus{border-color:var(--blue)}
 #pin{font-size:28px;letter-spacing:12px;text-align:center}
 button{width:100%;font-size:16px;font-weight:600;padding:14px;border-radius:13px;border:0;background:var(--blue);color:#fff;margin-top:18px;touch-action:manipulation}
 button:active{background:var(--blue2)} button:disabled{opacity:.5}
 .err{color:#ef4444;font-size:13px;min-height:16px;margin-top:10px;text-align:center}
 .ok{color:var(--ok);font-size:13px;min-height:16px;margin-top:10px;text-align:center}
 .lock{color:var(--mut);font-size:11.5px;text-align:center;margin-top:16px;line-height:1.45}
 .hide{display:none}
 .done{text-align:center;padding:10px 0}
 .done .big{font-size:52px;line-height:1;margin-bottom:8px}
 .done h2{font-size:20px;margin:0 0 6px} .done p{color:var(--mut);font-size:14px;margin:0}
</style></head><body>
<div class="card">
  <!-- Login con PIN -->
  <div id="login">
    <h1>🔒 Conectar banco</h1>
    <p class="sub">Ingresa el PIN para continuar</p>
    <input id="pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" autofocus autocomplete="off" enterkeyhint="go">
    <button id="pinBtn" type="button">Entrar →</button>
    <div id="pinErr" class="err"></div>
  </div>

  <!-- Paso 1: credenciales -->
  <div id="form" class="hide">
    <h1>Conectar tu banco</h1>
    <p class="sub">Tus datos se guardan cifrados en el Mac. No se comparten ni se mandan por WhatsApp.</p>
    <label for="userId">Usuario (tu nombre/identificador)</label>
    <input id="userId" autocomplete="off" placeholder="ej: ramon">
    <label for="banco">Banco</label>
    <select id="banco"><option>Santander</option><option>BancoEstado</option><option>BCI</option><option>Chile</option><option>Itaú</option></select>
    <label for="rut">RUT</label>
    <input id="rut" autocomplete="off" inputmode="text" placeholder="12.345.678-9">
    <label for="clave">Clave del banco</label>
    <input id="clave" type="password" autocomplete="off" placeholder="••••••••">
    <button id="okBtn" type="button">Continuar →</button>
    <div id="formMsg" class="err"></div>
    <p class="lock">🔐 La clave se cifra (AES-256-GCM) al guardarla y nunca se muestra ni se registra en ningún log.</p>
  </div>

  <!-- Paso 2: elegir empresa -->
  <div id="empresas" class="hide">
    <h1>Elige la empresa</h1>
    <p class="sub" id="empSub">Tu RUT tiene varias empresas. ¿Cuál conectas?</p>
    <div id="empLista"></div>
    <button id="empBtn" type="button">Vincular empresa</button>
    <div id="empMsg" class="err"></div>
    <button id="empVolver" type="button" style="background:#242736;margin-top:10px">← Volver</button>
  </div>

  <!-- Confirmación -->
  <div id="done" class="hide">
    <div class="done">
      <div class="big">✅</div>
      <h2>Banco conectado</h2>
      <p id="doneTxt">Ya puedes pedirle a Nexus lo del banco.</p>
      <button id="otro" type="button">Conectar otra</button>
    </div>
  </div>
</div>
<script>
const $=s=>document.querySelector(s)
function show(id){for(const x of ['login','form','empresas','done'])$('#'+x).classList.toggle('hide',x!==id)}
let CREDS=null, EMPRESAS=[]   // estado del flujo
/* Login PIN */
async function login(){
  const pin=$('#pin').value.trim(); if(!pin){$('#pin').focus();return}
  $('#pinBtn').disabled=true; $('#pinErr').textContent='Entrando…'; $('#pinErr').className='ok'
  try{
    const r=await fetch('/auth',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({pin})})
    if(r.ok){$('#pinErr').textContent='';show('form');$('#userId').focus()}
    else{const j=await r.json().catch(()=>({}));$('#pinErr').className='err';$('#pinErr').textContent=j.error||'PIN incorrecto';$('#pin').value='';$('#pin').focus()}
  }catch(e){$('#pinErr').className='err';$('#pinErr').textContent='Sin conexión, reintenta'}
  $('#pinBtn').disabled=false
}
$('#pinBtn').addEventListener('click',login)
$('#pin').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();login()}})

/* Guarda la conexión (con la empresa elegida y la lista completa). */
async function guardar(empresa){
  const b={...CREDS, empresa: empresa||undefined, empresas: EMPRESAS.length?EMPRESAS:undefined}
  const msg = $('#empresas').classList.contains('hide') ? $('#formMsg') : $('#empMsg')
  msg.className='ok'; msg.textContent='Guardando…'
  try{
    const r=await fetch('/guardar',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(b)})
    const j=await r.json().catch(()=>({}))
    if(r.ok&&j.ok){ $('#doneTxt').textContent=(j.empresa?('Empresa '+j.empresa+' — '):'')+CREDS.banco+' conectado para '+CREDS.userId+'.'; show('done') }
    else{ msg.className='err'; msg.textContent=j.error||'No se pudo guardar.' }
  }catch(e){ msg.className='err'; msg.textContent='Sin conexión, reintenta' }
}

/* Paso 1 → buscar empresas del RUT (entra al banco, puede tardar). */
async function continuar(){
  CREDS={userId:$('#userId').value.trim(),banco:$('#banco').value,rut:$('#rut').value.trim(),clave:$('#clave').value}
  if(!CREDS.userId||!CREDS.rut||!CREDS.clave){$('#formMsg').className='err';$('#formMsg').textContent='Faltan usuario, RUT o clave.';return}
  $('#okBtn').disabled=true; $('#formMsg').className='ok'; $('#formMsg').textContent='Buscando tus empresas… entro al banco, puede tardar ~2 min ⏳'
  let j={}
  try{ const r=await fetch('/empresas',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({rut:CREDS.rut,clave:CREDS.clave,banco:CREDS.banco})}); j=await r.json().catch(()=>({})) }
  catch(e){ j={ok:false,error:'Sin conexión'} }
  $('#okBtn').disabled=false
  if(j.ok && Array.isArray(j.empresas) && j.empresas.length){
    EMPRESAS=j.empresas
    if(j.empresas.length===1){ await guardar(j.empresas[0].empresa) }   // una sola → guarda directo
    else { pintarEmpresas(j.empresas); show('empresas') }               // varias → elegir
  } else {
    // Degradación: el banco no dejó leer las empresas (seguridad/antifraude) → guardo igual las
    // creds; la empresa se puede elegir después. NO se pierde el trabajo del usuario.
    EMPRESAS=[]
    $('#formMsg').className='err'
    $('#formMsg').textContent=(j.error||'No pude leer las empresas ahora')+'. Guardo tus datos igual…'
    await guardar(undefined)
  }
}
function pintarEmpresas(list){
  $('#empSub').textContent='Tu RUT tiene '+list.length+' empresas. Elige la que quieres conectar:'
  $('#empLista').innerHTML=list.map((e,i)=>
    '<label style="display:flex;gap:10px;align-items:flex-start;padding:11px 12px;border:1px solid var(--line);border-radius:12px;margin-top:8px;cursor:pointer">'+
    '<input type="radio" name="emp" value="'+i+'" '+(i===0?'checked':'')+' style="width:auto;margin-top:3px">'+
    '<span><b>'+(e.empresa||'').replace(/</g,'')+'</b><br><span style="color:var(--mut);font-size:12.5px">RUT '+(e.rut||'')+(e.rol?' · '+e.rol:'')+'</span></span></label>'
  ).join('')
}
$('#okBtn').addEventListener('click',continuar)
$('#clave').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();continuar()}})
$('#empBtn').addEventListener('click',()=>{ const sel=document.querySelector('input[name=emp]:checked'); const e=EMPRESAS[sel?+sel.value:0]; guardar(e?e.empresa:undefined) })
$('#empVolver').addEventListener('click',()=>show('form'))
$('#otro').addEventListener('click',()=>{CREDS=null;EMPRESAS=[];$('#clave').value='';$('#formMsg').textContent='';show('form');$('#userId').focus()})
/* Click-and-go: si el link trae ?pin= auto-loguea (no hay que teclear el PIN). */
(function(){ try{ const p=new URLSearchParams(location.search).get('pin'); if(p&&/^[0-9]{4,8}$/.test(p)){ $('#pin').value=p; login(); } }catch(e){} })()
</script></body></html>`

// ── Servidor HTTP ─────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim()
  const url = req.url || '/'

  // Página (login + formulario)
  if (req.method === 'GET' && (url === '/' || url.startsWith('/?'))) {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
    return res.end(PAGINA)
  }

  // Login: PIN → cookie firmada (con rate-limit)
  if (req.method === 'POST' && url === '/auth') {
    const espera = bloqueado(ip)
    if (espera) { res.writeHead(429, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ error: `Demasiados intentos. Espera ${espera}s.` })) }
    const body = await leerBody(req, 1000)
    let pin = ''
    try { pin = String(JSON.parse(body).pin || '') } catch { /* */ }
    if (pin && pin === PIN) {
      exito(ip)
      res.writeHead(200, { 'content-type': 'application/json', 'set-cookie': `sid=${sign('ok')}; HttpOnly; SameSite=Lax; Path=/; Max-Age=43200` })
      return res.end('{"ok":true}')
    }
    fallo(ip)
    res.writeHead(401, { 'content-type': 'application/json' })
    return res.end('{"error":"PIN incorrecto"}')
  }

  // Empresas del RUT: loguea con las creds y devuelve las empresas asociadas (para elegir).
  // Puede tardar ~2 min (entra al banco). SOLO autenticado. NO guarda nada.
  if (req.method === 'POST' && url === '/empresas') {
    if (!authed(req)) { res.writeHead(401, { 'content-type': 'application/json' }); return res.end('{"error":"no autenticado"}') }
    const body = await leerBody(req, 8000)
    let d = {}
    try { d = JSON.parse(body) } catch { /* */ }
    const rut = String(d.rut || '').trim()
    const clave = String(d.clave || '')
    const banco = String(d.banco || 'Santander').trim() || 'Santander'
    if (!rut || !clave) { res.writeHead(400, { 'content-type': 'application/json' }); return res.end('{"error":"Faltan RUT o clave."}') }
    let r
    try { r = await listarEmpresas({ rut, clave, banco }) } catch (e) { r = { ok: false, error: e.message } }
    console.log('[tek-conectar] empresas', r.ok ? `OK (${(r.empresas || []).length})` : 'ERROR ' + (r.estado || ''), '· banco=' + banco)  // sin rut ni clave
    res.writeHead(r.ok ? 200 : 200, { 'content-type': 'application/json' })
    return res.end(JSON.stringify(r.ok ? { ok: true, empresas: r.empresas } : { ok: false, error: r.error || 'No pude leer las empresas.', estado: r.estado }))
  }

  // Guardar credenciales: SOLO con sesión ya autenticada (fail-closed).
  if (req.method === 'POST' && url === '/guardar') {
    if (!authed(req)) { res.writeHead(401, { 'content-type': 'application/json' }); return res.end('{"error":"no autenticado"}') }
    const body = await leerBody(req, 8000)
    let d = {}
    try { d = JSON.parse(body) } catch { /* */ }
    const userId = String(d.userId || '').trim()
    const banco = String(d.banco || 'Santander').trim() || 'Santander'
    const rut = String(d.rut || '').trim()
    const clave = String(d.clave || '') // NO se recorta ni se loguea nunca
    const empresa = String(d.empresa || '').trim() || undefined
    const empresas = Array.isArray(d.empresas) ? d.empresas.slice(0, 40) : undefined  // lista para el selector
    if (!userId || !rut || !clave) {
      res.writeHead(400, { 'content-type': 'application/json' })
      return res.end('{"error":"Faltan usuario, RUT o clave."}')
    }
    // La clave va DIRECTO a la bóveda, que la cifra. Acá no toca disco en claro.
    const r = guardar(userId, { banco, empresa, rut, clave, empresas })
    // Log de auditoría SIN datos sensibles (jamás rut ni clave).
    console.log('[tek-conectar] guardar', r.ok ? 'OK' : 'ERROR', '· userId=' + userId, '· banco=' + banco, '· empresa=' + (empresa || '-'))
    if (!r.ok) { res.writeHead(400, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ error: r.error || 'No se pudo guardar.' })) }
    res.writeHead(200, { 'content-type': 'application/json' })
    return res.end(JSON.stringify({ ok: true, userId, banco, empresa: r.empresa || null, total: r.total }))
  }

  // Listado (solo lectura, SIN claves) — útil para depurar desde el navegador.
  if (req.method === 'GET' && url.startsWith('/conexiones')) {
    if (!authed(req)) { res.writeHead(401, { 'content-type': 'application/json' }); return res.end('{"error":"no autenticado"}') }
    const userId = new URL(url, 'http://x').searchParams.get('userId') || ''
    res.writeHead(200, { 'content-type': 'application/json' })
    return res.end(JSON.stringify({ ok: true, conexiones: userId ? listar(userId) : [] }))
  }

  res.writeHead(404, { 'content-type': 'text/plain' })
  res.end('no')
})

server.listen(PORT, HOST, () => {
  console.log(`[tek-conectar] escuchando en http://${HOST}:${PORT} (PIN requerido)`)
})
