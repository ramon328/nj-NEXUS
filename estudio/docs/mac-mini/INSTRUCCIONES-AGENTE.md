# Instrucciones para el agente del Mac mini

Eres el agente encargado de convertir este Mac mini en el **sistema de edición 24/7** de la plataforma. El front vive en Vercel; este equipo hace el trabajo pesado (renders ffmpeg + Remotion, transcripción con Whisper, compresión de video) corriendo **este mismo repo** detrás de un túnel de Cloudflare.

## La regla central del loop

Para **cada fase**: **ejecuta, verifica, corrige y repite hasta que su verificación pase**.

- **No avances con una fase en rojo.** Si la verificación de una fase falla, arregla la causa y vuelve a verificar, las veces que haga falta.
- **No pidas confirmación para pasos reversibles** (instalar paquetes con brew/npm, crear archivos, cargar/descargar LaunchAgents, reintentar comandos). Solo consulta a Ramón cuando necesites algo que únicamente él tiene (credenciales) o para pasos con `sudo`.
- Trabaja siempre desde la raíz del repo clonado.

---

## Fase 0 — Requisitos del sistema

Ejecuta y verifica cada punto:

1. **Xcode Command Line Tools** (los pide git/brew):
   ```bash
   xcode-select -p || xcode-select --install
   ```
   Si lanza el instalador gráfico, espera a que termine y vuelve a comprobar con `xcode-select -p`.
2. **Homebrew**:
   ```bash
   which brew || /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```
   En Apple Silicon, asegúrate de que `/opt/homebrew/bin` esté en el PATH (`eval "$(/opt/homebrew/bin/brew shellenv)"` en `~/.zprofile`).
3. **git** (suele venir con las CLT): `git --version`.
4. **Node 20 o superior**:
   ```bash
   node --version || brew install node
   ```
5. **Clonar el repo e instalar dependencias**:
   ```bash
   git clone https://github.com/DropoutCapital/nj-marcketing.git
   cd nj-marcketing
   npm install
   ```

**Verificación de la fase:** `node --version` imprime v20+ y `npm install` terminó sin errores. Si algo falla, corrígelo y repite.

---

## Fase 1 — Credenciales (.env.local)

1. **Pide a Ramón que pegue el contenido de su `.env.local`** (los valores viven en el `.env.local` de su otro Mac). Dile textualmente algo como: *"Necesito el contenido de tu `.env.local` (el de tu Mac principal). Pégalo aquí y yo creo el archivo."* Guarda lo que te pegue en `.env.local` en la raíz del repo. **Nunca imprimas los valores de vuelta en pantalla ni los subas a git** (ya está ignorado por `.gitignore`).
2. **Genera un `BACKEND_SECRET` NUEVO y agrégalo** al `.env.local` (no reutilices uno viejo):
   ```bash
   echo "BACKEND_SECRET=$(openssl rand -hex 24)" >> .env.local
   ```
   Guarda mentalmente que este valor es parte de la **entrega final** (fase 5).
3. **Verifica que `APP_PASSWORD` esté presente** en el `.env.local`. En este equipo es **obligatoria** (el mini quedará expuesto por el túnel; sin contraseña, cualquiera con la URL usaría la API de Anthropic y publicaría en Instagram). Si falta, pídesela a Ramón (debe ser la misma que usa el front) y agrégala.
4. **Agrega `MEDIA_PUBLIC_URL=<url del túnel>`** al `.env.local`. Es la URL pública base con la que la app construye los enlaces de los videos grandes guardados en el disco de este equipo (media local). Como el túnel se crea recién en la fase 4, deja anotado que debes **volver aquí a completarla apenas tengas la URL** — y recuerda que debe **mantenerse siempre sincronizada con la URL vigente del túnel**: si el túnel se reinicia y la URL cambia, actualiza esta variable y reinicia la app.

**Verificación de la fase:** `.env.local` existe y contiene al menos `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `BACKEND_SECRET` y `APP_PASSWORD` con valor. (La fase 2 lo comprobará a fondo con el script.)

---

## Fase 2 — Motor de edición (ffmpeg, Whisper, Remotion)

1. **Instala whisper.cpp y descarga el modelo base**:
   ```bash
   brew install whisper-cpp
   mkdir -p ~/.cache/whisper-models
   curl -L -o ~/.cache/whisper-models/ggml-base.bin \
     https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.bin
   ```
   (El modelo pesa ~142 MB; si la descarga se corta, borra el archivo y reintenta.)
2. **Corre el auto-chequeo en loop hasta que todo quede en verde** (el `--yes` evita que npx se quede esperando confirmación para instalar `tsx`, que no viene en las dependencias):
   ```bash
   npx --yes tsx scripts/verificar-backend.mts
   ```
   El script imprime una tabla con OK/FALLO y **el consejo de arreglo exacto para cada ítem que falle** (ffmpeg, ffprobe, whisper, modelo, render Remotion de humo, variables de entorno, conexión real a Supabase, `APP_PASSWORD`, puerto 3000). Aplica el consejo, vuelve a correr el script y repite. El primer render de Remotion puede tardar varios minutos (descarga su propio Chromium headless); si falla por el navegador, ejecuta `npx remotion browser ensure` y reintenta.

**Verificación de la fase:** el script sale con `TODO EN VERDE ✓` (código de salida 0). **No pases a la fase 3 sin esto.**

---

## Fase 3 — Producción 24/7 (build + LaunchAgent + no dormir)

1. **Build de producción**:
   ```bash
   npm run build
   ```
   Si el build falla, lee el error, corrígelo y repite.
2. **Crea el LaunchAgent** que mantiene la app corriendo siempre (arranca al iniciar sesión y se relanza sola si se cae). Escribe `~/Library/LaunchAgents/com.estudio.editor.plist` con este contenido, **sustituyendo `/RUTA/AL/REPO` por la ruta absoluta real del repo** (la de `pwd`) y comprobando la ruta de npm con `which npm` (en Apple Silicon suele ser `/opt/homebrew/bin/npm`):
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
   <plist version="1.0">
   <dict>
     <key>Label</key>
     <string>com.estudio.editor</string>
     <key>ProgramArguments</key>
     <array>
       <string>/bin/zsh</string>
       <string>-lc</string>
       <string>exec npm run start</string>
     </array>
     <key>WorkingDirectory</key>
     <string>/RUTA/AL/REPO</string>
     <key>EnvironmentVariables</key>
     <dict>
       <key>PATH</key>
       <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
     </dict>
     <key>RunAtLoad</key>
     <true/>
     <key>KeepAlive</key>
     <true/>
     <key>StandardOutPath</key>
     <string>/Users/TU_USUARIO/Library/Logs/estudio-editor.log</string>
     <key>StandardErrorPath</key>
     <string>/Users/TU_USUARIO/Library/Logs/estudio-editor.log</string>
   </dict>
   </plist>
   ```
   (Sustituye también `TU_USUARIO` por el usuario real, `echo $HOME`.) Luego cárgalo:
   ```bash
   launchctl load ~/Library/LaunchAgents/com.estudio.editor.plist
   ```
3. **Verifica la salud del motor**: espera unos segundos y consulta
   ```bash
   curl -s http://localhost:3000/api/salud
   ```
   Debe responder JSON con el estado del motor **todo en `true`**. Si no responde, mira el log (`tail -50 ~/Library/Logs/estudio-editor.log`), corrige y recarga el agente (`launchctl unload` + `launchctl load`).
4. **Configura el Mac para no dormir.** Dos opciones:
   - **Con sudo (recomendada, permanente):**
     ```bash
     sudo pmset -a sleep 0 displaysleep 10
     ```
     (El sistema nunca duerme; la pantalla sí, a los 10 minutos.) Pide a Ramón la contraseña de administrador si hace falta.
   - **Sin sudo:** crea un segundo LaunchAgent `~/Library/LaunchAgents/com.estudio.despierto.plist` que mantenga `caffeinate` corriendo (mismo esqueleto que el anterior, con `ProgramArguments` = `/usr/bin/caffeinate` `-s`, `KeepAlive` true, `RunAtLoad` true, sin `WorkingDirectory`) y cárgalo con `launchctl load`. `caffeinate -s` impide dormir mientras el mini esté enchufado a la corriente (un Mac mini siempre lo está).

**Verificación de la fase:** `curl -s http://localhost:3000/api/salud` responde con el motor todo `true`, y `pmset -g | grep sleep` muestra `sleep 0` (o `launchctl list | grep com.estudio.despierto` muestra el agente de caffeinate corriendo).

---

## Fase 4 — Túnel de Cloudflare (exponer el mini a internet)

1. **Instala cloudflared**:
   ```bash
   brew install cloudflared
   ```
2. **PRIMERO valida con un túnel rápido** (no requiere cuenta de Cloudflare):
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```
   En la salida aparece una URL tipo `https://<algo-aleatorio>.trycloudflare.com`. Esa es la URL del sistema.
3. **Verifica DESDE FUERA** (esto comprueba el recorrido completo internet → túnel → app):
   ```bash
   curl -s https://<url-del-tunel>/api/salud        # debe responder ok (motor true)
   curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" https://<url-del-tunel>/
   ```
   La raíz `/` debe **redirigir a `/acceso`** (portón de contraseña activo). Si `/` devuelve la app sin redirigir, `APP_PASSWORD` no está activa: **detente**, vuelve a la fase 1, arréglala y reinicia la app.
4. **Haz el túnel persistente.** Si te quedas en modo rápido, crea un tercer LaunchAgent `~/Library/LaunchAgents/com.estudio.tunel.plist` (mismo esqueleto que el de la app) con `ProgramArguments`:
   `/opt/homebrew/bin/cloudflared` `tunnel` `--url` `http://localhost:3000`, `KeepAlive` true, `RunAtLoad` true y logs a `~/Library/Logs/estudio-tunel.log`; cárgalo con `launchctl load` y saca la URL nueva del log:
   ```bash
   grep -o "https://.*trycloudflare.com" ~/Library/Logs/estudio-tunel.log | tail -1
   ```
   **Ojo:** la URL del túnel rápido **cambia cada vez que el túnel se reinicia** — si eso pasa, hay que reenviar la URL nueva a Ramón para actualizar el front.
5. **(Opcional, para después) Túnel con nombre:** con una cuenta de Cloudflare y un dominio propio se obtiene una URL **fija** que sobrevive reinicios: `cloudflared tunnel login`, `cloudflared tunnel create estudio`, configurar `~/.cloudflared/config.yml` apuntando `hostname` del dominio a `http://localhost:3000`, `cloudflared tunnel route dns estudio editor.sudominio.com` y `cloudflared tunnel run estudio` (también como LaunchAgent). No es necesario para entregar: el túnel rápido basta para validar y operar.

**Verificación de la fase:** desde fuera, `curl https://<url>/api/salud` responde ok y `https://<url>/` redirige a `/acceso`.

---

## Fase 5 — ENTREGA FINAL

Cuando TODAS las fases anteriores estén en verde, imprime **exactamente** este bloque (con los valores reales) y nada más como cierre:

```
URL_DEL_SISTEMA=<url del túnel>
BACKEND_SECRET=<el BACKEND_SECRET generado en la fase 1>

Envía estas dos líneas a Ramón para conectar el front.
```

(Ramón configurará `RENDER_BACKEND_URL` y `BACKEND_SECRET` en Vercel con esos valores.)

---

## Problemas comunes

| Problema | Arreglo |
| --- | --- |
| **Puerto 3000 ocupado** | `lsof -i :3000` para ver quién es. Si es una copia vieja de la app: `launchctl unload ~/Library/LaunchAgents/com.estudio.editor.plist && launchctl load ~/Library/LaunchAgents/com.estudio.editor.plist`. Si es otro proceso: `kill <PID>`. |
| **Whisper sin modelo** ("Transcripción no disponible") | Repite la descarga de la fase 2. Si el archivo existe pero pesa mucho menos de ~142 MB, está corrupto: `rm ~/.cache/whisper-models/ggml-base.bin` y vuelve a descargarlo. |
| **Render Remotion falla** ("browser", "chromium") | `npx remotion browser ensure` y reintenta `npx --yes tsx scripts/verificar-backend.mts`. |
| **Túnel caído / URL no responde** | `tail -30 ~/Library/Logs/estudio-tunel.log`. Reinícialo: `launchctl unload ~/Library/LaunchAgents/com.estudio.tunel.plist && launchctl load ~/Library/LaunchAgents/com.estudio.tunel.plist`. Recuerda: en modo rápido la URL **cambia** al reiniciar — reenvíala a Ramón. |
| **La app no arranca tras reiniciar el mini** | `launchctl list \| grep com.estudio` para ver qué agentes cargaron; `tail -50 ~/Library/Logs/estudio-editor.log` para el error. Recarga con `launchctl unload` + `launchctl load`. |
| **`/api/salud` responde pero con algo en `false`** | Ese campo te dice qué pieza del motor falta (whisper, ffmpeg, etc.). Corre `npx --yes tsx scripts/verificar-backend.mts` y sigue el consejo del ítem en rojo. |
| **Cambió el código del repo (actualización)** | `git pull && npm install && npm run build` y reinicia el agente de la app con `launchctl unload` + `launchctl load`. |
