"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from "react";
import type {
  EditJob,
  EstiloEdicion,
  Proyecto,
  ProyectoAsset,
  TipoAsset,
} from "@/lib/types";
import Spinner from "@/components/Spinner";
import ModalPublicar from "@/components/ModalPublicar";
import EditorTimeline from "@/components/EditorTimeline";
import { TarjetaEdicion } from "@/components/PanelEditarIA";
import { formatearDuracion, mensajeDeError } from "@/components/formato";

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

// Límite de subida: Supabase Storage (plan gratis) acepta hasta 50 MB por
// archivo; rechazamos desde 48 MB para dejar margen de seguridad.
// Los VIDEOS (de cualquier tamaño) y cualquier archivo de más de 45 MB van
// POR TROZOS al motor de render (disco local del mini), SIN comprimir,
// hasta un máximo de 800 MB por archivo.
const LIMITE_MB = 48;
const LIMITE_BYTES = LIMITE_MB * 1024 * 1024;
const LIMITE_VIDEO_MB = 800;
const LIMITE_VIDEO_BYTES = LIMITE_VIDEO_MB * 1024 * 1024;
// Umbral a partir del cual un archivo NO-video también va al motor por
// trozos (Supabase rechaza >50 MB; 45 MB deja margen de seguridad).
const UMBRAL_MINI_BYTES = 45 * 1024 * 1024;
// Tamaño de cada trozo de la subida al motor: 25 MB pasa holgado por el
// túnel gratuito de Cloudflare (que corta cuerpos de más de 100 MB).
const TROZO_BYTES = 25 * 1024 * 1024;

// Presets de estilo para "Crear video con IA". El valor viaja en el body del
// POST /edit; la ruta lo antepone a la instrucción como marcador "[[estilo:X]]"
// y ENGINE-B lo usa al generar el plan. "auto" es el default (la IA decide).
const ESTILOS_EDICION: ReadonlyArray<{
  valor: EstiloEdicion;
  etiqueta: string;
  icono: string;
  descripcion: string;
}> = [
  {
    valor: "auto",
    etiqueta: "Automático",
    icono: "✨",
    descripcion: "La IA elige el mejor estilo según el material.",
  },
  {
    valor: "autos",
    etiqueta: "Autos",
    icono: "🚗",
    descripcion: "Enérgico y dinámico, pensado para videos de autos.",
  },
  {
    valor: "punchy",
    etiqueta: "Punchy",
    icono: "⚡",
    descripcion: "Ritmo rápido, cortes secos y textos que enganchan.",
  },
  {
    valor: "cine",
    etiqueta: "Cine",
    icono: "🎬",
    descripcion: "Tomas más largas, transiciones suaves, tono cinematográfico.",
  },
];

// ¿El archivo es un video? (por MIME o extensión conocida)
function esVideo(archivo: File): boolean {
  if (archivo.type.startsWith("video/")) return true;
  const ext = archivo.name.toLowerCase().split(".").pop() ?? "";
  return ["mp4", "mov", "m4v", "webm", "avi", "mkv"].includes(ext);
}

// Archivo rechazado en una subida, con el motivo visible para el usuario.
interface Rechazado {
  nombre: string;
  motivo: string;
}

interface AvisoSubida {
  tipo: "info" | "ok" | "error";
  texto: string;
}

// ---------------------------------------------------------------------------
// Subida directa navegador → Supabase Storage
// ---------------------------------------------------------------------------
//
// Flujo nuevo (evita el límite de ~4.5 MB por petición de Vercel):
//   1) POST /assets/firmar     → URLs firmadas de subida (una por archivo).
//   2) PUT del archivo DIRECTO a Supabase Storage con esa URL (es el mismo
//      PUT que hace uploadToSignedUrl de supabase-js).
//   3) POST /assets/registrar  → el servidor comprime los videos grandes,
//      saca metadatos y crea las filas; responde { assets, rechazados }.
// Si /assets/firmar responde 404 (código viejo desplegado) se cae al flujo
// clásico con FormData.

interface FirmaSubida {
  nombre: string;
  ruta: string;
  token: string;
  url: string;
}

interface ResultadoSubida {
  assets: ProyectoAsset[];
  rechazados: Rechazado[];
}

// Flujo clásico de respaldo: FormData a POST /api/projects/[id]/assets
// (la compresión de videos grandes ocurre en el servidor, igual que antes).
async function subidaClasica(
  projectId: string,
  archivos: File[],
  tipo?: "musica" | "sticker"
): Promise<ResultadoSubida> {
  const formData = new FormData();
  for (const archivo of archivos) formData.append("files", archivo);
  if (tipo) formData.append("tipo", tipo);

  const res = await fetch(
    `/api/projects/${encodeURIComponent(projectId)}/assets`,
    { method: "POST", body: formData }
  );
  const data = await res.json().catch(() => null);
  if (!res.ok && !Array.isArray(data?.rechazados)) {
    throw new Error(data?.error ?? "No se pudieron subir los archivos");
  }
  return {
    assets: (data?.assets ?? []) as ProyectoAsset[],
    rechazados: (data?.rechazados ?? []) as Rechazado[],
  };
}

// Flujo directo. Devuelve null si /assets/firmar no existe (404): el
// llamador debe caer al flujo clásico.
async function subidaDirecta(
  projectId: string,
  archivos: File[],
  tipo: "musica" | "sticker" | undefined,
  onProgreso: (texto: string) => void
): Promise<ResultadoSubida | null> {
  // 1) Pedir una URL firmada por archivo.
  const resFirmar = await fetch(
    `/api/projects/${encodeURIComponent(projectId)}/assets/firmar`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        archivos: archivos.map((a) => ({ nombre: a.name, tipo })),
      }),
    }
  );
  if (resFirmar.status === 404) return null; // despliegue viejo sin /firmar

  const dataFirmar = await resFirmar.json().catch(() => null);
  if (!resFirmar.ok) {
    throw new Error(
      dataFirmar?.error ?? "No se pudieron firmar las subidas directas"
    );
  }
  const firmas = (dataFirmar?.firmas ?? []) as FirmaSubida[];
  if (!Array.isArray(firmas) || firmas.length !== archivos.length) {
    throw new Error(
      "El servidor no devolvió una firma de subida por cada archivo"
    );
  }

  // 2) Subir cada archivo DIRECTO a Supabase Storage con fetch PUT a la
  //    signedUrl (progreso aproximado: "archivo x de y").
  const rechazados: Rechazado[] = [];
  const subidas: { nombre: string; ruta: string; tipo?: string }[] = [];
  for (let i = 0; i < archivos.length; i++) {
    const archivo = archivos[i];
    const firma = firmas[i];
    onProgreso(
      `Subiendo archivo ${i + 1} de ${archivos.length} (${archivo.name}, ${megas(archivo.size)} MB)…`
    );
    try {
      const resPut = await fetch(firma.url, {
        method: "PUT",
        headers: {
          "content-type": archivo.type || "application/octet-stream",
          "x-upsert": "false",
        },
        body: archivo,
      });
      if (!resPut.ok) {
        const texto = await resPut.text().catch(() => "");
        throw new Error(
          `Storage respondió ${resPut.status}${texto ? `: ${texto.slice(0, 200)}` : ""}`
        );
      }
      subidas.push({ nombre: archivo.name, ruta: firma.ruta, tipo });
    } catch (e) {
      rechazados.push({
        nombre: archivo.name,
        motivo: mensajeDeError(e, "No se pudo subir el archivo a Storage"),
      });
    }
  }

  if (subidas.length === 0) return { assets: [], rechazados };

  // 3) Registrar las subidas: el servidor mueve/comprime y crea las filas.
  const hayVideoGrande = archivos.some(
    (a) => tipo === undefined && esVideo(a) && a.size > LIMITE_BYTES
  );
  onProgreso(
    hayVideoGrande
      ? "Archivos subidos: comprimiendo y registrando… (los videos grandes pueden tardar varios minutos)"
      : "Archivos subidos: registrando…"
  );
  const resReg = await fetch(
    `/api/projects/${encodeURIComponent(projectId)}/assets/registrar`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subidas }),
    }
  );
  const dataReg = await resReg.json().catch(() => null);
  // Con todos los archivos rechazados el servidor responde 400 pero con la
  // misma forma { assets, rechazados }: se aprovecha para mostrar motivos.
  if (!resReg.ok && !Array.isArray(dataReg?.rechazados)) {
    throw new Error(
      dataReg?.error ?? "No se pudieron registrar los archivos subidos"
    );
  }
  return {
    assets: (dataReg?.assets ?? []) as ProyectoAsset[],
    rechazados: [
      ...rechazados,
      ...((dataReg?.rechazados ?? []) as Rechazado[]),
    ],
  };
}

// ---------------------------------------------------------------------------
// Subida POR TROZOS al motor de render (disco local del mini)
// ---------------------------------------------------------------------------
//
// Supabase Storage rechaza archivos de más de 50 MB (413) y el túnel gratuito
// de Cloudflare corta cuerpos de más de 100 MB, así que los videos (de
// cualquier tamaño) y los archivos grandes se envían en trozos de 25 MB al
// propio motor, que los guarda en su disco local SIN comprimir:
//   1) POST /assets/token-mini → { url, token } (url vacía = mismo origen).
//   2) Por archivo: trozos con File.slice() → POST <url>/api/media/subir con
//      FormData { projectId, uploadId, indice, total, nombre, chunk } y el
//      header x-media-token. Progreso REAL vía xhr.upload.onprogress.
//   3) La respuesta del ÚLTIMO trozo (201) trae { asset } ya registrado.

interface AccesoMini {
  url: string; // base absoluta del motor ("" = mismo origen)
  token: string;
}

// Pide acceso de subida al motor. Devuelve null si la ruta no existe
// (404: despliegue viejo) para que el llamador caiga al flujo de Supabase.
async function pedirTokenMini(projectId: string): Promise<AccesoMini | null> {
  const res = await fetch(
    `/api/projects/${encodeURIComponent(projectId)}/assets/token-mini`,
    { method: "POST" }
  );
  if (res.status === 404) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      data?.error ?? "No se pudo obtener acceso al motor de render"
    );
  }
  if (typeof data?.token !== "string" || data.token === "") {
    throw new Error("El servidor no devolvió el token de subida al motor");
  }
  return {
    url: typeof data?.url === "string" ? data.url : "",
    token: data.token,
  };
}

interface RespuestaTrozo {
  status: number;
  data: { asset?: ProyectoAsset; error?: string } | null;
}

// Envía UN trozo con XMLHttpRequest (fetch todavía no expone el progreso de
// subida); onBytes recibe los bytes YA enviados de ESTE trozo.
function subirTrozoXhr(
  urlDestino: string,
  token: string,
  form: FormData,
  onBytes: (bytesDelTrozo: number) => void
): Promise<RespuestaTrozo> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", urlDestino);
    xhr.responseType = "json";
    xhr.setRequestHeader("x-media-token", token);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onBytes(e.loaded);
    };
    xhr.onload = () =>
      resolve({
        status: xhr.status,
        data: (xhr.response ?? null) as RespuestaTrozo["data"],
      });
    xhr.onerror = () => reject(new Error("Fallo de red al subir un trozo"));
    xhr.onabort = () => reject(new Error("La subida del trozo se canceló"));
    xhr.send(form);
  });
}

// Sube UN archivo en trozos secuenciales de 25 MB; cada trozo se reintenta
// hasta 2 veces ante fallo de red (o 5xx del túnel). Devuelve el asset que
// registra el motor al recibir el último trozo.
async function subirArchivoEnTrozos(
  projectId: string,
  archivo: File,
  urlSubir: string,
  token: string,
  onBytesSubidos: (bytesTotales: number) => void
): Promise<ProyectoAsset> {
  const uploadId = crypto.randomUUID();
  const total = Math.max(1, Math.ceil(archivo.size / TROZO_BYTES));
  let acumulado = 0; // bytes de trozos ya confirmados por el motor

  for (let indice = 0; indice < total; indice++) {
    const trozo = archivo.slice(
      indice * TROZO_BYTES,
      Math.min(archivo.size, (indice + 1) * TROZO_BYTES)
    );
    const form = new FormData();
    form.append("projectId", projectId);
    form.append("uploadId", uploadId);
    form.append("indice", String(indice));
    form.append("total", String(total));
    form.append("nombre", archivo.name);
    form.append("chunk", trozo, archivo.name);

    let respuesta: RespuestaTrozo | null = null;
    let ultimoError: unknown = null;
    for (let intento = 0; intento <= 2 && respuesta === null; intento++) {
      if (intento > 0) {
        // Pequeña espera antes de reintentar (cortes breves de red/túnel).
        await new Promise((r) => setTimeout(r, 1000 * intento));
      }
      try {
        const r = await subirTrozoXhr(urlSubir, token, form, (enviados) => {
          // e.loaded incluye los bytes del sobre multipart: se acota al
          // tamaño real del trozo para no pasarse del 100 %.
          onBytesSubidos(acumulado + Math.min(enviados, trozo.size));
        });
        if (r.status >= 500 && intento < 2) {
          ultimoError = new Error(
            r.data?.error ??
              `El motor respondió ${r.status} al subir el trozo ${indice + 1}/${total}`
          );
          continue;
        }
        respuesta = r;
      } catch (e) {
        ultimoError = e;
      }
    }
    if (respuesta === null) {
      throw ultimoError instanceof Error
        ? ultimoError
        : new Error("Fallo de red repetido al subir un trozo");
    }
    if (respuesta.status < 200 || respuesta.status >= 300) {
      throw new Error(
        respuesta.data?.error ??
          `El motor respondió ${respuesta.status} al subir el trozo ${indice + 1}/${total}`
      );
    }
    acumulado += trozo.size;
    onBytesSubidos(acumulado);

    // El último trozo (201) trae el asset ya registrado.
    if (indice === total - 1) {
      const asset = respuesta.data?.asset;
      if (!asset) {
        throw new Error(
          "El motor no devolvió el archivo registrado al terminar la subida"
        );
      }
      return asset;
    }
  }
  // Inalcanzable: el bucle siempre retorna o lanza en el último trozo.
  throw new Error("La subida por trozos terminó sin respuesta del motor");
}

// Sube VARIOS archivos al motor por trozos, con progreso real por archivo
// ("Subiendo <nombre>: 37% (120/325 MB)"). Los fallos por archivo van a
// `rechazados` con su motivo; los demás archivos siguen subiéndose.
async function subidaMini(
  projectId: string,
  archivos: File[],
  acceso: AccesoMini,
  onProgreso: (texto: string) => void
): Promise<ResultadoSubida> {
  const assets: ProyectoAsset[] = [];
  const rechazados: Rechazado[] = [];
  const urlSubir = `${acceso.url || ""}/api/media/subir`;

  for (let i = 0; i < archivos.length; i++) {
    const archivo = archivos[i];
    const etiqueta =
      archivos.length > 1 ? ` — archivo ${i + 1} de ${archivos.length}` : "";
    try {
      const asset = await subirArchivoEnTrozos(
        projectId,
        archivo,
        urlSubir,
        acceso.token,
        (bytesSubidos) => {
          const pct = Math.min(
            100,
            Math.round((bytesSubidos / Math.max(1, archivo.size)) * 100)
          );
          onProgreso(
            `Subiendo ${archivo.name}: ${pct}% (${megasEnteros(bytesSubidos)}/${megasEnteros(archivo.size)} MB)${etiqueta}`
          );
        }
      );
      assets.push(asset);
    } catch (e) {
      rechazados.push({
        nombre: archivo.name,
        motivo: mensajeDeError(
          e,
          "No se pudo subir el archivo al motor de render"
        ),
      });
    }
  }
  return { assets, rechazados };
}

// Orden y presentación de los grupos de assets.
const GRUPOS: { tipo: TipoAsset; icono: string; titulo: string }[] = [
  { tipo: "video", icono: "🎬", titulo: "Videos" },
  { tipo: "foto", icono: "🖼️", titulo: "Fotos" },
  { tipo: "musica", icono: "🎵", titulo: "Música" },
  { tipo: "audio", icono: "🎧", titulo: "Audios" },
  { tipo: "sticker", icono: "✨", titulo: "Stickers" },
];

function megas(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(1);
}

function megasEnteros(bytes: number): number {
  return Math.round(bytes / (1024 * 1024));
}

// Resuelve la src de <video>/<img> a partir de asset.public_url:
// - ABSOLUTA (https://…): tal cual. Es el caso de Supabase Storage y de los
//   assets "mini" cuando el motor define MEDIA_PUBLIC_URL (túnel). En el
//   front de Vercel los assets mini SIEMPRE llegan absolutos por eso mismo.
// - RELATIVA (/api/media/archivo/…): tal cual, es el mismo origen. Correcto
//   en modo local y cuando la página se sirve desde el propio mini; nunca
//   llega relativa al front de Vercel (ver punto anterior).
function srcDeAsset(asset: ProyectoAsset): string {
  return asset.public_url;
}

// ---------------------------------------------------------------------------
// Vista de un proyecto A PANTALLA COMPLETA: subida de multimedia, grid de
// assets por tipo y edición de video con IA usando todo el material.
// ---------------------------------------------------------------------------

export default function VistaProyecto({
  proyecto,
  onCerrar,
}: {
  proyecto: Proyecto;
  onCerrar: () => void;
}) {
  // --- Assets del proyecto -------------------------------------------------
  // null = todavía no se cargó la lista por primera vez.
  const [assets, setAssets] = useState<ProyectoAsset[] | null>(null);
  const [errorAssets, setErrorAssets] = useState<string | null>(null);
  const [borrandoAssetId, setBorrandoAssetId] = useState<string | null>(null);

  // --- Subida de archivos --------------------------------------------------
  const [subiendo, setSubiendo] = useState(false);
  const [avisoSubida, setAvisoSubida] = useState<AvisoSubida | null>(null);
  const [rechazados, setRechazados] = useState<Rechazado[]>([]);
  const [arrastrando, setArrastrando] = useState(false);
  const inputMediosRef = useRef<HTMLInputElement | null>(null);
  const inputMusicaRef = useRef<HTMLInputElement | null>(null);
  const inputStickersRef = useRef<HTMLInputElement | null>(null);

  // --- Ediciones con IA ----------------------------------------------------
  const [instruccion, setInstruccion] = useState("");
  // Estilo de edición elegido en la UI ("auto" = la IA decide, por defecto).
  const [estilo, setEstilo] = useState<EstiloEdicion>("auto");
  const [enviandoEdicion, setEnviandoEdicion] = useState(false);
  const [errorEdicion, setErrorEdicion] = useState<string | null>(null);
  const [edits, setEdits] = useState<EditJob[] | null>(null);
  const [errorEdits, setErrorEdits] = useState<string | null>(null);
  const [borrandoEditId, setBorrandoEditId] = useState<string | null>(null);
  const [editEnEditor, setEditEnEditor] = useState<EditJob | null>(null);
  const [editParaPublicar, setEditParaPublicar] = useState<EditJob | null>(
    null
  );
  const [resultadoPublicacion, setResultadoPublicacion] = useState<{
    ok: boolean;
    mensaje: string;
  } | null>(null);

  // Carga los assets del proyecto (GET /api/projects/[id]).
  const cargarAssets = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(proyecto.id)}`
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          data?.error ?? "No se pudieron cargar los archivos del proyecto"
        );
      }
      setAssets((data?.assets ?? []) as ProyectoAsset[]);
      setErrorAssets(null);
    } catch (e) {
      setErrorAssets(
        mensajeDeError(e, "Error inesperado al cargar los archivos")
      );
      setAssets((prev) => prev ?? []);
    }
  }, [proyecto.id]);

  // Carga las ediciones del proyecto (GET /api/edits?projectId=...).
  const cargarEdiciones = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/edits?projectId=${encodeURIComponent(proyecto.id)}`
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "No se pudieron cargar las ediciones");
      }
      setEdits((data?.edits ?? []) as EditJob[]);
      setErrorEdits(null);
    } catch (e) {
      setErrorEdits(
        mensajeDeError(e, "Error inesperado al cargar las ediciones")
      );
      setEdits((prev) => prev ?? []);
    }
  }, [proyecto.id]);

  // Carga inicial (los setState ocurren tras el await del fetch).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch inicial
    void cargarAssets();
    void cargarEdiciones();
  }, [cargarAssets, cargarEdiciones]);

  const hayProcesando = (edits ?? []).some((e) => e.status === "procesando");

  // Sondeo cada 5 segundos MIENTRAS exista alguna edición procesando.
  useEffect(() => {
    if (!hayProcesando) return;
    const id = window.setInterval(() => {
      void cargarEdiciones();
    }, 5000);
    return () => window.clearInterval(id);
  }, [hayProcesando, cargarEdiciones]);

  // -------------------------------------------------------------------------
  // Subida de archivos, con DOS vías según el archivo:
  //  - videos (cualquier tamaño) y archivos >45 MB → POR TROZOS al motor de
  //    render (disco local, sin comprimir), con progreso real;
  //  - el resto → directa a Supabase Storage (firmar → PUT → registrar) con
  //    respaldo en el flujo clásico de FormData si /firmar no existe.
  // -------------------------------------------------------------------------

  const subirArchivos = useCallback(
    async (archivos: File[], tipo?: "musica" | "sticker") => {
      if (archivos.length === 0 || subiendo) return;

      // Filtrado y ENRUTADO local ANTES de subir, con motivo claro:
      //  - nada puede superar los 800 MB (se rechaza);
      //  - videos (cualquier tamaño) y archivos >45 MB → motor por trozos
      //    (quedan en su disco local SIN comprimir);
      //  - el resto (fotos, música, stickers pequeños) → Supabase Storage.
      const nuevosRechazos: Rechazado[] = [];
      const paraMini: File[] = [];
      const paraSupabase: File[] = [];
      for (const archivo of archivos) {
        const video = esVideo(archivo) && tipo === undefined;
        if (archivo.size > LIMITE_VIDEO_BYTES) {
          nuevosRechazos.push({
            nombre: archivo.name,
            motivo: `Pesa ${megas(archivo.size)} MB y el máximo es ${LIMITE_VIDEO_MB} MB. Recórtalo o divídelo.`,
          });
        } else if (video || archivo.size > UMBRAL_MINI_BYTES) {
          paraMini.push(archivo);
        } else {
          paraSupabase.push(archivo);
        }
      }
      setRechazados(nuevosRechazos);

      const totalValidos = paraMini.length + paraSupabase.length;
      if (totalValidos === 0) {
        setAvisoSubida({
          tipo: "error",
          texto: "Ningún archivo se pudo subir: revisa los rechazados.",
        });
        return;
      }

      setSubiendo(true);
      setAvisoSubida({
        tipo: "info",
        texto: `Subiendo ${totalValidos} ${
          totalValidos === 1 ? "archivo" : "archivos"
        }…`,
      });
      try {
        const onProgreso = (texto: string) =>
          setAvisoSubida({ tipo: "info", texto });

        const assetsSubidos: ProyectoAsset[] = [];
        const rechazosServidor: Rechazado[] = [];
        let pendientesSupabase = paraSupabase;

        // 1) Flujo MINI: videos y archivos grandes van POR TROZOS al motor
        //    de render y quedan listos sin compresión. Si el despliegue aún
        //    no tiene /token-mini (404), esos archivos vuelven al flujo
        //    firmado de Supabase de siempre (que sí comprime los videos).
        if (paraMini.length > 0) {
          const acceso = await pedirTokenMini(proyecto.id);
          if (acceso === null) {
            console.warn(
              "token-mini no existe (despliegue viejo): los videos/archivos grandes vuelven al flujo firmado de Supabase con compresión"
            );
            pendientesSupabase = [...pendientesSupabase, ...paraMini];
          } else {
            const resultadoMini = await subidaMini(
              proyecto.id,
              paraMini,
              acceso,
              onProgreso
            );
            assetsSubidos.push(...resultadoMini.assets);
            rechazosServidor.push(...resultadoMini.rechazados);
          }
        }

        // 2) Flujo Supabase (firmar → PUT → registrar) para el resto, con
        //    respaldo clásico de FormData si /firmar tampoco existe. SOLO en
        //    esta vía el servidor comprime los videos grandes.
        if (pendientesSupabase.length > 0) {
          if (
            pendientesSupabase.some(
              (a) =>
                tipo === undefined && esVideo(a) && a.size > LIMITE_BYTES
            )
          ) {
            onProgreso(
              "Hay videos grandes en la vía Supabase: se subirán y comprimirán automáticamente — puede tardar varios minutos."
            );
          }
          let resultado = await subidaDirecta(
            proyecto.id,
            pendientesSupabase,
            tipo,
            onProgreso
          );
          if (resultado === null) {
            onProgreso(
              `Subiendo ${pendientesSupabase.length} ${
                pendientesSupabase.length === 1 ? "archivo" : "archivos"
              } (flujo clásico)…`
            );
            resultado = await subidaClasica(
              proyecto.id,
              pendientesSupabase,
              tipo
            );
          }
          assetsSubidos.push(...resultado.assets);
          rechazosServidor.push(...resultado.rechazados);
        }

        // El servidor también puede rechazar archivos (tipo no soportado,
        // tamaño, etc.): se suman a la lista visible.
        if (rechazosServidor.length > 0) {
          setRechazados((prev) => [...prev, ...rechazosServidor]);
        }

        // Los assets nuevos (incluido el { asset } del último trozo de cada
        // subida mini) entran a la lista local de inmediato; la recarga de
        // abajo deja todo consistente con el servidor.
        const cantidad = assetsSubidos.length;
        if (cantidad > 0) {
          setAssets((prev) => [...assetsSubidos, ...(prev ?? [])]);
        }
        setAvisoSubida({
          tipo: cantidad > 0 ? "ok" : "error",
          texto:
            cantidad > 0
              ? cantidad === 1
                ? "Se subió 1 archivo correctamente."
                : `Se subieron ${cantidad} archivos correctamente.`
              : "La subida terminó pero no se guardó ningún archivo.",
        });

        // Recarga la lista completa para quedar consistente con el servidor.
        await cargarAssets();
      } catch (e) {
        setAvisoSubida({
          tipo: "error",
          texto: mensajeDeError(e, "Error inesperado al subir los archivos"),
        });
      } finally {
        setSubiendo(false);
      }
    },
    [proyecto.id, subiendo, cargarAssets]
  );

  // Lee los archivos de un <input type="file"> y lanza la subida.
  function alElegirArchivos(
    e: React.ChangeEvent<HTMLInputElement>,
    tipo?: "musica" | "sticker"
  ) {
    const archivos = Array.from(e.target.files ?? []);
    // Permite volver a elegir los mismos archivos más adelante.
    e.target.value = "";
    void subirArchivos(archivos, tipo);
  }

  // Drag & drop sobre la zona de subida (el tipo se infiere en el servidor).
  function alSoltar(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setArrastrando(false);
    const archivos = Array.from(e.dataTransfer?.files ?? []);
    void subirArchivos(archivos);
  }

  // -------------------------------------------------------------------------
  // Borrar un asset (DELETE /api/assets/[id])
  // -------------------------------------------------------------------------

  async function borrarAsset(asset: ProyectoAsset) {
    if (borrandoAssetId) return;
    const confirmar = window.confirm(
      `¿Borrar "${asset.nombre}" del proyecto? No se puede deshacer.`
    );
    if (!confirmar) return;
    setBorrandoAssetId(asset.id);
    try {
      const res = await fetch(`/api/assets/${encodeURIComponent(asset.id)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "No se pudo borrar el archivo");
      }
      setAssets((prev) => (prev ?? []).filter((a) => a.id !== asset.id));
    } catch (e) {
      setAvisoSubida({
        tipo: "error",
        texto: mensajeDeError(e, "Error inesperado al borrar el archivo"),
      });
    } finally {
      setBorrandoAssetId(null);
    }
  }

  // -------------------------------------------------------------------------
  // Crear video con IA (POST /api/projects/[id]/edit → 202)
  // -------------------------------------------------------------------------

  async function crearVideoConIA() {
    setEnviandoEdicion(true);
    setErrorEdicion(null);
    try {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(proyecto.id)}/edit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instruccion: instruccion.trim() || undefined,
            estilo,
          }),
        }
      );
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(
          data?.error ?? "No se pudo iniciar la edición del proyecto"
        );
      }
      const nuevo = data?.edit as EditJob | undefined;
      if (nuevo) {
        // Se agrega de inmediato; el sondeo lo mantendrá actualizado.
        setEdits((prev) => [nuevo, ...(prev ?? [])]);
      } else {
        void cargarEdiciones();
      }
    } catch (e) {
      setErrorEdicion(
        mensajeDeError(e, "Error inesperado al iniciar la edición")
      );
    } finally {
      setEnviandoEdicion(false);
    }
  }

  // Borra una edición del proyecto (DELETE /api/edits/[id]).
  async function borrarEdicion(edit: EditJob) {
    if (borrandoEditId) return;
    const confirmar = window.confirm(
      "¿Borrar esta edición? Se eliminará el video renderizado. No se puede deshacer."
    );
    if (!confirmar) return;
    setBorrandoEditId(edit.id);
    setErrorEdicion(null);
    try {
      const res = await fetch(`/api/edits/${encodeURIComponent(edit.id)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error ?? "No se pudo borrar la edición");
      }
      setEdits((prev) => (prev ?? []).filter((e) => e.id !== edit.id));
      setEditEnEditor((abierto) => (abierto?.id === edit.id ? null : abierto));
    } catch (e) {
      setErrorEdicion(
        mensajeDeError(e, "Error inesperado al borrar la edición")
      );
    } finally {
      setBorrandoEditId(null);
    }
  }

  // El editor visual re-renderizó: sincroniza la lista local.
  function alRerenderizar(editActualizado: EditJob) {
    setEdits((prev) =>
      (prev ?? []).map((e) => (e.id === editActualizado.id ? editActualizado : e))
    );
    setEditEnEditor((abierto) =>
      abierto?.id === editActualizado.id ? editActualizado : abierto
    );
  }

  // -------------------------------------------------------------------------
  // Derivados para el render
  // -------------------------------------------------------------------------

  // Assets agrupados por tipo, respetando el orden de GRUPOS.
  const grupos = useMemo(() => {
    const lista = assets ?? [];
    return GRUPOS.map((g) => ({
      ...g,
      items: lista.filter((a) => a.tipo === g.tipo),
    })).filter((g) => g.items.length > 0);
  }, [assets]);

  // Nombres de assets para los bloques de la pista Video del editor.
  const assetsParaEditor = useMemo(
    () =>
      (assets ?? []).map((a) => ({ id: a.id, nombre: a.nombre, tipo: a.tipo })),
    [assets]
  );

  const claseCampo =
    "w-full rounded-xl border border-borde bg-background/60 px-3 py-2 text-sm text-foreground placeholder:text-tenue/60 focus:border-acento focus:outline-none focus:ring-1 focus:ring-acento";

  return (
    <div
      className="fixed inset-0 z-40 flex h-full w-full flex-col overflow-hidden bg-background text-foreground"
      role="dialog"
      aria-modal="true"
      aria-label={`Proyecto ${proyecto.nombre}`}
    >
      {/* Cabecera de la vista */}
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-borde bg-surface/80 px-6 py-4 backdrop-blur-md">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-acento to-acento-2 text-lg shadow-lg shadow-acento/30"
          >
            📁
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold leading-tight text-foreground">
              {proyecto.nombre}
            </h2>
            {proyecto.descripcion && (
              <p className="truncate text-xs text-tenue">
                {proyecto.descripcion}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={onCerrar}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-borde px-3 py-2 text-sm font-medium text-tenue transition-colors hover:bg-surface-2 hover:text-foreground"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
          Cerrar
        </button>
      </header>

      {/* Cuerpo con scroll propio */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-6">
          {/* ------------------------------------------------------------- */}
          {/* Zona de subida                                                */}
          {/* ------------------------------------------------------------- */}
          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-acento-2">
              Subir multimedia
            </h3>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                if (!arrastrando) setArrastrando(true);
              }}
              onDragLeave={() => setArrastrando(false)}
              onDrop={alSoltar}
              className={`flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors ${
                arrastrando
                  ? "border-acento bg-acento/10"
                  : "border-borde bg-surface/40"
              }`}
            >
              <p className="text-sm text-foreground">
                Arrastra y suelta archivos aquí (el tipo se detecta solo) o
                elige qué subir:
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => inputMediosRef.current?.click()}
                  disabled={subiendo}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-acento/50 bg-acento/10 px-4 py-2 text-sm font-medium text-violet-200 transition-colors hover:bg-acento/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span aria-hidden="true">🎬</span> Videos y fotos
                </button>
                <button
                  type="button"
                  onClick={() => inputMusicaRef.current?.click()}
                  disabled={subiendo}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-acento/50 bg-acento/10 px-4 py-2 text-sm font-medium text-violet-200 transition-colors hover:bg-acento/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span aria-hidden="true">🎵</span> Música
                </button>
                <button
                  type="button"
                  onClick={() => inputStickersRef.current?.click()}
                  disabled={subiendo}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-acento/50 bg-acento/10 px-4 py-2 text-sm font-medium text-violet-200 transition-colors hover:bg-acento/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span aria-hidden="true">✨</span> Stickers
                </button>
              </div>
              <p className="text-[11px] text-tenue">
                Hasta {LIMITE_VIDEO_MB} MB por archivo · los videos van
                directo al motor de render, sin comprimir
              </p>

              {/* Inputs ocultos por tipo */}
              <input
                ref={inputMediosRef}
                type="file"
                multiple
                accept="video/*,image/*"
                className="hidden"
                onChange={(e) => alElegirArchivos(e)}
              />
              <input
                ref={inputMusicaRef}
                type="file"
                multiple
                accept="audio/*"
                className="hidden"
                onChange={(e) => alElegirArchivos(e, "musica")}
              />
              <input
                ref={inputStickersRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => alElegirArchivos(e, "sticker")}
              />
            </div>

            {/* Estado de la subida por lote */}
            {avisoSubida && (
              <div
                className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm ${
                  avisoSubida.tipo === "error"
                    ? "border-red-500/40 bg-red-500/10 text-red-300"
                    : avisoSubida.tipo === "ok"
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                      : "border-amber-500/40 bg-amber-500/10 text-amber-200"
                }`}
              >
                {subiendo && <Spinner className="mt-0.5 h-4 w-4 shrink-0" />}
                <p>{avisoSubida.texto}</p>
              </div>
            )}

            {/* Archivos rechazados con su motivo */}
            {rechazados.length > 0 && (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                <p className="font-medium">
                  {rechazados.length}{" "}
                  {rechazados.length === 1
                    ? "archivo rechazado"
                    : "archivos rechazados"}
                  :
                </p>
                <ul className="mt-1.5 flex flex-col gap-1 text-xs">
                  {rechazados.map((r, i) => (
                    <li key={`${r.nombre}-${i}`}>
                      <span className="font-medium">{r.nombre}</span> —{" "}
                      {r.motivo}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* ------------------------------------------------------------- */}
          {/* Grid de assets por tipo                                       */}
          {/* ------------------------------------------------------------- */}
          <section className="flex flex-col gap-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-acento-2">
              Archivos del proyecto
            </h3>

            {errorAssets && (
              <div className="flex items-center justify-between gap-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                <span>{errorAssets}</span>
                <button
                  type="button"
                  onClick={() => void cargarAssets()}
                  className="shrink-0 rounded-lg border border-red-500/40 px-3 py-1 text-xs font-medium transition-colors hover:bg-red-500/20"
                >
                  Reintentar
                </button>
              </div>
            )}

            {assets === null ? (
              <div className="flex items-center gap-2 text-sm text-tenue">
                <Spinner /> Cargando archivos...
              </div>
            ) : grupos.length === 0 ? (
              <p className="text-sm text-tenue">
                Todavía no hay archivos. Sube videos, fotos, música o stickers
                con la zona de arriba.
              </p>
            ) : (
              grupos.map((grupo) => (
                <div key={grupo.tipo} className="flex flex-col gap-2">
                  <h4 className="text-sm font-medium text-foreground">
                    <span aria-hidden="true">{grupo.icono}</span> {grupo.titulo}{" "}
                    <span className="text-xs text-tenue">
                      ({grupo.items.length})
                    </span>
                  </h4>

                  {grupo.tipo === "musica" || grupo.tipo === "audio" ? (
                    // Música y audios: tarjetas con nombre y duración.
                    <ul className="flex flex-col gap-2">
                      {grupo.items.map((asset) => (
                        <li
                          key={asset.id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-borde bg-surface-2/40 px-3 py-2"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <span aria-hidden="true">{grupo.icono}</span>
                            <span
                              className="truncate text-sm text-foreground"
                              title={asset.nombre}
                            >
                              {asset.nombre}
                            </span>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="text-xs text-tenue">
                              {formatearDuracion(asset.duracion_seconds)}
                            </span>
                            <BotonBorrarAsset
                              nombre={asset.nombre}
                              borrando={borrandoAssetId === asset.id}
                              onClick={() => void borrarAsset(asset)}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    // Videos, fotos y stickers: miniaturas en grid.
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                      {grupo.items.map((asset) => (
                        <div
                          key={asset.id}
                          className="relative overflow-hidden rounded-xl border border-borde bg-surface-2/40"
                        >
                          {asset.tipo === "video" ? (
                            <video
                              src={srcDeAsset(asset)}
                              preload="metadata"
                              muted
                              playsInline
                              controls
                              className="aspect-square w-full bg-black object-cover"
                            />
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element -- miniatura de Supabase Storage o del motor
                            <img
                              src={srcDeAsset(asset)}
                              alt={asset.nombre}
                              loading="lazy"
                              className={`aspect-square w-full bg-black/40 ${
                                asset.tipo === "sticker"
                                  ? "object-contain p-2"
                                  : "object-cover"
                              }`}
                            />
                          )}
                          <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                            <span
                              className="truncate text-[11px] text-tenue"
                              title={asset.nombre}
                            >
                              {asset.nombre}
                            </span>
                            {asset.tipo === "video" &&
                              asset.duracion_seconds != null && (
                                <span className="shrink-0 rounded bg-black/40 px-1 text-[10px] text-tenue">
                                  {formatearDuracion(asset.duracion_seconds)}
                                </span>
                              )}
                          </div>
                          <div className="absolute right-1.5 top-1.5">
                            <BotonBorrarAsset
                              nombre={asset.nombre}
                              borrando={borrandoAssetId === asset.id}
                              onClick={() => void borrarAsset(asset)}
                              sobreImagen
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </section>

          {/* ------------------------------------------------------------- */}
          {/* Crear video con IA + ediciones del proyecto                   */}
          {/* ------------------------------------------------------------- */}
          <section className="flex flex-col gap-4 border-t border-borde pt-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-acento-2">
              Crear video con IA
            </h3>
            <p className="text-sm text-tenue">
              La IA mezcla los videos y fotos del proyecto (con música y
              stickers si los subiste) y arma un video con calidad profesional.
            </p>

            <label className="flex flex-col gap-1.5 text-sm font-medium text-tenue">
              Instrucción para la IA (opcional)
              <textarea
                value={instruccion}
                onChange={(e) => setInstruccion(e.target.value)}
                placeholder="Ej: un reel de 30 segundos con las mejores tomas, ritmo rápido y textos que enganchen"
                rows={3}
                className={`${claseCampo} resize-y`}
                disabled={enviandoEdicion}
              />
            </label>

            {/* Selector de estilo de edición (preset que afina el plan de la IA) */}
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-tenue">
                Estilo de edición
              </span>
              <div className="flex flex-wrap gap-2">
                {ESTILOS_EDICION.map((opcion) => {
                  const activo = estilo === opcion.valor;
                  return (
                    <button
                      key={opcion.valor}
                      type="button"
                      onClick={() => setEstilo(opcion.valor)}
                      disabled={enviandoEdicion}
                      aria-pressed={activo}
                      title={opcion.descripcion}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                        activo
                          ? "border-acento bg-acento/15 text-violet-200"
                          : "border-borde bg-background/60 text-tenue hover:border-acento/50 hover:bg-surface-2"
                      }`}
                    >
                      <span aria-hidden="true">{opcion.icono}</span>
                      {opcion.etiqueta}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => void crearVideoConIA()}
              disabled={enviandoEdicion}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-acento to-acento-2 px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {enviandoEdicion ? <Spinner /> : <span aria-hidden="true">🎬</span>}
              {enviandoEdicion
                ? "Iniciando edición..."
                : "Crear video del proyecto"}
            </button>

            {/* Aviso persistente mientras haya ediciones en curso */}
            {hayProcesando && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                <Spinner className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  La edición puede tardar varios minutos: se descarga el
                  material, la IA lo analiza y se renderiza el video.
                </p>
              </div>
            )}

            {errorEdicion && (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {errorEdicion}
              </div>
            )}

            {/* Resultado de la publicación en Instagram */}
            {resultadoPublicacion && (
              <div
                className={`rounded-xl border px-4 py-3 text-sm ${
                  resultadoPublicacion.ok
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                    : "border-red-500/40 bg-red-500/10 text-red-300"
                }`}
              >
                {resultadoPublicacion.mensaje}
              </div>
            )}

            {/* Lista de ediciones del proyecto */}
            <div className="flex flex-col gap-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-acento-2">
                Ediciones de este proyecto
              </h4>

              {errorEdits && (
                <div className="flex items-center justify-between gap-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  <span>{errorEdits}</span>
                  <button
                    type="button"
                    onClick={() => void cargarEdiciones()}
                    className="shrink-0 rounded-lg border border-red-500/40 px-3 py-1 text-xs font-medium transition-colors hover:bg-red-500/20"
                  >
                    Reintentar
                  </button>
                </div>
              )}

              {edits === null ? (
                <div className="flex items-center gap-2 text-sm text-tenue">
                  <Spinner /> Cargando ediciones...
                </div>
              ) : edits.length === 0 ? (
                <p className="text-sm text-tenue">
                  Todavía no hay ediciones. Sube material y pulsa &quot;Crear
                  video del proyecto&quot;.
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {edits.map((edit) => (
                    <li key={edit.id}>
                      <TarjetaEdicion
                        edit={edit}
                        borrando={borrandoEditId === edit.id}
                        onBorrar={() => void borrarEdicion(edit)}
                        onAbrirEditor={() => setEditEnEditor(edit)}
                        onPublicar={() => {
                          setResultadoPublicacion(null);
                          setEditParaPublicar(edit);
                        }}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Editor visual a pantalla COMPLETA (vista, no ventana emergente) */}
      {editEnEditor && (
        <div
          className="fixed inset-0 z-50 flex h-full w-full flex-col overflow-hidden bg-background"
          role="dialog"
          aria-modal="true"
          aria-label="Editor visual del video"
        >
          <EditorTimeline
            key={editEnEditor.id}
            edit={editEnEditor}
            assets={assetsParaEditor}
            onCerrar={() => setEditEnEditor(null)}
            onRerenderizado={alRerenderizar}
          />
        </div>
      )}

      {/* Modal de publicación en Instagram (pasa la URL del video editado) */}
      {editParaPublicar?.output_url && (
        <ModalPublicar
          key={editParaPublicar.id}
          abierto
          nombreVideo={proyecto.nombre}
          caption=""
          hashtags={[]}
          videoId={editParaPublicar.video_id ?? editParaPublicar.id}
          videoUrl={editParaPublicar.output_url}
          onCancelar={() => setEditParaPublicar(null)}
          onPublicado={(resultado) => {
            setResultadoPublicacion(resultado);
            setEditParaPublicar(null);
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Botón 🗑 de borrado de un asset (versión normal y flotante sobre imagen).
// ---------------------------------------------------------------------------

function BotonBorrarAsset({
  nombre,
  borrando,
  onClick,
  sobreImagen = false,
}: {
  nombre: string;
  borrando: boolean;
  onClick: () => void;
  sobreImagen?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={borrando}
      title={`Borrar ${nombre}`}
      aria-label={`Borrar ${nombre}`}
      className={`inline-flex h-7 w-7 items-center justify-center rounded-lg border transition-colors hover:border-red-500/50 hover:bg-red-500/20 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50 ${
        sobreImagen
          ? "border-white/20 bg-black/60 text-white backdrop-blur-sm"
          : "border-borde text-tenue"
      }`}
    >
      {borrando ? (
        <Spinner className="h-4 w-4" />
      ) : (
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          aria-hidden="true"
        >
          <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6" />
        </svg>
      )}
    </button>
  );
}
