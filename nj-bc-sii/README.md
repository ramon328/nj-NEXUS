# nj-bc-sii — Extractor de documentos SII (backend)

Backend (FastAPI) para extraer documentos del **SII (Chile)** usando **RUT +
Clave Tributaria**, con control de ritmo para minimizar el riesgo de bloqueo de
cuenta. El **frontend** web (Next.js) vive en su propio repo y consume esta API.

Pensado para correr **en la nube (Render, vía Docker)** o en local. Cuando corre
en la nube, todo el tráfico al SII puede salir por un **proxy con IP chilena**
(variable `SII_PROXY`) para evitar el bloqueo por IP — ver más abajo.

## ⚠️ Antes de empezar — lee esto

1. **Credenciales:** van en `.env` (ignorado por git) o en variables de entorno
   en Render. Nunca se versionan. Si una clave se filtró en algún chat o log,
   **cámbiala en el SII**.
2. **Certificado digital:** para **descargar/consultar** documentos NO se
   necesita certificado — solo RUT + Clave. El `.pfx` solo se requiere para
   *firmar/emitir* DTE, que no es parte de este extractor.
3. **Anti-bloqueo:** el sistema usa una sola sesión, pausas aleatorias
   (`SII_DELAY_MIN`/`MAX`), un User-Agent real y reúso de cookies. No bajes los
   delays ni corras muchos periodos en paralelo.

## Instalación (local)

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
playwright install chromium
```

Copia `.env.example` a `.env` y completa `SII_RUT` y `SII_CLAVE` con tus datos.
Levanta la API con: `uvicorn api:app --reload --port 8000`.

## Despliegue en la nube (Render)

El repo incluye `Dockerfile` y `render.yaml` (Blueprint). Las credenciales y
secretos se cargan como variables de entorno en el dashboard de Render (nunca en
el repo). Para enrutar el tráfico al SII por una IP chilena, define
`SII_PROXY=http://usuario:clave@host:puerto`. Déjalo vacío para conexión directa.

## Uso

**Empieza siempre por el test de login** (hace una sola petición):

```bash
python main.py test-login
```

Si dice `✅ Login OK`, las credenciales sirven. Luego:

```bash
# Un periodo de compras
python main.py rcv --periodo 202405 --op COMPRA

# Rango de periodos de ventas
python main.py rcv --desde 202401 --hasta 202412 --op VENTA

# Carpeta tributaria (PDF)
python main.py carpeta

# Formularios
python main.py f29 --periodo 202405
python main.py f22 --periodo 2024
```

Los archivos quedan en `./data/` (y en Supabase si está configurado).

## Estado de cada módulo

| Módulo | Archivo | Estado |
|---|---|---|
| Login RUT+Clave | `sii/auth.py` | ✅ implementado — verificar en vivo |
| RCV / DTEs | `sii/rcv.py` | ✅ implementado — verificar payload en vivo |
| Carpeta tributaria | `sii/carpeta.py` | ⚠️ falta confirmar endpoint de descarga |
| F29 / F22 | `sii/formularios.py` | ⚠️ falta confirmar endpoints |
| Storage local | `storage/local.py` | ✅ |
| Storage Supabase | `storage/supabase_store.py` | ✅ (requiere proyecto) |

> Los endpoints del SII cambian seguido. Cuando algo falle, abre el portal en el
> navegador con las **DevTools → pestaña Network**, repite la acción a mano y
> copia la URL/payload real al archivo correspondiente. Cada módulo indica
> exactamente dónde.

## Supabase (opcional)

1. Crea un proyecto en supabase.com.
2. SQL Editor → ejecuta `supabase_schema.sql`.
3. Storage → crea un bucket privado `sii-documentos`.
4. En `.env` completa `SUPABASE_URL` y `SUPABASE_SERVICE_KEY` (Settings → API →
   service_role key). **Nunca** publiques la service key.
5. `pip install supabase` y vuelve a correr los comandos: ahora sube a Supabase
   además del disco.

## Próximos pasos sugeridos

- Verificar `test-login` en vivo (1 request, sin riesgo).
- Confirmar el payload real del RCV y ajustar `sii/rcv.py`.
- Completar carpeta tributaria y formularios con los endpoints reales.
