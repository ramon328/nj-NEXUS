"""Sesión HTTP base hacia el SII, con headers realistas, throttling y reintentos."""
from __future__ import annotations

import json
import logging
import time
from pathlib import Path

import requests

from .rate_limit import Throttle

log = logging.getLogger("sii.client")

# User-Agent de un navegador real reciente — el SII rechaza clientes "raros".
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)


class SiiClient:
    """Envuelve requests.Session con pausas humanas y reintentos suaves."""

    def __init__(self, throttle: Throttle, max_retries: int = 3, timeout: int = 60):
        self.throttle = throttle
        self.max_retries = max_retries
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update(
            {
                "User-Agent": USER_AGENT,
                "Accept-Language": "es-CL,es;q=0.9",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            }
        )

    def request(self, method: str, url: str, throttle: bool = True, **kwargs) -> requests.Response:
        if throttle:
            self.throttle.wait()
        kwargs.setdefault("timeout", self.timeout)

        # Solo reintentamos errores de RED/timeout (transitorios). Un 5xx del SII
        # suele ser determinista (payload), así que devolvemos la respuesta y que
        # el caller decida — evita martillar el servidor.
        last_exc: Exception | None = None
        for intento in range(1, self.max_retries + 1):
            try:
                return self.session.request(method, url, **kwargs)
            except requests.RequestException as exc:
                last_exc = exc
                espera = 2 ** intento
                log.warning("Intento %d/%d falló (%s). Reintentando en %ds…",
                            intento, self.max_retries, exc, espera)
                time.sleep(espera)
        raise RuntimeError(f"No se pudo completar la petición a {url}") from last_exc

    def get(self, url: str, **kwargs) -> requests.Response:
        return self.request("GET", url, **kwargs)

    def post(self, url: str, **kwargs) -> requests.Response:
        return self.request("POST", url, **kwargs)

    # ─── Persistencia de cookies (evita re-loguear y bloqueos) ──────────
    def save_cookies(self, path: Path) -> None:
        path = Path(path)
        data = {
            "saved_at": time.time(),
            "cookies": requests.utils.dict_from_cookiejar(self.session.cookies),
        }
        path.write_text(json.dumps(data, indent=2), encoding="utf-8")
        log.info("Sesión guardada en %s", path)

    def load_cookies(self, path: Path) -> bool:
        """Carga cookies guardadas. Devuelve True si había sesión previa."""
        path = Path(path)
        if not path.exists():
            return False
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (ValueError, OSError):
            return False
        cookies = data.get("cookies", {})
        if not cookies:
            return False
        self.session.cookies.update(
            requests.utils.cookiejar_from_dict(cookies)
        )
        edad_min = (time.time() - data.get("saved_at", 0)) / 60
        log.info("Sesión previa cargada (%.0f min de antigüedad).", edad_min)
        return True

    @property
    def token(self) -> str | None:
        """Valor de la cookie TOKEN (= conversationId que exige el RCV)."""
        return self.session.cookies.get_dict().get("TOKEN")

    def promover_dominio_sii(self) -> None:
        """Re-emite las cookies *.sii.cl con domain='.sii.cl' para que viajen a
        TODOS los subdominios (www4 = RCV, www2 = carpeta, zeusr…).

        CLAVE: el login deja TOKEN como cookie host-only de zeusr/misiir.sii.cl,
        y requests NO la envía a www4.sii.cl (subdominio hermano) → el RCV sale
        SIN sesión y el SII responde 401. Esto la promueve a .sii.cl. Llamar tras
        login / cargar cookies, ANTES de cualquier petición a www4 (RCV).
        """
        pares = [
            (c.name, c.value)
            for c in list(self.session.cookies)
            if c.domain and "sii.cl" in c.domain
        ]
        for name, value in pares:
            self.session.cookies.set(name, value, domain=".sii.cl", path="/")
