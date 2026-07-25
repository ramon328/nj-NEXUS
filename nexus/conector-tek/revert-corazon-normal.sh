#!/bin/zsh
# Revierte el corazón a su intervalo NORMAL (180s = 3 min). Lo corre el LaunchAgent
# com.nexus.tek-corazon-normal cada día a las 06:48 (la hora configurada del refresco),
# para que tras la ventana nocturna de 1 min quede en el ritmo normal de día.
PLIST="$HOME/Library/LaunchAgents/com.nexus.tek-keepalive.plist"
/usr/libexec/PlistBuddy -c "Set :EnvironmentVariables:TEK_CORAZON_POKE_MS 180000" "$PLIST" 2>/dev/null \
  || /usr/libexec/PlistBuddy -c "Add :EnvironmentVariables:TEK_CORAZON_POKE_MS string 180000" "$PLIST"
launchctl bootout "gui/$(id -u)/com.nexus.tek-keepalive" 2>/dev/null
sleep 1
launchctl bootstrap "gui/$(id -u)" "$PLIST" 2>/dev/null
echo "$(date '+%Y-%m-%d %H:%M:%S') corazón revertido a 180s (3 min) — ritmo normal de día"
