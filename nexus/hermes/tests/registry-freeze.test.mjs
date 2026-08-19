import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { capabilityNames, capability } from '../capability-registry.mjs'

const hub = join(dirname(new URL(import.meta.url).pathname), '..', '..', 'hub', 'asistente.mjs')

function hubToolNames() {
  const src = readFileSync(hub, 'utf8')
  const start = src.indexOf('const HERRAMIENTAS = [')
  const end = src.indexOf('\n]', start)
  assert.ok(start > 0 && end > start, 'could not locate HERRAMIENTAS')
  const block = src.slice(start, end + 2)
  return [...block.matchAll(/name:\s*'([a-z0-9_]+)'/g)].map((m) => m[1])
}

test('every hub tool is declared in the Hermes registry', () => {
  const hubNames = hubToolNames()
  const declared = new Set(capabilityNames())
  const missing = hubNames.filter((n) => !declared.has(n))
  assert.deepEqual(missing, [], `undeclared hub tools: ${missing.join(', ')}`)
})

test('registry has no names the hub does not expose', () => {
  const hubNames = new Set(hubToolNames())
  const extra = capabilityNames().filter((n) => !hubNames.has(n))
  assert.deepEqual(extra, [], `registry extras: ${extra.join(', ')}`)
})

test('no hub tool is missing an action class', () => {
  for (const name of hubToolNames()) {
    assert.ok(capability(name), name)
    assert.ok(capability(name).class, name)
  }
})
