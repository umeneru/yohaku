import { useCallback, useEffect, useMemo, useState } from 'react'
import { findTextMatches, normalizeMatchIndex } from '../components/TextEditor/richSearch.mjs'

function replaceMatch(transaction, state, match, replacement) {
  if (!replacement) return transaction.delete(match.from, match.to)
  const marks = state.doc.resolve(match.from).marks()
  return transaction.replaceWith(
    match.from,
    match.to,
    state.schema.text(replacement, marks)
  )
}

export function useRichSearchReplace(editor, revision) {
  const [searchTerm, setSearchTermState] = useState('')
  const [replaceTerm, setReplaceTerm] = useState('')
  const [matchIndex, setMatchIndex] = useState(-1)

  const matches = useMemo(
    () => editor ? findTextMatches(editor.state.doc, searchTerm) : [],
    [editor, searchTerm, revision]
  )

  const setSearchTerm = useCallback((value) => {
    setSearchTermState(value)
    setMatchIndex(-1)
    editor?.commands.setRichSearch(value, -1)
  }, [editor])

  useEffect(() => {
    const normalized = normalizeMatchIndex(matchIndex, matches.length)
    if (!editor || normalized === matchIndex) return
    setMatchIndex(normalized)
    editor.commands.setRichSearch(searchTerm, normalized)
  }, [editor, matchIndex, matches.length, searchTerm])

  const findNext = useCallback(() => {
    if (!editor || matches.length === 0) {
      setMatchIndex(-1)
      return
    }
    const next = matchIndex < matches.length - 1 ? matchIndex + 1 : 0
    setMatchIndex(next)
    editor.commands.selectRichSearchMatch(next)
  }, [editor, matchIndex, matches])

  const replaceOne = useCallback(() => {
    if (!editor || matchIndex < 0 || !matches[matchIndex]) return
    const state = editor.state
    const transaction = replaceMatch(state.tr, state, matches[matchIndex], replaceTerm)
    editor.view.dispatch(transaction)

    const nextMatches = findTextMatches(editor.state.doc, searchTerm)
    const next = normalizeMatchIndex(matchIndex, nextMatches.length)
    setMatchIndex(next)
    editor.commands.setRichSearch(searchTerm, next)
  }, [editor, matchIndex, matches, replaceTerm, searchTerm])

  const replaceAll = useCallback(() => {
    if (!editor || !searchTerm || matches.length === 0) return
    const state = editor.state
    let transaction = state.tr
    for (let index = matches.length - 1; index >= 0; index--) {
      transaction = replaceMatch(transaction, state, matches[index], replaceTerm)
    }
    editor.view.dispatch(transaction)
    setMatchIndex(-1)
    editor.commands.setRichSearch(searchTerm, -1)
  }, [editor, matches, replaceTerm, searchTerm])

  return {
    searchTerm,
    setSearchTerm,
    replaceTerm,
    setReplaceTerm,
    matchIndex,
    matchCount: matches.length,
    findNext,
    replaceOne,
    replaceAll
  }
}
