#!/usr/bin/env bash
# estado.sh — Muestra el estado de todos los servicios Nexus.
# Uso: ~/nexus/scripts/estado.sh
set -euo pipefail
NEXUS="$HOME/nexus"
# shellcheck disable=SC1090
set -a; [ -f "$NEXUS/.env" ] && . "$NEXUS/.env"; set +a

PUERTO_HUB="${PUERTO_HUB:-3000}"
PUERTO_COMISIONES="${PUERTO_COMISIONES:-3001}"
PUERTO_SII="${PUERTO_SII:-8080}"
PUERTO_CEREBRO="${PUERTO_CEREBRO:-8081}"
PUERTO_OPENCLAW="${PUERTO_OPENCLAW:-18789}"
PUERTO_NAVEGADOR="${PUERTO_NAVEGADOR:-8082}"

verde()  { printf "\033[32m%s\033[0m" "$1"; }
rojo()   { printf "\033[31m%s\033[0m" "$1"; }
gris()   { printf "\033[90m%s\033[0m" "$1"; }

check_http() { # $1=nombre $2=puerto $3=ruta
  local url="http://127.0.0.1:$2$3"
  if curl -sf -m 2 -o /dev/null "$url" 2>/dev/null; then
    printf "  %-14s %s  (:%s)\n" "$1" "$(verde '● activo')" "$2"
  else
    printf "  %-14s %s  (:%s)\n" "$1" "$(rojo '● caído')" "$2"
  fi
}

check_daemon() { # $1=label launchd
  if launchctl list 2>/dev/null | grep -q "$1"; then
    local pid; pid=$(launchctl list 2>/dev/null | grep "$1" | awk '{print $1}')
    if [ "$pid" != "-" ]; then printf "  %-26s %s (pid %s)\n" "$1" "$(verde 'cargado')" "$pid"
    else printf "  %-26s %s\n" "$1" "$(rojo 'cargado pero sin pid')"; fi
  else
    printf "  %-26s %s\n" "$1" "$(gris 'no cargado')"
  fi
}

echo "════════════════════════════════════════════"
echo "  NEXUS — Estado de servicios"
echo "════════════════════════════════════════════"
echo "Daemons (launchd):"
for l in com.nexus.hub com.nexus.openclaw com.nexus.comisiones com.nexus.sii com.nexus.cerebro com.nexus.navegador com.nexus.despierto com.nexus.menubar; do
  check_daemon "$l"
done
echo
echo "Health-checks HTTP:"
check_http "Hub"        "$PUERTO_HUB"        "/"
check_http "Comisiones" "$PUERTO_COMISIONES" "/"
check_http "Conector-SII" "$PUERTO_SII"      "/health"
check_http "Cerebro"    "$PUERTO_CEREBRO"    "/health"
check_http "OpenClaw"   "$PUERTO_OPENCLAW"   "/health"
check_http "Navegador"  "$PUERTO_NAVEGADOR"  "/health"
echo
echo "Logs en: $NEXUS/logs/  y  /tmp/nexus-*.log"
echo "════════════════════════════════════════════"
