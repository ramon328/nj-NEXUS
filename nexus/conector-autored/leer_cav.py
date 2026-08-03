#!/usr/bin/env python3
# Lee un PDF de CAV (Certificado de Anotaciones Vigentes del Registro Civil) y
# devuelve JSON con el texto y los campos del vehículo parseados (best-effort).
import sys, json, re

def main():
    path = sys.argv[1]
    import pypdf
    reader = pypdf.PdfReader(path)
    texto = "\n".join((p.extract_text() or "") for p in reader.pages)

    def buscar(pat):
        m = re.search(pat, texto, re.IGNORECASE)
        return re.sub(r"\s+", " ", m.group(1)).strip() if m else None

    campos = {
        "patente":     buscar(r"Inscripci[oó]n\s*:\s*([A-Z0-9.\-]+)"),
        "tipo":        buscar(r"Tipo\s*Veh[ií]culo\s*:\s*([^\n]+?)\s*(?:A[nñ]o|$)"),
        "anio":        buscar(r"A[nñ]o\s*:\s*(\d{4})"),
        "marca":       buscar(r"Marca\s*:\s*([^\n]+)"),
        "modelo":      buscar(r"Modelo\s*:\s*([^\n]+)"),
        "motor":       buscar(r"Nro\.?\s*Motor\s*:\s*([^\n]+)"),
        "chasis":      buscar(r"Nro\.?\s*Chasis\s*:\s*([^\n]+)"),
        "color":       buscar(r"Color\s*:\s*([^\n]+)"),
        "combustible": buscar(r"Combustible\s*:\s*([^\n]+)"),
        "propietario": buscar(r"Nombre\s*:\s*([^\n]+)"),
        "rut_propietario": buscar(r"R\.?U\.?T\.?\s*:\s*([0-9.\-kK]+)"),
    }
    # Limitaciones al dominio / prenda. NO se busca la palabra "PRENDA|PROHIBICI" en todo el
    # PDF: los informes traen subtítulos explicativos ("Revisa si existe una prohibición legal
    # para transferir el auto…") y eso marcaba prenda en autos limpios. Se delega en
    # revisar_informe.py, que mira SOLO la sección de limitaciones.
    from revisar_informe import revisar_cav, revisar_nmp, norm
    T = norm(texto)
    es_nmp = bool(re.search(r"INFORME HISTORIAL DEL VEH[IÍ]CULO|Resumen del veh[ií]culo", T, re.IGNORECASE))
    chequeos = revisar_nmp(T) if es_nmp else revisar_cav(T)
    lim = next((c for c in chequeos if c["clave"] == "limitaciones_dominio"), None)

    campos["limitaciones_al_dominio"] = bool(lim and lim["estado"] == "alerta")
    if lim and lim["estado"] == "alerta":
        # true solo si la anotación es efectivamente una prenda; si no se puede saber, None.
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
