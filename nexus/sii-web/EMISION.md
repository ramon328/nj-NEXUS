# Emisión de facturas (Martes) — estado

Nexus/Martes ya puede **armar y validar** una factura/boleta electrónica de
ANA CLARA SPA por WhatsApp, con flujo **simular → confirmar**. La emisión REAL
está **blindada** (apagada) hasta cerrar la 1ª emisión supervisada.

## Cómo se usa (por WhatsApp)
"Emite una factura a <cliente>, RUT …, giro …, dirección …, comuna …, por
<detalle> a <monto> neto" → Martes muestra el BORRADOR (neto/IVA/total) y pide
OK. Solo con OK explícito reintenta con `confirmado=true`. Tipos: 33 factura
afecta (default), 34 factura exenta, 39 boleta. Precios de ítems = **netos**.

## Qué se construyó
- `sii-web/sii/emitir.py` — validación + cálculo del borrador (neto, IVA 19%,
  total) y `emitir()` **blindada** (`_pendientes_para_emitir`).
- `sii-web/api.py` — `POST /api/empresas/{id}/emitir` (`confirmar` false=borrador,
  true=intenta emitir; siempre devuelve el borrador).
- `hub/asistente.mjs` — acción `emitir` del tool `sii` (simular→confirmar,
  arma `borrador_texto`) + instrucciones de Martes en el prompt.
- Certificado de ANA CLARA guardado en `secretos-facturacion/anaclara.pfx`
  (600, gitignored). Config en `sii-web/.env` (`SII_EMISION_*`).

## Blindaje
La emisión real NO ocurre mientras falte cualquier pieza; el backend devuelve
`modo:'bloqueado'` con la lista `faltan`. No re-loguea al SII (reutiliza la
cookie persistida, como el resto del sistema).

## Go-live (3 pendientes)
1. **Contraseña del .pfx** → `SII_CERT_PASS` en `sii-web/.env`.
2. **Canal de emisión** → `SII_EMISION_CANAL`:
   - `bsale` → además `BSALE_TOKEN` (BSale gestiona cert+folios; es lo que usa
     Aliace del grupo — camino más probable y con modo de prueba).
   - `sii_gratuito` → además `SII_CAF_DIR` (folios CAF) + implementar el armado
     y firma del DTE con el certificado, y pasar la certificación del SII.
   - `proveedor` → API del proveedor que corresponda.
3. **Habilitar** → `SII_EMISION_HABILITADA=1` y conectar el envío del canal en
   `emitir.emitir()`, en una **1ª emisión supervisada** con Ramón.

Tras editar `sii-web/.env`: reiniciar `com.nexus.sii-web`.
