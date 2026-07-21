import { useRef } from 'react'
import { supabase } from '../auth/supabase'

const ArrowRight = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
)

const Plus = () => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path d="M12 2v20M2 12h20" />
  </svg>
)

export default function AppCard({ app, index, onAction, hidden = false }) {
  const cardRef = useRef(null)

  function handleMouseMove(e) {
    const rect = cardRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    cardRef.current.style.setProperty('--mx', x + '%')
    cardRef.current.style.setProperty('--my', y + '%')
  }

  async function handleSecuredClick(e) {
    e.preventDefault()
    // Open window synchronously to avoid popup blocker, then redirect once we have the token
    const win = window.open('about:blank', '_blank')
    const { data } = await supabase.auth.getSession()
    const token = data?.session?.access_token
    const url = new URL(app.href)
    if (token) url.searchParams.set('forja_token', token)
    win.location = url.toString()
  }

  const isLive = app.status === 'live'
  const Tag = isLive && !app.action ? 'a' : 'div'
  const linkProps = !isLive
    ? {}
    : app.action
      ? {
          role: 'button',
          tabIndex: 0,
          onClick: () => onAction?.(app.action),
          onKeyDown: e => { if (e.key === 'Enter') onAction?.(app.action) },
        }
      : {
          href: app.href,
          target: app.requiresForjaToken ? undefined : '_blank',
          rel: 'noopener',
          onClick: app.requiresForjaToken ? handleSecuredClick : undefined,
        }

  return (
    <Tag
      ref={cardRef}
      className={`app-card card-${app.id}${isLive ? '' : ' soon'}${hidden ? ' admin-hidden' : ''}`}
      style={{
        '--accent-color': app.color,
        animationDelay: `${0.1 + index * 0.1}s`,
      }}
      onMouseMove={isLive ? handleMouseMove : undefined}
      {...linkProps}
    >
      <span className={`card-status ${isLive ? 'status-live' : 'status-soon'}`}>
        {isLive ? 'En vivo' : 'Próximamente'}
      </span>
      {hidden && <span className="card-hidden-badge">Oculta</span>}

      <div className="card-icon">{app.icon}</div>

      <div className="card-body">
        <h2>{app.name}</h2>
        <p>{app.description}</p>
      </div>

      <span className="card-cta" style={{ color: app.color, opacity: isLive ? 1 : 0.5 }}>
        {isLive ? (app.ctaLabel ?? 'Abrir aplicación') : 'En desarrollo'}
        {isLive ? <ArrowRight /> : <Plus />}
      </span>

      <div
        className="card-line"
        style={{ background: `linear-gradient(90deg, transparent, ${app.color}, transparent)` }}
      />
    </Tag>
  )
}
