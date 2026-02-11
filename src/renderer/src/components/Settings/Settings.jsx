import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import styles from './Settings.module.css'

const MODIFIER_KEYS = new Set(['Control', 'Shift', 'Alt', 'Meta'])

function keyEventToAccelerator(e) {
  const parts = []
  if (e.ctrlKey || e.metaKey) parts.push('CommandOrControl')
  if (e.shiftKey) parts.push('Shift')
  if (e.altKey) parts.push('Alt')

  if (MODIFIER_KEYS.has(e.key)) return null

  let key = e.key
  if (key === ' ') key = 'Space'
  else if (key.length === 1) key = key.toUpperCase()
  else if (key === 'ArrowUp') key = 'Up'
  else if (key === 'ArrowDown') key = 'Down'
  else if (key === 'ArrowLeft') key = 'Left'
  else if (key === 'ArrowRight') key = 'Right'

  if (parts.length === 0) return null
  parts.push(key)
  return parts.join('+')
}

function Settings({ onClose }) {
  const [hotkey, setHotkey] = useState('')
  const [displayKey, setDisplayKey] = useState('')
  const [loading, setLoading] = useState(true)
  const savedRef = useRef(false)
  const inputRef = useRef(null)

  useEffect(() => {
    window.electronAPI.suspendHotkey()
    const load = async () => {
      const settings = await window.electronAPI.getSettings()
      setHotkey(settings.hotkey || '')
      setDisplayKey(settings.hotkey || '')
      setLoading(false)
    }
    load()
    return () => {
      if (!savedRef.current) {
        window.electronAPI.resumeHotkey()
      }
    }
  }, [])

  const handleKeyDown = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const accelerator = keyEventToAccelerator(e)
    if (accelerator) {
      setHotkey(accelerator)
      setDisplayKey(accelerator)
    }
  }

  const handleSave = async () => {
    savedRef.current = true
    const settings = { hotkey }
    await window.electronAPI.saveSettings(settings)
    window.electronAPI.updateHotkey(hotkey)
    onClose()
  }

  if (loading) return null

  return createPortal(
    <div className={styles.overlay} onMouseDown={onClose}>
      <div className={styles.dialog} onMouseDown={(e) => e.stopPropagation()}>
        <div className={styles.title}>Settings</div>
        <div className={styles.field}>
          <label className={styles.label}>Global Hotkey</label>
          <input
            ref={inputRef}
            className={styles.input}
            type="text"
            value={displayKey}
            onKeyDown={handleKeyDown}
            onChange={() => {}}
            placeholder="Press a key combination..."
          />
          <div className={styles.hint}>
            Press a key combination (e.g. Ctrl+Shift+Y) to set the global hotkey for showing the app.
          </div>
        </div>
        <div className={styles.buttons}>
          <button className={styles.buttonPrimary} onClick={handleSave}>
            Save
          </button>
          <button className={styles.button} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export default Settings
