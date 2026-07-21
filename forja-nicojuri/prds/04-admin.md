# Forja · 04 — Panel de Administración (Admin)

| Module | Phase | Status | Build wave |
|---|---|---|---|
| Administración / Gestión de usuarios | Backoffice | ✅ En producción | 3 |

Source: `src/components/admin/{AdminPanel,UsersManager,ProfileSettings}.jsx` + `src/auth/usePermissions.js`. Part of portal **La Forja · Nicojuri**.

## 1. Overview & context

Panel de backoffice (overlay a pantalla completa) accesible solo a administradores. Tiene dos pestañas: **Mi Perfil** (reutiliza `ProfileSettings`, ver también PRD 05) y **Usuarios** (`UsersManager`): listar, crear, editar, activar/desactivar usuarios y asignarles acceso por aplicación, con permisos granulares para Aliace (vendedor, zona, tipo de cliente, clientes específicos).

- **Ruta lógica:** `view === 'admin'` (`src/App.jsx:22`).
- **Quién la usa:** admins (`isAdmin === true`).
- **Job-to-be-done:** "Quiero dar de alta usuarios y controlar a qué apps y datos acceden".
- **Muta datos:** sí — crea usuarios en Supabase Auth y escribe en `forja_profiles` y `forja_permissions`.

## 2. Goals / Non-goals

**Goals**
- Listar usuarios con rol `user`, su estado y sus apps asignadas.
- Crear usuario (Auth signUp + perfil) y asignar permisos por app.
- Editar nombre y permisos; activar/desactivar.
- Permisos finos en Aliace: acceso completo o vista personalizada (vendedor/zona/tipo/clientes).

**Non-goals**
- No gestiona otros admins (la lista filtra `role = 'user'`, `UsersManager.jsx:42`).
- No borra usuarios (solo activa/desactiva).
- No cambia la contraseña de otros usuarios (solo se fija al crear).

## 3. Entry points & navigation

- **Entrada:** botón "Admin" del header (visible si `isAdmin`) → `setView('admin')` (`src/App.jsx:39`; `Header.jsx:27-34`).
- **Tabs internas:** "Mi Perfil" / "Usuarios" (`AdminPanel.jsx:16-23`).
- **Salida:** "← Volver al hub" → `onClose` → `setView('hub')` (`AdminPanel.jsx:25-27`; `App.jsx:22`).
- **Sub-modal:** `UserModal` para crear/editar (`UsersManager.jsx:111`).

## 4. Screen anatomy

**AdminPanel (`AdminPanel.jsx:8-35`):** overlay → topbar (logo "Forja · Admin", tabs, botón volver) → body con `ProfileSettings` o `UsersManager`.

**UsersManager — lista (`UsersManager.jsx:66-113`):**

| Elemento | Detalle | Fuente |
|---|---|---|
| Header sección + "+ Nuevo usuario" | abre modal en modo creación | `UsersManager.jsx:68-72` |
| Estado loading | "Cargando..." | `UsersManager.jsx:75` |
| Estado vacío | "No hay usuarios… / Crear primer usuario" | `UsersManager.jsx:76-80` |
| Card de usuario | nombre, email, tags de apps, acciones | `UsersManager.jsx:83-107` |
| Tag de app | nombre de la app; si es `aliace`, resumen de filtros | `UsersManager.jsx:92-96` |
| Acciones | "Editar", "Desactivar/Activar" | `UsersManager.jsx:101-104` |

**UserModal (`UsersManager.jsx:128-414`):** Nombre, Correo (deshabilitado en edición), Contraseña (solo creación), checks de apps live, y si se marca Aliace, el bloque de permisos (toggle Completo/Personalizar) con selects de vendedor/zona, checks de tipos de cliente, y buscador de clientes específicos.

## 5. User flows & use cases

**Use case 1 — Crear usuario nuevo.**
As a admin, I want crear una cuenta y asignar apps, so that el usuario entre con sus permisos.
1. "+ Nuevo usuario" → `UserModal` en modo creación (`UsersManager.jsx:70`).
2. Rellena nombre, correo, contraseña (min 6), marca apps (`UsersManager.jsx:282-309`).
3. `handleSave`: `getTempClient().auth.signUp({email,password})` con cliente Supabase **separado** que no persiste sesión (`UsersManager.jsx:236`, `9-16`) para no desloguear al admin.
4. Inserta perfil `{id, name, email, role:'user'}` en `forja_profiles` (`UsersManager.jsx:247-248`).
5. Borra permisos previos e inserta filas en `forja_permissions` (una por app; `aliace_filters` si aplica) (`UsersManager.jsx:255-265`).

**Use case 2 — Correo ya registrado.**
As a admin, I want reusar una cuenta existente, so that no falle el alta.
1. Si `signUp` devuelve "User already registered", busca el perfil por email; si existe, usa su `id` y actualiza nombre; si no, pide buscarlo en la lista (`UsersManager.jsx:238-244`).

**Use case 3 — Editar permisos / Aliace personalizado.**
As a admin, I want limitar la vista de Aliace de un usuario, so that solo vea sus datos.
1. "Editar" → modal precargado con permisos y filtros existentes (`UsersManager.jsx:130-147`).
2. Modo "Personalizar vista": elige vendedor, zona, tipos de cliente, y/o clientes específicos (`UsersManager.jsx:322-398`).
3. `buildAliaceFilters` arma el JSON `{vendedor, vendedor_nombre, mercado, tipoCliente[], clients[]}` (`UsersManager.jsx:216-227`).
4. Guarda como `aliace_filters` en la fila de permiso de `aliace` (`UsersManager.jsx:257-259`).

**Use case 4 — Activar/Desactivar.** Toggle de `is_active` en `forja_profiles` (`UsersManager.jsx:59-62`).

**Estados vacíos:** sin usuarios → CTA "Crear primer usuario" (`UsersManager.jsx:76-80`); usuario sin permisos → tag "Sin acceso" (`UsersManager.jsx:91`).

## 6. Business rules, constants & formulas

| Rule | Definition | Source |
|---|---|---|
| Quién es admin | `profile.role === 'admin'` **o** email en `ADMIN_EMAILS` | `usePermissions.js:31-32` |
| `ADMIN_EMAILS` | `['njuri@dropout.cl','ramon@dropout.cl']` | `usePermissions.js:31` |
| Lista muestra solo `user` | `.eq('role','user')` | `UsersManager.jsx:42` |
| Apps asignables | solo `status === 'live'` (`LIVE_APPS`) | `UsersManager.jsx:30` |
| Contraseña mínima | 6 caracteres | `UsersManager.jsx:295` |
| Permisos = borrar+reinsertar | delete by `user_id` luego insert | `UsersManager.jsx:255-263` |
| Búsqueda de clientes | debounce 300 ms, min 2 chars, limit 20 | `UsersManager.jsx:203,207,212-213` |
| Filtro de tipos | excluye vacíos y `'nan'` | `UsersManager.jsx:178-179` |
| Resumen Aliace | `describeAliaceFilters` | `UsersManager.jsx:116-124` |

**Stub flags / hardcodes:**
- **Fallback admin por email** (`ADMIN_EMAILS`, `usePermissions.js:31`): si RLS bloquea leer el perfil, estos correos siguen siendo admin. Hardcode.
- **Credenciales fallback de Aliace** (`UsersManager.jsx:18-21`): `_ALIACE_URL` y `_ALIACE_KEY` con valores literales (URL `mdrvhekhimhcwydrpueo.supabase.co` + anon key JWT) usados si faltan las env vars. Hardcode de credenciales para no depender del build env (ver commits 173a6ba/174a6ba).
- **`getTempClient`**: cliente Supabase aparte con `persistSession:false`, `storageKey:'_fj_tmp'` para crear usuarios sin pisar la sesión del admin (`UsersManager.jsx:9-16`).

## 7. Data model

**`forja_profiles`** (`grant_admin_ramon.sql:5`; RLS `setup_ramon_avance.sql:48-57`):
| Columna | Tipo | Notas |
|---|---|---|
| id | uuid | = `auth.users.id` |
| name | text | nombre completo |
| email | text | correo |
| role | text | `'admin'` \| `'user'` |
| is_active | bool | activación |
| created_at | timestamptz | |

**`forja_permissions`** (`grant_admin_ramon.sql:12`):
| Columna | Tipo | Notas |
|---|---|---|
| user_id | uuid | FK a usuario |
| app_id | text | id de app (`apps.js`) |
| aliace_filters | jsonb/null | `{vendedor, vendedor_nombre, mercado, tipoCliente[], clients[]}` o null = acceso completo |

**Aliace (BD externa, lectura)** vía `getAliaceClient`: tablas `profiles(id,name,lastname)`, `clients(zone,aux_category,name,tax_id,is_active)` (`UsersManager.jsx:168-170,208-209`).

## 8. State management

- `AdminPanel`: `tab` (`'perfil'|'usuarios'`) (`AdminPanel.jsx:6`).
- `UsersManager`: `users, loading, showModal, editingUser`; `loadUsers` con `useCallback` (`UsersManager.jsx:33-57`).
- Clientes Supabase cacheados a nivel módulo: `_tempClient`, `_aliaceClient` (`UsersManager.jsx:6-7`).
- `UserModal`: estado extenso — `name,email,password,selectedApps(Set)`, modo y selección de Aliace, `opts` (vendedores/zonas/tipos), búsqueda de clientes con `searchTimer` ref, `saving,err` (`UsersManager.jsx:132-160`). Carga opciones de Aliace al montar el modal (`UsersManager.jsx:163-183`).

## 9. Edge cases & empty/error states

- **RLS bloquea perfil:** `isAdmin` cae al fallback de email; `allowedAppIds = null` → ve todo (`usePermissions.js:32-37`).
- **Aliace opts no cargan:** `optsLoading` → "Cargando opciones de Aliace..."; si falla, queda vacío (`UsersManager.jsx:324`).
- **Errores de Supabase:** mostrados en `ap-msg err` y abortan el guardado (`UsersManager.jsx:243,244,249,264`).
- **Correo duplicado sin perfil:** mensaje "Correo ya registrado. Búscalo en la lista." (`UsersManager.jsx:243`).

## 10. Open items / future work

- Mover credenciales de Aliace a env vars y quitar el hardcode (`UsersManager.jsx:18-21`).
- No hay borrado de usuarios ni gestión de otros admins desde UI.
- El email del usuario está deshabilitado en edición; cambiarlo requiere otro flujo.
- El reset contraseña de un usuario por el admin no existe.
