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

### Y al dueño le avisa de las ventas

Aparte del correo al cliente, manda un aviso interno a `CARTERO_AVISO_INTERNO`
(por defecto `info@clivox.cl`, admite varios separados por coma):

| Cuando | Aviso |
|---|---|
| entra un pedido sin pagar | **Pedido nuevo** (barra negra) |
| se confirma el pago | **Venta confirmada** (barra verde) |

Si un pedido nace ya pagado sale UN solo aviso, no dos. Trae monto, productos,
datos de contacto del cliente y direccion de despacho.

El pago se detecta por tres señales, porque ninguna es confiable sola:
`paid_at`, `mp_payment_id`, o que el estado sea uno que implique pago
(pagado / preparando / enviado / entregado).

Estos avisos **no llevan enlace de baja** a proposito: si el dueño le da sin
querer, se suprimiria su propia casilla y dejaria de enterarse de las ventas.

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

## Dos tiendas, dos casillas

El Cartero atiende **Clivox** (es-CL, pesos) y **TheArsenale** (en, USD). Cada
una manda desde SU correo: las credenciales viven en `.env` con un prefijo por
marca (`marcas.mjs` manda). Clivox no lleva prefijo porque llego primero:

| Marca | Transporte | Usuario | Plantillas |
|---|---|---|---|
| `clivox` | `CARTERO_TRANSPORTE` | `GMAIL_USUARIO` | `plantillas/` |
| `arsenale` | `ARSENALE_CARTERO_TRANSPORTE` | `ARSENALE_GMAIL_USUARIO` | `plantillas/arsenale/` |

Una marca sin casilla conectada queda en modo `log`: escribe el correo en
`datos/salida/` y **no manda nada a internet**. Nunca sale con la casilla de
otra tienda. Ver el estado de las dos: `GET /api/transporte`.

Al encolar se elige la tienda con `marca`, y la plantilla se busca primero en
la carpeta de esa marca:

```js
encolar({ para, marca: 'arsenale', plantilla: 'order-shipped' })
// -> plantillas/arsenale/order-shipped.html, desde el correo de TheArsenale
```

## Conectar el correo desde el celular

```bash
node invitar.mjs "para Ramon"              # Clivox
node invitar.mjs arsenale "para Ramon"     # TheArsenale
```

La pagina ofrece **Continuar con Google** (OAuth, se elige la casilla en la
pantalla de Google y no se guarda ninguna contrasena; el correo sale por la API
de Gmail con scope `gmail.send`) y, plegado abajo, el camino a mano con clave de
aplicacion / SMTP.

> El redirect que Google tiene autorizado es el del vinculador de TAG. Por eso
> la vuelta entra a `/tag/oauth/callback`, que reenvia al Cartero cuando el
> `state` empieza con `cartero.` (ver `vincular.mjs` en `tag-web`). Si algun dia
> hay acceso a la consola de Google, se registra
> `https://…/cartero/oauth/callback` y se borra el puente.
> El vinculo de cada tienda queda en `datos/google-<marca>.json` (600).

Imprime un enlace publico y un PIN de 6 digitos. El enlace queda amarrado a la
tienda con que se creo: la pagina dice de que marca es y las claves se guardan
bajo el prefijo de esa marca, sin pisar las de la otra. Quien lo abra elige el
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

## Botones de los correos

Apuntan a las rutas reales de la web (repo `DropoutCapital/nj-ligth-juri`):

| Correo | Boton | Va a |
|---|---|---|
| al cliente | Ver mi pedido / Seguir mi envio | `https://www.clivox.cl/cuenta/pedidos/<id>` |
| al dueño | Ver en el panel | `https://www.clivox.cl/admin/pedidos/<id>` |

Las dos rutas piden login y redirigen con `?next=`, asi que despues de entrar
el usuario cae justo en el pedido. El dominio va **con www**: `clivox.cl` hace
un 308 a `www.clivox.cl`.

## OJO: correo duplicado con Resend

La web ya manda su propio correo de pago confirmado con Resend, en
`src/lib/email.ts` (`sendOrderPaidEmail`, llamado desde `src/lib/payments.ts`).
Si `RESEND_API_KEY` esta puesta en produccion, el cliente recibe DOS correos al
pagar: el de Resend y el del Cartero.

Hay que quedarse con uno. Lo razonable es dejar el Cartero (cubre todos los
estados, reintenta, mide y avisa al dueño) y sacar la llamada a
`sendOrderPaidEmail`, o simplemente quitar `RESEND_API_KEY` del entorno.

## Modos de envio (`CARTERO_TRANSPORTE` en .env)

- `log` — no envia nada, escribe el correo en `datos/salida/`. Para probar.
- `gmail` — Google Workspace. Clivox ya lo usa. Limite ~2.000 al dia.
- `ses` — Amazon SES. ~US$0,10 por cada 1.000 correos. Para crecer.
- `smtp` — cualquier otro SMTP.
- `google` — cuenta conectada con "Continuar con Google": envia por la API de
  Gmail con el refresh_token de `datos/google-<marca>.json`, sin clave de
  aplicacion ni SMTP.

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
