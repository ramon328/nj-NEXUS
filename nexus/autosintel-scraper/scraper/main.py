#!/usr/bin/env python3
"""
Autos Intel — Scraper entry point.

Uso:
  python -m scraper.main                     # corre una vez y sale
  python -m scraper.main --source ml         # solo MercadoLibre
  python -m scraper.main --max-pages 2       # límite de páginas (debug)
"""

from __future__ import annotations

import argparse
import logging
import os
import sys
from pathlib import Path

# Cargar .env desde la raíz del proyecto
_root = Path(__file__).parent.parent
try:
    from dotenv import load_dotenv
    load_dotenv(_root / ".env")
except ImportError:
    env_file = _root / ".env"
    if env_file.exists():
        for line in env_file.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                os.environ.setdefault(k.strip(), v.strip())

from .adapters import (
    ChileAutosAdapter,
    LinzeAdapter,
    YapoAdapter,
)
from .db import SupabaseREST
from .engine import Engine

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(name)s %(levelname)s %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger("main")

# MercadoLibre quedó descontinuado como fuente (dejó de producir datos).
ALL_ADAPTERS = [ChileAutosAdapter, YapoAdapter, LinzeAdapter]
SOURCE_MAP = {
    "chileautos": [ChileAutosAdapter],
    "yapo": [YapoAdapter],
    "linze": [LinzeAdapter],
}


def get_supabase():
    url = (os.environ.get("SUPABASE_URL") or "").strip()
    key = (os.environ.get("SUPABASE_SERVICE_KEY") or "").strip()
    if not url or not key:
        logger.error(
            "Faltan variables de entorno. "
            "Agrega SUPABASE_URL y SUPABASE_SERVICE_KEY en el archivo .env de la raíz del proyecto."
        )
        sys.exit(1)
    return SupabaseREST(url, key)


def main() -> None:
    parser = argparse.ArgumentParser(description="Autos Intel scraper")
    parser.add_argument("--source", help="Sitio específico: chileautos | mercadolibre | yapo | linze")
    parser.add_argument("--max-pages", type=int, default=None, help="Límite de páginas por marca (debug)")
    parser.add_argument(
        "--no-recheck",
        action="store_true",
        help="No reconciliar vendidos (solo scrapear nuevos/actualizar)",
    )
    args = parser.parse_args()

    db = get_supabase()
    adapters = SOURCE_MAP.get(args.source, ALL_ADAPTERS) if args.source else ALL_ADAPTERS

    logger.info("=== Autos Intel scraper iniciando ===")
    engine = Engine(db, debug_max_pages=args.max_pages)
    # Con --max-pages no se cubre el scope completo, así que la reconciliación
    # nunca marcaría nada (scopes no "clean"); igual respetamos el flag explícito.
    engine.skip_recheck = args.no_recheck
    runs = engine.run_all(adapters)

    total_drops = 0
    for run in runs:
        total_drops += run.price_drops
        logger.info(
            "[%s] encontrados=%d upsertados=%d páginas=%d hist_precio=%d bajadas=%d failed=%s filter_failed=%s",
            run.source, run.listings_found, run.listings_upserted,
            run.pages_fetched, run.price_history_added, run.price_drops,
            run.failed_brands, run.filter_failed,
        )
    if total_drops:
        logger.info("⬇ %d bajadas de precio detectadas en esta corrida", total_drops)
    logger.info("=== Corrida finalizada ===")


if __name__ == "__main__":
    main()
