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
import calendar
import json
import re
import threading
import time
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

import db
from sii import auth, emitir as emitir_dte, rcv
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
     "descripcion": "Declaraciones de renta, extraídas de la carpeta tributaria",
     "estable": True},
    {"id": "ficha", "nombre": "Ficha del contribuyente",
     "descripcion": "Datos básicos, representantes, socios, participaciones, "
                    "bienes raíces y anotaciones (desde la carpeta tributaria).",
     "estable": True},
    {"id": "boletas", "nombre": "Boletas de honorarios recibidas",
     "descripcion": "Boletas de Honorarios electrónicas RECIBIDAS (las que terceros "
                    "le emiten a la empresa), resumen mensual del año actual y el "
                    "anterior, desde el portal del SII. Si no registra, se indica en el PDF.",
     "estable": True},
    {"id": "libros", "nombre": "Libro de Compras/Ventas",
     "descripcion": "Resumen mensual de IVA por periodo (débito/crédito fiscal), "
                    "armado desde el RCV.",
     "estable": True},
    {"id": "facturas", "nombre": "Facturas de compra a detalle (PDF)",
     "descripcion": "PDF timbrado de CADA factura de compra recibida en el periodo, "
                    "con sus líneas de productos, desde el Sistema de Facturación "
                    "Gratuito del SII. Requiere el facturador (persona autorizada) "
                    "configurado para la empresa. Acotado a N documentos por corrida.",
     "estable": True},
    {"id": "dte", "nombre": "Documentos individuales (DTE) [experimental]",
     "descripcion": "Intento best-effort de bajar PDF/XML de cada factura. "
                    "Para ventas emitidas suele poder; para compras depende del "
                    "proveedor. Experimental.",
     "estable": False},
]

import os
from fastapi.responses import JSONResponse as _JSONResponse
from dotenv import load_dotenv as _load_dotenv
_load_dotenv()  # asegura que el .env esté cargado antes de leer API_TOKEN/ALLOWED_ORIGINS

app = FastAPI(title="SII Extractor API")

# Orígenes permitidos (CORS). Configurable por env ALLOWED_ORIGINS (coma-separado);
# por defecto localhost. Agregar aquí el dominio de Vercel del frontend.
_origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Token de seguridad: el backend queda PÚBLICO (Tailscale Funnel) y tiene credenciales
# tributarias, así que exigimos un token en /api/* (menos /api/health, para el chequeo
# del túnel). El frontend lo manda en el header 'X-API-Token'. Si API_TOKEN no está
# seteado, no se exige (modo local).
API_TOKEN = os.getenv("API_TOKEN", "").strip()

# Empresas AUTORIZADAS a emitir DTE. El resto es SOLO LECTURA: descargan y consultan,
# pero no emiten nada. Decisión de Ramón (09-ago-2026) al cargar ACE SPA (id 4): ACE
# NO emite. Es un candado POR EMPRESA, aparte del global SII_EMISION_HABILITADA.
# Para autorizar otra empresa: SII_EMISORES_PERMITIDOS=3,4 en el .env (coma-separado).
EMISORES_PERMITIDOS = {
    s.strip() for s in os.getenv("SII_EMISORES_PERMITIDOS", "3").split(",") if s.strip()
}


@app.middleware("http")
async def _exigir_token(request, call_next):
    token = os.getenv("API_TOKEN", "").strip()
    if token and request.method != "OPTIONS":
        p = request.url.path
        if p.startswith("/api/") and p != "/api/health":
            # Acepta el token por header (normal) o por query ?token= (enlaces de descarga).
            recibido = request.headers.get("X-API-Token", "") or request.query_params.get("token", "")
            if recibido != token:
                return _JSONResponse({"detail": "No autorizado (token inválido o ausente)."}, status_code=401)
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
        exp_raw = cookies.get("NETSCAPE_LIVEWIRE.exp")
        if exp_raw:
            s = str(exp_raw)[:14]
            if len(s) == 12:
                s += "00"
            exp = datetime.strptime(s, "%Y%m%d%H%M%S")
        else:  # fallback: guardado + duración (lms) en minutos
            lms = int(cookies.get("NETSCAPE_LIVEWIRE.lms") or 120)
            exp = datetime.fromtimestamp(data.get("saved_at", 0)) + timedelta(minutes=lms)
        seg = (exp - datetime.now()).total_seconds()
        return {
            "tiene_sesion": True,
            "vigente": seg > 0,
            "segundos_restantes": max(0, int(seg)),
            "minutos_restantes": max(0, int(seg // 60)),
            "expira_hora": exp.strftime("%H:%M"),
            "expira": exp.isoformat(timespec="minutes"),
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


def _facturador(empresa_id: int) -> dict | None:
    """Persona autorizada por la empresa para el Sistema de Facturación Gratuito
    del SII (donde salen las facturas recibidas a detalle). Ese portal NO acepta
    la clave de la empresa: exige el RUT+clave de una persona. Config en
    facturadores.json (gitignored), keyed por empresa_id.
    """
    f = BASE_DIR / "facturadores.json"
    if not f.exists():
        return None
    try:
        data = json.loads(f.read_text(encoding="utf-8"))
    except Exception:  # noqa: BLE001
        return None
    return data.get(str(empresa_id))


def _emisor_extra(empresa_id: int) -> dict:
    """Datos del EMISOR que el formulario del SII no autocompleta (hoy: la ciudad de
    origen, obligatoria para llegar a la vista previa). Config en emisores.json,
    keyed por empresa_id. Antes 'SANTIAGO' estaba hardcodeado en el robot, que era el
    dato de ANA CLARA: con más de una empresa emitiendo eso ya no sirve."""
    f = BASE_DIR / "emisores.json"
    if not f.exists():
        return {}
    try:
        data = json.loads(f.read_text(encoding="utf-8"))
    except Exception:  # noqa: BLE001
        return {}
    e = data.get(str(empresa_id)) or {}
    return {k: v for k, v in e.items() if k in ("ciudad",) and v}


def _client_facturador(empresa_id: int, fac: dict) -> SiiClient:
    """SiiClient autenticado como el facturador (persona), sesión propia y
    reutilizada (un solo login, igual que la de la empresa)."""
    client = SiiClient(Throttle(DELAY_MIN, DELAY_MAX), max_retries=MAX_RETRIES)
    sf = _empresa_dir(empresa_id) / "facturador_session.json"
    return auth.ensure_session(client, fac["rut"], fac["clave"], session_file=sf)


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


class EmisorIn(BaseModel):
    ciudad: str


class DescargaIn(BaseModel):
    desde: str           # YYYYMM
    hasta: str           # YYYYMM
    docs: list[str]      # ids de DOC_TYPES
    # Solo para 'carpeta_oficial' (genera doc real y envía aviso por correo):
    dest_rut: Optional[str] = None
    dest_nombre: Optional[str] = None
    email: Optional[str] = None
    institucion: Optional[str] = "USO INTERNO"


class EmitirIn(BaseModel):
    tipo_dte: int                       # 33 factura, 34 factura exenta, 39 boleta
    receptor: dict = {}                 # {rut, nombre/razon_social, giro, direccion, comuna}
    items: list = []                    # [{nombre, cantidad, precio, exento?}]
    forma_pago: str = "contado"         # contado | credito
    fecha: Optional[str] = None         # YYYY-MM-DD (default hoy)
    observaciones: str = ""
    confirmar: bool = False             # False = solo borrador; True = intenta emitir de verdad


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


@app.post("/api/empresas/{empresa_id}/emitir")
def emitir_documento(empresa_id: int, body: EmitirIn):
    """Emite (o prepara) un DTE. Síncrono. SIMULA por defecto:
      - confirmar=False → valida y devuelve el BORRADOR (neto/IVA/total). NO toca el SII.
      - confirmar=True  → intenta emitir de verdad; BLINDADO: si falta config, no emite
                          y devuelve `faltan`. El borrador siempre viaja de vuelta."""
    empresa = db.obtener_empresa(empresa_id, con_clave=True)
    if not empresa:
        raise HTTPException(404, "Empresa no encontrada.")
    # Candado por empresa: una empresa no autorizada no emite NI arma borrador, para que
    # nadie confunda un borrador con el primer paso de una emisión que no debe ocurrir.
    if str(empresa_id) not in EMISORES_PERMITIDOS:
        return {
            "ok": False, "modo": "bloqueado",
            "mensaje": (f"{empresa['nombre']} NO está autorizada a emitir documentos: "
                        "está cargada en modo solo lectura (descargar y consultar). "
                        "No se armó ni borrador."),
            "faltan": ["Autorizar la empresa en SII_EMISORES_PERMITIDOS del .env."],
        }
    try:
        borrador = emitir_dte.preparar(
            empresa, body.tipo_dte, body.receptor, body.items,
            forma_pago=body.forma_pago, fecha=body.fecha, observaciones=body.observaciones,
        )
    except emitir_dte.ErrorEmision as exc:
        return {"ok": False, "modo": "error_datos", "mensaje": str(exc)}
    # Ciudad del emisor (la usa el robot en EFXP_CIUDAD_ORIGEN): por empresa, no fija.
    borrador["emisor"].update(_emisor_extra(empresa_id))

    pendientes = emitir_dte._pendientes_para_emitir(empresa)
    if not body.confirmar:
        return {"ok": True, "modo": "borrador", "borrador": borrador,
                "listo_para_emitir": not pendientes, "faltan": pendientes}
    try:
        resultado = emitir_dte.emitir(empresa, borrador)
        return {"ok": True, "modo": "emitido", "borrador": borrador, "resultado": resultado}
    except emitir_dte.EmisionNoHabilitada as exc:
        return {"ok": False, "modo": "bloqueado", "borrador": borrador,
                "mensaje": str(exc), "faltan": exc.faltan}


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
                         "ficha", "boletas", "dte", "facturas") if d in body.docs]

    # Docs que se arman a partir de los datos de la carpeta (una sola consulta).
    # "boletas" YA NO usa la carpeta: las BHE *recibidas* salen del portal dedicado
    # (la carpeta solo trae las emitidas + BTE, que para una empresa van vacías).
    docs_carpeta = [d for d in ("carpeta", "ficha", "f29", "f22") if d in body.docs]

    # Unidades de trabajo (para la barra de progreso). RCV es por periodo;
    # carpeta/ficha/boletas/F29/F22/libros/dte son una unidad cada uno.
    anios = sorted({p[:4] for p in periodos})
    total = len(periodos) * len(ops) + len(otros)
    if "libros" in body.docs:
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
        ini = r.inicio()
        # OJO: si inicio() da 401 con un token RECIÉN logueado, NO es expiración (sería
        # inútil re-loguear y solo arriesga bloqueo). Es un problema del módulo RCV del
        # SII (la sesión no autoriza www4/consdcvinternetui). Lo dejamos visible y NO
        # re-logueamos en bucle. El token vencido ya se maneja proactivamente en ensure_session.
        if isinstance(ini, dict) and ini.get("_error"):
            _log(job_id, f"⚠️ RCV: el SII rechazó la sesión en consdcvinternetui ({ini.get('_error')}). "
                         "El token está fresco, así que es un tema del flujo RCV (no del login). No re-logueo para no arriesgar bloqueo.")
        op_map = {"rcv_compra": "COMPRA", "rcv_venta": "VENTA"}
        for doc in ops:
            op = op_map[doc]
            for periodo in periodos:
                try:
                    res = r.resumen(periodo, op)
                    # El módulo RCV del SII (consdcvinternetui) a veces rechaza la sesión
                    # con un 401 TRANSITORIO aunque el login esté fresco, y se recupera al
                    # instante. Reintentamos UNA vez re-registrando el contexto (inicio()),
                    # con una pausa corta. Un solo reintento: no arriesga bloqueo del RUT.
                    if isinstance(res, dict) and res.get("_error") == "HTTP 401":
                        _log(job_id, f"↻ {op} {periodo}: el SII rechazó el RCV (401 transitorio); reintento en 4s…")
                        time.sleep(4)
                        try:
                            r._inicio_ok = False   # fuerza re-registrar el contexto RCV
                            res = r.resumen(periodo, op)
                        except Exception as _e:  # noqa: BLE001
                            res = {"_error": "HTTP 401", "_body": str(_e)[:200]}
                    if isinstance(res, dict) and res.get("_error"):
                        es_401 = res.get("_error") == "HTTP 401"
                        _log(job_id, (f"⚠️ {op} {periodo}: el SII sigue rechazando el RCV (401) tras el reintento. "
                                      f"Suele ser temporal del SII — vuelve a intentar en unos minutos."
                                      if es_401 else
                                      f"⚠️ {op} {periodo}: SIN respuesta válida del SII "
                                      f"({res.get('_error')}). Detalle: {res.get('_body','')[:160]}"))
                        _bump(job_id, {"doc": doc, "periodo": periodo, "ok": False, "docs": 0,
                                       "error": res.get("_error"),
                                       "detalle": ("El SII rechazó el módulo RCV (401). Suele ser temporal; reintenta en unos minutos."
                                                   if es_401 else res.get("_body", "")[:200])})
                        continue
                    data = res.get("data")
                    n_tipos = len(data) if isinstance(data, list) else 0
                    if not n_tipos:
                        _log(job_id, f"{op} {periodo}: sin datos (0 documentos en el SII)")
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

    # ── Boletas de honorarios RECIBIDAS (las que terceros le emiten a la empresa) ──
    # Fuente real: portal dedicado del SII (no la carpeta). Reusa la sesión.
    if "boletas" in otros:
        try:
            from sii import reportes, boletas_recibidas
            base = salida / "boletas"
            base.mkdir(parents=True, exist_ok=True)
            recibidas = boletas_recibidas.obtener(client, empresa["rut"])
            reportes.genera_boletas_recibidas_pdf(
                recibidas, empresa["nombre"], empresa["rut"],
                base / "boletas_honorarios.pdf")
            total_bol = sum((a.get("total") or {}).get("emisiones", 0)
                            for a in recibidas.get("anios", []))
            # CSV mensual de las recibidas
            import csv as _csv
            import io as _io
            buf = _io.StringIO()
            w = _csv.writer(buf, delimiter=";")
            w.writerow(["anio", "mes", "boletas", "honorario_bruto",
                        "retencion_terceros", "retencion_contribuyente", "liquido"])
            for a in recibidas.get("anios", []):
                for m in a.get("meses", []):
                    w.writerow([a["anio"], m["mes"], m["emisiones"], m["bruto"],
                                m["ret_terceros"], m["ret_contrib"], m["liquido"]])
            (base / "boletas_recibidas.csv").write_text(buf.getvalue(), encoding="utf-8-sig")
            # Resumen compacto por año (para que el agente lo mande en texto al confirmar).
            resumen = [{"anio": a["anio"],
                        "boletas": (a.get("total") or {}).get("emisiones", 0),
                        "bruto": (a.get("total") or {}).get("bruto", 0),
                        "liquido": (a.get("total") or {}).get("liquido", 0)}
                       for a in recibidas.get("anios", [])]
            _log(job_id, f"✅ Boletas recibidas: {total_bol} boletas → PDF + CSV")
            _bump(job_id, {"doc": "boletas", "ok": True, "recibidas": total_bol,
                           "resumen": resumen})
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
                todas = f.consultar_f22()["declaraciones"]
                decl = [x for x in todas
                        if "".join(ch for ch in str(x.get("periodo")) if ch.isdigit())
                        in objetivo_anios]
                base = salida / "formularios" / "f22"
                base.mkdir(parents=True, exist_ok=True)
                (base / "f22.json").write_text(
                    json.dumps(decl, ensure_ascii=False, indent=2), encoding="utf-8")
                # NOTA: a diferencia del F29, `declaracionesRenta` de la carpeta
                # solo trae {periodo, codigo} — NO incluye un PDF/compacto oficial
                # del F22. Por eso el PDF generado es un RESUMEN de las
                # declaraciones presentadas (años + folio), no el F22 oficial.
                pdf_ok = reportes.genera_f22_pdf(
                    decl, empresa["nombre"], empresa["rut"], base / "f22_resumen.pdf")
                _log(job_id, f"✅ F22: {len(decl)} declaraciones en el rango → "
                     "PDF resumen (la carpeta no expone el F22 oficial en PDF)"
                     if pdf_ok else "F22: sin declaraciones en el rango seleccionado")
                _bump(job_id, {"doc": "f22", "ok": True, "docs": len(decl),
                               "oficial": False})
            except Exception as exc:  # noqa: BLE001
                _log(job_id, f"⚠️ F22 falló: {exc}")
                _bump(job_id, {"doc": "f22", "ok": False, "mensaje": str(exc)})

    # ── Libro de Compras/Ventas (resumen mensual de IVA, vía RCV) ──────
    if "libros" in body.docs:
        try:
            from sii import reportes
            r = rcv.RcvClient(client, empresa["rut"])
            r.inicio()
            filas = []
            for op in ("COMPRA", "VENTA"):
                for periodo in periodos:
                    try:
                        res = r.resumen(periodo, op)
                        data = res.get("data")
                        if not isinstance(data, list) or not data:
                            continue
                        neto = sum(int(d.get("rsmnMntNeto") or 0) for d in data)
                        exe = sum(int(d.get("rsmnMntExe") or 0) for d in data)
                        iva = sum(int(d.get("rsmnMntIVA") or 0) for d in data)
                        tot = sum(int(d.get("rsmnMntTotal") or 0) for d in data)
                        ndoc = sum(int(d.get("rsmnTotDoc") or 0) for d in data)
                        filas.append({"periodo": periodo, "operacion": op,
                                      "neto": neto, "exento": exe, "iva": iva,
                                      "total": tot, "docs": ndoc})
                    except Exception as exc:  # noqa: BLE001
                        _log(job_id, f"   (libro {op} {periodo} sin datos: {exc})")
            base = salida / "libros"
            base.mkdir(parents=True, exist_ok=True)
            (base / "libros_datos.json").write_text(
                json.dumps(filas, ensure_ascii=False, indent=2), encoding="utf-8")
            pdf_ok = reportes.genera_libro_pdf(
                filas, empresa["nombre"], empresa["rut"],
                base / f"libro_{body.desde}_{body.hasta}.pdf")
            _log(job_id, f"✅ Libro de Compras/Ventas: {len(filas)} periodos con datos → PDF"
                 if pdf_ok else "Libro: sin datos de RCV en el rango")
            _bump(job_id, {"doc": "libros", "ok": True, "periodos": len(filas)})
        except Exception as exc:  # noqa: BLE001
            _log(job_id, f"⚠️ Libro de Compras/Ventas falló: {exc}")
            _bump(job_id, {"doc": "libros", "ok": False, "mensaje": str(exc)})

    # ── DTE individuales (EXPERIMENTAL, best-effort, honesto) ──────────
    # Intento de bajar el PDF/XML de cada factura. Para VENTAS emitidas suele
    # ser viable; para COMPRAS depende del proveedor. ANA CLARA no tiene ventas,
    # así que normalmente no habrá nada que bajar. No rompe nada: si no es
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

    # ── Facturas de compra a detalle (PDF timbrado con líneas) ─────────
    # Sistema de Facturación Gratuito del SII: el PDF de cada documento recibido,
    # con sus líneas. Ese portal NO acepta la clave de la empresa → se usa el
    # facturador (persona autorizada), con su PROPIA sesión reutilizada. Un solo
    # login por corrida; throttle 2-5s por request; límite de N docs.
    if "facturas" in body.docs:
        try:
            from sii import facturas_recibidas as fr
            fac = _facturador(empresa_id)
            if not fac:
                msg = ("No hay facturador configurado para esta empresa. El sistema "
                       "de facturación gratuito del SII exige el RUT+clave de la "
                       "persona autorizada (no la clave de la empresa). "
                       "Config: facturadores.json.")
                _log(job_id, f"⚠️ Facturas: {msg}")
                _bump(job_id, {"doc": "facturas", "ok": False, "mensaje": msg})
            else:
                _log(job_id, f"📄 Facturas a detalle: entrando como {fac.get('nombre', fac['rut'])}…")
                fclient = _client_facturador(empresa_id, fac)
                total_docs = 0
                for periodo in periodos:
                    y, m = periodo[:4], periodo[4:]
                    ult = calendar.monthrange(int(y), int(m))[1]
                    desde, hasta = f"{y}-{m}-01", f"{y}-{m}-{ult:02d}"
                    base = salida / "facturas" / periodo
                    res = fr.descargar_facturas(fclient, empresa["rut"], desde, hasta, base)
                    (base / f"indice_{periodo}.json").write_text(
                        json.dumps(res["documentos"], ensure_ascii=False, indent=2),
                        encoding="utf-8")
                    total_docs += res["descargados"]
                    aviso = " (truncado por límite anti-bloqueo)" if res["truncado"] else ""
                    _log(job_id, f"✅ Facturas {periodo}: {res['descargados']}/{res['total']} "
                                 f"PDF con detalle{aviso}")
                fclient.save_cookies(_empresa_dir(empresa_id) / "facturador_session.json")
                _bump(job_id, {"doc": "facturas", "ok": True, "docs": total_docs})
        except Exception as exc:  # noqa: BLE001
            _log(job_id, f"⚠️ Facturas a detalle falló: {exc}")
            _bump(job_id, {"doc": "facturas", "ok": False, "mensaje": str(exc)})

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


@app.get("/api/empresas/{empresa_id}/emisor")
def get_emisor(empresa_id: int):
    """Datos del emisor configurables por empresa (hoy la ciudad de origen)."""
    empresa = db.obtener_empresa(empresa_id)
    if not empresa:
        raise HTTPException(404, "Empresa no encontrada.")
    extra = _emisor_extra(empresa_id)
    return {"empresa": {"id": empresa_id, "nombre": empresa["nombre"], "rut": empresa["rut"]},
            "ciudad": extra.get("ciudad") or "SANTIAGO",
            "por_defecto": not extra.get("ciudad"),
            "nota": "Ciudad que va en el formulario del SII al emitir (EFXP_CIUDAD_ORIGEN). "
                    "Si nunca se configuró, se usa SANTIAGO."}


@app.put("/api/empresas/{empresa_id}/emisor")
def put_emisor(empresa_id: int, body: EmisorIn):
    """Cambia la ciudad del emisor. Se puede pedir por WhatsApp: es un dato de forma,
    no toca montos ni folios. Solo afecta documentos que se emitan DESPUÉS."""
    empresa = db.obtener_empresa(empresa_id)
    if not empresa:
        raise HTTPException(404, "Empresa no encontrada.")
    ciudad = (body.ciudad or "").strip().upper()
    if not ciudad or len(ciudad) > 40:
        raise HTTPException(400, "La ciudad no puede ir vacía y va como máximo 40 caracteres.")
    f = BASE_DIR / "emisores.json"
    try:
        data = json.loads(f.read_text(encoding="utf-8")) if f.exists() else {}
    except Exception:  # noqa: BLE001
        data = {}
    e = data.get(str(empresa_id)) or {}
    anterior = e.get("ciudad")
    e.update({"ciudad": ciudad, "nombre": empresa["nombre"]})
    e.pop("_revisar", None)
    data[str(empresa_id)] = e
    f.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return {"ok": True, "empresa": empresa["nombre"], "ciudad": ciudad, "ciudad_anterior": anterior,
            "nota": "Aplica a los documentos que se emitan de aquí en adelante; "
                    "los ya emitidos no cambian."}


@app.get("/api/empresas/{empresa_id}/resumen-rcv")
def resumen_rcv(empresa_id: int, desde: str, hasta: str = ""):
    """Totales de COMPRAS y VENTAS con el cálculo de IVA, sumados desde el RCV **ya
    descargado** (lee los resumen.json en disco, NO vuelve a consultar al SII).

    Existe para que la respuesta a "revísame las compras/ventas y el IVA de tal mes"
    salga de números CALCULADOS y no de un modelo interpretando un PDF. Informa qué
    periodos no tienen datos bajados (`periodos_sin_datos`) para no confundir
    "no lo bajamos" con "la empresa no facturó" — que es justo lo que se leyó mal.
    """
    empresa = db.obtener_empresa(empresa_id)
    if not empresa:
        raise HTTPException(404, "Empresa no encontrada.")
    hasta = hasta or desde
    if not re.fullmatch(r"\d{6}", desde or "") or not re.fullmatch(r"\d{6}", hasta):
        raise HTTPException(400, "desde/hasta deben ser AAAAMM.")
    if desde > hasta:
        desde, hasta = hasta, desde
    base = _empresa_dir(empresa_id)
    out = {}
    faltan = []
    for op in ("compra", "venta"):
        tot = {"documentos": 0, "neto": 0, "iva": 0, "exento": 0, "total": 0, "por_tipo": []}
        acum = {}
        for periodo in periodos_rango(desde, hasta):
            f = base / op / periodo / "resumen.json"
            if not f.exists():
                faltan.append(f"{op} {periodo}")
                continue
            try:
                filas = (json.loads(f.read_text(encoding="utf-8")) or {}).get("data") or []
            except Exception:  # noqa: BLE001
                faltan.append(f"{op} {periodo} (ilegible)")
                continue
            for r in filas:
                n = int(r.get("rsmnTotDoc") or 0)
                tot["documentos"] += n
                tot["neto"] += int(r.get("rsmnMntNeto") or 0)
                tot["iva"] += int(r.get("rsmnMntIVA") or 0)
                tot["exento"] += int(r.get("rsmnMntExe") or 0)
                tot["total"] += int(r.get("rsmnMntTotal") or 0)
                nombre = r.get("dcvNombreTipoDoc") or f"Tipo {r.get('rsmnTipoDocInteger')}"
                a = acum.setdefault(nombre, {"tipo": nombre, "documentos": 0, "neto": 0, "iva": 0, "exento": 0, "total": 0})
                a["documentos"] += n
                a["neto"] += int(r.get("rsmnMntNeto") or 0)
                a["iva"] += int(r.get("rsmnMntIVA") or 0)
                a["exento"] += int(r.get("rsmnMntExe") or 0)
                a["total"] += int(r.get("rsmnMntTotal") or 0)
        tot["por_tipo"] = sorted(acum.values(), key=lambda x: -x["total"])
        out[op + "s"] = tot
    debito, credito = out["ventas"]["iva"], out["compras"]["iva"]
    return {
        "empresa": {"id": empresa_id, "nombre": empresa["nombre"], "rut": empresa["rut"]},
        "periodo": {"desde": desde, "hasta": hasta},
        "compras": out["compras"],
        "ventas": out["ventas"],
        "iva": {"debito_ventas": debito, "credito_compras": credito,
                "resultado": debito - credito,
                "signo": "a pagar" if debito >= credito else "remanente a favor"},
        "periodos_sin_datos": faltan,
        "nota": ("Calculado desde el RCV ya descargado en disco; no se consultó al SII."
                 + (" ⚠️ FALTAN periodos por descargar: los totales están INCOMPLETOS."
                    if faltan else "")),
    }


@app.get("/api/empresas/{empresa_id}/facturas-recibidas")
def facturas_recibidas_listar(empresa_id: int, desde: str = "", hasta: str = "", limite: int = 40):
    """Lista RÁPIDA (sin bajar PDFs) de facturas de compra recibidas, ordenadas de
    la más reciente a la más antigua. Para "la última factura que me enviaron":
    llamar sin fechas (usa ~45 días hacia atrás) y tomar la primera. Entra con el
    facturador (Nico), reutilizando su sesión."""
    emp = db.obtener_empresa(empresa_id, con_clave=True)
    if not emp:
        raise HTTPException(404, "Empresa no encontrada.")
    fac = _facturador(empresa_id)
    if not fac:
        raise HTTPException(400, "No hay facturador (persona autorizada) configurado para esta empresa.")
    from sii import facturas_recibidas as fr
    hoy = datetime.now()
    if not hasta:
        hasta = hoy.strftime("%Y-%m-%d")
    if not desde:
        desde = (hoy - timedelta(days=45)).strftime("%Y-%m-%d")
    client = _client_facturador(empresa_id, fac)
    fr.seleccionar_empresa(client, emp["rut"])
    docs = fr.listar(client, desde, hasta)
    client.save_cookies(_empresa_dir(empresa_id) / "facturador_session.json")
    docs.sort(key=lambda d: d.get("fecha", ""), reverse=True)  # fecha YYYY-MM-DD
    return {"desde": desde, "hasta": hasta, "total": len(docs), "documentos": docs[:limite]}


@app.get("/api/empresas/{empresa_id}/factura-pdf")
def factura_pdf(empresa_id: int, codigo: str):
    """Baja y sirve el PDF timbrado (con líneas) de UNA factura recibida, por su
    `codigo` (lo da facturas-recibidas). Rápido: no baja el mes entero."""
    emp = db.obtener_empresa(empresa_id, con_clave=True)
    if not emp:
        raise HTTPException(404, "Empresa no encontrada.")
    fac = _facturador(empresa_id)
    if not fac:
        raise HTTPException(400, "No hay facturador configurado para esta empresa.")
    if not re.fullmatch(r"\d+", str(codigo)):
        raise HTTPException(400, "codigo inválido.")
    from sii import facturas_recibidas as fr
    client = _client_facturador(empresa_id, fac)
    fr.seleccionar_empresa(client, emp["rut"])
    dest = _empresa_dir(empresa_id) / "facturas" / "adhoc"
    dest.mkdir(parents=True, exist_ok=True)
    ruta = dest / f"factura_{codigo}.pdf"
    n = fr.descargar_pdf(client, str(codigo), ruta)
    client.save_cookies(_empresa_dir(empresa_id) / "facturador_session.json")
    if not n:
        raise HTTPException(502, "El SII no devolvió el PDF de ese documento.")
    return FileResponse(ruta, filename=ruta.name, media_type="application/pdf",
                        content_disposition_type="inline")


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


@app.get("/api/factura/sesion-cookies")
def sesion_cookies():
    """Devuelve las cookies de la sesión del EMISOR (persona autorizada en el SII,
    ej. Nicolás) para que el driver de navegador quede logueado SIN re-loguear.
    Reutiliza el token guardado; si venció, re-loguea 1 vez con la clave del .env.
    Protegido por el API_TOKEN del backend (localhost)."""
    import requests as _rq
    from sii.rate_limit import Throttle as _Th
    rut = os.getenv("SII_EMISION_PERSONA_RUT", "").strip()
    clave = os.getenv("SII_EMISION_PERSONA_CLAVE", "").strip()
    if not rut or not clave:
        raise HTTPException(400, "Falta SII_EMISION_PERSONA_RUT/CLAVE en .env")
    cuerpo = rututil.split(rututil.clean(rut))[0]
    sf = BASE_DIR / "data" / "personas" / cuerpo / "session.json"
    sf.parent.mkdir(parents=True, exist_ok=True)
    client = SiiClient(Throttle(DELAY_MIN, DELAY_MAX), max_retries=MAX_RETRIES)
    try:
        client = auth.ensure_session(client, rut, clave, session_file=sf)
        client.promover_dominio_sii()
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(502, f"No se pudo abrir la sesión del emisor: {exc}")
    cookies = _rq.utils.dict_from_cookiejar(client.session.cookies)
    return {"ok": True, "rut": rut, "cookies": cookies}


@app.get("/api/factura/cert-pass")
def cert_pass():
    """Clave del CERTIFICADO CENTRALIZADO del emisor (la que el SII pide en #myPass
    al firmar). El backend es el dueño del certificado (SII_CERT_PATH), así que la
    clave vive SOLO acá (sii-web/.env) y el robot del hub la pide por este endpoint
    en vez de duplicar el secreto. Protegido por el API_TOKEN del backend (localhost)."""
    clave = os.getenv("SII_CERT_PASS", "").strip()
    if not clave:
        raise HTTPException(400, "Falta SII_CERT_PASS en el .env del backend (sii-web).")
    return {"ok": True, "cert_pass": clave}


@app.get("/api/health")
def health():
    return {"ok": True}
