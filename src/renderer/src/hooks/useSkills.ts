import { useState, useEffect, useCallback, useMemo } from 'react'
import type { SkillInfo } from '@/types/claude'

export function useSkills() {
  const [skills, setSkills] = useState<SkillInfo[]>([])
  const [activeSkillIds, setActiveSkillIds] = useState<Set<string>>(new Set())

  const loadSkills = useCallback(async () => {
    try {
      const list = await window.skills.list()
      setSkills(list)
    } catch (err) {
      console.warn('[useSkills] Failed to load skills:', err)
    }
  }, [])

  // Load on mount
  useEffect(() => {
    loadSkills()
  }, [loadSkills])

  // Refresh on window focus
  useEffect(() => {
    const handler = (): void => {
      loadSkills()
    }
    window.addEventListener('focus', handler)
    return () => window.removeEventListener('focus', handler)
  }, [loadSkills])

  const activateSkill = useCallback((id: string) => {
    setActiveSkillIds((prev) => new Set(prev).add(id))
  }, [])

  const deactivateSkill = useCallback((id: string) => {
    setActiveSkillIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  const toggleSkill = useCallback((id: string) => {
    setActiveSkillIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const clearActiveSkills = useCallback(() => {
    setActiveSkillIds(new Set())
  }, [])

  const activeSkills = useMemo(
    () => skills.filter((s) => activeSkillIds.has(s.id)),
    [skills, activeSkillIds]
  )

  const activeSkillsContent = useMemo(() => {
    if (activeSkills.length === 0) return ''
    return activeSkills
      .map((s) => `<skill name="${s.name}">\n${s.content}\n</skill>`)
      .join('\n\n')
  }, [activeSkills])

  return {
    skills,
    activeSkillIds,
    activeSkills,
    activeSkillsContent,
    activateSkill,
    deactivateSkill,
    toggleSkill,
    clearActiveSkills
  }
}
