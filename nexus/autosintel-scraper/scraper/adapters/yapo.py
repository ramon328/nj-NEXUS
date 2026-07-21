"""
Adapter para Yapo.cl (vía navegador headless con Playwright).

Yapo migró a la plataforma de Encuentra24: es una SPA React cuyos avisos se
cargan desde `clickhouse_mvp.php/searches?t=<token cifrado>`. El token se genera
con JS ofuscado en el cliente y es de un solo uso → no se puede replicar con
requests/urllib. Por eso usamos un navegador headless real, que renderiza la
página y de ahí extraemos las tarjetas del DOM.

Estructura del sitio (verificada en vivo):
- Listado por región:  /autos-usados/region-metropolitana?q=<marca>
- Paginación por path:  /autos-usados/region-metropolitana.<N>?q=<marca>
- Cada aviso:           /autos-usados/<slug>/<id>   (el número final es el id)
- Tarjeta (innerText):  "<vendedor> <comuna> <marca modelo> $<precio> [-X%]
                          <año> <combustible> <transmisión> <km> km Contactar ahora"

Requiere: pip install playwright && playwright install chromium
"""

from __future__ import annotations

import atexit
import logging
import re
from typing import Any

from ..models import Listing, RawPage, SearchProfile

logger = logging.getLogger("adapter.yapo")

BASE_URL = "https://www.yapo.cl"
# Solo Región Metropolitana (el mercado más grande). Ampliar a otras regiones
# es agregar más valores y barrerlos.
REGION_PATH = "/autos-usados/region-metropolitana"

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

YAPO_FUEL_MAP = {
    "diesel": "diesel",
    "diésel": "diesel",
    "bencina": "gasolina",
    "gasolina": "gasolina",
    "híbrido": "hibrido",
    "hibrido": "hibrido",
    "eléctrico": "electrico",
    "electrico": "electrico",
    "gas": "gnc",
}

# JS que corre en la página y devuelve las tarjetas de avisos del DOM.
#
# Imágenes: Yapo (Encuentra24) hace lazy-load — el `src` visible suele ser un
# placeholder base64 (pixel transparente) y la URL real vive en `data-src`. Además
# cada tarjeta trae un carrusel con VARIAS fotos del mismo auto. Recolectamos todas
# las URLs reales (src/data-src/srcset/currentSrc), descartando los placeholders
# `data:` y el sello del vendedor (`/t_cnseal/`), y nos quedamos solo con las que
# contienen el id del aviso (evita mezclar fotos de tarjetas vecinas).
_EXTRACT_JS = r"""
() => {
  const collectImgs = (root, id) => {
    // strict = URLs que contienen el id del aviso (lo ideal). loose = cualquier
    // foto de auto de encuentra24 (fallback si el id no matchea, p.ej. otra ruta).
    const strict = [], loose = [], seen = new Set();
    const add = (u) => {
      if (!u) return;
      u = u.split(',')[0].trim().split(' ')[0];   // srcset -> primera URL
      if (!u || u.startsWith('data:')) return;     // placeholder lazy-load
      if (/\/t_cnseal\//.test(u)) return;          // sello del vendedor, no es foto
      if (seen.has(u)) return;
      seen.add(u);
      if (id && u.includes(id)) strict.push(u);
      else if (/photos\.encuentra24\.com/.test(u) && /\/f_auto\//.test(u)) loose.push(u);
    };
    for (const im of root.querySelectorAll('img, source')) {
      add(im.getAttribute('data-src'));
      add(im.getAttribute('srcset'));
      add(im.currentSrc);
      add(im.getAttribute('src'));
    }
    return (strict.length ? strict : loose).slice(0, 20);
  };
  const isListing = (n) => n && n.tagName === 'A' &&
    /\/autos-usados\/[^/]+\/\d{6,}$/.test(n.getAttribute('href') || '');
  // Cuenta IDS DISTINTOS de aviso (cada tarjeta tiene 2 anchors al mismo aviso:
  // la foto y el título → hay que contar ids únicos, no anchors).
  const countListings = (n) => new Set(
    Array.from(n.querySelectorAll('a[href*="/autos-usados/"]')).filter(isListing)
      .map(x => (x.getAttribute('href').match(/(\d{6,})$/) || [])[1]).filter(Boolean)
  ).size;

  const out = [];
  const seen = new Set();
  const anchors = Array.from(document.querySelectorAll('a[href*="/autos-usados/"]')).filter(isListing);
  for (const a of anchors) {
    const href = a.getAttribute('href');
    if (seen.has(href)) continue;
    seen.add(href);
    const id = (href.match(/(\d{6,})$/) || [])[1] || null;

    // Delimitar la tarjeta a UN solo aviso: subir mientras el padre siga
    // conteniendo SOLO este anchor de aviso. Así no mezclamos texto/precio/marca
    // con las tarjetas vecinas (era la causa de precios y modelos cruzados).
    let container = a;
    while (container.parentElement && countListings(container.parentElement) === 1) {
      container = container.parentElement;
    }

    const txt = (container.innerText || '').replace(/\s+/g, ' ').trim();
    // Precio: de los montos $ de ESTA tarjeta, tomar el MAYOR plausible (el de
    // financiación "$/mes" o un repuesto son menores que el precio del auto).
    const amounts = (txt.match(/\$\s?[\d.]{4,}/g) || [])
      .map(s => parseInt(s.replace(/[^\d]/g, ''), 10)).filter(n => n > 0);
    const priceVal = amounts.length ? Math.max(...amounts) : null;

    const imgs = collectImgs(container, id);
    out.push({
      href,
      id,
      slug: href.split('/').slice(-2)[0] || '',
      price_val: priceVal,
      text: txt,
      imgs,
      img: imgs[0] || '',   // compat
    });
  }
  return out;
}
"""


class YapoAdapter:
    name = "yapo"

    # Corte de paginación: Yapo (Encuentra24) NO filtra por `q=<marca>` y nunca
    # señaliza fin (siempre devuelve 30 cards del mismo pool de RM). Sin esto, el
    # motor paginaría hasta 300 por CADA marca de CADA perfil (30+ barridos del
    # mismo pool) inflando la tabla. Llevamos los ids ya vistos EN ESTA CORRIDA y
    # cortamos la marca cuando 2 páginas seguidas no aportan ids nuevos.
    NO_NEW_STREAK_LIMIT = 2

    def __init__(self) -> None:
        self._pw = None
        self._browser = None
        self._page = None
        self._broken = False  # si Playwright no está disponible, no reintentar
        self._seen_ids: set[str] = set()   # ids vistos en TODA la corrida (dedup)
        self._no_new_streak = 0            # páginas seguidas sin ids nuevos (por marca)

    # ------------------------------------------------------------------
    def _ensure_browser(self) -> bool:
        if self._page is not None:
            return True
        if self._broken:
            return False
        try:
            from playwright.sync_api import sync_playwright
        except ImportError:
            logger.error(
                "[yapo] Playwright no está instalado. Corre: "
                "pip install playwright && playwright install chromium"
            )
            self._broken = True
            return False
        try:
            self._pw = sync_playwright().start()
            self._browser = self._pw.chromium.launch(headless=True)
            ctx = self._browser.new_context(
                user_agent=USER_AGENT,
                locale="es-CL",
                viewport={"width": 1366, "height": 900},
            )
            self._page = ctx.new_page()
            atexit.register(self.close)
            return True
        except Exception as exc:
            logger.error("[yapo] No se pudo iniciar el navegador headless: %s", exc)
            self._broken = True
            return False

    def close(self) -> None:
        try:
            if self._browser:
                self._browser.close()
        except Exception:
            pass
        try:
            if self._pw:
                self._pw.stop()
        except Exception:
            pass
        self._browser = self._pw = self._page = None

    # ------------------------------------------------------------------
    def new_session(self, brand: str, profile: SearchProfile) -> dict:
        self._ensure_browser()
        self._no_new_streak = 0  # se reinicia por marca; _seen_ids persiste en la corrida
        return {"brand": brand}

    def fetch_page(self, session: dict, brand: str, profile: SearchProfile, page: int) -> RawPage:
        if not self._ensure_browser():
            return RawPage(cards=[], total_reported=0, page=page)

        path = REGION_PATH if page <= 1 else f"{REGION_PATH}.{page}"
        url = f"{BASE_URL}{path}"
        if brand:
            url += f"?q={brand}"

        logger.info("[yapo] GET %s", url)
        try:
            self._page.goto(url, wait_until="domcontentloaded", timeout=30000)
            try:
                self._page.wait_for_selector('a[href*="/autos-usados/"]', timeout=10000)
            except Exception:
                pass
            # Scroll para disparar el lazy-load de las fotos (sin esto, las tarjetas
            # de más abajo solo tienen el placeholder base64 y quedan sin foto).
            try:
                for _ in range(4):
                    self._page.mouse.wheel(0, 3000)
                    self._page.wait_for_timeout(350)
                self._page.evaluate("window.scrollTo(0, 0)")
            except Exception:
                pass
            self._page.wait_for_timeout(800)
            cards: list[dict] = self._page.evaluate(_EXTRACT_JS) or []
        except Exception as exc:
            logger.warning("[yapo] fetch_page error (brand=%s, pág=%d): %s", brand, page, exc)
            return RawPage(cards=[], total_reported=0, page=page)

        # Corte anti re-barrido: ¿esta página aporta ids NUEVOS para la corrida?
        new = [c for c in cards if c.get("id") and c["id"] not in self._seen_ids]
        for c in cards:
            if c.get("id"):
                self._seen_ids.add(c["id"])
        if not new:
            self._no_new_streak += 1
            logger.info("[yapo] brand=%s pág=%d cards=%d nuevos=0 (streak=%d)",
                        brand, page, len(cards), self._no_new_streak)
            if self._no_new_streak >= self.NO_NEW_STREAK_LIMIT:
                # Devolver vacío => el motor cierra esta marca (fin natural).
                return RawPage(cards=[], total_reported=0, page=page, extra={"url": url})
            # Aún no cortamos: devolvemos las cards (el upsert dedup por id, inocuo).
        else:
            self._no_new_streak = 0

        for c in cards:
            c["_brand"] = brand
        logger.info("[yapo] brand=%s pág=%d cards=%d nuevos=%d", brand, page, len(cards), len(new))
        return RawPage(cards=cards, total_reported=len(cards), page=page, extra={"url": url})

    # ------------------------------------------------------------------
    def parse_listing(self, raw_card: dict) -> Listing | None:
        try:
            lid = raw_card.get("id")
            if not lid:
                return None

            href = raw_card.get("href") or ""
            url = href if href.startswith("http") else BASE_URL + href

            text = raw_card.get("text") or ""

            price_clp = raw_card.get("price_val")
            if price_clp is None:
                price_clp = _money(_search(r"\$\s?[\d.]{4,}", text))
            # Descartar precios no plausibles para un auto (repuestos/desarme/"en
            # prenda" suelen venir con montos chicos tipo $10.000 → falso bajón).
            if price_clp is not None and price_clp < 800_000:
                return None

            # Las specs (año, combustible, transmisión, km) vienen DESPUÉS del precio:
            #   "... Mitsubishi L 200 $12.590.000 -10% 2019 Diesel Manual 103000 km ..."
            # Parsear sobre la cola evita agarrar otros números (p.ej. un año en el header).
            tail = text.split("$", 1)[1] if "$" in text else text

            year = _int(_search(r"\b(19[89]\d|20[0-4]\d)\b", tail))
            km = _money(_search(r"([\d.]{3,})\s*km", tail))

            low = tail.lower()
            fuel = None
            for kw, norm in YAPO_FUEL_MAP.items():
                if kw in low:
                    fuel = norm
                    break
            transmission = (
                "automatico" if ("autom" in low) else "manual" if ("manual" in low) else None
            )

            # Marca/modelo: el SLUG de la URL es por-aviso y limpio → va primero;
            # el innerText es fallback (puede mezclar descripción del vendedor).
            slug = raw_card.get("slug", "")
            make = _make_from_slug(slug) or _make_from_text(text)
            model = _model_from_slug(slug, make) or _model_from_text(text, make)

            # Imágenes: lista de fotos reales del carrusel (ver _EXTRACT_JS).
            # Fallback al campo `img` (compat) y descarte de placeholders por las dudas.
            imgs = raw_card.get("imgs")
            if not imgs:
                single = raw_card.get("img") or ""
                imgs = [single] if single else []
            images = [u for u in imgs if u and not str(u).startswith("data:")]

            # No insertar avisos SIN foto real: en Yapo casi siempre es lazy-load que
            # no cargó (no que el aviso no tenga fotos). Mejor descartarlo y re-captarlo
            # en otra corrida que ensuciar la base con tarjetas en blanco.
            if not images:
                return None

            return Listing(
                source="yapo",
                source_listing_id=str(lid),
                url=url,
                title=" ".join(x for x in [make, model, str(year) if year else ""] if x).strip() or None,
                make=make or None,
                model=model or None,
                year=year,
                price_clp=price_clp,
                mileage_km=km,
                transmission=transmission,
                fuel=fuel,
                region="Región Metropolitana",
                seller_type="unknown",
                photo_count=len(images) or None,
                images=images,
                raw_json=raw_card,
            )
        except Exception as exc:
            logger.debug("[yapo] parse_listing error: %s", exc)
            return None


# ----------------------------------------------------------------------
# Helpers de parseo
# ----------------------------------------------------------------------
def _search(pattern: str, text: str) -> str | None:
    m = re.search(pattern, text)
    return m.group(0) if m else None


def _money(val: Any) -> int | None:
    """'$12.590.000' / '103.000 km' / '12590000' → 12590000."""
    if val is None:
        return None
    digits = re.sub(r"[^\d]", "", str(val))
    return int(digits) if digits else None


def _int(val: Any) -> int | None:
    try:
        return int(re.sub(r"[^\d]", "", str(val))) if val is not None else None
    except (ValueError, TypeError):
        return None


# Marcas frecuentes en el mercado chileno. Clave = token a buscar (minúsculas),
# valor = forma canónica para guardar.
_BRANDS: dict[str, str] = {
    "toyota": "Toyota", "honda": "Honda", "mazda": "Mazda", "subaru": "Subaru",
    "hyundai": "Hyundai", "kia": "Kia", "nissan": "Nissan", "ford": "Ford",
    "volkswagen": "Volkswagen", "vw": "Volkswagen", "peugeot": "Peugeot",
    "renault": "Renault", "citroen": "Citroen", "citroën": "Citroen",
    "mitsubishi": "Mitsubishi", "chevrolet": "Chevrolet", "jeep": "Jeep",
    "bmw": "BMW", "mercedes": "Mercedes-Benz", "mercedes-benz": "Mercedes-Benz",
    "audi": "Audi", "volvo": "Volvo", "lexus": "Lexus", "porsche": "Porsche",
    "maxus": "Maxus", "suzuki": "Suzuki", "chery": "Chery", "jac": "JAC",
    "great": "Great Wall", "haval": "Haval", "mg": "MG", "fiat": "Fiat",
    "dodge": "Dodge", "ram": "RAM", "ssangyong": "SsangYong", "opel": "Opel",
    "skoda": "Skoda", "seat": "Seat", "mini": "MINI", "land": "Land Rover",
    "jaguar": "Jaguar", "changan": "Changan", "dfsk": "DFSK", "foton": "Foton",
    "geely": "Geely", "byd": "BYD", "baic": "BAIC",
}


def _make_from_text(text: str) -> str | None:
    """Detecta la marca buscando la primera palabra-marca conocida en el texto."""
    for tok in re.findall(r"[A-Za-zÀ-ÿ]+", text):
        canon = _BRANDS.get(tok.lower())
        if canon:
            return canon
    return None


def _make_from_slug(slug: str) -> str | None:
    """Primera palabra-marca conocida del slug."""
    for tok in slug.lower().split("-"):
        canon = _BRANDS.get(tok)
        if canon:
            return canon
    return None


def _model_from_text(text: str, make: str | None) -> str | None:
    """Modelo = texto entre la marca y el precio en el innerText de la tarjeta."""
    if not make:
        return None
    m = re.search(re.escape(make) + r"\s+(.+?)\s*\$", text, re.IGNORECASE)
    if not m:
        return None
    model = m.group(1).strip()
    # limpiar tokens espurios
    model = re.sub(r"\s+", " ", model)
    return model[:60] or None


# Tokens de relleno típicos en los slugs de Yapo (no son parte del modelo).
_SLUG_FILLER = {
    "full", "4x4", "4wd", "awd", "diesel", "bencina", "gasolina", "aut", "auto",
    "automatico", "manual", "mec", "impecable", "vendo", "excelente", "oportunidad",
    "unico", "dueno", "dueño", "nuevo", "usado", "como", "del", "de", "la", "el",
    "con", "sport", "limited", "lt", "ls", "gl", "glx", "gls", "se", "xe", "xei",
}


def _model_from_slug(slug: str, make: str | None) -> str | None:
    if not slug:
        return None
    tokens = [t for t in slug.split("-") if t]
    # Cortar todo hasta DESPUÉS de la marca, si aparece.
    if make:
        low = [t.lower() for t in tokens]
        mk = make.split()[0].lower()
        if mk in low:
            tokens = tokens[low.index(mk) + 1:]
    out: list[str] = []
    for t in tokens:
        tl = t.lower()
        if re.fullmatch(r"(19|20)\d{2}", t):  # año
            break
        if tl in _SLUG_FILLER:
            if out:
                break  # ya tenemos el modelo; el relleno marca el fin
            continue   # relleno antes del modelo → saltar
        out.append(t)
        if len(out) >= 2:
            break
    model = " ".join(out).strip()
    return model[:40].title() or None
