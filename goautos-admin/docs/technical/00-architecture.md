# Arquitectura General — GoAuto Admin

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + TypeScript + Vite |
| Estilos | Tailwind CSS + shadcn/ui |
| Estado global | Zustand (9 stores) |
| Estado de servidor | React Query (TanStack) |
| Routing | Wouter |
| Base de datos | Supabase (PostgreSQL) |
| Autenticación | Supabase Auth |
| Storage | Supabase Storage |
| Website Builder | Craft.js |
| Analytics | PostHog |
| Pagos | Mercado Pago |
| i18n | react-i18next (es, en, pt) |

## Estructura de Carpetas

```
src/
├── components/       # Componentes organizados por módulo
│   ├── admin/        # Dashboard admin, superadmin
│   ├── builder2/     # Website builder (secciones, templates, settings)
│   ├── calendar/     # Calendario unificado
│   ├── clients/      # Tabla de clientes, formularios
│   ├── configuration/# Configuración del sistema
│   ├── documents/    # Gestión documental
│   ├── financing/    # Financiamiento
│   ├── leads/        # Kanban y tabla de leads
│   ├── notifications/# Sistema de notificaciones
│   ├── roles/        # Selector de permisos
│   ├── sales/        # Tabla de ventas, aprobación
│   ├── tasks/        # Kanban de tareas
│   ├── vehicle/      # Detalle, formularios, creación
│   └── ui/           # Componentes base (shadcn/ui)
├── contexts/         # AuthContext, AIChatContext, ConfigContext, etc.
├── hooks/            # 108+ hooks de lógica de negocio
├── integrations/     # Supabase client, GetAPI
├── pages/            # 49 rutas / 40+ páginas
├── services/         # Servicios de negocio (API calls)
├── stores/           # Zustand stores
├── types/            # Interfaces y tipos TypeScript
└── utils/            # Utilidades (formato, validación)
```

## Multi-tenancy

El sistema es **multi-tenant**. Cada automotora (client) tiene datos aislados mediante `client_id` en todas las tablas principales. El `AuthContext` expone `client`, `clientId` y `userRole`.

Los superadmins pueden impersonar cualquier tenant mediante `setTenantOverride` en `superadminStore`.

## Flujo de Autenticación

1. Usuario entra → Supabase Auth verifica sesión
2. Si autenticado → se carga `user` y `client` desde tablas propias
3. Se cargan permisos del rol (`userPermissions`)
4. `ProtectedRoute` verifica permisos por ruta
5. Componentes usan `useAuth()` para acceder al contexto

## Base de Datos (Tablas Principales)

- `vehicles` — Inventario de vehículos
- `vehicles_sales` — Registros de ventas
- `vehicles_reservations` — Reservaciones
- `customers` — Clientes/compradores
- `clients` — Automotoras (tenants)
- `users` — Usuarios del sistema
- `roles` / `role_permissions` — Roles y permisos
- `clients_vehicles_states` — Estados personalizados por automotora
- `financing` / `financing_payments` — Financiamiento
- `leads` — Leads de diferentes fuentes
- `tasks` — Tareas del equipo
- `calendar_events` — Eventos del calendario
- `documents` / `document_templates` — Documentos
- `notifications` — Notificaciones
- `chileautos_*` — Tablas de integración ChileAutos
- `seller_commission_tiers` — Comisiones por vendedor
- `sale_commission_splits` / `sale_commission_splits_history` — Splits de comisión por venta y su auditoría (movimientos en la línea de tiempo)

## Manejo de errores (catch global)

- **Toasts deduplicados**: `use-toast` colapsa toasts idénticos (mismo variant + título + descripción) dentro de una ventana corta, para que una ráfaga del mismo error no apile/parpadee varios.
- **`notifyError`** (`src/lib/handleError.ts`): resuelve el error (códigos Postgres/PostgREST, red, edge functions) a un mensaje claro en español y muestra un único toast.
- **Centralización**: el `MutationCache` del QueryClient (`App.tsx`) enruta a `notifyError` toda mutation de React Query sin `onError` propio.
- **Catch global** (`src/lib/globalErrorHandlers.ts`, instalado en `main.tsx`): `unhandledrejection` y `error` de `window` → `notifyError`, filtrando ruido no accionable (AbortError, ResizeObserver loop). Los errores de render los cubre `<ErrorBoundary>`.
