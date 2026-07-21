# SII Extractor — App web (local)

Front (Next.js + shadcn) + API (FastAPI) para gestionar varias empresas,
conectarlas al SII y descargar sus documentos. **Corre solo en tu equipo**;
las credenciales nunca salen de tu máquina.

## Arranque rápido

Desde la raíz del repo:

```bash
./start-web.sh
```

Abre **http://localhost:3000**.

## Arranque manual (dos terminales)

```bash
# Terminal 1 — backend
cd sii_extractor
.venv/bin/uvicorn api:app --reload --port 8000

# Terminal 2 — frontend
cd frontend
npm run dev
```

## Flujo

1. **Agregar empresa** → nombre, RUT y clave tributaria.
2. **Probar conexión** → valida el login con el SII (reutiliza sesión para no
   gatillar bloqueos por logins repetidos).
3. **Seleccionar documentos** (Compras/Ventas RCV, Carpeta, F29, F22) + rango de
   periodos → **Iniciar descarga**.
4. Sigue el progreso en vivo y descarga los archivos desde la tabla.

> Compras y Ventas (RCV) están verificados. Carpeta tributaria, F29 y F22 están
> marcados como *experimentales* (sus endpoints del SII aún se confirman en vivo).

## Dónde se guarda todo

- Empresas + claves: `sii_extractor/app.db` (SQLite, en `.gitignore`).
- Documentos descargados: `sii_extractor/data/empresas/<id>/…`
- Sesión SII por empresa: `sii_extractor/data/empresas/<id>/session.json`

## Config opcional del front

`frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```
