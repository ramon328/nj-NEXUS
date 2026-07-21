import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../auth/supabase'
import { useBackButton } from '../../hooks/useBackButton'

// Tablero estilo Jira de un proyecto: 3 columnas (Por hacer / En progreso /
// Hecho) con drag & drop. Cada proyecto tiene su propia lista de tareas,
// independiente del calendario, en la tabla forja_project_tasks.
// (ver supabase/setup_project_board.sql)

const COLUMNS = [
  { key: 'todo',  label: 'Por hacer',   color: '#8993a4' },
  { key: 'doing', label: 'En progreso', color: '#00d4ff' },
  { key: 'done',  label: 'Hecho',       color: '#00e676' },
]

const colMeta = (key) => COLUMNS.find(c => c.key === key) ?? COLUMNS[0]

export default function ProjectBoard({ project, user, onBack }) {
  const [tasks, setTasks] = useState([])
  const [error, setError] = useState(null)
  const [addingTo, setAddingTo] = useState(null)   // columna donde se agrega
  const [newTitle, setNewTitle] = useState('')
  const [editTask, setEditTask] = useState(null)   // tarea abierta en modal
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [dragId, setDragId] = useState(null)
  const [dragOver, setDragOver] = useState(null)

  // El botón Atrás vuelve al calendario (no cierra la PWA).
  useBackButton(true, onBack)

  const loadTasks = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('forja_project_tasks')
      .select('*')
      .eq('project_id', project.id)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true })
    if (err) setError('No se pudieron cargar las tareas. Verifica que la tabla exista en Supabase (supabase/setup_project_board.sql).')
    else { setError(null); setTasks(data ?? []) }
  }, [project.id])

  useEffect(() => { loadTasks() }, [loadTasks])

  const tasksIn = (col) => tasks.filter(t => t.column_key === col)

  const handleAdd = async (e, col) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    const { error: err } = await supabase.from('forja_project_tasks').insert({
      project_id: project.id,
      column_key: col,
      title: newTitle.trim(),
      position: tasksIn(col).length,
      created_by: user?.id ?? null,
    })
    if (err) { setError(err.message); return }
    setNewTitle('')
    setAddingTo(null)
    loadTasks()
  }

  const moveTask = async (taskId, toCol) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task || task.column_key === toCol) return
    const position = tasksIn(toCol).length
    // Optimista: mover en la UI de inmediato.
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, column_key: toCol } : t))
    const { error: err } = await supabase
      .from('forja_project_tasks')
      .update({ column_key: toCol, position })
      .eq('id', taskId)
    if (err) { setError(err.message); loadTasks() }
  }

  const openEdit = (task) => {
    setEditTask(task)
    setEditTitle(task.title)
    setEditDesc(task.description ?? '')
  }

  const handleSaveEdit = async (e) => {
    e.preventDefault()
    if (!editTitle.trim()) return
    const { error: err } = await supabase
      .from('forja_project_tasks')
      .update({ title: editTitle.trim(), description: editDesc.trim() })
      .eq('id', editTask.id)
    if (err) { setError(err.message); return }
    setEditTask(null)
    loadTasks()
  }

  const handleDeleteTask = async () => {
    if (!window.confirm('¿Eliminar esta tarea?')) return
    const { error: err } = await supabase.from('forja_project_tasks').delete().eq('id', editTask.id)
    if (err) { setError(err.message); return }
    setEditTask(null)
    loadTasks()
  }

  return (
    <div className="ap-section">
      <div className="ap-section-header">
        <div>
          <button className="ap-back jb-back" onClick={onBack}>← Volver al calendario</button>
          <h2 className="ap-section-title jb-title">
            <span className="jb-title-dot" style={{ background: project.color || '#00d4ff' }} />
            {project.name}
          </h2>
        </div>
      </div>

      {error && <p className="ap-msg err">{error}</p>}

      <div className="jb-board">
        {COLUMNS.map(col => (
          <div
            key={col.key}
            className={`jb-column ${dragOver === col.key ? 'drag-over' : ''}`}
            style={{ '--jb-color': col.color }}
            onDragOver={e => { e.preventDefault(); setDragOver(col.key) }}
            onDragLeave={() => setDragOver(null)}
            onDrop={e => {
              e.preventDefault()
              setDragOver(null)
              if (dragId) moveTask(dragId, col.key)
              setDragId(null)
            }}
          >
            <div className="jb-col-header">
              <span className="jb-dot" />
              <h3>{col.label}</h3>
              <span className="jb-count">{tasksIn(col.key).length}</span>
            </div>

            <div className="jb-cards">
              {tasksIn(col.key).map(task => (
                <div
                  key={task.id}
                  className="jb-card"
                  draggable
                  onDragStart={() => setDragId(task.id)}
                  onDragEnd={() => { setDragId(null); setDragOver(null) }}
                  onClick={() => openEdit(task)}
                >
                  <strong>{task.title}</strong>
                  {task.description && <p>{task.description}</p>}
                  <div className="jb-card-actions">
                    {COLUMNS.filter(c => c.key !== col.key).map(c => (
                      <button
                        key={c.key}
                        title={`Mover a ${c.label}`}
                        onClick={e => { e.stopPropagation(); moveTask(task.id, c.key) }}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {addingTo === col.key ? (
              <form className="jb-add-form" onSubmit={e => handleAdd(e, col.key)}>
                <input
                  autoFocus
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Título de la tarea"
                  onKeyDown={e => { if (e.key === 'Escape') { setAddingTo(null); setNewTitle('') } }}
                />
                <div className="jb-add-actions">
                  <button type="submit" className="ap-btn primary small" disabled={!newTitle.trim()}>Agregar</button>
                  <button type="button" className="ap-btn ghost small" onClick={() => { setAddingTo(null); setNewTitle('') }}>Cancelar</button>
                </div>
              </form>
            ) : (
              <button className="jb-add-btn" onClick={() => { setAddingTo(col.key); setNewTitle('') }}>
                + Agregar tarea
              </button>
            )}
          </div>
        ))}
      </div>

      {editTask && (
        <div className="ap-modal-overlay" onClick={() => setEditTask(null)}>
          <div className="ap-modal" onClick={e => e.stopPropagation()}>
            <div className="ap-modal-header">
              <h3>Editar tarea</h3>
              <button className="ap-close" onClick={() => setEditTask(null)}>✕</button>
            </div>
            <form className="ap-form" onSubmit={handleSaveEdit}>
              <div className="ap-field">
                <label>Título</label>
                <input autoFocus value={editTitle} onChange={e => setEditTitle(e.target.value)} />
              </div>
              <div className="ap-field">
                <label>Descripción / avance</label>
                <textarea rows={4} value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Notas de avance, pendientes, etc." />
              </div>
              <div className="ap-modal-footer">
                <button type="button" className="ap-btn ghost pc-del-btn" onClick={handleDeleteTask}>Eliminar</button>
                <button type="button" className="ap-btn ghost" onClick={() => setEditTask(null)}>Cancelar</button>
                <button type="submit" className="ap-btn primary" disabled={!editTitle.trim()}>Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
