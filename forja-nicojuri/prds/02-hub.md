# Forja · 02 — Hub principal (Hub)

| Module | Phase | Status | Build wave |
|---|---|---|---|
| Core / Landing autenticado | Pantalla principal | ✅ En producción | 1 |

Source: `src/App.jsx` + `src/components/{Hero,StatsBar,AppCard,Header,ParticleCanvas}.jsx` + `src/data/apps.js`. Part of portal **La Forja · Nicojuri**.

## 1. Overview & context

El hub es la pantalla principal tras el login: un fondo de partículas, un header con navegación y acciones, un hero, una barra de estadísticas, y un grid de tarjetas de aplicaciones (`AppCard`) filtrado según los permisos del usuario.

- **Ruta lógica:** `view === 'hub'` (valor por defecto, `src/App.jsx:18`), render en `src/App.jsx:33-67`.
- **Quién la usa:** todo usuario autenticado. Admins ven el botón "Admin"; njuri/ramon ven además "Ramón".
- **Job-to-be-done:** "Quiero ver qué aplicaciones tengo disponibles y abrir la que necesito".
- **Muta datos:** no (read-only). Solo lee perfil/permisos y lanza apps.

## 2. Goals / Non-goals

**Goals**
- Mostrar solo las apps `live` permitidas para el usuario; apps `soon` siempre visibles.
- Exponer accesos a Admin / Mi Cuenta / Ramón según permisos.
- Lanzar apps externas (delegado a `AppCard`, ver PRD 03).

**Non-goals**
- No edita apps ni permisos (eso es el panel Admin, PRD 04).
- El catálogo de apps es estático (no viene de la base de datos).
- Las cifras del `StatsBar` son estáticas, no calculadas.

## 3. Entry points & navigation

- **Entrada:** tras login, `App` cae al render del hub (`src/App.jsx:33`).
- **Salidas (via `Header`, `src/components/Header.jsx`):**
  - "Ramón" → `setView('ramon')` (solo si `canAccessRamon`) (`App.jsx:24,41`; `Header.jsx:13-20`).
  - "Mi cuenta" → `setView('account')` (`App.jsx:40`; `Header.jsx:21-26`).
  - "Admin" → `setView('admin')` (solo si `isAdmin`) (`App.jsx:39`; `Header.jsx:27-34`).
  - "Cerrar sesión" → `logout()` (`App.jsx:42`; `Header.jsx:35-39`).
  - Links externos en `nav`: Ailnest y Aliace (`Header.jsx:8-10`).
- **Apps:** cada `AppCard` enlaza/lanza su app (PRD 03).

## 4. Screen anatomy

De arriba a abajo:

| Zona | Componente | Fuente |
|---|---|---|
| Fondo animado | `<ParticleCanvas />` | `App.jsx:35` |
| Header (logo, nav, acciones) | `<Header />` | `App.jsx:36-43` |
| Hero (badge + título + copy) | `<Hero />` | `App.jsx:46`, `Hero.jsx:1-15` |
| Stats bar (3 métricas) | `<StatsBar />` | `App.jsx:49`, `StatsBar.jsx:7-18` |
| Grid de apps | `.apps-grid#apps` con N `<AppCard />` | `App.jsx:52-58` |
| Footer | "Construido por Nicojuri … © 2026" | `App.jsx:61-65` |

**Hero (`Hero.jsx`):** badge "Suite de Aplicaciones", título "Herramientas inteligentes para tu negocio", subcopy.

**StatsBar (`StatsBar.jsx:1-5`) — valores hardcodeados:**

| num | label | color |
|---|---|---|
| 2 | Apps en vivo | var(--ailnest) |
| 2 | Próximamente | var(--bank) |
| 4 | Módulos totales | var(--sysplan) |

**Catálogo de apps (`src/data/apps.js`):**

| id | name | status | href | requiresForjaToken | icon / color |
|---|---|---|---|---|---|
| ailnest | Ailnest | live | https://ailnest.vercel.app/ | no | ✉️ / #00d4ff |
| aliace | Aliace | live | https://aliace-customer-portal.vercel.app/ | sí | 📊 / #00e676 |
| calculo | Plataforma Cálculo | live | https://plataformcalculate.vercel.app/ | sí | 🧮 / #ff8a65 |
| bank-portal | Bank Portal | soon | null | — | 🏦 / #ffc107 |
| system-plan | System Plan | soon | null | — | 🧭 / #b39ddb |

## 5. User flows & use cases

**Use case 1 — Usuario con permisos parciales.**
As a usuario regular, I want ver solo mis apps asignadas, so that no me confunda con apps que no puedo usar.
1. `usePermissions` carga `allowedAppIds` (array de `app_id`) (`App.jsx:17`).
2. `visibleApps` filtra: muestra la app si NO es `live`, o si `allowedAppIds === null` (admin/sin perfil), o si está en `allowedAppIds` (`App.jsx:29-31`).
3. Las apps `soon` siempre aparecen (no son `live`).

**Use case 2 — Admin.**
As a admin, I want ver todas las apps, so that pueda probar/abrir cualquiera.
1. `usePermissions` devuelve `allowedAppIds === null` para admins (`usePermissions.js:35-37`) → no se filtra nada.

**Use case 3 — Lanzar una app.** Delegado a `AppCard` (PRD 03).

**Estados vacíos / variaciones**
- Mientras `permsLoading`, el grid no se renderiza (`null`) — el header/hero/stats sí (`App.jsx:52`).
- Si el usuario no tiene ninguna app `live` permitida, solo verá las apps `soon`.

## 6. Business rules, constants & formulas

| Rule | Definition | Source |
|---|---|---|
| Filtro de visibilidad | `status !== 'live' \|\| allowedAppIds === null \|\| allowedAppIds.includes(id)` | `App.jsx:29-31` |
| Apps "soon" siempre visibles | No son `live`, pasan el primer OR | `App.jsx:30` |
| Animación escalonada de cards | `animationDelay = 0.1 + index*0.1 s` | `AppCard.jsx:55` |
| Stats estáticos | 2 / 2 / 4 hardcodeados | `StatsBar.jsx:1-5` |
| Footer year | 2026 hardcodeado | `App.jsx:63` |

**Stub flag:** el `StatsBar` muestra "2 / 2 / 4" hardcodeado; no se deriva de `apps.js` (aunque hoy coincide: 3 live, 2 soon — nota: en realidad hay **3** apps `live` y **2** `soon`, el "2 apps en vivo" está desactualizado).

## 7. Data model

- `apps`: array de objetos `{ id, name, description, icon, color, href, status, requiresForjaToken? }` (`src/data/apps.js`).
- Lecturas Supabase vía `usePermissions`: `forja_profiles` y `forja_permissions` (ver PRD 04 §7).

## 8. State management

- `view` (`useState('hub')`, `App.jsx:18`): router local.
- `useAuth()` → `authed, user, loading` (`App.jsx:16`).
- `usePermissions(user.id, user.email)` → `isAdmin, allowedAppIds, loading` (`App.jsx:17`).
- `visibleApps` recomputado en cada render (sin `useMemo`) (`App.jsx:29`).
- `canAccessRamon(user.email)` evaluado para mostrar botón/render Ramón (`App.jsx:24,38`).

## 9. Edge cases & empty/error states

- **Perfil no carga (RLS/error):** `usePermissions` deja `profile === null` → `allowedAppIds === null` → se muestran todas las apps (fail-open) (`usePermissions.js:35`).
- **`permsLoading`:** grid oculto temporalmente, evita flicker de apps no permitidas.
- **App sin `href` y `live`:** no aplica hoy (live tienen href); `AppCard` para `soon` renderiza `div` sin enlace.

## 10. Open items / future work

- `StatsBar` desincronizado con `apps.js` (dice 2 live, hay 3) — debería derivarse del catálogo.
- Catálogo de apps estático: migrar a tabla Supabase permitiría altas sin deploy.
- `visibleApps` podría memoizarse.
