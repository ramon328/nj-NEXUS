// ─── Modelos de respaldo (fallback) ──────────────────────────────────────────
// Cuando Claude no está disponible (se acaban los tokens/créditos, rate-limit o
// "overloaded"), Nexus responde con OTRO modelo que Ramón haya conectado desde el
// Centro de IAs (apartado "Modelos", ícono de cerebro). La config vive en
// ~/nexus/modelos.json y se puede editar en caliente sin reiniciar el hub.
//
// Todos los proveedores soportados hablan el formato OpenAI (`/chat/completions`):
// OpenRouter (recomendado: 1 key, cientos de modelos), DeepSeek, Groq, OpenAI,
// Together, xAI (Grok) y Google Gemini (endpoint compatible). Para "mantener las
// luces prendidas" el respaldo responde SOLO TEXTO (sin herramientas): convierte la
// conversación de Claude a texto plano y contesta. No reemplaza a Nexus completo,
// pero evita el "(sin respuesta)" cuando Claude se cae.

import { readFileSync, writeFileSync, existsSync, chmodSync } from 'node:fs'
import { join } from 'node:path'

const RUTA = join(process.env.HOME || '', 'nexus', 'modelos.json')

// Presets: base_url y un modelo por defecto sensato. El UI ofrece estos + "custom".
export const PRESETS = {
  openrouter: { nombre: 'OpenRouter', base_url: 'https://openrouter.ai/api/v1', modelo: 'google/gemini-2.5-flash', ayuda: 'Una sola API key para cientos de modelos. Recomendado.' },
  deepseek: { nombre: 'DeepSeek', base_url: 'https://api.deepseek.com', modelo: 'deepseek-chat', ayuda: 'Barato y capaz.' },
  groq: { nombre: 'Groq', base_url: 'https://api.groq.com/openai/v1', modelo: 'llama-3.3-70b-versatile', ayuda: 'Muy rápido (Llama).' },
  openai: { nombre: 'OpenAI', base_url: 'https://api.openai.com/v1', modelo: 'gpt-4o-mini', ayuda: 'GPT de OpenAI.' },
  together: { nombre: 'Together', base_url: 'https://api.together.xyz/v1', modelo: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', ayuda: 'Modelos open source.' },
  xai: { nombre: 'xAI (Grok)', base_url: 'https://api.x.ai/v1', modelo: 'grok-2-latest', ayuda: 'Grok de xAI.' },
  gemini: { nombre: 'Google Gemini', base_url: 'https://generativelanguage.googleapis.com/v1beta/openai', modelo: 'gemini-2.5-flash', ayuda: 'Gemini vía endpoint compatible.' },
}

function _defecto() { return { activo: false, proveedores: [] } }

export function cargar() {
  try {
    if (!existsSync(RUTA)) return _defecto()
    const cfg = JSON.parse(readFileSync(RUTA, 'utf8'))
    return _normalizar(cfg)
  } catch { return _defecto() }
}

function _normalizar(cfg) {
  const out = _defecto()
  out.activo = Boolean(cfg?.activo)
  const arr = Array.isArray(cfg?.proveedores) ? cfg.proveedores : []
  out.proveedores = arr.map((p, i) => ({
    id: String(p?.id || ('m' + i)),
    nombre: String(p?.nombre || PRESETS[p?.preset]?.nombre || 'Modelo').slice(0, 40),
    preset: p?.preset && PRESETS[p.preset] ? p.preset : 'custom',
    base_url: String(p?.base_url || '').trim().replace(/\/+$/, ''),
    api_key: String(p?.api_key || '').trim(),
    modelo: String(p?.modelo || '').trim(),
    habilitado: p?.habilitado !== false,
  })).filter((p) => p.base_url && p.modelo)
  return out
}

export function guardar(cfg) {
  const norm = _normalizar(cfg)
  writeFileSync(RUTA, JSON.stringify(norm, null, 2))
  try { chmodSync(RUTA, 0o600) } catch { /* */ } // tiene API keys: solo el dueño
  return norm
}

function _mask(k) {
  const s = String(k || '')
  if (s.length <= 8) return s ? '••••' : ''
  return s.slice(0, 4) + '…' + s.slice(-4)
}

// Config para el UI: NUNCA devuelve la key completa (solo enmascarada).
export function estado() {
  const cfg = cargar()
  return {
    activo: cfg.activo,
    proveedores: cfg.proveedores.map((p) => ({
      id: p.id, nombre: p.nombre, preset: p.preset, base_url: p.base_url,
      modelo: p.modelo, habilitado: p.habilitado,
      tiene_key: Boolean(p.api_key), key_mask: _mask(p.api_key),
    })),
  }
}

// Proveedores usables (habilitados y con key), en orden.
function _usables() {
  const cfg = cargar()
  if (!cfg.activo) return []
  return cfg.proveedores.filter((p) => p.habilitado && p.api_key && p.base_url && p.modelo)
}

export function hayFallback() { return _usables().length > 0 }

// ¿El error de Claude es "sin tokens / créditos / límite"? Solo en esos casos
// tiene sentido saltar al respaldo (un error de red se reintenta con Claude mismo).
export function esErrorSinTokens(err) {
  const status = err?.status || err?.response?.status
  // 429 = rate limit; 529 = overloaded (Anthropic). Ambos justifican respaldo.
  if (status === 429 || status === 529) return true
  const msg = `${err?.message || ''} ${err?.error?.error?.message || ''} ${err?.error?.message || ''}`.toLowerCase()
  return /credit balance|insufficient|quota|rate.?limit|too low|overloaded|billing/.test(msg)
}

// Aplana el `system` de Claude (string o array de bloques {type:'text',text}).
function _sysTexto(system) {
  if (!system) return ''
  if (typeof system === 'string') return system
  if (Array.isArray(system)) return system.map((b) => (typeof b === 'string' ? b : b?.text || '')).filter(Boolean).join('\n\n')
  return String(system)
}

// Convierte los `messages` de Claude a formato OpenAI (solo texto). Los bloques de
// herramienta (tool_use / tool_result) e imágenes se resumen a texto para que el
// modelo de respaldo tenga el contexto sin necesitar tool-calling.
function _bloqueATexto(c) {
  if (typeof c === 'string') return c
  if (!Array.isArray(c)) return String(c ?? '')
  const partes = []
  for (const b of c) {
    if (!b || typeof b !== 'object') { partes.push(String(b ?? '')); continue }
    if (b.type === 'text') partes.push(b.text || '')
    else if (b.type === 'tool_use') partes.push(`[Nexus usó la herramienta "${b.name}" con: ${JSON.stringify(b.input || {}).slice(0, 400)}]`)
    else if (b.type === 'tool_result') {
      const r = Array.isArray(b.content) ? b.content.map((x) => x?.text || '').join(' ') : (b.content || '')
      partes.push(`[Resultado de la herramienta: ${String(r).slice(0, 1200)}]`)
    } else if (b.type === 'image') partes.push('[imagen adjunta]')
    else partes.push(b.text || '')
  }
  return partes.filter(Boolean).join('\n')
}

export function aOpenAI(system, messages) {
  const out = []
  const sys = _sysTexto(system)
  if (sys) out.push({ role: 'system', content: sys })
  for (const m of (messages || [])) {
    const role = m.role === 'assistant' ? 'assistant' : 'user'
    const content = _bloqueATexto(m.content).trim()
    if (content) out.push({ role, content })
  }
  return out
}

async function _llamarProveedor(p, mensajesOpenAI, { maxTokens = 4000, timeoutMs = 60000 } = {}) {
  const url = p.base_url + '/chat/completions'
  const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + p.api_key }
  // OpenRouter agradece estos headers (ranking/quota); no molestan a los demás.
  if (/openrouter/i.test(p.base_url)) { headers['HTTP-Referer'] = 'https://nexus.local'; headers['X-Title'] = 'Nexus' }
  const r = await fetch(url, {
    method: 'POST', headers,
    body: JSON.stringify({ model: p.modelo, messages: mensajesOpenAI, max_tokens: maxTokens, temperature: 0.4 }),
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!r.ok) {
    const t = await r.text().catch(() => '')
    throw new Error(`${p.nombre} HTTP ${r.status}: ${t.slice(0, 300)}`)
  }
  const j = await r.json()
  const texto = j?.choices?.[0]?.message?.content
  if (!texto) throw new Error(`${p.nombre}: respuesta vacía`)
  return String(texto).trim()
}

// Responde con el PRIMER proveedor usable que funcione (failover en cadena).
export async function responder({ system, messages, maxTokens = 4000 } = {}) {
  const usables = _usables()
  if (!usables.length) throw new Error('No hay modelo de respaldo configurado')
  const mensajes = aOpenAI(system, messages)
  let ultimo
  for (const p of usables) {
    try {
      const texto = await _llamarProveedor(p, mensajes, { maxTokens })
      return { texto, proveedor: p.nombre, modelo: p.modelo }
    } catch (e) {
      ultimo = e
      try { console.error(`[modelos] respaldo ${p.nombre} falló: ${e.message}`) } catch { /* */ }
    }
  }
  throw ultimo || new Error('Todos los modelos de respaldo fallaron')
}

// Prueba UN proveedor (para el botón "Probar" del UI). Recibe la config con key
// en claro; si viene sin key, usa la guardada (para probar uno ya guardado).
export async function probar(prov) {
  const p = _normalizar({ activo: true, proveedores: [prov] }).proveedores[0]
  if (!p) return { ok: false, error: 'Faltan datos (base URL y modelo).' }
  if (!p.api_key) {
    const guardado = cargar().proveedores.find((x) => x.id === prov?.id)
    if (guardado?.api_key) p.api_key = guardado.api_key
  }
  if (!p.api_key) return { ok: false, error: 'Falta la API key.' }
  const t0 = Date.now()
  try {
    const texto = await _llamarProveedor(p, [{ role: 'user', content: 'Responde solo con la palabra: OK' }], { maxTokens: 20, timeoutMs: 25000 })
    return { ok: true, texto: texto.slice(0, 120), ms: Date.now() - t0 }
  } catch (e) {
    return { ok: false, error: String(e.message || e).slice(0, 300), ms: Date.now() - t0 }
  }
}
