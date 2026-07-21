# Aceptación de Términos y Condiciones

Módulo de cumplimiento legal. Bloquea el uso de la plataforma hasta que el cliente
(automotora) acepte explícitamente los Términos y Condiciones y la Política de
Privacidad en el primer login.

## Modelo de datos

Migración: `supabase/migrations/20260517120000_add_terms_acceptance_to_clients.sql`

| Columna                    | Tipo          | Descripción                                                                 |
| -------------------------- | ------------- | --------------------------------------------------------------------------- |
| `clients.terms_accepted_at` | `timestamptz` | Momento en que algún usuario admin del cliente aceptó. `NULL` = no aceptado.|
| `clients.terms_accepted_by` | `uuid`        | `auth.users.id` del usuario que aceptó en nombre del cliente.               |

La aceptación es **a nivel de cuenta/cliente**, no de usuario individual: el
primer admin del cliente que entre acepta para toda la automotora.

## Componentes

- `src/components/terms/TermsAcceptanceDialog.tsx` — Dialog modal forzado, no
  cerrable por click-outside ni ESC. Tabs internos para TyC y Privacidad.
  Botones: "Aceptar y continuar" (UPDATE en `clients`) / "No acepto, cerrar sesión"
  (delega a `signOut`).
- `src/components/terms/TermsContent.tsx` — Cuerpo legal de los Términos.
  **Espejo** de `landing-goauto/src/pages/TermsPage.tsx`. Mantener sincronizado.
- `src/components/terms/PrivacyContent.tsx` — Cuerpo legal de la Política de
  Privacidad. Espejo de `landing-goauto/src/pages/PrivacyPage.tsx`.

## Gate en `ProtectedRoute`

`ProtectedRoute.tsx` evalúa `needsTermsAcceptance`:

```ts
const needsTermsAcceptance =
  !!user &&
  !!client &&
  !client.terms_accepted_at &&
  userRole !== 'superadmin' &&
  !isTenantOverride;
```

Si es `true`, se monta `<TermsAcceptanceDialog open>` sobre `{children}`. El
overlay del dialog cubre toda la app: aunque las rutas se renderizan debajo, no
son interactivas. Superadmin y suplantación de tenants quedan exentos — la
aceptación debe hacerla el cliente real.

## Visibilidad cross-DB

La fecha de aceptación se expone al CRM (Goautos-ventas) vía el SELECT extendido
en `api/admin-stats.ts` y `src/services/adminStatsService.ts`. La página
`/contratos` del CRM (`ContratosPage.tsx`) cruza por `admin_client_id` para
mostrar columna "Acepto TyC" + "Fecha aceptación".

Estados que considera la UI del CRM:

- **explicit**: `terms_accepted_at` real → Sí + fecha.
- **implicit**: el cliente existe en admin DB pero todavía no aceptó el modal
  (cuenta anterior a esta feature) → Sí + `created_at` con badge "implícito".
- **crm-fallback**: no se encuentra `admin_client_id` en admin DB → Sí + fecha
  del CRM (best-effort).
- **missing**: sin fecha en ninguna fuente → No.
