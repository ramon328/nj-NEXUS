#!/bin/bash
# start.sh — Arranca el terminal web de Claude Code AUTO-INSTALANDO lo que falte.
# Idempotente: si ya está todo, no reinstala nada (arranca al toque).
set -e
cd "$(dirname "$0")"
export PATH="/usr/local/bin:/usr/bin:/bin:$HOME/.local/bin:$PATH"

log(){ echo "[claude-web/start] $*"; }

# 1) Node (necesario). Si no está, no podemos seguir.
command -v node >/dev/null || { log "ERROR: falta node (/usr/local/bin/node)"; exit 1; }

# 2) Dependencias npm (ws). Se instalan SOLAS la primera vez.
if [ ! -d node_modules/ws ]; then
  log "instalando dependencias (ws)…"
  npm install --silent --no-audit --no-fund || { log "ERROR: npm install falló"; exit 1; }
fi

# 3) Avisos suaves (no bloquean): claude y python3 para el terminal.
command -v python3 >/dev/null || log "AVISO: falta python3 (lo trae macOS; el PTY lo necesita)"
[ -x "$HOME/.local/bin/claude" ] || log "AVISO: no veo claude en ~/.local/bin (revisa la instalación de Claude Code)"

log "todo listo → arrancando servidor"
exec node server.mjs
