"""Registro de Compras y Ventas (RCV) — facturas electrónicas (DTE).

Usa la API JSON del portal consdcvinternetui.

CLAVE (descubierto leyendo el JS del propio SII): el campo
`metaData.conversationId` NO es el RUT — es el **token de sesión** (cookie
TOKEN). Enviar el RUT produce "El token no es valido: NO Existen Datos".
"""
from __future__ import annotations

import logging
import os
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

    def _facade(self, operacion: str, data: dict, _reintento: bool = False) -> dict:
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
        # Si el SII rechazó la sesión (401 de contenedor o token inválido) a mitad
        # de un job, re-bootstrapeamos la sesión RCV y reintentamos UNA vez. No se
        # aplica a getDatosInicio para no entrar en recursión con inicio().
        if (not _reintento and operacion != "getDatosInicio"
                and self._sesion_rechazada(resp)):
            log.warning("RCV %s rechazado (posible sesión caída); re-conectando…", operacion)
            self._inicio_ok = False
            self.inicio()
            return self._facade(operacion, data, _reintento=True)
        try:
            return resp.json()
        except ValueError:
            log.warning("%s devolvió respuesta no-JSON (status %s).", operacion, resp.status_code)
            return {}

    @staticmethod
    def _sesion_rechazada(resp) -> bool:
        """Heurística: el SII rechazó la sesión y conviene re-bootstrapear."""
        if resp.status_code in (401, 403):
            return True
        txt = (resp.text or "")[:600].lower()
        return (
            "jbweb" in txt
            or "token no es valido" in txt
            or "token no es válido" in txt
            or "<html" in txt
        )

    def inicio(self) -> dict:
        """Bootstrap real del RCV: replica lo que hace el navegador antes de
        cualquier facade. CLAVE: `AutTknData.cgi` valida el TOKEN y crea la
        sesión JBoss del lado servidor; sin ese paso el SII responde 401
        (JBWEB000065) aunque el TOKEN sea válido.
        """
        import random
        import time

        idx = "https://www4.sii.cl/consdcvinternetui/"
        common = "https://www4.sii.cl/consdcvinternetui/common-1.0/services"
        H = {
            "Content-Type": "application/json;charset=UTF-8",
            "Accept": "application/json, text/plain, */*",
            "Referer": idx,
            "Origin": "https://www4.sii.cl",
        }
        # 1) índice del SPA
        self.client.get(idx)
        # 2) config + 3) sesión de la app (best-effort, no son bloqueantes)
        for paso in (
            lambda: self.client.post(f"{common}/autConfDataService/obtieneConf", json={}, headers=H),
            lambda: self.client.get(f"{common}/aaSessionService/load", headers=H),
        ):
            try:
                paso()
            except Exception:  # noqa: BLE001
                pass
        # 4) AutTknData.cgi → valida el TOKEN y liga la sesión JBoss (CLAVE)
        ts = int(time.time() * 1000)
        try:
            self.client.get(
                f"https://zeusr.sii.cl/cgi_AUT2000/AutTknData.cgi"
                f"?rnd={random.random()}&callback=jQuery_{ts}&_={ts + 1}",
                headers={"Accept": "*/*", "Referer": idx},
            )
        except Exception:  # noqa: BLE001
            pass
        self._inicio_ok = True
        # 5) getDatosInicio prepara el estado del RCV (data vacía, como el navegador)
        return self._facade("getDatosInicio", {})

    def resumen(self, periodo: str, operacion: str = COMPRA, estado: str = "REGISTRO") -> dict:
        """Resumen del periodo (YYYYMM): totales por tipo de documento. VERIFICADO ✓."""
        if not self._inicio_ok:
            self.inicio()
        data = {
            "rutEmisor": self.cuerpo, "dvEmisor": self.dv,
            "ptributario": periodo, "operacion": operacion,
            "busquedaInicial": True,
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
            # El detalle exige reCAPTCHA; el SII acepta un placeholder. Es el punto
            # MÁS FRÁGIL del RCV, por eso es configurable por entorno
            # (SII_RECAPTCHA_TOKEN) para cambiarlo sin redeploy si el SII lo endurece.
            "accionRecaptcha": "RCV_DETC" if operacion == COMPRA else "RCV_DETV",
            "tokenRecaptcha": os.getenv("SII_RECAPTCHA_TOKEN", "t-o-k-e-n-web"),
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
