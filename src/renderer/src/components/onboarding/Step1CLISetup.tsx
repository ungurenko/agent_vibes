import { useState, useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import { Terminal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { StatusIndicator } from './StatusIndicator'

type CLIStatus = 'checking' | 'installed' | 'notInstalled' | 'installing' | 'error'

interface Step1CLISetupProps {
  onComplete: (version: string) => void
}

export function Step1CLISetup({ onComplete }: Step1CLISetupProps): JSX.Element {
  const [status, setStatus] = useState<CLIStatus>('checking')
  const [cliPath, setCliPath] = useState<string | null>(null)
  const [cliVersion, setCliVersion] = useState<string | null>(null)
  const [installLog, setInstallLog] = useState<string[]>([])
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const logEndRef = useRef<HTMLDivElement>(null)

  const checkCLI = async (): Promise<void> => {
    setStatus('checking')
    setErrorMessage(null)
    const result = await window.cli.checkInstalled()
    if (result.installed) {
      setCliPath(result.path)
      setCliVersion(result.version)
      setStatus('installed')
      onComplete(result.version!)
    } else {
      setStatus('notInstalled')
    }
  }

  useEffect(() => {
    checkCLI()
  }, [])

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [installLog])

  const handleInstall = (): void => {
    setStatus('installing')
    setInstallLog([])
    setErrorMessage(null)

    const cleanupProgress = window.cli.onInstallProgress((data) => {
      setInstallLog((prev) => [...prev, data])
    })

    const cleanupComplete = window.cli.onInstallComplete((result) => {
      cleanupProgress()
      cleanupComplete()
      if (result.success) {
        checkCLI()
      } else {
        setErrorMessage(result.error || 'Installation failed')
        setStatus('error')
      }
    })

    window.cli.install()
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
        <Terminal className="h-8 w-8 text-primary" />
      </div>

      <div className="text-center">
        <h2 className="text-xl font-semibold">Добро пожаловать в Vibes Agent</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Для работы требуется Claude Code CLI
        </p>
      </div>

      <div className="w-full rounded-xl border border-border/60 p-4">
        {status === 'checking' && (
          <div className="flex items-center gap-3">
            <StatusIndicator status="loading" />
            <span className="text-sm text-muted-foreground">Проверка установки...</span>
          </div>
        )}

        {status === 'installed' && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <StatusIndicator status="success" />
              <span className="text-sm font-medium">Claude Code CLI установлен</span>
            </div>
            {cliVersion && (
              <p className="ml-8 text-xs text-muted-foreground">Версия: {cliVersion}</p>
            )}
            {cliPath && (
              <p className="ml-8 text-xs text-muted-foreground font-mono">{cliPath}</p>
            )}
          </div>
        )}

        {status === 'notInstalled' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <StatusIndicator status="error" />
              <span className="text-sm">Claude Code CLI не найден</span>
            </div>
            <Button onClick={handleInstall} className="w-full">
              Установить Claude Code
            </Button>
          </div>
        )}

        {status === 'installing' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <StatusIndicator status="loading" />
              <span className="text-sm">Установка...</span>
            </div>
            <ScrollArea className="h-32 w-full rounded-lg border border-border/40 bg-muted/30 p-3">
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                {installLog.join('')}
                <div ref={logEndRef} />
              </pre>
            </ScrollArea>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <StatusIndicator status="error" />
              <span className="text-sm text-destructive">{errorMessage}</span>
            </div>
            <Button onClick={handleInstall} variant="outline" className="w-full">
              Попробовать снова
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Или установите вручную:{' '}
              <code className="rounded bg-muted px-1.5 py-0.5">
                npm install -g @anthropic-ai/claude-code
              </code>
            </p>
          </div>
        )}
      </div>
    </motion.div>
  )
}
