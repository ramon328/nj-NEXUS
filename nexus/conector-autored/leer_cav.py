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
    # limitaciones al dominio / prenda
    sin_lim = re.search(r"NO\s+TIENE\s+ANOTACIONES\s+VIGENTES", texto, re.IGNORECASE)
    campos["limitaciones_al_dominio"] = (not bool(sin_lim))
    campos["tiene_prenda"] = bool(re.search(r"PRENDA|GRAVAMEN|PROHIBICI", texto, re.IGNORECASE))

    print(json.dumps({"ok": True, "campos": campos, "texto": texto[:4000]}, ensure_ascii=False))

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(json.dumps({"ok": False, "error": str(e)}))
        sys.exit(1)
