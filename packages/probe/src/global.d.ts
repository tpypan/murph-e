// The runtime's probe hook, as seen from Playwright's page.evaluate.
interface ProbeHook {
  load: (
    code: string,
    seed?: number,
    title?: string,
    players?: number,
  ) => { ok: boolean; error?: string }
  start: () => void
  reset: () => void
  step: (n?: number) => {
    state: string
    score: number
    scores: number[]
    winner: number | null
    frame: number
    error: string | null
  }
  frameHash: () => string
  // dominant is a canonical visible-color token: legacy 0..15, or 0x01000000 | RGB.
  frameStats: () => { colors: number; dominant: number; dominantShare: number }
  telemetry: () => {
    sfx: Record<string, number>
    tone: number
    flash: number
    shake: number
    scoreFrames: number[]
    scoreDeltas: number[]
  }
  state: () => string
  score: () => number
  inject: (frames: Array<{ at: number; player?: number; button: string; down: boolean }>) => void
  input: (player: number, button: string, down: boolean) => void
  errors: () => Array<{ message: string; stack: string; phase: string }>
  snapshot: () => string
}
interface Window {
  __probe?: ProbeHook
}
