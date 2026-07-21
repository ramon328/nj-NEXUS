// Snapshot — §10. Objeto compacto que ve el LLM. formatRut en TODO RUT mostrado.
import { formatRut } from "./rut.js";

const NOTA_MALLORCA = "El banco solo trae junio-julio; estas compras figuran en el Excel interno de Mallorca aunque no estén en la cartola.";

export function buildSnapshot(resumen) {
  const e = resumen.empresa;
  const c = resumen.control;
  const matches = resumen.matches;
  return {
    empresa: { nombre: e.nombre, rut: formatRut(e.rut), siiConectado: e.siiConectado, bancoConectado: e.bancoConectado },
    cuentas: (e.cuentas || []).map((x) => ({ nombre: x.nombre, banco: x.banco, last4: x.last4, moneda: x.moneda, saldo: x.saldo })),
    totales: {
      documentosSII: resumen.totalDocs, movimientosBanco: resumen.totalMovimientos,
      movimientosConRut: resumen.movimientosConRut, matches: matches.length,
    },
    matchesPorEstado: {
      porRevisar: matches.filter((m) => m.estado === "propuesto").length,
      aprobados: matches.filter((m) => m.estado === "aprobado").length,
      rechazados: matches.filter((m) => m.estado === "rechazado").length,
    },
    confianza: resumen.contadores,
    cobertura: { porMontoPct: c.coberturaMonto, porCantidadPct: c.coberturaCant },
    montosCLP: { facturado: c.montoDocsTotal, conciliado: c.montoConciliado, porRevisar: c.montoPropuesto },
    facturasSinPago: {
      cantidad: c.docsSinMatch.cantidad, montoCLP: c.docsSinMatch.monto,
      top: c.docsSinMatch.top8.slice(0, 5).map((x) => ({
        proveedor: x.nombre, rut: formatRut(x.rut), montoCLP: x.monto, fecha: x.fecha, ref: x.ref,
      })),
    },
    confirmadasEnMallorca: {
      cantidad: c.confirmadasMallorca.cantidad, montoCLP: c.confirmadasMallorca.monto, nota: NOTA_MALLORCA,
    },
    movimientosSinFactura: {
      cantidad: c.movsSinMatch.cantidad, entradasCLP: c.movsSinMatch.ingresos, salidasCLP: c.movsSinMatch.egresos,
    },
    topMatches: matches.slice(0, 12).map((m) => ({
      score: m.score, proveedor: m.doc.razon, rut: formatRut(m.doc.rut),
      montoFactura: m.doc.monto, montoBanco: m.mov.amount,
      fechaFactura: m.doc.fecha, fechaPago: m.mov.fecha ? m.mov.fecha.slice(0, 10) : m.mov.fecha,
      estado: m.estado, motivo: m.motivo,
    })),
  };
}
