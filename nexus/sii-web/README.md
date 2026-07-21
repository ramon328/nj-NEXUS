# SIInvergüenza — Extractor de documentos SII

Sistema para extraer documentos del **SII (Chile)** usando **RUT + Clave
Tributaria**, con control de ritmo para minimizar el riesgo de bloqueo de
cuenta. Incluye **backend** (FastAPI, este directorio) y **frontend** web
(Next.js, en `../frontend`).

## 🚀 Levantar todo con un comando

Desde la raíz del repo (un nivel arriba de `sii_extractor/`):

```bash
./start-web.sh
```

Instala las dependencias que falten (venv + `requirements.txt` + Chromium de
Playwright + `npm install`) y levanta **backend** (http://localhost:8000) y
**frontend** (http://localhost:3000). Abre el frontend en el navegador.
`Ctrl+C` detiene ambos. Si ya instalaste todo: `./start-web.sh --no-install`.

> Requisitos: Python 3.9+ y Node 18+. La primera vez tarda (baja Chromium y
> dependencias de npm).

## ⚠️ Antes de empezar — lee esto

1. **Credenciales:** van en `.env` (ya creado, ignorado por git). Si la clave
   se filtró en algún chat o log, **cámbiala en el SII**.
2. **Certificado digital:** el `.pfx` entregado está **vencido** (válido hasta
   2025-01-23) y pertenece a otra identidad (NICOLAS JURI / IMPORTADORA HN SPA),
   que no coincide con el RUT configurado. Para **descargar/consultar**
   documentos NO se necesita certificado — solo RUT + Clave. El certificado solo
   se requiere para *firmar/emitir* DTE.
3. **Anti-bloqueo:** el sistema usa una sola sesión, pausas aleatorias
   (`SII_DELAY_MIN`/`MAX`) y un User-Agent real. No bajes los delays ni corras
   muchos periodos en paralelo.

## Instalación

```bash
cd sii_extractor
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Copia `.env.example` a `.env` y completa `SII_RUT` y `SII_CLAVE` (ya están
puestos para este caso).

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
