# SEO & Datos Estructurados — Técnico

Cómo el SEO configurado en el admin llega al sitio público (`website-gocar`) y cómo se generan los datos estructurados (schema.org / JSON-LD) por tenant.

## Modelo de datos (tabla `clients`)
- `clients.seo` (JSONB):
  - `title`, `description`, `keywords[]` — meta tags del home.
  - `google_site_verification` — código de Search Console **por tenant** (antes había un token hardcodeado compartido en el website; ahora es por cliente).
  - `social_links` — mapa `{ instagram, facebook, tiktok, youtube }` → `sameAs` del AutoDealer. Se guarda dentro de `seo` (no requiere columna nueva ni cambio en el middleware del website).
- `clients.contact` (JSONB): `{ email, phone, address }` → NAP del AutoDealer / `Offer`.
- `clients.location` (JSONB): `{ lat, lng }` → `geo`.
- `clients.currency` → `priceCurrency` de las ofertas.
- `dealerships.opening_hours` (JSONB, **migración** `20260610120000_add_opening_hours_to_dealerships.sql`): `{ monday: { open, close } | { closed: true }, ... }` (claves de día en inglés) → `openingHoursSpecification`.

## Dónde se edita (admin)
- **Configuración → Sitio Web**: `GeneralConfig.tsx` + `useGeneralConfig.ts`. Persiste vía `ClientService.updateClient` (reconstruye el objeto `seo` completo: agregar ahí cualquier clave nueva). Botón "Generar con GAIA" → edge function `generate-seo` (GPT-4o).
- **Configuración → Sucursales**: `DealershipDialog.tsx` (editor de horarios) + `DealershipsConfig.tsx` (el transform debe incluir `opening_hours` para que llegue al diálogo).

## Flujo hacia el sitio público (`website-gocar`)
1. `src/middleware.ts` resuelve el tenant por `domain` **o** `custom_domain` y serializa el cliente (incluyendo `seo, contact, location, currency`) en el header `x-client-data`.
2. `getClient()` lo parsea; `layout.tsx#generateMetadata` arma meta/OG/twitter y la verificación de Google por cliente.
3. Datos estructurados: `src/lib/structured-data.ts` (builders puros) + `src/components/seo/JsonLd.tsx` (emisor):
   - **Home** (`layout.tsx`): `AutoDealer` (NAP, geo, horarios, sameAs) + `WebSite`.
   - **Vehículo** (`vehicles/[id]/page.tsx`): `Car` + `Offer` + `BreadcrumbList`. Usa `getVehicleById` cacheado con `cache()`.
4. `sitemap.ts`: resuelve por domain/custom_domain, lista vehículos **visibles** (`clients_vehicles_states.show_in_web`, excluyendo Vendido/Reservado) + páginas custom publicadas + páginas estáticas. `robots.ts` apunta al sitemap del host.

> Nota: las redes (`sameAs`) viven en `clients.seo.social_links`. Si en el futuro se mueven a una columna propia, hay que agregarla al `select` del middleware **con cuidado** (si la columna no existe, el query falla y el middleware redirige todo a /404).
