"""Capa de almacenamiento: siempre guarda en local; opcionalmente en Supabase."""
from __future__ import annotations

import logging

from config import Config
from .local import LocalStore

log = logging.getLogger("storage")


def build_store(cfg: Config):
    """Devuelve una lista de stores activos según la configuración."""
    stores = [LocalStore(cfg.data_dir)]
    if cfg.use_supabase:
        from .supabase_store import SupabaseStore  # import perezoso
        log.info("Supabase activado (bucket=%s).", cfg.supabase_bucket)
        stores.append(SupabaseStore(cfg.supabase_url, cfg.supabase_key, cfg.supabase_bucket))
    else:
        log.info("Supabase no configurado — guardando solo en local.")
    return stores
