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

## Flujo de creación (para armar la función de Meme más adelante)
1. `GET /vehicle-info?licensePlate=` → prellena datos del auto. (gratis)
2. `POST /initialize` con `{kind, createdBy/value, vehicle, ...}` → **crea (cobra 1 crédito)**.
3. `POST /{id}/enter-seller-info` y/o `/enter-buyer-info` → RUT, nombres, comuna, etc.
4. `POST /{id}/upload-documents` → permiso de circulación, eRUT, estatutos…
5. `GET /{id}/signers` + firma.
6. `GET /{id}/vehicle-taxation` (lee monto) → `POST /{id}/new-payment` → **paga impuestos**.
7. `POST /buy-cav {id, subType:"CAV_INITIAL"}` si corresponde CAV.

## Cómo usar el conector
```
node autored.mjs quien|creditos|resumen|rc|lista [patente]|estado <id>|impuestos <id>|vehiculo <patente>|login
```
Escritura solo por import + `AUTORED_PERMITIR_ESCRITURA=1` en `.env` **y** `{confirmar:true}` en la llamada. Falta cualquiera → dry-run.

## Pendiente (cuando Ramón dé el OK para una prueba real)
- Payload exacto de `initialize` y `enter-*-info` (campos obligatorios) — se confirma con UNA creación real controlada (gasta 1 crédito) o pidiendo créditos de prueba.
- Wire del tool en `asistente.mjs` de Meme (leer siempre; crear con confirmación explícita por WhatsApp).
