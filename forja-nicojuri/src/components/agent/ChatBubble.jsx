import { useState, useRef, useEffect } from 'react'
import { runAgent, hasApiKey } from './anthropic'
import MessageContent from './MessageContent'
import './chatBubble.css'

// Burbuja de chat flotante con el agente Forjita.
// Lectura para todos; acciones (escritura) solo si isAdmin.
export default function ChatBubble({ user, isAdmin }) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  // Mensajes visibles en pantalla: { role: 'user'|'assistant', text }
  const [chat, setChat] = useState([{
    role: 'assistant',
    text: isAdmin
      ? '¡Hola! Soy Forjita 🤖 Puedo ayudarte a gestionar usuarios (listarlos y crear cuentas con acceso a apps) y responder tus dudas. ¿Qué necesitas?'
      : '¡Hola! Soy Forjita 🤖 ¿En qué te puedo ayudar?',
  }])
  // Historial en formato Anthropic (incluye turnos de herramientas)
  const historyRef = useRef([])
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  const today = new Date().toISOString().slice(0, 10)
  const userName = user?.user_metadata?.name || user?.email?.split('@')[0]

  useEffect(() => {
    if (open) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
      inputRef.current?.focus()
    }
  }, [chat, open])

  const send = async () => {
    const text = input.trim()
    if (!text || busy) return

    if (!hasApiKey()) {
      setChat(c => [...c, { role: 'user', text }, {
        role: 'assistant',
        text: 'Falta configurar la clave de IA. Agrega VITE_ANTHROPIC_API_KEY en tu archivo .env y reinicia el servidor.',
      }])
      setInput('')
      return
    }

    setInput('')
    setChat(c => [...c, { role: 'user', text }])
    setBusy(true)

    historyRef.current.push({ role: 'user', content: text })
    try {
      const { reply, messages } = await runAgent({
        history: historyRef.current, isAdmin, userName, today,
      })
      historyRef.current = messages
      setChat(c => [...c, { role: 'assistant', text: reply }])
    } catch (e) {
      setChat(c => [...c, { role: 'assistant', text: `Ups, algo falló: ${e.message}` }])
    } finally {
      setBusy(false)
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div className="fj-agent">
      {open && (
        <div className="fj-agent-panel" role="dialog" aria-label="Asistente Forjita">
          <div className="fj-agent-head">
            <div className="fj-agent-head-id">
              <span className="fj-agent-avatar">🤖</span>
              <div>
                <strong>Forjita</strong>
                <span className="fj-agent-sub">{isAdmin ? 'Asistente · acciones habilitadas' : 'Asistente · solo consulta'}</span>
              </div>
            </div>
            <button className="fj-agent-x" onClick={() => setOpen(false)} aria-label="Cerrar">✕</button>
          </div>

          <div className="fj-agent-body" ref={scrollRef}>
            {chat.map((m, i) => (
              <div key={i} className={`fj-msg ${m.role}`}>
                {m.role === 'assistant'
                  ? <MessageContent text={m.text} />
                  : m.text.split('\n').map((line, j) => <p key={j}>{line || ' '}</p>)}
              </div>
            ))}
            {busy && (
              <div className="fj-msg assistant">
                <p className="fj-typing"><span /><span /><span /></p>
              </div>
            )}
          </div>

          <div className="fj-agent-input">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Escribe tu mensaje..."
              disabled={busy}
            />
            <button onClick={send} disabled={busy || !input.trim()} aria-label="Enviar">↑</button>
          </div>
        </div>
      )}

      <button
        className={`fj-agent-fab ${open ? 'is-open' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Cerrar asistente' : 'Abrir asistente'}
      >
        {open ? '✕' : '🤖'}
      </button>
    </div>
  )
}
