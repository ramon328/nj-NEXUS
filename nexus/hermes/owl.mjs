import { basename, isAbsolute, normalize } from 'node:path'

/**
 * Owl safe-lifecycle — Phase 1: ALERT ONLY.
 * Unknown paths are never eligible. Never-touch list is absolute.
 * No delete, no dry-run apply, no receipt of deletion until a tenant allowlist is approved.
 */
export const NEVER_TOUCH = Object.freeze([
  '.env',
  '.env.local',
  'usuarios.json',
  'historial.db',
  'credenciales.json',
  'session.json',
  'chrome-profile',
  'node_modules',
  '.git',
  '.ssh',
  '*.pem',
  '*.pfx',
  '*.key',
])

const NEVER_RE = [
  /(^|\/)\.env(\.|$)/i,
  /(^|\/)usuarios\.json$/i,
  /(^|\/)historial\.db$/i,
  /chrome-profile/i,
  /(^|\/)\.git(\/|$)/,
  /(^|\/)node_modules(\/|$)/,
  /\.(pem|pfx|p12|key|crt)$/i,
  /session[^/]*\.json$/i,
]

function matchesNever(rel) {
  const base = basename(rel)
  for (const n of NEVER_TOUCH) {
    if (n.startsWith('*.') && base.endsWith(n.slice(1))) return n
    if (rel.includes(n) || base === n) return n
  }
  for (const re of NEVER_RE) if (re.test(rel)) return String(re)
  return null
}

export function classifyPath(inputPath, { allowlist = [] } = {}) {
  const raw = String(inputPath || '').trim()
  if (!raw) {
    return { eligible: false, action: 'alert', reason: 'empty_path', alert: 'empty path is never eligible' }
  }
  const rel = normalize(raw)
  if (rel.startsWith('..')) {
    return { eligible: false, action: 'alert', reason: 'path_escape', alert: 'parent traversal is never eligible' }
  }

  const never = matchesNever(rel)
  if (never) {
    return { eligible: false, action: 'alert', reason: 'never_touch', alert: `never-touch: ${never}` }
  }

  if (allowlist.length === 0) {
    return { eligible: false, action: 'alert', reason: 'no_allowlist', alert: 'Owl is alert-only until a tenant safe-delete allowlist is approved' }
  }

  const allowed = allowlist.some((p) => rel === p || rel.startsWith(p.endsWith('/') ? p : p + '/'))
  if (!allowed) {
    return { eligible: false, action: 'alert', reason: 'unknown_path', alert: 'unknown path is never eligible' }
  }

  return {
    eligible: false,
    action: 'alert',
    reason: 'alert_only',
    alert: 'path matched allowlist but Owl remains alert-only; no delete',
    would_touch: rel,
    absolute: isAbsolute(rel),
  }
}

export function owlScan(paths, opts) {
  return (paths || []).map((p) => ({ path: p, ...classifyPath(p, opts) }))
}
