#!/usr/bin/env python3
"""API web del extractor SII — multi-empresa, para correr en local.

Envuelve el módulo `sii` (auth, rcv, carpeta, formularios) y expone:
  - CRUD de empresas (SQLite, vía db.py)
  - Test de conexión al SII (reutiliza sesión para no gatillar bloqueos)
  - Jobs de descarga en background (RCV compras/ventas, carpeta, F29, F22)
  - Listado y descarga de los archivos generados

Arranque:  .venv/bin/uvicorn api:app --reload --port 8000
"""
from __future__ import annotations

import base64
import json
import os
import threading
import time
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional
from zoneinfo import ZoneInfo

# El SII reporta la expiración de la sesión en HORA DE CHILE. El servidor (Render)
# corre en UTC, así que hay que comparar en zonas conscientes o la sesión siempre
# parecería expirada (Chile va 3–4 h detrás de UTC).
_CHILE = ZoneInfo("America/Santiago")

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

import db
from sii import auth, rcv
from sii import rut as rututil
from sii.client import SiiClient
from sii.rate_limit import Throttle

BASE_DIR = Path(__file__).resolve().parent
DATA_ROOT = BASE_DIR / "data" / "empresas"
DATA_ROOT.mkdir(parents=True, exist_ok=True)

DELAY_MIN, DELAY_MAX, MAX_RETRIES = 2.0, 5.0, 3

# Catálogo de documentos que la UI puede ofrecer. `estable` marca lo verificado
# en vivo; el resto es experimental (endpoints aún por confirmar en el SII).
DOC_TYPES = [
    {"id": "rcv_compra", "nombre": "Compras (RCV)",
     "descripcion": "Facturas de compra electrónicas por periodo", "estable": True},
    {"id": "rcv_venta", "nombre": "Ventas (RCV)",
     "descripcion": "Facturas de venta electrónicas por periodo", "estable": True},
    {"id": "carpeta_oficial", "nombre": "Carpeta tributaria (PDF oficial SII)",
     "descripcion": "Documento oficial del SII (44 págs, con timbre). Requiere un destinatario con RUT distinto al de la empresa y ENVÍA un aviso por correo.",
     "estable": True, "requiere_destinatario": True},
    {"id": "f29", "nombre": "F29 (IVA mensual)",
     "descripcion": "Declaraciones de IVA, extraídas de la carpeta tributaria",
     "estable": True},
    {"id": "f22", "nombre": "F22 (Renta anual)",
     "descripcion": "PDF OFICIAL del F22 compacto (con folio) por año tributario, "
                    "más los datos código-a-código.",
     "estable": True},
    {"id": "ficha", "nombre": "Ficha del contribuyente",
     "descripcion": "Datos básicos, representantes, socios, participaciones, "
                    "bienes raíces y anotaciones (desde la carpeta tributaria).",
     "estable": True},
    {"id": "boletas", "nombre": "Boletas de honorarios",
     "descripcion": "BHE emitidas y BTE recibidas (últimos 12 periodos, desde la "
                    "carpeta tributaria). Si no registra, se indica en el PDF.",
     "estable": True},
    {"id": "libros", "nombre": "Libro de Compras/Ventas",
     "descripcion": "Resumen mensual de IVA por periodo (débito/crédito fiscal), "
                    "armado desde el RCV.",
     "estable": True},
    {"id": "propuesta_f29", "nombre": "Propuesta F29 (IVA a pagar)",
     "descripcion": "Estimación del IVA mensual a pagar calculada con el RCV "
                    "(débito de ventas − crédito de compras). No reemplaza la "
                    "declaración oficial.",
     "estable": True},
    {"id": "resumen_financiero", "nombre": "Resumen financiero (datos)",
     "descripcion": "Datos consolidados por periodo (ventas, compras, IVA débito/"
                    "crédito, IVA a pagar) en JSON + PDF. Base para conciliar, "
                    "calcular y automatizar con sistemas externos (ej. banco).",
     "estable": True},
    {"id": "propuesta_f29_oficial",
     "nombre": "Propuesta F29 precargada del SII [experimental]",
     "descripcion": "Códigos precargados por el SII para el F29. El IVA a pagar ya "
                    "lo entrega 'Propuesta F29 (IVA a pagar)'. Experimental: sin "
                    "verificar contra una empresa con F29 vigente.",
     "estable": False},
    {"id": "dte", "nombre": "Documentos individuales (DTE) [experimental]",
     "descripcion": "Intento best-effort de bajar PDF/XML de cada factura. "
                    "Para ventas emitidas suele poder; para compras depende del "
                    "proveedor. Experimental.",
     "estable": False},
]

app = FastAPI(title="SII Extractor API")

# Orígenes permitidos para llamadas desde el navegador. En la nube el front llama
# vía proxy server-side (mismo origen), así que normalmente no se necesita CORS;
# se puede ampliar con FRONTEND_ORIGIN="https://tuapp.vercel.app,https://..."
_origins = os.getenv(
    "FRONTEND_ORIGIN", "http://localhost:3000,http://127.0.0.1:3000"
).split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in _origins if o.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Gate de token ───────────────────────────────────────────────────────
# Si API_TOKEN está definido (despliegue público en Render), TODA petición a
# /api/* debe traer el token, sea en el header X-API-Token o en el query ?token=
# (los enlaces de descarga directa lo mandan por query). El health check queda
# exento para que Render pueda sondear. En local sin API_TOKEN no exige nada.
API_TOKEN = os.getenv("API_TOKEN", "").strip()


@app.middleware("http")
async def _exigir_token(request: Request, call_next):
    if API_TOKEN and request.method != "OPTIONS" and request.url.path != "/api/health":
        provisto = request.headers.get("X-API-Token") or request.query_params.get("token")
        if provisto != API_TOKEN:
            return JSONResponse({"detail": "No autorizado"}, status_code=401)
    return await call_next(request)


db.init_db()

# ─── Estado de jobs en memoria (proceso único, suficiente en local) ──────
_jobs: dict[str, dict] = {}
_jobs_lock = threading.Lock()


def _empresa_dir(empresa_id: int) -> Path:
    d = DATA_ROOT / str(empresa_id)
    d.mkdir(parents=True, exist_ok=True)
    return d


def _session_file(empresa_id: int) -> Path:
    return _empresa_dir(empresa_id) / "session.json"


def _estado_sesion(empresa_id: int) -> dict:
    """Estado de la sesión SII: si existe, cuándo vence y cuánto le queda.

    El SII guarda la expiración en la cookie NETSCAPE_LIVEWIRE.exp
    (YYYYMMDDHHMMSS, hora de Chile). La sesión dura ~120 min (cookie .lms).
    """
    sf = _session_file(empresa_id)
    if not sf.exists():
        return {"tiene_sesion": False, "vigente": False, "segundos_restantes": 0,
                "minutos_restantes": 0, "expira_hora": None,
                "mensaje": "Sin sesión. Se conectará al descargar."}
    try:
        data = json.loads(sf.read_text(encoding="utf-8"))
        cookies = data.get("cookies", {})
        # Vigencia por antigüedad del login (CONFIABLE): saved_at + duración (lms).
        # saved_at se actualiza en cada login/reuso verificado.
        lms = int(cookies.get("NETSCAPE_LIVEWIRE.lms") or 120)
        saved_at = data.get("saved_at", 0)
        exp_login = (
            datetime.fromtimestamp(saved_at, timezone.utc) + timedelta(minutes=lms)
            if saved_at else None
        )
        # Expiración que reporta el SII (hora de Chile), si está.
        exp_cookie = None
        exp_raw = cookies.get("NETSCAPE_LIVEWIRE.exp")
        if exp_raw:
            s = str(exp_raw)[:14]
            if len(s) == 12:
                s += "00"
            exp_cookie = datetime.strptime(s, "%Y%m%d%H%M%S").replace(tzinfo=_CHILE)
        # Se usa la MÁS optimista: evita "expirada" falsa justo tras login/reuso
        # (la cookie exp no siempre se refresca; saved_at sí).
        candidatos = [e for e in (exp_login, exp_cookie) if e]
        if not candidatos:
            raise ValueError("sin marca de expiración en la sesión")
        exp = max(candidatos)
        seg = (exp - datetime.now(timezone.utc)).total_seconds()
        exp_cl = exp.astimezone(_CHILE)
        return {
            "tiene_sesion": True,
            "vigente": seg > 0,
            "segundos_restantes": max(0, int(seg)),
            "minutos_restantes": max(0, int(seg // 60)),
            "expira_hora": exp_cl.strftime("%H:%M"),
            "expira": exp_cl.isoformat(timespec="minutes"),
            "mensaje": ("Sesión vigente" if seg > 0
                        else "Sesión expirada. Se reconectará al descargar."),
        }
    except Exception as exc:  # noqa: BLE001
        return {"tiene_sesion": False, "vigente": False, "segundos_restantes": 0,
                "minutos_restantes": 0, "expira_hora": None,
                "mensaje": f"No se pudo leer la sesión: {exc}"}


def _client_para(empresa: dict) -> SiiClient:
    """Devuelve un SiiClient autenticado para la empresa (reutiliza sesión)."""
    throttle = Throttle(DELAY_MIN, DELAY_MAX)
    client = SiiClient(throttle, max_retries=MAX_RETRIES)
    return auth.ensure_session(
        client, empresa["rut"], empresa["clave"], session_file=_session_file(empresa["id"])
    )


def periodos_rango(desde: str, hasta: str) -> list[str]:
    y0, m0 = int(desde[:4]), int(desde[4:])
    y1, m1 = int(hasta[:4]), int(hasta[4:])
    out, y, m = [], y0, m0
    while (y, m) <= (y1, m1):
        out.append(f"{y}{m:02d}")
        m += 1
        if m > 12:
            m, y = 1, y + 1
    return out


# ─── Modelos de request ──────────────────────────────────────────────────
class EmpresaIn(BaseModel):
    nombre: str
    rut: str
    clave: str


class EmpresaUpdate(BaseModel):
    nombre: str
    clave: Optional[str] = None


class DescargaIn(BaseModel):
    desde: str           # YYYYMM
    hasta: str           # YYYYMM
    docs: list[str]      # ids de DOC_TYPES
    # Solo para 'carpeta_oficial' (genera doc real y envía aviso por correo):
    dest_rut: Optional[str] = None
    dest_nombre: Optional[str] = None
    email: Optional[str] = None
    institucion: Optional[str] = "USO INTERNO"


# ─── Endpoints: catálogo ─────────────────────────────────────────────────
@app.get("/api/tipos-documento")
def tipos_documento():
    return DOC_TYPES


# ─── Endpoints: empresas ─────────────────────────────────────────────────
@app.get("/api/empresas")
def get_empresas():
    return db.listar_empresas()


@app.post("/api/empresas", status_code=201)
def post_empresa(body: EmpresaIn):
    if not body.rut.strip() or not body.clave.strip() or not body.nombre.strip():
        raise HTTPException(400, "Nombre, RUT y clave son obligatorios.")
    # Normalizamos el RUT (sin puntos, con guion) para que el control de
    # duplicados no se pueda burlar con distinto formato.
    rut = rututil.clean(body.rut)
    if not rututil.is_valid(rut):
        raise HTTPException(400, f"El RUT '{body.rut}' no es válido.")
    # Anti-duplicado: un mismo RUT cargado 2 veces = 2 logins a la misma cuenta
    # del SII = riesgo de bloqueo. Lo bloqueamos comparando RUTs normalizados.
    for e in db.listar_empresas():
        if rututil.clean(e["rut"]) == rut:
            raise HTTPException(
                409,
                f"Ya existe una empresa con el RUT {rut} (\"{e['nombre']}\"). "
                "No agregues el mismo RUT dos veces: provocaría logins duplicados "
                "a la misma cuenta y el SII podría bloquearla.",
            )
    try:
        return db.crear_empresa(body.nombre.strip(), rut, body.clave)
    except Exception as exc:  # noqa: BLE001 (UNIQUE rut, etc.)
        raise HTTPException(409, f"No se pudo crear la empresa: {exc}")


@app.put("/api/empresas/{empresa_id}")
def put_empresa(empresa_id: int, body: EmpresaUpdate):
    if not db.obtener_empresa(empresa_id):
        raise HTTPException(404, "Empresa no encontrada.")
    db.actualizar_credenciales(empresa_id, body.nombre.strip(), body.clave)
    # Si se cambió la clave, limpiar el bloqueo anti-login para permitir reintentar.
    if body.clave:
        auth.reset_login_guard(_session_file(empresa_id))
    return db.obtener_empresa(empresa_id)


@app.delete("/api/empresas/{empresa_id}", status_code=204)
def delete_empresa(empresa_id: int):
    db.eliminar_empresa(empresa_id)
    sf = _session_file(empresa_id)
    if sf.exists():
        sf.unlink()
    auth.reset_login_guard(sf)
    return None


@app.post("/api/empresas/{empresa_id}/desconectar")
def desconectar(empresa_id: int):
    """Cierra la sesión guardada (sin borrar la empresa). La próxima descarga
    iniciará sesión de nuevo."""
    if not db.obtener_empresa(empresa_id):
        raise HTTPException(404, "Empresa no encontrada.")
    sf = _session_file(empresa_id)
    if sf.exists():
        sf.unlink()
    auth.reset_login_guard(sf)
    db.actualizar_estado(empresa_id, "sin_probar")
    return {"ok": True, "mensaje": "Sesión cerrada. La próxima descarga iniciará sesión de nuevo."}


@app.get("/api/empresas/{empresa_id}/sesion")
def estado_sesion(empresa_id: int):
    if not db.obtener_empresa(empresa_id):
        raise HTTPException(404, "Empresa no encontrada.")
    return _estado_sesion(empresa_id)


@app.post("/api/empresas/{empresa_id}/test")
def test_conexion(empresa_id: int):
    empresa = db.obtener_empresa(empresa_id, con_clave=True)
    if not empresa:
        raise HTTPException(404, "Empresa no encontrada.")
    try:
        _client_para(empresa)
        db.actualizar_estado(empresa_id, "conectada", conectada=True)
        return {"ok": True, "mensaje": "Conexión con el SII verificada."}
    except auth.AuthError as exc:
        db.actualizar_estado(empresa_id, "error")
        return {"ok": False, "mensaje": str(exc)}
    except Exception as exc:  # noqa: BLE001
        db.actualizar_estado(empresa_id, "error")
        return {"ok": False, "mensaje": f"Error inesperado: {exc}"}


@app.post("/api/empresas/{empresa_id}/abrir")
def abrir_empresa(empresa_id: int):
    """Se llama al ABRIR una empresa. Re-loguea al SII SOLO si la sesión guardada
    expiró; si sigue vigente no hace nada (sin tráfico al SII → anti-bloqueo).

    Reutiliza `ensure_session` (que ya re-loguea solo si hace falta y respeta el
    circuit breaker), así que el caso común —sesión viva— ni siquiera abre un
    cliente.
    """
    empresa = db.obtener_empresa(empresa_id, con_clave=True)
    if not empresa:
        raise HTTPException(404, "Empresa no encontrada.")
    estado = _estado_sesion(empresa_id)               # sin red: lee session.json
    if estado["tiene_sesion"] and estado["vigente"]:  # NO-OP: sesión viva
        return {"accion": "sin_cambios", "vigente": True, "sesion": estado}
    try:
        _client_para(empresa)                          # = auth.ensure_session(...)
        db.actualizar_estado(empresa_id, "conectada", conectada=True)
        return {"accion": "reconectada", "vigente": True,
                "sesion": _estado_sesion(empresa_id)}
    except auth.LoginBloqueado as exc:                 # cooldown anti-bloqueo activo
        return {"accion": "bloqueado", "vigente": False,
                "mensaje": str(exc), "sesion": estado}
    except auth.AuthError as exc:                       # credenciales malas
        db.actualizar_estado(empresa_id, "error")
        return {"accion": "error", "vigente": False, "mensaje": str(exc)}
    except Exception as exc:  # noqa: BLE001
        return {"accion": "error", "vigente": False,
                "mensaje": f"Error inesperado: {exc}"}


# ─── Endpoints: descargas (jobs) ─────────────────────────────────────────
@app.post("/api/empresas/{empresa_id}/descargar")
def iniciar_descarga(empresa_id: int, body: DescargaIn):
    empresa = db.obtener_empresa(empresa_id, con_clave=True)
    if not empresa:
        raise HTTPException(404, "Empresa no encontrada.")
    if not body.docs:
        raise HTTPException(400, "Selecciona al menos un tipo de documento.")

    job_id = uuid.uuid4().hex[:12]
    with _jobs_lock:
        _jobs[job_id] = {
            "id": job_id, "empresa_id": empresa_id, "estado": "en_cola",
            "creado_en": time.time(), "total": 0, "completados": 0,
            "log": [], "resultados": [], "error": None,
        }
    t = threading.Thread(target=_run_job, args=(job_id, empresa, body), daemon=True)
    t.start()
    return {"job_id": job_id}


@app.get("/api/jobs/{job_id}")
def estado_job(job_id: str):
    with _jobs_lock:
        job = _jobs.get(job_id)
        if not job:
            raise HTTPException(404, "Job no encontrado.")
        return dict(job)


def _log(job_id: str, msg: str) -> None:
    with _jobs_lock:
        job = _jobs.get(job_id)
        if job is not None:
            job["log"].append({"t": time.time(), "msg": msg})


def _set(job_id: str, **kw) -> None:
    with _jobs_lock:
        job = _jobs.get(job_id)
        if job is not None:
            job.update(kw)


def _bump(job_id: str, resultado: dict) -> None:
    with _jobs_lock:
        job = _jobs.get(job_id)
        if job is not None:
            job["completados"] += 1
            job["resultados"].append(resultado)


def _run_job(job_id: str, empresa: dict, body: DescargaIn) -> None:
    empresa_id = empresa["id"]
    salida = _empresa_dir(empresa_id)
    periodos = periodos_rango(body.desde, body.hasta)
    ops = [d for d in ("rcv_compra", "rcv_venta") if d in body.docs]
    otros = [d for d in ("carpeta", "carpeta_oficial", "f29", "f22",
                         "ficha", "boletas", "dte") if d in body.docs]

    # Docs que se arman a partir de los datos de la carpeta (una sola consulta).
    docs_carpeta = [d for d in ("carpeta", "ficha", "boletas", "f29", "f22") if d in body.docs]

    # Unidades de trabajo (para la barra de progreso). RCV es por periodo;
    # carpeta/ficha/boletas/F29/F22/libros/dte son una unidad cada uno.
    anios = sorted({p[:4] for p in periodos})
    total = len(periodos) * len(ops) + len(otros)
    if "libros" in body.docs:
        total += 1
    if "propuesta_f29" in body.docs:
        total += 1
    if "resumen_financiero" in body.docs:
        total += 1
    if "propuesta_f29_oficial" in body.docs:
        total += 1
    _set(job_id, estado="conectando", total=max(total, 1))
    _log(job_id, "Conectando al SII…")

    try:
        client = _client_para(empresa)
        db.actualizar_estado(empresa_id, "conectada", conectada=True)
    except Exception as exc:  # noqa: BLE001
        _set(job_id, estado="error", error=f"No se pudo conectar: {exc}")
        _log(job_id, f"❌ Conexión fallida: {exc}")
        db.actualizar_estado(empresa_id, "error")
        return

    _set(job_id, estado="descargando")

    # ── RCV (compras/ventas) ──────────────────────────────────────────
    if ops:
        from sii import reportes
        r = rcv.RcvClient(client, empresa["rut"])
        r.inicio()
        op_map = {"rcv_compra": "COMPRA", "rcv_venta": "VENTA"}
        for doc in ops:
            op = op_map[doc]
            for periodo in periodos:
                try:
                    res = r.resumen(periodo, op)
                    data = res.get("data")
                    n_tipos = len(data) if isinstance(data, list) else 0
                    if not n_tipos:
                        _log(job_id, f"{op} {periodo}: sin datos")
                        _bump(job_id, {"doc": doc, "periodo": periodo, "ok": True,
                                       "docs": 0, "mensaje": "sin datos"})
                        continue
                    docs = sum(int(d.get("rsmnTotDoc") or 0) for d in data)
                    tipos = [int(d["rsmnTipoDocInteger"]) for d in data
                             if d.get("rsmnTipoDocInteger")]
                    base = salida / op.lower() / periodo
                    base.mkdir(parents=True, exist_ok=True)
                    json_path = base / "resumen.json"
                    json_path.write_text(
                        json.dumps(res, ensure_ascii=False, indent=2), encoding="utf-8")
                    csv = r.detalle_periodo_csv(periodo, op, tipos)
                    csv_path = base / "detalle.csv"
                    if csv:
                        csv_path.write_text(csv, encoding="utf-8-sig")
                    # Conversión a PDF: planilla (detalle) + resumen.
                    try:
                        reportes.genera_resumen_pdf(json_path, empresa["nombre"],
                                                    empresa["rut"], periodo, op,
                                                    base / "resumen.pdf")
                        if csv:
                            reportes.genera_planilla_pdf(csv_path, empresa["nombre"],
                                                         empresa["rut"], periodo, op,
                                                         base / "planilla.pdf")
                    except Exception as exc:  # noqa: BLE001
                        _log(job_id, f"   (PDF {op} {periodo} no generado: {exc})")
                    _log(job_id, f"✅ {op} {periodo}: {docs} documentos → PDF")
                    _bump(job_id, {"doc": doc, "periodo": periodo, "ok": True, "docs": docs})
                except Exception as exc:  # noqa: BLE001
                    _log(job_id, f"⚠️ {op} {periodo} falló: {exc}")
                    _bump(job_id, {"doc": doc, "periodo": periodo, "ok": False,
                                   "mensaje": str(exc)})

    # ── Sesión para la carpeta (REUTILIZADA, sin login extra) ──────────
    # El portal de la carpeta usa OAuth, pero `carpeta.obtener_datos` lo resuelve
    # inyectando las cookies de la sesión ya iniciada en un navegador real que
    # completa el handshake por sí mismo. Verificado en vivo: con la sesión
    # REUTILIZADA todos los endpoints devuelven 200 (no hace falta re-loguear).
    # Por eso aquí NO forzamos login: `ensure_session` solo lo hará si la sesión
    # guardada realmente murió, respetando el circuit breaker anti-bloqueo.
    if any(d in otros for d in ("carpeta", "carpeta_oficial", "f29", "f22",
                                "ficha", "boletas")):
        try:
            _log(job_id, "Validando sesión para la carpeta tributaria (reutiliza)…")
            auth.ensure_session(
                client, empresa["rut"], empresa["clave"],
                session_file=_session_file(empresa_id))
        except Exception as exc:  # noqa: BLE001
            _log(job_id, f"⚠️ No hay sesión válida para la carpeta: {exc}")

    # ── Datos de la carpeta: UNA SOLA consulta (navegador) compartida por
    #    carpeta / ficha / boletas. Anti-bloqueo: no se repite la consulta ni
    #    se abren navegadores extra. F29/F22 usan FormulariosClient (cachea su
    #    propia carga); carpeta_oficial es un flujo aparte (PDF del SII).
    datos_carpeta = None
    if docs_carpeta:
        try:
            from sii import carpeta
            _log(job_id, "Obteniendo datos de la carpeta (1 sola consulta, reusada)…")
            datos_carpeta = carpeta.obtener_datos(client, empresa["rut"])
        except Exception as exc:  # noqa: BLE001
            _log(job_id, f"⚠️ No se pudieron obtener los datos de la carpeta: {exc}")

    # ── Carpeta tributaria (navegador headless + PDF reconstruido) ─────
    if "carpeta" in otros:
        try:
            from sii import reportes
            if datos_carpeta is None:
                raise RuntimeError("Sin datos de la carpeta.")
            base = salida / "carpeta"
            base.mkdir(parents=True, exist_ok=True)
            (base / "carpeta_datos.json").write_text(
                json.dumps(datos_carpeta, ensure_ascii=False, indent=2), encoding="utf-8")
            pdf_ok = reportes.genera_carpeta_pdf(
                datos_carpeta, empresa["nombre"], empresa["rut"],
                base / "carpeta_tributaria.pdf")
            _log(job_id, "✅ Carpeta tributaria lista" if pdf_ok
                 else "✅ Carpeta: datos guardados (PDF sin contenido)")
            _bump(job_id, {"doc": "carpeta", "ok": True})
        except Exception as exc:  # noqa: BLE001
            _log(job_id, f"⚠️ Carpeta tributaria no disponible: {exc}")
            _bump(job_id, {"doc": "carpeta", "ok": False, "mensaje": str(exc)})

    # ── Ficha del contribuyente (reusa datos_carpeta) ──────────────────
    if "ficha" in otros:
        try:
            from sii import reportes
            if datos_carpeta is None:
                raise RuntimeError("Sin datos de la carpeta.")
            base = salida / "ficha"
            base.mkdir(parents=True, exist_ok=True)
            pdf_ok = reportes.genera_ficha_pdf(
                datos_carpeta, empresa["nombre"], empresa["rut"],
                base / "ficha_contribuyente.pdf")
            _log(job_id, "✅ Ficha del contribuyente lista" if pdf_ok
                 else "⚠️ Ficha: sin datos del contribuyente")
            _bump(job_id, {"doc": "ficha", "ok": bool(pdf_ok)})
        except Exception as exc:  # noqa: BLE001
            _log(job_id, f"⚠️ Ficha no disponible: {exc}")
            _bump(job_id, {"doc": "ficha", "ok": False, "mensaje": str(exc)})

    # ── Boletas de honorarios (reusa datos_carpeta; maneja vacío) ──────
    if "boletas" in otros:
        try:
            from sii import reportes
            if datos_carpeta is None:
                raise RuntimeError("Sin datos de la carpeta.")
            base = salida / "boletas"
            base.mkdir(parents=True, exist_ok=True)
            bhe = reportes._boletas_lista(datos_carpeta.get("boletasHonorarios"))
            bte = reportes._boletas_lista(datos_carpeta.get("boletasTerceros"))
            reportes.genera_boletas_pdf(
                datos_carpeta, empresa["nombre"], empresa["rut"],
                base / "boletas_honorarios.pdf")
            # Si hay datos, también CSV.
            if bhe or bte:
                import csv as _csv
                import io as _io
                buf = _io.StringIO()
                w = _csv.writer(buf, delimiter=";")
                w.writerow(["tipo", "folio", "fecha", "contraparte",
                            "bruto", "retencion", "liquido"])
                for tipo, lista in (("BHE_emitida", bhe), ("BTE_recibida", bte)):
                    for b in lista:
                        w.writerow([tipo,
                                    b.get("folio") or b.get("numeroBoleta") or "",
                                    b.get("fecha") or b.get("fechaEmision") or "",
                                    b.get("nombre") or b.get("razonSocial") or "",
                                    b.get("montoBruto") or b.get("totalHonorarios") or "",
                                    b.get("montoRetencion") or b.get("retencion") or "",
                                    b.get("montoLiquido") or b.get("liquido") or ""])
                (base / "boletas.csv").write_text(buf.getvalue(), encoding="utf-8-sig")
                _log(job_id, f"✅ Boletas: {len(bhe)} BHE + {len(bte)} BTE → PDF + CSV")
            else:
                _log(job_id, "✅ Boletas: no registra boletas (PDF informativo)")
            _bump(job_id, {"doc": "boletas", "ok": True,
                           "bhe": len(bhe), "bte": len(bte)})
        except Exception as exc:  # noqa: BLE001
            _log(job_id, f"⚠️ Boletas no disponibles: {exc}")
            _bump(job_id, {"doc": "boletas", "ok": False, "mensaje": str(exc)})

    # ── Carpeta tributaria OFICIAL (PDF del SII, envía aviso por correo) ─
    if "carpeta_oficial" in otros:
        try:
            from sii import carpeta
            if not (body.dest_rut and body.email):
                raise ValueError("Falta RUT destinatario y/o correo.")
            base = salida / "carpeta"
            base.mkdir(parents=True, exist_ok=True)
            destino = base / "carpeta_tributaria_oficial.pdf"
            ok = carpeta.generar_oficial(
                client, empresa["rut"], body.dest_rut, body.dest_nombre or "",
                body.email, destino, body.institucion or "USO INTERNO")
            _log(job_id, "✅ Carpeta tributaria OFICIAL generada (PDF del SII)" if ok
                 else "⚠️ No se pudo generar la carpeta oficial")
            _bump(job_id, {"doc": "carpeta_oficial", "ok": ok})
        except Exception as exc:  # noqa: BLE001
            _log(job_id, f"⚠️ Carpeta oficial falló: {exc}")
            _bump(job_id, {"doc": "carpeta_oficial", "ok": False, "mensaje": str(exc)})

    # ── Formularios F29 / F22 (consolidados a un PDF por rango) ────────
    if "f29" in otros or "f22" in otros:
        from sii import reportes
        from sii.formularios import FormulariosClient
        f = FormulariosClient(client, empresa["rut"])
        objetivo_periodos = {p.replace("-", "") for p in periodos}
        objetivo_anios = set(anios)

        def _f29_en_rango(formularios: list) -> list:
            return [x for x in formularios
                    if "".join(ch for ch in str(x.get("periodo")) if ch.isdigit())
                    in objetivo_periodos]

        if "f29" in otros:
            try:
                forms = _f29_en_rango(f.consultar_f29()["formularios"])
                # Caso lag del SII: algún periodo del rango sin compactoBase64.
                # Reintento UNA vez reusando la sesión (sin re-loguear) — a veces
                # el segundo hit ya trae el PDF oficial.
                faltan = [x for x in forms if not x.get("compactoBase64")]
                if faltan:
                    _log(job_id, f"F29: {len(faltan)} periodo(s) sin PDF oficial "
                                 "(lag del SII) — reintentando una vez…")
                    try:
                        f.refrescar()
                        forms = _f29_en_rango(f.consultar_f29()["formularios"])
                    except Exception as exc:  # noqa: BLE001
                        _log(job_id, f"   (reintento F29 no concluyó: {exc})")

                base = salida / "formularios" / "f29"
                base.mkdir(parents=True, exist_ok=True)
                # PDF oficial del SII (formulario compacto) embebido como base64.
                oficiales = 0
                sin_pdf = []
                meta = []
                for x in forms:
                    per = "".join(ch for ch in str(x.get("periodo")) if ch.isdigit())
                    cb = x.get("compactoBase64")
                    if cb:
                        try:
                            (base / f"f29_{per}.pdf").write_bytes(base64.b64decode(cb))
                            oficiales += 1
                        except Exception:  # noqa: BLE001
                            sin_pdf.append(per)
                    else:
                        sin_pdf.append(per)
                    meta.append({k: v for k, v in x.items() if k != "compactoBase64"})
                # JSON liviano (sin base64) + PDF índice de los periodos.
                (base / "f29.json").write_text(
                    json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
                reportes.genera_f29_pdf(meta, empresa["nombre"], empresa["rut"],
                                        base / "f29_indice.pdf")
                detalle = (f", {oficiales} PDF oficiales del SII" if oficiales
                           else " (sin PDF oficial; índice generado)")
                if sin_pdf:
                    detalle += (f" — sin PDF oficial (lag del SII): "
                                f"{', '.join(sorted(sin_pdf))}")
                _log(job_id, f"✅ F29: {len(forms)} formularios{detalle}")
                _bump(job_id, {"doc": "f29", "ok": True, "docs": len(forms),
                               "oficiales": oficiales, "sin_pdf": sorted(sin_pdf)})
            except Exception as exc:  # noqa: BLE001
                _log(job_id, f"⚠️ F29 falló: {exc}")
                _bump(job_id, {"doc": "f29", "ok": False, "mensaje": str(exc)})

        if "f22" in otros:
            try:
                # F22 OFICIAL (verificado en vivo): app consultaestadof22ui →
                # consultaFolios (folio por año) → f22Compacto/pdf64 (PDF oficial).
                from sii import renta
                base = salida / "formularios" / "f22"
                base.mkdir(parents=True, exist_ok=True)
                f22c = renta.F22Client(client, empresa["rut"])
                resumen, bajados = [], 0
                for anio in sorted(objetivo_anios):
                    try:
                        folios = f22c.folios(anio)
                    except Exception as exc:  # noqa: BLE001
                        _log(job_id, f"   (F22 {anio} sin folios: {exc})")
                        continue
                    if not folios:
                        continue
                    # Declaración vigente (vgte=='1') o la primera del año.
                    fdecl = next((x for x in folios if str(x.get("vgte")) == "1"),
                                 folios[0])
                    folio = fdecl.get("folio")
                    resumen.append({"anio": anio, "folio": folio,
                                    "fecha": fdecl.get("fecIng"),
                                    "estado": fdecl.get("evigCodigo")})
                    pdf = f22c.compacto_pdf(anio, folio)
                    if pdf:
                        (base / f"f22_{anio}_oficial.pdf").write_bytes(pdf)
                        bajados += 1
                    datos = f22c.datos_compacto(anio, folio)
                    if datos:
                        (base / f"f22_{anio}_datos.json").write_text(
                            json.dumps(datos, ensure_ascii=False, indent=2),
                            encoding="utf-8")
                (base / "f22.json").write_text(
                    json.dumps(resumen, ensure_ascii=False, indent=2), encoding="utf-8")
                _log(job_id,
                     f"✅ F22 OFICIAL: {bajados} PDF descargado(s) de "
                     f"{len(resumen)} declaración(es)"
                     if bajados else "F22: sin declaraciones en el rango")
                _bump(job_id, {"doc": "f22", "ok": True, "docs": bajados,
                               "oficial": True})
            except Exception as exc:  # noqa: BLE001
                _log(job_id, f"⚠️ F22 falló: {exc}")
                _bump(job_id, {"doc": "f22", "ok": False, "mensaje": str(exc)})

    # ── Libro, Propuesta F29 y Resumen financiero (todos desde el RCV) ─
    if any(d in body.docs for d in ("libros", "propuesta_f29", "resumen_financiero")):
        from sii import reportes
        rcv_tot: list[dict] = []
        try:
            r = rcv.RcvClient(client, empresa["rut"])
            r.inicio()
            for op in ("COMPRA", "VENTA"):
                for periodo in periodos:
                    try:
                        res = r.resumen(periodo, op)
                        data = res.get("data")
                        if not isinstance(data, list) or not data:
                            continue
                        rcv_tot.append({
                            "periodo": periodo, "operacion": op,
                            "neto": sum(int(d.get("rsmnMntNeto") or 0) for d in data),
                            "exento": sum(int(d.get("rsmnMntExe") or 0) for d in data),
                            "iva": sum(int(d.get("rsmnMntIVA") or 0) for d in data),
                            "total": sum(int(d.get("rsmnMntTotal") or 0) for d in data),
                            "docs": sum(int(d.get("rsmnTotDoc") or 0) for d in data),
                        })
                    except Exception as exc:  # noqa: BLE001
                        _log(job_id, f"   (RCV {op} {periodo} sin datos: {exc})")
        except Exception as exc:  # noqa: BLE001
            _log(job_id, f"⚠️ No se pudo leer el RCV (Libro/Propuesta): {exc}")

        if "libros" in body.docs:
            try:
                base = salida / "libros"
                base.mkdir(parents=True, exist_ok=True)
                (base / "libros_datos.json").write_text(
                    json.dumps(rcv_tot, ensure_ascii=False, indent=2), encoding="utf-8")
                pdf_ok = reportes.genera_libro_pdf(
                    rcv_tot, empresa["nombre"], empresa["rut"],
                    base / f"libro_{body.desde}_{body.hasta}.pdf")
                _log(job_id, f"✅ Libro de Compras/Ventas: {len(rcv_tot)} periodos → PDF"
                     if pdf_ok else "Libro: sin datos de RCV en el rango")
                _bump(job_id, {"doc": "libros", "ok": True, "periodos": len(rcv_tot)})
            except Exception as exc:  # noqa: BLE001
                _log(job_id, f"⚠️ Libro de Compras/Ventas falló: {exc}")
                _bump(job_id, {"doc": "libros", "ok": False, "mensaje": str(exc)})

        if "propuesta_f29" in body.docs:
            try:
                base = salida / "propuesta_f29"
                base.mkdir(parents=True, exist_ok=True)
                (base / "propuesta_f29_datos.json").write_text(
                    json.dumps(rcv_tot, ensure_ascii=False, indent=2), encoding="utf-8")
                pdf_ok = reportes.genera_propuesta_f29_pdf(
                    rcv_tot, empresa["nombre"], empresa["rut"],
                    base / f"propuesta_f29_{body.desde}_{body.hasta}.pdf")
                _log(job_id, f"✅ Propuesta F29: {len(rcv_tot)} periodos → PDF"
                     if pdf_ok else "Propuesta F29: sin datos de RCV en el rango")
                _bump(job_id, {"doc": "propuesta_f29", "ok": True, "periodos": len(rcv_tot)})
            except Exception as exc:  # noqa: BLE001
                _log(job_id, f"⚠️ Propuesta F29 falló: {exc}")
                _bump(job_id, {"doc": "propuesta_f29", "ok": False, "mensaje": str(exc)})

        if "resumen_financiero" in body.docs:
            try:
                base = salida / "resumen_financiero"
                base.mkdir(parents=True, exist_ok=True)
                consolidado = reportes.consolidar_financiero(rcv_tot)
                # JSON estructurado (la base para automatizar/calcular) + PDF.
                (base / "resumen_financiero.json").write_text(
                    json.dumps(consolidado, ensure_ascii=False, indent=2), encoding="utf-8")
                pdf_ok = reportes.genera_resumen_financiero_pdf(
                    consolidado, empresa["nombre"], empresa["rut"],
                    base / f"resumen_financiero_{body.desde}_{body.hasta}.pdf")
                _log(job_id,
                     f"✅ Resumen financiero: {len(consolidado)} periodo(s) → JSON + PDF"
                     if pdf_ok else "Resumen financiero: sin datos de RCV en el rango")
                _bump(job_id, {"doc": "resumen_financiero", "ok": True,
                               "periodos": len(consolidado)})
            except Exception as exc:  # noqa: BLE001
                _log(job_id, f"⚠️ Resumen financiero falló: {exc}")
                _bump(job_id, {"doc": "resumen_financiero", "ok": False, "mensaje": str(exc)})

    # ── Propuesta F29 PRECARGADA del SII (app propuestaf29ui) ──────────
    if "propuesta_f29_oficial" in body.docs:
        try:
            from sii import iva, reportes
            base = salida / "propuesta_f29_oficial"
            base.mkdir(parents=True, exist_ok=True)
            pc = iva.PropuestaF29Client(client, empresa["rut"])
            por_periodo = []
            for periodo in periodos:
                try:
                    cods = pc.codigos(periodo)
                except Exception as exc:  # noqa: BLE001
                    _log(job_id, f"   (propuesta F29 {periodo}: {exc})")
                    continue
                if cods:
                    por_periodo.append({"periodo": periodo, "codigos": cods})
            (base / "propuesta_f29_oficial.json").write_text(
                json.dumps(por_periodo, ensure_ascii=False, indent=2), encoding="utf-8")
            reportes.genera_propuesta_f29_oficial_pdf(
                por_periodo, empresa["nombre"], empresa["rut"],
                base / f"propuesta_f29_oficial_{body.desde}_{body.hasta}.pdf")
            _log(job_id,
                 f"✅ Propuesta F29 precargada: {len(por_periodo)} periodo(s) con datos"
                 if por_periodo else
                 "Propuesta F29 precargada: el SII no tiene propuesta para estos periodos")
            _bump(job_id, {"doc": "propuesta_f29_oficial", "ok": True,
                           "periodos": len(por_periodo)})
        except Exception as exc:  # noqa: BLE001
            _log(job_id, f"⚠️ Propuesta F29 precargada falló: {exc}")
            _bump(job_id, {"doc": "propuesta_f29_oficial", "ok": False, "mensaje": str(exc)})

    # ── DTE individuales (EXPERIMENTAL, best-effort, honesto) ──────────
    # Intento de bajar el PDF/XML de cada factura. Para VENTAS emitidas suele
    # ser viable; para COMPRAS depende del proveedor. Si la empresa no tiene
    # ventas, normalmente no habrá nada que bajar. No rompe nada: si no es
    # viable de forma fiable, deja un mensaje claro en el job.
    if "dte" in otros:
        try:
            r = rcv.RcvClient(client, empresa["rut"])
            r.inicio()
            base = salida / "dte"
            ventas_periodos = []
            for periodo in periodos:
                try:
                    res = r.resumen(periodo, "VENTA")
                    data = res.get("data")
                    if isinstance(data, list) and any(
                            int(d.get("rsmnTotDoc") or 0) for d in data):
                        ventas_periodos.append(periodo)
                except Exception:  # noqa: BLE001
                    pass
            if not ventas_periodos:
                msg = ("Sin ventas emitidas en el rango: no hay DTE propios que "
                       "descargar. Las facturas de compra son DTE de terceros y el "
                       "SII no expone su PDF/XML de forma fiable por esta vía. "
                       "Función experimental: no hay nada que bajar para esta empresa.")
                _log(job_id, f"🔬 DTE (experimental): {msg}")
                base.mkdir(parents=True, exist_ok=True)
                (base / "DTE_LEEME.txt").write_text(msg, encoding="utf-8")
                _bump(job_id, {"doc": "dte", "ok": True, "experimental": True,
                               "descargados": 0, "mensaje": msg})
            else:
                msg = (f"Hay ventas emitidas en {len(ventas_periodos)} periodo(s). "
                       "La descarga del PDF/XML individual de cada DTE no está "
                       "verificada de forma fiable en este entorno; se marca como "
                       "experimental y no se fuerza para evitar bloqueos. Usa el "
                       "RCV/Libro para el detalle agregado.")
                _log(job_id, f"🔬 DTE (experimental): {msg}")
                base.mkdir(parents=True, exist_ok=True)
                (base / "DTE_LEEME.txt").write_text(msg, encoding="utf-8")
                _bump(job_id, {"doc": "dte", "ok": True, "experimental": True,
                               "descargados": 0, "mensaje": msg})
        except Exception as exc:  # noqa: BLE001
            _log(job_id, f"🔬 DTE (experimental) no concluyó: {exc}")
            _bump(job_id, {"doc": "dte", "ok": False, "experimental": True,
                           "mensaje": str(exc)})

    client.save_cookies(_session_file(empresa_id))
    _set(job_id, estado="completado")
    _log(job_id, "🏁 Descarga finalizada.")


# ─── Endpoints: documentos generados ─────────────────────────────────────
@app.get("/api/empresas/{empresa_id}/documentos")
def listar_documentos(empresa_id: int):
    if not db.obtener_empresa(empresa_id):
        raise HTTPException(404, "Empresa no encontrada.")
    base = _empresa_dir(empresa_id)
    out = []
    for path in sorted(base.rglob("*")):
        if not path.is_file() or path.name == "session.json":
            continue
        rel = path.relative_to(base)
        partes = rel.parts
        out.append({
            "ruta": str(rel),
            "nombre": path.name,
            "tipo": path.suffix.lstrip(".") or "?",
            "grupo": partes[0] if partes else "",
            "periodo": partes[1] if len(partes) > 2 else None,
            "size": path.stat().st_size,
            "modificado": path.stat().st_mtime,
        })
    return out


@app.get("/api/empresas/{empresa_id}/archivo")
def descargar_archivo(empresa_id: int, ruta: str, inline: bool = False):
    """Sirve un archivo. `inline=1` lo muestra en el navegador (vista previa);
    por defecto fuerza la descarga."""
    base = _empresa_dir(empresa_id).resolve()
    destino = (base / ruta).resolve()
    if not str(destino).startswith(str(base)) or not destino.is_file():
        raise HTTPException(404, "Archivo no encontrado.")
    return FileResponse(
        destino,
        filename=destino.name,
        content_disposition_type="inline" if inline else "attachment",
    )


@app.delete("/api/empresas/{empresa_id}/archivo", status_code=204)
def eliminar_archivo(empresa_id: int, ruta: str):
    """Elimina un archivo descargado del equipo (con validación de ruta)."""
    base = _empresa_dir(empresa_id).resolve()
    destino = (base / ruta).resolve()
    if not str(destino).startswith(str(base)) or not destino.is_file():
        raise HTTPException(404, "Archivo no encontrado.")
    destino.unlink()
    # Limpia carpetas que queden vacías (estética del listado).
    for carpeta in [destino.parent, *destino.parents]:
        if carpeta == base:
            break
        try:
            next(carpeta.iterdir())
        except StopIteration:
            carpeta.rmdir()
        except OSError:
            break
    return None


@app.get("/api/health")
def health():
    return {"ok": True}
