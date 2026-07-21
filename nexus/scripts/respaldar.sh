#!/usr/bin/env bash
# respaldar.sh — Respaldo local de configuración (NO incluye node_modules ni secretos en claro
# se respaldan, pero el tar resultante queda con chmod 600). Supabase es la fuente de verdad de los datos.
# Uso: ~/nexus/scripts/respaldar.sh [destino]
set -euo pipefail
NEXUS="$HOME/nexus"
DEST="${1:-$HOME/nexus-backups}"
mkdir -p "$DEST"
STAMP=$(date +%Y%m%d-%H%M%S)
OUT="$DEST/nexus-config-$STAMP.tar.gz"

tar --exclude='node_modules' --exclude='.venv' --exclude='dist' --exclude='logs/*.log' \
    --exclude='__pycache__' --exclude='.cache' \
    -czf "$OUT" -C "$HOME" nexus
chmod 600 "$OUT"
echo "Respaldo creado: $OUT"
echo "Incluye .env (secretos) — guárdalo en lugar seguro."
echo "Nota: los DATOS de negocio viven en Supabase; esto respalda solo configuración y código."
ls -lh "$OUT"
