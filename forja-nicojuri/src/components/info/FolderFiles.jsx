import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../auth/supabase'
import { maybeCompressImage } from './compressImage'

const BUCKET = 'project-info'

// Iconos por extensión de archivo
const ICONS = {
  pdf: '📕', doc: '📘', docx: '📘', xls: '📗', xlsx: '📗', csv: '📗',
  ppt: '📙', pptx: '📙', md: '📝', txt: '📄', zip: '🗜️', rar: '🗜️',
  png: '🖼️', jpg: '🖼️', jpeg: '🖼️', gif: '🖼️', webp: '🖼️', svg: '🖼️',
}
const ext = name => name.split('.').pop()?.toLowerCase() ?? ''
const iconFor = name => ICONS[ext(name)] ?? '📄'

// Tipo de visor según extensión
function kindOf(name) {
  const e = ext(name)
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(e)) return 'image'
  if (e === 'pdf') return 'pdf'
  if (['txt', 'md', 'csv', 'log', 'json'].includes(e)) return 'text'
  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(e)) return 'office'
  return 'other'
}

function formatSize(bytes) {
  if (bytes == null) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso) {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch { return '' }
}

const BUCKET_HINT = `El bucket "${BUCKET}" no existe o no tienes acceso. Ejecuta supabase/setup_project_info.sql en el proyecto de Supabase.`

export default function FolderFiles({ folder, onBack }) {
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [busy, setBusy] = useState(null)   // path en proceso
  const [viewing, setViewing] = useState(null) // { file, url, kind, text }
  const inputRef = useRef(null)

  const loadFiles = useCallback(async () => {
    setLoading(true)
    const { data, error: err } = await supabase.storage
      .from(BUCKET)
      .list(folder.key, { limit: 200, sortBy: { column: 'created_at', order: 'desc' } })
    if (err) {
      setError(err.message?.toLowerCase().includes('not found') ? BUCKET_HINT : err.message)
    } else {
      setError(null)
      setFiles((data ?? []).filter(f => f.id))
    }
    setLoading(false)
  }, [folder.key])

  useEffect(() => { loadFiles() }, [loadFiles])

  const handleUpload = async (e) => {
    const selected = Array.from(e.target.files ?? [])
    if (!selected.length) return
    setUploading(true)
    setError(null)
    for (const original of selected) {
      // Comprime imágenes antes de subir para ahorrar espacio.
      const { blob, name } = await maybeCompressImage(original)
      const safe = name.replace(/[^\w.\- ]+/g, '_')
      const path = `${folder.key}/${Date.now()}-${safe}`
      const { error: err } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, { upsert: false, contentType: blob.type || undefined })
      if (err) {
        setError(err.message?.toLowerCase().includes('not found') ? BUCKET_HINT : err.message)
        break
      }
    }
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
    loadFiles()
  }

  const signedUrl = async (file, ttl = 600) => {
    const path = `${folder.key}/${file.name}`
    const { data, error: err } = await supabase.storage.from(BUCKET).createSignedUrl(path, ttl)
    if (err) { setError(err.message); return null }
    return data.signedUrl
  }

  const handleView = async (file) => {
    const path = `${folder.key}/${file.name}`
    setBusy(path)
    const url = await signedUrl(file)
    setBusy(null)
    if (!url) return
    const kind = kindOf(file.name)
    let text = null
    if (kind === 'text') {
      try { text = await (await fetch(url)).text() }
      catch { text = 'No se pudo cargar el contenido del archivo.' }
    }
    setViewing({ file, url, kind, text })
  }

  const handleDownload = async (file) => {
    const path = `${folder.key}/${file.name}`
    setBusy(path)
    const url = await signedUrl(file, 60)
    setBusy(null)
    if (url) window.open(url, '_blank', 'noopener')
  }

  const handleDelete = async (file) => {
    if (!window.confirm(`¿Eliminar "${displayName(file.name)}"?`)) return
    const path = `${folder.key}/${file.name}`
    setBusy(path)
    const { error: err } = await supabase.storage.from(BUCKET).remove([path])
    setBusy(null)
    if (err) { setError(err.message); return }
    loadFiles()
  }

  return (
    <div className="ap-section">
      <button className="ap-back kb-back" onClick={onBack}>← Carpetas</button>
      <div className="ap-section-header">
        <h2 className="ap-section-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: folder.color }}>{folder.icon}</span> {folder.name}
        </h2>
        <button className="ap-btn primary" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {uploading ? 'Subiendo…' : '+ Subir archivos'}
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          onChange={handleUpload}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.md,.txt,.json,.zip,.rar,.png,.jpg,.jpeg,.gif,.webp,.svg"
        />
      </div>

      {error && <p className="ap-msg err">{error}</p>}

      {loading ? null : files.length === 0 && !error ? (
        <div className="ap-empty">
          <p>No hay archivos en esta carpeta todavía.</p>
          <button className="ap-btn primary" onClick={() => inputRef.current?.click()}>Subir el primero</button>
        </div>
      ) : (
        <div className="fi-list">
          {files.map(file => {
            const path = `${folder.key}/${file.name}`
            return (
              <div key={file.id ?? file.name} className="fi-row" onClick={() => handleView(file)}>
                <span className="fi-icon">{iconFor(file.name)}</span>
                <div className="fi-info">
                  <span className="fi-name">{displayName(file.name)}</span>
                  <span className="fi-meta">
                    {formatSize(file.metadata?.size)}
                    {file.metadata?.size != null && file.created_at ? ' · ' : ''}
                    {formatDate(file.created_at)}
                  </span>
                </div>
                <div className="fi-actions" onClick={e => e.stopPropagation()}>
                  <button className="ap-btn ghost small" onClick={() => handleView(file)} disabled={busy === path}>
                    {busy === path ? '…' : 'Abrir'}
                  </button>
                  <button className="ap-btn ghost small" onClick={() => handleDownload(file)} disabled={busy === path}>
                    Descargar
                  </button>
                  <button className="ap-btn ghost small danger" onClick={() => handleDelete(file)} disabled={busy === path} title="Eliminar">
                    ✕
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {viewing && (
        <FileViewer item={viewing} onClose={() => setViewing(null)} onDownload={() => handleDownload(viewing.file)} />
      )}
    </div>
  )
}

function FileViewer({ item, onClose, onDownload }) {
  const { file, url, kind, text } = item
  return (
    <div className="fv-overlay" onClick={onClose}>
      <div className="fv-modal" onClick={e => e.stopPropagation()}>
        <div className="fv-header">
          <span className="fv-title">{displayName(file.name)}</span>
          <div className="fv-actions">
            <button className="ap-btn ghost small" onClick={onDownload}>Descargar</button>
            <button className="ap-close" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="fv-body">
          {kind === 'image' && <img src={url} alt={displayName(file.name)} className="fv-image" />}
          {kind === 'pdf' && <iframe title={file.name} src={url} className="fv-frame" />}
          {kind === 'text' && <pre className="fv-text">{text}</pre>}
          {kind === 'office' && (
            <iframe
              title={file.name}
              src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`}
              className="fv-frame"
            />
          )}
          {kind === 'other' && (
            <div className="ap-empty">
              <p>Este tipo de archivo no se puede previsualizar aquí.</p>
              <button className="ap-btn primary" onClick={onDownload}>Descargar archivo</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Los nombres se guardan con prefijo "<timestamp>-"; lo quitamos al mostrar.
function displayName(name) {
  return name.replace(/^\d{10,}-/, '')
}
