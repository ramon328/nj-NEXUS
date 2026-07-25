import * as p from '/Users/AIagenteia/nexus/conector-tek/pendientes.mjs'
const [userId, ...emp] = process.argv.slice(2)
const empresa = emp.join(' ') || undefined
console.log('PENDIENTES de', userId, '·', empresa || '(default)')
const r = await p.listarPendientes({ userId, empresa })
console.log('RESULT:', JSON.stringify(r).slice(0, 1400))
process.exit(r.ok ? 0 : 1)
