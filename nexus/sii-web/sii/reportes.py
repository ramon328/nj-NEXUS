"""Genera PDF legibles a partir de los datos descargados del RCV.

Produce, por mes:
  - planilla.pdf : tabla con todas las facturas (legible, formato chileno)
  - resumen.pdf  : totales por tipo de documento
Y un RESUMEN_GENERAL.pdf consolidado de todos los meses.
"""
from __future__ import annotations

import csv as csvmod
import json
import logging
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle)

log = logging.getLogger("sii.reportes")
ESTILOS = getSampleStyleSheet()

MESES = {"01": "Enero", "02": "Febrero", "03": "Marzo", "04": "Abril",
         "05": "Mayo", "06": "Junio", "07": "Julio", "08": "Agosto",
         "09": "Septiembre", "10": "Octubre", "11": "Noviembre", "12": "Diciembre"}


def periodo_legible(periodo: str) -> str:
    return f"{MESES.get(periodo[4:6], periodo[4:6])} {periodo[:4]}"


def clp(valor) -> str:
    """Formatea un entero como peso chileno: 1234567 -> $1.234.567."""
    try:
        n = int(float(str(valor).replace(",", ".")))
    except (ValueError, TypeError):
        return str(valor or "")
    return "$" + f"{n:,}".replace(",", ".")


def _col(headers: list[str], *claves: str) -> int | None:
    """Encuentra el índice de la primera columna cuyo nombre contiene alguna clave."""
    low = [h.lower() for h in headers]
    for clave in claves:
        for i, h in enumerate(low):
            if clave in h:
                return i
    return None


def _estilo_tabla(con_total: bool) -> TableStyle:
    cmds = [
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1f3a5f")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 7),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cccccc")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#eef3f8")]),
        ("ALIGN", (-3, 0), (-1, -1), "RIGHT"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]
    if con_total:
        cmds += [("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#d6e4f0")),
                 ("FONTNAME", (0, -1), (-1, -1), "Helvetica-Bold")]
    return TableStyle(cmds)


def genera_planilla_pdf(csv_path: Path, empresa: str, rut: str,
                        periodo: str, operacion: str, out_path: Path) -> bool:
    filas = list(csvmod.reader(open(csv_path, encoding="utf-8-sig"), delimiter=";"))
    if len(filas) < 2:
        return False
    headers = filas[0]
    i_rut = _col(headers, "rut prov", "rut cliente", "rut")
    i_nom = _col(headers, "razon social")
    i_fol = _col(headers, "folio")
    i_fec = _col(headers, "fecha docto", "fecha")
    i_exe = _col(headers, "exento")
    i_net = _col(headers, "neto")
    i_iva = _col(headers, "iva recuperable", "monto iva")
    i_tot = _col(headers, "monto total")

    data = [["N°", "RUT", "Proveedor / Cliente", "Folio", "Fecha", "Exento", "Neto", "IVA", "Total"]]
    t_exe = t_net = t_iva = t_tot = 0
    for n, fila in enumerate(filas[1:], 1):
        def g(i):
            return fila[i] if i is not None and i < len(fila) else ""
        t_exe += int(float(g(i_exe) or 0)); t_net += int(float(g(i_net) or 0))
        t_iva += int(float(g(i_iva) or 0)); t_tot += int(float(g(i_tot) or 0))
        nombre = g(i_nom)[:38]
        data.append([str(n), g(i_rut), nombre, g(i_fol), g(i_fec),
                     clp(g(i_exe)), clp(g(i_net)), clp(g(i_iva)), clp(g(i_tot))])
    data.append(["", "", f"TOTAL ({len(filas)-1} documentos)", "", "",
                 clp(t_exe), clp(t_net), clp(t_iva), clp(t_tot)])

    doc = SimpleDocTemplate(str(out_path), pagesize=landscape(A4),
                            topMargin=15 * mm, bottomMargin=12 * mm,
                            leftMargin=10 * mm, rightMargin=10 * mm)
    titulo = ESTILOS["Title"]; titulo.fontSize = 14
    elems = [
        Paragraph(f"{empresa} — RUT {rut}", titulo),
        Paragraph(f"Planilla de {'Compras' if operacion=='COMPRA' else 'Ventas'} · "
                  f"{periodo_legible(periodo)}", ESTILOS["Heading2"]),
        Spacer(1, 6),
    ]
    anchos = [10 * mm, 24 * mm, 62 * mm, 20 * mm, 26 * mm, 24 * mm, 28 * mm, 26 * mm, 30 * mm]
    tabla = Table(data, colWidths=anchos, repeatRows=1)
    tabla.setStyle(_estilo_tabla(con_total=True))
    elems.append(tabla)
    doc.build(elems)
    return True


def _tabla(data, anchos, con_total=False):
    t = Table(data, colWidths=anchos, repeatRows=1)
    t.setStyle(_estilo_tabla(con_total))
    return t


def genera_carpeta_pdf(data: dict, empresa: str, rut: str, out_path: Path) -> bool:
    """Arma el PDF de la Carpeta Tributaria desde la data de la API del SII."""
    info = (data.get("infoCT") or {}).get("contribuyente") or {}
    if not info:
        return False

    doc = SimpleDocTemplate(str(out_path), pagesize=A4, topMargin=18 * mm,
                            bottomMargin=15 * mm, leftMargin=15 * mm, rightMargin=15 * mm)
    H1, H2, P = ESTILOS["Title"], ESTILOS["Heading2"], ESTILOS["BodyText"]
    el = [Paragraph("CARPETA TRIBUTARIA", H1),
          Paragraph(f"{empresa} — RUT {rut}", H2),
          Paragraph(f"Generada: {info.get('fechaGeneracion','')}", P), Spacer(1, 8)]

    # 1) Datos del contribuyente
    el.append(Paragraph("Datos del Contribuyente", H2))
    datos = [
        ["Inicio de actividades", info.get("fechaInicioActividades", "")],
        ["Fecha de constitución", info.get("fechaConstitucion", "")],
        ["Tipo de entidad", info.get("clasificacionEntidad", "")],
        ["Actividad", info.get("glosaActividad", "")],
        ["Categoría tributaria", info.get("categoriaTributaria", "")],
        ["Régimen", ", ".join(info.get("regimenTributario", []) or [])],
    ]
    el.append(_tabla([["Campo", "Valor"]] + datos, [55 * mm, 115 * mm]))
    el.append(Spacer(1, 8))

    # 2) Actividades económicas
    acts = info.get("actividadesEconomicas") or []
    if acts:
        el.append(Paragraph("Actividades Económicas", H2))
        filas = [["Código", "Descripción", "Categoría", "Desde"]]
        for a in acts:
            filas.append([a.get("tacnCodigoNuevo", ""), a.get("descripcion", "")[:60],
                          a.get("categoriaTributaria", ""), a.get("fechaInicio", "")])
        el.append(_tabla(filas, [22 * mm, 90 * mm, 35 * mm, 23 * mm]))
        el.append(Spacer(1, 8))

    # 3) Representantes legales
    reps = data.get("representantes") or []
    if reps:
        el.append(Paragraph("Representantes Legales", H2))
        filas = [["RUT", "Nombre", "Incorporación", "Forma de actuación"]]
        for r in reps:
            filas.append([f"{r.get('rut','')}-{r.get('dv','')}", r.get("nombre", "")[:40],
                          r.get("fechaIncorporacion", ""), r.get("formaActuacion", "")])
        el.append(_tabla(filas, [28 * mm, 70 * mm, 30 * mm, 42 * mm]))
        el.append(Spacer(1, 8))

    # 4) Socios / conformación
    socios = data.get("conformacionSociedad") or []
    if socios:
        el.append(Paragraph("Conformación de la Sociedad", H2))
        filas = [["RUT", "Socio", "% Capital", "% Utilidades", "Desde"]]
        for s in socios:
            filas.append([s.get("rut", ""), s.get("nombre", "")[:34],
                          f"{s.get('participacionCapital','')}%", f"{s.get('participacionUtilidades','')}%",
                          s.get("fechaIncorporacion", "")])
        el.append(_tabla(filas, [28 * mm, 62 * mm, 24 * mm, 26 * mm, 30 * mm]))
        el.append(Spacer(1, 8))

    # 5) Participación en otras sociedades
    part = data.get("participacionSociedad") or []
    if part:
        el.append(Paragraph("Participación en otras Sociedades", H2))
        filas = [["RUT", "Sociedad", "% Capital", "% Utilidades", "Desde"]]
        for s in part:
            filas.append([s.get("rut", ""), s.get("razonSocial", "")[:34],
                          f"{s.get('participacionCapital','')}%", f"{s.get('participacionUtilidades','')}%",
                          s.get("fechaIncorporacion", "")])
        el.append(_tabla(filas, [28 * mm, 62 * mm, 24 * mm, 26 * mm, 30 * mm]))
        el.append(Spacer(1, 8))

    # 6) Declaraciones de Renta (F22)
    renta = data.get("declaracionesRenta") or []
    if renta:
        el.append(Paragraph("Declaraciones de Renta (F22) presentadas", H2))
        filas = [["Año tributario", "Código / Folio"]]
        for d in renta:
            filas.append([str(d.get("periodo", "")), str(d.get("codigo", ""))])
        el.append(_tabla(filas, [40 * mm, 60 * mm]))
        el.append(Spacer(1, 8))

    # 7) Formularios IVA (F29)
    iva = data.get("formulariosIva") or []
    if iva:
        periodos = sorted({f.get("periodo", "") for f in iva}, reverse=True)
        el.append(Paragraph(f"Formularios IVA (F29) presentados: {len(periodos)} periodos", H2))
        el.append(Paragraph(", ".join(periodos), P))
        el.append(Spacer(1, 8))

    # 8) Bienes raíces
    br = data.get("bienesRaices") or []
    el.append(Paragraph("Bienes Raíces", H2))
    el.append(Paragraph("Sin propiedades registradas." if not br else f"{len(br)} propiedades.", P))

    doc.build(el)
    return True


def genera_f29_pdf(formularios: list, empresa: str, rut: str, out_path: Path) -> bool:
    """PDF de los F29 (IVA mensual) presentados, desde la data de la carpeta."""
    if not formularios:
        return False
    forms = sorted(formularios, key=lambda f: str(f.get("periodo", "")), reverse=True)
    data = [["N°", "Periodo", "Año tributario", "Grupo"]]
    for n, f in enumerate(forms, 1):
        per = str(f.get("periodo", ""))
        legible = periodo_legible(per) if len(per) >= 6 else per
        data.append([str(n), legible, str(f.get("agnoTributario", "")),
                     str(f.get("grupo", ""))])

    doc = SimpleDocTemplate(str(out_path), pagesize=A4, topMargin=20 * mm)
    elems = [
        Paragraph(f"{empresa} — RUT {rut}", ESTILOS["Title"]),
        Paragraph(f"Formularios 29 (IVA) presentados · {len(forms)} periodos",
                  ESTILOS["Heading2"]),
        Spacer(1, 8),
        _tabla(data, [16 * mm, 55 * mm, 40 * mm, 30 * mm]),
    ]
    doc.build(elems)
    return True


def genera_f22_pdf(declaraciones: list, empresa: str, rut: str, out_path: Path) -> bool:
    """PDF de los F22 (renta anual) presentados, desde la data de la carpeta."""
    if not declaraciones:
        return False
    decl = sorted(declaraciones, key=lambda d: str(d.get("periodo", "")), reverse=True)
    data = [["N°", "Año tributario", "Folio / Código"]]
    for n, d in enumerate(decl, 1):
        data.append([str(n), str(d.get("periodo", "")), str(d.get("codigo", ""))])

    doc = SimpleDocTemplate(str(out_path), pagesize=A4, topMargin=20 * mm)
    elems = [
        Paragraph(f"{empresa} — RUT {rut}", ESTILOS["Title"]),
        Paragraph(f"Formularios 22 (Renta) presentados · {len(decl)} años",
                  ESTILOS["Heading2"]),
        Spacer(1, 8),
        _tabla(data, [16 * mm, 50 * mm, 60 * mm]),
    ]
    doc.build(elems)
    return True


def genera_ficha_pdf(data: dict, empresa: str, rut: str, out_path: Path) -> bool:
    """Ficha del contribuyente: datos básicos, representantes, socios,
    participaciones, bienes raíces y anotaciones. Datos de la carpeta."""
    info = (data.get("infoCT") or {}).get("contribuyente") or {}
    if not info:
        return False

    doc = SimpleDocTemplate(str(out_path), pagesize=A4, topMargin=18 * mm,
                            bottomMargin=15 * mm, leftMargin=15 * mm, rightMargin=15 * mm)
    H1, H2, P = ESTILOS["Title"], ESTILOS["Heading2"], ESTILOS["BodyText"]
    el = [Paragraph("FICHA DEL CONTRIBUYENTE", H1),
          Paragraph(f"{info.get('nombre', empresa)} — RUT {rut}", H2),
          Spacer(1, 8)]

    # 1) Datos básicos
    el.append(Paragraph("Datos Básicos", H2))
    datos = [
        ["Nombre / Razón social", info.get("nombre", "")],
        ["RUT", rut],
        ["Inicio de actividades", info.get("fechaInicioActividades", "")],
        ["Fecha de constitución", info.get("fechaConstitucion", "")],
        ["Clasificación de entidad", info.get("clasificacionEntidad", "")],
        ["Actividad", info.get("glosaActividad", "")],
        ["Categoría tributaria", info.get("categoriaTributaria", "")],
        ["Régimen tributario", ", ".join(info.get("regimenTributario", []) or [])],
    ]
    el.append(_tabla([["Campo", "Valor"]] + datos, [55 * mm, 115 * mm]))
    el.append(Spacer(1, 8))

    # 2) Actividades económicas
    acts = info.get("actividadesEconomicas") or []
    if acts:
        el.append(Paragraph("Actividades Económicas", H2))
        filas = [["Código", "Descripción", "Categoría", "Desde"]]
        for a in acts:
            filas.append([str(a.get("tacnCodigoNuevo", "") or ""),
                          str(a.get("descripcion", "") or "")[:60],
                          str(a.get("categoriaTributaria", "") or ""),
                          str(a.get("fechaInicio", "") or "")])
        el.append(_tabla(filas, [22 * mm, 90 * mm, 35 * mm, 23 * mm]))
        el.append(Spacer(1, 8))

    # 3) Representantes legales
    reps = data.get("representantes") or []
    el.append(Paragraph("Representantes Legales", H2))
    if reps:
        filas = [["RUT", "Nombre", "Incorporación", "Forma de actuación"]]
        for r in reps:
            filas.append([f"{r.get('rut','')}-{r.get('dv','')}",
                          str(r.get("nombre", "") or "")[:40],
                          str(r.get("fechaIncorporacion", "") or ""),
                          str(r.get("formaActuacion", "") or "")])
        el.append(_tabla(filas, [28 * mm, 70 * mm, 30 * mm, 42 * mm]))
    else:
        el.append(Paragraph("Sin representantes registrados.", P))
    el.append(Spacer(1, 8))

    # 4) Socios / conformación
    socios = data.get("conformacionSociedad") or []
    el.append(Paragraph("Conformación de la Sociedad (socios)", H2))
    if socios:
        filas = [["RUT", "Socio", "% Capital", "% Utilidades", "Desde"]]
        for s in socios:
            filas.append([str(s.get("rut", "") or ""), str(s.get("nombre", "") or "")[:34],
                          f"{s.get('participacionCapital','')}%", f"{s.get('participacionUtilidades','')}%",
                          str(s.get("fechaIncorporacion", "") or "")])
        el.append(_tabla(filas, [28 * mm, 62 * mm, 24 * mm, 26 * mm, 30 * mm]))
    else:
        el.append(Paragraph("Sin socios registrados.", P))
    el.append(Spacer(1, 8))

    # 5) Participación en otras sociedades
    part = data.get("participacionSociedad") or []
    el.append(Paragraph("Participación en otras Sociedades", H2))
    if part:
        filas = [["RUT", "Sociedad", "% Capital", "% Utilidades", "Desde"]]
        for s in part:
            filas.append([str(s.get("rut", "") or ""), str(s.get("razonSocial", "") or "")[:34],
                          f"{s.get('participacionCapital','')}%", f"{s.get('participacionUtilidades','')}%",
                          str(s.get("fechaIncorporacion", "") or "")])
        el.append(_tabla(filas, [28 * mm, 62 * mm, 24 * mm, 26 * mm, 30 * mm]))
    else:
        el.append(Paragraph("No participa en otras sociedades.", P))
    el.append(Spacer(1, 8))

    # 6) Bienes raíces
    br = data.get("bienesRaices") or []
    el.append(Paragraph("Bienes Raíces", H2))
    if br:
        filas = [["Rol", "Comuna", "Destino", "Avalúo"]]
        for b in br:
            filas.append([str(b.get("rol", "") or b.get("rolAvaluo", "") or ""),
                          str(b.get("comuna", "") or "")[:30],
                          str(b.get("destino", "") or b.get("glosaDestino", "") or "")[:30],
                          clp(b.get("avaluo") or b.get("avaluoTotal") or "")])
        el.append(_tabla(filas, [38 * mm, 44 * mm, 50 * mm, 38 * mm]))
    else:
        el.append(Paragraph("Sin propiedades registradas.", P))
    el.append(Spacer(1, 8))

    # 7) Anotaciones
    anot = data.get("anotaciones") or []
    if isinstance(anot, dict):
        anot = anot.get("anotaciones") or anot.get("data") or []
    el.append(Paragraph("Anotaciones Vigentes", H2))
    if anot:
        filas = [["Código", "Descripción", "Fecha"]]
        for a in anot:
            filas.append([str(a.get("codigo", "") or ""),
                          str(a.get("descripcion", "") or a.get("glosa", "") or "")[:70],
                          str(a.get("fecha", "") or "")])
        el.append(_tabla(filas, [25 * mm, 110 * mm, 35 * mm]))
    else:
        el.append(Paragraph("Sin anotaciones vigentes.", P))

    doc.build(el)
    return True


def _boletas_lista(valor) -> list:
    """Normaliza la respuesta de boletas (puede ser None, list o dict envolvente)."""
    if not valor:
        return []
    if isinstance(valor, list):
        return valor
    if isinstance(valor, dict):
        for k in ("data", "boletas", "detalle", "lista"):
            v = valor.get(k)
            if isinstance(v, list):
                return v
    return []


def genera_boletas_recibidas_pdf(data: dict, empresa: str, rut: str, out_path: Path) -> bool:
    """Boletas de Honorarios electrónicas RECIBIDAS (las que terceros le emiten a
    la empresa), resumen MENSUAL por año, desde el portal del SII (no la carpeta).
    `data` = salida de sii.boletas_recibidas.obtener()."""
    anios = data.get("anios", []) if isinstance(data, dict) else []
    doc = SimpleDocTemplate(str(out_path), pagesize=A4, topMargin=18 * mm,
                            bottomMargin=15 * mm, leftMargin=15 * mm, rightMargin=15 * mm)
    H1, H2, P = ESTILOS["Title"], ESTILOS["Heading2"], ESTILOS["BodyText"]
    el = [Paragraph("BOLETAS DE HONORARIOS RECIBIDAS", H1),
          Paragraph(f"{empresa} — RUT {rut}", H2),
          Paragraph("Boletas de Honorarios electrónicas que terceros le emitieron a la "
                    "empresa (BHE recibidas), resumen mensual por año, según el SII.", P),
          Spacer(1, 8)]
    hubo = False
    for a in anios:
        el.append(Paragraph(f"Año {a.get('anio')}", H2))
        meses = a.get("meses") or []
        if not meses:
            el.append(Paragraph("No registra boletas recibidas.", P))
            el.append(Spacer(1, 6))
            continue
        hubo = True
        filas = [["Mes", "N°", "Honorario bruto", "Retención", "Líquido"]]
        for m in meses:
            filas.append([m["mes"], str(m["emisiones"]), clp(m["bruto"]),
                          clp(m["ret_terceros"] + m["ret_contrib"]), clp(m["liquido"])])
        t = a.get("total") or {}
        filas.append(["TOTAL", str(t.get("emisiones", 0)), clp(t.get("bruto", 0)),
                      clp(t.get("ret_terceros", 0) + t.get("ret_contrib", 0)), clp(t.get("liquido", 0))])
        el.append(_tabla(filas, [30 * mm, 16 * mm, 42 * mm, 38 * mm, 42 * mm], con_total=True))
        el.append(Spacer(1, 8))
    if not hubo:
        el.append(Paragraph("La empresa no registra boletas de honorarios recibidas en el "
                            "período consultado (según el SII).", P))
    doc.build(el)
    return True


def genera_boletas_pdf(data: dict, empresa: str, rut: str, out_path: Path) -> bool:
    """Boletas de honorarios — resumen MENSUAL por período (igual que la carpeta
    tributaria del SII), no boleta a boleta. Columnas según el formato oficial:
      - BHE emitidas:  Período · Honorario bruto · Retención de terceros · PPM
      - BTE recibidas: Período · Honorario bruto · Retención · Total líquido
    Maneja con gracia el caso vacío (HTTP 204 → None).
    """
    bhe = _boletas_lista(data.get("boletasHonorarios"))
    bte = _boletas_lista(data.get("boletasTerceros"))

    doc = SimpleDocTemplate(str(out_path), pagesize=A4, topMargin=18 * mm,
                            bottomMargin=15 * mm, leftMargin=15 * mm, rightMargin=15 * mm)
    H1, H2, P = ESTILOS["Title"], ESTILOS["Heading2"], ESTILOS["BodyText"]
    el = [Paragraph("BOLETAS DE HONORARIOS", H1),
          Paragraph(f"{empresa} — RUT {rut}", H2),
          Paragraph("Resumen mensual de los últimos 12 meses, según la carpeta "
                    "tributaria del SII.", P),
          Spacer(1, 8)]

    def _g(b, *claves):
        for c in claves:
            if isinstance(b, dict) and c in b and b[c] not in (None, ""):
                return b[c]
        return ""

    # cols: (encabezado, [claves_posibles], es_monto)
    def _seccion(titulo, lista, cols):
        el.append(Paragraph(titulo, H2))
        if not lista:
            el.append(Paragraph("No registra información.", P))
            el.append(Spacer(1, 8))
            return
        filas = [[c[0] for c in cols]]
        totales = [0] * len(cols)
        for b in lista:
            fila = []
            for i, (_, claves, monto) in enumerate(cols):
                v = _g(b, *claves)
                if monto:
                    try:
                        totales[i] += int(float(v or 0))
                    except (ValueError, TypeError):
                        pass
                    fila.append(clp(v))
                else:
                    fila.append(str(v))
            filas.append(fila)
        fila_total = ["TOTAL"] + [
            clp(totales[i]) if cols[i][2] else "" for i in range(1, len(cols))
        ]
        filas.append(fila_total)
        el.append(_tabla(filas, [38 * mm, 44 * mm, 44 * mm, 44 * mm], con_total=True))
        el.append(Spacer(1, 8))

    PER = ["periodo", "periodoTributario", "mes", "glosaPeriodo", "ptributario"]
    BRU = ["honorarioBruto", "brutoHonorario", "montoBruto", "bruto", "honorarios"]
    _seccion("Boletas de Honorarios emitidas (BHE) — últimos 12 meses", bhe, [
        ("Período", PER, False),
        ("Honorario bruto", BRU, True),
        ("Retención de terceros", ["retencionTerceros", "retencion", "montoRetencion"], True),
        ("PPM contribuyente", ["ppm", "montoPpm", "ppmContribuyente"], True),
    ])
    _seccion("Boletas de terceros recibidas (BTE) — últimos 12 meses", bte, [
        ("Período", PER, False),
        ("Honorario bruto", BRU, True),
        ("Retención", ["retencion", "montoRetencion", "retencionTerceros"], True),
        ("Total líquido", ["totalLiquido", "liquido", "montoLiquido"], True),
    ])
    doc.build(el)
    return True


def genera_libro_pdf(filas_por_periodo: list, empresa: str, rut: str, out_path: Path) -> bool:
    """Libro de Compras/Ventas: resumen mensual de IVA por periodo.

    `filas_por_periodo` es una lista de dicts:
      {periodo, operacion, neto, exento, iva, total, docs}
    Genera un PDF tipo libro con débito/crédito fiscal mensual.
    """
    if not filas_por_periodo:
        return False

    doc = SimpleDocTemplate(str(out_path), pagesize=A4, topMargin=18 * mm,
                            bottomMargin=15 * mm, leftMargin=15 * mm, rightMargin=15 * mm)
    H1, H2, P = ESTILOS["Title"], ESTILOS["Heading2"], ESTILOS["BodyText"]
    el = [Paragraph("LIBRO DE COMPRAS Y VENTAS", H1),
          Paragraph(f"{empresa} — RUT {rut}", H2),
          Paragraph("Resumen mensual de IVA por periodo (RCV).", P), Spacer(1, 8)]

    for op, label, iva_label in (("COMPRA", "Libro de Compras (Crédito Fiscal)", "Crédito Fiscal (IVA)"),
                                 ("VENTA", "Libro de Ventas (Débito Fiscal)", "Débito Fiscal (IVA)")):
        filas = [x for x in filas_por_periodo if x.get("operacion") == op]
        if not filas:
            continue
        el.append(Paragraph(label, H2))
        data = [["Periodo", "Docs", "Exento", "Neto", iva_label, "Total"]]
        t_doc = t_exe = t_net = t_iva = t_tot = 0
        for x in sorted(filas, key=lambda f: str(f.get("periodo", ""))):
            per = str(x.get("periodo", ""))
            legible = periodo_legible(per) if len(per) >= 6 else per
            data.append([legible, str(x.get("docs", 0)), clp(x.get("exento")),
                         clp(x.get("neto")), clp(x.get("iva")), clp(x.get("total"))])
            t_doc += int(x.get("docs") or 0); t_exe += int(x.get("exento") or 0)
            t_net += int(x.get("neto") or 0); t_iva += int(x.get("iva") or 0)
            t_tot += int(x.get("total") or 0)
        data.append(["TOTAL", str(t_doc), clp(t_exe), clp(t_net), clp(t_iva), clp(t_tot)])
        el.append(_tabla(data, [38 * mm, 18 * mm, 28 * mm, 30 * mm, 32 * mm, 32 * mm],
                         con_total=True))
        el.append(Spacer(1, 10))

    doc.build(el)
    return True


def genera_resumen_pdf(json_path: Path, empresa: str, rut: str,
                       periodo: str, operacion: str, out_path: Path) -> bool:
    d = json.load(open(json_path, encoding="utf-8"))
    tipos = d.get("data") or []
    if not tipos:
        return False
    data = [["Tipo de documento", "Cantidad", "Exento", "Neto", "IVA", "Total"]]
    c = n = e = iv = t = 0
    for x in tipos:
        data.append([x.get("dcvNombreTipoDoc", "?"), str(x.get("rsmnTotDoc", 0)),
                     clp(x.get("rsmnMntExe")), clp(x.get("rsmnMntNeto")),
                     clp(x.get("rsmnMntIVA")), clp(x.get("rsmnMntTotal"))])
        c += int(x.get("rsmnTotDoc") or 0); e += int(x.get("rsmnMntExe") or 0)
        n += int(x.get("rsmnMntNeto") or 0); iv += int(x.get("rsmnMntIVA") or 0)
        t += int(x.get("rsmnMntTotal") or 0)
    data.append(["TOTAL", str(c), clp(e), clp(n), clp(iv), clp(t)])

    doc = SimpleDocTemplate(str(out_path), pagesize=A4, topMargin=20 * mm)
    elems = [
        Paragraph(f"{empresa} — RUT {rut}", ESTILOS["Title"]),
        Paragraph(f"Resumen de {'Compras' if operacion=='COMPRA' else 'Ventas'} · "
                  f"{periodo_legible(periodo)}", ESTILOS["Heading2"]),
        Spacer(1, 8),
    ]
    tabla = Table(data, colWidths=[60 * mm, 22 * mm, 26 * mm, 28 * mm, 26 * mm, 30 * mm])
    tabla.setStyle(_estilo_tabla(con_total=True))
    elems.append(tabla)
    doc.build(elems)
    return True
