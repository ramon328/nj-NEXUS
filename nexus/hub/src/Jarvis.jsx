import React, { useEffect, useRef, useState } from 'react'
import './jarvis.css'

const EJEMPLOS = [
  '¿Cuáles son las 10 oportunidades más recientes?',
  '¿Cuántos productos de la competencia seguimos?',
  'Busca en el segundo cerebro lo que sepamos del F29',
]

// Identidad de admin (igual que VistaGeneral): habilita todos los accesos
// (cerebro, aliace, etc.). Sin esto, el chat sería usuario anónimo sin permisos.
const ADMIN_NUM = '+56932945240'

// Cómo se ve cada subagente cuando está trabajando (indicador en vivo).
const AGENTE_UI = {
  Cerebro:   { emoji: '🧠', label: 'Consultando el Segundo Cerebro', clase: 'cerebro' },
  Ali:       { emoji: '📊', label: 'Consultando a Ali (Aliace)', clase: 'ali' },
  Meme:      { emoji: '🚗', label: 'Consultando a Meme (autos)', clase: 'meme' },
  Néstor:    { emoji: '📧', label: 'Revisando el correo con Néstor', clase: 'nestor' },
  Martes:    { emoji: '🧾', label: 'Consultando el SII con Martes', clase: 'martes' },
  SAI:       { emoji: '🔗', label: 'Conciliando con SAI', clase: 'sai' },
  Navegador: { emoji: '🌐', label: 'Navegando la web', clase: 'nav' },
  Nexus:     { emoji: '⚙️', label: 'Procesando', clase: 'nexus' },
}
const uiAgente = (a) => AGENTE_UI[a] || AGENTE_UI.Nexus

export default function Jarvis() {
  const [msgs, setMsgs] = useState([])
  const [texto, setTexto] = useState('')
  const [pensando, setPensando] = useState(false)
  const [actividad, setActividad] = useState(null)   // { agente } del tool en curso
  const [parcial, setParcial] = useState('')         // texto que va llegando en vivo
  const [error, setError] = useState(null)
  const finRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    document.body.classList.add('jarvis-body')
    document.title = 'NEXUS · Jarvis'
    inputRef.current?.focus()
    return () => document.body.classList.remove('jarvis-body')
  }, [])

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, pensando, actividad, parcial])

  const enviar = async (e) => {
    e?.preventDefault()
    const pregunta = texto.trim()
    if (!pregunta || pensando) return
    setError(null)
    const historial = [...msgs, { role: 'user', content: pregunta }]
    setMsgs(historial)
    setTexto('')
    setPensando(true)
    setActividad(null)
    setParcial('')

    let acumulado = ''
    let toolsUsadas = []
    let replyFinal = ''
    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ historial, stream: true, de: ADMIN_NUM, web: true }),
      })
      if (!r.ok || !r.body) throw new Error('HTTP ' + r.status)

      const reader = r.body.getReader()
      const dec = new TextDecoder()
      let buf = ''
      let cerrado = false
      while (!cerrado) {
        const { value, done } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const bloques = buf.split('\n\n')
        buf = bloques.pop() || ''
        for (const bloque of bloques) {
          const linea = bloque.split('\n').find((l) => l.startsWith('data: '))
          if (!linea) continue
          let o
          try { o = JSON.parse(linea.slice(6)) } catch { continue }
          if (o.t === 'delta') {
            acumulado += o.text
            setParcial(acumulado)
            setActividad(null)          // ya está escribiendo → oculta el indicador de tool
          } else if (o.t === 'tool') {
            if (o.nombre) toolsUsadas.push(o.nombre)
            setActividad({ agente: o.agente })
          } else if (o.t === 'done') {
            replyFinal = o.reply || acumulado
            if (Array.isArray(o.herramientas) && o.herramientas.length) toolsUsadas = o.herramientas
            cerrado = true
          } else if (o.t === 'error') {
            throw new Error(o.error || 'error del asistente')
          }
        }
      }
      setMsgs([...historial, { role: 'assistant', content: replyFinal || acumulado || 'Listo.', tools: toolsUsadas }])
    } catch {
      setError('No pude conectar con Nexus. Reintenta en unos segundos.')
      setMsgs([...historial, { role: 'assistant', content: 'No pude conectar con el asistente.' }])
    }
    setPensando(false)
    setActividad(null)
    setParcial('')
    inputRef.current?.focus()
  }

  return (
    <div className="jarvis">
      <header className="j-head">
        <div className="j-orb" aria-hidden="true">
          <span className="ring r1" />
          <span className="ring r2" />
          <span className="core" />
        </div>
        <div className="j-title">
          <div className="name">NEXUS</div>
          <div className="tag">asistente del negocio</div>
        </div>
        <div className={`j-status ${pensando ? 'busy' : ''}`}>
          <span className="led" />
          {pensando ? 'procesando' : 'en línea'}
        </div>
      </header>

      <div className="j-msgs">
        {msgs.length === 0 && !pensando && (
          <div className="j-empty">
            <div className="hi">Hola Ramón. Soy Nexus.</div>
            <div>Pregúntame lo que sea del negocio en lenguaje natural.</div>
            <div className="j-chips">
              {EJEMPLOS.map((ej, i) => (
                <button key={i} onClick={() => { setTexto(ej); inputRef.current?.focus() }}>{ej}</button>
              ))}
            </div>
          </div>
        )}

        {msgs.map((m, i) => (
          <div className={`j-row ${m.role}`} key={i}>
            <div className="j-who">{m.role === 'user' ? 'Tú' : 'Nexus'}</div>
            <div className="j-bubble">{m.content}</div>
            {m.tools?.length > 0 && (
              <div className="j-tools">
                {m.tools.map((t, j) => <span className="j-tool" key={j}>{t}</span>)}
              </div>
            )}
          </div>
        ))}

        {pensando && (
          <div className="j-row assistant">
            <div className="j-who">Nexus</div>
            <div className="j-bubble">
              {actividad ? (
                // Indicador EN VIVO del subagente en uso (ej. Segundo Cerebro).
                <div className={`j-agente ${uiAgente(actividad.agente).clase}`}>
                  <span className="j-agente-icon">{uiAgente(actividad.agente).emoji}</span>
                  <span className="j-agente-txt">{uiAgente(actividad.agente).label}</span>
                  <span className="j-agente-dots"><i /><i /><i /></span>
                </div>
              ) : parcial ? (
                // Ya está redactando: mostramos el texto en vivo.
                <span>{parcial}<span className="j-caret" /></span>
              ) : (
                <div className="j-thinking">
                  <span className="dots"><i /><i /><i /></span>
                  <span className="lbl">pensando…</span>
                </div>
              )}
            </div>
          </div>
        )}

        {error && <div className="j-error">{error}</div>}
        <div ref={finRef} />
      </div>

      <form className="j-form" onSubmit={enviar}>
        <div className="j-input-wrap">
          <input
            ref={inputRef}
            className="j-input"
            placeholder="Escribe tu mensaje…"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
        </div>
        <button className="j-send" type="submit" disabled={pensando || !texto.trim()}>
          Enviar
        </button>
      </form>
    </div>
  )
}
