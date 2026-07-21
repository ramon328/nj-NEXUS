import { useState, useEffect } from 'react'
import { supabase } from '../../auth/supabase'

export default function ProfileSettings({ user }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState(user?.email ?? '')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [msg, setMsg] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user?.id) return
    supabase.from('forja_profiles').select('name').eq('id', user.id).single()
      .then(({ data }) => { if (data?.name) setName(data.name) })
  }, [user?.id])

  const handleSave = async (e) => {
    e.preventDefault()
    if (newPass && newPass !== confirmPass) {
      setMsg({ type: 'err', text: 'Las contraseñas no coinciden' })
      return
    }
    setSaving(true)
    setMsg(null)

    const authUpdates = {}
    if (email !== user.email) authUpdates.email = email
    if (newPass) authUpdates.password = newPass

    if (Object.keys(authUpdates).length > 0) {
      const { error } = await supabase.auth.updateUser(authUpdates)
      if (error) { setMsg({ type: 'err', text: error.message }); setSaving(false); return }
    }

    const { error: profileErr } = await supabase.from('forja_profiles')
      .update({ name, email })
      .eq('id', user.id)

    if (profileErr) {
      setMsg({ type: 'err', text: profileErr.message })
    } else {
      setMsg({ type: 'ok', text: 'Cambios guardados correctamente' })
      setNewPass('')
      setConfirmPass('')
    }
    setSaving(false)
  }

  return (
    <div className="ap-section">
      <h2 className="ap-section-title">Mi Perfil</h2>
      <form onSubmit={handleSave} className="ap-form">
        <div className="ap-field">
          <label>Nombre</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Tu nombre completo" />
        </div>
        <div className="ap-field">
          <label>Correo</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
        </div>

        <div className="ap-divider" />
        <p className="ap-hint">Cambiar contraseña (dejar vacío para no modificar)</p>

        <div className="ap-row">
          <div className="ap-field">
            <label>Nueva contraseña</label>
            <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="••••••••" />
          </div>
          <div className="ap-field">
            <label>Confirmar contraseña</label>
            <input type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder="••••••••" />
          </div>
        </div>

        {msg && <p className={`ap-msg ${msg.type}`}>{msg.text}</p>}

        <button type="submit" className="ap-btn primary" disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>
    </div>
  )
}
