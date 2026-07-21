import { spawn, spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { resolveFfmpeg } from "./ffmpeg";
import type { SubtituloCue } from "./types";

// Transcripción de voz con whisper.cpp a nivel PALABRA: extrae el audio del
// video, lo pasa por el binario de whisper (whisper-cli / whisper-cpp /
// whisper) con salida JSON completa (-ojf) dividida por palabra (-sow) y
// devuelve cues [{texto, desde, hasta, palabras:[{desde,hasta,palabra}]}] en
// tiempo ORIGINAL del video. Si el binario o el modelo no están disponibles,
// transcribirVideo lanza un error claro para que el resto del pipeline pueda
// continuar sin subtítulos.

// ---------- Resolución del binario y modelo (con caché) ----------

interface WhisperResuelto {
  bin: string;
  modelo: string;
}

let whisperResuelto: WhisperResuelto | null | undefined;

function rutaComando(cmd: string): string | null {
  try {
    const res = spawnSync("which", [cmd]);
    if (res.status === 0) {
      const ruta = res.stdout?.toString().trim();
      if (ruta) return ruta;
    }
  } catch {
    // Ignorar: se prueba el siguiente candidato.
  }
  return null;
}

// Busca el binario de whisper.cpp (whisper-cli || whisper-cpp || whisper) y el
// modelo (WHISPER_MODEL o $HOME/.cache/whisper-models/ggml-base.bin). Devuelve
// null si falta cualquiera de los dos. El resultado se cachea (incl. el null).
export function resolveWhisper(): WhisperResuelto | null {
  if (whisperResuelto !== undefined) return whisperResuelto;

  const bin =
    rutaComando("whisper-cli") ??
    rutaComando("whisper-cpp") ??
    rutaComando("whisper");

  const modelo =
    process.env.WHISPER_MODEL ||
    path.join(os.homedir(), ".cache", "whisper-models", "ggml-base.bin");

  if (!bin || !fs.existsSync(modelo)) {
    whisperResuelto = null;
    return null;
  }

  whisperResuelto = { bin, modelo };
  return whisperResuelto;
}

// ---------- Ejecución de un proceso con timeout ----------

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
      reject(
        new Error(`No se pudo ejecutar ${path.basename(binario)}: ${err.message}`)
      );
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
        const ultimasLineas = stderr.trim().split("\n").slice(-20).join("\n");
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

// ---------- Parseo del JSON completo de whisper.cpp (nivel palabra) ----------

// Forma del JSON de whisper.cpp con -ojf (output-json-full):
//   {
//     "transcription": [
//       {
//         "offsets": { "from": ms, "to": ms },
//         "text": "  hola",
//         "tokens": [
//           { "text": "[_BEG_]", "offsets": {from,to}, "id": ... },
//           { "text": " hola",   "offsets": {from,to}, "id": ... },
//           ...
//         ]
//       }
//     ]
//   }
// Algunas versiones antiguas usan "segments" con "start"/"end" en segundos y
// sin tokens: en ese caso se devuelve el cue sin palabras[].
interface TokenWhisper {
  text?: string;
  offsets?: { from?: number; to?: number };
  id?: number;
}
interface SegmentoWhisper {
  offsets?: { from?: number; to?: number };
  text?: string;
  tokens?: TokenWhisper[];
}
interface SegmentoWhisperViejo {
  start?: number;
  end?: number;
  text?: string;
}

// Detecta tokens especiales de whisper que NO son texto real:
// [_BEG_], [_EOT_], [_SOT_], [_NOT_], [_PS_], [_TT_123], etc. Todos empiezan por
// "[_" (a veces terminan en "_]" y a veces en un número + "]", como [_TT_100]).
// Un token de texto real nunca empieza por "[_"; "[Música]" u otros [texto]
// normales empiezan por "[" + letra, así que SÍ se conservan.
function esTokenEspecial(texto: string): boolean {
  return /^\[_/.test(texto.trim());
}

// Construye la lista de palabras de un segmento a partir de sus tokens.
// whisper.cpp tokeniza a nivel sub-palabra: un token que NO empieza con espacio
// es continuación de la palabra anterior (ej. " Ha" + "bi" => "Habi"). Se
// agrupan esos sub-tokens en una sola palabra, tomando el "desde" del primer
// sub-token y el "hasta" del último. Descarta palabras con timestamps inválidos.
function palabrasDeTokens(
  tokens: TokenWhisper[]
): { desde: number; hasta: number; palabra: string }[] {
  const palabras: { desde: number; hasta: number; palabra: string }[] = [];

  for (const tk of tokens) {
    const crudo = tk.text ?? "";
    if (!crudo) continue;
    if (esTokenEspecial(crudo)) continue;

    const desde = (tk.offsets?.from ?? 0) / 1000;
    const hasta = (tk.offsets?.to ?? 0) / 1000;
    const empiezaPalabra = /^\s/.test(crudo);
    const fragmento = crudo.trim();
    if (!fragmento) continue; // token de solo-espacio: se ignora

    if (empiezaPalabra || palabras.length === 0) {
      // Nueva palabra.
      palabras.push({ desde, hasta, palabra: fragmento });
    } else {
      // Continuación de la palabra anterior (sub-token).
      const ultima = palabras[palabras.length - 1];
      ultima.palabra += fragmento;
      // Extender el fin de la palabra si este token termina más tarde.
      if (hasta > ultima.hasta) ultima.hasta = hasta;
    }
  }

  // Descartar palabras con timestamps inválidos (fin <= inicio o negativos).
  return palabras.filter((p) => p.hasta > p.desde && p.desde >= 0);
}

// Parsea el JSON de whisper a cues en tiempo ORIGINAL (segundos), con palabras
// cuando el JSON es -ojf. Filtra segmentos vacíos.
function parsearJsonWhisper(ruta: string): SubtituloCue[] {
  const crudo = JSON.parse(fs.readFileSync(ruta, "utf8")) as {
    transcription?: SegmentoWhisper[];
    segments?: SegmentoWhisperViejo[];
  };

  const cues: SubtituloCue[] = [];

  if (Array.isArray(crudo.transcription)) {
    for (const seg of crudo.transcription) {
      const texto = (seg.text ?? "").trim();
      if (!texto) continue;
      const desde = (seg.offsets?.from ?? 0) / 1000;
      const hasta = (seg.offsets?.to ?? 0) / 1000;
      if (hasta <= desde) continue;

      const cue: SubtituloCue = { texto, desde, hasta };
      // Palabras (karaoke) solo si el JSON trae tokens (-ojf).
      if (Array.isArray(seg.tokens)) {
        const palabras = palabrasDeTokens(seg.tokens);
        if (palabras.length) cue.palabras = palabras;
      }
      cues.push(cue);
    }
  } else if (Array.isArray(crudo.segments)) {
    // Compatibilidad con builds que exportan "segments" en segundos (sin tokens).
    for (const seg of crudo.segments) {
      const texto = (seg.text ?? "").trim();
      if (!texto) continue;
      const desde = seg.start ?? 0;
      const hasta = seg.end ?? 0;
      if (hasta > desde) cues.push({ texto, desde, hasta });
    }
  }

  return cues;
}

// ---------- Texto de transcripción legible para la IA ----------

// Construye un texto con marcas de tiempo a partir de los cues, pensado para
// pasárselo a Claude en el prompt y que CORTE por el habla. Ejemplo:
//   [0.0-2.3] ¡Habi! ¡Habi!
//   [2.3-5.1] Mira lo que hice hoy
export function construirTextoTranscripcion(cues: SubtituloCue[]): string {
  return cues
    .map((c) => {
      const texto = (c.texto ?? "").trim();
      if (!texto) return "";
      return `[${c.desde.toFixed(1)}-${c.hasta.toFixed(1)}] ${texto}`;
    })
    .filter(Boolean)
    .join("\n");
}

// ---------- Transcripción de un video ----------

const TIMEOUT_WHISPER_MS = 10 * 60 * 1000;

// Extrae el audio del video y lo transcribe con whisper.cpp a nivel palabra.
// Los cues quedan en tiempo ORIGINAL del video (segundos). Lanza si whisper no
// está disponible.
export async function transcribirVideo(
  rutaVideo: string,
  idioma = "es"
): Promise<SubtituloCue[]> {
  const whisper = resolveWhisper();
  if (!whisper) {
    throw new Error(
      "Transcripción no disponible: instala whisper.cpp y el modelo"
    );
  }

  const dirTmp = fs.mkdtempSync(path.join(os.tmpdir(), "transcribe-"));
  const rutaAudio = path.join(dirTmp, "audio.wav");
  const salidaSinExt = path.join(dirTmp, "transcripcion");
  const rutaJson = `${salidaSinExt}.json`;

  try {
    // 1. Extraer audio a WAV mono 16 kHz PCM (formato que espera whisper.cpp).
    await ejecutar(
      resolveFfmpeg(),
      [
        "-i",
        rutaVideo,
        "-vn",
        "-ar",
        "16000",
        "-ac",
        "1",
        "-c:a",
        "pcm_s16le",
        "-y",
        rutaAudio,
      ],
      5 * 60 * 1000
    );

    // 2. Correr whisper con salida JSON COMPLETA (nivel palabra):
    //    -m modelo, -f audio, -l idioma, -ojf (json full con tokens),
    //    -ml 32 (segmentos cortos), -sow (dividir por palabra), -of salida.
    const argsBase = (flagJson: string) => [
      "-m",
      whisper.modelo,
      "-f",
      rutaAudio,
      "-l",
      idioma,
      "-ml",
      "32",
      "-sow",
      flagJson,
      "-of",
      salidaSinExt,
    ];
    try {
      await ejecutar(whisper.bin, argsBase("-ojf"), TIMEOUT_WHISPER_MS);
    } catch (err) {
      // Si el JSON no aparece, reintentar con el flag largo --output-json-full.
      if (!fs.existsSync(rutaJson)) {
        await ejecutar(
          whisper.bin,
          argsBase("--output-json-full"),
          TIMEOUT_WHISPER_MS
        );
      } else {
        throw err;
      }
    }

    if (!fs.existsSync(rutaJson)) {
      throw new Error(
        "whisper terminó sin generar el JSON de la transcripción"
      );
    }

    // 3. Parsear el JSON a cues (con palabras) en tiempo original.
    return parsearJsonWhisper(rutaJson);
  } finally {
    fs.rmSync(dirTmp, { recursive: true, force: true });
  }
}
