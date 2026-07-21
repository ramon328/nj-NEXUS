// ─────────────────────────────────────────────────────────────────────────────
// Backend seguro de Forjita (Vercel Serverless Function).
//
// La API key de Anthropic vive SOLO aquí (process.env.ANTHROPIC_API_KEY), nunca
// llega al navegador. Este endpoint:
//   1. Exige que el usuario tenga sesión válida de Supabase (Authorization Bearer).
//   2. FUERZA el modelo Haiku e impone un techo a max_tokens (el cliente no puede
//      pedir Opus ni tokens ilimitados aunque manipule la petición).
//   3. Reenvía la conversación a Anthropic y devuelve la respuesta tal cual.
//
// Variables de entorno requeridas en Vercel (Settings → Environment Variables):
//   ANTHROPIC_API_KEY   (secreto, key NUEVA tras revocar la filtrada)
//   SUPABASE_URL        (o se reutiliza VITE_SUPABASE_URL)
//   SUPABASE_ANON_KEY   (o se reutiliza VITE_SUPABASE_ANON_KEY)
// ─────────────────────────────────────────────────────────────────────────────

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-haiku-4-5' // forzado en servidor: el cliente no elige modelo
const MAX_TOKENS_CAP = 2048 // techo duro de tokens de salida por llamada

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

// Valida el JWT del usuario contra Supabase. Devuelve el usuario o null.
async function getUser(token) {
  if (!token || !SUPABASE_URL || !SUPABASE_ANON_KEY) return null
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(500).json({ error: 'ANTHROPIC_API_KEY no configurada en el servidor' })
    return
  }

  // 1. Autenticación: solo usuarios con sesión Supabase válida.
  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : ''
  const user = await getUser(token)
  if (!user) {
    res.status(401).json({ error: 'No autorizado: inicia sesión.' })
    return
  }

  // 2. Cuerpo: aceptamos solo system, tools, messages. Modelo y tope de tokens
  //    los decide el servidor, no el cliente.
  const { system, tools, messages, maxTokens } = req.body || {}
  if (!Array.isArray(messages)) {
    res.status(400).json({ error: 'messages debe ser un array' })
    return
  }
  const max_tokens = Math.min(Number(maxTokens) || 1024, MAX_TOKENS_CAP)

  // 3. Reenviar a Anthropic con la key del servidor.
  //    `tools` solo se incluye si viene con contenido (los usuarios sin
  //    herramientas conversan sin tools).
  const payload = { model: MODEL, max_tokens, system, messages }
  if (Array.isArray(tools) && tools.length) payload.tools = tools
  try {
    const r = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(payload),
    })
    const text = await r.text()
    res.status(r.status).setHeader('content-type', 'application/json').send(text)
  } catch (err) {
    res.status(502).json({ error: `Error llamando a Anthropic: ${err.message}` })
  }
}
