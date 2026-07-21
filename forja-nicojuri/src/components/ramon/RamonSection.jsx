import { useState } from 'react'
import RamonCalendar from './RamonCalendar'
import ProjectCalendar from './ProjectCalendar'
import { useBackButton } from '../../hooks/useBackButton'

// Emails con acceso al apartado Ramón · Calendario / Avance
export const RAMON_ACCESS_EMAILS = ['njuri@dropout.cl', 'ramon@dropout.cl']

export function canAccessRamon(email) {
  return RAMON_ACCESS_EMAILS.includes((email ?? '').toLowerCase())
}

export default function RamonSection({ user, isAdmin, onClose, initialTab = 'calendario' }) {
  const [tab, setTab] = useState(initialTab)

  // El botón Atrás del navegador/celular vuelve al hub sin cerrar la PWA.
  useBackButton(true, onClose)

  return (
    <div className="ap-overlay">
      <div className="ap-container">
        <div className="ap-topbar">
          <div className="ap-logo">
            Ramón<span className="logo-accent"> · Calendario / Avance</span>
          </div>
          <nav className="ap-tabs">
            <button className={`ap-tab ${tab === 'calendario' ? 'active' : ''}`}
              onClick={() => setTab('calendario')}>
              Calendario
            </button>
            <button className={`ap-tab ${tab === 'avance' ? 'active' : ''}`}
              onClick={() => setTab('avance')}>
              Avance de Proyectos
            </button>
          </nav>
          <button className="ap-back" onClick={onClose} title="Volver al hub">
            ← Volver al hub
          </button>
        </div>

        <div className="ap-body wide">
          {tab === 'calendario' && <RamonCalendar />}
          {tab === 'avance' && <ProjectCalendar user={user} />}
        </div>
      </div>
    </div>
  )
}
