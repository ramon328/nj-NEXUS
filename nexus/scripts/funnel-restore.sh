#!/usr/bin/env bash
# funnel-restore.sh — Restaura el mapeo COMPLETO del Tailscale Funnel (URLs públicas
# estables que NO cambian nunca). Idempotente: re-aplicarlo no rompe nada.
# Tailscale normalmente persiste esta config solo; esto es la red de seguridad por si
# alguna vez se pierde (reset, actualización, etc.). Lo invoca scripts/arranque.sh.
set -uo pipefail
TS="/Applications/Tailscale.app/Contents/MacOS/Tailscale"

# Puerto 443 (host raíz): panel público + webhook WhatsApp + terminal de programar + widgets.
"$TS" funnel --bg --https=443 --set-path=/         http://127.0.0.1:7690
"$TS" funnel --bg --https=443 --set-path=/wa       http://127.0.0.1:3000/wa      # webhook Kapso (WhatsApp)
"$TS" funnel --bg --https=443 --set-path=/code     http://127.0.0.1:7684          # terminal Claude para el teléfono
"$TS" funnel --bg --https=443 --set-path=/autos    http://127.0.0.1:7698
"$TS" funnel --bg --https=443 --set-path=/leads    http://127.0.0.1:7697
"$TS" funnel --bg --https=443 --set-path=/widget   http://127.0.0.1:7696
"$TS" funnel --bg --https=443 --set-path=/mallorca http://127.0.0.1:7691/mallorca

# Puerto 8443: seguimiento de cobranza.
"$TS" funnel --bg --https=8443 http://127.0.0.1:3021

# Puerto 10000: proyecto estudio.
"$TS" funnel --bg --https=10000 http://127.0.0.1:3010

echo "[funnel-restore] Funnel re-aplicado."
