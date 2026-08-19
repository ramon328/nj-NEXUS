import { ACTION_CLASSES, DEFAULT_TIMEOUT_MS, isActionClass } from './classes.mjs'

function cap(name, actionClass, opts = {}) {
  if (!isActionClass(actionClass)) throw new Error(`bad class for ${name}`)
  return Object.freeze({
    name,
    version: opts.version || '1.0.0',
    owner: opts.owner || 'nexus-hub',
    purpose: opts.purpose || name,
    class: actionClass,
    scopes: Object.freeze(opts.scopes || []),
    idempotency: opts.idempotency ?? (actionClass === 'reversible_mutation' || actionClass === 'irreversible_mutation'),
    timeout_ms: opts.timeout_ms || DEFAULT_TIMEOUT_MS[actionClass],
    redaction: Object.freeze(opts.redaction || ['credential', 'cookie', 'token']),
    audit_fields: Object.freeze(opts.audit_fields || ['actor_id', 'tenant_id', 'project_id', 'class', 'tool']),
    rollback: opts.rollback || null,
    mixed: Boolean(opts.mixed),
    extra_approval: actionClass === 'irreversible_mutation',
    default_project: opts.default_project || null,
  })
}

const R = 'read'
const D = 'draft'
const M = 'reversible_mutation'
const I = 'irreversible_mutation'

const aliace = ['aliace']
const sii = ['sii']
const mallorca = ['mallorca']
const correo = ['correo']
const bd = ['bd']
const cerebro = ['cerebro']
const banco = ['banco']
const admin = ['admin']

/**
 * Frozen declarations for every in-process hub tool.
 * Adapters declare. They do not authorize.
 * Mixed tools (one name, several verbs) take the safest class that still matches
 * the dominant use; `mixed: true` means a later split is required.
 */
export const CAPABILITIES = Object.freeze([
  cap('listar_tablas', R, { scopes: bd, purpose: 'list business db tables' }),
  cap('consultar_bd', R, { scopes: bd, purpose: 'read-only business db query' }),
  cap('buscar_cerebro', R, { scopes: cerebro, purpose: 'search markdown vault' }),
  cap('guardar_nota', M, { scopes: cerebro, purpose: 'write vault note', rollback: 'delete-note' }),
  cap('navegar', M, { scopes: aliace, purpose: 'browser goto', timeout_ms: 60_000, mixed: true }),
  cap('ver_pestanas', R, { scopes: aliace, purpose: 'list browser tabs' }),
  cap('cambiar_pestana', M, { scopes: aliace, purpose: 'switch browser tab' }),
  cap('leer_pagina', R, { scopes: aliace, purpose: 'read page text' }),
  cap('captura_pantalla', R, { scopes: aliace, purpose: 'screenshot' }),
  cap('escribir_en_campo', M, { scopes: aliace, purpose: 'type in browser' }),
  cap('clic', M, { scopes: aliace, purpose: 'click in browser' }),
  cap('esperar', R, { scopes: aliace, purpose: 'wait for selector', timeout_ms: 60_000 }),
  cap('leer_tabla', R, { scopes: aliace, purpose: 'read table from page' }),
  cap('guia_aliace', R, { scopes: aliace, purpose: 'erp navigation guide' }),
  cap('iniciar_sesion', M, { scopes: aliace, purpose: 'browser login helper' }),
  cap('guardar_credencial', I, { scopes: aliace, purpose: 'store site credential', extra_approval: true }),
  cap('listar_sitios', R, { scopes: aliace, purpose: 'list saved sites' }),
  cap('consultar_goautos', R, { scopes: mallorca, purpose: 'read inventory', default_project: 'proj-001' }),
  cap('editar_goautos', M, { scopes: mallorca, purpose: 'edit inventory', default_project: 'proj-001' }),
  cap('adquisicion_goautos', M, { scopes: mallorca, purpose: 'record acquisition', default_project: 'proj-001' }),
  cap('cliente_goautos', M, { scopes: mallorca, purpose: 'upsert customer', default_project: 'proj-001' }),
  cap('espejo_goautos', R, { scopes: mallorca, purpose: 'mirror listing status', default_project: 'proj-001' }),
  cap('editar_venta_goautos', M, { scopes: mallorca, purpose: 'edit sale', default_project: 'proj-001' }),
  cap('vender_goautos', M, { scopes: mallorca, purpose: 'record sale', default_project: 'proj-001' }),
  cap('gasto_goautos', M, { scopes: mallorca, purpose: 'record dealership expense', default_project: 'proj-001' }),
  cap('subir_auto', M, { scopes: mallorca, purpose: 'publish vehicle', default_project: 'proj-001' }),
  cap('consultar_mallorca', R, { scopes: mallorca, purpose: 'read dealership metrics', default_project: 'proj-001' }),
  cap('documentos_autos', R, { scopes: mallorca, purpose: 'vehicle document dates', default_project: 'proj-001' }),
  cap('enviar_fotos_autos', R, { scopes: mallorca, purpose: 'send vehicle photos', default_project: 'proj-001' }),
  cap('leads_goautos', R, { scopes: mallorca, purpose: 'list leads', default_project: 'proj-001' }),
  cap('lead_estado_goautos', M, { scopes: mallorca, purpose: 'update lead state', default_project: 'proj-001' }),
  cap('citas_goautos', R, { scopes: mallorca, purpose: 'list appointments', default_project: 'proj-001' }),
  cap('financiamiento_goautos', R, { scopes: mallorca, purpose: 'read financing', default_project: 'proj-001' }),
  cap('documentos_goautos', R, { scopes: mallorca, purpose: 'list dealership docs', default_project: 'proj-001' }),
  cap('marketing_goautos', R, { scopes: mallorca, purpose: 'read marketing', default_project: 'proj-001' }),
  cap('equipo_goautos', R, { scopes: mallorca, purpose: 'list staff', default_project: 'proj-001' }),
  cap('gastos_fijos_goautos', R, { scopes: mallorca, purpose: 'read fixed costs', default_project: 'proj-001' }),
  cap('config_goautos', R, { scopes: mallorca, purpose: 'read dealership config', default_project: 'proj-001' }),
  cap('tasar_auto', R, { scopes: mallorca, purpose: 'appraise vehicle', default_project: 'proj-001' }),
  cap('crear_tarea_goautos', M, { scopes: mallorca, purpose: 'create task', default_project: 'proj-001' }),
  cap('crear_cotizacion_goautos', D, { scopes: mallorca, purpose: 'draft quote', default_project: 'proj-001' }),
  cap('crear_reserva_goautos', M, { scopes: mallorca, purpose: 'create reservation', default_project: 'proj-001' }),
  cap('correo', R, { scopes: correo, purpose: 'read mailbox', mixed: true }),
  cap('sii', M, { scopes: sii, purpose: 'tax documents (download/emit mixed)', mixed: true, default_project: 'proj-001' }),
  cap('banco', R, { scopes: banco, purpose: 'read bank balances', default_project: 'proj-001' }),
  cap('aliace_rpc', R, { scopes: aliace, purpose: 'erp rpc read', default_project: 'proj-002' }),
  cap('aliace_sql', R, { scopes: aliace, purpose: 'erp readonly sql', default_project: 'proj-002' }),
  cap('aliace_resumen', R, { scopes: aliace, purpose: 'erp monthly summary', default_project: 'proj-002' }),
  cap('aliace_margen', R, { scopes: aliace, purpose: 'erp margin', default_project: 'proj-002' }),
  cap('aliace_anual', R, { scopes: aliace, purpose: 'erp annual summary', default_project: 'proj-002' }),
  cap('aliace_mover_nv', M, { scopes: aliace, purpose: 'move sales note', default_project: 'proj-002' }),
  cap('aliace_pago', I, { scopes: aliace, purpose: 'register erp payment', default_project: 'proj-002', rollback: null }),
  cap('aliace_editar_nv', M, { scopes: aliace, purpose: 'edit sales note', default_project: 'proj-002' }),
  cap('aliace_crear_nv', M, { scopes: aliace, purpose: 'create sales note', default_project: 'proj-002' }),
  cap('graficar', D, { scopes: [], purpose: 'render chart (not live write)' }),
  cap('enviar_audio', M, { scopes: [], purpose: 'send voice note' }),
  cap('agregar_usuario', M, { scopes: admin, purpose: 'provision nexus user' }),
  cap('listar_usuarios', R, { scopes: admin, purpose: 'list nexus users' }),
  cap('quitar_usuario', I, { scopes: admin, purpose: 'deprovision nexus user' }),
  cap('programar_mensaje', M, { scopes: admin, purpose: 'schedule outbound message' }),
  cap('enviar_mensaje', M, { scopes: admin, purpose: 'send outbound message' }),
  cap('listar_recordatorios', R, { scopes: admin, purpose: 'list reminders' }),
  cap('cancelar_recordatorio', M, { scopes: admin, purpose: 'cancel reminder', rollback: null }),
  cap('gmail_documentos', R, { scopes: correo, purpose: 'download mailbox attachments' }),
  cap('mi_dia', R, { scopes: cerebro, purpose: 'daily vault digest' }),
  cap('plaud_estado', R, { scopes: cerebro, purpose: 'transcription pipeline status' }),
  cap('sii_boleta_honorarios', R, { scopes: sii, purpose: 'fee receipts', default_project: 'proj-001' }),
  cap('sai_conciliacion', R, { scopes: sii, purpose: 'tax-bank reconcile', default_project: 'proj-001' }),
  cap('sai_buscar_factura', R, { scopes: sii, purpose: 'find invoice', default_project: 'proj-001' }),
  cap('sai_movimientos_banco', R, { scopes: sii, purpose: 'bank movements for reconcile', default_project: 'proj-001' }),
  cap('sai_mallorca_compras', R, { scopes: sii, purpose: 'purchase invoices', default_project: 'proj-001' }),
  cap('recordar', M, { scopes: [], purpose: 'persist user memory fact' }),
  cap('solicitar_tag', M, { scopes: mallorca, purpose: 'request toll tag transfer', default_project: 'proj-001' }),
  cap('autos_con_tag', R, { scopes: mallorca, purpose: 'count tagged vehicles', default_project: 'proj-001' }),
  cap('generar_cav', D, { scopes: mallorca, purpose: 'generate vehicle report draft', default_project: 'proj-001' }),
  cap('descargar_informe', R, { scopes: mallorca, purpose: 'download vehicle report', default_project: 'proj-001' }),
  cap('datos_auto_cav', R, { scopes: mallorca, purpose: 'read stored vehicle report', default_project: 'proj-001' }),
  cap('crear_contrato', D, { scopes: mallorca, purpose: 'draft transfer contract', default_project: 'proj-001' }),
  cap('compra', M, { scopes: mallorca, purpose: 'register purchase', default_project: 'proj-001' }),
  cap('venta', I, { scopes: mallorca, purpose: 'emit sale / tax document', mixed: true, default_project: 'proj-001' }),
  cap('conciliacion', R, { scopes: mallorca, purpose: 'reconcile purchases', default_project: 'proj-001' }),
  cap('cartola', R, { scopes: mallorca, purpose: 'bank statement extract', default_project: 'proj-001' }),
  cap('gasto', M, { scopes: mallorca, purpose: 'register expense', default_project: 'proj-001' }),
  cap('factura_compra', M, { scopes: sii, purpose: 'purchase invoice workflow', mixed: true, default_project: 'proj-001' }),
  cap('novedades_nexus', R, { scopes: [], purpose: 'product changelog' }),
  cap('recordar_conversacion', M, { scopes: [], purpose: 'store conversation summary' }),
  cap('guardar_recordatorio', M, { scopes: [], purpose: 'create reminder' }),
  cap('tek_pago', M, { scopes: banco, purpose: 'prepare bank payment (not wire)', default_project: 'proj-001' }),
  cap('pendientes_sistema', R, { scopes: [], purpose: 'system backlog' }),
  cap('tek_beneficiarios', R, { scopes: banco, purpose: 'list payees', default_project: 'proj-001' }),
  cap('tek_transferir', I, { scopes: banco, purpose: 'send bank transfer', timeout_ms: 180_000, default_project: 'proj-001' }),
  cap('tek_masiva', I, { scopes: banco, purpose: 'bulk bank transfer', timeout_ms: 180_000, default_project: 'proj-001' }),
  cap('tek_comprobantes', R, { scopes: banco, purpose: 'list transfer receipts', default_project: 'proj-001' }),
  cap('pagos_sin_subir', R, { scopes: banco, purpose: 'payments pending upload', default_project: 'proj-001' }),
  cap('tek_pendientes', R, { scopes: banco, purpose: 'pending bank ops', default_project: 'proj-001' }),
  cap('tek_sesion', R, { scopes: banco, purpose: 'bank session health', default_project: 'proj-001' }),
  cap('reconectar_banco', M, { scopes: banco, purpose: 'reconnect bank session', default_project: 'proj-001' }),
  cap('vincular_banco', M, { scopes: banco, purpose: 'link bank login', default_project: 'proj-001' }),
  cap('mis_bancos_conectados', R, { scopes: banco, purpose: 'list linked banks', default_project: 'proj-001' }),
  cap('alertar_usuario', M, { scopes: admin, purpose: 'push template alert' }),
  cap('enviar_mensaje_externo', M, { scopes: [], purpose: 'message non-user number' }),
  cap('ver_respuestas_externo', R, { scopes: [], purpose: 'read external replies' }),
  cap('listar_externos', R, { scopes: [], purpose: 'list external contacts' }),
])

const BY_NAME = new Map(CAPABILITIES.map((c) => [c.name, c]))

export function capability(name) {
  return BY_NAME.get(name) || null
}

export function capabilityNames() {
  return CAPABILITIES.map((c) => c.name)
}

export function assertFrozen() {
  for (const c of CAPABILITIES) {
    if (!c.name || !isActionClass(c.class)) throw new Error(`invalid capability ${c.name}`)
  }
  if (new Set(capabilityNames()).size !== CAPABILITIES.length) throw new Error('duplicate capability name')
}
