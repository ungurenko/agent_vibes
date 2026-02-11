import * as fs from 'fs'
import * as path from 'path'
import { app } from 'electron'

interface SkillInfo {
  id: string
  name: string
  description: string
  content: string
  source: 'claude' | 'vibes-agent'
  userInvocable: boolean
}

function parseFrontmatter(raw: string): { meta: Record<string, string>; body: string } {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
  if (!match) return { meta: {}, body: raw }

  const meta: Record<string, string> = {}
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    const val = line.slice(idx + 1).trim()
    meta[key] = val
  }
  return { meta, body: match[2] }
}

function scanDirectory(dir: string, source: 'claude' | 'vibes-agent'): SkillInfo[] {
  if (!fs.existsSync(dir)) return []

  const skills: SkillInfo[] = []
  let entries: string[]
  try {
    entries = fs.readdirSync(dir)
  } catch {
    return []
  }

  for (const entry of entries) {
    const entryPath = path.join(dir, entry)
    let realPath: string
    try {
      realPath = fs.realpathSync(entryPath)
    } catch {
      continue
    }

    let stat: fs.Stats
    try {
      stat = fs.statSync(realPath)
    } catch {
      continue
    }
    if (!stat.isDirectory()) continue

    const skillFile = path.join(realPath, 'SKILL.md')
    if (!fs.existsSync(skillFile)) continue

    let raw: string
    try {
      raw = fs.readFileSync(skillFile, 'utf-8')
    } catch {
      continue
    }

    const { meta, body } = parseFrontmatter(raw)
    const id = entry
    const name = meta['name'] || id
    const description = meta['description'] || ''
    const userInvocable = meta['user-invocable'] !== 'false'

    skills.push({ id, name, description, content: body.trim(), source, userInvocable })
  }

  return skills
}

export function listSkills(): SkillInfo[] {
  const homeDir = app.getPath('home')
  const claudeDir = path.join(homeDir, '.claude', 'skills')
  const vibesDir = path.join(homeDir, '.vibes-agent', 'skills')

  const claudeSkills = scanDirectory(claudeDir, 'claude')
  const vibesSkills = scanDirectory(vibesDir, 'vibes-agent')

  // vibes-agent skills override claude skills with same id
  const map = new Map<string, SkillInfo>()
  for (const s of claudeSkills) map.set(s.id, s)
  for (const s of vibesSkills) map.set(s.id, s)

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
}
