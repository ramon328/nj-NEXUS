import { useState, useRef, useEffect } from 'react'

export default function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('')
  const [pass, setPass]   = useState('')
  const [err, setErr]     = useState(null)
  const [shake, setShake] = useState(false)
  const emailRef = useRef(null)

  useEffect(() => { emailRef.current?.focus() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const result = await onLogin(email, pass)
    if (result !== true) {
      setErr(result || 'Credenciales incorrectas')
      setShake(true)
      setPass('')
      setTimeout(() => setShake(false), 600)
    }
  }

  return (
    <div className="login-overlay">
      <div className={`login-card ${shake ? 'shake' : ''}`}>
        <div className="login-logo">
          Forja<span className="logo-accent"> · Nicojuri</span>
        </div>
        <p className="login-sub">Acceso restringido — identificación requerida</p>

        <form onSubmit={handleSubmit} className="login-form" autoComplete="off">
          <div className="login-field">
            <label>Correo</label>
            <input
              ref={emailRef}
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setErr(false) }}
              placeholder="correo@dominio.com"
              spellCheck={false}
              autoComplete="off"
            />
          </div>

          <div className="login-field">
            <label>Contraseña</label>
            <input
              type="password"
              value={pass}
              onChange={e => { setPass(e.target.value); setErr(null) }}
              placeholder="••••••••••"
              autoComplete="new-password"
            />
          </div>

          {err && <p className="login-err">{err}</p>}

          <button type="submit" className="login-btn">
            Ingresar
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </form>
      </div>
    </div>
  )
}
