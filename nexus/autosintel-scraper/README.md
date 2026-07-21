# Autos Intel — Scraper (backend)

Scraper en Python que recolecta avisos de autos usados en Chile (ChileAutos,
MercadoLibre, Yapo y **Linze**) y los escribe en Supabase. Diseñado para correr en
**GitHub Actions** por cron, o **en tu computador local en segundo plano** (ver
[`scheduler/`](scheduler/README.md)), sin servidor propio.

El frontend (dashboard) vive en otro repo y lee de la misma Supabase.

## Cómo funciona

`python -m scraper.main` corre **una vez y termina**:
1. Lee los perfiles activos de la tabla `search_profiles` en Supabase.
2. Por cada fuente/marca pagina los avisos (con throttling).
3. Hace upsert en la tabla `listings` (sin duplicar, por `source,source_listing_id`).
4. **Registra el historial de precios** en `price_history` (ver abajo).
5. Registra la corrida en `scrape_runs`.

## Historial de precios y bajadas (`price_history`)

En cada corrida, antes de pisar el precio actual de un aviso, el motor compara el precio
nuevo con el anterior y **appendea** (nunca pisa) una fila en `price_history`:

- **Primera vez** que vemos un aviso → una fila *baseline* con su precio inicial (sin delta).
  Esto siembra el timeline para todos los avisos ya existentes en la primera corrida.
- **El precio cambió** → una fila con `delta_clp` y `delta_pct` (cambio en CLP y en %).
- **Sin cambio** → no se appendea nada (evita filas duplicadas por corrida y mantiene el
  timeline limpio; el delta solo tiene sentido cuando hay un cambio real).

Una **bajada de precio** es, por definición, una fila con `delta_clp < 0`. El frontend la
muestra como alerta (auto, precio anterior, precio nuevo, % de bajada). El log de cada corrida
reporta `hist_precio=N bajadas=M`.

> Columnas usadas de `price_history`: `listing_id` (= `source_listing_id`), `price_clp`,
> `mileage_km`, `captured_at`, `delta_clp`, `delta_pct`. La detección es *best-effort*: si
> falla, nunca tumba la corrida principal de scraping.

**Sembrar el baseline del inventario existente** (una sola vez, sin esperar a recorrer todo):

```bash
python -m scraper.backfill_price_history
```

Inserta un punto inicial en `price_history` por cada aviso activo que aún no tenga historial.
Es idempotente (salta los que ya tienen). Útil para arrancar el timeline de golpe.

Sin dependencias pesadas: solo `requests` + `urllib` (stdlib). ChileAutos usa
`curl` (preinstalado en los runners de Ubuntu).

## Dejarlo corriendo en GitHub Actions

1. **Sube este repo a GitHub** (Publish).
2. En el repo: **Settings → Secrets and variables → Actions → New repository secret**, crea:
   | Secret | Valor |
   |---|---|
   | `SUPABASE_URL` | `https://ydcpsihovvaefyobnhws.supabase.co` |
   | `SUPABASE_SERVICE_KEY` | tu **service_role** key de Supabase (Settings → API) |
3. ¡Listo! El workflow `.github/workflows/scrape.yml` corre solo:
   - **Cron**: ~09:00 y ~21:00 hora Chile (ver nota de zona horaria abajo).
   - **Manual**: pestaña **Actions → Scrape autos → Run workflow** (puedes elegir un
     solo sitio o limitar páginas para probar).

### Nota de zona horaria
El cron de GitHub es en **UTC** y no ajusta horario de verano. Los horarios están
calculados sobre UTC−4 (invierno chileno). En verano (DST, UTC−3) correrán ~1h más
tarde. Si quieres exactitud, edita los `cron:` en `scrape.yml`.

## Correr localmente

```bash
cp .env.example .env          # y pon tu SUPABASE_SERVICE_KEY
pip install -r requirements.txt

python -m scraper.main                 # todos los sitios, una corrida
python -m scraper.main --source yapo   # solo un sitio
python -m scraper.main --source linze  # solo Linze
python -m scraper.main --max-pages 2   # límite de páginas (debug)
```

## Dejarlo corriendo en tu computador (segundo plano, silencioso)

Para que el scraper corra solo **en tu máquina local** dos veces al día, a un
**minuto aleatorio** dentro de las ventanas 09:00–10:00 y 21:00–22:00 (sin ventana
de terminal, con log, y un toggle para activar/desactivar):

```bash
./scheduler/ctl.sh install     # macOS (launchd) / Linux (cron)
./scheduler/ctl.sh status
```

Windows usa `scheduler/windows/Install-Scheduler.ps1`. Todos los detalles en
[`scheduler/README.md`](scheduler/README.md).

## Estructura

```
scraper/
  main.py          # entry point (CLI)
  engine.py        # motor: perfiles → fuentes → marcas → páginas → upsert
  db.py            # cliente Supabase REST (urllib, sin deps)
  models.py        # Listing, SearchProfile, ScrapeRun, RawPage
  adapters/
    base.py        # protocolo SiteAdapter
    chileautos.py  # (usa curl)
    mercadolibre.py
    yapo.py
    linze.py       # Linze (linze.cl) — usa curl + payload RSC de Next.js
scheduler/         # agendador local en segundo plano (launchd / cron / Task Scheduler)
sql/               # migraciones SQL validadas contra la estructura de Supabase
.github/workflows/scrape.yml   # cron + run manual
```

### Fuentes (`source`)

`chileautos` · `mercadolibre` · `yapo` · `linze`. La columna `listings.source` es
un enum (`public.source_site`); agregar una fuente requiere `ALTER TYPE ... ADD VALUE`
(ver `sql/2026-06-10_add_linze_source.sql`). Una vez agregado el valor, la fuente
fluye por el **mismo** upsert, el **mismo** `price_history` y la **misma**
reconciliación de vendidos que el resto.

> Seguridad: la `service_role` key **nunca** va en el código — solo como Secret en
> GitHub (o en tu `.env` local, que está en `.gitignore`).
