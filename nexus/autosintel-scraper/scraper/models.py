"""Modelos de datos compartidos entre motor y adapters."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Optional


def _utc_now_iso() -> str:
    """Timestamp UTC en ISO-8601, para sellar last_seen_at en cada upsert."""
    return datetime.now(timezone.utc).isoformat()


@dataclass
class SearchProfile:
    id: str
    name: str
    sources: list[str]
    makes: list[str]
    exclude_makes: list[str]
    price_min: Optional[int]
    price_max: Optional[int]
    km_max: Optional[int]
    year_min: Optional[int]
    year_max: Optional[int]
    is_premium: bool
    active: bool

    @classmethod
    def from_row(cls, row: dict) -> SearchProfile:
        return cls(
            id=row["id"],
            name=row["name"],
            sources=row.get("sources") or ["chileautos"],
            makes=row.get("makes") or [],
            exclude_makes=row.get("exclude_makes") or [],
            price_min=row.get("price_min"),
            price_max=row.get("price_max"),
            km_max=row.get("km_max"),
            year_min=row.get("year_min"),
            year_max=row.get("year_max"),
            is_premium=row.get("is_premium", False),
            active=row.get("active", True),
        )


@dataclass
class Listing:
    """Auto normalizado, listo para upsert en Supabase."""
    source: str
    source_listing_id: str
    url: str
    title: Optional[str] = None
    make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    price_clp: Optional[int] = None
    mileage_km: Optional[int] = None
    transmission: Optional[str] = None   # 'manual' | 'automatico'
    fuel: Optional[str] = None
    body_type: Optional[str] = None
    region: Optional[str] = None
    seller_type: str = "unknown"           # 'particular' | 'dealer' | 'unknown'
    dealer_name: Optional[str] = None
    photo_count: Optional[int] = None
    images: list[str] = field(default_factory=list)
    raw_json: dict = field(default_factory=dict)
    profile_id: Optional[str] = None
    is_premium: bool = False

    def is_moto(self) -> bool:
        """Descarta motos (incluyendo BMW Motorrad vs. autos M-series)."""
        if self.body_type and "motocicleta" in self.body_type.lower():
            return True
        if self.make and self.make.lower() == "bmw" and self.model:
            # Prefijos Motorrad: G C F R S K HP — pero NO M2/M3/M4/M5/M6/M8
            m_car = re.match(r"^M[2-9]\b", self.model, re.IGNORECASE)
            if not m_car:
                moto_prefix = re.match(r"^(G|C|F|R|S|K|HP)[\s\-]", self.model, re.IGNORECASE)
                if moto_prefix:
                    return True
        return False

    def matches_profile(self, p: SearchProfile) -> bool:
        """Verifica si el listing cumple las condiciones del perfil."""
        # Filtro de marcas (lista blanca)
        if p.makes and self.make:
            if self.make.lower() not in [m.lower() for m in p.makes]:
                return False
        # Exclusión de marcas
        if p.exclude_makes and self.make:
            if self.make.lower() in [m.lower() for m in p.exclude_makes]:
                return False
        # Precio
        if p.price_min is not None and self.price_clp is not None:
            if self.price_clp < p.price_min:
                return False
        if p.price_max is not None and self.price_clp is not None:
            if self.price_clp > p.price_max:
                return False
        # Kilometraje
        if p.km_max is not None and self.mileage_km is not None:
            if self.mileage_km > p.km_max:
                return False
        # Año
        if p.year_min is not None and self.year is not None:
            if self.year < p.year_min:
                return False
        if p.year_max is not None and self.year is not None:
            if self.year > p.year_max:
                return False
        return True

    def to_upsert_dict(self) -> dict[str, Any]:
        return {
            "source": self.source,
            "source_listing_id": self.source_listing_id,
            "url": self.url,
            "title": self.title,
            "make": self.make,
            "model": self.model,
            "year": self.year,
            "price_clp": self.price_clp,
            "mileage_km": self.mileage_km,
            "transmission": self.transmission,
            "fuel": self.fuel,
            "body_type": self.body_type,
            "region": self.region,
            "seller_type": self.seller_type,
            "dealer_name": self.dealer_name,
            "photo_count": self.photo_count,
            "images": self.images,
            "raw_json": self.raw_json,
            "profile_id": self.profile_id,
            "is_premium": self.is_premium,
            "status": "active",
            # Sellar el momento en que confirmamos el aviso presente en la fuente.
            # En INSERT coincide con first_seen_at (default now()); en UPDATE
            # (merge-duplicates) refresca last_seen_at => base de la detección
            # de vendidos por desaparición.
            "last_seen_at": _utc_now_iso(),
        }


@dataclass
class RawPage:
    """Resultado crudo de fetch_page: cards sin parsear + metadata."""
    cards: list[Any]
    total_reported: int
    page: int
    extra: dict = field(default_factory=dict)


@dataclass
class ScrapeRun:
    """Estado mutable de una corrida; se guarda al finalizar."""
    source: str
    profile_id: Optional[str]
    listings_found: int = 0
    listings_upserted: int = 0
    pages_fetched: int = 0
    failed_brands: list[str] = field(default_factory=list)
    filter_failed: bool = False
    error_message: Optional[str] = None
    notes: Optional[str] = None
    # Solo para logging — no se persisten en scrape_runs.
    price_history_added: int = 0
    price_drops: int = 0
