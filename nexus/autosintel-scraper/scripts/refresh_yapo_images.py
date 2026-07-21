#!/usr/bin/env python3
"""
Refresca los avisos de Yapo (imágenes incluidas) en UNA sola pasada por Región
Metropolitana, sin el bucle por-marca del motor.

Por qué: el `q=<marca>` de Yapo no filtra — pagina todo RM. Recorrerlo una vez por
cada marca del perfil (20+) es 20× el mismo pool y dispara el tope de 300 páginas.
Una sola pasada (sin marca) cubre todo el pool una vez y hace upsert (refresca
imágenes y demás campos de los avisos existentes, sin duplicar).

Uso:
  .venv/bin/python -m scripts.refresh_yapo_images            # hasta agotar páginas
  .venv/bin/python -m scripts.refresh_yapo_images 80         # tope de 80 páginas
"""
from __future__ import annotations

import os
import sys
import time
from pathlib import Path

_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_root))

# Cargar .env
env_file = _root / ".env"
if env_file.exists():
    for line in env_file.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            os.environ.setdefault(k.strip(), v.strip())

from scraper.adapters.yapo import YapoAdapter
from scraper.db import SupabaseREST

MAX_PAGES = int(sys.argv[1]) if len(sys.argv) > 1 else 300
THROTTLE = 3.0
MAX_CONSECUTIVE_EMPTY = 3


def main() -> None:
    url = (os.environ.get("SUPABASE_URL") or "").strip()
    key = (os.environ.get("SUPABASE_SERVICE_KEY") or "").strip()
    if not url or not key:
        print("Faltan SUPABASE_URL / SUPABASE_SERVICE_KEY en .env", flush=True)
        sys.exit(1)
    db = SupabaseREST(url, key)

    a = YapoAdapter()
    sess = a.new_session("", None)  # sin marca => una sola pasada por todo RM
    total = 0
    pages = 0
    empty = 0
    seen_ids: set[str] = set()
    try:
        for page in range(1, MAX_PAGES + 1):
            raw = a.fetch_page(sess, "", None, page)
            pages += 1
            if not raw.cards:
                empty += 1
                if empty >= MAX_CONSECUTIVE_EMPTY:
                    print(f"Fin: {empty} páginas vacías seguidas.", flush=True)
                    break
                continue
            empty = 0

            rows = []
            for c in raw.cards:
                l = a.parse_listing(c)
                if not l or l.is_moto():
                    continue
                if l.source_listing_id in seen_ids:
                    continue
                seen_ids.add(l.source_listing_id)
                rows.append(l.to_upsert_dict())

            if rows:
                try:
                    db.upsert("listings", rows, on_conflict="source,source_listing_id")
                    total += len(rows)
                except Exception as exc:
                    print(f"  upsert error pág {page}: {exc}", flush=True)

            print(f"pág {page}: +{len(rows)} (únicos acumulados: {total})", flush=True)
            time.sleep(THROTTLE)
    finally:
        a.close()

    print(f"LISTO. páginas={pages} avisos_yapo_refrescados={total}", flush=True)


if __name__ == "__main__":
    main()
