#!/bin/zsh
# saldos-diarios.sh — Lector de saldos de TODAS las empresas, una vez al día (05:00).
#
# POR QUÉ: los saldos que sirve Nexus salen de data/emp-<slug>.json (banco.mjs es
# cache-first). Si nadie los refresca quedan viejos — el 09-ago estaban con 10 días de
# desfase (ACE marcaba $27,9M cuando eran $37,4M). Esto los deja tomados cada mañana.
#
# POR QUÉ CON NICO: su login ve las 9 empresas (las 4 de Ramón + sus 5). UN solo login
# cubre todo. Ver [[tek-cosecha-multiempresa]].
#
# CUIDADOS (no romper nada):
#   · Si hay un login del banco en vuelo, NO arranca (esperar es mejor que pisar).
#   · Si el candado de masiva está tomado, tampoco.
#   · Respeta el throttle: si no hay cupo de login, se sale sin intentar.
#   · SOLO LECTURA: no transfiere, no autoriza, no mueve plata.
#   · NADA de TEK_LEER_MOVS ni TEK_CAPTURAR: queman el login (probado 09-ago).
set -u
DIR=/Users/AIagenteia/nexus/conector-tek
LOG=/tmp/nexus-saldos-diarios.log
cd "$DIR" || exit 1
ts() { date "+%Y-%m-%d %H:%M:%S" }

echo "[$(ts)] ── inicio ──" >> $LOG

# 0) ¿YA se logró hoy? El trabajo corre a las 5:00 y REINTENTA 7:30 y 10:00, porque el
#    antifraude del banco rebota intentos sueltos sin razón aparente (10-ago: el de las 5:00
#    rebotó al muro genérico y el mismo login, misma IP y misma cuenta, entró a las 7:31).
#    Un solo tiro dejaba los saldos viejos TODO el día. Si ya hay lectura de hoy, no molesta.
HOY=$(date +%Y-%m-%d)
YA_HOY=$(/usr/local/bin/node -e '
const fs=require("fs");
let masNuevo=0;
try { for (const f of fs.readdirSync("data")) {
  if (!/^emp-.*\.json$/.test(f) || /-movs/.test(f)) continue;
  masNuevo=Math.max(masNuevo, fs.statSync("data/"+f).mtimeMs);
} } catch(e){}
const d=new Date(masNuevo);
const hoy=new Date(); hoy.setHours(0,0,0,0);
console.log(masNuevo>=hoy.getTime() ? "si" : "no");
' 2>/dev/null)
if [ "$YA_HOY" = "si" ]; then
  echo "[$(ts)] los saldos ya se leyeron hoy → no repito" >> $LOG; exit 0
fi

# 1) No pisar una operación en curso.
if pgrep -f "login-humano.mjs" > /dev/null; then
  echo "[$(ts)] hay un login en vuelo → no corro hoy" >> $LOG; exit 0
fi
if [ -f "$DIR/data/.masiva.lock" ]; then
  echo "[$(ts)] candado de masiva tomado → no corro hoy" >> $LOG; exit 0
fi

# 2) ¿Hay cupo de login? (mismo criterio que el candado anti-quemado)
CUPO=$(/usr/local/bin/node -e '
const fs=require("fs");
let h={logins:[],device_trust:[]};
try{h=JSON.parse(fs.readFileSync("data/login-hist-nico.json","utf8"))}catch(e){}
const now=Date.now();
const vig=(h.logins||[]).map(x=>typeof x==="number"?x:x.t).filter(t=>now-t<3600000);
const dt=(h.device_trust||[]).filter(t=>now-t<25*60000);
console.log((vig.length<4 && dt.length===0) ? "si" : "no");
' 2>/dev/null)
if [ "$CUPO" != "si" ]; then
  echo "[$(ts)] sin cupo de login (throttle o device_trust) → no corro hoy" >> $LOG; exit 0
fi

# 3) Cosecha: saldos + movimientos RECIENTES de las 9 empresas, en UN login.
#    TEK_DESDE acota la ventana: sin él, los movimientos se piden en 4 tramos mensuales
#    (90 días) por empresa y eso NO cabe — el 09-ago reventó el tope en la 1ª empresa.
#    Con 7 días es UN tramo por empresa. El histórico largo es otro flujo (bajar-historica).
#    Tope 60 min: las 9 empresas con movimientos tardaron 35 min el 10-ago — 40 quedaba
#    demasiado justo y un banco lento cortaba la corrida. La sesión dura 95, así que sobra.
DESDE=$(date -v-7d +%Y-%m-%d)
echo "[$(ts)] leyendo saldos + movimientos desde $DESDE (1 login)…" >> $LOG
TEK_TOPE_MS=3600000 TEK_LEER_MOVS=1 TEK_DESDE="$DESDE" \
  /usr/local/bin/node leer-saldos.mjs --user nico >> $LOG 2>&1
echo "[$(ts)] ── fin (exit=$?) ──" >> $LOG

# 4) Recorte del log para que no crezca sin control.
tail -n 2000 $LOG > $LOG.tmp && mv $LOG.tmp $LOG
