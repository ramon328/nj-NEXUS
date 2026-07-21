# Plataforma de Marketing con IA

Plataforma que se alimenta de una carpeta de Google Drive con videos, genera con IA captions, descripciones, hashtags y planes de edición, y publica directo en Instagram.

## Arquitectura

- **Next.js 16 (App Router)** — interfaz y route handlers de la API (TypeScript, Tailwind v4, React 19).
- **Supabase (Postgres)** — persistencia de videos, generaciones de IA y publicaciones.
- **Anthropic Claude** (`claude-sonnet-4-6` por defecto, configurable) — generación de contenido y planes de edición.
- **Google Drive API** — origen de los videos (cuenta de servicio con permiso de lectura).
- **Meta Graph API** — publicación en Instagram Business/Creator.

Flujo de la plataforma:

```
Google Drive → Sincronizar → Supabase → Generar con IA → Editar/Aprobar → Publicar en Instagram
```

Tablas principales (ver `supabase/schema.sql`):

| Tabla            | Contenido                                                                       |
| ---------------- | ------------------------------------------------------------------------------- |
| `videos`         | Videos sincronizados desde Drive (`nuevo`, `procesando`, `listo`, `publicado`)   |
| `generations`    | Contenido generado por la IA (`content` o `edit_plan`, en JSONB)                 |
| `projects`       | Proyectos multimedia (carpetas de trabajo con contenido propio)                  |
| `project_assets` | Archivos de cada proyecto: videos, fotos, música y stickers                      |
| `edits`          | Trabajos de edición de video con IA (de un video suelto o de un proyecto)        |
| `posts`          | Publicaciones en Instagram (`borrador`, `publicando`, `publicado`, `error`)      |
| `estrategias`    | Resultados de las herramientas de estrategia de marketing (entrada y resultado en JSONB) |

## 🖥️ Sistema de edición 24/7 (Mac mini)

La plataforma se divide en dos piezas que corren **el mismo repo**:

- **Front (Vercel)** — la interfaz y la API ligera. Las subidas de archivos grandes van **directo del navegador a Supabase Storage** con URLs firmadas, así el límite de 4.5 MB de Vercel nunca toca los archivos.
- **Backend de edición (Mac mini, 24/7)** — el trabajo pesado: renders con ffmpeg + Remotion, transcripción con Whisper y compresión de video. El front le reenvía esos trabajos vía `RENDER_BACKEND_URL`, autenticados con el secreto compartido `BACKEND_SECRET`; el mini se expone a internet con un túnel de Cloudflare y el portón de `APP_PASSWORD` activo.

```
Navegador ── archivos grandes (URL firmada) ──► Supabase Storage
    │
    ▼
Front (Vercel) ── trabajos pesados (BACKEND_SECRET) ──► Mac mini (túnel Cloudflare)
                                                          ffmpeg + Remotion + Whisper
```

La instalación del mini es **autónoma**: Claude Code la hace de punta a punta siguiendo un loop de "ejecuta, verifica, corrige y repite". Todo está en [`docs/mac-mini/`](docs/mac-mini/):

- [`docs/mac-mini/LEEME-RAMON.md`](docs/mac-mini/LEEME-RAMON.md) — los 5 pasos para Ramón (instalar Claude Code, clonar y pegarle una orden).
- [`docs/mac-mini/INSTRUCCIONES-AGENTE.md`](docs/mac-mini/INSTRUCCIONES-AGENTE.md) — las fases que ejecuta el agente en el mini (requisitos, credenciales, motor, servicio 24/7, túnel y entrega final).
- `scripts/verificar-backend.mts` — el auto-chequeo del motor (`npx tsx scripts/verificar-backend.mts`): imprime una tabla OK/FALLO con el arreglo exacto de cada ítem y solo sale en 0 cuando todo está en verde.

### Videos grandes (media local)

Los videos de **más de 45 MB no van a Supabase Storage** (su plan gratuito rechaza archivos de más de 50 MB con un `413`): se guardan en el **disco local del equipo que corre el motor** (el Mac mini en producción; tu Mac en desarrollo local). El flujo:

- El navegador sube el archivo **en trozos de 25 MB** — compatible con el límite de ~100 MB por cuerpo del túnel gratuito de Cloudflare, que cortaría una subida de una sola pieza.
- La propia app sirve esos archivos con **soporte de Range** (necesario para hacer scrubbing en el reproductor) desde `/api/media/archivo/...`.
- En la tabla `project_assets`, estos assets usan `storage_path` con el prefijo `mini:<ruta-relativa>` y su `public_url` apunta a `/api/media/archivo/...`.

Variables de entorno involucradas (en el equipo del motor):

- `MEDIA_DIR` — carpeta del disco donde se guardan los archivos (opcional; tiene un valor por defecto).
- `MEDIA_PUBLIC_URL` — URL pública base con la que se construyen los `public_url` (en producción, la URL del túnel de Cloudflare).

> **⚠️ Si la URL del túnel cambia** (el túnel rápido de Cloudflare cambia de URL en cada reinicio), hay que actualizar **dos** variables: `MEDIA_PUBLIC_URL` en el mini y `RENDER_BACKEND_URL` en Vercel. Además, los `public_url` de los assets **ya subidos** quedarán apuntando a la URL vieja: se corrigen con un `UPDATE` sobre `project_assets` en Supabase (reemplazando la base vieja por la nueva) o re-subiendo los archivos.

## Configuración

Copia el archivo de variables de entorno y complétalo paso a paso:

```bash
cp .env.example .env.local
```

### a. Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Abre el **SQL Editor** del proyecto y ejecuta el contenido de `supabase/schema.sql` (es idempotente: puedes volver a correrlo entero cuando se agreguen tablas nuevas).
3. En **Project Settings → API** copia los valores a `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (permisos totales: solo se usa en el servidor, nunca en el navegador).

### b. Anthropic (Claude)

1. Crea una API key en [platform.claude.com](https://platform.claude.com).
2. Pégala en `ANTHROPIC_API_KEY`.

El modelo por defecto es `claude-sonnet-4-6` (económico, definido en `lib/anthropic.ts`). Si quieres máxima calidad, puedes subirlo a `claude-opus-4-8` agregando `ANTHROPIC_MODEL=claude-opus-4-8` en `.env.local` — sin tocar código.

### c. Google Drive

1. Crea un proyecto en [Google Cloud Console](https://console.cloud.google.com).
2. Habilita la **Google Drive API**.
3. Crea una **cuenta de servicio** y genera una clave JSON.
4. Comparte la carpeta de Drive que contiene los videos con el email de la cuenta de servicio, con permiso de **lector**.
5. Completa en `.env.local`:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` — el email de la cuenta de servicio (campo `client_email` del JSON).
   - `GOOGLE_PRIVATE_KEY` — la clave privada completa del JSON (con `\n` literales o entre comillas).
   - `GOOGLE_DRIVE_FOLDER_ID` — el ID de la carpeta, visible en su URL: `https://drive.google.com/drive/folders/<ID>`.

### d. Instagram (Meta Graph API)

1. Necesitas una cuenta de Instagram **Business o Creator** vinculada a una página de Facebook.
2. Crea una app en [developers.facebook.com](https://developers.facebook.com) con el permiso `instagram_content_publish`.
3. Obtén un **token de acceso de larga duración** y el **ID de la cuenta IG business**.
4. Completa en `.env.local`:
   - `META_ACCESS_TOKEN`
   - `IG_BUSINESS_ACCOUNT_ID`

> **Importante:** la Graph API exige una **URL pública de video MP4** para crear el contenedor de publicación. Instagram debe poder descargar el archivo; un enlace privado de Drive no sirve.

## 🔒 Seguridad

La app tiene endpoints **caros y sensibles** (la API de Anthropic en `/api/ai/*`, publicación en Instagram y borrado de videos/proyectos). Por eso incluye un **portón de acceso por contraseña**:

- **Cómo activarlo:** define `APP_PASSWORD` en las variables de entorno (en Vercel: _Project Settings → Environment Variables_). Con la variable definida, `proxy.ts` exige una sesión firmada en toda la app: las páginas redirigen a `/acceso` y la API responde `401`. El login tiene además un rate limit básico por IP (10 intentos / 10 min) contra fuerza bruta, y las rutas más caras re-validan la cookie por su cuenta (defensa en profundidad).
- **Modo local:** sin `APP_PASSWORD` la app queda abierta, igual que siempre. **Nunca despliegues público sin definirla.**
- **Claves:** los archivos `.env*` están ignorados por git — las claves (`ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `META_ACCESS_TOKEN`, etc.) **nunca van al repo**. Si alguna se filtra, **rótala de inmediato** en el panel del proveedor.

## Uso

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) y sigue el flujo en la interfaz:

1. **Sincronizar Drive** — importa los videos de la carpeta configurada a Supabase.
2. **Elegir video** — selecciona un video de la lista.
3. **Generar con IA** — crea caption, descripción, hashtags, hook y llamado a la acción; también puedes pedir un plan de edición.
4. **Editar** — ajusta el texto generado antes de aprobarlo.
5. **Publicar** — envía la publicación a Instagram.

## 🎬 Edición de video con IA

Además de generar textos, la plataforma ahora **edita el video de verdad**:

1. Eliges un video de la lista.
2. Escribes una instrucción en lenguaje natural (por ejemplo: _"deja solo los mejores 20 segundos, ponle música chill y un título arriba"_).
3. La IA (Claude) **mira fotogramas reales del video** — no adivina: analiza imágenes extraídas del MP4.
4. Con eso genera un **plan ejecutable**: cortes, cambios de velocidad, textos en pantalla, música de fondo, filtros de color, stickers, transiciones y formato vertical 9:16.
5. `ffmpeg` renderiza el plan y produce el MP4 final.
6. El resultado se sube al **Storage público de Supabase**, y desde la interfaz puedes **previsualizarlo, descargarlo o publicarlo directo en Instagram**.

### Qué puede hacer la IA en el video

- **🎵 Música de fondo** — la IA elige una pista de la biblioteca en `public/musica/` y la mezcla con el audio original (controlando el volumen de ambos). Vienen **19 pistas listas** (loops de GarageBand del Mac, libres de regalías) que cubren hip hop, electro, chill, R&B, disco, dubstep, retro/funk, blues, rock e indie: `hiphop-tranquilo`, `hiphop-urbano`, `hiphop-callejero`, `electro-fiesta`, `electro-energia`, `electro-epico`, `rnb-moderno`, `rnb-suave`, `chill-relajado`, `chill-atardecer`, `chill-nostalgico`, `disco-alegre`, `dubstep-intenso`, `dubstep-oscuro`, `retro-vintage`, `retro-funky`, `blues-guitarra`, `rock-guitarra` e `indie-guitarra`. Son loops cortos que se repiten automáticamente hasta cubrir la duración del video.
- **🎨 Filtros de color** — **13 presets** aplicados a todo el video: **ninguno**, **cálido**, **frío**, **vibrante**, **vintage**, **blanco y negro**, **cine**, **sepia**, **noir**, **pastel**, **teal & orange**, **grano** (textura de película) y **soñador** (brillo suave y difuso).
- **✍️ Textos con fuente, color y estilo** — la IA ya no solo escribe los textos en pantalla: **elige la fuente tipográfica, el color y el estilo según la vibra del video**. Hay **19 fuentes** en `public/fuentes/` (Google Fonts, descargadas vía Fontsource, licencia OFL/Apache — libres para uso comercial). Las 9 originales: `impacto` (condensada potente), `titulos-gruesos` (negrita máxima), `moderna-condensada` (limpia alta), `script-elegante` (cursiva con estilo), `manuscrita-relajada` (playera relajada), `marcador` (marcador a mano), `redondeada-retro` (retro redondeada), `comic-divertida` (cómic) e `infantil-gruesa` (divertida gruesa). Y 10 nuevas **estilo Canva**: `moderna-elegante` (Montserrat 800), `serif-lujosa` (Playfair Display 700), `serif-impacto` (Abril Fatface), `slab-gruesa` (Alfa Slab One), `caligrafia-fluida` (Dancing Script), `manuscrita-natural` (Caveat), `retro-juguetona` (Shrikhand), `urbana-display` (Bungee), `burbuja-gruesa` (Titan One) y `geometrica-fuerte` (League Spartan 800). Los colores disponibles son **blanco, negro, amarillo, rosa, celeste y verde**, y cada texto puede llevar uno de **4 estilos**: **simple**, **caja** (fondo semitransparente), **sombra** (sombra dura tipo Canva) o **neón** (halo de color alrededor del texto).
- **✨ Stickers** — imágenes PNG con transparencia de `public/stickers/`, superpuestas en la posición y momento que decida la IA. La biblioteca creció a **134 stickers** en tres categorías: **40 emojis** (512×512: fuego, corazón, risa, fiesta, cohete, dinero, corona, confeti y más), **70 íconos profesionales** de Bootstrap Icons (licencia MIT) en variantes `-blanco` y `-amarillo` (flechas, megáfono, WhatsApp, Instagram, verificado, descuento, play, check, carrito, campana...) y **24 formas de colores** con sufijos `-rosa`/`-celeste`/`-amarillo`/`-blanco` (círculo, cuadrado, triángulo, hexágono, globo de diálogo y cinta de marcador — ideales como fondo de textos).
- **🔀 Transiciones entre cortes** — **fade**, **wipe**, **slide** y **círculo**, con duración configurable por el plan.

### Cómo ampliar las bibliotecas

Las tres bibliotecas se leen del disco en cada edición: **basta con soltar archivos en la carpeta** y la IA los verá automáticamente, sin tocar código ni reiniciar nada. La clave es el **nombre del archivo**: la IA elige cada recurso solo por su nombre, así que usa nombres descriptivos en español.

| Carpeta            | Formato                  | Ejemplo de buen nombre                       |
| ------------------ | ------------------------ | -------------------------------------------- |
| `public/musica/`   | `.mp3`                   | `rock-energetico.mp3` (no `track01.mp3`)     |
| `public/stickers/` | `.png` con transparencia | `trofeo.png` (no `img_512.png`)              |
| `public/fuentes/`  | `.ttf` / `.otf`          | `elegante-serif.ttf` (no `font-regular.ttf`) |

Cada carpeta tiene un `LEEME.txt` con los detalles de formato y licencia.

> **Tip — elementos 100% estilo Canva:** si quieres usar los elementos exactos de Canva, exporta desde Canva tus propios elementos como **PNG con fondo transparente** y suéltalos en `public/stickers/` (solo los que tu licencia de Canva te permita usar de esa forma). La IA los detecta al instante por el nombre del archivo.

### Modelo de IA

El modelo por defecto es `claude-sonnet-4-6` (económico y rápido). Para máxima calidad puedes subir a `claude-opus-4-8` agregando en `.env.local`:

```bash
ANTHROPIC_MODEL=claude-opus-4-8
```

**Requisitos:** ninguno extra. Se usa el `ffmpeg` del sistema si está instalado (por ejemplo, vía Homebrew) o, si no, el binario que ya viene incluido por npm (`ffmpeg-static`). Ten en cuenta que el plan gratuito de Supabase Storage tiene un **límite de 50 MB por archivo**: si el video editado pesa más, la subida fallará.

**Recordatorio importante:** vuelve a ejecutar `supabase/schema.sql` en el SQL Editor de Supabase, porque agrega la nueva tabla `edits`. El script es **idempotente**: puedes correrlo entero de nuevo sin peligro, no borra ni duplica nada.

## 🎞️ Gráficos profesionales (Remotion)

La plataforma sigue el modelo **video-como-JSON**: la IA no toca píxeles, genera un plan ejecutable (`ExecutableEditPlan` en `lib/types.ts`) y los motores de render lo materializan. Con la capa de gráficos profesional, el render se divide en dos motores que se complementan:

```
IA genera el plan (JSON)
        │
        ├── ffmpeg → la base del video: cortes, velocidad, transiciones,
        │            filtros de color, música y efectos de sonido
        │
        ├── Remotion → la capa de gráficos animados, renderizada como video
        │              con TRANSPARENCIA (composiciones React fotograma a fotograma)
        │
        └── Composición final: la capa de gráficos se superpone sobre la base
```

### Qué aporta frente al modo clásico

- **Títulos con física de resorte** — los textos entran con animaciones de muelle (spring) de nivel broadcast, no con simples fundidos.
- **Subtítulos karaoke tipo CapCut** — la **palabra que se está diciendo se resalta** en tiempo real, sincronizada con la transcripción de la voz.
- **Stickers con pop** — los PNG entran con rebote y escala animada en vez de aparecer secos.
- **Barra de progreso** — la barra superior típica de los reels profesionales (`barra_progreso: true` en el plan).

### Activación y fallback

- `overlay_pro` viene **activado por defecto** (`true`): toda edición nueva usa la capa de gráficos de Remotion sin que tengas que hacer nada.
- Si el render de Remotion **falla por cualquier motivo**, la plataforma **cae automáticamente al modo clásico** (textos `drawtext` y subtítulos ASS de ffmpeg): la edición nunca se pierde, solo baja el nivel de acabado.
- Para forzar el modo clásico en una edición, basta con `overlay_pro: false` en el plan.

> **Licencia de Remotion:** Remotion es gratuito para personas y equipos de **hasta 3 personas**; a partir de ahí requiere una licencia de empresa. Revisa [remotion.dev/license](https://www.remotion.dev/license) antes de usarlo en un equipo mayor.

## 🧠 Estrategia de marketing con IA

Además de editar videos, la plataforma incluye **5 herramientas de estrategia** con IA (sus resultados se guardan en la tabla `estrategias`):

- **💡 Ideas** — genera ideas de reels con gancho para tu nicho y objetivo.
- **✍️ Copywriter** — escribe captions, hooks y llamados a la acción listos para publicar.
- **🎬 Guiones de reels** — guiones virales con timing segundo a segundo, pensados para grabarse tal cual.
- **📅 Calendario** — planifica el contenido de la semana o el mes con formato y tema por día.
- **🧲 Lead magnets** — diseña recursos descargables (guías, checklists, plantillas) para captar contactos.

### Flujo recomendado

```
Idea → Guion → Grabar → Subir al proyecto → Crear video (con el guion como instrucción) → Publicar
```

Es decir: pide una **idea**, conviértela en **guion de reel**, **graba** siguiendo el guion, **sube** el material a un proyecto y, al crear el video del proyecto, **pega el guion como instrucción** — la IA edita respetando la estructura del guion. El resultado se publica directo en Instagram desde la plataforma.

> **⚠️ RECORDATORIO IMPORTANTE:** vuelve a ejecutar `supabase/schema.sql` en el SQL Editor de Supabase — agrega la **nueva tabla `estrategias`**. El script es **idempotente**: puedes correrlo entero de nuevo sin peligro, no borra ni duplica nada.

## 📁 Proyectos multimedia

Hasta ahora la IA editaba **un** video de Drive a la vez. Con los **proyectos** das un salto: un proyecto es una **carpeta de trabajo con tu propio multimedia** — videos, fotos, música y stickers — y la IA edita un video usando **todo el contenido del proyecto en conjunto**, mezclando clips y fotos con calidad profesional.

> **⚠️ Antes de empezar:** vuelve a ejecutar `supabase/schema.sql` en el SQL Editor de Supabase — agrega las tablas `projects` y `project_assets` y hace que `video_id` sea opcional en `edits`. El script es **idempotente**: correrlo entero de nuevo es seguro, no borra ni duplica nada. Si las tablas aún no existen, los endpoints de proyectos responden con el error de la base de datos y un mensaje claro para que sepas qué falta.

### Flujo de trabajo

1. **Crear proyecto** — dale un nombre y una descripción opcional.
2. **Subir multimedia** — agrega al proyecto tus videos, fotos, pistas de música y stickers PNG.
3. **"Crear video del proyecto"** — escribes la instrucción y la IA arma el video: elige y mezcla los mejores clips, intercala las fotos animándolas con **Ken Burns** (zoom y paneo suaves para que no se vean estáticas), usa la **música del proyecto** si subiste alguna (o una de la biblioteca) y agrega **subtítulos karaoke** sincronizados con la voz.
4. **Editor visual** — revisa y ajusta el resultado a pantalla completa: segmentos, textos, stickers, música y subtítulos.
5. **Publicar** — el MP4 final queda en el Storage de Supabase, listo para previsualizar, descargar o publicar en Instagram.

> **Límite de tamaño:** el plan gratis de Supabase Storage acepta archivos de hasta **50 MB**. Los uploads que superen ese límite se rechazan con un mensaje claro en español; comprime el video o súbelo en clips más cortos.

### Espejo en Google Drive (opcional)

Si quieres que cada proyecto **cree su propia carpeta en Google Drive** y suba ahí una copia de cada archivo, configura una cuenta de servicio de Google con la carpeta compartida como **Editor**:

1. Crea un proyecto en [Google Cloud Console](https://console.cloud.google.com).
2. Habilita la **Google Drive API**.
3. Crea una **cuenta de servicio** y genera una clave JSON.
4. Comparte tu carpeta de Drive con el email de la cuenta de servicio con permiso de **Editor** (el permiso de lector de la sincronización no basta: para el espejo necesita crear carpetas y subir archivos).
5. Completa en `.env.local`:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` — el email de la cuenta de servicio (campo `client_email` del JSON).
   - `GOOGLE_PRIVATE_KEY` — la clave privada completa del JSON (con `\n` literales o entre comillas).

Sin esta configuración **todo funciona igual**: el multimedia vive en el Storage de Supabase con URLs públicas, solo que sin copia espejo en Drive.

## Endpoints de la API

| Método   | Endpoint                              | Body (JSON)                                                | Respuesta                                                    |
| -------- | ------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------ |
| `POST`   | `/api/drive/sync`                     | — (sin body)                                               | `{ synced: number, videos: VideoAsset[] }`                    |
| `GET`    | `/api/videos`                         | —                                                          | `{ videos: VideoAsset[] }`                                    |
| `POST`   | `/api/ai/generate`                    | `{ videoId: string }`                                      | `{ generation: Generation }` con `content: GeneratedContent`  |
| `POST`   | `/api/ai/edit-plan`                   | `{ videoId: string }`                                      | `{ generation: Generation }` con `content: EditPlan`          |
| `POST`   | `/api/ai/edit`                        | `{ videoId: string, instruccion?: string }`                | `202 { edit: EditJob }` — la edición sigue en segundo plano   |
| `GET`    | `/api/edits?videoId=`                 | —                                                          | `{ edits: EditJob[] }` con `status` y `output_url`            |
| `GET`    | `/api/edits?projectId=`               | —                                                          | `{ edits: EditJob[] }` de un proyecto                         |
| `GET`    | `/api/projects`                       | —                                                          | `{ projects: Proyecto[] }`                                    |
| `POST`   | `/api/projects`                       | `{ nombre: string, descripcion?: string }`                 | `{ project: Proyecto }`                                       |
| `GET`    | `/api/projects/[id]`                  | —                                                          | `{ project: Proyecto, assets: ProyectoAsset[] }`              |
| `DELETE` | `/api/projects/[id]`                  | —                                                          | `{ ok: true }` — borra el proyecto y sus archivos             |
| `POST`   | `/api/projects/[id]/assets`           | `multipart/form-data` con el archivo (máx. **50 MB**)      | `{ asset: ProyectoAsset }`                                    |
| `DELETE` | `/api/projects/[id]/assets/[assetId]` | —                                                          | `{ ok: true }`                                                |
| `POST`   | `/api/projects/[id]/edit`             | `{ instruccion?: string }`                                 | `202 { edit: EditJob }` — la IA usa todo el multimedia del proyecto |
| `POST`   | `/api/marketing`                      | `{ herramienta: HerramientaMarketing, entrada: objeto propio de cada herramienta, projectId?: string }` | `{ estrategia: Estrategia }` con el `resultado` generado por la IA |
| `GET`    | `/api/marketing?herramienta=`         | —                                                          | `{ estrategias: Estrategia[] }` — historial (filtro opcional por herramienta) |
| `DELETE` | `/api/marketing?id=`                  | —                                                          | `{ ok: true }` — borra una estrategia del historial           |
| `POST`   | `/api/instagram/publish`              | `{ videoId: string, caption: string, hashtags: string[], videoUrl?: string }` | `{ post: Post }` con `ig_media_id` al publicarse |

`POST /api/instagram/publish` ahora acepta un `videoUrl` opcional: si lo envías (por ejemplo, la `output_url` de un video editado con IA), se publica esa URL en lugar de la URL original del video.

En caso de error, todos los endpoints devuelven `{ error: string }` con el status HTTP correspondiente. Los tipos `VideoAsset`, `Generation`, `GeneratedContent`, `EditPlan`, `EditJob`, `Proyecto`, `ProyectoAsset`, `Estrategia`, `HerramientaMarketing` y `Post` están definidos en `lib/types.ts`.

## Limitaciones y hoja de ruta

- **La edición real de video ya está disponible** vía `POST /api/ai/edit` (ver sección "Edición de video con IA"); `/api/ai/edit-plan` sigue existiendo para generar solo el plan creativo en texto.
- **Los videos deben ser públicamente accesibles** (URL MP4 pública) para que Instagram pueda descargarlos al publicar.
- **Programación de publicaciones pendiente.** La columna `scheduled_at` de la tabla `posts` ya existe, pero aún no hay un worker que publique en el horario programado.
