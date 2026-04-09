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
  readDirectoryRecursive: (dirPath) => ipcRenderer.invoke('fs:readDirectoryRecursive', dirPath),
  readFile: (filePath) => ipcRenderer.invoke('fs:readFile', filePath),
  writeFile: (filePath, content) => ipcRenderer.invoke('fs:writeFile', filePath, content),
  createFile: (filePath) => ipcRenderer.invoke('fs:createFile', filePath),
  createDirectory: (dirPath) => ipcRenderer.invoke('fs:createDirectory', dirPath),
  rename: (oldPath, newPath) => ipcRenderer.invoke('fs:rename', oldPath, newPath),
  deleteFile: (filePath) => ipcRenderer.invoke('fs:deleteFile', filePath),
  deleteDirectory: (dirPath) => ipcRenderer.invoke('fs:deleteDirectory', dirPath),
  checkDirectoryEmpty: (dirPath) => ipcRenderer.invoke('fs:checkDirectoryEmpty', dirPath),
  searchInDirectory: (rootPath, keyword) => ipcRenderer.invoke('fs:searchInDirectory', rootPath, keyword),
  openExternal: (url) => ipcRenderer.invoke('shell:openExternal', url),
  getDirectoryHistory: () => ipcRenderer.invoke('history:get'),
  addToDirectoryHistory: (dirPath) => ipcRenderer.invoke('history:add', dirPath),
  removeFromDirectoryHistory: (dirPath) => ipcRenderer.invoke('history:remove', dirPath),
  getLastFile: (dirPath) => ipcRenderer.invoke('lastFile:get', dirPath),
  setLastFile: (dirPath, filePath) => ipcRenderer.invoke('lastFile:set', dirPath, filePath),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:set', settings),
  getZoomFactor: () => ipcRenderer.invoke('view:getZoomFactor'),
  setZoomFactor: (factor) => ipcRenderer.invoke('view:setZoomFactor', factor),
  zoomIn: () => ipcRenderer.invoke('view:zoomIn'),
  zoomOut: () => ipcRenderer.invoke('view:zoomOut'),
  resetZoom: () => ipcRenderer.invoke('view:resetZoom'),
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
