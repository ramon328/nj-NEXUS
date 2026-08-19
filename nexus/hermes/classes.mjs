/** Canonical action classes. Do not lump irreversible into mutation. */
export const ACTION_CLASSES = Object.freeze([
  'read',
  'draft',
  'reversible_mutation',
  'irreversible_mutation',
])

export const MUTATION_CLASSES = Object.freeze([
  'reversible_mutation',
  'irreversible_mutation',
])

export function isActionClass(value) {
  return ACTION_CLASSES.includes(value)
}

export function isMutationClass(value) {
  return MUTATION_CLASSES.includes(value)
}

export const DEFAULT_TIMEOUT_MS = Object.freeze({
  read: 30_000,
  draft: 30_000,
  reversible_mutation: 90_000,
  irreversible_mutation: 180_000,
})

export const APPROVED_LANES = Object.freeze(['lane-whatsapp', 'lane-web', 'lane-system'])
