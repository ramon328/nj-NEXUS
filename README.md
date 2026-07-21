# nj-NEXUS — Respaldo del Mac mini

Respaldo automático de **solo código** de todos los proyectos del mini
(Nexus y sus conectores, GoAutos, Estudio, etc.).

## Qué hay aquí
Cada carpeta es un proyecto. Se copia únicamente el código fuente y config
editable a mano. **No** se respaldan (se regeneran o van aparte):
`node_modules`, `.venv`, builds (`.next`/`dist`), modelos de IA, binarios,
perfiles de navegador, bases de datos con datos ni media pesada.

## 🔒 Secretos
Los secretos **NO** están en este repo (claves del banco, certificados `.pfx`
del SII, `.env`, tokens OAuth). Se respaldan cifrados aparte.
Los `.env.example` sí van, como referencia.

## Auto-respaldo
Un LaunchAgent (`com.nexus.backup-git`) corre `.sync.sh` cada 10 min:
rsync de cada proyecto → `git commit` + `git push origin main` si hubo cambios.
Log en `.sync.log`.
