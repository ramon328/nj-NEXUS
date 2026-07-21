# Mac mini como sistema de edición 24/7 — guía para Ramón

Objetivo: dejar el Mac mini encendido 24/7 haciendo el trabajo pesado (renders, Whisper, compresión) mientras el front vive en Vercel. **Tú casi no haces nada: Claude Code hace todo el trabajo en el mini.** Son 5 pasos.

**Tiempo total estimado: 30–60 minutos**, la mayoría de espera (descargas e instalaciones). Tu intervención activa son ~10 minutos.

## 1. Instala Claude Code y git en el mini (~5 min)

En el Mac mini, abre **Terminal** (Aplicaciones → Utilidades → Terminal) y ejecuta:

```bash
npm i -g @anthropic-ai/claude-code
```

- Si `npm` no existe todavía, instala Node primero desde [nodejs.org](https://nodejs.org) (o usa el instalador de Claude Code de [claude.com/code](https://claude.com/code)).
- `git` suele venir con macOS; si al usarlo el sistema ofrece instalar las "herramientas de desarrollo", acepta y espera (~5 min).

## 2. Clona el repo y entra (~2 min)

En la misma Terminal:

```bash
git clone https://github.com/DropoutCapital/nj-marcketing.git
cd nj-marcketing
```

## 3. Abre Claude y pégale la orden mágica (~1 min tuyo, luego él trabaja solo)

```bash
claude
```

Y cuando abra, pégale exactamente esto:

> **Lee docs/mac-mini/INSTRUCCIONES-AGENTE.md y ejecútalo completo, fase por fase, hasta entregarme la URL del sistema y el secreto.**

A partir de aquí el agente instala todo (Homebrew, ffmpeg, Whisper, el modelo de voz, el build, el servicio 24/7 y el túnel de Cloudflare), verificando cada fase antes de seguir. **Qué esperar:** verás pasar muchos comandos e instalaciones durante 20–45 minutos; es normal que el primer render de prueba tarde varios minutos (descarga un navegador para los gráficos). De vez en cuando te pedirá confirmar algún comando o la contraseña de administrador del mini.

## 4. Ten a mano el `.env.local` de tu Mac (te lo pedirá al principio)

En un momento de la fase 1, el agente te pedirá **el contenido del archivo `.env.local` de tu Mac principal** (el de este mismo proyecto: claves de Supabase, Anthropic, etc.).

En **tu Mac** (no el mini), abre Terminal **en la carpeta de este proyecto** (donde vive el `.env.local`) y cópialo al portapapeles con:

```bash
cat .env.local | pbcopy
```

y pégaselo al agente en el mini cuando lo pida (por ejemplo, mándatelo por AirDrop/Notas si son máquinas separadas). También verificará que `APP_PASSWORD` esté ahí: en el mini es obligatoria.

## 5. Al final te dará URL y secreto → me los envías (~1 min)

Cuando todo esté en verde, el agente imprime dos líneas:

```
URL_DEL_SISTEMA=https://....trycloudflare.com
BACKEND_SECRET=abc123...
```

**Envíamelas y yo conecto el front** (configuro `RENDER_BACKEND_URL` y `BACKEND_SECRET` en Vercel). Listo: desde ese momento, los trabajos pesados de la plataforma los hace tu Mac mini.

---

### Después (mantenimiento mínimo)

- El mini queda configurado para **no dormirse** y la app y el túnel **se relanzan solos** si se caen o si reinicias el equipo.
- **Ojo con el túnel rápido:** su URL cambia si el túnel se reinicia (corte de luz, reinicio del mini). Si el front deja de conectar, entra al mini, abre `claude` en la carpeta del repo y dile: *"dame la URL actual del túnel"* — y me la reenvías. (Más adelante podemos montar un túnel con nombre y URL fija; está explicado como paso opcional en las instrucciones del agente.)
- Para actualizar el sistema cuando cambie el código: abre `claude` en el repo del mini y dile *"actualiza el sistema: git pull, build y reinicia los servicios"*.
