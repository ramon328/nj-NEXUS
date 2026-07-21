# La Forja · Nicojuri — PRD Roadmap

Documentación de producto (PRD) del portal **La Forja**, un hub de aplicaciones empresariales construido en **React 18 + Vite 5 + Supabase** (Auth + Postgres con RLS).

El portal autentica al usuario contra Supabase Auth, muestra un grid de apps filtrado por permisos por usuario, y lanza apps externas pasando un token de sesión cross-domain (`?forja_token=`). Incluye un panel de administración de usuarios/permisos, un panel "Mi Cuenta" para todos los usuarios, y un apartado privado "Ramón" (calendario universitario + tablero de avance estilo Trello).

## Stack & entrypoints

| Pieza | Detalle |
|---|---|
| Bundler | Vite 5 (`package.json:8`) |
| UI | React 18 + StrictMode (`src/main.jsx:6-10`) |
| Backend | Supabase JS v2 (`src/auth/supabase.js:3-6`) |
| Root component | `src/App.jsx:15` (router por `view` state) |
| Datos de apps | `src/data/apps.js:1-49` |
| Env vars | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_FORJA_URL`, `VITE_ALIACE_SUPABASE_URL`, `VITE_ALIACE_SUPABASE_ANON_KEY` |
| Proyecto Supabase Forja | `ydcpsihovvaefyobnhws.supabase.co` (`supabase/setup_ramon_avance.sql:4`) |

## Roadmap

| # | Módulo | Fase | Status | Build wave | Archivo |
|---|---|---|---|---|---|
| 01 | Login (Supabase Auth) | Acceso | ✅ En producción | 1 | [01-login.md](01-login.md) |
| 02 | Hub principal (grid de apps) | Core | ✅ En producción | 1 | [02-hub.md](02-hub.md) |
| 03 | App Launcher (`forja_token`) | Core | ✅ En producción | 2 | [03-app-launcher.md](03-app-launcher.md) |
| 04 | Admin (usuarios + permisos) | Administración | ✅ En producción | 3 | [04-admin.md](04-admin.md) |
| 05 | Mi Cuenta | Administración | ✅ En producción | 4 | [05-cuenta.md](05-cuenta.md) |
| 06 | Ramón (calendario + avance) | Privado | ✅ En producción | 5 | [06-ramon.md](06-ramon.md) |

## Navegación interna (state-router)

El "routing" es por estado local `view` en `src/App.jsx:18` (`'hub' | 'admin' | 'account' | 'ramon'`), sin React Router. Cada vista se renderiza como early-return antes del hub (`src/App.jsx:22-26`).

## Tablas Supabase

| Tabla | Usada por | Definición |
|---|---|---|
| `forja_profiles` | usePermissions, UsersManager, ProfileSettings | `supabase/grant_admin_ramon.sql:5`, RLS en `supabase/setup_ramon_avance.sql:48-57` |
| `forja_permissions` | usePermissions, UsersManager | `supabase/grant_admin_ramon.sql:12` |
| `forja_projects` | ProjectsBoard | `supabase/setup_ramon_avance.sql:8-14` |
| `forja_cards` | KanbanBoard | `supabase/setup_ramon_avance.sql:17-25` |

## Stub flags / hardcodes a revisar (ver PRDs)

- `ADMIN_EMAILS = ['njuri@dropout.cl', 'ramon@dropout.cl']` fallback admin por email (`src/auth/usePermissions.js:31`).
- `RAMON_ACCESS_EMAILS = ['njuri@dropout.cl', 'ramon@dropout.cl']` gate del apartado Ramón (`src/components/ramon/RamonSection.jsx:6`).
- Credenciales fallback de Aliace hardcodeadas (`src/components/admin/UsersManager.jsx:18-21`).
- `src/auth/shield.js` exporta `vE`/`vP` (email/clave ofuscados por XOR) — **dead code**, no se importa en ningún lado.
- Horario universitario de Ramón hardcodeado (`src/components/ramon/RamonCalendar.jsx:3-63`).
