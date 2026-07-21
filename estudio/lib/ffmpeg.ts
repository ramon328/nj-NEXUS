import { spawn, spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { planAOverlayProps, renderOverlayPro } from "./overlay";
import type {
  ColorTexto,
  ExecutableEditPlan,
  FiltroVideo,
  PosicionSticker,
  SubtituloCue,
  TipoTransicion,
  TipoZoom,
} from "./types";

// Helpers de bajo nivel sobre ffmpeg/ffprobe usando child_process.spawn.
// Prefiere los binarios del sistema (Homebrew) y cae a ffmpeg-static /
// ffprobe-static si no están disponibles.

// ---------- Tipos ----------

export interface VideoProbe {
  durationSeconds: number;
  width: number;
  height: number;
  hasAudio: boolean;
}

export interface ExtractedFrame {
  timestamp: number;
  filePath: string;
}

// Archivo local de un asset de proyecto listo para el render multi-fuente.
// `tipo` es el TipoAsset de la fila ("video" | "foto" | "musica" | "sticker" |
// "audio"); `probe` es opcional para videos (si falta, se calcula con ffprobe).
export interface AssetRender {
  ruta: string;
  tipo: string;
  probe?: VideoProbe;
}

// ---------- Resolución de binarios (con caché) ----------

let ffmpegResuelto: string | null = null;
let ffprobeResuelto: string | null = null;

function existeComando(cmd: string): boolean {
  try {
    const res = spawnSync("which", [cmd]);
    return res.status === 0 && Boolean(res.stdout?.toString().trim());
  } catch {
    return false;
  }
}

// Algunos builds de ffmpeg (p. ej. Homebrew sin libfreetype) no incluyen el
// filtro drawtext, que necesitamos para los textos superpuestos.
function soportaDrawtext(binario: string): boolean {
  try {
    const res = spawnSync(binario, ["-hide_banner", "-filters"]);
    return res.status === 0 && res.stdout?.toString().includes("drawtext");
  } catch {
    return false;
  }
}

// ¿El binario trae el filtro `ass` (libass)? Necesario para los subtítulos
// profesionales/karaoke; si no, se cae al quemado con drawtext. ffmpeg-static
// sí lo trae (verificado). Se cachea porque es un spawn por consulta.
const soportaAssCache = new Map<string, boolean>();
function soportaAss(binario: string): boolean {
  const cacheado = soportaAssCache.get(binario);
  if (cacheado !== undefined) return cacheado;
  let ok = false;
  try {
    const res = spawnSync(binario, ["-hide_banner", "-filters"]);
    ok =
      res.status === 0 &&
      /\bass\b/.test(res.stdout?.toString() ?? "");
  } catch {
    ok = false;
  }
  soportaAssCache.set(binario, ok);
  return ok;
}

// Devuelve la primera ruta que exista de verdad en disco. Cuando el bundler
// procesa estos paquetes, la ruta que exportan puede apuntar a un directorio
// virtual inexistente — por eso siempre se valida con fs.existsSync y se
// prueba también la ruta real dentro de node_modules del proyecto.
function primeraRutaExistente(candidatas: (string | null)[]): string | null {
  for (const ruta of candidatas) {
    if (ruta && fs.existsSync(ruta)) return ruta;
  }
  return null;
}

function rutaFfmpegStatic(): string | null {
  let exportada: string | null = null;
  try {
    // ffmpeg-static exporta directamente la ruta al binario (string).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    exportada = (require("ffmpeg-static") as string) || null;
  } catch {
    exportada = null;
  }
  return primeraRutaExistente([
    exportada,
    path.join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg"),
    path.join(process.cwd(), "node_modules", "ffmpeg-static", "ffmpeg.exe"),
  ]);
}

function rutaFfprobeStatic(): string | null {
  let exportada: string | null = null;
  try {
    // ffprobe-static exporta un objeto { path }.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    exportada = (require("ffprobe-static") as { path: string }).path || null;
  } catch {
    exportada = null;
  }
  return primeraRutaExistente([
    exportada,
    path.join(
      process.cwd(),
      "node_modules",
      "ffprobe-static",
      "bin",
      process.platform,
      process.arch,
      process.platform === "win32" ? "ffprobe.exe" : "ffprobe"
    ),
  ]);
}

export function resolveFfmpeg(): string {
  if (ffmpegResuelto) return ffmpegResuelto;

  const haySistema = existeComando("ffmpeg");
  if (haySistema && soportaDrawtext("ffmpeg")) {
    ffmpegResuelto = "ffmpeg";
  } else {
    // Preferimos ffmpeg-static si el del sistema no existe o no trae drawtext.
    ffmpegResuelto = rutaFfmpegStatic() ?? (haySistema ? "ffmpeg" : null);
  }
  if (!ffmpegResuelto) {
    throw new Error("No se encontró ningún binario de ffmpeg disponible");
  }
  return ffmpegResuelto;
}

export function resolveFfprobe(): string {
  if (ffprobeResuelto) return ffprobeResuelto;
  if (existeComando("ffprobe")) {
    ffprobeResuelto = "ffprobe";
  } else {
    ffprobeResuelto = rutaFfprobeStatic();
  }
  if (!ffprobeResuelto) {
    throw new Error("No se encontró ningún binario de ffprobe disponible");
  }
  return ffprobeResuelto;
}

// ---------- Ejecución de comandos con timeout ----------

function ejecutar(
  binario: string,
  args: string[],
  timeoutMs: number
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const proceso = spawn(binario, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    let matadoPorTimeout = false;

    const timer = setTimeout(() => {
      matadoPorTimeout = true;
      proceso.kill("SIGKILL");
    }, timeoutMs);

    proceso.stdout.on("data", (chunk) => (stdout += chunk.toString()));
    proceso.stderr.on("data", (chunk) => (stderr += chunk.toString()));

    proceso.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(`No se pudo ejecutar ${path.basename(binario)}: ${err.message}`));
    });

    proceso.on("close", (code) => {
      clearTimeout(timer);
      if (matadoPorTimeout) {
        reject(
          new Error(
            `${path.basename(binario)} superó el tiempo máximo de ${Math.round(timeoutMs / 60000)} minutos`
          )
        );
        return;
      }
      if (code !== 0) {
        const ultimasLineas = stderr.trim().split("\n").slice(-30).join("\n");
        reject(
          new Error(
            `${path.basename(binario)} terminó con código ${code}:\n${ultimasLineas}`
          )
        );
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

// ---------- ffprobe: metadatos del video ----------

interface FfprobeStream {
  codec_type?: string;
  width?: number;
  height?: number;
  duration?: string;
}

interface FfprobeSalida {
  streams?: FfprobeStream[];
  format?: { duration?: string };
}

export async function probeVideo(videoPath: string): Promise<VideoProbe> {
  const { stdout } = await ejecutar(
    resolveFfprobe(),
    ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", videoPath],
    60_000
  );

  const info = JSON.parse(stdout) as FfprobeSalida;
  const streams = info.streams ?? [];
  const streamVideo = streams.find((s) => s.codec_type === "video");
  if (!streamVideo) {
    throw new Error("El archivo descargado no contiene una pista de video válida");
  }

  const durationSeconds =
    parseFloat(info.format?.duration ?? streamVideo.duration ?? "0") || 0;

  return {
    durationSeconds,
    width: streamVideo.width ?? 0,
    height: streamVideo.height ?? 0,
    hasAudio: streams.some((s) => s.codec_type === "audio"),
  };
}

// ---------- Extracción de fotogramas ----------

// Extrae `count` fotogramas JPEG equiespaciados, evitando el segundo 0 exacto
// y el final exacto del video. Devuelve la lista con timestamp y ruta.
export async function extractFrames(
  videoPath: string,
  outDir: string,
  count: number,
  durationSeconds?: number
): Promise<ExtractedFrame[]> {
  const duracion =
    durationSeconds ?? (await probeVideo(videoPath)).durationSeconds;
  if (!duracion || duracion <= 0) {
    throw new Error("No se pudo determinar la duración del video para extraer fotogramas");
  }

  fs.mkdirSync(outDir, { recursive: true });
  const ffmpeg = resolveFfmpeg();
  const frames: ExtractedFrame[] = [];

  for (let i = 0; i < count; i++) {
    // Timestamps estrictamente dentro de (0, duración)
    const timestamp = (duracion * (i + 1)) / (count + 1);
    const filePath = path.join(outDir, `frame-${String(i).padStart(2, "0")}.jpg`);

    await ejecutar(
      ffmpeg,
      [
        "-ss",
        timestamp.toFixed(2),
        "-i",
        videoPath,
        "-frames:v",
        "1",
        "-vf",
        "scale=640:-2",
        "-q:v",
        "5",
        "-y",
        filePath,
      ],
      60_000
    );

    if (fs.existsSync(filePath)) {
      frames.push({ timestamp, filePath });
    }
  }

  if (!frames.length) {
    throw new Error("No se pudo extraer ningún fotograma del video");
  }
  return frames;
}

// Convierte una imagen (jpg/png/webp/heic…) a un JPEG reducido (ancho máx.
// `ancho`), apto para mandarlo en base64 a la IA sin pasarse de tamaño.
export async function convertirImagenAJpeg(
  origen: string,
  destino: string,
  ancho = 640
): Promise<void> {
  await ejecutar(
    resolveFfmpeg(),
    [
      "-i",
      origen,
      "-vf",
      `scale='min(${ancho},iw)':-2`,
      "-frames:v",
      "1",
      "-q:v",
      "5",
      "-y",
      destino,
    ],
    60_000
  );
  if (!fs.existsSync(destino)) {
    throw new Error("No se pudo convertir la imagen a JPEG");
  }
}

// ---------- Descarga pública desde Google Drive ----------

const ERROR_DRIVE_PUBLICO =
  'No se pudo descargar el video desde Google Drive. Verifica que el archivo sea público ("Cualquier persona con el enlace puede ver").';

// Descarga un archivo público de Drive. Si Drive devuelve el interstitial
// HTML de "no se pudo analizar en busca de virus" (archivos grandes), parsea
// el formulario y reintenta contra drive.usercontent.google.com.
export async function downloadDriveFile(
  fileId: string,
  destPath: string
): Promise<void> {
  const urlDirecta = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}`;
  let respuesta = await fetch(urlDirecta, { redirect: "follow" });
  let contentType = respuesta.headers.get("content-type") ?? "";

  if (contentType.includes("text/html")) {
    // Interstitial de antivirus: extraer el formulario de confirmación.
    const html = await respuesta.text();
    const matchAction = html.match(
      /<form[^>]+action="(https:\/\/drive\.usercontent\.google\.com\/download[^"]*)"/i
    );
    if (!matchAction) {
      throw new Error(ERROR_DRIVE_PUBLICO);
    }

    const params = new URLSearchParams();
    const regexInput =
      /<input[^>]+type="hidden"[^>]+name="([^"]+)"[^>]+value="([^"]*)"[^>]*>/gi;
    let m: RegExpExecArray | null;
    while ((m = regexInput.exec(html)) !== null) {
      params.set(m[1], m[2]);
    }

    respuesta = await fetch(`${matchAction[1]}?${params.toString()}`, {
      redirect: "follow",
    });
    contentType = respuesta.headers.get("content-type") ?? "";
  }

  if (!respuesta.ok || contentType.includes("text/html") || !respuesta.body) {
    throw new Error(ERROR_DRIVE_PUBLICO);
  }

  // Escribir el cuerpo en streaming para no cargar el video entero en memoria.
  const streamNode = Readable.fromWeb(
    respuesta.body as unknown as import("stream/web").ReadableStream<Uint8Array>
  );
  await pipeline(streamNode, fs.createWriteStream(destPath));

  const stats = fs.statSync(destPath);
  if (stats.size <= 1000) {
    throw new Error(ERROR_DRIVE_PUBLICO);
  }
}

// ---------- Renderizado del plan de edición (v2, multi-pase) ----------

const FUENTES_CANDIDATAS = [
  "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
  "/System/Library/Fonts/Supplemental/Arial.ttf",
  "/System/Library/Fonts/Helvetica.ttc",
  "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
  "C:\\Windows\\Fonts\\arialbd.ttf",
];

function clamp(valor: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, valor));
}

// Escapa el texto para la opción text= de drawtext dentro de un filter_complex
// pasado como un solo argumento (sin shell). El filtergraph tiene DOS niveles
// de parseo (valor de opción + grafo), así que \ ' y : se escapan doble:
// \ -> \\\\, ' -> \\\', : -> \\: y los separadores del grafo (, ; [ ]) simple.
// Validado contra ffmpeg real con textos con comas, dos puntos y comillas.
function escaparTextoDrawtext(texto: string): string {
  return texto
    .replace(/\\/g, "\\\\\\\\")
    .replace(/'/g, "\\\\\\'")
    .replace(/:/g, "\\\\:")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]");
}

function numero(valor: number): string {
  return Number(valor.toFixed(3)).toString();
}

// Parte un texto de subtítulo largo en máximo 2 líneas de ~maxChars caracteres,
// respetando límites de palabra. Devuelve las líneas unidas con un salto de
// línea real ("\n"), que drawtext dibuja en varias líneas. Los textos cortos se
// devuelven en una sola línea.
function partirSubtitulo(texto: string, maxChars = 28): string {
  const limpio = texto.replace(/\s+/g, " ").trim();
  if (limpio.length <= maxChars) return limpio;

  const palabras = limpio.split(" ");
  let linea1 = "";
  let i = 0;
  for (; i < palabras.length; i++) {
    const tentativa = linea1 ? `${linea1} ${palabras[i]}` : palabras[i];
    if (tentativa.length > maxChars && linea1) break;
    linea1 = tentativa;
  }
  const linea2 = palabras.slice(i).join(" ");
  return linea2 ? `${linea1}\n${linea2}` : linea1;
}

// ---------- Subtítulos profesionales en formato ASS (libass) ----------

// Convierte segundos a la marca de tiempo ASS "H:MM:SS.cc" (centésimas).
function tiempoAss(segundos: number): string {
  const s = Math.max(0, segundos);
  const centesimas = Math.round(s * 100);
  const cc = centesimas % 100;
  const totalSeg = Math.floor(centesimas / 100);
  const ss = totalSeg % 60;
  const mm = Math.floor(totalSeg / 60) % 60;
  const hh = Math.floor(totalSeg / 3600);
  const dos = (n: number) => String(n).padStart(2, "0");
  return `${hh}:${dos(mm)}:${dos(ss)}.${dos(cc)}`;
}

// Escapa el texto de una línea Dialogue de ASS. Las llaves inician bloques de
// override, así que se neutralizan; las barras invertidas también. Los saltos
// de línea se traducen al salto "duro" de ASS "\N".
function escaparTextoAss(texto: string): string {
  return texto
    .replace(/\\/g, "∖") // barra → operador "set minus" (visualmente igual)
    .replace(/\{/g, "(")
    .replace(/\}/g, ")")
    .replace(/\r?\n/g, "\\N")
    .trim();
}

// Escapa la ruta del archivo .ass para usarla dentro del filtro `ass=...` de un
// filter_complex (que es UN solo argumento, sin shell). Hay que proteger los
// caracteres que el parser del filtergraph interpreta: ':' separa opciones,
// '\' es escape y las comillas delimitan. Envolvemos en comillas simples y
// escapamos ':' y '\'. En macOS las rutas del tmp no suelen tener comillas.
function escaparRutaAss(ruta: string): string {
  const escapada = ruta.replace(/\\/g, "\\\\").replace(/:/g, "\\:");
  return `'${escapada}'`;
}

// Genera el CONTENIDO de un archivo .ass profesional a partir de los subtítulos
// del plan, aplicando `factorTiempo` a TODOS los tiempos (cue y palabras).
//   - anchoSalida/altoSalida definen PlayResX/Y (1080x1920 en vertical).
//   - nombreFuente es la familia tipográfica (ej. "Archivo Black") que libass
//     resolverá vía fontsdir; si no, cae a una del sistema por fontconfig.
//   - estilo "karaoke": si el cue trae palabras[], usa etiquetas \k (centésimas)
//     para resaltar palabra por palabra (PrimaryColour resaltado, Secondary el
//     color previo). Sin palabras, ese cue cae a clásico.
//   - estilo "clasico": una línea Dialogue por cue (partida en 2 si es larga).
// Devuelve null si no hay ningún cue dibujable.
function generarContenidoAss(
  subtitulos: SubtituloCue[],
  estilo: "clasico" | "karaoke",
  factorTiempo: number,
  anchoSalida: number,
  altoSalida: number,
  nombreFuente: string,
  durTotal: number
): string | null {
  // Tamaño grande tipo reel (~ resolución/16) y márgenes cómodos.
  const fontsize = Math.max(28, Math.round(altoSalida / 16));
  const outline = 4;
  const shadow = 2;
  const marginLR = Math.round(anchoSalida * 0.08);
  // MarginV en ASS es la distancia al borde inferior (Alignment 2). Lo dejamos
  // ~ al 20% del alto para que quede sobre la zona segura, sin chocar con los
  // textos de arriba/centro que dibuja drawtext.
  const marginV = Math.round(altoSalida * 0.2);

  // Colores en formato ASS &HAABBGGRR& (alpha invertido: 00 = opaco).
  const blanco = "&H00FFFFFF"; // texto normal / previo al resaltado
  const amarillo = "&H0000FFFF"; // resaltado karaoke (BGR: amarillo)
  const negro = "&H00000000"; // contorno
  const sombra = "&H64000000"; // sombra semitransparente

  // En karaoke: Primary = color RESALTADO (amarillo), Secondary = color previo
  // (blanco). En clásico: Primary = blanco (Secondary no se usa).
  const primary = estilo === "karaoke" ? amarillo : blanco;
  const secondary = blanco;

  const lineas: string[] = [];
  lineas.push("[Script Info]");
  lineas.push("ScriptType: v4.00+");
  lineas.push(`PlayResX: ${anchoSalida}`);
  lineas.push(`PlayResY: ${altoSalida}`);
  // WrapStyle 0: ajuste automático "inteligente" (líneas parejas) como red de
  // seguridad si un cue quedara más ancho que el área útil; igual respeta los
  // saltos duros "\N" que insertamos con partirSubtitulo.
  lineas.push("WrapStyle: 0");
  lineas.push("ScaledBorderAndShadow: yes");
  lineas.push("");
  lineas.push("[V4+ Styles]");
  lineas.push(
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, " +
      "OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, " +
      "ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, " +
      "MarginL, MarginR, MarginV, Encoding"
  );
  lineas.push(
    `Style: Reel,${nombreFuente},${fontsize},${primary},${secondary},` +
      `${negro},${sombra},-1,0,0,0,100,100,0,0,1,${outline},${shadow},2,` +
      `${marginLR},${marginLR},${marginV},1`
  );
  lineas.push("");
  lineas.push("[Events]");
  lineas.push(
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, " +
      "Effect, Text"
  );

  let dibujables = 0;
  for (const cue of subtitulos) {
    const textoCrudo = (cue.texto ?? "").replace(/\s+/g, " ").trim();
    if (!textoCrudo) continue;
    const desde = clamp((cue.desde ?? 0) * factorTiempo, 0, durTotal);
    const hasta = clamp((cue.hasta ?? 0) * factorTiempo, 0, durTotal);
    if (hasta - desde < 0.05) continue;

    // Karaoke: construir el texto con \k por palabra (centésimas de segundo).
    let texto: string;
    const palabras = cue.palabras ?? [];
    if (estilo === "karaoke" && palabras.length) {
      const partes: string[] = [];
      for (const p of palabras) {
        const pd = clamp((p.desde ?? 0) * factorTiempo, 0, durTotal);
        const ph = clamp((p.hasta ?? 0) * factorTiempo, 0, durTotal);
        const kdur = Math.max(1, Math.round((ph - pd) * 100));
        const palabra = escaparTextoAss(p.palabra ?? "");
        if (!palabra) continue;
        partes.push(`{\\k${kdur}}${palabra}`);
      }
      // Si por algún motivo no quedaron palabras, cae a clásico para este cue.
      texto = partes.length
        ? partes.join(" ")
        : escaparTextoAss(partirSubtitulo(textoCrudo));
    } else {
      // Clásico (o karaoke sin palabras): texto completo, partido en 2 líneas.
      texto = escaparTextoAss(partirSubtitulo(textoCrudo));
    }

    lineas.push(
      `Dialogue: 0,${tiempoAss(desde)},${tiempoAss(hasta)},Reel,,0,0,0,,${texto}`
    );
    dibujables++;
  }

  if (!dibujables) return null;
  return lineas.join("\n") + "\n";
}

// Presets de filtro de color aplicados al video completo (pase 3).
const PRESETS_FILTRO: Record<FiltroVideo, string> = {
  ninguno: "",
  calido: "eq=saturation=1.15:gamma_r=1.05:gamma_b=0.95",
  frio: "eq=saturation=1.05:gamma_b=1.06:gamma_r=0.96",
  vibrante: "eq=saturation=1.35:contrast=1.08",
  vintage: "curves=preset=vintage,vignette=PI/5",
  bn: "hue=s=0,eq=contrast=1.1",
  cine: "eq=contrast=1.12:saturation=0.95:brightness=-0.02,vignette=PI/6",
  sepia:
    "colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131,eq=brightness=0.02",
  noir: "hue=s=0,eq=contrast=1.35:brightness=-0.03,vignette=PI/5",
  pastel: "eq=saturation=0.75:brightness=0.06:gamma=1.08",
  tealorange:
    "curves=red='0/0 0.5/0.55 1/1':blue='0/0.05 0.5/0.45 1/0.95',eq=saturation=1.1",
  // Cadenas lineales (sin split/blend) para poder insertarse en la cadena
  // de filtros del pase 3 sin ramificar el grafo.
  grano: "eq=contrast=1.06:saturation=1.05,noise=alls=11:allf=t+u",
  sonador: "gblur=sigma=1.6:steps=1,eq=brightness=0.05:saturation=1.12",
};

// Color de cada texto superpuesto (fontcolor de drawtext).
const COLORES_TEXTO: Record<ColorTexto, string> = {
  blanco: "white",
  negro: "black",
  amarillo: "0xFFD700",
  rosa: "0xFF5C8A",
  celeste: "0x4FC3F7",
  verde: "0x69F0AE",
};

// Expresiones de posición (x, y) para el overlay de stickers (margen de 44 px,
// esquivando las franjas donde suelen ir los textos). Separadas para poder
// animar la y en la animación "pop".
const POSICIONES_STICKER: Record<PosicionSticker, { x: string; y: string }> = {
  "arriba-izquierda": { x: "44", y: "170" },
  "arriba-derecha": { x: "W-w-44", y: "170" },
  "abajo-izquierda": { x: "44", y: "H-h-190" },
  "abajo-derecha": { x: "W-w-44", y: "H-h-190" },
  centro: { x: "(W-w)/2", y: "(H-h)/2" },
};

// Códecs de los archivos intermedios (segmentos y joined): calidad alta para
// no degradar el material antes del encode final, y audio homogéneo 48 kHz
// estéreo para que concat/xfade del pase 2 nunca fallen por formatos mixtos.
const CODEC_INTERMEDIO = [
  "-c:v",
  "libx264",
  "-preset",
  "veryfast",
  "-crf",
  "18",
  "-pix_fmt",
  "yuv420p",
  "-c:a",
  "aac",
  "-ar",
  "48000",
  "-ac",
  "2",
];

const TIMEOUT_PASE_MS = 15 * 60 * 1000;

interface SegmentoSaneado {
  desde: number;
  hasta: number;
  velocidad: number;
  // Movimiento de cámara (Ken Burns), reencuadre al recortar a 9:16 y rotación
  // para corregir tomas de lado. Todos opcionales con defaults inocuos.
  zoom: TipoZoom;
  reencuadre: "izquierda" | "centro" | "derecha";
  rotacion: 0 | 90 | 180 | 270;
  // Origen del segmento (multi-fuente): ruta local del archivo, si es una
  // FOTO (clip generado con -loop) y si viene de un asset de proyecto.
  ruta: string;
  esFoto: boolean;
  esAsset: boolean;
  // Si ESTE segmento lleva su audio real (la fuente tiene pista y el plan
  // conserva el audio original); si no, se genera pista silenciosa.
  conAudioReal: boolean;
  // Transición de ENTRADA de este segmento (cómo aparece tras el anterior).
  // Se ignora en el primer segmento del video. Si es undefined, el PASE 2
  // usa la transición GLOBAL del plan como respaldo. Permite que cada corte
  // tenga su propio tipo y duración.
  transicion?: { tipo: TipoTransicion; duracion: number };
}

// ---- Helpers de la cadena de video por segmento ----

// Rotación → filtro transpose (se aplica ANTES del escalado, sobre el video
// crudo del trim). 90 horario = transpose=1, 270 = transpose=2, 180 = dos
// transpose=2 seguidos. 0/undefined → sin rotación.
function filtroRotacion(rotacion: 0 | 90 | 180 | 270): string {
  switch (rotacion) {
    case 90:
      return "transpose=1";
    case 270:
      return "transpose=2";
    case 180:
      return "transpose=2,transpose=2";
    default:
      return "";
  }
}

// Cadena de escalado a 9:16 (1080x1920) con la x del crop según el reencuadre.
// Solo cambia algo cuando la fuente es más ancha que 9:16 (hay margen para
// mover el recorte horizontal); si es más angosta, in_w == out_w y la x queda
// en 0 en cualquier caso.
function escalado916(reencuadre: "izquierda" | "centro" | "derecha"): string {
  const x =
    reencuadre === "izquierda"
      ? "0"
      : reencuadre === "derecha"
        ? "in_w-out_w"
        : "(in_w-out_w)/2";
  return `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920:${x}:0`;
}

// Movimiento de cámara (Ken Burns) sobre un frame ya en 1080x1920, a lo largo
// de los `frames` de duración final del segmento (fps=30). Devuelve un filtro
// zoompan o "" si no hay movimiento. Intensidad clampada para que sea suave.
//   - acercar: z 1.0 → 1.10 (push-in)
//   - alejar:  z 1.10 → 1.0 (pull-out)
//   - paneo-izquierda/derecha: z fijo 1.08 con x desplazándose lado a lado
// Verificado con ffmpeg-static: preserva el número de frames (d=1) y el
// encuadre cambia de verdad entre el primer y el último fotograma.
function filtroZoom(zoom: TipoZoom, frames: number): string {
  if (zoom === "ninguno" || frames <= 1) return "";
  const n = Math.max(1, frames - 1); // avance normalizado on/n ∈ [0,1]
  const yCentro = "ih/2-(ih/zoom/2)";
  const base = `:d=1:fps=30:s=1080x1920`;
  switch (zoom) {
    case "acercar":
      return `zoompan=z='min(1.0+0.10*on/${n},1.10)':x='iw/2-(iw/zoom/2)':y='${yCentro}'${base}`;
    case "alejar":
      return `zoompan=z='max(1.10-0.10*on/${n},1.0)':x='iw/2-(iw/zoom/2)':y='${yCentro}'${base}`;
    case "paneo-izquierda":
      // Empieza a la derecha y se desplaza hacia la izquierda.
      return `zoompan=z='1.08':x='(iw-iw/zoom)*(1-on/${n})':y='${yCentro}'${base}`;
    case "paneo-derecha":
      // Empieza a la izquierda y se desplaza hacia la derecha.
      return `zoompan=z='1.08':x='(iw-iw/zoom)*(on/${n})':y='${yCentro}'${base}`;
    default:
      return "";
  }
}

// ---- PASE 1: renderiza un segmento individual seg_i.mp4 ----
// Recorta, ajusta velocidad, reescala y normaliza a 30 fps. Aplica además, por
// segmento: rotación (antes del escalado), reencuadre (x del crop 9:16) y
// movimiento de cámara Ken Burns (zoompan tras el escalado). SIEMPRE deja una
// pista de audio (real o silenciosa) con el mismo formato, requisito del pase 2.
// La fuente vive en seg.ruta: un video (clásico o asset de proyecto) o una FOTO
// (seg.esFoto), que se convierte en clip con -loop 1 -t <duración en pantalla>.
// refAncho/refAlto son las dimensiones de referencia del formato "original"
// (pares), usadas para homogeneizar assets de resoluciones distintas.
async function renderSegmento(
  ffmpeg: string,
  seg: SegmentoSaneado,
  esVertical: boolean,
  refAncho: number,
  refAlto: number,
  salida: string
): Promise<void> {
  const args: string[] = [];

  // Duración final del segmento (tras aplicar velocidad) y su nº de frames a
  // 30 fps: base para el barrido del zoompan. En fotos velocidad = 1 y
  // desde/hasta son directamente el tiempo en pantalla.
  const durSegmento = (seg.hasta - seg.desde) / seg.velocidad;
  const framesSegmento = Math.max(1, Math.round(durSegmento * 30));

  // Cadena de video: [trim → velocidad] → [rotación] → escalado/crop → fps →
  // [zoom]. La rotación va sobre el video crudo (antes de escalar); el zoom, ya
  // en 1080x1920. En formato original no hay reencuadre ni recorte 9:16.
  const pasos: string[] = [];
  if (seg.esFoto) {
    // Foto: imagen loopeada durante la duración en pantalla. No hay trim ni
    // velocidad; el -t de entrada define la duración exacta del clip.
    args.push("-loop", "1", "-framerate", "30", "-t", numero(durSegmento), "-i", seg.ruta);
  } else {
    args.push("-i", seg.ruta);
    pasos.push(
      `trim=start=${numero(seg.desde)}:end=${numero(seg.hasta)}`,
      `setpts=(PTS-STARTPTS)/${numero(seg.velocidad)}`
    );
  }
  const rot = filtroRotacion(seg.rotacion);
  if (rot) pasos.push(rot);
  if (esVertical) {
    pasos.push(escalado916(seg.reencuadre));
  } else if (seg.esAsset) {
    // Formato original con fuentes mixtas: homogeneizar a la resolución de
    // referencia (aspecto preservado + pad) para que el PASE 2 no falle.
    pasos.push(
      `scale=${refAncho}:${refAlto}:force_original_aspect_ratio=decrease,` +
        `pad=${refAncho}:${refAlto}:(ow-iw)/2:(oh-ih)/2`
    );
  } else {
    pasos.push("scale=trunc(iw/2)*2:trunc(ih/2)*2");
  }
  pasos.push("fps=30");
  // El zoom (Ken Burns) asume un lienzo 1080x1920, así que solo aplica en el
  // formato vertical, que es donde el crop deja exactamente esa resolución.
  if (esVertical) {
    const zoom = filtroZoom(seg.zoom, framesSegmento);
    if (zoom) pasos.push(zoom);
  }
  // Normalizar el SAR a 1:1 al final de la cadena: transpose/zoompan/scale
  // pueden dejar SAR distintos entre segmentos y el concat/xfade del PASE 2
  // falla si no coinciden (visto en la práctica: 1:1 vs 10240:10239).
  pasos.push("setsar=1");

  let filtro = `[0:v]${pasos.join(",")}[v]`;

  let mapAudio: string[];
  if (seg.conAudioReal && !seg.esFoto) {
    filtro +=
      `;[0:a]atrim=start=${numero(seg.desde)}:end=${numero(seg.hasta)},` +
      `asetpts=PTS-STARTPTS,atempo=${numero(seg.velocidad)}[a]`;
    mapAudio = ["-map", "[a]"];
  } else {
    // Pista silenciosa recortada a la duración final del segmento (fotos y
    // fuentes sin audio): mantiene los clips homogéneos para el PASE 2.
    args.push("-f", "lavfi", "-t", numero(durSegmento), "-i", "anullsrc=r=48000:cl=stereo");
    mapAudio = ["-map", "1:a"];
  }

  args.push(
    "-filter_complex",
    filtro,
    "-map",
    "[v]",
    ...mapAudio,
    ...CODEC_INTERMEDIO,
    "-y",
    salida
  );
  await ejecutar(ffmpeg, args, TIMEOUT_PASE_MS);
}

// Resultado del pase 2: duración total final y los segundos (sobre la línea de
// tiempo FINAL) donde ocurre el centro de cada transición, para poder colocar
// ahí un whoosh automático.
interface ResultadoUnion {
  durTotal: number;
  puntosTransicion: number[];
}

// Nombres nativos del filtro xfade válidos 1:1 con nuestro TipoTransicion.
// "ninguna" NO está aquí a propósito: significa corte directo (sin solape).
const XFADE_VALIDOS: ReadonlySet<string> = new Set([
  "fade",
  "wipeleft",
  "wiperight",
  "slideup",
  "slidedown",
  "circleopen",
  "zoomin",
  "smoothleft",
  "smoothright",
  "dissolve",
]);

// Transición saneada de un corte concreto (entre el par de segmentos k-1 y k).
//   - tipo: nombre nativo de xfade (solo si dur > 0).
//   - dur:  duración del solape en segundos (0 = corte directo, sin solape).
interface CorteSaneado {
  tipo: string;
  dur: number;
}

// Resuelve y sanea la transición de UN corte k (entre los segmentos k-1 y k).
// Prioridad: la transición de ENTRADA del segmento k (segmentos[k].transicion)
// y, si falta, la transición GLOBAL del plan como respaldo. Reglas:
//   - "ninguna" (o tipo desconocido) → corte directo: dur = 0.
//   - dur se clampa a [0.3, 1] y además a < mitad del segmento MÁS CORTO de
//     ESE par (para no comerse un segmento entero).
//   - si tras el saneo dur < 0.1 → corte directo: dur = 0.
function resolverCorte(
  segmentos: SegmentoSaneado[],
  duraciones: number[],
  plan: ExecutableEditPlan,
  k: number
): CorteSaneado {
  const propia = segmentos[k]?.transicion;
  const trans = propia ?? plan.transicion ?? { tipo: "ninguna", duracion: 0 };
  const tipo = trans.tipo ?? "ninguna";

  if (tipo === "ninguna" || !XFADE_VALIDOS.has(tipo)) {
    if (tipo !== "ninguna" && tipo !== undefined) {
      console.warn(
        `[ffmpeg] Advertencia: transición "${tipo}" no reconocida por xfade; el corte ${k} se une por corte directo.`
      );
    }
    return { tipo: "fade", dur: 0 };
  }

  let dur = clamp(trans.duracion || 0.5, 0.3, 1);
  // La mitad del segmento más corto de ESTE par (no puede comerse un segmento).
  const limite = Math.min(duraciones[k - 1], duraciones[k]) / 2;
  if (dur >= limite) {
    dur = Math.round(Math.max(0, limite - 0.05) * 100) / 100;
  }
  if (dur < 0.1) {
    console.warn(
      `[ffmpeg] Advertencia: segmentos demasiado cortos para la transición del corte ${k}; se une por corte directo.`
    );
    return { tipo: "fade", dur: 0 };
  }
  return { tipo, dur };
}

// ---- PASE 2: une los segmentos en joined.mp4 ----
// Cada corte k (entre el segmento k-1 y el k) usa SU PROPIA transición de
// entrada (segmentos[k].transicion) y, si falta, la transición GLOBAL del plan.
// Los cortes con transición encadenan xfade (video) + acrossfade (audio); los
// cortes "ninguna"/inválidos se unen por concat (sin solape). Con 1 segmento no
// hay unión, y si TODOS los cortes son directos cae a un único concat puro.
// Devuelve la duración total final y el centro temporal de cada corte sobre la
// línea de tiempo FINAL (para los whoosh automáticos).
async function unirSegmentos(
  ffmpeg: string,
  rutas: string[],
  duraciones: number[],
  segmentos: SegmentoSaneado[],
  plan: ExecutableEditPlan,
  salida: string
): Promise<ResultadoUnion> {
  const n = rutas.length;
  const sumaDuraciones = duraciones.reduce((a, b) => a + b, 0);

  if (n === 1) {
    // Un solo segmento: no hay nada que unir, se reutiliza tal cual.
    fs.copyFileSync(rutas[0], salida);
    return { durTotal: sumaDuraciones, puntosTransicion: [] };
  }

  // Saneamos cada corte k=1..n-1 (transición de entrada del segmento k).
  const cortes: CorteSaneado[] = [];
  for (let k = 1; k < n; k++) {
    cortes.push(resolverCorte(segmentos, duraciones, plan, k));
  }
  const hayAlgunaTransicion = cortes.some((c) => c.dur > 0);

  const inputs = rutas.flatMap((r) => ["-i", r]);

  // Camino rápido: TODOS los cortes son directos → un solo concat puro
  // (equivalente exacto al comportamiento clásico "sin transición").
  if (!hayAlgunaTransicion) {
    const entradas = rutas.map((_, i) => `[${i}:v][${i}:a]`).join("");
    await ejecutar(
      ffmpeg,
      [
        ...inputs,
        "-filter_complex",
        `${entradas}concat=n=${n}:v=1:a=1[vj][aj]`,
        "-map",
        "[vj]",
        "-map",
        "[aj]",
        ...CODEC_INTERMEDIO,
        "-y",
        salida,
      ],
      TIMEOUT_PASE_MS
    );
    const puntosTransicion: number[] = [];
    let acu = 0;
    for (let k = 0; k < n - 1; k++) {
      acu += duraciones[k];
      puntosTransicion.push(acu);
    }
    return { durTotal: sumaDuraciones, puntosTransicion };
  }

  // Cadena mixta xfade/concat encadenada, corte a corte. `finalLen` es la
  // duración ACUMULADA del stream ya fusionado sobre la línea FINAL. Para el
  // corte k con solape d_k:
  //   - offset del xfade = finalLen - d_k  (inicio del solape)
  //   - centro del corte  = finalLen - d_k/2
  //   - nuevo finalLen    = finalLen + dur[k] - d_k
  // Un corte directo (d_k = 0) es el mismo esquema con solape 0 (concat).
  const partes: string[] = [];
  let vPrevio = "[0:v]";
  let aPrevio = "[0:a]";
  let finalLen = duraciones[0];
  const puntosTransicion: number[] = [];
  for (let k = 1; k < n; k++) {
    const { tipo, dur } = cortes[k - 1];
    const vSalida = k === n - 1 ? "[vj]" : `[vx${k}]`;
    const aSalida = k === n - 1 ? "[aj]" : `[ax${k}]`;

    if (dur > 0) {
      const offset = Math.max(0, finalLen - dur);
      puntosTransicion.push(finalLen - dur / 2);
      partes.push(
        `${vPrevio}[${k}:v]xfade=transition=${tipo}:duration=${numero(dur)}:offset=${numero(offset)}${vSalida}`
      );
      partes.push(`${aPrevio}[${k}:a]acrossfade=d=${numero(dur)}${aSalida}`);
      finalLen = finalLen + duraciones[k] - dur;
    } else {
      // Corte directo: concat del stream fusionado con el segmento k (sin
      // solape). El corte cae en el tiempo acumulado actual.
      puntosTransicion.push(finalLen);
      partes.push(`${vPrevio}[${k}:v]concat=n=2:v=1:a=0${vSalida}`);
      partes.push(`${aPrevio}[${k}:a]concat=n=2:v=0:a=1${aSalida}`);
      finalLen = finalLen + duraciones[k];
    }

    vPrevio = vSalida;
    aPrevio = aSalida;
  }

  await ejecutar(
    ffmpeg,
    [
      ...inputs,
      "-filter_complex",
      partes.join(";"),
      "-map",
      "[vj]",
      "-map",
      "[aj]",
      ...CODEC_INTERMEDIO,
      "-y",
      salida,
    ],
    TIMEOUT_PASE_MS
  );
  return {
    durTotal: finalLen,
    puntosTransicion,
  };
}

// ---- PASE 3 (núcleo ffmpeg): filtro de color + música/efectos en UN comando ----
// Con incluirGraficos=true agrega además los gráficos clásicos de ffmpeg
// (textos drawtext + stickers overlay + subtítulos ASS): es la rama clásica de
// siempre. La rama PRO (Remotion) lo llama con incluirGraficos=false para
// producir el video BASE (color + audio final, sin gráficos) sobre el que
// luego compone la capa animada. `crf` permite un intermedio de más calidad
// en la rama PRO (el base se recodifica al componer el overlay).
async function componerConFfmpeg(
  ffmpeg: string,
  rutaUnida: string,
  plan: ExecutableEditPlan,
  probe: VideoProbe,
  durTotal: number,
  conAudioOriginal: boolean,
  volumenOriginal: number,
  puntosTransicion: number[],
  factorTiempo: number,
  outputPath: string,
  rutasAssets: Record<string, AssetRender> | undefined,
  incluirGraficos: boolean,
  crf: string
): Promise<void> {
  const esVertical = plan.formato === "vertical_9_16";
  const anchoSalida = esVertical
    ? 1080
    : Math.max(2, Math.trunc((probe.width || 1080) / 2) * 2);

  // Música: primero la subida al proyecto (musica.asset_id, prioridad) y si
  // no, la pista de la biblioteca public/musica (musica.archivo).
  const volumenMusica = clamp(plan.musica?.volumen ?? 0, 0, 1);
  let rutaMusica: string | null = null;
  const musicaAssetId = plan.musica?.asset_id ?? null;
  if (musicaAssetId && volumenMusica > 0) {
    const info = rutasAssets?.[musicaAssetId];
    if (info && fs.existsSync(info.ruta)) {
      rutaMusica = info.ruta;
    } else {
      console.warn(
        `[ffmpeg] Advertencia: la música del proyecto (asset ${musicaAssetId}) no está disponible; se intenta con la biblioteca.`
      );
    }
  }
  if (!rutaMusica && plan.musica?.archivo && volumenMusica > 0) {
    const candidata = path.join(
      process.cwd(),
      "public",
      "musica",
      path.basename(plan.musica.archivo)
    );
    if (fs.existsSync(candidata)) {
      rutaMusica = candidata;
    } else {
      console.warn(
        `[ffmpeg] Advertencia: la pista "${plan.musica.archivo}" no existe en public/musica; se omite la música.`
      );
    }
  }

  // Stickers: los del proyecto (asset_id, prioridad) desde rutasAssets y los
  // de la biblioteca desde public/stickers. Los que falten se omiten con aviso.
  // En la rama PRO (incluirGraficos=false) los dibuja Remotion: no se cargan.
  const dirStickers = path.join(process.cwd(), "public", "stickers");
  const stickers: (ExecutableEditPlan["stickers"][number] & { ruta: string })[] =
    [];
  for (const st of incluirGraficos ? (plan.stickers ?? []) : []) {
    if (st.asset_id) {
      const info = rutasAssets?.[st.asset_id];
      if (info && fs.existsSync(info.ruta)) {
        stickers.push({ ...st, ruta: info.ruta });
      } else {
        console.warn(
          `[ffmpeg] Advertencia: el sticker del proyecto (asset ${st.asset_id}) no está disponible; se omite.`
        );
      }
      continue;
    }
    const candidata = path.join(dirStickers, path.basename(st.archivo));
    if (fs.existsSync(candidata)) {
      stickers.push({ ...st, ruta: candidata });
    } else {
      console.warn(
        `[ffmpeg] Advertencia: el sticker "${st.archivo}" no existe en public/stickers; se omite.`
      );
    }
  }

  // Efectos de sonido puntuales (public/audio/fx): validar existencia, clampar
  // volumen y su segundo dentro de [0, durTotal]. Cada uno se agregará como
  // input extra y se mezclará en el audio final vía adelay+volume+amix.
  const dirFx = path.join(process.cwd(), "public", "audio", "fx");
  const efectos: { ruta: string; enSegundo: number; volumen: number }[] = [];
  for (const ef of plan.efectos_sonido ?? []) {
    if (!ef?.archivo) continue;
    const candidata = path.join(dirFx, path.basename(ef.archivo));
    if (!fs.existsSync(candidata)) {
      console.warn(
        `[ffmpeg] Advertencia: el efecto "${ef.archivo}" no existe en public/audio/fx; se omite.`
      );
      continue;
    }
    efectos.push({
      ruta: candidata,
      // Tiempo de la IA (línea ingenua) reescalado a la duración real.
      enSegundo: clamp((ef.en_segundo ?? 0) * factorTiempo, 0, durTotal),
      volumen: clamp(ef.volumen ?? 0.5, 0, 1),
    });
  }

  // Whoosh automático en cada transición (si se pidió y el archivo existe).
  if (plan.whoosh_en_transiciones) {
    const rutaWhoosh = path.join(dirFx, "whoosh.mp3");
    if (fs.existsSync(rutaWhoosh)) {
      for (const punto of puntosTransicion) {
        efectos.push({
          ruta: rutaWhoosh,
          enSegundo: clamp(punto, 0, durTotal),
          volumen: 0.5,
        });
      }
    } else {
      console.warn(
        "[ffmpeg] Advertencia: whoosh_en_transiciones pedido pero falta public/audio/fx/whoosh.mp3; se omite."
      );
    }
  }

  // Inputs: video unido + música loopeada (si hay) + stickers PNG + efectos.
  const inputs: string[] = ["-i", rutaUnida];
  if (rutaMusica) inputs.push("-stream_loop", "-1", "-i", rutaMusica);
  const indicePrimerSticker = rutaMusica ? 2 : 1;
  // -loop 1: sin loop, la imagen es UN frame con t=0 y los fades con st>0
  // dejarían el alpha en 0 para siempre (sticker invisible). Con loop el
  // stream tiene timestamps crecientes y fade/enable funcionan; OJO: el
  // stream es INFINITO, por eso cada overlay de sticker lleva shortest=1
  // (sin él ffmpeg no termina nunca y el render muere por timeout).
  for (const st of stickers) inputs.push("-loop", "1", "-i", st.ruta);
  // Los efectos van DESPUÉS de los stickers para no correr sus índices.
  const indicePrimerEfecto = indicePrimerSticker + stickers.length;
  for (const ef of efectos) inputs.push("-i", ef.ruta);

  // ----- Cadena de video: filtro → textos → stickers -----
  const filtros: string[] = [];
  let etiquetaVideo = "[0:v]";

  const preset = PRESETS_FILTRO[plan.filtro ?? "ninguno"] ?? "";
  if (preset) {
    filtros.push(`${etiquetaVideo}${preset}[vfl]`);
    etiquetaVideo = "[vfl]";
  }

  const textos = plan.textos ?? [];
  const fuenteSistema = FUENTES_CANDIDATAS.find((f) => fs.existsSync(f));
  const dirFuentes = path.join(process.cwd(), "public", "fuentes");
  // En la rama PRO (incluirGraficos=false) los textos los dibuja Remotion.
  if (incluirGraficos && textos.length) {
    // fontsize proporcional al ancho de salida (56 px para 1080 de ancho).
    const fontsize = Math.max(24, Math.round((56 * anchoSalida) / 1080));
    const cadenas: string[] = [];
    for (const t of textos) {
      // Fuente por texto: la de public/fuentes elegida por la IA o, si no
      // existe (o el plan es antiguo y no trae fuente), la del sistema.
      const nombreFuente = t.fuente ?? null;
      let fontfile = fuenteSistema;
      if (nombreFuente) {
        const candidata = path.join(dirFuentes, path.basename(nombreFuente));
        if (fs.existsSync(candidata)) {
          fontfile = candidata;
        } else {
          console.warn(
            `[ffmpeg] Advertencia: la fuente "${nombreFuente}" no existe en public/fuentes; se usa la del sistema.`
          );
        }
      }
      if (!fontfile) {
        console.warn(
          `[ffmpeg] Advertencia: no se encontró ninguna fuente tipográfica disponible; se omite el texto "${t.texto}".`
        );
        continue;
      }

      // Color del texto (planes antiguos sin color: blanco). El borde va en
      // negro para colores claros y en blanco cuando el texto es negro.
      const color: ColorTexto = t.color ?? "blanco";
      const fontcolor = COLORES_TEXTO[color] ?? COLORES_TEXTO.blanco;
      const bordecolor = color === "negro" ? "white" : "black";

      const yBase =
        t.posicion === "arriba"
          ? "h*0.12"
          : t.posicion === "centro"
            ? "(h-text_h)/2"
            : "h*0.78";
      const xBase = "(w-text_w)/2";
      // Tiempos de la IA (línea ingenua) reescalados a la duración real.
      const desde = Math.max(0, t.desde * factorTiempo);
      const hasta = Math.max(desde, t.hasta * factorTiempo);

      // Animación de entrada/salida (planes antiguos sin animación: "fundido").
      // El fundido de 0.3 s se aplica sobre alpha; deslizar-* mueve además la
      // posición durante los primeros 0.3 s. La ventana visible sigue siendo
      // [desde,hasta] vía enable=between(t,desde,hasta).
      const animacion = t.animacion ?? "fundido";
      const D = numero(desde);
      const H = numero(hasta);
      let alphaExpr: string | null = null;
      let xExpr = xBase;
      let yExpr = yBase;
      if (animacion !== "ninguna") {
        // Fade de entrada y salida de 0.3 s, clamp a [0,1].
        alphaExpr =
          `clip(if(lt(t,${D}+0.3),(t-${D})/0.3,` +
          `if(gt(t,${H}-0.3),(${H}-t)/0.3,1)),0,1)`;
        if (animacion === "deslizar-arriba") {
          // Entra desde y_base+60 hasta y_base durante los primeros 0.3 s.
          yExpr = `if(lt(t,${D}+0.3), (${yBase})+60*(1-(t-${D})/0.3), ${yBase})`;
        } else if (animacion === "deslizar-lado") {
          // Entra desde x_base-80 hasta x_base durante los primeros 0.3 s.
          xExpr = `if(lt(t,${D}+0.3), (${xBase})-80*(1-(t-${D})/0.3), ${xBase})`;
        }
      }

      // Decoración según estilo (planes antiguos sin estilo: "simple").
      // - simple: borde fino de contraste.
      // - caja:   borde fino + fondo negro semitransparente tipo sticker.
      // - sombra: sombra dura negra desplazada, sin borde (look Canva).
      // - neon:   halo grueso translúcido del MISMO color del texto; si el
      //           color elegido es muy oscuro el texto pasa a blanco para
      //           que el halo se lea como brillo.
      const estilo = t.estilo ?? "simple";
      let fontcolorFinal = fontcolor;
      let decoracion: string;
      if (estilo === "caja") {
        decoracion = `borderw=4:bordercolor=${bordecolor}:box=1:boxcolor=black@0.55:boxborderw=18`;
      } else if (estilo === "sombra") {
        decoracion = "borderw=0:shadowcolor=black@0.75:shadowx=6:shadowy=6";
      } else if (estilo === "neon") {
        if (color === "negro") fontcolorFinal = "white";
        decoracion = `borderw=10:bordercolor=${fontcolor}@0.4`;
      } else {
        decoracion = `borderw=4:bordercolor=${bordecolor}`;
      }

      const alphaOpcion = alphaExpr ? `:alpha='${alphaExpr}'` : "";
      cadenas.push(
        `drawtext=fontfile='${fontfile}':text=${escaparTextoDrawtext(t.texto)}:` +
          `fontsize=${fontsize}:fontcolor=${fontcolorFinal}:${decoracion}${alphaOpcion}:` +
          `x='${xExpr}':y='${yExpr}':enable='between(t,${D},${H})'`
      );
    }
    if (cadenas.length) {
      filtros.push(`${etiquetaVideo}${cadenas.join(",")}[vtx]`);
      etiquetaVideo = "[vtx]";
    }
  }

  // ----- Subtítulos (captions): se aplican DESPUÉS de los stickers -----
  // Los subtítulos van encima de todo (color, textos, stickers), así que solo
  // preparamos aquí el material y los quemamos más abajo. El estilo profesional
  // usa el filtro `ass` (libass); si el binario no lo soporta, se cae al quemado
  // clásico con drawtext (misma información, look de caja simple).
  const subtitulos = plan.subtitulos ?? [];

  // Fuente bold para el fallback drawtext: preferimos una gruesa de
  // public/fuentes si existe; para el .ass usamos su familia ("Archivo Black").
  const candidataBold = path.join(dirFuentes, "titulos-gruesos.ttf");
  const fontfileSub = fs.existsSync(candidataBold) ? candidataBold : fuenteSistema;

  // Construye la cadena de drawtext (fallback) para los subtítulos. Devuelve ""
  // si no hay nada que dibujar. Franja inferior (y = h*0.78), caja negra
  // semitransparente, fundido corto para no parpadear.
  function construirDrawtextSubtitulos(): string {
    if (!fontfileSub) return "";
    const fontsizeSub = Math.max(22, Math.round(anchoSalida / 18));
    const cadenasSub: string[] = [];
    for (const cue of subtitulos) {
      const texto = partirSubtitulo(cue.texto ?? "");
      if (!texto.trim()) continue;
      const desde = Math.max(0, (cue.desde ?? 0) * factorTiempo);
      const hasta = Math.max(desde, (cue.hasta ?? 0) * factorTiempo);
      if (hasta - desde < 0.05) continue;
      const D = numero(desde);
      const H = numero(hasta);
      const alphaSub =
        `clip(if(lt(t,${D}+0.15),(t-${D})/0.15,` +
        `if(gt(t,${H}-0.15),(${H}-t)/0.15,1)),0,1)`;
      cadenasSub.push(
        `drawtext=fontfile='${fontfileSub}':text=${escaparTextoDrawtext(texto)}:` +
          `fontsize=${fontsizeSub}:fontcolor=white:borderw=2:bordercolor=black:` +
          `box=1:boxcolor=black@0.6:boxborderw=16:line_spacing=6:` +
          `x='(w-text_w)/2':y='h*0.78':alpha='${alphaSub}':` +
          `enable='between(t,${D},${H})'`
      );
    }
    return cadenasSub.join(",");
  }

  stickers.forEach((st, j) => {
    const indice = indicePrimerSticker + j;
    const ancho = Math.max(24, Math.round(anchoSalida * clamp(st.escala || 0.2, 0.1, 0.35)));
    // Tiempos de la IA (línea ingenua) reescalados a la duración real.
    const desde = Math.max(0, st.desde * factorTiempo);
    const hasta = Math.max(desde, st.hasta * factorTiempo);
    const D = numero(desde);
    const H = numero(hasta);
    const pos = POSICIONES_STICKER[st.posicion] ?? POSICIONES_STICKER["arriba-derecha"];

    // Animación de entrada/salida (planes antiguos sin animación: "fundido").
    const animacion = st.animacion ?? "fundido";
    // Duración del fade: "pop" es más rápido (0.2 s) para sentirse enérgico.
    const durFade = animacion === "pop" ? 0.2 : 0.3;
    const inicioSalida = numero(Math.max(desde, hasta - durFade));

    // Fade sobre la imagen del sticker (canal alpha) antes del overlay, salvo
    // en "ninguna" (overlay tal cual). Se fuerza formato rgba para el fade.
    let cadenaSticker = `[${indice}:v]scale=${ancho}:-1`;
    if (animacion !== "ninguna") {
      cadenaSticker +=
        `,format=rgba,` +
        `fade=t=in:st=${D}:d=${numero(durFade)}:alpha=1,` +
        `fade=t=out:st=${inicioSalida}:d=${numero(durFade)}:alpha=1`;
    }
    filtros.push(`${cadenaSticker}[stk${j}]`);

    // Posición del overlay. En "pop" la y entra con un pequeño rebote vertical
    // de 30 px durante los primeros 0.2 s; el resto usa la posición fija.
    const xExpr = pos.x;
    const yExpr =
      animacion === "pop"
        ? `(${pos.y})+30*(1-min(1,(t-${D})/0.2))`
        : pos.y;
    // shortest=1 es OBLIGATORIO: el sticker viene de una imagen con -loop 1
    // (stream infinito) y sin él overlay nunca emite EOF → ffmpeg codifica
    // para siempre hasta el timeout. Con shortest=1 termina con el video.
    filtros.push(
      `${etiquetaVideo}[stk${j}]overlay=x='${xExpr}':y='${yExpr}':shortest=1:` +
        `enable='between(t,${D},${H})'[vov${j}]`
    );
    etiquetaVideo = `[vov${j}]`;
  });

  // ----- Subtítulos quemados (ASS profesional, con fallback drawtext) -----
  // Se aplican al final, ENCIMA de color/textos/stickers. Preferimos el filtro
  // `ass` (libass): estilo bold grande, contorno + sombra, franja inferior y
  // karaoke palabra-por-palabra si el estilo lo pide y el cue trae palabras[].
  // rutaAss se limpia en el finally del final del render. En la rama PRO
  // (incluirGraficos=false) los subtítulos también los dibuja Remotion.
  let rutaAss: string | null = null;
  if (incluirGraficos && subtitulos.length) {
    const estiloSub = plan.subtitulos_estilo === "karaoke" ? "karaoke" : "clasico";
    const altoSalida = esVertical ? 1920 : Math.max(2, probe.height || 1920);
    // Familia de la fuente gruesa incluida en public/fuentes (titulos-gruesos =
    // "Archivo Black"); si no está, dejamos que libass elija por fontconfig.
    const nombreFuente = fs.existsSync(candidataBold) ? "Archivo Black" : "Arial";

    let usoAss = false;
    if (soportaAss(ffmpeg)) {
      const contenido = generarContenidoAss(
        subtitulos,
        estiloSub,
        factorTiempo,
        anchoSalida,
        altoSalida,
        nombreFuente,
        durTotal
      );
      if (contenido) {
        try {
          const dir = path.dirname(outputPath);
          rutaAss = path.join(dir, `subtitulos_${Date.now()}.ass`);
          fs.writeFileSync(rutaAss, contenido, "utf8");
          const opcionFonts = `:fontsdir=${escaparRutaAss(dirFuentes)}`;
          filtros.push(
            `${etiquetaVideo}ass=${escaparRutaAss(rutaAss)}${opcionFonts}[vsub]`
          );
          etiquetaVideo = "[vsub]";
          usoAss = true;
        } catch (e) {
          console.warn(
            `[ffmpeg] Advertencia: no se pudo escribir/aplicar el .ass de subtítulos; se usa drawtext. Detalle: ${
              (e as Error).message
            }`
          );
          rutaAss = null;
        }
      }
    } else {
      console.warn(
        "[ffmpeg] Advertencia: el binario de ffmpeg no soporta el filtro ass; se usan subtítulos con drawtext."
      );
    }

    // Fallback: si no se usó ASS, quemar con drawtext (look de caja simple).
    if (!usoAss) {
      const cadenaSub = construirDrawtextSubtitulos();
      if (cadenaSub) {
        filtros.push(`${etiquetaVideo}${cadenaSub}[vsub]`);
        etiquetaVideo = "[vsub]";
      }
    }
  }

  // filter_complex no puede ir vacío: si no hubo filtros, pasar el video por null.
  if (etiquetaVideo === "[0:v]") {
    filtros.push("[0:v]null[vout]");
    etiquetaVideo = "[vout]";
  }

  // ----- Cadena de audio -----
  // Se construye primero el audio BASE (original + música, casos a–d) con la
  // etiqueta [abase]; luego, si hay efectos, se mezclan encima con adelay +
  // volume + amix y se normaliza con dynaudnorm para que no saturen.
  const argsAudio: string[] = [];
  const hayEfectos = efectos.length > 0;

  // 1) Audio base.
  let etiquetaBase: string | null = null; // null = silencio (no hay base real)
  if (conAudioOriginal || rutaMusica) {
    if (conAudioOriginal && !rutaMusica) {
      // (b) solo audio original.
      filtros.push(`[0:a]volume=${numero(volumenOriginal)}[abase]`);
    } else {
      // Música loopeada, recortada al video final y con fade de salida de 1 s.
      const inicioFade = Math.max(0, durTotal - 1);
      const duracionFade = Math.min(1, Math.max(0.1, durTotal));
      const cadenaMusica =
        `[1:a]atrim=0:${numero(durTotal)},asetpts=PTS-STARTPTS,volume=${numero(volumenMusica)},` +
        `afade=t=out:st=${numero(inicioFade)}:d=${numero(duracionFade)}`;
      if (!conAudioOriginal) {
        // (c) solo música.
        filtros.push(`${cadenaMusica}[abase]`);
      } else {
        // (d) audio original + música mezclados.
        filtros.push(`[0:a]volume=${numero(volumenOriginal)}[aorig]`);
        filtros.push(`${cadenaMusica}[amus]`);
        filtros.push(
          `[aorig][amus]amix=inputs=2:duration=first:dropout_transition=0[abase]`
        );
      }
    }
    etiquetaBase = "[abase]";
  } else if (hayEfectos) {
    // (a') sin música ni audio original PERO con efectos: base de silencio del
    // largo del video para que los efectos se coloquen sobre la línea de tiempo.
    // Se agrega como último input, después de todos los efectos.
    inputs.push("-f", "lavfi", "-t", numero(durTotal), "-i", "anullsrc=r=48000:cl=stereo");
    etiquetaBase = `[${indicePrimerEfecto + efectos.length}:a]`;
  }

  // 2) Efectos: cada uno retrasado a su segundo (adelay en ms) y con su volumen.
  if (hayEfectos && etiquetaBase) {
    const etiquetasFx: string[] = [];
    efectos.forEach((ef, k) => {
      const indice = indicePrimerEfecto + k;
      const ms = Math.round(ef.enSegundo * 1000);
      filtros.push(
        `[${indice}:a]adelay=${ms}|${ms},volume=${numero(ef.volumen)}[fx${k}]`
      );
      etiquetasFx.push(`[fx${k}]`);
    });
    // amix con la base primero (duration=first la fija al largo del video).
    const entradas = etiquetaBase + etiquetasFx.join("");
    const totalMix = 1 + etiquetasFx.length;
    filtros.push(
      `${entradas}amix=inputs=${totalMix}:duration=first:dropout_transition=0,dynaudnorm[aout]`
    );
    argsAudio.push("-map", "[aout]", "-c:a", "aac", "-b:a", "160k");
  } else if (etiquetaBase) {
    // Sin efectos: el audio base es la salida tal cual.
    filtros.push(`${etiquetaBase}anull[aout]`);
    argsAudio.push("-map", "[aout]", "-c:a", "aac", "-b:a", "160k");
  } else {
    // (a) sin música, sin audio original y sin efectos.
    argsAudio.push("-an");
  }

  try {
    await ejecutar(
      ffmpeg,
      [
        ...inputs,
        "-filter_complex",
        filtros.join(";"),
        "-map",
        etiquetaVideo,
        ...argsAudio,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        crf,
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        "-y",
        outputPath,
      ],
      TIMEOUT_PASE_MS
    );
  } finally {
    // Limpiar el .ass temporal de subtítulos (mejor esfuerzo).
    if (rutaAss) {
      try {
        fs.rmSync(rutaAss, { force: true });
      } catch {
        // Ignorar: no bloquea el resultado.
      }
    }
  }
}

// ---- PASE 3: composición final (rama PRO Remotion o rama clásica ffmpeg) ----
// Con overlay_pro activado (default: solo se desactiva con === false) produce
// primero el video BASE (color + audio final, sin gráficos) con
// componerConFfmpeg, renderiza la capa de gráficos animados con Remotion
// (textos, stickers, subtítulos karaoke, barra de progreso) en un .mov con
// alpha y los compone encima. Si Remotion falla por lo que sea, avisa y CAE a
// la rama clásica (drawtext/overlay/ass) para que el render nunca se rompa.
async function componerFinal(
  ffmpeg: string,
  rutaUnida: string,
  plan: ExecutableEditPlan,
  probe: VideoProbe,
  durTotal: number,
  conAudioOriginal: boolean,
  volumenOriginal: number,
  puntosTransicion: number[],
  factorTiempo: number,
  outputPath: string,
  rutasAssets?: Record<string, AssetRender>
): Promise<void> {
  if (plan.overlay_pro !== false) {
    const dir = path.dirname(outputPath);
    const sello = Date.now();
    // Intermedios de la rama PRO: video base y capa de gráficos con alpha.
    const rutaBase = path.join(dir, `base_pro_${sello}.mp4`);
    const rutaOverlay = path.join(dir, `overlay_pro_${sello}.mov`);
    try {
      // 1) Video base: filtro de color + música/efectos, SIN gráficos (los
      //    dibuja Remotion). CRF 18: es un intermedio que se recodifica al
      //    componer el overlay, así que va con calidad extra.
      await componerConFfmpeg(
        ffmpeg,
        rutaUnida,
        plan,
        probe,
        durTotal,
        conAudioOriginal,
        volumenOriginal,
        puntosTransicion,
        factorTiempo,
        rutaBase,
        rutasAssets,
        false,
        "18"
      );

      // 2) Capa de gráficos profesional (Remotion) como .mov con canal alpha.
      const props = planAOverlayProps(plan, factorTiempo, durTotal, rutasAssets);
      await renderOverlayPro(props, durTotal, rutaOverlay);
      if (!fs.existsSync(rutaOverlay)) {
        throw new Error("Remotion no generó el archivo de overlay esperado");
      }

      // 3) Composición: overlay a pantalla completa sobre el base; el audio
      //    final ya viene en el base y se copia sin recodificar.
      await ejecutar(
        ffmpeg,
        [
          "-i",
          rutaBase,
          "-i",
          rutaOverlay,
          "-filter_complex",
          "[0:v][1:v]overlay=0:0:format=auto[v]",
          "-map",
          "[v]",
          "-map",
          "0:a?",
          "-c:v",
          "libx264",
          "-preset",
          "veryfast",
          "-crf",
          "21",
          "-pix_fmt",
          "yuv420p",
          "-movflags",
          "+faststart",
          "-c:a",
          "copy",
          "-y",
          outputPath,
        ],
        TIMEOUT_PASE_MS
      );
      return;
    } catch (e) {
      console.warn(
        `[ffmpeg] Advertencia: falló la capa de gráficos PRO (Remotion); se usa el modo clásico. Detalle: ${
          (e as Error).message
        }`
      );
    } finally {
      // Limpiar los intermedios de la rama PRO (mejor esfuerzo).
      for (const ruta of [rutaBase, rutaOverlay]) {
        try {
          fs.rmSync(ruta, { force: true });
        } catch {
          // Ignorar: no bloquea el resultado.
        }
      }
    }
  }

  // Rama clásica: overlay_pro === false o fallback si Remotion falló.
  await componerConFfmpeg(
    ffmpeg,
    rutaUnida,
    plan,
    probe,
    durTotal,
    conAudioOriginal,
    volumenOriginal,
    puntosTransicion,
    factorTiempo,
    outputPath,
    rutasAssets,
    true,
    "23"
  );
}

// Renderiza el plan de edición v2 con estrategia multi-pase en tmpDir:
// PASE 1 corta cada segmento, PASE 2 los une (con o sin transición) y
// PASE 3 aplica filtro de color, textos, stickers y música en un comando.
//
// Modo clásico: inputPath + probe del video único (los segmentos sin asset_id
// salen de él). Modo proyecto (multi-fuente): rutasAssets mapea asset_id →
// archivo local (video/foto/música/sticker); inputPath y probe pueden ser null
// si TODOS los segmentos referencian assets.
export async function renderEditPlan(
  inputPath: string | null,
  plan: ExecutableEditPlan,
  outputPath: string,
  probe: VideoProbe | null,
  tmpDir?: string,
  rutasAssets?: Record<string, AssetRender>
): Promise<void> {
  const ffmpeg = resolveFfmpeg();
  const dirTrabajo = tmpDir ?? path.dirname(outputPath);
  fs.mkdirSync(dirTrabajo, { recursive: true });

  // Volumen efectivo del audio original: manda musica.volumen_original y,
  // si viene en 0 pero audio_original es true, se conserva a volumen 1.
  const volOriginalPlan = clamp(plan.musica?.volumen_original ?? 0, 0, 1);
  const volumenOriginal = volOriginalPlan > 0 ? volOriginalPlan : plan.audio_original ? 1 : 0;

  // Reencuadres válidos; cualquier otro valor cae a "centro".
  const REENCUADRES = new Set(["izquierda", "centro", "derecha"]);
  const ROTACIONES = new Set([0, 90, 180, 270]);

  // Caché de probes de los assets de video (para clamps y audio por segmento).
  const probesAssets = new Map<string, VideoProbe>();
  async function probeDeAsset(assetId: string, info: AssetRender): Promise<VideoProbe> {
    if (info.probe) return info.probe;
    const cacheado = probesAssets.get(assetId);
    if (cacheado) return cacheado;
    const nuevo = await probeVideo(info.ruta);
    probesAssets.set(assetId, nuevo);
    return nuevo;
  }

  // Probe de referencia para el formato "original" y los subtítulos: el del
  // video único (clásico) o el del primer asset de video que aparezca.
  let probeReferencia: VideoProbe | null = probe;

  // Sanear segmentos resolviendo la fuente de cada uno:
  //  - asset_id de FOTO: desde/hasta = tiempo en pantalla; velocidad 1 y
  //    SIEMPRE con movimiento Ken Burns (si falta o es "ninguno" → "acercar").
  //  - asset_id de VIDEO: clamp a [0, duración de ESE asset].
  //  - sin asset_id (clásico): clamp a [0, duración del video único].
  const segmentos: SegmentoSaneado[] = [];
  for (const s of plan.segmentos ?? []) {
    const base = {
      velocidad: clamp(s.velocidad || 1, 0.5, 2),
      zoom: (s.zoom ?? "ninguno") as TipoZoom,
      reencuadre: (REENCUADRES.has(s.reencuadre ?? "")
        ? s.reencuadre
        : "centro") as "izquierda" | "centro" | "derecha",
      rotacion: (ROTACIONES.has(s.rotacion ?? 0) ? s.rotacion : 0) as
        | 0
        | 90
        | 180
        | 270,
      // Transición de entrada del segmento (se pasa tal cual al PASE 2, que
      // la sanea y cae a la global del plan si falta).
      transicion: s.transicion
        ? {
            tipo: s.transicion.tipo as TipoTransicion,
            duracion: s.transicion.duracion,
          }
        : undefined,
    };

    if (s.asset_id) {
      const info = rutasAssets?.[s.asset_id];
      if (!info || !fs.existsSync(info.ruta)) {
        throw new Error(
          `El plan usa el asset ${s.asset_id} pero su archivo no está disponible para el render`
        );
      }
      if (info.tipo === "foto" || info.tipo === "sticker") {
        // Foto: la duración en pantalla es hasta - desde; el clip empieza en 0.
        const duracionPantalla = Math.max(0, (s.hasta ?? 0) - (s.desde ?? 0));
        segmentos.push({
          ...base,
          desde: 0,
          hasta: duracionPantalla,
          velocidad: 1,
          zoom: base.zoom === "ninguno" ? "acercar" : base.zoom,
          ruta: info.ruta,
          esFoto: true,
          esAsset: true,
          conAudioReal: false,
        });
      } else {
        const probeAsset = await probeDeAsset(s.asset_id, info);
        if (!probeReferencia) probeReferencia = probeAsset;
        segmentos.push({
          ...base,
          desde: clamp(s.desde, 0, probeAsset.durationSeconds),
          hasta: clamp(s.hasta, 0, probeAsset.durationSeconds),
          ruta: info.ruta,
          esFoto: false,
          esAsset: true,
          conAudioReal: probeAsset.hasAudio && volumenOriginal > 0,
        });
      }
    } else {
      if (!inputPath || !probe) {
        throw new Error(
          "El plan tiene segmentos sin asset_id pero no se proporcionó el video de origen"
        );
      }
      segmentos.push({
        ...base,
        desde: clamp(s.desde, 0, probe.durationSeconds),
        hasta: clamp(s.hasta, 0, probe.durationSeconds),
        ruta: inputPath,
        esFoto: false,
        esAsset: false,
        conAudioReal: probe.hasAudio && volumenOriginal > 0,
      });
    }
  }

  const segmentosValidos = segmentos.filter((s) => s.hasta - s.desde > 0.05);

  if (!segmentosValidos.length) {
    throw new Error(
      "El plan de edición no contiene segmentos válidos dentro de la duración del material"
    );
  }

  // ¿El video final lleva audio original? Basta con que ALGÚN segmento lo
  // aporte (los demás llevan pista silenciosa homogénea).
  const conAudioOriginal = segmentosValidos.some((s) => s.conAudioReal);

  const esVertical = plan.formato === "vertical_9_16";

  // Dimensiones de referencia (pares) para homogeneizar assets en formato
  // "original"; y probe efectivo para el PASE 3 (ancho/alto de salida).
  const refAncho = Math.max(2, Math.trunc((probeReferencia?.width || 1080) / 2) * 2);
  const refAlto = Math.max(2, Math.trunc((probeReferencia?.height || 1920) / 2) * 2);

  const intermedios: string[] = [];
  try {
    // PASE 1: un archivo por segmento.
    const rutasSegmentos: string[] = [];
    for (let i = 0; i < segmentosValidos.length; i++) {
      const ruta = path.join(dirTrabajo, `seg_${i}.mp4`);
      intermedios.push(ruta);
      await renderSegmento(ffmpeg, segmentosValidos[i], esVertical, refAncho, refAlto, ruta);
      rutasSegmentos.push(ruta);
    }

    // PASE 2: unión (duraciones finales ya ajustadas por velocidad).
    const duraciones = segmentosValidos.map((s) => (s.hasta - s.desde) / s.velocidad);
    const rutaUnida = path.join(dirTrabajo, "joined.mp4");
    intermedios.push(rutaUnida);
    const { durTotal, puntosTransicion } = await unirSegmentos(
      ffmpeg,
      rutasSegmentos,
      duraciones,
      segmentosValidos,
      plan,
      rutaUnida
    );

    // La IA planifica los tiempos de textos/stickers/efectos sobre la línea de
    // tiempo "ingenua" (suma de segmentos). Cuando hay transiciones xfade los
    // segmentos se solapan y el video final queda más corto, así que un CTA al
    // final se caería fuera de cuadro. Reescalamos esos tiempos por este factor
    // para que todo quede proporcional a la duración real. (Sin transiciones el
    // factor es 1, sin efecto.)
    const duracionIngenua = duraciones.reduce((a, b) => a + b, 0);
    const factorTiempo =
      duracionIngenua > 0 ? durTotal / duracionIngenua : 1;

    // PASE 3: composición final. En modo multi-fuente (probe null) se usa un
    // probe efectivo con las dimensiones de referencia.
    const probeEfectivo: VideoProbe = probeReferencia ?? {
      durationSeconds: durTotal,
      width: refAncho,
      height: refAlto,
      hasAudio: conAudioOriginal,
    };
    await componerFinal(
      ffmpeg,
      rutaUnida,
      plan,
      probeEfectivo,
      durTotal,
      conAudioOriginal,
      volumenOriginal,
      puntosTransicion,
      factorTiempo,
      outputPath,
      rutasAssets
    );
  } finally {
    // Limpieza de intermedios (mejor esfuerzo).
    for (const ruta of intermedios) {
      try {
        fs.rmSync(ruta, { force: true });
      } catch {
        // Ignorar: el directorio temporal se borra completo al final del job.
      }
    }
  }
}
