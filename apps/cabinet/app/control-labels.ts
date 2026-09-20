/** Short reminder for play; the complete mapping remains on the Ready screen. */
export function controlLabel(description: string): string {
  const first = description
    .split(/[;.]/)[0]!
    .replace(/\([^)]*\)/g, '')
    .replace(/\b(?:during|while|when|also|if)\b.*$/i, '')
    .replace(/\b(hold|tap|press)\s+to\s+/gi, '$1 ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
  // Keep both meanings of a common two-button fighting control, rather than
  // reducing a hold/tap mapping to just its first clause.
  if (/\bblock\b/i.test(first) && /\bspecial\b/i.test(description)) return 'BLOCK / SPECIAL'
  if (first.length <= 18) return first || 'ACTION'
  const short = first
    .slice(0, 17)
    .replace(/\s+\S*$/, '')
    .trim()
  return `${short || first.slice(0, 16)}…`
}

/** Preserve explicit direction+button actions instead of truncating them off the legend. */
export function controlReminders(key: string, description: string): string[] {
  if (key !== 'a' && key !== 'b') return [controlLabel(description)]
  const modifier = /\b(up|down|left|right)\s*:\s*([^/;.]+)/gi
  const combinations = [...description.matchAll(modifier)]
  if (!combinations.length) return [controlLabel(description)]
  const primary = description.slice(0, combinations[0]!.index).replace(/[\s/;,]+$/, '')
  return [
    ...(primary ? [controlLabel(primary)] : []),
    ...combinations.map(
      (match) => `${match[1]!.toUpperCase()}+${key.toUpperCase()}: ${controlLabel(match[2]!)}`,
    ),
  ]
}
