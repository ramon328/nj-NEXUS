import { useState, useEffect } from 'react'
import ParticleCanvas from './components/ParticleCanvas'
import Header from './components/Header'
import Hero from './components/Hero'
import StatsBar from './components/StatsBar'
import AppCard from './components/AppCard'
import FolderCard from './components/FolderCard'
import LoginScreen from './components/LoginScreen'
import AdminPanel from './components/admin/AdminPanel'
import AccountPanel from './components/account/AccountPanel'
import RamonSection, { canAccessRamon } from './components/ramon/RamonSection'
import ProjectInfoSection from './components/info/ProjectInfoSection'
import ChatCobranza from './components/admin/ChatCobranza'
import ChatBubble from './components/agent/ChatBubble'
import PrivacyPolicy from './components/legal/PrivacyPolicy'
import TermsOfService from './components/legal/TermsOfService'
import { apps } from './data/apps'
import { useAuth } from './auth/useAuth'
import { usePermissions } from './auth/usePermissions'
import { useHiddenApps } from './auth/useHiddenApps'

export default function App() {
  const { authed, login, logout, user, loading } = useAuth()
  const { isAdmin, allowedAppIds, loading: permsLoading } = usePermissions(user?.id, user?.email)
  const { hiddenIds, loading: hiddenLoading, refresh: refreshHidden } = useHiddenApps()
  const [view, setView] = useState('hub')
  const [ramonTab, setRamonTab] = useState('calendario')
  // Rutas legales con URL real (nicojuri.ai/privacidad, /terminos).
  // Usamos la History API porque la app no tiene router.
  const [path, setPath] = useState(() => window.location.pathname)
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname)
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])
  const navigate = to => {
    window.history.pushState({}, '', to)
    setPath(to)
  }

  // Las páginas legales son públicas (sin login): los portales de verificación
  // de apps deben poder abrirlas directamente. Por eso van antes del auth gate.
  if (path === '/privacidad') return <PrivacyPolicy onBack={() => navigate('/')} />
  if (path === '/terminos') return <TermsOfService onBack={() => navigate('/')} />

  if (loading) return <div className="auth-loading" />
  if (!authed) return <LoginScreen onLogin={login} />
  if (view === 'admin') return <AdminPanel user={user} isAdmin={isAdmin} onHiddenChange={refreshHidden} onClose={() => setView('hub')} />
  if (view === 'account') return <AccountPanel user={user} onClose={() => setView('hub')} />
  if (view === 'info' && isAdmin) return <ProjectInfoSection user={user} onClose={() => setView('hub')} />
  if (view === 'chat' && isAdmin) return <ChatCobranza onClose={() => setView('hub')} />
  if (view === 'ramon' && canAccessRamon(user?.email)) {
    return <RamonSection user={user} isAdmin={isAdmin} initialTab={ramonTab} onClose={() => setView('hub')} />
  }

  // Apps visibles: admin ve todo, usuarios solo sus apps asignadas.
  // Las apps "Próximamente" solo las ven los admins (Nico y Ramón).
  // Las apps con `ramonOnly` o con acción interna al apartado Ramón solo las
  // ven njuri/ramon.
  const isAppVisible = app => {
    if (app.ramonOnly) return canAccessRamon(user?.email)
    if (app.action === 'ramon-avance') return canAccessRamon(user?.email)
    return app.status === 'live'
      ? allowedAppIds === null || allowedAppIds.includes(app.id)
      : isAdmin
  }

  // Tarjetas ocultadas por un admin: invisibles para los usuarios;
  // los admins las siguen viendo (atenuadas) para poder volver a mostrarlas.
  // Las carpetas se muestran solo si el usuario puede ver al menos una app interna.
  const visibleApps = apps
    .map(app => {
      const hidden = hiddenIds.includes(app.id)
      if (hidden && !isAdmin) return null
      if (app.type === 'folder') {
        const children = app.children.filter(isAppVisible)
        return children.length ? { ...app, children, _hidden: hidden } : null
      }
      return isAppVisible(app) ? { ...app, _hidden: hidden } : null
    })
    .filter(Boolean)

  function handleCardAction(action) {
    if (action === 'ramon-avance' && canAccessRamon(user?.email)) {
      setRamonTab('avance')
      setView('ramon')
    }
  }

  return (
    <>
      <ParticleCanvas />
      <Header
        isAdmin={isAdmin}
        showRamon={canAccessRamon(user?.email)}
        onInfoClick={() => setView('info')}
        onChatClick={() => setView('chat')}
        onAdminClick={() => setView('admin')}
        onAccountClick={() => setView('account')}
        onRamonClick={() => { setRamonTab('calendario'); setView('ramon') }}
        onLogout={logout}
      />
      <main>
        <div className="wrapper">
          <Hero />
        </div>
        <div className="wrapper">
          <StatsBar apps={visibleApps} />
        </div>
        <div className="wrapper">
          {(permsLoading || hiddenLoading) ? null : (
            <div className="apps-grid" id="apps">
              {visibleApps.map((app, i) =>
                app.type === 'folder' ? (
                  <FolderCard key={app.id} app={app} index={i} onAction={handleCardAction} hidden={app._hidden} />
                ) : (
                  <AppCard key={app.id} app={app} index={i} onAction={handleCardAction} hidden={app._hidden} />
                )
              )}
            </div>
          )}
        </div>
      </main>
      <footer className="footer">
        <p>
          Construido por <strong>Nicojuri</strong> &mdash; Suite de aplicaciones empresariales &copy; 2026
        </p>
        <div className="footer-links">
          <button type="button" className="footer-link" onClick={() => navigate('/privacidad')}>
            Política de Privacidad
          </button>
          <span className="footer-sep">·</span>
          <button type="button" className="footer-link" onClick={() => navigate('/terminos')}>
            Condiciones del Servicio
          </button>
        </div>
      </footer>
      <ChatBubble user={user} isAdmin={isAdmin} />
    </>
  )
}
