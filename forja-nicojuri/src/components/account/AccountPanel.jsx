import ProfileSettings from '../admin/ProfileSettings'

// Panel de cuenta para cualquier usuario autenticado:
// permite editar nombre y contraseña (cuentas creadas por Nicolás incluidas)
export default function AccountPanel({ user, onClose }) {
  return (
    <div className="ap-overlay">
      <div className="ap-container">
        <div className="ap-topbar">
          <div className="ap-logo">
            Forja<span className="logo-accent"> · Mi Cuenta</span>
          </div>
          <div style={{ flex: 1 }} />
          <button className="ap-back" onClick={onClose} title="Volver al hub">
            ← Volver al hub
          </button>
        </div>
        <div className="ap-body">
          <ProfileSettings user={user} />
        </div>
      </div>
    </div>
  )
}
