"""
Adapter para MercadoLibre Chile (MLC) vía API oficial.

Documentación: https://developers.mercadolibre.cl/es_ar/articulos-y-busquedas
Categoría de autos: MLC1743 (Autos y Camionetas)

La API de búsqueda pública no requiere access_token para consultas básicas.
Si ML exige autenticación, se debe usar el flujo OAuth 2.0 client_credentials.
"""

from __future__ import annotations

import logging
import os
from typing import Any

import requests

from ..models import Listing, RawPage, SearchProfile

logger = logging.getLogger("adapter.mercadolibre")

ML_SITE = "MLC"
BASE_URL = "https://api.mercadolibre.com"
SEARCH_URL = f"{BASE_URL}/sites/{ML_SITE}/search"
ITEMS_URL = f"{BASE_URL}/items"
CATEGORY_CARS = "MLC1743"   # Autos y Camionetas Chile
PAGE_SIZE = 50
MAX_OFFSET = 1000            # ML limita a 1000 resultados por búsqueda

# Mapeo de IDs de atributos ML → campos Listing
ML_ATTR_MAP = {
    "BRAND": "make",
    "MODEL": "model",
    "VEHICLE_YEAR": "year",
    "KILOMETERS": "mileage_km",
    "TRANSMISSION": "transmission",
    "FUEL_TYPE": "fuel",
    "VEHICLE_BODY_TYPE": "body_type",
}

ML_FUEL_MAP = {
    "Gasolina": "gasolina",
    "Nafta": "gasolina",
    "Diesel": "diesel",
    "Híbrido": "hibrido",
    "Eléctrico": "electrico",
    "GNC": "gnc",
}

ML_TRANSMISSION_MAP = {
    "Manual": "manual",
    "Automática": "automatico",
    "Automático": "automatico",
    "CVT": "automatico",
}

HEADERS = {
    "User-Agent": "AutosIntel/1.0",
    "Accept": "application/json",
}


class MercadoLibreAdapter:
    name = "mercadolibre"

    def __init__(self):
        self._token: str | None = os.environ.get("ML_ACCESS_TOKEN")
        if not self._token:
            logger.info("[ml] Sin ML_ACCESS_TOKEN — usando API pública (sin token)")

    def new_session(self, brand: str, profile: SearchProfile) -> requests.Session:
        session = requests.Session()
        session.headers.update(HEADERS)
        if self._token:
            session.headers["Authorization"] = f"Bearer {self._token}"
        # Guardamos el brand y profile para usarlos en fetch_page
        session._ml_brand = brand  # type: ignore[attr-defined]
        session._ml_profile = profile  # type: ignore[attr-defined]
        return session

    def fetch_page(
        self,
        session: requests.Session,
        brand: str,
        profile: SearchProfile,
        page: int,
    ) -> RawPage:
        offset = (page - 1) * PAGE_SIZE
        if offset >= MAX_OFFSET:
            return RawPage(cards=[], total_reported=0, page=page)

        params: dict[str, Any] = {
            "category": CATEGORY_CARS,
            "limit": PAGE_SIZE,
            "offset": offset,
        }
        if brand:
            params["q"] = brand
        if profile.price_min:
            params["price"] = f"{profile.price_min}-"
        if profile.price_max:
            existing = params.get("price", "")
            if "-" in str(existing):
                params["price"] = f"{profile.price_min or ''}-{profile.price_max}"
            else:
                params["price"] = f"-{profile.price_max}"

        try:
            resp = session.get(SEARCH_URL, params=params, timeout=20)
            resp.raise_for_status()
            data = resp.json()
        except Exception as exc:
            logger.warning("[ml] fetch_page error (brand=%s, pág=%d): %s", brand, page, exc)
            return RawPage(cards=[], total_reported=0, page=page)

        results = data.get("results") or []
        total = data.get("paging", {}).get("total", 0)
        logger.debug("[ml] brand=%s pág=%d items=%d total=%d", brand, page, len(results), total)
        return RawPage(cards=results, total_reported=total, page=page)

    def parse_listing(self, raw_card: dict) -> Listing | None:
        try:
            listing_id = str(raw_card.get("id") or "")
            if not listing_id:
                return None

            url = raw_card.get("permalink") or ""
            title = raw_card.get("title") or ""
            price = raw_card.get("price")
            currency = raw_card.get("currency_id", "CLP")

            # ML puede devolver precios en USD; convertimos si necesario
            price_clp: int | None = None
            if price is not None:
                if currency == "USD":
                    price_clp = int(float(price) * 950)  # tasa aproximada
                else:
                    price_clp = int(float(price))

            # Thumbnails / fotos
            thumbnail = raw_card.get("thumbnail") or ""
            pictures = raw_card.get("pictures") or []
            images: list[str] = []
            for pic in pictures:
                img_url = pic.get("url") or pic.get("secure_url") or ""
                if img_url:
                    images.append(img_url.replace("-I.jpg", "-O.jpg"))
            if not images and thumbnail:
                images.append(thumbnail.replace("-I.jpg", "-O.jpg"))

            # Región
            address = raw_card.get("address") or {}
            region = address.get("state_name") or address.get("city_name") or None

            # Tipo de vendedor
            seller_info = raw_card.get("seller") or {}
            seller_type_ml = seller_info.get("seller_type") or ""
            if seller_type_ml in ("real_estate_user", "normal"):
                seller = "particular"
            elif seller_type_ml == "brand":
                seller = "dealer"
            else:
                seller = "unknown"

            # Atributos de la card (make, model, year, km, etc.)
            attrs = {a["id"]: a.get("value_name") or a.get("value_struct") for a in (raw_card.get("attributes") or [])}

            make = str(attrs.get("BRAND") or "").strip() or None
            model = str(attrs.get("MODEL") or "").strip() or None
            year_raw = attrs.get("VEHICLE_YEAR")
            year = int(str(year_raw).split("-")[0]) if year_raw else None

            km_raw = attrs.get("KILOMETERS")
            mileage_km = _parse_int(km_raw)

            transmission_raw = str(attrs.get("TRANSMISSION") or "")
            transmission = ML_TRANSMISSION_MAP.get(transmission_raw)

            fuel_raw = str(attrs.get("FUEL_TYPE") or "")
            fuel = ML_FUEL_MAP.get(fuel_raw)

            body_type = str(attrs.get("VEHICLE_BODY_TYPE") or "").strip() or None

            return Listing(
                source="mercadolibre",
                source_listing_id=listing_id,
                url=url,
                title=title,
                make=make,
                model=model,
                year=year,
                price_clp=price_clp,
                mileage_km=mileage_km,
                transmission=transmission,
                fuel=fuel,
                body_type=body_type,
                region=region,
                seller_type=seller,
                dealer_name=None,
                photo_count=len(images) or None,
                images=images,
                raw_json=raw_card,
            )
        except Exception as exc:
            logger.debug("[ml] parse_listing error: %s", exc)
            return None


def _parse_int(val: Any) -> int | None:
    if val is None:
        return None
    try:
        if isinstance(val, dict):
            return int(val.get("value", 0))
        return int(str(val).replace(".", "").replace(",", ""))
    except (ValueError, TypeError):
        return None
