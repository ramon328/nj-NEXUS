import React, { useEffect, useRef, useState, useCallback } from 'react'
import ForceGraph3D from '3d-force-graph'
import './vista.css'

// ── helpers ───────────────────────────────────────────────────────────────────
const clp = (n) => (n == null || isNaN(n))
  ? '—'
  : new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Math.round(n))
const millones = (n) => (n == null || isNaN(n)) ? '—' : '$' + (n / 1e6).toLocaleString('es-CL', { maximumFractionDigits: 1 }) + 'M'
const km = (n) => (n == null || isNaN(n)) ? '' : Number(n).toLocaleString('es-CL') + ' km'
const getJSON = async (url) => { const r = await fetch(url); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json() }
// La Vista es el panel del DUEÑO → se identifica como fundador (admin total).
const ADMIN_NUM = '+56932945240'

// Render simple de la respuesta (negritas **x**, viñetas, saltos de línea).
function lineasFmt(texto) {
  return String(texto || '').split('\n').map((linea, i) => {
    const partes = linea.split(/(\*{1,2}[^*\n]+\*{1,2})/g).map((p, j) =>
      /^\*{1,2}[^*\n]+\*{1,2}$/.test(p) ? <b key={j}>{p.replace(/^\*+|\*+$/g, '')}</b> : p)
    return <div key={i} className="vg-modal-linea">{linea.trim() ? partes : ' '}</div>
  })
}

// Gráfico de barras inline (SVG)
function BarChart({ data = [], alto = 130 }) {
  const max = Math.max(1, ...data.map((d) => d.valor || 0))
  const n = data.length || 1, ancho = 100, gap = 3
  const bw = (ancho - gap * (n - 1)) / n
  return (
    <svg className="vg-chart" viewBox={`0 0 ${ancho} ${alto}`} preserveAspectRatio="none">
      {data.map((d, i) => {
        const h = Math.max(2, ((d.valor || 0) / max) * (alto - 22))
        const x = i * (bw + gap), y = alto - h - 16, ultimo = i === data.length - 1
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw} height={h} rx="1.5" className={`vg-bar ${ultimo ? 'now' : ''}`} />
            <text x={x + bw / 2} y={alto - 4} className="vg-bar-lbl" textAnchor="middle">{d.etiqueta}</text>
          </g>
        )
      })}
    </svg>
  )
}

// ── Grafo 3D con FORMA DE CEREBRO (dos hemisferios con surcos) ───────────────────
// En vez de una bola, fijamos un destino por nodo sobre una superficie tipo corteza
// (dos elipsoides = hemisferios, con fisura central, base aplanada y arrugas). Una
// fuerza suave atrae cada nodo a su destino. Cada CARPETA = una REGIÓN del cerebro,
// así al consultar a Nexus se ilumina la zona correspondiente.
const PALETA = ['#34e1ff', '#6ef0ff', '#7aa2ff', '#b58cff', '#5ad1c0', '#49b6ff', '#a6e1ff', '#c0a8ff', '#79f0d0', '#8fb6ff']

function formaCerebro(nodes) {
  const grupos = [...new Set(nodes.map((n) => n.grupo))]
  const RX = 15, RY = 13, RZ = 21, GAP = 6.5
  // ancla (dirección sobre la esfera) por grupo → región del cerebro
  const ancla = {}
  grupos.forEach((g, i) => {
    const side = i % 2 === 0 ? -1 : 1
    const theta = 0.7 + ((i * 1.7) % 1.8)          // polar (arriba/abajo)
    const phi = (i / Math.max(1, grupos.length)) * Math.PI * 2 + (side < 0 ? 0 : 0.6)
    ancla[g] = { side, theta, phi }
  })
  const porGrupo = {}
  nodes.forEach((n) => { (porGrupo[n.grupo] = porGrupo[n.grupo] || []).push(n) })
  for (const g of grupos) {
    const a = ancla[g]
    porGrupo[g].forEach((n) => {
      const jt = a.theta + (Math.random() - 0.5) * 0.85
      const jp = a.phi + (Math.random() - 0.5) * 0.85
      const r = 0.8 + Math.random() * 0.2          // cáscara (corteza), no relleno
      let x = Math.sin(jt) * Math.cos(jp) * RX * r
      let y = Math.cos(jt) * RY * r
      let z = Math.sin(jt) * Math.sin(jp) * RZ * r
      const w = 1 + 0.07 * Math.sin(jt * 9) + 0.07 * Math.cos(jp * 9)   // surcos/giros
      x *= w; y *= w; z *= w
      x += a.side * GAP                            // fisura entre hemisferios
      if (y < 0) y *= 0.62                          // base aplanada
      n._bx = x; n._by = y; n._bz = z
    })
  }
  const colorIdx = {}
  grupos.forEach((g, i) => { colorIdx[g] = PALETA[i % PALETA.length] })
  return { colorGrupo: (g) => colorIdx[g] || '#34e1ff' }
}

function Cerebro3D({ onMeta, controllerRef }) {
  const ref = useRef(null)
  const gRef = useRef(null)
  useEffect(() => {
    let alive = true
    getJSON('/api/vista/cerebro?max=2000').then((data) => {
      if (!alive || !ref.current) return
      const nodes = data.nodes || [], links = data.links || []
      onMeta?.({ total: data.total, enlaces: data.enlaces })
      const { colorGrupo } = formaCerebro(nodes)
      const hl = new Set()
      let limpiar = null
      const colorNodo = (n) => (hl.has(n.id) ? '#fff29a' : colorGrupo(n.grupo))
      const valNodo = (n) => (hl.has(n.id) ? n.val * 2 + 6 : n.val)
      const colorLink = (l) => {
        const s = l.source?.id ?? l.source, t = l.target?.id ?? l.target
        return (hl.has(s) && hl.has(t)) ? 'rgba(255,242,154,0.55)' : 'rgba(110,240,255,0.16)'
      }
      const G = ForceGraph3D({ controlType: 'orbit' })(ref.current)
        .graphData({ nodes, links })
        .backgroundColor('rgba(0,0,0,0)')
        .nodeLabel((n) => n.titulo)
        .nodeColor(colorNodo)
        .nodeVal(valNodo)
        .nodeRelSize(2.4)
        .nodeOpacity(0.95)
        .linkColor(colorLink)
        .linkWidth(0.35)
        .linkDirectionalParticles(1)
        .linkDirectionalParticleWidth(0.55)
        .linkDirectionalParticleColor(() => '#34e1ff')
        .showNavInfo(false)
        .width(ref.current.clientWidth)
        .height(ref.current.clientHeight)
      gRef.current = G
      // Fuerza "cerebro": atrae cada nodo a su destino sobre la corteza.
      G.d3Force('brain', (alpha) => {
        const k = 0.12 * alpha
        for (const n of nodes) {
          if (n._bx == null || n.x == null) continue
          n.vx += (n._bx - n.x) * k; n.vy += (n._by - n.y) * k; n.vz += (n._bz - n.z) * k
        }
      })
      try { G.d3Force('charge').strength(-9) } catch { /* */ }
      try { G.d3Force('link').strength(0.04).distance(5) } catch { /* */ }
      try { G.d3Force('center', null) } catch { /* */ }
      try {
        const c = G.controls()
        c.autoRotate = true; c.autoRotateSpeed = 0.85; c.enableDamping = true; c.enableZoom = true
      } catch { /* */ }
      setTimeout(() => { try { G.zoomToFit(900, 35) } catch { /* */ } }, 1200)

      // Controlador para ILUMINAR la zona que Nexus necesita.
      const refrescar = () => { G.nodeColor(colorNodo).nodeVal(valNodo).linkColor(colorLink) }
      const iluminar = (ids) => {
        const idset = new Set(ids || [])
        const gruposHit = new Set(nodes.filter((n) => idset.has(n.id)).map((n) => n.grupo))
        hl.clear()
        for (const n of nodes) if (idset.has(n.id) || gruposHit.has(n.grupo)) hl.add(n.id)
        refrescar()
        try { G.d3ReheatSimulation() } catch { /* */ }
        if (limpiar) clearTimeout(limpiar)
        limpiar = setTimeout(() => { hl.clear(); refrescar() }, 10000)
      }
      if (controllerRef) controllerRef.current = { iluminar }
    }).catch(() => {})
    const onResize = () => { if (gRef.current && ref.current) gRef.current.width(ref.current.clientWidth).height(ref.current.clientHeight) }
    window.addEventListener('resize', onResize)
    return () => {
      alive = false
      window.removeEventListener('resize', onResize)
      if (controllerRef) controllerRef.current = null
      try { gRef.current?._destructor?.() } catch { /* */ }
      if (ref.current) ref.current.innerHTML = ''
    }
  }, [])
  return <div className="vg-cerebro-canvas" ref={ref} />
}

// ── Gráfico de la ventana de resultado (barra / línea / torta) ──────────────────
const G_COL = ['#34e1ff', '#6ef0ff', '#7aa2ff', '#b58cff', '#5ad1c0', '#49b6ff', '#a6e1ff', '#ffb454', '#43e97b', '#ff8fb0']
const gfmt = (n) => { const a = Math.abs(n); return a >= 1e6 ? '$' + (n / 1e6).toLocaleString('es-CL', { maximumFractionDigits: 1 }) + 'M' : a >= 1e3 ? '$' + Math.round(n / 1e3) + 'k' : new Intl.NumberFormat('es-CL').format(n) }
function MiniGrafico({ g }) {
  const tipo = g.tipo || 'barra'
  const et = g.etiquetas || [], va = g.valores || []
  const max = Math.max(1, ...va.map((v) => Math.abs(v)))
  return (
    <div className="vg-g">
      {g.titulo && <div className="vg-g-t">{g.titulo}</div>}
      {tipo === 'torta' ? (() => {
        const tot = va.reduce((a, b) => a + Math.abs(b), 0) || 1
        let acc = 0
        const R = 50, C = 60
        const segs = va.map((v, i) => {
          const frac = Math.abs(v) / tot, a0 = acc; acc += frac; const a1 = acc
          const p = (f) => [C + R * Math.cos(2 * Math.PI * f - Math.PI / 2), C + R * Math.sin(2 * Math.PI * f - Math.PI / 2)]
          const [x0, y0] = p(a0), [x1, y1] = p(a1), large = frac > 0.5 ? 1 : 0
          return <path key={i} d={`M${C},${C} L${x0},${y0} A${R},${R} 0 ${large} 1 ${x1},${y1} Z`} fill={G_COL[i % G_COL.length]} opacity="0.9" />
        })
        return <div className="vg-g-row">
          <svg viewBox="0 0 120 120" className="vg-g-pie">{segs}<circle cx={C} cy={C} r="25" fill="#081320" /></svg>
          <div className="vg-g-leg">{et.map((e, i) => <div key={i} className="vg-g-li"><span className="dot" style={{ background: G_COL[i % G_COL.length] }} />{e} · <b>{gfmt(va[i])}</b></div>)}</div>
        </div>
      })() : tipo === 'linea' ? (() => {
        const W = 320, H = 120, pad = 10
        const xy = va.map((v, i) => [pad + (i / Math.max(1, va.length - 1)) * (W - 2 * pad), H - pad - (Math.abs(v) / max) * (H - 2 * pad)])
        return <svg viewBox={`0 0 ${W} ${H}`} className="vg-g-line">
          <polyline points={xy.map((p) => p.join(',')).join(' ')} fill="none" stroke="#34e1ff" strokeWidth="2" />
          {xy.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="2.6" fill="#6ef0ff" />)}
          {et.map((e, i) => <text key={i} x={xy[i][0]} y={H - 1} textAnchor="middle" className="vg-g-lx">{e}</text>)}
        </svg>
      })() : (
        <div className="vg-g-bars">{va.map((v, i) => (
          <div key={i} className="vg-g-bar">
            <span className="vg-g-bl">{et[i]}</span>
            <span className="vg-g-track"><span className="vg-g-fill" style={{ width: (Math.abs(v) / max * 100) + '%', background: G_COL[i % G_COL.length] }} /></span>
            <span className="vg-g-bv">{gfmt(v)}</span>
          </div>
        ))}</div>
      )}
    </div>
  )
}

// ── Onda de voz — usa el AUDIO REAL (AnalyserNode) cuando Nexus habla ───────────
function OndaVoz({ activo, analyserRef }) {
  const ref = useRef(null)
  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    let raf = 0, t = 0, amp = 0
    const N = 40
    const fases = Array.from({ length: N }, (_, i) => i * 0.5)
    const freq = new Uint8Array(64)
    const draw = () => {
      const dpr = window.devicePixelRatio || 1
      const w = cv.width = cv.clientWidth * dpr
      const h = cv.height = cv.clientHeight * dpr
      ctx.clearRect(0, 0, w, h)
      amp += ((activo ? 1 : 0) - amp) * 0.08
      const an = analyserRef?.current
      let real = false
      if (activo && an) { try { an.getByteFrequencyData(freq); real = true } catch { /* */ } }
      const bw = w / N
      for (let i = 0; i < N; i++) {
        const env = Math.sin((i / N) * Math.PI)
        let v
        if (real) v = freq[Math.floor((i / N) * freq.length)] / 255
        else v = amp * (0.5 + 0.5 * Math.sin(t * 0.18 + fases[i] + Math.sin(t * 0.05 + i))) * (activo ? (0.55 + 0.45 * Math.random()) : 1)
        const bh = Math.max(2 * dpr, v * env * h * 0.92)
        ctx.fillStyle = `rgba(52,225,255,${0.3 + 0.55 * Math.max(amp, real ? 0.55 : 0)})`
        ctx.fillRect(i * bw + bw * 0.28, (h - bh) / 2, bw * 0.44, bh)
      }
      t++
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [activo, analyserRef])
  return <canvas className="vg-onda" ref={ref} />
}

// ── componente principal ────────────────────────────────────────────────────────
export default function VistaGeneral() {
  const [aliace, setAliace] = useState(null)
  const [autos, setAutos] = useState(null)
  const [salud, setSalud] = useState(null)
  const [cereMeta, setCereMeta] = useState(null)
  const [reloj, setReloj] = useState(new Date())
  const [full, setFull] = useState(false)
  const [autoIdx, setAutoIdx] = useState(0)

  // voz / wake-word
  const [manosLibres, setManosLibres] = useState(false)
  const [despierto, setDespierto] = useState(false)
  const [hablando, setHablando] = useState(false)
  const [pensando, setPensando] = useState(false)
  const [probandoNico, setProbandoNico] = useState(false)
  const [transcripcion, setTranscripcion] = useState('')
  const [respuesta, setRespuesta] = useState('')
  const [vozOK, setVozOK] = useState(true)
  const [textoChat, setTextoChat] = useState('')
  const [voz, setVoz] = useState(() => { try { return localStorage.getItem('nexusVoz') || '' } catch { return '' } })
  const [voces, setVoces] = useState([])
  const [resultado, setResultado] = useState(null)   // ventana de resultado en pantalla
  const recRef = useRef(null)
  const manosRef = useRef(false)
  const hablandoRef = useRef(false)
  const histRef = useRef([])
  const cereCtl = useRef(null)
  const acRef = useRef(null)
  const analyserRef = useRef(null)
  const vozRef = useRef('')

  const cargar = useCallback(() => {
    getJSON('/api/vista/aliace').then(setAliace).catch(() => {})
    getJSON('/api/vista/autos?limite=10').then(setAutos).catch(() => {})
    getJSON('/api/health').then(setSalud).catch(() => {})
  }, [])

  useEffect(() => {
    document.body.classList.add('vg-body')
    document.title = 'NEXUS · Vista General'
    cargar()
    const t1 = setInterval(cargar, 60000)
    const t2 = setInterval(() => setReloj(new Date()), 1000)
    const onFs = () => setFull(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFs)
    return () => { clearInterval(t1); clearInterval(t2); document.removeEventListener('fullscreenchange', onFs); document.body.classList.remove('vg-body'); try { recRef.current?.stop() } catch { /* */ } }
  }, [cargar])

  useEffect(() => {
    const n = autos?.autos?.length || 0
    if (n < 2) return
    const t = setInterval(() => setAutoIdx((i) => (i + 1) % n), 5000)
    return () => clearInterval(t)
  }, [autos])

  useEffect(() => { vozRef.current = voz; if (voz) { try { localStorage.setItem('nexusVoz', voz) } catch { /* */ } } }, [voz])
  useEffect(() => {
    getJSON('/api/voces').then((d) => {
      const vs = d.voces || []
      setVoces(vs)
      // Preferir JORGE si está instalado (el usuario lo pidió); si no, mantener
      // la elección actual o la primera voz de hombre disponible.
      setVoz((cur) => {
        const jorge = vs.find((v) => /jorge/i.test(v.id))
        if (jorge) return jorge.id
        return cur || ((vs.find((v) => v.genero === 'hombre') || vs[0] || {}).id || '')
      })
    }).catch(() => {})
  }, [])

  // limpia emojis/markdown para que la voz NO lea símbolos
  const paraVoz = useCallback((t) => String(t || '')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\u{2300}-\u{23FF}\u{FE00}-\u{FE0F}\u{1F1E6}-\u{1F1FF}\u{200D}]/gu, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/[*_`~#>|]/g, ' ').replace(/^\s*[-•·]\s+/gm, '').replace(/\s{2,}/g, ' ').trim(), [])

  const onFin = useCallback(() => {
    setHablando(false); hablandoRef.current = false; analyserRef.current = null
    if (manosRef.current) setTimeout(() => { try { recRef.current?.start() } catch { /* */ } }, 350)
  }, [])

  // voz de respaldo (navegador) si el TTS del servidor falla — prefiere voz de hombre
  const fallbackHablar = useCallback((texto) => {
    try {
      if (!('speechSynthesis' in window)) return
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(paraVoz(texto).slice(0, 600))
      u.lang = 'es-MX'
      const vs = window.speechSynthesis.getVoices()
      u.voice = vs.find((v) => /es/i.test(v.lang) && /(rocko|reed|eddy|jorge|diego|juan|carlos|paul|male|hombre)/i.test(v.name)) || vs.find((v) => /es/i.test(v.lang)) || null
      u.rate = 1.02
      u.onstart = () => { setHablando(true); hablandoRef.current = true; try { recRef.current?.stop() } catch { /* */ } }
      u.onend = onFin
      window.speechSynthesis.speak(u)
    } catch { /* */ }
  }, [paraVoz, onFin])

  // ── TTS: voz de HOMBRE del servidor (macOS) + ondas REALES vía AnalyserNode ──
  const decir = useCallback(async (texto) => {
    if (!texto) return
    try {
      if (!acRef.current) acRef.current = new (window.AudioContext || window.webkitAudioContext)()
      const ac = acRef.current
      try { await ac.resume() } catch { /* */ }
      const r = await fetch('/api/voz?texto=' + encodeURIComponent(texto) + (vozRef.current ? '&voz=' + encodeURIComponent(vozRef.current) : ''))
      if (!r.ok) throw new Error('tts http ' + r.status)
      const url = URL.createObjectURL(await r.blob())
      const audio = new Audio(url)
      const src = ac.createMediaElementSource(audio)
      const an = ac.createAnalyser(); an.fftSize = 128; an.smoothingTimeConstant = 0.72
      src.connect(an); an.connect(ac.destination)
      analyserRef.current = an
      audio.onplay = () => { setHablando(true); hablandoRef.current = true; try { recRef.current?.stop() } catch { /* */ } }
      const fin = () => { try { URL.revokeObjectURL(url) } catch { /* */ } onFin() }
      audio.onended = fin
      audio.onerror = () => { fin(); fallbackHablar(texto) }
      await audio.play()
    } catch {
      fallbackHablar(texto)
    }
  }, [onFin, fallbackHablar])

  // ── botón: escuchar una muestra de la voz de Nico (clon F5, sin cambiar la voz por defecto) ──
  const probarVozNico = useCallback(async () => {
    if (probandoNico) return
    setProbandoNico(true)
    try {
      const t = 'Hola, soy Nico. Esta es mi voz clonada por Nexus. Así sonaría si me eliges como voz.'
      const r = await fetch('/api/voz?motor=f5&texto=' + encodeURIComponent(t))
      if (!r.ok) throw new Error('http ' + r.status)
      const url = URL.createObjectURL(await r.blob())
      const audio = new Audio(url)
      const fin = () => { try { URL.revokeObjectURL(url) } catch { /* */ } setProbandoNico(false) }
      audio.onended = fin; audio.onerror = fin
      await audio.play()
    } catch { setProbandoNico(false) }
  }, [probandoNico])

  // ── enviar al asistente ──
  const preguntar = useCallback(async (texto) => {
    const pregunta = String(texto || '').trim()
    if (!pregunta) return
    setPensando(true); setRespuesta('')
    setResultado({ pregunta, texto: '', tools: [], graficos: [], cargando: true })   // abre la ventana al instante
    // Ilumina en el cerebro la zona relacionada con la pregunta (en paralelo).
    fetch('/api/cerebro/buscar?q=' + encodeURIComponent(pregunta) + '&limite=12')
      .then((r) => r.json())
      .then((d) => {
        const arr = d.resultados || d.notas || (Array.isArray(d) ? d : [])
        const ids = arr.map((x) => x.ruta || x.id).filter(Boolean)
        if (ids.length) cereCtl.current?.iluminar(ids)
      }).catch(() => {})
    const historial = [...histRef.current, { role: 'user', content: pregunta }]
    try {
      const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ historial, de: ADMIN_NUM, canal: 'desktop' }) })
      const data = await r.json()
      const reply = data.reply || 'No tengo respuesta.'
      histRef.current = [...historial, { role: 'assistant', content: reply }].slice(-12)
      setRespuesta(reply); decir(reply)
      setResultado({ pregunta, texto: reply, tools: data.herramientas || [], graficos: data.graficos || [], cargando: false })
    } catch {
      setRespuesta('No pude conectar con Nexus.'); decir('No pude conectar con Nexus.')
      setResultado({ pregunta, texto: 'No pude conectar con Nexus.', tools: [], graficos: [], cargando: false })
    }
    setPensando(false)
  }, [decir])

  // ── wake-word: escucha continua "Nexus …" ──
  const iniciarWake = useCallback(() => {
    const Rec = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Rec) { setVozOK(false); return }
    const rec = new Rec()
    rec.lang = 'es-CL'; rec.continuous = true; rec.interimResults = true
    recRef.current = rec
    rec.onresult = (e) => {
      if (hablandoRef.current) return
      let full2 = ''
      for (let i = 0; i < e.results.length; i++) full2 += e.results[i][0].transcript + ' '
      const low = full2.toLowerCase()
      const idx = low.lastIndexOf('nexus')
      if (idx === -1) { return }
      const cmd = full2.slice(idx + 5).trim()
      setDespierto(true)
      setTranscripcion(cmd || '…')
      const final = e.results[e.results.length - 1].isFinal
      if (final && cmd.replace(/[.,…\s]/g, '').length > 1) {
        try { rec.stop() } catch { /* */ }
        preguntar(cmd)
      }
    }
    rec.onerror = () => {}
    rec.onend = () => { setDespierto(false); if (manosRef.current && !hablandoRef.current) setTimeout(() => { try { rec.start() } catch { /* */ } }, 300) }
    try { rec.start() } catch { /* */ }
  }, [preguntar])

  const toggleManos = useCallback(() => {
    if (manosRef.current) { manosRef.current = false; setManosLibres(false); try { recRef.current?.stop() } catch { /* */ } setDespierto(false) }
    else { manosRef.current = true; setManosLibres(true); setTranscripcion(''); setRespuesta(''); iniciarWake() }
  }, [iniciarWake])

  const pantallaCompleta = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen?.()
    else document.documentElement.requestFullscreen?.()
  }, [])

  const enviarTexto = useCallback((e) => {
    e?.preventDefault()
    const t = textoChat.trim()
    if (!t) return
    setTranscripcion(t); setTextoChat('')
    preguntar(t)
  }, [textoChat, preguntar])

  const estado = hablando ? 'speaking' : despierto ? 'listening' : pensando ? 'thinking' : manosLibres ? 'wake' : 'idle'
  const estadoTxt = { speaking: 'hablando…', listening: 'escuchando…', thinking: 'procesando…', wake: 'di "Nexus"…', idle: 'en línea' }[estado]
  const autoDestacado = autos?.autos?.[autoIdx]

  return (
    <div className="vg">
      <div className="vg-scan" aria-hidden="true" />
      <div className="vg-corner tl" /><div className="vg-corner tr" /><div className="vg-corner bl" /><div className="vg-corner br" />

      <header className="vg-head">
        <div className={`vg-orb ${estado}`} onClick={toggleManos} title='Activar manos libres (di "Nexus")'>
          <span className="ring r1" /><span className="ring r2" /><span className="ring r3" /><span className="core" />
        </div>
        <div className="vg-title">
          <div className="name">N E X U S</div>
          <div className="tag">Vista General · {estadoTxt}</div>
        </div>
        <OndaVoz activo={hablando || despierto} analyserRef={analyserRef} />
        <div className="vg-clock">
          <div className="hora">{reloj.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
          <div className="fecha">{reloj.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        </div>
        <button className="vg-fs" onClick={pantallaCompleta}>{full ? '✕ salir' : '⛶ pantalla'}</button>
      </header>

      <div className="vg-grid">
        {/* ALIACE */}
        <section className="vg-card a-aliace">
          <div className="vg-card-h">📊 Aliace</div>
          <div className="vg-kpis">
            <div className="kpi"><div className="kpi-v">{millones(aliace?.mesActual?.valor)}</div><div className="kpi-l">facturado {aliace?.mesActual?.etiqueta || ''}</div></div>
            <div className="kpi alert"><div className="kpi-v">{millones(aliace?.deuda)}</div><div className="kpi-l">deuda hoy</div></div>
          </div>
          <div className="vg-chart-wrap">
            <div className="vg-chart-t">Facturación · 6 meses</div>
            <BarChart data={aliace?.facturacion || []} />
          </div>
        </section>

        {/* CEREBRO 3D */}
        <section className="vg-card a-cerebro">
          <div className="vg-card-h">🧠 Segundo Cerebro {cereMeta && <span className="vg-sub">· {cereMeta.total} notas · {cereMeta.enlaces} enlaces</span>}</div>
          <Cerebro3D onMeta={setCereMeta} controllerRef={cereCtl} />
        </section>

        {/* MALLORCA */}
        <section className="vg-card a-mallorca">
          <div className="vg-card-h">🚗 MallorcAutos <span className="vg-sub">· {autos?.enStock ?? '—'} en stock</span></div>
          {autoDestacado && (
            <div className="vg-auto-hero" style={{ backgroundImage: autoDestacado.foto ? `url(${autoDestacado.foto})` : 'none' }}>
              <div className="vg-auto-info">
                <div className="vg-auto-name">{autoDestacado.marca} {autoDestacado.modelo}</div>
                <div className="vg-auto-meta">{autoDestacado.anio} · {km(autoDestacado.km)} · {clp(autoDestacado.precio)}</div>
              </div>
            </div>
          )}
          <div className="vg-thumbs">
            {(autos?.autos || []).slice(0, 8).map((a, i) => (
              <div key={a.id} className={`vg-thumb ${i === autoIdx ? 'on' : ''}`} onClick={() => setAutoIdx(i)}
                style={{ backgroundImage: a.foto ? `url(${a.foto})` : 'none' }} title={`${a.marca} ${a.modelo} ${a.anio}`} />
            ))}
          </div>
        </section>

        {/* VOZ */}
        <section className="vg-card a-voz">
          <div className="vg-card-h">🎙️ Habla con Nexus</div>
          <form className="vg-chatform" onSubmit={enviarTexto}>
            <input className="vg-chatinput" placeholder="Escríbele a Nexus…" value={textoChat}
              onChange={(e) => setTextoChat(e.target.value)} />
            <button className="vg-chatsend" type="submit" disabled={!textoChat.trim()} title="Enviar">➤</button>
          </form>
          <button className={`vg-mic ${estado}`} onClick={toggleManos}>
            {manosLibres ? (despierto ? '🟢 Escuchando…' : pensando ? 'Procesando…' : hablando ? 'Hablando…' : 'Manos libres ON · di "Nexus"') : '🎤 Activar manos libres'}
          </button>
          <button className="vg-nico" onClick={probarVozNico} disabled={probandoNico} title="Escuchar la voz clonada de Nico (F5)">
            {probandoNico ? '⏳ Generando la voz de Nico… (~10s)' : '▶️ Escuchar voz de Nico (clonada)'}
          </button>
          {!vozOK && <div className="vg-voz-warn">La voz por micrófono necesita <b>Google Chrome</b> (el chat de texto sí funciona).</div>}
          {transcripcion && <div className="vg-voz-tu"><span>Tú:</span> {transcripcion}</div>}
          {respuesta && <div className="vg-voz-nexus"><span>Nexus:</span> {respuesta}</div>}
          {!transcripcion && !respuesta && <div className="vg-voz-hint">Escríbele arriba, o activa manos libres y di <b>"Nexus…"</b>. Te responde por voz e ilumina la zona del cerebro que usa.</div>}
        </section>

        {/* SISTEMAS */}
        <section className="vg-card a-sistemas">
          <div className="vg-card-h">🟢 Sistemas</div>
          <div className="vg-sys">
            {(salud?.servicios || []).map((s) => (
              <div className={`vg-sys-row ${s.activo ? 'up' : 'down'}`} key={s.label || s.nombre}>
                <span className="led" /><span className="nm">{s.nombre}</span><span className="st">{s.activo ? 'OK' : 'caído'}</span>
              </div>
            ))}
            {!salud && <div className="vg-voz-hint">Cargando…</div>}
          </div>
        </section>
      </div>

      {/* VENTANA DE RESULTADO (sobre la pantalla completa) */}
      {resultado && (
        <div className="vg-modal-bg" onClick={() => setResultado(null)}>
          <div className="vg-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vg-modal-h">
              <span className="vg-modal-q">{resultado.pregunta}</span>
              <button className="vg-modal-x" onClick={() => setResultado(null)} title="Cerrar">✕</button>
            </div>
            <div className="vg-modal-body">
              {resultado.cargando
                ? <div className="vg-modal-load"><span className="dots"><i /><i /><i /></span> Nexus está buscando…</div>
                : <>
                    {lineasFmt(resultado.texto)}
                    {resultado.graficos?.map((g, i) => <MiniGrafico key={i} g={g} />)}
                  </>}
            </div>
            {resultado.tools?.length > 0 && (
              <div className="vg-modal-tools">{resultado.tools.map((t, i) => <span key={i} className="vg-modal-tool">{t}</span>)}</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
