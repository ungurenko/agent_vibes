import type { AttachedImage, SkillInfo } from './claude'

export {}

interface SessionSummaryPayload {
  id: string
  title: string
  projectName: string
  projectDir: string | null
  messageCount: number
  totalCost: number
  createdAt: number
  updatedAt: number
}

interface SessionSavePayload {
  messages: unknown[]
  claudeSessionId: string | null
  totalCost: number
  createdAt: number
  updatedAt: number
  title?: string
  projectName?: string
  projectDir?: string | null
}

declare global {
  interface Window {
    claude: {
      execute: (prompt: string, cwd: string, sessionId?: string, model?: string, systemPrompt?: string) => void
      stop: () => void
      onEvent: (callback: (event: unknown) => void) => () => void
      onError: (callback: (error: string) => void) => () => void
      onComplete: (callback: (result: unknown) => void) => () => void
    }
    dialog: {
      selectFolder: () => Promise<string | null>
      selectImages: () => Promise<AttachedImage[] | null>
    }
    sessions: {
      save: (id: string, data: SessionSavePayload) => Promise<void>
      load: (id: string) => Promise<unknown>
      list: () => Promise<SessionSummaryPayload[]>
      delete: (id: string) => Promise<void>
      updateMeta: (id: string, updates: Record<string, unknown>) => Promise<void>
    }
    settings: {
      get: (key: string) => Promise<unknown>
      set: (key: string, value: unknown) => Promise<void>
      getAll: () => Promise<Record<string, unknown>>
      setAll: (data: Record<string, unknown>) => Promise<void>
      reset: () => Promise<void>
    }
    data: {
      clearHistory: () => Promise<void>
    }
    fs: {
      pathExists: (path: string) => Promise<boolean>
      saveClipboardImage: (buffer: Uint8Array, ext: string) => Promise<AttachedImage>
      getImageDataUrl: (path: string) => Promise<string | null>
      revokeImagePath: (path: string) => Promise<void>
    }
    skills: {
      list: () => Promise<SkillInfo[]>
    }
    cli: {
      checkInstalled: () => Promise<{ installed: boolean; path: string | null; version: string | null }>
      install: () => void
      onInstallProgress: (callback: (data: string) => void) => () => void
      onInstallComplete: (callback: (result: { success: boolean; error?: string }) => void) => () => void
      checkAuth: () => Promise<{ authenticated: boolean; accountInfo: string | null }>
      login: () => void
      onLoginProgress: (callback: (data: string) => void) => () => void
      onLoginComplete: (callback: (result: { success: boolean; error?: string }) => void) => () => void
    }
  }
}
