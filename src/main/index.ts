import { app, shell, BrowserWindow, nativeImage, dialog } from 'electron'
import { join } from 'path'
import * as fs from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { autoUpdater } from 'electron-updater'
import log from 'electron-log'
import { registerIpcHandlers } from './ipc-handlers'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 15, y: 15 },
    icon: join(__dirname, '../../resources/icon.png'),
    backgroundColor: '#FFFFFF',
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  registerIpcHandlers(mainWindow)
}

app.whenReady().then(() => {
  // Clean up old temp clipboard images
  const tempImagesDir = join(app.getPath('temp'), 'vibes-agent-images')
  if (fs.existsSync(tempImagesDir)) {
    fs.rmSync(tempImagesDir, { recursive: true, force: true })
  }

  electronApp.setAppUserModelId('com.vibes-agent')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Set Dock icon (in dev mode Electron shows its default icon)
  if (process.platform === 'darwin') {
    const dockIcon = nativeImage.createFromPath(join(__dirname, '../../resources/icon.png'))
    if (!dockIcon.isEmpty()) {
      app.dock.setIcon(dockIcon)
    }
  }

  createWindow()

  // Auto-updates (only in production)
  if (!is.dev) {
    const releasesUrl = 'https://github.com/ungurenko/agent_vibes/releases/latest'

    autoUpdater.logger = log
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true

    autoUpdater.on('update-available', (info) => {
      log.info('Update available:', info.version)
    })

    autoUpdater.on('update-downloaded', (info) => {
      dialog
        .showMessageBox({
          type: 'info',
          title: 'Обновление готово',
          message: `Версия ${info.version} загружена. Перезапустить приложение?`,
          buttons: ['Перезапустить', 'Позже']
        })
        .then((result) => {
          if (result.response === 0) {
            autoUpdater.quitAndInstall()
          }
        })
    })

    autoUpdater.on('error', (err) => {
      log.error('Auto-update error:', err)
      dialog
        .showMessageBox({
          type: 'warning',
          title: 'Ошибка обновления',
          message: 'Не удалось установить обновление автоматически. Скачать вручную?',
          buttons: ['Открыть страницу загрузки', 'Пропустить']
        })
        .then((result) => {
          if (result.response === 0) {
            shell.openExternal(releasesUrl)
          }
        })
    })

    autoUpdater.checkForUpdatesAndNotify()
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
