"""
Adapter para Linze (linze.cl) — ecommerce de autos usados/nuevos en Chile.

Estrategia (validada el 2026-06-10):
- El sitio es Next.js (App Router) detrás de Cloudflare. `curl` con headers de
  navegador completos pasa el WAF y devuelve 200 con el HTML server-rendered
  (un `curl` "pelado" recibe 403). Por eso usamos curl vía subprocess, igual
  que el adapter de ChileAutos.
- El listado vive en `/buscar/autos/usados`. El HTML embebe, dentro del payload
  RSC de Next (`self.__next_f.push([1,"..."])`), un array JSON `"publications":[...]`
  con TODOS los campos que necesitamos (marca, modelo, versión, año, km, precio,
  región, fotos, tipo de vendedor). No hace falta visitar cada ficha.
- Paginación: `?pagina=N` (63 avisos por página, ~80 páginas, ~5000 avisos).
  `?marca=<marca>` filtra por marca (best-effort; si no matchea devuelve el
  catálogo completo, pero `parse_listing` siempre guarda la marca real de cada
  card, así que nunca contamina los datos).
- El total se lee del JSON-LD `ItemList → numberOfItems` embebido en el HTML.

Ficha de detalle: `/autos/usados/<id_publication>` (también tiene JSON-LD `Car`),
pero no la usamos en el scrapeo de listado por costo (1 request por aviso).
"""

from __future__ import annotations

import json
import logging
import re
import subprocess
from typing import Any

from ..models import Listing, RawPage, SearchProfile

logger = logging.getLogger("adapter.linze")

BASE_URL = "https://linze.cl"
LIST_PATH = "/buscar/autos/usados"
PAGE_SIZE = 63  # avisos por página observados

CURL_HEADERS = [
    "User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language: es-CL,es;q=0.9,en;q=0.8",
    # OJO: no fijamos Accept-Encoding a mano. `curl --compressed` ya negocia solo
    # las codificaciones que sabe descomprimir; forzar "br" rompe en builds de curl
    # sin brotli (el servidor responde br y el body llega vacío).
    "Sec-Fetch-Dest: document",
    "Sec-Fetch-Mode: navigate",
    "Sec-Fetch-Site: none",
    "Upgrade-Insecure-Requests: 1",
]


def _curl_get(url: str, cookie_file: str | None = None) -> str:
    """GET vía subprocess curl — pasa el WAF de Cloudflare con headers de navegador."""
    cmd = ["curl", "-s", "--compressed", "--max-time", "30", "-L", url]
    for h in CURL_HEADERS:
        cmd += ["-H", h]
    if cookie_file:
        cmd += ["-c", cookie_file, "-b", cookie_file]
    try:
        result = subprocess.run(cmd, capture_output=True, timeout=40)
        return result.stdout.decode("utf-8", errors="replace")
    except Exception as exc:
        logger.warning("[linze] curl error: %s", exc)
        return ""


def _unescape_flight(s: str) -> str:
    """Decodifica un nivel de escape del string RSC de Next (`\\"` → `"`, etc.).

    El orden importa: primero el backslash escapado, luego comillas y demás.
    """
    return (
        s.replace("\\\\", "\\")
        .replace('\\"', '"')
        .replace("\\n", "\n")
        .replace("\\t", "\t")
        .replace("\\/", "/")
        .replace("\\u003c", "<")
        .replace("\\u003e", ">")
        .replace("\\u0026", "&")
    )


def _extract_publications(html: str) -> list[dict]:
    """Extrae el/los array(s) `"publications":[...]` del payload RSC y los aplana.

    Hace matching de corchetes balanceado respetando strings/escapes, así que
    soporta objetos anidados arbitrarios.
    """
    h = _unescape_flight(html)
    out: list[dict] = []
    for m in re.finditer(r'"publications"\s*:\s*\[', h):
        start = h.index("[", m.end() - 1)
        depth = 0
        i = start
        in_str = False
        esc = False
        while i < len(h):
            c = h[i]
            if esc:
                esc = False
            elif c == "\\":
                esc = True
            elif c == '"':
                in_str = not in_str
            elif not in_str:
                if c == "[":
                    depth += 1
                elif c == "]":
                    depth -= 1
                    if depth == 0:
                        chunk = h[start : i + 1]
                        try:
                            arr = json.loads(chunk)
                            if isinstance(arr, list):
                                out.extend(p for p in arr if isinstance(p, dict))
                        except Exception as exc:
                            logger.debug("[linze] no se pudo parsear publications: %s", exc)
                        break
            i += 1
    return out


def _extract_total(html: str) -> int:
    """Lee `numberOfItems` del JSON-LD ItemList (el total global del catálogo)."""
    m = re.search(r'"@type"\s*:\s*"ItemList".*?"numberOfItems"\s*:\s*(\d+)', html, re.DOTALL)
    if m:
        try:
            return int(m.group(1))
        except ValueError:
            pass
    return 0


def _parse_int(val: Any) -> int | None:
    if val is None:
        return None
    try:
        return int(str(val).replace(".", "").replace(",", "").strip())
    except (ValueError, TypeError):
        return None


def _clean_str(val: Any) -> str | None:
    if val is None:
        return None
    s = re.sub(r"\s+", " ", str(val)).strip()
    return s or None


class LinzeAdapter:
    name = "linze"

    def __init__(self):
        self._cookie_file = "/tmp/linze_session_cookies.txt"
        self._initialized = False

    def new_session(self, brand: str, profile: SearchProfile) -> dict:
        """Linze usa curl (no requests.Session). Devolvemos un dict de contexto."""
        if not self._initialized:
            _curl_get(BASE_URL + "/", self._cookie_file)  # calienta cookies de Cloudflare
            self._initialized = True
        return {"brand": (brand or "").strip(), "profile": profile}

    def fetch_page(
        self,
        session: dict,
        brand: str,
        profile: SearchProfile,
        page: int,
    ) -> RawPage:
        params: list[str] = []
        brand = (brand or "").strip()
        if brand:
            # Linze filtra por `marca` en minúsculas. Si no matchea devuelve el
            # catálogo completo; parse_listing igual guarda la marca real.
            params.append("marca=" + brand.lower())
        if page > 1:
            params.append(f"pagina={page}")
        url = BASE_URL + LIST_PATH + (("?" + "&".join(params)) if params else "")

        logger.info("[linze] GET %s", url)
        html = _curl_get(url, self._cookie_file)
        if not html or len(html) < 1000:
            logger.warning("[linze] HTML vacío/corto para %s (pág %d)", url, page)
            return RawPage(cards=[], total_reported=0, page=page)

        cards = _extract_publications(html)
        total = _extract_total(html)
        logger.info("[linze] pág=%d cards=%d total=%d", page, len(cards), total)
        return RawPage(cards=cards, total_reported=total, page=page, extra={"url": url})

    def parse_listing(self, raw_card: dict) -> Listing | None:
        try:
            listing_id = _clean_str(raw_card.get("id_publication") or raw_card.get("_id"))
            if not listing_id:
                return None

            url = f"{BASE_URL}/autos/usados/{listing_id}"

            vd = raw_card.get("vehicle_data") or {}
            make = _clean_str(vd.get("brand"))
            model = _clean_str(vd.get("model"))
            version = _clean_str(vd.get("version"))
            year = _parse_int(vd.get("year") or raw_card.get("primary_description"))

            price_clp = _parse_int(
                vd.get("price")
                if vd.get("price") is not None
                else raw_card.get("price")
            )
            mileage_km = _parse_int(
                vd.get("mileage")
                if vd.get("mileage") is not None
                else raw_card.get("secondary_description")
            )

            region = _clean_str(raw_card.get("region"))

            # Tipo de vendedor: C2C = particular; B2C/B2B = agencia/dealer.
            bt = str(raw_card.get("business_type") or "").upper()
            if bt == "C2C":
                seller = "particular"
            elif bt in ("B2C", "B2B"):
                seller = "dealer"
            else:
                seller = "unknown"

            # Imágenes: pictures.original[].path
            images: list[str] = []
            pics = (raw_card.get("pictures") or {}).get("original") or []
            for pic in pics:
                if isinstance(pic, dict):
                    p = pic.get("path") or pic.get("url")
                    if p:
                        images.append(p)
                elif isinstance(pic, str):
                    images.append(pic)

            # Título: marca + modelo + versión (lo que haya).
            title = _clean_str(raw_card.get("title")) or " ".join(
                x for x in (make, model) if x
            )
            if version and version.lower() not in (title or "").lower():
                title = f"{title} {version}".strip() if title else version

            return Listing(
                source="linze",
                source_listing_id=listing_id,
                url=url,
                title=title,
                make=make,
                model=model,
                year=year,
                price_clp=price_clp,
                mileage_km=mileage_km,
                transmission=None,  # no viene en el listado (sí en la ficha de detalle)
                fuel=None,
                body_type=None,
                region=region,
                seller_type=seller,
                dealer_name=None,  # solo tenemos el id de la agencia, no el nombre
                photo_count=len(images) or None,
                images=images,
                raw_json=raw_card,
            )
        except Exception as exc:
            logger.debug("[linze] parse_listing error: %s", exc)
            return None
