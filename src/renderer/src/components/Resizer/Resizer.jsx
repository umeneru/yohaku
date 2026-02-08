import React, { useCallback, useRef } from 'react'
import styles from './Resizer.module.css'

function Resizer({ onResize }) {
  const dragging = useRef(false)

  const handleMouseDown = useCallback((e) => {
    e.preventDefault()
    dragging.current = true

    const handleMouseMove = (e) => {
      if (dragging.current) {
        onResize(e.clientX)
      }
    }

    const handleMouseUp = () => {
      dragging.current = false
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [onResize])

  return (
    <div className={styles.resizer} onMouseDown={handleMouseDown} />
  )
}

export default Resizer
