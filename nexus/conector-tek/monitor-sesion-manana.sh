#!/bin/zsh
# Monitor ARMADO para la PRÓXIMA sesión de banco de ANA CLARA (ramon). Espera a que se abra
# una sesión nueva (primer signo de vida en el log del corazón), la sigue, y cuando Santander
# la cierra calcula cuánto duró y le avisa a Ramón por WhatsApp (+56932945240). Dispara UNA vez
# (deja un flag) y queda inerte. Lo lanza el LaunchAgent com.nexus.tek-monitor-sesion.
DONE=/tmp/tek-monitor-sesion.done
[ -f "$DONE" ] && exit 0
LOG=/tmp/tek-corazon.log
ENVFILE=/Users/AIagenteia/nexus/.env
KAPLIST="$HOME/Library/LaunchAgents/com.nexus.tek-keepalive.plist"
NUM="+56932945240"
BASE=$(wc -l < "$LOG")            # baseline: la sesión de anoche ya está muerta; ignorar lo viejo
SESSION_START=""
MARK=$BASE
# 1) esperar a que NAZCA una sesión nueva de ramon (viva / reestablecida / en uso)
while [ -z "$SESSION_START" ]; do
  sleep 30
  [ -f "$DONE" ] && exit 0
  LINE=$(tail -n +$((BASE+1)) "$LOG" 2>/dev/null | grep -aE '\[ramon\].*(viva|REESTABLECIDA|en uso)' | head -1)
  if [ -n "$LINE" ]; then
    TS=$(echo "$LINE" | grep -aoE '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}')
    SESSION_START=$(date -j -u -f "%Y-%m-%dT%H:%M:%S" "$TS" +%s 2>/dev/null)
    MARK=$(wc -l < "$LOG")
  fi
done
# 2) esperar a que el banco la CIERRE (primer muerta tras el nacimiento)
while true; do
  sleep 30
  [ -f "$DONE" ] && exit 0
  DEAD=$(tail -n +$((MARK+1)) "$LOG" 2>/dev/null | grep -aE '\[ramon\].*muerta' | head -1)
  if [ -n "$DEAD" ]; then
    TS=$(echo "$DEAD" | grep -aoE '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}')
    DEATH=$(date -j -u -f "%Y-%m-%dT%H:%M:%S" "$TS" +%s 2>/dev/null); [ -z "$DEATH" ] && DEATH=$(date +%s)
    DUR=$((DEATH - SESSION_START)); MIN=$((DUR/60)); SEC=$((DUR%60))
    HL=$(date -r $SESSION_START '+%H:%M'); HM=$(date -r $DEATH '+%H:%M')
    POKE=$(/usr/libexec/PlistBuddy -c "Print :EnvironmentVariables:TEK_CORAZON_POKE_MS" "$KAPLIST" 2>/dev/null)
    [ -z "$POKE" ] && POKE=180000; PMIN=$((POKE/60000))
    export MSG_BODY="⏱️ *Sesión banco (ANA CLARA) — 1ª del día*
Se abrió ~${HL}, Santander la cerró ~${HM}.
Duró *${MIN} min ${SEC} seg* (corazón a ${PMIN} min).
Referencia: anoche con el banco caliente duró ~12 min."
    node --env-file="$ENVFILE" --input-type=module -e "
import { enviarKapso } from '/Users/AIagenteia/nexus/hub/kapso.mjs'
await enviarKapso('$NUM', process.env.MSG_BODY); console.log('Ramon avisado')
"
    touch "$DONE"
    echo "$(date '+%F %T') 1ª sesión de mañana: ${MIN}m ${SEC}s (poke ${PMIN}min) — Ramón avisado"
    break
  fi
done
