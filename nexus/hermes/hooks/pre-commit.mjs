#!/usr/bin/env node
/**
 * Optional pre-commit helper. Not installed globally.
 * Usage: node nexus/hermes/hooks/pre-commit.mjs --project proj-test-alpha
 */
import { assertRepoBound } from '../repo-boundary.mjs'

const args = process.argv.slice(2)
const idx = args.indexOf('--project')
const projectId = idx >= 0 ? args[idx + 1] : process.env.HERMES_PROJECT_ID
const r = assertRepoBound({ cwd: process.cwd(), projectId, action: 'commit' })
if (!r.ok) {
  console.error(`[hermes-repo-boundary] blocked ${r.action}: ${r.code}`)
  process.exit(1)
}
console.log(`[hermes-repo-boundary] ${r.code} project=${r.project_id}`)
