#!/usr/bin/env python3
# Lee una CARTOLA de banco (Excel .xlsx/.xls o PDF, típicamente Santander) y devuelve
# JSON con los movimientos normalizados para la tabla movimientos_banco de la BD nueva.
# Es best-effort/flexible: detecta la fila de encabezado por palabras clave. Ajustar con
# una cartola real si algún banco trae otro layout.
#   salida: {"ok":true,"movimientos":[{fecha,descripcion,monto,saldo,documento}], "n":N}
#   monto CON SIGNO: abono/depósito positivo, cargo/giro negativo.
import sys, json, re, datetime

def norm_fecha(v):
    if v is None: return None
    if isinstance(v, (datetime.datetime, datetime.date)):
        return v.strftime("%Y-%m-%d")
    s = str(v).strip()
    m = re.match(r"(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})", s)
    if m:
        d, mo, y = m.groups()
        y = ("20" + y) if len(y) == 2 else y
        try: return datetime.date(int(y), int(mo), int(d)).strftime("%Y-%m-%d")
        except Exception: return None
    m = re.match(r"(\d{4})-(\d{2})-(\d{2})", s)
    return m.group(0) if m else None

def to_int(v):
    if v is None or v == "": return 0
    if isinstance(v, (int, float)): return int(round(v))
    s = re.sub(r"[^\d\-]", "", str(v).replace(".", "").replace(",", ""))
    try: return int(s) if s not in ("", "-") else 0
    except Exception: return 0

def find_col(headers, *keys):
    for i, h in enumerate(headers):
        hu = str(h or "").upper()
        if any(k in hu for k in keys): return i
    return None

def parse_xlsx(path):
    import openpyxl
    wb = openpyxl.load_workbook(path, data_only=True)
    ws = wb.worksheets[0]
    rows = list(ws.iter_rows(values_only=True))
    # buscar fila de encabezado (tiene FECHA y algún monto)
    hi = None
    for i, r in enumerate(rows[:30]):
        up = [str(c or "").upper() for c in r]
        joined = " ".join(up)
        if "FECHA" in joined and any(k in joined for k in ("CARGO", "ABONO", "MONTO", "SALDO", "DEBE", "HABER")):
            hi = i; headers = up; break
    if hi is None:
        return {"ok": False, "error": "No encontré el encabezado de la cartola (fecha/cargo/abono/saldo)."}
    ci = {
        "fecha": find_col(headers, "FECHA"),
        "desc": find_col(headers, "DESCRIP", "DETALLE", "GLOSA", "MOVIMIENTO", "TRANSAC"),
        "cargo": find_col(headers, "CARGO", "DEBE", "GIRO"),
        "abono": find_col(headers, "ABONO", "HABER", "DEPOSITO", "DEPÓSITO"),
        "monto": find_col(headers, "MONTO", "IMPORTE"),
        "saldo": find_col(headers, "SALDO"),
        "doc": find_col(headers, "DOCUMENTO", "N°", "NRO", "NUMERO"),
    }
    out = []
    for r in rows[hi + 1:]:
        if not r: continue
        f = norm_fecha(r[ci["fecha"]]) if ci["fecha"] is not None and ci["fecha"] < len(r) else None
        if not f: continue
        cargo = to_int(r[ci["cargo"]]) if ci["cargo"] is not None and ci["cargo"] < len(r) else 0
        abono = to_int(r[ci["abono"]]) if ci["abono"] is not None and ci["abono"] < len(r) else 0
        monto = to_int(r[ci["monto"]]) if ci["monto"] is not None and ci["monto"] < len(r) else 0
        if not monto:
            monto = abono - abs(cargo)
        desc = str(r[ci["desc"]]) if ci["desc"] is not None and ci["desc"] < len(r) and r[ci["desc"]] is not None else ""
        saldo = to_int(r[ci["saldo"]]) if ci["saldo"] is not None and ci["saldo"] < len(r) else 0
        doc = str(r[ci["doc"]]) if ci["doc"] is not None and ci["doc"] < len(r) and r[ci["doc"]] is not None else ""
        if monto == 0 and not desc.strip(): continue
        out.append({"fecha": f, "descripcion": re.sub(r"\s+", " ", desc).strip(), "monto": monto, "saldo": saldo, "documento": doc.strip()})
    return {"ok": True, "movimientos": out, "n": len(out)}

def parse_pdf(path):
    import subprocess
    txt = subprocess.run(["pdftotext", "-layout", path, "-"], capture_output=True, text=True).stdout
    out = []
    for line in txt.splitlines():
        # línea con fecha al inicio y al menos un monto con separador de miles
        m = re.match(r"\s*(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})\s+(.+?)\s+([\d.]{2,}(?:,\d+)?)\s*$", line)
        if not m: continue
        f = norm_fecha(m.group(1))
        if not f: continue
        montos = re.findall(r"-?[\d.]{2,}", m.group(2) + " " + m.group(3))
        monto = to_int(montos[-2]) if len(montos) >= 2 else to_int(montos[-1]) if montos else 0
        out.append({"fecha": f, "descripcion": re.sub(r"\s+", " ", m.group(2)).strip(), "monto": monto, "saldo": 0, "documento": ""})
    return {"ok": True, "movimientos": out, "n": len(out), "nota": "PDF best-effort; validar contra una cartola real"}

def main():
    path = sys.argv[1]
    low = path.lower()
    if low.endswith((".xlsx", ".xls")):
        print(json.dumps(parse_xlsx(path), ensure_ascii=False))
    elif low.endswith(".pdf"):
        print(json.dumps(parse_pdf(path), ensure_ascii=False))
    else:
        print(json.dumps({"ok": False, "error": "Formato no soportado (usa .xlsx, .xls o .pdf)."}))

if __name__ == "__main__":
    try: main()
    except Exception as e:
        print(json.dumps({"ok": False, "error": str(e)})); sys.exit(1)
