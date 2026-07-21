"""Protocolo base que todos los adapters deben implementar."""

from __future__ import annotations

from typing import Protocol

import requests

from ..models import Listing, RawPage, SearchProfile


class SiteAdapter(Protocol):
    name: str  # 'chileautos' | 'mercadolibre' | 'yapo'

    def new_session(self, brand: str, profile: SearchProfile) -> requests.Session:
        """Crea sesión HTTP fresca con cookies/headers correctos para el sitio."""
        ...

    def fetch_page(
        self,
        session: requests.Session,
        brand: str,
        profile: SearchProfile,
        page: int,
    ) -> RawPage:
        """Pide una página de resultados. Devuelve cards crudas + total reportado."""
        ...

    def parse_listing(self, raw_card: dict) -> Listing | None:
        """Normaliza una card cruda a Listing. None si la card no es válida."""
        ...
