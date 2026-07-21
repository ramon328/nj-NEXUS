#!/usr/bin/env node
// wa-relink.mjs — re-vincula WhatsApp de Nexus/OpenClaw:
//  - mantiene UN solo `openclaw channels login` vivo (keeper, respawn)
//  - parsea el QR ASCII de medios-bloques -> PNG scanneable
//  - lo sirve en http://127.0.0.1:7699 (root, para Funnel /waqr)
//  - detecta linked -> baja todo, borra WA-NEEDS-RELINK, avisa
import { spawn } from 'node:child_process';
import http from 'node:http';
import zlib from 'node:zlib';
import fs from 'node:fs';
import os from 'node:os';

const HOME = os.homedir();
const OPENCLAW = `${HOME}/.npm-global/bin/openclaw`;
const PORT = 7699;
const PNG_PATH = '/tmp/wa-qr.png';
const STOP_FILE = '/tmp/wa-relink.stop';
const RELINK_FLAG = `${HOME}/.openclaw/WA-NEEDS-RELINK.txt`;

let state = { linked: false, qrCount: 0, lastQr: 0, started: Date.now(), msg: 'Iniciando…' };
let child = null, stopped = false;

// ---------- CRC32 / PNG encoder ----------
const crcTable = (() => { const t = new Uint32Array(256);
  for (let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
function crc32(buf){let c=0xFFFFFFFF;for(let i=0;i<buf.length;i++)c=crcTable[(c^buf[i])&0xff]^(c>>>8);return (c^0xFFFFFFFF)>>>0;}
function chunk(type,data){const t=Buffer.from(type,'ascii');const len=Buffer.alloc(4);len.writeUInt32BE(data.length,0);
  const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(Buffer.concat([t,data])),0);return Buffer.concat([len,t,data,crc]);}
function matrixToPng(mat, scale=10, margin=4){
  const mh=mat.length, mw=mat[0].length;
  const W=(mw+margin*2)*scale, H=(mh+margin*2)*scale;
  const raw=Buffer.alloc((W+1)*H);
  for(let y=0;y<H;y++){
    raw[y*(W+1)]=0; // filter none
    const my=Math.floor(y/scale)-margin;
    for(let x=0;x<W;x++){
      const mx=Math.floor(x/scale)-margin;
      let dark=false;
      if(my>=0&&my<mh&&mx>=0&&mx<mw) dark=mat[my][mx]===1;
      raw[y*(W+1)+1+x]=dark?0:255; // grayscale: dark=0 negro, claro=255
    }
  }
  const ihdr=Buffer.alloc(13);
  ihdr.writeUInt32BE(W,0);ihdr.writeUInt32BE(H,4);ihdr[8]=8;ihdr[9]=0;ihdr[10]=0;ihdr[11]=0;ihdr[12]=0;
  const idat=zlib.deflateSync(raw,{level:9});
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR',ihdr),chunk('IDAT',idat),chunk('IEND',Buffer.alloc(0))]);
}

// ---------- QR ASCII -> matriz ----------
const stripAnsi = s => s.replace(/\x1b\[[0-9;]*m/g,'').replace(/\r/g,'');
function renderQr(lines){
  // cada linea de texto = 2 filas de modulos (arriba/abajo).
  const W=Math.max(...lines.map(l=>l.length));
  const mat=[];
  for(const l of lines){
    const top=new Array(W).fill(0), bot=new Array(W).fill(0);
    for(let x=0;x<W;x++){
      const ch=l[x]||' ';
      const up=(ch==='█'||ch==='▀'); // █ ▀
      const dn=(ch==='█'||ch==='▄'); // █ ▄
      top[x]=up?1:0; bot[x]=dn?1:0;
    }
    mat.push(top); mat.push(bot);
  }
  try{
    const png=matrixToPng(mat);
    fs.writeFileSync(PNG_PATH+'.tmp',png); fs.renameSync(PNG_PATH+'.tmp',PNG_PATH);
    state.qrCount++; state.lastQr=Date.now(); state.msg='QR listo — escanéalo con tu teléfono';
    log(`QR #${state.qrCount} render ok (${mat[0].length}x${mat.length} modulos)`);
  }catch(e){ log('render err '+e.message); }
}

// ---------- keeper del login ----------
let buf=[], flushTimer=null;
function flushBuf(){ flushTimer=null; if(buf.length>=10){ renderQr(buf); } buf=[]; }
function feedLine(line){
  const s=stripAnsi(line);
  if(/[▀▄█]/.test(s)){
    buf.push(s);
    // flush por inactividad: dibuja el QR apenas termina de imprimirse
    // (no espera a la siguiente rotacion -> nunca muestra un QR vencido)
    if(flushTimer) clearTimeout(flushTimer);
    flushTimer=setTimeout(flushBuf,400);
    return;
  }
  // linea no-QR: si veniamos de un bloque, cierralo ya
  if(buf.length>=10){ if(flushTimer){clearTimeout(flushTimer);flushTimer=null;} renderQr(buf); }
  buf=[];
  if(/timed out|timeout|error/i.test(s)) log('login: '+s.trim());
}
function spawnLogin(){
  if(stopped) return;
  state.msg='Generando QR…';
  child=spawn(OPENCLAW,['channels','login','--channel','whatsapp'],
    {env:{...process.env,PATH:`${HOME}/.npm-global/bin:${process.env.PATH}`}});
  let acc='';
  const onData=d=>{acc+=d.toString();let i;while((i=acc.indexOf('\n'))>=0){feedLine(acc.slice(0,i));acc=acc.slice(i+1);}};
  child.stdout.on('data',onData); child.stderr.on('data',onData);
  child.on('exit',c=>{ if(buf.length>=10){renderQr(buf);buf=[];}
    log(`login salió (code=${c})`); child=null;
    if(!stopped && !state.linked) setTimeout(spawnLogin,1200);
  });
}

// ---------- detectar linked ----------
function checkLinked(){
  if(stopped) return;
  const p=spawn(OPENCLAW,['channels','status'],{env:{...process.env,PATH:`${HOME}/.npm-global/bin:${process.env.PATH}`}});
  let o=''; p.stdout.on('data',d=>o+=d); p.stderr.on('data',d=>o+=d);
  p.on('exit',()=>{
    const wa=o.split('\n').find(l=>/whatsapp/i.test(l))||'';
    if(/(^|[ ,])linked/.test(wa) && /connected/.test(wa) && !/not linked|disconnected/.test(wa)){
      onLinked();
    }
  });
}
function onLinked(){
  if(state.linked) return;
  state.linked=true; state.msg='✅ Vinculado — WhatsApp de Nexus reconectado';
  log('LINKED ✔ — bajando login y Funnel /waqr');
  stopped=true;
  try{ if(child) child.kill('SIGTERM'); }catch{}
  try{ fs.unlinkSync(RELINK_FLAG); }catch{}
  try{ fs.unlinkSync(PNG_PATH); }catch{}
  // bajar el path publico de Funnel por seguridad
  spawn('/usr/local/bin/tailscale',['serve','--https=443','--set-path=/waqr','off'],{stdio:'ignore'})
    .on('exit',()=>log('Funnel /waqr retirado'));
  setTimeout(()=>process.exit(0),8000);
}

// ---------- web ----------
function page(){
  const linked=state.linked;
  return `<!doctype html><html lang=es><head><meta charset=utf-8>
<meta name=viewport content="width=device-width,initial-scale=1">
<title>Vincular WhatsApp — Nexus</title>
<style>
 body{margin:0;font-family:-apple-system,system-ui,Segoe UI,Roboto,sans-serif;background:#0b141a;color:#e9edef;
   min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box}
 .card{background:#111b21;border-radius:20px;padding:26px 22px;max-width:420px;width:100%;text-align:center;
   box-shadow:0 10px 40px rgba(0,0,0,.5)}
 h1{font-size:20px;margin:0 0 6px} p.sub{color:#8696a0;font-size:14px;margin:0 0 18px;line-height:1.4}
 .qr{background:#fff;border-radius:16px;padding:14px;display:inline-block;line-height:0;min-height:120px}
 .qr img{width:280px;height:280px;image-rendering:pixelated}
 .st{margin-top:16px;font-size:14px;color:#25d366;font-weight:600}
 .ok{font-size:44px;margin:10px 0}
 ol{text-align:left;color:#8696a0;font-size:13px;line-height:1.6;margin:16px 4px 0;padding-left:18px}
 .dim{color:#5b6a72;font-size:12px;margin-top:14px}
</style></head><body>
<div class=card>
 <h1>Vincular WhatsApp de Nexus</h1>
 <p class=sub id=sub></p>
 <div id=box></div>
 <div class=st id=st></div>
 <ol id=steps>
  <li>Abre <b>WhatsApp</b> en tu teléfono</li>
  <li>Ajustes → <b>Dispositivos vinculados</b></li>
  <li>Toca <b>Vincular un dispositivo</b> y escanea el QR</li>
 </ol>
 <div class=dim id=dim></div>
</div>
<script>
async function tick(){
 try{
  const r=await fetch('/waqr/status?t='+Date.now()); const s=await r.json();
  document.getElementById('sub').textContent=s.msg||'';
  document.getElementById('dim').textContent='QR generados: '+s.qrCount;
  if(s.linked){
   document.getElementById('box').innerHTML='<div class=ok>✅</div>';
   document.getElementById('st').textContent='WhatsApp reconectado. Ya puedes cerrar esta página.';
   document.getElementById('steps').style.display='none';
   return; // no seguir refrescando
  } else {
   document.getElementById('box').innerHTML='<div class=qr><img src="/waqr/img.png?t='+Date.now()+'"></div>';
   document.getElementById('st').textContent='';
  }
 }catch(e){}
 setTimeout(tick,3000);
}
tick();
</script></body></html>`;
}
http.createServer((req,res)=>{
  const u=(req.url||'/').split('?')[0].replace(/\/+$/,'')||'/';
  if(u.endsWith('/img.png')){
    if(fs.existsSync(PNG_PATH)){const b=fs.readFileSync(PNG_PATH);
      res.writeHead(200,{'content-type':'image/png','cache-control':'no-store'});return res.end(b);}
    res.writeHead(404);return res.end();
  }
  if(u.endsWith('/status')){
    res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});
    return res.end(JSON.stringify({linked:state.linked,msg:state.msg,qrCount:state.qrCount}));
  }
  res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
  res.end(page());
}).listen(PORT,'127.0.0.1',()=>log(`web en http://127.0.0.1:${PORT}`));

function log(m){ const line=`[${new Date().toISOString()}] ${m}\n`;
  try{fs.appendFileSync('/tmp/nexus-wa-relink.log',line);}catch{} process.stdout.write(line); }

// stop file watcher
setInterval(()=>{ if(fs.existsSync(STOP_FILE)){stopped=true;try{if(child)child.kill();}catch{};process.exit(0);} },2000);

log('=== wa-relink arrancado ==='); spawnLogin(); setInterval(checkLinked,5000);
