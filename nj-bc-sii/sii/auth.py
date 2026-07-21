"""Autenticación en el SII con RUT + Clave Tributaria.

El SII autentica contra el CGI clásico (CAutInicio.cgi), que deja cookies de
sesión (TOKEN, NETSCAPE_LIVEWIRE.*) reutilizables por el resto de los
servicios (RCV, formularios, carpeta tributaria).

⚠️ El SII cambia este formulario de tanto en tanto. Si el login deja de
funcionar, este es el único archivo que hay que ajustar: revisa los campos
del <form> en https://zeusr.sii.cl/cgi_AUT2000/CAutInicio.cgi con el inspector
del navegador y actualiza LOGIN_FIELDS.
"""
from __future__ import annotations

import json
import logging
import time
from pathlib import Path

from . import rut as rututil
from .client import SiiClient

log = logging.getLogger("sii.auth")

LOGIN_URL = "https://zeusr.sii.cl/cgi_AUT2000/CAutInicio.cgi"
# Host alternativo si zeusr falla:  https://herculesr.sii.cl/cgi_AUT2000/CAutInicio.cgi
HOME_URL = "https://misiir.sii.cl/cgi_misii/siihome.cgi"

# Archivo donde se guarda la sesión para reutilizarla (NO se loguea cada vez).
SESSION_FILE = Path(__file__).resolve().parent.parent / "sii_session.json"

# ─── Circuit breaker anti-bloqueo ────────────────────────────────────────
# Lo ÚNICO que bloquea la cuenta del SII son logins fallidos repetidos. Para
# que el sistema NUNCA gatille eso: tras un fallo, se impone una pausa y, tras
# varios fallos, se bloquea hasta que el usuario actualice la clave.
LOGIN_COOLDOWN = 1800        # seg. de pausa obligatoria tras un login fallido
MAX_LOGIN_FALLOS = 3         # tope de intentos antes de exigir actualizar clave


class AuthError(RuntimeError):
    pass


class LoginBloqueado(AuthError):
    """No se intenta loguear: protección anti-bloqueo activa."""


def _guard_path(session_file: Path) -> Path:
    return Path(session_file).with_name(Path(session_file).stem + ".loginguard.json")


def _leer_guard(session_file: Path) -> dict:
    p = _guard_path(session_file)
    if p.exists():
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except (ValueError, OSError):
            pass
    return {"fallos": 0, "ultimo_fallo": 0.0}


def reset_login_guard(session_file: Path = SESSION_FILE) -> None:
    """Limpia el bloqueo (llamar al actualizar la clave o tras un login OK)."""
    p = _guard_path(session_file)
    if p.exists():
        try:
            p.unlink()
        except OSError:
            pass


def ensure_session(client: SiiClient, rut: str, clave: str,
                   session_file: Path = SESSION_FILE, force: bool = False) -> SiiClient:
    """Reutiliza la sesión guardada si sigue viva; solo loguea si hace falta.

    Entrada recomendada: minimiza logins (evita bloqueos del SII) y aplica el
    circuit breaker — nunca reintenta un login que falló sin que el usuario
    intervenga.
    """
    if not force and client.load_cookies(session_file) and not client.exp_pasada():
        client.promover_dominio_sii()   # cookies a .sii.cl → llegan a www4 (RCV)
        if is_authenticated(client):
            # Re-guardar: actualiza saved_at (y cualquier cookie que el SII haya
            # renovado) para que el estado refleje que la sesión sigue VIVA. Sin
            # esto, el badge mostraba "expirada" aunque la sesión funcionara.
            client.save_cookies(session_file)
            log.info("✅ Sesión reutilizada (sin nuevo login).")
            return client

    # Circuit breaker: revisar si estamos en pausa/bloqueo por fallos previos.
    guard = _leer_guard(session_file)
    if guard["fallos"] >= MAX_LOGIN_FALLOS:
        raise LoginBloqueado(
            f"Login BLOQUEADO por seguridad tras {guard['fallos']} intentos "
            "fallidos. Verifica y ACTUALIZA la clave para reintentar "
            "(el SII bloquea cuentas por logins fallidos repetidos)."
        )
    espera = LOGIN_COOLDOWN - (time.time() - guard.get("ultimo_fallo", 0))
    if guard.get("ultimo_fallo") and espera > 0:
        raise LoginBloqueado(
            f"Login en pausa de seguridad tras un fallo previo. Reintenta en "
            f"~{int(espera // 60) + 1} min, o actualiza la clave si estaba mal."
        )

    log.info("No hay sesión válida guardada — se hará un único login.")
    try:
        login(client, rut, clave)
    except AuthError:
        # Registrar el fallo para frenar reintentos automáticos.
        g = _leer_guard(session_file)
        _guard_path(session_file).write_text(
            json.dumps({"fallos": g["fallos"] + 1, "ultimo_fallo": time.time()}),
            encoding="utf-8")
        log.warning("Login fallido registrado (%d/%d) — pausa anti-bloqueo activa.",
                    g["fallos"] + 1, MAX_LOGIN_FALLOS)
        raise
    reset_login_guard(session_file)   # login OK → limpiar contador
    client.promover_dominio_sii()     # cookies a .sii.cl → el RCV (www4) recibe TOKEN
    client.save_cookies(session_file)
    return client


def is_authenticated(client: SiiClient) -> bool:
    """Comprueba si las cookies actuales siguen autenticadas (1 GET liviano)."""
    if not client.token:
        return False
    try:
        resp = client.get(HOME_URL, allow_redirects=True)
    except Exception:  # noqa: BLE001
        return False
    # Si la sesión murió, el SII redirige al formulario de login.
    return "cautinicio" not in resp.url.lower() and resp.status_code == 200


def login(client: SiiClient, rut: str, clave: str) -> SiiClient:
    """Inicia sesión y deja las cookies en client.session. Devuelve el client."""
    rut_completo = rututil.clean(rut)
    cuerpo, dv = rututil.split(rut_completo)

    if not rututil.is_valid(rut_completo):
        raise AuthError(f"RUT inválido: {rut}")

    # Campos del formulario de login del SII.
    payload = {
        "rut": cuerpo,
        "dv": dv,
        "rutcntr": rut_completo,
        "clave": clave,
        "referencia": HOME_URL,
        "411": "",
    }
    headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "Origin": "https://zeusr.sii.cl",
        "Referer": LOGIN_URL,
    }

    log.info("Autenticando RUT %s en el SII…", rut_completo)
    resp = client.post(LOGIN_URL, data=payload, headers=headers, allow_redirects=True)

    if not _login_ok(client, resp):
        raise AuthError(
            "Login rechazado. Verifica RUT/Clave, o revisa si el SII cambió el "
            "formulario (ver instrucciones en sii/auth.py)."
        )

    log.info("Sesión iniciada correctamente.")
    return client


def _login_ok(client: SiiClient, resp) -> bool:
    """Heurística de éxito: cookie de sesión presente y sin mensajes de error."""
    cookies = client.session.cookies.get_dict()
    tiene_token = any(k.upper().startswith(("TOKEN", "NETSCAPE")) for k in cookies)

    texto = (resp.text or "").lower()
    error_visible = any(
        msg in texto
        for msg in ("clave incorrecta", "rut o clave", "no coinciden", "intente nuevamente")
    )
    return tiene_token and not error_visible
