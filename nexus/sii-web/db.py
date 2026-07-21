"""Persistencia local de empresas y documentos descargados (SQLite, stdlib).

Reemplaza el flujo de una sola empresa por `.env`: ahora cada empresa vive en
la base `app.db` con su propio RUT/clave y carpeta de datos. Como la app corre
SOLO en local (un único usuario en su Mac), las claves se guardan en claro en
la base, igual que antes vivían en claro en `.env`. El archivo `app.db` está
en `.gitignore`.
"""
from __future__ import annotations

import sqlite3
import time
from pathlib import Path

DB_PATH = Path(__file__).resolve().parent / "app.db"


def _conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db() -> None:
    with _conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS empresas (
                id              INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre          TEXT NOT NULL,
                rut             TEXT NOT NULL UNIQUE,
                clave           TEXT NOT NULL,
                creada_en       REAL NOT NULL,
                conectada_en    REAL,
                estado          TEXT NOT NULL DEFAULT 'sin_probar'
            )
            """
        )


# ─── Empresas ────────────────────────────────────────────────────────────
def listar_empresas() -> list[dict]:
    with _conn() as conn:
        rows = conn.execute(
            "SELECT id, nombre, rut, creada_en, conectada_en, estado "
            "FROM empresas ORDER BY creada_en DESC"
        ).fetchall()
    return [dict(r) for r in rows]


def obtener_empresa(empresa_id: int, con_clave: bool = False) -> dict | None:
    cols = "id, nombre, rut, clave, creada_en, conectada_en, estado" if con_clave \
        else "id, nombre, rut, creada_en, conectada_en, estado"
    with _conn() as conn:
        row = conn.execute(
            f"SELECT {cols} FROM empresas WHERE id = ?", (empresa_id,)
        ).fetchone()
    return dict(row) if row else None


def crear_empresa(nombre: str, rut: str, clave: str) -> dict:
    with _conn() as conn:
        cur = conn.execute(
            "INSERT INTO empresas (nombre, rut, clave, creada_en, estado) "
            "VALUES (?, ?, ?, ?, 'sin_probar')",
            (nombre, rut, clave, time.time()),
        )
        empresa_id = cur.lastrowid
    return obtener_empresa(empresa_id)  # type: ignore[return-value]


def actualizar_estado(empresa_id: int, estado: str, conectada: bool = False) -> None:
    with _conn() as conn:
        if conectada:
            conn.execute(
                "UPDATE empresas SET estado = ?, conectada_en = ? WHERE id = ?",
                (estado, time.time(), empresa_id),
            )
        else:
            conn.execute(
                "UPDATE empresas SET estado = ? WHERE id = ?", (estado, empresa_id)
            )


def actualizar_credenciales(empresa_id: int, nombre: str, clave: str | None) -> None:
    with _conn() as conn:
        if clave:
            conn.execute(
                "UPDATE empresas SET nombre = ?, clave = ? WHERE id = ?",
                (nombre, clave, empresa_id),
            )
        else:
            conn.execute(
                "UPDATE empresas SET nombre = ? WHERE id = ?", (nombre, empresa_id)
            )


def eliminar_empresa(empresa_id: int) -> None:
    with _conn() as conn:
        conn.execute("DELETE FROM empresas WHERE id = ?", (empresa_id,))
