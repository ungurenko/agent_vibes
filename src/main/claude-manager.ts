import { spawn, ChildProcess, execSync } from 'child_process'
import { createInterface, Interface } from 'readline'

type EventCallback = (event: Record<string, unknown>) => void
type ErrorCallback = (error: string) => void
type CompleteCallback = (lastEvent: Record<string, unknown> | null) => void

/** Filtered env vars for child processes */
function getSafeEnv(): NodeJS.ProcessEnv {
  const keep = ['PATH', 'HOME', 'USER', 'SHELL', 'LANG', 'LC_ALL', 'LC_CTYPE', 'TERM', 'TMPDIR', 'XDG_RUNTIME_DIR', 'ANTHROPIC_API_KEY']
  const env: NodeJS.ProcessEnv = {}
  for (const key of keep) {
    if (process.env[key] !== undefined) {
      env[key] = process.env[key]
    }
  }
  return env
}

export class ClaudeManager {
  private currentProcess: ChildProcess | null = null
  private currentReadline: Interface | null = null
  private eventCallback: EventCallback = () => {}
  private errorCallback: ErrorCallback = () => {}
  private completeCallback: CompleteCallback = () => {}
  private claudeBinaryPath: string
  private executionLock: Promise<void> = Promise.resolve()

  constructor() {
    this.claudeBinaryPath = this.resolveClaudePath()
  }

  private resolveClaudePath(): string {
    try {
      const result = execSync('which claude', { encoding: 'utf-8', timeout: 5000 }).trim()
      if (result) return result
    } catch {
      // which failed, fall back to default
    }
    return 'claude'
  }

  async execute(prompt: string, cwd: string, sessionId?: string, model?: string, systemPrompt?: string): Promise<void> {
    // Serialize execution — prevent race conditions
    this.executionLock = this.executionLock.then(() => this._doExecute(prompt, cwd, sessionId, model, systemPrompt))
    return this.executionLock
  }

  private async _doExecute(prompt: string, cwd: string, sessionId?: string, model?: string, systemPrompt?: string): Promise<void> {
    // Kill any running process before starting a new one
    if (this.currentProcess) {
      await this.stop()
    }

    // Capture callbacks at call time to avoid overwrite issues (#17)
    const onEvent = this.eventCallback
    const onError = this.errorCallback
    const onComplete = this.completeCallback

    const args: string[] = [
      '-p',
      prompt,
      '--output-format',
      'stream-json',
      '--verbose',
      '--include-partial-messages'
    ]

    if (sessionId) {
      args.push('--session-id', sessionId)
    }

    if (model) {
      args.push('--model', model)
    }

    if (systemPrompt) {
      args.push('--system-prompt', systemPrompt)
    }

    const child = spawn(this.claudeBinaryPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: cwd || undefined,
      env: getSafeEnv()
    })

    this.currentProcess = child

    let lastEvent: Record<string, unknown> | null = null

    // Read stdout line by line (NDJSON)
    if (child.stdout) {
      const rl = createInterface({ input: child.stdout })
      this.currentReadline = rl
      rl.on('line', (line: string) => {
        const trimmed = line.trim()
        if (!trimmed) return

        try {
          const parsed = JSON.parse(trimmed) as Record<string, unknown>
          lastEvent = parsed
          onEvent(parsed)
        } catch {
          // Non-JSON line, ignore
        }
      })
    }

    // Handle stderr
    if (child.stderr) {
      child.stderr.on('data', (data: Buffer) => {
        const text = data.toString()
        if (text.trim()) {
          onError(text)
        }
      })
    }

    // Handle process exit
    child.on('close', () => {
      this.currentProcess = null
      this.currentReadline = null
      onComplete(lastEvent)
    })

    child.on('error', (err: Error) => {
      this.currentProcess = null
      this.currentReadline = null
      onError(`Failed to start claude process: ${err.message}`)
      onComplete(null)
    })
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      // Close readline interface to prevent listener leaks (#7)
      if (this.currentReadline) {
        this.currentReadline.close()
        this.currentReadline = null
      }

      if (!this.currentProcess) {
        resolve()
        return
      }

      const proc = this.currentProcess
      this.currentProcess = null

      const killTimeout = setTimeout(() => {
        try {
          proc.kill('SIGKILL')
        } catch {
          // Process may have already exited
        }
      }, 3000)

      proc.on('close', () => {
        clearTimeout(killTimeout)
        resolve()
      })

      proc.kill('SIGTERM')
    })
  }

  onEvent(callback: EventCallback): void {
    this.eventCallback = callback
  }

  onError(callback: ErrorCallback): void {
    this.errorCallback = callback
  }

  onComplete(callback: CompleteCallback): void {
    this.completeCallback = callback
  }

  get isRunning(): boolean {
    return this.currentProcess !== null
  }
}
