#!/bin/bash
# Guardián del Funnel de Tailscale (la puerta de entrada de WhatsApp).
# Se ejecuta cada 60s (StartInterval del LaunchAgent com.nexus.funnel-watchdog).
#
# Qué cura: el nodo pierde su registro en el ingress público de Tailscale (pasa
# tras un cambio de red/IP). Localmente todo se ve sano —`tailscale funnel status`
# sigue diciendo "Funnel on" y el hub responde en 127.0.0.1— pero desde internet
# el TLS muere en el handshake. Kapso deja de poder entregar los webhooks y
# "Nexus por WhatsApp no responde", sin un solo error en los logs.
#
# Sonda: POST al webhook por la URL PÚBLICA. Sano = 401 (firma inválida, que es
# la respuesta correcta a un POST sin firmar). Caído = 000 (no hubo handshake).
#
# Salvaguardas anti-bucle:
#  - Solo repara si el hub responde en LOCAL: si el caído es el hub, esto no es
#    problema de Tailscale y lo cura com.nexus.hub-watchdog. No nos pisamos.
#  - Necesita 3 fallos consecutivos (~3 min): una sonda lenta puntual no dispara.
#  - No reconecta más de 1 vez cada 15 min.
#  - NO reconecta si hay una operación de banco viva (un `tailscale down/up`
#    corta el tailnet unos segundos y mataría el login asistido por /vnc).

URL_PUB="https://mac-mini-de-nicolas.tailee0068.ts.net/wa/kapso"
URL_LOCAL="http://127.0.0.1:3000/wa/kapso"
TEK_DATA="/Users/AIagenteia/nexus/conector-tek/data"
STATE="/tmp/nexus-funnel-watchdog.state"       # nº de fallos consecutivos
LASTKICK="/tmp/nexus-funnel-watchdog.lastkick" # epoch de la última reconexión
LOG="/Users/AIagenteia/nexus/logs/funnel-watchdog.log"
FAILS_UMBRAL=3
COOLDOWN=900

now=$(date +%s)
log(){ echo "$(date '+%Y-%m-%d %H:%M:%S') $*" >> "$LOG"; }

sonda(){ curl -s -m 15 -o /dev/null -w "%{http_code}" -X POST "$1" \
         -H 'Content-Type: application/json' -d '{"sonda":1}' 2>/dev/null; }

# Cooldown de arranque: tras reconectar, Tailscale tarda en re-registrarse.
if [ -f "$LASTKICK" ]; then
  last=$(cat "$LASTKICK" 2>/dev/null || echo 0)
  if [ $((now - last)) -lt 90 ]; then
    echo 0 > "$STATE"
    exit 0
  fi
fi

if [ "$(sonda "$URL_PUB")" = "401" ]; then
  echo 0 > "$STATE"
  exit 0
fi

# El Funnel no contesta. ¿Es culpa de Tailscale o está caído el hub?
local_code=$(sonda "$URL_LOCAL")
if [ "$local_code" != "401" ]; then
  log "Funnel caído PERO el hub tampoco responde en local (code=$local_code) → es del hub, no toco Tailscale"
  echo 0 > "$STATE"
  exit 0
fi

fails=$(cat "$STATE" 2>/dev/null || echo 0)
fails=$((fails + 1))
echo "$fails" > "$STATE"
log "Funnel NO responde desde internet (hub local sano) fallos_consecutivos=$fails"

[ "$fails" -lt "$FAILS_UMBRAL" ] && exit 0

if [ -f "$LASTKICK" ]; then
  last=$(cat "$LASTKICK" 2>/dev/null || echo 0)
  if [ $((now - last)) -lt "$COOLDOWN" ]; then
    log "sigue caído pero en cooldown ($((now - last))s < ${COOLDOWN}s), no reconecto aún"
    exit 0
  fi
fi

# Guardia de banco: cualquier candado de menos de 12 min = operación viva.
if [ -d "$TEK_DATA" ] && [ -n "$(find "$TEK_DATA" -name '*.lock' -mmin -12 2>/dev/null)" ]; then
  log "Funnel caído pero hay operación de banco viva → NO reconecto (esperando a que termine)"
  exit 0
fi

log "Funnel caído tras $fails sondas → tailscale down/up para re-registrar el ingress"
/usr/local/bin/tailscale down  >> "$LOG" 2>&1
sleep 3
/usr/local/bin/tailscale up    >> "$LOG" 2>&1
echo "$now" > "$LASTKICK"
echo 0 > "$STATE"
exit 0
