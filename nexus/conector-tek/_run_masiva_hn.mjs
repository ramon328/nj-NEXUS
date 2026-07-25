import * as m from '/Users/AIagenteia/nexus/conector-tek/masiva.mjs'
const transfers = [
  { cuenta: '72019474', banco: 'Santander', rut: '76.106.636-6',
    nombre: 'IMPORTADORA HN SPA', monto: 10000000,
    glosa: 'Devolución préstamo', mensaje: 'Devolución préstamo' },
]
console.log('MASIVA HN $10M — 1 intento, sin reintentos')
const r = await m.ejecutarMasivo(transfers, { concepto: 'Pago de Reembolsos', userId: 'ramon', empresa: 'ANA CLARA SPA' })
console.log('RESULT:', JSON.stringify(r))
process.exit(r.ok ? 0 : 1)
