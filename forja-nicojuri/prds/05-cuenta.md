# Forja · 05 — Mi Cuenta (Cuenta)

| Module | Phase | Status | Build wave |
|---|---|---|---|
| Administración / Self-service | Perfil de usuario | ✅ En producción | 4 |

Source: `src/components/account/AccountPanel.jsx` + `src/components/admin/ProfileSettings.jsx`. Part of portal **La Forja · Nicojuri**.

## 1. Overview & context

Panel "Mi Cuenta" disponible para **cualquier** usuario autenticado (no solo admins). Permite editar el nombre, el correo y la contraseña de la propia cuenta. Reutiliza el componente `ProfileSettings` (el mismo de la pestaña "Mi Perfil" del Admin), envuelto en un overlay propio.

- **Ruta lógica:** `view === 'account'` (`src/App.jsx:23`).
- **Quién la usa:** todos los usuarios autenticados — incluidas las cuentas creadas por Nicolás (comentario en `AccountPanel.jsx:3-4`).
- **Job-to-be-done:** "Quiero cambiar mi nombre o mi contraseña sin pedírselo al admin".
- **Muta datos:** sí — actualiza Supabase Auth (email/password) y la fila propia de `forja_profiles`.

## 2. Goals / Non-goals

**Goals**
- Editar nombre propio (en `forja_profiles`).
- Cambiar correo y/o contraseña (en Supabase Auth).
- Self-service sin privilegios de admin.

**Non-goals**
- No gestiona permisos ni apps (eso es Admin, PRD 04).
- No edita otras cuentas.
- No requiere contraseña actual para confirmar el cambio.

## 3. Entry points & navigation

- **Entrada:** botón "Mi cuenta" del header (siempre visible) → `setView('account')` (`src/App.jsx:40`; `Header.jsx:21-26`).
- **Salida:** "← Volver al hub" → `onClose` → `setView('hub')` (`AccountPanel.jsx:14-16`; `App.jsx:23`).

## 4. Screen anatomy

**AccountPanel (`AccountPanel.jsx:5-23`):** overlay → topbar (logo "Forja · Mi Cuenta" + botón volver) → body con `<ProfileSettings user={user} />`.

**ProfileSettings (`ProfileSettings.jsx:50-84`):**

| Campo | Detalle | Fuente |
|---|---|---|
| Nombre | input, precargado desde `forja_profiles` | `ProfileSettings.jsx:54-57,12-16` |
| Correo | input email, precargado de `user.email` | `ProfileSettings.jsx:58-61` |
| Nueva contraseña | input password (opcional) | `ProfileSettings.jsx:67-70` |
| Confirmar contraseña | input password | `ProfileSettings.jsx:71-74` |
| Mensaje ok/err | `ap-msg` | `ProfileSettings.jsx:77` |
| Botón | "Guardar cambios" / "Guardando..." | `ProfileSettings.jsx:79-81` |

## 5. User flows & use cases

**Use case 1 — Cambiar nombre.**
As a usuario, I want actualizar mi nombre, so that aparezca correcto en el sistema.
1. Al abrir, se precarga el nombre desde `forja_profiles` (`ProfileSettings.jsx:12-16`).
2. Editar y "Guardar cambios" → update de `{name, email}` en `forja_profiles` filtrado por `id` (`ProfileSettings.jsx:36-39`).

**Use case 2 — Cambiar contraseña.**
As a usuario, I want cambiar mi clave, so that mantenga mi cuenta segura.
1. Escribe nueva + confirmar. Si no coinciden → error "Las contraseñas no coinciden" y aborta (`ProfileSettings.jsx:20-23`).
2. Si coinciden, arma `authUpdates.password` y llama `supabase.auth.updateUser` (`ProfileSettings.jsx:29-34`).
3. Tras éxito, limpia los campos de contraseña (`ProfileSettings.jsx:44-45`).

**Use case 3 — Cambiar correo.**
1. Si `email !== user.email`, se incluye en `authUpdates.email` (`ProfileSettings.jsx:28`) → `updateUser` (Supabase puede requerir confirmación por correo) + update del perfil.

**Variaciones / estados vacíos**
- Campos de contraseña vacíos = "no modificar" (hint explícito) (`ProfileSettings.jsx:64`).
- Mensaje de éxito: "Cambios guardados correctamente" (`ProfileSettings.jsx:43`).

## 6. Business rules, constants & formulas

| Rule | Definition | Source |
|---|---|---|
| Acceso universal | botón "Mi cuenta" siempre visible | `Header.jsx:21-26` |
| Contraseña opcional | vacío = no cambia | `ProfileSettings.jsx:29,64` |
| Validación de match | `newPass !== confirmPass` → error | `ProfileSettings.jsx:20-23` |
| Auth update condicional | solo si cambió email o hay newPass | `ProfileSettings.jsx:27-31` |
| Update de perfil | `update({name,email}).eq('id', user.id)` | `ProfileSettings.jsx:36-39` |

**Dependencia RLS:** para que un usuario lea/edite su propio perfil deben existir las policies `own_profile_select` / `own_profile_update` (`supabase/setup_ramon_avance.sql:48-57`).

## 7. Data model

- Supabase Auth: `updateUser({ email?, password? })`.
- `forja_profiles`: lee `name` (`ProfileSettings.jsx:14`), escribe `{name, email}` para `id = user.id` (`ProfileSettings.jsx:37`). Columnas: ver PRD 04 §7.

## 8. State management

- `AccountPanel`: sin estado propio; pasa `user`/`onClose` (`AccountPanel.jsx:5`).
- `ProfileSettings`: `name, email, newPass, confirmPass, msg, saving` (`ProfileSettings.jsx:5-10`); efecto que precarga el nombre por `user.id` (`ProfileSettings.jsx:12-16`).

## 9. Edge cases & empty/error states

- **Contraseñas no coinciden:** error inline, no llama a Supabase.
- **Error de Auth/perfil:** mensaje `err` con `error.message`, no continúa (`ProfileSettings.jsx:33,41`).
- **RLS faltante:** sin las policies de perfil propio, el precargado del nombre y el update fallan silenciosamente / con error.
- **Cambio de email:** puede quedar pendiente de confirmación según config de Supabase (no se refleja en UI).

## 10. Open items / future work

- No pide la contraseña actual para confirmar cambios (riesgo si la sesión queda abierta).
- El cambio de email no avisa de la posible verificación pendiente.
- `AccountPanel` y la pestaña "Mi Perfil" del Admin comparten `ProfileSettings`; cualquier cambio afecta a ambos.
