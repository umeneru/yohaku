import React, { useState, useCallback, useEffect } from 'react'
import { useAppState, useAppDispatch } from '../../context/AppContext'
import TreeNode from './TreeNode'
import ContextMenu from './ContextMenu'
import InputDialog from './InputDialog'
import DirectoryPicker from './DirectoryPicker'
import SearchPanel from './SearchPanel'
import Settings from '../Settings/Settings'
import styles from './FileExplorer.module.css'
import { join as pathJoin } from './pathUtil'

function FileExplorer() {
  const { rootPath, tree } = useAppState()
  const dispatch = useAppDispatch()
  const [contextMenu, setContextMenu] = useState(null)
  const [inputDialog, setInputDialog] = useState(null)
  const [showPicker, setShowPicker] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [history, setHistory] = useState([])

  useEffect(() => {
    const loadInitial = async () => {
      const hist = await window.electronAPI.getDirectoryHistory()
      setHistory(hist)
      if (hist.length > 0) {
        await openDirectory(hist[0])
      }
    }
    loadInitial()
  }, [])

  useEffect(() => {
    const unsubscribe = window.electronAPI.onMenuEvent((action) => {
      if (action === 'openDirectory') handleSelectNew()
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    const unsubscribe = window.electronAPI.onWatcherChanged(() => {
      refreshTree()
    })
    return () => {
      unsubscribe()
      window.electronAPI.stopWatcher()
    }
  }, [])

  const openDirectory = async (dirPath) => {
    try {
      window.electronAPI.stopWatcher()
      const treeData = await window.electronAPI.readDirectory(dirPath)
      dispatch({ type: 'SET_ROOT', rootPath: dirPath, tree: treeData })
      const newHistory = await window.electronAPI.addToDirectoryHistory(dirPath)
      setHistory(newHistory)
      window.electronAPI.startWatcher(dirPath)
    } catch (err) {
      window.alert(`Failed to open directory: ${err.message}`)
    }
  }

  const handleSelectNew = async () => {
    setShowPicker(false)
    const dirPath = await window.electronAPI.openDirectoryDialog()
    if (!dirPath) return
    setShowSearch(false)
    await openDirectory(dirPath)
  }

  const handleSelectFromHistory = async (dirPath) => {
    setShowPicker(false)
    setShowSearch(false)
    await openDirectory(dirPath)
  }

  const handleContextMenu = useCallback((e) => {
    e.preventDefault()
    if (!rootPath) return

    let targetDir = rootPath
    let targetPath = null
    let targetType = null

    const nodeEl = e.target.closest('[data-path]')
    if (nodeEl) {
      const isDir = nodeEl.dataset.isDirectory === 'true'
      targetPath = nodeEl.dataset.path
      targetType = isDir ? 'directory' : 'file'

      if (isDir) {
        targetDir = nodeEl.dataset.path
      } else {
        const filePath = nodeEl.dataset.path
        const sep = filePath.includes('\\') ? '\\' : '/'
        targetDir = filePath.substring(0, filePath.lastIndexOf(sep))
      }
    }

    setContextMenu({ x: e.clientX, y: e.clientY, targetDir, targetPath, targetType })
  }, [rootPath])

  const handleBottomBarContextMenu = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleNewFile = () => {
    const targetDir = contextMenu.targetDir
    setContextMenu(null)
    setInputDialog({
      title: 'New File',
      defaultValue: 'untitled',
      type: 'file',
      targetDir,
      submitLabel: 'Create'
    })
  }

  const handleNewFolder = () => {
    const targetDir = contextMenu.targetDir
    setContextMenu(null)
    setInputDialog({
      title: 'New Folder',
      defaultValue: '',
      type: 'folder',
      targetDir,
      submitLabel: 'Create'
    })
  }

  const handleRename = () => {
    const { targetPath, targetType } = contextMenu
    setContextMenu(null)
    const sep = targetPath.includes('\\') ? '\\' : '/'
    const currentName = targetPath.split(sep).pop()
    setInputDialog({
      title: targetType === 'file' ? 'Rename File' : 'Rename Folder',
      defaultValue: currentName,
      type: 'rename',
      targetPath,
      targetType,
      submitLabel: 'Rename'
    })
  }

  const handleDelete = async () => {
    const { targetPath, targetType } = contextMenu
    setContextMenu(null)

    try {
      if (targetType === 'directory') {
        const isEmpty = await window.electronAPI.checkDirectoryEmpty(targetPath)
        if (!isEmpty) {
          const confirmed = window.confirm(
            'This directory is not empty. Are you sure you want to delete it and all its contents?'
          )
          if (!confirmed) return
        }
        await window.electronAPI.deleteDirectory(targetPath)
      } else {
        const confirmed = window.confirm('Are you sure you want to delete this file?')
        if (!confirmed) return
        await window.electronAPI.deleteFile(targetPath)
      }
      await refreshTree()
    } catch (err) {
      window.alert(String(err.message || err))
    }
  }

  const handleDialogSubmit = async (name) => {
    const { type, targetDir, targetPath } = inputDialog
    setInputDialog(null)

    if (!name || !name.trim()) {
      window.alert('Please enter a name')
      return
    }

    try {
      if (type === 'file') {
        if (!name.includes('.')) name += '.txt'
        const filePath = pathJoin(targetDir, name)
        console.log('Creating file:', filePath)
        await window.electronAPI.createFile(filePath)
      } else if (type === 'folder') {
        const dirPath = pathJoin(targetDir, name)
        console.log('Creating directory:', dirPath)
        await window.electronAPI.createDirectory(dirPath)
      } else if (type === 'rename') {
        const sep = targetPath.includes('\\') ? '\\' : '/'
        const parentDir = targetPath.substring(0, targetPath.lastIndexOf(sep))
        const newPath = pathJoin(parentDir, name)
        console.log('Renaming:', targetPath, '->', newPath)
        await window.electronAPI.rename(targetPath, newPath)
      }
      await refreshTree()
    } catch (err) {
      console.error('Operation failed:', err)
      window.alert(`Operation failed: ${err.message || err}`)
    }
  }

  const handleDialogCancel = () => {
    setInputDialog(null)
  }

  const refreshTree = async () => {
    if (!rootPath) return
    const treeData = await window.electronAPI.readDirectory(rootPath)
    dispatch({ type: 'REFRESH_TREE', tree: treeData })
  }

  const getDirectoryName = () => {
    if (!rootPath) return 'No directory'
    const sep = rootPath.includes('\\') ? '\\' : '/'
    const parts = rootPath.split(sep).filter(Boolean)
    return parts[parts.length - 1] || rootPath
  }

  return (
    <div className={styles.explorer} onContextMenu={handleContextMenu}>
      {showSearch ? (
        <SearchPanel onClose={() => setShowSearch(false)} />
      ) : (
        <div className={styles.treeContainer}>
          {tree.length === 0 ? (
            <div className={styles.empty}>
              {rootPath ? 'Empty directory' : 'No directory selected'}
            </div>
          ) : (
            tree.map((node) => (
              <TreeNode key={node.path} node={node} depth={0} />
            ))
          )}
        </div>
      )}
      <div className={styles.bottomBar} onContextMenu={handleBottomBarContextMenu}>
        <div className={styles.directoryBar} onClick={() => setShowPicker(true)}>
          <svg className={styles.dirIcon} width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path fillRule="evenodd" d="M3.646 9.146a.5.5 0 0 1 .708 0L8 12.793l3.646-3.647a.5.5 0 0 1 .708.708l-4 4a.5.5 0 0 1-.708 0l-4-4a.5.5 0 0 1 0-.708zm0-2.292a.5.5 0 0 0 .708 0L8 3.207l3.646 3.647a.5.5 0 0 0 .708-.708l-4-4a.5.5 0 0 0-.708 0l-4 4a.5.5 0 0 0 0 .708z"/>
          </svg>
          <span className={styles.dirName} title={rootPath}>
            {getDirectoryName()}
          </span>
        </div>
        <button
          className={styles.searchButton}
          onClick={() => setShowSearch(!showSearch)}
          title={showSearch ? 'Back to file tree' : 'Search in files'}
        >
          {showSearch ? (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h2.764c.958 0 1.76.56 2.311 1.184C7.985 3.648 8.48 4 9 4h4.5A1.5 1.5 0 0 1 15 5.5v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 1 12.5v-9zM2.5 3a.5.5 0 0 0-.5.5V6h12v-.5a.5.5 0 0 0-.5-.5H9c-.964 0-1.71-.629-2.174-1.154C6.374 3.334 5.82 3 5.264 3H2.5zM14 7H2v5.5a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5V7z"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
            </svg>
          )}
        </button>
        <button
          className={styles.settingsButton}
          onClick={() => setShowSettings(true)}
          title="Settings"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
            <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.902 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z"/>
          </svg>
        </button>
      </div>
      {showPicker && (
        <DirectoryPicker
          history={history}
          onSelect={handleSelectFromHistory}
          onSelectNew={handleSelectNew}
          onClose={() => setShowPicker(false)}
          onRemove={async (dirPath) => {
            const updated = await window.electronAPI.removeFromDirectoryHistory(dirPath)
            setHistory(updated)
          }}
        />
      )}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          targetType={contextMenu.targetType}
          onNewFile={handleNewFile}
          onNewFolder={handleNewFolder}
          onRename={handleRename}
          onDelete={handleDelete}
          onClose={() => setContextMenu(null)}
        />
      )}
      {showSettings && (
        <Settings onClose={() => setShowSettings(false)} />
      )}
      {inputDialog && (
        <InputDialog
          title={inputDialog.title}
          defaultValue={inputDialog.defaultValue}
          submitLabel={inputDialog.submitLabel}
          onSubmit={handleDialogSubmit}
          onCancel={handleDialogCancel}
        />
      )}
    </div>
  )
}

export default FileExplorer
