"""Carpeta Tributaria del SII vía navegador real (Playwright).

El portal de la carpeta usa OAuth2 de varias capas + cola virtual, imposible de
replicar con requests puro. Solución: un navegador headless al que le inyectamos
las cookies de la sesión ya iniciada (sin login nuevo → sin riesgo de bloqueo).
El navegador completa el OAuth solo; luego consultamos su API autenticada y
armamos el PDF de la carpeta con todo su contenido.

Nota: el SII NO permite "descargar la carpeta para uno mismo" — la carpeta
oficial obliga a enviarla a una institución (banco). Por eso reconstruimos el
PDF con los mismos datos, para uso/consulta del propio contribuyente.
"""
from __future__ import annotations

import logging

from . import auth, rut as rututil
from .client import SiiClient

log = logging.getLogger("sii.carpeta")

PORTAL = "https://www2.sii.cl/carpetatributaria/generarcteregular"

# Endpoints de datos de la carpeta (userId = RUT completo).
ENDPOINTS = {
    "infoCT": "obtenerInfoCT",
    "representantes": "representantesLegales",
    "conformacionSociedad": "conformacionSociedad",
    "participacionSociedad": "participacionSociedad",
    "bienesRaices": "propiedadesBienesRaices",
    "declaracionesRenta": "declaracionesRenta?periodoRenta=6",
    "formulariosIva": "formulariosIva?periodoIva=36",
    "boletasHonorarios": "boletasHonorarios?periodos=12",
    "boletasTerceros": "boletasTerceros?periodos=12",
    "anotaciones": "anotacionesVigentes",
}


def generar_oficial(client: SiiClient, rut: str, dest_rut: str, dest_nombre: str,
                    email: str, salida, institucion: str = "USO INTERNO") -> bool:
    """Genera y descarga el PDF OFICIAL del SII (44 págs, con folios y timbre).

    El SII obliga a indicar un destinatario con RUT distinto al de la empresa y
    una institución; por eso `dest_rut`/`dest_nombre`/`email`/`institucion` son
    obligatorios y los decide quien opera (no se infieren). El aviso del SII se
    envía a `email`. Devuelve True si descargó el PDF.
    """
    from pathlib import Path
    from playwright.sync_api import sync_playwright

    salida = Path(salida)
    rut_dest = rututil.clean(dest_rut)
    # formato con puntos que exige el validador del SII (12.345.678-9)
    cuerpo, dv = rut_dest.split("-")
    rut_dest_pts = f"{int(cuerpo):,}".replace(",", ".") + "-" + dv
    cookies = [{"name": ck.name, "value": ck.value, "domain": ".sii.cl", "path": "/"}
               for ck in client.session.cookies]
    guardado = {"ok": False}

    def save_pdf(data: bytes):
        if data and data[:4] == b"%PDF" and not guardado["ok"]:
            salida.write_bytes(data)
            guardado["ok"] = True

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(locale="es-CL", accept_downloads=True)
        ctx.add_cookies(cookies)
        page = ctx.new_page()
        page.on("response", lambda r: save_pdf(r.body())
                if (r.ok and "carpeta-tributaria/pdf" in r.url) else None)
        page.on("download", lambda d: save_pdf(Path(d.path()).read_bytes()) if d.path() else None)

        page.goto(PORTAL, wait_until="networkidle", timeout=60000)
        page.wait_for_timeout(3500)
        page.get_by_role("button", name="Continuar").first.click()
        page.wait_for_timeout(4000)

        # Otra Institución -> aparece campo "Nombre de la institución"
        cb = page.query_selector("#flexRadioDefault1")
        if cb and not cb.is_checked():
            cb.check(force=True)
        page.wait_for_timeout(1500)
        # RUT destinatario (tipeo) -> autocompleta el nombre
        page.click("#rutEmisor"); page.type("#rutEmisor", rut_dest_pts, delay=60)
        page.press("#rutEmisor", "Tab"); page.wait_for_timeout(4000)
        nr = page.query_selector("#nombreReceptor")
        if nr.is_enabled() and not nr.input_value().strip():
            page.fill("#nombreReceptor", dest_nombre)
        # institución (campo nuevo)
        known = {"rutEmisor", "nombreReceptor", "emailDestinatario", "verificaEmail"}
        for i in page.query_selector_all("input[type=text]:visible"):
            if (i.get_attribute("id") or "") not in known and i.is_enabled():
                i.click(); i.type(institucion, delay=30); break
        for sel in ("#emailDestinatario", "#verificaEmail"):
            page.click(sel); page.type(sel, email, delay=30)
        page.press("#verificaEmail", "Tab")
        page.check("#flexCheckDefault", force=True)
        page.wait_for_timeout(1500)

        cont = page.get_by_role("button", name="Continuar").first
        if not cont.is_enabled():
            browser.close()
            raise RuntimeError("Formulario incompleto (revisa RUT/email/institución).")
        cont.click()
        page.wait_for_timeout(2500)
        acep = page.get_by_role("button", name="Aceptar")
        if acep.count() and acep.first.is_visible():
            acep.first.click()
        page.wait_for_timeout(9000)
        for nom in ("Ver PDF", "Descargar", "Ver Pdf"):
            b = page.get_by_role("button", name=nom)
            if b.count() and b.first.is_visible():
                try:
                    with page.expect_download(timeout=20000) as di:
                        b.first.click()
                    save_pdf(Path(di.value.path()).read_bytes())
                except Exception:  # noqa: BLE001
                    page.wait_for_timeout(5000)
                break
        page.wait_for_timeout(3000)
        browser.close()
    return guardado["ok"]


def obtener_datos(client: SiiClient, rut: str) -> dict:
    """Abre la carpeta en un navegador (reusando la sesión) y baja toda su data."""
    try:
        from playwright.sync_api import sync_playwright
    except ImportError as e:  # noqa: F841
        raise RuntimeError(
            "Falta Playwright. Instala con: pip install playwright && playwright install chromium"
        )

    rut_full = rututil.clean(rut)
    api = f"https://www2.sii.cl/app/cte-api-carpetatributaria/{rut_full}/recurso/v2/carpeta-tributaria"
    cookies = [{"name": ck.name, "value": ck.value, "domain": ".sii.cl", "path": "/"}
               for ck in client.session.cookies]

    datos = {}
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(locale="es-CL")
        ctx.add_cookies(cookies)
        page = ctx.new_page()
        log.info("Abriendo carpeta en navegador (OAuth automático)…")
        page.goto(PORTAL, wait_until="networkidle", timeout=60000)
        page.wait_for_timeout(3500)
        if "ANA CLARA" not in page.inner_text("body") and "BIENVENIDO" not in page.inner_text("body").upper():
            log.warning("No se confirmó autenticación en la carpeta.")
        for nombre, ep in ENDPOINTS.items():
            r = page.request.get(f"{api}/{ep}")
            try:
                datos[nombre] = r.json() if r.ok else None
            except Exception:  # noqa: BLE001
                datos[nombre] = None
            log.info("  carpeta/%s -> %s", nombre, r.status)
        browser.close()
    return datos
