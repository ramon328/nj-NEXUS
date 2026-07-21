# GoAuto — Documentación

Esta carpeta contiene la documentación completa de GoAuto, organizada en dos niveles:

## Estructura

```
docs/
├── technical/          ← Para desarrolladores y contexto de código
│   ├── 00-architecture.md    — Stack, estructura, multi-tenancy, auth
│   ├── 01-vehicles.md        — Módulo de vehículos (rutas, componentes, servicios, hooks)
│   ├── 02-sales.md           — Ventas y aprobación (flujo, triggers, comisiones)
│   ├── 03-leads.md           — Leads (tipos, Kanban, notificaciones)
│   ├── 04-financing.md       — Financiamiento (modelo, pagos, progreso)
│   ├── 05-customers.md       — Clientes (CRUD, importación)
│   ├── 06-tasks-calendar.md  — Tareas, calendario, agendamientos, solicitudes
│   ├── 07-integrations.md    — ChileAutos, GetAPI, Facebook, MeLi, WhatsApp, Instagram
│   ├── 08-builder.md         — Website builder (Craft.js, secciones, templates)
│   ├── 09-permissions.md     — Sistema RBAC (112+ permisos, roles, dependencias)
│   ├── 10-dashboard.md       — Dashboard (tabs, widgets, métricas, superadmin)
│   ├── 11-terms-acceptance.md — Aceptación obligatoria de TyC al primer login
│   └── 12-seo.md             — SEO y datos estructurados (admin → website, JSON-LD)
│
└── user-guide/         ← Para GAIA y usuarios finales
    ├── 00-overview.md        — Visión general, módulos, roles
    ├── 01-vehicles.md        — Cómo gestionar vehículos
    ├── 02-sales.md           — Cómo registrar y aprobar ventas
    ├── 03-leads.md           — Cómo gestionar leads
    ├── 04-financing.md       — Cómo usar financiamiento
    ├── 05-customers.md       — Cómo gestionar clientes
    ├── 06-tasks-calendar.md  — Tareas, calendario y agendamientos
    ├── 07-integrations.md    — ChileAutos, Instagram, Facebook, WhatsApp
    ├── 08-builder.md         — Cómo diseñar tu sitio web
    ├── 09-dashboard.md       — Cómo leer el dashboard
    ├── 10-configuration.md   — Cómo configurar el sistema
    ├── 11-documents.md       — Cómo generar documentos
    └── 12-marketing.md       — Marketing, alertas, tasador, asistente IA
```

## ¿Cómo se mantiene actualizada?

Esta documentación debe actualizarse cuando:
- Se agrega una nueva funcionalidad
- Se modifica un flujo existente
- Se agrega una nueva integración
- Se cambian permisos o roles

Al hacer cambios en el código, actualizar el `.md` correspondiente en ambas carpetas (technical y user-guide).
