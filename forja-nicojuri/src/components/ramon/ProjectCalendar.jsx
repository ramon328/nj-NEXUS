import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../auth/supabase'
import ProjectBoard from './ProjectBoard'

// Calendario semanal de proyectos: grilla de lunes a domingo (columnas) por
// franjas horarias (filas). Un PROYECTO es una entidad (forja_projects) que
// puede estar en varios días; todas sus tarjetas comparten UN tablero (Jira).
// Al agregar una tarjeta eliges un proyecto existente o escribes uno nuevo.
//
// Datos en Supabase:
//   forja_projects        → proyectos (name, color) + su tablero.
//   forja_calendar_cards  → ubicaciones del proyecto en (day_index, slot_index).
//   forja_project_tasks   → tareas del tablero (project_id → forja_projects).
// (ver supabase/setup_project_calendar.sql, setup_shared_projects.sql y setup_project_board.sql)

const DAYS = [
  { idx: 0, label: 'lunes' },
  { idx: 1, label: 'martes' },
  { idx: 2, label: 'miércoles' },
  { idx: 3, label: 'jueves' },
  { idx: 4, label: 'viernes' },
  { idx: 5, label: 'sábado' },
  { idx: 6, label: 'domingo' },
]

// Franjas horarias (una por hora). Editable a gusto.
const SLOTS = [
  '08:00 - 09:00',
  '09:00 - 10:00',
  '10:00 - 11:00',
  '11:00 - 12:00',
  '12:00 - 13:00',
  '13:00 - 14:00',
  '14:00 - 15:00',
  '15:00 - 16:00',
  '16:00 - 17:00',
  '17:00 - 18:00',
  '18:00 - 19:00',
  '19:00 - 20:00',
]

// Paleta de colores para los proyectos.
const COLORS = ['#00d4ff', '#00e676', '#ffc107', '#ff7043', '#b39ddb', '#f06292', '#4fc3f7', '#ffffff']

export default function ProjectCalendar({ user }) {
  const [projects, setProjects] = useState([])
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Modal de tarjeta (agregar/editar una ubicación en el calendario)
  const [cardModal, setCardModal] = useState(null) // { id?, day, slot, title, description, color }
  const [saving, setSaving] = useState(false)

  // Panel con los proyectos del calendario
  const [showProjects, setShowProjects] = useState(false)

  // Proyecto cuyo tablero (estilo Jira) está abierto.
  const [boardProject, setBoardProject] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: proj, error: pErr }, { data: cds, error: cErr }] = await Promise.all([
      supabase.from('forja_projects').select('id, name, color').order('created_at', { ascending: true }),
      supabase.from('forja_calendar_cards').select('id, project_id, day_index, slot_index, title, color, description').order('position', { ascending: true }),
    ])
    if (pErr || cErr) {
      setError('No se pudieron cargar los datos. Verifica que las tablas existan en Supabase (setup_project_calendar.sql + setup_shared_projects.sql).')
      setLoading(false)
      return
    }
    setError(null)
    setProjects(proj ?? [])
    setCards(cds ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Índices rápidos
  const projectById = {}
  projects.forEach(p => { projectById[p.id] = p })

  const cardsByCell = {}
  cards.forEach(c => {
    const k = `${c.day_index}-${c.slot_index}`
    ;(cardsByCell[k] ??= []).push(c)
  })

  // Proyectos que aparecen en el calendario (con cuántos días), para el panel.
  const countByProject = {}
  cards.forEach(c => { if (c.project_id) countByProject[c.project_id] = (countByProject[c.project_id] ?? 0) + 1 })
  const projectsInCalendar = projects.filter(p => countByProject[p.id] > 0)

  const projFor = (card) => projectById[card.project_id] ?? { id: card.project_id, name: card.title, color: card.color }

  const openNew = (day, slot) => {
    setCardModal({ day, slot, title: '', description: '', color: COLORS[0] })
  }

  const openEdit = (card) => {
    const p = projFor(card)
    setCardModal({
      id: card.id,
      day: card.day_index,
      slot: card.slot_index,
      title: p?.name ?? card.title ?? '',
      description: card.description ?? '',
      color: p?.color ?? card.color ?? COLORS[0],
    })
  }

  const openBoard = (project) => {
    if (!project?.id) return
    setBoardProject({ id: project.id, name: project.name, color: project.color })
  }

  const saveCard = async (e) => {
    e.preventDefault()
    const m = cardModal
    const name = m?.title.trim()
    if (!name) return
    setSaving(true)

    // Resuelve el proyecto: reutiliza el existente (por nombre) o crea uno nuevo.
    let project = projects.find(p => p.name.toLowerCase() === name.toLowerCase())
    if (!project) {
      const { data: np, error: pErr } = await supabase.from('forja_projects')
        .insert({ name, color: m.color, created_by: user?.id ?? null })
        .select().single()
      if (pErr) { setError(pErr.message); setSaving(false); return }
      project = np
    }

    const payload = {
      project_id: project.id,
      day_index: m.day,
      slot_index: m.slot,
      title: project.name,   // copia para mostrar; la fuente real es el proyecto
      color: project.color,
      description: m.description.trim(),
    }
    let err
    if (m.id) {
      ({ error: err } = await supabase.from('forja_calendar_cards').update(payload).eq('id', m.id))
    } else {
      const pos = (cardsByCell[`${m.day}-${m.slot}`]?.length) ?? 0
      ;({ error: err } = await supabase.from('forja_calendar_cards')
        .insert({ ...payload, position: pos, created_by: user?.id ?? null }))
    }
    setSaving(false)
    if (err) { setError(err.message); return }
    setCardModal(null)
    load()
  }

  // Quita SOLO esta ubicación del calendario (el proyecto y su tablero siguen).
  const deleteCard = async (card) => {
    if (!window.confirm('¿Quitar este proyecto de este día? (No borra el proyecto ni su tablero.)')) return
    const { error: err } = await supabase.from('forja_calendar_cards').delete().eq('id', card.id)
    if (err) { setError(err.message); return }
    setCardModal(null)
    load()
  }

  // Borra el proyecto por completo: lo quita de TODOS sus días y borra su tablero.
  const deleteProject = async (project) => {
    if (!window.confirm(`¿Eliminar el proyecto "${project.name}"? Se quitará de todos sus días y se borrará su tablero.`)) return
    const { error: err } = await supabase.from('forja_projects').delete().eq('id', project.id)
    if (err) { setError(err.message); return }
    load()
  }

  // Si hay un proyecto abierto, mostramos su tablero (estilo Jira).
  if (boardProject) {
    return <ProjectBoard project={boardProject} user={user} onBack={() => setBoardProject(null)} />
  }

  // Proyecto ya existente que coincide con lo escrito en el modal (para reutilizar).
  const matched = cardModal
    ? projects.find(p => p.name.toLowerCase() === cardModal.title.trim().toLowerCase())
    : null

  return (
    <div className="ap-section">
      <div className="ap-section-header">
        <h2 className="ap-section-title">Avance de Proyectos</h2>
        <div className="ap-header-actions">
          <button className="ap-btn ghost" onClick={() => setShowProjects(true)}>Proyectos</button>
        </div>
      </div>
      <p className="ap-hint" style={{ margin: '0 0 16px' }}>
        Cada tarjeta es un proyecto. Toca una para abrir su tablero; con “+” lo agregas (puedes repetir un proyecto en varios días).
      </p>

      {error && <p className="ap-msg err">{error}</p>}

      {loading ? null : (
        <div className="pc-scroll">
          <table className="pc-table">
            <thead>
              <tr>
                <th className="pc-time-col"></th>
                {DAYS.map(d => <th key={d.idx} className="pc-day">{d.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {SLOTS.map((slot, si) => (
                <tr key={slot}>
                  <td className="pc-time">{slot}</td>
                  {DAYS.map(d => {
                    const cell = cardsByCell[`${d.idx}-${si}`] ?? []
                    return (
                      <td key={d.idx} className="pc-cell">
                        {cell.map(c => {
                          const p = projFor(c)
                          return (
                            <div
                              key={c.id}
                              className="pc-card"
                              style={{ '--pc-color': p.color || COLORS[0] }}
                              onClick={() => openBoard(p)}
                              title="Abrir tablero del proyecto"
                            >
                              <div className="pc-card-btns">
                                <button
                                  className="pc-card-ic"
                                  title="Editar / cambiar proyecto"
                                  onClick={e => { e.stopPropagation(); openEdit(c) }}
                                >✎</button>
                                <button
                                  className="pc-card-ic pc-card-del"
                                  title="Quitar de este día"
                                  onClick={e => { e.stopPropagation(); deleteCard(c) }}
                                >✕</button>
                              </div>
                              <strong>{p.name}</strong>
                            </div>
                          )
                        })}
                        <button className="pc-add" title="Agregar proyecto" onClick={() => openNew(d.idx, si)}>
                          +
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal agregar/editar tarjeta */}
      {cardModal && (
        <div className="ap-modal-overlay" onClick={() => setCardModal(null)}>
          <div className="ap-modal" onClick={e => e.stopPropagation()}>
            <div className="ap-modal-header">
              <h3>{cardModal.id ? 'Editar tarjeta' : 'Agregar proyecto al calendario'}</h3>
              <button className="ap-close" onClick={() => setCardModal(null)}>✕</button>
            </div>
            <form className="ap-form" onSubmit={saveCard}>
              <p className="ap-hint" style={{ margin: '0 0 4px' }}>
                {DAYS[cardModal.day].label} · {SLOTS[cardModal.slot]}
              </p>

              <div className="ap-field">
                <label>Proyecto</label>
                <input
                  autoFocus
                  list="pc-project-list"
                  value={cardModal.title}
                  onChange={e => {
                    const val = e.target.value
                    const hit = projects.find(p => p.name.toLowerCase() === val.trim().toLowerCase())
                    setCardModal(m => ({ ...m, title: val, color: hit ? hit.color : m.color }))
                  }}
                  placeholder="Escribe uno nuevo o elige uno existente"
                />
                <datalist id="pc-project-list">
                  {projects.map(p => <option key={p.id} value={p.name} />)}
                </datalist>
                {matched && (
                  <span className="ap-hint">Se reutilizará el proyecto existente “{matched.name}” (mismo tablero).</span>
                )}
              </div>

              <div className="ap-field">
                <label>Descripción del día (opcional)</label>
                <textarea
                  rows={3}
                  value={cardModal.description}
                  onChange={e => setCardModal(m => ({ ...m, description: e.target.value }))}
                  placeholder="Nota para esta ubicación en el calendario"
                />
              </div>

              {!matched && (
                <div className="ap-field">
                  <label>Color del proyecto</label>
                  <div className="pc-swatches">
                    {COLORS.map(col => (
                      <button
                        type="button"
                        key={col}
                        className={`pc-swatch ${cardModal.color === col ? 'active' : ''}`}
                        style={{ background: col }}
                        onClick={() => setCardModal(m => ({ ...m, color: col }))}
                        aria-label={col}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="ap-modal-footer">
                {cardModal.id && (
                  <button
                    type="button"
                    className="ap-btn ghost pc-del-btn"
                    onClick={() => deleteCard({ id: cardModal.id })}
                  >
                    Quitar de este día
                  </button>
                )}
                <button type="button" className="ap-btn ghost" onClick={() => setCardModal(null)}>Cancelar</button>
                <button type="submit" className="ap-btn primary" disabled={saving || !cardModal.title.trim()}>
                  {saving ? 'Guardando...' : cardModal.id ? 'Guardar' : 'Agregar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Panel: proyectos que están en el calendario */}
      {showProjects && (
        <div className="ap-modal-overlay" onClick={() => setShowProjects(false)}>
          <div className="ap-modal" onClick={e => e.stopPropagation()}>
            <div className="ap-modal-header">
              <h3>Proyectos en el calendario</h3>
              <button className="ap-close" onClick={() => setShowProjects(false)}>✕</button>
            </div>
            <div className="ap-form">
              {projectsInCalendar.length === 0 ? (
                <p className="ap-hint">Aún no hay proyectos en el calendario. Agrega uno con “+”.</p>
              ) : (
                <ul className="pc-proj-list">
                  {projectsInCalendar.map(p => (
                    <li
                      key={p.id}
                      className="pc-proj-item pc-proj-clickable"
                      onClick={() => { setShowProjects(false); openBoard(p) }}
                      title="Abrir tablero del proyecto"
                    >
                      <span className="pc-proj-dot" style={{ background: p.color || COLORS[0] }} />
                      <span className="pc-proj-name">{p.name}</span>
                      <span className="pc-proj-count">{countByProject[p.id]} {countByProject[p.id] === 1 ? 'día' : 'días'}</span>
                      <span className="pc-proj-open">Abrir tablero →</span>
                      <button
                        className="pc-proj-del"
                        title="Eliminar proyecto (de todos sus días)"
                        onClick={e => { e.stopPropagation(); deleteProject(p) }}
                      >✕</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
