import React, { useState } from 'react'
import InputDialog from '../FileExplorer/InputDialog'
import styles from './TextEditor.module.css'

function ToolButton({ active = false, disabled = false, title, onClick, children }) {
  return (
    <button
      type="button"
      className={`${styles.toolButton}${active ? ` ${styles.toolButtonActive}` : ''}`}
      disabled={disabled}
      title={title}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  )
}

function MarkdownToolbar({ editor }) {
  const [dialog, setDialog] = useState(null)
  if (!editor) return null

  const imageSelected = editor.isActive('image')
  const imageAttributes = imageSelected ? editor.getAttributes('image') : null
  const inTable = editor.isActive('table')

  const openLinkDialog = () => {
    setDialog({
      type: 'link',
      title: 'Link URL',
      defaultValue: editor.getAttributes('link').href || 'https://'
    })
  }

  const openImageDialog = () => {
    setDialog({ type: 'image', title: 'Image URL or relative path', defaultValue: 'https://' })
  }

  const submitDialog = (value) => {
    if (dialog.type === 'link') {
      editor.chain().focus().extendMarkRange('link').setLink({ href: value }).run()
    } else {
      editor.chain().focus().setImage({ src: value, alt: '' }).run()
    }
    setDialog(null)
  }

  return (
    <>
      <div className={styles.toolbar}>
        <select
          className={styles.blockSelect}
          value={editor.isActive('heading') ? String(editor.getAttributes('heading').level) : 'paragraph'}
          onChange={(event) => {
            const value = event.target.value
            if (value === 'paragraph') editor.chain().focus().setParagraph().run()
            else editor.chain().focus().toggleHeading({ level: Number(value) }).run()
          }}
          title="Block type"
        >
          <option value="paragraph">Paragraph</option>
          {[1, 2, 3, 4, 5, 6].map((level) => (
            <option key={level} value={level}>H{level}</option>
          ))}
        </select>
        <ToolButton active={editor.isActive('bold')} title="Bold" onClick={() => editor.chain().focus().toggleBold().run()}>B</ToolButton>
        <ToolButton active={editor.isActive('italic')} title="Italic" onClick={() => editor.chain().focus().toggleItalic().run()}><em>I</em></ToolButton>
        <ToolButton active={editor.isActive('strike')} title="Strike" onClick={() => editor.chain().focus().toggleStrike().run()}><s>S</s></ToolButton>
        <ToolButton active={editor.isActive('code')} title="Inline code" onClick={() => editor.chain().focus().toggleCode().run()}>Code</ToolButton>
        <ToolButton active={editor.isActive('bulletList')} title="Bullet list" onClick={() => editor.chain().focus().toggleBulletList().run()}>• List</ToolButton>
        <ToolButton active={editor.isActive('orderedList')} title="Ordered list" onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. List</ToolButton>
        <ToolButton active={editor.isActive('taskList')} title="Task list" onClick={() => editor.chain().focus().toggleTaskList().run()}>☑</ToolButton>
        <ToolButton active={editor.isActive('blockquote')} title="Blockquote" onClick={() => editor.chain().focus().toggleBlockquote().run()}>Quote</ToolButton>
        <ToolButton active={editor.isActive('codeBlock')} title="Code block" onClick={() => editor.chain().focus().toggleCodeBlock().run()}>```</ToolButton>
        <ToolButton title="Horizontal rule" onClick={() => editor.chain().focus().setHorizontalRule().run()}>―</ToolButton>
        <ToolButton active={editor.isActive('link')} title="Set link" onClick={openLinkDialog}>Link</ToolButton>
        {editor.isActive('link') && (
          <ToolButton title="Remove link" onClick={() => editor.chain().focus().unsetLink().run()}>Unlink</ToolButton>
        )}
        <ToolButton title="Insert image" onClick={openImageDialog}>Image</ToolButton>
        <ToolButton title="Insert table" onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>Table</ToolButton>
        <ToolButton disabled={!editor.can().chain().focus().undo().run()} title="Undo" onClick={() => editor.chain().focus().undo().run()}>↶</ToolButton>
        <ToolButton disabled={!editor.can().chain().focus().redo().run()} title="Redo" onClick={() => editor.chain().focus().redo().run()}>↷</ToolButton>
        {inTable && (
          <span className={styles.contextTools}>
            <ToolButton title="Add row" onClick={() => editor.chain().focus().addRowAfter().run()}>+Row</ToolButton>
            <ToolButton title="Delete row" onClick={() => editor.chain().focus().deleteRow().run()}>−Row</ToolButton>
            <ToolButton title="Add column" onClick={() => editor.chain().focus().addColumnAfter().run()}>+Col</ToolButton>
            <ToolButton title="Delete column" onClick={() => editor.chain().focus().deleteColumn().run()}>−Col</ToolButton>
            <ToolButton title="Delete table" onClick={() => editor.chain().focus().deleteTable().run()}>−Table</ToolButton>
          </span>
        )}
        {imageSelected && (
          <label className={styles.altField}>
            Alt
            <input
              value={imageAttributes.alt || ''}
              onChange={(event) => editor.commands.updateAttributes('image', { alt: event.target.value })}
            />
          </label>
        )}
      </div>
      {dialog && (
        <InputDialog
          title={dialog.title}
          defaultValue={dialog.defaultValue}
          submitLabel="Apply"
          onSubmit={submitDialog}
          onCancel={() => setDialog(null)}
        />
      )}
    </>
  )
}

export default MarkdownToolbar
