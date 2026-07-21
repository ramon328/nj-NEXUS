// ============================================================
// Actualización del tablero "Avance de Proyectos" — 17 jun 2026
//
// Pone al día forja_projects / forja_cards reflejando el estado
// REAL de cada repo del equipo (leído de ~/Documents/GitHub).
//
// Idempotente: matchea por (proyecto + título de tarjeta).
//   - existe  -> actualiza column_key/description si cambió
//   - no existe-> inserta al final de su columna
//   - nunca borra
//
// Uso (la key NUNCA se hardcodea ni se commitea):
//   SUPABASE_URL=https://ydcpsihovvaefyobnhws.supabase.co \
//   SUPABASE_SERVICE_ROLE_KEY=<service_role> \
//   node supabase/update_avances_2026-06-17.mjs
// ============================================================

import { createClient } from '@supabase/supabase-js'

const URL = process.env.SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) {
  console.error('Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en el entorno.')
  process.exit(1)
}
const db = createClient(URL, KEY, { auth: { persistSession: false } })

// ── Tarjetas a agregar / mover en proyectos EXISTENTES ───────────────────────
// (solo nuevas o con cambio de estado; las del seed que no cambian no se listan)
const UPDATES = {
  'Plataforma Aliace': [
    ['done',  'Costo/margen 2026 100% en vivo desde Aliace', 'Sin depender de Power BI; cálculo en tiempo real.'],
    ['done',  'Gate de acceso Forja + IA ejecutiva', 'Entrada con sesión de Forja y análisis ejecutivo con IA (Haiku).'],
    ['done',  'Núcleo predictivo de compra de aceite', 'Dashboard con 3 modelos (v1/v2/v3) y lecturas AM/PM automáticas.'],
    ['doing', 'KPIs ejecutivos de la fila superior', 'Completar las 4 métricas ejecutivas del encabezado.'],
    ['todo',  'Confirmar definición de RECUPERADO y tipo de venta', 'Cerrar con Nico la regla de cliente recuperado y la dimensión de tipo de venta.'],
    ['todo',  'Automatizar 5 variables manuales del modelo', 'Conectar CFTC, NOAA (ENSO) y USDA (WASDE) para quitar la carga manual.'],
  ],
  'Ali — IA de Aliace': [
    ['done',  'Plataforma multi-agente en producción', 'Construida sobre Mastra; enruta a agentes especializados.'],
    ['done',  'Ali cuadra ventas al peso contra Facturas', 'Conciliación de ventas verificada (v12).'],
  ],
  'Inteligencia de competencia (Impomin)': [
    ['done',  'Schema Supabase + alertas a WhatsApp', 'Vistas/RPC en Postgres y envío de alertas a WhatsApp.'],
    ['done',  '4 adaptadores verificados', 'Lorenzini, RAC, Imperial y Prodalam operativos.'],
    ['doing', '7 adaptadores JSON-LD genéricos por ajustar', 'Falta configurar sitemap_url / filtro de URL en cada uno.'],
    ['doing', '3 sitios con Playwright', 'Implementos, Easy y Sodimac: verificar selectores.'],
    ['todo',  'Cargar catálogo IMPOMIN (CSV)', 'Para cruzar contra los precios de la competencia.'],
    ['todo',  'Definir umbral Δ precio y frecuencia de scrapeo', 'Y confirmar la lista final de 14 competidores.'],
  ],
  'Autos Intel': [
    ['done',  'Scraper en producción (GitHub Actions 2×/día)', 'Corre solo mañana y noche; base de 11.738 autos.'],
    ['done',  'Auto-archivo al vender', 'Trigger en la BD archiva el aviso cuando se marca vendido.'],
    ['done',  'Adaptadores ChileAutos / Yapo / Linze', 'Con historial de precios (delta_clp / delta_pct).'],
    ['doing', 'Sortear bloqueo DataDome de ChileAutos', 'Requiere IP residencial o proxy desde datacenter.'],
  ],
  'App de scrapeo integrada al hub (SSO)': [
    ['done',  'Validación de forja_token en el scraper', 'Acceso único desde Forja en autosintel y el backend.'],
  ],
  'Conexión multibancos': [
    ['done',  '6 Edge Functions en producción (Rail)', 'banks-list, issue-widget-token, rail-callback, sync-link, disconnect-link, import-links + webhook.'],
    ['done',  'Asistente Pato 🦆 de finanzas', 'IA (Haiku) que responde sobre ingresos/egresos y detecta links con problemas.'],
    ['todo',  'Conseguir demo link real de Rail', 'Test mode no crea links reales; pedir a soporte@rail.cl.'],
    ['todo',  'PRDs 02–07', 'Snapshots/historial, control de tarjetas, dashboard consolidado, alertas, multi-entidad y config.'],
  ],
  'Ali — agente de IA por WhatsApp (Alaice)': [
    ['done',  'Néstor (agente de correos) operativo', 'Lectura multi-buzón con reintentos ante fallos de red.'],
    ['doing', 'Agente goautos (stub)', 'Faltan herramientas y conectar el Supabase de GoAutos.'],
  ],
  'Ailnest — correo inteligente': [
    ['done',  'Filtrado de la bandeja', 'Vista por pestañas (Todos, Importantes, CC) funcionando.'],
    ['done',  'Chat con agente IA + herramientas', 'Respuestas inteligentes y acciones sobre la bandeja.'],
    ['done',  'Responder a todos / reenviar / papelera', 'Con selector de destinatarios; eliminar manda a la papelera de Gmail.'],
    ['done',  'Reconexión de Gmail in-place', 'Reconectar la cuenta sin salir de la bandeja.'],
  ],
  'Plataforma de cálculo de clínica': [
    ['done',  'Persistencia mensual con descargas PDF', 'Cada mes queda guardado con su PDF por especialidad.'],
    ['done',  'IA interpreta dudas y auto-llena campos', 'Responde en lenguaje natural y completa formularios.'],
    ['done',  'Acceso vía sesión Forja', 'Entrada restringida con forja_token.'],
    ['doing', 'Validación contra liquidación real', 'Conciliación contra Alfonso Cerda (mayo 2026).'],
    ['todo',  'Mejorar detección de cambio de mes', 'Y ampliar el catálogo de reglas especiales.'],
  ],
}

// ── Proyectos NUEVOS a crear ─────────────────────────────────────────────────
const NEW_PROJECTS = [
  {
    name: 'Comisiones IMPOMIN/HN',
    description: 'Liquidación mensual de comisiones desde exports SAP (IMPOMIN e Importadora HN).',
    cards: [
      ['done',  'Motor de cálculo por vendedor + 19 tests', 'Reglas Yhery (tramo), Freya (margen), Carlos/Alejandro (margen móvil); 100% testeable.'],
      ['done',  'Parser de exports SAP', 'Lee Excel/TSV chileno (encabezados por nombre, tildes y mayúsculas).'],
      ['done',  'Cierre de período idempotente + histórico', 'Período del 24 al 23; evita duplicados y guarda cierres anteriores.'],
      ['done',  'Listas HN: costos SKU + clientes excluidos', 'Costo por SKU y clientes con comisión 0%.'],
      ['done',  'Export a Excel (Resumen + Detalle)', 'Línea por línea por vendedor.'],
      ['doing', 'Integración SSO Forja', 'Acceso vía ?forja_token desde el portal.'],
      ['todo',  'QA end-to-end del SSO y permisos', 'Validar quién puede ver qué empresa.'],
    ],
  },
  {
    name: 'Academia de IA',
    description: 'Curso online de IA/Claude en 11 módulos progresivos con quizzes y barra de progreso.',
    cards: [
      ['done', 'UI completa (mock)', 'Dashboard, 11 módulos, progreso, quizzes y bloqueo de módulos.'],
      ['todo', 'Backend real', 'Autenticación y persistencia del progreso del usuario.'],
      ['todo', 'Contenido real de lecciones', 'Hoy solo existe la estructura/layout.'],
      ['todo', 'Conectar scoring/desbloqueo y Claude API', 'Lógica de quiz y ejercicios asistidos por IA.'],
    ],
  },
  {
    name: 'Integración SII',
    description: 'SIInvergüenza — extractor de documentos del SII (Chile) con RUT + Clave. Backend FastAPI + frontend Next.js.',
    cards: [
      ['done',  'Web app: backend FastAPI + frontend Next.js', 'Con script de arranque único (start-web.sh) que levanta ambos.'],
      ['done',  'Login RUT + Clave Tributaria', 'Con control de ritmo (delays + User-Agent real) anti-bloqueo.'],
      ['done',  'Extracción RCV / DTEs', 'Compras y ventas por período o rango.'],
      ['done',  'Storage local + Supabase', 'Documentos a disco y, opcional, a bucket privado de Supabase.'],
      ['doing', 'Carpeta tributaria + F29 / F22', 'Falta confirmar los endpoints reales de descarga.'],
      ['todo',  'Verificar test-login en vivo', 'Una sola request, sin riesgo, para validar credenciales.'],
    ],
  },
]

// Tarjetas placeholder a eliminar (quedaron obsoletas al encontrar el repo real)
const DELETIONS = {
  'Integración SII': ['Definir alcance del proyecto', 'Arrancar implementación'],
}

// ── Reconciliación ───────────────────────────────────────────────────────────
const norm = (s) => (s || '').trim().toLowerCase()
let inserted = 0, updated = 0, noop = 0, createdProjects = 0

async function getOrCreateProject(name, description) {
  const { data: existing, error } = await db.from('forja_projects').select('id, name, description')
  if (error) throw error
  const found = existing.find((p) => norm(p.name) === norm(name))
  if (found) {
    if (description && (found.description || '') !== description) {
      await db.from('forja_projects').update({ description }).eq('id', found.id)
      console.log(`  ~ descripción actualizada: ${name}`)
    }
    return found.id
  }
  const { data, error: insErr } = await db
    .from('forja_projects')
    .insert({ name, description: description || '' })
    .select('id')
    .single()
  if (insErr) throw insErr
  createdProjects++
  console.log(`  + proyecto creado: ${name}`)
  return data.id
}

async function reconcileCards(projectId, projectName, cards) {
  const { data: existing, error } = await db
    .from('forja_cards')
    .select('id, column_key, title, description, position')
    .eq('project_id', projectId)
  if (error) throw error

  // posición = siguiente índice libre por columna
  const nextPos = {}
  for (const c of existing) nextPos[c.column_key] = Math.max(nextPos[c.column_key] ?? -1, c.position ?? 0)

  for (const [col, title, descr] of cards) {
    const match = existing.find((c) => norm(c.title) === norm(title))
    if (match) {
      if (match.column_key !== col || (match.description || '') !== (descr || '')) {
        const { error: upErr } = await db
          .from('forja_cards')
          .update({ column_key: col, description: descr || '' })
          .eq('id', match.id)
        if (upErr) throw upErr
        updated++
        console.log(`    ~ ${projectName} :: "${title}" (${match.column_key}→${col})`)
      } else {
        noop++
      }
      continue
    }
    const pos = (nextPos[col] = (nextPos[col] ?? -1) + 1)
    const { error: insErr } = await db
      .from('forja_cards')
      .insert({ project_id: projectId, column_key: col, title, description: descr || '', position: pos })
    if (insErr) throw insErr
    inserted++
    console.log(`    + ${projectName} :: [${col}] "${title}"`)
  }
}

async function main() {
  console.log('== Proyectos existentes ==')
  for (const [name, cards] of Object.entries(UPDATES)) {
    const id = await getOrCreateProject(name) // ya existen; si no, los crea sin desc
    await reconcileCards(id, name, cards)
  }

  console.log('\n== Proyectos nuevos ==')
  for (const p of NEW_PROJECTS) {
    const id = await getOrCreateProject(p.name, p.description)
    await reconcileCards(id, p.name, p.cards)
  }

  let deleted = 0
  for (const [pname, titles] of Object.entries(DELETIONS)) {
    const { data: projs } = await db.from('forja_projects').select('id, name')
    const proj = projs?.find((p) => norm(p.name) === norm(pname))
    if (!proj) continue
    const { data: cards } = await db.from('forja_cards').select('id, title').eq('project_id', proj.id)
    for (const t of titles) {
      const c = cards?.find((x) => norm(x.title) === norm(t))
      if (c) { await db.from('forja_cards').delete().eq('id', c.id); deleted++; console.log(`    - ${pname} :: "${t}"`) }
    }
  }

  console.log(`\n== Resumen ==`)
  console.log(`  tarjetas eliminadas: ${deleted}`)
  console.log(`  proyectos creados : ${createdProjects}`)
  console.log(`  tarjetas insertadas: ${inserted}`)
  console.log(`  tarjetas movidas/editadas: ${updated}`)
  console.log(`  sin cambios: ${noop}`)
}

main().catch((e) => { console.error('ERROR:', e.message || e); process.exit(1) })
