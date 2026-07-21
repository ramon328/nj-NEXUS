"""
Motor común del scraper: orquesta perfiles → fuentes → marcas → páginas.
No conoce HTML ni estructura de ningún sitio; toda esa lógica vive en los adapters.
"""

from __future__ import annotations

import logging
import random
import threading
import time
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Any

from .db import SupabaseREST
from .models import Listing, RawPage, ScrapeRun, SearchProfile

if TYPE_CHECKING:
    from .adapters.base import SiteAdapter

logger = logging.getLogger("engine")

# -------------------------------------------------------
# Constantes de throttling
# -------------------------------------------------------
THROTTLE_PAGE = 4.0
THROTTLE_BRAND = 8.0
MAX_PAGES_PER_BRAND = 300
JITTER_MIN = 0.5
JITTER_MAX = 2.0
FILTER_FAILURE_THRESHOLD = 50_000
MAX_RETRIES_PER_BRAND = 2
RETRY_BACKOFF = 15.0
MAX_CONSECUTIVE_EMPTY = 3

# -------------------------------------------------------
# Detección de vendidos (reconciliación por desaparición)
# -------------------------------------------------------
# Un aviso se marca 'sold' si, en una corrida que cubrió COMPLETAMENTE su scope
# (source+marca, hasta agotar páginas), ya no apareció. Guardas anti-falso-positivo:
RECONCILE_MIN_CARDS = 5            # no reconciliar scopes con muy pocos resultados
RECONCILE_MAX_SOLD_FRACTION = 0.6  # si "desaparece" >60% del scope, es cobertura rota → saltar


def jitter() -> float:
    return random.uniform(JITTER_MIN, JITTER_MAX)


def throttle(base: float, stop_event: threading.Event | None = None) -> None:
    """Sleep con soporte de cancelación via stop_event."""
    deadline = time.monotonic() + base + jitter()
    while time.monotonic() < deadline:
        if stop_event and stop_event.is_set():
            return
        time.sleep(0.5)


class Engine:
    def __init__(self, supabase: SupabaseREST, debug_max_pages: int | None = None):
        self.db = supabase
        self.debug_max_pages = debug_max_pages
        self._stop_event = threading.Event()
        # Reconciliación de vendidos: se puede desactivar (--no-recheck).
        self.skip_recheck = False
        # Estado por scope (source, make_lower) acumulado durante la corrida.
        self._scope_seen: dict[tuple[str, str], dict] = {}
        self._scope_clean: set[tuple[str, str]] = set()

    def request_stop(self) -> None:
        """Señala al motor que debe detenerse en el próximo punto seguro."""
        self._stop_event.set()
        logger.info("Stop solicitado — el scraper se detendrá al finalizar la página actual.")

    def reset_stop(self) -> None:
        self._stop_event.clear()

    def should_stop(self) -> bool:
        return self._stop_event.is_set()

    # ------------------------------------------------------------------
    # Punto de entrada principal
    # ------------------------------------------------------------------
    def run_all(
        self,
        adapter_classes: list,
        debug_max_pages: int | None = None,
    ) -> list[ScrapeRun]:
        """
        Corre todos los adapters contra todos los perfiles activos.
        Sin filtro de precio/km en el scraper — ese filtrado queda en la UI.
        """
        if debug_max_pages:
            self.debug_max_pages = debug_max_pages

        profiles = self._load_profiles()
        all_runs: list[ScrapeRun] = []

        # Reiniciar el estado de reconciliación para esta corrida.
        self._scope_seen = {}
        self._scope_clean = set()

        for AdapterClass in adapter_classes:
            if self.should_stop():
                logger.info("Stop antes de iniciar adapter %s", AdapterClass.__name__)
                break
            adapter = AdapterClass()
            for profile in profiles:
                if self.should_stop():
                    break
                if adapter.name not in profile.sources:
                    continue
                run = ScrapeRun(source=adapter.name, profile_id=profile.id)
                try:
                    self._run_profile(adapter, profile, run)
                except Exception as exc:
                    run.error_message = str(exc)
                    logger.error("Error en perfil '%s': %s", profile.name, exc, exc_info=True)
                finally:
                    self._save_run(run)
                all_runs.append(run)

        # Tras scrapear (nuevos + re-vistos), reconciliar vendidos por desaparición.
        if not self.skip_recheck and not self.should_stop():
            try:
                self._reconcile_sold()
            except Exception as exc:
                logger.error("Reconciliación de vendidos falló: %s", exc, exc_info=True)

        return all_runs

    # ------------------------------------------------------------------
    # Ejecución de un perfil
    # ------------------------------------------------------------------
    def _run_profile(self, adapter: "SiteAdapter", profile: SearchProfile, run: ScrapeRun) -> None:
        brands = profile.makes if profile.makes else [""]

        for i, brand in enumerate(brands):
            if self.should_stop():
                break
            ok = self._run_brand_with_retry(adapter, profile, run, brand)
            if not ok:
                run.failed_brands.append(brand)
                logger.warning("[%s] Marca '%s' falló.", adapter.name, brand)
            if i < len(brands) - 1 and not self.should_stop():
                throttle(THROTTLE_BRAND, self._stop_event)

    # ------------------------------------------------------------------
    # Marca con reintentos
    # ------------------------------------------------------------------
    def _run_brand_with_retry(self, adapter, profile, run, brand) -> bool:
        for attempt in range(MAX_RETRIES_PER_BRAND + 1):
            if self.should_stop():
                return True
            if attempt > 0:
                logger.info("[%s] Reintento %d para '%s'", adapter.name, attempt, brand)
                time.sleep(RETRY_BACKOFF)
            try:
                if self._paginate_brand(adapter, profile, run, brand):
                    return True
            except Exception as exc:
                logger.warning("[%s] Excepción en '%s': %s", adapter.name, brand, exc)
        return False

    # ------------------------------------------------------------------
    # Paginación de una marca
    # ------------------------------------------------------------------
    def _paginate_brand(self, adapter, profile, run, brand) -> bool:
        session = adapter.new_session(brand, profile)
        consecutive_empty = 0
        max_pages = self.debug_max_pages or MAX_PAGES_PER_BRAND
        batch: list[Listing] = []

        # Estado local de este scrapeo de marca, para la reconciliación de vendidos.
        had_cards = False
        natural_end = False
        brand_makes_seen: set[str] = set()

        for page in range(1, max_pages + 1):
            if self.should_stop():
                break

            raw: RawPage = adapter.fetch_page(session, brand, profile, page)
            run.pages_fetched += 1

            # Validación anti-falla de filtro
            if page == 1 and raw.total_reported > FILTER_FAILURE_THRESHOLD:
                logger.warning(
                    "[%s] Filtro fallido para '%s': total=%d",
                    adapter.name, brand, raw.total_reported,
                )
                run.filter_failed = True
                return False

            if not raw.cards:
                consecutive_empty += 1
                if consecutive_empty >= MAX_CONSECUTIVE_EMPTY:
                    natural_end = True   # se agotaron los resultados
                    break
            else:
                consecutive_empty = 0

            for card in raw.cards:
                try:
                    listing = adapter.parse_listing(card)
                except Exception as exc:
                    logger.debug("[%s] parse error: %s", adapter.name, exc)
                    continue
                if listing is None:
                    continue

                listing.profile_id = profile.id
                listing.is_premium = profile.is_premium

                # Solo descartar motos — el filtro de precio/km queda en la UI
                if listing.is_moto():
                    continue
                # Excluir marcas de la lista negra del perfil
                if profile.exclude_makes and listing.make:
                    if listing.make.lower() in [m.lower() for m in profile.exclude_makes]:
                        continue

                batch.append(listing)
                run.listings_found += 1

                # Registrar presencia para la reconciliación de vendidos.
                if listing.make and listing.source_listing_id:
                    had_cards = True
                    mk = listing.make.lower()
                    brand_makes_seen.add(mk)
                    key = (adapter.name, mk)
                    sc = self._scope_seen.get(key)
                    if sc is None:
                        sc = {"ids": set(), "seller_types": set(), "cards": 0, "make": listing.make}
                        self._scope_seen[key] = sc
                    sc["ids"].add(listing.source_listing_id)
                    if listing.seller_type:
                        sc["seller_types"].add(listing.seller_type)
                    sc["cards"] += 1

            if batch:
                upserted = self._upsert_batch(batch, run)
                run.listings_upserted += upserted
                batch.clear()

            if not raw.cards:
                natural_end = True   # primera página vacía tras resultados = fin natural
                break

            if page < max_pages and not self.should_stop():
                throttle(THROTTLE_PAGE, self._stop_event)

        # Si cubrimos el scope por completo (llegamos al final con resultados),
        # sus marcas quedan habilitadas para reconciliar vendidos.
        if natural_end and had_cards:
            for mk in brand_makes_seen:
                self._scope_clean.add((adapter.name, mk))

        return True

    # ------------------------------------------------------------------
    # Upsert a Supabase
    # ------------------------------------------------------------------
    def _upsert_batch(self, listings: list[Listing], run: ScrapeRun) -> int:
        # Capturamos el estado previo ANTES de que el upsert pise el precio actual.
        prev_prices, has_history = self._fetch_prev_state(listings)

        rows = [l.to_upsert_dict() for l in listings]
        try:
            upserted = self.db.upsert("listings", rows, on_conflict="source,source_listing_id")
        except Exception as exc:
            logger.error("Error en upsert: %s", exc)
            return 0

        # Registrar el historial de precios es best-effort: nunca debe tumbar la corrida.
        try:
            self._record_price_history(listings, prev_prices, has_history, run)
        except Exception as exc:
            logger.error("Error registrando price_history: %s", exc)

        return upserted

    # ------------------------------------------------------------------
    # Historial de precios + detección de bajadas
    # ------------------------------------------------------------------
    @staticmethod
    def _in_list(values: list[str]) -> str:
        """Construye un filtro PostgREST `in.("a","b")` con comillas (seguro para IDs)."""
        quoted = []
        for v in values:
            esc = v.replace("\\", "\\\\").replace('"', '\\"')
            quoted.append(f'"{esc}"')
        return "in.(" + ",".join(quoted) + ")"

    def _fetch_prev_state(self, listings: list[Listing]) -> tuple[dict[str, int], set[str]]:
        """
        Devuelve (precio_anterior_por_listing, set_de_listings_con_historial).
        El precio anterior sale de `listings` (su precio actual, aún sin pisar);
        el set sale de `price_history` (para saber si hay que sembrar un baseline).
        """
        ids = sorted({l.source_listing_id for l in listings if l.source_listing_id})
        if not ids:
            return {}, set()

        source = listings[0].source
        prev_prices: dict[str, int] = {}
        has_history: set[str] = set()

        try:
            rows = self.db.select("listings", filters={
                "select": "source_listing_id,price_clp",
                "source": f"eq.{source}",
                "source_listing_id": self._in_list(ids),
            })
            for r in rows:
                if r.get("price_clp") is not None:
                    prev_prices[r["source_listing_id"]] = r["price_clp"]
        except Exception as exc:
            logger.debug("No se pudo leer precios previos: %s", exc)

        try:
            rows = self.db.select("price_history", filters={
                "select": "listing_id",
                "listing_id": self._in_list(ids),
            })
            for r in rows:
                if r.get("listing_id"):
                    has_history.add(r["listing_id"])
        except Exception as exc:
            logger.debug("No se pudo leer price_history previo: %s", exc)

        return prev_prices, has_history

    def _record_price_history(
        self,
        listings: list[Listing],
        prev_prices: dict[str, int],
        has_history: set[str],
        run: ScrapeRun,
    ) -> None:
        """
        Appendea filas a price_history (nunca pisa). Una fila baseline la primera
        vez que vemos un auto; una fila con delta cada vez que el precio cambia.
        Una bajada de precio es simplemente una fila con delta_clp < 0.
        """
        now = datetime.now(timezone.utc).isoformat()
        rows: list[dict] = []
        seen: set[str] = set()

        for l in listings:
            slid = l.source_listing_id
            new = l.price_clp
            if not slid or new is None or slid in seen:
                continue
            seen.add(slid)

            # IMPORTANTE: PostgREST exige que TODAS las filas de un insert masivo
            # tengan exactamente las mismas claves. Por eso cada fila lleva siempre
            # delta_clp/delta_pct (null en el baseline), nunca un subconjunto.
            if slid not in has_history:
                # Primera vez en price_history → punto inicial, sin delta.
                rows.append({
                    "listing_id": slid,
                    "price_clp": new,
                    "mileage_km": l.mileage_km,
                    "captured_at": now,
                    "delta_clp": None,
                    "delta_pct": None,
                })
                continue

            old = prev_prices.get(slid)
            if old is None or old == new:
                continue  # sin cambio → no appendeamos (evita filas duplicadas por corrida)

            # Guarda anti-falso-bajón: un cambio implausible casi siempre es ruido de
            # parseo (precio mal leído en una de las dos corridas), no una bajada real.
            # Lo ignoramos para no disparar alertas falsas en el dashboard.
            delta = new - old
            if old < 800_000 or new < 800_000 or abs(delta) / old > 0.6:
                logger.debug("[price_history] delta implausible ignorado %s: %s→%s", slid, old, new)
                continue

            rows.append({
                "listing_id": slid,
                "price_clp": new,
                "mileage_km": l.mileage_km,
                "captured_at": now,
                "delta_clp": delta,
                "delta_pct": round(delta / old * 100, 2) if old else None,
            })

        if rows:
            # Contamos las bajadas solo tras un insert exitoso (consistencia
            # log↔DB: nunca reportar una bajada que no se persistió).
            self.db.insert_many("price_history", rows)
            run.price_history_added += len(rows)
            run.price_drops += sum(1 for r in rows if (r.get("delta_clp") or 0) < 0)

    # ------------------------------------------------------------------
    # Reconciliación de vendidos (por desaparición)
    # ------------------------------------------------------------------
    def _reconcile_sold(self) -> None:
        """
        Para cada scope (source, marca) que se cubrió COMPLETAMENTE en esta corrida,
        marca como 'sold' los avisos activos que ya no aparecieron en la fuente.

        Acotado y conservador para no generar falsos positivos:
          - solo scopes que llegaron al final natural de la paginación (clean);
          - solo dentro de los seller_type efectivamente observados (este adapter
            puede cubrir solo 'dealer', sin tocar 'particular' de otro scraper);
          - se salta scopes con muy pocos resultados o con una fracción de
            desaparición sospechosamente alta (cobertura rota).
        """
        total_sold = 0
        for (source, _mk), info in self._scope_seen.items():
            if (source, _mk) not in self._scope_clean:
                continue
            if info["cards"] < RECONCILE_MIN_CARDS:
                continue
            seller_types = sorted(info["seller_types"])
            if not seller_types:
                continue

            make = info["make"]
            filters = {
                "status": "eq.active",
                "archived": "eq.false",
                "source": f"eq.{source}",
                "make": f"ilike.{make}",
                "seller_type": "in.(" + ",".join(seller_types) + ")",
            }
            try:
                candidates = self.db.select_all(
                    "listings", filters=filters, columns="id,source_listing_id"
                )
            except Exception as exc:
                logger.error("reconcile: no se pudo leer %s/%s: %s", source, make, exc)
                continue
            if not candidates:
                continue

            seen_ids = info["ids"]
            gone = [c["id"] for c in candidates if c.get("source_listing_id") not in seen_ids]
            if not gone:
                continue

            frac = len(gone) / len(candidates)
            if frac > RECONCILE_MAX_SOLD_FRACTION:
                logger.warning(
                    "reconcile: %s/%s SALTADO — %d/%d (%.0f%%) desaparecidos > cap %.0f%%",
                    source, make, len(gone), len(candidates),
                    frac * 100, RECONCILE_MAX_SOLD_FRACTION * 100,
                )
                continue

            try:
                n = self.db.update_status("listings", gone, "sold")
                total_sold += n
                logger.info(
                    "reconcile: %d marcados VENDIDOS en %s/%s (%d activos vistos)",
                    n, source, make, len(seen_ids),
                )
            except Exception as exc:
                logger.error("reconcile: no se pudo marcar vendidos en %s/%s: %s", source, make, exc)

        logger.info("=== Reconciliación: %d avisos marcados como vendidos ===", total_sold)

    # ------------------------------------------------------------------
    # Guardar corrida
    # ------------------------------------------------------------------
    def _save_run(self, run: ScrapeRun) -> None:
        try:
            self.db.insert("scrape_runs", {
                "source": run.source,
                "profile_id": run.profile_id,
                "listings_found": run.listings_found,
                "listings_upserted": run.listings_upserted,
                "pages_fetched": run.pages_fetched,
                "failed_brands": run.failed_brands,
                "filter_failed": run.filter_failed,
                "error_message": run.error_message,
                "notes": run.notes,
            })
        except Exception as exc:
            logger.error("No se pudo guardar scrape_run: %s", exc)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    def _load_profiles(self) -> list[SearchProfile]:
        rows = self.db.select("search_profiles", filters={"active": "eq.true"})
        return [SearchProfile.from_row(r) for r in rows]
