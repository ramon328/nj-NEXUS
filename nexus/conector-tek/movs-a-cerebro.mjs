// movs-a-cerebro.mjs — Vuelca los MOVIMIENTOS leídos del banco al Segundo Cerebro,
// en "70 — Base de datos/Cartolas <EMPRESA>/AAAA-MM — mes.md".
//
// POR QUÉ: los movimientos vivían solo en data/emp-*-movs.json, que es un archivo técnico
// que nadie abre. En el cerebro quedan consultables y con el mismo formato que las cartolas
// de ANA CLARA que ya existían (tabla Fecha/Descripción/Cargo/Abono/Saldo + totales arriba).
//
// NO toca el banco: lee lo que YA se leyó. Se puede correr cuantas veces se quiera.
// Uso:  node movs-a-cerebro.mjs [--empresa "ACE SPA"]   (sin --empresa: todas las que haya)
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIR = dirname(fileURLToPath(import.meta.url))
const DATA = join(DIR, 'data')
const CEREBRO = join(DIR, '..', 'cerebro', '70 — Base de datos')
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i >= 0 ? process.argv[i + 1] : d }
const SOLO = arg('empresa', '')

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const clp = (n) => (n < 0 ? '-' : '') + '$' + Math.abs(Math.round(n)).toLocaleString('es-CL')

function volcar(archivo) {
  let d
  try { d = JSON.parse(readFileSync(join(DATA, archivo), 'utf8')) } catch { return null }
  const empresa = d.empresa
  if (!empresa || !Array.isArray(d.movimientos) || !d.movimientos.length) return null
  if (SOLO && empresa.toUpperCase() !== SOLO.toUpperCase()) return null

  // Un archivo por MES (igual que las cartolas que ya existían).
  const porMes = {}
  for (const m of d.movimientos) {
    const mes = String(m.fecha || '').slice(0, 7)
    if (!/^\d{4}-\d{2}$/.test(mes)) continue
    ;(porMes[mes] ||= []).push(m)
  }
  // REUSAR la carpeta que YA existe en vez de crear una casi igual. "ANA CLARA" (con enero
  // a julio) y "ANA CLARA SPA" convivían como si fueran dos empresas distintas — el histórico
  // quedaba partido en dos y nadie lo notaba. Se busca por nombre normalizado (sin SPA/LTDA).
  const norm = (x) => String(x).toUpperCase().replace(/\b(SPA|S\.A\.?|LTDA|LIMITADA|ASOCIADOS)\b/g, '').replace(/[^A-Z0-9]/g, '')
  let carpeta = join(CEREBRO, `Cartolas ${empresa}`)
  try {
    const existente = readdirSync(CEREBRO).find((d) => d.startsWith('Cartolas ') && norm(d.slice(9)) === norm(empresa))
    if (existente) carpeta = join(CEREBRO, existente)
  } catch { /* si no se puede listar, se usa el nombre tal cual */ }
  mkdirSync(carpeta, { recursive: true })
  const escritos = []
  for (const [mes, movs] of Object.entries(porMes)) {
    movs.sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''))
    const abonos = movs.filter((m) => m.monto > 0).reduce((s, m) => s + m.monto, 0)
    const cargos = movs.filter((m) => m.monto < 0).reduce((s, m) => s + Math.abs(m.monto), 0)
    const nombreMes = MESES[Number(mes.slice(5, 7)) - 1] || mes
    const filas = movs.map((m) => {
      const cargo = m.monto < 0 ? clp(Math.abs(m.monto)) : ''
      const abono = m.monto > 0 ? clp(m.monto) : ''
      const saldo = m.saldo != null ? clp(m.saldo) : ''
      const desc = String(m.descripcion || '').replace(/\|/g, '/').slice(0, 70)
      return `| ${m.fecha} | ${desc} | ${cargo} | ${abono} | ${saldo} |`
    }).join('\n')
    const md = `---
tipo: cartola
empresa: ${empresa}
banco: Santander
periodo: ${mes}
cuenta: ${d.cuenta || ''}
fuente: ${d._fuente || 'banco'}
actualizado: ${new Date(d._ts || Date.now()).toISOString()}
---

# Cartola ${nombreMes} ${mes.slice(0, 4)} · ${empresa}

- **Movimientos:** ${movs.length}
- **Abonos (ingresos):** ${clp(abonos)}
- **Cargos (egresos):** ${clp(cargos)}
- **Neto del mes:** ${clp(abonos - cargos)}

| Fecha | Descripción | Cargo | Abono | Saldo |
|---|---|---:|---:|---:|
${filas}
`
    const ruta = join(carpeta, `${mes} — ${nombreMes}.md`)
    writeFileSync(ruta, md, 'utf8')
    escritos.push({ mes, movs: movs.length, ruta: ruta.replace(join(DIR, '..'), '') })
  }
  return { empresa, meses: escritos }
}

const archivos = existsSync(DATA) ? readdirSync(DATA).filter((f) => /^emp-.*-movs\.json$/.test(f)) : []
const salida = archivos.map(volcar).filter(Boolean)
console.log(JSON.stringify({ ok: true, empresas: salida.length, detalle: salida }, null, 1))
