import { appendFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { redactRecord } from './redact.mjs'

function defaultPath() {
  const dir = process.env.HERMES_DATA_DIR || join(dirname(new URL(import.meta.url).pathname), 'data')
  return join(dir, 'audit.jsonl')
}

export function createAudit({ file } = {}) {
  const path = file || defaultPath()
  const mem = []

  function write(entry) {
    const row = {
      audit_id: randomUUID(),
      ts: new Date().toISOString(),
      ...redactRecord(entry),
    }
    mem.push(row)
    try {
      mkdirSync(dirname(path), { recursive: true, mode: 0o700 })
      appendFileSync(path, JSON.stringify(row) + '\n', { mode: 0o600 })
    } catch {
      // Tests and hosts without a writable data dir still keep in-memory receipts.
    }
    return row
  }

  return {
    path,
    entries: mem,
    deny(entry) {
      return write({ outcome: 'deny', ...entry })
    },
    allow(entry) {
      return write({ outcome: 'allow', ...entry })
    },
  }
}

export const defaultAudit = createAudit()
