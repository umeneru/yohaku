import { useMemo, useState, useCallback } from 'react'
import { useAppState } from '../../context/AppContext'
import { parseHeadings, buildHeadingTree } from './parseHeadings'
import { isMarkdownFile } from '../TextEditor/markdownSupport.mjs'
import styles from './HeadingOutline.module.css'

function HeadingNode({ node, editorRef, collapsed, onToggle }) {
  const id = node.headingIndex ?? node.lineIndex
  const hasChildren = node.children.length > 0
  const isCollapsed = collapsed.has(id)

  const handleClick = useCallback(() => {
    if (node.headingIndex !== undefined) {
      editorRef.current?.scrollToHeading?.(node.headingIndex)
    } else {
      editorRef.current?.scrollToLine?.(node.lineIndex)
    }
  }, [editorRef, node.headingIndex, node.lineIndex])

  const handleToggle = useCallback((e) => {
    e.stopPropagation()
    onToggle(id)
  }, [onToggle, id])

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
          key={child.headingIndex ?? child.lineIndex}
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
  const { content, currentFile, headingChar, markdownHeadings, sidebarLayout } = useAppState()
  const [collapsed, setCollapsed] = useState(new Set())

  const tree = useMemo(() => {
    const headings = isMarkdownFile(currentFile) && markdownHeadings !== null
      ? markdownHeadings
      : parseHeadings(content, headingChar)
    return buildHeadingTree(headings)
  }, [content, currentFile, headingChar, markdownHeadings])

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
              key={node.headingIndex ?? node.lineIndex}
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
