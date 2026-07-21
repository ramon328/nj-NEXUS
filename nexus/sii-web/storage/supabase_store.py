"""Almacenamiento en Supabase: metadata en Postgres + archivos en Storage.

Requiere las tablas creadas con supabase_schema.sql y un bucket de Storage.
"""
from __future__ import annotations

import json
import logging

from supabase import Client, create_client

log = logging.getLogger("storage.supabase")


class SupabaseStore:
    def __init__(self, url: str, key: str, bucket: str):
        self.client: Client = create_client(url, key)
        self.bucket = bucket

    def save_json(self, relative_path: str, data: dict | list) -> str:
        """Sube el JSON al bucket y registra metadata en la tabla documentos."""
        content = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self._upload(relative_path, content, "application/json")
        self._record(relative_path, "json")
        return relative_path

    def save_bytes(self, relative_path: str, content: bytes,
                   content_type: str = "application/octet-stream") -> str:
        self._upload(relative_path, content, content_type)
        self._record(relative_path, relative_path.rsplit(".", 1)[-1])
        return relative_path

    def _upload(self, path: str, content: bytes, content_type: str) -> None:
        self.client.storage.from_(self.bucket).upload(
            path=path,
            file=content,
            file_options={"content-type": content_type, "upsert": "true"},
        )
        log.info("Subido a Supabase Storage: %s", path)

    def _record(self, path: str, tipo: str) -> None:
        try:
            self.client.table("documentos").upsert(
                {"ruta": path, "tipo": tipo}, on_conflict="ruta"
            ).execute()
        except Exception as exc:  # noqa: BLE001 — la subida no debe fallar por metadata
            log.warning("No se pudo registrar metadata en Supabase: %s", exc)
