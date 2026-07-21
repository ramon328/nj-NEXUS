"""Almacenamiento en disco local."""
from __future__ import annotations

import json
import logging
from pathlib import Path

log = logging.getLogger("storage.local")


class LocalStore:
    def __init__(self, base_dir: Path):
        self.base = Path(base_dir)
        self.base.mkdir(parents=True, exist_ok=True)

    def save_json(self, relative_path: str, data: dict | list) -> Path:
        path = self.base / relative_path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        log.info("Guardado %s", path)
        return path

    def save_bytes(self, relative_path: str, content: bytes) -> Path:
        path = self.base / relative_path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
        log.info("Guardado %s (%d bytes)", path, len(content))
        return path
