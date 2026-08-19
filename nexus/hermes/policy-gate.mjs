import { isMutationClass } from './classes.mjs'
import { capability } from './capability-registry.mjs'
import { identityComplete, missingIdentityFields } from './identity.mjs'
import { projectById, projectWritable } from './projects.mjs'
import { defaultAudit } from './audit.mjs'
import { redact } from './redact.mjs'

const USER_MSG = {
  missing_identity: '🔒 Falta identidad completa (actor/tenant/canal). No ejecuto la herramienta.',
  actor_not_registered: '🔒 El actor no está registrado en este tenant. No ejecuto la herramienta.',
  unknown_tool: '🔒 Herramienta no declarada en el registro de capacidades. No ejecuto.',
  lane_not_approved: '🔒 Lane no aprobada. No ejecuto la herramienta.',
  missing_scope: '🔒 No tienes el permiso de área requerido para esta herramienta.',
  class_not_allowed: '🔒 Esta clase de acción no está permitida para este actor/lane.',
  missing_project: '🔒 Falta project_id. Las escrituras no van a un proyecto desconocido.',
  unknown_project: '🔒 Proyecto desconocido. Escritura bloqueada (fail closed).',
  unbound_project: '🔒 El actor no está ligado a ese proyecto. Escritura bloqueada.',
  project_not_writable: '🔒 Ese proyecto no admite escrituras todavía.',
  missing_ticket: '🔒 Esta mutación exige ticket. No ejecuto.',
  missing_idempotency: '🔒 Esta mutación exige clave de idempotencia. No ejecuto.',
  missing_approval: '🔒 Acción irreversible: falta aprobación extra. No ejecuto.',
  gate_error: '🔒 No pude autorizar esa acción.',
}

function deny(audit, req, code, extra = {}) {
  const receipt = audit.deny({
    code,
    tool: req.toolName,
    class: extra.class || null,
    identity: req.identity || {},
    project_id: req.projectId || extra.projectId || null,
    ticket_id: req.ticketId || null,
    reason: extra.reason || code,
  })
  return {
    allow: false,
    code,
    userMessage: USER_MSG[code] || USER_MSG.gate_error,
    audit_id: receipt.audit_id,
    capability: extra.capability || null,
  }
}

function resolveProject(cap, identity, requested) {
  if (requested) return requested
  if (cap.default_project && (identity.admin || identity.project_ids.includes(cap.default_project))) {
    return cap.default_project
  }
  const scoped = identity.project_ids.filter((id) => {
    const p = projectById(id)
    if (!p) return false
    if (!cap.scopes.length) return true
    return cap.scopes.some((s) => p.scopes.includes(s) || s === 'admin')
  })
  if (scoped.length === 1) return scoped[0]
  const writableBound = identity.project_ids.filter((id) => projectWritable(id) || identity.admin)
  if (writableBound.length === 1) return writableBound[0]
  if (identity.admin) return writableProjectFallback()
  return null
}

function writableProjectFallback() {
  return projectWritable('proj-001') ? 'proj-001' : null
}

function scopeAllowed(cap, identity) {
  if (identity.admin) return true
  if (!cap.scopes.length) return true
  if (cap.scopes.includes('admin')) return Boolean(identity.admin)
  return cap.scopes.every((s) => identity.scopes.includes(s))
}

export function createPolicyGate({ audit } = {}) {
  const log = audit || defaultAudit

  function authorize(req = {}) {
    try {
      const identity = req.identity || {}
      const cap = capability(req.toolName)

      if (!identityComplete(identity)) {
        return deny(log, req, 'missing_identity', { reason: missingIdentityFields(identity).join(',') })
      }
      if (!identity.lane_approved) return deny(log, req, 'lane_not_approved')
      if (!identity.registered && !identity.admin) return deny(log, req, 'actor_not_registered')
      if (!cap) return deny(log, req, 'unknown_tool')
      if (!scopeAllowed(cap, identity)) return deny(log, req, 'missing_scope', { capability: cap, class: cap.class })

      const mutation = isMutationClass(cap.class)
      const projectId = resolveProject(cap, identity, req.projectId || null)

      if (mutation) {
        if (!projectId) return deny(log, req, 'missing_project', { capability: cap, class: cap.class })
        const project = projectById(projectId)
        if (!project) return deny(log, req, 'unknown_project', { capability: cap, class: cap.class, projectId })
        if (!identity.admin && !identity.project_ids.includes(projectId)) {
          return deny(log, req, 'unbound_project', { capability: cap, class: cap.class, projectId })
        }
        if (!projectWritable(projectId) && !identity.admin) {
          return deny(log, req, 'project_not_writable', { capability: cap, class: cap.class, projectId })
        }
        if (!req.ticketId) return deny(log, req, 'missing_ticket', { capability: cap, class: cap.class, projectId })
        if (cap.idempotency && !req.idempotencyKey) {
          return deny(log, req, 'missing_idempotency', { capability: cap, class: cap.class, projectId })
        }
        if (cap.class === 'irreversible_mutation' && !req.extraApproval) {
          return deny(log, req, 'missing_approval', { capability: cap, class: cap.class, projectId })
        }
      } else if (req.projectId) {
        const project = projectById(req.projectId)
        if (!project) return deny(log, req, 'unknown_project', { capability: cap, class: cap.class, projectId: req.projectId })
        if (!identity.admin && !identity.project_ids.includes(req.projectId)) {
          return deny(log, req, 'unbound_project', { capability: cap, class: cap.class, projectId: req.projectId })
        }
      }

      const receipt = log.allow({
        tool: cap.name,
        class: cap.class,
        identity,
        project_id: projectId,
        ticket_id: req.ticketId || null,
        idempotency_key: req.idempotencyKey || null,
      })
      return {
        allow: true,
        code: 'allow',
        class: cap.class,
        capability: cap,
        projectId,
        audit_id: receipt.audit_id,
        userMessage: null,
        redacted_input: redact(req.input || {}),
      }
    } catch (err) {
      return deny(log, req, 'gate_error', { reason: String(err?.message || err) })
    }
  }

  return { authorize, audit: log }
}

export const defaultGate = createPolicyGate()
export function authorize(req) {
  return defaultGate.authorize(req)
}
