#!/usr/bin/env python3
# Genera el PODER de gestión de TAG (Televía) de ANA CLARA en PDF a partir de la
# plantilla Word (poder-plantilla.docx), cambiando SOLO dos cosas: la PATENTE y la
# FECHA (el día en que se solicita el TAG). Todo lo demás (Ana Clara, gestor, firma
# de Nico 16142580-K) es fijo. No re-escribe el texto legal: lo toma de la plantilla.
#
# Uso: python3 generar_poder.py <PATENTE(S)> <salida.pdf> [YYYY-MM-DD]
#   la fecha es opcional; si no se pasa, usa la fecha de hoy.
#   PATENTE(S) admite VARIAS en un mismo poder, separadas por guión, coma, "/" o espacio:
#     "SWPV28-TDCX40"  "SWPV28, TDCX40"  "SWPV28 TDCX40"   -> quedan como "SWPV28 - TDCX40"
#   Un guión seguido de UN solo dígito es el dígito verificador, no otra patente:
#     "SWPV28-0" -> una sola patente (SWPV28).
import sys, os, re, zipfile, datetime

# Patente chilena: 2-4 letras + 2-4 dígitos (LLLL99, LL9999, LLL99...).
PAT = re.compile(r'^[A-Z]{2,4}\d{2,4}$')


def normalizar_patentes(texto):
    """'SWPV28-TDCX40' -> ['SWPV28','TDCX40'] · 'SWPV28-0' -> ['SWPV28'] (el 0 es el DV)."""
    t = str(texto or '').upper().replace('.', '')
    trozos = [x.strip() for x in re.split(r'[,\s/]+|-', t) if x.strip()]
    pats = []
    for x in trozos:
        if PAT.match(x):
            if x not in pats:
                pats.append(x)
        # trozos de 1 dígito = dígito verificador de la patente anterior -> se ignoran
        elif re.fullmatch(r'[\dkK]', x):
            continue
        else:
            raise ValueError(f'"{x}" no parece una patente válida (formato LL9999 / LLLL99)')
    if not pats:
        raise ValueError('No se reconoció ninguna patente válida en: ' + str(texto))
    return pats

DIR = os.path.dirname(os.path.abspath(__file__))
TPL = os.path.join(DIR, 'poder-plantilla.docx')
LOGO = os.path.join(DIR, 'poder-logo.png')
FIRMA = os.path.join(DIR, 'poder-firma.png')
MESES = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO',
         'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE']


def parrafos_de_docx(path):
    xml = zipfile.ZipFile(path).read('word/document.xml').decode('utf-8', 'ignore')
    parras = []
    for pm in re.finditer(r'<w:p[ >].*?</w:p>', xml, re.S):
        runs = re.findall(r'<w:t(?: [^>]*)?>(.*?)</w:t>', pm.group(0), re.S)
        txt = re.sub(r'\s+', ' ', ''.join(runs)).strip()
        if txt:
            parras.append(txt)
    return parras


def render_pdf(parras, salida):
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.units import cm
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image
    styles = getSampleStyleSheet()
    body = ParagraphStyle('body', parent=styles['Normal'], fontName='Helvetica',
                          fontSize=11, leading=16, alignment=TA_JUSTIFY, spaceAfter=8)
    titulo = ParagraphStyle('tit', parent=styles['Normal'], fontName='Helvetica-Bold',
                            fontSize=13, leading=18, alignment=TA_CENTER, spaceAfter=14)
    flow = []
    if os.path.exists(LOGO):
        try:
            flow.append(Image(LOGO, width=3.0 * cm, height=3.0 * cm * 44 / 78))
            flow.append(Spacer(1, 10))
        except Exception:
            pass
    esc = lambda s: s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    for i, p in enumerate(parras):
        flow.append(Paragraph(esc(p), titulo if i == 0 else body))
    flow.append(Spacer(1, 24))
    if os.path.exists(FIRMA):
        try:
            flow.append(Image(FIRMA, width=7.0 * cm, height=7.0 * cm * 386 / 576))
        except Exception:
            pass
    SimpleDocTemplate(salida, pagesize=letter, topMargin=1.6 * cm, bottomMargin=1.6 * cm,
                      leftMargin=2.2 * cm, rightMargin=2.2 * cm).build(flow)


def main():
    patentes = normalizar_patentes(sys.argv[1])
    patente = ' - '.join(patentes)          # varias patentes en el MISMO poder
    salida = sys.argv[2]
    if len(sys.argv) > 3 and re.match(r'\d{4}-\d{2}-\d{2}', sys.argv[3]):
        y, m, d = map(int, sys.argv[3].split('-'))
        hoy = datetime.date(y, m, d)
    else:
        hoy = datetime.date.today()
    fecha_txt = f'{hoy.day} de {MESES[hoy.month - 1]} de {hoy.year}'

    parras = parrafos_de_docx(TPL)
    out = []
    puso_patente = False
    puso_fecha = False
    for p in parras:
        p, nf = re.subn(r'a\s+\d{1,2}\s+de\s+[A-ZÁÉÍÓÚ]+\s+de\s+\d{4}', 'a ' + fecha_txt, p)
        if nf:
            puso_fecha = True
        if not puso_patente:
            p, np_ = re.subn(r'(Placa Patente Única\s+)[A-Z]{2,4}\d{2,4}(?:-[\dkK])?(\s*,)',
                             r'\g<1>' + patente + r'\g<2>', p, count=1)
            if np_:
                puso_patente = True
        out.append(p)
    # Si la plantilla cambió y el reemplazo no ocurrió, el PDF saldría con la patente de la
    # PLANTILLA (la de otro auto) y antes eso pasaba en silencio: un poder legalmente errado.
    # Preferimos fallar y que el flujo avise, no mandar un poder equivocado a Tag Tico.
    if not puso_patente:
        raise ValueError('No pude escribir la patente en el poder: la plantilla '
                         'poder-plantilla.docx no trae el texto "Placa Patente Única <PATENTE>,". '
                         'NO se genera el PDF para no mandar un poder con la patente equivocada.')
    if not puso_fecha:
        raise ValueError('No pude escribir la fecha en el poder (la plantilla no trae "a <D> de <MES> de <AAAA>").')
    render_pdf(out, salida)
    print('OK ' + salida + ' | patentes=' + patente + ' | fecha=' + fecha_txt)


if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print('ERROR ' + str(e))
        sys.exit(1)
