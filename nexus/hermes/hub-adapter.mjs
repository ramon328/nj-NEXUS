import { createHash, randomUUID } from 'node:crypto'
import { mapIdentity } from './identity.mjs'
import { bindActorProjects } from './projects.mjs'
import { createPolicyGate } from './policy-gate.mjs'
import { createTicketStore, issueSessionTicket } from './tickets.mjs'
import { capability } from './capability-registry.mjs'
import { defaultAudit } from './audit.mjs'

const gate = createPolicyGate({ audit: defaultAudit })
const tickets = createTicketStore()

function opaqueActor(hint) {
  const raw = String(hint || '').trim()
  if (!raw) return ''
  const tenant = process.env.HERMES_TENANT_ID || 'tenant-local'
  return 'usr_' + createHash('sha256').update(tenant + ':' + raw).digest('hex').slice(0, 16)
}

function opaqueConversation(hint, channel) {
  const raw = String(hint || '').trim()
  if (!raw) return channel === 'web' ? 'conv_web_missing' : ''
  return 'conv_' + createHash('sha256').update(String(channel) + ':' + raw).digest('hex').slice(0, 16)
}

/**
 * Single entry the hub calls. Resolves identity from hub-resolved flags,
 * issues a Phase 0 session ticket for reversible mutations, then asks the gate.
 * Irreversible mutations are never auto-ticketed and never auto-approved.
 */
export function authorizeHubTool(facts = {}) {
  const channel = facts.web ? 'web' : (facts.channel || 'whatsapp')
  const correlationId = facts.correlationId || randomUUID()
  const tenant_id = String(facts.tenant_id || process.env.HERMES_TENANT_ID || 'tenant-local').trim()
  const actorHint = String(facts.de || facts.actorHint || '').trim()
  const registered = Boolean(facts.actorRegistered)
  const admin = Boolean(facts.actorAdmin)
  const project_ids = bindActorProjects(facts.actorProjects || [], { admin })

  const identity = mapIdentity({
    tenant_id,
    actor_id: facts.actor_id || ((registered || admin) ? opaqueActor(actorHint || 'web-session') : opaqueActor(actorHint)),
    channel,
    conversation_id: facts.conversation_id || opaqueConversation(actorHint, channel),
    correlation_id: correlationId,
    registered: registered || admin,
    admin,
    scopes: admin ? [...new Set([...(facts.actorScopes || []), 'admin'])] : (facts.actorScopes || []),
    project_ids,
  })

  const cap = capability(facts.toolName)
  let ticketId = facts.ticketId || null
  let idempotencyKey = facts.idempotencyKey || null

  if (cap?.class === 'reversible_mutation') {
    if (!idempotencyKey) idempotencyKey = `${correlationId}:${facts.toolName}`
    if (!ticketId) {
      try {
        const t = issueSessionTicket(tickets, identity, {
          projectId: facts.projectId || cap.default_project || project_ids[0] || null,
          toolName: facts.toolName,
          idempotencyKey,
        })
        ticketId = t.ticket_id
      } catch {
        ticketId = null
      }
    }
  }

  return gate.authorize({
    toolName: facts.toolName,
    identity,
    input: facts.input,
    projectId: facts.projectId,
    ticketId,
    idempotencyKey,
    extraApproval: Boolean(facts.extraApproval),
  })
}

export { gate as hubGate, tickets as hubTickets }
