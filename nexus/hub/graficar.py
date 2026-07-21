#!/usr/bin/env python3
# graficar.py — Renderiza un gráfico PNG para WhatsApp desde un JSON spec.
# Uso: python3 graficar.py <spec.json>
# spec = {tipo: barra|linea|torta, titulo, subtitulo?, etiquetas:[], valores:[], archivo}
import sys, json
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.ticker import FuncFormatter

AZUL = "#2563eb"
PALETA = ["#2563eb", "#16a34a", "#dc2626", "#d97706", "#7c3aed", "#0891b2",
          "#db2777", "#65a30d", "#ea580c", "#4f46e5"]


def clp(v, _=None):
    v = float(v)
    a = abs(v)
    if a >= 1_000_000_000:
        return f"${v/1_000_000_000:.1f}MM".replace(".", ",")
    if a >= 1_000_000:
        return f"${v/1_000_000:.0f}M"
    if a >= 1_000:
        return f"${v/1_000:.0f}k"
    return f"${v:.0f}"


def main():
    spec = json.load(open(sys.argv[1], encoding="utf-8"))
    tipo = spec.get("tipo", "barra")
    titulo = spec.get("titulo", "")
    subt = spec.get("subtitulo", "")
    et = [str(x) for x in spec.get("etiquetas", [])]
    val = [float(x) for x in spec.get("valores", [])]
    archivo = spec["archivo"]

    plt.rcParams.update({"font.size": 12, "font.family": "sans-serif"})
    fig, ax = plt.subplots(figsize=(8, 5), dpi=130)

    if tipo == "torta":
        colores = PALETA[: len(val)]
        wedges, _t, _a = ax.pie(
            val, labels=et, autopct=lambda p: f"{p:.1f}%", colors=colores,
            startangle=90, pctdistance=0.8,
            textprops={"fontsize": 11},
        )
        ax.axis("equal")
    elif tipo == "linea":
        ax.plot(et, val, marker="o", color=AZUL, linewidth=2.5, markersize=7)
        ax.fill_between(range(len(val)), val, color=AZUL, alpha=0.08)
        ax.yaxis.set_major_formatter(FuncFormatter(clp))
        ax.grid(axis="y", alpha=0.3)
        for i, v in enumerate(val):
            ax.annotate(clp(v), (i, v), textcoords="offset points",
                        xytext=(0, 9), ha="center", fontsize=10, color="#334155")
        plt.xticks(rotation=20, ha="right")
    else:  # barra
        colores = PALETA[: len(val)] if len(val) <= len(PALETA) else AZUL
        bars = ax.bar(et, val, color=colores)
        ax.yaxis.set_major_formatter(FuncFormatter(clp))
        ax.grid(axis="y", alpha=0.3)
        for b, v in zip(bars, val):
            ax.annotate(clp(v), (b.get_x() + b.get_width() / 2, v),
                        textcoords="offset points", xytext=(0, 5),
                        ha="center", fontsize=10, color="#334155")
        plt.xticks(rotation=20, ha="right")

    ax.set_title(titulo, fontsize=15, fontweight="bold", pad=14)
    if subt:
        ax.text(0.5, 1.005, subt, transform=ax.transAxes, ha="center",
                va="bottom", fontsize=10, color="#64748b")
    fig.tight_layout()
    fig.savefig(archivo, bbox_inches="tight", facecolor="white")
    print(archivo)


if __name__ == "__main__":
    main()
