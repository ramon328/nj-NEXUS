"""Formularios F29 (IVA mensual) y F22 (renta anual).

El portal *standalone* del F29/F22 del SII usa GWT + cola virtual (queue-it),
muy difícil de automatizar de forma estable. Pero el SII ya entrega estos
formularios DENTRO de la Carpeta Tributaria, que sí resolvimos (ver
`sii/carpeta.py`, navegador headless con la sesión inyectada):

    - `formulariosIva`     → F29 presentados (últimos ~36 meses)
    - `declaracionesRenta` → F22 presentados (últimos años)

Por eso aquí reutilizamos `carpeta.obtener_datos` y filtramos por periodo. Se
descarga la carpeta UNA sola vez por cliente (caché) — abrir el navegador es lo
caro — y luego se sirven los formularios desde memoria.

Requiere Playwright (igual que la carpeta):
    pip install playwright && playwright install chromium
"""
from __future__ import annotations

import logging
import re

from . import carpeta
from .client import SiiClient

log = logging.getLogger("sii.formularios")


class FormularioError(RuntimeError):
    """No se pudieron obtener los formularios (sin sesión / sin Playwright / sin datos)."""


def _solo_digitos(v: object) -> str:
    return re.sub(r"\D", "", str(v or ""))


class FormulariosClient:
    def __init__(self, client: SiiClient, rut: str):
        self.client = client
        self.rut = rut
        self._cache: dict | None = None
        self._error: str | None = None

    def _datos_carpeta(self) -> dict:
        """Descarga (una vez) y cachea los datos de la carpeta tributaria.

        Cachea también el fallo: si abrir el navegador falla, no se reintenta en
        cada periodo del job (sería un navegador por mes).
        """
        if self._cache is not None:
            return self._cache
        if self._error is not None:
            raise FormularioError(self._error)
        try:
            self._cache = carpeta.obtener_datos(self.client, self.rut)
        except Exception as exc:  # noqa: BLE001
            # Playwright ausente, sesión caída, etc. → mensaje limpio, una vez.
            self._error = (
                f"No se pudo abrir la carpeta tributaria para leer los "
                f"formularios: {exc}"
            )
            raise FormularioError(self._error) from exc
        return self._cache

    def refrescar(self) -> dict:
        """Re-consulta la carpeta una vez (mismo navegador, SIN re-loguear).

        Útil para el caso `compactoBase64=null` (lag del SII): a veces un hit
        aislado no trae el PDF oficial y un segundo intento sí. Reutiliza la
        sesión ya inyectada, así que no gatilla logins ni esquiva el throttle.
        """
        self._cache = None
        self._error = None
        try:
            self._cache = carpeta.obtener_datos(self.client, self.rut)
        except Exception as exc:  # noqa: BLE001
            # Playwright ausente, sesión caída, etc. → mensaje limpio, una vez.
            self._error = (
                f"No se pudo abrir la carpeta tributaria para leer los "
                f"formularios: {exc}"
            )
            raise FormularioError(self._error) from exc
        return self._cache

    # ─── F29 (IVA mensual, periodo YYYYMM) ───────────────────────────────
    def consultar_f29(self, periodo: str | None = None) -> dict:
        """F29 presentados. Si `periodo` (YYYYMM) se indica, filtra ese mes."""
        log.info("Consultando F29%s", f" periodo {periodo}" if periodo else "")
        iva = self._datos_carpeta().get("formulariosIva") or []
        objetivo = _solo_digitos(periodo)
        formularios = [
            f for f in iva
            if not objetivo or _solo_digitos(f.get("periodo")) == objetivo
        ]
        return {
            "tipo": "F29",
            "periodo": periodo,
            "total": len(formularios),
            "formularios": formularios,
        }

    # ─── F22 (renta anual, año YYYY) ─────────────────────────────────────
    def consultar_f22(self, anio: str | None = None) -> dict:
        """F22 presentados. Si `anio` (YYYY) se indica, filtra ese año tributario."""
        log.info("Consultando F22%s", f" año {anio}" if anio else "")
        renta = self._datos_carpeta().get("declaracionesRenta") or []
        objetivo = _solo_digitos(anio)
        declaraciones = [
            d for d in renta
            if not objetivo or _solo_digitos(d.get("periodo")) == objetivo
        ]
        return {
            "tipo": "F22",
            "anio": anio,
            "total": len(declaraciones),
            "declaraciones": declaraciones,
        }
