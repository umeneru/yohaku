import React, { useState, useCallback, useRef, useEffect } from 'react'
import { AppProvider, useAppDispatch, useAppState } from './context/AppContext'
import FileExplorer from './components/FileExplorer/FileExplorer'
import TextEditor from './components/TextEditor/TextEditor'
import HeadingOutline from './components/HeadingOutline/HeadingOutline'
import Resizer from './components/Resizer/Resizer'
import styles from './App.module.css'

function AppContent() {
  const [explorerWidth, setExplorerWidth] = useState(250)
  const [outlineVisible, setOutlineVisible] = useState(true)
  const [outlineWidth, setOutlineWidth] = useState(200)
  const editorRef = useRef(null)
  const dispatch = useAppDispatch()
  const { sidebarLayout } = useAppState()

  useEffect(() => {
    window.electronAPI.getSettings().then((settings) => {
      if (settings.headingChar) {
        dispatch({ type: 'SET_HEADING_CHAR', headingChar: settings.headingChar })
      }
      if (settings.sidebarLayout) {
        dispatch({ type: 'SET_SIDEBAR_LAYOUT', sidebarLayout: settings.sidebarLayout })
      }
      if (settings.outlineVisible !== undefined) {
        setOutlineVisible(settings.outlineVisible)
      }
      if (settings.treeDefaultOpen !== undefined) {
        dispatch({ type: 'SET_TREE_DEFAULT_OPEN', treeDefaultOpen: settings.treeDefaultOpen })
      }
    })
  }, [dispatch])

  useEffect(() => {
    const handleZoomKeyDown = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return

      const isZoomIn = e.key === '+' || e.key === '=' || e.code === 'NumpadAdd'
      const isZoomOut = e.key === '-' || e.key === '_' || e.code === 'NumpadSubtract'
      const isZoomReset = e.key === '0' || e.code === 'Digit0' || e.code === 'Numpad0'

      if (isZoomIn) {
        e.preventDefault()
        window.electronAPI.zoomIn()
      } else if (isZoomOut) {
        e.preventDefault()
        window.electronAPI.zoomOut()
      } else if (isZoomReset) {
        e.preventDefault()
        window.electronAPI.resetZoom()
      }
    }

    const handleZoomWheel = (e) => {
      if (!(e.ctrlKey || e.metaKey)) return
      e.preventDefault()
      if (e.deltaY < 0) {
        window.electronAPI.zoomIn()
      } else if (e.deltaY > 0) {
        window.electronAPI.zoomOut()
      }
    }

    window.addEventListener('keydown', handleZoomKeyDown)
    window.addEventListener('wheel', handleZoomWheel, { passive: false })

    return () => {
      window.removeEventListener('keydown', handleZoomKeyDown)
      window.removeEventListener('wheel', handleZoomWheel)
    }
  }, [])

  const handleResize = useCallback((clientX) => {
    if (sidebarLayout === 'swap') {
      const newWidth = Math.max(150, Math.min(window.innerWidth - clientX, 600))
      setExplorerWidth(newWidth)
    } else {
      const newWidth = Math.max(150, Math.min(clientX, 600))
      setExplorerWidth(newWidth)
    }
  }, [sidebarLayout])

  const handleOutlineResize = useCallback((clientX) => {
    if (sidebarLayout === 'swap') {
      const newWidth = Math.max(120, Math.min(clientX, 400))
      setOutlineWidth(newWidth)
    } else {
      const newWidth = Math.max(120, Math.min(window.innerWidth - clientX, 400))
      setOutlineWidth(newWidth)
    }
  }, [sidebarLayout])

  const swapped = sidebarLayout === 'swap'

  const explorerPanel = (
    <div className={styles.explorerWrap} style={{ width: explorerWidth, minWidth: 150 }}>
      <FileExplorer />
    </div>
  )

  const outlinePanel = outlineVisible && (
    <div className={styles.outlineWrap} style={{ width: outlineWidth }}>
      <HeadingOutline editorRef={editorRef} />
    </div>
  )

  const editorPanel = (
    <div className={styles.editorWrap}>
      <TextEditor ref={editorRef} />
    </div>
  )

  return (
    <div className={styles.app}>
      {swapped ? (
        <>
          {outlinePanel && (
            <>
              {outlinePanel}
              <Resizer onResize={handleOutlineResize} />
            </>
          )}
          {editorPanel}
          <Resizer onResize={handleResize} />
          {explorerPanel}
        </>
      ) : (
        <>
          {explorerPanel}
          <Resizer onResize={handleResize} />
          {editorPanel}
          {outlinePanel && (
            <>
              <Resizer onResize={handleOutlineResize} />
              {outlinePanel}
            </>
          )}
        </>
      )}
    </div>
  )
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}

export default App
