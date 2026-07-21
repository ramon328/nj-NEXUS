#!/bin/bash
# start-chat.sh — Arranca el CHAT web de Claude Code (front bonito para el teléfono).
# Convive con start.sh (terminal viejo). Idempotente.
set -e
cd "$(dirname "$0")"
export PATH="/usr/local/bin:/usr/bin:/bin:$HOME/.local/bin:$PATH"
log(){ echo "[claude-chat/start] $*"; }

command -v node >/dev/null || { log "ERROR: falta node"; exit 1; }
if [ ! -d node_modules/ws ]; then
  log "instalando dependencias (ws)…"
  npm install --silent --no-audit --no-fund || { log "ERROR: npm install falló"; exit 1; }
fi
[ -x "$HOME/.local/bin/claude" ] || log "AVISO: no veo claude en ~/.local/bin"

log "arrancando chat (puerto ${CLAUDE_CHAT_PORT:-7683})"
exec node chat-server.mjs
