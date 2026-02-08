import React, { useState, useCallback, useEffect } from 'react'
import { useAppState, useAppDispatch } from '../../context/AppContext'
import TreeNode from './TreeNode'
import ContextMenu from './ContextMenu'
import InputDialog from './InputDialog'
import DirectoryPicker from './DirectoryPicker'
import styles from './FileExplorer.module.css'
import { join as pathJoin } from './pathUtil'

function FileExplorer() {
  const { rootPath, tree } = useAppState()
  const dispatch = useAppDispatch()
  const [contextMenu, setContextMenu] = useState(null)
  const [inputDialog, setInputDialog] = useState(null)
  const [showPicker, setShowPicker] = useState(false)
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

  const openDirectory = async (dirPath) => {
    try {
      const treeData = await window.electronAPI.readDirectory(dirPath)
      dispatch({ type: 'SET_ROOT', rootPath: dirPath, tree: treeData })
      const newHistory = await window.electronAPI.addToDirectoryHistory(dirPath)
      setHistory(newHistory)
    } catch (err) {
      window.alert(`Failed to open directory: ${err.message}`)
    }
  }

  const handleSelectNew = async () => {
    setShowPicker(false)
    const dirPath = await window.electronAPI.openDirectoryDialog()
    if (!dirPath) return
    await openDirectory(dirPath)
  }

  const handleSelectFromHistory = async (dirPath) => {
    setShowPicker(false)
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

  const handleNewFile = () => {
    const targetDir = contextMenu.targetDir
    setContextMenu(null)
    setInputDialog({
      title: 'New File',
      defaultValue: 'untitled.txt',
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
      <div className={styles.directoryBar} onClick={() => setShowPicker(true)}>
        <span className={styles.dirName} title={rootPath}>
          {getDirectoryName()}
        </span>
        <span className={styles.dirArrow}>▲</span>
      </div>
      {showPicker && (
        <DirectoryPicker
          history={history}
          onSelect={handleSelectFromHistory}
          onSelectNew={handleSelectNew}
          onClose={() => setShowPicker(false)}
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
