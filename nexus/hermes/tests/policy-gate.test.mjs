import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mapIdentity, identityComplete, missingIdentityFields } from '../identity.mjs'
import { createPolicyGate } from '../policy-gate.mjs'
import { createAudit } from '../audit.mjs'
import { createTicketStore, issueSessionTicket } from '../tickets.mjs'
import { capabilityNames, capability, assertFrozen } from '../capability-registry.mjs'
import { authorizeHubTool } from '../hub-adapter.mjs'

function id(over = {}) {
  return mapIdentity({
    tenant_id: 'tenant-test-01',
    actor_id: 'actor-test-admin',
    channel: 'whatsapp',
    conversation_id: 'conv-test-01',
    correlation_id: 'corr-test-01',
    registered: true,
    admin: true,
    scopes: ['aliace', 'sii', 'mallorca', 'correo', 'bd', 'cerebro', 'banco', 'admin'],
    project_ids: ['proj-001', 'proj-002'],
    ...over,
  })
}

function gate() {
  const audit = createAudit({ file: join(tmpdir(), `hermes-audit-${Date.now()}.jsonl`) })
  return { audit, policy: createPolicyGate({ audit }) }
}

test('identity contract: missing fields fail closed', () => {
  const incomplete = mapIdentity({ channel: 'whatsapp' })
  assert.equal(identityComplete(incomplete), false)
  assert.ok(missingIdentityFields(incomplete).includes('tenant_id'))
  assert.ok(missingIdentityFields(incomplete).includes('actor_id'))
})

test('registry freeze: unique names and valid classes', () => {
  assertFrozen()
  assert.ok(capabilityNames().length >= 100)
  assert.equal(capability('tek_transferir').class, 'irreversible_mutation')
  assert.equal(capability('aliace_pago').class, 'irreversible_mutation')
  assert.equal(capability('aliace_resumen').class, 'read')
  assert.deepEqual(capability('aliace_resumen').scopes, ['aliace'])
  assert.equal(capability('graficar').class, 'draft')
})

test('deny missing actor/tenant and audit the deny', () => {
  const { audit, policy } = gate()
  const r = policy.authorize({ toolName: 'consultar_bd', identity: mapIdentity({}) })
  assert.equal(r.allow, false)
  assert.equal(r.code, 'missing_identity')
  assert.equal(audit.entries.some((e) => e.outcome === 'deny' && e.code === 'missing_identity'), true)
})

test('unknown tool fails closed', () => {
  const { policy } = gate()
  const r = policy.authorize({ toolName: 'not_a_real_tool', identity: id() })
  assert.equal(r.allow, false)
  assert.equal(r.code, 'unknown_tool')
})

test('unregistered actor cannot run tools', () => {
  const { policy } = gate()
  const r = policy.authorize({
    toolName: 'novedades_nexus',
    identity: id({ actor_id: 'actor-unknown', registered: false, admin: false }),
  })
  assert.equal(r.allow, false)
  assert.equal(r.code, 'actor_not_registered')
})

test('read allowed for bound registered actor', () => {
  const { audit, policy } = gate()
  const r = policy.authorize({ toolName: 'aliace_resumen', identity: id({ admin: false, scopes: ['aliace'] }) })
  assert.equal(r.allow, true)
  assert.equal(r.class, 'read')
  assert.equal(audit.entries.some((e) => e.outcome === 'allow'), true)
})

test('confused deputy: sii-only actor cannot run tek_transferir', () => {
  const { policy } = gate()
  const r = policy.authorize({
    toolName: 'tek_transferir',
    identity: id({
      admin: false,
      actor_id: 'actor-test-sii',
      scopes: ['sii'],
      project_ids: ['proj-001'],
    }),
    ticketId: 'tkt-test',
    idempotencyKey: 'idem-test',
    extraApproval: true,
  })
  assert.equal(r.allow, false)
  assert.equal(r.code, 'missing_scope')
})

test('mutation without ticket fails closed', () => {
  const { policy } = gate()
  const r = policy.authorize({
    toolName: 'guardar_nota',
    identity: id({ admin: false, scopes: ['cerebro'], project_ids: ['proj-001'] }),
  })
  assert.equal(r.allow, false)
  assert.equal(r.code, 'missing_ticket')
})

test('unknown project write fails closed', () => {
  const { policy } = gate()
  const r = policy.authorize({
    toolName: 'editar_goautos',
    identity: id({ admin: false, scopes: ['mallorca'], project_ids: ['proj-001'] }),
    projectId: 'proj-does-not-exist',
    ticketId: 'tkt-1',
    idempotencyKey: 'idem-1',
  })
  assert.equal(r.allow, false)
  assert.equal(r.code, 'unknown_project')
})

test('unbound project write fails closed', () => {
  const { policy } = gate()
  const r = policy.authorize({
    toolName: 'aliace_crear_nv',
    identity: id({ admin: false, scopes: ['aliace', 'mallorca'], project_ids: ['proj-001'] }),
    projectId: 'proj-002',
    ticketId: 'tkt-1',
    idempotencyKey: 'idem-1',
  })
  assert.equal(r.allow, false)
  assert.equal(r.code, 'unbound_project')
})

test('dormant project writes fail closed for non-admin', () => {
  const { policy } = gate()
  const r = policy.authorize({
    toolName: 'sii',
    identity: id({ admin: false, scopes: ['sii'], project_ids: ['proj-003'] }),
    projectId: 'proj-003',
    ticketId: 'tkt-1',
    idempotencyKey: 'idem-1',
  })
  assert.equal(r.allow, false)
  assert.equal(r.code, 'project_not_writable')
})

test('irreversible without extra approval fails closed', () => {
  const { policy } = gate()
  const r = policy.authorize({
    toolName: 'tek_transferir',
    identity: id({ admin: false, scopes: ['banco'], project_ids: ['proj-001'] }),
    ticketId: 'tkt-1',
    idempotencyKey: 'idem-1',
    extraApproval: false,
  })
  assert.equal(r.allow, false)
  assert.equal(r.code, 'missing_approval')
})

test('irreversible with ticket + approval allows', () => {
  const { policy } = gate()
  const r = policy.authorize({
    toolName: 'tek_transferir',
    identity: id({ admin: false, scopes: ['banco'], project_ids: ['proj-001'] }),
    ticketId: 'tkt-wire-1',
    idempotencyKey: 'idem-wire-1',
    extraApproval: true,
  })
  assert.equal(r.allow, true)
  assert.equal(r.class, 'irreversible_mutation')
})

test('session ticket is append-only and cannot silently close', () => {
  const store = createTicketStore({ file: join(tmpdir(), `tkt-${Date.now()}.jsonl`) })
  const identity = id({ admin: false, actor_id: 'actor-test-reader' })
  const t = issueSessionTicket(store, identity, { projectId: 'proj-001', toolName: 'guardar_nota' })
  assert.equal(t.state, 'claimed')
  assert.equal(t.owner, 'actor-test-reader')
  assert.throws(() => store.transition(t, 'closed', { owner: 'actor-other' }), /owner_gate/)
})

test('hub adapter: anonymous web cannot mutate', () => {
  const r = authorizeHubTool({
    toolName: 'guardar_nota',
    web: true,
    de: '',
    actorRegistered: false,
    actorAdmin: false,
    actorScopes: [],
    actorProjects: [],
  })
  assert.equal(r.allow, false)
  assert.ok(['missing_identity', 'actor_not_registered'].includes(r.code))
})

test('hub adapter: registered actor can read aliace_resumen (previously unscoped in hub)', () => {
  const r = authorizeHubTool({
    toolName: 'aliace_resumen',
    de: 'actor-hint-synthetic',
    actorRegistered: true,
    actorAdmin: false,
    actorScopes: ['aliace'],
    actorProjects: ['aliace'],
    correlationId: 'corr-hub-1',
  })
  assert.equal(r.allow, true)
})

test('hub adapter: irreversible is never auto-approved', () => {
  const r = authorizeHubTool({
    toolName: 'tek_masiva',
    de: 'actor-hint-synthetic',
    actorRegistered: true,
    actorAdmin: true,
    actorScopes: ['banco'],
    actorProjects: ['mallorcautos'],
    correlationId: 'corr-hub-2',
  })
  assert.equal(r.allow, false)
  assert.ok(['missing_ticket', 'missing_approval'].includes(r.code))
})

test('audit redacts secrets', () => {
  const dir = join(tmpdir(), `hermes-redact-${Date.now()}`)
  mkdirSync(dir, { recursive: true })
  const file = join(dir, 'audit.jsonl')
  const audit = createAudit({ file })
  audit.deny({ code: 'missing_scope', token: 'sk-ant-examplevalue', phone: '+15550001111' })
  const row = audit.entries[0]
  assert.equal(String(row.token).includes('sk-ant'), false)
  writeFileSync(join(dir, 'ok'), '1')
})
