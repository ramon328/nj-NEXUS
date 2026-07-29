"""Facturas de compra RECIBIDAS con DETALLE (líneas) — Sistema de Facturación
Gratuito del SII (portal MIPYME, www1.sii.cl/cgi-bin/Portal001).

A diferencia del RCV (que sólo entrega la cabecera: folio, montos, IVA), aquí se
obtiene el **PDF timbrado de cada documento recibido, con sus líneas de productos**
("Ver documentos recibidos"). Es el único lugar del SII donde sale el detalle.

⚠️ IMPORTANTE: este portal NO se entra con la clave de la EMPRESA. Hay que iniciar
sesión con el RUT+clave de la PERSONA autorizada por la empresa (el "facturador").
Reusa la sesión: un solo login, y se navega con las cookies.

Flujo:
  1. seleccionar_empresa(client, rut_empresa)  → POST mipeSelEmpresa (OPCION=1)
  2. listar(client, desde, hasta)              → filas por documento (con CODIGO)
  3. descargar_pdf(client, codigo, ruta)       → mipeShowPdf.cgi?CODIGO=<id>
"""
from __future__ import annotations

import logging
import re
from pathlib import Path

log = logging.getLogger("sii.facturas_recibidas")

BASE = "https://www1.sii.cl/cgi-bin/Portal001"

# Guardarraíl: nunca más de N PDFs por corrida (evita bloqueo del SII).
LIMITE_PDFS_DEFAULT = 120

_ROW = re.compile(r"<tr[^>]*>(.*?)</tr>", re.S | re.I)
_COD = re.compile(r"mipeGesDocRcp\.cgi\?CODIGO=(\d+)")
_TD = re.compile(r"<td[^>]*>(.*?)</td>", re.S | re.I)
_TAG = re.compile(r"<[^>]+>")


def _limpiar(x: str) -> str:
    return re.sub(r"\s+", " ", _TAG.sub(" ", x)).strip()


def seleccionar_empresa(client, rut_empresa: str, opcion: int = 1) -> None:
    """Fija la empresa activa en el portal MIPYME (OPCION=1 = ver recibidos)."""
    client.post(
        f"{BASE}/mipeSelEmpresa.cgi",
        data={"RUT_EMP": rut_empresa, "DESDE_DONDE_URL": f"OPCION={opcion}&TIPO=4"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )


def listar(client, desde: str, hasta: str, max_pag: int = 60) -> list[dict]:
    """Documentos recibidos entre `desde` y `hasta` (formato YYYY-MM-DD).

    Devuelve una lista de dicts con: codigo, rut_emisor, razon_social, tipo,
    folio, fecha, monto, estado. Pagina hasta agotar (NUM_PAG).
    """
    docs: list[dict] = []
    vistos: set[str] = set()
    pag = 1
    while pag <= max_pag:
        url = (
            f"{BASE}/mipeAdminDocsRcp.cgi?RUT_EMI=&FOLIO=&RZN_SOC=&"
            f"FEC_DESDE={desde}&FEC_HASTA={hasta}&TPO_DOC=&ESTADO=&ORDEN=&NUM_PAG={pag}"
        )
        h = client.get(url).text
        nuevos = 0
        for tr in _ROW.findall(h):
            m = _COD.search(tr)
            if not m:
                continue
            cod = m.group(1)
            if cod in vistos:
                continue
            vistos.add(cod)
            nuevos += 1
            cells = [c for c in (_limpiar(td) for td in _TD.findall(tr)) if c]
            docs.append({
                "codigo": cod,
                "rut_emisor": cells[0] if len(cells) > 0 else "",
                "razon_social": cells[1] if len(cells) > 1 else "",
                "tipo": cells[2] if len(cells) > 2 else "",
                "folio": cells[3] if len(cells) > 3 else "",
                "fecha": cells[4] if len(cells) > 4 else "",
                "monto": cells[5] if len(cells) > 5 else "",
                "estado": cells[6] if len(cells) > 6 else "",
            })
        if nuevos == 0:
            break
        pag += 1
    return docs


def descargar_pdf(client, codigo: str, ruta: Path) -> int:
    """Baja el PDF timbrado de un documento recibido. Devuelve bytes (0 si falla)."""
    r = client.get(f"{BASE}/mipeShowPdf.cgi?CODIGO={codigo}")
    ctype = (r.headers.get("content-type") or "").lower()
    if "pdf" in ctype and r.content[:4] == b"%PDF":
        Path(ruta).write_bytes(r.content)
        return len(r.content)
    return 0


def _nombre_pdf(doc: dict) -> str:
    rut = re.sub(r"[^0-9kK-]", "", doc.get("rut_emisor", "")) or "sinrut"
    folio = re.sub(r"[^0-9]", "", doc.get("folio", "")) or doc["codigo"]
    return f"factura_{rut}_folio{folio}.pdf"


def descargar_facturas(client, rut_empresa: str, desde: str, hasta: str,
                       dest_dir: Path, limite: int = LIMITE_PDFS_DEFAULT,
                       on_progress=None) -> dict:
    """Orquesta todo: selecciona empresa, lista el período y baja el PDF de cada
    factura recibida. Reusa la sesión (throttle 2-5s por request lo pone el client).

    Devuelve {'documentos': [...], 'descargados': n, 'truncado': bool, 'dir': str}.
    """
    dest = Path(dest_dir)
    dest.mkdir(parents=True, exist_ok=True)
    seleccionar_empresa(client, rut_empresa)
    docs = listar(client, desde, hasta)
    descargados = 0
    truncado = False
    for i, doc in enumerate(docs):
        if descargados >= limite:
            truncado = True
            break
        ruta = dest / _nombre_pdf(doc)
        try:
            n = descargar_pdf(client, doc["codigo"], ruta)
            if n:
                doc["archivo"] = ruta.name
                doc["bytes"] = n
                descargados += 1
        except Exception as exc:  # noqa: BLE001
            log.warning("PDF %s (folio %s) falló: %s", doc["codigo"], doc.get("folio"), exc)
            doc["archivo"] = None
        if on_progress:
            on_progress(descargados, len(docs))
    return {
        "documentos": docs,
        "descargados": descargados,
        "total": len(docs),
        "truncado": truncado,
        "dir": str(dest),
    }
