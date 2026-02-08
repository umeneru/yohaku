export function join(base, name) {
  const sep = base.includes('\\') ? '\\' : '/'
  return base.endsWith(sep) ? base + name : base + sep + name
}
