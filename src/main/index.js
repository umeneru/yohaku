import { app, BrowserWindow, Menu, globalShortcut, ipcMain, screen } from 'electron'
import { join } from 'path'
import { watch } from 'fs'
import { registerIpcHandlers, loadSettings } from './ipc-handlers'

// Disable overlay/fluent scrollbars so CSS ::-webkit-scrollbar styles apply
app.commandLine.appendSwitch('disable-features', 'OverlayScrollbar,OverlayScrollbars,FluentScrollbar,FluentOverlayScrollbar')

let currentWatcher = null
let debounceTimer = null

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 600,
    minHeight: 400,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Hide menu bar
  Menu.setApplicationMenu(null)

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

function registerHotkey(accelerator) {
  globalShortcut.unregisterAll()
  if (!accelerator) return
  try {
    globalShortcut.register(accelerator, () => {
      const windows = BrowserWindow.getAllWindows()
      if (windows.length > 0) {
        const win = windows[0]
        if (win.isFocused()) {
          win.hide()
        } else {
          if (win.isMinimized()) win.restore()
          const cursorPoint = screen.getCursorScreenPoint()
          const display = screen.getDisplayNearestPoint(cursorPoint)
          const { x, y, width, height } = display.workArea
          const bounds = win.getBounds()
          win.setPosition(
            Math.round(x + (width - bounds.width) / 2),
            Math.round(y + (height - bounds.height) / 2)
          )
          win.show()
          win.focus()
        }
      } else {
        createWindow()
      }
    })
  } catch (err) {
    console.error('Failed to register hotkey:', err)
  }
}

app.whenReady().then(async () => {
  registerIpcHandlers()
  createWindow()

  let currentHotkey = null
  const settings = await loadSettings()
  currentHotkey = settings.hotkey
  registerHotkey(currentHotkey)

  ipcMain.on('settings:updateHotkey', (_event, hotkey) => {
    currentHotkey = hotkey
    registerHotkey(hotkey)
  })

  ipcMain.on('watcher:start', (_event, dirPath) => {
    if (currentWatcher) {
      currentWatcher.close()
      currentWatcher = null
    }
    try {
      currentWatcher = watch(dirPath, { recursive: true }, () => {
        clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => {
          const windows = BrowserWindow.getAllWindows()
          if (windows.length > 0) {
            windows[0].webContents.send('watcher:changed')
          }
        }, 300)
      })
    } catch (err) {
      console.error('Failed to start watcher:', err)
    }
  })

  ipcMain.on('watcher:stop', () => {
    if (currentWatcher) {
      currentWatcher.close()
      currentWatcher = null
    }
    clearTimeout(debounceTimer)
  })

  ipcMain.on('settings:suspendHotkey', () => {
    globalShortcut.unregisterAll()
  })

  ipcMain.on('settings:resumeHotkey', () => {
    if (currentHotkey) registerHotkey(currentHotkey)
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  if (currentWatcher) {
    currentWatcher.close()
    currentWatcher = null
  }
  clearTimeout(debounceTimer)
})
