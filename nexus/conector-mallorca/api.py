#!/usr/bin/env python3
# api.py — API HTTP del conector Mallorca para que una app externa consuma el Excel.
#
# POR QUÉ: `mallorca.py` es un CLI (solo lectura del Excel global de Mallorca en OneDrive).
# Esta API es una capa fina HTTP encima de ese CLI: NO reimplementa nada, ejecuta el
# mismo `mallorca.py` ya probado y devuelve su JSON. Así una app (web/móvil) consume
# stock, ventas, márgenes y datos por patente con un simple GET protegido por token.
#
# AUTO-DESCARGA: cada request autenticado respeta el TTL de 6 min del conector (si la
# caché está vencida, se re-descarga el Excel solo y se borra el anterior). Además el
# endpoint /activar fuerza una descarga fresca — pensado para "al activar el token,
# baja el Excel de una". Con ?refrescar=1 cualquier endpoint fuerza la re-descarga.
#
# Sin dependencias nuevas: solo stdlib (http.server) + el venv que ya trae openpyxl.
#
# Arranque:  .venv/bin/python api.py            (puerto 7691 por defecto)
# Env:       MALLORCA_API_PORT, MALLORCA_API_TOKEN (si no, lee api_token.txt)
#
# Auth:  Header  Authorization: Bearer <token>   ó   ?token=<token>
#
# Endpoints (todos GET):
#   /mallorca/salud                      -> ping, sin auth
#   /mallorca/activar                    -> fuerza descarga fresca + estado de la caché
#   /mallorca/estado                     -> edad/fecha/tamaño de la caché (sin re-descargar)
#   /mallorca/stock       [?refrescar=1] -> stock valorizado (costo/total/PV)
#   /mallorca/ventas      [?mes=YYYY-MM] -> ventas y márgenes
#   /mallorca/auto        ?patente=XXXX  -> datos de un auto por patente
#   /mallorca/hojas                      -> mapa del libro (hojas + columnas)
#   /mallorca/hoja  ?nombre=..&limite=..&buscar=..

import os, sys, json, subprocess, datetime, hmac, time, threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

BASE = os.path.dirname(os.path.abspath(__file__))
PY = os.path.join(BASE, ".venv", "bin", "python")
if not os.path.exists(PY):
    PY = sys.executable
CLI = os.path.join(BASE, "mallorca.py")
CACHE = os.path.join(BASE, "cache", "mallorca.xlsx")
# Por seguridad escucha SOLO en localhost. Para abrirla a la red (Tailscale) hay que
# poner MALLORCA_API_HOST=0.0.0.0 a conciencia (sirve datos reales de Mallorca).
HOST = os.environ.get("MALLORCA_API_HOST", "127.0.0.1")
PORT = int(os.environ.get("MALLORCA_API_PORT", "7691"))
TIMEOUT = 120  # una descarga de OneDrive puede tardar; el CLI corta a 90s

# ── Endurecimiento: límite de peticiones + baneo por abuso + log ──────────────
# La única puerta pública es HTTPS (Tailscale Funnel) + token de 192 bits (imposible
# de adivinar). Esto es defensa en profundidad: frena fuerza bruta / abuso / DoS.
VENTANA = 60             # ventana de conteo de peticiones (seg)
MAX_REQ = 120            # tope de peticiones por IP por ventana
MAX_REQ_LOOP = 1200      # tope para loopback (Funnel comparte 127.0.0.1 entre todos)
FAIL_MAX = 8             # fallos de token por IP antes de banear
FAIL_VENTANA = 300       # ventana de conteo de fallos (seg)
BAN_SEG = 900            # baneo 15 min
GLOBAL_FAIL_MAX = 30     # cortacircuito global (Funnel enmascara las IPs tras 127.0.0.1)
GLOBAL_FAIL_VENTANA = 120
GLOBAL_COOLDOWN = 60
ACCESO_LOG = "/tmp/nexus-mallorca-api-access.log"

_lock = threading.Lock()
_hits, _fails, _bans = {}, {}, {}     # ip -> [ts...] / [ts...] / hasta_ts
_gfails, _gcooldown = [], [0.0]       # global: [ts...] / [hasta_ts]


def _poda(lst, ahora, ventana):
    return [t for t in lst if ahora - t < ventana]


def es_loopback(ip):
    # Tras Tailscale Funnel TODO el tráfico público llega como 127.0.0.1: no se puede
    # banear esa IP (tumbaría a todos). Para loopback solo aplica el cortacircuito global.
    return ip in ("127.0.0.1", "::1", "localhost", "?")


def ip_cliente(handler):
    xff = handler.headers.get("X-Forwarded-For", "")
    if xff:
        return xff.split(",")[0].strip()
    try:
        return handler.client_address[0]
    except Exception:
        return "?"


def limitado(ip):
    """Devuelve 'global'/'ban'/'rate' si hay que bloquear; None si pasa. Registra el hit."""
    ahora = time.time()
    with _lock:
        if ahora < _gcooldown[0]:
            return "global"
        if ahora < _bans.get(ip, 0):
            return "ban"
        h = _poda(_hits.get(ip, []), ahora, VENTANA)
        h.append(ahora)
        _hits[ip] = h
        tope = MAX_REQ_LOOP if es_loopback(ip) else MAX_REQ
        if len(h) > tope:
            return "rate"
    return None


def registrar_fallo(ip):
    ahora = time.time()
    with _lock:
        f = _poda(_fails.get(ip, []), ahora, FAIL_VENTANA)
        f.append(ahora)
        _fails[ip] = f
        if len(f) >= FAIL_MAX and not es_loopback(ip):
            _bans[ip] = ahora + BAN_SEG   # nunca se banea loopback (evita auto-DoS por Funnel)
        g = _poda(_gfails, ahora, GLOBAL_FAIL_VENTANA)
        g.append(ahora)
        _gfails[:] = g
        if len(g) >= GLOBAL_FAIL_MAX:
            _gcooldown[0] = ahora + GLOBAL_COOLDOWN


def log_acceso(ip, metodo, ruta, status):
    try:
        with open(ACCESO_LOG, "a", encoding="utf-8") as f:
            f.write(f"{datetime.datetime.now().isoformat(timespec='seconds')} {ip} {metodo} {ruta} {status}\n")
    except Exception:
        pass


def token_esperado():
    t = os.environ.get("MALLORCA_API_TOKEN")
    if t:
        return t.strip()
    try:
        with open(os.path.join(BASE, "api_token.txt"), "r", encoding="utf-8") as f:
            return f.read().strip()
    except Exception:
        return ""


def correr_cli(args):
    """Ejecuta `mallorca.py <args>` en el venv y devuelve (status, obj_json)."""
    try:
        p = subprocess.run([PY, CLI, *args], capture_output=True, text=True, timeout=TIMEOUT)
    except subprocess.TimeoutExpired:
        return 504, {"error": "El conector tardó demasiado (descarga de OneDrive lenta o link caído)."}
    salida = (p.stdout or "").strip()
    if not salida:
        return 502, {"error": "El conector no devolvió datos", "detalle": (p.stderr or "").strip()[:500]}
    try:
        obj = json.loads(salida)
    except Exception:
        return 502, {"error": "Respuesta no-JSON del conector", "crudo": salida[:500]}
    # el CLI mete {"error": ...} cuando algo falla (link caído, hoja inexistente, etc.)
    return (200 if "error" not in obj else 400), obj


def estado_cache():
    if not os.path.exists(CACHE):
        return {"existe": False, "aviso": "Sin caché aún; se baja al primer consumo."}
    mt = os.path.getmtime(CACHE)
    edad = datetime.datetime.now().timestamp() - mt
    return {
        "existe": True,
        "actualizado": datetime.datetime.fromtimestamp(mt).strftime("%Y-%m-%d %H:%M:%S"),
        "edad_min": round(edad / 60, 1),
        "vigente": edad < 6 * 60,
        "tamano_kb": round(os.path.getsize(CACHE) / 1024, 1),
    }


# Mapea ruta -> (subcomando CLI, [params de query que se pasan como --flag])
RUTAS = {
    "stock":  ("stock",  []),
    "ventas": ("ventas", ["mes"]),
    "auto":   ("auto",   ["patente"]),
    "hojas":  ("hojas",  []),
    "hoja":   ("hoja",   ["nombre", "limite", "buscar"]),
}


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a):  # silencio (o redirigir a archivo si se quiere)
        pass

    def _json(self, status, obj):
        cuerpo = json.dumps(obj, ensure_ascii=False, default=str).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Authorization, Content-Type")
        self.send_header("Content-Length", str(len(cuerpo)))
        self.end_headers()
        self.wfile.write(cuerpo)

    def _autorizado(self, qs):
        esperado = token_esperado()
        if not esperado:
            return False  # sin token configurado, no se sirve nada
        auth = self.headers.get("Authorization", "")
        dado = auth[7:].strip() if auth.lower().startswith("bearer ") else ""
        if not dado:
            dado = (qs.get("token", [""])[0]).strip()
        if not dado:
            return False
        return hmac.compare_digest(dado, esperado)  # comparación a prueba de timing

    def do_OPTIONS(self):
        self._json(204, {})

    def do_GET(self):
        # Nada acá puede tumbar el server: todo va envuelto y se responde siempre.
        ip = ip_cliente(self)
        try:
            u = urlparse(self.path)
            ruta = u.path.rstrip("/")
        except Exception:
            return self._json(400, {"error": "Petición inválida"})

        lim = limitado(ip)
        if lim:
            log_acceso(ip, "GET", getattr(self, "path", "?"), f"429/{lim}")
            return self._json(429, {"error": "Demasiadas peticiones. Espera un momento."})

        try:
            status, obj = self._manejar(ip, u, ruta)
        except Exception as e:
            status, obj = 500, {"error": "Error interno", "detalle": str(e)[:200]}
        log_acceso(ip, "GET", ruta, status)
        return self._json(status, obj)

    def _manejar(self, ip, u, ruta):
        """Resuelve la ruta y devuelve (status, obj). Nunca escribe la respuesta."""
        qs = parse_qs(u.query)

        # salud pública: mínima, sin filtrar metadatos de la caché
        if ruta in ("/mallorca/salud", "/salud", "", "/"):
            return 200, {"ok": True, "servicio": "conector-mallorca"}

        # de aquí en adelante todo pide token
        if not self._autorizado(qs):
            registrar_fallo(ip)
            return 401, {"error": "No autorizado. Manda Authorization: Bearer <token> o ?token=<token>."}

        if ruta in ("/mallorca/estado", "/estado"):
            return 200, {"cache": estado_cache()}

        if ruta in ("/mallorca/activar", "/activar"):
            # al activar el token: baja el Excel fresco de una y devuelve el estado
            st, obj = correr_cli(["refrescar"])
            return st, {"activado": st == 200, "resultado": obj, "cache": estado_cache()}

        nombre = ruta.split("/")[-1]
        if nombre in RUTAS:
            sub, params = RUTAS[nombre]
            args = [sub]
            for p in params:
                v = (qs.get(p, [""])[0]).strip()
                if v:
                    args += [f"--{p}", v]
            if qs.get("refrescar", [""])[0] in ("1", "true", "si", "sí"):
                args.append("--refrescar")
            return correr_cli(args)

        return 404, {"error": "Ruta no encontrada",
                     "rutas": ["/mallorca/salud", "/mallorca/activar", "/mallorca/estado",
                               "/mallorca/stock", "/mallorca/ventas", "/mallorca/auto",
                               "/mallorca/hojas", "/mallorca/hoja"]}


class Servidor(ThreadingHTTPServer):
    allow_reuse_address = True   # evita "Address already in use" al reiniciar rápido
    daemon_threads = True        # los hilos de request no bloquean el cierre

    def handle_error(self, request, client_address):
        # un error en un request jamás debe tumbar el server; se traga y sigue
        pass


def main():
    if not token_esperado():
        print("AVISO: no hay token (api_token.txt ni MALLORCA_API_TOKEN). La API no servirá datos.", file=sys.stderr)
    # Lazo de auto-recuperación: si serve_forever muere por algo inesperado, reabre.
    while True:
        try:
            srv = Servidor((HOST, PORT), Handler)
            print(f"conector-mallorca API escuchando en http://{HOST}:{PORT}  (rutas bajo /mallorca)")
            srv.serve_forever()
        except KeyboardInterrupt:
            try:
                srv.shutdown()
            except Exception:
                pass
            break
        except Exception as e:
            print(f"[mallorca-api] server cayó ({e}); reintento en 3s", file=sys.stderr)
            time.sleep(3)


if __name__ == "__main__":
    main()
