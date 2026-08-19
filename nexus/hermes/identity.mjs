import { APPROVED_LANES } from './classes.mjs'

const IDENTITY_FIELDS = ['tenant_id', 'actor_id', 'channel', 'conversation_id', 'lane', 'correlation_id']

export function missingIdentityFields(identity) {
  const miss = []
  for (const f of IDENTITY_FIELDS) {
    if (!identity || typeof identity[f] !== 'string' || !identity[f].trim()) miss.push(f)
  }
  return miss
}

export function identityComplete(identity) {
  return missingIdentityFields(identity).length === 0
}

function laneFor(channel) {
  if (channel === 'whatsapp') return 'lane-whatsapp'
  if (channel === 'web' || channel === 'desktop') return 'lane-web'
  if (channel === 'system') return 'lane-system'
  return ''
}

/**
 * Build the frozen Identity contract from hub-resolved facts.
 * The hub already decided "is this a registered user?" — this mapper does not
 * look at phone books, founder lists, or customer files.
 */
export function mapIdentity(facts = {}) {
  const channel = String(facts.channel || '').trim()
  const lane = facts.lane || laneFor(channel)
  const tenant_id = String(facts.tenant_id || process.env.HERMES_TENANT_ID || '').trim()
  const actor_id = String(facts.actor_id || '').trim()
  const conversation_id = String(facts.conversation_id || '').trim()
  const correlation_id = String(facts.correlation_id || '').trim()

  return {
    tenant_id,
    actor_id,
    channel,
    conversation_id,
    lane,
    correlation_id,
    registered: Boolean(facts.registered),
    admin: Boolean(facts.admin),
    scopes: Array.isArray(facts.scopes) ? [...facts.scopes] : [],
    project_ids: Array.isArray(facts.project_ids) ? [...facts.project_ids] : [],
    lane_approved: APPROVED_LANES.includes(lane),
  }
}

export { IDENTITY_FIELDS }
