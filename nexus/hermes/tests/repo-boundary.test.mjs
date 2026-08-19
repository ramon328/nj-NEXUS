import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { assertRepoBound, signManifest, fingerprint } from '../repo-boundary.mjs'

function scratch(name) {
  const dir = join(tmpdir(), `hermes-repo-${name}-${Date.now()}`)
  mkdirSync(dir, { recursive: true })
  return dir
}

test('unknown project is blocked', () => {
  const r = assertRepoBound({ cwd: scratch('u'), projectId: 'proj-unknown', action: 'commit' })
  assert.equal(r.ok, false)
  assert.equal(r.block, true)
  assert.equal(r.code, 'unknown_project')
})

test('missing project id is blocked', () => {
  const r = assertRepoBound({ cwd: scratch('m'), action: 'push' })
  assert.equal(r.block, true)
  assert.equal(r.code, 'missing_project')
})

test('workspace without remote and without signed manifest is blocked', () => {
  const r = assertRepoBound({ cwd: scratch('noman'), projectId: 'proj-test-alpha', action: 'commit' })
  assert.equal(r.block, true)
  assert.equal(r.code, 'missing_workspace_manifest')
})

test('signed workspace manifest binds a project without remotes', () => {
  const dir = scratch('man')
  const secret = 'test-manifest-secret'
  const checksum = fingerprint('proj-test-alpha:neutral')
  const manifest = signManifest({
    project_id: 'proj-test-alpha',
    checksum,
    issued_at: '2026-08-20T00:00:00.000Z',
  }, secret)
  writeFileSync(join(dir, 'hermes.workspace.json'), JSON.stringify(manifest))
  const r = assertRepoBound({ cwd: dir, projectId: 'proj-test-alpha', action: 'commit', manifestSecret: secret })
  assert.equal(r.ok, true)
  assert.equal(r.block, false)
})

test('foreign remote is blocked even if a folder looks right', () => {
  const dir = scratch('git')
  mkdirSync(join(dir, '.git'))
  writeFileSync(join(dir, '.git', 'config'), '[remote "origin"]\n\turl = https://git.example.test/other/foreign.git\n')
  const r = assertRepoBound({ cwd: dir, projectId: 'proj-test-alpha', action: 'push' })
  assert.equal(r.block, true)
  assert.equal(r.code, 'foreign_remote')
})

test('allowed remote is bound', () => {
  const dir = scratch('ok')
  mkdirSync(join(dir, '.git'))
  writeFileSync(join(dir, '.git', 'config'), '[remote "origin"]\n\turl = https://git.example.test/tenant-test/proj-alpha.git\n')
  const r = assertRepoBound({ cwd: dir, projectId: 'proj-test-alpha', action: 'deploy' })
  assert.equal(r.ok, true)
})

test('foreign fingerprint blocks', () => {
  const dir = scratch('fp')
  mkdirSync(join(dir, '.git'))
  writeFileSync(join(dir, '.git', 'config'), '[remote "origin"]\n\turl = https://git.example.test/tenant-test/proj-alpha.git\n')
  const r = assertRepoBound({
    cwd: dir,
    projectId: 'proj-test-alpha',
    action: 'commit',
    foreignFingerprints: ['abc123'],
  })
  assert.equal(r.block, true)
  assert.equal(r.code, 'foreign_fingerprint')
})

test('path-only is not enough: a random folder named like the project still needs manifest or remote', () => {
  const dir = scratch('proj-test-alpha')
  const r = assertRepoBound({ cwd: dir, projectId: 'proj-test-alpha', action: 'commit' })
  assert.equal(r.block, true)
  rmSync(dir, { recursive: true, force: true })
})
