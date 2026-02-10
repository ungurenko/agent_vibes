import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const claudeAPI = {
  execute: (prompt: string, cwd: string, sessionId?: string, model?: string, systemPrompt?: string): void => {
    ipcRenderer.send('claude:execute', { prompt, cwd, sessionId, model, systemPrompt })
  },
  stop: (): void => {
    ipcRenderer.send('claude:stop')
  },
  onEvent: (callback: (event: unknown) => void): (() => void) => {
    const handler = (_: unknown, data: unknown): void => {
      callback(data)
    }
    ipcRenderer.on('claude:event', handler)
    return () => ipcRenderer.removeListener('claude:event', handler)
  },
  onError: (callback: (error: string) => void): (() => void) => {
    const handler = (_: unknown, data: string): void => {
      callback(data)
    }
    ipcRenderer.on('claude:error', handler)
    return () => ipcRenderer.removeListener('claude:error', handler)
  },
  onComplete: (callback: (result: unknown) => void): (() => void) => {
    const handler = (_: unknown, data: unknown): void => {
      callback(data)
    }
    ipcRenderer.on('claude:complete', handler)
    return () => ipcRenderer.removeListener('claude:complete', handler)
  }
}

const dialogAPI = {
  selectFolder: (): Promise<string | null> => {
    return ipcRenderer.invoke('dialog:selectFolder')
  },
  selectImages: (): Promise<unknown[] | null> => {
    return ipcRenderer.invoke('dialog:selectImages')
  }
}

const sessionsAPI = {
  save: (id: string, data: unknown): Promise<void> => {
    return ipcRenderer.invoke('sessions:save', id, data)
  },
  load: (id: string): Promise<unknown> => {
    return ipcRenderer.invoke('sessions:load', id)
  },
  list: (): Promise<unknown[]> => {
    return ipcRenderer.invoke('sessions:list')
  },
  delete: (id: string): Promise<void> => {
    return ipcRenderer.invoke('sessions:delete', id)
  },
  updateMeta: (id: string, updates: Record<string, unknown>): Promise<void> => {
    return ipcRenderer.invoke('sessions:updateMeta', id, updates)
  }
}

const settingsAPI = {
  get: (key: string): Promise<unknown> => {
    return ipcRenderer.invoke('settings:get', key)
  },
  set: (key: string, value: unknown): Promise<void> => {
    return ipcRenderer.invoke('settings:set', key, value)
  },
  getAll: (): Promise<Record<string, unknown>> => {
    return ipcRenderer.invoke('settings:getAll')
  },
  setAll: (data: Record<string, unknown>): Promise<void> => {
    return ipcRenderer.invoke('settings:setAll', data)
  },
  reset: (): Promise<void> => {
    return ipcRenderer.invoke('settings:reset')
  }
}

const dataAPI = {
  clearHistory: (): Promise<void> => {
    return ipcRenderer.invoke('data:clearHistory')
  }
}

const fsAPI = {
  pathExists: (p: string): Promise<boolean> => {
    return ipcRenderer.invoke('fs:pathExists', p)
  },
  saveClipboardImage: (buffer: Uint8Array, ext: string): Promise<unknown> => {
    return ipcRenderer.invoke('fs:saveClipboardImage', buffer, ext)
  },
  getImageDataUrl: (filePath: string): Promise<string | null> => {
    return ipcRenderer.invoke('fs:getImageDataUrl', filePath)
  }
}

const cliAPI = {
  checkInstalled: (): Promise<{ installed: boolean; path: string | null; version: string | null }> => {
    return ipcRenderer.invoke('cli:checkInstalled')
  },
  install: (): void => {
    ipcRenderer.send('cli:install')
  },
  onInstallProgress: (callback: (data: string) => void): (() => void) => {
    const handler = (_: unknown, data: string): void => { callback(data) }
    ipcRenderer.on('cli:install:progress', handler)
    return () => ipcRenderer.removeListener('cli:install:progress', handler)
  },
  onInstallComplete: (callback: (result: { success: boolean; error?: string }) => void): (() => void) => {
    const handler = (_: unknown, data: { success: boolean; error?: string }): void => { callback(data) }
    ipcRenderer.on('cli:install:complete', handler)
    return () => ipcRenderer.removeListener('cli:install:complete', handler)
  },
  checkAuth: (): Promise<{ authenticated: boolean; accountInfo: string | null }> => {
    return ipcRenderer.invoke('cli:checkAuth')
  },
  login: (): void => {
    ipcRenderer.send('cli:login')
  },
  onLoginProgress: (callback: (data: string) => void): (() => void) => {
    const handler = (_: unknown, data: string): void => { callback(data) }
    ipcRenderer.on('cli:login:progress', handler)
    return () => ipcRenderer.removeListener('cli:login:progress', handler)
  },
  onLoginComplete: (callback: (result: { success: boolean }) => void): (() => void) => {
    const handler = (_: unknown, data: { success: boolean }): void => { callback(data) }
    ipcRenderer.on('cli:login:complete', handler)
    return () => ipcRenderer.removeListener('cli:login:complete', handler)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('claude', claudeAPI)
    contextBridge.exposeInMainWorld('dialog', dialogAPI)
    contextBridge.exposeInMainWorld('sessions', sessionsAPI)
    contextBridge.exposeInMainWorld('settings', settingsAPI)
    contextBridge.exposeInMainWorld('data', dataAPI)
    contextBridge.exposeInMainWorld('fs', fsAPI)
    contextBridge.exposeInMainWorld('cli', cliAPI)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.claude = claudeAPI
  // @ts-ignore
  window.dialog = dialogAPI
  // @ts-ignore
  window.sessions = sessionsAPI
  // @ts-ignore
  window.settings = settingsAPI
  // @ts-ignore
  window.data = dataAPI
  // @ts-ignore
  window.fs = fsAPI
  // @ts-ignore
  window.cli = cliAPI
}
