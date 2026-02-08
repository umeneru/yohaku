import React, { useState, useEffect, useRef } from 'react'
import { useAppState, useAppDispatch } from '../../context/AppContext'
import styles from './TreeNode.module.css'

function TreeNode({ node, depth }) {
  const [expanded, setExpanded] = useState(false)
  const [children, setChildren] = useState(node.children || [])
  const { currentFile, isDirty, refreshSignal } = useAppState()
  const dispatch = useAppDispatch()
  const initialMount = useRef(true)

  const isActive = currentFile === node.path

  useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false
      return
    }
    if (node.isDirectory && expanded) {
      window.electronAPI.readDirectory(node.path).then(setChildren)
    }
  }, [refreshSignal])

  const handleClick = async () => {
    if (node.isDirectory) {
      if (!expanded) {
        const tree = await window.electronAPI.readDirectory(node.path)
        setChildren(tree)
      }
      setExpanded(!expanded)
    } else {
      if (isDirty) {
        const ok = window.confirm('You have unsaved changes. Discard them?')
        if (!ok) return
      }
      const content = await window.electronAPI.readFile(node.path)
      dispatch({ type: 'OPEN_FILE', filePath: node.path, content })
    }
  }

  return (
    <div>
      <div
        className={`${styles.node} ${isActive ? styles.active : ''}`}
        style={{ paddingLeft: depth * 16 + 8 }}
        onClick={handleClick}
        data-path={node.path}
        data-is-directory={node.isDirectory}
      >
        {node.isDirectory && (
          <span className={`${styles.arrow} ${expanded ? styles.arrowExpanded : ''}`}>
            ▶
          </span>
        )}
        {!node.isDirectory && (
          <span className={styles.icon}>・</span>
        )}
        <span className={styles.name}>{node.name}</span>
      </div>
      {node.isDirectory && expanded && (
        <div className={styles.children} data-path={node.path} data-is-directory="true">
          {children.map((child) => (
            <TreeNode key={child.path} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

export default TreeNode
