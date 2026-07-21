#!/usr/bin/env python3
"""Extractor de documentos del SII (Chile).

Uso:
    python main.py test-login                  # prueba SOLO el login (1 request)
    python main.py rcv --periodo 202405 --op COMPRA
    python main.py rcv --desde 202401 --hasta 202412 --op VENTA
    python main.py carpeta
    python main.py f29 --periodo 202405

Empieza SIEMPRE por `test-login` para verificar credenciales sin riesgo.
"""
from __future__ import annotations

import argparse
import json
import logging
import sys

from config import load_config
from sii import auth, rcv
from sii.client import SiiClient
from sii.rate_limit import Throttle
from storage import build_store

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-7s %(name)s | %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("main")


def periodos_rango(desde: str, hasta: str) -> list[str]:
    """Genera periodos YYYYMM entre desde y hasta inclusive."""
    y0, m0 = int(desde[:4]), int(desde[4:])
    y1, m1 = int(hasta[:4]), int(hasta[4:])
    out = []
    y, m = y0, m0
    while (y, m) <= (y1, m1):
        out.append(f"{y}{m:02d}")
        m += 1
        if m > 12:
            m, y = 1, y + 1
    return out


def conectar(cfg) -> SiiClient:
    throttle = Throttle(cfg.delay_min, cfg.delay_max)
    client = SiiClient(throttle, max_retries=cfg.max_retries)
    # Reutiliza la sesión guardada; solo loguea si no hay una válida.
    return auth.ensure_session(client, cfg.rut, cfg.clave)


def cmd_test_login(cfg, args) -> int:
    conectar(cfg)
    log.info("✅ Sesión lista (reutilizada o nuevo login).")
    return 0


def cmd_rcv(cfg, args) -> int:
    if args.periodo:
        periodos = [args.periodo]
    elif args.desde and args.hasta:
        periodos = periodos_rango(args.desde, args.hasta)
    else:
        log.error("Indica --periodo YYYYMM o --desde/--hasta.")
        return 2

    client = conectar(cfg)
    stores = build_store(cfg)
    r = rcv.RcvClient(client, cfg.rut)

    for periodo in periodos:
        resumen = r.resumen(periodo, args.op)
        detalle = r.detalle(periodo, args.op, cod_tipo_doc=args.tipo)
        base = f"rcv/{args.op.lower()}/{periodo}"
        for store in stores:
            store.save_json(f"{base}/resumen.json", resumen)
            store.save_json(f"{base}/detalle_tipo{args.tipo}.json", detalle)
        log.info("Periodo %s listo.", periodo)
    return 0


def cmd_bajar_todo(cfg, args) -> int:
    """Descarga resumen (JSON) + CSV de compras y ventas para un rango de periodos."""
    from pathlib import Path

    salida = Path(args.salida).expanduser()
    salida.mkdir(parents=True, exist_ok=True)
    periodos = periodos_rango(args.desde, args.hasta)

    client = conectar(cfg)
    r = rcv.RcvClient(client, cfg.rut)
    r.inicio()

    total_docs = 0
    resumen_global = []
    for idx, periodo in enumerate(periodos):
        # Renovar sesión cada ~8 periodos para evitar que el token expire y se
        # salten meses con datos por error (el SII no distingue "vacío" de "token vencido").
        if idx and idx % 8 == 0 and not auth.is_authenticated(client):
            log.info("Sesión por expirar — renovando con un login…")
            auth.login(client, cfg.rut, cfg.clave)
            client.save_cookies(auth.SESSION_FILE)
            r = rcv.RcvClient(client, cfg.rut)
            r.inicio()
        for op in ("COMPRA", "VENTA"):
            try:
                res = r.resumen(periodo, op)
            except Exception as exc:  # noqa: BLE001
                log.warning("Resumen %s %s falló: %s", op, periodo, exc)
                continue
            data = res.get("data")
            n_tipos = len(data) if isinstance(data, list) else 0
            if not n_tipos:
                continue  # periodo sin datos
            docs = sum(int(d.get("rsmnTotDoc") or 0) for d in data)
            tipos = [int(d["rsmnTipoDocInteger"]) for d in data if d.get("rsmnTipoDocInteger")]
            total_docs += docs
            resumen_global.append({"periodo": periodo, "operacion": op, "documentos": docs})
            base = salida / op.lower() / periodo
            base.mkdir(parents=True, exist_ok=True)
            (base / "resumen.json").write_text(
                json.dumps(res, ensure_ascii=False, indent=2), encoding="utf-8")
            log.info("%s %s: %d documentos en %d tipos", op, periodo, docs, n_tipos)
            # Detalle por documento (CSV combinado de todos los tipos).
            try:
                csv = r.detalle_periodo_csv(periodo, op, tipos)
                if csv:
                    (base / "detalle.csv").write_text(csv, encoding="utf-8-sig")
                    log.info("   detalle.csv: %d filas", csv.count("\n"))
            except Exception as exc:  # noqa: BLE001
                log.warning("Detalle CSV %s %s falló: %s", op, periodo, exc)

    (salida / "_indice.json").write_text(
        json.dumps({"total_documentos": total_docs, "periodos": resumen_global},
                   ensure_ascii=False, indent=2), encoding="utf-8")
    client.save_cookies(auth.SESSION_FILE)
    log.info("✅ Listo. %d documentos en total. Carpeta: %s", total_docs, salida)
    return 0


def cmd_pdf(cfg, args) -> int:
    """Genera PDF legibles (planilla + resumen) de cada mes ya descargado."""
    from pathlib import Path

    from sii import reportes

    import shutil

    salida = Path(args.salida).expanduser()
    if not salida.exists():
        log.error("No existe la carpeta %s — corre 'bajar-todo' primero.", salida)
        return 2

    # Carpetas planas con todos los PDF, separadas por operación (en el Escritorio).
    pdf_dir = Path(args.pdf_dir).expanduser()
    carpetas = {"COMPRA": pdf_dir / "pdf compra", "VENTA": pdf_dir / "venta pdf"}
    for c in carpetas.values():
        c.mkdir(parents=True, exist_ok=True)

    n_planillas = n_resumenes = 0
    for op_dir in sorted(salida.glob("*")):
        if not op_dir.is_dir() or op_dir.name not in ("compra", "venta"):
            continue
        operacion = op_dir.name.upper()
        destino = carpetas[operacion]
        for periodo_dir in sorted(op_dir.glob("*")):
            periodo = periodo_dir.name
            csv_path = periodo_dir / "detalle.csv"
            json_path = periodo_dir / "resumen.json"
            if csv_path.exists() and reportes.genera_planilla_pdf(
                    csv_path, args.empresa, cfg.rut, periodo, operacion,
                    periodo_dir / "planilla.pdf"):
                shutil.copy(periodo_dir / "planilla.pdf",
                            destino / f"{operacion.lower()}_{periodo}_planilla.pdf")
                n_planillas += 1
            if json_path.exists() and reportes.genera_resumen_pdf(
                    json_path, args.empresa, cfg.rut, periodo, operacion,
                    periodo_dir / "resumen.pdf"):
                shutil.copy(periodo_dir / "resumen.pdf",
                            destino / f"{operacion.lower()}_{periodo}_resumen.pdf")
                n_resumenes += 1
            log.info("PDF %s %s listo", operacion, periodo)
    log.info("✅ %d planillas y %d resúmenes PDF. Carpetas: '%s' y '%s'",
             n_planillas, n_resumenes, carpetas["COMPRA"].name, carpetas["VENTA"].name)
    return 0


def cmd_carpeta(cfg, args) -> int:
    from pathlib import Path

    from sii import carpeta, reportes

    client = conectar(cfg)
    salida = Path(args.salida).expanduser()
    salida.parent.mkdir(parents=True, exist_ok=True)

    if args.oficial:
        # PDF OFICIAL del SII (44 págs). Requiere destinatario (RUT distinto al propio).
        if not (args.dest_rut and args.email):
            log.error("Modo --oficial requiere --dest-rut, --dest-nombre y --email.")
            return 2
        ok = carpeta.generar_oficial(client, cfg.rut, args.dest_rut, args.dest_nombre,
                                     args.email, salida, args.institucion)
        msg = "Carpeta tributaria OFICIAL"
    else:
        # Reconstrucción legible desde la API (sin enviar a terceros).
        datos = carpeta.obtener_datos(client, cfg.rut)
        ok = reportes.genera_carpeta_pdf(datos, args.empresa, cfg.rut, salida)
        msg = "Carpeta tributaria (reconstruida)"

    if ok:
        log.info("✅ %s generada: %s", msg, salida)
        return 0
    log.error("No se pudo generar la carpeta.")
    return 3


def cmd_formulario(cfg, args) -> int:
    from sii.formularios import FormulariosClient

    client = conectar(cfg)
    stores = build_store(cfg)
    f = FormulariosClient(client, cfg.rut)
    if args.tipo_form == "f29":
        data = f.consultar_f29(args.periodo)
        ruta = f"formularios/f29/{args.periodo}.json"
    else:
        data = f.consultar_f22(args.periodo)
        ruta = f"formularios/f22/{args.periodo}.json"
    for store in stores:
        store.save_json(ruta, data)
    return 0


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Extractor de documentos del SII")
    sub = p.add_subparsers(dest="cmd", required=True)

    sub.add_parser("test-login", help="Prueba solo el login (1 request)")

    p_rcv = sub.add_parser("rcv", help="Registro Compra/Venta (DTEs)")
    p_rcv.add_argument("--periodo", help="Periodo único YYYYMM")
    p_rcv.add_argument("--desde", help="Periodo inicial YYYYMM")
    p_rcv.add_argument("--hasta", help="Periodo final YYYYMM")
    p_rcv.add_argument("--op", choices=["COMPRA", "VENTA"], default="COMPRA")
    p_rcv.add_argument("--tipo", type=int, default=33, help="Código tipo DTE (33=factura afecta)")

    p_todo = sub.add_parser("bajar-todo", help="Descarga compras+ventas de un rango a una carpeta")
    p_todo.add_argument("--desde", default="202301", help="Periodo inicial YYYYMM")
    p_todo.add_argument("--hasta", default="202512", help="Periodo final YYYYMM")
    p_todo.add_argument("--salida", default="~/Desktop/triunfo ctm",
                        help="Carpeta destino")

    p_pdf = sub.add_parser("pdf", help="Genera PDF legibles de lo ya descargado")
    p_pdf.add_argument("--salida", default="~/Desktop/triunfo ctm", help="Carpeta con los datos")
    p_pdf.add_argument("--pdf-dir", default="~/Desktop", help="Dónde dejar las carpetas de PDF")
    p_pdf.add_argument("--empresa", default="ANA CLARA SPA", help="Nombre para el encabezado")

    p_cte = sub.add_parser("carpeta", help="Carpeta tributaria (PDF)")
    p_cte.add_argument("--salida", default="~/Desktop/carpeta tributaria ANA CLARA SPA.pdf",
                       help="Ruta del PDF de salida")
    p_cte.add_argument("--empresa", default="ANA CLARA SPA", help="Nombre para el encabezado")
    p_cte.add_argument("--oficial", action="store_true",
                       help="Genera el PDF OFICIAL del SII (envía aviso al destinatario)")
    p_cte.add_argument("--dest-rut", help="RUT del destinatario (distinto al de la empresa)")
    p_cte.add_argument("--dest-nombre", default="", help="Nombre del destinatario")
    p_cte.add_argument("--email", help="Correo donde el SII avisa la carpeta")
    p_cte.add_argument("--institucion", default="USO INTERNO", help="Nombre de la institución")

    p_f29 = sub.add_parser("f29", help="Formulario 29 (IVA mensual)")
    p_f29.add_argument("--periodo", required=True, help="YYYYMM")

    p_f22 = sub.add_parser("f22", help="Formulario 22 (renta anual)")
    p_f22.add_argument("--periodo", required=True, help="Año YYYY")

    return p


def main() -> int:
    args = build_parser().parse_args()
    cfg = load_config()

    try:
        if args.cmd == "test-login":
            return cmd_test_login(cfg, args)
        if args.cmd == "rcv":
            return cmd_rcv(cfg, args)
        if args.cmd == "bajar-todo":
            return cmd_bajar_todo(cfg, args)
        if args.cmd == "pdf":
            return cmd_pdf(cfg, args)
        if args.cmd == "carpeta":
            return cmd_carpeta(cfg, args)
        if args.cmd == "f29":
            args.tipo_form = "f29"
            return cmd_formulario(cfg, args)
        if args.cmd == "f22":
            args.tipo_form = "f22"
            return cmd_formulario(cfg, args)
    except auth.AuthError as exc:
        log.error("Error de autenticación: %s", exc)
        return 1
    except NotImplementedError as exc:
        log.error("Módulo pendiente de verificar en vivo: %s", exc)
        return 3
    except Exception as exc:  # noqa: BLE001
        from sii.formularios import FormularioError
        if isinstance(exc, FormularioError):
            log.error("%s", exc)   # mensaje guía, sin traceback
            return 3
        raise
    return 0


if __name__ == "__main__":
    sys.exit(main())
