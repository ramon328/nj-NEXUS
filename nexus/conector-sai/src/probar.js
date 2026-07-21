// Verificación obligatoria — §13. Compara el estado del bot contra la app nj-SAI.
// Solo termina IDÉNTICO si todo coincide. Requiere APP_URL en conector-sai/.env.
import { getEstado, invalidarCache } from "./estado.js";
import { APP_URL, CONFIG } from "./config.js";

const firma = (r) => r.matches.map((m) => `${m.id}#${m.score}`).sort().join("|");
const firmaFacturas = (r) => r.facturas
  .map((f) => `${f.doc.operacion}:${f.doc.periodo}:${f.doc.folio}:${f.doc.rut}:${f.doc.monto}=${f.estado}`)
  .sort().join("|");

if (!APP_URL) {
  console.error("Falta APP_URL en conector-sai/.env (URL de nj-SAI). Sin ella no se puede comparar.");
  process.exit(2);
}

invalidarCache();
const bot = await getEstado();
const appRes = await fetch(`${APP_URL.replace(/\/$/, "")}/api/conciliacion?rut=${encodeURIComponent(CONFIG.rut)}`, { cache: "no-store" });
if (!appRes.ok) { console.error(`APP HTTP ${appRes.status} — revisa APP_URL y el endpoint /api/conciliacion`); process.exit(2); }
const app = await appRes.json();

let ok = true;
const chk = (nombre, a, b) => {
  const igual = JSON.stringify(a) === JSON.stringify(b);
  console.log(`${igual ? "✓" : "✗"} ${nombre}`);
  if (!igual) { ok = false; console.log("   bot:", a, "\n   app:", b); }
};

chk("totalDocs", bot.totalDocs, app.totalDocs);
chk("totalMovimientos", bot.totalMovimientos, app.totalMovimientos);
chk("matches.length", bot.matches.length, app.matches.length);
chk("facturas.length", bot.facturas.length, app.facturas.length);
chk("contadores", bot.contadores, app.contadores);
chk("cobertura",
  { m: bot.control.coberturaMonto, c: bot.control.coberturaCant },
  { m: app.control.coberturaMonto, c: app.control.coberturaCant });
chk("montos",
  { total: bot.control.montoDocsTotal, conc: bot.control.montoConciliado, prop: bot.control.montoPropuesto },
  { total: app.control.montoDocsTotal, conc: app.control.montoConciliado, prop: app.control.montoPropuesto });
chk("firma-matches", firma(bot), firma(app));
chk("firma-facturas", firmaFacturas(bot), firmaFacturas(app));

console.log(ok ? "\nIDÉNTICO" : "\nDIFERENTE — revisa arriba");
process.exit(ok ? 0 : 1);
