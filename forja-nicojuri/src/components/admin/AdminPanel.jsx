import { useState } from 'react'
import ProfileSettings from './ProfileSettings'
import UsersManager from './UsersManager'
import AppsManager from './AppsManager'

export default function AdminPanel({ user, onClose, onHiddenChange }) {
  const [tab, setTab] = useState('perfil')

  return (
    <div className="ap-overlay">
      <div className="ap-container">
        <div className="ap-topbar">
          <div className="ap-logo">
            Forja<span className="logo-accent"> · Admin</span>
          </div>
          <nav className="ap-tabs">
            <button className={`ap-tab ${tab === 'perfil' ? 'active' : ''}`}
              onClick={() => setTab('perfil')}>
              Mi Perfil
            </button>
            <button className={`ap-tab ${tab === 'usuarios' ? 'active' : ''}`}
              onClick={() => setTab('usuarios')}>
              Usuarios
            </button>
            <button className={`ap-tab ${tab === 'apps' ? 'active' : ''}`}
              onClick={() => setTab('apps')}>
              Apps
            </button>
          </nav>
          <button className="ap-back" onClick={onClose} title="Volver al hub">
            ← Volver al hub
          </button>
        </div>

        <div className="ap-body">
          {tab === 'perfil' && <ProfileSettings user={user} />}
          {tab === 'usuarios' && <UsersManager />}
          {tab === 'apps' && <AppsManager user={user} onHiddenChange={onHiddenChange} />}
        </div>
      </div>
    </div>
  )
}
