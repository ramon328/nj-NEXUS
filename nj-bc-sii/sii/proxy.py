"""Proxy de salida hacia el SII (opcional).

El SII bloquea por IP las conexiones automatizadas/de datacenter (timeouts).
Cuando el backend corre en la nube (Render, IP de EE.UU.), enrutamos TODO el
tráfico al SII por un proxy con IP residencial chilena → el SII lo ve "normal".

Se activa SOLO si la variable de entorno `SII_PROXY` está seteada. Si no, el
sistema funciona igual que siempre (conexión directa, ideal en local en Chile).

Formato:  SII_PROXY=http://usuario:clave@host:puerto   (auth opcional)
          SII_PROXY=http://host:puerto                 (sin auth)

Lo usan los DOS caminos de conexión al SII:
  - requests (sii/client.py)        → requests_proxies()
  - Playwright (sii/carpeta.py)     → playwright_proxy()

También centraliza los flags de Chromium para que arranque dentro de un
contenedor (Render/Docker) → chromium_args().
"""
from __future__ import annotations

import os
from urllib.parse import unquote, urlparse


def proxy_url() -> str | None:
    """URL del proxy desde el entorno, o None si no hay proxy configurado."""
    return os.getenv("SII_PROXY", "").strip() or None


def requests_proxies() -> dict | None:
    """Dict de proxies para requests.Session.proxies (o None si no hay proxy)."""
    url = proxy_url()
    return {"http": url, "https": url} if url else None


def playwright_proxy() -> dict | None:
    """Config de proxy para Playwright launch(proxy=...) (o None si no hay).

    Playwright exige el servidor sin credenciales en `server` y el usuario/clave
    aparte, por eso parseamos la URL (que sí puede traer user:pass embebidos).
    """
    url = proxy_url()
    if not url:
        return None
    p = urlparse(url)
    server = f"{p.scheme}://{p.hostname}"
    if p.port:
        server += f":{p.port}"
    cfg: dict = {"server": server}
    # unquote: si la clave trae caracteres reservados (%40 = @), requests los
    # decodifica solo; Playwright no, así que lo hacemos aquí para que coincidan.
    if p.username:
        cfg["username"] = unquote(p.username)
    if p.password:
        cfg["password"] = unquote(p.password)
    return cfg


def chromium_args() -> list[str]:
    """Flags para que Chromium arranque dentro de un contenedor (Render/Docker).

    Sin --no-sandbox el proceso no inicia como root sin user-namespaces; sin
    --disable-dev-shm-usage el /dev/shm de 64 MB del contenedor revienta. Son
    inofensivos en local (Mac), así que se usan siempre.
    """
    return ["--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]
