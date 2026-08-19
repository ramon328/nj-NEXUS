# Hermes gate (Nexus attachment)

Hermes is the bouncer. Nexus tools sit behind it.

This directory is **attachment type 3** (policy gate) plus the Phase 0 capability registry and Phase 1 isolation helpers. It is not a second agent loop. It does not copy fleet internals, live credentials, or customer records.

## Canonical flow

Identity mapper → capability registry (adapter declares) → policy gate (one place in code) → allow/deny. Denies are audited. Missing actor / tenant / project / ticket fails closed. Adapters do not decide “is this actor allowed.”

Action classes: `read` | `draft` | `reversible_mutation` | `irreversible_mutation`.

## Phase status

- **Phase 0 (this tree):** registry freeze, identity contract, fail-closed gate, deny+allow audit, synthetic fixtures.
- **Phase 1 (this tree):** canonical project IDs, unknown/unbound writes blocked, repo-boundary checks, Owl **alert-only**.
- **Later:** tickets with claim leases (Phase 3), WhatsApp singleton cutover (Phase 4), MoA/Goliath/Excel/sales (explicitly not here).

## Tests

```bash
cd nexus/hermes && npm test
```

Synthetic IDs only. No production data.

## Hub wiring

`asistente.mjs` calls `authorizeHubTool` at the start of `ejecutar()`. Existing per-user denials remain as a second deny layer. They cannot be the only “yes.”
