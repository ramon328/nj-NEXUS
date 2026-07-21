#!/bin/bash
# Autos Intel — runner del scraper para ejecución en segundo plano (silenciosa).
#
# Este script lo invoca el agendador del sistema (launchd / cron / Task Scheduler)
# al inicio de cada ventana (09:00 y 21:00). Elige un MINUTO ALEATORIO dentro de
# la ventana (espera 0–59 min antes de arrancar), registra la hora elegida y corre
# el scraper, dejando todo en un log.
#
# IMPORTANTE (macOS): este runner y sus logs viven FUERA de ~/Documents. launchd
# no puede leer archivos dentro de ~/Documents (TCC), pero el intérprete de Python
# del .venv sí puede importar el paquete del repo. Por eso el runner está aquí y
# solo delega en `python -m scraper.main`.
#
# Configuración: se lee de `env` (mismo directorio que este script), generado por
# el instalador. Variables: REPO, PYTHON, LOG_DIR, STATE_DIR, MAX_DELAY_SEC, EXTRA_ARGS.

set -u

SELF_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Carga configuración generada por el instalador.
if [ -f "$SELF_DIR/env" ]; then
  # shellcheck disable=SC1091
  . "$SELF_DIR/env"
fi

REPO="${REPO:?REPO no definido (falta scheduler/env)}"
PYTHON="${PYTHON:-$REPO/.venv/bin/python}"
LOG_DIR="${LOG_DIR:-$HOME/Library/Logs/AutosIntel}"
STATE_DIR="${STATE_DIR:-$HOME/Library/Application Support/AutosIntel}"
MAX_DELAY_SEC="${MAX_DELAY_SEC:-3599}"   # 0..59min => arranque entre HH:00 y HH:59
EXTRA_ARGS="${EXTRA_ARGS:-}"

mkdir -p "$LOG_DIR" "$STATE_DIR"
LOG="$LOG_DIR/scraper.log"

log() { echo "$(date '+%Y-%m-%d %H:%M:%S %z') | $*" >> "$LOG"; }

# --- Toggle de habilitado/deshabilitado ---------------------------------------
if [ -f "$STATE_DIR/disabled" ]; then
  log "SKIP — el agendador está deshabilitado (existe $STATE_DIR/disabled)."
  exit 0
fi

# --- Lock para evitar corridas solapadas --------------------------------------
LOCK="$STATE_DIR/run.lock"
if ! mkdir "$LOCK" 2>/dev/null; then
  # ¿lock viejo y huérfano? (>6h) lo limpiamos; si no, salimos.
  if [ -f "$LOCK/pid" ] && ! kill -0 "$(cat "$LOCK/pid" 2>/dev/null)" 2>/dev/null; then
    log "Lock huérfano detectado — limpiando y continuando."
    rm -rf "$LOCK"; mkdir "$LOCK" 2>/dev/null || { log "No se pudo tomar el lock. Salgo."; exit 0; }
  else
    log "Otra corrida en progreso (lock activo). Salgo."
    exit 0
  fi
fi
echo "$$" > "$LOCK/pid"
cleanup() { rm -rf "$LOCK"; }
trap cleanup EXIT INT TERM

# --- Minuto aleatorio dentro de la ventana ------------------------------------
# RANDOM ∈ [0,32767]; lo escalamos a [0, MAX_DELAY_SEC].
DELAY=$(( RANDOM % (MAX_DELAY_SEC + 1) ))
START_EPOCH=$(( $(date +%s) + DELAY ))
# Hora elegida (compatible con macOS/BSD date y GNU date).
if date -r "$START_EPOCH" '+%H:%M:%S' >/dev/null 2>&1; then
  START_HUMAN="$(date -r "$START_EPOCH" '+%Y-%m-%d %H:%M:%S')"
else
  START_HUMAN="$(date -d "@$START_EPOCH" '+%Y-%m-%d %H:%M:%S')"
fi

log "WAKE — ventana iniciada. Minuto aleatorio elegido: arranque a las $START_HUMAN (espera ${DELAY}s)."

# Espera interrumpible (en trozos, para responder a un disable/stop).
WAITED=0
while [ "$WAITED" -lt "$DELAY" ]; do
  if [ -f "$STATE_DIR/disabled" ]; then
    log "SKIP — deshabilitado durante la espera. Cancelo la corrida."
    exit 0
  fi
  sleep 10
  WAITED=$(( WAITED + 10 ))
done

# --- Corrida del scraper ------------------------------------------------------
log "==================== INICIO corrida ===================="
log "repo=$REPO python=$PYTHON args='${EXTRA_ARGS}'"
cd "$REPO" || { log "ERROR: no pude cd a $REPO"; exit 1; }

# Nota: bash no puede leer archivos del repo en ~/Documents, pero SÍ puede ejecutar
# el binario del .venv, y Python sí puede leer el paquete y el .env del repo.
# shellcheck disable=SC2086
"$PYTHON" -m scraper.main $EXTRA_ARGS >> "$LOG" 2>&1
RC=$?
log "==================== FIN corrida (exit $RC) ===================="
exit "$RC"
