# GoAuto Admin — Claude Context

## Proyecto
Plataforma multi-tenant de gestión para automotoras (GoAuto). React + TypeScript + Supabase.

## Documentación
La carpeta `docs/` contiene documentación completa del sistema:
- `docs/technical/` — Documentación técnica (arquitectura, módulos, servicios, hooks)
- `docs/user-guide/` — Guía de usuario (para GAIA y usuarios finales)

## Regla: Mantener documentación actualizada
**Después de implementar una nueva funcionalidad o modificar un flujo existente**, actualiza los archivos `.md` correspondientes en ambas carpetas (`docs/technical/` y `docs/user-guide/`). Si la funcionalidad es completamente nueva y no encaja en ningún archivo existente, crea uno nuevo y actualiza `docs/README.md`.

## Regla: Consultar schema antes de migraciones
Siempre leer el `CREATE TABLE` real antes de escribir migraciones. No asumir nombres de columnas.

## Regla: No reemplazar, agregar
Al hacer la UI "más completa", agregar debajo de la vista existente, no reemplazar.
