// subir-archivos.mjs — página simple para que Ramón me envíe archivos (audios, etc.)
// desde el teléfono. Guarda en ~/nexus/uploads/ y desde ahí los uso (F5, whisper…).
import http from 'node:http'
import { writeFileSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import os from 'node:os'

const PORT = Number(process.env.PUERTO_SUBIR || 7695)
const DIR = join(os.homedir(), 'nexus', 'uploads')
mkdirSync(DIR, { recursive: true })
const safe = (n) => String(n || 'archivo').replace(/[\/\\:*?"<>|]/g, '_').replace(/\s+/g, '_').slice(-80)

const PAGE = `<!doctype html><html lang=es><head><meta charset=utf-8>
<meta name=viewport content="width=device-width,initial-scale=1">
<title>Enviar archivo a Nexus</title>
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
 <h1>Enviar archivo a Nexus</h1>
 <p>Sube el audio (o cualquier archivo). Se guarda en el Mac para que lo use.</p>
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
 msg.className=ok?'ok':'err'; msg.textContent=ok?('✅ '+ok+' archivo(s) enviado(s). Ya puedo usarlos.'):'❌ No se pudo subir'
 document.getElementById('b').disabled=false
 cargar()
}
async function cargar(){try{const r=await fetch('subir/list');const j=await r.json();document.getElementById('list').innerHTML=(j.archivos||[]).map(a=>'• '+a).join('<br>')}catch(e){}}
cargar()
</script></body></html>`

http.createServer((req, res) => {
  const u = (req.url || '/').split('?')[0].replace(/\/+$/, '') || '/'
  if (u.endsWith('/up') && req.method === 'POST') {
    let body = ''
    req.on('data', (d) => { body += d; if (body.length > 60e6) req.destroy() })
    req.on('end', () => {
      try {
        const j = JSON.parse(body)
        const nombre = `${Date.now()}-${safe(j.name)}`
        writeFileSync(join(DIR, nombre), Buffer.from(j.data, 'base64'))
        console.log(`[subir] guardado ${nombre} (${Buffer.from(j.data, 'base64').length} bytes)`)
        res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ ok: true, archivo: nombre }))
      } catch (e) { res.writeHead(400); res.end('err') }
    })
    return
  }
  if (u.endsWith('/list')) {
    let a = []
    try { a = readdirSync(DIR).slice(-20) } catch { /* */ }
    res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ archivos: a }))
  }
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(PAGE)
}).listen(PORT, '127.0.0.1', () => console.log(`[subir] http://127.0.0.1:${PORT}`))
