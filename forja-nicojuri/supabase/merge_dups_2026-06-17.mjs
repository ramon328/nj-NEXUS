// ============================================================
// Fusión de proyectos duplicados + renombre — 17 jun 2026
//
//   plataforma-calculo            -> Plataforma de cálculo de clínica
//   Lia-AI(agente de ia Aliace)   -> (Ali — agente de IA por WhatsApp (Alaice)) renombrado a "Lia"
//
// Mueve las tarjetas únicas del duplicado al canónico (sin duplicar por título),
// arrastra la descripción si el canónico no tiene una mejor, y borra el duplicado
// (cascade borra sus tarjetas). Idempotente: si el duplicado ya no existe, no hace nada.
//
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node supabase/merge_dups_2026-06-17.mjs
// ============================================================
import { createClient } from '@supabase/supabase-js'
const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const norm = (s) => (s || '').trim().toLowerCase()

// dup -> { canon, rename?, useDupDescription? }
const MERGES = [
  { dup: 'plataforma-calculo', canon: 'Plataforma de cálculo de clínica' },
  { dup: 'Lia-AI(agente de ia Aliace)', canon: 'Ali — agente de IA por WhatsApp (Alaice)', rename: 'Lia', useDupDescription: true },
]

const { data: projs } = await db.from('forja_projects').select('id,name,description')

for (const m of MERGES) {
  const dup = projs.find((p) => norm(p.name) === norm(m.dup))
  const canon = projs.find((p) => norm(p.name) === norm(m.canon))
  if (!canon) { console.log(`! canónico no encontrado: ${m.canon}`); continue }

  // renombre
  if (m.rename && canon.name !== m.rename) {
    await db.from('forja_projects').update({ name: m.rename }).eq('id', canon.id)
    console.log(`~ renombrado: "${canon.name}" -> "${m.rename}"`)
  }

  if (!dup) { console.log(`= sin duplicado que fusionar para ${m.canon}`); continue }

  // mover tarjetas únicas
  const { data: dupCards } = await db.from('forja_cards').select('column_key,title,description').eq('project_id', dup.id)
  const { data: canonCards } = await db.from('forja_cards').select('column_key,title,position').eq('project_id', canon.id)
  const nextPos = {}
  for (const c of canonCards) nextPos[c.column_key] = Math.max(nextPos[c.column_key] ?? -1, c.position ?? 0)
  let moved = 0
  for (const c of dupCards) {
    if (canonCards.some((x) => norm(x.title) === norm(c.title))) continue
    const pos = (nextPos[c.column_key] = (nextPos[c.column_key] ?? -1) + 1)
    await db.from('forja_cards').insert({ project_id: canon.id, column_key: c.column_key, title: c.title, description: c.description || '', position: pos })
    moved++
    console.log(`  + ${m.rename || canon.name} :: [${c.column_key}] "${c.title}"`)
  }

  // descripción
  if (m.useDupDescription && dup.description && dup.description.trim()) {
    await db.from('forja_projects').update({ description: dup.description.trim() }).eq('id', canon.id)
    console.log(`  ~ descripción tomada del duplicado`)
  }

  // borrar duplicado (cascade)
  await db.from('forja_cards').delete().eq('project_id', dup.id)
  await db.from('forja_projects').delete().eq('id', dup.id)
  console.log(`- borrado duplicado: "${dup.name}" (${moved} tarjetas movidas)`)
}
console.log('OK')
