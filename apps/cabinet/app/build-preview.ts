/** A fixed window of verbatim output, wrapped instead of horizontally scrolling. */
export function codeWindow(code: string, columns = 38, count = 4): string[] {
  const rows = code
    .replace(/^```(?:js|javascript)?\s*\n?/, '')
    .replace(/\n```\s*$/, '')
    .split('\n')
  const wrapped = rows.flatMap((line) => {
    const expanded = line.replaceAll('\t', '  ')
    if (!expanded.length) return ['']
    const parts: string[] = []
    for (let i = 0; i < expanded.length; i += columns) parts.push(expanded.slice(i, i + columns))
    return parts
  })
  return wrapped.slice(-count)
}
export interface DraftSprite {
  name: string
  rows: string[]
  palette?: readonly string[]
}

/** Keep declaration offsets, but hide strings/comments so quoted code is not art. */
function declarationMask(code: string): string {
  const chars = code.split('')
  let quote = ''
  let comment = ''
  for (let i = 0; i < code.length; i++) {
    const c = code[i]!
    const next = code[i + 1]
    if (comment) {
      chars[i] = ' '
      if (comment === '//' && c === '\n') comment = ''
      else if (comment === '/*' && c === '*' && next === '/') {
        chars[++i] = ' '
        comment = ''
      }
    } else if (quote) {
      chars[i] = ' '
      if (c === '\\' && next !== undefined) chars[++i] = ' '
      else if (c === quote) quote = ''
    } else if (c === '/' && (next === '/' || next === '*')) {
      comment = c + next
      chars[i] = chars[++i] = ' '
    } else if (c === '"' || c === "'" || c === '`') {
      quote = c
      chars[i] = ' '
    }
  }
  return chars.join('')
}

/** Intentionally narrow: complete string-array initializer, never an expression. */
function literalPalette(source: string): string[] | null {
  let rest = source.trimStart()
  if (!rest.startsWith('[')) return null
  rest = rest.slice(1).trimStart()
  const palette: string[] = []
  while (palette.length < 16) {
    const color = /^(['"])(#[0-9a-fA-F]{6})\1/.exec(rest)
    if (!color) return null
    palette.push(color[2]!)
    rest = rest.slice(color[0].length).trimStart()
    if (rest.startsWith(',')) rest = rest.slice(1).trimStart()
    else if (!rest.startsWith(']')) return null
    if (rest.startsWith(']')) {
      // A following call, member access, concat, etc. is not a literal palette.
      const after = rest.slice(1)
      return /^\s*(?:;|$)/.test(after) || /^\s*\n\s*(?:const|let|var|function)\b/.test(after)
        ? palette
        : null
    }
  }
  return null
}

/** Decode only literal pixel rows; never evaluate streamed JavaScript. */
export function draftSprite(code: string): DraftSprite | null {
  return draftSprites(code)[0] ?? null
}

export function draftSprites(code: string): DraftSprite[] {
  code = code.replace(/^```(?:js|javascript)?\s*\n?/, '').replace(/\n```\s*$/, '')
  const sprites: DraftSprite[] = []
  const declarations = [
    ...declarationMask(code).matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(=)?/g),
  ]
  for (const match of declarations) {
    if (/^(?:map|maze|level|tiles?)$/i.test(match[1]!)) continue
    if (!match[2]) continue
    let rest = code.slice(match.index + match[0].length, match.index + 12_000).trimStart()
    if (!rest.startsWith('[')) continue
    rest = rest.slice(1)
    const rows: string[] = []
    while (rows.length < 96) {
      const row = rest.match(/^\s*(['"])([.0-9a-fA-F ]{2,96})\1\s*,?/)
      if (!row) break
      rows.push(row[2]!)
      rest = rest.slice(row[0].length)
    }
    if (rows.length >= 2 && rows.some((r) => /[0-9a-f]/i.test(r))) {
      const companions = declarations.filter((d) => d[1] === `${match[1]}_PALETTE`)
      if (companions.length) {
        const companion = companions[0]!
        // Ambiguous/reordered/unfinished metadata must not fall back to false PICO colors.
        if (companions.length !== 1 || companion.index >= match.index || !companion[2]) continue
        const palette = literalPalette(code.slice(companion.index + companion[0].length))
        if (
          !palette ||
          rows.some((r) =>
            [...r].some((c) => /[0-9a-f]/i.test(c) && Number.parseInt(c, 16) >= palette.length),
          )
        )
          continue
        sprites.push({ name: match[1]!, rows, palette })
      } else sprites.push({ name: match[1]!, rows })
      if (sprites.length === 6) break
    }
  }
  return sprites
}

/** Find completed statements, without evaluating code on the UI thread.
 * Syntax/initialization errors are expected and handled by the draft worker.
 * Closing a partial draw at a statement boundary lets procedural art appear
 * before the whole response completes. Never guess the rest of an expression.
 */
export function draftScene(source: string): string | null {
  const code = source.replace(/^```(?:js|javascript)?\s*\n?/, '').replace(/\n```\s*$/, '')
  if (code.length > 150_000 || !/\bfunction\s+init\s*\(/.test(code)) return null
  const draw = /\bfunction\s+draw\s*\([^)]*\)\s*\{/.exec(code)
  if (!draw) return null
  const start = draw.index + draw[0].length
  let braces = 1
  let parens = 0
  let brackets = 0
  let quote = ''
  let comment = ''
  let end = 0
  let closed = false
  for (let i = start; i < code.length; i++) {
    const c = code[i]!
    const next = code[i + 1]
    if (comment === '//') {
      if (c === '\n') comment = ''
      continue
    }
    if (comment === '/*') {
      if (c === '*' && next === '/') {
        comment = ''
        i++
      }
      continue
    }
    if (quote) {
      if (c === '\\') i++
      else if (c === quote) quote = ''
      continue
    }
    if (c === '/' && (next === '/' || next === '*')) {
      comment = c + next
      i++
      continue
    }
    if (c === '"' || c === "'" || c === '`') {
      quote = c
      continue
    }
    if (c === '(') parens++
    if (c === ')') parens--
    if (c === '[') brackets++
    if (c === ']') brackets--
    if (c === '{') braces++
    if (c === '}') braces--
    if (braces === 0) {
      end = i + 1
      closed = true
      break
    }
    if (braces === 1 && parens === 0 && brackets === 0 && (c === ';' || c === '}')) end = i + 1
  }
  if (!end) return null
  // After draw closes, include subsequent helpers when the response is complete;
  // a temporarily incomplete suffix simply keeps the last successfully drawn frame.
  const draft = closed ? code : `${code.slice(0, end)}\n}`
  return /\bfunction\s+update\s*\(/.test(draft) ? draft : `${draft}\nfunction update() {}`
}
