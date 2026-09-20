import React, { useEffect, useState } from 'react'
import { NodeViewWrapper } from '@tiptap/react'
import styles from './TextEditor.module.css'

function MarkdownImageView({ node, selected, extension }) {
  const { src, alt = '' } = node.attrs
  const [resolvedSrc, setResolvedSrc] = useState(null)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let active = true
    setResolvedSrc(null)

    if (/^https:\/\//i.test(src)) {
      setResolvedSrc(src)
      setStatus('ready')
      return () => { active = false }
    }

    window.electronAPI.readMarkdownImage(extension.options.documentPath, src)
      .then((result) => {
        if (!active) return
        if (result) {
          setResolvedSrc(result)
          setStatus('ready')
        } else {
          setStatus('blocked')
        }
      })
      .catch(() => {
        if (active) setStatus('error')
      })

    return () => { active = false }
  }, [extension.options.documentPath, src])

  return (
    <NodeViewWrapper className={`${styles.imageNode}${selected ? ` ${styles.imageSelected}` : ''}`}>
      {status === 'ready' ? (
        <img
          className={styles.markdownImage}
          src={resolvedSrc}
          alt={alt}
          onError={() => setStatus('error')}
        />
      ) : (
        <span className={styles.imagePlaceholder}>
          {status === 'loading' ? 'Loading image…' : `Image unavailable: ${src}`}
        </span>
      )}
    </NodeViewWrapper>
  )
}

export default MarkdownImageView
