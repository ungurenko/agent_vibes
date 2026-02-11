import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ModelAlias } from '@/types/claude'

const models: { value: ModelAlias; label: string; description: string; dotColor: string }[] = [
  { value: 'sonnet', label: 'Sonnet', description: 'Быстрый и умный', dotColor: 'bg-blue-500' },
  { value: 'opus', label: 'Opus', description: 'Самый мощный', dotColor: 'bg-purple-500' },
  { value: 'haiku', label: 'Haiku', description: 'Самый быстрый', dotColor: 'bg-green-500' }
]

interface ModelSelectorProps {
  model: ModelAlias
  onChange: (model: ModelAlias) => void
}

export function ModelSelector({ model, onChange }: ModelSelectorProps): JSX.Element {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent): void => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const current = models.find((m) => m.value === model) || models[0]

  return (
    <div className="relative" ref={ref}>
      <button
        className={cn(
          'flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors',
          'text-muted-foreground hover:text-foreground hover:bg-muted'
        )}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="listbox"
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault()
            setOpen(true)
          }
          if (e.key === 'Escape') {
            setOpen(false)
          }
        }}
      >
        <span className={`h-2 w-2 rounded-full ${current.dotColor}`} />
        <span>{current.label}</span>
        <ChevronDown className={cn('h-3 w-3 transition-transform', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="absolute left-0 bottom-full z-50 mb-1 min-w-[200px] overflow-hidden rounded-xl border border-border bg-popover shadow-lg p-1"
            role="listbox"
          >
            {models.map((m) => (
              <button
                key={m.value}
                role="option"
                aria-selected={m.value === model}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted',
                  m.value === model && 'bg-muted'
                )}
                onClick={() => {
                  onChange(m.value)
                  setOpen(false)
                }}
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${m.dotColor}`} />
                <div>
                  <span className="font-medium">{m.label}</span>
                  <p className="text-xs text-muted-foreground">{m.description}</p>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
