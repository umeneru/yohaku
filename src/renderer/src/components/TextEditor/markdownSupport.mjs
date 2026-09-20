import { marked } from 'marked'

const MARKDOWN_EXTENSIONS = ['.md', '.markdown']
const ALLOWED_TOKEN_TYPES = new Set([
  'space', 'code', 'heading', 'table', 'hr', 'blockquote', 'list', 'list_item',
  'checkbox', 'paragraph', 'text', 'def', 'escape', 'link', 'image',
  'strong', 'em', 'codespan', 'br', 'del', 'url', 'autolink'
])

export function isMarkdownFile(filePath) {
  const lowerPath = filePath?.toLowerCase() || ''
  return MARKDOWN_EXTENSIONS.some((extension) => lowerPath.endsWith(extension))
}

function findUnknownToken(value, seen = new Set()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return null
  seen.add(value)

  if (typeof value.type === 'string' && !ALLOWED_TOKEN_TYPES.has(value.type)) {
    return value.type
  }

  for (const child of Object.values(value)) {
    if (Array.isArray(child)) {
      for (const item of child) {
        const unknown = findUnknownToken(item, seen)
        if (unknown) return unknown
      }
    } else if (child && typeof child === 'object') {
      const unknown = findUnknownToken(child, seen)
      if (unknown) return unknown
    }
  }

  return null
}

function containsFootnoteToken(value, seen = new Set()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return false
  seen.add(value)
  if (Array.isArray(value)) return value.some((item) => containsFootnoteToken(item, seen))
  if (value.type === 'code' || value.type === 'codespan') return false
  if (value.type === 'def' && String(value.tag).startsWith('^')) return true
  if (value.type === 'link' && /^\[\^[^\]]+\]/.test(value.raw || '')) return true
  return Object.values(value).some((child) => containsFootnoteToken(child, seen))
}

function collectNonCodeText(value, parts = [], seen = new Set()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return parts
  seen.add(value)

  if (value.type === 'code' || value.type === 'codespan') return parts
  if (Array.isArray(value)) {
    value.forEach((item) => collectNonCodeText(item, parts, seen))
    return parts
  }

  const childKeys = ['tokens', 'items', 'header', 'rows', 'cells', 'nestedTokens']
  const before = parts.length
  childKeys.forEach((key) => collectNonCodeText(value[key], parts, seen))
  if (parts.length === before && (value.type === 'text' || value.type === 'escape')) {
    parts.push(value.raw || value.text || '')
  }
  return parts
}

export function assessMarkdownSupport(content) {
  try {
    const tokens = marked.lexer(content, { gfm: true })
    const unknownToken = findUnknownToken(tokens)
    if (unknownToken) {
      return { supported: false, reason: `Unsupported Markdown token: ${unknownToken}.` }
    }

    if (/^(---|\+\+\+)\r?\n(?=[\s\S]*?[\w.-]+\s*:)[\s\S]*?\r?\n\1(?:\r?\n|$)/.test(content)) {
      return { supported: false, reason: 'Front Matter is not supported in rich editing.' }
    }
    if (containsFootnoteToken(tokens)) {
      return { supported: false, reason: 'Footnotes are not supported in rich editing.' }
    }

    const inspectableText = collectNonCodeText(tokens).join('\n')
    const checks = [
      { pattern: /(^|\n)\s*:::+[^\n]*/, reason: 'Markdown directives are not supported in rich editing.' },
      { pattern: /\[\[[^\]]+\]\]/, reason: 'Wiki links are not supported in rich editing.' },
      { pattern: /(^|\n)\s*\$\$\s*(?:\n|$)/, reason: 'Math blocks are not supported in rich editing.' }
    ]
    const unsupported = checks.find(({ pattern }) => pattern.test(inspectableText))
    return unsupported
      ? { supported: false, reason: unsupported.reason }
      : { supported: true, reason: null }
  } catch (error) {
    return {
      supported: false,
      reason: `Markdown parsing failed: ${error instanceof Error ? error.message : String(error)}`
    }
  }
}
