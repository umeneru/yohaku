import { useMemo, useState, useCallback } from 'react'
import { useAppState } from '../../context/AppContext'
import { parseHeadings, buildHeadingTree } from './parseHeadings'
import styles from './HeadingOutline.module.css'

function HeadingNode({ node, editorRef, collapsed, onToggle }) {
  const hasChildren = node.children.length > 0
  const isCollapsed = collapsed.has(node.lineIndex)

  const handleClick = useCallback(() => {
    if (editorRef.current?.scrollToLine) {
      editorRef.current.scrollToLine(node.lineIndex)
    }
  }, [editorRef, node.lineIndex])

  const handleToggle = useCallback((e) => {
    e.stopPropagation()
    onToggle(node.lineIndex)
  }, [onToggle, node.lineIndex])

  return (
    <>
      <div
        className={styles.headingItem}
        style={{ paddingLeft: (node.level - 1) * 16 + 8 }}
        onClick={handleClick}
      >
        {hasChildren ? (
          <span
            className={`${styles.arrow} ${isCollapsed ? '' : styles.arrowExpanded}`}
            onClick={handleToggle}
          >
            &#9654;
          </span>
        ) : (
          <span className={styles.arrowPlaceholder} />
        )}
        <span className={styles.headingText}>{node.text}</span>
      </div>
      {hasChildren && !isCollapsed && node.children.map((child) => (
        <HeadingNode
          key={child.lineIndex}
          node={child}
          editorRef={editorRef}
          collapsed={collapsed}
          onToggle={onToggle}
        />
      ))}
    </>
  )
}

function HeadingOutline({ editorRef }) {
  const { content, headingChar, sidebarLayout } = useAppState()
  const [collapsed, setCollapsed] = useState(new Set())

  const tree = useMemo(() => {
    const headings = parseHeadings(content, headingChar)
    return buildHeadingTree(headings)
  }, [content, headingChar])

  const handleToggle = useCallback((lineIndex) => {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(lineIndex)) {
        next.delete(lineIndex)
      } else {
        next.add(lineIndex)
      }
      return next
    })
  }, [])

  return (
    <div className={`${styles.outline} ${sidebarLayout === 'swap' ? styles.outlineLeft : styles.outlineRight}`}>
      <div className={styles.header} />
      {tree.length > 0 && (
        <div className={styles.treeContainer}>
          {tree.map((node) => (
            <HeadingNode
              key={node.lineIndex}
              node={node}
              editorRef={editorRef}
              collapsed={collapsed}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default HeadingOutline
