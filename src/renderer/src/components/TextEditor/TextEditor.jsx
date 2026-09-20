import React, { forwardRef, useState } from 'react'
import { useAppState } from '../../context/AppContext'
import MarkdownEditor from './MarkdownEditor'
import PlainTextEditor from './PlainTextEditor'
import { assessMarkdownSupport, isMarkdownFile } from './markdownSupport.mjs'

const FileEditor = forwardRef(function FileEditor({ filePath, initialContent }, ref) {
  const [assessment] = useState(() => assessMarkdownSupport(initialContent))

  if (isMarkdownFile(filePath) && assessment.supported) {
    return <MarkdownEditor ref={ref} />
  }

  return (
    <PlainTextEditor
      ref={ref}
      warning={isMarkdownFile(filePath) ? assessment.reason : null}
    />
  )
})

const TextEditor = forwardRef(function TextEditor(props, ref) {
  const { currentFile, content, fileLoadId } = useAppState()
  return (
    <FileEditor
      key={`${currentFile || 'no-file'}:${fileLoadId}`}
      ref={ref}
      filePath={currentFile}
      initialContent={content}
    />
  )
})

export default TextEditor
