#!/usr/bin/env python3
"""
Backfill del baseline de price_history.

Siembra un punto inicial en `price_history` por cada aviso activo que aún no
tenga historial, usando su precio actual de `listings`. Es exactamente lo que
hace el motor la primera vez que ve un aviso, pero aplicado de una vez al
inventario ya existente — para no esperar a que el scraper recorra todo.

Es idempotente: salta los avisos que ya tienen alguna fila en price_history,
así que se puede correr varias veces sin duplicar baselines.

Uso:
  python -m scraper.backfill_price_history
"""

from __future__ import annotations

import logging
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

# Cargar .env desde la raíz del proyecto (igual que main.py)
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

from .db import SupabaseREST

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(name)s %(levelname)s %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger("backfill")

CHUNK = 500


def main() -> None:
    url = (os.environ.get("SUPABASE_URL") or "").strip()
    key = (os.environ.get("SUPABASE_SERVICE_KEY") or "").strip()
    if not url or not key:
        logger.error("Faltan SUPABASE_URL / SUPABASE_SERVICE_KEY en el .env de la raíz.")
        sys.exit(1)
    db = SupabaseREST(url, key)

    logger.info("Leyendo avisos activos con precio…")
    listings = db.select_all(
        "listings",
        filters={"status": "eq.active", "price_clp": "not.is.null"},
        columns="source_listing_id,price_clp,mileage_km",
    )
    logger.info("  %d avisos activos con precio", len(listings))

    logger.info("Leyendo listing_ids que ya tienen historial…")
    existing = db.select_all("price_history", columns="listing_id")
    have_history = {r["listing_id"] for r in existing if r.get("listing_id")}
    logger.info("  %d avisos ya tienen price_history", len(have_history))

    now = datetime.now(timezone.utc).isoformat()
    rows: list[dict] = []
    seen: set[str] = set()
    for l in listings:
        slid = l.get("source_listing_id")
        price = l.get("price_clp")
        if not slid or price is None or slid in have_history or slid in seen:
            continue
        seen.add(slid)
        rows.append({
            "listing_id": slid,
            "price_clp": price,
            "mileage_km": l.get("mileage_km"),
            "captured_at": now,
        })

    if not rows:
        logger.info("Nada que sembrar — todos los avisos ya tienen baseline.")
        return

    logger.info("Insertando %d filas baseline en chunks de %d…", len(rows), CHUNK)
    inserted = 0
    for i in range(0, len(rows), CHUNK):
        chunk = rows[i : i + CHUNK]
        db.insert_many("price_history", chunk)
        inserted += len(chunk)
        logger.info("  %d / %d", inserted, len(rows))

    logger.info("✓ Baseline sembrado: %d filas nuevas en price_history.", inserted)


if __name__ == "__main__":
    main()
