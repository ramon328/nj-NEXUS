#!/bin/zsh
# saldos-oportunista.sh — Refresca los saldos APROVECHANDO una sesión que YA está viva.
#
# IDEA (pedido de Ramón, 09-08-2026): cuando alguien entra al banco, hace lo suyo y la
# sesión queda abierta sin nada corriendo, se aprovecha ESE momento para leer los saldos.
# Sale gratis: reusa la sesión, NO loguea.
#
# ⛔ REGLA DURA: NUNCA dispara un login. La garantía NO es la fecha del session-<user>.json
#    (ese archivo se toca aunque la sesión esté muerta — pasó el 09-ago y gastó un login):
#    la garantía es TEK_SOLO_REUSAR=1, que hace que login-humano SALGA en vez de loguear si
#    la sesión no se puede reusar. La fecha del archivo queda solo como filtro barato previo.
#
# Tampoco corre si hay una operación en curso ni si los saldos ya están recientes.
set -u
DIR=/Users/AIagenteia/nexus/conector-tek
LOG=/tmp/nexus-saldos-oportunista.log
FRESCA_MAX=8        # min — filtro barato; la garantía real es TEK_SOLO_REUSAR
MIN_ENTRE_CORRIDAS=90   # min — no releer si ya se leyó hace poco
cd "$DIR" || exit 0
ts() { date "+%Y-%m-%d %H:%M:%S" }

# 1) Nada en vuelo (no pisar una operación).
pgrep -f "login-humano.mjs" > /dev/null && exit 0
[ -f "$DIR/data/.masiva.lock" ] && exit 0
# zsh sin NULL_GLOB aborta el glob si no hay match → se resuelve con find, no con ls.
[ -n "$(find "$DIR" -maxdepth 1 -name '*.lock' -print -quit 2>/dev/null)" ] && exit 0

# 2) ¿Hay una sesión FRESCA de alguien? (si no, salimos: jamás logueamos acá)
USER_FRESCO=$(/usr/local/bin/node -e '
const fs=require("fs");
const cands=[["ramon","session.json"],["nico","session-nico.json"],["joaquin","session-joaquin.json"]];
const max=Number(process.argv[1])*60000;
for (const [u,f] of cands) {
  try { if (Date.now()-fs.statSync(f).mtimeMs < max) { console.log(u); break } } catch(e){}
}
' "$FRESCA_MAX" 2>/dev/null)
[ -z "$USER_FRESCO" ] && exit 0

# 3) ¿Los saldos ya están frescos? (no molestar por gusto)
YA=$(/usr/local/bin/node -e '
const fs=require("fs");
let masNuevo=0;
try { for (const f of fs.readdirSync("data")) {
  if (!/^emp-.*\.json$/.test(f) || /-movs/.test(f)) continue;
  masNuevo=Math.max(masNuevo, fs.statSync("data/"+f).mtimeMs);
} } catch(e){}
console.log(Date.now()-masNuevo < Number(process.argv[1])*60000 ? "si" : "no");
' "$MIN_ENTRE_CORRIDAS" 2>/dev/null)
[ "$YA" = "si" ] && exit 0

# 4) Aprovechar: leer saldos reusando la sesión viva. Sin movimientos (eso es del cron 5 AM).
echo "[$(ts)] sesión de $USER_FRESCO parece viva y libre → intento refrescar saldos SIN loguear" >> $LOG
TEK_SOLO_REUSAR=1 TEK_TOPE_MS=900000 /usr/local/bin/node leer-saldos.mjs --user "$USER_FRESCO" >> $LOG 2>&1
echo "[$(ts)] fin (exit=$?)" >> $LOG
tail -n 500 $LOG > $LOG.tmp && mv $LOG.tmp $LOG
