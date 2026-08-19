import { createHmac, createHash, timingSafeEqual } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { projectById } from './projects.mjs'

/**
 * Repo-boundary gate. Path-only checks are not sufficient.
 * Unknown / unbound project → block commit, push, deploy.
 */
const DEFAULT_ALLOWED_REMOTES = Object.freeze({
  'proj-test-alpha': Object.freeze(['https://git.example.test/tenant-test/proj-alpha.git']),
  'proj-test-beta': Object.freeze(['https://git.example.test/tenant-test/proj-beta.git']),
})

const WORKSPACE_MARKERS = Object.freeze(['.hermes-project', 'hermes.workspace.json'])

export function fingerprint(text) {
  return createHash('sha256').update(String(text)).digest('hex')
}

export function signManifest(payload, secret) {
  const body = JSON.stringify({
    project_id: payload.project_id,
    checksum: payload.checksum,
    issued_at: payload.issued_at,
  })
  return {
    ...JSON.parse(body),
    signature: createHmac('sha256', secret).update(body).digest('hex'),
  }
}

export function verifyManifest(manifest, secret) {
  if (!manifest?.project_id || !manifest?.checksum || !manifest?.signature || !manifest?.issued_at) return false
  const expected = signManifest(manifest, secret).signature
  try {
    const a = Buffer.from(expected, 'hex')
    const b = Buffer.from(String(manifest.signature), 'hex')
    return a.length === b.length && timingSafeEqual(a, b)
  } catch {
    return false
  }
}

function readJson(path) {
  try { return JSON.parse(readFileSync(path, 'utf8')) } catch { return null }
}

function detectRemote(cwd) {
  const cfg = join(cwd, '.git', 'config')
  if (!existsSync(cfg)) return null
  const txt = readFileSync(cfg, 'utf8')
  const m = txt.match(/\[remote "origin"\][\s\S]*?url\s*=\s*(\S+)/)
  return m ? m[1].trim() : null
}

function findMarker(cwd) {
  for (const name of WORKSPACE_MARKERS) {
    const p = join(cwd, name)
    if (existsSync(p)) return { path: p, data: readJson(p) }
  }
  return null
}

export function assertRepoBound({
  cwd,
  projectId,
  action = 'commit',
  allowedRemotes = DEFAULT_ALLOWED_REMOTES,
  manifestSecret = process.env.HERMES_MANIFEST_SECRET || '',
  foreignFingerprints = [],
} = {}) {
  const block = (code, detail) => ({ ok: false, block: true, action, code, detail: detail || code, project_id: projectId || null })

  if (!projectId) return block('missing_project')
  const synthetic = String(projectId).startsWith('proj-test-')
  if (!synthetic && !projectById(projectId)) return block('unknown_project')

  const remote = cwd ? detectRemote(cwd) : null
  const allowed = allowedRemotes[projectId] || []

  if (remote) {
    if (!allowed.includes(remote)) return block('foreign_remote', remote ? 'remote not in allowlist' : 'no remote')
  } else {
    const marker = cwd ? findMarker(cwd) : null
    if (!marker) return block('missing_workspace_manifest')
    const secret = manifestSecret || 'test-manifest-secret'
    if (!verifyManifest(marker.data, secret)) return block('invalid_workspace_manifest')
    if (marker.data.project_id !== projectId) return block('manifest_project_mismatch')
  }

  if (foreignFingerprints.length) {
    return block('foreign_fingerprint', 'workspace contains foreign project fingerprint')
  }

  return { ok: true, block: false, action, code: 'bound', project_id: projectId, remote: remote || null }
}

export { DEFAULT_ALLOWED_REMOTES, WORKSPACE_MARKERS }
