# Sistema de Notificaciones — GoAuto Admin

## Resumen

El sistema de notificaciones de GoAuto Admin es una solución integral que combina notificaciones in-app en tiempo real con push notifications nativas (PWA). Está diseñado para que ningún evento importante pase desapercibido: nuevos leads, ventas, solicitudes de vehículos y alertas de restock llegan instantáneamente a cada usuario según su rol.

---

## Arquitectura General

El sistema opera en tres capas:

```
┌─────────────────────────────────────────────────────┐
│                   FRONTEND (React)                  │
│  Campana (sidebar/mobile) ← Supabase Realtime ←──┐ │
│  Página /notificaciones                           │ │
│  Página /solicitudes (Kanban)                     │ │
└───────────────────────────────────────────────────┼─┘
                                                    │
┌───────────────────────────────────────────────────┼─┐
│               BASE DE DATOS (PostgreSQL)          │ │
│  notifications ──trigger──→ push_notification_queue │
│  notification_reads                               │ │
│  vehicle_requests                                 │ │
│  push_subscriptions                               │ │
└───────────────────────────────────────────────────┼─┘
                                                    │
┌───────────────────────────────────────────────────┼─┐
│            EDGE FUNCTION (Deno)                   │ │
│  send-push-notification                           │ │
│  ← pg_net trigger (automático)                    │ │
│  → Web Push API (VAPID + aes128gcm)              │ │
└─────────────────────────────────────────────────────┘
```

---

## 1. Base de Datos

### 1.1 Tablas

| Tabla | Propósito |
|-------|-----------|
| `notifications` | Almacena cada notificación con título, cuerpo, icono, URL y campos de targeting |
| `notification_reads` | Registro many-to-many de qué usuario leyó qué notificación |
| `vehicle_requests` | Solicitudes de vehículos (alimenta el Kanban de /solicitudes) |
| `push_notification_queue` | Cola de push notifications pendientes de envío |
| `push_subscriptions` | Suscripciones activas de cada dispositivo/navegador |

### 1.2 Campos de targeting

Cada notificación puede dirigirse a:

| Campo | Valor | Comportamiento |
|-------|-------|----------------|
| `target_user_id` | `NULL` | Visible para todos los usuarios del cliente |
| `target_user_id` | UUID específico | Solo visible para ese usuario |
| `target_role` | `NULL` | Todos los roles |
| `target_role` | `'seller'`, `'admin'`, etc. | Solo visible para usuarios con ese rol |

Ambos campos pueden combinarse. Si ambos son `NULL`, la notificación es visible para todos los usuarios del `client_id`.

### 1.3 Row Level Security (RLS)

Cada usuario solo puede ver notificaciones que cumplan **todas** estas condiciones:
- Pertenecen a su `client_id`
- `target_user_id` es `NULL` o coincide con su `auth.uid()`
- `target_role` es `NULL` o coincide con su rol

Esto garantiza aislamiento total entre clientes y visibilidad correcta por rol.

### 1.4 Triggers automáticos

| Trigger | Evento | Notificación generada |
|---------|--------|-----------------------|
| `notify_new_lead()` | INSERT en `leads` | "Nuevo lead" — visible para todos |
| `notify_sale_completed()` | INSERT en `vehicles_sales` | "Venta registrada" — nombre del vendedor + vehículo |
| `alert_fast_sale_restock()` | UPDATE de `status_id` en `vehicles` | "Venta rápida — buscar reemplazo" — solo si se vendió en menos de 30 días |
| `notify_vehicle_request()` | INSERT en `vehicle_requests` | "Nueva solicitud de vehículo" — dirigida a vendedores |

Cada trigger llama a la función `create_notification()`, que:
1. Inserta el registro en la tabla `notifications` (notificación in-app)
2. Llama a `queue_push_notification()` para encolar el push nativo

### 1.5 Función `create_notification()`

```sql
create_notification(
  p_client_id, p_type, p_title, p_body,
  p_icon, p_url, p_data,
  p_target_user_id, p_target_role, p_created_by
) RETURNS UUID
```

Es el punto central de creación. Toda notificación — automática o manual — pasa por esta función para garantizar que siempre se genere tanto la notificación in-app como el push.

---

## 2. Frontend en Tiempo Real

### 2.1 Hook `useNotifications`

**Archivo:** `src/hooks/useNotifications.ts`

Responsabilidades:
- Fetch inicial de notificaciones con LEFT JOIN a `notification_reads` para determinar estado de lectura
- Suscripción a Supabase Realtime (`postgres_changes` en tabla `notifications`) filtrada por `client_id`
- Refetch automático cuando llega una nueva notificación por el canal realtime
- Expone: `notifications`, `unreadCount`, `isLoading`, `markAsRead(id)`, `markAllAsRead()`, `refetch()`

### 2.2 Componentes UI

#### Campana de notificaciones (`NotificationBell`)

| Contexto | Comportamiento |
|----------|----------------|
| **Desktop (sidebar expandido)** | Icono de campana junto al perfil del usuario, click abre `Popover` |
| **Desktop (sidebar colapsado)** | Campana debajo del avatar |
| **Mobile** | Campana flotante en la esquina superior derecha, click abre `Drawer` (bottom sheet) |

Badge rojo con el conteo de no leídas. Desaparece cuando todas están leídas.

#### Dropdown (`NotificationDropdown`)

- Muestra las últimas 20 notificaciones agrupadas por: **Hoy**, **Ayer**, **Anteriores**
- Cada item muestra: icono + título + cuerpo (preview) + tiempo relativo
- Click → marca como leída + navega a la URL de la notificación
- Botón "Marcar todas" para leer todas de una vez
- Link "Ver todas las notificaciones" → navega a `/notificaciones`

#### Página `/notificaciones`

- Listado completo de todas las notificaciones
- Filtros por tipo: Leads, Solicitudes, Ventas rápidas, Ventas, General
- Toggle "Solo sin leer"
- Botón "Enviar notificación" (requiere permiso `NOTIFICATIONS_CREATE`)

#### Página `/solicitudes`

- Tablero Kanban con 4 columnas: **Abiertas** → **En Progreso** → **Cumplidas** / **Canceladas**
- Cada tarjeta muestra: cliente, vehículo buscado, presupuesto, tiempo
- Crear solicitud → genera notificación automática para vendedores
- Panel lateral con detalle completo al hacer click en una tarjeta

### 2.3 Iconos por tipo de notificación

| Tipo | Icono | Color (no leída) |
|------|-------|-------------------|
| `new_lead` | `MailPlus` | Primary |
| `vehicle_request` | `Search` | Primary |
| `fast_sale_restock` | `Zap` | Primary |
| `sale_completed` | `CheckCircle` | Primary |
| `general` | `Bell` | Primary |

---

## 3. Push Notifications (PWA)

### 3.1 Flujo completo

```
1. Evento ocurre (nuevo lead, venta, etc.)
       ↓
2. Trigger PostgreSQL → create_notification()
       ↓
3. INSERT en notifications (in-app) + INSERT en push_notification_queue
       ↓
4. Trigger pg_net en push_notification_queue
       ↓
5. Llama automáticamente al Edge Function send-push-notification
       ↓
6. Edge Function lee items pendientes de la cola
       ↓
7. Filtra push_subscriptions según targeting:
   - target_user_id → solo dispositivos de ese usuario
   - target_role → dispositivos de usuarios con ese rol
   - NULL → todos los dispositivos del cliente
       ↓
8. Encripta payload con VAPID + aes128gcm (RFC 8291)
       ↓
9. Envía via Web Push API al endpoint del navegador
       ↓
10. Service Worker (sw.ts) recibe el push → muestra notificación nativa del OS
       ↓
11. Usuario hace click en la notificación → abre la app en la URL indicada
```

### 3.2 Edge Function `send-push-notification`

**Archivo:** `supabase/functions/send-push-notification/index.ts`

Dos modos de operación:

| Modo | Payload | Uso |
|------|---------|-----|
| **Process Queue** | `{ processQueue: true }` | Procesa hasta 10 items pendientes de la cola |
| **Test** | `{ type: "test", clientId, targetAuthId }` | Envía notificación de prueba a un usuario específico |

Maneja automáticamente suscripciones expiradas (HTTP 404/410) eliminándolas de la base de datos.

### 3.3 Seguridad

- Autenticación VAPID con clave EC P-256 (configurada como secrets en Supabase)
- Encriptación de payload con aes128gcm (estándar Web Push)
- El Edge Function usa `SUPABASE_SERVICE_ROLE_KEY` — nunca expuesto al cliente

---

## 4. Notificaciones Manuales

### 4.1 Acceso

Requiere el permiso `NOTIFICATIONS_CREATE`. Disponible desde el botón "Enviar notificación" en la página `/notificaciones`.

### 4.2 Formulario (`CreateNotificationDialog`)

| Campo | Requerido | Descripción |
|-------|-----------|-------------|
| Título | Si | Máximo 100 caracteres |
| Mensaje | Si | Máximo 500 caracteres |
| Icono | No | Selector visual (campana, info, rayo, buscar, check, megáfono) |
| Enlace | No | Ruta interna (ej: `/vehiculos`, `/ventas`) |
| Enviar a | Si | Todos los usuarios / Un rol específico / Un usuario específico |

Al enviar:
1. Inserta directamente en la tabla `notifications`
2. Como fallback, llama al Edge Function con `{ processQueue: true }` por si el trigger `pg_net` no está activo

---

## 5. Permisos

| Permiso | Código | Descripción |
|---------|--------|-------------|
| Ver notificaciones | `notifications.view` | Acceso a la página /notificaciones |
| Crear notificaciones | `notifications.create` | Enviar notificaciones manuales |
| Ver solicitudes | `vehicle_requests.view` | Acceso a la página /solicitudes |
| Crear solicitudes | `vehicle_requests.create` | Crear nuevas solicitudes de vehículos |
| Gestionar solicitudes | `vehicle_requests.manage` | Asignar, cumplir y cancelar solicitudes |

Dependencias:
- `notifications.create` requiere `notifications.view`
- `vehicle_requests.create` requiere `vehicle_requests.view`
- `vehicle_requests.manage` requiere `vehicle_requests.view`

---

## 6. Archivos del Sistema

### Migraciones
| Archivo | Contenido |
|---------|-----------|
| `supabase/migrations/20260303100000_create_notifications_system.sql` | Tablas, RLS, triggers, función `create_notification()` |
| `supabase/migrations/20260303110000_link_notifications_to_push.sql` | Integración con push queue, trigger pg_net, targeting |

### Frontend
| Archivo | Contenido |
|---------|-----------|
| `src/hooks/useNotifications.ts` | Hook con fetch, realtime y acciones |
| `src/hooks/useVehicleRequests.ts` | CRUD + realtime para solicitudes |
| `src/stores/notificationStore.ts` | Zustand store (unreadCount, preferencias) |
| `src/components/notifications/NotificationBell.tsx` | Campana con badge (desktop + mobile) |
| `src/components/notifications/NotificationDropdown.tsx` | Dropdown/drawer con listado |
| `src/components/notifications/CreateNotificationDialog.tsx` | Formulario de envío manual |
| `src/pages/Notificaciones.tsx` | Página completa de notificaciones |
| `src/pages/Solicitudes.tsx` | Kanban de solicitudes de vehículos |
| `src/components/solicitudes/CreateRequestDialog.tsx` | Formulario de nueva solicitud |
| `src/components/solicitudes/RequestDetailPanel.tsx` | Panel lateral de detalle |

### Edge Function
| Archivo | Contenido |
|---------|-----------|
| `supabase/functions/send-push-notification/index.ts` | Procesamiento de cola + envío Web Push |

---

## 7. Verificación

| Test | Cómo verificar |
|------|----------------|
| Campana visible | Login → campana en sidebar (desktop) o esquina superior (mobile) |
| Notificación manual | /notificaciones → "Enviar notificación" → rellenar → enviar → aparece en campana |
| Nuevo lead | Crear lead → notificación "Nuevo lead" aparece en campana de todos |
| Venta rápida | Cambiar vehículo a "Vendido" (creado hace <30 días) → alerta de restock |
| Venta registrada | Registrar venta → notificación con nombre del vendedor |
| Solicitud | /solicitudes → crear solicitud → notificación para vendedores |
| Tiempo real | Abrir dos tabs → crear notificación en tab 1 → aparece en tab 2 sin recargar |
| Push nativa | Tener suscripción push activa → crear notificación → push nativa del OS |
| RLS | Login como otro cliente → no ve notificaciones ajenas |
| Targeting por rol | Enviar a "seller" → solo vendedores la ven |
