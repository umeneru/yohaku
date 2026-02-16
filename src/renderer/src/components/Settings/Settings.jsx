import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useAppDispatch } from '../../context/AppContext'
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
  const [headingChar, setHeadingChar] = useState('#')
  const [sidebarLayout, setSidebarLayout] = useState('default')
  const [outlineVisible, setOutlineVisible] = useState(true)
  const [treeDefaultOpen, setTreeDefaultOpen] = useState(true)
  const [loading, setLoading] = useState(true)
  const savedRef = useRef(false)
  const inputRef = useRef(null)
  const dispatch = useAppDispatch()

  useEffect(() => {
    window.electronAPI.suspendHotkey()
    const load = async () => {
      const settings = await window.electronAPI.getSettings()
      setHotkey(settings.hotkey || '')
      setDisplayKey(settings.hotkey || '')
      setHeadingChar(settings.headingChar || '#')
      setSidebarLayout(settings.sidebarLayout || 'default')
      setOutlineVisible(settings.outlineVisible !== undefined ? settings.outlineVisible : true)
      setTreeDefaultOpen(settings.treeDefaultOpen !== undefined ? settings.treeDefaultOpen : true)
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
    const settings = { hotkey, headingChar, sidebarLayout, outlineVisible, treeDefaultOpen }
    await window.electronAPI.saveSettings(settings)
    window.electronAPI.updateHotkey(hotkey)
    dispatch({ type: 'SET_HEADING_CHAR', headingChar })
    dispatch({ type: 'SET_SIDEBAR_LAYOUT', sidebarLayout })
    dispatch({ type: 'SET_TREE_DEFAULT_OPEN', treeDefaultOpen })
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
        <div className={styles.field}>
          <label className={styles.label}>Sidebar Layout</label>
          <select
            className={styles.input}
            value={sidebarLayout}
            onChange={(e) => setSidebarLayout(e.target.value)}
          >
            <option value="default">Explorer (left) / Outline (right)</option>
            <option value="swap">Outline (left) / Explorer (right)</option>
          </select>
          <div className={styles.hint}>
            Switch the positions of Explorer and Outline sidebars.
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Open Outline on Startup</label>
          <select
            className={styles.input}
            value={outlineVisible ? 'true' : 'false'}
            onChange={(e) => setOutlineVisible(e.target.value === 'true')}
          >
            <option value="true">Open</option>
            <option value="false">Closed</option>
          </select>
          <div className={styles.hint}>
            Whether to show the heading outline panel when the app starts.
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Tree Default State</label>
          <select
            className={styles.input}
            value={treeDefaultOpen ? 'true' : 'false'}
            onChange={(e) => setTreeDefaultOpen(e.target.value === 'true')}
          >
            <option value="true">Open</option>
            <option value="false">Closed</option>
          </select>
          <div className={styles.hint}>
            Whether to expand the file tree by default when opening a directory.
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Heading Character</label>
          <input
            className={styles.input}
            type="text"
            value={headingChar}
            onChange={(e) => {
              const val = e.target.value
              if (val.length <= 1) setHeadingChar(val)
            }}
            maxLength={1}
            placeholder="#"
          />
          <div className={styles.hint}>
            Character used as heading prefix (e.g. #). Repeat count determines the level.
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
