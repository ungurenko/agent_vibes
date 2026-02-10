import { useState, useRef, useCallback, useEffect } from 'react'
import { motion } from 'motion/react'
import { ArrowUp, Square, Paperclip, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ImagePreview } from '@/components/ImagePreview'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { useSettings } from '@/hooks/useSettings'
import type { AttachedImage } from '@/types/claude'

interface InputAreaProps {
  onSend: (text: string, images: AttachedImage[]) => void
  disabled: boolean
  isProcessing: boolean
  onStop: () => void
  onSelectProject?: () => void
  planModeEnabled: boolean
  onTogglePlanMode: () => void
}

const MAX_ROWS = 6
const LINE_HEIGHT = 20
const PADDING_Y = 20

export function InputArea({ onSend, disabled, isProcessing, onStop, onSelectProject, planModeEnabled, onTogglePlanMode }: InputAreaProps): JSX.Element {
  const [value, setValue] = useState('')
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { settings } = useSettings()
  const sendOnEnter = settings.chat.sendOnEnter

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

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (sendOnEnter) {
        // Enter = send, Shift+Enter = newline
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          handleSend()
        }
      } else {
        // Cmd/Ctrl+Enter = send, Enter = newline
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
    [handleSend, isProcessing, onStop, sendOnEnter]
  )

  const handleSelectImages = useCallback(async () => {
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
        const ext = item.type.split('/')[1] === 'jpeg' ? 'jpg' : item.type.split('/')[1]
        const buffer = new Uint8Array(await blob.arrayBuffer())
        const image = await window.fs.saveClipboardImage(buffer, ext)
        setAttachedImages((prev) => [...prev, image])
        break
      }
    }
  }, [])

  const handleRemoveImage = useCallback((id: string) => {
    setAttachedImages((prev) => prev.filter((img) => img.id !== id))
  }, [])

  const canSend = (value.trim().length > 0 || attachedImages.length > 0) && !disabled && !isProcessing

  return (
    <div className="border-t glass-border glass px-4 py-3">
      <div className="mx-auto max-w-3xl">
        {attachedImages.length > 0 && (
          <div className="mb-2">
            <ImagePreview images={attachedImages} onRemove={handleRemoveImage} />
          </div>
        )}
        <div className="flex items-center gap-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className={cn(
              'flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-all',
              planModeEnabled
                ? 'bg-amber-500/15 text-amber-500 ring-1 ring-amber-500/30 shadow-sm shadow-amber-500/10'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted ring-1 ring-transparent hover:ring-border/50',
              (disabled && !isProcessing) && 'opacity-50 cursor-not-allowed'
            )}
            disabled={disabled && !isProcessing}
            onClick={onTogglePlanMode}
            aria-label={planModeEnabled ? 'Выключить режим плана' : 'Включить режим плана'}
          >
            <Sparkles className="h-3.5 w-3.5" />
            План
          </motion.button>
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors',
                  'text-muted-foreground hover:text-foreground hover:bg-muted',
                  (disabled && !isProcessing) && 'opacity-50 cursor-not-allowed'
                )}
                disabled={disabled && !isProcessing}
                onClick={handleSelectImages}
                aria-label="Прикрепить изображение"
              >
                <Paperclip className="h-4 w-4" />
              </motion.button>
            </TooltipTrigger>
            <TooltipContent>Прикрепить изображение</TooltipContent>
          </Tooltip>
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={disabled ? '' : planModeEnabled ? 'Опишите задачу — Claude составит план...' : 'Введите сообщение...'}
              disabled={disabled && !isProcessing}
              rows={1}
              className={cn(
                'w-full resize-none rounded-2xl border border-input bg-background/80 px-4 py-2.5',
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
                Выберите проект для начала работы →
              </button>
            )}
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors',
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
              </motion.button>
            </TooltipTrigger>
            <TooltipContent>{isProcessing ? 'Остановить' : 'Отправить (⌘↵)'}</TooltipContent>
          </Tooltip>
        </div>
        <p className="mt-1.5 text-center text-[11px] text-muted-foreground/60">
          {sendOnEnter
            ? 'Enter — отправить, Shift+Enter — перенос'
            : 'Cmd+Enter — отправить, Enter — перенос'}
          , Cmd+V — вставить скриншот
        </p>
      </div>
    </div>
  )
}

export default InputArea
