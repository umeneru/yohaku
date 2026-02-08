import { contextBridge, ipcRenderer } from 'electron'

const menuListeners = new Set()
const watcherListeners = new Set()

ipcRenderer.on('menu:event', (_event, action) => {
  menuListeners.forEach((cb) => cb(action))
})

ipcRenderer.on('watcher:changed', () => {
  watcherListeners.forEach((cb) => cb())
})

contextBridge.exposeInMainWorld('electronAPI', {
  openDirectoryDialog: () => ipcRenderer.invoke('dialog:openDirectory'),
  readDirectory: (dirPath) => ipcRenderer.invoke('fs:readDirectory', dirPath),
  readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('fs:writeFile', filePath, content),
  createFile: (filePath) => ipcRenderer.invoke('fs:createFile', filePath),
  createDirectory: (dirPath) => ipcRenderer.invoke('fs:createDirectory', dirPath),
  rename: (oldPath, newPath) => ipcRenderer.invoke('fs:rename', oldPath, newPath),
  deleteFile: (filePath) => ipcRenderer.invoke('fs:deleteFile', filePath),
  deleteDirectory: (dirPath) => ipcRenderer.invoke('fs:deleteDirectory', dirPath),
  checkDirectoryEmpty: (dirPath) => ipcRenderer.invoke('fs:checkDirectoryEmpty', dirPath),
  getDirectoryHistory: () => ipcRenderer.invoke('history:get'),
  addToDirectoryHistory: (dirPath) => ipcRenderer.invoke('history:add', dirPath),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:set', settings),
  updateHotkey: (hotkey) => ipcRenderer.send('settings:updateHotkey', hotkey),
  suspendHotkey: () => ipcRenderer.send('settings:suspendHotkey'),
  resumeHotkey: () => ipcRenderer.send('settings:resumeHotkey'),
  startWatcher: (dirPath) => ipcRenderer.send('watcher:start', dirPath),
  stopWatcher: () => ipcRenderer.send('watcher:stop'),
  onWatcherChanged: (callback) => {
    watcherListeners.add(callback)
    return () => watcherListeners.delete(callback)
  },
  onMenuEvent: (callback) => {
    menuListeners.add(callback)
    return () => menuListeners.delete(callback)
  }
})
