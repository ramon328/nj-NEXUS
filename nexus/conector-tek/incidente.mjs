// incidente.mjs — captura un INCIDENTE de navegación/mapeo del banco (error + contexto +
// screenshots + log) a data/incidentes/, para que auto-fix-banco.mjs se lo pase a un Claude Code
// headless y lo arregle. Si TEK_AUTOFIX=1, además DISPARA el auto-fix en segundo plano (detached).
// Solo captura fallos de MAPEO/NAVEGACIÓN — nunca datos sensibles (ni claves, ni montos de plata).
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = dirname(fileURLToPath(import.meta.url))
const INC_DIR = join(DIR, 'data', 'incidentes')

export function registrarIncidente({ flujo, estado, error, url, empresa, empresa_real, user, screenshots = [], logTail = '' } = {}) {
  try {
    mkdirSync(INC_DIR, { recursive: true })
    const shots = (screenshots || []).map((s) => (s.startsWith('/') ? s : join(DIR, 'data', s))).filter((s) => existsSync(s))
    const inc = {
      ts: new Date().toISOString(),
      flujo,                       // 'masiva' | 'nomina' | 'transferencia' | 'scrape' | 'lectura'
      estado,                      // ej. 'sin_frame_importacion'
      error: String(error || '').slice(0, 400),
      url: String(url || '').slice(0, 200),
      empresa, empresa_real, user, // NO se guardan montos/beneficiarios ni claves
      screenshots: shots,
    }
    if (logTail) inc.log_inline = String(logTail).split('\n').slice(-40).join('\n')
    const p = join(INC_DIR, `inc-${Date.now()}.json`)
    writeFileSync(p, JSON.stringify(inc, null, 2))
    // NO se dispara el arreglo acá: el watcher (auto-fix-watcher.mjs) procesa los incidentes de a
    // UNO (serial, con lock) para que no corran dos Claude editando el mismo archivo a la vez.
    return p
  } catch { return null }
}
