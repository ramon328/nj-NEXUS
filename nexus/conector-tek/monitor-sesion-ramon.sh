#!/bin/zsh
# Vigila la sesión de banco de ANA CLARA (ramon) que quedó viva tras la masiva de las ~00:12.
# Cuando el corazón detecta que el banco la cerró ([ramon] ✗ muerta), calcula cuánto duró
# desde el login y le avisa a Ramón por WhatsApp (+56932945240). Corre 1 sola vez y termina.
START=1784952748                 # login de la sesión: 2026-07-25 00:12:28 local
LOG=/tmp/tek-corazon.log
ENVFILE=/Users/AIagenteia/nexus/.env
BASE=$(wc -l < "$LOG")           # baseline: no mirar líneas viejas
VISTA_VIVA=0
while true; do
  sleep 30
  # ¿el corazón confirmó viva al menos una vez? (para no contar un transitorio de arranque)
  tail -n +$((BASE+1)) "$LOG" 2>/dev/null | grep -aqE '\[ramon\].*(viva|REESTABLECIDA|en uso)' && VISTA_VIVA=1
  NEW=$(tail -n +$((BASE+1)) "$LOG" 2>/dev/null | grep -aE '\[ramon\].*muerta' | head -1)
  if [ -n "$NEW" ]; then
    TS=$(echo "$NEW" | grep -aoE '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}')
    DEATH=$(date -j -u -f "%Y-%m-%dT%H:%M:%S" "$TS" +%s 2>/dev/null)
    [ -z "$DEATH" ] && DEATH=$(date +%s)
    DUR=$((DEATH - START)); MIN=$((DUR/60)); SEC=$((DUR%60))
    HL=$(date -r $START '+%H:%M'); HM=$(date -r $DEATH '+%H:%M')
    export MSG_BODY="⏱️ Reporte sesión banco (ANA CLARA) — corazón a 1 min:
Entró ~${HL}, Santander la cerró ~${HM}.
Duró *${MIN} min ${SEC} seg* antes de que el banco la cerrara por seguridad.
(Self-heal off, no la reloguea sola. Mañana 06:48 el corazón vuelve a 3 min.)"
    node --env-file="$ENVFILE" --input-type=module -e "
import { enviarKapso } from '/Users/AIagenteia/nexus/hub/kapso.mjs'
await enviarKapso('+56932945240', process.env.MSG_BODY); console.log('Ramon avisado')
"
    echo "$(date '+%H:%M:%S') sesión murió — duró ${MIN}m ${SEC}s — Ramón avisado (viva_vista=$VISTA_VIVA)"
    break
  fi
done
