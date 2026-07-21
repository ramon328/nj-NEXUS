# Formulario de emisión — Factura Electrónica (SII gratuito / MiPyme)

Mapa de campos del portal del SII para ANA CLARA SPA (77.271.121-2), sacado del
formulario real (usuario autorizado: NICOLAS JURI 16.142.580-K). Sirve para el
driver de navegador que llena y emite. Es el sistema GRATUITO, así que el SII
asigna el folio ("N° folio no asignado" hasta emitir) y firma con el certificado
CENTRALIZADO de Nico.

Ruta: Servicios online → Factura electrónica → Sistema de facturación gratuito
→ Emisión DTE → **Factura electrónica** (afecta / DTE 33) o **Factura No afecta o
exenta** (DTE 34). Antes pide seleccionar empresa (mipeSelEmpresa, RUT_EMP=77271121-2).

## Encabezado
- Tipo: FACTURA ELECTRÓNICA · "N° folio no asignado" (lo pone el SII al emitir)
- Empresa Menor Tamaño: checkbox (dejar según corresponda; normalmente NO)
- Fecha Emisión: fecha (default hoy)

## DATOS EMISOR — PRE-LLENADO por el SII (no tocar)
Razón Social ANA CLARA SPA · Dirección CAUPOLICAN 9291 LTA 4 · Comuna QUILICURA ·
Tipo de Venta "Del Giro" · Email nicojuri@gmail.com · Tel 968476979 ·
Giro COMPRAVENTA DE VEHICULOS, SOCIEDAD DE INVERSION ·
Act. Econo. VENTA AL POR MENOR DE VEHICULOS AUTOMOTORES.

## DATOS RECEPTOR — a llenar (lo que pide Nexus)
- Rut + DV (dos campos)
- Razón Social
- Tipo de Compra (select, default "Del Giro")
- Direccion · Comuna · Ciudad
- Giro
- Contacto (opcional) · Rut solicita + DV (opcional)

## TRANSPORTE — opcional (autos: normalmente vacío)
Rut transporte, Patente, Rut chofer, Nombre chofer.

## DETALLE (tabla) — botón "Agrega linea de Detalle"
Columnas: **Nombre Producto** · **Descrip.** (checkbox por línea) · Cantidad ·
Unidad · Precio · % Desc. · SubTotal.
- Checkbox superior "Cod Producto" (opcional) e "Impuestos Adic." (opcional).
- 🚗 AUTOS: en la línea, marcar el checkbox **"Descrip."** abre un campo de texto
  donde va el detalle del vehículo (del CAV): Tipo Vehículo, Marca, Modelo,
  Nro. Motor, Nro. Chasis, Color, Combustible, PBV, Patente, Año. Ese texto = el
  campo `detalle` que arma `emitir.py` desde `item.vehiculo`.
- Precio = NETO (sin IVA). El SII calcula el IVA.

## Pago y totales (auto)
Forma de Pago: select (Crédito / Contado). Referencias / Info. Pago: checkboxes.
Totales calculados solos: Sub Total, Descuento Global %, Monto Neto, IVA 19%,
Total IVA, Total.

## Atajos útiles del portal
"Hacer documento similar al último emitido" / "…basado en uno emitido previamente"
— sirven para repetir formato.

## SELECTORES REALES (mapeados en vivo 2026-07-15 con la sesión de Nico)

Flujo de navegación (todo con cookies de Nico inyectadas, sin login):
1. `GET https://www1.sii.cl/cgi-bin/Portal001/mipeSelEmpresa.cgi` → `select[name=RUT_EMP]` = "77271121-2" → submit `button[type=submit]`.
2. Menú → link factura afecta = `/cgi-bin/Portal001/mipeLaunchPage.cgi?OPCION=33&TIPO=4` (exenta = OPCION=34). Redirige al form real:
   **`https://www1.sii.cl/cgi-bin/Portal001/mipeGenFacEx.cgi?PTDC_CODIGO=33`** (34 = exenta).

Campos del form (name=):
- Encabezado: `EFXP_FCH_EMIS` (fecha, AAAA-MM-DD), `EMP_MENOR_TAMANO` (checkbox). Hidden: `PTDC_CODIGO`, `CANT_DET`, `ES_BORR` (controla borrador), `EHDR_CODIGO`.
- Emisor (PRE-LLENADO, no tocar): `EFXP_RZN_SOC`, `EFXP_CMNA_ORIGEN`, `EFXP_EMAIL_EMISOR`, `EFXP_FONO_EMISOR`, `EFXP_GIRO_EMIS`.
- **RECEPTOR (a llenar):** `EFXP_RUT_RECEP` + `EFXP_DV_RECEP` · `EFXP_RZN_SOC_RECEP` · `EFXP_DIR_RECEP` · `EFXP_CMNA_RECEP` · `EFXP_CIUDAD_RECEP` · `EFXP_GIRO_RECEP` · `EFXP_CONTACTO` · `EFXP_RUT_SOLICITA`+`EFXP_DV_SOLICITA`.
- Transporte (opcional): `EFXP_RUT_TRANSPORTE`/`EFXP_DV_TRANSPORTE`, `EFXP_PATENTE`, `EFXP_RUT_CHOFER`/`EFXP_DV_CHOFER`, `EFXP_NOMBRE_CHOFER`.
- **DETALLE línea N (01,02,…):** `EFXP_NMB_0N` (nombre) · `DESCRIP_0N` (checkbox → abre campo descripción para el auto/CAV) · `EFXP_QTY_0N` (cantidad) · `EFXP_UNMD_0N` (unidad) · `EFXP_PRC_0N` (precio NETO) · `EFXP_PCTD_0N` (% desc) · `EFXP_SUBT_0N` (subtotal). Botón `AGREGA_DETALLE` para más líneas. Checkboxes `COD_SI_NO`, `OTRO_IMP_SI_NO`.
- Pago/totales: `REF_SI_NO`, `PAGO_SI_NO` (checkboxes), `EFXP_SUBTOTAL`. (Forma de pago = select.)

Pendiente confirmar: el botón/acción de "Vista Previa / Borrador" (donde para el robot) y el de "Emitir/Firmar" (que NO se aprieta solo). El hidden `ES_BORR` y la opción de menú "Emitir DTE a partir de borradores" indican que el SII tiene borrador nativo.

## CADENA DE EMISIÓN REAL (validada en vivo 2026-07-15 — factura exenta N° 243)
1. `mipeGenFacEx.cgi?PTDC_CODIGO=33|34` → llenar → **`Button_Update`** ("Validar y visualizar")
2. → **`mipeDisplayPreView.cgi`** = VISTA PREVIA. El PDF real va en un iframe
   (`/Portal001/PreViewFrame.html` → POST a **`mipePreView.cgi`**). Botones: `btnSign` (Firmar) / `btnCorregir`.
3. **`btnSign`** → **`mipeGenXMLFirma.cgi`**: pide la **clave del CERTIFICADO CENTRALIZADO**
   en `#myPass`; el botón es **`#btnFirma`** (⚠️ SIN atributo name; `onclick="llamaFirma()"`).
4. → **`mipeSendXML.cgi`** = "DOCUMENTO TRIBUTARIO ELECTRÓNICO ENVIADO EXITOSAMENTE" + N° folio.
5. PDF OFICIAL: link "Ver Documento" → **`mipeDisplayPDF.cgi?DHDR_CODIGO=<id>`** (timbre + CEDIBLE).

## GOTCHAS que costaron sangre (no repetir)
- **CIUDAD (emisor `EFXP_CIUDAD_ORIGEN` y receptor `EFXP_CIUDAD_RECEP`) es OBLIGATORIA**; el SII
  no la autocompleta y sin ella `validaFacEx()` NO deja pasar a la vista previa.
- **DIRECCIÓN del receptor**: si el SII conoce direcciones previas, `printRecptorDir()` (en
  `validaFacEx.js`) convierte `EFXP_DIR_RECEP` en un `<select>` con SOLO esas → escribirle con
  fill NO hace nada y queda la vieja pegada. Hay que **inyectar la opción y seleccionarla**
  (`/forzar-valor`), **al final** (el autocomplete del RUT reconstruye el campo) y **se pierde
  en cada recarga del form** → rellenar → forzar → validar → firmar, seguido.
- `btnCorregir` (volver a editar) **vacía** el Giro del receptor y la Ciudad del emisor.
- **Nombre del producto = "Venta"** siempre (regla de Ramón) y además el campo **corta** los
  nombres largos. El detalle del auto va en la descripción (`EFXP_DSC_ITEM_0N`, textarea que
  aparece al marcar `DESCRIP_0N`).
- El SII **sí acepta ñ y tildes** ("Año", "Tipo Vehículo") pese a ser iso-8859-1.
- El receptor se autocompleta solo con RUT+DV (razón social, dirección, giro) si el SII lo conoce.

## Flujo del driver (implementado en conector-sii/factura-navegador.mjs)
1. Login como Nico (clave tributaria, sesión reutilizada) → seleccionar ANA CLARA.
2. Abrir Factura electrónica (33) o No afecta/exenta (34) según afecta/exento.
3. Emisor viene pre-llenado. Llenar RECEPTOR.
4. Por cada ítem: Nombre, Cantidad, Precio; si es auto, marcar "Descrip." y pegar
   el detalle del vehículo (CAV).
5. Forma de pago.
6. Llegar a la VISTA PREVIA / BORRADOR → captura → enviar al WhatsApp de Ramón.
7. Esperar confirmación explícita → recién ahí botón EMITIR. Es IRREVERSIBLE.
