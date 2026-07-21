// BANCO — §5. Supabase de bank-sistem. Paginación/dedup DETERMINISTA (para que el
// mov.id del match coincida con la app). amount con SIGNO (+ingreso/-egreso).
import { BANK_SUPABASE_URL, BANK_SUPABASE_SERVICE_KEY } from "./config.js";
import { normRut, extractRut } from "./rut.js";

const base = () => `${BANK_SUPABASE_URL}/rest/v1`;
const headers = () => ({
  apikey: BANK_SUPABASE_SERVICE_KEY,
  Authorization: `Bearer ${BANK_SUPABASE_SERVICE_KEY}`,
});

async function get(path) {
  const r = await fetch(`${base()}${path}`, { headers: headers(), cache: "no-store" });
  if (!r.ok) throw new Error(`bank HTTP ${r.status}`);
  return r.json();
}

export async function fetchBancoPorRut(rut) {
  const objetivo = normRut(rut);
  try {
    // 1) links del RUT
    const links = await get(`/bank_links?select=id,bank_id,holder_name,status`);
    const mios = (Array.isArray(links) ? links : []).filter((l) => {
      const rutLink = normRut(l.holder_name) || extractRut(l.holder_name) || "";
      return rutLink === objetivo;
    });
    if (!mios.length) {
      // ayuda al diagnóstico: la causa #1 de "no se resuelve la empresa"
      console.warn("[SAI/bank] ningún holder_name resolvió al RUT", objetivo, "· links:", (links || []).map((l) => l.holder_name).slice(0, 6));
      return { conectado: false, cuentas: [], movimientos: [] };
    }
    const conectado = mios.some((l) => l.status === "active");
    const bankPorLink = new Map(mios.map((l) => [l.id, l.bank_id]));
    const linkIds = mios.map((l) => l.id);

    // 2) cuentas de esos links (TODAS entran a conciliar)
    const accounts = await get(`/accounts?select=id,link_id,name,last_4,type,currency,balance_current,status&link_id=in.(${linkIds.join(",")})`);
    const accs = Array.isArray(accounts) ? accounts : [];
    const accountIdsConciliacion = accs.map((a) => a.id);

    // cuentasMostrar: active si hay; si no, todas. Dedup por last_4 (o id).
    const activas = accs.filter((a) => a.status === "active");
    const fuente = activas.length ? activas : accs;
    const vistas = new Set();
    const cuentasMostrar = [];
    for (const a of fuente) {
      const k = a.last_4 != null ? String(a.last_4) : a.id;
      if (vistas.has(k)) continue;
      vistas.add(k);
      cuentasMostrar.push({
        id: a.id, nombre: a.name || "Cuenta", last4: a.last_4, tipo: a.type,
        moneda: a.currency, saldo: a.balance_current, estado: a.status, banco: bankPorLink.get(a.link_id),
      });
    }

    // 3) movimientos por TODAS las cuentas, paginados DETERMINISTA
    let movimientos = [];
    if (accountIdsConciliacion.length) {
      const inClause = accountIdsConciliacion.join(",");
      const vistosDedup = new Set();
      for (let offset = 0; offset <= 50000; offset += 1000) {
        const rows = await get(
          `/movements?select=id,account_id,amount,type,description,transaction_date` +
          `&account_id=in.(${inClause})&order=transaction_date.desc,id.asc&limit=1000&offset=${offset}`
        );
        const arr = Array.isArray(rows) ? rows : [];
        for (const m of arr) {
          const clave = `${m.amount}|${String(m.transaction_date || "").slice(0, 10)}|${(m.description || "").trim()}`;
          if (vistosDedup.has(clave)) continue;   // primera ocurrencia (determinista por el order)
          vistosDedup.add(clave);
          movimientos.push({
            origen: "banco", id: m.id, accountId: m.account_id, amount: m.amount,
            type: m.type, description: m.description, fecha: m.transaction_date,
            rutGlosa: extractRut(m.description),
          });
        }
        if (arr.length < 1000) break;
      }
    }

    return { conectado, cuentas: cuentasMostrar, movimientos };
  } catch (e) {
    console.warn("[SAI/bank] error:", e.message);
    return { conectado: false, cuentas: [], movimientos: [] };
  }
}
