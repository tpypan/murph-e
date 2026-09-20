/** Small, non-executable mailbox read by the badge every two seconds. */

/** Characters per control row: the badge draws rows in its 14 px native font
 *  across 288 px, five rows to a page. */
const ROW_CHARS = 28
export interface BadgeDisplay {
  players: 1 | 2
  controls: Record<string, string | null>
  playing: boolean
}

export function displayText(display: BadgeDisplay, slot: number): string {
  const clean = (s: string) =>
    s
      .split('')
      .map((char) => (char.charCodeAt(0) < 32 ? ' ' : char))
      .join('')
      .trim()
      .toUpperCase()
  // A one-player game is played on the cabinet controls; the badge only
  // names the score (docs/design-guide.md, Physical input).
  const rows =
    display.playing && display.players === 1
      ? ['1 PLAYER GAME', 'PLAY ON THE', 'CABINET CONTROLS', 'SCORE SAVED HERE']
      : display.playing
        ? Object.entries(display.controls)
            .filter(
              ([key, value]) => ['up', 'down', 'left', 'right', 'a', 'b'].includes(key) && value,
            )
            .flatMap(([key, value]) => {
              const text = `${key.toUpperCase()}: ${clean(value!).slice(0, 160)}`
              const lines: string[] = []
              let rest = text
              while (rest.length > ROW_CHARS) {
                const space = rest.lastIndexOf(' ', ROW_CHARS)
                const end = space > 0 ? space : ROW_CHARS
                lines.push(rest.slice(0, end))
                rest = rest.slice(end).trimStart()
              }
              if (rest) lines.push(rest)
              return lines
            })
        : ['D-PAD: CHOOSE', 'A: SELECT', 'B: BACK']
  return [
    'ARCADE-DISPLAY-1',
    `PLAYER ${display.players === 1 ? 1 : slot + 1}`,
    display.playing ? 'START: PAUSE' : 'START: CONFIRM',
    ...(rows.length ? rows : ['SEE MURPH-E FOR', 'GAME CONTROLS']),
    'END',
    '',
  ].join('\n')
}
