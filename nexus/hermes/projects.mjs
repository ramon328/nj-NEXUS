/**
 * Canonical project IDs for the Nexus tenant.
 * Opaque IDs only. Hub empresa keys stay as a local alias, not as production identities.
 * Projects without a git remote must present a signed workspace manifest (see repo-boundary).
 */
export const PROJECTS = Object.freeze({
  'proj-001': {
    alias: 'mallorcautos',
    writable: true,
    scopes: ['mallorca', 'sii', 'banco'],
    isolation_group: 'ig-autos',
  },
  'proj-002': {
    alias: 'aliace',
    writable: true,
    scopes: ['aliace'],
    isolation_group: 'ig-erp',
  },
  'proj-003': {
    alias: 'impomin',
    writable: false,
    dormant: true,
    scopes: ['sii', 'banco'],
    isolation_group: 'ig-tax',
  },
  'proj-004': {
    alias: 'hn',
    writable: false,
    dormant: true,
    scopes: ['sii', 'banco'],
    isolation_group: 'ig-tax',
  },
  'proj-005': {
    alias: 'ace',
    writable: false,
    dormant: true,
    scopes: ['sii', 'banco'],
    isolation_group: 'ig-tax',
  },
  'proj-006': {
    alias: 'foodexpert',
    writable: false,
    dormant: true,
    scopes: ['sii', 'banco'],
    isolation_group: 'ig-tax',
  },
})

const ALIAS_TO_ID = Object.fromEntries(
  Object.entries(PROJECTS).map(([id, p]) => [p.alias, id]),
)

export function projectById(id) {
  return PROJECTS[id] || null
}

export function projectIdFromAlias(alias) {
  if (!alias) return null
  if (PROJECTS[alias]) return alias
  return ALIAS_TO_ID[alias] || null
}

export function knownProjectIds() {
  return Object.keys(PROJECTS)
}

export function writableProjectIds() {
  return Object.entries(PROJECTS).filter(([, p]) => p.writable).map(([id]) => id)
}

export function bindActorProjects(aliases, { admin } = {}) {
  if (admin) return knownProjectIds()
  const out = []
  for (const a of aliases || []) {
    const id = projectIdFromAlias(a)
    if (id) out.push(id)
  }
  return [...new Set(out)]
}

export function projectWritable(id) {
  return Boolean(PROJECTS[id]?.writable)
}
