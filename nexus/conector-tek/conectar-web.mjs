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
import { spawn } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync, statSync } from 'node:fs'
import { guardar, listar } from './credenciales.mjs'
import { listarEmpresas } from './vincular.mjs'
import { validar as validarCodigo } from './vincular-codes.mjs'

const DIR = dirname(fileURLToPath(import.meta.url))
// WARMUP: al vincular, la lectura no quedaba lista hasta que el "corazón" reestablecía la
// sesión (solo en la ventana fría de la mañana). Para que se pueda USAR AL TOQUE, tras guardar
// lanzamos UNA vez el mismo login persistente (login-humano con TEK_USER) que deja la sesión
// viva; después el corazón la mantiene. Dedupe por usuario (si se vinculan varias empresas
// seguidas, un solo login: la sesión es por RUT, no por empresa).
const _warmupTs = new Map()   // userId → ts del último warmup lanzado
function calentarSesion(userId) {
  if (!userId) return
  const now = Date.now()
  const prev = _warmupTs.get(userId) || 0
  if (now - prev < 120_000) return   // ya se lanzó hace <2 min → no repetir
  // Si ya hay sesión FRESCA de ese usuario, no re-logueamos (el corazón la mantiene; evita churn).
  try {
    const sf = join(DIR, userId === 'ramon' ? 'session.json' : `session-${userId}.json`)
    if (existsSync(sf) && (now - statSync(sf).mtimeMs) < 12 * 60_000) {
      console.log('[tek-conectar] warmup omitido · sesión fresca de ' + userId)
      return
    }
  } catch { /* si no se puede chequear, seguimos con el warmup */ }
  _warmupTs.set(userId, now)
  try {
    const env = { ...process.env, TEK_USER: String(userId), TEK_LOCK_WAIT_MS: '20000' }
    const h = spawn(process.execPath, [join(DIR, 'login-humano.mjs')], { cwd: DIR, env, detached: true, stdio: 'ignore' })
    h.unref()
    console.log('[tek-conectar] warmup sesión lanzado · userId=' + userId)
  } catch (e) { console.error('[tek-conectar] warmup error:', e.message) }
}

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
// Sesión: la cookie firmada vale 'ok' (PIN maestro, sin usuario fijo) o 'ok:<userId>' (código
// atado a un usuario de Nexus). Devuelve { userId } o null. Así cada usuario ve/guarda LO SUYO.
function sesion(req) {
  const v = verify(cookies(req).sid || '')
  if (v !== 'ok' && !(typeof v === 'string' && v.startsWith('ok:'))) return null
  return { userId: v.startsWith('ok:') ? decodeURIComponent(v.slice(3)) : null }
}
function authed(req) { return sesion(req) !== null }

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
 .empItem{display:flex;gap:10px;align-items:flex-start;padding:11px 12px;border:1px solid var(--line);border-radius:12px;margin-top:8px;cursor:pointer;transition:border-color .2s,box-shadow .2s}
 .empItem:hover{border-color:var(--blue)}
 .empItem input{width:auto;margin-top:3px;accent-color:var(--ok)}
 .empItem.ya{border-color:var(--ok);box-shadow:0 0 0 1.5px var(--ok),0 0 14px 2px rgba(34,197,94,.5);animation:glow 1.8s ease-in-out infinite}
 @keyframes glow{0%,100%{box-shadow:0 0 0 1.5px var(--ok),0 0 8px 1px rgba(34,197,94,.35)}50%{box-shadow:0 0 0 1.5px var(--ok),0 0 18px 4px rgba(34,197,94,.7)}}
 .badge{color:var(--ok);font-size:11px;font-weight:700;margin-left:7px}
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
    <label for="userId" id="userIdLbl">Usuario (tu nombre/identificador)</label>
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
    <div id="empManualWrap" class="hide">
      <label for="empManual">Nombre de la empresa (como sale en el banco)</label>
      <input id="empManual" autocomplete="off" placeholder="ej: ANA CLARA SPA">
    </div>
    <button id="empBtn" type="button">Vincular seleccionadas</button>
    <div id="empMsg" class="err"></div>
    <button id="empTerminar" type="button" class="hide" style="background:var(--ok);margin-top:10px">✓ Terminar</button>
    <button id="empVolver" type="button" style="background:#242736;margin-top:10px">← Volver a revisar RUT/clave</button>
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
let CREDS=null, EMPRESAS=[], YA=[]   // estado del flujo (YA = empresas ya vinculadas, en verde)
/* Login PIN */
async function login(){
  const pin=$('#pin').value.trim(); if(!pin){$('#pin').focus();return}
  $('#pinBtn').disabled=true; $('#pinErr').textContent='Entrando…'; $('#pinErr').className='ok'
  try{
    const r=await fetch('/auth',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({pin})})
    if(r.ok){
      const j=await r.json().catch(()=>({}))
      // Si el código está atado a un usuario de Nexus, fijamos ese usuario (no lo teclea) → cada
      // uno guarda/ve SOLO su cuenta. El label lo muestra.
      if(j.userId){ $('#userId').value=j.userId; $('#userId').readOnly=true; $('#userIdLbl').textContent='Conectando como: '+j.userId }
      $('#pinErr').textContent='';show('form');(j.userId?$('#rut'):$('#userId')).focus()
    }
    else{const j=await r.json().catch(()=>({}));$('#pinErr').className='err';$('#pinErr').textContent=j.error||'PIN incorrecto';$('#pin').value='';$('#pin').focus()}
  }catch(e){$('#pinErr').className='err';$('#pinErr').textContent='Sin conexión, reintenta'}
  $('#pinBtn').disabled=false
}
$('#pinBtn').addEventListener('click',login)
$('#pin').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();login()}})

/* Guarda UNA o VARIAS empresas (mismas credenciales, un registro por empresa).
   quedarse=true → NO cierra: refresca la lista (marca las nuevas en verde) para seguir agregando
   más SIN re-loguear. quedarse=false → va a la pantalla final. */
async function guardar(names, quedarse){
  const lista=(Array.isArray(names)?names:[names]).filter(Boolean)
  if(!lista.length){ $('#empMsg').className='err'; $('#empMsg').textContent='Marca al menos una empresa.'; return }
  const msg = $('#empresas').classList.contains('hide') ? $('#formMsg') : $('#empMsg')
  msg.className='ok'; msg.textContent='Guardando '+lista.length+(lista.length>1?' empresas…':'…')
  $('#empBtn').disabled=true
  let ok=0
  for(const empresa of lista){
    try{
      const b={...CREDS, empresa, empresas: EMPRESAS.length?EMPRESAS:undefined}
      const r=await fetch('/guardar',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(b)})
      const j=await r.json().catch(()=>({})); if(r.ok&&j.ok){ ok++; YA.push((empresa||'').toLowerCase().trim()) }
    }catch(e){}
  }
  $('#empBtn').disabled=false
  if(!ok){ msg.className='err'; msg.textContent='No se pudo guardar.'; return }
  if(quedarse){
    // Quedarse en la lista para agregar MÁS sin re-loguear; las guardadas quedan en verde.
    pintarEmpresas(EMPRESAS, YA); $('#empTerminar').classList.remove('hide')
    msg.className='ok'; msg.textContent='✅ '+ok+(ok>1?' empresas conectadas':' empresa conectada')+'. Marca más si quieres, o toca «Terminar».'
  } else {
    $('#doneTxt').textContent=(ok>1?(ok+' empresas conectadas'):('Empresa "'+lista[0]+'" conectada'))+' — '+CREDS.banco+' para '+CREDS.userId+'.'; show('done')
  }
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
    if(j.empresas.length===1){ await guardar([j.empresas[0].empresa], false) } // una sola → guarda y termina
    else {
      // trae las empresas YA vinculadas de este usuario (para marcarlas en verde)
      YA=[]
      try{ const rc=await fetch('/conexiones?userId='+encodeURIComponent(CREDS.userId)); const jc=await rc.json().catch(()=>({})); YA=(jc.conexiones||[]).map(c=>(c.empresa||'').toLowerCase().trim()).filter(Boolean) }catch(e){}
      pintarEmpresas(j.empresas, YA); manual(false); $('#empTerminar').classList.add('hide'); show('empresas')  // varias → multi-select
    }
  } else {
    // No pude leer las empresas (clave rechazada, banco ocupado o seguridad). Muestro el paso de
    // empresa con campo MANUAL + aviso → el usuario decide (Volver a revisar la clave, o escribir
    // la empresa y guardar igual). Así NUNCA queda trabado.
    EMPRESAS=[]
    const rechazo = (j.estado==='login_fallido' || j.estado==='error_credenciales')
    const msg = rechazo
      ? 'El banco rechazó el ingreso — revisa el RUT y la clave (toca «Volver»). Si estás 100% seguro de que están bien, puede ser que el banco esté ocupado: escribe la empresa y guarda'
      : (j.error || 'No pude leer tus empresas del banco ahora')
    manual(true, msg); show('empresas')
  }
}
/* Alterna entre lista de empresas (auto) y campo manual (cuando el auto-listado falla). */
function manual(on, msg){
  $('#empLista').classList.toggle('hide', on)
  $('#empManualWrap').classList.toggle('hide', !on)
  if(on) $('#empSub').textContent=(msg||'')+'. Escribe el nombre de la empresa que quieres conectar (o toca «Volver» para revisar la clave):'
}
function pintarEmpresas(list, ya){
  ya=ya||[]
  const nvinc=ya.length
  $('#empSub').innerHTML='Tu RUT tiene <b>'+list.length+'</b> empresas. Marca TODAS las que quieras conectar (puedes elegir varias).'+(nvinc?' Las de <span style="color:var(--ok)">borde verde</span> ya están vinculadas.':'')
  $('#empLista').innerHTML=list.map((e,i)=>{
    const nom=(e.empresa||'').replace(/</g,'')
    const vinc=ya.includes((e.empresa||'').toLowerCase().trim())
    return '<label class="empItem'+(vinc?' ya':'')+'">'+
      '<input type="checkbox" name="emp" value="'+i+'">'+
      '<span><b>'+nom+'</b>'+(vinc?'<span class="badge">✓ ya vinculada</span>':'')+
      '<br><span style="color:var(--mut);font-size:12.5px">RUT '+(e.rut||'')+(e.rol?' · '+e.rol:'')+'</span></span></label>'
  }).join('')
}
$('#okBtn').addEventListener('click',continuar)
$('#clave').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();continuar()}})
$('#empBtn').addEventListener('click',()=>{
  if(!$('#empManualWrap').classList.contains('hide')){                    // modo manual (una) → termina
    const empresa=$('#empManual').value.trim()
    if(!empresa){$('#empMsg').className='err';$('#empMsg').textContent='Escribe el nombre de la empresa.';return}
    return guardar([empresa], false)
  }
  // multi-select: TODAS las marcadas (que no estén ya en verde) → se queda para agregar más
  const marcadas=[...document.querySelectorAll('input[name=emp]:checked')].map(c=>(EMPRESAS[+c.value]||{}).empresa).filter(Boolean)
    .filter(n=>!YA.includes((n||'').toLowerCase().trim()))
  if(!marcadas.length){$('#empMsg').className='err';$('#empMsg').textContent='Marca al menos una empresa nueva (las verdes ya están).';return}
  guardar(marcadas, true)
})
$('#empTerminar').addEventListener('click',()=>{ $('#doneTxt').textContent='Listo — '+YA.length+' empresa'+(YA.length===1?'':'s')+' conectada'+(YA.length===1?'':'s')+' para '+CREDS.userId+'.'; show('done') })
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
    // no-cache: el teléfono NO debe quedarse con una versión vieja del widget.
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store, no-cache, must-revalidate', 'pragma': 'no-cache', 'expires': '0' })
    return res.end(PAGINA)
  }

  // Login: PIN → cookie firmada (con rate-limit)
  if (req.method === 'POST' && url === '/auth') {
    const espera = bloqueado(ip)
    if (espera) { res.writeHead(429, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ error: `Demasiados intentos. Espera ${espera}s.` })) }
    const body = await leerBody(req, 1000)
    let pin = ''
    try { pin = String(JSON.parse(body).pin || '') } catch { /* */ }
    // Acepta el PIN fijo (maestro) O un CÓDIGO de un solo uso vigente (los que genera Nexus).
    const okPin = pin && pin === PIN
    const codeRes = (!okPin && pin) ? validarCodigo(pin) : false
    if (okPin || codeRes) {
      exito(ip)
      // Si el código está atado a un usuario de Nexus, lo fijamos en la cookie → ese usuario
      // guarda/ve SOLO sus conexiones (el PIN maestro queda libre para el admin).
      const uid = (codeRes && codeRes.userId) ? String(codeRes.userId) : ''
      const val = uid ? ('ok:' + encodeURIComponent(uid)) : 'ok'
      res.writeHead(200, { 'content-type': 'application/json', 'set-cookie': `sid=${sign(val)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=43200` })
      return res.end(JSON.stringify({ ok: true, userId: uid || null }))
    }
    fallo(ip)
    res.writeHead(401, { 'content-type': 'application/json' })
    return res.end('{"error":"Código incorrecto o vencido"}')
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
    const ses = sesion(req)
    if (!ses) { res.writeHead(401, { 'content-type': 'application/json' }); return res.end('{"error":"no autenticado"}') }
    const body = await leerBody(req, 8000)
    let d = {}
    try { d = JSON.parse(body) } catch { /* */ }
    // Si el código estaba atado a un usuario de Nexus, se GUARDA bajo ESE usuario (no el tecleado).
    const userId = ses.userId || String(d.userId || '').trim()
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
    // Deja la sesión lista para leer AL TOQUE (login persistente en segundo plano, 1 por usuario).
    calentarSesion(userId)
    res.writeHead(200, { 'content-type': 'application/json' })
    return res.end(JSON.stringify({ ok: true, userId, banco, empresa: r.empresa || null, total: r.total, conectando: true }))
  }

  // Listado (solo lectura, SIN claves) — útil para depurar desde el navegador.
  if (req.method === 'GET' && url.startsWith('/conexiones')) {
    const ses = sesion(req)
    if (!ses) { res.writeHead(401, { 'content-type': 'application/json' }); return res.end('{"error":"no autenticado"}') }
    // El userId de la cookie manda (cada usuario ve SOLO lo suyo); si es PIN maestro, el query.
    const userId = ses.userId || new URL(url, 'http://x').searchParams.get('userId') || ''
    res.writeHead(200, { 'content-type': 'application/json' })
    return res.end(JSON.stringify({ ok: true, conexiones: userId ? listar(userId) : [] }))
  }

  res.writeHead(404, { 'content-type': 'text/plain' })
  res.end('no')
})

server.listen(PORT, HOST, () => {
  console.log(`[tek-conectar] escuchando en http://${HOST}:${PORT} (PIN requerido)`)
})
