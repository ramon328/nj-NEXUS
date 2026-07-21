# Nexus — Infraestructura 24/7 (Mac mini de NICOLAS)

Orquestador y servicios siempre encendidos para **IMPOMIN** y **HN**.
Todo corre como **daemons nativos de macOS** (`launchd`): arrancan solos al encender,
se reinician solos si se caen, y siguen vivos sin ninguna ventana ni terminal abierta.

> **Hardware:** Mac mini 2018 **Intel** (x86_64). Homebrew vive en `/usr/local` (no `/opt/homebrew`).
> **Cerebro:** Claude por **API en la nube** (no hay modelos locales). El Mac solo orquesta.

---

## 🗺️ Qué corre aquí

| Servicio | Qué es | Puerto | Daemon (launchd) |
|---|---|---|---|
| **Hub Nexus** | Panel de control web (React + servidor Node) | `:3000` | `com.nexus.hub` |
| **OpenClaw** | Gateway de agentes (WhatsApp ↔ Claude) | `:18789` | `com.nexus.openclaw` |
| **Comisiones** | App de comisiones (cuando se clone el repo) | `:3001` | `com.nexus.comisiones` |
| **Conector SII** | Servicio SII (cuando exista) | `:8080` | `com.nexus.sii` |
| **Segundo Cerebro** | Conector de la bóveda Obsidian (busca/lee/escribe notas) | `:8081` | `com.nexus.cerebro` |
| **Menu bar** | Semáforo visual en la barra (sin lógica) | — | `com.nexus.menubar` |

Todos escuchan en **`127.0.0.1` (loopback)** — nada expuesto a internet.
El acceso remoto será vía **Tailscale** (red privada), nunca abriendo puertos.

---

## 🚦 Operación diaria

```bash
# Ver el estado de todo (semáforo + daemons + health-checks)
~/nexus/scripts/estado.sh

# Reiniciar UN servicio (ejemplo: el hub)
launchctl kickstart -k gui/$(id -u)/com.nexus.hub
#   labels: com.nexus.hub | com.nexus.openclaw | com.nexus.comisiones | com.nexus.sii | com.nexus.menubar

# Actualizar dependencias y recargar todos los daemons
~/nexus/scripts/actualizar.sh

# Respaldar configuración y código (los DATOS viven en Supabase)
~/nexus/scripts/respaldar.sh

# (Re)instalar / cargar todos los LaunchAgents — idempotente
~/nexus/scripts/instalar.sh
```

El **Hub** se abre en el navegador: **http://127.0.0.1:3000**

> 🖥️ **Ícono en el Escritorio:** hay una app **`Nexus`** en el Escritorio. Doble clic =
> asegura que los daemons estén cargados y abre el Hub. (Primera vez: si macOS bloquea
> "desarrollador no identificado", clic derecho sobre el ícono → **Abrir** → **Abrir**.)

### 💬 Probar el agente por chat web (modo actual, sin WhatsApp)

Mientras no haya número de WhatsApp, se prueba el cerebro desde el navegador:

- Desde el Hub: botón **"💬 Hablar con el agente (chat web)"**.
- O directo (Control UI de OpenClaw con token):
  `http://127.0.0.1:18789/#token=<gateway.auth.token de ~/.openclaw/openclaw.json>`
  (o `openclaw dashboard` para abrirlo automáticamente).

Cuando llegue el número, se conecta WhatsApp con `openclaw channels` (QR) y conviven ambos.

---

## 📜 Logs

| Servicio | Log |
|---|---|
| Hub | `/tmp/nexus-hub.log` |
| OpenClaw | `/tmp/nexus-openclaw.log` (detalle interno en `/tmp/openclaw/`) |
| Menu bar | `/tmp/nexus-menubar.log` |

```bash
tail -f /tmp/nexus-openclaw.log      # seguir en vivo
openclaw logs                        # logs del gateway vía CLI
openclaw status                      # estado de gateway/canales/modelos
```

---

## 🧠 Segundo Cerebro (bóveda Obsidian) y Enlaces

El **conocimiento empresarial** vive en una bóveda de notas Markdown en `~/nexus/cerebro`.
Es una bóveda de **Obsidian** normal: ábrela con la app (Obsidian → *Abrir carpeta como
bóveda* → elige `~/nexus/cerebro`, ponle de nombre **`cerebro`**) y escribe libremente.

El daemon **Conector Segundo Cerebro** (`:8081`, `com.nexus.cerebro`) expone una API local
sobre esa carpeta para que el **Hub** y el **agente** la usen:

```
GET  /health             estado + nº de notas
GET  /listar             todas las notas (.md)
GET  /buscar?q=texto     búsqueda en título + contenido, con fragmento
GET  /nota?ruta=...      leer una nota
POST /nota               crear / agregar / sobrescribir (modo: crear|agregar|sobrescribir)
```

- **Desde el Hub:** sección **🧠 Segundo Cerebro** → buscador que lee la bóveda en vivo.
- **Desde el agente (`2cerebro`):** la bóveda está enlazada en su workspace
  (`~/.openclaw/workspace/cerebro` → `~/nexus/cerebro`), así que **lee y escribe** notas
  directamente con sus herramientas de archivos. Cada escritura queda auditada en Supabase
  (`log_acciones`, acción `cerebro:*`).
- **Seguridad:** toda ruta se valida para no salir de la bóveda; en modo `crear` el agente
  **no pisa** una nota existente (crea copia con fecha). Solo loopback `127.0.0.1`.

### 🔗 Enlaces (SII · internos · conocimiento)

El Hub muestra un catálogo de accesos editable en **`~/nexus/enlaces.json`**
(cámbialo y recarga el Hub, sin reiniciar nada):

- **SII** — precargado con los accesos estándar (Mi SII, F29, F22, RCV, boletas, etc.).
- **Servicios internos** — IMPOMIN / HN. Hay ejemplos en gris (`"pendiente": true`):
  reemplázalos por tus URLs reales.
- **Conocimiento empresarial** — abre la bóveda y notas clave directo en Obsidian
  (enlaces `obsidian://`).

> Para que funcione el botón *"Abrir bóveda en Obsidian"* debes haber agregado la carpeta
> como bóveda con el nombre **`cerebro`** al menos una vez en la app.

---

## 🧠 Ruteo de modelos y control de costos

Configurado en OpenClaw (`~/.openclaw/openclaw.json`) para **gastar lo mínimo sin perder calidad**:

- **Por defecto: Claude Haiku 4.5** (`anthropic/claude-haiku-4-5`) — lo barato y de alto volumen
  (clasificar correo, resumir, extraer, enrutar, respuestas simples). $1/$5 por millón de tokens.
- **Escalar a Sonnet 4.6** solo para criterio/consecuencias. Hay un alias listo: **`escalado`** → `anthropic/claude-sonnet-4-6`.
  Para que un agente concreto use Sonnet:
  ```bash
  openclaw config set agents.list[<i>].model anthropic/claude-sonnet-4-6
  ```
- **Opus 4.8** queda fuera del uso habitual (solo casos excepcionales).
- **Pensamiento adaptativo:** `agents.defaults.thinkingDefault = adaptive` (razona profundo solo cuando vale la pena).
- **Prompt caching:** activado en el modelo Haiku (`compat.supportsPromptCacheKey = true`) — ahorra ~90% del input repetido (system prompts).
- **Batch API (50% off):** para trabajo NO urgente (reportes nocturnos, reprocesos del día) usar `openclaw cron` + batch. El tiempo real (WhatsApp) va por API normal.

**Auditoría de gasto:** cada acción/llamada se registra en Supabase (tablas `log_acciones` y `consumo_api`),
y el Hub muestra el costo estimado del mes de un vistazo.

> ⚠️ **Pon un tope de gasto mensual** en https://console.anthropic.com → Billing → Usage limits,
> antes de dejar los agentes corriendo solos.

Ver/cambiar el modelo por defecto:
```bash
openclaw models status          # modelo actual
openclaw models set anthropic/claude-haiku-4-5
openclaw models aliases list
```

---

## 🔐 Seguridad

- **FileVault:** activo (disco cifrado). ✅
- **Secretos:** solo en `~/nexus/.env` (`chmod 600`, en `.gitignore`). La API key de Anthropic vive
  además en el store cifrado de OpenClaw (`~/.openclaw/.../openclaw-agent.sqlite`, 600). Nunca en el repo.
- **Red:** todo en loopback. Acceso remoto solo por **Tailscale** (pendiente de instalar). No abrir puertos.
- **Supabase RLS:** activado en todas las tablas. Los daemons leen/escriben con la `service_role` key
  (salta RLS); nadie con la anon/publishable key puede leer datos sensibles.
- **Aprobación humana para acciones críticas:** el helper `registrarAccion({ requiere_aprobacion: true })`
  deja la acción en `pendiente` hasta que un humano la apruebe (futuro: confirmación por WhatsApp).
- **Prompt injection:** el agente que lee correo externo (**Nestor**) trata el contenido como dato
  NO confiable y **no** ejecuta acciones sensibles sin aprobación. Separar lectura de ejecución.

---

## 🔑 Secretos (`~/nexus/.env`)

```
ANTHROPIC_API_KEY          # cerebro (Claude). También en el store de OpenClaw.
MODELO_DEFAULT/_ESCALADO   # ruteo de modelos
SUPABASE_URL / _ANON_KEY / _SERVICE_ROLE_KEY
PUERTO_HUB/_COMISIONES/_SII/_OPENCLAW
WHATSAPP_NUMERO            # número dedicado (pendiente)
```

> 🔁 **Recomendado:** rotar la `ANTHROPIC_API_KEY` y la `service_role` de Supabase una vez,
> porque se pegaron en un chat durante la instalación.

---

## 📦 Estructura

```
~/nexus/
  hub/              Panel de control (React/Vite + server.js)    :3000
  comisiones/       App de comisiones (pendiente de repo)        :3001
  conector-sii/     Servicio SII (pendiente)                     :8080
  conector-obsidian/ Segundo Cerebro: API sobre la bóveda        :8081
  cerebro/          Bóveda Obsidian (notas .md, conocimiento)    —
  enlaces.json      Catálogo de enlaces del Hub (editable)       —
  shared/           Cliente Supabase + helpers (supabase.mjs) + esquema SQL
  menubar/        App de barra de menú (rumps / Python)
  scripts/        instalar.sh · estado.sh · actualizar.sh · respaldar.sh
  logs/           (efímeros)
  .env            secretos (chmod 600, NO en git)
```

OpenClaw: binario en `~/.npm-global/bin/openclaw`, config y estado en `~/.openclaw/`.

---

## ✅ Estado de la instalación

**Funcionando 24/7:**
- [x] Hub Nexus (daemon, KeepAlive)
- [x] OpenClaw (daemon, KeepAlive, Haiku + escalado + caching + thinking adaptativo)
- [x] Supabase (esquema, lectura y escritura desde el Hub)

**Pendiente (necesita acción):**
- [ ] **Command Line Tools** → `xcode-select --install` (desbloquea Homebrew, Tailscale, menu bar)
- [ ] **Homebrew + Tailscale** (tras las CLT; Homebrew necesita la contraseña de macOS)
- [ ] **Menu bar** → crear venv de Python y cargar `com.nexus.menubar`
- [ ] **WhatsApp** → conectar canal con un número dedicado: `openclaw channels` (escanear QR)
- [ ] **Tope de gasto** en console.anthropic.com
- [ ] **Prueba post-reinicio** (reiniciar el Mac y confirmar que todo vuelve solo)

---

## 🔧 Cómo terminar lo pendiente

```bash
# 1) Command Line Tools (abre ventana → Instalar)
xcode-select --install

# 2) Homebrew (pide contraseña de macOS) + Tailscale
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
brew install --cask tailscale

# 3) Menu bar (tras las CLT)
~/nexus/scripts/instalar.sh        # crea el venv e instala rumps, carga los daemons

# 4) WhatsApp (número dedicado, escanear QR)
openclaw channels        # seguir el flujo del canal whatsapp
```
