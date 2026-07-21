#!/bin/zsh
# renueva el cert de Tailscale del noVNC y reinicia el servicio
cd ~/nexus/novnc-web/certs || exit 1
/usr/local/bin/tailscale cert --cert-file novnc.crt --key-file novnc.key mac-mini-de-nicolas.tailee0068.ts.net >> /tmp/nexus-novnc-cert.log 2>&1
launchctl kickstart -k gui/$(id -u)/com.nexus.novnc >> /tmp/nexus-novnc-cert.log 2>&1
echo "[$(date)] cert renovado y servicio reiniciado" >> /tmp/nexus-novnc-cert.log
