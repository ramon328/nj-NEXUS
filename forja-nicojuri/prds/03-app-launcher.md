# Forja · 03 — App Launcher & flujo forja_token (Launcher)

| Module | Phase | Status | Build wave |
|---|---|---|---|
| Core / SSO cross-domain | Lanzamiento de apps | ✅ En producción | 2 |

Source: `src/components/AppCard.jsx`. Part of portal **La Forja · Nicojuri**.

## 1. Overview & context

`AppCard` es la tarjeta de cada aplicación en el grid del hub. Además de la UI (icono, nombre, descripción, estado), implementa el **flujo de SSO cross-domain**: para apps marcadas `requiresForjaToken`, abre la app externa pasándole el `access_token` de la sesión Supabase de Forja en el query param `?forja_token=`, de modo que la app destino (Aliace, Plataforma Cálculo) pueda reconstruir la sesión sin un segundo login.

- **Quién lo usa:** cualquier usuario al hacer clic en una app `live`.
- **Job-to-be-done:** "Quiero abrir Aliace/Cálculo ya autenticado, sin volver a iniciar sesión".
- **Muta datos:** no escribe en BD; lee la sesión (`getSession`) y abre una pestaña nueva.

## 2. Goals / Non-goals

**Goals**
- Apps sin token: abrir en pestaña nueva (`target="_blank"`).
- Apps con token: pasar el `access_token` de Forja a la app destino vía URL.
- Evitar el bloqueador de popups abriendo la ventana de forma síncrona antes del `await`.
- Diferenciar visualmente apps `live` vs `soon`.

**Non-goals**
- No valida el token en el destino (eso lo hace la app receptora).
- No refresca el token; usa el `access_token` vigente en ese instante.
- No maneja errores si `window.open` retorna `null` (popup bloqueado pese a la apertura síncrona).

## 3. Entry points & navigation

- **Entrada:** renderizado por el hub, uno por app visible (`src/App.jsx:54-56`).
- **Salidas:**
  - App `live` sin token → `<a href target="_blank">` directo (`AppCard.jsx:40-47`).
  - App `live` con token → `onClick=handleSecuredClick` (`AppCard.jsx:45`) abre pestaña a `app.href?forja_token=<jwt>`.
  - App `soon` → render `div` sin enlace (`AppCard.jsx:39`).

## 4. Screen anatomy

Tarjeta (`AppCard.jsx:49-81`):

| Elemento | Detalle | Fuente |
|---|---|---|
| Tag dinámico | `a` si live, `div` si soon | `AppCard.jsx:39` |
| Badge de estado | "En vivo" / "Próximamente" | `AppCard.jsx:60-62` |
| Icono | `app.icon` (emoji) | `AppCard.jsx:64` |
| Cuerpo | `h2` nombre + `p` descripción | `AppCard.jsx:66-69` |
| CTA | "Abrir aplicación" (+flecha) / "En desarrollo" (+plus) | `AppCard.jsx:71-74` |
| Línea decorativa | gradiente con `app.color` | `AppCard.jsx:76-79` |
| Efecto cursor | `--mx/--my` actualizados en `mousemove` (solo live) | `AppCard.jsx:19-25,57` |

## 5. User flows & use cases

**Use case 1 — App sin token (Ailnest).**
As a usuario, I want abrir Ailnest, so that gestione mis correos.
1. Click en `<a href="https://ailnest.vercel.app/" target="_blank" rel="noopener">`.
2. Navegador abre pestaña nueva normal (sin token).

**Use case 2 — App con token (Aliace / Cálculo).**
As a usuario autenticado, I want abrir Aliace ya logueado, so that no repita credenciales.
1. Click → `handleSecuredClick` hace `e.preventDefault()` (`AppCard.jsx:28`).
2. **Síncrono:** `window.open('about:blank', '_blank')` para evitar el popup blocker (`AppCard.jsx:30`).
3. `await supabase.auth.getSession()` → `token = session.access_token` (`AppCard.jsx:31-32`).
4. Construye `URL(app.href)` y, si hay token, añade `?forja_token=<jwt>` (`AppCard.jsx:33-34`).
5. Redirige la pestaña abierta: `win.location = url.toString()` (`AppCard.jsx:35`).
6. La app destino lee `forja_token` y reconstruye sesión (lado receptor, fuera de este repo).

**Variaciones**
- Si no hay token (sesión rara), abre la app destino **sin** el param (la app exigirá login propio) (`AppCard.jsx:34`).

## 6. Business rules, constants & formulas

| Rule | Definition | Source |
|---|---|---|
| Apps con token | `aliace`, `calculo` (`requiresForjaToken: true`) | `src/data/apps.js:19,29` |
| Param de SSO | `forja_token` = `session.access_token` | `AppCard.jsx:34` |
| Apertura síncrona | `window.open` antes del `await` para no ser bloqueado | `AppCard.jsx:29-30` |
| `target` condicional | `undefined` (mismo handler) si token, `_blank` si no | `AppCard.jsx:43` |
| `rel="noopener"` | siempre en apps live | `AppCard.jsx:44` |

**Stub flag:** no se valida que `win !== null`; si el navegador bloquea la apertura síncrona, `win.location` lanzaría (`AppCard.jsx:35`).

## 7. Data model

- Entrada: objeto `app` del catálogo (`src/data/apps.js`).
- Sesión Supabase: `getSession().data.session.access_token` (JWT).
- Salida: URL externa con `?forja_token=<jwt>`.

## 8. State management

- `cardRef` (`useRef`) para el efecto de cursor (`AppCard.jsx:17`).
- Sin estado React relevante; el flujo de token es imperativo dentro de `handleSecuredClick`.
- Importa `supabase` directamente (`AppCard.jsx:2`).

## 9. Edge cases & empty/error states

- **Popup bloqueado:** `window.open` podría devolver `null`; no se maneja → posible `TypeError`.
- **Token expirado:** se pasa igual; el destino debe validar/rechazar.
- **`app.href` inválido:** `new URL()` lanzaría (no ocurre con el catálogo actual).
- **App `soon`:** no hay handler; render inerte.

## 10. Open items / future work

- Manejar `win === null` y mostrar aviso si el popup fue bloqueado.
- Considerar `getSession()` con refresh forzado si el token está por expirar.
- Documentar/estandarizar el contrato `?forja_token=` con las apps receptoras (ver memoria del proyecto "Auth System").
