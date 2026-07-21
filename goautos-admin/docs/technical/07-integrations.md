# Integraciones Externas — Documentación Técnica

## ChileAutos

**Ruta:** `/chileautos`
**Servicio:** `chileautosService.ts`
**Hooks:** `hooks/chileautos/`

### Funcionalidades
- Configuración OAuth2 con token auto-renovable
- Publicación individual y masiva de vehículos
- Sincronización automática configurable:
  - `sync_on_publish` — Publicar al cambiar estado a "Publicado"
  - `sync_on_update` — Actualizar al editar vehículo
  - `sync_on_sold` — Marcar como vendido al aprobar venta
- Productos premium: premium, topspot, showcase, certificado
- Tracking de estado por listing (pending, published, sold, withdrawn, error)
- Seller identifier configurable

### Componentes UI
- `ChileautosPublicationsGrid` — Lista de publicaciones con stats, status, identificador, productos y fecha de sync
- `ChileautosListingDetailDrawer` — Drawer de detalle con toda la info de la publicación, verificación vía API y acciones (sync, despublicar)
- `ChileautosVehicleSelector` — Selector de vehículos para publicar
- `ChileautosPublishSheet` — Editor completo para publicación individual con override de marca/modelo
- `ChileautosPublishModal` — Modal rápido para selección manual de marca/modelo

### Verificación de publicaciones
La operación `verify` del edge function permite verificar si una publicación existe realmente en ChileAutos consultando `GET /v1/vehicles/{identifier}`. Accesible desde el drawer de detalle con botón "Verificar".

### Recepción de Leads (Webhook)
Edge function `chileautos-lead-webhook` recibe leads en tiempo real desde ChileAutos via POST.

**Tipos de lead soportados:**
- `chileautos` — Formulario web
- `chileautos-whatsapp` — WhatsApp Connect
- `chileautos-callconnect` — Llamadas CallConnect

**Flujo:**
1. ChileAutos envía POST con payload del lead al endpoint
2. Se identifica al cliente por `Seller.Identifier` → `chileautos_integration`
3. Se busca/crea customer por email o teléfono
4. Se vincula vehículo por `Item.Identifier` → `chileautos_listing`
5. Se crea lead en tabla `leads` (type: `sell-vehicle`, status: `pending`)
6. Se almacena payload crudo en `chileautos_leads` para analítica
7. Triggers de DB disparan notificaciones automáticas

**Configuración:** Enviar URL del endpoint + headers a soporte@chileautos.cl

### Tablas
- `chileautos_integration` — Config por automotora (seller_identifier, sync toggles, products, whatsapp)
- `chileautos_listing` — Listings publicados (identifier, status, products, sync timestamps)
- `chileautos_leads` — Leads crudos recibidos por webhook (prospect, source_type, raw_payload)
- `chileautos_system_config` — Cache de token OAuth compartido entre todos los tenants

## GetAPI (Lookup por Patente)

**Integración:** `integrations/getapi/`
**Componente:** `GetVehicleInfoByPatent`
**Edge functions consumidoras:** `get-info-by-patent`, `car_appraiser`

### Funcionalidades
- Búsqueda de datos por patente chilena
- Valorización automática (precio usado, mín/máx, trade-in)
- Mapeo inteligente con scoring: marca, modelo, combustible, color, categoría
- Datos extraídos: VIN, motor, transmisión, puertas, kilometraje, dueños

### Consumidores
- **Agregar vehículo** (`GetVehicleInfoByPatent`) — autorelleno del formulario.
- **Tasador** (`car_appraiser`) — si la query parece patente y el extractor LLM no obtiene marca/modelo, se llama a GetAPI para resolverla. Si responde, se enriquece `vehicleDetails` y se continúa la tasación normal; si no, se rechaza con mensaje pidiendo marca/modelo. Llama `/plate/` y `/appraisal/` en paralelo para evitar falsos negativos cuando uno de los dos endpoints falla.

## Facebook Marketplace

**Ruta:** `/facebook-marketplace`
**Tipos:** `facebookMarketplace.ts`

### Funcionalidades
- Selector de vehículos para publicar
- Grid de publicaciones activas
- Estado de cada publicación

## Mercado Libre

**Ruta:** `/mercadolibre`
**Tipos:** `Mercadolibre.ts`

### Funcionalidades
- Datos de seller/buyer reputation
- Métricas de vendedor (ventas, reclamos, cancelaciones)

## Instagram

**Rutas:** `/instagram`, `/instagram/messages`

### Funcionalidades
- Publicación de vehículos con fotos (carrusel hasta 10 fotos)
- **Programación de publicaciones** (publicar ahora o en una fecha/hora futura)
- Mensajes directos (DMs)
- Notificaciones de mensajes nuevos

### Publicación de fotos (modal con recorte + formato)
**Componentes:** `CreateInstagramPostDrawer.tsx` (modal `Dialog`; recorte con `react-image-crop`), `src/utils/instagramImage.ts` (`IG_RATIOS`, `processToInstagramRatio`)
**Edge function:** `supabase/functions/create-instagram-post/index.ts`

Flujo:
1. Es un **modal** que muestra las fotos del vehículo (main + galería) pre-seleccionadas; el usuario elige cuáles incluir (define el orden), puede **agregar fotos** desde el equipo, elige el **formato** (`IG_RATIOS`: 4:5 / 1:1 / 1.91:1 — uniforme para el carrusel) y **recorta cada foto** con `ReactCrop` (aspect bloqueado al formato). El recuadro es **exactamente lo que se va a publicar**. Se guarda el recorte en % por foto; al cambiar de formato se reinician.
2. Al publicar, el front procesa cada foto con `processToInstagramRatio(src, w, h, cropEnPorcentaje, i)` → canvas al tamaño del formato (1080×1350 / 1080×1080 / 1080×566, JPEG 0.92) respetando el recorte (o **cover centrado** si no se ajustó) y la sube al bucket `vehicle-images` (carpeta `instagram/`). Así Instagram no recorta las fotos a su criterio.
3. El front invoca la edge function con `imageUrls` (las URLs ya procesadas). La función las usa tal cual (fallback a las del vehículo si no vienen) y crea los contenedores del carrusel **en paralelo** (`Promise.all`) → más rápido con varias fotos.
4. Carrusel si hay ≥2 fotos; post simple si hay 1.

> La edge function se deploya aparte: `supabase functions deploy create-instagram-post`.

### Programación de publicaciones (schedule)
**Componente:** `CreateInstagramPostDrawer.tsx` (toggle "Publicar ahora" / "Programar")
**Tabla:** `instagram_scheduled_posts` (migr `20260624170000`) — `client_id`, `vehicle_id`, `image_urls` (jsonb, URLs ya procesadas 4:5), `description`, `scheduled_at`, `status` (`pending`/`processing`/`published`/`failed`/`cancelled`), `attempts`, `error_message`, `instagram_post_id`. RLS por `client_id` (mismo patrón que el resto).
**Edge function:** `supabase/functions/process-scheduled-instagram/index.ts` (`verify_jwt = false`)
**Cron:** `process-scheduled-instagram` cada 5 min (migr `20260624170100`), invoca la function vía `pg_net` (mismo patrón que `chileautos-sync`).

Flujo:
1. Al programar, el front procesa+sube las fotos igual que al publicar (quedan listas en el bucket) e inserta una fila `pending` con `scheduled_at`.
2. El cron dispara `process-scheduled-instagram`, que toma las pendientes vencidas, las reclama atómicamente (`status pending→processing`) y publica reusando `publishToInstagram()` de `_shared/instagram-api.ts` (mismo flujo single/carrusel que on-demand).
3. Éxito → `published` + `instagram_post_id` (y se refleja en `vehicles.instagram_post_id`). Error → reintenta hasta 3 veces, luego `failed`.
4. El drawer lista las programadas del vehículo (pendientes/en curso/fallidas) y permite cancelar las pendientes.

> Deploy aparte: `supabase functions deploy process-scheduled-instagram` + aplicar las 2 migraciones (la del cron necesita `pg_cron` + `pg_net`). Secreto opcional `SCHEDULE_CRON_SECRET` para cerrar el endpoint (si se setea, hay que pasarlo también en el header del cron).

## WhatsApp

**Config:** `WhatsAppNotificationsConfig.tsx`

### Funcionalidades
- Notificaciones automáticas por triggers configurables:
  - Nuevo lead, nuevo contacto, mensaje de Instagram
  - Consulta de vehículo, solicitud de financiamiento, test drive
- Formato de número chileno
- Envío de notificación de prueba

## Mercado Pago

**Servicio:** `subscriptionService.ts`

### Funcionalidades
- Gestión de suscripciones SaaS
- Procesamiento de pagos recurrentes

## API de inventario (tab Desarrolladores)

API REST pública por tenant para que cada automotora consuma SU stock (web propia, partner, ERP).

**UI:** `src/components/configuration/developers/DevelopersConfig.tsx` (tab "Desarrolladores" en `Configuracion.tsx`) — muestra endpoints, genera/revoca API keys y un ejemplo curl.
**Tabla:** `tenant_api_keys` (migr `20260625130000`) — `client_id`, `label`, `key_prefix` (visible), `key_hash` (SHA-256, único), `last_used_at`, `revoked_at`. RLS por `client_id`. **Solo se guarda el hash**; el plaintext (`gak_live_<48 hex>`) se genera en el front con `crypto` y se muestra UNA vez.
**Edge function:** `supabase/functions/inventory-api/index.ts` (`verify_jwt=false`). Auth por header `x-api-key` (o `Authorization: Bearer`): hashea la key (SHA-256) → busca en `tenant_api_keys` no revocada → deriva el `client_id` (el caller NO lo elige). Actualiza `last_used_at`.

Rutas (acepta alias opcional `/v1`; el envelope trae `version: "1"`):
- `GET /functions/v1/inventory-api/vehicles` — lista paginada + filtros: `page`, `limit` (1–200 o `all`), `available_only` (default true = estados `show_in_web` o "Publicado", reusa la lógica de `get-vehicles-wordpress`), `brand_id`, `model_id`, `year_min`/`year_max` (alias `anio_*`), `price_min`/`price_max` (alias `precio_*`), filtros por nombre `marca`/`modelo`/`categoria`/`combustible` (ilike parcial vía embed `!inner`), `search` (ilike sanitizado en `description`/`label`), `sort` (`created_at`|`price`|`year`), `order` (`asc`|`desc`). **Para agentes AI** (pedido Nexor 2026-07-05): `view=compact` (solo datos comerciales: sin `galeria` —75% del payload—, sin `main_image_url`/`video_url`/timestamps y sin `patente` por ser dato personal) y `exclude=galeria` (vista completa sin fotos). Todas las respuestas 200 llevan `ETag` débil + soporte `If-None-Match` → `304`.
- `GET /functions/v1/inventory-api/vehicles/{id}` — detalle (scopeado al tenant de la key).

Payload **solo comercial** (NADA financiero: ni compra, ni márgenes, ni comisiones, ni consignación): marca, modelo, version, año, precio, km, transmisión, tracción, combustible, color, categoría, dueños, llaves, **sucursal** (etiqueta vía `dealershipLabel`, misma heurística que el website: name custom tal cual / autogenerado → comuna), patente, descripción, video, `main_image_url`, `galeria[]`, estado, disponible, timestamps. La vista `compact` omite patente/galería/media/timestamps.

**Documentación:** fuente única `public/openapi.yaml` (OpenAPI 3) → servida como estático en `/openapi.yaml`; docs interactivas con Redoc en `public/api-docs.html` (`/api-docs.html`). El tab Desarrolladores enlaza a `/api-docs.html` y muestra params + ejemplos curl/JS embebidos.

> Deploy aparte: aplicar migr `20260625130000` + `supabase functions deploy inventory-api` + deploy front (incluye la doc estática). **Decidido:** NO se cierra `get-vehicles-wordpress` (lo usan sitios WordPress externos; gocar NO usa ese endpoint, lee `vehicles` directo con anon key). **Fast-follow:** rate-limit por key. Fase 2: webhooks de cambios, escritura, scope financiero opcional.
