# nj-NEXUS — Respaldo de código

Monorepo de **solo código** de los proyectos del Mac mini (Nexus y satélites).

## Arrancar Nexus en cualquier PC

Instrucciones completas (Node, `.env`, dependencias, launchd, seguridad):

→ **[`nexus/README.md`](./nexus/README.md)**

Plantilla de variables (vacía): **[`nexus/.env.example`](./nexus/.env.example)**

## Qué hay aquí

| Carpeta | Proyecto |
|---|---|
| `nexus/` | Orquestador + hub + conectores |
| `goautos-admin/` | Admin automotora |
| `estudio/` | Editor / media |
| `forja-nicojuri/` | Portal Forja |
| `nj-Ai-ws/` · `nj-bc-sii/` · `nexus-nico-loop/` | Satélites |
| `bin-home/` | Scripts de `~/bin` |

## Secretos

**No** van a este repo: `.env`, certificados, perfiles Chrome, sesiones de banco, bases SQLite, tokens OAuth, JSON con usuarios/números.

Los secretos viven solo en la máquina de producción (`chmod 600`). El sync automático excluye patrones peligrosos y redacta strings tipo API keys embebidas en la **copia** del backup (nunca en los originales).

## Auto-respaldo

LaunchAgent `com.nexus.backup-git` ejecuta `.sync.sh` cada ~10 min → `git push origin main`.
