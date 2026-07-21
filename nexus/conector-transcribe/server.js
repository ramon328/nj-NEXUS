'use strict';
/**
 * conector-transcribe — Servidor local OpenAI-compatible de transcripcion (Whisper ONNX).
 *
 * Transcribe notas de voz (OGG/Opus de WhatsApp, WAV, etc.) a texto en español
 * SIN ninguna API externa ni key. Corre en CPU (onnxruntime-node) sin compilar nada.
 *
 * Endpoint OpenAI-compatible:
 *   POST /v1/audio/transcriptions   (multipart: file, model?, language?)  -> {"text":"..."}
 *   GET  /health                                                          -> {"status":"ok",...}
 *
 * Pipeline por request:
 *   archivo subido (temp) -> ffmpeg-static lo decodifica a WAV 16kHz mono PCM
 *   -> Whisper (cargado UNA vez al arrancar) -> {"text":"..."}
 *
 * Variables de entorno:
 *   PUERTO_TRANSCRIBE   (default 8083)
 *   MODELO_WHISPER      (default "Xenova/whisper-base")
 *   IDIOMA_WHISPER      (default "spanish")
 */

const express = require('express');
const multer = require('multer');
const os = require('os');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFile } = require('child_process');
const ffmpegPath = require('ffmpeg-static');

const PUERTO = parseInt(process.env.PUERTO_TRANSCRIBE || '8083', 10);
const MODELO = process.env.MODELO_WHISPER || 'Xenova/whisper-base';
const IDIOMA = process.env.IDIOMA_WHISPER || 'spanish';

// ---------------------------------------------------------------------------
// Estado del modelo (se carga una sola vez, asincronamente, al arrancar)
// ---------------------------------------------------------------------------
let transcriber = null;        // pipeline cargado
let cargandoModelo = null;     // Promise en curso de carga
let modeloListo = false;

function log(...args) {
  console.log(new Date().toISOString(), '[transcribe]', ...args);
}

async function cargarModelo() {
  if (modeloListo) return transcriber;
  if (cargandoModelo) return cargandoModelo;
  cargandoModelo = (async () => {
    const t0 = Date.now();
    log(`Cargando modelo Whisper "${MODELO}" (primera vez descarga ~75-250MB)...`);
    // import dinamico: @huggingface/transformers es ESM
    const { pipeline, env } = await import('@huggingface/transformers');
    env.allowLocalModels = false;          // siempre usa el modelo del hub/cache
    // El cache vive en node_modules/@huggingface/transformers/.cache por defecto.
    const p = await pipeline('automatic-speech-recognition', MODELO);
    transcriber = p;
    modeloListo = true;
    log(`Modelo listo en ${((Date.now() - t0) / 1000).toFixed(1)}s.`);
    return p;
  })();
  return cargandoModelo;
}

// ---------------------------------------------------------------------------
// ffmpeg: decodifica cualquier audio a WAV 16kHz mono PCM s16le
// ---------------------------------------------------------------------------
function aWav16k(rutaEntrada) {
  return new Promise((resolve, reject) => {
    const rutaSalida = path.join(
      os.tmpdir(),
      `transcribe-${crypto.randomBytes(6).toString('hex')}.wav`
    );
    const args = [
      '-y',
      '-i', rutaEntrada,
      '-ar', '16000',
      '-ac', '1',
      '-c:a', 'pcm_s16le',
      '-f', 'wav',
      rutaSalida,
    ];
    execFile(ffmpegPath, args, { timeout: 120000 }, (err, _stdout, stderr) => {
      if (err) {
        return reject(new Error(`ffmpeg fallo: ${err.message} :: ${String(stderr).slice(-400)}`));
      }
      resolve(rutaSalida);
    });
  });
}

// Lee un WAV PCM s16le mono y devuelve Float32Array normalizado [-1,1]
function wavAFloat32(rutaWav) {
  const buf = fs.readFileSync(rutaWav);
  // recorre los chunks RIFF buscando 'data'
  let off = 12; // salta 'RIFF' + size + 'WAVE'
  let dataOff = -1;
  let dataLen = 0;
  while (off + 8 <= buf.length) {
    const id = buf.toString('ascii', off, off + 4);
    const sz = buf.readUInt32LE(off + 4);
    if (id === 'data') {
      dataOff = off + 8;
      dataLen = Math.min(sz, buf.length - dataOff);
      break;
    }
    off += 8 + sz + (sz & 1); // chunks padean a tamaño par
  }
  if (dataOff < 0) throw new Error('WAV sin chunk data');
  const n = Math.floor(dataLen / 2);
  const f = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    f[i] = buf.readInt16LE(dataOff + i * 2) / 32768;
  }
  return f;
}

// ---------------------------------------------------------------------------
// Express
// ---------------------------------------------------------------------------
const app = express();
const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB, holgado para notas de voz
});

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    modelo: MODELO,
    modeloListo,
    idioma: IDIOMA,
    puerto: PUERTO,
  });
});

// Endpoint OpenAI-compatible
app.post('/v1/audio/transcriptions', upload.single('file'), async (req, res) => {
  const inicio = Date.now();
  const tmpFiles = [];
  if (req.file) tmpFiles.push(req.file.path);

  function limpiar() {
    for (const f of tmpFiles) {
      fs.unlink(f, () => {});
    }
  }

  try {
    if (!req.file) {
      limpiar();
      return res.status(400).json({ error: { message: 'falta el campo "file"' }, text: '' });
    }

    const idioma = (req.body && req.body.language) || IDIOMA;

    if (!modeloListo) {
      log('Request llego antes de que el modelo estuviera listo; cargando ahora...');
    }
    const t = await cargarModelo();

    // 1) decodificar a WAV 16kHz mono
    const tFf0 = Date.now();
    const wav = await aWav16k(req.file.path);
    tmpFiles.push(wav);
    const msFfmpeg = Date.now() - tFf0;

    // 2) WAV -> Float32
    const audio = wavAFloat32(wav);

    // 3) transcribir
    const tWh0 = Date.now();
    const out = await t(audio, { language: idioma, task: 'transcribe', chunk_length_s: 30, stride_length_s: 5 });
    const msWhisper = Date.now() - tWh0;

    const texto = ((out && out.text) || '').trim();
    limpiar();

    log(
      `OK file="${req.file.originalname || '?'}" ` +
      `ffmpeg=${msFfmpeg}ms whisper=${msWhisper}ms total=${Date.now() - inicio}ms ` +
      `chars=${texto.length}`
    );

    // formato OpenAI
    return res.json({ text: texto });
  } catch (err) {
    limpiar();
    log('ERROR:', err && err.message ? err.message : String(err));
    // devolvemos 500 con text vacio para que el caller no rompa
    return res.status(500).json({ error: { message: String(err && err.message || err) }, text: '' });
  }
});

// ---------------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------------
app.listen(PUERTO, '127.0.0.1', () => {
  log(`Escuchando en http://127.0.0.1:${PUERTO}  (modelo=${MODELO}, idioma=${IDIOMA})`);
  // Calienta el modelo de inmediato (no bloquea el listen)
  cargarModelo().catch((e) => log('Fallo precarga del modelo:', e && e.message));
});
