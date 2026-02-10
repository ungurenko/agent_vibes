import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { UserCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { StatusIndicator } from './StatusIndicator'

type AuthStatus = 'checking' | 'authenticated' | 'notAuthenticated' | 'loggingIn' | 'error'

interface Step2AuthProps {
  onComplete: (accountInfo: string | null) => void
}

export function Step2Auth({ onComplete }: Step2AuthProps): JSX.Element {
  const [status, setStatus] = useState<AuthStatus>('checking')
  const [accountInfo, setAccountInfo] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const checkAuth = async (): Promise<void> => {
    setStatus('checking')
    setErrorMessage(null)
    const result = await window.cli.checkAuth()
    if (result.authenticated) {
      setAccountInfo(result.accountInfo)
      setStatus('authenticated')
      onComplete(result.accountInfo)
    } else {
      setStatus('notAuthenticated')
    }
  }

  useEffect(() => {
    checkAuth()
  }, [])

  const handleLogin = (): void => {
    setStatus('loggingIn')
    setErrorMessage(null)

    const cleanupProgress = window.cli.onLoginProgress(() => {
      // Progress is informational
    })

    const cleanupComplete = window.cli.onLoginComplete((result) => {
      cleanupProgress()
      cleanupComplete()
      if (result.success) {
        checkAuth()
      } else {
        setErrorMessage('Не удалось завершить вход')
        setStatus('error')
      }
    })

    window.cli.login()
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center gap-6"
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5">
        <UserCheck className="h-8 w-8 text-primary" />
      </div>

      <div className="text-center">
        <h2 className="text-xl font-semibold">Аутентификация</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Войдите в аккаунт Anthropic
        </p>
      </div>

      <div className="w-full rounded-xl border border-border/60 p-4">
        {status === 'checking' && (
          <div className="flex items-center gap-3">
            <StatusIndicator status="loading" />
            <span className="text-sm text-muted-foreground">Проверка авторизации...</span>
          </div>
        )}

        {status === 'authenticated' && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <StatusIndicator status="success" />
              <span className="text-sm font-medium">Вы авторизованы</span>
            </div>
            {accountInfo && (
              <p className="ml-8 text-xs text-muted-foreground">{accountInfo}</p>
            )}
          </div>
        )}

        {status === 'notAuthenticated' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <StatusIndicator status="error" />
              <span className="text-sm">Требуется авторизация</span>
            </div>
            <Button onClick={handleLogin} className="w-full">
              Войти через браузер
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Откроется страница авторизации Anthropic
            </p>
          </div>
        )}

        {status === 'loggingIn' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <StatusIndicator status="loading" />
              <span className="text-sm">Завершите вход в браузере...</span>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Ожидание завершения авторизации
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <StatusIndicator status="error" />
              <span className="text-sm text-destructive">{errorMessage}</span>
            </div>
            <Button onClick={checkAuth} variant="outline" className="w-full">
              Проверить снова
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Или выполните в терминале:{' '}
              <code className="rounded bg-muted px-1.5 py-0.5">claude</code>
            </p>
          </div>
        )}
      </div>
    </motion.div>
  )
}
