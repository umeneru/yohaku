import test from 'node:test'
import assert from 'node:assert/strict'
import { Schema } from '@tiptap/pm/model'
import {
  findTextMatches,
  normalizeMatchIndex
} from '../../src/renderer/src/components/TextEditor/richSearch.mjs'

const schema = new Schema({
  nodes: {
    doc: { content: 'block+' },
    paragraph: { group: 'block', content: 'inline*' },
    text: { group: 'inline' },
    hardBreak: { inline: true, group: 'inline' }
  },
  marks: {
    strong: {}
  }
})

test('一致件数が減った場合は選択indexを有効範囲へ補正する', () => {
  assert.equal(normalizeMatchIndex(4, 2), 1)
  assert.equal(normalizeMatchIndex(0, 0), -1)
  assert.equal(normalizeMatchIndex(-1, 3), -1)
})

test('mark境界内は検索し、blockとhard breakはまたがない', () => {
  const strong = schema.marks.strong.create()
  const doc = schema.node('doc', null, [
    schema.node('paragraph', null, [
      schema.text('hel', [strong]),
      schema.text('lo')
    ]),
    schema.node('paragraph', null, [
      schema.text('hel'),
      schema.node('hardBreak'),
      schema.text('lo')
    ]),
    schema.node('paragraph', null, [schema.text('hello')])
  ])

  assert.equal(findTextMatches(doc, 'hello').length, 2)
  assert.equal(findTextMatches(doc, 'ohel').length, 0)
})
