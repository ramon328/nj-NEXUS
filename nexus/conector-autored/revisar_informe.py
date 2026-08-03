#!/usr/bin/env python3
# Revisión A FONDO de un informe de vehículo de AutoRed (CAV crudo o Informe Completo NMP).
# Uso: python3 revisar_informe.py <pdf>
#
# POR QUÉ EXISTE: la detección vieja (leer_cav.py / leer_nmp.py) buscaba la PALABRA
# "PRENDA|GRAVAMEN|PROHIBICI" en TODO el texto del PDF. Los informes NMP traen subtítulos
# explicativos como "Revisa si existe una prohibición legal para transferir el auto a un
# tercero", así que un auto LIMPIO salía marcado con prenda (falso positivo verificado en
# SWPV28). Acá cada chequeo se resuelve con FRASES EXPLÍCITAS y, en el CAV, mirando SOLO
# la sección que corresponde.
#
# REGLA DE ORO: si no se encuentra ninguna frase conocida, el estado es "revisar"
# (= no lo pude determinar), NUNCA "ok" ni "alerta". Preferimos decir "no me consta" antes
# que afirmar algo falso sobre un auto que se está comprando.
import sys, json, re

OK, ALERTA, REVISAR = "ok", "alerta", "revisar"


def norm(t):
    return re.sub(r"\s+", " ", t or "").strip()


def seccion_cav(T, titulo, siguientes):
    """Devuelve solo el trozo del CAV que va desde `titulo` hasta el próximo encabezado."""
    m = re.search(titulo, T, re.I)
    if not m:
        return None
    resto = T[m.end():]
    fin = len(resto)
    for s in siguientes:
        m2 = re.search(s, resto, re.I)
        if m2 and m2.start() < fin:
            fin = m2.start()
    return resto[:fin].strip()


def chk(clave, titulo, estado, detalle, actos=None):
    # `actos` = tipos de anotación IDENTIFICADOS (PRENDA, EMBARGO, …). Va aparte del `detalle`
    # a propósito: el detalle es prosa y quien lea "prenda" ahí puede volver a caer en el
    # falso positivo que este módulo existe para evitar. Para decidir, usar `actos`.
    d = {"clave": clave, "titulo": titulo, "estado": estado, "detalle": detalle}
    if actos is not None:
        d["actos"] = actos
    return d


# ---------------------------------------------------------------- NMP (informe AutoRed)
def revisar_nmp(T):
    out = []

    def frase(pares, clave, titulo, sin_match=None):
        """pares = [(regex, estado, plantilla_detalle)] en orden de prioridad."""
        for rx, estado, det in pares:
            m = re.search(rx, T, re.I)
            if m:
                try:
                    return out.append(chk(clave, titulo, estado, det.format(*m.groups())))
                except (IndexError, KeyError):
                    return out.append(chk(clave, titulo, estado, det))
        out.append(chk(clave, titulo, REVISAR, sin_match or "El informe no lo dice con claridad; revísalo a mano."))

    # El NMP dice SI hay limitaciones pero no siempre QUÉ tipo: `actos` queda vacío y quien
    # decida (¿es prenda?) debe tratarlo como "no se sabe", no como prenda confirmada.
    if re.search(r"El veh[ií]culo no registra limitaciones al dominio", T, re.I) or re.search(r"no tiene anotaciones vigentes", T, re.I):
        out.append(chk("limitaciones_dominio", "Limitaciones al dominio", OK, "Sin limitaciones al dominio.", actos=[]))
    elif re.search(r"El veh[ií]culo registra limitaciones al dominio", T, re.I):
        out.append(chk("limitaciones_dominio", "Limitaciones al dominio", ALERTA,
                       "REGISTRA limitaciones al dominio. El informe no dice de qué tipo: hay que pedir el CAV "
                       "para ver la anotación exacta y alzarla antes de transferir.", actos=[]))
    else:
        out.append(chk("limitaciones_dominio", "Limitaciones al dominio", REVISAR,
                       "El informe no lo dice con claridad; revísalo a mano.", actos=[]))

    frase([
        (r"El veh[ií]culo no registra p[eé]rdida total", OK, "Sin pérdida total."),
        (r"registra p[eé]rdida total", ALERTA, "REGISTRA PÉRDIDA TOTAL: el auto fue siniestrado/rematado."),
    ], "perdida_total", "Pérdida total")

    frase([
        (r"No presenta encargo por robo", OK, "Sin encargo por robo."),
        (r"(?:presenta|registra) encargo por robo", ALERTA, "TIENE ENCARGO POR ROBO: no se puede transferir, es delito comprarlo."),
    ], "encargo_robo", "Encargo por robo")

    frase([
        (r"No tiene licencia de veh[ií]culo de transporte", OK, "Nunca fue de transporte público."),
        (r"(?:tiene|registra) licencia de veh[ií]culo de transporte", ALERTA,
         "FUE VEHÍCULO DE TRANSPORTE PÚBLICO (taxi/colectivo/escolar): desgaste alto y afecta el precio."),
    ], "transporte_publico", "Transporte público")

    frase([
        (r"Sin multas heredables", OK, "Sin multas heredables."),
        (r"(?:Se encontraron|Registra|Tiene)\s+(\d+)\s+multas? heredables?", ALERTA,
         "TIENE {0} multa(s) HEREDABLE(S): las hereda el comprador, hay que pagarlas o descontarlas del precio."),
        (r"multas heredables", REVISAR, "La sección de multas heredables no fue concluyente; revísala a mano."),
    ], "multas_heredables", "Multas heredables")

    frase([
        (r"No se han encontrado infracciones cursadas", OK, "Sin infracciones en riesgo de anotación."),
        (r"Se encontraron\s+(\d+)\s+infracciones cursadas", ALERTA,
         "{0} infracción(es) del dueño actual EN RIESGO de anotarse: si se anotan antes de la transferencia, la bloquean. Exigir que las pague."),
    ], "infracciones_riesgo", "Infracciones en riesgo")

    frase([
        (r"[UÚ]nico due[nñ]o", OK, "Único dueño (el actual)."),
        (r"(Dos|Tres|Cuatro|Cinco|Seis|Siete|Ocho|Nueve|Diez|\d+)\s+due[nñ]os", REVISAR,
         "{0} dueños: no es un problema legal, pero pesa en la tasación y la reventa."),
    ], "duenos", "Cantidad de dueños")

    frase([
        (r"revisi[oó]n t[eé]cnica vigente hasta el\s+([\d\-/]+)", OK, "Revisión técnica vigente hasta {0}."),
        (r"revisi[oó]n t[eé]cnica.{0,40}(?:vencid|no vigente)", ALERTA, "Revisión técnica VENCIDA: hay que renovarla."),
    ], "revision_tecnica", "Revisión técnica")

    frase([
        (r"Seguro obligatorio vigente", OK, "SOAP vigente."),
        (r"Seguro obligatorio.{0,30}(?:no vigente|vencid)", ALERTA, "SOAP VENCIDO: hay que contratarlo."),
    ], "soap", "Seguro obligatorio (SOAP)")

    frase([
        (r"El permiso de circulaci[oó]n est[aá] vigente", OK, "Permiso de circulación vigente."),
        (r"permiso de circulaci[oó]n.{0,40}(?:vencid|no est[aá] vigente)", ALERTA, "Permiso de circulación VENCIDO."),
        (r"vigencia del permiso debe ser comprobada con el due[nñ]o", REVISAR,
         "El informe NO pudo verificar el permiso de circulación: hay que pedirle el permiso al dueño y comprobarlo."),
    ], "permiso_circulacion", "Permiso de circulación")

    frase([
        (r"no registra subinscripciones", OK, "Sin subinscripciones."),
        (r"registra subinscripciones", REVISAR, "Registra subinscripciones: revisar qué cambió en la inscripción."),
    ], "subinscripciones", "Subinscripciones")

    # Observaciones / anotaciones en trámite: cualquier mención afirmativa es para mirar.
    if re.search(r"Registra Solicitud de anotacion en tramite", T, re.I):
        out.append(chk("anotacion_tramite", "Anotación en trámite", ALERTA,
                       "Hay una SOLICITUD DE ANOTACIÓN EN TRÁMITE: puede convertirse en limitación y trabar la transferencia."))
    elif re.search(r"no registra observaciones", T, re.I):
        out.append(chk("observaciones", "Observaciones", OK, "Sin observaciones."))
    return out


# ---------------------------------------------------------------- CAV crudo (Registro Civil)
ENC_CAV = [r"OBSERVACIONES", r"DATOS DEL PROPIETARIO", r"Sr\.? usuario", r"SEGURO OBLIGATORIO",
           r"REVISION TECNICA", r"PERMISO DE CIRCULACION", r"FUENTE", r"P[aá]gina \d"]


def revisar_cav(T):
    out = []
    lim = seccion_cav(T, r"LIMITACIONES AL DOMINIO", ENC_CAV)
    if lim is None:
        out.append(chk("limitaciones_dominio", "Limitaciones al dominio", REVISAR,
                       "No encontré la sección de limitaciones en el CAV; revísalo a mano.", actos=[]))
    elif re.search(r"NO TIENE ANOTACIONES VIGENTES", lim, re.I):
        out.append(chk("limitaciones_dominio", "Limitaciones al dominio", OK, "Sin anotaciones vigentes.", actos=[]))
    else:
        # Dentro de la sección: qué acto es. Acá sí vale buscar PRENDA/PROHIBICIÓN.
        actos = []
        for rx, nombre in [(r"\bPRENDA\b", "PRENDA"), (r"PROHIBICI[OÓ]N", "PROHIBICIÓN DE ENAJENAR"),
                           (r"\bEMBARGO\b", "EMBARGO"), (r"\bGRAVAMEN\b", "GRAVAMEN"),
                           (r"LEASING", "LEASING"), (r"MEDIDA PRECAUTORIA", "MEDIDA PRECAUTORIA")]:
            if re.search(rx, lim, re.I):
                actos.append(nombre)
        fecha = re.search(r"Fecha\s*:\s*([\d\-/]+)", lim, re.I)
        det = "REGISTRA ANOTACIÓN VIGENTE: " + (", ".join(actos) if actos else norm(lim)[:120])
        if fecha:
            det += f" (fecha {fecha.group(1)})"
        det += ". Hay que ALZARLA antes de poder transferir."
        out.append(chk("limitaciones_dominio", "Limitaciones al dominio", ALERTA, det, actos=actos))

    obs = seccion_cav(T, r"OBSERVACIONES", ENC_CAV)
    if obs and re.search(r"Registra Solicitud de anotacion en tramite", obs, re.I):
        out.append(chk("anotacion_tramite", "Anotación en trámite", ALERTA,
                       "Hay una SOLICITUD DE ANOTACIÓN EN TRÁMITE: puede convertirse en limitación y trabar la transferencia."))

    if re.search(r"SEGURO OBLIGATORIO VIGENTE", T, re.I):
        out.append(chk("soap", "Seguro obligatorio (SOAP)", OK, "SOAP vigente."))

    out.append(chk("alcance_cav", "Alcance del documento", REVISAR,
                   "Es un CAV: NO trae pérdida total, encargo por robo, multas heredables, "
                   "infracciones en riesgo ni dueños anteriores. Para revisar eso hace falta el Informe Completo (NMP)."))
    return out


def main():
    import pypdf
    reader = pypdf.PdfReader(sys.argv[1])
    texto = "\n".join((p.extract_text() or "") for p in reader.pages)
    T = norm(texto)

    # El NMP es el informe narrativo de AutoRed; el CAV crudo viene en mayúsculas del RC.
    es_nmp = bool(re.search(r"INFORME HISTORIAL DEL VEH[IÍ]CULO|Resumen del veh[ií]culo", T, re.I))
    chequeos = revisar_nmp(T) if es_nmp else revisar_cav(T)

    # En el NMP la patente va suelta (SWPV28-0); en el CAV crudo viene como "Inscripción : SWPV.28-0".
    patente = (re.search(r"Inscripci[oó]n\s*:\s*([A-Z]{2,4})\.?(\d{2,4})", T, re.I)
               or re.search(r"PATENTE\s+([A-Z]{2,4})(\d{2,4})", T, re.I)
               or re.search(r"\b([A-Z]{2,4})(\d{2,4})-[\dkK]\b", T))
    alertas = [c for c in chequeos if c["estado"] == ALERTA]
    revisar = [c for c in chequeos if c["estado"] == REVISAR]
    print(json.dumps({
        "ok": True,
        "formato": "NMP" if es_nmp else "CAV",
        "patente": (patente.group(1) + patente.group(2)).upper() if patente else None,
        "paginas": len(reader.pages),
        "resumen": {
            "alertas": len(alertas),
            "revisar": len(revisar),
            "ok": len(chequeos) - len(alertas) - len(revisar),
            "apto": len(alertas) == 0,
        },
        "chequeos": chequeos,
    }, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(json.dumps({"ok": False, "error": str(e)}))
        sys.exit(1)
