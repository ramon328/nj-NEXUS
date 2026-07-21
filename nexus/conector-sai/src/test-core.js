// Test del núcleo determinista (rut + conciliar). No requiere secretos ni red.
import { dv, normRut, formatRut, isValidRut, extractRut, toISO } from "./rut.js";
import { similarity, cleanName, nameFromGlosa, puntuar, conciliar, contar, panelControl, clp } from "./conciliar.js";

let fail = 0;
const eq = (nombre, got, exp) => {
  const ok = JSON.stringify(got) === JSON.stringify(exp);
  if (!ok) { fail++; console.log(`✗ ${nombre}\n   got: ${JSON.stringify(got)}\n   exp: ${JSON.stringify(exp)}`); }
  else console.log(`✓ ${nombre}`);
};

// ---- RUT / fecha (§16 checklist) ----
eq("dv('77271121')", dv("77271121"), "2");
eq("dv('1')", dv("1"), "9");                 // control DV
eq("normRut('0772711212')", normRut("0772711212"), "77271121-2");
eq("normRut('77.271.121-2')", normRut("77.271.121-2"), "77271121-2");
eq("extractRut(prefijo0)", extractRut("0772711212 Transf. ANA CLARA SpA"), "77271121-2");
eq("extractRut(puntos en glosa)", extractRut("PAGO 78.302.808-5 PROVEEDOR"), "78302808-5");
eq("extractRut(sin rut)", extractRut("TRANSFERENCIA VARIOS"), null);
eq("isValidRut('77271121-2')", isValidRut("77271121-2"), true);
eq("formatRut('77271121-2')", formatRut("77271121-2"), "77.271.121-2");
eq("toISO('25/12/2026 10:30')", toISO("25/12/2026 10:30"), "2026-12-25");
eq("toISO('2026-01-15')", toISO("2026-01-15"), "2026-01-15");
eq("toISO('1/2/2026')", toISO("1/2/2026"), "1/2/2026");   // no matchea dd/mm anclado

// ---- similarity (guardas y fórmula) ----
eq("similarity('','')", similarity("", ""), 0);           // nulos ANTES de igualdad
eq("similarity('A','A')", similarity("A", "A"), 1);
eq("similarity('AB','AB')", similarity("AB", "AB"), 1);
eq("similarity('A','B')", similarity("A", "B"), 0);       // 1-char → 0 bigramas → guarda
eq("similarity('JUAN','JU AN')", similarity("JUAN", "JU AN"), 1); // quita espacios

// ---- cleanName ----
eq("cleanName('Comercial Ana Clara SpA')", cleanName("Comercial Ana Clara SpA"), "ANA CLARA");
eq("nameFromGlosa('0772711212 ANA CLARA SPA')", nameFromGlosa("0772711212 ANA CLARA SPA"), "ANA CLARA");

// ---- conciliar: match por RUT+monto exacto, dentro de ventana ----
{
  const docs = [
    { origen:"sii", operacion:"COMPRA", periodo:"202606", rut:"78302808-5", razon:"PROVEEDOR X", folio:"100", fecha:"2026-06-10", monto:1000000 },
    { origen:"sii", operacion:"VENTA",  periodo:"202606", rut:"11111111-1", razon:"CLIENTE Y",   folio:"200", fecha:"2026-06-12", monto:500000 },
  ];
  const movs = [
    { origen:"banco", id:"m1", accountId:"a", amount:-1000000, type:null, description:"78.302.808-5 PAGO PROVEEDOR X", fecha:"2026-06-11", rutGlosa:null },
    { origen:"banco", id:"m2", accountId:"a", amount:500000,   type:null, description:"11.111.111-1 ABONO CLIENTE Y", fecha:"2026-06-12", rutGlosa:null },
    { origen:"banco", id:"m3", accountId:"a", amount:-99,      type:null, description:"RUIDO", fecha:"2026-06-01", rutGlosa:null },
  ];
  const matches = conciliar(docs, movs);
  eq("conciliar: 2 matches", matches.length, 2);
  const compra = matches.find(m => m.doc.folio === "100");
  eq("compra score (48 monto +44 rut +10 fecha[1d])", compra?.score, 102 > 100 ? 100 : 102); // cap 100
  eq("compra via A (rut)", compra?.via, "A");
  eq("compra id", compra?.id, "COMPRA:202606:100:m1");
  const venta = matches.find(m => m.doc.folio === "200");
  eq("venta score (48+44+12 fecha[0d]) cap100", venta?.score, 100);
  const cont = contar(matches);
  eq("contadores alto=2", cont, { alto: 2, medio: 0, bajo: 0 });
  const ctrl = panelControl(docs, movs, matches);
  eq("cobertura cant=100", ctrl.coberturaCant, 100);
  eq("cobertura monto=100", ctrl.coberturaMonto, 100);
  eq("montoConciliado=0 (sin decisiones)", ctrl.montoConciliado, 0);
  eq("montoPropuesto=1.5M", ctrl.montoPropuesto, 1500000);
  eq("movsSinMatch=1 (el ruido)", ctrl.movsSinMatch.cantidad, 1);
}

console.log(fail === 0 ? "\n✅ NÚCLEO OK (todos los asserts pasan)" : `\n❌ ${fail} asserts fallaron`);
process.exit(fail === 0 ? 0 : 1);
