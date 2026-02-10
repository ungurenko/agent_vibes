import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

type StatusVariant = 'success' | 'error' | 'loading' | 'idle'

interface StatusIndicatorProps {
  status: StatusVariant
  className?: string
}

export function StatusIndicator({ status, className = '' }: StatusIndicatorProps): JSX.Element | null {
  switch (status) {
    case 'success':
      return <CheckCircle2 className={`h-5 w-5 text-green-500 ${className}`} />
    case 'error':
      return <XCircle className={`h-5 w-5 text-destructive ${className}`} />
    case 'loading':
      return <Loader2 className={`h-5 w-5 animate-spin text-muted-foreground ${className}`} />
    case 'idle':
      return null
  }
}
