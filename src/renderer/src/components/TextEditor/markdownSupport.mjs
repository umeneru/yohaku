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

export function assessMarkdownSupport(content) {
  const checks = [
    {
      pattern: /^(---|\+\+\+)\r?\n(?=[\s\S]*?^[\w.-]+\s*:)[\s\S]*?^\1\s*$/m,
      reason: 'Front Matter is not supported in rich editing.'
    },
    {
      pattern: /\[\^[^\]]+\](?:\s*:)?/,
      reason: 'Footnotes are not supported in rich editing.'
    },
    {
      pattern: /(^|\n)\s*:::+[^\n]*/,
      reason: 'Markdown directives are not supported in rich editing.'
    },
    {
      pattern: /\[\[[^\]]+\]\]/,
      reason: 'Wiki links are not supported in rich editing.'
    },
    {
      pattern: /(^|\n)\s*\$\$\s*(?:\n|$)/,
      reason: 'Math blocks are not supported in rich editing.'
    }
  ]

  const unsupported = checks.find(({ pattern }) => pattern.test(content))
  if (unsupported) return { supported: false, reason: unsupported.reason }

  try {
    const unknownToken = findUnknownToken(marked.lexer(content, { gfm: true }))
    if (unknownToken) {
      return { supported: false, reason: `Unsupported Markdown token: ${unknownToken}.` }
    }
  } catch (error) {
    return {
      supported: false,
      reason: `Markdown parsing failed: ${error instanceof Error ? error.message : String(error)}`
    }
  }

  return { supported: true, reason: null }
}
