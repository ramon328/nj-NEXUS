// Cliente tipado hacia la API local del extractor SII (FastAPI en :8000).

// Por defecto MISMO ORIGEN ("") → el navegador llama a /api/* y el proxy
// server-side (src/app/api/[...path]/route.ts) reenvía al backend con el token.
// (Para llamar directo al backend en dev, setear NEXT_PUBLIC_API_URL.)
export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

// Token que el backend exige en cada /api/* (X-API-Token). Se configura en Vercel
// como NEXT_PUBLIC_API_TOKEN. Para enlaces de descarga directa se manda por query.
export const API_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN ?? "";

export type EstadoEmpresa = "sin_probar" | "conectada" | "error";

export interface Empresa {
  id: number;
  nombre: string;
  rut: string;
  creada_en: number;
  conectada_en: number | null;
  estado: EstadoEmpresa;
}

export interface TipoDocumento {
  id: string;
  nombre: string;
  descripcion: string;
  estable: boolean;
  /** Si true, la UI debe pedir datos del destinatario (carpeta oficial). */
  requiere_destinatario?: boolean;
}

/** Datos del destinatario para la carpeta tributaria OFICIAL (el SII exige
 *  un RUT distinto al de la empresa y envía un aviso al correo indicado). */
export interface DatosDestinatario {
  dest_rut: string;
  dest_nombre?: string;
  email: string;
  institucion?: string;
}

export interface EstadoSesion {
  tiene_sesion: boolean;
  vigente: boolean;
  segundos_restantes: number;
  minutos_restantes: number;
  expira_hora: string | null;
  expira?: string | null;
  mensaje: string;
}

export interface Documento {
  ruta: string;
  nombre: string;
  tipo: string;
  grupo: string;
  periodo: string | null;
  size: number;
  modificado: number;
}

export interface ResultadoJob {
  doc: string;
  periodo?: string;
  anio?: string;
  ok: boolean;
  docs?: number;
  mensaje?: string;
}

export interface Job {
  id: string;
  empresa_id: number;
  estado: "en_cola" | "conectando" | "descargando" | "completado" | "error";
  total: number;
  completados: number;
  log: { t: number; msg: string }[];
  resultados: ResultadoJob[];
  error: string | null;
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(API_TOKEN ? { "X-API-Token": API_TOKEN } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      /* sin cuerpo JSON */
    }
    throw new Error(detail);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  tiposDocumento: () => req<TipoDocumento[]>("/api/tipos-documento"),

  listarEmpresas: () => req<Empresa[]>("/api/empresas"),

  crearEmpresa: (data: { nombre: string; rut: string; clave: string }) =>
    req<Empresa>("/api/empresas", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  actualizarEmpresa: (
    id: number,
    data: { nombre: string; clave?: string },
  ) =>
    req<Empresa>(`/api/empresas/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  eliminarEmpresa: (id: number) =>
    req<void>(`/api/empresas/${id}`, { method: "DELETE" }),

  testConexion: (id: number) =>
    req<{ ok: boolean; mensaje: string }>(`/api/empresas/${id}/test`, {
      method: "POST",
    }),

  desconectar: (id: number) =>
    req<{ ok: boolean; mensaje: string }>(`/api/empresas/${id}/desconectar`, {
      method: "POST",
    }),

  estadoSesion: (id: number) =>
    req<EstadoSesion>(`/api/empresas/${id}/sesion`),

  iniciarDescarga: (
    id: number,
    data: {
      desde: string;
      hasta: string;
      docs: string[];
    } & Partial<DatosDestinatario>,
  ) =>
    req<{ job_id: string }>(`/api/empresas/${id}/descargar`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  estadoJob: (jobId: string) => req<Job>(`/api/jobs/${jobId}`),

  listarDocumentos: (id: number) =>
    req<Documento[]>(`/api/empresas/${id}/documentos`),

  urlArchivo: (id: number, ruta: string, inline = false) =>
    `${API_BASE}/api/empresas/${id}/archivo?ruta=${encodeURIComponent(ruta)}` +
    (inline ? "&inline=1" : "") +
    (API_TOKEN ? `&token=${encodeURIComponent(API_TOKEN)}` : ""),

  eliminarArchivo: (id: number, ruta: string) =>
    req<void>(
      `/api/empresas/${id}/archivo?ruta=${encodeURIComponent(ruta)}`,
      { method: "DELETE" },
    ),
};
