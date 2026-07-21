#!/bin/bash
# Autos Intel — compila el panel de control AppleScript en una .app clickeable
# y la deja en el Escritorio (y opcionalmente en Aplicaciones).
#
# Uso:
#   ./scheduler/macos/build_app.sh           # crea "Autos Intel.app" en el Escritorio
#   DEST=/Applications ./scheduler/macos/build_app.sh   # también copia a Aplicaciones
set -euo pipefail

SELF_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC="$SELF_DIR/control.applescript"
APP_NAME="Autos Intel.app"
DESKTOP="$HOME/Desktop"
APP_PATH="$DESKTOP/${APP_NAME}"

[ -f "$SRC" ] || { echo "No encuentro $SRC"; exit 1; }

echo "Compilando ${APP_NAME}…"
rm -rf "$APP_PATH"
osacompile -o "$APP_PATH" "$SRC"

# Icono personalizado opcional: si existe icon.icns junto al script, lo aplica.
if [ -f "$SELF_DIR/icon.icns" ]; then
  cp "$SELF_DIR/icon.icns" "$APP_PATH/Contents/Resources/applet.icns"
  touch "$APP_PATH"
fi

echo "✓ Icono creado: $APP_PATH"
echo "  Doble clic para abrir el panel (Pausar/Reanudar, Correr ahora, Ver log)."

if [ "${DEST:-}" = "/Applications" ]; then
  cp -R "$APP_PATH" "/Applications/${APP_NAME}"
  echo "✓ Copiado también a /Applications/${APP_NAME}"
fi
