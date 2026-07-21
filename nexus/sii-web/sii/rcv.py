"""Registro de Compras y Ventas (RCV) — facturas electrónicas (DTE).

Usa la API JSON del portal consdcvinternetui.

CLAVE (descubierto leyendo el JS del propio SII): el campo
`metaData.conversationId` NO es el RUT — es el **token de sesión** (cookie
TOKEN). Enviar el RUT produce "El token no es valido: NO Existen Datos".
"""
from __future__ import annotations

import logging
import uuid

from . import rut as rututil
from .client import SiiClient

log = logging.getLogger("sii.rcv")

BASE = "https://www4.sii.cl/consdcvinternetui/services/data/facadeService"
NS = "cl.sii.sdi.lob.diii.consdcv.data.api.interfaces.FacadeService"

COMPRA = "COMPRA"
VENTA = "VENTA"


class RcvClient:
    def __init__(self, client: SiiClient, rut: str):
        self.client = client
        self.cuerpo, self.dv = rututil.split(rut)
        self._inicio_ok = False

    @property
    def _token(self) -> str:
        token = self.client.token
        if not token:
            raise RuntimeError("No hay cookie TOKEN — la sesión no está autenticada.")
        return token

    def _facade(self, operacion: str, data: dict) -> dict:
        url = f"{BASE}/{operacion}"
        payload = {
            "metaData": {
                "namespace": f"{NS}/{operacion}",
                "conversationId": self._token,   # ← el token, no el RUT
                "transactionId": str(uuid.uuid4()),
                "page": None,
            },
            "data": data,
        }
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json, text/plain, */*",
            "Referer": "https://www4.sii.cl/consdcvinternetui/",
            "Origin": "https://www4.sii.cl",
        }
        resp = self.client.post(url, json=payload, headers=headers)
        # Surface de errores: NO enmascarar fallos como "sin datos". Devolvemos un
        # marcador "_error" cuando la respuesta no es válida, para que el job lo muestre.
        if resp.status_code != 200:
            log.warning("%s → HTTP %s: %s", operacion, resp.status_code, resp.text[:200])
            return {"_error": f"HTTP {resp.status_code}", "_body": resp.text[:300]}
        try:
            j = resp.json()
        except ValueError:
            log.warning("%s devolvió respuesta no-JSON (status %s): %s", operacion, resp.status_code, resp.text[:200])
            return {"_error": "respuesta_no_JSON", "_body": resp.text[:300]}
        md = j.get("metaData") or {}
        errs = md.get("errors") or md.get("respEstado")
        if errs and not j.get("data"):
            log.warning("%s → el SII respondió con error: %s", operacion, str(errs)[:200])
            return {"_error": "sii_error", "_body": str(errs)[:300]}
        return j

    def inicio(self) -> dict:
        """Registra el contexto en el app RCV (GET al índice basta; getDatosInicio es opcional)."""
        self.client.get("https://www4.sii.cl/consdcvinternetui/")
        self._inicio_ok = True
        # getDatosInicio es informativo y NO bloqueante. El SII ya no acepta el campo
        # "rut" en su payload (responde 400 "Unrecognized field rut") → se manda vacío.
        return self._facade("getDatosInicio", {})

    def resumen(self, periodo: str, operacion: str = COMPRA, estado: str = "REGISTRO") -> dict:
        """Resumen del periodo (YYYYMM): totales por tipo de documento. VERIFICADO ✓."""
        if not self._inicio_ok:
            self.inicio()
        data = {
            "rutEmisor": self.cuerpo, "dvEmisor": self.dv,
            "ptributario": periodo, "operacion": operacion,
        }
        if operacion == COMPRA:
            data["estadoContab"] = estado
        log.info("RCV resumen %s %s", operacion, periodo)
        return self._facade("getResumen", data)

    # ─── Detalle por documento (POST que devuelve filas CSV) ─────────────
    def export_detalle(self, periodo: str, operacion: str, cod_tipo_doc: int,
                       estado: str = "REGISTRO") -> list[str]:
        """Detalle de un tipo de documento como filas CSV (la 1ª es el encabezado)."""
        ep = "getDetalleCompraExport" if operacion == COMPRA else "getDetalleVentaExport"
        data = {
            "rutEmisor": self.cuerpo, "dvEmisor": self.dv, "ptributario": periodo,
            "codTipoDoc": cod_tipo_doc, "operacion": operacion, "estadoContab": estado,
        }
        res = self._facade(ep, data)
        filas = res.get("data") if isinstance(res, dict) else None
        return filas if isinstance(filas, list) else []

    def detalle_periodo_csv(self, periodo: str, operacion: str,
                            tipos: list[int], estado: str = "REGISTRO") -> str:
        """Combina el detalle de todos los tipos de doc en un único CSV."""
        encabezado = None
        filas: list[str] = []
        for cod in tipos:
            data = self.export_detalle(periodo, operacion, cod, estado)
            if not data:
                continue
            if encabezado is None:
                encabezado = data[0]
            filas.extend(data[1:])  # saltar el encabezado repetido de cada tipo
        if encabezado is None:
            return ""
        return "\n".join([encabezado, *filas])
