"""Utilidades para manejar el RUT chileno."""
from __future__ import annotations

import re


def clean(rut: str) -> str:
    """Quita puntos y espacios. Mantiene el guion y el DV. -> '12345678-5'."""
    rut = rut.strip().replace(".", "").replace(" ", "").upper()
    if "-" not in rut and len(rut) > 1:
        rut = f"{rut[:-1]}-{rut[-1]}"
    return rut


def split(rut: str) -> tuple[str, str]:
    """Devuelve (cuerpo, dv). '12.345.678-5' -> ('12345678', '5')."""
    r = clean(rut)
    cuerpo, _, dv = r.partition("-")
    return cuerpo, dv


def compute_dv(cuerpo: str) -> str:
    """Calcula el dígito verificador con el algoritmo módulo 11."""
    reversed_digits = map(int, reversed(cuerpo))
    factors = [2, 3, 4, 5, 6, 7]
    total = sum(d * factors[i % 6] for i, d in enumerate(reversed_digits))
    resto = 11 - (total % 11)
    if resto == 11:
        return "0"
    if resto == 10:
        return "K"
    return str(resto)


def is_valid(rut: str) -> bool:
    """Valida formato y dígito verificador."""
    r = clean(rut)
    if not re.fullmatch(r"\d{1,8}-[\dkK]", r):
        return False
    cuerpo, dv = split(r)
    return compute_dv(cuerpo) == dv
