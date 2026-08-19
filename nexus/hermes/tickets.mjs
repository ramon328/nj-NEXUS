import { appendFileSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'

const TERMINAL = new Set(['accepted', 'closed'])
const STATES = new Set(['queued', 'claimed', 'blocked', 'review', 'accepted', 'closed'])

function defaultFile() {
  const dir = process.env.HERMES_DATA_DIR || join(dirname(new URL(import.meta.url).pathname), 'data')
  return join(dir, 'tickets.jsonl')
}

export function createTicketStore({ file } = {}) {
  const path = file || defaultFile()
  const rows = []

  function persist(ticket, from, to, note) {
    const rec = {
      ts: new Date().toISOString(),
      ticket_id: ticket.ticket_id,
      from: from || null,
      to,
      note: note || '',
      ticket,
    }
    rows.push(rec)
    try {
      mkdirSync(dirname(path), { recursive: true, mode: 0o700 })
      appendFileSync(path, JSON.stringify(rec) + '\n', { mode: 0o600 })
    } catch { /* in-memory still valid */ }
    return rec
  }

  function issue(fields) {
    const ticket = {
      ticket_id: fields.ticket_id || `tkt-${randomUUID()}`,
      tenant_id: fields.tenant_id,
      project_id: fields.project_id,
      goal: fields.goal || 'bounded tool run',
      owner: fields.owner,
      state: 'queued',
      acceptance: Array.isArray(fields.acceptance) ? fields.acceptance : ['tool returned without uncaught error'],
      expires_at: fields.expires_at || null,
      correlation_id: fields.correlation_id,
      idempotency_key: fields.idempotency_key || null,
      created_at: new Date().toISOString(),
    }
    persist(ticket, null, 'queued', 'issue')
    return ticket
  }

  function transition(ticket, next, { owner, note } = {}) {
    if (!STATES.has(next)) throw new Error('unknown_ticket_state')
    if (TERMINAL.has(ticket.state)) throw new Error('ticket_terminal')
    if (ticket.state === 'claimed' && owner && ticket.owner !== owner) throw new Error('owner_gate')
    const from = ticket.state
    ticket.state = next
    persist(ticket, from, next, note)
    return ticket
  }

  function byId(id) {
    for (let i = rows.length - 1; i >= 0; i--) {
      if (rows[i].ticket.ticket_id === id) return rows[i].ticket
    }
    return null
  }

  return { path, log: rows, issue, transition, byId }
}

export const defaultTickets = createTicketStore()

/** Phase 0/1 session ticket: a real append-only record, not a claim-leased tunnel (Phase 3). */
export function issueSessionTicket(store, identity, { projectId, toolName, idempotencyKey } = {}) {
  const ticket = store.issue({
    tenant_id: identity.tenant_id,
    project_id: projectId,
    owner: identity.actor_id,
    goal: `run ${toolName}`,
    correlation_id: identity.correlation_id,
    idempotency_key: idempotencyKey,
  })
  store.transition(ticket, 'claimed', { owner: identity.actor_id, note: 'phase0-session' })
  return ticket
}

export function writeSnapshot(store, dest) {
  writeFileSync(dest, JSON.stringify(store.log, null, 2))
}

export function loadSnapshot(src) {
  if (!existsSync(src)) return []
  return JSON.parse(readFileSync(src, 'utf8'))
}
