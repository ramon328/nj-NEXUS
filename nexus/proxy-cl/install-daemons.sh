#!/bin/sh
# install-daemons.sh — Promueve el proxy-cl y el updater DDNS a LaunchDaemons del sistema
# (arrancan al BOOT sin login y se reinician solos con KeepAlive). Se corre como root.
set -e
SRC=/Users/AIagenteia/nexus/proxy-cl
DST=/Library/LaunchDaemons
UIDAIA=$(id -u AIagenteia)

# 1) Instalar los plists de daemon (root:wheel 644)
install -m 644 -o root -g wheel "$SRC/com.nexus.proxy-cl.daemon.plist" "$DST/com.nexus.proxy-cl.plist"
install -m 644 -o root -g wheel "$SRC/com.nexus.ddns.plist"           "$DST/com.nexus.ddns.plist"

# 2) Detener y deshabilitar el LaunchAgent viejo del proxy (evita doble bind del 8899)
launchctl bootout gui/$UIDAIA/com.nexus.proxy-cl 2>/dev/null || true
AGENT=/Users/AIagenteia/Library/LaunchAgents/com.nexus.proxy-cl.plist
[ -f "$AGENT" ] && mv -f "$AGENT" "$AGENT.disabled" || true
# Garantizar puerto 8899 libre antes de levantar el daemon
pkill -f 'proxy-cl/proxy.mjs' 2>/dev/null || true
sleep 1

# 3) Cargar los daemons (idempotente)
launchctl bootout system/com.nexus.proxy-cl 2>/dev/null || true
launchctl bootout system/com.nexus.ddns     2>/dev/null || true
launchctl bootstrap system "$DST/com.nexus.proxy-cl.plist"
launchctl bootstrap system "$DST/com.nexus.ddns.plist"
launchctl kickstart -k system/com.nexus.proxy-cl
launchctl kickstart    system/com.nexus.ddns

echo "OK: daemons com.nexus.proxy-cl y com.nexus.ddns instalados y arrancados"
