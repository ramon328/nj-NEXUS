# Exponer el proxy SII a internet — pasos manuales (router) y DuckDNS

Objetivo: que `http://nexus:<clave>@<sub>.duckdns.org:8899` sea alcanzable desde Render,
de forma permanente y a prueba de cambios de IP / reinicios / caídas del proceso.

## Paso A — DuckDNS (IP estable) — lo haces tú, 1 minuto
1. Entra a https://www.duckdns.org y loguéate (GitHub/Google).
2. Crea un subdominio, p. ej. `ducknexusproxy` → te queda `ducknexusproxy.duckdns.org`.
3. Copia el **token** que aparece arriba en la página.
4. Agrega al final de `~/nexus/.env` (sin comillas):
   ```
   DUCKDNS_DOMAIN=ducknexusproxy
   DUCKDNS_TOKEN=<tu-token-de-duckdns>
   ```
   El servicio `com.nexus.ddns` lo detecta solo y empieza a refrescar la IP cada 5 min.

## Paso B — Port-forward en el router (TCP 8899) — lo haces tú
UPnP y NAT-PMP están apagados, así que hay que abrirlo a mano:
1. Entra al router: http://192.168.1.1
2. Busca **Port Forwarding / Redirección de puertos / NAT / Servidores virtuales**.
3. Crea una regla:
   - Protocolo: **TCP**
   - Puerto externo (WAN): **8899**
   - IP interna (LAN): **192.168.1.26**
   - Puerto interno: **8899**
4. Guarda y aplica.

## Paso C — IP LAN fija para el Mac (para que 192.168.1.26 no cambie)
En el mismo router, sección **DHCP / Reserva de direcciones / DHCP estático**:
- Reserva la IP **192.168.1.26** para la MAC del Mac mini (Wi-Fi `en1`).
(Así el port-forward siempre apunta al Mac, aunque se reinicie el router.)

## Verificación (la hace Nexus tras A+B)
- Externo: `<sub>.duckdns.org:8899` acepta TCP.
- Vía proxy: `https://zeusr.sii.cl/.../CAutInicio.cgi` → 200; un host NO-sii.cl → rechazado.
- Reinicio del Mac: proxy + DDNS vuelven solos (LaunchDaemons).

## Valor final para Render
```
SII_PROXY=http://nexus:<clave-PROXY_CL_TOKEN>@<sub>.duckdns.org:8899
```
