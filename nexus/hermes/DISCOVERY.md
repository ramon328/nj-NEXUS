# Hermes discovery map — Phase 0

Synthetic identifiers only. No credentials, phones, customer records, private prompts, or live repo URLs.

Inspected: `nj-NEXUS` workspace, hub on 2026-08-20. Where this tree disagrees with the 54-page technical doc, **the repo wins**.

---

## 0. Product rule vs as-built

Hermes is supposed to be the bouncer. Today the bouncer is scattered inside `nexus/hub/asistente.mjs` (`ejecutar`), `server.js` (cobranza / SII-acotado / externos), and prompt text. Adapters still decide “yes” for anything that has no scope. Denies are returned as `🔒` strings to the model. They are not deny receipts.

This attachment puts **one fail-closed gate** in front of the tool loop. Adapters keep schema, timeout, redaction, idempotency. They lose the right to be the only yes.

---

## 1. As-built map

### 1.1 Runtime

| Item | As-built |
|---|---|
| Hub package | `nexus-hub` version `1.0.0` (package.json; not a deploy stamp) |
| Agent loop | `nexus/hub/asistente.mjs` — **733 041 bytes**, 7776 lines (doc expected ~717 KB) |
| HTTP hub | `nexus/hub/server.js` — Express, `node server.js`, port `PUERTO_HUB` (default 3000) |
| LLM | Direct Anthropic SDK in the hub. Hybrid Haiku/Sonnet/Opus. Optional fallback in `modelos.mjs` |
| Process model | Single-thread Node hub + loopback HTTP connectors + launchd |

### 1.2 Hub / tools

Tools live in one `HERRAMIENTAS` array and one `ejecutar(nombre, input, ctx)` dispatcher. Count in this tree: **103** (doc expected ~101). Freeze test in `hermes/tests/registry-freeze.test.mjs` fails if the lists drift.

Registration is not a plugin API. Connectors are direct imports (`conector-sai`, `conector-autored`, `tag-web`, …) or loopback HTTP (`CEREBRO` :8081, `NAVEGADOR` :8082, SII backend).

### 1.3 Identity

Assembled in `server.js` `/api/chat` and `/wa/kapso`:

- WhatsApp: sender E.164 from Kapso payload → `de`
- Web: `req.body.de` or empty; `_anon` memory key if missing
- No first-class `tenant_id`, `actor_id`, `lane`, `correlation_id`, `project_id`

User store: `~/nexus/usuarios.json` (gitignored) plus founder records **hardcoded in `asistente.mjs`**. Scopes come from an `EMPRESAS` map (business-unit aliases) union loose scopes. Web Centro can impersonate a founder via env (`CENTRO_ADMIN_DE`) or a portal JWT map **in source**.

Hermes mapper now hashes actor/conversation hints. It never reads the phone book.

### 1.4 Permissions (prompt vs code vs adapter)

| Layer | What it does | Gap |
|---|---|---|
| Prompt | Large system prompt in `asistente.mjs` | Not a gate |
| Code in `ejecutar` | Founder-only user mgmt / scheduled msgs / alerts; `scopeDeTool` vs `accesosDe` | Tools **with no scope are free** |
| SII-acotado / cobranza | Separate agent loops, fewer tools | Not the same gate |
| Externals | Silence if not a registered user | Channel filter, not tool policy |
| Adapters | Many tools run if `ctx.de` is empty (web) as long as they are unscoped | Self-authorize |

**Documented bug in as-built:** `aliace_resumen` and `aliace_anual` are **not** in `SCOPE_TOOLS.aliace`. A user without Aliace scope could still run them. Hermes registry assigns them `scopes: ['aliace']`.

### 1.5 Can a tool run with missing actor / tenant / project / ticket?

Yes, before this gate:

- Web/`_anon`: unscoped tools run
- No tenant object exists (single implied tenant)
- No project_id on the request
- No ticket object; reminders JSON is not a ticket
- `ctx.de` empty → `esAdmin` false, `accesosDe` empty → scoped tools denied, unscoped allowed

After the gate: missing identity → deny (audited). Mutations need project + ticket + idempotency. Irreversible needs extra approval. The hub adapter may mint a **session ticket** only for `reversible_mutation`. It never auto-approves irreversible.

### 1.6 Are denials logged?

Before: mostly no. Invalid webhook signatures go to stderr. Tool denials are model-visible strings. `historial.mjs` `actividad_ias` records tool runs (ok/error), not policy denies.

After: `hermes/data/audit.jsonl` (gitignored) deny **and** allow receipts, redacted.

### 1.7 Confused deputy

One loop, one tool list. Any admin conversation can call any tool. A scoped user is limited by `SCOPE_TOOLS` **except unscoped tools and the Aliace summary hole**. There is no per-agent capability set. MoA does not exist. SII-acotado and cobranza are separate loops (good) but the main loop is a deputy for everything else.

Hermes test: `actor-test-sii` cannot run `tek_transferir`.

### 1.8 Client channel

| Item | As-built |
|---|---|
| Provider | Official WhatsApp Cloud API via Kapso (not OpenClaw for production inbound) |
| Ingress | `POST /wa/kapso` in `server.js` |
| Signature | HMAC-SHA256, `X-Webhook-Signature`, fail-closed if secret missing (`kapso.verificarFirma`) |
| Owner | Hub process is the consumer |
| OpenClaw | Still referenced for allowlists / alta. Production chat already bypasses it. This is **not** an OpenClaw plugin migration |
| Response | JSON `{ reply }` from `/api/chat`; WhatsApp send via Kapso; ack 200 then background process |

Exactly-one-consumer cutover is **Phase 4**, not done here.

### 1.9 Memory

| Store | Where | Retention / delete |
|---|---|---|
| In-process Map | `server.js` `_memoria` | TTL; lost on restart except rehydrate |
| SQLite chat + activity | `~/nexus/historial.db` | No deletion SLA in code |
| Vault notes | Obsidian via `CEREBRO_RUTA` / conector-obsidian | Files |
| Per-user memory | `memoria-usuarios.mjs` → vault Markdown | Write/read; no propagation SLA |
| JSON side files | reminders, pendientes, dictados | Local |

Index for a tenant knowledge vault is **not** present. Do not ingest production docs.

### 1.10 Browser

| Surface | Engine | Keep in v1? |
|---|---|---|
| `conector-navegador` | Playwright, generic | Yes, behind the gate (tools classed reversible/read) |
| `conector-tek` | Persistent Chrome profiles, bank | **Yes. Not replaced.** Banking tools classed irreversible where they move money |
| Sensitive profiles | gitignored `chrome-profile*` | Stay on existing executor |

Goliath / Camoufox is **not** in this tree. Do not claim CDP vs Camoufox until a later artifact.

### 1.11 Queue / reminders / activity

- `recordatorios.mjs` + JSON stores (gitignored)
- `pendientes-sistema.json`
- `historial.mjs` activity log
- No durable ticket claim/lease/acceptance (Phase 3)

Phase 0 session tickets are append-only JSONL. They are not a tunnel.

### 1.12 Projects / repos

Hub `EMPRESAS` aliases exist (several dormant). Canonical opaque IDs: `proj-001` … `proj-006` in `hermes/projects.mjs`. Dormant units are **not writable**. Tests use `proj-test-alpha` / `proj-test-beta` and example remotes on `git.example.test` only.

No signed workspace manifests in production repos yet. Gate blocks unknown remotes and unsigned folders.

### 1.13 Dashboards

Hub React UI + Centro de IAs (`centro-pub.mjs`, HMAC session). Reporting is not the Mega-TLDR DTO. Phase 2.

### 1.14 launchd / rollback

Scripts: `nexus/scripts/instalar.sh`, `estado.sh`, `arranque.sh`, `respaldar.sh`. Plists live in `~/Library/LaunchAgents/com.nexus.*` and are **not** in git with secrets. Rollback of this gate: revert the `ejecutar` hook; connectors keep working.

### 1.15 Secrets

Present as **names** in `nexus/.env.example`. Values live on the production machine (`chmod 600`), not in this repo. Verification reports presence/ownership only.

---

## 2. Surfaces the repo does not fully answer

1. **Inbound owner at cutover** — hub `/wa/kapso` is the current consumer. Who signs the Phase 4 singleton is not in-tree.
2. **Hermes tenant id for production** — set `HERMES_TENANT_ID`; default in code is `tenant-local` (not a fleet name).
3. **Connector classes** — classified in the registry; mixed tools (`sii`, `correo`, `venta`) still need a later split.
4. **Durable audit/queue store for Hermes** — JSONL under `HERMES_DATA_DIR` for Phase 0/1. SQLite/Postgres choice is open.
5. **Which browser workflows stay persistent** — bank/tek yes; generic Playwright yes; anything else unstated.
6. **Memory deletion SLA** — not specified in code.
7. **Non-prod / synthetic fixture owner** — this tree’s fixtures; named human owner not in repo.
8. **Rollout approver / rollback operator** — not in repo. Ask before commit/push/PR.
9. **Optional verticals** — no immediate business case in-tree; not started (clone/brand/Web3/sales/Excel).
10. **Proprietary modules** — no compiled Goliath/Excel package here.

---

## 3. Policy-gate gap analysis (closed vs remaining)

| Gap | Before | Phase 0–1 |
|---|---|---|
| One gate in code | No | `hermes/policy-gate.mjs` + hook in `ejecutar` |
| Four action classes | No (prompt “sensitive” only) | Registry freeze |
| Deny audit | No | JSONL receipts |
| Missing identity fail-closed | Partial (externals silenced) | All classes |
| Unknown project writes | No project object | Fail closed |
| Ticket + idempotency | No | Required for mutations; session ticket only for reversible |
| Irreversible extra approval | Human-in-the-loop comments; not a gate | Fail closed without `extraApproval` |
| Owl | Absent | Alert-only, never-touch, unknown never eligible |
| Repo boundary | Absent | Manifest or allowlisted remote; not path-only |
| Confused deputy | Unscoped tools + Aliace hole | Scope on every capability; Aliace summaries scoped |
| Expand monolith | 733 KB loop | Gate is a sibling package; hook is thin |

**Intentionally not done:** Goliath, Excel, sales, Web3, clone, brand, MoA, WhatsApp cutover, engineer tunnel leases, Mega-TLDR DTO.

---

## 4. Named owners (as far as the repo says)

| Surface | Owner in tree |
|---|---|
| Hub / agent loop | Nexus engineering (Ramon in comments) |
| Policy gate | This Hermes attachment |
| Secrets | Production machine, not git |
| Bank executor | `conector-tek` (keep) |
| WhatsApp ingress | Hub `server.js` + `kapso.mjs` |

---

## 5. Conflicts with the 54-page doc

- Hub size 733 KB vs ~717 KB.
- Tool count 103 vs ~101.
- OpenClaw still in alta/allowlist paths; production inbound is Kapso.
- Permissions are not prompt-only: there is a real scope map, but it is incomplete and inside the monolith.
- No plugin registry; homegrown connectors. Confirmed: **tool adapters + policy extraction**, not an OpenClaw-plugin migration.
