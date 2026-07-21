#!/usr/bin/env python3
"""Descarga el PDF de UNA Boleta de Honorarios Electrónica RECIBIDA por una empresa,
filtrando por emisor (nombre o RUT), en un mes/año. Reusa la sesión guardada del
extractor (throttle + un solo login si hace falta → anti-bloqueo).

Uso:
  descargar_boleta.py --empresa <rut|id> --anio 2026 --mes 6 --emisor "Ramón" --out /tmp/b.pdf

Imprime en stdout UNA línea JSON:
  {"ok":true,"pdf":"/tmp/b.pdf","boleta":{...}}
  {"ok":false,"error":"...","candidatos":[{nombre,rut,folio,fecha},...]}
"""
from __future__ import annotations
import argparse, json, re, sys, unicodedata
from pathlib import Path

import db
from sii import auth
from sii.client import SiiClient
from sii.rate_limit import Throttle

BASE = "https://loa.sii.cl/cgi_IMT"

def _norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", str(s or "")).encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", s).strip().upper()

def _digs(s: str) -> str:
    return re.sub(r"\D", "", str(s or ""))

def _fail(msg, **extra):
    print(json.dumps({"ok": False, "error": msg, **extra}, ensure_ascii=False))
    sys.exit(0)

def _find_empresa(ref: str) -> dict:
    ref = str(ref).strip()
    emps = db.listar_empresas()
    # por id
    if ref.isdigit():
        for e in emps:
            if str(e["id"]) == ref:
                return db.obtener_empresa(e["id"], con_clave=True)
    # por rut (normalizado a solo dígitos del cuerpo)
    objetivo = _digs(ref.split("-")[0]) if "-" in ref else _digs(ref)[:-1] or _digs(ref)
    for e in emps:
        cuerpo = _digs(str(e["rut"]).split("-")[0])
        if cuerpo == objetivo or _digs(e["rut"]).startswith(objetivo):
            return db.obtener_empresa(e["id"], con_clave=True)
    # por nombre
    rn = _norm(ref)
    for e in emps:
        if rn and rn in _norm(e["nombre"]):
            return db.obtener_empresa(e["id"], con_clave=True)
    _fail(f"No encontré la empresa '{ref}' en el extractor SII.",
          empresas=[{"id": e["id"], "nombre": e["nombre"], "rut": e["rut"]} for e in emps])

def _cliente(emp: dict) -> SiiClient:
    sf = Path("data/empresas") / str(emp["id"]) / "session.json"
    sf.parent.mkdir(parents=True, exist_ok=True)
    cli = SiiClient(Throttle(2.5, 6.0), max_retries=3)
    # reusa si vive; si no, UN login con la clave guardada
    if cli.load_cookies(sf):
        cli.promover_dominio_sii()
        try:
            if auth.is_authenticated(cli):
                # confirma acceso al portal de boletas (loa)
                r = cli.get(f"{BASE}/TMBCOC_MenuConsultasContribRec.cgi", allow_redirects=True)
                if "cbanoinformeanual" in r.text.lower():
                    cli.save_cookies(sf)
                    return cli
        except Exception:
            pass
    if not emp.get("clave"):
        _fail(f"La sesión SII de {emp['nombre']} venció y no hay clave guardada; pídele la Clave Tributaria a Ramón.")
    auth.ensure_session(cli, emp["rut"], emp["clave"], session_file=sf, force=True)
    return cli

def _boletas_mes(cli: SiiClient, rut_cuerpo: str, dv: str, anio: int, mes: int) -> list[dict]:
    url = (f"{BASE}/TMBCOC_InformeMensualBheRec.cgi?cbanoinformemensual={anio}"
           f"&cbmesinformemensual={mes:02d}&dv_arrastre={dv}&pagina_solicitada=0&rut_arrastre={rut_cuerpo}")
    r = cli.get(url, allow_redirects=True)
    if "ingresorutclave" in r.text.lower():
        _fail("La sesión SII no está activa para el portal de boletas.")
    arr = dict(re.findall(r"arr_informe_mensual\[\s*'([^']+)'\s*\]\s*=\s*\"([^\"]*)\"", r.text))
    idxs = sorted(set(int(m.group(1)) for k in arr if (m := re.search(r"_(\d+)$", k))))
    out = []
    for i in idxs:
        nom = arr.get(f"nombre_emisor_{i}", "").strip()
        if not nom:
            continue
        out.append({
            "i": i, "nombre": nom,
            "rut": f"{arr.get(f'rutemisor_{i}','')}-{arr.get(f'dvemisor_{i}','')}",
            "folio": arr.get(f"nroboleta_{i}", ""), "fecha": arr.get(f"fecha_boleta_{i}", ""),
            "estado": arr.get(f"estado_{i}", ""),
            "codigobarras": arr.get(f"codigobarras_{i}", ""), "cod_comuna": arr.get(f"cod_comuna_{i}", ""),
        })
    return out

def _descargar_pdf(cli: SiiClient, anio: int, mes: int, rut_cuerpo: str, dv: str, cod_barra: str, cod_comuna: str, out: Path) -> bool:
    from playwright.sync_api import sync_playwright
    det = (f"{BASE}/TMBCOC_InformeMensualBheRec.cgi?cbanoinformemensual={anio}"
           f"&cbmesinformemensual={mes:02d}&dv_arrastre={dv}&pagina_solicitada=0&rut_arrastre={rut_cuerpo}")
    cookies = [{"name": ck.name, "value": ck.value, "domain": ".sii.cl", "path": "/"} for ck in cli.session.cookies]
    with sync_playwright() as p:
        b = p.chromium.launch(headless=True)
        ctx = b.new_context(locale="es-CL", accept_downloads=True)
        ctx.add_cookies(cookies)
        pg = ctx.new_page()
        pg.goto(det, wait_until="domcontentloaded", timeout=60000)
        pg.wait_for_timeout(2000)
        ok = False
        try:
            with pg.expect_download(timeout=45000) as di:
                pg.evaluate(f"ObtenerBoletaPdf('{cod_barra}','{cod_comuna}')")
            di.value.save_as(str(out)); ok = True
        except Exception:
            cap = {}
            pg.on("response", lambda r: cap.__setitem__("b", r) if "ConsultaBoletaPdf" in r.url else None)
            pg.evaluate(f"ObtenerBoletaPdf('{cod_barra}','{cod_comuna}')")
            pg.wait_for_timeout(5000)
            if cap.get("b"):
                try:
                    out.write_bytes(cap["b"].body()); ok = True
                except Exception:
                    pass
        b.close()
    return ok and out.exists() and out.read_bytes()[:4] == b"%PDF"

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--empresa", required=True)
    ap.add_argument("--anio", type=int, required=True)
    ap.add_argument("--mes", type=int, required=True)
    ap.add_argument("--emisor", required=True)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    if not (1 <= a.mes <= 12):
        _fail("Mes inválido (1-12).")

    emp = _find_empresa(a.empresa)
    rut_cuerpo = _digs(str(emp["rut"]).split("-")[0])
    dv = str(emp["rut"]).split("-")[-1]
    cli = _cliente(emp)
    boletas = _boletas_mes(cli, rut_cuerpo, dv, a.anio, a.mes)
    if not boletas:
        _fail(f"{emp['nombre']} no tiene boletas de honorarios recibidas en {a.mes:02d}/{a.anio}.")

    # filtrar por emisor (nombre contiene, o rut coincide)
    q_nom = _norm(a.emisor)
    q_dig = _digs(a.emisor)
    cand = [b for b in boletas if (q_nom and q_nom in _norm(b["nombre"])) or (len(q_dig) >= 7 and _digs(b["rut"]).startswith(q_dig[:-1] if len(q_dig) > 7 else q_dig))]
    resumen = [{"nombre": b["nombre"], "rut": b["rut"], "folio": b["folio"], "fecha": b["fecha"]} for b in boletas]
    if not cand:
        _fail(f"No encontré una boleta de '{a.emisor}' en {a.mes:02d}/{a.anio} para {emp['nombre']}.", candidatos=resumen)
    if len(cand) > 1:
        _fail(f"Hay {len(cand)} boletas que calzan con '{a.emisor}'; especifica el RUT.",
              candidatos=[{"nombre": b["nombre"], "rut": b["rut"], "folio": b["folio"], "fecha": b["fecha"]} for b in cand])

    b = cand[0]
    out = Path(a.out)
    if not _descargar_pdf(cli, a.anio, a.mes, rut_cuerpo, dv, b["codigobarras"], b["cod_comuna"], out):
        _fail("Encontré la boleta pero no pude bajar el PDF (reintenta en un momento).",
              boleta={"nombre": b["nombre"], "rut": b["rut"], "folio": b["folio"], "fecha": b["fecha"]})
    print(json.dumps({"ok": True, "pdf": str(out), "empresa": emp["nombre"],
                      "boleta": {"emisor": b["nombre"], "rut": b["rut"], "folio": b["folio"],
                                 "fecha": b["fecha"], "anio": a.anio, "mes": a.mes}}, ensure_ascii=False))

if __name__ == "__main__":
    main()
