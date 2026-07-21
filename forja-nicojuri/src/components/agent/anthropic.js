import { getToolsForRole, runTool } from './agentTools'
import { supabase } from '../../auth/supabase'

// ─────────────────────────────────────────────────────────────────────────────
// Conexión con Forjita a través de un backend SEGURO.
//
// La key de Anthropic NUNCA llega al navegador: vive en la Serverless Function
// /api/forjita (ver api/forjita.js), que valida la sesión de Supabase, fuerza el
// modelo Haiku y limita los tokens. El frontend solo manda la conversación junto
// con el token de sesión del usuario.
// ─────────────────────────────────────────────────────────────────────────────

const API_URL = '/api/forjita'
const MAX_TOOL_TURNS = 6

// Forjita está disponible para cualquier usuario con sesión iniciada; la key ya
// no vive en el cliente, así que no hay nada que comprobar aquí.
export const hasApiKey = () => true

function systemPrompt({ isAdmin, userName, today }) {
  return [
    'Eres "Forjita", el asistente de IA de Forja, la suite de aplicaciones empresariales de Nicojuri.',
    `Hoy es ${today}. Hablas con ${userName || 'un usuario'} (rol: ${isAdmin ? 'administrador' : 'usuario'}).`,
    '',
    'Reglas:',
    `- Responde SIEMPRE en español, cálida y cercana. Saluda por su nombre (${userName || 'el usuario'}) cuando sea natural y usa algún emoji con moderación.`,
    '- Texto con formato: puedes usar **negrita**, *cursiva*, `código`, listas con "- " y subtítulos con "### ". Sé clara y concisa.',
    '- Usa las herramientas para obtener datos reales; nunca inventes usuarios ni apps.',
    '- Antes de una acción que modifica datos (crear usuario), confirma brevemente con el usuario salvo que la instrucción ya sea explícita.',
    isAdmin
      ? '- Eres admin: puedes listar usuarios y crear usuarios nuevos con credenciales y acceso a apps.'
      : '- El usuario NO es admin: no tienes herramientas disponibles. Responde de forma conversacional y, si pide gestionar usuarios o datos, explica con amabilidad que no tiene permisos para eso.',
  ].join('\n')
}

async function callClaude({ system, tools, messages, maxTokens = 1024 }) {
  // Token de sesión de Supabase: el backend exige usuario autenticado.
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) throw new Error('Debes iniciar sesión para usar Forjita.')

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${token}`,
    },
    // El modelo y el tope de tokens los decide el servidor; aquí solo sugerimos.
    body: JSON.stringify({ system, tools, messages, maxTokens }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Claude ${res.status}: ${text}`)
  }
  return res.json()
}

// Recibe el historial (formato Anthropic) y devuelve { reply, messages }.
// `messages` es el historial actualizado para continuar la conversación.
export async function runAgent({ history, isAdmin, userName, today }) {
  const tools = getToolsForRole(isAdmin)
  const system = systemPrompt({ isAdmin, userName, today })
  const messages = [...history]

  for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
    const data = await callClaude({ system, tools, messages, maxTokens: 2048 })
    messages.push({ role: 'assistant', content: data.content })

    if (data.stop_reason !== 'tool_use') {
      const reply = (data.content ?? [])
        .filter(b => b.type === 'text').map(b => b.text).join('\n').trim()
      return { reply: reply || '(sin respuesta)', messages }
    }

    // Ejecutar cada herramienta solicitada
    const toolUses = (data.content ?? []).filter(b => b.type === 'tool_use')
    const results = []
    for (const tu of toolUses) {
      const out = await runTool(tu.name, tu.input, { isAdmin })
      results.push({
        type: 'tool_result',
        tool_use_id: tu.id,
        content: JSON.stringify(out),
        is_error: Boolean(out?.error),
      })
    }
    messages.push({ role: 'user', content: results })
  }

  return { reply: 'La consulta resultó demasiado larga. Intenta reformularla.', messages }
}
