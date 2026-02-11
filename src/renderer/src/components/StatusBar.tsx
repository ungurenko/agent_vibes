import { cn } from '@/lib/utils'
import { Shield, Loader2, GitBranch } from 'lucide-react'
import type { SessionStatus } from '@/types/claude'

interface StatusBarProps {
  status: SessionStatus
  totalCost: number
}

const statusConfig: Record<SessionStatus, { color: string; pulse: boolean; label: string }> = {
  idle: { color: 'bg-gray-400', pulse: false, label: 'Готов' },
  thinking: { color: 'bg-amber-400', pulse: true, label: 'Claude думает...' },
  executing: { color: 'bg-blue-400', pulse: true, label: 'Выполняет...' },
  done: { color: 'bg-green-400', pulse: false, label: 'Готово' },
  error: { color: 'bg-red-400', pulse: false, label: 'Ошибка' }
}

export function StatusBar({ status, totalCost }: StatusBarProps): JSX.Element {
  const { color, pulse } = statusConfig[status]
  const isActive = status === 'thinking' || status === 'executing'

  return (
    <div className="flex h-8 shrink-0 items-center justify-between border-t border-border bg-background px-4 text-xs text-muted-foreground">
      {/* Left: Local + cost */}
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          {pulse && (
            <span
              className={cn(
                'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
                color
              )}
            />
          )}
          <span className={cn('relative inline-flex h-2 w-2 rounded-full', color)} />
        </span>
        <span>Local</span>
        {totalCost > 0 && (
          <span className="font-mono">${totalCost.toFixed(4)}</span>
        )}
      </div>

      {/* Center: permissions placeholder */}
      <button className="flex items-center gap-1.5 rounded px-2 py-0.5 transition-colors hover:bg-muted hover:text-foreground">
        <Shield className="h-3 w-3" />
        <span>Стандартные разрешения</span>
      </button>

      {/* Right: activity + git placeholder */}
      <div className="flex items-center gap-2">
        {isActive && <Loader2 className="h-3 w-3 animate-spin" />}
        <button className="flex items-center gap-1.5 rounded px-2 py-0.5 transition-colors hover:bg-muted hover:text-foreground">
          <GitBranch className="h-3 w-3" />
          <span>Создать git-репозиторий</span>
        </button>
      </div>
    </div>
  )
}

export default StatusBar
