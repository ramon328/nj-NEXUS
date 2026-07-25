#!/bin/zsh
# Monitor de sesiones de banco POR PERSONA (Ramón, Nico, y cualquiera con banco vinculado).
# La sesión es por PERSONA (un login por persona abre TODAS sus empresas), no por empresa.
# Espera a que se abra cada sesión, la sigue, y cuando Santander la cierra calcula cuánto duró
# y le avisa a Ramón por WhatsApp (+56932945240). Reporta la 1ª sesión de cada persona y termina.
DONE=/tmp/tek-monitor-sesion.done
[ -f "$DONE" ] && exit 0
LOG=/tmp/tek-corazon.log
ENVFILE=/Users/AIagenteia/nexus/.env
KAPLIST="$HOME/Library/LaunchAgents/com.nexus.tek-keepalive.plist"
NUM="+56932945240"
# Lista de personas con banco (dinámica desde la bóveda; fallback ramon/nico)
USERS=$(node --input-type=module -e "import * as c from '/Users/AIagenteia/nexus/conector-tek/credenciales.mjs'; const u=(c.usuarios&&c.usuarios())||[]; console.log((u.length?u:['ramon','nico']).join(' '))" 2>/dev/null)
[ -z "$USERS" ] && USERS="ramon nico"
BASE=$(wc -l < "$LOG")
typeset -A START MARK REPORTED
n=0
for u in ${(z)USERS}; do START[$u]=""; MARK[$u]=$BASE; REPORTED[$u]=0; n=$((n+1)); done
echo "$(date '+%F %T') monitor armado para: $USERS ($n personas)"
done_count=0
while [ $done_count -lt $n ]; do
  sleep 30
  [ -f "$DONE" ] && exit 0
  for u in ${(z)USERS}; do
    [ ${REPORTED[$u]} -eq 1 ] && continue
    if [ -z "${START[$u]}" ]; then
      # nacimiento de la sesión: primer signo de vida tras el baseline
      LINE=$(tail -n +$((BASE+1)) "$LOG" 2>/dev/null | grep -aE "\[$u\].*(viva|REESTABLECIDA|en uso)" | head -1)
      if [ -n "$LINE" ]; then
        TS=$(echo "$LINE" | grep -aoE '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}')
        START[$u]=$(date -j -u -f "%Y-%m-%dT%H:%M:%S" "$TS" +%s 2>/dev/null)
        MARK[$u]=$(wc -l < "$LOG")
      fi
    else
      # muerte: primer muerta tras el nacimiento
      DEAD=$(tail -n +$((${MARK[$u]}+1)) "$LOG" 2>/dev/null | grep -aE "\[$u\].*muerta" | head -1)
      if [ -n "$DEAD" ]; then
        TS=$(echo "$DEAD" | grep -aoE '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}')
        DEATH=$(date -j -u -f "%Y-%m-%dT%H:%M:%S" "$TS" +%s 2>/dev/null); [ -z "$DEATH" ] && DEATH=$(date +%s)
        DUR=$((DEATH - ${START[$u]})); MIN=$((DUR/60)); SEC=$((DUR%60))
        HL=$(date -r ${START[$u]} '+%H:%M'); HM=$(date -r $DEATH '+%H:%M')
        POKE=$(/usr/libexec/PlistBuddy -c "Print :EnvironmentVariables:TEK_CORAZON_POKE_MS" "$KAPLIST" 2>/dev/null); [ -z "$POKE" ] && POKE=180000; PMIN=$((POKE/60000))
        UNAME=$(echo "$u" | tr '[:lower:]' '[:upper:]')
        export MSG_BODY="⏱️ Sesión banco *${UNAME}* — corazón a ${PMIN} min
Se abrió ~${HL}, Santander la cerró ~${HM}.
Duró *${MIN} min ${SEC} seg*."
        node --env-file="$ENVFILE" --input-type=module -e "import { enviarKapso } from '/Users/AIagenteia/nexus/hub/kapso.mjs'; await enviarKapso('$NUM', process.env.MSG_BODY); console.log('avisado')" 2>/dev/null
        REPORTED[$u]=1; done_count=$((done_count+1))
        echo "$(date '+%F %T') $u: ${MIN}m ${SEC}s (poke ${PMIN}min) — Ramón avisado"
      fi
    fi
  done
done
touch "$DONE"
echo "$(date '+%F %T') todas las sesiones reportadas ($n) — monitor listo"
