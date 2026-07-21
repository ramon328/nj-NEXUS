"""
Adapter ChileAutos — extrae listings del Schema.org (JSON-LD) embebido en el HTML.

Estrategia:
- GET a la URL de listado (sin JS/DataDome) obtiene 200 con HTML completo
- El HTML contiene un <script type="application/ld+json"> con todos los autos
  en SearchResultsPage → mainEntity → itemListElement
- Se pagina via el parámetro ?page=N en la URL
"""

from __future__ import annotations

import logging
import re
import subprocess
import json
import time
from typing import Any

from ..models import Listing, RawPage, SearchProfile

logger = logging.getLogger("adapter.chileautos")

BASE_URL = "https://www.chileautos.cl"

# URL base de búsqueda — agencia/particular separados para maximizar cobertura
SEARCH_URLS = {
    "dealer": "/vehiculos/autos-veh%C3%ADculo/agencia-vendedor/",
    "private": "/vehiculos/autos-veh%C3%ADculo/particular-vendedor/",
}

CURL_HEADERS = [
    "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language: es-CL,es;q=0.9,en;q=0.8",
    "Accept-Encoding: gzip, deflate, br",
    "Sec-Fetch-Dest: document",
    "Sec-Fetch-Mode: navigate",
    "Sec-Fetch-Site: none",
]


def _curl_get(url: str, cookie_file: str | None = None) -> str:
    """GET via subprocess curl — evita timeouts de Python requests con HTTP/2."""
    cmd = ["curl", "-s", "--compressed", "--max-time", "30", "-L", url]
    for h in CURL_HEADERS:
        cmd += ["-H", h]
    if cookie_file:
        cmd += ["-c", cookie_file, "-b", cookie_file]
    try:
        result = subprocess.run(cmd, capture_output=True, timeout=40)
        return result.stdout.decode("utf-8", errors="replace")
    except Exception as exc:
        logger.warning("[chileautos] curl error: %s", exc)
        return ""


def _looks_valid(html: str) -> bool:
    """
    True si el HTML trae el listado real (JSON-LD con SearchResultsPage).
    DataDome a veces responde 200 con una página-challenge (sin el schema):
    eso NO es válido y conviene refrescar la cookie y reintentar.
    """
    return len(html) >= 1000 and ("SearchResultsPage" in html or "application/ld+json" in html)


def _parse_schema_listings(html: str) -> list[dict]:
    """Extrae los autos del JSON-LD (Schema.org) embebido en el HTML."""
    scripts = re.findall(r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', html, re.DOTALL)
    for script in scripts:
        try:
            data = json.loads(script)
            graph = data.get("@graph", [data])
            for node in graph:
                if node.get("@type") == "SearchResultsPage":
                    items = node.get("mainEntity", {}).get("itemListElement", [])
                    return [it.get("item", it) for it in items if isinstance(it, dict)]
        except Exception:
            continue
    return []


def _get_total(html: str) -> int:
    """Extrae el total de resultados de los metadatos."""
    scripts = re.findall(r'<script[^>]*type=["\']application/ld\+json["\'][^>]*>(.*?)</script>', html, re.DOTALL)
    for script in scripts:
        try:
            data = json.loads(script)
            graph = data.get("@graph", [data])
            for node in graph:
                if node.get("@type") == "SearchResultsPage":
                    return int(node.get("mainEntity", {}).get("numberOfItems", 0))
        except Exception:
            continue
    return 0


class ChileAutosAdapter:
    name = "chileautos"

    def __init__(self):
        self._cookie_file = "/tmp/ca_session_cookies.txt"
        self._initialized = False

    def new_session(self, brand: str, profile: SearchProfile) -> dict:
        """En CA usamos curl, no requests.Session. Devolvemos un dict de contexto."""
        # Elegir URL según tipo de búsqueda
        ctx = {
            "brand": brand.lower() if brand else "",
            "profile": profile,
            "seller_type": "dealer",
            "base_path": SEARCH_URLS["dealer"],
        }
        # Inicializar cookies con un GET a la home
        if not self._initialized:
            _curl_get(BASE_URL, self._cookie_file)
            self._initialized = True
        return ctx

    def fetch_page(self, session: dict, brand: str, profile: SearchProfile, page: int) -> RawPage:
        brand_lower = brand.lower() if brand else ""
        base_path = session.get("base_path", SEARCH_URLS["dealer"])

        # Construir URL con filtro de marca (si aplica) y paginación
        if brand_lower:
            # CA usa slugs de marca en la URL
            brand_slug = brand_lower.replace(" ", "-").replace("-benz", "")
            url = f"{BASE_URL}/vehiculos/{brand_slug}/{base_path.split('/')[-2]}/"
        else:
            url = f"{BASE_URL}{base_path}"

        if page > 1:
            url += f"?page={page}"

        logger.info("[chileautos] GET %s", url)
        html = _curl_get(url, self._cookie_file)

        # DataDome puede responder 200 con un challenge (sin el JSON-LD). Si la
        # respuesta no trae el listado real, refrescamos la cookie datadome con
        # un GET a la home y reintentamos una vez antes de rendirnos.
        if not _looks_valid(html):
            logger.info("[chileautos] respuesta sin listado (posible DataDome) — refrescando cookie y reintentando")
            _curl_get(BASE_URL, self._cookie_file)
            time.sleep(2)
            html = _curl_get(url, self._cookie_file)

        if not _looks_valid(html):
            logger.warning("[chileautos] HTML sin listado (challenge DataDome) para %s pág %d", url, page)
            return RawPage(cards=[], total_reported=0, page=page)

        cards = _parse_schema_listings(html)
        total = _get_total(html)
        logger.info("[chileautos] pág=%d cards=%d total=%d", page, len(cards), total)
        return RawPage(cards=cards, total_reported=total, page=page, extra={"url": url})

    def parse_listing(self, raw_card: dict) -> Listing | None:
        try:
            # URL
            raw_url = raw_card.get("url", "")
            url = f"{BASE_URL}{raw_url.split('?')[0]}" if raw_url and not raw_url.startswith("http") else raw_url
            if not url:
                return None

            # ID desde la URL (último segmento tipo CP-AD-XXXXXXX)
            listing_id_m = re.search(r'/(CP-AD-\d+|AD-\d+|[\w-]+-\d{6,})', url)
            listing_id = listing_id_m.group(1) if listing_id_m else re.sub(r'[^a-z0-9]', '', url.lower())[-20:]

            # Nombre / título
            title = raw_card.get("name", "").strip()

            # Marca y modelo
            brand_obj = raw_card.get("brand", {})
            make = (brand_obj.get("name") if isinstance(brand_obj, dict) else str(brand_obj)).strip() or None
            model = raw_card.get("model", "").strip() or None

            # Año desde el título
            year_m = re.search(r'\b(19|20)\d{2}\b', title)
            year = int(year_m.group()) if year_m else None

            # Precio
            offers = raw_card.get("offers", {})
            price_raw = offers.get("price") if isinstance(offers, dict) else None
            price = int(str(price_raw).replace(".", "").replace(",", "")) if price_raw else None

            # Kilometraje
            odometer = raw_card.get("mileageFromOdometer", {})
            km_raw = odometer.get("value", "") if isinstance(odometer, dict) else ""
            km = int(str(km_raw).replace(".", "").replace(",", "")) if km_raw and str(km_raw).strip() else None

            # Carrocería
            body_type = raw_card.get("bodyType", "").strip() or None

            # Imágenes
            images = []
            for img in raw_card.get("image", []):
                if isinstance(img, dict):
                    images.append(img.get("url", ""))
                elif isinstance(img, str):
                    images.append(img)

            return Listing(
                source="chileautos",
                source_listing_id=listing_id,
                url=url,
                title=title or f"{make} {model} {year}",
                make=make,
                model=model,
                year=year,
                price_clp=price,
                mileage_km=km,
                body_type=body_type,
                seller_type="dealer",
                photo_count=len(images) or None,
                images=images,
                raw_json=raw_card,
            )
        except Exception as exc:
            logger.debug("[chileautos] parse_listing error: %s", exc)
            return None
