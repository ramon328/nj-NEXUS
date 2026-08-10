#!/bin/zsh
# avisar-saldos-listos.sh — Espera a que termine la lectura de saldos y le avisa a Ramón
# por WhatsApp con el resultado. Corre DESPRENDIDO (nohup): sobrevive aunque se cierre
# la sesión que lo lanzó. Solo lee y manda un mensaje; no toca el banco.
set -u
DIR=/Users/AIagenteia/nexus/conector-tek
NUM=56932945240
LOG=/tmp/nexus-avisar-saldos.log
cd "$DIR" || exit 1
ts() { date "+%H:%M:%S" }
echo "[$(ts)] esperando que termine la lectura…" >> $LOG

# 1) Esperar a que arranque (hasta 3 min) y luego a que termine (tope 50 min).
for i in {1..18}; do pgrep -f login-humano.mjs > /dev/null && break; sleep 10; done
for i in {1..300}; do pgrep -f login-humano.mjs > /dev/null || break; sleep 10; done

# 2) Armar el resumen desde los archivos que quedaron escritos HOY.
RESUMEN=$(/usr/local/bin/node -e '
const fs=require("fs");
const hoy=new Date(); hoy.setHours(0,0,0,0);
let hechas=[], viejas=[], total=0;
for (const f of fs.readdirSync("data")) {
  if (!/^emp-.*\.json$/.test(f) || /-movs/.test(f)) continue;
  const st=fs.statSync("data/"+f);
  let d={}; try { d=JSON.parse(fs.readFileSync("data/"+f,"utf8")) } catch(e){ continue }
  const linea=`${d.empresa}: $${(d.total_clp||0).toLocaleString("es-CL")}`;
  if (st.mtimeMs>=hoy.getTime()) { hechas.push(linea); total+=(d.total_clp||0) } else viejas.push(d.empresa);
}
const L=[];
if (hechas.length) {
  L.push(`✅ Saldos de Nico actualizados — ${hechas.length} empresas`);
  L.push("");
  hechas.sort().forEach(x=>L.push("▸ "+x));
  L.push("");
  L.push(`*Total CLP: $${total.toLocaleString("es-CL")}*`);
} else {
  L.push("⚠️ La lectura de saldos de Nico terminó SIN guardar nada (no alcanzó a completarse).");
}
if (viejas.length) { L.push(""); L.push(`Sin refrescar hoy (${viejas.length}): ${viejas.join(", ")}`) }
console.log(L.join("\n"));
' 2>/dev/null)

echo "[$(ts)] mando aviso a $NUM" >> $LOG
cd /Users/AIagenteia/nexus/hub || exit 1
MSG="$RESUMEN" /usr/local/bin/node --env-file=/Users/AIagenteia/nexus/.env -e "
import('/Users/AIagenteia/nexus/hub/kapso.mjs').then(async k=>{
  const r = await k.enviarKapso('$NUM', process.env.MSG);
  console.log('enviado:', JSON.stringify(r).slice(0,120));
}).catch(e=>console.log('ERR', e.message));
" >> $LOG 2>&1
echo "[$(ts)] fin" >> $LOG
