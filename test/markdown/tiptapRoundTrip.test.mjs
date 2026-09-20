import test from 'node:test'
import assert from 'node:assert/strict'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'
import Image from '@tiptap/extension-image'
import { TableKit } from '@tiptap/extension-table'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'

function createMarkdownManager() {
  return new Editor({
    element: null,
    injectCSS: false,
    content: { type: 'doc', content: [{ type: 'paragraph' }] },
    extensions: [
      StarterKit.configure({ underline: false, link: { openOnClick: false } }),
      Markdown.configure({ markedOptions: { gfm: true } }),
      TableKit,
      TaskList,
      TaskItem.configure({ nested: true }),
      Image
    ]
  })
}

test('対応Markdownがparse→serialize→parseで意味構造を維持する', () => {
  const editor = createMarkdownManager()
  const source = `# Heading

Paragraph with **bold**, *italic*, ~~strike~~, \`code\`, and [link](https://example.com).

> Quote

1. ordered
2. list

- [x] done
- [ ] todo

| A | B |
| - | - |
| 1 | 2 |

\`\`\`js
const value = 1
\`\`\`

![alt](assets/image.png)
`

  try {
    const parsed = editor.markdown.parse(source)
    const serialized = editor.markdown.serialize(parsed)
    const reparsed = editor.markdown.parse(serialized)

    assert.deepEqual(reparsed, parsed)
    assert.match(serialized, /\| A\s+\| B\s+\|/)
    assert.match(serialized, /- \[x\] done/)
    assert.match(serialized, /!\[alt\]\(assets\/image\.png\)/)
  } finally {
    editor.destroy()
  }
})
