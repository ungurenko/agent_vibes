import { useEffect, useRef, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowDown } from 'lucide-react'
import { MessageBubble } from '@/components/MessageBubble'
import { WelcomeScreen } from '@/components/WelcomeScreen'
import { useSettings } from '@/hooks/useSettings'
import { cn } from '@/lib/utils'
import type { ChatMessage, SessionStatus } from '@/types/claude'

interface ChatWindowProps {
  messages: ChatMessage[]
  status: SessionStatus
  projectName?: string | null
  onSuggestion?: (text: string) => void
  showOnboarding?: boolean
  onSelectProject?: () => void
}

function TypingIndicator(): JSX.Element {
  return (
    <div className="flex items-start">
      <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-border/40 bg-card px-4 py-3 shadow-xs">
        <span className="h-2 w-2 animate-bounce rounded-full bg-primary/40 [animation-delay:-0.3s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-primary/40 [animation-delay:-0.15s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-primary/40" />
      </div>
    </div>
  )
}

const contentWidthMap = {
  narrow: 'max-w-2xl',
  medium: 'max-w-3xl',
  wide: 'max-w-4xl'
} as const

export function ChatWindow({
  messages,
  status,
  projectName,
  onSuggestion,
  showOnboarding,
  onSelectProject
}: ChatWindowProps): JSX.Element {
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const lastMessageCountRef = useRef(0)
  const { settings } = useSettings()

  // Отслеживание позиции скролла
  const handleScroll = useCallback(() => {
    if (!scrollAreaRef.current) return

    const { scrollTop, scrollHeight, clientHeight } = scrollAreaRef.current
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight

    // Считаем "внизу", если меньше 100px от конца
    setIsAtBottom(distanceFromBottom < 100)
  }, [])

  // Умный автоскролл: только если пользователь внизу
  useEffect(() => {
    // Новое сообщение добавлено
    const newMessageAdded = messages.length > lastMessageCountRef.current
    lastMessageCountRef.current = messages.length

    // Скроллим только если: (пользователь внизу ИЛИ новое сообщение) И не пусто
    if (messages.length > 0 && (isAtBottom || newMessageAdded)) {
      // Небольшая задержка для завершения рендера + анимаций
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 50)
    }
  }, [messages, status, isAtBottom])

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  // Подписка на события скролла
  useEffect(() => {
    if (!scrollAreaRef.current) return

    scrollAreaRef.current.addEventListener('scroll', handleScroll)
    return () => scrollAreaRef.current?.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  if (messages.length === 0) {
    return (
      <WelcomeScreen
        projectName={projectName ?? null}
        onSuggestion={onSuggestion ?? (() => {})}
        showOnboarding={showOnboarding}
        onSelectProject={onSelectProject}
      />
    )
  }

  return (
    <div className="relative flex-1">
      <div
        ref={scrollAreaRef}
        className="h-full overflow-y-auto"
        style={{ WebkitAppRegion: 'no-drag', scrollbarGutter: 'stable' } as React.CSSProperties}
      >
        <div className={cn('mx-auto flex w-full flex-col gap-4 px-4 py-6', contentWidthMap[settings.chat.maxContentWidth])}>
          <AnimatePresence mode="popLayout">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
          </AnimatePresence>

          {status === 'thinking' && <TypingIndicator />}

          <div ref={bottomRef} />
        </div>
      </div>

      <AnimatePresence>
        {!isAtBottom && messages.length > 0 && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            onClick={scrollToBottom}
            className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-full border border-border/50 bg-background/80 p-2 shadow-lg backdrop-blur-sm transition-colors hover:bg-background"
            aria-label="Прокрутить вниз"
          >
            <ArrowDown className="h-4 w-4 text-muted-foreground" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}

export default ChatWindow
