export default function Header({ isAdmin, showRamon, onInfoClick, onChatClick, onAdminClick, onAccountClick, onRamonClick, onLogout }) {
  return (
    <header className="header">
      <div className="logo">
        Forja<span className="logo-accent"> · Nicojuri</span>
      </div>
      <nav className="nav">
        <a href="#apps" className="nav-link">Aplicaciones</a>
        <a href="https://ailnest.vercel.app/" target="_blank" rel="noopener" className="nav-link">Ailnest</a>
        <a href="https://aliace-customer-portal.vercel.app/" target="_blank" rel="noopener" className="nav-link">Aliace</a>
      </nav>
      <div className="header-actions">
        {isAdmin && (
          <button className="header-icon-btn" onClick={onInfoClick} title="Información de Proyectos">
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            </svg>
            <span>Información</span>
          </button>
        )}
        {isAdmin && (
          <button className="header-icon-btn" onClick={onChatClick} title="Chats de cobranza de Nexus con clientes">
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <span>Chat</span>
          </button>
        )}
        {showRamon && (
          <button className="header-icon-btn" onClick={onRamonClick} title="Calendario Ramón / Avance">
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
            </svg>
            <span>Ramón</span>
          </button>
        )}
        <button className="header-icon-btn" onClick={onAccountClick} title="Mi cuenta">
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"/><circle cx="12" cy="10" r="3"/><path d="M6.5 19a6 6 0 0 1 11 0"/>
          </svg>
          <span>Mi cuenta</span>
        </button>
        {isAdmin && (
          <button className="header-icon-btn" onClick={onAdminClick} title="Panel de administración">
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
            </svg>
            <span>Admin</span>
          </button>
        )}
        <button className="header-icon-btn muted" onClick={onLogout} title="Cerrar sesión">
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
        </button>
      </div>
    </header>
  )
}
