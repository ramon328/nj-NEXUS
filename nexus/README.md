# Nexus

Orquestador de agentes e integraciones de negocio. Corre 24/7 en un Mac (o cualquier máquina Unix) y se opera principalmente por **WhatsApp** (Kapso / Meta Cloud API) y un hub web local.

Este README sirve para **levantar Nexus en cualquier PC** desde el código del repo, **sin** copiar secretos ni datos de producción.

---

## Qué vas a necesitar

| Requisito | Notas |
|---|---|
| macOS o Linux | En producción actual: macOS + `launchd`. En otro PC puedes usar `launchd`, `systemd` o solo `node` a mano |
| Node.js **20+** (recomendado 22/24) | `node -v` |
| npm | Viene con Node |
| Python **3.9+** | Solo si usas SII-web, Mallorca API, menubar o TTS |
| Cuenta Anthropic | API key |
| Proyecto Supabase | URL + anon + service_role |
| WhatsApp Cloud API (Kapso u otro) | Si quieres canal WhatsApp |
| Chrome / Chromium | Para conectores de banco y navegador |

**No copies** desde otra máquina: `.env`, perfiles `chrome-profile*`, `session*.json`, `*.db`, certificados `.pfx`, tokens OAuth, `usuarios.json` con números reales.

---

## 1. Clonar

```bash
git clone https://github.com/ramon328/nj-NEXUS.git
cd nj-NEXUS/nexus
```

Si trabajas solo el árbol de Nexus (este directorio como repo raíz), clona/copia la carpeta `nexus/` del monorepo.

---

## 2. Secretos (obligatorio)

```bash
cp .env.example .env
chmod 600 .env
# Edita .env y rellena al menos:
#   ANTHROPIC_API_KEY
#   SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
#   KAPSO_*  (si usas WhatsApp)
```

El archivo `.env` está en `.gitignore`. **Nunca** lo subas ni lo pegues en chats.

Plantilla completa de variables: [`.env.example`](./.env.example).

Esquema SQL inicial (Supabase):

```bash
# En el SQL Editor de Supabase, ejecuta:
# shared/supabase-schema.sql
```

---

## 3. Instalar dependencias

```bash
# Núcleo
cd hub && npm install && cd ..
cd shared && npm install && cd ..

# Conectores que uses (instala solo los que necesites)
for d in conector-tek conector-navegador conector-obsidian conector-sii \
         conector-correo conector-autored conector-reservo \
         claude-web novnc-web tag-web; do
  [ -f "$d/package.json" ] && (cd "$d" && npm install)
done

# Frontends opcionales
[ -f sii-frontend/package.json ] && (cd sii-frontend && npm install)
[ -f sii-web/requirements.txt ] && (cd sii-web && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt)
```

En Mac Intel Homebrew vive en `/usr/local`; en Apple Silicon en `/opt/homebrew`. Ajusta el `PATH` de los LaunchAgents si migras de arquitectura.

---

## 4. Arranque mínimo (sin daemons)

Para probar en cualquier PC sin `launchd`:

```bash
# Terminal 1 — Hub (API + agente + panel)
cd hub && node server.js
# → http://127.0.0.1:3000

# Terminal 2 — Segundo Cerebro (opcional)
cd conector-obsidian && node server.js
# → http://127.0.0.1:8081

# Terminal 3 — Navegador genérico (opcional)
cd conector-navegador && node server.js
# → http://127.0.0.1:8082
```

Chat local: `POST http://127.0.0.1:3000/api/chat`  
Salud: `GET http://127.0.0.1:3000/api/health`

---

## 5. Arranque 24/7 en macOS (`launchd`)

Los plists viven en `~/Library/LaunchAgents/com.nexus.*.plist` (no van en el repo con secretos embebidos).

Plantillas / scripts:

```bash
# Instalar / recargar agentes (idempotente; revisa antes qué labels existen)
./scripts/instalar.sh

# Estado
./scripts/estado.sh

# Tras un reinicio (espera Tailscale, Funnel, webhook)
./scripts/arranque.sh
```

**Importante al migrar a otro Mac:**

1. Copia el código (git) y crea un `.env` nuevo.
2. **No** copies plists con tokens en claro; regenera tokens y escribe plists nuevos o carga secretos solo desde `.env`.
3. Reinstala dependencias (`npm install` / venvs).
4. Vuelve a vincular WhatsApp / Kapso webhook a la URL pública nueva.
5. Sesiones de banco: hay que volver a hacer login (los `chrome-profile*` no viajan).

---

## 6. Exponer a internet (opcional)

En producción se usa **Tailscale Funnel** hacia `127.0.0.1` (hub `/wa`, centro-pub, widgets, etc.). Alternativas: Cloudflare Tunnel, bore, reverse proxy.

El webhook de WhatsApp debe apuntar a algo como:

```text
https://<tu-host-publico>/wa/kapso
```

Firma HMAC: `KAPSO_WEBHOOK_SECRET` (fail-closed si falta).

Script de ayuda (si usas Kapso + Funnel estable):

```bash
node scripts/asegurar-webhook.mjs
```

---

## 7. Estructura (mapa rápido)

```text
nexus/
  hub/                 Cerebro (asistente.mjs) + Express + UI React
  shared/              Cliente Supabase + SQL
  conector-tek/        Banco (Chrome + candado + corazón)
  conector-sii/        Impuestos
  conector-goautos/    Automotora
  conector-navegador/  Playwright genérico
  conector-obsidian/   API bóveda Markdown
  tag-web/             Google / TAG
  sii-web/             Backend Python SII
  scripts/             Arranque, watchdogs, instalación
  .env.example         Variables (sin valores)
```

Documentación de arquitectura más amplia (si la generaste): ver PDF / docs aparte. Este README es la guía operativa de bootstrap.

---

## 8. Seguridad — checklist antes de `git push`

- [ ] No hay `.env` ni `.env.bak*` en el commit  
- [ ] No hay `chrome-profile*`, `session*.json`, `*.pfx`, `*.pem`  
- [ ] No hay `historial.db`, `usuarios.json`, `recordatorios.json` con datos reales  
- [ ] No hay tokens en plists versionados  
- [ ] `.env.example` solo tiene nombres y valores vacíos / defaults no secretos  

El monorepo de respaldo (`nj-NEXUS`) además redacta patrones tipo `sk-ant-…` al sincronizar.

---

## 9. Operación diaria

```bash
# Logs típicos (macOS)
tail -f /tmp/nexus-hub.log

# Reiniciar un servicio
launchctl kickstart -k gui/$(id -u)/com.nexus.hub

# Alertar por WhatsApp (requiere Kapso + plantilla aprobada)
cd hub && node alertar.mjs "+569XXXXXXXX" "mensaje de prueba"
```

---

## 10. Qué NO está en este repo (a propósito)

| Excluido | Por qué |
|---|---|
| `.env`, tokens, certs | Secretos |
| Perfiles Chrome / sesiones banco | Cookies y login |
| SQLite / JSON de usuarios y recordatorios | Datos personales y de negocio |
| Modelos TTS / binarios (`*.onnx`, `bore`, …) | Pesados / regenerables |
| `node_modules`, `.venv`, builds | Se reinstalan |

Los datos de negocio viven en **Supabase** (y en el Mac de producción). El repo es **solo código**.

---

## Licencia / uso

Privado. Uso interno. No publicar forks con `.env` ni dumps de producción.
