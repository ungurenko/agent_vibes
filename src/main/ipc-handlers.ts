import { ipcMain, dialog, BrowserWindow, app } from 'electron'
import { execSync, spawn, ChildProcess } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import { ClaudeManager } from './claude-manager'
import { saveSession, loadSession, listSessions, deleteSession, updateSessionMeta } from './sessions-store'
import { getSetting, setSetting, getAllSettings, setAllSettings, resetSettings } from './settings-store'

const manager = new ClaudeManager()

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
        } catch {
          /* ignore */
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

    return result.filePaths.map((filePath) => ({
      id: crypto.randomUUID(),
      path: filePath,
      name: path.basename(filePath),
      type: 'file' as const
    }))
  })

  ipcMain.handle('fs:saveClipboardImage', (_event, buffer: Uint8Array, ext: string) => {
    const tempDir = path.join(app.getPath('temp'), 'vibes-agent-images')
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }
    const fileName = `clipboard-${Date.now()}.${ext}`
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
    if (!fs.existsSync(filePath)) return null
    const data = fs.readFileSync(filePath)
    const ext = path.extname(filePath).slice(1).toLowerCase()
    const mime =
      ext === 'jpg' || ext === 'jpeg'
        ? 'image/jpeg'
        : ext === 'png'
          ? 'image/png'
          : ext === 'gif'
            ? 'image/gif'
            : ext === 'webp'
              ? 'image/webp'
              : ext === 'bmp'
                ? 'image/bmp'
                : 'image/png'
    return `data:${mime};base64,${data.toString('base64')}`
  })

  // --- CLI check/install/auth ---

  ipcMain.handle('cli:checkInstalled', () => {
    try {
      const cliPath = execSync('which claude', { encoding: 'utf-8' }).trim()
      const version = execSync('claude --version', { encoding: 'utf-8' }).trim()
      return { installed: true, path: cliPath, version }
    } catch {
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
      shell: true,
      env: { ...process.env }
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
      } catch {
        // Invalid JSON, ignore
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
      shell: true,
      env: { ...process.env }
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
