"""Capa de datos de empresas — selecciona el backend según el entorno.

- Producción (nube): si SUPABASE_URL + SUPABASE_SERVICE_KEY están definidas,
  usa Supabase/Postgres (db_supabase) → persistente y seguro.
- Local / desarrollo: si no, usa SQLite (db_sqlite).

En ambos casos la clave del SII se guarda CIFRADA (ver crypto.py). `api.py`
importa este módulo y no sabe qué backend hay debajo.
"""
from __future__ import annotations

import logging
import os

log = logging.getLogger("db")

_USE_SUPABASE = bool(
    os.getenv("SUPABASE_URL", "").strip() and os.getenv("SUPABASE_SERVICE_KEY", "").strip()
)

if _USE_SUPABASE:
    log.info("Backend de empresas: Supabase (Postgres).")
    from db_supabase import (  # noqa: F401
        actualizar_credenciales,
        actualizar_estado,
        crear_empresa,
        eliminar_empresa,
        init_db,
        listar_empresas,
        obtener_empresa,
    )
else:
    log.info("Backend de empresas: SQLite local.")
    from db_sqlite import (  # noqa: F401
        actualizar_credenciales,
        actualizar_estado,
        crear_empresa,
        eliminar_empresa,
        init_db,
        listar_empresas,
        obtener_empresa,
    )
