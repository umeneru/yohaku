import React, { useState, useCallback } from 'react'
import { AppProvider } from './context/AppContext'
import FileExplorer from './components/FileExplorer/FileExplorer'
import TextEditor from './components/TextEditor/TextEditor'
import Resizer from './components/Resizer/Resizer'
import styles from './App.module.css'

function App() {
  const [explorerWidth, setExplorerWidth] = useState(250)

  const handleResize = useCallback((clientX) => {
    const newWidth = Math.max(150, Math.min(clientX, 600))
    setExplorerWidth(newWidth)
  }, [])

  return (
    <AppProvider>
      <div className={styles.app}>
        <div className={styles.explorerWrap} style={{ width: explorerWidth, minWidth: 150 }}>
          <FileExplorer />
        </div>
        <Resizer onResize={handleResize} />
        <div className={styles.editorWrap}>
          <TextEditor />
        </div>
      </div>
    </AppProvider>
  )
}

export default App
