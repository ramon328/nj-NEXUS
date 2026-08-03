#!/usr/bin/env python3
# Lee un PDF de Informe Autored COMPLETO (NMP) y devuelve JSON con los datos del
# vehículo + kilometraje (de la tabla de revisiones técnicas). Best-effort.
# El NMP es superconjunto del CAV: trae marca/modelo/año/motor/chasis/vin/color/
# combustible/PBV/patente Y el km (que el CAV NO trae). Uso: python3 leer_nmp.py <pdf>
import sys, json, re

def main():
    path = sys.argv[1]
    import pypdf
    reader = pypdf.PdfReader(path)
    texto = "\n".join((p.extract_text() or "") for p in reader.pages)
    T = re.sub(r"[ \t]+", " ", texto)  # normaliza espacios (el NMP viene inline)

    def campo(pat):
        m = re.search(pat, T, re.IGNORECASE)
        return re.sub(r"\s+", " ", m.group(1)).strip() if m else None

    campos = {
        "patente":     campo(r"\b([A-Z]{2,4}\d{2,4})-[\dkK]\b"),
        "tipo":        campo(r"Tipo\s*Veh[ií]culo\s*:\s*(.+?)\s+A[nñ]o\s*:"),
        "anio":        campo(r"A[nñ]o\s*:\s*(\d{4})"),
        "marca":       campo(r"Marca\s*:\s*(.+?)\s+Modelo\s*:"),
        "modelo":      campo(r"Modelo\s*:\s*(.+?)\s+Nro\.?\s*Motor"),
        "motor":       campo(r"Nro\.?\s*Motor\s*:\s*(.+?)\s+Nro\.?\s*Chasis"),
        "chasis":      campo(r"Nro\.?\s*Chasis\s*:\s*(.+?)\s+Nro\.?\s*(?:Vin|V\.?I\.?N)"),
        "vin":         campo(r"Nro\.?\s*(?:Vin|V\.?I\.?N)\s*:\s*(.+?)\s+Color\s*:"),
        "color":       campo(r"Color\s*:\s*(.+?)\s+Combustible\s*:"),
        "combustible": campo(r"Combustible\s*:\s*(.+?)\s+(?:PBV|Instit)"),
        "pbv":         campo(r"PBV\s*:\s*([\d.,]+)"),
    }

    # Kilometraje: tabla de revisiones técnicas. Cada fila:
    #   <fecha rev> ... <km> <fecha vencimiento> <estado>
    # Tomamos el km de la revisión con FECHA más reciente.
    km = None
    T2 = re.sub(r"\s+", " ", texto)  # colapsa saltos de línea (la fila cruza líneas)
    revs = re.findall(
        r"(\d{2}/\d{2}/\d{4}).{0,90}?\b([\d]{1,3}(?:\.\d{3})+|\d{4,7})\s+\d{2}/\d{2}/\d{4}\s+(?:Aprobad|Rechaz|Reprob)",
        T2, re.IGNORECASE)
    if revs:
        def fkey(r):
            d, m, a = r[0].split("/")
            return (int(a), int(m), int(d))
        fecha, km_raw = max(revs, key=fkey)
        km = int(re.sub(r"\D", "", km_raw))
        campos["km_fecha"] = fecha
    campos["km"] = km

    # Limitaciones / prenda: se delega en revisar_informe.py (mira la sección correspondiente).
    # Buscar la PALABRA "PRENDA|PROHIBICI" en todo el PDF daba FALSOS POSITIVOS, porque el NMP
    # trae el subtítulo "Revisa si existe una prohibición legal para transferir el auto…".
    from revisar_informe import revisar_cav, revisar_nmp
    es_nmp = bool(re.search(r"INFORME HISTORIAL DEL VEH[IÍ]CULO|Resumen del veh[ií]culo", T, re.IGNORECASE))
    chequeos = revisar_nmp(T) if es_nmp else revisar_cav(T)
    lim = next((c for c in chequeos if c["clave"] == "limitaciones_dominio"), None)

    campos["limitaciones_al_dominio"] = bool(lim and lim["estado"] == "alerta")
    if lim and lim["estado"] == "alerta":
        campos["tiene_prenda"] = True if "PRENDA" in (lim.get("actos") or []) else None
    elif lim and lim["estado"] == "ok":
        campos["tiene_prenda"] = False
    else:
        campos["tiene_prenda"] = None          # no concluyente: NO afirmar ni negar
    campos["limitaciones_detalle"] = lim["detalle"] if lim else None

    alertas = [c for c in chequeos if c["estado"] == "alerta"]
    revisar = [c for c in chequeos if c["estado"] == "revisar"]
    print(json.dumps({
        "ok": True, "campos": campos,
        "revision": {
            "formato": "NMP" if es_nmp else "CAV",
            "resumen": {"alertas": len(alertas), "revisar": len(revisar),
                        "ok": len(chequeos) - len(alertas) - len(revisar), "apto": len(alertas) == 0},
            "chequeos": chequeos,
        },
        "texto": texto[:4000],
    }, ensure_ascii=False))

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(json.dumps({"ok": False, "error": str(e)}))
        sys.exit(1)
