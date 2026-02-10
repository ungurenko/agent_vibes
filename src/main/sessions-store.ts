import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'

interface SessionData {
  messages: unknown[]
  claudeSessionId: string | null
  totalCost: number
  createdAt: number
  updatedAt: number
}

interface SessionMeta {
  id: string
  title: string
  projectName: string
  messageCount: number
  totalCost: number
  createdAt: number
  updatedAt: number
}

const MAX_SESSIONS = 100
const SESSION_ID_RE = /^[a-zA-Z0-9_-]+$/

function validateSessionId(id: string): void {
  if (!SESSION_ID_RE.test(id)) {
    throw new Error(`Invalid session ID: ${id}`)
  }
}

function getSessionsDir(): string {
  const dir = path.join(app.getPath('home'), '.vibes-agent', 'sessions')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return dir
}

function getMetaPath(): string {
  const dir = path.join(app.getPath('home'), '.vibes-agent')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  return path.join(dir, 'sessions-meta.json')
}

function loadMeta(): SessionMeta[] {
  try {
    const metaPath = getMetaPath()
    if (!fs.existsSync(metaPath)) return []
    const raw = fs.readFileSync(metaPath, 'utf-8')
    return JSON.parse(raw)
  } catch (err) {
    console.warn('[sessions] Failed to load meta:', (err as Error).message)
    return []
  }
}

function saveMeta(meta: SessionMeta[]): void {
  fs.writeFileSync(getMetaPath(), JSON.stringify(meta, null, 2), 'utf-8')
}

export function saveSession(
  id: string,
  data: SessionData & { title?: string; projectName?: string }
): void {
  validateSessionId(id)
  const sessionsDir = getSessionsDir()
  const filePath = path.join(sessionsDir, `${id}.json`)

  // Save session data
  const sessionFile: SessionData = {
    messages: data.messages,
    claudeSessionId: data.claudeSessionId,
    totalCost: data.totalCost,
    createdAt: data.createdAt,
    updatedAt: Date.now()
  }
  fs.writeFileSync(filePath, JSON.stringify(sessionFile), 'utf-8')

  // Update meta
  const meta = loadMeta()
  const idx = meta.findIndex((m) => m.id === id)
  const metaEntry: SessionMeta = {
    id,
    title: data.title || (idx >= 0 ? meta[idx].title : 'Новый чат'),
    projectName: data.projectName || (idx >= 0 ? meta[idx].projectName : ''),
    messageCount: data.messages.length,
    totalCost: data.totalCost,
    createdAt: data.createdAt,
    updatedAt: Date.now()
  }

  if (idx >= 0) {
    meta[idx] = metaEntry
  } else {
    meta.unshift(metaEntry)
  }

  // Enforce limit
  if (meta.length > MAX_SESSIONS) {
    const removed = meta.splice(MAX_SESSIONS)
    for (const r of removed) {
      const fp = path.join(sessionsDir, `${r.id}.json`)
      try {
        fs.unlinkSync(fp)
      } catch (err) {
        console.warn('[sessions] Failed to delete old session:', r.id, (err as Error).message)
      }
    }
  }

  saveMeta(meta)
}

export function loadSession(id: string): SessionData | null {
  validateSessionId(id)
  try {
    const filePath = path.join(getSessionsDir(), `${id}.json`)
    if (!fs.existsSync(filePath)) return null
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw)
  } catch (err) {
    console.warn('[sessions] Failed to load session:', id, (err as Error).message)
    return null
  }
}

export function listSessions(): SessionMeta[] {
  return loadMeta()
}

export function deleteSession(id: string): void {
  validateSessionId(id)
  const sessionsDir = getSessionsDir()
  const filePath = path.join(sessionsDir, `${id}.json`)
  try {
    fs.unlinkSync(filePath)
  } catch (err) {
    console.warn('[sessions] Failed to delete session file:', id, (err as Error).message)
  }

  const meta = loadMeta()
  saveMeta(meta.filter((m) => m.id !== id))
}

export function updateSessionMeta(id: string, updates: Partial<SessionMeta>): void {
  const meta = loadMeta()
  const idx = meta.findIndex((m) => m.id === id)
  if (idx >= 0) {
    meta[idx] = { ...meta[idx], ...updates, updatedAt: Date.now() }
    saveMeta(meta)
  }
}
