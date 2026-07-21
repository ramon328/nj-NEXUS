#!/usr/bin/env bash
# actualizar.sh — Actualiza dependencias y recarga los daemons.
# Uso: ~/nexus/scripts/actualizar.sh
set -euo pipefail
NEXUS="$HOME/nexus"
LA="$HOME/Library/LaunchAgents"

echo "==> Actualizando dependencias de servicios Node…"
for d in hub comisiones conector-sii; do
  if [ -f "$NEXUS/$d/package.json" ]; then
    echo "  - $d"; (cd "$NEXUS/$d" && npm install --no-audit --no-fund)
  fi
done

if [ -f "$NEXUS/menubar/requirements.txt" ] && [ -d "$NEXUS/menubar/.venv" ]; then
  echo "==> Actualizando menubar (Python)…"
  "$NEXUS/menubar/.venv/bin/pip" install -q -r "$NEXUS/menubar/requirements.txt"
fi

echo "==> Recargando daemons…"
for p in "$LA"/com.nexus.*.plist; do
  [ -e "$p" ] || continue
  label="$(basename "$p" .plist)"
  launchctl unload "$p" 2>/dev/null || true
  launchctl load "$p"
  echo "  - recargado $label"
done
echo "==> Listo. Verifica con: ~/nexus/scripts/estado.sh"
