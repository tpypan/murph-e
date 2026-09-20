/** Small, non-executable mailbox read by the badge once a second. */
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
  const rows = display.playing
    ? Object.entries(display.controls)
        .filter(([key, value]) => ['up', 'down', 'left', 'right', 'a', 'b'].includes(key) && value)
        .flatMap(([key, value]) => {
          const text = `${key.toUpperCase()}: ${clean(value!).slice(0, 160)}`
          const lines: string[] = []
          let rest = text
          while (rest.length > 18) {
            const space = rest.lastIndexOf(' ', 18)
            const end = space > 0 ? space : 18
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
    ...(rows.length ? rows : ['SEE ARCADE FOR', 'GAME CONTROLS']),
    'END',
    '',
  ].join('\n')
}
