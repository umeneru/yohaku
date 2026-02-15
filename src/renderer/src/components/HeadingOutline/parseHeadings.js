export function parseHeadings(content, char) {
  if (!content || !char) return []
  const lines = content.split('\n')
  const headings = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line.startsWith(char)) continue

    let level = 0
    while (level < line.length && line[level] === char) {
      level++
    }

    // Must be followed by a space or be the entire line
    if (level < line.length && line[level] !== ' ') continue

    const text = line.substring(level).trim()
    if (text.length === 0) continue

    headings.push({ level, text, lineIndex: i })
  }

  return headings
}

export function buildHeadingTree(headings) {
  const root = []
  const stack = [{ level: 0, children: root }]

  for (const heading of headings) {
    const node = { ...heading, children: [] }

    while (stack.length > 1 && stack[stack.length - 1].level >= heading.level) {
      stack.pop()
    }

    stack[stack.length - 1].children.push(node)
    stack.push(node)
  }

  return root
}
