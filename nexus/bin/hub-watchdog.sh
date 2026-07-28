#!/bin/bash
# Guardián del hub de Nexus.
# Se ejecuta cada 30s (StartInterval del LaunchAgent com.nexus.hub-watchdog).
# Sondea GET /health; si el hub NO responde 200 en 2 sondas SEGUIDAS, reinicia
# com.nexus.hub. El hub (1 hilo) a veces se congela: proceso vivo pero el event
# loop bloqueado deja de aceptar HTTP → "Nexus dejó de responder". Esto lo cura
# solo sin esperar a que alguien lo note.
#
# Salvaguardas anti-bucle:
#  - Necesita 2 fallos consecutivos (una sonda lenta puntual no dispara).
#  - No reinicia más de 1 vez cada 180s (evita tormenta de reinicios).
#  - Tras reiniciar, resetea el contador y respeta el cooldown de arranque.

LABEL="com.nexus.hub"
URL="http://127.0.0.1:3000/health"
UID_N="$(id -u)"
STATE="/tmp/nexus-hub-watchdog.state"      # nº de fallos consecutivos
LASTKICK="/tmp/nexus-hub-watchdog.lastkick" # epoch del último reinicio
LOG="/tmp/nexus-hub-watchdog.log"
FAILS_UMBRAL=2
COOLDOWN=180

now=$(date +%s)
log(){ echo "$(date '+%Y-%m-%d %H:%M:%S') $*" >> "$LOG"; }

# Cooldown: si acabamos de reiniciar, dar tiempo a arrancar sin contar fallos.
if [ -f "$LASTKICK" ]; then
  last=$(cat "$LASTKICK" 2>/dev/null || echo 0)
  if [ $((now - last)) -lt 45 ]; then
    echo 0 > "$STATE"
    exit 0
  fi
fi

code=$(curl -s -m 8 -o /dev/null -w "%{http_code}" "$URL" 2>/dev/null)

if [ "$code" = "200" ]; then
  echo 0 > "$STATE"
  exit 0
fi

# Fallo: incrementar contador.
fails=$(cat "$STATE" 2>/dev/null || echo 0)
fails=$((fails + 1))
echo "$fails" > "$STATE"
log "sonda FALLÓ (code=$code) fallos_consecutivos=$fails"

if [ "$fails" -lt "$FAILS_UMBRAL" ]; then
  exit 0
fi

# Rate-limit de reinicios.
if [ -f "$LASTKICK" ]; then
  last=$(cat "$LASTKICK" 2>/dev/null || echo 0)
  if [ $((now - last)) -lt "$COOLDOWN" ]; then
    log "hub sigue caído pero en cooldown ($((now - last))s < ${COOLDOWN}s), no reinicio aún"
    exit 0
  fi
fi

log "hub NO responde tras $fails sondas → reinicio com.nexus.hub"
launchctl kickstart -k "gui/${UID_N}/${LABEL}" >> "$LOG" 2>&1
echo "$now" > "$LASTKICK"
echo 0 > "$STATE"
exit 0
