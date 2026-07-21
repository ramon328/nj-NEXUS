#!/bin/bash
# Túnel Cloudflare PÚBLICO (sin Tailscale) al chat/terminal de programar (7683).
# El chat ya exige PIN, así que el túnel solo lo hace accesible desde cualquier red.
# Escribe la URL vigente en terminal-url.txt para poder consultarla tras cada reinicio.
set -u
CF=/Users/AIagenteia/bin/cloudflared
TARGET="http://127.0.0.1:7683"
DIR=/Users/AIagenteia/nexus/claude-web
LOG=/tmp/cf-terminal.log
URLFILE="$DIR/terminal-url.txt"

: > "$LOG"
# Lanza cloudflared en primer plano (launchd lo mantiene vivo con KeepAlive).
"$CF" tunnel --no-autoupdate --url "$TARGET" >> "$LOG" 2>&1 &
CFPID=$!

# Espera y publica la URL en el archivo fijo.
for i in $(seq 1 30); do
  U=$(grep -oE "https://[a-z0-9-]+\.trycloudflare\.com" "$LOG" | head -1)
  if [ -n "$U" ]; then
    printf '%s\n' "$U" > "$URLFILE"
    echo "[terminal-tunnel] URL pública: $U"
    break
  fi
  sleep 1
done

# Mantiene el proceso en primer plano para launchd.
wait "$CFPID"
