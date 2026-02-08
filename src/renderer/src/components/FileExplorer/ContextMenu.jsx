import React, { useEffect, useRef } from 'react'
import styles from './ContextMenu.module.css'

function ContextMenu({ x, y, targetType, onNewFile, onNewFolder, onRename, onDelete, onClose }) {
  const menuRef = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onCloseRef.current()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div
      ref={menuRef}
      className={styles.menu}
      style={{ top: y, left: x }}
    >
      <div className={styles.item} onClick={onNewFile}>
        New File
      </div>
      <div className={styles.item} onClick={onNewFolder}>
        New Folder
      </div>
      {targetType && (
        <>
          <div className={styles.item} onClick={onRename}>
            Rename
          </div>
          <div className={styles.item} onClick={onDelete}>
            Delete
          </div>
        </>
      )}
    </div>
  )
}

export default ContextMenu
