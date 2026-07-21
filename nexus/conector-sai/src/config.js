// Config de SAI. Parsea conector-sai/.env DIRECTAMENTE (el archivo manda) para no
// colisionar con el .env de Nexus: process.loadEnvFile NO sobreescribe vars ya
// existentes (ej. Nexus setea SII_API_TOKEN="" y le ganaba al token real de SAI).
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { readFileSync } from "node:fs";
import { normRut } from "./rut.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Parser simple de .env (KEY=VALUE, ignora comentarios y comillas). El archivo de
// SAI tiene prioridad; si falta una clave, cae a process.env.
function parseEnvFile(p) {
  const out = {};
  try {
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i < 0) continue;
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      out[k] = v;
    }
  } catch { /* sin archivo: usa process.env */ }
  return out;
}
const FILE = parseEnvFile(join(__dirname, "..", ".env"));
const E = (k, def = "") => (FILE[k] != null && FILE[k] !== "" ? FILE[k] : (process.env[k] ?? def));

export const CONFIG = {
  rut: normRut(E("EMPRESA_RUT", "77271121-2")),
  nombre: E("EMPRESA_NOMBRE", "ANA CLARA SpA"),
  siiEmpresaId: Number(E("SII_EMPRESA_ID", "5")),
};

export const PERIODO_DESDE = E("SII_PERIODO_DESDE", "202601");
export const CACHE_MS = Number(E("CACHE_MS", "180000"));

export const SII_BACKEND_URL = E("SII_BACKEND_URL", "https://nj-bc-sii.onrender.com");
export const SII_API_TOKEN = E("SII_API_TOKEN", "");
export const SII_RCV_DESDE = E("SII_RCV_DESDE", "202501");
export const SII_RCV_HASTA = String(E("SII_RCV_HASTA", "")).trim();

export const BANK_SUPABASE_URL = E("BANK_SUPABASE_URL", "");
export const BANK_SUPABASE_SERVICE_KEY = E("BANK_SUPABASE_SERVICE_KEY", "");

export const MALLORCA_API_URL = E("MALLORCA_API_URL", "");
export const MALLORCA_API_TOKEN = E("MALLORCA_API_TOKEN", "");

export const ANTHROPIC_MODEL = E("ANTHROPIC_MODEL", "claude-haiku-4-5-20251001");
export const APP_URL = E("APP_URL", "");

export function mesActualYYYYMM() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}`;
}
