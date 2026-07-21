import { useState } from 'react'
import { projectFolders } from '../../data/projectFolders'
import FolderFiles from './FolderFiles'

// Apartado "Información de Proyectos": grilla de carpetas (una por empresa).
// Al abrir una carpeta se gestionan sus archivos (subir, descargar, eliminar)
// almacenados en Supabase Storage (bucket 'project-info').
export default function ProjectInfoSection({ user, onClose }) {
  const [folder, setFolder] = useState(null)

  return (
    <div className="ap-overlay">
      <div className="ap-container">
        <div className="ap-topbar">
          <div className="ap-logo">
            Información<span className="logo-accent"> · Proyectos</span>
          </div>
          <div className="ap-tabs" />
          <button className="ap-back" onClick={onClose} title="Volver al hub">
            ← Volver al hub
          </button>
        </div>

        <div className="ap-body wide">
          {folder ? (
            <FolderFiles folder={folder} onBack={() => setFolder(null)} />
          ) : (
            <div className="ap-section">
              <h2 className="ap-section-title">Información de Proyectos</h2>
              <p className="ap-hint" style={{ marginBottom: 24 }}>
                Abre una carpeta para subir y consultar documentos (PDF, Word, Excel, PowerPoint, .md, imágenes…).
              </p>
              <div className="pj-grid">
                {projectFolders.map(f => (
                  <div
                    key={f.key}
                    className="pj-card"
                    style={{ '--pj-ac': f.color }}
                    onClick={() => setFolder(f)}
                  >
                    <span className="pj-folder-icon" style={{ color: f.color }}>{f.icon}</span>
                    <h3>{f.name}</h3>
                    <span className="pj-open">Abrir carpeta →</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
