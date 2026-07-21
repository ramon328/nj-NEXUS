"""Cifrado simétrico de las claves tributarias guardadas (Fernet/AES).

La clave del SII se guarda CIFRADA en la base. El backend la descifra solo en el
momento de iniciar sesión en el SII. La llave de cifrado vive únicamente en la
variable de entorno ENCRYPTION_KEY (jamás en la base ni en el repo): así, aunque
alguien robe un dump completo de la base, sin esa llave las claves son ilegibles.

Genera una llave (hazlo TÚ, no la compartas, pégala solo en Render):
    python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
"""
from __future__ import annotations

import logging
import os

log = logging.getLogger("crypto")

# Prefijo que marca un valor cifrado, para poder convivir con valores antiguos
# guardados en claro (y migrarlos sin romper nada).
_PREFIX = "enc:v1:"


def _fernet():
    key = os.getenv("ENCRYPTION_KEY", "").strip()
    if not key:
        return None
    from cryptography.fernet import Fernet
    return Fernet(key.encode())


def encrypt(value: str) -> str:
    """Cifra un valor. Sin ENCRYPTION_KEY lo deja en claro (solo uso local)."""
    if value is None:
        return value
    f = _fernet()
    if f is None:
        log.warning("ENCRYPTION_KEY no definida: la clave se guarda SIN cifrar.")
        return value
    return _PREFIX + f.encrypt(value.encode()).decode()


def decrypt(value: str) -> str:
    """Descifra un valor producido por encrypt(). Tolera valores en claro."""
    if not value or not value.startswith(_PREFIX):
        return value  # valor en claro (guardado sin llave) → se devuelve igual
    f = _fernet()
    if f is None:
        log.error("Hay un valor cifrado pero falta ENCRYPTION_KEY para descifrarlo.")
        return value
    return f.decrypt(value[len(_PREFIX):].encode()).decode()
