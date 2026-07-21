import React, { useEffect, useState, useCallback } from 'react'

const AGENTES_BASE = ['Nestor', 'Autos Intel', '2cerebro']

function useFetch(url, intervalMs) {
  const [data, setData] = useState(null)
  const [err, setErr] = useState(null)
  const load = useCallback(async () => {
    if (!url) return
    try {
      const r = await fetch(url)
      setData(await r.json()); setErr(null)
    } catch (e) { setErr(e.message) }
  }, [url])
  useEffect(() => {
    if (!url) return
    load()
    if (!intervalMs) return
    const t = setInterval(load, intervalMs)
    return () => clearInterval(t)
  }, [load, intervalMs, url])
  return { data, err, reload: load }
}

function Dot({ activo, pendiente }) {
  const cls = pendiente ? 'wait' : (activo ? 'on' : 'off')
  return <span className={`dot ${cls}`} />
}

function Tarjeta({ s, onRestart, reiniciando }) {
  const pendiente = s.desplegado === false
  const estado = pendiente ? 'pendiente' : (s.activo ? 'activo' : 'caído')
  return (
    <div className="card">
      <div className="card-head">
        <span className="svc-name"><Dot activo={s.activo} pendiente={pendiente} />{s.nombre}</span>
        <span className="estado-txt">{estado}</span>
      </div>
      <div className="meta">
        <div className="row"><span className="k">Puerto</span><span className="v">:{s.puerto}</span></div>
        <div className="row"><span className="k">Daemon</span><span className="v">{pendiente ? 'sin repo' : (s.cargado ? 'cargado' : 'no cargado')}</span></div>
        <div className="row"><span className="k">Uptime</span><span className="v">{s.uptime || '—'}</span></div>
        <div className="row"><span className="k">PID</span><span className="v">{s.pid || '—'}</span></div>
      </div>
      <button className="btn" disabled={reiniciando || pendiente} onClick={() => onRestart(s.label)}>
        {pendiente ? 'no desplegado' : (reiniciando ? 'reiniciando…' : 'Reiniciar')}
      </button>
    </div>
  )
}

function SegundoCerebro() {
  const { data: estado } = useFetch('/api/cerebro/estado', 20000)
  const [q, setQ] = useState('')
  const [res, setRes] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [abierta, setAbierta] = useState(null) // { ruta, contenido }

  const buscar = useCallback(async (e) => {
    e?.preventDefault()
    const term = q.trim()
    if (!term) { setRes(null); return }
    setCargando(true); setAbierta(null)
    try {
      const r = await fetch(`/api/cerebro/buscar?q=${encodeURIComponent(term)}`)
      setRes(await r.json())
    } catch { setRes({ error: 'No se pudo consultar el cerebro', resultados: [] }) }
    setCargando(false)
  }, [q])

  const abrir = async (ruta) => {
    if (abierta?.ruta === ruta) { setAbierta(null); return }
    try {
      const r = await fetch(`/api/cerebro/nota?ruta=${encodeURIComponent(ruta)}`)
      setAbierta(await r.json())
    } catch { setAbierta({ ruta, contenido: '(no se pudo leer la nota)' }) }
  }

  const fmtFecha = (ms) => ms ? new Date(ms).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' }) : '—'
  const fmtKb = (b) => b ? `${Math.round(b / 1024)} KB` : ''
  const activo = estado?.activo

  return (
    <div className="panel-box">
      <div className="cerebro-estado">
        <div className="cerebro-stats">
          <span className="cerebro-stat">
            <Dot activo={!!activo} />
            <b>{estado ? (activo ? 'Activo' : 'Caído') : '…'}</b>
          </span>
          <span className="cerebro-stat"><span className="big">{estado?.notas ?? '—'}</span> <span className="lbl">notas</span></span>
          <span className="cerebro-stat"><span className="lbl">última actualización</span> {fmtFecha(estado?.ultima)}</span>
        </div>
        {(estado?.recientes || []).length > 0 && (
          <div className="cerebro-recientes">
            <div className="cerebro-recientes-tit">Notas recientes</div>
            {estado.recientes.map((n, i) => (
              <div className="li li-nota" key={i} onClick={() => abrir(n.ruta)} style={{ cursor: 'pointer' }}>
                <span><span className="agent-name">📄 {n.titulo}</span> <span className="ruta-mini">{fmtKb(n.bytes)}</span></span>
                <span className="when">{fmtFecha(n.modificado)}</span>
              </div>
            ))}
            {abierta && estado.recientes.some((n) => n.ruta === abierta.ruta) && (
              <pre className="nota-cuerpo">{abierta.contenido}</pre>
            )}
          </div>
        )}
      </div>
      <form className="cerebro-buscar" onSubmit={buscar}>
        <input
          className="cerebro-input"
          placeholder="Buscar en el conocimiento… (ej: F29, stock, IMPOMIN)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="btn" type="submit" disabled={cargando}>{cargando ? 'Buscando…' : 'Buscar'}</button>
      </form>
      {res?.error && <div className="aviso">{res.error}</div>}
      {res && !res.error && (
        <div className="cerebro-res">
          {res.total === 0 && <div className="aviso">Sin resultados para “{res.q}”. Escribe la nota en Obsidian y vuelve a buscar.</div>}
          {(res.resultados || []).map((n, i) => (
            <div className="li-nota" key={i}>
              <div className="li" onClick={() => abrir(n.ruta)} style={{ cursor: 'pointer' }}>
                <span><span className="agent-name">📄 {n.titulo}</span> <span className="ruta-mini">{n.ruta}</span></span>
                <span className="when">{abierta?.ruta === n.ruta ? '▲' : '▼'}</span>
              </div>
              {abierta?.ruta !== n.ruta && <div className="frag">{n.fragmento}</div>}
              {abierta?.ruta === n.ruta && <pre className="nota-cuerpo">{abierta.contenido}</pre>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function BaseDatos() {
  const { data: cat } = useFetch('/api/datos/tablas', 0)
  const [tabla, setTabla] = useState('')
  const [datos, setDatos] = useState(null)
  const [cargando, setCargando] = useState(false)

  const ver = async (nombre) => {
    setTabla(nombre); setCargando(true); setDatos(null)
    try {
      const r = await fetch(`/api/datos/tabla?nombre=${encodeURIComponent(nombre)}&limite=50`)
      setDatos(await r.json())
    } catch { setDatos({ error: 'No se pudo leer la tabla', filas: [] }) }
    setCargando(false)
  }

  if (cat && cat.configurado === false) return <div className="aviso">Supabase no configurado.</div>
  const tablas = cat?.tablas || []

  return (
    <div className="panel-box">
      <div className="db-pick">
        <select className="cerebro-input" value={tabla} onChange={(e) => e.target.value && ver(e.target.value)}>
          <option value="">Elige una tabla… ({tablas.length} disponibles)</option>
          {tablas.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      {cargando && <div className="aviso">Cargando {tabla}…</div>}
      {datos?.error && <div className="aviso">{datos.error}</div>}
      {datos && !datos.error && (
        <div className="db-view">
          <div className="db-meta">{datos.nombre}: <b>{datos.total.toLocaleString('es-CL')}</b> filas · mostrando {datos.filas.length}</div>
          <div className="db-scroll">
            <table className="db-table">
              <thead><tr>{datos.columnas.map((c) => <th key={c}>{c}</th>)}</tr></thead>
              <tbody>
                {datos.filas.map((f, i) => (
                  <tr key={i}>{datos.columnas.map((c) => <td key={c}>{fmtCelda(f[c])}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
function fmtCelda(v) {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'object') return JSON.stringify(v)
  const s = String(v)
  return s.length > 80 ? s.slice(0, 80) + '…' : s
}

function Enlaces() {
  const { data } = useFetch('/api/enlaces', 0)
  const grupos = data?.grupos || []
  if (data && data.configurado === false) {
    return <div className="aviso">No se pudo leer enlaces.json — revisa ~/nexus/enlaces.json</div>
  }
  return (
    <>
      {grupos.map((g) => (
        <div className="enlace-grupo" key={g.id}>
          <div className="enlace-grupo-tit">{g.titulo}</div>
          <div className="chips">
            {(g.enlaces || []).map((e, i) => (
              e.pendiente
                ? <span className="chip chip-pend" key={i} title={e.nota || 'Pendiente: edita enlaces.json'}>{e.nombre} ·</span>
                : <a className="chip" key={i} href={e.url} target="_blank" rel="noreferrer" title={e.nota || ''}>{e.nombre} ↗</a>
            ))}
          </div>
        </div>
      ))}
    </>
  )
}

const CANALES_OPC = [['whatsapp', '💬 WhatsApp'], ['sms', '📩 SMS'], ['correo', '✉️ Correo'], ['telefono', '📞 Llamada'], ['llamada', '📲 Telegram']]
function EnviarMensaje({ onEnviado }) {
  const [canales, setCanales] = useState(['whatsapp'])   // multi-canal
  const [destino, setDestino] = useState('')             // número (ws/sms/llamada/telefono)
  const [correoDest, setCorreoDest] = useState('')       // email (correo) — campo aparte
  const [asunto, setAsunto] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [cuando, setCuando] = useState('ahora')   // 'ahora' | minutos
  const [veces, setVeces] = useState(1)           // cuántas veces repetir el mensaje
  const [intervalo, setIntervalo] = useState(1)   // cada cuántos minutos
  const [estado, setEstado] = useState(null)
  const [enviando, setEnviando] = useState(false)

  const toggle = (c) => setCanales((cs) => cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c])

  const enviar = async (e) => {
    e.preventDefault()
    if (!canales.length) { setEstado({ ok: false, msg: 'Elige al menos un canal.' }); return }
    const hayNum = canales.some((c) => c !== 'correo')
    if (hayNum && !destino.trim()) { setEstado({ ok: false, msg: 'Falta el número de destino.' }); return }
    if (canales.includes('correo') && !correoDest.trim()) { setEstado({ ok: false, msg: 'Falta el correo de destino.' }); return }
    if (!mensaje.trim()) { setEstado({ ok: false, msg: 'Falta el mensaje.' }); return }
    setEnviando(true); setEstado(null)
    const n = Math.max(1, Math.min(50, Number(veces) || 1))
    const cada = Math.max(1, Number(intervalo) || 1)
    const comun = { mensaje: mensaje.trim() }
    if (cuando === 'ahora') comun.en_segundos = 2; else comun.en_minutos = Number(cuando)
    if (n > 1) { comun.repeticiones = n; comun.intervalo_min = cada }
    const oks = [], errs = []
    for (const canal of canales) {     // un envío por cada canal elegido (correo usa su propio email)
      const body = { ...comun, canal, destino: (canal === 'correo' ? correoDest : destino).trim() }
      if (canal === 'correo') body.asunto = asunto.trim() || 'Mensaje de Nexus'
      try {
        const r = await fetch('/api/recordatorios', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        const j = await r.json()
        if (j.ok) oks.push(canal); else errs.push(`${canal}: ${j.error || 'falló'}`)
      } catch (err) { errs.push(`${canal}: ${err.message}`) }
    }
    if (oks.length) {
      const base = cuando === 'ahora' ? 'Enviando ahora' : `Programado en ${cuando} min`
      setEstado({ ok: errs.length === 0, msg: `${base} por ${oks.join(', ')}${n > 1 ? ` · ${n}x c/${cada}min` : ''} ✅${errs.length ? ` · errores: ${errs.join('; ')}` : ''}` })
      setMensaje('')
      if (onEnviado) setTimeout(onEnviado, 3000)
    } else setEstado({ ok: false, msg: errs.join('; ') || 'No se pudo enviar.' })
    setEnviando(false)
  }

  return (
    <form className="enviar-box" onSubmit={enviar}>
      <div className="enviar-fila" style={{ flexWrap: 'wrap', gap: 8 }}>
        {CANALES_OPC.map(([c, etq]) => (
          <label key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 11px', borderRadius: 9, border: '1px solid ' + (canales.includes(c) ? '#2563eb' : '#333'), background: canales.includes(c) ? '#1e3a8a' : '#161616', color: '#e6e6e6', cursor: 'pointer', fontSize: 13 }}>
            <input type="checkbox" checked={canales.includes(c)} onChange={() => toggle(c)} style={{ accentColor: '#2563eb' }} /> {etq}
          </label>
        ))}
      </div>
      <div className="enviar-fila">
        {canales.some((c) => c !== 'correo') && (
          <input className="cerebro-input" placeholder="📱 +56 9 1234 5678" value={destino} onChange={(e) => setDestino(e.target.value)} />
        )}
        <select className="cerebro-input" value={cuando} onChange={(e) => setCuando(e.target.value)} title="Cuándo enviarlo">
          <option value="ahora">Ahora</option>
          <option value="1">en 1 min</option>
          <option value="5">en 5 min</option>
          <option value="30">en 30 min</option>
          <option value="60">en 1 hora</option>
          <option value="1440">en 1 día</option>
        </select>
      </div>
      <div className="enviar-fila" style={{ alignItems: 'center', gap: 8, fontSize: 13, color: '#9ca3af' }}>
        <span>🔁 Repetir</span>
        <input className="cerebro-input" type="number" min="1" max="50" value={veces} onChange={(e) => setVeces(e.target.value)} style={{ width: 70 }} title="Cuántas veces enviar el mensaje" />
        <span>veces</span>
        {Number(veces) > 1 && (<>
          <span>· cada</span>
          <input className="cerebro-input" type="number" min="1" value={intervalo} onChange={(e) => setIntervalo(e.target.value)} style={{ width: 70 }} title="Minutos entre cada envío" />
          <span>min</span>
        </>)}
      </div>
      {canales.includes('correo') && (<>
        <input className="cerebro-input" type="email" placeholder="✉️ Correo de destino (correo@…)" value={correoDest} onChange={(e) => setCorreoDest(e.target.value)} />
        <input className="cerebro-input" placeholder="Asunto del correo" value={asunto} onChange={(e) => setAsunto(e.target.value)} />
      </>)}
      <textarea className="cerebro-input enviar-msg" placeholder="Escribe el mensaje…" value={mensaje} onChange={(e) => setMensaje(e.target.value)} rows={3} />
      <div className="enviar-fila">
        <button className="btn" type="submit" disabled={enviando}>{enviando ? 'Enviando…' : 'Enviar mensaje'}</button>
        {estado && <span className={estado.ok ? 'enviar-ok' : 'enviar-err'}>{estado.msg}</span>}
      </div>
    </form>
  )
}

const LOTE_CANALES = [['whatsapp', '💬 WhatsApp'], ['sms', '📩 SMS'], ['correo', '✉️ Correo'], ['telefono', '📞 Llamada'], ['llamada', '📲 Telegram']]
function ConfigLotes() {
  const [cfg, setCfg] = useState(null)
  const [rec, setRec] = useState(null)
  const [msg, setMsg] = useState('')
  useEffect(() => { fetch('/api/throttle').then((r) => r.json()).then((j) => { if (j.ok) { setCfg(j.throttle); setRec(j.recomendado) } }).catch(() => {}) }, [])
  if (!cfg || !rec) return null
  const guardar = async (canal) => {
    setMsg('')
    const v = cfg[canal]
    const j = await fetch('/api/throttle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ canal, lote: v.lote, pausa_min: v.pausa_min }) }).then((r) => r.json()).catch((e) => ({ ok: false, error: e.message }))
    if (j.ok) { setCfg(j.throttle); setMsg(`${canal} guardado ✅`) } else setMsg(j.error || 'Error')
  }
  return (
    <details className="enviar-box" style={{ marginTop: 8 }}>
      <summary style={{ cursor: 'pointer', fontSize: 13, color: '#9ca3af' }}>⚙️ Configurar envío por lotes (anti-saturación / anti-ban){msg && <span style={{ color: '#22c55e' }}> · {msg}</span>}</summary>
      <div style={{ fontSize: 12, color: '#777', margin: '6px 0 4px' }}>Cada canal manda un <b>lote</b> de mensajes y luego <b>pausa</b> esos minutos antes del siguiente. WhatsApp es fijo (anti-ban 🔒). En los demás, si te pasas del óptimo se marca en <span style={{ color: '#ef4444' }}>rojo</span>.</div>
      {LOTE_CANALES.map(([c, etq]) => {
        const v = cfg[c], r = rec[c]; if (!v || !r) return null
        const fijo = r.fijo
        const loteMal = !fijo && Number(v.lote) > r.lote_max
        const pausaMal = !fijo && Number(v.pausa_min) < r.pausa_rec
        const setL = (campo, val) => setCfg((cs) => ({ ...cs, [c]: { ...cs[c], [campo]: val } }))
        const st = (mal) => ({ width: 64, marginLeft: 4, borderColor: mal ? '#ef4444' : '#333', color: mal ? '#fca5a5' : '#fff' })
        return (
          <div key={c} style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, padding: '7px 0', borderTop: '1px solid #222', fontSize: 13 }}>
            <span style={{ width: 120 }}>{etq}{fijo ? ' 🔒' : ''}</span>
            <span>Lote</span>
            <input className="cerebro-input" type="number" min="1" value={v.lote} disabled={fijo} onChange={(e) => setL('lote', e.target.value)} style={st(loteMal)} />
            <span>· pausa</span>
            <input className="cerebro-input" type="number" min="0" value={v.pausa_min} disabled={fijo} onChange={(e) => setL('pausa_min', e.target.value)} style={st(pausaMal)} />
            <span>min</span>
            {!fijo && <button className="btn" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => guardar(c)}>Guardar</button>}
            <span style={{ color: (loteMal || pausaMal) ? '#ef4444' : '#22c55e', fontSize: 12 }}>
              {fijo ? r.nota : ((loteMal || pausaMal) ? `⚠️ óptimo: ≤${r.lote_max} cada ≥${r.pausa_rec} min` : `✅ dentro del óptimo (≤${r.lote_max} / ≥${r.pausa_rec} min)`)}
            </span>
          </div>
        )
      })}
    </details>
  )
}

function Historial() {
  const [canal, setCanal] = useState('whatsapp')
  const [sel, setSel] = useState(null)            // {canal, contraparte} elegida
  const esChat = canal === 'whatsapp'

  const { data: convoData } = useFetch(esChat ? `/api/historial/conversaciones?canal=${canal}` : null, esChat ? 5000 : 0)
  const { data: hiloData } = useFetch(sel ? `/api/historial/hilo?canal=${encodeURIComponent(sel.canal)}&contraparte=${encodeURIComponent(sel.contraparte)}` : null, 4000)
  const { data: feedData } = useFetch(!esChat ? `/api/historial/feed?canal=${canal}` : null, !esChat ? 6000 : 0)

  const conversaciones = convoData?.conversaciones || []
  const mensajes = hiloData?.mensajes || []
  const feed = feedData?.mensajes || []
  const fmt = (ts) => ts ? new Date(ts).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' }) : ''

  return (
    <div className="hist">
      <EnviarMensaje onEnviado={() => setCanal((c) => c)} />
      <ConfigLotes />
      <div className="hist-tabs">
        {[['whatsapp', '💬 WhatsApp'], ['sms', '📩 SMS'], ['correo', '✉️ Correos'], ['telefono', '📞 Llamadas'], ['llamada', '📲 Telegram']].map(([c, etq]) => (
          <button key={c} className={`hist-tab ${canal === c ? 'on' : ''}`} onClick={() => { setCanal(c); setSel(null) }}>{etq}</button>
        ))}
      </div>

      {esChat ? (
        <div className="hist-split">
          <div className="hist-list">
            {conversaciones.length === 0 && <div className="aviso">Sin conversaciones todavía.</div>}
            {conversaciones.map((c) => (
              <button
                key={c.canal + c.contraparte}
                className={`hist-convo ${sel && sel.contraparte === c.contraparte ? 'on' : ''}`}
                onClick={() => setSel({ canal: c.canal, contraparte: c.contraparte })}
              >
                <div className="hist-convo-top">
                  <span className="hist-convo-num">{c.contraparte}</span>
                  <span className="when">{fmt(c.ultimo_ts)}</span>
                </div>
                <div className="hist-convo-prev">
                  {c.ultima_direccion === 'saliente' ? 'Nexus: ' : ''}{(c.ultimo_texto || '').slice(0, 60)}
                </div>
                <div className="hist-convo-meta">
                  <span className="badge">{c.total} msj</span>
                  {c.errores > 0 && <span className="badge err">{c.errores} error</span>}
                  {c.ultima_direccion === 'saliente' && (() => {
                    const dias = Math.floor((Date.now() - new Date(c.ultimo_ts).getTime()) / 86400000)
                    return <span className="badge" style={{ background: '#7c5c00', color: '#ffd966' }} title="El último mensaje lo envió Nexus y aún no responden">⏳ {dias >= 1 ? `sin respuesta · ${dias}d` : 'esperando respuesta'}</span>
                  })()}
                </div>
              </button>
            ))}
          </div>
          <div className="hist-chat">
            {!sel && <div className="aviso">Elige una conversación para ver el hilo.</div>}
            {sel && mensajes.length === 0 && <div className="aviso">Sin mensajes.</div>}
            {sel && mensajes.map((m) => (
              <div key={m.id} className={`burbuja ${m.direccion === 'saliente' ? 'out' : 'in'}`}>
                <div className="burbuja-quien">{m.direccion === 'saliente' ? 'Nexus' : sel.contraparte}{m.origen === 'recordatorio' ? ' · programado' : ''}</div>
                <div className="burbuja-txt">{m.texto}</div>
                <div className="burbuja-pie">
                  {fmt(m.ts)}{m.estado === 'error' ? ` · ⚠️ ${m.detalle || 'error'}` : ''}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="panel-box">
          {feed.length === 0 && <div className="aviso">Sin registros de {canal === 'correo' ? 'correo' : 'llamada'} todavía.</div>}
          {feed.map((m) => (
            <div className="li hist-feed" key={m.id}>
              <span>
                <span className="agent-name">{m.direccion === 'saliente' ? '→' : '←'} {m.contraparte}</span>{' '}
                {canal === 'correo' && m.asunto ? <b>{m.asunto}</b> : null}
                <span className="hist-feed-txt"> {(m.texto || '').slice(0, 120)}</span>
                {m.estado === 'error' && <span className="badge err"> error: {m.detalle}</span>}
              </span>
              <span className="when">{fmt(m.ts)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function App() {
  const { data: health, reload } = useFetch('/api/health', 5000)
  const { data: agents } = useFetch('/api/agents', 15000)
  const { data: log } = useFetch('/api/log', 15000)
  const { data: consumo } = useFetch('/api/consumo', 60000)
  const { data: gmail } = useFetch('/api/google/status', 10000)
  const [reiniciando, setReiniciando] = useState(null)
  const [reloj, setReloj] = useState('')

  useEffect(() => {
    const t = setInterval(() => setReloj(new Date().toLocaleTimeString('es-CL')), 1000)
    return () => clearInterval(t)
  }, [])

  const abrirChat = async () => {
    try {
      const r = await fetch('/api/openclaw-chat')
      const { url } = await r.json()
      window.open(url, '_blank', 'noreferrer')
    } catch {
      window.open('http://127.0.0.1:18789/', '_blank', 'noreferrer')
    }
  }

  const restart = async (label) => {
    setReiniciando(label)
    try { await fetch(`/api/restart/${label}`, { method: 'POST' }) } catch {}
    setTimeout(() => { setReiniciando(null); reload() }, 2500)
  }

  const servicios = health?.servicios || []
  const costoMes = (consumo?.datos || []).reduce((a, d) => a + (Number(d.costo_usd) || 0), 0)
  const tokensMes = (consumo?.datos || []).reduce((a, d) => a + (Number(d.tokens_total) || 0), 0)

  // Fusiona agentes base con datos de Supabase (si existen).
  const agentesData = agents?.datos || []
  const agentesView = AGENTES_BASE.map((n) => {
    const found = agentesData.find((a) => (a.nombre || '').toLowerCase() === n.toLowerCase())
    return found || { nombre: n, estado: 'sin datos', ultima_actividad: null }
  })

  return (
    <div className="wrap">
      <header className="top">
        <div>
          <div className="brand">Ne<span>x</span>us</div>
          <div className="sub">Centro de control · IMPOMIN · HN</div>
        </div>
        <div className="reloj">{reloj}</div>
      </header>

      <div className="jarvis-cta">
        <div className="jarvis-cta-orb" aria-hidden="true">
          <span className="ring r1" /><span className="ring r2" /><span className="core" />
        </div>
        <div className="jarvis-cta-txt">
          <div className="jarvis-cta-tit">Chat de Nexus · Jarvis</div>
          <div className="jarvis-cta-sub">Pregúntale al negocio en lenguaje natural, en su propia ventana enfocada.</div>
        </div>
        <div className="jarvis-cta-acciones">
          <button
            className="chat-btn"
            onClick={() => window.open('/chat', 'nexus-jarvis', 'width=480,height=800')}
          >
            Abrir chat de Nexus (Jarvis) ↗
          </button>
          <a className="chat-link" href="/chat" target="_blank" rel="noreferrer">o abrir en pestaña nueva</a>
          <button className="chat-link" onClick={abrirChat}>Chat avanzado de OpenClaw (WhatsApp) ↗</button>
        </div>
      </div>

      <h2 className="sec">Servicios <span className="sec-sub">· {servicios.filter((s) => s.desplegado !== false && s.activo).length}/{servicios.filter((s) => s.desplegado !== false).length} activos</span></h2>
      <div className="grid">
        {servicios.length === 0 && <div className="aviso">Cargando estado…</div>}
        {servicios.map((s) => (
          <Tarjeta key={s.id} s={s} onRestart={restart} reiniciando={reiniciando === s.label} />
        ))}
      </div>

      <h2 className="sec">Conectar cuentas</h2>
      <div className="panel-box">
        <div className="li">
          <span>
            <span className="agent-name">Gmail de Nexus</span>{' '}
            {gmail?.conectado
              ? <span className="badge">conectado{gmail.email ? ` · ${gmail.email}` : ''}</span>
              : <span className="badge">sin conectar</span>}
          </span>
          <a className="chat-link" href="/api/google/connect" target="_blank" rel="noreferrer">
            {gmail?.conectado ? 'Reconectar ↗' : 'Iniciar sesión con Google ↗'}
          </a>
        </div>
        <div className="aviso" style={{ marginTop: 8 }}>
          Inicia sesión con el Gmail de Nexus para que lea los correos de Plaud y baje los documentos al Segundo Cerebro.
        </div>
      </div>

      <h2 className="sec">Agentes</h2>
      <div className="panel-box">
        {agents && agents.configurado === false && (
          <div className="aviso">Supabase no configurado — la actividad de agentes aparecerá cuando se conecte.</div>
        )}
        {agentesView.map((a, i) => (
          <div className="li" key={i}>
            <span><span className="agent-name">{a.nombre}</span> <span className="badge">{a.estado || 'activo'}</span></span>
            <span className="when">{a.ultima_actividad ? new Date(a.ultima_actividad).toLocaleString('es-CL') : '—'}</span>
          </div>
        ))}
      </div>

      <h2 className="sec">Consumo de API · mes en curso</h2>
      <div className="panel-box">
        {consumo && consumo.configurado === false ? (
          <div className="aviso">Supabase no configurado — el consumo aparecerá cuando se registre en la tabla consumo_api.</div>
        ) : (
          <div className="costo">
            <div><div className="big">${costoMes.toFixed(2)}</div><div className="lbl">USD estimado</div></div>
            <div><div className="big">{(tokensMes / 1e6).toFixed(2)}M</div><div className="lbl">tokens</div></div>
          </div>
        )}
      </div>

      <h2 className="sec">📨 Historial de mensajes <span className="sec-sub">· chats, correos y llamadas que envía/recibe Nexus</span></h2>
      <Historial />

      <h2 className="sec">🗄️ Base de datos <span className="sec-sub">· Supabase (toda la información del negocio)</span></h2>
      <BaseDatos />

      <h2 className="sec">🧠 Segundo Cerebro <span className="sec-sub">· conocimiento empresarial (Obsidian)</span></h2>
      <SegundoCerebro />

      <h2 className="sec">Enlaces</h2>
      <Enlaces />

      <h2 className="sec">Últimas acciones (auditoría)</h2>
      <div className="panel-box">
        {log && log.configurado === false && (
          <div className="aviso">Supabase no configurado — el log de acciones aparecerá cuando se conecte.</div>
        )}
        {(log?.datos || []).length === 0 && log?.configurado && (
          <div className="aviso">Sin acciones registradas todavía.</div>
        )}
        {(log?.datos || []).map((l, i) => (
          <div className="li" key={i}>
            <span><span className="agent-name">{l.agente || '—'}</span> · {l.accion || l.descripcion || ''}</span>
            <span className="when">{l.creado_en ? new Date(l.creado_en).toLocaleString('es-CL') : ''}</span>
          </div>
        ))}
      </div>

      <div className="foot">Nexus Hub · servido localmente · {servicios.filter((s) => s.desplegado !== false && s.activo).length}/{servicios.filter((s) => s.desplegado !== false).length} servicios activos</div>
    </div>
  )
}
