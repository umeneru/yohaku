import { ipcMain, dialog, app } from 'electron'
import { readdir, readFile, writeFile, mkdir, access, rename, unlink, rm } from 'fs/promises'
import { join } from 'path'
import { constants } from 'fs'

const HISTORY_FILE = join(app.getPath('userData'), 'directory-history.json')
const SETTINGS_FILE = join(app.getPath('userData'), 'settings.json')

const DEFAULT_SETTINGS = { hotkey: 'CommandOrControl+Shift+Y' }

async function loadSettings() {
  try {
    const data = await readFile(SETTINGS_FILE, 'utf-8')
    return { ...DEFAULT_SETTINGS, ...JSON.parse(data) }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

async function saveSettings(settings) {
  await writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8')
}

async function loadHistory() {
  try {
    const data = await readFile(HISTORY_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

async function saveHistory(history) {
  await writeFile(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf-8')
}

async function addToHistory(dirPath) {
  const history = await loadHistory()
  const filtered = history.filter((p) => p !== dirPath)
  const newHistory = [dirPath, ...filtered].slice(0, 10)
  await saveHistory(newHistory)
  return newHistory
}

async function buildTree(dirPath) {
  const entries = await readdir(dirPath, { withFileTypes: true })
  const items = []

  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    const fullPath = join(dirPath, entry.name)
    if (entry.isDirectory()) {
      items.push({
        name: entry.name,
        path: fullPath,
        isDirectory: true,
        children: []
      })
    } else {
      items.push({
        name: entry.name,
        path: fullPath,
        isDirectory: false
      })
    }
  }

  items.sort((a, b) => {
    if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name)
    return a.isDirectory ? -1 : 1
  })

  return items
}

export { loadSettings }

export function registerIpcHandlers() {
  ipcMain.handle('dialog:openDirectory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    if (result.canceled) return null
    return result.filePaths[0]
  })

  ipcMain.handle('fs:readDirectory', async (_event, dirPath) => {
    try {
      return await buildTree(dirPath)
    } catch (err) {
      throw new Error(`Failed to read directory: ${err.message}`)
    }
  })

  ipcMain.handle('fs:readFile', async (_event, filePath) => {
    try {
      return await readFile(filePath, 'utf-8')
    } catch (err) {
      throw new Error(`Failed to read file: ${err.message}`)
    }
  })

  ipcMain.handle('fs:writeFile', async (_event, filePath, content) => {
    try {
      await writeFile(filePath, content, 'utf-8')
    } catch (err) {
      throw new Error(`Failed to save file: ${err.message}`)
    }
  })

  ipcMain.handle('fs:createFile', async (_event, filePath) => {
    try {
      await access(filePath, constants.F_OK)
      throw new Error('File already exists')
    } catch (err) {
      if (err.message === 'File already exists') throw err
    }
    await writeFile(filePath, '', 'utf-8')
  })

  ipcMain.handle('fs:createDirectory', async (_event, dirPath) => {
    try {
      await mkdir(dirPath, { recursive: true })
    } catch (err) {
      throw new Error(`Failed to create directory: ${err.message}`)
    }
  })

  ipcMain.handle('history:get', async () => {
    return await loadHistory()
  })

  ipcMain.handle('history:add', async (_event, dirPath) => {
    return await addToHistory(dirPath)
  })

  ipcMain.handle('fs:rename', async (_event, oldPath, newPath) => {
    try {
      await rename(oldPath, newPath)
    } catch (err) {
      throw new Error(`Failed to rename: ${err.message}`)
    }
  })

  ipcMain.handle('fs:deleteFile', async (_event, filePath) => {
    try {
      await unlink(filePath)
    } catch (err) {
      throw new Error(`Failed to delete file: ${err.message}`)
    }
  })

  ipcMain.handle('fs:deleteDirectory', async (_event, dirPath) => {
    try {
      await rm(dirPath, { recursive: true, force: true })
    } catch (err) {
      throw new Error(`Failed to delete directory: ${err.message}`)
    }
  })

  ipcMain.handle('settings:get', async () => {
    return await loadSettings()
  })

  ipcMain.handle('settings:set', async (_event, settings) => {
    await saveSettings(settings)
    return settings
  })

  ipcMain.handle('fs:checkDirectoryEmpty', async (_event, dirPath) => {
    try {
      const entries = await readdir(dirPath)
      const nonHiddenEntries = entries.filter(name => !name.startsWith('.'))
      return nonHiddenEntries.length === 0
    } catch (err) {
      throw new Error(`Failed to check directory: ${err.message}`)
    }
  })
}
