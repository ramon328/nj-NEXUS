# Skill de edición profesional (Engine-B)

Este documento explica la "skill" que investigamos y cómo la aplicamos en la
plataforma para que la IA edite videos como un editor profesional de Reels/
TikTok 2026: que **lea** el material (fotogramas + transcripción), corte por el
habla, dé ritmo, use movimiento de cámara y queme subtítulos karaoke.

## Qué investigamos: skills de video para agentes

Existen "skills" y proyectos que le dan a un modelo (Claude u otros) la
capacidad de razonar sobre video, no solo sobre texto:

- **anthropics/skills** — repositorio oficial de Skills de Anthropic (paquetes
  de instrucciones + scripts que el modelo carga cuando la tarea lo amerita).
  Es el patrón de "skill" que replicamos: empaquetar el conocimiento de dominio
  (aquí, edición de video) como instrucciones accionables reutilizables.
- **claude-ffmpeg-skill** — skill enfocada en manejar ffmpeg desde el modelo:
  cortar, recomponer, aplicar filtros. Nos guió para exponer a la IA un plan
  ejecutable (segmentos, filtros, transiciones, textos, stickers) que luego un
  motor multi-pase de ffmpeg renderiza.
- **browser-use/video-use** — enfoque que "lee" el video como TEXTO con
  timestamps (incluso por palabra), de modo que el modelo puede razonar sobre
  QUÉ se dice y CUÁNDO. De aquí tomamos la idea central de este módulo:
  transcribir a nivel palabra y darle al modelo la transcripción con marcas de
  tiempo para que corte por el habla.

La conclusión de la investigación: un editor de IA rinde mucho mejor cuando
**lee** el contenido (transcripción con tiempos + fotogramas) que cuando solo
"adivina" desde miniaturas. Sobre eso construimos la guía de edición.

## Principios de edición profesional 2026 (la guía)

Redactados como instrucciones accionables en
[`lib/guiaEdicion.ts`](../lib/guiaEdicion.ts) (`GUIA_EDICION_PROFESIONAL`), que
se inserta en el prompt del modelo:

1. **Ritmo:** un cambio visual cada 1.5–2 s (corte, movimiento de cámara,
   cambio de texto, sticker). <1.2 s se siente ruido; >2.5 s cae la retención.
2. **Gancho nano (<1.5 s):** el mejor momento/frase va al inicio.
3. **Cortar por el habla:** con transcripción, cortar en límites de palabra/
   frase y quitar relleno, muletillas y silencios.
4. **Ken Burns:** zoom/paneo lento en tomas fijas o largas para darles vida.
5. **Rotación:** corregir tomas grabadas de lado (90/180/270).
6. **Reencuadre 9:16:** conservar al sujeto (izquierda/centro/derecha) al
   recortar de horizontal a vertical.
7. **Subtítulos:** el ~80% de los reels se ven sin sonido; los animados
   palabra por palabra (karaoke/pop-on) retienen más. Van quemados.
8. **No saturar** de stickers ni efectos; coherencia de 1–2 fuentes.

## Cómo lo aplicamos aquí

### 1. Transcripción a nivel palabra — [`lib/transcribe.ts`](../lib/transcribe.ts)

- Corre whisper.cpp con `-ojf` (JSON completo), `-ml 32` (segmentos cortos),
  `-sow` (dividir por palabra) y `-l es`.
- Parsea el JSON a cues `{texto, desde, hasta, palabras:[{desde,hasta,palabra}]}`
  en tiempo **original**. Agrupa sub-tokens en palabras, filtra tokens
  especiales de control (`[_BEG_]`, `[_TT_...]`, etc.) y descarta palabras con
  timestamps inválidos.
- `construirTextoTranscripcion()` arma un texto legible con marcas de tiempo
  (`[0.0-2.3] ¡Habi! ¡Habi!`) para dárselo al modelo.
- Mantiene el fallback: si whisper no está disponible, lanza un error claro y
  el pipeline sigue sin subtítulos.

### 2. La IA corta por el habla — [`lib/editor.ts`](../lib/editor.ts)

- `runEditJob` transcribe el original **antes** de llamar a Claude
  (best-effort). Si hay voz, pasa la transcripción con tiempos en el prompt.
- El prompt inserta `GUIA_EDICION_PROFESIONAL` y pide cortar por el habla,
  poner el mejor momento al inicio y apuntar a segmentos de ~1.5–2.5 s.
- El JSON Schema se amplió: cada segmento acepta `zoom` (Ken Burns),
  `reencuadre` y `rotacion`; a nivel plan, `subtitulos_estilo`
  (`clasico`/`karaoke`).
- Tras el plan, si hay voz y el usuario no pidió lo contrario, se rellenan los
  `subtitulos` mapeando los cues **y sus palabras** a la línea de tiempo FINAL
  (`mapearSubtitulos`, que descarta palabras que caen en cortes y las recorta a
  los límites del tramo). Si la IA no fijó estilo y hay palabras, se pone
  `subtitulos_estilo: "karaoke"`.
- Opt-out: si la instrucción dice "sin subtítulos"/"no subtitulos", no se
  ponen.

### 3. Render

El motor multi-pase de ffmpeg (`lib/ffmpeg.ts`, del módulo Engine-A) consume el
plan: aplica el movimiento de cámara, la rotación y el reencuadre por segmento,
y quema los subtítulos (clásico o karaoke) usando `subtitulos[].palabras` y
`subtitulos_estilo`.

## Fuentes citadas

- `anthropics/skills` — patrón de Skills de Anthropic (instrucciones de dominio
  empaquetadas y cargadas bajo demanda).
- `claude-ffmpeg-skill` — manejo de ffmpeg desde el modelo.
- `browser-use/video-use` — leer el video como texto con timestamps por
  palabra.
