"""Boletas de Honorarios electrónicas RECIBIDAS (las que terceros le emiten a la
empresa). El SII NO las expone en la carpeta tributaria —esa solo trae las BHE
*emitidas* por el propio contribuyente y las BTE—, por eso antes salían vacías.
Las RECIBIDAS viven en el portal dedicado:
    https://loa.sii.cl/cgi_IMT/TMBCOC_MenuConsultasContribRec.cgi  (informe anual)

Reusamos la sesión ya iniciada (inyectando sus cookies en un navegador real),
igual que la carpeta → sin login nuevo → sin riesgo de bloqueo.
"""
from __future__ import annotations

import datetime
import logging
import re

from . import rut as rututil

log = logging.getLogger("sii.boletas_recibidas")

URL = "https://loa.sii.cl/cgi_IMT/TMBCOC_MenuConsultasContribRec.cgi"

# Prefijo del mes en el objeto JS `xml_values` del informe → nombre legible.
_MESES = [("ene", "Enero"), ("feb", "Febrero"), ("mar", "Marzo"), ("abr", "Abril"),
          ("may", "Mayo"), ("jun", "Junio"), ("jul", "Julio"), ("ago", "Agosto"),
          ("sep", "Septiembre"), ("oct", "Octubre"), ("nov", "Noviembre"), ("dic", "Diciembre")]


def _n(s) -> int:
    s = str(s or "").replace(".", "").strip()
    return int(s) if s.lstrip("-").isdigit() else 0


def _parse(html: str, anio: int) -> dict:
    """Extrae el resumen mensual del informe (los datos vienen en xml_values[...])."""
    vals: dict[str, str] = {}
    for k, v in re.findall(r"xml_values\[\s*['\"]([\w]+)['\"]\s*\]\s*=\s*\"([^\"]*)\"", html):
        vals[k] = v  # si una clave se asigna dos veces, gana la última (la con dato)
    meses = []
    tot = {"emisiones": 0, "bruto": 0, "ret_terceros": 0, "ret_contrib": 0, "liquido": 0}
    for pre, nom in _MESES:
        em = _n(vals.get(pre + "6"))      # emisiones vigentes recibidas en el mes
        bruto = _n(vals.get(pre + "1"))   # honorario bruto
        rt = _n(vals.get(pre + "2"))      # retención de terceros
        rc = _n(vals.get(pre + "3"))      # retención contribuyente
        if not em and not bruto:
            continue
        liq = bruto - rt - rc             # total líquido = bruto − retenciones
        meses.append({"mes": nom, "emisiones": em, "bruto": bruto,
                      "ret_terceros": rt, "ret_contrib": rc, "liquido": liq})
        tot["emisiones"] += em
        tot["bruto"] += bruto
        tot["ret_terceros"] += rt
        tot["ret_contrib"] += rc
        tot["liquido"] += liq
    return {"anio": anio, "meses": meses, "total": tot}


def obtener(client, rut: str, anios=None) -> dict:
    """Devuelve las BHE recibidas (resumen mensual) por año.

    {"anios": [{"anio": 2026, "meses": [...], "total": {...}}, ...]}
    Por defecto consulta el año actual y el anterior (cubre "últimos 12 meses").
    """
    from playwright.sync_api import sync_playwright

    if anios is None:
        y = datetime.date.today().year
        anios = [y, y - 1]
    rut_full = rututil.clean(rut)
    cookies = [{"name": ck.name, "value": ck.value, "domain": ".sii.cl", "path": "/"}
               for ck in client.session.cookies]

    salida = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(locale="es-CL")
        ctx.add_cookies(cookies)
        page = ctx.new_page()
        for anio in anios:
            try:
                page.goto(URL, wait_until="domcontentloaded", timeout=60000)
                page.wait_for_timeout(1000)
                page.select_option("select[name=cbanoinformeanual]", str(anio))
                page.click("input[name=cmdconsultar12]")
                page.wait_for_timeout(2200)
                info = _parse(page.content(), anio)
                salida.append(info)
                log.info("  BHE recibidas %s -> %s boletas / bruto %s",
                         anio, info["total"]["emisiones"], info["total"]["bruto"])
            except Exception as e:  # noqa: BLE001
                log.warning("BHE recibidas %s falló: %s", anio, e)
                salida.append({"anio": anio, "meses": [], "total": {}, "error": str(e)})
        browser.close()
    return {"anios": salida, "rut": rut_full}
