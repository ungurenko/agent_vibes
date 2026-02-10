import { ipcMain, dialog, BrowserWindow, app } from 'electron'
import { execSync, spawn, ChildProcess } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import { ClaudeManager } from './claude-manager'
import { saveSession, loadSession, listSessions, deleteSession, updateSessionMeta } from './sessions-store'
import { getSetting, setSetting, getAllSettings, setAllSettings, resetSettings } from './settings-store'

const manager = new ClaudeManager()

const ALLOWED_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'])

/** Paths selected via native dialog — allowed for getImageDataUrl */
const allowedImagePaths = new Set<string>()

function getTempImagesDir(): string {
  return path.join(app.getPath('temp'), 'vibes-agent-images')
}

function isPathAllowedForImageRead(filePath: string): boolean {
  const resolved = path.resolve(filePath)
  // Allow temp directory (clipboard images)
  if (resolved.startsWith(getTempImagesDir())) return true
  // Allow paths that were selected via native dialog
  if (allowedImagePaths.has(resolved)) return true
  return false
}

/** Filtered env vars for child processes — no secrets leak */
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

export function registerIpcHandlers(mainWindow: BrowserWindow): void {
  // Execute claude CLI with prompt
  ipcMain.on(
    'claude:execute',
    (_event, payload: { prompt: string; cwd: string; sessionId?: string; model?: string; systemPrompt?: string }) => {
      const { prompt, cwd, sessionId, model, systemPrompt } = payload

      manager.onEvent((data) => {
        if (!mainWindow.isDestroyed()) {
          mainWindow.webContents.send('claude:event', data)
        }
      })

      manager.onError((error) => {
        if (!mainWindow.isDestroyed()) {
          mainWindow.webContents.send('claude:error', error)
        }
      })

      manager.onComplete((lastEvent) => {
        if (!mainWindow.isDestroyed()) {
          mainWindow.webContents.send('claude:complete', lastEvent)
        }
      })

      manager.execute(prompt, cwd, sessionId, model, systemPrompt)
    }
  )

  // Stop the running claude process
  ipcMain.on('claude:stop', () => {
    manager.stop()
  })

  // Open native folder selection dialog
  ipcMain.handle('dialog:selectFolder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory', 'createDirectory']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths[0]
  })

  // --- Sessions ---
  ipcMain.handle('sessions:save', (_event, id: string, data: unknown) => {
    saveSession(id, data as Parameters<typeof saveSession>[1])
  })

  ipcMain.handle('sessions:load', (_event, id: string) => {
    return loadSession(id)
  })

  ipcMain.handle('sessions:list', () => {
    return listSessions()
  })

  ipcMain.handle('sessions:delete', (_event, id: string) => {
    deleteSession(id)
  })

  ipcMain.handle('sessions:updateMeta', (_event, id: string, updates: Record<string, unknown>) => {
    updateSessionMeta(id, updates)
  })

  // --- Settings ---
  ipcMain.handle('settings:get', (_event, key: string) => {
    return getSetting(key)
  })

  ipcMain.handle('settings:set', (_event, key: string, value: unknown) => {
    setSetting(key, value)
  })

  ipcMain.handle('settings:getAll', () => {
    return getAllSettings()
  })

  ipcMain.handle('settings:setAll', (_event, data: Record<string, unknown>) => {
    setAllSettings(data)
  })

  ipcMain.handle('settings:reset', () => {
    resetSettings()
  })

  // --- Data ---
  ipcMain.handle('data:clearHistory', () => {
    const sessionsDir = path.join(app.getPath('home'), '.vibes-agent', 'sessions')
    const metaPath = path.join(app.getPath('home'), '.vibes-agent', 'sessions-meta.json')

    // Remove all session files
    if (fs.existsSync(sessionsDir)) {
      const files = fs.readdirSync(sessionsDir)
      for (const file of files) {
        try {
          fs.unlinkSync(path.join(sessionsDir, file))
        } catch (err) {
          console.warn('[data] Failed to delete session file:', file, (err as Error).message)
        }
      }
    }

    // Reset meta
    if (fs.existsSync(metaPath)) {
      fs.writeFileSync(metaPath, '[]', 'utf-8')
    }
  })

  // --- Filesystem ---
  ipcMain.handle('fs:pathExists', (_event, p: string) => {
    // Only allow checking paths within home directory or temp
    const resolved = path.resolve(p)
    const homeDir = app.getPath('home')
    const tempDir = app.getPath('temp')
    if (!resolved.startsWith(homeDir) && !resolved.startsWith(tempDir)) {
      return false
    }
    return fs.existsSync(p)
  })

  // --- Images ---
  ipcMain.handle('dialog:selectImages', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'] }
      ]
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths.map((filePath) => {
      allowedImagePaths.add(path.resolve(filePath))
      return {
        id: crypto.randomUUID(),
        path: filePath,
        name: path.basename(filePath),
        type: 'file' as const
      }
    })
  })

  ipcMain.handle('fs:saveClipboardImage', (_event, buffer: Uint8Array, ext: string) => {
    // Validate extension — allowlist only
    const cleanExt = ext.replace(/^\./, '').toLowerCase()
    if (!ALLOWED_IMAGE_EXTENSIONS.has(cleanExt)) {
      throw new Error(`Unsupported image extension: ${ext}`)
    }

    const tempDir = getTempImagesDir()
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }
    const fileName = `clipboard-${Date.now()}.${cleanExt}`
    const filePath = path.join(tempDir, fileName)
    fs.writeFileSync(filePath, Buffer.from(buffer))
    return {
      id: crypto.randomUUID(),
      path: filePath,
      name: fileName,
      type: 'clipboard' as const
    }
  })

  ipcMain.handle('fs:getImageDataUrl', (_event, filePath: string) => {
    // Validate path — only allow temp images and dialog-selected files
    if (!isPathAllowedForImageRead(filePath)) {
      console.warn('[security] Blocked getImageDataUrl for path:', filePath)
      return null
    }

    if (!fs.existsSync(filePath)) return null
    const ext = path.extname(filePath).slice(1).toLowerCase()
    if (!ALLOWED_IMAGE_EXTENSIONS.has(ext)) return null

    const data = fs.readFileSync(filePath)
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      bmp: 'image/bmp'
    }
    const mime = mimeMap[ext] || 'image/png'
    return `data:${mime};base64,${data.toString('base64')}`
  })

  // --- CLI check/install/auth ---

  ipcMain.handle('cli:checkInstalled', () => {
    try {
      const cliPath = execSync('which claude', { encoding: 'utf-8', timeout: 5000 }).trim()
      const version = execSync('claude --version', { encoding: 'utf-8', timeout: 5000 }).trim()
      return { installed: true, path: cliPath, version }
    } catch (err) {
      console.warn('[cli] checkInstalled failed:', (err as Error).message)
      return { installed: false, path: null, version: null }
    }
  })

  let installProcess: ChildProcess | null = null

  ipcMain.on('cli:install', (event) => {
    if (installProcess) {
      installProcess.kill()
      installProcess = null
    }

    installProcess = spawn('npm', ['install', '-g', '@anthropic-ai/claude-code'], {
      env: getSafeEnv()
    })

    const timeout = setTimeout(() => {
      if (installProcess) {
        installProcess.kill()
        installProcess = null
        event.sender.send('cli:install:complete', {
          success: false,
          error: 'Installation timed out after 5 minutes'
        })
      }
    }, 5 * 60 * 1000)

    installProcess.stdout?.on('data', (data: Buffer) => {
      event.sender.send('cli:install:progress', data.toString())
    })

    installProcess.stderr?.on('data', (data: Buffer) => {
      event.sender.send('cli:install:progress', data.toString())
    })

    installProcess.on('close', (code) => {
      clearTimeout(timeout)
      installProcess = null
      event.sender.send('cli:install:complete', {
        success: code === 0,
        error: code !== 0 ? `Process exited with code ${code}` : undefined
      })
    })

    installProcess.on('error', (err) => {
      clearTimeout(timeout)
      installProcess = null
      event.sender.send('cli:install:complete', {
        success: false,
        error: err.message
      })
    })
  })

  ipcMain.handle('cli:checkAuth', () => {
    const homeDir = app.getPath('home')
    const claudeJson = path.join(homeDir, '.claude.json')

    if (fs.existsSync(claudeJson)) {
      try {
        const content = JSON.parse(fs.readFileSync(claudeJson, 'utf-8'))
        if (content.oauthAccount) {
          const { displayName, emailAddress } = content.oauthAccount
          const accountInfo = [displayName, emailAddress].filter(Boolean).join(' — ') || null
          return { authenticated: true, accountInfo }
        }
      } catch (err) {
        console.warn('[cli] Failed to parse .claude.json:', (err as Error).message)
      }
    }

    return { authenticated: false, accountInfo: null }
  })

  let loginProcess: ChildProcess | null = null

  ipcMain.on('cli:login', (event) => {
    if (loginProcess) {
      loginProcess.kill()
      loginProcess = null
    }

    loginProcess = spawn('claude', [], {
      env: getSafeEnv()
    })

    const timeout = setTimeout(() => {
      if (loginProcess) {
        loginProcess.kill()
        loginProcess = null
        event.sender.send('cli:login:complete', { success: false })
      }
    }, 3 * 60 * 1000)

    loginProcess.stdout?.on('data', (data: Buffer) => {
      event.sender.send('cli:login:progress', data.toString())
    })

    loginProcess.stderr?.on('data', (data: Buffer) => {
      event.sender.send('cli:login:progress', data.toString())
    })

    loginProcess.on('close', (code) => {
      clearTimeout(timeout)
      loginProcess = null
      event.sender.send('cli:login:complete', { success: code === 0 })
    })

    loginProcess.on('error', (err) => {
      clearTimeout(timeout)
      loginProcess = null
      event.sender.send('cli:login:progress', `Error: ${err.message}`)
      event.sender.send('cli:login:complete', { success: false })
    })
  })
}
