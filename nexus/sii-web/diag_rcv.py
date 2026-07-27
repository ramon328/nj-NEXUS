"""Diagnóstico del 401 del RCV. REUSA la sesión guardada — nunca hace login.

Prueba, en orden, las variantes de envío de cookies hacia www4.sii.cl (el host
del RCV) para saber cuál acepta el SII. Se detiene en la primera que funcione.
"""
import json
import sys
import time
import uuid

import requests

SESION = "data/empresas/3/session.json"
RUT, DV = "77271121", "2"
PERIODO = sys.argv[1] if len(sys.argv) > 1 else "202606"
OPERACION = sys.argv[2] if len(sys.argv) > 2 else "VENTA"

BASE = "https://www4.sii.cl/consdcvinternetui/services/data/facadeService"
NS = "cl.sii.sdi.lob.diii.consdcv.data.api.interfaces.FacadeService"
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")

ck = json.load(open(SESION))["cookies"]
print(f"Sesión de hace {(time.time() - json.load(open(SESION))['saved_at'])/60:.1f} min · TOKEN={ck['TOKEN'][:12]}…")


def intento(nombre, dominio):
    s = requests.Session()
    s.headers.update({"User-Agent": UA, "Accept-Language": "es-CL,es;q=0.9"})
    for k, v in ck.items():
        s.cookies.set(k, v, domain=dominio, path="/")

    # 1) Registrar contexto en la SPA del RCV (el SII espera este GET antes).
    r0 = s.get("https://www4.sii.cl/consdcvinternetui/", timeout=30)
    time.sleep(2)

    # 2) getResumen del periodo.
    data = {"rutEmisor": RUT, "dvEmisor": DV, "ptributario": PERIODO, "operacion": OPERACION}
    if OPERACION == "COMPRA":
        data["estadoContab"] = "REGISTRO"
    payload = {
        "metaData": {
            "namespace": f"{NS}/getResumen",
            "conversationId": ck["TOKEN"],
            "transactionId": str(uuid.uuid4()),
            "page": None,
        },
        "data": data,
    }
    r = s.post(f"{BASE}/getResumen", json=payload, timeout=30,
               headers={"Content-Type": "application/json",
                        "Accept": "application/json, text/plain, */*",
                        "Referer": "https://www4.sii.cl/consdcvinternetui/",
                        "Origin": "https://www4.sii.cl"})
    print(f"\n[{nombre}]  index={r0.status_code}  getResumen={r.status_code}")
    cuerpo = r.text[:300]
    print("  →", cuerpo.replace("\n", " ")[:280])
    if r.status_code == 200:
        try:
            j = r.json()
            md = j.get("metaData", {})
            print("  respEstado:", json.dumps(md.get("respEstado"), ensure_ascii=False)[:200])
            if j.get("data"):
                print(f"  ✅ DATA: {len(j['data'])} filas")
                return True
        except ValueError:
            pass
    return False


for nombre, dom in [(".sii.cl", ".sii.cl"), ("www4.sii.cl", "www4.sii.cl")]:
    if intento(nombre, dom):
        print(f"\n✅ Funciona con domain={dom}")
        break
    time.sleep(3)
