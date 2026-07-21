import { useState, useEffect } from 'react'
import { supabase } from '../../auth/supabase'

// Apartado "Chat" (solo admins): muestra las conversaciones que Nexus tuvo con
// clientes de Aliace/Mallorca por cobranza (factura). Lee de Supabase:
//   cobranza_conversaciones (un hilo por cliente) + cobranza_mensajes (cada línea).
// El acceso a esos datos está gateado por RLS a admins (ver conector-cobranza/schema-rls.sql).

const ESTADO = {
  pendiente: { txt: 'Pendiente', col: '#9aa' },
  enviado: { txt: 'Enviado', col: '#00d4ff' },
  en_conversacion: { txt: 'En conversación', col: '#ffb300' },
  promesa_pago: { txt: 'Promesa de pago', col: '#ab47bc' },
  pagado: { txt: 'Pagado', col: '#00e676' },
  no_responde: { txt: 'No responde', col: '#ff7043' },
  escalado: { txt: 'Escalado', col: '#ef5350' },
  cerrado: { txt: 'Cerrado', col: '#778' },
}
const fmtMonto = (m) => (m == null ? '' : '$' + Number(m).toLocaleString('es-CL'))
const fmtFecha = (d) => (d ? new Date(d).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '')

export default function ChatCobranza({ onClose }) {
  const [convs, setConvs] = useState(null)
  const [sel, setSel] = useState(null)
  const [msgs, setMsgs] = useState([])
  const [q, setQ] = useState('')
  const [err, setErr] = useState('')
  const [cargandoMsgs, setCargandoMsgs] = useState(false)

  useEffect(() => { cargarConvs() }, [])

  async function cargarConvs() {
    setErr('')
    const { data, error } = await supabase
      .from('cobranza_conversaciones')
      .select('id,cliente_nombre,telefono,factura,monto,estado,ultimo_mensaje_en,created_at')
      .order('ultimo_mensaje_en', { ascending: false, nullsFirst: false })
      .limit(500)
    if (error) setErr(error.message)
    else setConvs(data || [])
  }

  async function abrir(c) {
    setSel(c); setMsgs([]); setCargandoMsgs(true)
    const { data, error } = await supabase
      .from('cobranza_mensajes')
      .select('rol,texto,creado_en')
      .eq('conversacion_id', c.id)
      .order('creado_en', { ascending: true })
    if (!error) setMsgs(data || [])
    setCargandoMsgs(false)
  }

  const filtradas = (convs || []).filter((c) => {
    if (!q) return true
    const s = q.toLowerCase()
    return [c.cliente_nombre, c.telefono, c.factura].some((v) => String(v || '').toLowerCase().includes(s))
  })

  return (
    <div className="ap-overlay">
      <div className="ap-container">
        <div className="ap-topbar">
          <div className="ap-logo">Chat<span className="logo-accent"> · Cobranza Nexus</span></div>
          <div className="ap-tabs" />
          <button className="ap-back" onClick={onClose} title="Volver al hub">← Volver al hub</button>
        </div>

        <div className="ap-body wide">
          {err && <p className="ap-hint" style={{ color: '#ef5350' }}>No se pudieron cargar las conversaciones: {err}</p>}

          <div style={{ display: 'flex', gap: 16, alignItems: 'stretch', minHeight: 420 }}>
            {/* Lista de conversaciones */}
            <div style={{ flex: '0 0 320px', borderRight: '1px solid rgba(255,255,255,.08)', paddingRight: 12, maxHeight: '70vh', overflowY: 'auto' }}>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar cliente, teléfono o factura…"
                style={{ width: '100%', padding: '8px 10px', marginBottom: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,.15)', background: 'rgba(255,255,255,.04)', color: 'inherit' }}
              />
              {convs === null && <p className="ap-hint">Cargando…</p>}
              {convs && filtradas.length === 0 && <p className="ap-hint">Sin conversaciones todavía.</p>}
              {filtradas.map((c) => {
                const e = ESTADO[c.estado] || ESTADO.pendiente
                const act = sel?.id === c.id
                return (
                  <div
                    key={c.id}
                    onClick={() => abrir(c)}
                    style={{
                      padding: '10px 12px', marginBottom: 6, borderRadius: 10, cursor: 'pointer',
                      background: act ? 'rgba(0,212,255,.12)' : 'rgba(255,255,255,.03)',
                      border: '1px solid ' + (act ? 'rgba(0,212,255,.4)' : 'rgba(255,255,255,.06)'),
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                      <strong style={{ fontSize: 14 }}>{c.cliente_nombre || c.telefono}</strong>
                      <span style={{ fontSize: 11, color: e.col, whiteSpace: 'nowrap' }}>● {e.txt}</span>
                    </div>
                    <div style={{ fontSize: 12, opacity: .7, marginTop: 2 }}>
                      {c.factura ? `${c.factura} · ` : ''}{fmtMonto(c.monto)}
                    </div>
                    <div style={{ fontSize: 11, opacity: .5, marginTop: 2 }}>{c.telefono} · {fmtFecha(c.ultimo_mensaje_en || c.created_at)}</div>
                  </div>
                )
              })}
            </div>

            {/* Hilo del chat */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', maxHeight: '70vh' }}>
              {!sel && <p className="ap-hint" style={{ margin: 'auto' }}>Elige una conversación para ver el chat.</p>}
              {sel && (
                <>
                  <div style={{ paddingBottom: 10, borderBottom: '1px solid rgba(255,255,255,.08)', marginBottom: 10 }}>
                    <strong>{sel.cliente_nombre || sel.telefono}</strong>
                    <span style={{ opacity: .6, fontSize: 13 }}> · {sel.factura} · {fmtMonto(sel.monto)}</span>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 6 }}>
                    {cargandoMsgs && <p className="ap-hint">Cargando mensajes…</p>}
                    {!cargandoMsgs && msgs.length === 0 && <p className="ap-hint">Sin mensajes en este hilo.</p>}
                    {msgs.map((m, i) => {
                      const nexus = m.rol === 'nexus'
                      return (
                        <div key={i} style={{ alignSelf: nexus ? 'flex-end' : 'flex-start', maxWidth: '78%' }}>
                          <div style={{
                            padding: '8px 12px', borderRadius: 12, whiteSpace: 'pre-wrap', fontSize: 14,
                            background: nexus ? 'rgba(37,211,102,.18)' : 'rgba(255,255,255,.07)',
                            border: '1px solid ' + (nexus ? 'rgba(37,211,102,.35)' : 'rgba(255,255,255,.1)'),
                          }}>
                            {m.texto}
                          </div>
                          <div style={{ fontSize: 10, opacity: .45, marginTop: 2, textAlign: nexus ? 'right' : 'left' }}>
                            {nexus ? 'Nexus' : 'Cliente'} · {fmtFecha(m.creado_en)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
