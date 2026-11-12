// Writes data files in the project's own JSON style: flat objects and arrays of plain values
// stay on one line, everything else gets one entry per line. Keeps diffs small.
const isPlain = (v) => v === null || typeof v !== 'object';

export function formatJson(v, indent = '') {
  const next = indent + '  ';
  if (isPlain(v)) return JSON.stringify(v);
  if (Array.isArray(v)) {
    if (v.length === 0) return '[]';
    if (v.every(isPlain)) return `[${v.map((x) => JSON.stringify(x)).join(', ')}]`;
    return `[\n${v.map((x) => next + formatJson(x, next)).join(',\n')}\n${indent}]`;
  }
  const entries = Object.entries(v).filter(([, x]) => x !== undefined);
  if (entries.length === 0) return '{}';
  if (entries.every(([, x]) => isPlain(x))) return `{ ${entries.map(([k, x]) => `${JSON.stringify(k)}: ${JSON.stringify(x)}`).join(', ')} }`;
  return `{\n${entries.map(([k, x]) => `${next}${JSON.stringify(k)}: ${formatJson(x, next)}`).join(',\n')}\n${indent}}`;
}
