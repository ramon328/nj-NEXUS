# Mapeo AutoRed — módulo Transferencias B2B

Plataforma: **autored.cl** (subastas mayoristas de autos usados + transferencias de dominio 100% digital).
Cuenta mapeada: **Joaquin Elias** / empresa **Mallorcautos — ANA CLARA SPA** (RUT 77.271.121-2, company id 506), rol `rebuyer`.

> ⚠️ **Cada solicitud/documento CONSUME CRÉDITOS (plata) o cobra impuestos reales.**
> El conector deja toda escritura en **dry-run** salvo doble candado (ver abajo). Créditos actuales: **0**.

## Autenticación
- Login: `POST https://autored.cl/api/v2/auth/login` body `{email, password}` → setea cookie **`authorization`** (JWT, httpOnly, `Max-Age` 24h).
- La cookie JWT es lo único necesario para llamar la API (HTTP puro, sin navegador).
- Check: `GET /transferencias/api/sso/check-auth` → `{ authenticated, name, email, role, permissions[], company{...} }`.
- Logout: `DELETE /api/v2/auth/logout`. Reset clave: `PUT /api/v2/auth/password`.

## Bases de API
- `https://autored.cl/api/v2` → auth / plataforma (Vite React).
- `https://autored.cl/transferencias/api` → módulo Transferencias (Next.js). ← el que nos importa.

## Endpoints Transferencias

### Lectura (NO cobran)
| Método | Ruta | Qué da |
|---|---|---|
| GET | `/business/transfers` | lista de solicitudes (params: `id, order, direction, page, rowsPerPage, vehicle[licensePlate], min_createdAt, max_createdAt, status`) |
| GET | `/business/transfers/resume` | contadores (pendientes, autosafe, rechazadas, finalizadas) |
| GET | `/business/transfers/wallet/credits` | `{credits}` |
| GET | `/business/transfers/{id}/status` | estado detallado de una solicitud |
| GET | `/business/transfers/{id}/vehicle-taxation` | monto de impuestos a pagar |
| GET | `/business/transfers/{id}/signers?type=` | firmantes |
| GET | `/business/transfers/vehicle-info?licensePlate=` | datos del vehículo (prellenado) |
| GET | `/info/rc-status` | estado Registro Civil (`ACTIVE`/…) |

### Escritura / COBRAN (⚠️ bloqueadas por doble candado)
| Método | Ruta | Costo |
|---|---|---|
| POST | `/business/transfers/initialize` | **crea solicitud → 1 crédito** |
| POST | `/business/transfers/buy-cav` `{id, subType:"CAV_INITIAL"}` | **compra CAV** |
| POST | `/business/transfers/{id}/new-payment` `{type}` | **paga impuestos (plata real)** |
| POST | `/business/transfers/{id}/upload-documents` | sube docs |
| POST | `/business/transfers/{id}/enter-seller-info` \| `/enter-buyer-info` | datos contraparte |
| POST | `/business/transfers/{id}/abort` | cancela |
| POST | `/business/transfers/validate-pension-debt` `{rut,name,...}` | consulta previa |

## Modelo de datos
**Tipos de transferencia (`kind` / `value`):**
- `B2B` + `sellers` → **Automotora Vende (AV)** — la automotora vende un auto propio.
- `B2B` + `buyers` → **Automotora Compra** — compra a nombre propio.
- `B2B_OC` → **Contrato Abierto (CA)**.
- `B2B_AM` → **Automotora Gestiona (AG)**.

**Estados (status) del proceso:** `UPLOAD_DOCUMENTS` (Subir documentos) → `ENTER_INFO`/`ENTER_SELLER_INFO` → `VERIFYING_DOCUMENTS` → `PAY_TAXES` → `CREATING_CONTRACT` → `GENERATING_MANDATE` → firma → `NOTARY` → `CIVIL_REGISTRY` (En registro civil) → `FINISHED_PROCESS`/`COMPLETED`. Otros: `ABORTED`, `GENERATING_CAV`, `FAILED_CAV_GENERATION`.

**Tipos de documento:** `UPDATED_STATUTE`, `ERUT_SII`, `VALIDITY_OF_SOCIETY`, `VALIDITY_OF_POWERS`, `CAV_INITIAL`, `CIRCULATION_PERMIT`, `TAX_FORM_F23`, `DNI`.

**Patente (regex):** `^(?:[A-Z]{2}[0-9]{4}|[A-Z]{4}[0-9]{2}|[A-Z]{2}[0-9]{3}|[A-Z]{3}[0-9]{2})`.

**Descarga de documentos/CAV:** `GET /transferencias/api/documents/{uuid}/download`.

> ⚠️ **`{id}` en las rutas de una solicitud = `publicId` (UUID), NO el id numérico.** Con el id
> numérico la API responde `404 {"error":"Transfer not found"}`. Tampoco es el "Número de
> Solicitud" que muestra la UI (ej. 45851): son tres identificadores distintos por proceso
> (nº UI 45851 · id interno 489 · publicId `b899b207-…`).

## CONTRATO ABIERTO (B2B_OC) — flujo COMPLETO, verificado end-to-end
Probado el **03-08-2026** creando la solicitud real **45851** (SWPV28, vendedora Xiaoyan Chen).
Ruta UI: `Transferencias` → **Nueva solicitud** → `/transferencias/crear-solicitud`.

### Paso 1 — Crear la solicitud (⚠️ COBRA: 1 crédito **+ CAV**)
Formulario: 4 radios de tipo (`sellers` / `buyers` / **`openContract`** / `automotiveManages`),
input `licensePlate`, radio `prohibitAlienation` (Sí/No) y checkbox de términos.
El front avisa: *"Al hacer click en Solicitar se comprará un CAV del vehículo"* → el costo real es
**1 crédito + el CAV**, no solo el crédito.

Al apretar "Solicitar transferencia" sale un modal **"Verifica los datos"** con patente/marca/modelo/año
(lo trae de `GET /vehicle-info?licensePlate=`, gratis) y botones Cancelar/**Confirmar**. Hasta acá no se cobró nada.
"Confirmar" dispara:

```
POST /transferencias/api/business/transfers/initialize
{"email":"jelias@mallorcautos.cl","licensePlate":"SWPV28","phone":"",
 "clientType":"openContract","kind":"B2B_OC","creditor":{"name":"","rut":""},"forceCreation":false}
```
- `clientType` = el `value` del radio; `kind` = `B2B_OC`. Ambos van juntos.
- `creditor` = acreedor de la **prohibición de enajenar**; vacío si el radio fue "No".
- `forceCreation:true` = crear igual si ya existe otra solicitud para esa patente.
- Respuesta: `{publicId, id, statusId:3, kind:"B2B_OC", paidService:true, publicUrl, ...}` y
  redirige a `/transferencias/proceso/{publicId}`. Estado inicial: **`ENTER_SELLER_INFO`**.
  El CAV ya queda comprado como documento `CAV_INITIAL` (`READY`).

### Paso 2 — Datos del vendedor (wizard de 5 pasos, no cobra)
1. **Persona / Empresa** (Xiaoyan Chen = Persona).
2. **Datos**: `rut`, `name` (todos los nombres), `fLastName`, `mLastName`, checkbox `fLastNameOnly`
   ("Tengo solo un apellido" → deshabilita apellido materno, sirve para extranjeros),
   checkbox `hasRepresentative`. Al pasar de paso corre solo:
   - `GET /info/person?rut=25492965-4` → dio **400** (no bloquea el flujo, se ignora).
   - `POST /business/transfers/validate-pension-debt {rut,name,fLastName,mLastName}` → `{"valid":true}`.
     Si sale `false` la transferencia se rechaza por Ley 21.389.
3. **Domicilio**: comuna (botón `#commune`, buscador "Buscar comuna…", catálogo de `GET /info/regions`),
   `street`, `houseNumber`, `dpto` (opcional).
4. **Contacto**: `email` y `phone`. ⚠️ **El teléfono debe ir `56XXXXXXXXX`** (código país sin `+`);
   con `9XXXXXXXX` o `9 7700 3114` marca "El teléfono es inválido".
5. **Revisión** → botón **Enviar**:

```
POST /transferencias/api/business/transfers/{publicId}/enter-seller-info
Content-Type: multipart/form-data      ← NO es JSON
sellers.0.name / .fLastName / .mLastName / .rut / .email / .phone
sellers.0.street / .houseNumber / .dpto
sellers.0.commune.id / .commune.name / .commune.region.name
sellers.0.hasUnion / .hasRepresentative / .isBeneficiary
```
Índice `0` = primer vendedor (soporta varios: `sellers.1.*`). Los sub-objetos van con clave plana
punteada. `union` = cónyuge, `representative` = representante legal (mismos campos anidados).

### Paso 3 — Mandato y firma (automático, no cobra)
Al guardar el vendedor el estado avanza solo:
`ENTER_SELLER_INFO` → **`GENERATING_MANDATE`** → **`SIGN_MANDATE`** (~10 s).
Se genera el documento **`OC_MANDATE`** (`Mandato.pdf`, 2 págs) y AutoRed le manda el mail de firma al vendedor.

```
GET /business/transfers/{publicId}/signers?type=OC_MANDATE
→ {documentUrl, signers:[{status:"PENDING", name, fLastName, email, rut,
     signUrl:"https://firmas.autosafe.cl/solicitud/<uuid>"}]}
```
`signUrl` es el link de firma (el mismo del botón "Ir a firmar" / "Copiar enlace") → **se le puede
mandar por WhatsApp al vendedor**, no hace falta que abra el correo.

Contenido del mandato: *MANDATO ESPECIAL E IRREVOCABLE* del vendedor a **PRESTADORA DE SERVICIOS
JAVERIM SpA (Autosafe)**, RUT 76.324.632-9, para que firme la promesa/compraventa del vehículo en su
representación. Eso es lo que hace "abierto" al contrato: el comprador final se completa después.

### Paso 4 — CIERRE (MAPEADO 07-08-2026, verificado)
Estos son los "**Próximos pasos**" que la UI muestra una vez firmado el mandato:
**1)** subir el permiso de circulación · **2)** completar la info del comprador ·
**3)** el comprador firma el contrato · **4)** pagar los impuestos.

Los payloads NO están adivinados: salen del bundle del front (`buildUploadDocumentsFormData`,
`buildFormData`, `EnterInfo`, `PayTaxes` — chunk `1efuxyhnu06ym.js`) y están contrastados contra la
solicitud **475 (GYWL24)**, que llegó a Registro Civil con comprador empresa (KURTI SPA).

#### 4.1 — Permiso de circulación + tasación + precio (`POST /{publicId}/upload-documents`)
✅ **EJECUTADO EN VIVO el 07-08-2026** sobre la solicitud **497 (PGXP70)** con Joaquín: HTTP 200,
`UPLOAD_DOCUMENTS` → **`ENTER_INFO`**, documento `CIRCULATION_PERMIT` cargado y los campos guardados
tal cual se enviaron (precio 17.000.000 · tasación 20.392.937 · `VN1760073` · Huechuraba ·
2026-08-31 · alContado). El mapeo de este paso está confirmado, no es teoría.

**multipart/form-data**, claves planas (NO JSON):

| clave | qué es |
|---|---|
| `drivingPermit` | el archivo del permiso (≤10 MB; pdf/jpg/jpeg/png/webp/doc/docx/heic/ppt) |
| `commune` | **nombre** de la comuna donde se pagó el permiso (no el id) |
| `siiCode` | código SII de la tasación elegida, formato `AA1234567` |
| `taxationPrice` | precio de esa tasación, número plano |
| `expirationDate` | vencimiento del permiso |
| `year` | `expirationDate.slice(0,4)` — lo manda el front aparte |
| `price` | precio de venta, número plano |
| `paymentMethods` | **JSON.stringify** de las 6 formas de pago |

`paymentMethods` = `{efectivo, credito, tarjetaCredito, alContado, cheque, valeVista}`, cada una
`{checked:bool, amount:"18.000.000"}` (monto **con puntos**, como string).
⚠️ **La suma de las formas marcadas debe dar EXACTO el `price`**; el front lo valida antes de
enviar ("La suma de las formas de pago debe ser igual al precio de venta") y el backend lo rechaza.

Las tasaciones salen **gratis** de `GET /{publicId}/vehicle-taxation` → `[{code, price, model, brand,
year, version}]`: son las versiones del auto, hay que elegir la que corresponde (PGXP70 devolvió 4).
Si la lista viene vacía, el front manda `makeInputsOptional` y deja que Autosafe busque la tasación.

#### 4.2 — Datos del comprador (`POST /{publicId}/enter-info`)
🔴 **BLOQUEADO EN LA SOLICITUD 45859 / PGXP70 (07-08-2026): devuelve HTTP 400 con cuerpo VACÍO.**

✅ **PROBADO QUE ES DE AUTORED, NO NUESTRO.** Prueba final: `go-back` a `uploadDocuments`
(HTTP 200, `{"message":"Retroceso a paso uploadDocuments realizado correctamente"}`) → se rehízo
**el paso 1 completo desde el formulario web de AutoRed** (su `upload-documents` respondió 200; el
formulario venía precargado con TODOS nuestros datos, lo que confirma que nuestra subida por API
era correcta) → se siguió al paso 2 **por su misma web** → `enter-info` **400 otra vez**.
Es decir: el flujo entero hecho por su producto, sin API nuestra, falla igual.
El contrato quedó intacto (vendedor, mandato, permiso, precio, tasación y forma de pago).

**Causa probable — un registro de vendedor mal grabado POR ESTE CONECTOR, no un bug de AutoRed.**
Se comparó cómo quedó guardado el vendedor en los 12 contratos abiertos de la cuenta: **todos** los
vendedores persona tienen el teléfono en E.164 **con "+"** (`+56993196983`) y los bloques
`union`/`representative` presentes. El del 497 es el **único** sin "+" y sin esos bloques — y lo
grabó `ingresarVendedorOC`, que mandaba `56992540550` y omitía los bloques. Eso también explica por
qué **el formulario web de AutoRed falla igual**: no está roto, re-envía el vendedor tal como viene
del `status` y el backend se atora con ese registro. (Reproducido a mano en `autored.cl` con el
usuario de Joaquín; se capturó su request real y nuestro payload quedó **idéntico, 54 claves**.)

Confirmado en la bitácora (`actividad_ias`): al vendedor del 497 lo grabó **nuestro**
`crear_contrato accion:"vendedor"` el 06-08 23:26. El del 489 (SWPV28) **no** tiene registro de
haberse cargado por el conector y quedó con el formato correcto — coherente con la hipótesis.

⛔ **NO forzar `go-back` a `enterSellerInfo` para arreglarlo.** El front solo ofrece retroceder a
los pasos presentes en `transferData.editableSteps`, y en el 497 esa lista es
`["uploadDocuments","enterInfo"]`: **el paso del vendedor NO es editable**. Forzarlo por API sería
operar fuera del flujo soportado sobre un contrato con el mandato ya firmado. La hipótesis queda
**sin probar a propósito**: el camino correcto es pedirle a AutoRed (soporte +56 9 7979 5860) que
normalice el registro del vendedor, que es algo que solo pueden hacer ellos.

Ya corregido en `ingresarVendedorOC` para que ningún contrato nuevo quede así.

**Descartado con pruebas** (todas dieron el mismo 400 vacío): deuda de pensión de comprador y
vendedor (`{valid:true}` en ambos) · `houseNumber` "SN" y "S/N" · teléfono del vendedor con y sin
"+" · bloques `union`/`representative` agregados en el payload · apóstrofo de la región
"O'Higgins" (probado sin apóstrofo y vacío) · `dpto` vacío · `commune.id` como número y como
string · RUT y email deliberadamente inválidos (mismo 400 ⇒ **no es validación de campos**).
Con un `publicId` inexistente responde **404 con mensaje**, así que el ruteo y el parseo del
multipart funcionan: el 400 ocurre después de encontrar la transferencia.

El contrato NO se corrompió con ninguno de los intentos: el 400 rechaza limpio y el vendedor queda.

**Cómo capturar la verdad cuando algo falle acá:** login en `autored.cl/users/sign_in` → menú
Transferencias → VER en la solicitud → botón **Continuar** → llenar el wizard → Enviar, con el
inspector de red abierto. Ojo con las rutas: la de detalle es `/transferencias/detalle/{publicId}`
y la del wizard `/transferencias/proceso/{publicId}`, pero **entrar directo a `/proceso/` da 500**;
hay que llegar por el botón Continuar.

⚠️ **Dos trampas grandes acá:**
1. El endpoint es **`enter-info`**, NO `enter-buyer-info` (eso estaba mal en este mapeo).
2. Hay que mandar **`sellers` Y `buyers` juntos**: el front arma
   `{sellers: status.sellers || [], buyers: [elComprador]}` y el backend **reemplaza los dos lados**.
   Si mandás solo `buyers`, **borrás al vendedor**.

**multipart** con claves punteadas (`buildFormData` recursivo: arrays → `k.0`, objetos → `k.sub`,
**null/undefined se omiten**). Verificado que sale idéntico al del front.

Persona (`buyers.0.*`): `name`, `fLastName`, `mLastName`, `rut`, `dpto`, `street`, `houseNumber`,
`phone`, `email`, `commune.id`, `commune.name`, `commune.region.name`, `hasUnion`,
`hasRepresentative`, `isBeneficiary`. Además el front manda **SIEMPRE** los bloques
`buyers.0.representative.*` y `buyers.0.union.*` completos con strings vacíos, aunque
`hasRepresentative`/`hasUnion` sean `false` (12 claves cada uno). Total de un comprador persona
con un vendedor persona: **54 claves**.

⚠️ **El teléfono del COMPRADOR va con `+`** (`+56941407708`), pero el del VENDEDOR se re-envía
**tal cual lo devuelve el status, sin `+`** (`56992540550`). Así lo manda el front; no lo
"arregles".

Empresa (`buyers.0.*`): `rut`, `socialReason`, `commune.*`, `street`, `houseNumber`, `dpto`,
`isPublicDeed`, `constitutionDate`, `modificationDate`, `companyNotaryName`,
`companyNotaryCommune`, `companyNotaryNumber`, y `legalRepresentative.0.{name,fLastName,mLastName,
rut,phone,email}`. Los documentos de sociedad (`societyConstitution`, `validityOfPowers`,
`validityOfSociety`, `societyModifications`, `updatedStatute`, `eRutSii`) se adjuntan como archivo
en `buyers.0.<campo>` y el backend los reconoce por el nombre (`_comprador_` / `_propietario_`).

#### 4.3 — Firma del CONTRATO (`GET /{publicId}/signers?type=CONTRACT`) ✅ verificado
El mandato del vendedor es `type=OC_MANDATE`; **el contrato es `type=CONTRACT`**. Devuelve
`{documentUrl, signers:[{status, name, rut, email, signUrl}]}` — el `signUrl` es el link de
firmas.autosafe.cl.

⚠️ **Lo firman DOS partes, y el orden NO es fijo.** Verificado en 4 contratos reales: en GYWL24 el
`signers[0]` era el representante del VENDEDOR, no el comprador. Hay que cruzar el RUT de cada
firmante con los del comprador del `status` (incluyendo `legalRepresentative` y `representative`),
nunca asumir el orden. `firmaContrato()` ya devuelve `comprador`, `vendedor` y `faltan_firmar`.

ℹ️ Apenas queda cargado el comprador, **AutoRed le manda la firma sola al cliente** (dato de
Ramón): no hace falta enviarle el link a mano, solo sirve para consultar el estado o reenviarlo.

#### 4.4 — Impuestos (`POST /{publicId}/new-payment {type:"TAXES"}`) ✅ fórmula validada
⚠️ **NO descuenta plata solo: GENERA el cobro** y devuelve `{paymentUrl}` — alguien tiene que
entrar a ese link a pagar.

**Monto:** 1,5% del **mayor** entre precio de venta y tasación fiscal, más el arancel del Registro
Civil (**36.030** cuando la API no manda `regCivilCost`).

⚠️ **Redondear, no truncar.** El front hace `parseInt(0.015*base)` (trunca) y por eso muestra 1
peso de menos cuando hay decimales. Contrastado contra los **Formulario 23 realmente pagados**
(se bajan gratis con el doc `TAX_PAYMENT_RECEIPT` y se leen con `pypdf`):

| patente | base | front (trunca) | pagado real |
|---|---|---|---|
| RYWK18 | 16.000.000 | 240.000 | **240.000** |
| KPDT21 | 43.749.976 | 656.249 | **656.250** |
| HLDC70 | 15.218.333 | 228.274 | **228.275** |
| GYWL24 | 250.000.000 | 3.750.000 | **3.750.000** |

`costoTransferencia()` usa `Math.round` y da **4/4** contra lo efectivamente pagado.
El F23 cubre solo el impuesto; el arancel del Registro Civil se cobra aparte.

#### Otros endpoints del cierre
- `POST /{publicId}/go-back {step}` — vuelve a un paso (`uploadDocuments`/`enterInfo`/`enterSellerInfo`).
- `POST /business/transfers/massive-sign {publicIds:[]}` — firma masiva.
- `GET /info/person?rut=` — nombre por RUT (da 400 seguido, se ignora).

#### Recorrido de estados del cierre
`UPLOAD_DOCUMENTS` → `ENTER_INFO` → `VERIFYING_DOCUMENTS` → `CREATING_CONTRACT` →
`SIGN_CONTRACT` ("Firma del comprador" en B2B_OC) → `SIGNED_CONTRACT` / `PAY_TAXES` →
`NOTARY` → `CIVIL_REGISTRY` → `COMPLETED`.

### Documentos que aparecen en un B2B_OC completado
`CAV_INITIAL`, `OC_MANDATE`, `DNI`, `TRANSFER_CERTIFICATE`, `CIRCULATION_PERMIT`,
`SOCIETY_CONSTITUTION`, `CONTRACT_AUTOMATIC`, `CAV_OTHER`. Bajarlos es **gratis** con su `publicUrl`
(`/transferencias/api/documents/{uuid}/download`).

## Flujo de creación (otros tipos)
1. `GET /vehicle-info?licensePlate=` → prellena datos del auto. (gratis)
2. `POST /initialize` con `{clientType, kind, licensePlate, email, creditor, forceCreation}` → **crea (1 crédito + CAV)**.
3. `POST /{publicId}/enter-seller-info` y/o `/enter-buyer-info` (multipart) → RUT, nombres, comuna, etc.
4. `POST /{publicId}/upload-documents` → permiso de circulación, eRUT, estatutos…
5. `GET /{publicId}/signers` + firma.
6. `GET /{publicId}/vehicle-taxation` (lee monto) → `POST /{publicId}/new-payment` → **paga impuestos**.
7. `POST /buy-cav {id, subType:"CAV_INITIAL"}` si corresponde CAV.

## Informes / CAV — `/api/v2/reports` (PROBADO ✓)
Sección **Informes** (`/plataforma/reports`, "Compra de informes"). Base API `/api/v2`.
- `GET /reports/?license_plate=&reportType=&order=id&direction=desc&page=0&rowsPerPage=20` → `{count, rows:[{id, ticket, licensePlate, reportType, ready, url, publicUrl, createdAt, ...}]}`.
- `GET /reports/check-repeated?licensePlate=XXX` → `[{reportType, createdAt}]` (avisa duplicados).
- **`POST /reports/buy {license_plate, reportType}`** → **COBRA**. Devuelve `[{id, ticket, ready:false, url:null}]`.
- Descarga cuando `ready:true`: `GET {row.url}` (= `/api/v2/download/<hash>`, con cookie auth) → PDF.

**reportType (radio UI → valor enviado):**
- radio **"CAV"** → `CAV_RAW` (CAV rápido; en la prueba quedó `ready` al instante).
- radio "Informe Autored" → `CAV`.
- radio "Informe Autored Completo" → `NMP`.

**DESCARGAR (gratis, informe ya comprado):** el botón "DESCARGAR" del historial hace `window.open(row.url)` — abre el link `/api/v2/download/<hash>` de esa fila (deshabilitado si `ready!='true'`). NO cobra: solo baja el PDF ya generado. En el conector: `descargarInforme(url, destino)` tras ubicar la fila con `listarInformes`. Verificado: CAV (CAV_RAW, 2 págs) y Completo (NMP, 6 págs) bajan bien.

**Flujo UI real:** patente + radio → "Comprar" → modal *"¿seguro que quiere comprar el certificado?"* (Aceptar) → si hay compras previas, 2º modal de **duplicado** listándolas (Cancelar/Comprar) → dispara el POST.

**Prueba 23-07-2026:** compra CAV de **SZPV13** → informe **id 324499** (`CAV_RAW`), PDF 2 págs, enviado por WhatsApp a +56 9 3294 5240. Nota: SZPV13 ya tenía CAV el 08-07 y 15-07 (fue compra duplicada, autorizada por Ramón).

Funciones en `autored.mjs`: `listarInformes`, `informesRepetidos`, `descargarInforme`, `comprarInforme(patente, tipo, {confirmar})` (bajo doble candado). CLI: `informes [patente]`, `repetidos <patente>`.

## Cómo usar el conector
```
node autored.mjs quien|creditos|resumen|rc|lista [patente]|estado <id>|impuestos <id>|vehiculo <patente>|login
```
Escritura solo por import + `AUTORED_PERMITIR_ESCRITURA=1` en `.env` **y** `{confirmar:true}` en la llamada. Falta cualquiera → dry-run.

## Funciones de Contrato Abierto en `autored.mjs`
```
crearContratoAbierto(patente, {prohibicion:{name,rut}, forzar, confirmar})  // COBRA, doble candado
ingresarVendedorOC(publicId, {nombres, apellidoPaterno, apellidoMaterno, rut, email,
                              telefono:'56XXXXXXXXX', calle, numero, depto, comuna}, {confirmar})
firmaMandato(publicId)        // link de firma + estado del firmante (gratis)
documentosSolicitud(publicId) // lista de docs con su url de descarga (gratis)
buscarComuna(nombre)          // -> {id, name, region:{name}} para el payload del domicilio
```
CLI nuevo: `comuna <nombre> | firma <publicId> | docs <publicId>`.

## Funciones del CIERRE en `autored.mjs`
```
estadoCierre(publicId)          // brújula: en qué paso va, hitos, alertas, docs (gratis)
ultimoContrato(patente)         // ubica el contrato vivo más reciente de una patente
subirPermisoCirculacion(publicId, {archivo, comuna, siiCode, tasacionPrecio,
                                   vencimiento, precioVenta, formasPago}, {confirmar})
ingresarCompradorOC(publicId, comprador, {confirmar})   // re-envía los sellers solo
clavesEnterInfo(publicId, comprador)  // previsualiza el multipart SIN enviar (para revisar el mapeo)
firmaContrato(publicId)         // link de firma del COMPRADOR (gratis)
generarPagoImpuestos(publicId, {confirmar})             // devuelve paymentUrl
costoTransferencia({precioVenta, tasacion, registroCivil})
armarFormasPago({alContado: 18000000, ...}) / totalFormasPago(pagos)
volverAPaso(publicId, paso, {confirmar})
leerMapeo(n)                    // bitácora de las escrituras reales
```
CLI: `cierre <publicId> | firma-contrato <publicId> | ultimo [patente] | mapeo [n]`.

**Bitácora de mapeo:** cada escritura del cierre deja request + respuesta en
`mapeo-cierre.jsonl`. Sirve para ver qué contestó AutoRed de verdad cuando Joaquín usa el flujo,
sin tener que mirarle la pantalla.

## Tool `crear_contrato` en el hub — flujo completo
Acciones: `crear` · `vendedor` · `firma` · `estado` (mitad 1, ya existían) y
**`siguiente` · `permiso` · `comprador` · `firma_comprador` · `impuestos`** (el cierre).

**Regla de oro: BORRADOR ANTES DE ENVIAR.** Las tres acciones que escriben (`permiso`,
`comprador`, `impuestos`) sin `confirmar` devuelven un borrador con todo resuelto (comuna
buscada en el catálogo, tasación emparejada, montos calculados, suma de formas de pago
chequeada, datos del comprador reusados) + la lista de lo que falta. Solo con el OK explícito
de la persona se vuelve a llamar con `confirmar:true`.

- `siguiente` es la entrada: lee el estado REAL en AutoRed y dice el paso + qué pedirle a la persona.
  Nunca se adivina el paso. Si piden un paso que no corresponde, responde `fuera_de_paso` y redirige.
- El archivo del permiso sale de los adjuntos de WhatsApp (`ctx.media`).
- **Reuso del comprador:** con el RUT se busca en los clientes de MallorcAutos
  (`goautos.mjs cliente --rut`) y se prellenan nombre, email, teléfono y dirección; el borrador
  dice de dónde salieron para que la persona los confirme. Si el RUT resulta ser de una empresa,
  el comprador pasa a tratarse como empresa aunque no lo hayan dicho.

## Lecciones del primer uso real (07-08-2026, PGXP70 con Joaquín)
1. **El permiso de circulación se lee solo y trae la tasación.** El comprobante municipal imprime el
   código SII y el monto (`VN176007320` / 20.392.937) → los 7 dígitos tras las 2 letras son el
   `siiCode` que espera AutoRed (`VN1760073`) y el monto calza con una de las opciones de
   `vehicle-taxation`. **No hay que hacer elegir la versión a ojo:** se empareja con el documento.
   También trae comuna, vencimiento, dueño, RUT, motor y color.
2. **El archivo del permiso necesita tipo MIME.** Un `Blob` sin `type` viaja como
   `application/octet-stream` y AutoRed valida el formato contra una lista. Se deduce de la extensión.
3. **Los adjuntos se perdían entre mensajes.** La memoria de adjuntos del hub es RAM con TTL de
   20 min: si el hub se reinicia, o la persona manda el permiso y contesta el precio más tarde, el
   archivo desaparece y el asistente lo vuelve a pedir aunque ya se lo mandaron (le pasó a Joaquín, y
   siguió insistiendo aun cuando él dijo "déjalo como está"). Arreglado con
   `historial.adjuntosDe(numero)`, que los recupera del historial persistente (72 h); el borrador
   avisa cuando el archivo vino de un mensaje anterior para que la persona confirme que es ese.
4. **Ojo con los permisos pagados en cuotas.** El del PGXP70 tenía la cuota 2 impaga, así que vencía
   el 31/08/2026 y no el 31/03/2027. El borrador ahora avisa si el permiso vence en menos de 60 días.

## Pendiente
- Pasos **2, 3 y 4** del cierre: mapeados y probados en dry-run, **todavía no ejecutados en vivo**.
  La 497 / PGXP70 quedó en `ENTER_INFO` esperando los datos del comprador y es la que los va a estrenar.
- Wire del tool en `asistente.mjs` de Meme (leer siempre; crear con confirmación explícita por WhatsApp).

## REVISIÓN A FONDO DE DOCUMENTOS — `revisar_informe.py`
Revisor de informes de vehículo para el **flujo de compra**. GRATIS: corre sobre un informe YA
comprado. Entrada: PDF (CAV crudo o Informe Completo NMP). Salida JSON:
`{ok, formato, patente, resumen:{alertas,revisar,ok,apto}, chequeos:[{clave,titulo,estado,detalle,actos?}]}`

**Estados:** `ok` (el informe lo afirma) · `alerta` (problema real) · `revisar` (**no se puede
determinar** — se dice "no me consta", nunca se inventa).

**12 chequeos** (los que trae el NMP; el CAV solo alcanza para los primeros):
limitaciones al dominio / prenda · anotación en trámite · pérdida total · encargo por robo ·
transporte público · multas heredables · infracciones en riesgo de anotación · dueños anteriores ·
revisión técnica · SOAP · permiso de circulación · subinscripciones.

### ⚠️ El bug que originó este módulo (no repetirlo)
La detección vieja hacía `re.search(r"PRENDA|GRAVAMEN|PROHIBICI", texto_completo)`. Los informes NMP
traen **subtítulos explicativos** como *"Limitaciones al dominio — Revisa si existe una prohibición
legal para transferir el auto a un tercero"*, así que un auto **limpio** salía marcado con prenda.
Verificado en **SWPV28**: única aparición de "prohibici" = ese subtítulo, y el informe dice
"El vehículo no registra limitaciones al dominio" → el parser reportaba prenda igual.

**Reglas para no recaer:**
1. Nunca decidir por una PALABRA sobre el texto completo: usar **frases explícitas** y, en el CAV,
   recortar la **sección** (`seccion_cav`) antes de buscar.
2. Los tipos de anotación identificados van en el campo **`actos`** (lista), NO se leen del
   `detalle`. El `detalle` es prosa y puede contener la palabra "prenda" como ejemplo — leerlo para
   decidir reproduce el mismo falso positivo (pasó durante el desarrollo con LDGG73).
3. Si no matchea ninguna frase conocida → `revisar`, nunca `ok` ni `alerta`.

`tiene_prenda` en `leer_cav.py` / `leer_nmp.py` ahora es de **tres estados**: `true` (prenda
confirmada en `actos`), `false` (informe dice que no hay limitaciones), **`null` = no se sabe**
(hay limitación pero el informe no dice de qué tipo → hay que pedir el CAV).

Casos reales verificados: SWPV28 limpio + 4 infracciones en riesgo · SWDZ79 PRENDA + PROHIBICIÓN
(08-06-2023) · LDGG73 registra limitaciones sin tipo (`null`) + 5 dueños · PDFD74 anotación en
trámite · SZPV13 limpio · TDCX40 permiso no verificable (`revisar`).

Función: `revisarDocumentos(patente)` en `autored.mjs` (elige el mejor informe comprado —NMP antes
que CAV—, lo baja gratis y lo pasa por el revisor). CLI: `node autored.mjs revisar <patente>`.

## FLUJO DE COMPRA DE AUTO — auditoría 04-08-2026
Estado real de los 5 pasos del tool `compra` (probado en vivo por `/api/chat` como Joaquín):

| # | Paso | Estado | Herramienta |
|---|---|---|---|
| 0 | Identificar auto + km | ✅ automático | `autored.fichaCompra` (informe ya comprado; NMP trae km, CAV no) |
| 0b | Revisión de documentos (12 puntos) | ✅ automático | `autored.revisarDocumentos` |
| 1 | Contrato / transferencia AutoRed | 🖐️ **MANUAL a propósito** | `compra accion:"contrato"` da el paquete de datos |
| 2 | Pago al vendedor | 🖐️ manual (banco tek en reposo) | `tek_masiva` si `TEK_COMPRA_AUTO=1` |
| 3 | Publicar en GoAutos | ✅ automático | `compra accion:"publicar"` → `subir_auto` |
| 4 | Solicitar TAG | ✅ automático | `solicitar_tag` tipo **`nuevo_propio`** (poder autogenerado) |
| 5 | Factura de compra DTE 46 | ✅ automático (borrador; emisión con doble confirmación) | `factura_compra` |

La **transferencia de dominio** queda MANUAL por decisión de negocio (firma, notaría y Registro
Civil son del proceso de AutoRed/Autosafe). El Contrato Abierto está mapeado (ver sección B2B_OC) y
se puede automatizar si algún día se quiere, pero hoy NO se dispara desde el flujo de compra.

### Huecos encontrados y cerrados en esta auditoría
1. **El poder del TAG se pedía dos veces.** `faltantes()` exigía "el poder (para el TAG)" mientras
   `solicitar_tag` lo GENERA solo y explícitamente no lo pide → el expediente nunca se completaba.
   Quitado de `faltantes()`.
2. **Tipo de TAG equivocado.** Nada le decía que un auto COMPRADO es propio de Ana Clara: elegía
   `nuevo_tercero` (consignación) y llamaba "nuevo dueño" al VENDEDOR. Ahora la regla de decisión
   está en el tool (`compró` → `nuevo_propio`; consignación → `nuevo_tercero`) y en la guía del paso.
3. **Sin Informe Completo el flujo quedaba ciego.** `fichaCompra` exigía NMP y devolvía
   `sin_informe`, pese a que la revisión de documentos sí lee el CAV. Ahora cae al CAV (identifica el
   auto; marca `solo_cav`/`sin_km` porque el CAV no trae kilometraje).
4. **Datos del informe que se perdían.** `revisar_informe.py` ahora devuelve un bloque `datos` con
   `rev_tecnica_hasta`, `permiso_ultimo_anio`, `permiso_fecha_pago`, `permiso_comuna` y `duenos`, y
   la nueva acción `compra accion:"publicar"` arma el paquete de `subir_auto` con eso ya prellenado.
   Antes se los volvía a preguntar al usuario aunque estuvieran en el PDF.
5. **Fallo mudo del DTE 46.** Sin `item.detalle` el SII rechaza el borrador sin mensaje legible
   (checkbox de descripción marcado + textarea vacío). Verificado en A/B. `generarBorradorCompra`
   ahora valida `detalle` y `precio` antes de abrir el navegador y dice la causa.

Lo único que el informe NO puede dar para publicar: **fecha de vencimiento del permiso de
circulación** (solo trae el año pagado y la comuna) y **revisión de gases** (no viene). Esos dos se
le piden al usuario — es correcto pedirlos.
