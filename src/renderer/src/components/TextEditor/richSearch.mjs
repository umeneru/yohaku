import { Extension } from '@tiptap/core'
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

const richSearchKey = new PluginKey('richSearch')

function matchesInRun(run, term) {
  const matches = []
  let index = run.text.indexOf(term)

  while (index !== -1) {
    const end = index + term.length
    const startSegment = run.segments.find(
      (segment) => index >= segment.textStart && index < segment.textEnd
    )
    const endSegment = run.segments.find(
      (segment) => end - 1 >= segment.textStart && end - 1 < segment.textEnd
    )

    if (startSegment && endSegment) {
      matches.push({
        from: startSegment.docFrom + index - startSegment.textStart,
        to: endSegment.docFrom + end - endSegment.textStart
      })
    }
    index = run.text.indexOf(term, index + 1)
  }

  return matches
}

export function findTextMatches(doc, term) {
  if (!term) return []
  const matches = []

  doc.descendants((node, position) => {
    if (!node.isTextblock) return

    let run = { text: '', segments: [] }
    const flush = () => {
      if (run.text) matches.push(...matchesInRun(run, term))
      run = { text: '', segments: [] }
    }

    node.forEach((child, offset) => {
      if (!child.isText) {
        flush()
        return
      }

      const textStart = run.text.length
      run.text += child.text
      run.segments.push({
        textStart,
        textEnd: run.text.length,
        docFrom: position + 1 + offset
      })
    })
    flush()
  })

  return matches
}

export function normalizeMatchIndex(index, matchCount) {
  if (index < 0 || matchCount === 0) return -1
  return Math.min(index, matchCount - 1)
}

function createSearchState(doc, term, activeIndex) {
  const matches = findTextMatches(doc, term)
  return { term, active: normalizeMatchIndex(activeIndex, matches.length), matches }
}

export const RichSearch = Extension.create({
  name: 'richSearch',

  addCommands() {
    return {
      setRichSearch: (term, activeIndex = 0) => ({ tr, dispatch }) => {
        if (dispatch) dispatch(tr.setMeta(richSearchKey, { term, activeIndex }))
        return true
      },
      selectRichSearchMatch: (index) => ({ state, dispatch }) => {
        const search = richSearchKey.getState(state)
        const match = search?.matches[index]
        if (!match) return false
        if (dispatch) {
          dispatch(
            state.tr
              .setSelection(TextSelection.create(state.doc, match.from, match.to))
              .scrollIntoView()
              .setMeta(richSearchKey, { term: search.term, activeIndex: index })
          )
        }
        return true
      }
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: richSearchKey,
        state: {
          init: (_, state) => createSearchState(state.doc, '', -1),
          apply: (tr, previous) => {
            const meta = tr.getMeta(richSearchKey)
            if (meta) return createSearchState(tr.doc, meta.term, meta.activeIndex)
            if (tr.docChanged) return createSearchState(tr.doc, previous.term, previous.active)
            return previous
          }
        },
        props: {
          decorations(state) {
            const search = richSearchKey.getState(state)
            if (!search?.matches.length) return DecorationSet.empty
            return DecorationSet.create(
              state.doc,
              search.matches.map((match, index) =>
                Decoration.inline(match.from, match.to, {
                  class: index === search.active ? 'rich-search-active' : 'rich-search-match'
                })
              )
            )
          }
        }
      })
    ]
  }
})

export function getRichSearchState(editor) {
  return richSearchKey.getState(editor.state)
}
