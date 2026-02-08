import { Menu, app, dialog } from 'electron'

export function createMenu(mainWindow) {
  const isMac = process.platform === 'darwin'

  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Directory...',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow.webContents.send('menu:event', 'openDirectory')
        },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow.webContents.send('menu:event', 'save')
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { type: 'separator' },
        {
          label: 'Find...',
          accelerator: 'CmdOrCtrl+F',
          click: () => mainWindow.webContents.send('menu:event', 'find')
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About Yohaku.',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About Yohaku.',
              message: 'Yohaku. v1.0.0',
              detail: 'A simple text editor built with React and Electron.'
            })
          }
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}
