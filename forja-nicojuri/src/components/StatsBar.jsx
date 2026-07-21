export default function StatsBar({ apps = [] }) {
  // Las carpetas cuentan por sus apps internas, no como módulo propio.
  const flat = apps.flatMap(a => (a.type === 'folder' ? a.children : [a]))
  const live = flat.filter(a => a.status === 'live').length
  const soon = flat.filter(a => a.status !== 'live').length

  const stats = [
    { num: String(live),        label: 'Apps en vivo',    color: 'var(--ailnest)' },
    { num: String(soon),        label: 'Próximamente',    color: 'var(--bank)'    },
    { num: String(live + soon), label: 'Módulos totales', color: 'var(--sysplan)' },
  ]

  return (
    <div className="stats-bar">
      {stats.map(s => (
        <div className="stat" key={s.label}>
          <span className="stat-num" style={{ color: s.color }}>{s.num}</span>
          <span className="stat-label">{s.label}</span>
        </div>
      ))}
    </div>
  )
}
