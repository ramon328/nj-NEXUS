# Cartero — correo transaccional propio para Clivox

Un "SendGrid casero": arma, encola, reintenta, mide y da de baja los correos.
La entrega final la hace un relay serio (Workspace o SES), porque enviar SMTP
directo desde una IP residencial chilena es spam garantizado.

## Lo que hace solo

El **vigia** mira la tabla `orders` de Clivox cada minuto. Cuando un pedido
cambia de `status`, manda el correo que corresponde. La web no hace nada.

| Estado en `orders` | Correo que sale |
|---|---|
| `pendiente` | Recibimos tu pedido |
| `pagado` | Pago confirmado |
| `preparando` | Preparando tu pedido |
| `enviado` | Va en camino (+ tracking y transportista) |
| `entregado` | Pedido entregado |
| `cancelado` | Pedido cancelado |
| cualquier otro | Actualizacion generica |

Si aparece o cambia el `tracking`, tambien sale un correo nuevo.

## Puesta en marcha

```bash
node llaves.mjs crear "Web Clivox"   # llave de API para la web
node dkim.mjs                        # genera DKIM e imprime los DNS a crear
node revisar-dns.mjs                 # revisa SPF / DKIM / DMARC / MX
node vigia.mjs --sembrar             # IMPORTANTE la primera vez (ver abajo)
node servidor.mjs                    # levanta API + panel + vigia + cola
```

### El sembrado (no te saltes esto)

`node vigia.mjs --sembrar` anota el estado actual de todos los pedidos **sin
mandar correos**. Si arrancas sin sembrar, el vigia ve todos los pedidos
historicos como "nuevos" y les manda correo a clientes de hace meses.

## Conectar el correo desde el celular

```bash
node invitar.mjs "para Ramon"
```

Imprime un enlace publico y un PIN de 6 digitos. Quien lo abra elige el
proveedor, pone el correo y la clave de aplicacion, y el Cartero **prueba las
credenciales de verdad**: conecta y manda un correo real. Solo si ese correo
sale, guarda la configuracion y se recarga solo (sin reiniciar el servicio).

El enlace caduca en 1 hora, sirve UNA vez y aguanta 5 intentos de PIN.
Manda el enlace y el PIN por vias distintas.

## Comandos

| Que | Comando |
|---|---|
| Ver que enviaria, sin enviar | `node vigia.mjs --simular` |
| Revisar cambios ahora | `node vigia.mjs` |
| Vista previa de una plantilla | `http://127.0.0.1:7700/vista?plantilla=pedido-enviado` |
| Vista previa con un pedido real | `...&pedido=<uuid>` |
| Panel | `http://127.0.0.1:7700/panel` |
| Llaves | `node llaves.mjs listar` / `revocar <id>` |

## Modos de envio (`CARTERO_TRANSPORTE` en .env)

- `log` — no envia nada, escribe el correo en `datos/salida/`. Para probar.
- `gmail` — Google Workspace. Clivox ya lo usa. Limite ~2.000 al dia.
- `ses` — Amazon SES. ~US$0,10 por cada 1.000 correos. Para crecer.
- `smtp` — cualquier otro SMTP.

## Arranque automatico

```bash
cp com.nexus.cartero.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.nexus.cartero.plist
```

## Cosas que ya estan resueltas

- **Nunca manda el mismo correo dos veces**: cada envio lleva clave de
  idempotencia (`pedido:<id>:<estado>:<tracking>`).
- **Reintentos**: 1min, 5min, 15min, 1h, 6h. Despues se rinde.
- **Rebote duro** (casilla que no existe): no reintenta y suprime la direccion.
  Insistirle a direcciones muertas es lo que arruina la reputacion.
- **Bajas**: enlace propio + cabecera `List-Unsubscribe` one-click de Gmail.
  Quien se da de baja deja de recibir promociones, pero **sigue recibiendo los
  avisos de sus pedidos**, que son parte de la compra.
- **Tracking**: pixel de apertura y clics, con enlaces firmados (HMAC).
- **Sobrevive reinicios**: el ultimo estado visto de cada pedido esta en disco.

## Lo que queda expuesto en internet

El Funnel publica el puerto 7700 en `https://mac-mini-de-nicolas.tailee0068.ts.net/cartero`.
De ahi, solo son publicos a proposito:

- `/t/...` — pixel y clics (tienen que serlo: los abre el cliente desde su correo)
- `/baja/...` — bajas, con token firmado
- `/conectar/...` — con PIN de un solo uso
- `/salud` — solo dice si esta vivo

El panel, la API y la vista previa piden llave.

## Seguridad

- La `service_role` de Supabase vive solo en `.env` (permisos 600) y nunca sale
  al navegador.
- El servidor escucha solo en `127.0.0.1`. Para que el tracking funcione desde
  afuera hay que exponerlo por un tunel y poner esa URL en `CARTERO_URL_PUBLICA`.
- Las llaves de API se guardan hasheadas (SHA-256), no en claro.
