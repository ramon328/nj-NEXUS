#!/bin/bash
# claude-web.sh — Terminal web con Claude Code (acceso COMPLETO al Mac), con PIN.
#
# - Corre `claude` partiendo en tu carpeta home (~) → acceso a todo el Mac, no solo nexus.
# - Pide PIN (usuario: nexus · PIN: 2005) por HTTP basic-auth de ttyd.
# - Escucha SOLO en 127.0.0.1; `tailscale serve` lo publica en tu tailnet (privado, HTTPS).
# - Si cierras Claude Code, caes a una shell normal (sigues con acceso total).
#
# Requiere ttyd:  sudo chown -R "$(whoami)" /usr/local/share/man/man8 && brew install ttyd

PORT="${CLAUDE_WEB_PORT:-7682}"
PIN_USER="${CLAUDE_WEB_USER:-nexus}"
PIN="${CLAUDE_WEB_PIN:-2005}"
CLAUDE_BIN="$HOME/.local/bin/claude"

exec /usr/local/bin/ttyd \
  -p "$PORT" \
  -i 127.0.0.1 \
  -c "${PIN_USER}:${PIN}" \
  -W \
  -t fontSize=15 \
  -t 'theme={"background":"#0b0b0b","foreground":"#e6e6e6"}' \
  -t titleFixed="Claude Code · Mac mini Nexus" \
  bash -lc "cd \"\$HOME\" && \"$CLAUDE_BIN\"; exec bash -l"
