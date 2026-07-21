// run-schema.mjs — Ejecuta supabase-schema.sql contra la BD por conexión directa.
// Uso: DATABASE_URL=postgres://... node run-schema.mjs
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import pg from 'pg'

const __dirname = dirname(fileURLToPath(import.meta.url))
const sql = readFileSync(join(__dirname, 'supabase-schema.sql'), 'utf8')

const url = process.env.DATABASE_URL
if (!url) { console.error('Falta DATABASE_URL'); process.exit(1) }

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
try {
  await client.connect()
  await client.query(sql)
  const { rows } = await client.query(
    "select table_name from information_schema.tables where table_schema='public' order by table_name")
  console.log('✅ Esquema ejecutado. Tablas en public:')
  rows.forEach(r => console.log('   -', r.table_name))
} catch (e) {
  console.error('⚠️ Error:', e.message)
  process.exit(2)
} finally {
  await client.end()
}
