import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { autoUpdater } from 'electron-updater'
import log from 'electron-log'
import { initDatabase, closeDatabase, getVaultPath } from './database'
import { registerIpcHandlers } from './ipcHandlers'
// TODO: Google Drive sync sẽ được thêm trong v2.1.0
// import { registerDriveIpcHandlers } from './google-drive/ipc-handlers'
import * as crypto from './crypto'
import { AUTO_LOCK_MINUTES } from '../shared/constants'

let mainWindow: BrowserWindow | null = null
let autoLockTimer: ReturnType<typeof setTimeout> | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    show: false,
    backgroundColor: '#0a0a0f',
    titleBarStyle: 'hiddenInset',
  })

  if (process.env.NODE_ENV === 'development' || process.argv.includes('--dev')) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  resetAutoLockTimer()
}

function resetAutoLockTimer(): void {
  if (autoLockTimer) {
    clearTimeout(autoLockTimer)
  }
  autoLockTimer = setTimeout(() => {
    crypto.clearMasterKey()
    if (mainWindow) {
      mainWindow.webContents.send('app:auto-lock')
    }
  }, AUTO_LOCK_MINUTES * 60 * 1000)
}

let isInitialCheck = true

function setupAutoUpdater(): void {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.logger = log
  log.transports.file.level = 'info'

  autoUpdater.on('error', (err) => {
    log.error('[AutoUpdate]', err)
    if (!isInitialCheck) {
      mainWindow?.webContents.send('update-error', err.message)
    }
  })

  autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send('update-available', {
      version: info.version,
      releaseDate: info.releaseDate,
    })
  })

  autoUpdater.on('update-not-available', () => {
    if (!isInitialCheck) {
      mainWindow?.webContents.send('update-not-available')
    }
  })

  autoUpdater.on('download-progress', (progress) => {
    mainWindow?.webContents.send('update-download-progress', {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
    })
  })

  autoUpdater.on('update-downloaded', () => {
    mainWindow?.webContents.send('update-downloaded')
  })

  ipcMain.on('app:check-for-update', () => {
    isInitialCheck = false
    autoUpdater.checkForUpdates().catch((err) => {
      mainWindow?.webContents.send('update-error', 'Không thể kiểm tra cập nhật. Vui lòng thử lại sau.')
    })
  })

  ipcMain.on('app:download-update', () => {
    autoUpdater.downloadUpdate().catch((err) => {
      mainWindow?.webContents.send('update-error', 'Tải bản cập nhật thất bại. Vui lòng thử lại.')
    })
  })

  ipcMain.on('app:install-update', () => {
    autoUpdater.quitAndInstall()
  })

  // Auto check on startup - silent fail
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch(() => {
      // Silent fail for initial check
    })
  }, 5000)
}

app.whenReady().then(async () => {
  const vaultPath = getVaultPath()
  await initDatabase(vaultPath)
  registerIpcHandlers()
  // TODO: Google Drive sync sẽ được thêm trong v2.1.0
  // registerDriveIpcHandlers()
  createWindow()

  if (app.isPackaged) {
    setupAutoUpdater()
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  closeDatabase()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

ipcMain.on('app:user-activity', () => {
  resetAutoLockTimer()
})
