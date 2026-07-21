#!/bin/sh
# ddns-update.sh — Mantiene un hostname DuckDNS apuntando a la IP pública ACTUAL de la casa.
# Lee de ~/nexus/.env:
#   DUCKDNS_DOMAIN=tusubdominio   (sin ".duckdns.org")
#   DUCKDNS_TOKEN=xxxxxxxx-....   (token de tu cuenta DuckDNS)
# Con ip= vacío, DuckDNS toma la IP de origen del request = la IP pública del hogar.
# Lo ejecuta el LaunchDaemon com.nexus.ddns cada 5 min (y al boot). Idempotente.
ENVF="/Users/AIagenteia/nexus/.env"
LOG="/tmp/nexus-ddns.log"
TS=$(date -u +%FT%TZ)

get() { grep -E "^$1=" "$ENVF" 2>/dev/null | tail -1 | sed -E "s/^$1=//; s/^[\"']//; s/[\"']\$//; s/[[:space:]]*\$//"; }
DOMAIN=$(get DUCKDNS_DOMAIN)
TOKEN=$(get DUCKDNS_TOKEN)

if [ -z "$DOMAIN" ] || [ -z "$TOKEN" ]; then
  echo "$TS  faltan DUCKDNS_DOMAIN/DUCKDNS_TOKEN en .env (aun sin configurar)" >> "$LOG"
  exit 0
fi

RESP=$(curl -s --max-time 20 "https://www.duckdns.org/update?domains=${DOMAIN}&token=${TOKEN}&ip=")
echo "$TS  duckdns[$DOMAIN] -> ${RESP:-sin-respuesta}" >> "$LOG"
[ "$RESP" = "OK" ]
