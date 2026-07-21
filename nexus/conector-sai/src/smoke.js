import { fetchBancoPorRut } from "./bank.js";
import { fetchComprasMallorca } from "./mallorca.js";
import { fetchDocsSII } from "./sii.js";
import { getEstado } from "./estado.js";
import { CONFIG } from "./config.js";

console.log("RUT objetivo:", CONFIG.rut, "· empresaSII:", CONFIG.siiEmpresaId);
const banco = await fetchBancoPorRut(CONFIG.rut);
console.log("BANCO: conectado=%s cuentas=%d movimientos=%d", banco.conectado, banco.cuentas.length, banco.movimientos.length);
if (banco.movimientos[0]) console.log("  mov[0]:", banco.movimientos[0].fecha?.slice(0,10), banco.movimientos[0].amount, JSON.stringify((banco.movimientos[0].description||"").slice(0,40)), "rutGlosa:", banco.movimientos[0].rutGlosa);
const mall = await fetchComprasMallorca();
console.log("MALLORCA: compras=%d", mall.length);
if (mall[0]) console.log("  compra[0]:", JSON.stringify(mall[0]));
const sii = await fetchDocsSII(CONFIG.siiEmpresaId);
console.log("SII: docs=%d (0 = falta token nj-bc-sii)", sii.length);
const est = await getEstado();
console.log("--- ESTADO ---");
console.log("totalDocs:%d totalMovimientos:%d matches:%d", est.totalDocs, est.totalMovimientos, est.matches.length);
console.log("control:", JSON.stringify({cobCant:est.control.coberturaCant, cobMonto:est.control.coberturaMonto, movsSinMatch:est.control.movsSinMatch.cantidad, egresos:est.control.movsSinMatch.egresos, ingresos:est.control.movsSinMatch.ingresos}));
