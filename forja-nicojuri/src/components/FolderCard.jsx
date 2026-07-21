import { useEffect, useRef, useState } from 'react'
import AppCard from './AppCard'

const FolderArrow = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
)

export default function FolderCard({ app, index, onAction, hidden = false }) {
  const cardRef = useRef(null)
  const [open, setOpen] = useState(false)

  function handleMouseMove(e) {
    const rect = cardRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    cardRef.current.style.setProperty('--mx', x + '%')
    cardRef.current.style.setProperty('--my', y + '%')
  }

  // Cerrar la carpeta con Escape
  useEffect(() => {
    if (!open) return
    const onKey = e => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <div
        ref={cardRef}
        className={`app-card folder-card card-${app.id}${hidden ? ' admin-hidden' : ''}`}
        style={{
          '--accent-color': app.color,
          animationDelay: `${0.1 + index * 0.1}s`,
        }}
        role="button"
        tabIndex={0}
        onMouseMove={handleMouseMove}
        onClick={() => setOpen(true)}
        onKeyDown={e => { if (e.key === 'Enter') setOpen(true) }}
      >
        <span className="card-status status-live">
          {app.children.length} apps
        </span>
        {hidden && <span className="card-hidden-badge">Oculta</span>}

        <div className="card-icon">{app.icon}</div>

        <div className="card-body">
          <h2>{app.name}</h2>
          <p>{app.description}</p>
        </div>

        <span className="card-cta" style={{ color: app.color }}>
          Abrir carpeta
          <FolderArrow />
        </span>

        <div
          className="card-line"
          style={{ background: `linear-gradient(90deg, transparent, ${app.color}, transparent)` }}
        />
      </div>

      {open && (
        <div className="folder-overlay" onClick={() => setOpen(false)}>
          <div className="folder-modal" onClick={e => e.stopPropagation()}>
            <div className="folder-modal-head">
              <div className="folder-modal-title">
                <span className="folder-modal-icon">{app.icon}</span>
                <h2>{app.name}</h2>
              </div>
              <button className="folder-close" onClick={() => setOpen(false)} title="Cerrar carpeta">
                ✕
              </button>
            </div>
            <div className="apps-grid folder-grid">
              {app.children.map((child, i) => (
                <AppCard key={child.id} app={child} index={i} onAction={onAction} />
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
