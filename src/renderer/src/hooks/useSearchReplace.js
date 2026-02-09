import { useState, useCallback, useMemo } from 'react'

export function useSearchReplace(content, dispatch, textareaRef) {
  const [searchTerm, setSearchTerm] = useState('')
  const [replaceTerm, setReplaceTerm] = useState('')
  const [matchIndex, setMatchIndex] = useState(-1)

  const findMatches = useCallback((text, term) => {
    if (!term) return []
    const matches = []
    let idx = text.indexOf(term)
    while (idx !== -1) {
      matches.push(idx)
      idx = text.indexOf(term, idx + 1)
    }
    return matches
  }, [])

  const matches = useMemo(() => findMatches(content, searchTerm), [content, searchTerm, findMatches])

  const findNext = useCallback(() => {
    if (matches.length === 0) {
      setMatchIndex(-1)
      return
    }
    const nextIndex = matchIndex < matches.length - 1 ? matchIndex + 1 : 0
    setMatchIndex(nextIndex)

    const textarea = textareaRef.current
    if (textarea) {
      const pos = matches[nextIndex]
      textarea.focus()
      textarea.setSelectionRange(pos, pos + searchTerm.length)
    }
  }, [matches, searchTerm, matchIndex, textareaRef])

  const replaceOne = useCallback(() => {
    if (matches.length === 0 || matchIndex < 0) return

    const pos = matches[matchIndex]
    const newContent = content.substring(0, pos) + replaceTerm + content.substring(pos + searchTerm.length)
    dispatch({ type: 'UPDATE_CONTENT', content: newContent })

    const newMatches = findMatches(newContent, searchTerm)
    const nextIdx = matchIndex >= newMatches.length ? 0 : matchIndex
    setMatchIndex(newMatches.length > 0 ? nextIdx : -1)
  }, [content, searchTerm, replaceTerm, matchIndex, matches, findMatches, dispatch])

  const replaceAll = useCallback(() => {
    if (!searchTerm) return
    const newContent = content.split(searchTerm).join(replaceTerm)
    dispatch({ type: 'UPDATE_CONTENT', content: newContent })
    setMatchIndex(-1)
  }, [content, searchTerm, replaceTerm, dispatch])

  return {
    searchTerm, setSearchTerm,
    replaceTerm, setReplaceTerm,
    matchIndex, matchCount: matches.length,
    matches,
    findNext, replaceOne, replaceAll
  }
}
