# Guía GoAutos (Mallorcautos) — modo Meme

## ⚡ Para DATOS: usa el CONECTOR, no el navegador
Los datos de GoAutos están en Supabase. Raspar la SPA es frágil (a veces no renderiza la
tabla). Para listar/contar/buscar autos y publicaciones, entra directo:
```bash
node ~/nexus/conector-goautos/goautos.mjs resumen        # total/publicados/sin publicar
node ~/nexus/conector-goautos/goautos.mjs publicaciones  # autos publicados
node ~/nexus/conector-goautos/goautos.mjs vehiculos --limite 30
node ~/nexus/conector-goautos/goautos.mjs buscar --texto "audi"
```
El navegador (abajo) queda SOLO para acciones que requieren la UI (publicar, subir fotos).

**Motor:** usar Google Chrome (NO Brave: Brave rompe esta página). Ya está configurado.

**URL BASE (única correcta):** `https://portal.goauto.cl`
- Login: `https://portal.goauto.cl/login` (sitio `goautos`, clave ya guardada).
- ❌ NO existen `goautos.cl`, `www.goautos.cl`, `app.goautos.cl` — esas URLs fallan. Usa SIEMPRE `portal.goauto.cl`.

**Es una SPA:** casi todo vive en `https://portal.goauto.cl/` y las secciones son **pestañas/menús** dentro de la misma página (la URL no cambia). Por eso, para moverte entre secciones haz **clic en el menú** (no navegues a sub-URLs inventadas) y luego `esperar` + `leer`/`leer_tabla`.

## Flujo para leer datos
1. `iniciar_sesion('goautos')` (idempotente: si ya hay sesión, sigue).
2. `navegar` a `https://portal.goauto.cl/` si no estás ahí.
3. `esperar` a que cargue (desaparece spinner / aparecen filas o cards).
4. Para una sección: `clic` en el ítem del menú lateral y `esperar`.
5. `leer_tabla` (tablas) o `leer_pagina` (texto/cards). Resume datos REALES.

## Secciones del menú (clic por texto)
- **Todos los vehículos** / **Propios** / **Consignados** — inventario de autos.
- **Alertas** — vehículos +90 días en stock, sin publicar, sin fotos, etc.
- **Leads** — leads sin contactar.
- **Mi rendimiento** — métricas del vendedor.
- Filtros arriba: **Comercial**, **Todos los vendedores**.

## Notas
- El dashboard de inicio (`/`) ya resume: nº de vehículos, alertas (en stock, sin publicar, sin fotos), leads sin contactar.
- Si una lista no cargó, `esperar` y reintenta una vez antes de rendirte (SPA).
