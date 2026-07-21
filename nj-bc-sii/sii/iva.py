"""Propuesta F29 PRECARGADA por el SII (app propuestaf29ui).

Distinta de 'propuesta_f29' (que CALCULA el IVA a pagar desde el RCV, ya estable):
esta trae los códigos PRECARGADOS por el SII para declarar el F29 del periodo.

Flujo mapeado en vivo (junio 2026), con RUT + Clave (SIN certificado):
  bootstrap (índice + AutTknData liga la sesión JBoss)
  → getDeclaracionVigente {periodo}      → {existe: bool}
  → si existe: getCodigosPropuestos {periodo, folio:0} → códigos precargados.

⚠️ EXPERIMENTAL: no se pudo verificar contra una empresa con F29 vigente (la de
prueba no tiene declaraciones F29 en ningún periodo). Para empresas que SÍ tengan
propuesta debería traer los códigos; si no, reporta "sin propuesta".
"""
from __future__ import annotations

import logging
import random
import time
import uuid

from . import rut as rututil
from .client import SiiClient

log = logging.getLogger("sii.iva")

APP = "https://www4.sii.cl/propuestaf29ui"
NS = "cl.sii.sdi.lob.iva.propuestaf29.data.api.interfaces.FacadeAdapterService"


class PropuestaF29Client:
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
            f"{APP}/services/data/facadeAdapterService/{op}", json=payload, headers=headers
        )

    def existe(self, periodo: str | int) -> bool:
        try:
            d = self._facade("getDeclaracionVigente", {"periodo": str(periodo)}).json().get("data")
        except ValueError:
            return False
        return bool(isinstance(d, dict) and d.get("existe"))

    def codigos(self, periodo: str | int) -> list:
        """Códigos precargados de la propuesta F29 del periodo (o [] si no hay)."""
        if not self.existe(periodo):
            return []
        try:
            d = self._facade("getCodigosPropuestos", {"periodo": str(periodo), "folio": 0}).json().get("data")
        except ValueError:
            return []
        if isinstance(d, list):
            return d
        if isinstance(d, dict):
            return d.get("codigos") or d.get("detalle") or [d]
        return []
