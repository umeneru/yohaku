import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useReducer,
  useRef,
  useState
} from 'react'
import { EditorContent, ReactNodeViewRenderer, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'
import Image from '@tiptap/extension-image'
import { TableKit } from '@tiptap/extension-table'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { TextSelection } from '@tiptap/pm/state'
import { useAppDispatch, useAppState } from '../../context/AppContext'
import { useRichSearchReplace } from '../../hooks/useRichSearchReplace'
import SearchBar from './SearchBar'
import MarkdownToolbar from './MarkdownToolbar'
import MarkdownImageView from './MarkdownImageView'
import PlainTextEditor from './PlainTextEditor'
import { RichSearch } from './richSearch.mjs'
import styles from './TextEditor.module.css'

const MarkdownImage = Image.extend({
  addOptions() {
    return { ...this.parent?.(), documentPath: null }
  },
  addNodeView() {
    return ReactNodeViewRenderer(MarkdownImageView)
  }
})

function getHeadings(editor) {
  const headings = []
  editor.state.doc.descendants((node, position) => {
    if (node.type.name === 'heading') {
      headings.push({
        level: node.attrs.level,
        text: node.textContent,
        position,
        headingIndex: headings.length
      })
    }
  })
  return headings
}

const MarkdownEditor = forwardRef(function MarkdownEditor(props, ref) {
  const { currentFile, content, isDirty } = useAppState()
  const dispatch = useAppDispatch()
  const [showSearch, setShowSearch] = useState(false)
  const [fallbackReason, setFallbackReason] = useState(null)
  const fallbackRef = useRef(null)
  const [revision, bumpRevision] = useReducer((value) => value + 1, 0)

  const publishHeadings = useCallback((editor) => {
    dispatch({ type: 'SET_MARKDOWN_HEADINGS', headings: getHeadings(editor) })
  }, [dispatch])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        underline: false,
        link: { openOnClick: false }
      }),
      Markdown.configure({ markedOptions: { gfm: true } }),
      TableKit,
      TaskList,
      TaskItem.configure({ nested: true }),
      MarkdownImage.configure({ documentPath: currentFile }),
      RichSearch
    ],
    content: '',
    editorProps: {
      handleClick: (_view, _position, event) => {
        const link = event.target.closest?.('a')
        if (!link || !(event.ctrlKey || event.metaKey)) return false
        event.preventDefault()
        window.electronAPI.openExternal(link.getAttribute('href'))
        return true
      },
      handlePaste: (view, event) => {
        const imageFile = Array.from(event.clipboardData?.items || [])
          .find((item) => item.type.startsWith('image/'))
          ?.getAsFile()
        if (!imageFile) return false

        event.preventDefault()
        const selection = view.state.selection
        const document = view.state.doc
        view.setProps({ editable: () => false })

        imageFile.arrayBuffer()
          .then((bytes) => window.electronAPI.savePastedImage(currentFile, new Uint8Array(bytes)))
          .then((src) => {
            if (view.isDestroyed || !src) return
            if (!view.state.doc.eq(document)) {
              window.alert(`The document changed before the image was inserted. The image was saved as ${src}.`)
              return
            }
            const imageNode = view.state.schema.nodes.image.create({ src, alt: 'pasted image' })
            view.dispatch(
              view.state.tr.replaceWith(selection.from, selection.to, imageNode).scrollIntoView()
            )
          })
          .catch((error) => window.alert(`Failed to paste image: ${error.message || error}`))
          .finally(() => {
            if (!view.isDestroyed) view.setProps({ editable: () => true })
          })
        return true
      }
    },
    onCreate: ({ editor: createdEditor }) => {
      try {
        const parsed = createdEditor.markdown.parse(content)
        const serialized = createdEditor.markdown.serialize(parsed)
        const reparsed = createdEditor.markdown.parse(serialized)
        if (JSON.stringify(parsed) !== JSON.stringify(reparsed)) {
          setFallbackReason('Markdown conversion was not stable for this document.')
          return
        }
        createdEditor.commands.setContent(parsed, { emitUpdate: false })
        publishHeadings(createdEditor)
      } catch (error) {
        setFallbackReason(`Markdown parsing failed: ${error instanceof Error ? error.message : String(error)}`)
      }
    },
    onUpdate: ({ editor: updatedEditor }) => {
      dispatch({ type: 'UPDATE_CONTENT', content: updatedEditor.getMarkdown() })
      publishHeadings(updatedEditor)
      bumpRevision()
    },
    onSelectionUpdate: () => bumpRevision()
  }, [currentFile])

  const search = useRichSearchReplace(editor, revision)

  useImperativeHandle(ref, () => ({
    scrollToLine(lineIndex) {
      fallbackRef.current?.scrollToLine?.(lineIndex)
    },
    scrollToHeading(headingIndex) {
      if (!editor) return
      const heading = getHeadings(editor)[headingIndex]
      if (!heading) return
      const selection = TextSelection.near(editor.state.doc.resolve(heading.position + 1))
      editor.view.focus()
      editor.view.dispatch(editor.state.tr.setSelection(selection).scrollIntoView())
    }
  }), [editor])

  useEffect(() => {
    if (!currentFile || !isDirty || fallbackReason) return
    const filePath = currentFile
    const markdown = content
    const timer = setTimeout(async () => {
      try {
        await window.electronAPI.writeFile(filePath, markdown)
        dispatch({ type: 'SAVE_FILE', filePath, content: markdown })
      } catch (error) {
        console.error('Auto-save failed:', error)
      }
    }, 1000)
    return () => clearTimeout(timer)
  }, [content, currentFile, dispatch, fallbackReason, isDirty])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        setShowSearch((visible) => !visible)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => window.electronAPI.onMenuEvent((action) => {
    if (action === 'find') setShowSearch(true)
  }), [])

  if (fallbackReason) {
    return <PlainTextEditor ref={fallbackRef} warning={fallbackReason} />
  }

  const fileName = currentFile?.split(/[/\\]/).pop()

  return (
    <div className={styles.editor}>
      <div className={styles.header}>
        <span className={styles.fileName}>{fileName}</span>
      </div>
      <MarkdownToolbar editor={editor} />
      {showSearch && (
        <SearchBar
          {...search}
          onFindNext={search.findNext}
          onReplace={search.replaceOne}
          onReplaceAll={search.replaceAll}
          onClose={() => setShowSearch(false)}
        />
      )}
      <div className={styles.richEditorContainer}>
        <EditorContent editor={editor} className={styles.richEditor} />
      </div>
    </div>
  )
})

export default MarkdownEditor
