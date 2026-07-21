# Forja · 01 — Pantalla de Login (Login)

| Module | Phase | Status | Build wave |
|---|---|---|---|
| Acceso / Autenticación | Gate de entrada | ✅ En producción | 1 |

Source: `src/components/LoginScreen.jsx`. Part of portal **La Forja · Nicojuri**.

## 1. Overview & context

Pantalla de bloqueo (overlay a pantalla completa) que se muestra a cualquier visitante no autenticado. Es lo primero que renderiza la app: mientras Supabase resuelve la sesión se muestra un loader vacío, y si no hay sesión se monta `LoginScreen` (`src/App.jsx:20-21`).

- **Ruta lógica:** vista por defecto cuando `authed === false`. No hay URL; es un early-return en `App`.
- **Quién la usa:** todos los usuarios (admins njuri/ramon, y usuarios creados por el admin).
- **Job-to-be-done:** "Quiero identificarme con mi correo y contraseña para entrar al hub de aplicaciones".
- **Muta datos:** sí, indirectamente — crea una sesión de Supabase Auth (token + refresh en localStorage). No escribe en tablas de negocio.

## 2. Goals / Non-goals

**Goals**
- Autenticar contra Supabase Auth con email + contraseña.
- Dar feedback inmediato de error (mensaje + animación `shake`).
- Enfoque automático del campo correo al montar.

**Non-goals**
- No hay registro/sign-up público (los usuarios los crea el admin, ver PRD 04).
- No hay "olvidé mi contraseña" ni magic link.
- No hay OAuth/SSO de terceros.
- No valida formato de correo más allá del `type="email"` del navegador.

## 3. Entry points & navigation

- **Entrada:** `src/App.jsx:21` → `if (!authed) return <LoginScreen onLogin={login} />`.
- **`onLogin`** es `login` de `useAuth` (`src/App.jsx:16`, `src/auth/useAuth.js:26-30`).
- **Salida (éxito):** `onAuthStateChange` (`src/auth/useAuth.js:18-21`) actualiza `authed → true` y `App` re-renderiza el hub (PRD 02). El componente no navega explícitamente.
- **Salida (error):** se queda en la pantalla mostrando el mensaje.

## 4. Screen anatomy

De arriba a abajo (`src/components/LoginScreen.jsx:23-66`):

| Zona | Elemento | Fuente |
|---|---|---|
| Overlay | `div.login-overlay` | `LoginScreen.jsx:24` |
| Card | `div.login-card` (+ clase `shake` en error) | `LoginScreen.jsx:25` |
| Logo | "Forja · Nicojuri" | `LoginScreen.jsx:26-28` |
| Subtítulo | "Acceso restringido — identificación requerida" | `LoginScreen.jsx:29` |
| Campo Correo | `input[type=email]` con `ref` autofocus | `LoginScreen.jsx:32-43` |
| Campo Contraseña | `input[type=password]`, `autoComplete="new-password"` | `LoginScreen.jsx:45-54` |
| Error | `p.login-err` (solo si `err`) | `LoginScreen.jsx:56` |
| Botón | "Ingresar" + flecha SVG | `LoginScreen.jsx:58-63` |

## 5. User flows & use cases

**Use case 1 — Login correcto.**
As a usuario, I want ingresar mi correo y contraseña, so that pueda acceder al hub.
1. Escribe correo → `setEmail` y limpia error (`LoginScreen.jsx:38`).
2. Escribe contraseña → `setPass` y limpia error (`LoginScreen.jsx:50`).
3. Submit → `onLogin(email, pass)` → `supabase.auth.signInWithPassword` (`useAuth.js:27`).
4. Si retorna `true`, no hay rama de error; `onAuthStateChange` monta el hub.

**Use case 2 — Credenciales incorrectas.**
As a usuario, I want ver por qué no entré, so that pueda corregir.
1. `signInWithPassword` devuelve `error` → `login` retorna `error.message` (`useAuth.js:28`).
2. `handleSubmit` ve `result !== true`: muestra `err` (o "Credenciales incorrectas"), activa `shake`, vacía contraseña, y desactiva el shake a los 600 ms (`LoginScreen.jsx:15-20`).

**Variaciones / estados vacíos**
- Al cargar la app, antes de resolver sesión: `App` muestra `<div className="auth-loading" />` (no es esta pantalla) (`src/App.jsx:20`).
- Campos vacíos: el navegador permite submit (no hay `required`), Supabase devolverá error.

## 6. Business rules, constants & formulas

| Rule | Definition | Source |
|---|---|---|
| Sin registro público | Solo login; alta de usuarios vía admin | `LoginScreen.jsx` (no hay UI de signup) |
| Duración del shake | 600 ms | `LoginScreen.jsx:19` |
| Mensaje de error por defecto | "Credenciales incorrectas" | `LoginScreen.jsx:16` |
| Autofocus al correo | `emailRef.current?.focus()` en mount | `LoginScreen.jsx:10` |
| Autocompletado desactivado | `autoComplete="off"` / `"new-password"` | `LoginScreen.jsx:31,52` |

**Stub flag:** el método `login` devuelve `true` o el `string` del error (no un objeto), por lo que la pantalla compara `result !== true` (`LoginScreen.jsx:15`). Contrato frágil pero funcional.

## 7. Data model

No usa tablas de negocio. Interactúa con Supabase Auth:
- Entrada: `{ email: string, password: string }`.
- Salida: sesión Supabase (`access_token`, `refresh_token`, `user`).

`useAuth` expone: `{ authed: boolean, user: User|null, login(email,pass), logout(), loading: boolean }` (`src/auth/useAuth.js:36`).

## 8. State management

- Estado local del componente: `email`, `pass`, `err`, `shake`, `emailRef` (`LoginScreen.jsx:4-8`).
- Estado de sesión: hook `useAuth` con `getSession` al montar + `onAuthStateChange` (`useAuth.js:9-24`). El listener se desuscribe en cleanup (`useAuth.js:23`).
- No hay memoización ni store global.

## 9. Edge cases & empty/error states

- **Sesión expirada:** `onAuthStateChange` recibe el refresh; si falla, `authed → false` y vuelve esta pantalla.
- **Red caída:** `signInWithPassword` lanza error → mensaje genérico de Supabase.
- **Doble submit:** no hay flag de loading en el botón; un click extra reintenta.
- **Email mal formado:** validación nativa del `type=email`.

## 10. Open items / future work

- Botón "Ingresar" sin estado de carga (no se deshabilita durante el request).
- No hay recuperación de contraseña.
- `setErr(false)` en el onChange del correo (`LoginScreen.jsx:38`) mezcla `false`/`null` como "sin error"; cosmético.
- Considerar rate-limiting / lockout tras N intentos.
