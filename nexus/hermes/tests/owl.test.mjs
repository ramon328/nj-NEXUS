import { test } from 'node:test'
import assert from 'node:assert/strict'
import { classifyPath, owlScan, NEVER_TOUCH } from '../owl.mjs'

test('empty and parent paths are never eligible', () => {
  assert.equal(classifyPath('').eligible, false)
  assert.equal(classifyPath('../secrets').reason, 'path_escape')
  assert.equal(classifyPath('../secrets').action, 'alert')
})

test('never-touch list is absolute', () => {
  assert.ok(NEVER_TOUCH.includes('.env'))
  assert.equal(classifyPath('nexus/.env').eligible, false)
  assert.equal(classifyPath('nexus/.env').reason, 'never_touch')
  assert.equal(classifyPath('chrome-profile/Default/Cookies').reason, 'never_touch')
  assert.equal(classifyPath('hub/historial.db').reason, 'never_touch')
  assert.equal(classifyPath('certs/bank.pfx').reason, 'never_touch')
})

test('unknown paths are never eligible even with a later allowlist', () => {
  const r = classifyPath('tmp/random-file.txt', { allowlist: ['tmp/approved/'] })
  assert.equal(r.eligible, false)
  assert.equal(r.reason, 'unknown_path')
  assert.equal(r.action, 'alert')
})

test('allowlist match still does not delete (alert-only)', () => {
  const r = classifyPath('tmp/approved/stale.log', { allowlist: ['tmp/approved/'] })
  assert.equal(r.eligible, false)
  assert.equal(r.reason, 'alert_only')
  assert.equal(r.action, 'alert')
  assert.ok(!('deleted' in r))
})

test('scan never returns a delete action', () => {
  const out = owlScan(['.env', 'tmp/approved/a.txt'], { allowlist: ['tmp/approved/'] })
  assert.equal(out.every((x) => x.action === 'alert' && x.eligible === false), true)
})
