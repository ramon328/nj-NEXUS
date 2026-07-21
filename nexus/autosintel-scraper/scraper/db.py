"""
Cliente Supabase REST usando urllib (stdlib Python) — sin dependencias externas,
sin validación estricta de headers que rompe requests en GitHub Actions.
"""

from __future__ import annotations

import json
import logging
import re
import ssl
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

logger = logging.getLogger("db")

# Contexto SSL robusto: usa el bundle de certifi si está disponible (evita
# CERTIFICATE_VERIFY_FAILED en entornos sin CA local, p.ej. Python framework en mac).
# En los runners de GitHub Actions urllib ya tiene los certs del sistema.
try:
    import certifi

    _SSL_CTX: ssl.SSLContext | None = ssl.create_default_context(cafile=certifi.where())
except Exception:
    _SSL_CTX = None


class SupabaseREST:
    def __init__(self, url: str, key: str):
        key = re.sub(r"[\s\r\n]+", "", key)
        self.base = url.strip().rstrip("/") + "/rest/v1"
        self._key = key

    def _headers(self, extra: dict | None = None) -> dict:
        h = {
            "apikey": self._key,
            "Authorization": "Bearer " + self._key,
            "Content-Type": "application/json",
        }
        if extra:
            h.update(extra)
        return h

    def _do(self, method: str, url: str, data: Any = None, extra_headers: dict | None = None) -> Any:
        body = json.dumps(data).encode() if data is not None else None
        req = urllib.request.Request(url, data=body, headers=self._headers(extra_headers), method=method)
        try:
            with urllib.request.urlopen(req, timeout=30, context=_SSL_CTX) as resp:
                raw = resp.read()
                return json.loads(raw) if raw else None
        except urllib.error.HTTPError as exc:
            msg = exc.read().decode(errors="replace")
            logger.error("HTTP %s %s → %d: %s", method, url, exc.code, msg[:200])
            raise

    def select(
        self,
        table: str,
        filters: dict | None = None,
        columns: str = "*",
        limit: int | None = None,
        offset: int | None = None,
    ) -> list[dict]:
        params: dict = {"select": columns}
        if filters:
            params.update(filters)
        if limit is not None:
            params["limit"] = limit
        if offset is not None:
            params["offset"] = offset
        url = f"{self.base}/{table}?" + urllib.parse.urlencode(params)
        result = self._do("GET", url)
        return result or []

    def select_all(
        self,
        table: str,
        filters: dict | None = None,
        columns: str = "*",
        page: int = 1000,
    ) -> list[dict]:
        """Pagina sobre limit/offset hasta traer todas las filas
        (PostgREST topa ~1000 filas por request)."""
        rows: list[dict] = []
        offset = 0
        while True:
            batch = self.select(table, filters, columns, limit=page, offset=offset)
            rows.extend(batch)
            if len(batch) < page:
                break
            offset += page
        return rows

    def update_status(self, table: str, ids: list[str], status: str) -> int:
        """PATCH status=<status> para un conjunto de ids, en chunks para no
        exceder el largo máximo de URL."""
        if not ids:
            return 0
        total = 0
        CHUNK = 100
        for i in range(0, len(ids), CHUNK):
            chunk = ids[i : i + CHUNK]
            id_list = ",".join(chunk)
            url = f"{self.base}/{table}?id=in.({urllib.parse.quote(id_list)})"
            self._do(
                "PATCH",
                url,
                data={"status": status},
                extra_headers={"Prefer": "return=minimal"},
            )
            total += len(chunk)
        return total

    def upsert(self, table: str, rows: list[dict], on_conflict: str) -> int:
        if not rows:
            return 0
        url = f"{self.base}/{table}?on_conflict={urllib.parse.quote(on_conflict)}"
        self._do("POST", url, data=rows, extra_headers={"Prefer": "resolution=merge-duplicates,return=minimal"})
        return len(rows)

    def insert(self, table: str, row: dict) -> None:
        url = f"{self.base}/{table}"
        self._do("POST", url, data=row, extra_headers={"Prefer": "return=minimal"})

    def insert_many(self, table: str, rows: list[dict]) -> int:
        """Inserta varias filas en una sola request (append, sin upsert)."""
        if not rows:
            return 0
        url = f"{self.base}/{table}"
        self._do("POST", url, data=rows, extra_headers={"Prefer": "return=minimal"})
        return len(rows)
