# Informe de Nuevas Funcionalidades — GoAutos Admin

## Resumen Ejecutivo

Se implementaron **9 sistemas nuevos** que transforman la plataforma de un gestor de inventario a un centro de operaciones completo con inteligencia artificial, comunicación en tiempo real, búsqueda inteligente, control de acceso granular y experiencia de app nativa vía PWA.

---

## 1. GAIA — Asistente de Inteligencia Artificial

**Archivos principales:** `src/contexts/AIChatContext.tsx`, `src/services/aiChatService.ts`, `src/pages/Gaia.tsx`, `supabase/functions/ai-chat/`

### Qué hace
Asistente conversacional con IA integrado en la plataforma, accesible desde el sidebar y la página `/gaia`. Permite a los usuarios hacer consultas, obtener recomendaciones y asistencia inteligente directamente desde el panel de administración.

### Características

- **Interfaz conversacional en tiempo real** con mensajes del usuario y respuestas del asistente
- **Multi-conversación:** crear, renombrar y eliminar conversaciones independientes
- **Persistencia en base de datos:**
  - `ai_conversations` — metadata de conversaciones (título, fechas)
  - `ai_messages` — mensajes individuales con rol (user/assistant)
- **Fire-and-forget** — la persistencia no bloquea la UX
- **Soporte bilingüe** — el idioma del usuario se envía a la Edge Function
- **Auto-scroll** al mensaje más reciente
- **Manejo de errores** con mensajes de fallback
- **Ordenamiento automático** por conversación más reciente

### Arquitectura

```
Usuario → AIChatContext → aiChatService → Edge Function (ai-chat)
                                              ↓
                                         Modelo IA
                                              ↓
                                    Respuesta streaming
                                              ↓
                              Persistencia en DB (fire-and-forget)
```

### Integración
- Disponible globalmente vía Context API
- Acceso desde sidebar y buscador global (Cmd+K → "GAIA")
- Permiso requerido: `AI_ASSISTANT_VIEW`
- Linkeado desde la página `/funcionalidades`

---

## 2. Buscador Global (Command Palette)

**Archivos principales:** `src/components/GlobalSearch.tsx`, `src/components/TopBar.tsx`

### Qué hace
Un buscador universal tipo Spotlight/Cmd+K que permite encontrar cualquier cosa en la plataforma desde un solo lugar.

### Qué busca

| Categoría | Campos de búsqueda | Límite |
|-----------|-------------------|--------|
| **Vehículos** | Patente, marca, modelo | 5 resultados |
| **Clientes** | Nombre (first_name + last_name), email, RUT, teléfono | 5 resultados |
| **Secciones** | 25+ páginas y configuraciones | Sin límite |

### Secciones navegables desde el buscador
Dashboard, Vehículos, Tasador, Leads, Clientes, Ventas, Financiamiento, Agendamientos, Documentos, Solicitudes, GAIA (Asistente IA), Marketing, Instagram, Mercado Libre, Facebook Marketplace, ChileAutos, Equipo, Builder, Novedades, y todas las sub-secciones de Configuración (General, Tema, SEO, Contacto, Permisos, Idioma, Suscripción, Automotoras, Info Legal, Estados de Vehículo, Checklist, Notificaciones).

### Características técnicas
- **Atajo de teclado:** `Cmd+K` (Mac) / `Ctrl+K` (Windows) — se muestra visualmente en el botón
- **Debounce de 300ms** para no saturar consultas
- **Normalización de texto** — elimina tildes y es case-insensitive
- **Respeta permisos** — solo muestra vehículos si tiene `VEHICLES_VIEW`, clientes si tiene `CLIENTS_VIEW`, y secciones según los permisos del usuario
- **Deep-linking a configuración** — navega directamente a tabs específicos con hash (`/configuracion#tab=general`)
- **Multi-tenant** — filtra por `client_id`, cada automotora solo ve sus datos
- **Búsqueda de clientes corregida** — busca por `first_name` y `last_name` independientemente, concatenados para display

### UX
- Mínimo 2 caracteres para activar búsqueda
- Resultados agrupados por categoría con íconos
- Vehículos muestran imagen, marca, modelo, año, patente y precio
- Clientes muestran avatar con iniciales, nombre, RUT, email y teléfono
- Click en resultado navega y cierra el diálogo

---

## 3. TopBar con Notificaciones y Búsqueda

**Archivos principales:** `src/components/TopBar.tsx`, `src/components/notifications/NotificationBell.tsx`, `src/components/DashboardLayout.tsx`

### Qué hace
Barra superior rediseñada que centraliza las acciones principales: búsqueda global, centro de notificaciones y perfil de usuario.

### Layout

```
┌──────────────────────────────────────────────────────────┐
│  [Logo Automotora]          [Buscar... ⌘K] [🔔 3] [Avatar] │
└──────────────────────────────────────────────────────────┘
```

### Campana de notificaciones
- **Badge rojo** con conteo de no leídas (máximo "99+")
- **Desktop:** Popover dropdown de 380px con las últimas 20 notificaciones
- **Mobile:** Drawer de pantalla completa (85vh)
- **Solo visible** si el usuario tiene permiso `NOTIFICATIONS_VIEW`
- **Actualización en tiempo real** via Supabase Realtime

### Dropdown de notificaciones

```
┌─────────────────────────────────────┐
│ Notificaciones    [Marcar todas ✓]  │
├─────────────────────────────────────┤
│ Hoy                                 │
│  🔍 Nueva solicitud de vehículo     │
│     Juan busca Toyota Corolla...    │
│                           hace 5m ● │
│                                     │
│ Ayer                                │
│  ⚡ Venta rápida detectada          │
│     Hyundai Tucson vendido en...    │
│                              Ayer   │
│                                     │
│ Anteriores                          │
│  ✅ Venta completada                │
│     Se registró la venta de...      │
│                          hace 3d    │
├─────────────────────────────────────┤
│      Ver todas las notificaciones → │
└─────────────────────────────────────┘
```

### Diseño
- Fondo semi-transparente con blur: `bg-white/80 backdrop-blur-xl`
- Se adapta al estado del sidebar (colapsado/expandido)
- TopBar oculto en mobile (se usa bottom nav + bell flotante)

---

## 4. Sistema de Notificaciones + Push PWA

**Archivos principales:** `src/pages/Notificaciones.tsx`, `src/components/notifications/`, `src/hooks/useNotifications.ts`, `src/hooks/usePushNotifications.ts`, `src/sw.ts`, `supabase/functions/send-push-notification/`

### Arquitectura de 3 capas

```
Evento (nuevo lead, venta, etc.)
    │
    ├──→ Notificación In-App (base de datos + realtime)
    │       → Bell dropdown + página completa
    │
    ├──→ Push Notification (Web Push API)
    │       → Notificación nativa del SO
    │
    └──→ WhatsApp (Kapso API)
            → Mensaje al celular
```

### Notificaciones automáticas (triggers de base de datos)

| Evento | Tipo | Ícono | Destinatario |
|--------|------|-------|-------------|
| Solicitud de vehículo creada | `vehicle_request` | 🔍 | Rol vendedor |
| Vehículo vendido en ≤30 días | `fast_sale_restock` | ⚡ | Todos |
| Venta registrada | `sale_completed` | ✅ | Todos |
| Nuevo lead capturado | `new_lead` | ✉️ | Todos |
| Manual (admin crea) | `general` | Seleccionable | Configurable |

### Envío manual de notificaciones (Drawer lateral)

El sistema de creación de notificaciones usa un **drawer lateral derecho** (slide-out), consistente con el patrón de solicitudes. Dos secciones:

**Contenido:**
- Título (máx 100 caracteres) — requerido
- Cuerpo (máx 500 caracteres) — requerido, con contador de caracteres
- Selector de ícono: Bell, Info, Zap, Search, Check, Megaphone
- URL interna opcional (ej: `/vehiculos`, `/ventas`)

**Destinatario:**
- Todos los usuarios de la automotora
- Un rol específico (admin, vendedor, jefe)
- Un usuario específico (selector de equipo con email)

Envía **in-app + push** simultáneamente con confirmación por toast.

### Página de notificaciones (`/notificaciones`) — Diseño inbox-style

La página fue rediseñada con un layout tipo inbox profesional:

```
┌─────────────────────────────────────────────────────────────┐
│  Notificaciones                    [Marcar todas ✓] [Enviar]│
│  3 sin leer                                                 │
│                                                             │
│  [Todas] [Leads] [Solicitudes] [Ventas rápidas] [Ventas]    │
│  [General]  │  [Solo sin leer]                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  HOY                                                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │▌ 🔍  Nueva solicitud de vehículo        12:30       │   │
│  │      Juan López busca Toyota Corolla... hace 2h     │   │
│  │      [Solicitud de vehículo]                        │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │▌ ⚡  Venta rápida detectada              10:15       │   │
│  │      Hyundai Tucson vendido en 3 días   hace 4h     │   │
│  │      [Venta rápida]                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  AYER                                                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │   ✅  Venta completada                    16:45      │   │
│  │       Se registró la venta de...          Ayer       │   │
│  │       [Venta registrada]                            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ANTERIORES                                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │   🔔  Notificación general               14 ene     │   │
│  │       Actualización del sistema...      hace 5d      │   │
│  │       [General]                                     │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Elementos del diseño:**
- **Agrupación por día:** Hoy, Ayer, Anteriores — con línea separadora
- **Cards en contenedor blanco** con `rounded-2xl` y bordes sutiles
- **Línea de acento izquierda** (3px, color primary) para no leídas
- **Íconos con color** según tipo de notificación (azul solicitudes, ámbar ventas rápidas, verde ventas, violeta leads, etc.)
- **Badges de tipo** con colores semánticos por categoría
- **Tiempo relativo** en mobile, hora exacta + relativo en desktop
- **Filtros tipo pills** con scroll horizontal mobile-friendly
- **Header sticky** con backdrop blur
- **FAB flotante** en mobile (bottom-24, encima del nav) para enviar notificación
- **Empty states** contextuales: inbox vacío vs filtros sin resultados
- **i18n completo** español e inglés
- **Centrado max-w-5xl** para lectura cómoda en pantallas grandes

### Push Notifications — Flujo técnico

```
1. Usuario acepta permisos del navegador
2. Se registra PushSubscription (endpoint + keys)
3. Se guarda en tabla push_subscriptions
4. Cuando se crea notificación:
   - Trigger DB → INSERT en push_notification_queue
   - pg_net invoca Edge Function automáticamente
5. Edge Function (Deno):
   - Lee cola de pending (hasta 10)
   - Busca suscripciones activas (respeta targeting)
   - Genera par ECDH efímero (P-256)
   - Encripta payload con AES-128-GCM (RFC 8291/8188)
   - Firma con VAPID (JWT + clave privada)
   - POST HTTP al endpoint del navegador
6. Service Worker recibe push event:
   - Muestra notificación nativa del SO
   - Click → navega a URL interna de la app
```

### Base de datos

- **`notifications`** — Notificaciones con tipo, targeting por usuario/rol, metadata JSONB
- **`notification_reads`** — Estado de lectura por usuario (mismo notification, múltiples readers)
- **`push_subscriptions`** — Suscripciones push por dispositivo
- **`push_notification_queue`** — Cola de envío con estado pending/processing/sent/failed
- **RLS:** Usuarios solo ven notificaciones de su automotora y dirigidas a su rol/usuario

---

## 5. Sistema de Permisos Granulares (actualizado para Dashboard)

**Archivos principales:** `src/types/permissions.ts`, `src/hooks/usePermissions.ts`, `src/hooks/useRoles.ts`, `src/components/roles/`

### 34 permisos organizados en 7 categorías

#### Dashboard (13 permisos — control granular por widget)

| Permiso | Controla |
|---------|----------|
| `DASHBOARD_VIEW` | Acceso básico al dashboard |
| `DASHBOARD_VIEW_FULL` | Dashboard completo con tabs |
| `DASHBOARD_TAB_COMERCIAL` | Tab Comercial |
| `DASHBOARD_TAB_INVENTARIO` | Tab Inventario |
| `DASHBOARD_TAB_WEB` | Tab Web/Leads |
| `DASHBOARD_TAB_VENDEDORES` | Tab Vendedores |
| `DASHBOARD_COMERCIAL_VENTAS` | KPI Ventas Totales |
| `DASHBOARD_COMERCIAL_GASTOS` | KPI Gastos Totales |
| `DASHBOARD_COMERCIAL_MARGEN` | KPI Margen Bruto |
| `DASHBOARD_COMERCIAL_INVENTARIO` | KPI Valor Inventario |
| `DASHBOARD_COMERCIAL_RENDIMIENTO` | Gráfico Rendimiento |
| `DASHBOARD_COMERCIAL_ALERTAS` | Alertas Inteligentes |
| `DASHBOARD_COMERCIAL_RESUMEN_VENTAS` | Resumen de Ventas |

#### Otras categorías
- **General** (3): Documentos (ver/crear/eliminar), Novedades, Asistente IA
- **Inventario** (5): Vehículos (CRUD), Tasador
- **Marketing** (5): Marketing, Instagram, MercadoLibre, Facebook, ChileAutos
- **Comercial** (10): Leads, Clientes, Ventas, Financiamiento, Agendamientos
- **Notificaciones y Solicitudes** (5): Notificaciones (ver/crear), Solicitudes (ver/crear/gestionar)
- **Administración** (6): Configuración, Equipo, Roles, Builder

### Sistema de dependencias automáticas

```
DASHBOARD_VIEW_FULL ← requiere ← DASHBOARD_VIEW
DASHBOARD_TAB_COMERCIAL ← requiere ← DASHBOARD_VIEW_FULL
DASHBOARD_COMERCIAL_VENTAS ← requiere ← DASHBOARD_TAB_COMERCIAL
```

Al activar un permiso hijo, los padres se activan automáticamente. Al desactivar un padre, los hijos se desactivan en cascada.

### Jerarquía de resolución

```
Superadmin → TODOS los permisos (bypass total)
    ↓
Rol personalizado (role_id) → Solo permisos asignados
    ↓
Admin legacy (sin role_id) → Todos los permisos
    ↓
Vendedor legacy (sin role_id) → 7 permisos por defecto
```

### UI de gestión de roles
- **Grid de roles** con crear, editar, eliminar
- **PermissionSelector** con checkboxes por categoría
- Selección masiva por categoría y global
- Tags "(requerido)" para dependencias bloqueadas
- Estado indeterminado para selección parcial de categoría
- Roles de sistema (solo lectura, no eliminables)
- Validación: no se puede eliminar un rol con usuarios asignados

### Gating en el Dashboard
Cada widget del dashboard se renderiza condicionalmente:

```typescript
const showRendimiento = hasPermission(DASHBOARD_COMERCIAL_RENDIMIENTO);
const showAlertas = hasPermission(DASHBOARD_COMERCIAL_ALERTAS);
// Si no tiene permisos de ningún KPI, el carrusel completo se oculta
```

---

## 6. Sistema de Solicitudes de Vehículos

**Archivos principales:** `src/pages/Solicitudes.tsx`, `src/components/solicitudes/`, `src/hooks/useVehicleRequests.ts`

### Qué es una solicitud
Un registro de un cliente buscando un vehículo específico, con sus preferencias de marca, modelo, año y presupuesto. Permite al equipo de ventas trackear la demanda y cumplir pedidos.

### Modelo de datos

```
Solicitud {
  customer_name, customer_phone, customer_email
  brand_name, model_name
  year_min, year_max
  budget_min, budget_max
  notes
  status: open | in_progress | fulfilled | expired | cancelled
  assigned_to (usuario)
  fulfilled_vehicle_id (vehículo que matcheó)
  status_history[] (auditoría completa)
  expires_at (expiración automática)
}
```

### Flujo Kanban (4 columnas)

```
┌──────────┐    ┌─────────────┐    ┌──────────┐    ┌────────────┐
│ Abiertas │ →  │ En Progreso │ →  │ Cumplidas│    │ Canceladas │
│  (azul)  │    │  (ámbar)    │    │  (verde) │    │   (rojo)   │
└──────────┘    └─────────────┘    └──────────┘    └────────────┘
```

- **Desktop:** Kanban con drag & drop (@dnd-kit)
- **Mobile:** Tabs con cards animadas
- **Drag entre columnas** abre diálogo de confirmación con nota opcional
- **Panel de detalle** lateral (420px) con toda la info + historial de cambios

### Conexión con notificaciones
Cada cambio de estado genera automáticamente:
1. **Notificación in-app** a todos los usuarios de la automotora
2. **Push notification** a dispositivos suscritos
3. **Trigger de base de datos** al crear solicitud → notifica a vendedores

### Permisos
- `VEHICLE_REQUESTS_VIEW` — Ver solicitudes
- `VEHICLE_REQUESTS_CREATE` — Crear nuevas (FAB + botón)
- `VEHICLE_REQUESTS_MANAGE` — Cancelar y acciones admin

### Realtime
Suscripción a Supabase Realtime — todos los usuarios ven cambios al instante sin refrescar.

### Ejemplo de flujo completo

1. **Admin crea solicitud:** "Juan López busca Toyota Corolla, 2018-2022, presupuesto 10M-15M CLP"
2. **Notificación automática** llega a todos los vendedores (in-app + push)
3. **Vendedor toma la solicitud** → pasa a "En Progreso" con nota opcional
4. **Vendedor encuentra match** en inventario → marca como "Cumplida"
5. **Si no se cumple a tiempo** → expira automáticamente

---

## 7. PWA — Progressive Web App

**Archivos principales:** `src/sw.ts`, `vite.config.ts`, `src/hooks/usePushNotifications.ts`

### Qué hace
Convierte GoAutos Admin en una aplicación instalable que funciona como app nativa en cualquier dispositivo, con soporte offline parcial y notificaciones push del sistema operativo.

### Manifest

| Propiedad | Valor |
|-----------|-------|
| Nombre | GoAuto — Plataforma para Automotoras |
| Display | `standalone` (se ejecuta como app, sin barra del navegador) |
| Orientación | `any` |
| Color tema | `#1e3a5f` |
| Íconos | 192x192, 512x512, 512x512 maskable |

### Service Worker — Estrategias de cache

| Recurso | Estrategia | TTL | Max entradas |
|---------|-----------|-----|-------------|
| **Google Fonts** | CacheFirst | 1 año | 10 |
| **Supabase API** | NetworkFirst | 5 minutos | 50 |
| **HTML/CSS/JS** | Pre-cache (Workbox) | Hasta nueva versión | Sin límite |

### Capacidades del Service Worker

- **Push notifications nativas:** Recibe eventos push, muestra notificaciones del SO, navega al hacer click
- **Re-suscripción automática:** Si el navegador invalida la suscripción, se re-suscribe
- **SPA routing:** Fallback a `/index.html` para navegación client-side
- **Activación inmediata:** `skipWaiting()` + `clients.claim()` para actualizaciones sin recargar
- **Auto-update:** Comprobación automática en cada carga de página (`autoUpdate`)
- **Límite de precache:** 10MB máximo para bundles

### Instalación
La app se puede instalar desde el navegador en:
- **iOS:** Safari → Compartir → Agregar a inicio
- **Android:** Chrome → banner automático o menú → Instalar
- **Desktop:** Chrome/Edge → ícono de instalación en barra de direcciones

---

## 8. Página de Funcionalidades (`/funcionalidades`)

**Archivos principales:** `src/pages/Funcionalidades.tsx`

### Qué hace
Landing page interactiva que presenta todas las capacidades de la plataforma GoAuto. Diseñada para ser mostrada a potenciales clientes como demostración de valor.

### Módulos presentados

| # | Módulo | Color | Características destacadas |
|---|--------|-------|---------------------------|
| 1 | Gestión de Inventario | Azul | Kanban, autocompletado por patente, galería ilimitada, export Excel |
| 2 | Gestión de Ventas | Verde | Flujo guiado paso a paso, part-exchange, comisiones automáticas, documentos |
| 3 | Crédito Directo | Violeta | Planes personalizados, calendario visual, alertas de pago, intereses |
| 4 | Leads y Oportunidades | Rosa | Captura automática web, pipeline visual, asignación a vendedor, historial |
| 5 | Integraciones Sociales | Pink | Instagram Business, Facebook MP, Mercado Libre, sync automático |
| 6 | GAIA — Asistente IA | — | Linkeado a `/gaia` con botón "Conocer más" |
| 7 | Notificaciones Push | — | Sistema in-app + push nativo del SO |
| 8 | Solicitudes de Vehículos | — | Kanban con drag & drop, notificaciones automáticas |
| 9 | Buscador Global | — | Cmd+K, búsqueda universal |
| 10 | Permisos Granulares | — | 34 permisos por widget del dashboard |
| 11 | PWA | — | App instalable, offline, push nativas |

### Características técnicas de la página
- **Animaciones con Framer Motion:** scroll-driven, easing tipo Apple
- **Dashboard preview 3D** con efecto de rotación que sigue al mouse
- **Contadores animados** para estadísticas
- **Elementos flotantes** con animación sutil
- **Todas las secciones expandidas** por defecto (sin toggle)
- **Links a páginas internas** (ej: GAIA → `/gaia`)

### Generación de PDF
Botón para generar `GoAuto-Informe-Funcionalidades.pdf` profesional con:
- Portada con título
- Resumen ejecutivo
- 14 secciones detalladas con tablas y bullet points
- Numeración de páginas y footer corporativo

### Tabla comparativa
Incluye tabla "+90 funcionalidades en 16 módulos" comparando GoAuto vs competencia, incluyendo las nuevas funcionalidades (GAIA, push, solicitudes, buscador, permisos granulares, PWA).

---

## 9. Configuración de Tema (Theme System)

**Archivos principales:** `src/contexts/ConfigContext.tsx`, `tailwind.config.ts`

### Qué hace
Sistema centralizado de personalización visual para el site builder. Cada automotora puede personalizar colores, fuentes y fondo de su sitio web generado.

### Configuración por defecto

| Propiedad | Valor | Variable CSS |
|-----------|-------|-------------|
| Color primario | `#1a1a1a` (negro) | `--color-primary` |
| Color secundario | `#10b981` (verde esmeralda) | `--color-secondary` |
| Color terciario | `#8b5cf6` (violeta) | `--color-tertiary` |
| Color de fondo | `#ffffff` (blanco) | `--background-color` |
| Fuente título | Inter | `--font-title` |
| Fuente cuerpo | Inter | `--font-body` |

### Cómo funciona
- `ConfigProvider` envuelve la app y aplica las variables CSS al `document.documentElement`
- `useConfig()` hook expone: `config`, `updateColors()`, `updateFonts()`, `updateBackgroundColor()`, `resetConfig()`
- Los cambios se reflejan en tiempo real en el preview del builder
- Tailwind usa `bg-primary` que apunta al color configurado

---

## 10. Barra de Navegación y Menú Mobile Actualizados

**Archivos principales:** `src/components/sidebar/SidebarNavItems.tsx`, `src/components/SidebarNav.tsx`

### Nuevas entradas en sidebar
Se agregaron al menú lateral (desktop) y al drawer mobile:
- **GAIA** (ícono Bot) — con link a `/gaia`
- **Notificaciones** (ícono campana) — en grupo Comercial
- **Solicitudes** (conectado con i18n)

### i18n en navegación
Todas las entradas usan las traducciones de `navigation.json`:
- ES: "GAIA", "Notificaciones", "Solicitudes"
- EN: "GAIA", "Notifications", "Requests"

---

## Resumen de Impacto

| Sistema | Archivos nuevos/modificados | Tablas DB | Edge Functions |
|---------|---------------------------|-----------|----------------|
| GAIA (IA) | 3 componentes, 1 servicio, 1 contexto | 2 tablas | 1 (ai-chat) |
| Buscador Global | 2 componentes | 0 | 0 |
| TopBar + Bell | 4 componentes | 0 | 0 |
| Notificaciones | 8 componentes, 2 hooks, 1 store, 2 i18n | 4 tablas | 1 (send-push) |
| Permisos Granulares | 3 componentes, 2 hooks, 1 types | 2 tablas + RPCs | 0 |
| Solicitudes | 8 componentes, 1 hook, 2 i18n | 1 tabla + triggers | 0 |
| PWA | 1 service worker, config Vite | 1 tabla (push_subs) | 0 |
| Funcionalidades | 1 página completa | 0 | 0 |
| Theme System | 1 contexto, 1 config | 0 | 0 |
| Sidebar/Nav | 2 componentes, 4 i18n | 0 | 0 |

**Total:** ~35+ archivos nuevos/modificados, 10 tablas de base de datos, 2 edge functions, 34 permisos, soporte bilingüe completo, PWA instalable con push nativas.
