#!/bin/bash
# Autos Intel — control del agendador en segundo plano (silencioso).
#
# Corre el scraper DOS veces al día, a un minuto ALEATORIO dentro de cada ventana:
#   • Mañana: arranque aleatorio entre 09:00 y 10:00
#   • Noche:  arranque aleatorio entre 21:00 y 22:00
# El minuto se re-sortea en cada corrida (nunca a la misma hora exacta).
#
# Detecta el SO y usa el mecanismo nativo:
#   • macOS  -> launchd (LaunchAgent, sin ventana de terminal)
#   • Linux  -> cron     (systemd timer como alternativa, ver README)
#   • Windows-> usar scheduler/windows/Install-Scheduler.ps1 (Task Scheduler oculto)
#
# Uso:
#   ./scheduler/ctl.sh install     # instala y activa el agendamiento
#   ./scheduler/ctl.sh status      # estado + últimas líneas del log
#   ./scheduler/ctl.sh disable     # pausa (sin desinstalar)
#   ./scheduler/ctl.sh enable      # reanuda
#   ./scheduler/ctl.sh run-now     # corre YA (sin espera aleatoria), para probar
#   ./scheduler/ctl.sh logs        # sigue el log en vivo
#   ./scheduler/ctl.sh uninstall   # quita el agendamiento

set -u

# ------------------------------------------------------------------ rutas base
SCHED_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$SCHED_DIR/.." && pwd)"
LABEL="com.autosintel.scraper"

OS="$(uname -s)"
case "$OS" in
  Darwin)
    STATE_DIR="$HOME/Library/Application Support/AutosIntel"
    LOG_DIR="$HOME/Library/Logs/AutosIntel"
    PYTHON="$REPO/.venv/bin/python"
    PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
    ;;
  Linux)
    STATE_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/AutosIntel"
    LOG_DIR="$STATE_DIR/logs"
    PYTHON="$REPO/.venv/bin/python"
    ;;
  *)
    echo "SO '$OS' no soportado por este script."
    echo "En Windows usá: powershell -ExecutionPolicy Bypass -File scheduler\\windows\\Install-Scheduler.ps1 -Install"
    exit 1
    ;;
esac

RUN_SH="$STATE_DIR/run.sh"
ENV_FILE="$STATE_DIR/env"
LOG="$LOG_DIR/scraper.log"
MAX_DELAY_SEC="${MAX_DELAY_SEC:-3599}"   # 0..59 min dentro de la ventana

# Python a usar: el del .venv si existe, si no el python3 del sistema.
[ -x "$PYTHON" ] || PYTHON="$(command -v python3 || command -v python)"

# ------------------------------------------------------------- helpers comunes
_write_runtime() {
  mkdir -p "$STATE_DIR" "$LOG_DIR"
  cp "$SCHED_DIR/run.sh" "$RUN_SH"
  chmod +x "$RUN_SH"
  cat > "$ENV_FILE" <<EOF
# Generado por scheduler/ctl.sh — config del runner.
REPO="$REPO"
PYTHON="$PYTHON"
LOG_DIR="$LOG_DIR"
STATE_DIR="$STATE_DIR"
MAX_DELAY_SEC="$MAX_DELAY_SEC"
# Argumentos extra para 'python -m scraper.main' (vacío = todas las fuentes).
EXTRA_ARGS=""
EOF
  rm -f "$STATE_DIR/disabled"
  echo "  • runner:  $RUN_SH"
  echo "  • config:  $ENV_FILE"
  echo "  • logs:    $LOG"
}

# ============================================================ implementación SO
_install_macos() {
  echo "Instalando agendador (macOS / launchd)…"
  _write_runtime
  cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>$LABEL</string>

    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>$RUN_SH</string>
    </array>

    <!-- Dispara al INICIO de cada ventana; el runner elige el minuto aleatorio. -->
    <key>StartCalendarInterval</key>
    <array>
        <dict><key>Hour</key><integer>9</integer><key>Minute</key><integer>0</integer></dict>
        <dict><key>Hour</key><integer>21</integer><key>Minute</key><integer>0</integer></dict>
    </array>

    <key>RunAtLoad</key>
    <false/>

    <!-- Logs de arranque del propio launchd (el log de corridas lo maneja run.sh). -->
    <key>StandardOutPath</key>
    <string>$LOG_DIR/launchd.out.log</string>
    <key>StandardErrorPath</key>
    <string>$LOG_DIR/launchd.err.log</string>
    <key>ProcessType</key>
    <string>Background</string>
</dict>
</plist>
EOF
  local uid; uid="$(id -u)"
  launchctl bootout "gui/$uid" "$PLIST" 2>/dev/null || true
  launchctl bootstrap "gui/$uid" "$PLIST"
  echo "✓ LaunchAgent instalado y activo: $PLIST"
  echo "  Ventanas: 09:00–10:00 y 21:00–22:00 (minuto aleatorio cada día)."
}

_uninstall_macos() {
  local uid; uid="$(id -u)"
  launchctl bootout "gui/$uid" "$PLIST" 2>/dev/null || true
  rm -f "$PLIST"
  echo "✓ LaunchAgent removido."
}

_status_macos() {
  local uid; uid="$(id -u)"
  if launchctl print "gui/$uid/$LABEL" >/dev/null 2>&1; then
    echo "Estado launchd: CARGADO"
    launchctl print "gui/$uid/$LABEL" 2>/dev/null | grep -E "state =|runs =|last exit code" | sed 's/^/  /'
  else
    echo "Estado launchd: NO cargado (corré: ./scheduler/ctl.sh install)"
  fi
}

_install_linux() {
  echo "Instalando agendador (Linux / cron)…"
  _write_runtime
  local tmp; tmp="$(mktemp)"
  crontab -l 2>/dev/null | grep -v "$RUN_SH" > "$tmp" || true
  {
    echo "# Autos Intel scraper — ventanas 09:00–10:00 y 21:00–22:00 (run.sh sortea el minuto)"
    echo "0 9 * * * /bin/bash \"$RUN_SH\" >/dev/null 2>&1"
    echo "0 21 * * * /bin/bash \"$RUN_SH\" >/dev/null 2>&1"
  } >> "$tmp"
  crontab "$tmp"; rm -f "$tmp"
  echo "✓ Entradas de cron instaladas (crontab -l para verlas)."
  echo "  (Alternativa systemd-timer documentada en scheduler/README.md.)"
}

_uninstall_linux() {
  local tmp; tmp="$(mktemp)"
  crontab -l 2>/dev/null | grep -v "$RUN_SH" | grep -v "Autos Intel scraper" > "$tmp" || true
  crontab "$tmp"; rm -f "$tmp"
  echo "✓ Entradas de cron removidas."
}

_status_linux() {
  if crontab -l 2>/dev/null | grep -q "$RUN_SH"; then
    echo "Estado cron: INSTALADO"
    crontab -l 2>/dev/null | grep "$RUN_SH" | sed 's/^/  /'
  else
    echo "Estado cron: NO instalado (corré: ./scheduler/ctl.sh install)"
  fi
}

# ===================================================================== comandos
cmd_install()   { case "$OS" in Darwin) _install_macos;; Linux) _install_linux;; esac; }
cmd_uninstall() { case "$OS" in Darwin) _uninstall_macos;; Linux) _uninstall_linux;; esac; }

cmd_enable() {
  rm -f "$STATE_DIR/disabled"
  echo "✓ Agendador HABILITADO."
}
cmd_disable() {
  mkdir -p "$STATE_DIR"; touch "$STATE_DIR/disabled"
  echo "✓ Agendador DESHABILITADO (las corridas se saltarán; no se desinstala)."
}

cmd_status() {
  echo "── Autos Intel — agendador ──────────────────────────────"
  echo "SO: $OS   repo: $REPO"
  if [ -f "$STATE_DIR/disabled" ]; then echo "Toggle: DESHABILITADO (existe disabled)"; else echo "Toggle: habilitado"; fi
  case "$OS" in Darwin) _status_macos;; Linux) _status_linux;; esac
  echo "Log: $LOG"
  if [ -f "$LOG" ]; then
    echo "── últimas líneas ───────────────────────────────────────"
    tail -n 12 "$LOG"
  else
    echo "(aún sin log; todavía no corrió)"
  fi
}

cmd_run_now() {
  echo "Corriendo YA (sin espera aleatoria)…"
  _write_runtime >/dev/null
  MAX_DELAY_SEC=0 /bin/bash "$RUN_SH"
  echo "✓ Listo. Ver log: $LOG"
}

cmd_logs() {
  [ -f "$LOG" ] || { echo "Aún no hay log: $LOG"; exit 0; }
  tail -n 40 -f "$LOG"
}

case "${1:-}" in
  install)   cmd_install ;;
  uninstall) cmd_uninstall ;;
  enable)    cmd_enable ;;
  disable)   cmd_disable ;;
  status)    cmd_status ;;
  run-now)   cmd_run_now ;;
  logs)      cmd_logs ;;
  *)
    echo "Uso: $0 {install|uninstall|enable|disable|status|run-now|logs}"
    exit 1
    ;;
esac
