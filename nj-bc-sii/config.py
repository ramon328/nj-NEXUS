"""Carga de configuración desde variables de entorno (.env)."""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()


def _get(key: str, default: str = "") -> str:
    return os.getenv(key, default).strip()


@dataclass(frozen=True)
class Config:
    rut: str
    clave: str
    delay_min: float
    delay_max: float
    max_retries: int
    data_dir: Path
    supabase_url: str
    supabase_key: str
    supabase_bucket: str

    @property
    def use_supabase(self) -> bool:
        return bool(self.supabase_url and self.supabase_key)


def load_config() -> Config:
    rut = _get("SII_RUT")
    clave = _get("SII_CLAVE")
    if not rut or not clave:
        raise SystemExit(
            "Faltan credenciales. Copia .env.example a .env y completa SII_RUT y SII_CLAVE."
        )

    data_dir = Path(_get("DATA_DIR", "./data")).expanduser().resolve()
    data_dir.mkdir(parents=True, exist_ok=True)

    return Config(
        rut=rut,
        clave=clave,
        delay_min=float(_get("SII_DELAY_MIN", "2.0")),
        delay_max=float(_get("SII_DELAY_MAX", "5.0")),
        max_retries=int(_get("SII_MAX_RETRIES", "3")),
        data_dir=data_dir,
        supabase_url=_get("SUPABASE_URL"),
        supabase_key=_get("SUPABASE_SERVICE_KEY"),
        supabase_bucket=_get("SUPABASE_BUCKET", "sii-documentos"),
    )
