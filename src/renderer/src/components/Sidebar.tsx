import { useState, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  Plus,
  PanelLeftClose,
  Trash2,
  FolderOpen,
  Settings,
  ArrowUpCircle,
  Folder,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  SlidersHorizontal
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import type { SessionSummary } from '@/hooks/useSessions'

interface SidebarProps {
  sessions: SessionSummary[]
  activeSessionId: string | null
  collapsed: boolean
  projectDir: string | null
  onNewChat: () => void
  onSelectThread: (session: SessionSummary) => void
  onDeleteSession: (id: string) => void
  onToggleCollapse: () => void
  onRenameSession?: (id: string, title: string) => void
  onOpenSettings?: () => void
  onSelectProject?: (dir: string) => void
}

interface ProjectGroup {
  key: string
  name: string
  projectDir: string | null
  threads: SessionSummary[]
  latestUpdatedAt: number
  isCurrent: boolean
}

function getProjectName(projectDir: string | null): string {
  if (!projectDir) return 'Unknown project'
  return projectDir.split('/').pop() || projectDir
}

function formatRelativeTime(timestamp: number): string {
  const diff = Math.max(0, Date.now() - timestamp)
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  const week = 7 * day

  if (diff < hour) return `${Math.max(1, Math.floor(diff / minute))}m`
  if (diff < day) return `${Math.floor(diff / hour)}h`
  if (diff < week) return `${Math.floor(diff / day)}d`
  return `${Math.floor(diff / week)}w`
}

export function Sidebar({
  sessions,
  activeSessionId,
  collapsed,
  projectDir,
  onNewChat,
  onSelectThread,
  onDeleteSession,
  onToggleCollapse,
  onRenameSession,
  onOpenSettings,
  onSelectProject
}: SidebarProps): JSX.Element {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({})
  const editInputRef = useRef<HTMLInputElement>(null)
  const projectName = projectDir ? getProjectName(projectDir) : null

  const projectGroups = useMemo(() => {
    const grouped = new Map<string, ProjectGroup>()

    for (const session of sessions) {
      const key = session.projectDir ?? `name:${session.projectName || 'Unknown project'}`
      const name = session.projectName || getProjectName(session.projectDir)
      const existing = grouped.get(key)

      if (!existing) {
        grouped.set(key, {
          key,
          name,
          projectDir: session.projectDir,
          threads: [session],
          latestUpdatedAt: session.updatedAt,
          isCurrent: projectDir !== null && session.projectDir === projectDir
        })
        continue
      }

      existing.threads.push(session)
      existing.latestUpdatedAt = Math.max(existing.latestUpdatedAt, session.updatedAt)
      existing.isCurrent = existing.isCurrent || (projectDir !== null && session.projectDir === projectDir)
    }

    if (projectDir) {
      const currentKey = projectDir
      if (!grouped.has(currentKey)) {
        grouped.set(currentKey, {
          key: currentKey,
          name: getProjectName(projectDir),
          projectDir,
          threads: [],
          latestUpdatedAt: 0,
          isCurrent: true
        })
      }
    }

    const groups = Array.from(grouped.values())
    for (const group of groups) {
      group.threads.sort((a, b) => b.updatedAt - a.updatedAt)
    }

    groups.sort((a, b) => {
      if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1
      return b.latestUpdatedAt - a.latestUpdatedAt
    })

    return groups
  }, [sessions, projectDir])

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingId])

  useEffect(() => {
    setExpandedProjects((prev) => {
      const next: Record<string, boolean> = {}
      for (const group of projectGroups) {
        if (group.key in prev) {
          next[group.key] = prev[group.key]
        } else {
          next[group.key] = group.isCurrent
        }
      }
      return next
    })
  }, [projectGroups])

  const startRename = (session: SessionSummary): void => {
    setEditingId(session.id)
    setEditValue(session.title)
  }

  const commitRename = (): void => {
    if (editingId && editValue.trim() && onRenameSession) {
      onRenameSession(editingId, editValue.trim())
    }
    setEditingId(null)
    setEditValue('')
  }

  const cancelRename = (): void => {
    setEditingId(null)
    setEditValue('')
  }

  const toggleProject = (key: string): void => {
    setExpandedProjects((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSelectProject = async (): Promise<void> => {
    const selected = await window.dialog.selectFolder()
    if (selected && onSelectProject) {
      onSelectProject(selected)
    }
  }

  return (
    <motion.aside
      animate={{ width: collapsed ? 52 : 300 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="flex h-full shrink-0 flex-col bg-sidebar border-r border-border overflow-hidden font-sans text-sm"
      style={{ paddingTop: 38 }}
    >
      <div className="flex items-center justify-between gap-1 p-2">
        {!collapsed && (
          <div className="px-2 text-[15px] font-medium leading-6 tracking-normal text-muted-foreground/90">Threads</div>
        )}

        <div className="flex items-center gap-1">
          {!collapsed && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={handleSelectProject}
                title="Выбрать проект"
              >
                <FolderOpen className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                title="Фильтр"
              >
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </>
          )}

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={onToggleCollapse}
                title={collapsed ? 'Развернуть (Cmd+B)' : 'Свернуть (Cmd+B)'}
              >
                <motion.div animate={{ rotate: collapsed ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <PanelLeftClose className="h-4 w-4" />
                </motion.div>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{collapsed ? 'Развернуть' : 'Свернуть'}</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="px-3 pb-2">
              <button
                onClick={onNewChat}
                className="flex w-full items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted"
              >
                <Plus className="h-4 w-4" />
                Новая тема
              </button>
            </div>

            <ScrollArea className="flex-1 px-2">
              {projectGroups.length === 0 ? (
                <div className="px-3 py-8 text-sm leading-6 text-muted-foreground">No threads</div>
              ) : (
                <div className="flex flex-col gap-3 pb-2">
                  {projectGroups.map((group) => {
                    const isExpanded = expandedProjects[group.key]
                    const isActiveProject = group.isCurrent

                    return (
                      <div key={group.key} className="space-y-1">
                        <button
                          onClick={() => toggleProject(group.key)}
                          className={cn(
                            'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left transition-colors',
                            isActiveProject ? 'bg-muted' : 'hover:bg-muted/70'
                          )}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                          )}
                          <Folder className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="min-w-0 flex-1 truncate text-sm font-medium leading-6 tracking-normal text-foreground/85">
                            {group.name}
                          </span>
                          {isActiveProject && (
                            <MoreHorizontal className="h-4 w-4 shrink-0 text-muted-foreground" />
                          )}
                        </button>

                        {isExpanded && (
                          <div className="space-y-1 pl-11 pr-2">
                            {group.threads.length === 0 ? (
                              <p className="py-2 text-sm leading-6 text-muted-foreground">No threads</p>
                            ) : (
                              group.threads.map((session) => (
                                <div
                                  key={session.id}
                                  className={cn(
                                    'group flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors',
                                    session.id === activeSessionId ? 'bg-background/60' : 'hover:bg-muted/40'
                                  )}
                                >
                                  <div
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => onSelectThread(session)}
                                    onDoubleClick={() => startRename(session)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault()
                                        onSelectThread(session)
                                      }
                                    }}
                                    className="min-w-0 flex-1"
                                  >
                                    {editingId === session.id ? (
                                      <input
                                        ref={editInputRef}
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        onBlur={commitRename}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault()
                                            commitRename()
                                          }
                                          if (e.key === 'Escape') {
                                            e.preventDefault()
                                            cancelRename()
                                          }
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-full truncate rounded bg-background px-1 text-sm font-medium outline-none ring-2 ring-ring/50"
                                      />
                                    ) : (
                                      <p className="truncate text-sm font-medium leading-6 tracking-normal">{session.title}</p>
                                    )}
                                  </div>

                                  <span className="shrink-0 text-xs text-muted-foreground">
                                    {formatRelativeTime(session.updatedAt)}
                                  </span>

                                  <button
                                    onClick={() => onDeleteSession(session.id)}
                                    aria-label="Удалить сессию"
                                    className="shrink-0 rounded p-1 opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100 focus:opacity-100"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </ScrollArea>

            <div className="mx-2 border-t border-border" />

            <div className="px-2 py-2 flex flex-col gap-0.5">
              <button
                onClick={onOpenSettings}
                className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Settings className="h-4 w-4" />
                Настройки
              </button>
              <button className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <ArrowUpCircle className="h-4 w-4" />
                Обновить
              </button>
              <button
                onClick={handleSelectProject}
                className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <FolderOpen className="h-4 w-4" />
                <span className="truncate">{projectName ?? 'Выбрать проект'}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {collapsed && (
        <div className="mt-auto border-t border-border p-2 flex flex-col gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onNewChat}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Новая тема</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onOpenSettings}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Настройки</TooltipContent>
          </Tooltip>
        </div>
      )}
    </motion.aside>
  )
}

export default Sidebar
