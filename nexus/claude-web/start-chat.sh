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

# --- Plan B / APIs: cargar claves locales y elegir suscripcion vs API ---
if [ -f "$HOME/nexus/claude-web/.env.apis" ]; then
  set -a; . "$HOME/nexus/claude-web/.env.apis"; set +a
fi
if [ "${CLAUDE_CHAT_API_MODE:-0}" = "1" ]; then
  if [ -z "${ANTHROPIC_API_KEY:-}" ] && [ -f "$HOME/nexus/.env" ]; then
    ANTHROPIC_API_KEY=$(grep -E '^ANTHROPIC_API_KEY=' "$HOME/nexus/.env" | head -1 | cut -d= -f2-) || true
  fi
  export ANTHROPIC_API_KEY
  log "PLAN B ACTIVO: Claude Code por API (se paga por uso; tope en console.anthropic.com)"
else
  unset ANTHROPIC_API_KEY || true
  log "modo suscripcion (tu login de Claude)"
fi

log "arrancando chat (puerto ${CLAUDE_CHAT_PORT:-7683})"
exec node chat-server.mjs
