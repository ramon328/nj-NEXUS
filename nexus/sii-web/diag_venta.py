"""Por qué el RCV devuelve 0 ventas si el F29 declara 13 facturas emitidas.
REUSA la sesión guardada — no hace login. Prueba variantes del payload.
"""
import json
import time
import uuid

import requests

SES = "data/empresas/3/session.json"
RUT, DV = "77271121", "2"
PERIODO = "202605"          # el F29 de este mes declara 13 facturas emitidas
BASE = "https://www4.sii.cl/consdcvinternetui/services/data/facadeService"
NS = "cl.sii.sdi.lob.diii.consdcv.data.api.interfaces.FacadeService"
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")

ck = json.load(open(SES))["cookies"]
s = requests.Session()
s.headers.update({"User-Agent": UA, "Accept-Language": "es-CL,es;q=0.9"})
for k, v in ck.items():
    s.cookies.set(k, v, domain=".sii.cl", path="/")
s.get("https://www4.sii.cl/consdcvinternetui/", timeout=30)
time.sleep(2)

H = {"Content-Type": "application/json", "Accept": "application/json, text/plain, */*",
     "Referer": "https://www4.sii.cl/consdcvinternetui/", "Origin": "https://www4.sii.cl"}


def llamar(op, data, etiqueta):
    payload = {"metaData": {"namespace": f"{NS}/{op}", "conversationId": ck["TOKEN"],
                            "transactionId": str(uuid.uuid4()), "page": None}, "data": data}
    r = s.post(f"{BASE}/{op}", json=payload, timeout=40, headers=H)
    print(f"\n▸ {etiqueta}")
    print(f"  HTTP {r.status_code}")
    if r.status_code != 200:
        print("  ", r.text[:200].replace("\n", " "))
        return None
    try:
        j = r.json()
    except ValueError:
        print("   no-JSON:", r.text[:200])
        return None
    d = j.get("data")
    md = j.get("metaData") or {}
    if md.get("errors") or md.get("respEstado"):
        print("   metaData:", json.dumps(md.get("errors") or md.get("respEstado"), ensure_ascii=False)[:200])
    if isinstance(d, list):
        print(f"   data: {len(d)} filas   totDocRes={j.get('totDocRes')}")
        if d:
            print("   1ª fila:", json.dumps(d[0], ensure_ascii=False)[:260])
    else:
        print("   data:", json.dumps(d, ensure_ascii=False)[:200])
    # claves de nivel superior distintas de data (a veces la info va aparte)
    otras = {k: v for k, v in j.items() if k not in ("data", "metaData") and not isinstance(v, (list, dict))}
    if otras:
        print("   otras claves:", json.dumps(otras, ensure_ascii=False)[:220])
    if j.get("dataCabecera"):
        print("   cabecera:", json.dumps(j["dataCabecera"], ensure_ascii=False)[:240])
    return j


print("=" * 70)
print("CONTROL — COMPRA (sabemos que funciona)")
llamar("getResumen", {"rutEmisor": RUT, "dvEmisor": DV, "ptributario": PERIODO,
                      "operacion": "COMPRA", "estadoContab": "REGISTRO"}, "COMPRA + estadoContab")
time.sleep(2.5)

print("\n" + "=" * 70)
print("VENTA — variantes del payload")

variantes = [
    ({"rutEmisor": RUT, "dvEmisor": DV, "ptributario": PERIODO, "operacion": "VENTA"},
     "VENTA tal como lo manda hoy sii-web (sin estadoContab)"),
    ({"rutEmisor": RUT, "dvEmisor": DV, "ptributario": PERIODO, "operacion": "VENTA",
      "estadoContab": "REGISTRO"},
     "VENTA + estadoContab=REGISTRO"),
    ({"rutEmisor": RUT, "dvEmisor": DV, "ptributario": PERIODO, "operacion": "VENTA",
      "estadoContab": "PENDIENTE"},
     "VENTA + estadoContab=PENDIENTE"),
    ({"rutEmisor": RUT, "dvEmisor": DV, "ptributario": PERIODO, "operacion": "VENTA",
      "tipoDoc": "0"},
     "VENTA + tipoDoc=0"),
]
for data, etq in variantes:
    llamar("getResumen", data, etq)
    time.sleep(2.5)

print("\n" + "=" * 70)
print("VENTA — detalle directo, saltándose el resumen")
for cod in (33, 34, 39, 61):
    llamar("getDetalleVentaExport",
           {"rutEmisor": RUT, "dvEmisor": DV, "ptributario": PERIODO,
            "codTipoDoc": cod, "operacion": "VENTA", "estadoContab": "REGISTRO"},
           f"getDetalleVentaExport codTipoDoc={cod}")
    time.sleep(2.5)
