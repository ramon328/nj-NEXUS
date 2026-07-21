"""Emisión de DTE (facturas electrónicas) para una empresa del SII.

⚠️  OJO: a diferencia del resto del sistema (que SOLO descarga documentos),
esto crearía documentos tributarios REALES e IRREVERSIBLES (consume folio,
llega al receptor, queda en el SII). Por eso el módulo está partido en dos:

  • preparar()  → valida los datos y arma el BORRADOR (neto / IVA / total).
                  NO toca el SII. Es puro y determinista: se puede llamar mil
                  veces sin consecuencia. Es lo que Martes muestra para pedir OK.

  • emitir()    → la emisión REAL. Está BLINDADA: solo procede si la emisión
                  está habilitada (SII_EMISION_HABILITADA=1) Y la empresa tiene
                  su configuración de emisor completa (certificado + folios/CAF
                  o proveedor). Mientras falte cualquier pieza NUNCA emite:
                  devuelve exactamente qué falta. Así no se puede emitir por
                  accidente ni a medias.

El objetivo es que Martes (el agente SII) pueda armar y mostrar la factura hoy
mismo, y que el "go-live" sea un único paso de configuración supervisado.
"""
from __future__ import annotations

import os
import re
import subprocess
from datetime import date, datetime, timezone
from typing import Optional

from . import rut as rututil

IVA_TASA = 0.19

# Tipos de DTE soportados en esta primera versión. El resto (guías, exportación)
# se agregan cuando haga falta; NC/ND requieren referencia al documento original.
TIPOS_DTE = {
    33: "Factura electrónica (afecta a IVA)",
    34: "Factura electrónica exenta / no afecta",
    39: "Boleta electrónica",
    41: "Boleta electrónica exenta",
    56: "Nota de débito electrónica",
    61: "Nota de crédito electrónica",
}

# Tipos donde el receptor es una EMPRESA con datos tributarios obligatorios.
TIPOS_CON_RECEPTOR_FORMAL = {33, 34, 56, 61}


class ErrorEmision(Exception):
    """Datos inválidos para emitir (el mensaje es apto para mostrarle al usuario)."""


class EmisionNoHabilitada(Exception):
    """La emisión real no está habilitada/configurada todavía. `faltan` = pendientes."""

    def __init__(self, mensaje: str, faltan: list[str]):
        super().__init__(mensaje)
        self.faltan = faltan


def _num(v, campo: str) -> float:
    try:
        n = float(v)
    except (TypeError, ValueError):
        raise ErrorEmision(f"'{campo}' debe ser un número (recibí: {v!r}).")
    return n


def _validar_receptor(receptor: dict, tipo_dte: int) -> dict:
    receptor = receptor or {}
    r_rut = str(receptor.get("rut") or "").strip()
    r_nombre = str(receptor.get("nombre") or receptor.get("razon_social") or "").strip()

    # Boletas (39/41): el receptor es opcional (consumidor final).
    if tipo_dte not in TIPOS_CON_RECEPTOR_FORMAL:
        out = {}
        if r_rut:
            if not rututil.is_valid(r_rut):
                raise ErrorEmision(f"El RUT del receptor '{r_rut}' no es válido.")
            out["rut"] = rututil.clean(r_rut)
        if r_nombre:
            out["nombre"] = r_nombre
        return out

    # Facturas y notas: receptor formal obligatorio.
    if not r_rut:
        raise ErrorEmision("Falta el RUT del receptor (a quién se le factura).")
    if not rututil.is_valid(r_rut):
        raise ErrorEmision(f"El RUT del receptor '{r_rut}' no es válido.")
    if not r_nombre:
        raise ErrorEmision("Falta la razón social del receptor.")
    # Optimización (jul 2026): para facturar autos rápido, además del carnet (RUT +
    # nombre) lo ÚNICO que se le pide al usuario es la DIRECCIÓN. El giro por defecto
    # es "PARTICULAR" (persona natural que compra un auto) y el SII autocompleta el
    # resto desde el RUT; la comuna es opcional (se saca de la dirección si viene).
    giro = str(receptor.get("giro") or "").strip() or "PARTICULAR"
    direccion = str(receptor.get("direccion") or "").strip()
    comuna = str(receptor.get("comuna") or "").strip()
    if not direccion:
        raise ErrorEmision(
            "Para la factura falta la DIRECCIÓN del receptor. Pídesela al usuario: "
            "con el carnet (RUT + nombre) y la dirección basta (el giro queda como PARTICULAR)."
        )
    return {
        "rut": rututil.clean(r_rut),
        "nombre": r_nombre,
        "giro": giro,
        "direccion": direccion,
        "comuna": comuna,
    }


def _validar_items(items: list, tipo_dte: int) -> list[dict]:
    if not items or not isinstance(items, list):
        raise ErrorEmision("Falta el detalle: al menos un ítem (nombre, cantidad, precio).")
    tipo_exento = tipo_dte in (34, 41)
    limpios = []
    for i, it in enumerate(items, 1):
        it = it or {}
        nombre = str(it.get("nombre") or it.get("descripcion") or "").strip()
        if not nombre:
            raise ErrorEmision(f"El ítem {i} no tiene nombre/descripción.")
        cantidad = _num(it.get("cantidad", 1), f"ítem {i}.cantidad")
        precio = _num(it.get("precio") if it.get("precio") is not None else it.get("precio_unitario"),
                      f"ítem {i}.precio")
        if cantidad <= 0:
            raise ErrorEmision(f"El ítem {i} ('{nombre}') tiene cantidad <= 0.")
        if precio < 0:
            raise ErrorEmision(f"El ítem {i} ('{nombre}') tiene precio negativo.")
        # En factura afecta (33) un ítem puede marcarse exento individualmente;
        # en factura exenta (34) todo es exento por definición.
        exento = bool(it.get("exento")) or tipo_exento
        monto = round(cantidad * precio)
        # Descripción larga (campo "Descrip." del SII). Para autos: el detalle del
        # vehículo sacado del CAV (tipo, marca, modelo, motor, chasis, color,
        # combustible, PBV, patente, año). Puede venir como texto ya armado en
        # `detalle`, o como dict `vehiculo` que armamos acá en el orden del CAV.
        detalle = str(it.get("detalle") or "").strip()
        veh = it.get("vehiculo")
        if not detalle and isinstance(veh, dict):
            orden = [("Tipo Vehículo", "tipo"), ("Marca", "marca"), ("Modelo", "modelo"),
                     ("Nro. Motor", "motor"), ("Nro. Chasis", "chasis"), ("Color", "color"),
                     ("Combustible", "combustible"), ("PBV", "pbv"), ("Patente", "patente"),
                     ("Año", "anio")]
            partes = [f"{et}: {veh[k]}" for et, k in orden if veh.get(k)]
            detalle = " · ".join(partes)
        item = {
            "nombre": nombre,
            "cantidad": cantidad,
            "precio": round(precio),
            "exento": exento,
            "monto": monto,
        }
        if detalle:
            item["detalle"] = detalle
        limpios.append(item)
    return limpios


def preparar(
    empresa: dict,
    tipo_dte: int,
    receptor: dict,
    items: list,
    forma_pago: str = "contado",
    fecha: Optional[str] = None,
    observaciones: str = "",
) -> dict:
    """Valida y arma el borrador del DTE. NO contacta al SII. Lanza ErrorEmision
    con un mensaje claro si algo falta o está mal."""
    try:
        tipo_dte = int(tipo_dte)
    except (TypeError, ValueError):
        raise ErrorEmision("Falta el tipo de documento (33=factura, 34=factura exenta, 39=boleta).")
    if tipo_dte not in TIPOS_DTE:
        raise ErrorEmision(
            f"Tipo de documento {tipo_dte} no soportado. Usa 33 (factura), "
            "34 (factura exenta) o 39 (boleta)."
        )
    if tipo_dte in (56, 61):
        raise ErrorEmision(
            "Las notas de crédito/débito (56/61) requieren referenciar el documento "
            "original; aún no está implementado. Por ahora: 33, 34 o 39."
        )

    receptor_ok = _validar_receptor(receptor, tipo_dte)
    items_ok = _validar_items(items, tipo_dte)

    neto = sum(it["monto"] for it in items_ok if not it["exento"])
    exento = sum(it["monto"] for it in items_ok if it["exento"])
    iva = round(neto * IVA_TASA)
    total = neto + iva + exento

    forma_pago = (forma_pago or "contado").strip().lower()
    if forma_pago not in ("contado", "credito", "crédito"):
        forma_pago = "contado"
    forma_pago = "credito" if forma_pago.startswith("cr") else "contado"

    fecha_str = (fecha or date.today().isoformat())

    return {
        "emisor": {
            "rut": rututil.clean(empresa["rut"]),
            "nombre": empresa["nombre"],
        },
        "tipo_dte": tipo_dte,
        "tipo_nombre": TIPOS_DTE[tipo_dte],
        "receptor": receptor_ok,
        "items": items_ok,
        "forma_pago": forma_pago,
        "fecha": fecha_str,
        "observaciones": (observaciones or "").strip(),
        "totales": {"neto": neto, "exento": exento, "iva": iva, "total": total},
        "iva_tasa": IVA_TASA,
    }


# ── Certificado digital ───────────────────────────────────────────────────
def revisar_certificado(path: str, password: str) -> dict:
    """Revisa el .pfx REAL: que exista, que la clave lo abra y que esté VIGENTE.

    Un certificado vencido firma DTE que el SII RECHAZA, así que esto es parte
    del blindaje (ya nos pasó: el primer .pfx cargado estaba vencido hacía año
    y medio y la clave igual "funcionaba"). Usa openssl por subproceso porque el
    venv de sii-web no trae `cryptography`. La clave va por env, nunca en argv
    (argv es visible en `ps`). Devuelve {ok, titular, rut, vence, dias_restantes,
    error}."""
    out = {"ok": False, "titular": None, "rut": None, "vence": None,
           "dias_restantes": None, "error": None}
    if not path or not os.path.isfile(path):
        out["error"] = "No encuentro el archivo del certificado."
        return out
    env = {**os.environ, "_CP": password or ""}
    try:
        p1 = subprocess.run(
            ["openssl", "pkcs12", "-in", path, "-nokeys", "-passin", "env:_CP"],
            capture_output=True, text=True, env=env, timeout=20,
        )
        if p1.returncode != 0 or "BEGIN CERTIFICATE" not in p1.stdout:
            out["error"] = "La contraseña no abre el certificado (o el archivo no es un .pfx válido)."
            return out
        p2 = subprocess.run(
            ["openssl", "x509", "-noout", "-subject", "-enddate", "-nameopt", "multiline,utf8"],
            input=p1.stdout, capture_output=True, text=True, timeout=20,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        out["error"] = f"No pude leer el certificado: {exc}"
        return out

    texto = p2.stdout or ""
    m = re.search(r"commonName\s*=\s*(.+)", texto)
    if m:
        out["titular"] = m.group(1).strip()
    m = re.search(r"serialNumber\s*=\s*(.+)", texto)
    if m:
        out["rut"] = m.group(1).strip()
    m = re.search(r"notAfter=(.+)", texto)
    if not m:
        out["error"] = "No pude leer la fecha de vencimiento del certificado."
        return out
    try:
        vence = datetime.strptime(m.group(1).strip(), "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)
    except ValueError:
        out["error"] = "No pude interpretar la fecha de vencimiento del certificado."
        return out
    dias = (vence - datetime.now(timezone.utc)).days
    out["vence"] = vence.date().isoformat()
    out["dias_restantes"] = dias
    if dias < 0:
        out["error"] = (f"El certificado está VENCIDO (venció el {out['vence']}). "
                        "El SII rechaza cualquier DTE firmado con él: hay que renovarlo.")
        return out
    out["ok"] = True
    return out


# ── Config de emisor / go-live ────────────────────────────────────────────
def _pendientes_para_emitir(empresa: dict) -> list[str]:
    """Devuelve la lista de piezas que faltan para poder emitir de verdad.
    Vacía = todo listo. Es la fuente de verdad del 'blindaje'."""
    faltan = []
    if os.getenv("SII_EMISION_HABILITADA", "0").strip() not in ("1", "true", "si", "sí"):
        faltan.append(
            "Habilitar la emisión (SII_EMISION_HABILITADA=1) — apagada por seguridad "
            "hasta cerrar la 1ª emisión supervisada."
        )
    cert = os.getenv("SII_CERT_PATH", "").strip()
    cert_pass = os.getenv("SII_CERT_PASS", "").strip()
    if not cert:
        faltan.append("Ruta del certificado digital .pfx (SII_CERT_PATH).")
    elif not cert_pass:
        faltan.append("Contraseña del certificado .pfx (SII_CERT_PASS).")
    else:
        # Revisión REAL: que abra y esté vigente (un cert vencido = DTE rechazado).
        chk = revisar_certificado(cert, cert_pass)
        if not chk["ok"]:
            faltan.append(f"Certificado digital: {chk['error']}")
    canal = os.getenv("SII_EMISION_CANAL", "").strip().lower()
    if canal not in ("sii_gratuito", "bsale", "proveedor"):
        faltan.append(
            "Canal de emisión (SII_EMISION_CANAL = sii_gratuito | bsale | proveedor): "
            "confirmar cómo emite ANA CLARA SPA hoy."
        )
    # OJO: en el SISTEMA GRATUITO del SII (MiPyme) los FOLIOS los administra el
    # propio SII dentro del portal (timbraje electrónico) — NO manejamos archivos
    # CAF nosotros. Lo que sí hace falta es que la empresa esté INSCRITA en ese
    # sistema y que el titular del certificado esté autorizado para su RUT.
    if canal == "sii_gratuito" and os.getenv("SII_MIPYME_INSCRITA", "").strip() not in ("1", "true", "si", "sí"):
        faltan.append(
            "Confirmar que la empresa está INSCRITA en el Sistema de Facturación "
            "Gratuito del SII (MiPyme), con folios disponibles, y que el titular del "
            "certificado está autorizado para ese RUT (SII_MIPYME_INSCRITA=1)."
        )
    if canal == "bsale" and not os.getenv("BSALE_TOKEN", "").strip():
        faltan.append("Token de API de BSale (BSALE_TOKEN).")
    return faltan


def emitir(empresa: dict, borrador: dict) -> dict:
    """Emisión REAL del DTE. Blindada: si falta configuración, NO emite y
    explica qué falta (EmisionNoHabilitada). Cuando esté todo, aquí se conecta
    el envío al canal configurado (SII gratuito con certificado, o proveedor)."""
    faltan = _pendientes_para_emitir(empresa)
    if faltan:
        raise EmisionNoHabilitada(
            "La emisión real todavía no está habilitada; el borrador quedó validado y listo.",
            faltan,
        )
    # A partir de aquí (cuando faltan == []) se implementa el envío según
    # SII_EMISION_CANAL, reutilizando la sesión con cookie del cliente SII para
    # no re-loguear. Se activa en la 1ª emisión supervisada con Ramón.
    raise EmisionNoHabilitada(
        "Configuración presente pero el envío al canal aún no está activado "
        "(pendiente la 1ª emisión supervisada).",
        ["Activar el envío del canal en la 1ª emisión supervisada."],
    )
