"""Formulario 22 (Renta anual) OFICIAL — app `consultaestadof22ui` del SII.

Descubierto y VERIFICADO en vivo (junio 2026): el compacto oficial del F22 se
obtiene con RUT + Clave (SIN certificado) vía la API JSON de `consultaestadof22ui`
— misma arquitectura SDI/JBoss que el RCV. Flujo:

  1) bootstrap: GET índice + GET zeusr/AutTknData.cgi (liga la sesión JBoss).
  2) consultaFolios {rut, dv, periodo=añoTributario, pathRuta} → folio por año.
  3) f22Compacto/pdf64 {rut, dv, periodo, folio} → PDF OFICIAL (base64, con folio).
     f22Compacto (sin /pdf64) → el F22 código-a-código (codigo, valor, glosa).

conversationId = cookie TOKEN (igual que el RCV), no el RUT.
"""
from __future__ import annotations

import base64
import logging
import random
import time
import uuid

from . import rut as rututil
from .client import SiiClient

log = logging.getLogger("sii.renta")

APP = "https://www4.sii.cl/consultaestadof22ui"
NS = "cl.sii.sdi.lob.renta.consultaestadof22.data.api.interfaces.FacadeService"


class F22Client:
    def __init__(self, client: SiiClient, rut: str):
        self.client = client
        self.cuerpo, self.dv = rututil.split(rut)
        self._inicio_ok = False

    @property
    def _token(self) -> str:
        t = self.client.token
        if not t:
            raise RuntimeError("Sin cookie TOKEN — la sesión no está autenticada.")
        return t

    def inicio(self) -> None:
        """Bootstrap: índice del SPA + AutTknData.cgi (crea la sesión JBoss)."""
        self.client.get(APP + "/")
        ts = int(time.time() * 1000)
        try:
            self.client.get(
                f"https://zeusr.sii.cl/cgi_AUT2000/AutTknData.cgi"
                f"?rnd={random.random()}&callback=jQuery_{ts}&_={ts + 1}",
                headers={"Accept": "*/*", "Referer": APP + "/"},
            )
        except Exception:  # noqa: BLE001
            pass
        self._inicio_ok = True

    def _facade(self, op: str, data: dict):
        if not self._inicio_ok:
            self.inicio()
        payload = {
            "metaData": {
                "namespace": f"{NS}/{op}",
                "conversationId": self._token,
                "transactionId": str(uuid.uuid4()),
                "page": None,
            },
            "data": data,
        }
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json, text/plain, */*",
            "Referer": APP + "/",
            "Origin": "https://www4.sii.cl",
        }
        return self.client.post(
            f"{APP}/services/data/facadeService/{op}", json=payload, headers=headers
        )

    def _data(self, op: str, data: dict):
        try:
            return self._facade(op, data).json().get("data")
        except ValueError:
            return None

    def folios(self, anio: str | int) -> list[dict]:
        """Declaraciones F22 del año tributario (folio, fecha, estado, etc.)."""
        d = self._data("consultaFolios", {
            "rut": self.cuerpo, "dv": self.dv,
            "periodo": str(anio), "pathRuta": "/consultaEstadoDecIni",
        })
        if isinstance(d, list):
            return d
        return [d] if isinstance(d, dict) else []

    def datos_compacto(self, anio: str | int, folio) -> list[dict]:
        """F22 código-a-código: [{codigo, valor, glosa}, …]."""
        d = self._data("f22Compacto", {
            "rut": self.cuerpo, "dv": self.dv, "periodo": str(anio), "folio": folio,
        })
        return d if isinstance(d, list) else []

    def compacto_pdf(self, anio: str | int, folio) -> bytes | None:
        """PDF OFICIAL del F22 compacto (con folio). Devuelve bytes o None."""
        b64 = self._data("f22Compacto/pdf64", {
            "rut": self.cuerpo, "dv": self.dv, "periodo": str(anio), "folio": folio,
        })
        if isinstance(b64, str) and len(b64) > 500:
            try:
                raw = base64.b64decode(b64)
                if raw[:4] == b"%PDF":
                    return raw
            except Exception:  # noqa: BLE001
                return None
        return None
