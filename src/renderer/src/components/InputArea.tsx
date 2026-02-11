import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowUp, Square, Paperclip, Sparkles, Zap, Check, X, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ImagePreview } from '@/components/ImagePreview'
import { ModelSelector } from '@/components/ModelSelector'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { useSettings } from '@/hooks/useSettings'
import type { AttachedImage, SkillInfo, ModelAlias } from '@/types/claude'

interface InputAreaProps {
  onSend: (text: string, images: AttachedImage[]) => void
  disabled: boolean
  isProcessing: boolean
  onStop: () => void
  onSelectProject?: () => void
  planModeEnabled: boolean
  onTogglePlanMode: () => void
  skills: SkillInfo[]
  activeSkills: SkillInfo[]
  activeSkillIds: Set<string>
  onToggleSkill: (id: string) => void
  onDeactivateSkill: (id: string) => void
  model: ModelAlias
  onModelChange: (model: ModelAlias) => void
}

const MAX_ROWS = 6
const LINE_HEIGHT = 20
const PADDING_Y = 20

export function InputArea({ onSend, disabled, isProcessing, onStop, onSelectProject, planModeEnabled, onTogglePlanMode, skills, activeSkills, activeSkillIds, onToggleSkill, onDeactivateSkill, model, onModelChange }: InputAreaProps): JSX.Element {
  const [value, setValue] = useState('')
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([])
  const [pasteError, setPasteError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { settings } = useSettings()
  const sendOnEnter = settings.chat.sendOnEnter

  // Skills popover state
  const [skillsPopoverOpen, setSkillsPopoverOpen] = useState(false)
  const [skillsSearch, setSkillsSearch] = useState('')
  const skillsPopoverRef = useRef<HTMLDivElement>(null)
  const skillsBtnRef = useRef<HTMLButtonElement>(null)

  // Slash autocomplete state
  const [slashOpen, setSlashOpen] = useState(false)
  const [slashFilter, setSlashFilter] = useState('')
  const [slashIndex, setSlashIndex] = useState(0)
  const slashRef = useRef<HTMLDivElement>(null)

  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    const maxHeight = LINE_HEIGHT * MAX_ROWS + PADDING_Y
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`
  }, [])

  useEffect(() => {
    adjustHeight()
  }, [value, adjustHeight])

  const handleSend = useCallback(() => {
    const trimmed = value.trim()
    if ((!trimmed && attachedImages.length === 0) || disabled || isProcessing) return
    onSend(trimmed, attachedImages)
    setValue('')
    setAttachedImages([])
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    })
  }, [value, attachedImages, disabled, isProcessing, onSend])

  // Filtered skills for popover
  const filteredPopoverSkills = useMemo(() => {
    if (!skillsSearch) return skills
    const q = skillsSearch.toLowerCase()
    return skills.filter(
      (s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
    )
  }, [skills, skillsSearch])

  // Filtered skills for slash autocomplete
  const slashSkills = useMemo(() => {
    const q = slashFilter.toLowerCase()
    return skills.filter(
      (s) => s.userInvocable && (s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q))
    )
  }, [skills, slashFilter])

  // Close popover on outside click
  useEffect(() => {
    if (!skillsPopoverOpen) return
    const handler = (e: MouseEvent): void => {
      if (
        skillsPopoverRef.current &&
        !skillsPopoverRef.current.contains(e.target as Node) &&
        skillsBtnRef.current &&
        !skillsBtnRef.current.contains(e.target as Node)
      ) {
        setSkillsPopoverOpen(false)
        setSkillsSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [skillsPopoverOpen])

  // Close slash menu on outside click
  useEffect(() => {
    if (!slashOpen) return
    const handler = (e: MouseEvent): void => {
      if (slashRef.current && !slashRef.current.contains(e.target as Node)) {
        setSlashOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [slashOpen])

  // Detect slash command input
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newValue = e.target.value
      setValue(newValue)

      if (newValue.startsWith('/') && !newValue.includes('\n')) {
        setSlashFilter(newValue.slice(1))
        setSlashOpen(true)
        setSlashIndex(0)
      } else {
        setSlashOpen(false)
      }
    },
    []
  )

  const selectSlashSkill = useCallback(
    (skill: SkillInfo) => {
      onToggleSkill(skill.id)
      setValue('')
      setSlashOpen(false)
      textareaRef.current?.focus()
    },
    [onToggleSkill]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Slash autocomplete navigation
      if (slashOpen && slashSkills.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setSlashIndex((prev) => (prev + 1) % slashSkills.length)
          return
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault()
          setSlashIndex((prev) => (prev - 1 + slashSkills.length) % slashSkills.length)
          return
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault()
          selectSlashSkill(slashSkills[slashIndex])
          return
        }
        if (e.key === 'Escape') {
          e.preventDefault()
          setSlashOpen(false)
          return
        }
      }

      if (sendOnEnter) {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          handleSend()
        }
      } else {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault()
          handleSend()
        }
      }
      if (e.key === 'Escape' && isProcessing) {
        e.preventDefault()
        onStop()
      }
    },
    [handleSend, isProcessing, onStop, sendOnEnter, slashOpen, slashSkills, slashIndex, selectSlashSkill]
  )

  const handleSelectImages = useCallback(async () => {
    setPasteError(null)
    const images = await window.dialog.selectImages()
    if (images) {
      setAttachedImages((prev) => [...prev, ...images])
    }
  }, [])

  const handlePaste = useCallback(async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items
    if (!items) return

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault()
        const blob = item.getAsFile()
        if (!blob) continue
        try {
          const ext = item.type.split('/')[1] === 'jpeg' ? 'jpg' : item.type.split('/')[1]
          const buffer = new Uint8Array(await blob.arrayBuffer())
          const image = await window.fs.saveClipboardImage(buffer, ext)
          setAttachedImages((prev) => [...prev, image])
          setPasteError(null)
        } catch (error) {
          console.warn('[input] Failed to paste image:', error)
          setPasteError('Не удалось вставить изображение. Поддерживаются jpg/png/gif/webp/bmp.')
        }
        break
      }
    }
  }, [])

  const handleRemoveImage = useCallback((id: string) => {
    setAttachedImages((prev) => {
      const removed = prev.find((img) => img.id === id)
      if (removed && removed.type === 'file') {
        window.fs.revokeImagePath(removed.path).catch((error) => {
          console.warn('[input] Failed to revoke image path:', error)
        })
      }
      return prev.filter((img) => img.id !== id)
    })
  }, [])

  const canSend = (value.trim().length > 0 || attachedImages.length > 0) && !disabled && !isProcessing
  const hasActiveSkills = activeSkills.length > 0

  return (
    <div className="border-t border-border bg-background px-4 py-3">
      <div className="mx-auto max-w-3xl">
        {/* Active skills badges */}
        {hasActiveSkills && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {activeSkills.map((skill) => (
              <span
                key={skill.id}
                className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2.5 py-0.5 text-xs font-medium text-violet-600 dark:text-violet-400 ring-1 ring-violet-500/20"
              >
                <Zap className="h-3 w-3" />
                {skill.name}
                <button
                  onClick={() => onDeactivateSkill(skill.id)}
                  className="ml-0.5 rounded-full p-0.5 hover:bg-violet-500/20 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Attached images */}
        {attachedImages.length > 0 && (
          <div className="mb-2">
            <ImagePreview images={attachedImages} onRemove={handleRemoveImage} />
          </div>
        )}

        {/* Textarea */}
        <div className="relative mb-2">
          {/* Slash autocomplete */}
          <AnimatePresence>
            {slashOpen && slashSkills.length > 0 && (
              <motion.div
                ref={slashRef}
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-full left-0 mb-2 w-full rounded-xl border border-border bg-popover shadow-lg overflow-hidden z-50"
              >
                <div className="max-h-48 overflow-y-auto py-1">
                  {slashSkills.map((skill, i) => (
                    <button
                      key={skill.id}
                      onClick={() => selectSlashSkill(skill)}
                      className={cn(
                        'flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors',
                        i === slashIndex ? 'bg-muted' : 'hover:bg-muted/50'
                      )}
                    >
                      <span
                        className={cn(
                          'h-2 w-2 shrink-0 rounded-full',
                          skill.source === 'claude' ? 'bg-blue-500' : 'bg-violet-500'
                        )}
                      />
                      <span className="text-sm font-medium truncate">{skill.name}</span>
                      {skill.description && (
                        <span className="text-xs text-muted-foreground truncate ml-auto">
                          {skill.description}
                        </span>
                      )}
                      {activeSkillIds.has(skill.id) && (
                        <Check className="h-3.5 w-3.5 shrink-0 text-violet-500" />
                      )}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={disabled ? '' : planModeEnabled ? 'Опишите задачу — Claude составит план...' : 'Введите сообщение...'}
            disabled={disabled && !isProcessing}
            rows={1}
            className={cn(
              'w-full resize-none rounded-xl border border-input bg-background px-4 py-2.5',
              'text-sm leading-5 placeholder:text-muted-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:border-primary/30',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'transition-shadow duration-200',
              disabled && !isProcessing && 'opacity-60'
            )}
            style={{ maxHeight: LINE_HEIGHT * MAX_ROWS + PADDING_Y, scrollbarWidth: 'none' }}
          />
          {disabled && !isProcessing && (
            <button
              onClick={onSelectProject}
              className="absolute inset-0 flex items-center px-4 text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer"
            >
              Выберите проект для начала работы
            </button>
          )}
        </div>

        {/* Footer toolbar */}
        <div className="flex items-center gap-1.5">
          {/* Paperclip */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                  'text-muted-foreground hover:text-foreground hover:bg-muted',
                  (disabled && !isProcessing) && 'opacity-50 cursor-not-allowed'
                )}
                disabled={disabled && !isProcessing}
                onClick={handleSelectImages}
                aria-label="Прикрепить изображение"
              >
                <Paperclip className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Прикрепить изображение</TooltipContent>
          </Tooltip>

          {/* Model selector inline */}
          <ModelSelector model={model} onChange={onModelChange} />

          {/* Plan toggle */}
          <button
            className={cn(
              'flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-all',
              planModeEnabled
                ? 'bg-amber-500/15 text-amber-500 ring-1 ring-amber-500/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted',
              (disabled && !isProcessing) && 'opacity-50 cursor-not-allowed'
            )}
            disabled={disabled && !isProcessing}
            onClick={onTogglePlanMode}
            aria-label={planModeEnabled ? 'Выключить режим плана' : 'Включить режим плана'}
          >
            <Sparkles className="h-3.5 w-3.5" />
            План
          </button>

          {/* Skills button */}
          <div className="relative">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  ref={skillsBtnRef}
                  className={cn(
                    'relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                    hasActiveSkills
                      ? 'bg-violet-500/15 text-violet-500 ring-1 ring-violet-500/30'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted',
                    (disabled && !isProcessing) && 'opacity-50 cursor-not-allowed'
                  )}
                  disabled={disabled && !isProcessing}
                  onClick={() => {
                    setSkillsPopoverOpen((prev) => !prev)
                    setSkillsSearch('')
                  }}
                  aria-label="Скиллы"
                >
                  <Zap className="h-4 w-4" />
                  {hasActiveSkills && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-violet-500 text-[10px] font-bold text-white">
                      {activeSkills.length}
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>Скиллы</TooltipContent>
            </Tooltip>

            {/* Skills popover */}
            <AnimatePresence>
              {skillsPopoverOpen && (
                <motion.div
                  ref={skillsPopoverRef}
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-full left-0 mb-2 w-72 rounded-xl border border-border bg-popover shadow-lg overflow-hidden z-50"
                >
                  {/* Search */}
                  <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                    <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <input
                      type="text"
                      value={skillsSearch}
                      onChange={(e) => setSkillsSearch(e.target.value)}
                      placeholder="Поиск скиллов..."
                      className="w-full bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
                      autoFocus
                    />
                  </div>

                  {/* Skills list */}
                  <div className="max-h-64 overflow-y-auto py-1">
                    {filteredPopoverSkills.length === 0 ? (
                      <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                        Скиллы не найдены
                      </p>
                    ) : (
                      filteredPopoverSkills.map((skill) => {
                        const isActive = activeSkillIds.has(skill.id)
                        return (
                          <button
                            key={skill.id}
                            onClick={() => onToggleSkill(skill.id)}
                            className={cn(
                              'flex w-full items-start gap-2.5 px-3 py-2 text-left transition-colors hover:bg-muted/50',
                              isActive && 'bg-violet-500/5'
                            )}
                          >
                            <span
                              className={cn(
                                'mt-1 h-2 w-2 shrink-0 rounded-full',
                                skill.source === 'claude' ? 'bg-blue-500' : 'bg-violet-500'
                              )}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-medium truncate">{skill.name}</span>
                              </div>
                              {skill.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                  {skill.description}
                                </p>
                              )}
                            </div>
                            {isActive && (
                              <Check className="mt-0.5 h-4 w-4 shrink-0 text-violet-500" />
                            )}
                          </button>
                        )
                      })
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Send / Stop */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
                  isProcessing
                    ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                    : canSend
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'bg-primary/50 text-primary-foreground cursor-not-allowed'
                )}
                disabled={!canSend && !isProcessing}
                onClick={isProcessing ? onStop : handleSend}
                aria-label={isProcessing ? 'Остановить генерацию' : 'Отправить сообщение'}
              >
                {isProcessing ? (
                  <Square className="h-4 w-4" />
                ) : (
                  <ArrowUp className="h-4 w-4" />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>{isProcessing ? 'Остановить' : 'Отправить (⌘↵)'}</TooltipContent>
          </Tooltip>
        </div>

        <p className="mt-1.5 text-center text-[11px] text-muted-foreground/60">
          {sendOnEnter
            ? 'Enter — отправить, Shift+Enter — перенос'
            : 'Cmd+Enter — отправить, Enter — перенос'}
          , Cmd+V — вставить скриншот{skills.length > 0 ? ', / — скиллы' : ''}
        </p>
        {pasteError && (
          <p className="mt-1 text-center text-[11px] text-destructive">
            {pasteError}
          </p>
        )}
      </div>
    </div>
  )
}

export default InputArea
