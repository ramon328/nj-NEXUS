import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@supabase/supabase-js'
import { supabase } from '../../auth/supabase'
import { flatApps } from '../../data/apps'

let _tempClient = null
let _aliaceClient = null

function getTempClient() {
  if (!_tempClient) _tempClient = createClient(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_ANON_KEY,
    { auth: { autoRefreshToken: false, persistSession: false, storageKey: '_fj_tmp' } }
  )
  return _tempClient
}

const _ALIACE_URL = import.meta.env.VITE_ALIACE_SUPABASE_URL
  ?? 'https://mdrvhekhimhcwydrpueo.supabase.co'
const _ALIACE_KEY = import.meta.env.VITE_ALIACE_SUPABASE_ANON_KEY
  ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kcnZoZWtoaW1oY3d5ZHJwdWVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1MzcyOTksImV4cCI6MjA1OTExMzI5OX0.XYVbRbA5VhJKv8p5Fe64oXfzeaoY7fMVPDfJlNXqElY'

function getAliaceClient() {
  if (!_aliaceClient) {
    _aliaceClient = createClient(_ALIACE_URL, _ALIACE_KEY)
  }
  return _aliaceClient
}

// Apps asignables por permisos (las de acción interna se gatean por email, no por permisos)
const LIVE_APPS = flatApps.filter(a => a.status === 'live' && !a.action)

// Endurecimiento anti-inyección de filtros PostgREST.
// El término de búsqueda lo escribe el usuario y se interpola dentro de un
// `.or(...)`. Sin escapar, caracteres como `,` `(` `)` `.` rompen la gramática
// del filtro y `%` `_` actúan como comodines LIKE. Escapamos los comodines y
// envolvemos el valor entre comillas dobles: así PostgREST trata `,()` etc.
// como literales y la búsqueda mantiene el mismo comportamiento para texto
// normal. Acotamos el largo como defensa en profundidad.
function aliaceLikeTerm(value) {
  const raw = (value ?? '').trim().slice(0, 80)
  // Escapa `\` `%` `_` (comodines LIKE) y `"` (cierre de cita PostgREST).
  const escaped = raw.replace(/[\\%_"]/g, m => `\\${m}`)
  return `"%${escaped}%"`
}

export default function UsersManager() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingUser, setEditingUser] = useState(null)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    const { data: profiles } = await supabase
      .from('forja_profiles').select('id, name, email, role, is_active, created_at')
      .eq('role', 'user').order('created_at', { ascending: false })

    if (!profiles?.length) { setUsers([]); setLoading(false); return }

    const { data: perms } = await supabase
      .from('forja_permissions').select('*')
      .in('user_id', profiles.map(p => p.id))

    setUsers(profiles.map(p => ({
      ...p,
      permissions: perms?.filter(pm => pm.user_id === p.id) ?? []
    })))
    setLoading(false)
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`¿Eliminar por completo a ${user.name || user.email}? Esta acción no se puede deshacer.`)) return
    // Borra perfil, permisos Y la cuenta de auth.users (vía función SECURITY DEFINER),
    // para que el correo quede libre y pueda recrearse sin "usuario ya registrado".
    const { error } = await supabase.rpc('forja_delete_user', { target_id: user.id })
    if (error) { window.alert('No se pudo eliminar: ' + error.message); return }
    loadUsers()
  }

  const closeModal = () => { setShowModal(false); setEditingUser(null); loadUsers() }

  return (
    <div className="ap-section">
      <div className="ap-section-header">
        <h2 className="ap-section-title">Usuarios</h2>
        <button className="ap-btn primary small" onClick={() => { setEditingUser(null); setShowModal(true) }}>
          + Nuevo usuario
        </button>
      </div>

      {loading ? <p className="ap-hint">Cargando...</p>
        : users.length === 0 ? (
          <div className="ap-empty">
            <p>No hay usuarios creados aún.</p>
            <button className="ap-btn primary" onClick={() => setShowModal(true)}>Crear primer usuario</button>
          </div>
        ) : (
          <div className="ap-users-list">
            {users.map(u => (
              <div key={u.id} className={`ap-user-card ${!u.is_active ? 'inactive' : ''}`}>
                <div className="ap-user-info">
                  <span className="ap-user-name">{u.name || '—'}</span>
                  <span className="ap-user-email">{u.email}</span>
                </div>
                <div className="ap-user-apps">
                  {u.permissions.length === 0
                    ? <span className="ap-tag muted">Sin acceso</span>
                    : u.permissions.map(p => (
                      <span key={p.app_id} className="ap-tag">
                        {flatApps.find(a => a.id === p.app_id)?.name ?? p.app_id}
                        {p.app_id === 'aliace' && describeAliaceFilters(p.aliace_filters)}
                      </span>
                    ))
                  }
                </div>
                <div className="ap-user-actions">
                  <button className="ap-btn ghost small" onClick={() => { setEditingUser(u); setShowModal(true) }}>Editar</button>
                  <button className="ap-btn ghost small danger" onClick={() => handleDeleteUser(u)}>Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        )
      }
      {showModal && <UserModal user={editingUser} liveApps={LIVE_APPS} onClose={closeModal} />}
    </div>
  )
}

function describeAliaceFilters(f) {
  if (!f) return ' · acceso completo'
  const parts = []
  if (f.vendedor_nombre) parts.push(f.vendedor_nombre)
  if (f.mercado) parts.push(f.mercado)
  if (f.tipoCliente?.length) parts.push(f.tipoCliente.join(', '))
  if (f.clients?.length) parts.push(`${f.clients.length} clientes`)
  return parts.length ? ' · ' + parts.join(' / ') : ' · personalizado'
}

// ─── Modal ───────────────────────────────────────────────────────────────────

function UserModal({ user, liveApps, onClose }) {
  const isEditing = Boolean(user)
  const existingAliace = user?.permissions?.find(p => p.app_id === 'aliace')

  const [name, setName]       = useState(user?.name ?? '')
  const [email, setEmail]     = useState(user?.email ?? '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [selectedApps, setSelectedApps] = useState(
    () => new Set(user?.permissions?.map(p => p.app_id) ?? [])
  )

  // Aliace permission state
  const [aliaceMode, setAliaceMode] = useState(existingAliace?.aliace_filters ? 'custom' : 'full')
  const [selVendedor, setSelVendedor] = useState(existingAliace?.aliace_filters?.vendedor ?? '')
  const [selMercado, setSelMercado]   = useState(existingAliace?.aliace_filters?.mercado ?? '')
  const [selTipos, setSelTipos]       = useState(existingAliace?.aliace_filters?.tipoCliente ?? [])
  const [selClients, setSelClients]   = useState(() => {
    const ruts = existingAliace?.aliace_filters?.clients ?? []
    return ruts.map(r => ({ tax_id: r, name: r }))
  })

  // Options loaded from Aliace Supabase
  const [opts, setOpts] = useState({ vendedores: [], zonas: [], tipos: [] })
  const [optsLoading, setOptsLoading] = useState(false)

  // Client search
  const [clientSearch, setClientSearch] = useState('')
  const [clientResults, setClientResults] = useState([])
  const [clientSearching, setClientSearching] = useState(false)
  const searchTimer = useRef(null)

  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState(null)

  // Cargar opciones al montar el modal (no depende de selectedApps)
  useEffect(() => {
    const ac = getAliaceClient()
    if (!ac) return
    setOptsLoading(true)
    Promise.all([
      ac.from('profiles').select('id, name, lastname').order('name'),
      ac.from('clients').select('zone').eq('is_active', true),
      ac.from('clients').select('aux_category').eq('is_active', true),
    ]).then(([{ data: vends }, { data: zones }, { data: cats }]) => {
      setOpts({
        vendedores: (vends ?? [])
          .map(v => ({ id: v.id, nombre: `${v.name ?? ''} ${v.lastname ?? ''}`.trim() }))
          .filter(v => v.nombre)
          .sort((a, b) => a.nombre.localeCompare(b.nombre)),
        zonas: [...new Set((zones ?? []).map(r => r.zone).filter(Boolean))].sort(),
        tipos: [...new Set((cats ?? []).map(r => r.aux_category).filter(Boolean))]
          .filter(t => t && t !== 'nan').sort(),
      })
      setOptsLoading(false)
    }).catch(() => setOptsLoading(false))
  }, [])

  const toggleApp = (appId) => {
    setSelectedApps(prev => {
      const next = new Set(prev)
      next.has(appId) ? next.delete(appId) : next.add(appId)
      return next
    })
  }

  const toggleTipo = (t) => setSelTipos(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])

  const toggleClient = (c) => setSelClients(prev => {
    const exists = prev.find(x => x.tax_id === c.tax_id)
    return exists ? prev.filter(x => x.tax_id !== c.tax_id) : [...prev, c]
  })

  const searchClients = (q) => {
    setClientSearch(q)
    clearTimeout(searchTimer.current)
    if (q.length < 2) { setClientResults([]); return }
    const ac = getAliaceClient()
    if (!ac) return
    setClientSearching(true)
    searchTimer.current = setTimeout(async () => {
      const term = aliaceLikeTerm(q)
      const { data } = await ac.from('clients')
        .select('id, name, tax_id').eq('is_active', true)
        .or(`name.ilike.${term},tax_id.ilike.${term}`).order('name').limit(20)
      setClientResults(data ?? [])
      setClientSearching(false)
    }, 300)
  }

  const buildAliaceFilters = () => {
    if (aliaceMode === 'full') return null
    const f = {}
    if (selVendedor) {
      f.vendedor = selVendedor
      f.vendedor_nombre = opts.vendedores.find(v => v.id === selVendedor)?.nombre ?? ''
    }
    if (selMercado) f.mercado = selMercado
    if (selTipos.length) f.tipoCliente = selTipos
    if (selClients.length) f.clients = selClients.map(c => c.tax_id)
    return Object.keys(f).length ? f : null
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true); setErr(null)

    let userId = user?.id

    if (!isEditing) {
      const { data, error } = await getTempClient().auth.signUp({ email, password })
      if (error) {
        if (error.message === 'User already registered') {
          const { data: existing } = await supabase.from('forja_profiles').select('id').eq('email', email).single()
          if (existing) {
            userId = existing.id
            await supabase.from('forja_profiles').update({ name }).eq('id', userId)
          } else { setErr('Correo ya registrado. Búscalo en la lista.'); setSaving(false); return }
        } else { setErr(error.message); setSaving(false); return }
      } else {
        userId = data.user.id
        const { error: profErr } = await supabase.from('forja_profiles')
          .insert({ id: userId, name, email, role: 'user' })
        if (profErr) { setErr(profErr.message); setSaving(false); return }
      }
    } else {
      await supabase.from('forja_profiles').update({ name }).eq('id', userId)
    }

    await supabase.from('forja_permissions').delete().eq('user_id', userId)

    const permRows = [...selectedApps].map(appId => ({
      user_id: userId, app_id: appId,
      aliace_filters: appId === 'aliace' ? buildAliaceFilters() : null
    }))

    if (permRows.length > 0) {
      const { error: permErr } = await supabase.from('forja_permissions').insert(permRows)
      if (permErr) { setErr(permErr.message); setSaving(false); return }
    }

    setSaving(false); onClose()
  }

  return (
    <div className="ap-modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="ap-modal">
        <div className="ap-modal-header">
          <h3>{isEditing ? 'Editar usuario' : 'Nuevo usuario'}</h3>
          <button className="ap-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSave} className="ap-form" autoComplete="off">
          {/* Campos señuelo: absorben el autofill del navegador para que correo/contraseña salgan vacíos */}
          <input type="text" name="username" autoComplete="username" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" />
          <input type="password" name="password" autoComplete="current-password" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" />
          <div className="ap-row">
            <div className="ap-field">
              <label>Nombre</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre completo" required />
            </div>
            <div className="ap-field">
              <label>Correo</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                disabled={isEditing} placeholder="correo@dominio.com" required
                autoComplete="off" name="forja_new_email" />
            </div>
          </div>

          {!isEditing && (
            <div className="ap-field">
              <label>Contraseña</label>
              <div className="ap-password-wrap">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres" required minLength={6}
                  autoComplete="new-password" name="forja_new_password" />
                <button type="button" className="ap-password-toggle"
                  onClick={() => setShowPassword(v => !v)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
          )}

          <div className="ap-divider" />
          <p className="ap-label">Acceso a aplicaciones</p>
          <div className="ap-apps-grid">
            {liveApps.map(app => (
              <label key={app.id} className={`ap-app-check ${selectedApps.has(app.id) ? 'checked' : ''}`}
                style={{ '--ac': app.color }}>
                <input type="checkbox" checked={selectedApps.has(app.id)} onChange={() => toggleApp(app.id)} />
                <span className="ap-app-icon">{app.icon}</span>
                <span>{app.name}</span>
              </label>
            ))}
          </div>

          {selectedApps.has('aliace') && (
            <div className="ap-aliace-perms">
              <p className="ap-label">Permisos en Aliace</p>
              <div className="ap-toggle-group">
                <button type="button" className={`ap-toggle ${aliaceMode === 'full' ? 'active' : ''}`}
                  onClick={() => setAliaceMode('full')}>Acceso completo</button>
                <button type="button" className={`ap-toggle ${aliaceMode === 'custom' ? 'active' : ''}`}
                  onClick={() => setAliaceMode('custom')}>Personalizar vista</button>
              </div>

              {aliaceMode === 'custom' && (
                <div className="ap-aliace-custom">
                  {optsLoading ? <p className="ap-hint">Cargando opciones de Aliace...</p> : (
                    <>
                      {/* Vendedor */}
                      <div className="ap-field">
                        <label>Vendedor asignado</label>
                        <select value={selVendedor} onChange={e => setSelVendedor(e.target.value)} className="ap-select">
                          <option value="">— Todos los vendedores —</option>
                          {opts.vendedores.map(v => (
                            <option key={v.id} value={v.id}>{v.nombre}</option>
                          ))}
                        </select>
                      </div>

                      {/* Zona */}
                      <div className="ap-field">
                        <label>Zona / Mercado</label>
                        <select value={selMercado} onChange={e => setSelMercado(e.target.value)} className="ap-select">
                          <option value="">— Todas las zonas —</option>
                          {opts.zonas.map(z => <option key={z} value={z}>{z}</option>)}
                        </select>
                      </div>

                      {/* Tipo de cliente */}
                      <div className="ap-field">
                        <label>Tipo de cliente</label>
                        <div className="ap-tipo-grid">
                          {opts.tipos.map(t => (
                            <label key={t} className={`ap-tipo-check ${selTipos.includes(t) ? 'checked' : ''}`}>
                              <input type="checkbox" checked={selTipos.includes(t)} onChange={() => toggleTipo(t)} />
                              {t}
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Clientes específicos adicionales */}
                      <div className="ap-field">
                        <label>Clientes específicos (opcional)</label>
                        <input value={clientSearch} onChange={e => searchClients(e.target.value)}
                          placeholder="Buscar por nombre o RUT..." />
                      </div>

                      {clientSearching && <p className="ap-hint">Buscando...</p>}
                      {clientResults.length > 0 && (
                        <div className="ap-client-results">
                          {clientResults.map(c => {
                            const sel = selClients.find(s => s.tax_id === c.tax_id)
                            return (
                              <button key={c.id} type="button"
                                className={`ap-client-row ${sel ? 'selected' : ''}`}
                                onClick={() => toggleClient(c)}>
                                <span className="ap-client-name">{c.name}</span>
                                <span className="ap-client-rut">{c.tax_id}</span>
                                {sel && <span className="ap-client-check">✓</span>}
                              </button>
                            )
                          })}
                        </div>
                      )}
                      {selClients.length > 0 && (
                        <div className="ap-selected-clients">
                          <p className="ap-hint">Clientes adicionales seleccionados:</p>
                          <div className="ap-chips">
                            {selClients.map(c => (
                              <span key={c.tax_id} className="ap-chip">
                                {c.name === c.tax_id ? c.tax_id : c.name}
                                <button type="button" onClick={() => toggleClient(c)}>✕</button>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {err && <p className="ap-msg err">{err}</p>}
          <div className="ap-modal-footer">
            <button type="button" className="ap-btn ghost" onClick={onClose}>Cancelar</button>
            <button type="submit" className="ap-btn primary" disabled={saving}>
              {saving ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
