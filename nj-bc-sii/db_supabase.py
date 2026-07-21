"""Persistencia de empresas en Supabase (Postgres). Backend de PRODUCCIÓN.

Se usa cuando SUPABASE_URL + SUPABASE_SERVICE_KEY están definidas. Accede con la
SERVICE KEY (solo en el servidor) → salta RLS. La tabla `empresas` tiene RLS
activado y SIN políticas, así que el anon key NO puede tocarla. Además la clave
del SII se guarda CIFRADA (ver crypto.py). Crea la tabla con supabase_schema.sql.
"""
from __future__ import annotations

import os
import time

from crypto import decrypt, encrypt

_TABLE = "empresas"
_COLS_PUB = "id, nombre, rut, creada_en, conectada_en, estado"
_COLS_FULL = "id, nombre, rut, clave, creada_en, conectada_en, estado"

_client = None


def _c():
    global _client
    if _client is None:
        from supabase import create_client
        url = os.environ["SUPABASE_URL"].strip()
        key = os.environ["SUPABASE_SERVICE_KEY"].strip()
        _client = create_client(url, key)
    return _client


def init_db() -> None:
    # La tabla se crea una vez con supabase_schema.sql en el SQL Editor. Aquí
    # solo sondeamos la conexión; si la tabla aún no existe NO tumbamos el arranque
    # (el servicio queda vivo y el error claro aparece al usar empresas).
    import logging
    try:
        _c().table(_TABLE).select("id").limit(1).execute()
        logging.getLogger("db").info("Supabase OK: tabla 'empresas' accesible.")
    except Exception as exc:  # noqa: BLE001
        logging.getLogger("db").warning(
            "No se pudo verificar la tabla 'empresas' en Supabase (¿corriste "
            "supabase_schema.sql?): %s", exc
        )


def listar_empresas() -> list[dict]:
    res = _c().table(_TABLE).select(_COLS_PUB).order("creada_en", desc=True).execute()
    return res.data or []


def obtener_empresa(empresa_id: int, con_clave: bool = False) -> dict | None:
    cols = _COLS_FULL if con_clave else _COLS_PUB
    res = _c().table(_TABLE).select(cols).eq("id", empresa_id).limit(1).execute()
    rows = res.data or []
    if not rows:
        return None
    row = rows[0]
    if con_clave and row.get("clave") is not None:
        row["clave"] = decrypt(row["clave"])
    return row


def crear_empresa(nombre: str, rut: str, clave: str) -> dict:
    res = _c().table(_TABLE).insert({
        "nombre": nombre,
        "rut": rut,
        "clave": encrypt(clave),
        "creada_en": time.time(),
        "estado": "sin_probar",
    }).execute()
    return obtener_empresa(res.data[0]["id"])  # type: ignore[return-value]


def actualizar_estado(empresa_id: int, estado: str, conectada: bool = False) -> None:
    patch: dict = {"estado": estado}
    if conectada:
        patch["conectada_en"] = time.time()
    _c().table(_TABLE).update(patch).eq("id", empresa_id).execute()


def actualizar_credenciales(empresa_id: int, nombre: str, clave: str | None) -> None:
    patch: dict = {"nombre": nombre}
    if clave:
        patch["clave"] = encrypt(clave)
    _c().table(_TABLE).update(patch).eq("id", empresa_id).execute()


def eliminar_empresa(empresa_id: int) -> None:
    _c().table(_TABLE).delete().eq("id", empresa_id).execute()
