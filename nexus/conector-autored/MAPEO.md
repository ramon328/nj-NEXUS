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

### Paso 4 — Cierre (pendiente de mapear: exige un contrato abierto ya firmado)
Firmado el mandato sigue: subir docs → `VERIFYING_DOCUMENTS` → datos del comprador
(`enter-buyer-info`) → `vehicle-taxation` → `new-payment` (**impuestos, plata real**) →
`CREATING_CONTRACT` (`CONTRACT_AUTOMATIC`) → `NOTARY` → `CIVIL_REGISTRY` → `COMPLETED`.

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

## Pendiente
- Cierre del Contrato Abierto (paso 4): `enter-buyer-info`, `upload-documents` y `new-payment` — se
  mapean cuando haya un contrato abierto con el mandato ya firmado (el 45851 sirve).
- Wire del tool en `asistente.mjs` de Meme (leer siempre; crear con confirmación explícita por WhatsApp).
