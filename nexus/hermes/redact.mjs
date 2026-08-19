const SECRET_RE = [
  /\bsk-[a-z0-9-_]{8,}\b/gi,
  /\bBearer\s+[A-Za-z0-9._\-+/=]{8,}\b/gi,
  /\b(api[_-]?key|token|secret|password|clave)\s*[:=]\s*\S+/gi,
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
  /\+?\d{10,15}\b/g,
]

export function redact(value) {
  if (value == null) return value
  if (typeof value === 'object') {
    try { return JSON.parse(redact(JSON.stringify(value))) } catch { return '[redacted-object]' }
  }
  let s = String(value)
  for (const re of SECRET_RE) s = s.replace(re, '[redacted]')
  return s
}

export function redactRecord(obj) {
  const out = {}
  for (const [k, v] of Object.entries(obj || {})) {
    if (v && typeof v === 'object' && !Array.isArray(v)) out[k] = redactRecord(v)
    else out[k] = redact(v)
  }
  return out
}
