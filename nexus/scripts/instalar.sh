#!/usr/bin/env bash
# instalar.sh — Instala dependencias y carga todos los LaunchAgents de Nexus.
# Idempotente: se puede correr varias veces.
# Uso: ~/nexus/scripts/instalar.sh
set -euo pipefail
NEXUS="$HOME/nexus"
LA="$HOME/Library/LaunchAgents"
mkdir -p "$LA" "$NEXUS/logs"

echo "==> Instalando dependencias Node…"
for d in hub comisiones conector-sii conector-obsidian conector-transcribe shared; do
  if [ -f "$NEXUS/$d/package.json" ]; then
    echo "  - $d"; (cd "$NEXUS/$d" && npm install --no-audit --no-fund)
  fi
done

if [ -f "$NEXUS/menubar/requirements.txt" ]; then
  echo "==> Preparando entorno Python de la menu bar…"
  [ -d "$NEXUS/menubar/.venv" ] || python3 -m venv "$NEXUS/menubar/.venv"
  "$NEXUS/menubar/.venv/bin/pip" install -q --upgrade pip
  "$NEXUS/menubar/.venv/bin/pip" install -q -r "$NEXUS/menubar/requirements.txt"
fi

echo "==> Cargando LaunchAgents…"
for p in "$LA"/com.nexus.*.plist; do
  [ -e "$p" ] || { echo "  (aún no hay plists com.nexus.*)"; break; }
  label="$(basename "$p" .plist)"
  launchctl unload "$p" 2>/dev/null || true
  launchctl load "$p"
  echo "  - cargado $label"
done
echo "==> Listo. Verifica con: ~/nexus/scripts/estado.sh"
