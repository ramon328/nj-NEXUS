import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../auth/supabase'
import { apps } from '../../data/apps'

// Gestiona qué tarjetas del hub están ocultas (estado global, en forja_hidden_apps).
// Solo administradores. Cada tarjeta de nivel superior se puede ocultar/mostrar.
export default function AppsManager({ user, onHiddenChange }) {
  const [hidden, setHidden] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)
  const [err, setErr] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('forja_hidden_apps').select('app_id')
    setHidden(new Set(data?.map(r => r.app_id) ?? []))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const toggle = async (appId) => {
    setErr(null)
    setBusy(appId)
    const isHidden = hidden.has(appId)
    let error
    if (isHidden) {
      ({ error } = await supabase.from('forja_hidden_apps').delete().eq('app_id', appId))
    } else {
      ({ error } = await supabase.from('forja_hidden_apps')
        .upsert({ app_id: appId, hidden_by: user?.id }, { onConflict: 'app_id' }))
    }
    setBusy(null)
    if (error) { setErr(error.message); return }
    setHidden(prev => {
      const next = new Set(prev)
      next.has(appId) ? next.delete(appId) : next.add(appId)
      return next
    })
    onHiddenChange?.()
  }

  return (
    <div className="ap-section">
      <div className="ap-section-header">
        <h2 className="ap-section-title">Visibilidad de apps</h2>
      </div>
      <p className="ap-hint">
        Oculta tarjetas del hub para todos los usuarios. Los administradores las siguen viendo atenuadas.
      </p>

      {err && <p className="ap-msg err">{err}</p>}

      {loading ? <p className="ap-hint">Cargando...</p> : (
        <div className="ap-apps-visibility">
          {apps.map(app => {
            const isHidden = hidden.has(app.id)
            return (
              <div key={app.id} className={`ap-app-row ${isHidden ? 'hidden' : ''}`}>
                <span className="ap-app-row-icon" style={{ '--ac': app.color }}>{app.icon}</span>
                <div className="ap-app-row-info">
                  <span className="ap-app-row-name">{app.name}</span>
                  <span className="ap-app-row-state">{isHidden ? 'Oculta' : 'Visible'}</span>
                </div>
                <button
                  className={`ap-switch ${isHidden ? '' : 'on'}`}
                  disabled={busy === app.id}
                  onClick={() => toggle(app.id)}
                  aria-label={isHidden ? `Mostrar ${app.name}` : `Ocultar ${app.name}`}
                  title={isHidden ? 'Mostrar tarjeta' : 'Ocultar tarjeta'}
                >
                  <span className="ap-switch-knob" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
