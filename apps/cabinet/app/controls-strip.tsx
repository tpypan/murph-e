// One line on every shell screen saying what the controls do right now, in
// the words of the device that plays in this mode: a one-player game is
// played on the cabinet panel (stick, A B X Y), a two-player game on the
// badges (d-pad, A, B, START; only the cabinet's Y can talk). Off the cabinet
// (no ?cabinet=1) it names the keyboard, so nobody reads a button they do not
// have. During play the game legend (game-controls.tsx) carries this instead.

export type StripPhase = 'ATTRACT' | 'OPTIONS' | 'LISTENING' | 'BUILDING' | 'READY' | 'GAMEOVER'

export interface StripContext {
  cabinet: boolean
  /** 1: the cabinet panel plays; 2: the badges play. */
  players: 1 | 2
  /** Voice screen: the transcript is in and A makes the game. */
  reviewing?: boolean
  /** READY: more instruction pages to flip through. */
  pages?: boolean
}

export function controlsHint(phase: StripPhase, ctx: StripContext): string {
  const k = !ctx.cabinet
    ? { who: '', stick: 'ARROWS', a: 'Z', b: 'X', start: 'ENTER', talk: 'HOLD SPACE' }
    : ctx.players === 2
      ? {
          who: 'BADGES',
          stick: 'D-PAD',
          a: 'A',
          b: 'B',
          start: 'START',
          talk: 'HOLD Y ON THE CABINET',
        }
      : { who: 'CABINET', stick: 'STICK', a: 'A', b: 'B', start: 'X', talk: 'HOLD Y' }
  const join = (parts: Array<string | false | undefined>) =>
    [k.who, ...parts].filter(Boolean).join(' · ')
  switch (phase) {
    case 'ATTRACT':
      return join([`${k.stick}: CHOOSE`, `${k.a}: SELECT`])
    case 'OPTIONS':
      return join([`${k.stick}: MOVE`, `${k.a}: SELECT`, `${k.b}: BACK`])
    case 'LISTENING':
      return join([
        `${k.talk}: TALK`,
        ctx.reviewing && `${k.a}: MAKE GAME`,
        ctx.reviewing && `${k.stick} ◀ ▶: PAGE`,
        `${k.b}: CANCEL`,
      ])
    case 'BUILDING':
      return join([`${k.b}: CANCEL`])
    case 'READY':
      return join([`${k.a}: PLAY`, ctx.pages && `${k.stick} ◀ ▶: MORE`, `${k.b}: MENU`])
    case 'GAMEOVER':
      return join([`${k.a}: PLAY AGAIN`, `${k.b}: MENU`])
  }
}

export function ControlsStrip({ phase, ...ctx }: { phase: StripPhase } & StripContext) {
  return (
    <p className="support controls-strip" data-top={phase === 'ATTRACT'} aria-label="Controls">
      {controlsHint(phase, ctx)}
    </p>
  )
}
