import test from 'node:test'
import assert from 'node:assert/strict'
import {
  assessMarkdownSupport,
  isMarkdownFile
} from '../../src/renderer/src/components/TextEditor/markdownSupport.mjs'

test('Markdown拡張子だけを大文字小文字を問わず判定する', () => {
  assert.equal(isMarkdownFile('/notes/example.md'), true)
  assert.equal(isMarkdownFile('C:\\notes\\EXAMPLE.MARKDOWN'), true)
  assert.equal(isMarkdownFile('/notes/example.txt'), false)
  assert.equal(isMarkdownFile(null), false)
})

test('基本MarkdownとGFMをリッチ編集対象にする', () => {
  const content = `# Heading

- [x] task

| A | B |
| - | - |
| 1 | 2 |

**bold** and ~~strike~~ with [link](https://example.com).
`
  assert.deepEqual(assessMarkdownSupport(content), { supported: true, reason: null })
})

test('コード内の対象外構文らしい文字列は通常のMarkdownとして扱う', () => {
  const content = `Inline \`[[wiki]] [^1] ::: $$\` stays code.

\`\`\`text
[[wiki]]
[^1]: footnote
:::directive
$$
\`\`\`
`
  assert.deepEqual(assessMarkdownSupport(content), { supported: true, reason: null })
})

test('データ損失の恐れがある対象外構文をフォールバックする', () => {
  const cases = [
    ['---\ntitle: Note\n---\n\nBody', 'Front Matter'],
    ['Text with a footnote[^1].\n\n[^1]: detail', 'Footnotes'],
    [':::note\nBody\n:::', 'directives'],
    ['Open [[Another Note]].', 'Wiki links'],
    ['$$\nx^2\n$$', 'Math blocks'],
    ['<span style="color:red">text</span>', 'html']
  ]

  for (const [content, expectedReason] of cases) {
    const result = assessMarkdownSupport(content)
    assert.equal(result.supported, false)
    assert.match(result.reason, new RegExp(expectedReason, 'i'))
  }
})
