"""Estimación del F29 (IVA + retenciones) de un período, con fuentes trazables.

NO inventa nada: cada cifra dice de dónde sale y lo que no se puede saber queda
declarado en `faltan`/`supuestos` en vez de rellenarse con un número inventado.

Fuentes:
  · IVA débito / crédito / base imponible → RCV ya descargado (resumen.json).
  · Retención de honorarios (cód. 151)   → boletas_recibidas.csv (BHE recibidas).
  · Remanente del mes anterior (cód. 504)→ código 077 del F29 YA DECLARADO del
                                           período anterior (PDF oficial del SII).
  · Impuesto único trabajadores (cód. 48)→ NO tenemos nómina: se toma como
                                           REFERENCIA el del último F29 declarado
                                           y queda marcado como estimación.
  · Tasa PPM (cód. 115)                  → último F29 declarado.

El modelo aritmético se VALIDÓ contra el F29 real de ANA CLARA SPA período
202605 (folio 9113295526), y cuadró peso a peso:
    537 total créditos = 520 crédito facturas − 528 NC recibidas + 504 remanente
    077 remanente nuevo = 537 − 538   (cuando créditos > débitos)
    563 base imponible  = ventas netas afectas + ventas exentas
    062 PPM             = 563 × tasa 115 / 100
    595/547/91 total    = 089 IVA + 062 PPM + 151 retención + 048 imp. único
"""
from __future__ import annotations

import calendar
import csv
import json
import re
from pathlib import Path

# Documentos que RESTAN (notas de crédito) y que SUMAN (notas de débito).
NC = {60, 61, 112}
ND = {55, 56, 111}

MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio",
         "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]


def periodo_anterior(periodo: str) -> str:
    y, m = int(periodo[:4]), int(periodo[4:])
    return f"{y - 1}12" if m == 1 else f"{y}{m - 1:02d}"


def _monto(txt: str) -> float:
    """'52.657.992' → 52657992 ; '0.25' → 0.25 (la tasa PPM viene con punto decimal)."""
    t = (txt or "").strip()
    if re.fullmatch(r"\d+[.,]\d{1,2}", t) and len(t.split(".")[-1]) <= 2 and "." in t:
        return float(t.replace(",", "."))
    return float(re.sub(r"[^\d-]", "", t) or 0)


def codigos_f29_declarado(pdf: Path) -> dict:
    """Lee el PDF oficial del F29 y devuelve {codigo:int -> valor}. El PDF del SII
    viene como líneas 'CÓDIGO GLOSA VALOR', más el total a pagar al final."""
    try:
        from pypdf import PdfReader
    except ImportError:  # pragma: no cover
        return {}
    if not pdf.exists():
        return {}
    try:
        r = PdfReader(str(pdf))
        texto = "\n".join((p.extract_text() or "") for p in r.pages)
    except Exception:  # noqa: BLE001
        return {}
    out = {}
    for linea in texto.splitlines():
        linea = linea.strip()
        m = re.match(r"^(\d{2,3})\s+(.+?)\s+([\d.,]+)\s*$", linea)
        if m:
            out[int(m.group(1))] = _monto(m.group(3))
            continue
        # 'TOTAL A PAGAR DENTRO DEL PLAZO LEGAL 91 1.809.078 +'
        m2 = re.search(r"TOTAL A PAGAR DENTRO DEL PLAZO LEGAL\s+91\s+([\d.,]+)", linea)
        if m2:
            out[91] = _monto(m2.group(1))
    return out


def _rcv(base: Path, op: str, periodo: str) -> list[dict] | None:
    f = base / op / periodo / "resumen.json"
    if not f.exists():
        return None
    try:
        return (json.loads(f.read_text(encoding="utf-8")) or {}).get("data") or []
    except Exception:  # noqa: BLE001
        return None


def _signo(tipo: int) -> int:
    return -1 if tipo in NC else 1


def totales_rcv(filas: list[dict]) -> dict:
    """Suma el RCV respetando el signo de las notas de crédito."""
    t = {"documentos": 0, "neto": 0, "iva": 0, "exento": 0, "iva_no_rec": 0, "total": 0}
    for r in filas:
        s = _signo(int(r.get("rsmnTipoDocInteger") or 0))
        t["documentos"] += int(r.get("rsmnTotDoc") or 0)
        t["neto"] += s * int(r.get("rsmnMntNeto") or 0)
        t["iva"] += s * int(r.get("rsmnMntIVA") or 0)
        t["exento"] += s * int(r.get("rsmnMntExe") or 0)
        t["iva_no_rec"] += s * int(r.get("rsmnMntIVANoRec") or 0)
        t["total"] += s * int(r.get("rsmnMntTotal") or 0)
    return t


def retencion_honorarios(base: Path, periodo: str) -> tuple[int, str]:
    """Código 151: retención que la empresa hace sobre las BHE que RECIBE.
    Sale del CSV de boletas recibidas (columna retencion_terceros), no de una tasa
    asumida — la tasa de la Ley 21.133 sube cada año y no se adivina."""
    f = base / "boletas" / "boletas_recibidas.csv"
    if not f.exists():
        return 0, "sin dato: no se han descargado las boletas de honorarios recibidas (docs:['boletas'])"
    anio, mes = periodo[:4], MESES[int(periodo[4:]) - 1]
    try:
        with f.open(encoding="utf-8-sig") as fh:
            for row in csv.DictReader(fh, delimiter=";"):
                if (row.get("anio") or "").strip() == anio and (row.get("mes") or "").strip().lower() == mes.lower():
                    return int(row.get("retencion_terceros") or 0), f"boletas de honorarios recibidas de {mes} {anio}"
    except Exception as exc:  # noqa: BLE001
        return 0, f"no pude leer el CSV de boletas ({exc})"
    return 0, f"{mes} {anio} no registra boletas de honorarios recibidas"


def estimar(base: Path, periodo: str) -> dict:
    """Arma la estimación del F29 del período. `base` = carpeta de la empresa.

    Si el F29 de ESE período YA está declarado y descargado, no estima nada: devuelve
    los códigos REALES de la declaración, que es una respuesta mejor que cualquier
    estimación.
    """
    # ── ¿Ya está declarado? Entonces esto no es una estimación, es el dato ──────
    propio = codigos_f29_declarado(base / "formularios" / "f29" / f"f29_{periodo}.pdf")
    if propio:
        return {
            "periodo": periodo, "listo": True, "declarado": True,
            "codigos": {
                "538_debito_fiscal": int(propio.get(538) or 0),
                "537_creditos_totales": int(propio.get(537) or 0),
                "credito_del_periodo": int(propio.get(511) or 0),
                "504_remanente_mes_anterior": int(propio.get(504) or 0),
                "089_iva_a_pagar": int(propio.get(89) or 0),
                "077_remanente_para_el_mes_siguiente": int(propio.get(77) or 0),
                "563_base_imponible_ppm": int(propio.get(563) or 0),
                "115_tasa_ppm": float(propio.get(115) or 0),
                "115_tasa_ppm_texto": (str(float(propio.get(115) or 0)).replace(".", ",") + "%"),
                "062_ppm": int(propio.get(62) or 0),
                "151_retencion_honorarios": int(propio.get(151) or 0),
                "048_impuesto_unico_trabajadores": int(propio.get(48) or 0),
                "91_total_a_pagar": int(propio.get(91) or 0),
            },
            "hay_remanente": int(propio.get(77) or 0) > 0,
            "resultado": "remanente a favor" if int(propio.get(89) or 0) == 0 and int(propio.get(77) or 0) > 0 else "IVA a pagar",
            "fuentes": {"todo": f"F29 REALMENTE DECLARADO del período {periodo} (PDF oficial del SII)"},
            "supuestos": [], "faltan": [],
            "nota": "Estos NO son números estimados: es la declaración oficial que ya está "
                    "presentada en el SII.",
        }
    faltan, supuestos = [], []
    compras_f, ventas_f = _rcv(base, "compra", periodo), _rcv(base, "venta", periodo)
    if compras_f is None:
        faltan.append(f"RCV de COMPRAS de {periodo} (sin eso no hay crédito fiscal)")
    if ventas_f is None:
        faltan.append(f"RCV de VENTAS de {periodo} (sin eso no hay débito fiscal)")
    if faltan:
        return {"periodo": periodo, "listo": False, "faltan": faltan,
                "nota": "Falta descargar el RCV del período. Bájalo y vuelve a pedir la estimación."}

    compras, ventas = totales_rcv(compras_f), totales_rcv(ventas_f)

    # ── IVA ────────────────────────────────────────────────────────────────
    debito = max(0, ventas["iva"])
    credito_periodo = max(0, compras["iva"] - compras["iva_no_rec"])
    if compras["iva_no_rec"]:
        supuestos.append(f"Se descontó ${compras['iva_no_rec']:,.0f} de IVA sin derecho a crédito.".replace(",", "."))

    # ── Remanente del mes anterior (cód. 504) = cód. 077 del F29 anterior ──
    ant = periodo_anterior(periodo)
    cod_ant = codigos_f29_declarado(base / "formularios" / "f29" / f"f29_{ant}.pdf")
    if cod_ant:
        remanente = int(cod_ant.get(77) or 0)
        fuente_rem = f"código 077 del F29 declarado de {ant}, SIN reajustar"
        if remanente:
            # Verificado con ANA CLARA: el 077 de abril (67.520.933) entró en mayo como
            # 68.399.064 (+1,3%). La ley reajusta el remanente y ese factor NO es la
            # simple variación de la UTM del mes (probado: da 68.196.249). No se inventa:
            # se arrastra el nominal y se avisa que el remanente real es algo mayor, o
            # sea que el IVA a pagar que sale acá es un TECHO.
            supuestos.append(
                "El remanente se arrastró NOMINAL (sin el reajuste legal, que en el caso "
                "medido fue ~1,3%): el remanente real es un poco mayor, así que el IVA a "
                "pagar estimado es un techo, nunca menos de lo que corresponde.")
    else:
        remanente = 0
        fuente_rem = "SIN DATO: no tengo el F29 declarado del período anterior"
        faltan.append(f"F29 declarado de {ant} para saber el remanente (cód. 077). "
                      f"Se está calculando con remanente = 0, así que el IVA a pagar puede salir MÁS ALTO del real.")

    creditos_totales = credito_periodo + remanente
    iva_a_pagar = max(0, debito - creditos_totales)          # cód. 089
    remanente_nuevo = max(0, creditos_totales - debito)      # cód. 077 del período

    # ── PPM (cód. 062) = base imponible × tasa del último F29 ──────────────
    base_imponible = max(0, ventas["neto"] + ventas["exento"])
    tasa_ppm = float(cod_ant.get(115) or 0) if cod_ant else 0.0
    fuente_tasa = f"tasa PPM (cód. 115) del F29 de {ant}" if tasa_ppm else "SIN DATO"
    if not tasa_ppm:
        faltan.append("Tasa de PPM (cód. 115): no tengo un F29 declarado de dónde leerla; el PPM queda en 0.")
    ppm = round(base_imponible * tasa_ppm / 100)

    # ── Retención honorarios (151) e impuesto único (048) ──────────────────
    ret_151, fuente_151 = retencion_honorarios(base, periodo)
    imp_unico = int(cod_ant.get(48) or 0) if cod_ant else 0
    if imp_unico:
        fuente_48 = (f"REFERENCIA del F29 de {ant} (cód. 048) — no tenemos la nómina de "
                     "sueldos, así que este monto es el del mes anterior, no el real del período")
        supuestos.append("El impuesto único a los trabajadores se asumió igual al del mes anterior.")
    else:
        fuente_48 = ("0: el F29 anterior no declara impuesto único, o no hay F29 anterior. "
                     "Si la empresa paga sueldos con impuesto único, hay que informarlo a mano")

    total = iva_a_pagar + ppm + ret_151 + imp_unico

    return {
        "periodo": periodo, "listo": True,
        "codigos": {
            "538_debito_fiscal": debito,
            "537_creditos_totales": creditos_totales,
            "credito_del_periodo": credito_periodo,
            "504_remanente_mes_anterior": remanente,
            "089_iva_a_pagar": iva_a_pagar,
            "077_remanente_para_el_mes_siguiente": remanente_nuevo,
            "563_base_imponible_ppm": base_imponible,
            "115_tasa_ppm": tasa_ppm,
            # OJO: la tasa viene en PORCENTAJE (0,25 = 0,25%, no 25%). El texto va listo
            # para copiar porque el modelo ya lo leyó mal una vez.
            "115_tasa_ppm_texto": (str(tasa_ppm).replace(".", ",") + "%"),
            "062_ppm": ppm,
            "151_retencion_honorarios": ret_151,
            "048_impuesto_unico_trabajadores": imp_unico,
            "91_total_a_pagar": total,
        },
        "hay_remanente": remanente_nuevo > 0,
        "resultado": ("remanente a favor" if remanente_nuevo > 0 and iva_a_pagar == 0
                      else "IVA a pagar"),
        "compras": compras, "ventas": ventas,
        "fuentes": {
            "iva": f"RCV de compras y ventas de {periodo} ya descargado (notas de crédito restadas)",
            "remanente": fuente_rem, "tasa_ppm": fuente_tasa,
            "retencion_honorarios": fuente_151, "impuesto_unico": fuente_48,
        },
        "supuestos": supuestos,
        "faltan": faltan,
        "nota": ("ESTIMACIÓN, no la declaración oficial. El F29 real lo declara el contador "
                 "y puede incluir partidas que no vemos (IVA postergado, créditos especiales, "
                 "activo fijo, sueldos del período)."),
    }
