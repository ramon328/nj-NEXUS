#!/usr/bin/env bash
# arranque.sh — Orquestador de encendido de Nexus.
# Se ejecuta AL INICIAR SESIÓN (LaunchAgent com.nexus.arranque, RunAtLoad). Deja todo
# 100% operativo tras un apagón/reinicio SIN intervención manual:
#   1) Espera a que Tailscale conecte y tenga su IP (de eso dependen el webhook y /code).
#   2) Restaura el Funnel si le faltan rutas críticas (normalmente persiste solo).
#   3) Asegura que TODOS los daemons com.nexus.* estén cargados.
#   4) Reinicia los servicios que hacen bind a la IP de Tailscale (arregla el race del arranque).
#   5) Re-asegura el webhook de WhatsApp (Kapso) apuntando a la URL estable.
#   6) Deja un resumen de salud en el log.
# NOTA: sin pipefail a propósito — `cmd | grep -q` con pipefail da falsos negativos
# (grep cierra el pipe → SIGPIPE al productor). Aquí capturamos a variable y comparamos.
set -u
NEXUS="$HOME/nexus"
TS="/Applications/Tailscale.app/Contents/MacOS/Tailscale"
TSIP="100.91.97.70"
UID_N="$(id -u)"
LOG="/tmp/nexus-arranque.log"
log() { printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >> "$LOG"; }

: > "$LOG"
log "════ Arranque Nexus ════"

# 1) Esperar a Tailscale (hasta ~120s). El webhook de WhatsApp y la terminal /code
#    viven detrás del Funnel; sin Tailscale, Nexus no recibe mensajes.
log "Esperando a Tailscale…"
ok_ts=0
for i in $(seq 1 60); do
  st="$("$TS" status 2>/dev/null || true)"
  if [[ "$st" == *"$TSIP"* ]]; then ok_ts=1; log "Tailscale conectado ($TSIP) en la iteración $i"; break; fi
  sleep 2
done
[ "$ok_ts" = 1 ] || log "AVISO: Tailscale no apareció en 120s; sigo igual (KeepAlive reintentará)."

# 2) Restaurar el Funnel solo si faltan las rutas críticas (/wa webhook, /code terminal).
fst="$("$TS" funnel status 2>/dev/null || true)"
if [[ "$fst" == *"/code"* && "$fst" == *"/wa"* ]]; then
  log "Funnel OK (persistió)."
else
  log "Funnel incompleto → restaurando mapeo estable…"
  bash "$NEXUS/scripts/funnel-restore.sh" >>"$LOG" 2>&1 && log "Funnel restaurado." || log "AVISO: fallo restaurando Funnel."
fi

# 3) Asegurar que todos los LaunchAgents com.nexus.* estén cargados (idempotente).
for p in "$HOME/Library/LaunchAgents"/com.nexus.*.plist; do
  [ -e "$p" ] || break
  [ "$(basename "$p")" = "com.nexus.arranque.plist" ] && continue
  launchctl bootstrap "gui/$UID_N" "$p" 2>/dev/null || true
done
log "LaunchAgents asegurados."

# 4) Reiniciar AHORA (con Tailscale ya arriba) los servicios que hacen bind a la IP de
#    Tailscale: el chat/terminal (7683) y su proxy /code (7684). Esto arregla el race
#    en que arrancan antes que la IP TS exista y el bind falla.
for s in claude-chat code-proxy; do
  launchctl kickstart -k "gui/$UID_N/com.nexus.$s" 2>/dev/null && log "reiniciado com.nexus.$s" || true
done

# 5) Re-asegurar el webhook de WhatsApp (Kapso) → URL estable del Funnel (idempotente).
/usr/local/bin/node "$NEXUS/scripts/asegurar-webhook.mjs" >>"$LOG" 2>&1 || log "AVISO: no pude re-asegurar el webhook."

# 6) Resumen de salud.
sleep 6
log "──── Salud ────"
for pp in "hub:3000:/api/ping" "chat:7683:/" "code-proxy:7684:/code" "cerebro:8081:/health" "sii:8000:/" "navegador:8082:/health"; do
  name="${pp%%:*}"; rest="${pp#*:}"; port="${rest%%:*}"; ruta="${rest#*:}"
  code="$(curl -s -m 5 -o /dev/null -w '%{http_code}' "http://127.0.0.1:${port}${ruta}" 2>/dev/null)"
  log "  $name (:$port) → HTTP ${code:-sin-respuesta}"
done
# Webhook público (401 = sano; llega a Kapso).
wcode="$(curl -s -m 12 --resolve mac-mini-de-nicolas.tailee0068.ts.net:443:209.177.145.97 -X POST -d '{}' -o /dev/null -w '%{http_code}' https://mac-mini-de-nicolas.tailee0068.ts.net/wa/kapso 2>/dev/null)"
log "  webhook público /wa/kapso → HTTP ${wcode:-sin-respuesta}  (401 = OK)"
log "════ Arranque completo. Terminal teléfono: https://mac-mini-de-nicolas.tailee0068.ts.net/code (PIN 2005) ════"
