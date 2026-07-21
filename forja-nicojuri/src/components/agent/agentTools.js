import { createClient } from '@supabase/supabase-js'
import { supabase } from '../../auth/supabase'
import { flatApps } from '../../data/apps'

// ─────────────────────────────────────────────────────────────────────────────
// Herramientas del agente Forja.
//
// El agente solo recibe las herramientas que su rol permite:
//   • Cualquier usuario logueado  → sin herramientas de datos (chat).
//   • Solo admins                 → herramientas de gestión de usuarios/apps.
//
// Toda escritura pasa igualmente por Supabase (RLS), que actúa como segunda
// barrera: aunque una herramienta se ejecutara sin permiso, la base la rechaza.
// ─────────────────────────────────────────────────────────────────────────────

// Cliente temporal para crear cuentas sin tocar la sesión del admin actual
// (mismo patrón que UsersManager).
let _tempClient = null
function getTempClient() {
  if (!_tempClient) _tempClient = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    { auth: { autoRefreshToken: false, persistSession: false, storageKey: '_fj_agent_tmp' } }
  )
  return _tempClient
}

// ─── Definiciones (esquema que ve Claude) ────────────────────────────────────

// Herramientas disponibles para cualquier usuario logueado. Por ahora ninguna:
// Forjita responde en modo conversacional para no-admins.
const READ_TOOLS = []

const ADMIN_READ_TOOLS = [
  {
    name: 'list_users',
    description: 'Lista los usuarios (no admins) con su correo y a qué aplicaciones tienen acceso. Solo disponible para administradores.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
]

const WRITE_TOOLS = [
  {
    name: 'create_user',
    description: 'Crea un usuario nuevo con correo y contraseña, y le asigna acceso a aplicaciones. Esto genera sus credenciales de acceso. Solo administradores. Pregunta confirmación al usuario antes de ejecutar si no quedó del todo claro.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nombre completo.' },
        email: { type: 'string', description: 'Correo (será su usuario de acceso).' },
        password: { type: 'string', description: 'Contraseña inicial (mínimo 6 caracteres).' },
        app_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Ids de las apps a las que tendrá acceso. Usa list_apps para ver los ids disponibles. Opcional.',
        },
      },
      required: ['name', 'email', 'password'],
    },
  },
  {
    name: 'list_apps',
    description: 'Lista las aplicaciones disponibles con su id y nombre, para saber qué asignar al crear un usuario. Solo administradores.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
]

// Devuelve las herramientas que el rol actual puede usar.
export function getToolsForRole(isAdmin) {
  return isAdmin
    ? [...READ_TOOLS, ...ADMIN_READ_TOOLS, ...WRITE_TOOLS]
    : [...READ_TOOLS]
}

// ─── Ejecutores ──────────────────────────────────────────────────────────────

const TOOL_FNS = {
  async list_users() {
    const { data: profiles, error } = await supabase
      .from('forja_profiles').select('id, name, email, is_active')
      .eq('role', 'user').order('created_at', { ascending: false })
    if (error) return { error: error.message }
    const ids = (profiles ?? []).map(p => p.id)
    const { data: perms } = ids.length
      ? await supabase.from('forja_permissions').select('user_id, app_id').in('user_id', ids)
      : { data: [] }
    return {
      users: (profiles ?? []).map(p => ({
        name: p.name || null,
        email: p.email,
        activo: p.is_active !== false,
        apps: (perms ?? [])
          .filter(pm => pm.user_id === p.id)
          .map(pm => flatApps.find(a => a.id === pm.app_id)?.name ?? pm.app_id),
      })),
    }
  },

  async list_apps() {
    return {
      apps: flatApps
        .filter(a => a.status === 'live' && !a.action)
        .map(a => ({ id: a.id, name: a.name })),
    }
  },

  async create_user({ name, email, password, app_ids }) {
    if (!email?.trim() || !password) return { error: 'Correo y contraseña son obligatorios.' }
    if (password.length < 6) return { error: 'La contraseña debe tener al menos 6 caracteres.' }

    const { data, error } = await getTempClient().auth.signUp({ email: email.trim(), password })
    if (error) return { error: error.message }
    const userId = data.user?.id
    if (!userId) return { error: 'No se pudo crear la cuenta.' }

    const { error: profErr } = await supabase.from('forja_profiles')
      .insert({ id: userId, name: name?.trim() ?? '', email: email.trim(), role: 'user' })
    if (profErr) return { error: profErr.message }

    const valid = new Set(flatApps.map(a => a.id))
    const rows = (app_ids ?? []).filter(id => valid.has(id))
      .map(id => ({ user_id: userId, app_id: id, aliace_filters: null }))
    if (rows.length) {
      const { error: permErr } = await supabase.from('forja_permissions').insert(rows)
      if (permErr) return { error: `Usuario creado, pero falló asignar apps: ${permErr.message}` }
    }
    return {
      ok: true,
      message: `Usuario ${email.trim()} creado${rows.length ? ` con acceso a ${rows.length} app(s)` : ' sin apps asignadas'}.`,
    }
  },
}

// Ejecuta una herramienta. `isAdmin` se valida aquí como tercera barrera: todas
// las herramientas actuales requieren permisos de administrador.
export async function runTool(name, input, { isAdmin }) {
  const fn = TOOL_FNS[name]
  if (!fn) return { error: `Herramienta desconocida: ${name}` }
  if (!isAdmin) {
    return { error: 'Esta acción requiere permisos de administrador. No tienes permiso para ejecutarla.' }
  }
  try {
    return await fn(input ?? {})
  } catch (e) {
    return { error: e?.message ?? String(e) }
  }
}
