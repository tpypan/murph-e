/** Request-only words: model-invented genre labels must not reintroduce negated identities. */
export function normalized(text: string): string {
  return ` ${text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()} `
}

export function requestClauses(transcript: string): { positive: string; negative: string } {
  const positive: string[] = [],
    negative: string[] = []
  for (const raw of transcript
    .replace(/\bnot (?:just|only)\b/gi, '')
    .split(/[.!?;,\n]|\b(?:but|however|instead(?!\s+of\b))\b/i)) {
    const clause = normalized(raw).trim()
    // In "instead of cars use planes", only cars are being removed.
    const replacement = /\binstead of\s+(.+?)\s+(?:use|using)\s+(.+)$/.exec(clause)
    if (replacement) {
      positive.push(clause.slice(0, replacement.index), replacement[2]!)
      negative.push(replacement[1]!)
      continue
    }
    const negation =
      /\b(?:do not|don t|does not|doesn t|not|no|without|never|rather than|instead of)\b/.exec(
        clause,
      )
    positive.push(negation ? clause.slice(0, negation.index) : clause)
    if (negation) negative.push(clause.slice(negation.index + negation[0].length))
  }
  return { positive: positive.join(' ; '), negative: negative.join(' ; ') }
}
