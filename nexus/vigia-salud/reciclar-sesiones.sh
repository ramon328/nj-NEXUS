#!/bin/bash
# Reciclar SOLO sesiones colgadas del chat web (procesos `claude -p ... --resume`)
# que llevan más de N horas vivas. NO toca ningún servicio de Nexus ni el hub.
# Es MANUAL y opt-in. Nunca lo agenda launchd.
#
# Uso:
#   ./reciclar-sesiones.sh            -> muestra candidatas (NO mata nada)
#   ./reciclar-sesiones.sh --hacer    -> recicla las candidatas (SIGTERM suave)
#   HORAS=8 ./reciclar-sesiones.sh    -> cambia el umbral (default 6h)

HORAS="${HORAS:-6}"
LIMITE=$((HORAS * 3600))
HACER=0
[ "$1" = "--hacer" ] && HACER=1

# etime de macOS: [[dd-]hh:]mm:ss  -> segundos
etime2seg() {
  local e="$1" dias=0 resto seg=0 IFS=:
  if [[ "$e" == *-* ]]; then dias="${e%%-*}"; resto="${e#*-}"; else resto="$e"; fi
  read -ra P <<< "$resto"
  if   [ "${#P[@]}" -eq 3 ]; then seg=$((10#${P[0]}*3600 + 10#${P[1]}*60 + 10#${P[2]})); \
  elif [ "${#P[@]}" -eq 2 ]; then seg=$((10#${P[0]}*60 + 10#${P[1]})); \
  else seg=$((10#${P[0]})); fi
  echo $(( 10#${dias}*86400 + seg ))
}

echo "Sesiones de chat (claude -p) con más de ${HORAS}h vivas:"
echo "----------------------------------------------------------"

FOUND=0
while read -r pid etime rss; do
  [ -z "$pid" ] && continue
  segs=$(etime2seg "$etime")
  if [ "$segs" -gt "$LIMITE" ]; then
    horas=$(echo "scale=1; $segs/3600" | bc)
    mb=$((rss/1024))
    echo "  PID $pid  edad ${horas}h  RAM ${mb}MB"
    FOUND=$((FOUND+1))
    if [ "$HACER" = "1" ]; then
      kill -TERM "$pid" 2>/dev/null && echo "     -> reciclada (TERM)"
    fi
  fi
done < <(ps -Ao pid,etime,rss,command | grep '[.]local/bin/claude -p' | grep -v grep | awk '{print $1, $2, $3}')

echo "----------------------------------------------------------"
if [ "$FOUND" = "0" ]; then
  echo "No hay sesiones viejas. Todo limpio."
elif [ "$HACER" = "0" ]; then
  echo "$FOUND candidata(s). Para reciclarlas: ./reciclar-sesiones.sh --hacer"
else
  echo "$FOUND reciclada(s). El chat web abre una nueva sola cuando haga falta."
fi
